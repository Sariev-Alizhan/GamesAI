---
type: game
slug: cataclysm-dda
title: "Cataclysm: Dark Days Ahead"
genre: rpg
engine: custom-cpp
content_format: json
language: cpp
license: CC BY-SA 3.0 (content) + custom for engine
source_url: https://github.com/CleverRaven/Cataclysm-DDA
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: high
tags: [profession, item, vehicle, npc, dialogue, modding, data-driven, json]
---

# Cataclysm: Dark Days Ahead

> An open-source post-apocalyptic survival RPG that's been actively developed since 2013. Notable for our purposes because **all game content — items, professions, vehicles, monsters, NPCs, dialogue, recipes, mutations — lives in JSON files** that the engine loads at runtime. It's one of the cleanest examples in open-source of "engine is fixed, content is data" — exactly the architecture Boilergen's plugin model is built for.

## Stack & scale

- **Engine / language:** C++ (custom engine, no Unity/Unreal — closest analogue is GM1's stack)
- **Lines of code:** ~600k C++, plus tens of thousands of JSON definitions
- **Active contributors:** 100+ in last 12 months; thousands historically
- **Notable forks:** Bright Nights (combat-focused fork), Tilesets (visual mods)

## Content architecture (the meat)

This is the section that matters. CDDA's content layer is a near-perfect match for what Boilergen helps build.

### Where entities live

- **All content in `data/json/`** — separate subfolder per entity type:
  ```
  data/json/
    professions.json
    items/
      armor.json
      weapons/
        guns.json
        melee.json
      ...
    vehicles/
      cars.json
      ...
    npcs/
      <faction>.json
    dialogue/
    monstergroups/
    recipes/
    mutations/
    ...
  ```
- **Plain JSON arrays** of entity objects. No SQL, no generated code, no compile step for content.
- **Single source of truth per entity** — IDs are global; engine indexes by `id` at startup.
- **Mods are layered overrides** — drop a folder under `data/mods/<modname>/` and the engine merges/replaces by id.

### Entity types we care about

#### Profession (`professions.json`)

Approximate shape (from memory; verify against repo):

```json
{
  "type": "profession",
  "id": "lab_technician",
  "name": "Lab Technician",
  "description": "You worked in a research lab...",
  "points": 2,
  "skills": [
    { "level": 3, "name": "computer" },
    { "level": 2, "name": "electronics" }
  ],
  "items": {
    "both": ["jeans", "polo_shirt"],
    "male": ["briefs"],
    "female": ["panties"]
  },
  "traits": ["FAST_LEARNER"]
}
```

Key takeaways:
- Profession is **inert data** — no scripts, no code references. Just describes starting state of a character.
- `id` is snake_case ASCII, globally unique. Same convention Boilergen uses.
- Localization handled via separate translation files (gettext-style PO).
- Adding a new profession = adding one JSON object. **No code changes.**

#### Items (`items/**/*.json`)

Hierarchy: `tool`, `gun`, `ammo`, `armor`, `comestible`, `book`, etc. — each its own subtype.

Generic fields shared by all items: `id`, `name`, `description`, `weight`, `volume`, `price`, `material`, `flags`.
Type-specific: guns have `ammo`, `dispersion`, `damage`; armor has `coverage`, `encumbrance`, `warmth`; etc.

**The pattern Boilergen mimics:** different `type` values pull in different shapes inside `data`. Our `schema.type: weapon` vs `schema.type: profession` is exactly this.

#### Vehicles (`vehicles/cars.json`)

Vehicle = a list of **part placements** on a 2D grid:

```json
{
  "type": "vehicle",
  "id": "car",
  "name": "car",
  "parts": [
    { "x": -1, "y": 0, "part": "frame_horizontal" },
    { "x": -1, "y": 0, "part": "engine_v6" },
    { "x": -1, "y": 0, "part": "battery_car" },
    ...
  ]
}
```

Part definitions live separately in `data/json/vehicleparts/`. Each part has weight, durability, function flags. **The vehicle JSON is just a layout** — composition over inheritance.

This is more complex than our current `vehicle` schema (we just have flat fields). For a future Boilergen plugin under a CDDA-like engine, we'd need either nested data structures or multi-file outputs.

#### NPCs and dialogue

- NPC class definitions: `data/json/npcs/`
- Dialogue trees: `data/json/dialogue/` — each topic is a JSON object with `dynamic_line`, `responses` (with `condition` predicates and `effect` actions).
- Conditions are a small expression language (also JSON). Allows non-trivial branching without scripting.

This is **heavier than what we currently model**. If we want Boilergen plugins to support dialogue, we'd need a new entity type with nested branching semantics.

### Localization

- gettext PO files in `lang/`
- Strings get extracted from JSON (`name`, `description`) at build time via a custom script (`lang/update_pot.sh`).
- One PO file per language.

This decouples content addition (English-only JSON) from translation (PO files) — same approach Boilergen could adopt: `i18n` shared target generates string-extract stubs.

### Add-new-content workflow

What a community contributor does to add (say) a new profession:

1. Find the right file (e.g. `data/json/professions.json` or a mod's equivalent)
2. Add a JSON object with required fields, run a JSON validator
3. Test in-game (CDDA loads JSON at startup)
4. Optional: add translations
5. Open PR

**No code generation, no IDE, no compile.** The engine is the codegen — it transforms data into in-game behavior at runtime.

This is a different philosophy than Boilergen, which generates code at design-time. **Both philosophies are valid:**
- CDDA-style: engine reads data at runtime → fast iteration, no rebuilds. Cost: harder to refactor entity shape.
- Boilergen-style: codegen at design-time → static type safety, IDE help, easier refactor. Cost: rebuild required.

A Boilergen plugin for a CDDA-like engine would probably **just emit JSON** rather than C++, since the target engine prefers data over code.

## Patterns worth borrowing

- **Strict ID conventions** — snake_case ASCII, globally unique, same as ours. Validates Boilergen's `id` rule.
- **Type discriminator + free-form data** — CDDA's items have `"type": "gun"` then gun-specific fields. Same shape as our `schema.type` + `data`.
- **Mods as overlay folders** — the engine merges multiple JSON sources, last one wins. For Boilergen's future plugin marketplace, **same overlay model** would let users compose templates from multiple sources.
- **JSON arrays as content registry** — no central registry file; the engine scans directories. Good for community contributions: drop a file, it's in. Boilergen's `plugin/targets/<target>/<entity-type>/` follows similar convention.
- **Dialogue conditions as a tiny DSL embedded in JSON** — instead of scripting, expressions are JSON objects that the engine interprets. For a future Boilergen feature, "expressions in YAML" could enable branching content without templates.

## Anti-patterns / pitfalls

- **Implicit field requirements scattered across the codebase.** What fields are required for a `gun`? You read the C++ to find out. Reasonable for a hobbyist project but painful at scale. **Boilergen avoids this** via Zod schemas — required fields enforced at parse time with clear errors.
- **No JSON Schema published.** Validators are custom. Modders learn by example. Boilergen's `schema-export` command is a directly better answer here.
- **Refactoring entity shape is high-risk.** Changing a field name across thousands of JSON entries means a manual scripted migration. Boilergen sidesteps this by treating outputs as generated; refactor the template, regenerate.
- **No explicit versioning per entity.** If you change the `gun` schema, all existing guns must update or break. **Lesson:** for plugin marketplaces, version the schema separately from individual entities.

## How this connects to Boilergen

- **A future Boilergen plugin "cdda-mod"** could generate JSON directly into a CDDA mod folder. Output target = `cdda-mod`. No C++ code generated.
- **Entity types map cleanly:**
  - CDDA `profession` ↔ our `schema.type: profession`
  - CDDA `gun` / `melee` ↔ our `schema.type: weapon`
  - CDDA `vehicle` (more complex) ↔ a future expansion of `schema.type: vehicle`
  - CDDA `npc_class`, `talk_topic` — would need new `schema.type` values
- **Templates we could prototype today:** profession + weapon JSONs as a Boilergen plugin. We have working knowledge of both shapes.
- **Gap:** CDDA's vehicle is a parts graph, not flat fields. Our generator currently emits one file per template; would need multi-file output (one per part) or nested schema support.

## References

- **Main repo:** https://github.com/CleverRaven/Cataclysm-DDA
- **Modding docs:** https://github.com/CleverRaven/Cataclysm-DDA/blob/master/doc/JSON_INFO.md (this is the canonical reference for content authors — closest thing to our JSON Schema)
- **Wiki:** https://cddawiki.chezzo.com (community, varied quality)
- **Mods directory:** `data/mods/` in the repo — read these to see overlays in practice
- **Bright Nights fork:** https://github.com/cataclysmbnteam/Cataclysm-BN — useful for seeing what gets forked when contributors disagree on content philosophy
