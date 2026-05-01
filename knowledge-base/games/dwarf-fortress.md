---
type: game
slug: dwarf-fortress
title: "Dwarf Fortress (raws system)"
genre: sim
engine: custom-cpp
content_format: text (proprietary tag format)
language: cpp
license: proprietary (commercial via Steam, free Classic version)
source_url: https://dwarffortresswiki.org/index.php/Modding
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: low
tags: [raws, plain-text, modding, creature, item, material, body, language]
---

# Dwarf Fortress (raws system)

> Tarn Adams's procedurally-generated fantasy sim, in development since 2002 — single-developer (with brother Zach on lore). The "raws" system is **the most extreme example of data-driven content in any shipped game**: every creature, item, material, body part, language, biome, plant, deity, and reaction is a plain-text definition the engine parses at startup. Even the dwarves themselves are a definition you could replace. Studied here for the **fully-data-driven extreme** and what it teaches about the limits of plain-text content.

## Stack & scale

- **Engine / language:** C++ (originally pure C, ASCII-rendered, now Steam version with art)
- **Lines of raws:** ~50k+ in the base game across hundreds of files
- **Dev team:** 1 (Tarn Adams) + lore brother (Zach)
- **Development span:** 2002–ongoing, 24 years
- **Modding scene:** small but extremely dedicated. DFHack (https://dfhack.org) is the canonical modding/utility framework

## Content architecture (the meat)

### Where entities live

- `raw/objects/` (Steam version: `data/vanilla/<vanilla-mod>/objects/`)
- One file per major category, named `<category>_<subcategory>.txt`:
  ```
  raw/objects/
    creature_standard.txt        ← humans, dwarves, elves, animals
    creature_savage_temperate.txt
    creature_subterranean.txt
    item_weapon.txt
    item_armor.txt
    item_ammo.txt
    item_instrument.txt
    material_template_default.txt
    tissue_template_default.txt
    body_default.txt
    body_detail_plan_default.txt
    plant_standard.txt
    inorganic_stone_layer.txt
    inorganic_stone_mineral.txt
    reaction_smelter.txt
    interaction_standard.txt
    language_DWARF.txt
    language_words.txt
    descriptor_color_standard.txt
    descriptor_pattern_standard.txt
    entity_default.txt           ← civilizations
  ```

### Format: tag-based bracket syntax

Every raw file is a list of `[TAG:VALUE:VALUE:...]` directives, one per line, processed sequentially:

```
[OBJECT:CREATURE]

[CREATURE:DWARF]
    [DESCRIPTION:A short, sturdy creature fond of drink and industry.]
    [NAME:dwarf:dwarves:dwarven]
    [CASTE_NAME:dwarf:dwarves:dwarven]
    [CREATURE_TILE:1][COLOR:7:0:1]
    [BODY:HUMANOID:HEART:GUTS:BRAIN:SKULL:5FINGERS:5TOES:MOUTH:THROAT:NECK:SPINE:NOSE:EAR:5EYELIDS:5EYES:3FACIAL_FEATURES:RIBCAGE]
    [BODY_DETAIL_PLAN:STANDARD_MATERIALS]
    [BODY_DETAIL_PLAN:STANDARD_TISSUES]
    [USE_TISSUE_TEMPLATE:HEART:HEART_TEMPLATE]
    [BODY_DETAIL_PLAN:VERTEBRATE_TISSUE_LAYERS:SKIN:FAT:MUSCLE:BONE:CARTILAGE]
    [SELECT_TISSUE_LAYER:HEART:BY_CATEGORY:HEART]
    ...
```

This is **not nested** — it's a state machine. The current "scope" is `[CREATURE:DWARF]` until another `[CREATURE:...]` appears or the file ends. Tags modify the current object.

### Composition via templates

- `[BODY:HUMANOID]` references a body plan defined elsewhere (in `body_default.txt`)
- `[BODY_DETAIL_PLAN:STANDARD_MATERIALS]` runs a procedural pre-defined "macro" attaching materials to body parts
- `[USE_MATERIAL_TEMPLATE:WEAPON:METAL_TEMPLATE]` reuses common material patterns
- `[COPY_TAGS_FROM:OTHER_CREATURE]` — explicit inheritance

### Entity types we care about

#### Creature (the closest thing to NPC)
- `[CREATURE:ID]` opens definition
- Hundreds of possible modifier tags: `[INTELLIGENT]`, `[CIV_CONTROLLABLE]`, `[CASTE:MALE]`, `[BIOME:MOUNTAIN]`, `[NATURAL_SKILL:MINING:5]`, `[STATE_NAME_ADJ:ALL_SOLID:frozen <name>]`
- Castes (sub-types within a creature): male/female, queen/worker for hive species, child/adult morphs

#### Item / weapon
- `[ITEM_WEAPON:ITEM_WEAPON_PICK]` opens weapon definition
- Fields: `[NAME:pick:picks]`, `[DAMAGE:50:BLUNT]`, `[VELOCITY_MULTIPLIER:1000]`, `[ATTACK:EDGE:50:5:hack:hacks:NO_SUB:1500]`
- Attacks are nested sub-definitions with skill modifiers, contact area, penetration
- Armor, ammo, trapcomp, instrument all follow the `[ITEM_<TYPE>:<ID>]` pattern

#### Material
- `[INORGANIC:IRON]` for metals/stones, `[MATERIAL_TEMPLATE:LEATHER_TEMPLATE]` for organic templates
- Materials carry temperature thresholds, melting/boiling points, density, stress tolerances — **physically simulated**

#### Profession (sort of)
- DF doesn't have player classes, but `[ENTITY:DWARVES]` (in `entity_default.txt`) defines what positions a civilization has: BARON, COUNT, EXPEDITION_LEADER, MILITIA_COMMANDER, etc.
- Each position has tags for succession rules, mandatory skills, response duties

### Localization

- Strings embedded in raws (`[NAME:dwarf:dwarves:dwarven]`)
- Some translations exist via community work but the base game doesn't ship a translation system — strings are baked
- Languages in the IN-GAME world are also raws (`language_DWARF.txt`, `language_ELF.txt` define vocabulary used to procedurally name dwarves/elves/etc.)

### Add-new-content workflow (modder)

For adding a new creature:

1. Open `raw/objects/creature_<custom>.txt` in plain text editor
2. Write `[OBJECT:CREATURE]` header
3. Add `[CREATURE:NEW_BEAST]` block with required tags — minimum is `[NAME]`, `[BODY]`, `[CREATURE_TILE]`, etc.
4. Reference body plans, materials from existing files
5. Drop into `raw/objects/` of an existing save (or new world)
6. Generate a new world (raws are baked into worlds at gen time)

**Modding old saves is hard** because raws are world-locked. New world generation is required to absorb new raws. This is unique to DF and partially a consequence of its world-simulation depth.

## Patterns worth borrowing

- **Total-content moddability.** Even the protagonist race (dwarves) is a raw you can replace. **The strongest possible commitment to data-driven design.** Few games go this far.
- **Composition via named templates.** `[USE_MATERIAL_TEMPLATE:METAL_TEMPLATE]`, `[BODY_DETAIL_PLAN:STANDARD_TISSUES]` — modders compose new content from primitive building blocks. **Worth borrowing in spirit:** Boilergen plugins could expose "template fragments" that schemas reference.
- **Physical simulation as data.** Materials carry density, melt point, sharpness. Combat resolution is computed from these — not hand-tuned damage tables. Most games would benefit from this kind of data discipline.
- **Procedural-language raws.** Dwarves don't have hand-written names; the engine builds names from `language_DWARF.txt` words. Same for civilizations, regions, deities. Compelling pattern for any game with procedurally-generated entities.

## Anti-patterns / pitfalls

- **Wonky parser.** Tag must be `[CREATURE:DWARF]`, not `[Creature: DWARF]`. Whitespace-sensitive in subtle ways. No standard editor support beyond syntax highlighting.
- **Order-dependent state machine.** `[SELECT_TISSUE_LAYER:HEART]` only makes sense after `[BODY_DETAIL_PLAN]` ran. Errors in ordering cause silent fallthrough or runtime crashes.
- **No formal schema.** Documentation is the wiki, painstakingly maintained by community. Validation happens at world-gen, not parse-time.
- **Raws baked into save files.** Cannot mod existing worlds. Boilergen's "regenerate idempotently" model is much friendlier.
- **Format is showing its age.** 25-year-old text format. New tags accumulate without deprecation. Modders consult wiki to determine what's still functional vs vestigial.

## How this connects to Boilergen

- **Plugin candidate:** `df-raws` target generating `.txt` files in DF's tag format. **Niche but technically possible.**
- **Entity-type mapping:**
  - Boilergen `weapon` → `[ITEM_WEAPON:...]` block with attacks as nested sub-blocks
  - Boilergen `creature` (we don't have this) → `[CREATURE:...]` block with body/material composition
  - Boilergen `vehicle` → no clean DF equivalent (DF has wagons, but they're rare)
  - Boilergen `profession` → entity positions (loose fit)
- **Strategic fit:** **Low.** DF's modding scene is small, the format is hostile, and the audience is hardcore. Worth understanding for the patterns, not worth shipping a Boilergen plugin for unless someone in the community asks.
- **Lessons we apply elsewhere:**
  - Avoid order-dependent parsing — Boilergen's YAML is order-independent, keep it that way
  - **Schema in code (Zod), not in folklore (DF wiki).** This is exactly what we do.
  - Consider physics-as-data for future schemas (materials with density/melt point/sharpness — for any RP/sim game with crafting)

## References

- **Modding wiki:** https://dwarffortresswiki.org/index.php/DF2014:Modding
- **Creature token reference:** https://dwarffortresswiki.org/index.php/DF2014:Creature_token
- **Item token reference:** https://dwarffortresswiki.org/index.php/DF2014:Item_token
- **Material token reference:** https://dwarffortresswiki.org/index.php/DF2014:Material_token
- **DFHack (modding utilities):** https://dfhack.org/ + https://github.com/DFHack/dfhack
- **Bay 12 Games (developer site):** https://www.bay12games.com/dwarves/
- **DF Steam mods workshop:** https://steamcommunity.com/app/975370/workshop/
