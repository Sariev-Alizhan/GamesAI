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

## Entity types — full MVP coverage

| Type | What it generates | Example schemas |
|---|---|---|
| `weapon` | `WeaponData.asset` SO with mag/range/recoil/spread/audio refs | assault-rifle.yaml + 5 new (glock-19, spas-12, awm-338, ump-45, combat-knife) |
| `gamemode` | `GameModeData.asset` SO with mode type / team size / score limit | duel-1v1, team-3v3-tdm, team-5v5-tdm, hardpoint-5v5, practice |
| `player` | `PlayerData.asset` SO — class profile (HP / armor / mobility / stamina / spawn loadout) | assault, scout, heavy |
| `bot-personality` | `BotPersonality.asset` SO — AI profile (difficulty / aggression / accuracy / reaction time / movement style / preferred range) | bot-rookie, bot-veteran |
| `map` | `MapData.asset` SO — scene reference, supported modes, spawn zones, hardpoint zones, kill volume, ambient lighting | map-warehouse |
| `loadout` | `LoadoutData.asset` SO — primary + secondary + melee weapon refs, perks, unlock level | loadout-assault-starter, loadout-sniper |
| `network-player` | `<Name>NetworkPlayer.cs` — NGO 2.x NetworkBehaviour skeleton (server-authoritative Health/Armor/Kills/Deaths NetworkVariables, TryFireServerRpc + ClientRpc damage broadcast, partial-class hooks for custom logic) + prefab-registration .meta doc + i18n stub | network-player-default |
| `touch-input` | `<Name>TouchController.cs` — mobile twin-stick FPS input (left stick movement / right stick look / fire / ADS / sprint / reload buttons) with schema-bound layout constants for designer tuning in YAML | touch-input-default |
| `project-init` | `LocaleManager.cs` (~148 LOC, JSON-backed i18n, no Newtonsoft dep) + `Resources/Locales/en.json` (18 stock UI strings) | project-init |

Each entity also generates an `i18n/<entity>/<id>.locale.json` stub keyed by ID with EN-seeded names + `TODO: …` placeholders for ru/kk that Localization Assistant fills via one Anthropic call.

## End-to-end MVP bootstrap (15 minutes)

A complete mobile shooter MVP from a clean Unity project:

```bash
# One-shot project init: drops LocaleManager.cs + en.json
boilergen generate schemas/unity-mobile-shooter/project-init.yaml \
  --plugin plugins/unity-mobile-shooter \
  --output ~/MyShooter/Assets/_Project

# Generate 6 weapons, 3 player classes, 2 bot personalities,
# 1 map, 2 loadouts, 5 game modes — in 1 watch session
boilergen watch schemas/unity-mobile-shooter/ \
  --plugin plugins/unity-mobile-shooter \
  --output ~/MyShooter/Assets/_Project
# (edit any YAML — Unity Editor picks up the .asset changes automatically)

# Translate UI to ru + kk in one Anthropic call (~$0.05)
localization-assistant fill --source en.json --target ru.json --target kk.json
```

Result: 30+ ScriptableObject assets + LocaleManager.cs + 3 locales — all referencing each other by ID (loadout.primaryWeaponId → weapon.id, player.spawnGearLoadoutId → loadout.id, map.supportedModeIds → gamemode.id) so a Schema Validator pass catches broken refs at build time.

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
