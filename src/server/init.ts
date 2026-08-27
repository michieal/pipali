import OpenAI from 'openai';
import { db } from './db';
import { User, AiModelApi, ChatModel, Conversation, McpServer } from './db/schema';
import { eq } from 'drizzle-orm';
import { getDefaultUser } from './utils';
import { createChildLogger } from './logger';

const log = createChildLogger({ component: 'init' });

const defaultGeminiModels = ['gemini-3-pro-preview', 'gemini-2.5-flash'];
const defaultOpenAIModels = ['gpt-5.2'];
const defaultAnthropicModels = ['claude-opus-4-5-20251101', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'];

async function setupChatModelProvider(providerName: string, modelType: 'openai' | 'google' | 'anthropic', apiKey: string, desiredModels: string[], visionEnabled: boolean, apiBaseUrl?: string) {
    const baseUrl = apiBaseUrl ?? null;
    const [existingProvider] = await db.select().from(AiModelApi).where(eq(AiModelApi.name, providerName));

    let providerId: number;
    if (existingProvider) {
        if (existingProvider.apiKey !== apiKey || existingProvider.apiBaseUrl !== baseUrl) {
            await db.update(AiModelApi)
                .set({ apiKey, apiBaseUrl: baseUrl })
                .where(eq(AiModelApi.id, existingProvider.id));
            log.info(`🔄 Updated ${providerName} provider config.`);
        }
        providerId = existingProvider.id;
    } else {
        const [created] = await db.insert(AiModelApi).values({
            name: providerName,
            apiKey,
            apiBaseUrl: baseUrl,
        }).returning();
        if (!created) throw new Error(`Failed to create ${providerName} provider.`);
        providerId = created.id;
    }

    // Reconcile this provider's model list against the desired set
    const existingModels = await db.select().from(ChatModel).where(eq(ChatModel.aiModelApiId, providerId));
    const existing = new Set(existingModels.map(m => m.name));
    const desired = new Set(desiredModels);

    const toAdd = desiredModels.filter(name => !existing.has(name));
    for (const name of toAdd) {
        await db.insert(ChatModel).values({ name, friendlyName: name, modelType, visionEnabled, aiModelApiId: providerId });
    }

    const toRemove = existingModels.filter(m => !desired.has(m.name));
    for (const model of toRemove) {
        // Drop conversation references first (FK is no-action); agent and UserChatModel rows cascade
        await db.update(Conversation).set({ chatModelId: null }).where(eq(Conversation.chatModelId, model.id));
        await db.delete(ChatModel).where(eq(ChatModel.id, model.id));
    }

    if (toAdd.length > 0 || toRemove.length > 0) {
        log.info(`🤖 ${providerName} models reconciled: +${toAdd.length} -${toRemove.length}.`);
    }
}

/**
 * Discover available models from an OpenAI-compatible /v1/models endpoint.
 * Returns null on failure so callers can skip reconcile instead of nuking existing rows.
 */
async function listOpenAICompatibleModels(apiKey: string, apiBaseUrl?: string): Promise<string[] | null> {
    try {
        const client = new OpenAI({ apiKey, baseURL: apiBaseUrl ?? undefined, timeout: 6_000 });
        const page = await client.models.list();
        return page.data.length > 0 ? page.data.map(m => m.id) : null;
    } catch (err) {
        log.warn({ err: (err as Error).message, apiBaseUrl }, 'Failed to list models from OpenAI-compatible endpoint');
        return null;
    }
}

let localModelRefreshInProgress = false;

/**
 * Refresh models from locally hosted OpenAI-compatible providers.
 *
 * Local providers are stored in AiModelApi, so this works even when the
 * provider configuration was not supplied through the sidecar environment.
 */
export async function refreshLocalModels(): Promise<void> {
    if (localModelRefreshInProgress) return;
    localModelRefreshInProgress = true;

    try {
        const providers = await db.select().from(AiModelApi);

        for (const provider of providers) {
            if (!provider.apiBaseUrl) continue;

            let url: URL;
            try {
                url = new URL(provider.apiBaseUrl);
            } catch {
                continue;
            }

            const hostname = url.hostname.toLowerCase();
            if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) continue;

            const models = await listOpenAICompatibleModels(provider.apiKey ?? 'ollama', provider.apiBaseUrl);
            if (models) {
                await setupChatModelProvider(
                    provider.name,
                    'openai',
                    provider.apiKey ?? 'ollama',
                    models,
                    true,
                    provider.apiBaseUrl,
                );
            }
        }
    } catch (err) {
        log.warn({ err: (err as Error).message }, 'Failed to refresh local models');
    } finally {
        localModelRefreshInProgress = false;
    }
}

