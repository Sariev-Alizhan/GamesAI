# GamesAI

[![CI](https://github.com/Sariev-Alizhan/GamesAI/actions/workflows/ci.yml/badge.svg)](https://github.com/Sariev-Alizhan/GamesAI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Modules](https://img.shields.io/badge/modules-3-success)](#what-is-gamesai)
[![Live demo](https://img.shields.io/badge/live-boilergen--eight.vercel.app-orange)](https://boilergen-eight.vercel.app)

> **Ship a richer feature in 1 day instead of 1 week.** Open-source toolkit that eliminates the rote work — boilerplate, validation, localization — across every department of a game studio. Deterministic core, optional AI, owned by the developer.

🌐 **Live demo:** https://boilergen-eight.vercel.app
📦 **Source:** https://github.com/Sariev-Alizhan/GamesAI
🗺️ **Where this is going:** [VISION.md](./VISION.md)

## What is GamesAI?

A growing collection of tools, each focused on one boring-but-time-consuming part of game development:

| Module | What it does | Status |
|---|---|---|
| **[boilergen/](./boilergen/)** | YAML entity → boilerplate code across the stack (C++ / Node / Flutter / Godot / Unity / i18n) | v1.x — production-ready |
| **[tools/localization-assistant/](./tools/localization-assistant/)** | Static checks (missing keys, length overflow, glyph coverage) + opt-in AI fill of locale JSON | v0.1 — MVP |
| **[tools/schema-validator/](./tools/schema-validator/)** | Catches broken cross-references (loot pointing at a deleted item, level pool with a typo'd enemy id) before runtime | v0.1 — MVP |
| _More modules coming_ | Balance simulator, QA tooling, LiveOps anomaly detection, AI code reviewer... | Phased per [VISION.md](./VISION.md) |

Every module follows the same architecture: **deterministic core + AI as opt-in layer + open-source forever**.

## How we're different

| | GamesAI | modl.ai (closest neighbour) | Inworld / Charisma | Layer / Promethean | Copilot / Cursor |
|---|---|---|---|---|---|
| **Bucket** | Engine-aware codegen + cross-ref validation + localization | AI QA bots | Generative NPC dialogue | Generative final art | General AI coding |
| **Source** | Open-source (MIT) | Closed-SaaS | Closed-SaaS | Closed-SaaS | Closed |
| **AI posture** | Deterministic core, AI is opt-in | AI-first by design | AI is the product | AI is the product | AI-first |
| **Game-domain knowledge** | Yes (FiveM / altV / Unity / RP-server schemas) | Some (QA-flavored) | Some (narrative) | Yes (art) | None |
| **Self-hostable** | Yes | No | No | No | No |
| **Lock-in** | None — fork it | Vendor SaaS | Vendor SaaS | Vendor SaaS | Vendor SaaS |

Nothing in this table is a swipe at those products — they live in different buckets. **The bucket "deterministic engine-aware codegen + cross-ref validation + localization, OSS, for RP/multiplayer studios" is empty, and that's what GamesAI fills.**

## Why this exists

Most studios — especially in our region — have a **3-month feature cycle** for a single new mechanic. Half of that is rote work. AI tooling can eliminate the rote part without touching the creative part.

We're building this for two missions at once:
- **Internally at Grand Games** — the first studio to systematically use these tools.
- **Externally for the gamedev community** — anyone can fork, adapt, or contribute.

See [VISION.md](./VISION.md) for the long-term direction and [knowledge-base/sources/community-sentiment-ai-gamedev.md](./knowledge-base/sources/community-sentiment-ai-gamedev.md) for the positioning rules we follow.

## Repository layout

```
GamesAI/
├── boilergen/                       Module 1: code generator
│   ├── src/{core,cli,web,mcp,ai}/   Engine + four interfaces (CLI, web, MCP, AI Describe)
│   ├── plugins/                     Per-engine plugins (gm1, generic-rp, godot-2d-platformer, unity-rpg, unity-mobile-shooter)
│   ├── schemas/                     YAML examples per plugin
│   └── tests/                       221 Vitest tests
│
├── tools/
│   ├── localization-assistant/      Module 2: AI-powered locale filler
│   └── schema-validator/            Module 3: cross-reference checker for game data
│
├── knowledge-base/                  Curated game-dev patterns (16 entries, fed into AI Describe via RAG)
├── extension/                       VS Code extension for Boilergen
├── handoff/                         Materials for Grand Games lead dev (Igor)
│
├── VISION.md                        Long-term strategy, principles, phased build
├── ROADMAP.md                       Tactical 6–12 month plan
├── LICENSE                          MIT
└── CONTRIBUTING.md                  How to contribute
```

## Quick start

### Try the live demo
Open https://boilergen-eight.vercel.app and click `weapon` → `Generate`. You'll see one YAML schema turn into 4 stack-spanning files.

### Run locally
```bash
git clone https://github.com/Sariev-Alizhan/GamesAI
cd GamesAI/boilergen
npm install
npm run web                 # web playground at http://localhost:3000
# or
npm run dev -- generate ./schemas/generic-rp/taxi-driver.yaml
```

### Run Localization Assistant
```bash
cd tools/localization-assistant
npm install && npm run build
export ANTHROPIC_API_KEY=sk-ant-...
npx localization-assistant fill --source en.json --target ru.json kk.json
```

## How modules connect

The platform's value is the composition:

1. **Boilergen** generates entity YAML schemas + i18n stubs + (FiveM target) full QBCore-compatible resources across 7 entity types (job/vehicle/weapon/business/organization/family/property).
2. **Schema Validator** confirms cross-references resolve in YAML/JSON game data **AND** (FiveM mode) lints `fxmanifest.lua` graphs against case-sensitivity / missing-script / unmanifested-dep footguns.
3. **Localization Assistant** lints locale JSONs (placeholder parity, length overflow per language, per-key caps) **AND** fills missing keys via Claude or DeepL Pro.
4. _(future)_ Balance Simulator reads the same schemas and runs combat simulations.

Each module owns one boring-but-time-consuming part of game-dev. Together they replace ~40% of the rote work in a typical content cycle.

### See it work end-to-end

[**CASE-STUDY-PLATFORM-LOOP.md**](./CASE-STUDY-PLATFORM-LOOP.md) — From a single YAML to a working FiveM/QBCore resource in 60 seconds. Reproducible step-by-step with exact commands and verification output.

[**tools/schema-validator/CASE-STUDY-QBCORE.md**](./tools/schema-validator/CASE-STUDY-QBCORE.md) — Schema Validator's FiveM-mode catching real warnings in upstream qbcore-framework code.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Highest-value contributions:
- New Boilergen plugins for engines/stacks we don't cover (Unreal, Bevy, Phaser, etc.)
- Knowledge-base entries for real games (case studies)
- Bug fixes with tests

## License

[MIT](./LICENSE) — fork it, ship it, sell it. Just keep the notice.

For third-party licenses, AI model posture (what we use, what we refuse, why), and the policy for adding new dependencies, see [NOTICE.md](./NOTICE.md).

---

> *"We're not building an AI game. We're making game-dev better for everyone who does it."*
