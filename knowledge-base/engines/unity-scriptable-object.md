---
type: engine
slug: unity-scriptable-object
title: Unity ScriptableObject Pattern
genre: any
engine: unity
content_format: binary (.asset) + text (YAML override)
language: csharp
license: n/a (Unity engine)
source_url: https://docs.unity3d.com/Manual/class-ScriptableObject.html
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: medium
tags: [unity, scriptableobject, data-asset, csharp, weapon, profession, item]
---

# Unity ScriptableObject Pattern

> Unity's native solution for "data that isn't a GameObject." A `ScriptableObject` subclass defines fields; instances become `.asset` files in the project that designers create via the editor menu. Loaded once, shared across scenes — perfect for weapon defs, profession tables, item catalogs.

## What it is

A C# class that inherits from `UnityEngine.ScriptableObject` instead of `MonoBehaviour`. Marked with `[CreateAssetMenu]` so designers can right-click in the project window → Create → choose the SO type → name the new asset.

Minimal example:

```csharp
using UnityEngine;

[CreateAssetMenu(fileName = "NewWeapon", menuName = "Game/Weapon")]
public class WeaponDefinition : ScriptableObject {
    public string displayName;
    public int damage;
    public int fireRate;
    public int magazineSize;
    public float reloadTime;
    public Sprite icon;
}
```

The result: `Assets/Weapons/AK47.asset`, `Assets/Weapons/M4A1.asset`, etc. Each is a binary asset file the designer can edit in the Inspector. References from runtime code:

```csharp
public class WeaponSpawner : MonoBehaviour {
    public WeaponDefinition[] weapons;  // dragged in via inspector
}
```

## Why it exists

Unity's two pre-existing options were both wrong for content:
- **MonoBehaviour** — intended for behavior on a GameObject. Heavy (full transform/component graph). Overkill for "the weapon's damage is 45."
- **Plain C# classes** — no editor support, no serialization, no asset pipeline integration.

ScriptableObject splits the difference: a typed asset with field-level Inspector support, no runtime overhead beyond loading the asset.

It also enables **reference-by-asset** semantics — a weapon's prefab points to a `WeaponDefinition` asset, not a copy of the data. Change the asset, every prefab using it gets the new values.

## Where it's used

- **Cuphead** — character defs, attack defs
- **Hollow Knight** sequels & similar metroidvanias — extensive use
- **Genshin Impact's tooling** — internal pipelines (publicized in talks)
- **Most modern Unity mobile games** — characters, items, levels, balance configs

A 2019 Unity blog post made it the de facto recommendation; by 2022 it was "how Unity teaches you to do data."

## Tradeoffs

### Strengths
- ✅ First-class Inspector support (designers love it)
- ✅ Lightweight runtime (no GameObject overhead)
- ✅ Reference-by-asset semantics (DRY)
- ✅ Editor scripts can extend the Inspector for custom UX

### Weaknesses
- ❌ **Unity-specific.** Doesn't help if you're shipping cross-engine.
- ❌ **Edit-time only.** Designers can't author SOs at runtime without custom UI (you'd build that yourself).
- ❌ **Binary `.asset` format is git-painful.** Two designers editing the same asset → merge conflict in YAML serialized form. Many teams switch to `Force Text` serialization (`Project Settings → Editor → Asset Serialization`), which uses YAML internally but with Unity-specific structure that humans can't really hand-edit.
- ❌ **Inspector quality varies.** Custom types (lists of structs, nested SO references) need custom Inspector code or `Odin Inspector` (paid asset).

### The text-format escape hatch

Many production Unity teams add a JSON/YAML import layer **on top** of ScriptableObject:
1. Designers edit human-readable YAML files in their preferred editor (or via Boilergen!)
2. A custom `AssetPostprocessor` script imports YAML → generates `.asset` files
3. Runtime continues to use SO references (no breaking change)

This sidesteps the binary-merge-conflict problem while keeping Unity-native runtime.

**Boilergen fits this layer perfectly.**

## How it informs Boilergen

A future `unity-scriptable-object` plugin target should:

1. **Generate the C# class definition** with `[CreateAssetMenu]`:
   ```csharp
   [CreateAssetMenu(fileName = "{{pascalCase id}}", menuName = "Game/{{pascalCase type}}")]
   public class {{pascalCase type}}Definition : ScriptableObject {
       public string id = "{{id}}";
       public string displayName = "{{name}}";
       // ...generated fields based on data shape
   }
   ```

2. **Generate the `.asset` instance file** — Unity's text-serialized YAML form. Format is documented at [Unity's text serialization docs](https://docs.unity3d.com/Manual/TextualSceneFormat.html). Each asset has a header, a `MonoBehaviour:` block with `m_Script: {fileID, guid, type}`, and the data fields.

3. **Optionally generate an `AssetPostprocessor` once** in the plugin install — so future YAMLs auto-import without re-running Boilergen.

The trickiest bit is the `m_Script` GUID — Unity generates these via `.meta` files. The plugin would need to either:
- Compute deterministic GUIDs from class names (some teams do this)
- Read existing `.meta` files and reuse GUIDs
- Generate a stub the developer fills in once

### Use cases this unlocks

- **Mobile RP studios on Unity** — they get the same Boilergen workflow as our GM1 work, but for Unity-stack instead of custom-C++
- **Future GM2 plugin (when GM2 stabilizes)** — GM2 is Unity-based, so a `unity-scriptable-object` target is the natural choice for v2 entity templates

## Anti-patterns to surface

- **Embedding logic in SOs.** A `WeaponDefinition.cs` with `Fire()` and `Reload()` methods has reverted to MonoBehaviour-without-the-transform. Keep SOs pure data; logic lives in MonoBehaviours that **reference** them.
- **Inheriting SOs.** `LegendaryWeaponDefinition : WeaponDefinition` works in C# but breaks Inspector menus and creates fragile asset hierarchies. Prefer composition or flat type-with-flag.
- **Per-instance modifications at runtime.** SOs are shared across all references. Modifying one in Play mode persists when changes are saved. **Treat them as readonly content.** For mutable per-instance data, use a wrapping MonoBehaviour or a runtime copy.

## References

- **[Unity Manual — ScriptableObject](https://docs.unity3d.com/Manual/class-ScriptableObject.html)** — canonical
- **[Unity Learn: Live Sessions on ScriptableObject](https://learn.unity.com/tutorial/introduction-to-scriptable-objects)** — practical tutorial
- **[Three Ways to Architect Your Game with ScriptableObjects](https://unity.com/how-to/scriptableobjects-improve-the-architecture-of-your-game)** — Unity's official architecture guide
- **[Unite Austin 2017 — Game Architecture with Scriptable Objects (Ryan Hipple)](https://www.youtube.com/watch?v=raQ3iHhE_Kk)** — the talk that mainstreamed the pattern

## See also

- [`patterns/data-driven-content.md`](../patterns/data-driven-content.md) — ScriptableObject is one instance of this principle
- [`patterns/component-based-design.md`](../patterns/component-based-design.md) — SOs work alongside components
- [`engines/unreal-data-asset.md`](./unreal-data-asset.md) — Unreal's analogous pattern
