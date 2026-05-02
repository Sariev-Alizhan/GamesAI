---
type: game
slug: mindustry
title: Mindustry — open-source mobile-shipping factory/RTS with hybrid content system
genre: rts
engine: libgdx
content_format: mixed
language: java
license: gpl-3.0
source_url: https://github.com/Anuken/Mindustry
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: high
tags: [mobile, multiplayer, modding, content-data, java, code-as-content, hjson, i18n]
---

# Mindustry — hybrid content architecture

> Active-development open-source factory/RTS by Anuken, **shipping on Android, iOS, Windows, macOS, Linux** simultaneously. ~163,000 LOC of Java, GPL-3 licensed. The most relevant takeaway for GamesAI: Mindustry uses a **two-tier content system** — first-party game content lives **as Java code** (statically typed, IDE-completion-friendly), and mod content lives **as HJSON files** (data-driven, designer-friendly). Both feed the same registry. This is a deliberate trade-off worth understanding when designing Boilergen's data pipelines.

## Stack & scale

- **Engine / language:** Java + libGDX, Arc framework (Anuken's wrapper)
- **Lines of code:** ~163,000 (core/src), ignoring asset blobs
- **Active contributors:** ~50 in the past 12 months (per `git shortlog`)
- **Notable releases / forks:** Mindustry-Logic-Editor (third-party tooling), Mindustry-Mods/v7 ecosystem
- **Multiplayer:** custom UDP-based protocol, dedicated-server deployable as a fat JAR
- **Localization:** **36 locales** in `core/assets/bundles/` (Java `.properties` format)

## Content architecture (the meat)

### Where entities live — first-party

In `core/src/mindustry/content/`. Each content type (`Items`, `Blocks`, `UnitTypes`, `Liquids`, ...) is a single Java class declaring all of its instances as `public static` fields, initialised in a `load()` method using Java's instance-initializer-block syntax:

```java
// from core/src/mindustry/content/Items.java
public class Items{
    public static Item copper, lead, graphite, coal, titanium, ...;

    public static void load(){
        copper = new Item("copper", Color.valueOf("d99d73")){{
            hardness = 1;
            cost = 0.5f;
            alwaysUnlocked = true;
        }};
        // ... ~25 more items
    }
}
```

This pattern (`new Item("id", color){{ field = value; }}`) gives:

1. **Static type safety.** `Items.copper` is an `Item` reference checked at compile time. Renaming `copper` to `bronze` is a one-keystroke refactor that propagates everywhere.
2. **IDE completion.** Designer typing `Items.` sees every item enumerated.
3. **One source of truth.** No drift between schema and runtime — they're the same thing.

The cost is **designer experience**: anyone adding a new item must edit Java, recompile, and own the consequences. Modders are not expected to do this.

### Where entities live — mod content

In `Mods.java` (`core/src/mindustry/mod/`), the mod loader scans every loaded mod's directories for `*.json` / `*.hjson` files, parses them via `ContentParser`, and registers the result into the same global registry as first-party content. Mod content shape mirrors first-party — a mod's `content/items/iron.hjson` looks like:

```hjson
{
  name: iron
  hardness: 4
  cost: 0.9
  color: 999999
}
```

Mods don't compile Java. The `ContentType` enum (`core/src/mindustry/ctype/ContentType.java`) defines the registry classes — every type a first-party Java class registers can also be registered from mod HJSON.

**This is the core insight:** Mindustry runs two authoring pipelines for one runtime registry. Java for engineering rigor; HJSON for content designers and mods.

### `ContentType` enum (the type registry)

```java
public enum ContentType{
    item(Item.class),
    block(Block.class),
    bullet(BulletType.class),
    liquid(Liquid.class),
    status(StatusEffect.class),
    unit(UnitType.class),
    weather(Weather.class),
    sector(SectorPreset.class),
    planet(Planet.class),
    team(TeamEntry.class),
    unitCommand(UnitCommand.class),
    unitStance(UnitStance.class);
}
```

The `_UNUSED` slots in this enum (`mech_UNUSED`, `effect_UNUSED`, `loadout_UNUSED`, `ammo_UNUSED`, `typeid_UNUSED`) are **kept for save-file backwards compatibility** — the comment `// Do not rearrange, ever!` is load-bearing. Any change to enum order breaks every existing save and every existing mod. This is a strong example of **versioning game content through deletions-as-tombstones**.

### Entity granularity

`Block.java` (the parent class for all placed-tile entities) has **312 public fields**. Items are simpler (~10 fields). Units are complex (composition with `UnitType`, `Weapons`, `Abilities`).

Block field categories include:
- Physics: `health`, `armor`, `solid`, `flammability`
- Visual: `region`, `variants`, `lightColor`, `glowColor`
- Build: `requirements` (which items needed), `buildTime`, `placeableLiquid`
- Logic: `update`, `hasItems`, `hasLiquids`, `hasPower`, `consumesPower`
- Multiplayer: `enableDrawStatus`, `quickRotate`, `commandable`

A Boilergen-equivalent YAML for a Mindustry block would have to be flat-with-categories. Designing that schema is non-trivial; Mindustry sidesteps it by using Java fields directly.

### Localization

`core/assets/bundles/bundle_<locale>.properties`. **36 locales** including Russian, Kazakh-adjacent (Bashkir, Ukrainian — but no `bundle_kk.properties` for Kazakh as of 2026-05-02). Format is Java `.properties`:

```properties
item.copper.name = Copper
item.copper.description = A common, soft metal used in many basic constructions.
block.coal-extractor.name = Coal Extractor
```

Keys follow `<contentType>.<id>.name` / `<contentType>.<id>.description` convention — the same shape Boilergen's i18n target produces. **This validates the convention** GamesAI's Localization Assistant assumes.

Translation contributions are coordinated via a single `TRANSLATING.md` and Crowdin (per repo readme). 36 active locales is heavy maintenance — strong signal that a deterministic-first lint pass (placeholder parity, length overflow) would have caught issues for them too.

## Patterns worth borrowing

### 1. **Two-tier content system**

For Boilergen, the analogous design would be:
- **First-party content** = author in YAML + generate static-typed C# / Lua / TypeScript wrappers (this is what Boilergen does).
- **User-mod content** = a runtime HJSON loader that parses mod files into the **same** target structures generated by Boilergen.

This would let a studio ship hand-tuned content with full type safety **and** accept third-party mods through a data-only path. Boilergen could generate both the codegen for first-party AND the parser/loader for mod content from one schema. Track for v2 of Boilergen.

### 2. **Tombstone enum for save compatibility**

Mindustry's `_UNUSED` enum slots show a discipline: when a feature is removed, you don't rearrange existing IDs — you mark the slot dead. This applies to every entity registry that's ever serialized to disk. Boilergen schemas should ship the same convention: removing an entity means tombstoning its id, not reusing it.

### 3. **Localization key convention**

`<type>.<id>.<field>` is a Schelling-point convention that Mindustry (Java), Unity Localization, ICU MessageFormat, and our `generic-rp` plugin all converge on. We should hold this convention firmly — any deviation costs interoperability with downstream tools.

### 4. **Mobile-first multiplayer for indie scale**

Mindustry runs on Android with peer-hosted multiplayer at indie scale (under-100 players). They use a custom UDP protocol (`core/src/mindustry/net/`), not Unity NGO or Photon. For Flump (NGO 2.9.1), this is a comparison point — Mindustry shows a different ceiling for indie multiplayer without a third-party netcode license.

## Anti-patterns / pitfalls

### Code-as-content barrier for non-engineers

Designers can't add a new item in Mindustry without writing Java. The mod path partially solves this for community contributors but not for first-party content. Boilergen's YAML approach is **kinder to design teams**.

### 312-field Block class

`Block.java` has accumulated 312 public fields. There's no inheritance hierarchy (e.g. `WallBlock`, `TurretBlock`) at the field-data level — turret-specific fields exist on the base `Block` class with default values that turrets override. This works but is a **god-class** that hurts readability. Boilergen avoids this by having multiple entity types (`weapon` vs `vehicle` vs `business`) with focused field sets per type.

### `.properties` for localization

Java `.properties` files don't support ICU plural / select forms natively. Mindustry works around this by hand-rolling `1 enemy / 2 enemies` distinction in code. Modern tools (ICU MessageFormat, Unity Localization) would be cleaner — but for a Java game targeting Android API levels old enough to not have first-class ICU, `.properties` is a reasonable compromise.

## How this connects to Boilergen

- Mindustry's `<contentType>.<id>.<field>` localization convention is exactly what Boilergen's i18n target emits. **Validates the convention.**
- A Boilergen plugin for Mindustry mods (`plugins/mindustry-mod/`) is plausible: generate `mod.hjson` + per-content `*.hjson` files from one YAML. Modders get AI Describe + i18n discipline they currently lack. **Track for v3 of Boilergen.**
- The two-tier system (code first-party + HJSON mods) is a **product idea worth stealing** for GamesAI's own future module 4 — runtime mod loader that reads the same shape Boilergen's codegen target emits. Each studio decides which side they want; Boilergen makes both possible from one schema.

## What a `mindustry-mod` Boilergen plugin would generate

```
schemas/mindustry-mod/iron-extractor.yaml
   ↓
boilergen/plugins/mindustry-mod/
  targets/
    mod-content/
      block/iron-extractor.hjson    # the entity definition
    mod-meta/
      block/...                     # mod.hjson updates
    sprites/
      block/iron-extractor.placeholder.png  # naming convention enforcement
    bundles/
      en.properties                 # i18n keys
```

`unity-mobile-shooter`-style sibling plugin. Roughly 4–6 templates. Reference YAML would mirror real Mindustry mod entries (e.g. one of the Anuken-Mods/v7 community mods).

## References

- Main repo: https://github.com/Anuken/Mindustry (GPL-3)
- Java code-as-content pattern: `core/src/mindustry/content/Items.java`
- ContentType enum (registry): `core/src/mindustry/ctype/ContentType.java`
- Mod loader (HJSON parsing): `core/src/mindustry/mod/Mods.java`
- Localization: `core/assets/bundles/`, 36 locales
- Crowdin / `TRANSLATING.md`: https://github.com/Anuken/Mindustry/blob/master/TRANSLATING.md
- Anuken-Mods/v7 community mod ecosystem: https://github.com/Anuken/Mindustry-Wiki

## Local artefacts

- `boilergen/plugins/unity-mobile-shooter/` — the sibling pattern Boilergen would clone for `mindustry-mod/`
- `knowledge-base/patterns/data-driven-content.md` — overlapping pattern (this entry adds the hybrid first-party + mod nuance)
- `knowledge-base/patterns/locale-static-checks.md` — relevant for Mindustry's 36-locale bundle discipline
