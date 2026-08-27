# <img src="https://pipali.ai/icons/pipali_64.png" width="28" height="28" alt="Pipali logo" /> Pipali-FreeSearch

### A community-maintained, FreeSearch-focused fork of Pipali with bundled runtimes and desktop-specific modifications.

## 🌶️ Click the pepper. You know you want to.
[![Pipali-FreeSearch](https://pipali.ai/icons/pipali_64.png)](https://github.com/michieal/pipali-freesearch/releases)

---

An AI co-worker on your computer that can safely interact with files + the web to finish real work.

- **Research** across your docs and the web
- **Create** docs, spreadsheets, email, events and personal apps
- **Automate** routine workflows

Pipali-FreeSearch is based on Pipali by Khoj AI, with this fork focusing on
free web search, self-contained desktop distribution, bundled runtimes, and
Linux AppImage compatibility.

Note that we are not affiliated with Khoj-AI in any way, nor do we pretend to be.

## Why Pipali-FreeSearch?

Pipali-FreeSearch uses free web search rather than requiring a paid search
subscription for its web research functionality.

## What's Different?

Pipali-FreeSearch currently focuses on making Pipali practical as a
self-contained desktop application, particularly on Linux.

The primary differences from upstream are:

- FreeSearch-oriented web search
- Bundled Bun and UV runtimes
- Linux AppImage distribution
- Desktop packaging improvements
- Linux compatibility fixes
- Repackaging of the AppImage with pristine runtime sidecars
- Upstream updater signing disabled for distributed builds

> **Beta**
>
> This is an actively developed community fork.
> Features and behavior may diverge from upstream Pipali over time.

Upstream Pipali remains the foundation of the project. Where possible,
upstream functionality and fixes are retained rather than independently
reimplemented.

<img width="1287" height="825" alt="product_hero" src="https://github.com/user-attachments/assets/85e90271-95a5-4f87-9011-c9a375719f8f" />

## Features

### Work Async

Assign Pipali a few tasks and go grab a coffee. Track progress, give feedback
and get notified when Pipali needs your attention.

### Create polished deliverables

Turn messy inputs into shareable outputs — briefs, decision memos, project
updates, meeting notes, and spreadsheets.

### Automate routine work

Set up tasks on a schedule or trigger them manually.

"Draft my weekly project update email", "Sync my ledger on the 1st of every
month", "Mark all marketing emails as spam".

### Teach it your workflows

Ask Pipali to create [skills](https://agentskills.io/) for all your custom
workflows — where to find project documents, which accounting method to
follow, or your email organization policy.

### Connect your tools

Integrate Jira, Linear, Slack, etc. via MCP. Pipali can create issues, post
messages, and interact with external APIs on your behalf.

### Use your favorite AI models

Use the right AI model for the right task. Model access is provided through
the Pipali Platform — Single Sign-On, no API key setup needed.

Pipali-FreeSearch can also be configured to use locally hosted,
OpenAI-compatible models.

### Run safely

Pipali runs commands safely in a local sandbox that restricts file and network
access. This reduces your confirmation fatigue while it works safely on your
computer.

Commands that need broader access require your explicit approval. You can
configure these permissions yourself.

## Starter Prompts

- "We have not been properly introduced"
- "Go through the app store submissions process for both Apple and Google for my mobile app using the Chrome Browser"
- "Draft and file a provisional patent with the USPTO for the invention described in my design docs"
- "Tailor my resume and cover letter to these five job postings, then submit the applications"
- "Make me a personal newspaper from today's top stories, styled like the NYT front page"

## Get Started

1. Download the Linux AppImage from Releases.
2. Sign in from the Desktop app.
3. Assign Pipali a task.

## FAQ

### Who do I send issues to?

If the problem exists in upstream Pipali itself, please report it to
[Khoj-AI's GitHub repository](https://github.com/khoj-ai/khoj).

Upstream fixes can then propagate to Pipali-FreeSearch.

Issues and feature requests specific to Pipali-FreeSearch can be reported
in our [Issues](https://github.com/michieal/pipali-freesearch/issues) section.

We also have a
[Discussions](https://github.com/michieal/pipali-freesearch/discussions)
section for questions and general discussion.

### How often is this project updated?

As the maintainer of this project, I will endeavor to make new releases and
code updates whenever Khoj-AI makes a release.

However, it should be noted that I do this in my spare time, because
*I want to*.

### Will there be other platforms supported (like Mac and Windows)?

Yes — they are already supported.

See **Building From Source** below and replace `linux-x64` with the appropriate
platform build target.

I am not opposed to uploading community-made versions, but I have other things
to attend to, so I will not be making them myself.

### Do I need to set up billing?

No. Pipali-FreeSearch does not require billing for its free web search.

Billing is only necessary if you want to use image generation or other paid
Pipali services.

If you enable paid services, web searches may use Pipali's paid search rather
than the FreeSearch functionality provided by this fork.

*For paid accounts:* Individual users and Team admins should set up billing
before the initial signup credits run out.

### Do I need API keys?

No API key is required when using Pipali's hosted model access.

Pipali-FreeSearch can also be configured to use locally hosted models such as
Ollama (and potentially LocalAI) through the OpenAI-compatible API.

For example:

```bash
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_API_KEY=ollama
```

## Building From Source
Clone this repo, then change directory to your cloned directory. Install [Bun](https://bun.sh/), and run:

```bash
bun install
```

Then build the Linux AppImage with:

```bash
bun run tauri:build:linux-x64 --no-sign
```
The resulting AppImage will be placed in:

`src-tauri/target/release/bundle/appimage/`

### About `--no-sign`

The `--no-sign` option disables Tauri updater signing for linux appimages. 

> NOTE: Other Platforms *may* require signing!

This is intentional: the upstream Pipali updater configuration references
Khoj AI's signing key, which is not available to this fork.

The AppImages distributed by Pipali-FreeSearch are therefore built without
the upstream updater signature.

This fork does not have access to Khoj AI's private signing key, and should
not attempt to sign releases using the upstream project's signing credentials.

### Bun and symbolic links

If Bun encounters resolver errors during the build, try moving the cloned
repository to a normal local directory such as your Desktop and run the
build again.

There is a known issue involving Bun's internal resolver and symbolic links.
I encountered this myself, and moving the repository to a non-symlinked
location is a simple workaround.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture, and guidelines.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