export async function initializeDatabase() {
    // 1. Create default local user (used to associate all local state in the embedded DB)
    const defaultUserEmail = getDefaultUser().email;

    const [existingUser] = await db.select().from(User).where(eq(User.email, defaultUserEmail));

    if (!existingUser) {
        log.info(`👤 Creating default local user: ${defaultUserEmail}`);
        await db.insert(User).values({
            email: defaultUserEmail,
            username: defaultUserEmail,
        });
    }

    // 2. Reconcile env-var-driven chat model providers (re-runs on each boot so changes propagate)
    if (process.env.OPENAI_API_KEY) {
        const explicit = process.env.OPENAI_MODELS?.split(',').map(m => m.trim()).filter(Boolean);
        // Precedence: OPENAI_MODELS > /v1/models discovery (custom endpoints only) > built-in defaults.
        // Discovery failure returns null and we skip reconcile so a transient outage doesn't wipe existing rows.
        let models: string[] | null;
        if (explicit?.length) {
            models = explicit;
        } else if (process.env.OPENAI_BASE_URL) {
            models = await listOpenAICompatibleModels(process.env.OPENAI_API_KEY, process.env.OPENAI_BASE_URL);
        } else {
            models = defaultOpenAIModels;
        }
        if (models) {
            await setupChatModelProvider('OpenAI', 'openai', process.env.OPENAI_API_KEY, models, true, process.env.OPENAI_BASE_URL);
        } else {
            log.warn(`Skipping OpenAI provider reconcile: could not discover models from ${process.env.OPENAI_BASE_URL}. Set OPENAI_MODELS to override.`);
        }
    }
    if (process.env.GEMINI_API_KEY) {
        await setupChatModelProvider('Google Gemini', 'google', process.env.GEMINI_API_KEY, defaultGeminiModels, true);
    }
    if (process.env.ANTHROPIC_API_KEY) {
        await setupChatModelProvider('Anthropic', 'anthropic', process.env.ANTHROPIC_API_KEY, defaultAnthropicModels, true);
    }

    // Refresh models from locally configured OpenAI-compatible providers as well.
    // These providers may be stored in the database without corresponding sidecar
    // environment variables, which is common for desktop/local Ollama setups.
    await refreshLocalModels();

    // Keep the local model list current while the app is running.
    const localModelRefreshTimer = setInterval(() => {
        void refreshLocalModels();
    }, 5_000);
    localModelRefreshTimer.unref?.();

    // 3. Setup default MCP servers
    await setupDefaultMcpServers();

    log.info('📀 Database initialization complete.');
}

/**
 * Setup default MCP servers that come pre-installed.
 */
async function setupDefaultMcpServers(): Promise<void> {
    // Chrome Browser MCP - enables browser automation capabilities
    const chromeBrowserName = 'chrome-browser';
    const [existingChromeBrowser] = await db
        .select()
        .from(McpServer)
        .where(eq(McpServer.name, chromeBrowserName));

    if (!existingChromeBrowser) {
        await db.insert(McpServer).values({
            name: chromeBrowserName,
            description: 'Use to interact with pages that require login and/or UX interactions. Useful when normal webpage read, web search tools do not suffice.',
            transportType: 'stdio',
            path: 'chrome-devtools-mcp --autoConnect',
            confirmationMode: 'unsafe_only',
            enabled: true,
            enabledTools: [
                'click',
                'close_page',
                'drag',
                'evaluate_script',
                'fill',
                'fill_form',
                'handle_dialog',
                'hover',
                'list_pages',
                'navigate_page',
                'new_page',
                'press_key',
                'select_page',
                'take_screenshot',
                'take_snapshot',
                'upload_file',
                'wait_for',
            ],
        });
        log.info('🌐 Added Chrome Browser MCP server.');
    }
}
