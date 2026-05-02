---
type: game
slug: space-station-14
title: Space Station 14 — the largest YAML-prototype RP multiplayer codebase in OSS
genre: rp
engine: robust-toolbox
content_format: yaml
language: csharp
license: mit
source_url: https://github.com/space-wizards/space-station-14
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: critical
tags: [rp, multiplayer, yaml-prototype, ecs, fluent, csharp, modding, ss13, robust-toolbox]
---

# Space Station 14 — YAML-prototype RP at industrial scale

> SS14 is a remake of Space Station 13 built on Robust Toolbox (C# engine
> homegrown by Space Wizards Federation). MIT-licensed code, CC-BY-SA assets.
> Shipped on Steam since 2024, active 2026 dev. **2,068 YAML prototype files
> defining 10,670 entity prototypes** with **9,101 inheritance declarations**
> (multi-parent: `parent: [BaseItem, BaseSecurityContraband]`) — **the largest
> data-driven RP-multiplayer codebase in the open-source world.** Validates
> Boilergen + Schema Validator design at industrial scale and surfaces
> patterns we don't yet have in our knowledge base: multi-parent inheritance,
> Fluent (Mozilla FTL) localization with ICU-grade plural/select natively,
> and a 25-type prototype taxonomy that goes far beyond classic CRUD entities.

## Stack & scale

