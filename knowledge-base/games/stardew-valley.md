---
type: game
slug: stardew-valley
title: "Stardew Valley (via SMAPI + Content Patcher)"
genre: rpg
engine: custom-csharp (XNA/MonoGame)
content_format: binary (.xnb) + json (Content Patcher)
language: csharp
license: proprietary (commercial)
source_url: https://stardewvalleywiki.com/Modding:Index
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: medium
tags: [json, content-patcher, smapi, modding, conditional-content, tokens]
---

# Stardew Valley (via SMAPI + Content Patcher)

> Eric "ConcernedApe" Barone's farming RPG. Game itself is closed C# / XNA, but the **modding ecosystem on top is the canonical example of "non-programmers edit data via JSON action types."** Pathoschild's SMAPI (mod loader) + Content Patcher (data-only mod framework) together turn a closed-source game into one of PC gaming's most modded titles. Studied here for **Content Patcher's conditional-content model** — the closest publicly documented pattern to "AI Describe outputs structured edits."

## Stack & scale

- **Engine / language:** C# (XNA → MonoGame), single-developer original code
- **Mod loader:** SMAPI — open-source C# loader (https://github.com/Pathoschild/SMAPI)
- **Content layer:** Content Patcher — JSON-only mod framework on top of SMAPI
- **Mods on Nexus:** 6,000+ Content Patcher packs
- **Modders:** thousands; Content Patcher specifically targets non-coders

## Content architecture (the meat)

### Where entities live (vanilla)

- `Content/` folder ships XnB binary files — XNA's compiled-content format
- Examples:
  - `Content/Data/ObjectInformation.xnb` — items
  - `Content/Data/CraftingRecipes.xnb` — recipes
  - `Content/Data/NPCDispositions.xnb` — NPC personalities
  - `Content/Characters/Schedules/Abigail.xnb` — schedules
- Direct editing requires XnB tools (xnbcli, or custom tools). **Painful.** This is what Content Patcher exists to fix.

### Where entities live (with Content Patcher — the modding default)

- A Content Patcher pack is a folder containing:
  ```
  <pack-name>/
    manifest.json      ← required SMAPI manifest
    content.json       ← required Content Patcher edits
    assets/            ← optional new images, JSON, etc.
  ```
- `manifest.json` example:
  ```json
  {
    "Name": "Better Crops",
    "Author": "...",
    "Version": "1.0.0",
    "Description": "...",
    "UniqueID": "Author.BetterCrops",
    "MinimumApiVersion": "4.0.0",
    "UpdateKeys": ["Nexus:1234"],
    "ContentPackFor": {
      "UniqueID": "Pathoschild.ContentPatcher",
      "MinimumVersion": "2.0.0"
    }
  }
  ```
- `content.json` lists "patches":
  ```json
  {
    "Format": "2.0.0",
    "Changes": [
      {
        "Action": "EditData",
        "Target": "Data/ObjectInformation",
        "Entries": {
          "24": "Parsnip/35/...",
          ...
        }
      },
      {
        "Action": "Load",
        "Target": "Characters/Abigail",
        "FromFile": "assets/abigail-portrait.png",
        "When": { "Season": "Winter" }
      }
    ]
  }
  ```

### Action types (the schema vocabulary)

- `Load` — replace entire asset (image, map, JSON)
- `EditData` — patch entries in a tabular asset (add/modify/delete by key)
- `EditImage` — overlay or splice a region of an image
- `EditMap` — modify a tile map (.tmx-derived asset)
- `Include` — compose multiple content.json files

### Tokens (the conditional layer)

- Patches can include a `When:` block evaluating tokens:
  ```json
  "When": {
    "Season": "Spring, Summer",
    "Weather": "Rain",
    "PlayerGender": "Female",
    "Relationship:Abigail": "Dating, Married"
  }
  ```
- Tokens are dynamic — re-evaluated when game state changes. Patches activate/deactivate live.
- Custom tokens via `DynamicTokens` in content.json — limited mini-language.

### Entity types relevant to us

