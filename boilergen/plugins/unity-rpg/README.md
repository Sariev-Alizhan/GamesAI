# Unity RPG Plugin

Boilergen plugin for **Unity 2022+ RPG** projects. Generates ScriptableObject `.asset` files (text mode), MonoBehaviour scripts, and i18n entries.

## Why Unity is harder than Godot

Unity's default asset serialization is **binary**. Generating `.asset` files from outside Unity requires:

1. **Force Text Asset Serialization** to be enabled in your Unity project (Project Settings → Editor → Asset Serialization → Mode: Force Text). This is one toggle, set once.
2. Knowing the **GUID** of your ScriptableObject script. Unity assigns these in the corresponding `.cs.meta` file.

The templates here generate `.asset` files with a `__SCRIPT_GUID__` placeholder. **First-time setup:** copy the GUID from your script's `.meta` file (open it in any text editor) and either:

- Replace the placeholder with a Handlebars helper that loads it from a config (advanced), or
- Find-and-replace the placeholder once in the generated assets.

This is a one-time setup per ScriptableObject class. After that, generation just works.

See [`knowledge-base/engines/unity-scriptable-object.md`](../../../knowledge-base/engines/unity-scriptable-object.md) for the full pattern rationale.

## What it generates

For each entity (weapon / enemy / quest), three files appear:

```
Assets/Data/<type>/<id>.asset            ← ScriptableObject instance (data)
Assets/Scripts/<type>/<id>Behaviour.cs   ← MonoBehaviour (runtime logic stub)
Assets/Localization/<type>/<id>.json     ← i18n keys (en/ru/kk)
```

The `.asset` is editable in the Unity inspector once it lands. The behaviour script has `// TODO` placeholders for the runtime logic specific to this entity.

## Entity types

### `weapon`
Equippable item with combat stats. Fields: `category` (sword/bow/staff/etc), `damage`, `attackSpeed`, `range`, `criticalChance`, `goldValue`, `iconPath`.

### `enemy`
Hostile NPC. Fields: `level`, `health`, `damage`, `xpReward`, `goldDropMin/Max`, `lootTable`, `aiType` (melee/ranged/caster).

### `quest`
Player objective. Fields: `category` (main/side/repeatable), `objectiveType` (kill/collect/talk-to), `targetId`, `targetCount`, `xpReward`, `goldReward`, `itemRewards`, `prerequisiteQuestId`.

## Schema examples

See [`schemas/unity-rpg/`](../../schemas/unity-rpg/):

- `iron-sword.yaml` — basic melee weapon
- `forest-goblin.yaml` — low-level enemy
- `find-the-amulet.yaml` — fetch quest

## How to use in your Unity project

1. **One-time setup:**
   - Project Settings → Editor → Asset Serialization → Force Text
   - Create your ScriptableObject base classes (`WeaponData`, `EnemyData`, `QuestData`) in `Assets/Scripts/Data/`
   - Copy each script's GUID from its `.cs.meta` and decide how to inject (manual replace, or extend the template)

2. **Per entity:**

```bash
boilergen generate ../GamesAI/boilergen/schemas/unity-rpg/iron-sword.yaml \
  --config ./boilergen.config.yaml
```

3. Switch to Unity. The `.asset` appears in the project, ready to drop into a scene or reference.

## Forking for your own RPG

The base classes (`WeaponData`, `EnemyData`, `QuestData`) are project-specific. To use this plugin for *your* game:

1. Fork to `plugins/<your-game>/`
2. In `targets/data-assets/*/*.asset.hbs` — change the `m_Name` and add fields specific to your data class
3. In `targets/scripts/*/*Behaviour.cs.hbs` — change the namespace and base class to your conventions
4. Schemas (`schemas/unity-rpg/*.yaml`) usually stay similar — they're the abstraction

## Open questions

- Should the plugin auto-discover script GUIDs by parsing `.meta` files? Currently no — keeps the plugin engine-agnostic. Could be added as an opt-in helper if a real Unity user asks.
- Should we generate `.prefab` files alongside `.asset`? Currently no — prefabs are highly project-specific. A `targets/prefabs/` layer is a future possibility.

## Sources

- [Unity ScriptableObject docs](https://docs.unity3d.com/Manual/class-ScriptableObject.html)
- [Force Text Serialization](https://docs.unity3d.com/Manual/class-EditorManager.html)
- [knowledge-base entry: unity-scriptable-object](../../../knowledge-base/engines/unity-scriptable-object.md)