- **Engine:** Robust Toolbox (C#, MIT) — github.com/space-wizards/RobustToolbox
- **Language:** C# 93%, YAML for content, Fluent (FTL) for locale
- **License:** MIT (code), CC-BY-SA 3.0 (assets) — clean for citation; assets cite-don't-bundle
- **Prototype files:** **2,068** under `Resources/Prototypes/`
- **Entity prototypes:** **10,670** (`- type: entity`)
- **Inheritance edges:** **9,101** `parent:` declarations — **multi-parent inheritance**
- **Prototype taxonomy:** 25+ distinct `- type: ...` values (entity, latheRecipe, marking, decal, Tag, loadout, construction, reagent, reaction, flavor, entityTable, constructionGraph, cargoProduct, soundCollection, startingGear, dungeonRoom, localizedDataset, stack, microwaveMealRecipe, guideEntry, listing, tile, loadoutGroup, foodSequenceElement, latheRecipePack, ...)
- **Locales:** en-US (1,181 .ftl files — full game text), nl-NL (partial)
- **Fork ecosystem:** Frontier Station 14, Delta-V, imp — each diverges in `Resources/Prototypes/_FORKID/` directories layered on top of upstream

## Why this matters for GamesAI

SS14 is **the closest existing thing** to what GamesAI's wedge envisions — RP-multiplayer with massive data-driven content authored as YAML, shipped to real players, MIT-licensed, modern C# stack matching Flump's. Every architectural pattern here is verifiable at scale — patterns that work for 10,670 entities work for any indie's 100. Gold-standard reference.

## Content architecture (the meat)

### Components-as-YAML (ECS-as-data)

Every entity is a YAML object with a `components:` list. Each component has a `- type: <ComponentName>` and its own field set. Engine reads these at startup and constructs ECS components from them. Example (lightly trimmed) — `Resources/Prototypes/Entities/Objects/Weapons/security.yml`:

```yaml
- type: entity
  name: stun baton
  parent: [BaseItem, BaseSecurityContraband]
  id: Stunbaton
  description: A stun baton for incapacitating people with...
  components:
  - type: Sprite
    sprite: Objects/Weapons/Melee/stunbaton.rsi
    layers:
    - state: stunbaton_off
      map: [ "enum.ToggleableVisuals.Layer" ]
  - type: Stunbaton
    energyPerUse: 50
  - type: ItemToggle
    predictable: false
    soundActivate:
      collection: sparks
      params:
        variation: 0.250
  - type: MeleeWeapon
    wideAnimationRotation: -135
    damage:
      types:
        Blunt: 7
    bluntStaminaDamageFactor: 2.0
```

This is **the canonical "data is the schema, code consumes it"** pattern. Every component referenced in YAML must have a matching C# class registered in Robust Toolbox. The validator at game-start fails the load if a YAML component name doesn't resolve.

### Multi-parent inheritance — pattern we don't have yet in Boilergen

The single most interesting architectural detail in SS14:

```yaml
parent: [BaseItem, BaseSecurityContraband]
```

A prototype can inherit from **multiple parents**. The merge resolution is "shallow merge component lists, parents earlier are overridden by parents later, child overrides all." This is **mixin-style multi-inheritance** for game data — `BaseItem` provides "is an item, has a sprite slot, can be picked up", `BaseSecurityContraband` provides "is contraband for security to confiscate." A flash inherits from `[BaseItem, BaseSecurityScienceCommandContraband]`.

Boilergen's `generic-rp` schemas currently have a flat structure (no inheritance). For 7 entity types and 1 reference YAML each, this is fine. **At SS14's 10,670-entity scale, multi-parent mixins would be necessary** — without them, every weapon repeats the "is an item" and "has stamina damage factor" boilerplate. Track for **Boilergen v2 schema language**: support `parent: [...]` field, perform shallow-merge on components/grades/grades arrays at codegen time.

### Prototype taxonomy — 25 distinct types

SS14 doesn't restrict itself to entity/item/recipe. Selected types and counts:

| Type | Count | What it is |
|---|---|---|
| `entity` | 10,670 | composable entity (weapon, character, machine, food, ...) |
| `latheRecipe` | 882 | crafting recipe for lathes/protolathes |
| `marking` | 776 | character appearance markings (tattoos, hair styles) |
| `decal` | 760 | floor/wall decorations |
| `Tag` | 486 | string tags for cross-cutting categorisation |
| `loadout` | 438 | starting outfit pieces by job |
| `construction` | 431 | multi-step build-by-hand instructions |
| `reagent` | 411 | chemistry primitives |
| `reaction` | 313 | chemistry reactions between reagents |
| `flavor` | 300 | food/drink taste descriptions |
| `entityTable` | 299 | spawn-list weighted tables |
| `constructionGraph` | 281 | directed graph of construction states |
| `cargoProduct` | 243 | cargo console buyable products |
| `soundCollection` | 241 | randomised sound pools |
| `startingGear` | 232 | per-job inventory at round start |
| `dungeonRoom` | 225 | procedural room templates |
| `localizedDataset` | 218 | i18n-aware string lists |
| `stack` | 213 | stackable item types |
| `microwaveMealRecipe` | 213 | cookable recipes |

This is **way beyond** what Boilergen's `generic-rp` covers (7 types). It's not that we should match SS14's taxonomy — those are SS14-specific. But the lesson is clear: **a serious RP project will accumulate 20–30 entity types over its lifetime**, and the schema/validator architecture has to handle that without exploding. Boilergen's per-entity-type plugin templates currently scale linearly per type — fine for SS14's count if studios want to ship plugins for each.

### Fluent (FTL) localization — Mozilla's modern format

`Resources/Locale/en-US/shell.ftl` and 1,180 sibling files use **Fluent**, Mozilla's localization format:

```fluent
shell-command-success = Command successful
shell-invalid-command-specific = Invalid {$commandName} command.
shell-wrong-arguments-number-need-specific = Need {$properAmount} arguments, there were {$currentAmount}.
```

Fluent **natively supports**:
- Variable substitution: `{$varName}`
- Plural / select forms (with full ICU plural rules per locale — Russian's three forms work correctly)
- Term references / shared snippets
- Comments
- Structured nesting

This is a step up from Java `.properties` (Mindustry's format) which has neither plural nor variable typing. **Localization Assistant should add Fluent (`*.ftl`) as an alternative file format alongside JSON.** Concrete v0.4 task: parse Fluent variables `{$var}`, run the same placeholder-parity check we already do for JSON, support per-locale plural form validation against CLDR rules.

### Fork ecosystem — namespace-aware modding at scale

SS14 has a **deliberate fork pattern**: Frontier (`new-frontiers-14/frontier-station-14`), Delta-V, imp. Each fork keeps merged with upstream by structuring its custom prototypes under a `_NF` / `_DV` / `_IMP` directory prefix. So `Resources/Prototypes/Entities/Objects/Weapons/security.yml` is upstream; `Resources/Prototypes/_NF/Entities/Objects/Weapons/frontier-blasters.yml` is fork-only. Multi-parent inheritance lets fork prototypes inherit from upstream bases without copy-paste.

This is **directly what Schema Validator's namespace-by-directory mode supports** (we shipped this earlier in commit `aa03451`). SS14's fork dynamic is the canonical "lots of similar entities across namespaces with cross-references" pattern that Schema Validator's namespace mode was designed for. Real-world test target.

## Patterns worth borrowing

### 1. Multi-parent inheritance for prototype schemas

Add a `parent: <id> | [<ids>]` field to Boilergen schema spec. At codegen time, resolve in topological order: deepest ancestor first, current entity last. Components/grades/fields with the same name in multiple parents resolve via "later parent wins, self wins over all parents." Track for Boilergen v2 schema language.

### 2. Fluent format as i18n target

Localization Assistant currently reads JSON only. Adding FTL parsing gets us:
- ICU-grade plural rules per locale (Russian one/few/many/other)
- Variable typing
- Compatibility with the largest OSS RP-multiplayer codebase in existence
- Demonstrable demo target (point Localization Assistant at SS14's `Resources/Locale/en-US/`, fill `ru-RU/` from scratch)

Track for v0.4 of Localization Assistant.

### 3. Component lists as a flexible field

Instead of fixed schema fields per entity type, SS14 entities have an open-ended `components:` array. Each component is type-tagged. This trades static type guarantees (you can't tell from schema what fields exist) for flexibility (any new component class is automatically usable). Boilergen's current per-entity-type approach is the opposite trade-off.

For most studio adoption, **per-entity-type beats components-list**: fewer surprises, better AI Describe RAG quality, designer-friendlier. But for a Schema Validator extension, the components-list pattern means we should emit warnings on unrecognised component types (validate against a registered set), not block them — the studio's own engine has the source of truth.

### 4. Tag system as cross-cutting categorisation

`- type: Tag` (486 instances) + `- type: Tag` references inside entities. Tags are first-class entities that can be referenced as cross-references. SS14 uses them for things like `IsPet`, `HighRiskItem`, `MeatSliceable`. Boilergen could borrow this: introduce a `tag` entity type in `generic-rp` for cross-cutting attributes.

## Anti-patterns / pitfalls

### Massive single-file prototype dumps

`Resources/Prototypes/Entities/Objects/Weapons/security.yml` defines ~10 weapons in one file. Some directories have 30-weapon files. This is **convenient for editing related items together** but breaks per-file unit-of-work for tooling — diffs are noisy when one entity changes; PR review becomes harder. Boilergen's one-file-per-entity convention (e.g. `assault-rifle.yaml` standalone) avoids this. Trade-off: more files.

### Asset license fragmentation

Models, sprites, sounds in SS14 are CC-BY-SA 3.0 — copyleft viral. Cite patterns from the YAML schemas and component layout (MIT, fine), but don't bundle any assets. Same trap as BAR (see `beyond-all-reason.md`).

### Robust Toolbox lock-in

The component types referenced in YAML are C# classes registered in Robust Toolbox. The YAML is **engine-specific**. There is no portable way to take SS14 prototypes and run them in another engine without rewriting Robust Toolbox. This is a feature, not a bug — they accept the coupling for the productivity it gives — but it's why Boilergen targets multiple engines via codegen, not a single runtime.

## How this connects to GamesAI

- **`generic-rp` plugin scope check.** SS14's 25-type prototype taxonomy validates that 7 types are an early-stage starting point, not a stopping point. Plan for plugin growth: business expansions (e.g. add `recipe`, `loadout`, `tag` to generic-rp in a future v2).
- **Schema Validator namespace mode is real-world-validated.** SS14's fork ecosystem is exactly the multi-namespace-with-cross-references pattern our namespace-by-directory mode handles. We could ship a public demo that runs Schema Validator on SS14 + a real fork side by side, surfacing namespace-resolution decisions visibly.
- **Localization Assistant should add Fluent (.ftl) support.** Track for v0.4. Demo target: SS14 `Resources/Locale/en-US/` → `ru-RU/` fill via the Anthropic provider.
- **Multi-parent schema inheritance** is the next big language extension for Boilergen. Track for Boilergen v2.

## A `space-station-14` Boilergen plugin would look like

```
boilergen/plugins/space-station-14/
  targets/
    prototypes/
      entity/<id>.yml      # SS14 prototype YAML output
    locale/
      en-US/<id>.ftl       # Fluent locale stubs

schemas/space-station-14/
  Stunbaton.yaml           # studio-authored, simpler shape
  ↓ generates ↓
  components-list with proper inheritance, drop-in to SS14 fork
```

This is **the most defensible Boilergen plugin** for community traction — fork authors of SS14 would be the early adopters. Track for v3+.

## References

- Main repo: https://github.com/space-wizards/space-station-14 (MIT code, CC-BY-SA 3.0 assets)
- Robust Toolbox engine: https://github.com/space-wizards/RobustToolbox
- Frontier Station 14 fork: https://github.com/new-frontiers-14/frontier-station-14
- Sample prototype cited: `Resources/Prototypes/Entities/Objects/Weapons/security.yml`
- Sample locale cited: `Resources/Locale/en-US/shell.ftl`
- Mozilla Fluent specification: https://projectfluent.org/
- Compare to: [`games/mindustry.md`](./mindustry.md) (Java DSL approach), [`games/beyond-all-reason.md`](./beyond-all-reason.md) (978-unit Lua data), [`games/quake-qc.md`](./quake-qc.md) (1996 function-as-entity)
- Compare to GamesAI internal: `boilergen/plugins/generic-rp/` (7 entity types, flat), `tools/schema-validator/` (namespace mode added in `aa03451`)