- **Item** (objects, tools, weapons, hats, boots) — string-encoded fields in `Data/ObjectInformation` (`24: "Parsnip/35/3/Basic..."`). The slash-separated format is legacy XNA-friendly.
- **Crop** — entries in `Data/Crops` defining growth stages, seasons, harvest item
- **NPC** — schedule, dialogue, gift preferences scattered across multiple data assets
- **Recipe** — `Data/CookingRecipes`, `Data/CraftingRecipes`

### Localization

- Stardew uses `i18n/` folders within Content Patcher packs (`i18n/default.json`, `i18n/ru.json`, etc.)
- SMAPI's Translation API loads them automatically
- Content Patcher patches can also use `{{i18n:Key}}` tokens for live-localized strings

### Add-new-content workflow (modder)

To add (say) a new crop:

1. Create folder `<modname>/`, add `manifest.json`
2. Add `content.json` with `EditData` patches against `Data/Crops`, `Data/ObjectInformation`, and image overlays
3. Add asset files (`assets/<crop>.png`)
4. Optional: locale files in `i18n/`
5. Drop folder in `Stardew Valley/Mods/`, launch via SMAPI
6. Content Patcher loads, applies patches at startup, reloads on file change

**No code, no compilation.** Just JSON + images. This is exactly the workflow AI Describe targets.

## Patterns worth borrowing

- **Action type discriminator on every patch (`Action: EditData | Load | EditImage`).** Each action has its own schema. **Direct analogue to our `schema.type`** — same insight as Factorio's prototype types and Boilergen's per-target plugin templates.
- **Token-based conditional content.** A patch can declare "this only applies when condition X holds." For Boilergen, this is a future feature: schemas conditionally generating files based on plugin state.
- **`Include` for composition.** Big mods split content across multiple `content.json` files. Same pattern as our plugin/template separation.
- **`UpdateKeys` for compatibility.** SMAPI checks Nexus/CurseForge for newer mod versions on game launch. **Worth borrowing for Boilergen Hub.**
- **Live-reload of content.** Save the JSON, see changes in-game on next screen transition. Boilergen's `--watch` mode would close this loop.

## Anti-patterns / pitfalls

- **Vanilla data is tabular slash-separated strings (`24: "Parsnip/35/3/Basic..."`).** Designed for XNA's content pipeline, terrible for modders. Content Patcher exists to fix this; if Boilergen ever supports a Stardew-like target, **never emit slash-strings — emit clear keyed JSON Content Patcher edits.**
- **Tokens-as-DSL bloat.** Custom tokens in Content Patcher gradually grew to support arithmetic, conditionals, randomness. Same data-DSL trap noted in `patterns/data-driven-content.md`.
- **Closed-source game.** All progress depends on SMAPI's hooking discipline. When the base game updates, mods break. Boilergen plugins targeting closed-source games inherit this fragility.

## How this connects to Boilergen

- **Plugin candidate:** `stardew-content-patcher` target. Each Boilergen entity → a `Changes` block in `content.json` plus image/data assets.
- **Entity-type mapping:**
  - Boilergen `item` (a future generalization of weapon/tool) → `EditData Data/ObjectInformation`
  - Boilergen `crop` (we don't have this yet, but is a clean fit) → `EditData Data/Crops`
  - Boilergen `npc` → multiple `EditData` patches across Schedules / Dialogue / Dispositions
- **Why this matters strategically:** Content Patcher modders are a **massive non-programmer audience**. AI Describe → JSON patches → Stardew is a tight, demonstrable wedge for Boilergen's "for non-coders" pitch.
- **Distinct from CDDA-style modding:** CDDA's content is the engine's source-of-truth. Stardew Content Patcher is **patches against a closed game**. Both are legitimate plugin target shapes.

## References

- **Modding hub:** https://stardewvalleywiki.com/Modding:Index
- **SMAPI repo:** https://github.com/Pathoschild/SMAPI
- **Content Patcher author guide:** https://github.com/Pathoschild/StardewMods/blob/develop/ContentPatcher/docs/author-guide.md
- **Content Patcher tokens reference:** https://github.com/Pathoschild/StardewMods/blob/develop/ContentPatcher/docs/author-tokens-guide.md
- **Manifest reference:** https://stardewvalleywiki.com/Modding:Modder_Guide/APIs/Manifest
- **xnbcli (XnB tooling):** https://github.com/LeonBlade/xnbcli
