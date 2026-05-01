# Godot 2D Platformer Plugin

Boilergen plugin for **Godot 4.x 2D platformer** projects. Generates `.tres` resources, GDScript files, and i18n entries from a single YAML schema.

## Why this plugin

Godot is the **most codegen-friendly** of the three major engines (Unity, Unreal, Godot) because its `.tres` resource format is text-based and trivially generatable. See [`knowledge-base/engines/godot-resources.md`](../../../knowledge-base/engines/godot-resources.md) for the full rationale.

This plugin demonstrates that the Boilergen architecture works for engines beyond GTA-RP — proving the platform vision.

## What it generates

For each entity (enemy / item / level), three files appear in your Godot project:

```
res://data/<type>/<id>.tres        ← Godot Resource (data, editable in inspector)
res://scripts/<type>/<id>.gd       ← GDScript (behaviour stub, you fill in)
res://i18n/<type>/<id>.json        ← Localization keys (en/ru/kk placeholders)
```

The `.tres` is hot-reloadable in the Godot editor — change a YAML field, regenerate, the editor picks it up live.

## Entity types

### `enemy`
Hostile NPC. Fields: `health`, `damage`, `speed`, `behaviourType` (patrol / chase / stationary), `dropTable` (item IDs).

### `item`
Pickable / usable. Fields: `category` (consumable / equipment / quest), `effectAmount`, `stackSize`, `value`, `iconPath`.

### `level`
A playable level / scene config. Fields: `worldId`, `enemyPool` (enemy IDs), `itemPool`, `parScore`, `musicTrack`, `nextLevel`.

## Schema examples

See [`schemas/godot-2d-platformer/`](../../schemas/godot-2d-platformer/):

- `slime.yaml` — basic patrolling enemy
- `health-potion.yaml` — consumable item
- `level-1-grasslands.yaml` — first level config

## How to use in your Godot project

1. In your Godot project, create a `boilergen.config.yaml`:

```yaml
plugin: ../GamesAI/boilergen/plugins/godot-2d-platformer
targets:
  resources: ./data
  scripts: ./scripts
  i18n: ./i18n
```

2. Run from your Godot project root:

```bash
boilergen generate ../GamesAI/boilergen/schemas/godot-2d-platformer/slime.yaml \
  --config ./boilergen.config.yaml
```

3. Switch to Godot editor — files appear, inspector lets you edit, `_ready()` stub waiting for your code.

## Forking for your own platformer

The templates are deliberately generic. To make this plugin yours:

1. Fork the folder to `plugins/<your-game-name>/`
2. Edit `targets/scripts/*/*.gd.hbs` to match your code conventions (CharacterBody2D vs RigidBody2D, your signal names, your component setup)
3. Edit `targets/resources/*/*.tres.hbs` to match your custom Resource subclass names
4. The schemas (`schemas/godot-2d-platformer/*.yaml`) stay the same — they're the source of truth, decoupled from output format

This is the value of the core+adapters+plugins pattern: schemas survive engine changes, plugins are swappable.

## Open questions

- Should `level.enemyPool` reference enemies by ID-string (current) or by `.tres` path? Current is engine-agnostic, but Godot prefers paths for editor-time validation.
- Should we generate `.tscn` scene files as well as resources? Currently no — scenes are highly project-specific. Could be added in a `targets/scenes/` layer if a real user asks.

## Sources

- [Godot Resource docs](https://docs.godotengine.org/en/stable/classes/class_resource.html)
- [knowledge-base entry: godot-resources](../../../knowledge-base/engines/godot-resources.md)
