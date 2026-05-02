---
type: game
slug: beyond-all-reason
title: Beyond All Reason — large-scale RTS unit data on Recoil Engine
genre: rts
engine: recoil-spring
content_format: lua
language: lua
license: gpl-2.0
source_url: https://github.com/beyond-all-reason/Beyond-All-Reason
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: medium
tags: [rts, lua, recoil, spring, unit-data, balance, multiplayer, 200-player]
---

# Beyond All Reason — large-scale RTS unit data

> Beyond All Reason (BAR) is an open-source RTS built on the Recoil Engine (a
> Spring fork), GPL-2 licensed for code. Confirms the **Lua-tables-as-data**
> pattern at industrial scale: **978 unit definition files**, ~155 fields per
> unit on average, three factions, eight unit class folders per faction. Each
> unit is a pure Lua return table with no behavioural code — engine consumes
> the data, scripts (in `.cob` / `.bos` files) drive animation. A Boilergen-
> equivalent for this scale would have to ship statistical outlier detection
> (the "balance smell" pass on the GamesAI roadmap) — at 978 units, eyeballing
> a typo'd `metalcost: 99999` is impossible.

## Stack & scale

- **Engine / language:** Recoil Engine (Spring fork) + Lua scripts
- **Code license:** GPL-2 (`LICENSE.md` is explicit: "the Recoil Engine requires that all the code the games use be compatible with GPL v2 or later")
- **Asset license:** complex — models by Cremuss are CC-BY-SA 4.0, all other models/textures CC-BY-NC-ND 4.0 (Beherith). **Patterns can be cited; assets cannot be redistributed.**
- **Unit data scale:** 978 `.lua` files in `units/`, ~155 fields each
- **Factions:** Arm, Cor, Legion (third faction, recent addition)
- **Multiplayer scale:** scales to 200+ players per match per Recoil engine docs
- **Authoring tool:** repository data; no in-game editor — designers edit Lua directly

## Content architecture

### One file = one unit, pure data table

Every unit is a Lua file returning a single nested table:

```lua
-- units/ArmBots/armwar.lua (Warrior bot, the basic Arm-faction infantry)
return {
    armwar = {
        buildpic = "ARMWAR.DDS",
        buildtime = 4200,
        health = 1590,
        metalcost = 270,
        energycost = 3100,
        speed = 45,
        sightdistance = 350,
        maxslope = 17,
        movementclass = "BOT3",
        objectname = "Units/ARMWAR.s3o",
        script = "Units/ARMWAR.cob",
        customparams = {
            model_author = "Kaiser",
            unitgroup = "weapon",
            -- ...
        },
        weapondefs = {
            -- nested weapon definitions per unit
        },
        featuredefs = {
            dead = { /* corpse data */ },
        },
    },
}
```

The file pattern: top-level `return { unit_name = { ...all fields... } }`. Engine reads it via `dofile`-equivalent and merges into the unit definition registry.

### Field categories

A typical unit has fields in roughly these clusters (~155 total on average):

| Cluster | Examples | Count |
|---|---|---|
| Identity | `buildpic`, `objectname`, `script`, `corpse` | ~5 |
| Cost | `metalcost`, `energycost`, `buildtime` | 3 |
| Physics | `health`, `speed`, `maxacc`, `maxdec`, `turnrate`, `maxslope`, `maxwaterdepth`, `turninplace`, `mass` | ~15 |
| Combat | `sightdistance`, `radardistance`, `weapondefs[]`, `nochasecategory`, `firestate`, `weapon1turretx/y` | ~25 |
| Visuals | `collisionvolumeoffsets`, `collisionvolumescales`, `collisionvolumetype`, `iconType`, `selfdestructas`, `explodeas` | ~15 |
| Animation/death | `featuredefs.dead`, `featuredefs.heap`, `corpse`, `seismicsignature` | ~10 |
| Categorisation | `category`, `movementclass`, `unitgroup`, `subfolder` | ~10 |
| customparams | open-ended studio-specific extension | ~5–60 |

The `customparams` table is BAR's escape hatch — anything the game-specific Lua scripts need but the engine doesn't consume.

### No inheritance

Every unit explicitly enumerates every field. There's no shared base struct that's overridden — defaults come from the engine. The cost is duplication (978 units × 155 fields = ~150,000 field-value pairs in the codebase). The benefit is **diff clarity** — when a balance change touches one unit, exactly that one Lua file changes in the PR. No cross-cutting refactor risk.

### Animation as separate `.cob` / `.bos` files

Each unit references a `.cob` (compiled Spring script bytecode) or `.bos` (source) by path:

```lua
script = "Units/ARMWAR.cob",
```

Animation logic — leg-swing during walk, turret-elevation during aim — lives in those files, not in the data. This **separation of data from animation** is the key to BAR's authoring scalability: balance designers edit the Lua, animators edit the `.bos`, neither steps on the other.

