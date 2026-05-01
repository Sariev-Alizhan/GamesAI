# Boilergen Knowledge Base

> Structured knowledge about how various games and engines organize their content. Feeds into Boilergen's plugin ecosystem and AI Describe.

## What this is

A curated collection of **architectural patterns** observed in real games — how they describe professions, weapons, vehicles, NPCs, dialogue, and other content. The goal is to make Boilergen smarter about real-world gamedev, not generic.

Each entry follows the structure in [`_template.md`](./_template.md).

## What this isn't

- Not a list of all open-source games (only ones with patterns we'd actually borrow).
- Not engine documentation (Unity/Unreal docs cover that).
- Not gameplay analysis (we care about code structure, not whether the game is fun).

## How it connects to Boilergen

Three downstream use cases:

1. **Plugin authors** — when writing a Boilergen plugin for a new game/engine, look up patterns from similar projects in this base instead of reinventing.
2. **AI Describe** — the natural-language → YAML feature uses this base via RAG so its suggestions reference real game patterns, not generic AI guesses.
3. **Strategic positioning** — Grand Games becomes a credible voice on AI-gamedev tooling because we've actually studied the patterns.

## Folder layout

```
knowledge-base/
├── README.md            ← this file (the index)
├── _template.md         ← copy this for new entries
├── games/               ← entries about specific games
├── engines/             ← entries about engines / SDKs / frameworks
├── patterns/            ← cross-cutting architectural patterns
├── sources/             ← curated external resources (awesome-lists, asset libs, etc.)
└── research-notes/      ← raw research output, dated, kept for reference
```

## Index

### Games (7)

| Entry | Genre | Stack | Format | Relevance |
|---|---|---|---|---|
| [Cataclysm: Dark Days Ahead](./games/cataclysm-dda.md) | post-apocalyptic RPG / sim | C++ | JSON | **high** — strongest data-driven entity system in OSS |
| [Dwarf Fortress (raws)](./games/dwarf-fortress.md) | sim | C++ | proprietary text tags | low — historic interest, custom DSL |
| [Factorio](./games/factorio.md) | sim | C++ + Lua | code (Lua prototypes) | medium — three-stage pipeline + type discriminators |
| [Foundry VTT](./games/foundry-vtt.md) | RPG / VTT | TS / Electron | JSON | **high** — document-model + system/module split mirrors plugin architecture |
| [OpenRA](./games/openra.md) | RTS | C# | YAML | medium — YAML-driven traits with inheritance, mod SDK |
| [Stardew Valley (Content Patcher)](./games/stardew-valley.md) | RPG | C# | binary + JSON patches | medium — conditional content tokens worth studying |
| [Battle for Wesnoth (WML)](./games/wesnoth.md) | turn-based strategy | C++ | WML (custom DSL) | low — custom DSL, less applicable |

### Engines / Frameworks (4)

| Entry | Engine | Format | Relevance |
|---|---|---|---|
| [Unity ScriptableObject](./engines/unity-scriptable-object.md) | Unity | binary `.asset` (+ optional YAML) | medium — ubiquitous in indie/AA C# games |
| [Unreal DataAsset & DataTable](./engines/unreal-data-asset.md) | Unreal | binary `.uasset` + CSV import | medium — heavy pipeline, compile-time integration |
| [Godot Resources](./engines/godot-resources.md) | Godot | text `.tres` + binary `.res` | medium — most codegen-friendly of the three |
| [FiveM / altV / RAGE](./engines/fivem-resources.md) | GTA-RP frameworks | Lua / JS / JSON | **high** — direct neighbour of GM1 in the RP space |

### Patterns (4)

| Entry | Scope | Relevance |
|---|---|---|
| [Data-Driven Content Design](./patterns/data-driven-content.md) | umbrella philosophy | **critical** — the entire reason Boilergen exists |
| [Component-Based Design](./patterns/component-based-design.md) | runtime architecture (classical) | high — Unity/Unreal/Godot model |
| [Entity-Component-System (ECS)](./patterns/entity-component-system.md) | runtime architecture (modern) | medium — Bevy/DOTS/Flecs/EnTT |
| [Asset Pipelines & Codegen Integration](./patterns/asset-pipelines.md) | build-time integration | high — informs how Boilergen plugs into a target project's build |

### External resources (curated)

| Entry | Description |
|---|---|
| [External Gamedev Resources](./sources/external-resources.md) | Curated directory of awesome-lists, asset libraries, publisher directories. Source-mining starting point for new entries. |

### Research notes

Raw output of background research runs, kept for traceability:

- [2026-05-01 — Open-source games survey](./research-notes/2026-05-01-games-survey.md) — prioritized list of which games to analyze first.
- [2026-05-01 — Architectural patterns synthesis](./research-notes/2026-05-01-architectural-patterns.md) — cross-cutting patterns observed across the surveyed projects.

## Highest-leverage entries (read first)

If you're new to this base and want maximum signal in 30 minutes:

1. [Data-Driven Content Design](./patterns/data-driven-content.md) — the philosophy underneath everything.
2. [FiveM / altV / RAGE Resources](./engines/fivem-resources.md) — most directly relevant to Grand Games.
3. [Cataclysm: DDA](./games/cataclysm-dda.md) — best worked example of a complete data-driven game.
4. [Asset Pipelines](./patterns/asset-pipelines.md) — how Boilergen integrates with a project's build.

## How to contribute a new entry

1. Copy `_template.md` to the right subfolder, name it `<slug>.md`.
2. Fill in the frontmatter (especially `relevance_to_grandgames` — that's our triage filter).
3. Focus on the **Content architecture** and **Patterns worth borrowing** sections — those are the highest-value parts.
4. Link to specific files / commits in the source repo when describing patterns; don't paraphrase if a one-line reference works.
5. Add the entry to the index above (this README).
6. Before declaring it done, ask: "if I were writing a Boilergen plugin for this stack tomorrow, would this entry be enough to start?"

## What to skip

- Don't waste time on dead projects (last commit > 3 years ago) unless their architecture is uniquely instructive.
- Don't catalog projects you haven't actually read the source of.
- Don't paraphrase the project's README — extract patterns, not summaries.

## Status

**Bootstrap phase complete.** 15 entries across games / engines / patterns. Next priorities (per [games survey research notes](./research-notes/2026-05-01-games-survey.md)):

- More RP-adjacent case studies (Stardew alternates, custom MMO server projects).
- A `pattern` entry on **manifest-first plugin design** (FiveM resources + Foundry systems converge here).
- Re-run modding ecosystems research that was rate-limited in the previous session.
