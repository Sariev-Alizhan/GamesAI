---
type: game
slug: factorio
title: Factorio
genre: sim
engine: custom-cpp
content_format: code
language: cpp+lua
license: proprietary (commercial)
source_url: https://wiki.factorio.com/Prototype
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: medium
tags: [lua, prototypes, modding, recipes, items, three-stage-pipeline, type-discriminator]
---

# Factorio

> Wube Software's automation/factory-building sim. Closed-source engine (C++) but **first-party Lua data layer**: every game-defined entity (items, recipes, machines, technologies, fluids, tiles, science packs) is a Lua table loaded at startup via a documented public API. Mod ecosystem of 5,000+ active mods on the official portal proves the model. Highly relevant to us as a study of the **type-discriminator + multi-stage data pipeline** pattern.

## Stack & scale

- **Engine / language:** C++ engine, Lua 5.2 for content + control scripts
- **Lines of Lua content:** base game ships ~25k lines of prototype Lua across `core/` and `base/` mods (yes — the base game itself is a mod)
- **Active contributors:** internal team + thousands of external mod authors
- **Mod portal:** mods.factorio.com — one of the most mature mod ecosystems in PC gaming
- **Sales:** 5M+ copies — proves the model scales commercially

## Content architecture (the meat)

### Where entities live

- Each mod (including the built-in `base` mod) lives in a folder with `info.json` (manifest) + Lua files
- Standard convention: `<mod>/prototypes/<category>.lua`
  ```
  base/
    info.json
    data.lua                     ← entry point, requires the rest
    data-updates.lua             ← optional second pass
    data-final-fixes.lua         ← optional third pass
    prototypes/
      item/iron-plate.lua
      recipe/iron-plate.lua
      entity/stone-furnace.lua
      technology/electronics.lua
      ...
    locale/en/base.cfg
    graphics/icons/iron-plate.png
  ```
- Each Lua file calls `data:extend{...}` with an array of prototype tables
- Game executes ALL mods' `data.lua`, then ALL `data-updates.lua`, then ALL `data-final-fixes.lua`. **Three-stage pipeline lets mods cooperate** — base mod defines, others patch.

### Entity types (the prototype system)

Every prototype is a Lua table with a mandatory `type` field that determines its schema. Hundreds of `type` values exist; common ones:

```lua
data:extend{
  {
    type = "item",
    name = "iron-plate",
    icon = "__base__/graphics/icons/iron-plate.png",
    icon_size = 64,
    subgroup = "raw-material",
    order = "b[iron-plate]",
    stack_size = 100
  },
  {
    type = "recipe",
    name = "iron-gear-wheel",
    enabled = false,
    energy_required = 0.5,
    ingredients = {{"iron-plate", 2}},
    result = "iron-gear-wheel"
  }
}
```

#### Item / weapon
- `type = "item"` (basic), `"ammo"` (weapons), `"gun"` (weapon entity), `"capsule"` (consumable), `"tool"` (research)
- Weapons are split: `gun` defines fire rate/range, `ammo` defines damage and effects
- Identifying fields: `name` (snake_case unique ID), `icon`, `stack_size`, `subgroup`, `order` (alphanumeric sort key)

#### Vehicle / unit
- `type = "car"` (basic vehicle), `"locomotive"`, `"cargo-wagon"`, `"spider-vehicle"`
- Fields like `weight`, `friction`, `acceleration`, `consumption` (energy), `inventory_size`, `equipment_grid` (modular slots)

#### Recipe
- `type = "recipe"` — `ingredients` array, `result` (or `results` array), `energy_required` (seconds), `category` (which crafter type)
- Critical pattern: recipes reference items by name string — late-binding gives mods huge composability

#### Profession-equivalent: Technology
- `type = "technology"` — `prerequisites` (other technology names), `effects` (unlocks, bonuses), `unit` (cost in research time + science packs)
- This is the closest Factorio analogue to our profession concept — gates progression

#### NPC-equivalent: Biter / spawner
- `type = "unit"` (enemies), `"unit-spawner"` — has `attack_parameters`, `pollution_to_join_attack`, `vision_distance`

### Localization

