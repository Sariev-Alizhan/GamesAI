---
type: research-notes
date: 2026-05-01
agent: open-source-games-survey
status: complete
---

# Games survey — analysis priority list (2026-05-01)

> Output of a focused research run to identify which open-source games are worth analyzing for our knowledge base. Saved verbatim to inform future entry-writing decisions.

## Tier 1 — must analyze (in priority order)

### 1. QBCore Framework — `github.com/qbcore-framework/qb-core`
- Lua, ~714★, actively maintained, ~1,500 commits
- The dominant modern FiveM RP framework. **Direct genre fit for Grand Games.**
- Jobs in `shared/jobs.lua`: Lua tables with `label`, `type` (leo/ems/mechanic), `defaultDuty`, `offDutyPay`, plus nested `grades` keyed by rank (`name`/`payment`/`isboss`).
- Items live in `shared/items.lua`, vehicles in `shared/vehicles.lua`. Same pattern.
- **This is the canonical RP-entity schema in the wild.**
- Pattern extraction: ~half a day. Companion docs at `docs.qbcore.org`.

### 2. ESX Legacy — `github.com/esx-framework/esx_core`
- The other dominant FiveM framework. Older, more entrenched, incompatible with QBCore.
- Worth duplication: extracting both gives the **schema diff between two FiveM standards**, exposing essential vs accidental fields.
- Look for `config/` and `shared/main.lua`.
- Pattern extraction: half a day.

### 3. RimWorld XML Def system
- Game itself closed, but the **modding ecosystem is the textbook for data-driven entity design**.
- Wiki: `rimworldwiki.com/wiki/Modding_Tutorials/XML_Defs`, community: `rimworldmodding.wiki.gg`.
- Every entity is a `<Def>` (ThingDef, RecipeDef, BiomeDef…), with abstract+inheritance via `ParentName`, list-append vs replace semantics, prefix-based namespacing.
- **Core patterns to extract:** abstracts/inheritance, def categories, `defName` namespacing.
- ~1 day reading wiki + community mods (`RimWorldMod/RimworldModdingFiles`).

### 4. Tuxemon — `github.com/Tuxemon/Tuxemon`
- Python, monster-fighting RPG, JSON content format.
- All game data in `resources/db/`: `monster/`, `technique/`, `item/`, `npc/`, `economy/`, `dialog/`.
- Each subfolder is one entity type with one JSON file per instance.
- Has dedicated **MonsterMaker web tool** — proves the format is good enough for a content editor on top.
- Discussions in repo about JSON vs YAML migration are gold (kept JSON for modder accessibility).
- Half a day.

### 5. Reldens — `github.com/damian-pastorini/reldens`
- Node.js + Phaser browser MMORPG, MIT, ~250★.
- **Closest match for our tech stack** (TypeScript-ish Node, Express-style backend, browser client).
- Has **automatic data generators and import commands** for attributes/levels/maps/objects — pattern of "config → DB seed".
- Trade system NPC↔player, multiplayer state, integrated database engines.
- Half a day. Worth it because it bridges browser/mobile + RP entities + tooling.

## Tier 2 — worth analyzing (briefly)

- **Veloren** (gitlab.com/veloren/veloren, Rust, voxel RPG) — content as RON files (Rust Object Notation, similar to YAML). Items, recipes, NPCs, abilities all data-driven.
- **OpenMW** (gitlab.com/OpenMW/openmw, C++, Morrowind reimpl) — Bethesda ESM/ESP binary. Interesting: OpenMW-CS construction kit as proof point for visual schema editor.
- **Endless Sky** (github.com/endless-sky/endless-sky, C++) — indentation-based hierarchical text format. Excellent **modify-by-overlay** pattern.
- **Stendhal** (github.com/arianne/stendhal, Java) — XML in `data/conf/`. Mature ~20yr, good for legacy patterns.
- **Stardew Valley Content Patcher** (github.com/Pathoschild/StardewMods) — JSON-only content packs with action types (Load, EditData, EditImage, EditMap), tokens for conditionals. Reference for "non-programmers modify data".
- **Athena Framework / Rebar** (github.com/Stuyk/altv-athena) — alt:V TypeScript framework. Type-safe character/profession systems.
- **vRP framework** (github.com/vRP-framework/vRP, Lua) — older FiveM alternative. Diff signal vs QBCore reveals what's idiosyncratic vs essential.

## Bonus pointers (high-leverage)

- **RimWorld Modding Wiki** — covers XML def patterns better than any single open-source codebase. Treat as primary source for "abstract+inheritance" pattern.
- **FiveM Cfx.re Cookbook & forum** — `forum.cfx.re/c/development` has framework-comparison threads (ESX vs QBCore vs vRP).
- **"Game Programming Patterns" by Robert Nystrom** — free online (`gameprogrammingpatterns.com`). Type Object + Component patterns are the theoretical scaffolding.
- **Pathoschild's Stardew Mod tooling** — single best document on "data-driven content packs for non-programmers".

## Honest signals

- **Tier 1 #3 (RimWorld)** is the only one without raw source — game is closed. All RimWorld value comes from wiki + def-XML mods.
- **GTA-RP-adjacent open-source is thinner than expected.** QBCore + ESX + vRP cover ~95% of the field.
- **Mobile RP open source is essentially empty.** No genuine open-source mobile RP to analyze. Patterns must transfer from FiveM/Tuxemon/Reldens.
- **Recommended first batch:** QBCore + Tuxemon + RimWorld modding wiki. Three orthogonal lenses (Lua-tables, JSON, XML-with-inheritance) covering ~80% of patterns.
