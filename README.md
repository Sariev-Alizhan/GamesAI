# GamesAI

> Open-source AI platform for game development. Tools that eliminate the rote work in every department of a game studio so the team can focus on what's actually engineering, design, and creative work.

🌐 **Live demo:** https://boilergen-eight.vercel.app
📦 **Source:** https://github.com/Sariev-Alizhan/GamesAI
🗺️ **Where this is going:** [VISION.md](./VISION.md)

## What is GamesAI?

A growing collection of tools, each focused on one boring-but-time-consuming part of game development:

| Module | What it does | Status |
|---|---|---|
| **[boilergen/](./boilergen/)** | YAML entity → boilerplate code across the stack (C++ / Node / Flutter / Godot / Unity / i18n) | v1.x — production-ready |
| **[tools/localization-assistant/](./tools/localization-assistant/)** | AI fills missing translations in your locale JSON files | v0.1 — MVP |
| _More modules coming_ | Game design balance simulator, QA tooling, LiveOps anomaly detection... | Phased per [VISION.md](./VISION.md) |

Every module follows the same architecture: **deterministic core + AI as opt-in layer + open-source forever**.

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
│   ├── plugins/                     Per-engine plugins (gm1, generic-rp, godot-2d-platformer, unity-rpg)
│   ├── schemas/                     YAML examples per plugin
│   └── tests/                       ~200 Vitest tests
│
├── tools/
│   └── localization-assistant/      Module 2: AI-powered locale filler
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

Boilergen generates i18n stubs with `TODO` placeholders → Localization Assistant fills the TODOs with AI translations → both run in your normal CI/PR flow. Tomorrow we add a Balance Simulator that consumes the same YAML schemas Boilergen reads. The platform is the composition.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Highest-value contributions:
- New Boilergen plugins for engines/stacks we don't cover (Unreal, Bevy, Phaser, etc.)
- Knowledge-base entries for real games (case studies)
- Bug fixes with tests

## License

[MIT](./LICENSE) — fork it, ship it, sell it. Just keep the notice.

---

> *"We're not building an AI game. We're making game-dev better for everyone who does it."*