## Patterns worth borrowing

### 1. Statistical outlier detection at the field level

With 978 units sharing the same field shape, a single-typo `metalcost: 99999` is invisible to human review at the file level — but **trivial to spot statistically**: it's >100σ from the mean. This is precisely the **balance-smell pass** GamesAI's Schema Validator has on its roadmap (horizon-3 task 3.5, see [`ROADMAP.md`](../../ROADMAP.md)). BAR's data shape **validates the design**: when you have hundreds of entities with shared field shape, statistics is the only way to catch typos.

Concrete proposal for the GamesAI implementation (deterministic part, pre-AI):

```
For each entity type (e.g. weapon):
  For each numeric field (damage, fireRate, magazineSize, ...):
    Compute mean + standard deviation across all entities of that type
    Flag any entity where field is > N σ from mean (N = 3 by default)
    Severity: warning (advisory)
```

The AI advisory layer (which BAR doesn't have) would then add **judgement** on top: "this damage is unusually low for an assault rifle class — typo or design intent?"

### 2. customparams as the schema escape hatch

BAR's `customparams` table is a per-unit catch-all for studio-specific data the engine doesn't read. This is the **right shape** for letting a Boilergen plugin's schema have a forward-compatible extension point: every entity declares a `customparams` map, validators ignore it, downstream codegen emits it as-is.

```yaml
# Future Boilergen schema with extension point
type: weapon
data:
  damage: 45
  customparams:
    studio_specific_tag: "anniversary-edition"
    balance_passes: 3
```

### 3. Animation references separated from data

`script = "Units/ARMWAR.cob"` — the unit data file points at, but doesn't contain, animation code. For Boilergen-generated Unity / FiveM resources, the analogous pattern is references to `.anim` / animator controllers and `.fbx` model files. Generated YAML should keep these as path strings (which it does for `unity-mobile-shooter`'s `weaponIcon`, `fireSound` etc.), never inline.

## Anti-patterns / pitfalls

### Field bloat without organisation

155 fields per unit means a designer adding a new unit copies an existing one and tweaks 20 values. The other 135 stay copied — including outdated fields that no longer apply. This is the trade-off for "no inheritance": files are independent but redundant. BAR's solution is to **template via copy-paste**, which Boilergen replaces with a YAML schema + codegen — same Lua output, less drift.

### Lua data files compiled from string concatenation

When a tool generates Lua data (e.g. an asset import script), the temptation is `text = "return {\n armwar = { health = " .. h .. " ... }"` style concatenation. This breaks on Lua reserved-word keys and complex string values. Use a real Lua serializer (`Loadstring`-able output) — Boilergen's Handlebars templates do this correctly.

### Asset license fragmentation

BAR's `LICENSE.md` lists 5+ licenses depending on what part of the repo you're touching. **For GamesAI**, this is a reminder: **never bundle BAR assets into our distributions**. Cite patterns from BAR code (GPL-2, citation OK) but treat models / textures / icons / unit pics as off-limits.

## How this connects to GamesAI

- **Validates the balance-smell pass design.** 978 units sharing a field shape is the canonical "lots of similar entities" case that statistical outlier detection serves. When the pass ships, BAR data could be a real-world test set (read-only, never bundled).
- **Inspires `customparams` extension point.** Future Boilergen schemas should reserve a free-form map for studio-specific extensions — same shape as BAR's customparams.
- **Confirms separation of data from animation.** The `script = "Units/ARMWAR.cob"` pattern is the same impulse as Unity ScriptableObject SOs referencing `.anim` files. Boilergen's `unity-mobile-shooter` weapon templates already follow this.

## What a `recoil-spring` Boilergen plugin would look like

```
schemas/recoil-spring/heavy-tank.yaml
  ↓
boilergen/plugins/recoil-spring/
  targets/
    units/
      <faction>/
        <unit>.lua          # the Lua data return table
    customparams-validators/  # optional schema for customparams[] entries
```

Niche audience (Recoil/Spring engine users — BAR, Total Annihilation revival, etc.) but the pattern is straightforward — sibling to `unity-mobile-shooter` and `mindustry-mod`. Track for v3+ of Boilergen if a Recoil studio shows interest.

## References

- Main repo: https://github.com/beyond-all-reason/Beyond-All-Reason (GPL-2 code; mixed assets — see LICENSE.md)
- Recoil Engine: https://github.com/beyond-all-reason/RecoilEngine
- Sample unit file (cited): `units/ArmBots/armwar.lua`
- License notes: `LICENSE.md` (BAR repo root)
- Compare to: [`games/mindustry.md`](./mindustry.md) (Java DSL approach), [`games/quake-qc.md`](./quake-qc.md) (1996 function-as-entity), [`patterns/data-driven-content.md`](../patterns/data-driven-content.md)
