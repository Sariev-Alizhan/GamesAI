# Unity Mobile Shooter Plugin

Boilergen plugin for **3D mobile multiplayer shooters on Unity 6+**. Generates `WeaponData` and `GameModeData` ScriptableObject `.asset` files (text serialization) plus i18n stubs from a single YAML per entity.

Sibling of `unity-rpg/` — same Unity ScriptableObject pattern, different domain. RPG weapon = damage / attackSpeed / criticalChance / goldValue. Shooter weapon = magazine / reloadTime / recoil / spread / 3 audio clips. Mixing them into one schema would either pollute RPG authors or starve shooter authors, so they live as separate plugins.

## What it generates

For each entity:

```
<output>/
├── data-assets/
│   ├── Weapons/<assetName>.asset            ← WeaponData SO instance
│   └── GameModes/<assetName>.asset          ← GameModeData SO instance
└── i18n/
    ├── Weapons/<id>.locale.json             ← weapon name keys (en/ru/kk)
    └── GameModes/<id>.locale.json           ← mode name + description keys
```

The `.asset` files are valid Unity 6 text-serialized ScriptableObjects. Drop them into your Unity project tree and Unity picks them up automatically.

## Entity types

### `weapon`
Mobile-shooter firearm. Field set matches `FlumpGame.WeaponData` 1-to-1:
`baseDamage, range, fireRate, isAutomatic, magazineSize, reserveAmmo, reloadTime,`
`recoilAmount, recoilPattern (Vector2), recoilRecoverySpeed,`
`baseSpread, maxSpread, spreadIncreasePerShot, spreadDecreaseSpeed,`
`fireSound, reloadSound, emptySound (sound refs left as fileID:0 for the inspector to wire).`

### `gamemode`
PvP match configuration. Matches `FlumpGame.Data.GameModeData`:
`modeType (enum int 0–4), playersPerTeam, scoreLimit, matchDurationSeconds,`
`enableOvertime, gameSceneName, showInMenu, sortOrder.`

`modeType` enum values:
- `0` — Duel1v1
- `1` — Team3v3TDM
- `2` — Team5v5TDM
- `3` — Hardpoint5v5
- `4` — Practice

## Schema examples

See [`schemas/unity-mobile-shooter/`](../../schemas/unity-mobile-shooter/) — six reference schemas reverse-derived from the Flump game repo:

- `assault-rifle.yaml` — automatic rifle (the one currently committed)
- `duel-1v1.yaml`, `team-3v3-tdm.yaml`, `team-5v5-tdm.yaml`, `hardpoint-5v5.yaml`, `practice.yaml` — all five game modes

Use them as starting points; copy and edit per new weapon / mode.

## Required Unity setup

1. **Force Text Asset Serialization** — Project Settings → Editor → Asset Serialization → Mode: Force Text. (One toggle, set once.)
2. **Script GUIDs.** The generated `.asset` files reference your `WeaponData.cs` and `GameModeData.cs` scripts by their Unity-assigned GUID. The reference schemas use the GUIDs from the Flump repo:
   - `WeaponData`: `f40b3035ee44f5c4ba404f6d0405ef9d`
   - `GameModeData`: `92c75332275f2204b877c89f7b1ea038`

   Find your project's GUIDs by opening the corresponding `.cs.meta` files. Set them per schema via `data.scriptGuid` (see examples). If `data.scriptGuid` is omitted, the template emits `__SCRIPT_GUID_HERE__` as a sentinel — do a find-replace once.

## Forking for your own shooter

Field names in the templates match `FlumpGame.WeaponData` / `GameModeData` literally. To use against a different shooter:

1. Either rename your scripts to `WeaponData` / `GameModeData` (simplest), or
2. Fork this plugin to `plugins/<your-shooter>/` and edit `targets/data-assets/*/*.asset.hbs` to match your script's serialized fields. Field names in `.asset` YAML must match C# field names exactly — Unity's serializer is strict.

## How to use

```bash
cd boilergen
npm run dev -- generate ./schemas/unity-mobile-shooter/assault-rifle.yaml \
  --plugin unity-mobile-shooter \
  --out /path/to/your/Unity/project/Assets/_Project
```

Outputs land directly into your Unity project. Flip to the editor — `.asset` files appear in the Project view.

## What this plugin does NOT generate

- Per-weapon `MonoBehaviour` scripts. Mobile shooters typically use one generic `WeaponBehaviour` driven by `WeaponData` SOs (Flump uses `SimpleWeapon.cs` / `AdvancedWeapon.cs` this way) — per-weapon classes would be overkill.
- Networking prefabs. `NetworkPrefab` registration is project-specific and brittle to template; do it once by hand in `DefaultNetworkPrefabs.asset`.
- Build pipeline scripts. Out of scope for v1.

## Sources / references

- [knowledge-base/engines/unity-scriptable-object.md](../../../knowledge-base/engines/unity-scriptable-object.md) — pattern rationale
- [Unity ScriptableObject docs](https://docs.unity3d.com/Manual/class-ScriptableObject.html)
- [Force Text Serialization](https://docs.unity3d.com/Manual/class-EditorManager.html)
