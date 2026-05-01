---
type: game
slug: openra
title: OpenRA
genre: rts
engine: custom-csharp
content_format: yaml
language: csharp
license: GPL v3
source_url: https://github.com/OpenRA/OpenRA
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: medium
tags: [yaml, traits, inheritance, rts, mod-sdk, c-sharp, mod, content]
---

# OpenRA

> Open-source recreation engine for the classic Westwood RTS games — Red Alert, Tiberian Dawn, Dune 2000, Tiberian Sun. Strong example of **YAML-driven entity composition** with a clean trait/component architecture in C#. Especially relevant because it ships **multiple mods (RA, CNC, D2K, TS)** built on the same engine, demonstrating how plugin-style content composition works in practice.

## Stack & scale

- **Engine / language:** C# (.NET 6+), open-source GPL v3
- **Mods (built-in):** Red Alert, Tiberian Dawn, Dune 2000, Tiberian Sun (in-progress)
- **Lines of YAML:** 30k+ across all mods
- **Lines of C#:** ~200k
- **Active contributors:** dozens, with a steady release cadence
- **Mod SDK:** dedicated repo for community-authored standalone mods (https://github.com/OpenRA/OpenRAModSDK)

## Content architecture (the meat)

### Where entities live

Inside each mod folder under `mods/<mod-id>/`:

```
mods/ra/
  mod.yaml                    ← mod manifest
  rules/
    aircraft.yaml
    defaults.yaml
    husks.yaml
    infantry.yaml
    misc.yaml
    ships.yaml
    structures.yaml
    vehicles.yaml
    civilian.yaml
    ai.yaml
  weapons.yaml
  sequences/
  tilesets/
  audio/
  languages/
    en.ftl
```

`mod.yaml` is a manifest declaring metadata + which YAML files to load:

```yaml
Metadata:
    Title: Red Alert
    Description: Aftermath
    Version: dev
    Website: http://www.openra.net

RequiresMods:
    ra: dev

Packages:
    ~^SupportDir|Content/ra
    ~^EngineDir|mods/common
    ...

Rules:
    mods/ra/rules/aircraft.yaml
    mods/ra/rules/defaults.yaml
    ...

Weapons:
    mods/ra/weapons.yaml

Sequences:
    mods/ra/sequences/aircraft.yaml
    ...
```

### YAML format with inheritance and traits

Each "rule" is a YAML node naming the actor (unit, structure, etc.) and listing **traits** (C# classes that attach behavior + data):

```yaml
^Vehicle:
    Inherits: ^SpriteActor
    UpdatesPlayerStatistics:
        AddToArmyValue: true
    HitShape:
    Selectable:
        Bounds: 24, 18, 0, 0
        DecorationBounds: 28, 22, 0, 0
    SelectionDecorations:
    Tooltip:
        GenericName: actor-tooltip-vehicle.generic-name
    Targetable:
        TargetTypes: Ground, Vehicle
    AttackMove:
    AutoTarget:
    Mobile:
        Locomotor: wheeled
    Health:
        HP: 75000
    Armor:
        Type: Heavy
    RevealsShroud:
        Range: 5c0

E1:
    Inherits: ^Soldier
    Buildable:
        Queue: Infantry
        BuildPaletteOrder: 10
        Prerequisites: ~barr, ~techlevel.infantry
        BuildDuration: 200
        BuildDurationModifier: 100
        Cost: 100
    Tooltip:
        Name: actor-e1.name
    Health:
        HP: 5000
    Mobile:
        Speed: 56
    AttackFrontal:
    Armament:
        Weapon: M1Carbine
    Demolition:
        Voice: Attack
```

Key features:
- **`^` prefix denotes "abstract" templates** — not instantiable, only inheritable (`^Vehicle`, `^Soldier`, `^SpriteActor`)
- **`Inherits:`** for single-parent inheritance
- **YAML keys are trait names** — each maps to a C# class (e.g., `Mobile`, `Health`, `Armament`)
- **Trait values are constructor params** — fields documented via `[Desc]` attributes in the C# source

### Traits — the engine API surface

Each YAML key is a C# class implementing `ITraitInfo`:

```csharp
public class HealthInfo : ConditionalTraitInfo
{
    [Desc("HitPoints. Set to 0 to disable.")]
    public readonly int HP = 0;

    [Desc("Trigger interfaces such as AnnounceOnKill?")]
    public readonly bool NotifyAppliedDamage = true;

    public override object Create(ActorInitializer init) { return new Health(init, this); }
}
```

`[Desc]` attributes generate the documentation at https://docs.openra.net/en/release/traits/ — auto-doc-from-source pattern.

**Important:** the engine only knows traits that are compiled into it. Modders can write new C# traits, ship them as DLLs alongside the mod. Pure-YAML mods can only compose existing traits.

### Entity types relevant to us

#### Vehicle / unit / structure
- The dominant entity type in OpenRA. Defined as actor entries with `Mobile`/`AttackBase`/`Health` traits.
- Boilergen `vehicle` → OpenRA actor with `Mobile`/`AttackFrontal`/`Health`

#### Weapon (separate from actors)
- Defined in a separate `weapons.yaml`:
  ```yaml
  M1Carbine:
      ReloadDelay: 25
      Range: 4c0
      Report: gun18.aud
      Burst: 1
      Projectile: Bullet
          Speed: 384
      Warhead@1Dam: SpreadDamage
          Spread: 64
          Damage: 1500
          ...
  ```
- Damage model is composable: a weapon has projectile + warheads, each warhead applies effects
- Boilergen `weapon` → OpenRA weapon entry with projectile/warhead structure

#### NPC (AI-controlled units)
- Same data as player units, with `AutoTarget` and `Voiced` traits and `Buildable.Queue: Infantry` etc.
- AI personalities defined separately in `mods/<mod>/ai.yaml`

#### Profession-equivalent
- N/A — RTS, no player classes

### Localization

- Modern OpenRA uses **Project Fluent** (`.ftl` files) — Mozilla's modern translation format
- Files under `mods/<mod>/languages/<lang>.ftl`:
  ```
  actor-e1-name = Rifle Infantry
  actor-tooltip-vehicle-generic-name = Vehicle
  ```
- Tooltip references the key: `Tooltip: Name: actor-e1.name`

### Add-new-content workflow (modder)

For a community mod adding a new unit:

1. Use the OpenRA Mod SDK (a templated repo)
2. Add `<unit-id>` entry to a rules YAML, inheriting from `^Vehicle` or `^Soldier`
3. Override traits as needed (Mobile speed, Armor type, weapon)
4. Add weapon entry in weapons.yaml
5. Add sprite sequences in sequences/
6. Add audio in audio/
7. Add localization in languages/en.ftl
8. Test with `make test` or in-engine
9. Distribute via OpenRA's Mod page or GitHub

**No C# required** if the trait you need already exists.

## Patterns worth borrowing

- **`^Abstract` template prefix.** Cleanly separates instantiable entries from inheritable templates. **Worth borrowing for Boilergen schemas** if we ever support inheritance — `_base.yaml` or `^abstract` as a prefix convention.
- **Trait composition via YAML keys, with C# classes as the implementation.** Engine defines available "components", YAML composes them. **Direct analogue:** Boilergen's templates are the engine-side, plugin authors compose entity definitions.
- **Auto-documentation from `[Desc]` attributes.** Traits self-document. **Borrow for Boilergen plugins:** plugin templates could expose JSON Schema or auto-doc from their fields, generated at plugin-load time.
- **Manifest-driven file loading (`mod.yaml` lists which YAMLs to load).** More explicit than auto-discovery — enables dependency control. Worth considering for plugins with many template files.
- **Project Fluent for localization.** Modern, supports plurals/genders/conditionals well. If Boilergen's `shared` target ever expands, Fluent is a sensible default over slash-strings.

## Anti-patterns / pitfalls

- **YAML inheritance is its own DSL.** `Inherits:` chains can grow deep. Modders new to OpenRA find debugging "where does this field come from?" hard. Boilergen could borrow the cleaner alternative: keep inheritance shallow, prefer composition.
- **Trait-version coupling to engine version.** When the engine adds/removes a trait field, all mods using it must update. **Lesson:** treat plugin templates as a versioned API.
- **Custom DLLs increase fragility.** Mods that ship custom C# DLLs are platform-version-locked. Pure-YAML mods are portable. **Lesson for Boilergen Hub:** keep templates as data, avoid shipping native code per-template.

## How this connects to Boilergen

- **Plugin candidate:** `openra-mod` target. Each Boilergen entity → a YAML actor entry, plus a weapon entry if applicable, plus a Fluent translation entry.
- **Entity-type mapping:**
  - Boilergen `vehicle` → OpenRA actor with `Mobile`/`AttackFrontal`/`Health` traits
  - Boilergen `weapon` → OpenRA weapon with projectile/warhead structure
  - Boilergen `npc` → OpenRA actor with `AutoTarget`/`AI` traits
  - Boilergen `profession` — no clean RTS mapping; skip
- **Strategic fit:** **MEDIUM.** RTS modding community is smaller than RP, but OpenRA is a strong reference for **multi-mod-from-one-engine** architecture. Educational for our future Boilergen Hub design.
- **What we'd learn from a deep build:** how a Boilergen entity expands to **multiple files in different sub-paths** (rules YAML + weapons YAML + sequence YAML + ftl). Currently our templates are 1-file-per-entity-per-target; OpenRA shows the multi-file shape.

## References

- **Main repo:** https://github.com/OpenRA/OpenRA
- **Mod SDK (template for community mods):** https://github.com/OpenRA/OpenRAModSDK
- **Trait reference (auto-generated):** https://docs.openra.net/en/release/traits/
- **YAML format guide:** https://github.com/OpenRA/OpenRA/wiki/YAML
- **Modding guide:** https://github.com/OpenRA/OpenRA/wiki/Modding-Guide
- **Fluent localization standard:** https://projectfluent.org/
- **OpenRA homepage:** https://www.openra.net/
