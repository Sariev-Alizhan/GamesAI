---
type: engine
slug: godot-resources
title: Godot Resources (.tres / .res)
genre: any
engine: godot
content_format: text (.tres) + binary (.res)
language: gdscript, csharp, cpp
license: MIT (Godot engine)
source_url: https://docs.godotengine.org/en/stable/classes/class_resource.html
relevance_to_grandgames: medium — Godot is a credible target if Grand Games ever adopts it; pattern is also instructive as a counter-example to Unity's binary-by-default
last_reviewed: 2026-05-01
---

# Godot Resources

Godot's content-data system is built around the `Resource` base class. Custom resources extend it and become first-class assets — saved to disk, edited in the inspector, hot-reloaded in editor, and referenced like any other asset. Unlike Unity's `ScriptableObject` (which serializes to binary `.asset` by default), Godot's resources serialize to a **plain-text format `.tres`** that is git-friendly out of the box.

## Why this matters for Boilergen

Of the three major commercial engine pipelines (Unity, Unreal, Godot), **Godot is the most codegen-friendly by default**. The `.tres` format is essentially YAML-adjacent — easy to generate, easy to diff in PRs, no special tooling required to read. A Boilergen plugin targeting Godot would be the simplest of the three to write.

## Content architecture

```
class_name WeaponData extends Resource

@export var id: String
@export var damage: int
@export var fire_rate: float
@export var magazine_size: int
@export var icon: Texture2D
@export var sound: AudioStream
```

Saved as `weapon_ak47.tres`:

```
[gd_resource type="WeaponData" load_steps=3 format=3]

[ext_resource type="Script" path="res://scripts/WeaponData.gd"]
[ext_resource type="Texture2D" path="res://icons/ak47.png"]

[resource]
script = ExtResource("1")
id = "ak47"
damage = 45
fire_rate = 600.0
magazine_size = 30
icon = ExtResource("2")
```

This is **trivially generatable** from Boilergen — it's just a templated text file with predictable structure.

## Patterns worth borrowing

### 1. Single base class for all content
Everything that holds data extends `Resource`. Items, dialogue, quests, character stats — all the same paradigm. No proliferation of bespoke serialization layers.

### 2. Inspector-editable + script-creatable
A designer can right-click → "New WeaponData" in the editor and edit values via the inspector. A programmer can `WeaponData.new()` in code. A codegen tool can write the `.tres` file directly. All three workflows produce identical results.

### 3. Sub-resources for composition
Resources can contain other resources by reference (`ExtResource`) or value (`SubResource`). This is the Godot equivalent of Unreal's `FInstancedStruct` or Unity's nested ScriptableObjects — but readable in plain text.

### 4. Hot reload built in
Save a `.tres` file while the editor is open → it reloads. Save while game is running (with editor connected) → it can reload live. Faster iteration than Unity's import pipeline for trivial value tweaks.

## Patterns to avoid

- **Binary `.res` for source-of-truth content.** It exists for runtime size, but if you save your designer-edited content as `.res`, you lose all the diff-ability advantages. Use `.res` only as build artifact, not as source.
- **Storing logic in resource scripts.** Resources should hold data + small validation; gameplay logic belongs in `Node` scripts that consume the resource. Mixing the two leads to the same anti-pattern as fat ScriptableObjects in Unity.

## Comparison to Unity ScriptableObject

| Aspect | Unity ScriptableObject | Godot Resource |
|---|---|---|
| Default serialization | Binary `.asset` | Text `.tres` |
| Git-friendly out of box | No (text mode requires opt-in + still noisy) | Yes |
| Codegen-friendly | Hard (binary, requires Unity API) | Trivial (templated text) |
| Inspector editing | Yes | Yes |
| Hot reload | Limited | First-class |
| Sub-resources | Via nested SO references | Both `ExtResource` and `SubResource` |

## Implications for a Boilergen Godot plugin

If we ever ship one:
- **Templates are extremely simple** — one Handlebars template per resource type, output goes to `res://data/<entity-type>/<id>.tres`.
- **No binary import step needed** — file appears, Godot picks it up.
- **Sub-resource references** can be templated by ID, no GUID lookup required (resources reference by `res://` path).
- **Estimated effort**: ~0.5 day for plugin skeleton with one entity type, vs. ~2 days for Unity (binary pipeline) or ~3 days for Unreal (DataAsset import).

## Related entries

- [Unity ScriptableObject Pattern](./unity-scriptable-object.md) — the closest counterpart, but binary-first
- [Unreal DataAsset & DataTable Pattern](./unreal-data-asset.md) — heavier pipeline, more compile-time integration
- [Data-Driven Content Design](../patterns/data-driven-content.md) — the umbrella pattern this is an instance of

## Sources

- Godot docs: [Resource class](https://docs.godotengine.org/en/stable/classes/class_resource.html)
- Godot docs: [Custom resources](https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html)
- GitHub: [godotengine/godot](https://github.com/godotengine/godot)
