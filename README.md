# GamesAI

Internal AI tooling and automation for game development at Grand Games.

🌐 **Live:** https://boilergen-eight.vercel.app
📦 **Repo:** https://github.com/Sariev-Alizhan/GamesAI

## Projects

- **[boilergen/](./boilergen/)** — Code generator. Reads YAML entity descriptions and emits boilerplate code across stack layers (C++ server, Node API, Flutter admin, JSON i18n). Four interfaces: CLI, web playground, MCP server (for Cursor / Claude Code / Windsurf), VS Code extension. AI Describe (natural language → YAML). 183 tests, ESM + TypeScript.

- **[knowledge-base/](./knowledge-base/)** — Curated reference of how various games and engines organize content. 15 entries across games (Cataclysm:DDA, Foundry VTT, Factorio, ...), engines (Unity SO, Unreal DataAsset, Godot Resources, **FiveM/altV/RAGE** — direct neighbour of GM1), and cross-cutting patterns (data-driven content, ECS, asset pipelines). Feeds plugin authors and AI Describe.

- **[handoff/](./handoff/)** — Materials prepared for Igor (lead dev): presentation, Q&A with the critical Q1–Q4 blockers for Stage 3, roadmap, screenshots.

- **[brief-igor-v2.md](./brief-igor-v2.md)** — Pending brief for the GM1 lead dev. Once Q1–Q4 are answered, Boilergen Stage 3 (real templates) starts.

## What's next

Future tools (AI code-review bot, LiveOps assistant, more MCP adapters, etc.) will live as sibling subfolders. Strategic direction in [`ROADMAP.md`](./ROADMAP.md).