- `<mod>/locale/<lang>/<filename>.cfg` files
- INI-like format with sections:
  ```
  [item-name]
  iron-plate=Iron plate

  [item-description]
  iron-plate=A flat sheet of refined iron.
  ```
- Section name corresponds to prototype category
- Keys reference prototype `name`
- **Translation is decoupled from data** — adding a new item requires zero locale work to ship in English; translations land async

### Add-new-content workflow

For a modder adding a new weapon:

1. Create mod folder `<modname>/`, write `info.json` (id, name, version, dependencies)
2. Write `data.lua` with `data:extend{...}` calls — define the gun (`type="gun"`) and the ammo (`type="ammo"`)
3. Add icon PNGs under `<modname>/graphics/icons/`
4. Add locale entries in `<modname>/locale/en/<modname>.cfg`
5. Add a recipe so the player can craft it
6. Add a technology that unlocks the recipe
7. Drop folder in `~/.factorio/mods/`, launch game

No build step. Game loads all mods at startup. Reload requires restart.

## Patterns worth borrowing

- **Type discriminator with category-specific schemas.** Same shape as our `schema.type` + `data` split. Factorio takes this further with hundreds of types, each with a distinct schema documented at https://lua-api.factorio.com/latest/prototypes.html.
- **Three-stage data pipeline (`data` → `data-updates` → `data-final-fixes`).** Base game declares in stage 1, balance mods patch in stage 2, compatibility-fix mods patch in stage 3. **Inspiration for Boilergen Hub:** when multiple plugin templates compose, give them ordered phases instead of "last writer wins."
- **Mod manifest with explicit dependencies + version constraints (`info.json`).** Already similar to our `boilergen.config.yaml`, but Factorio's is richer — dependencies can be required, optional, or hidden.
- **Decoupled locale files.** Translation is its own contributor flow. Worth keeping for any Boilergen plugin that emits user-facing strings.
- **Auto-discovery via convention.** Just drop a mod folder, no registration step. Boilergen's plugin loader follows the same instinct.

## Anti-patterns / pitfalls

- **Schema is documented, not enforced.** Modders learn by example. Type errors surface as runtime crashes with stack traces. Boilergen's Zod schemas are a strict improvement.
- **Field-name churn between game versions.** Factorio bumps prototype schemas across major releases (e.g. 0.17 → 0.18 broke many mods). No automated migration. **Lesson:** version your schema separately from your engine.
- **Lua's lack of types.** A `recipe.ingredients` field can be `{{"iron-plate", 2}}` or `{{type="item", name="iron-plate", amount=2}}` — both valid, no compiler help. Boilergen sidesteps via Zod.

## How this connects to Boilergen

- **Plugin candidate:** `factorio-mod` target. Each Boilergen entity (e.g. `weapon`) would generate a `<weapon>.lua` file with `data:extend{...}`, plus an entry in `locale/en/<modname>.cfg`, plus a recipe + technology if requested.
- **Entity-type mapping:**
  - Boilergen `weapon` → Factorio `gun` + `ammo` + `recipe` + `technology` (multiple Lua entries from one YAML — multi-output template)
  - Boilergen `vehicle` → Factorio `car` / `locomotive`
  - Boilergen `profession` → no direct mapping (Factorio doesn't have player classes)
- **Gap to fill:** Factorio's three-stage pipeline implies Boilergen plugins might need an "execution phase" annotation (e.g., `phase: data-updates`).
- **Marketing angle:** Factorio is one of the largest active mod communities. A Boilergen plugin that simplifies mod authoring (especially for non-Lua coders via AI Describe) is a meaningful wedge.

## References

- **Prototype API reference:** https://lua-api.factorio.com/latest/
- **Wiki — Prototype docs:** https://wiki.factorio.com/Prototype
- **Wiki — Mod structure tutorial:** https://wiki.factorio.com/Tutorial:Mod_structure
- **Wiki — Modding tutorial:** https://wiki.factorio.com/Tutorial:Modding_tutorial
- **Mod portal:** https://mods.factorio.com/
- **info.json reference:** https://wiki.factorio.com/Tutorial:Mod_structure#info.json
