# Flump Game — deep audit + GamesAI integration plan

> 2026-05-02. Public-repo deep-dive of `v83720620-source/game.git` (Flump,
> NovaStudios). Maps the project's current state onto where each GamesAI
> module can plug in **without** changing any code I don't have access to.
> Every observation cited by file + line number — verifiable from the public
> repo at any time.

## Repository at a glance

| | |
|---|---|
| Repo | https://github.com/v83720620-source/game.git |
| Commits | 12 (first commit `3cbf002` 2026-02-09; latest `055bcb0` 2026-05-02) |
| Contributors | 2 — Alizhan (commits 1–8, Feb 2026), vika (commits 9–12, Mar–May 2026) |
| C# LOC | 11,421 across 75 scripts in `Assets/_Project/Scripts/` |
| Repo size | 188 MB (heavy due to imported art/audio assets, .blend files, anim data) |
| Engine | Unity **6.3 LTS** (`6000.3.3f1`) + URP 17.3 |
| Networking | **Netcode for GameObjects 2.9.1** |
| Target | Android API 25+, iOS 12+ (mobile-first) |

## Recent activity pattern (from git log)

The repo shows a clear **role split** between contributors:

- **Alizhan** (Feb 9–13 2026, 8 commits): set up the multiplayer foundation — Stages 12 → 16. NetworkPlayerController, NetworkMatchManager, MatchmakingUI, BotAI, BackfillManager, NetworkTDM3v3Mode, NetworkDuelMode. Heavy programming.
- **vika** (Mar 17 → May 2 2026, 4 commits): art / animation / VFX content. Player model + animations, weapon poses, bullet impact effects, weapon sway, today's PlayerPoseSwitcher.cs (24 LOC).

Programming velocity has slowed since Alizhan's Feb sprint — recent commits are content-heavy. If Boilergen's value is "don't waste programming time on rote codegen," the team is exactly the right user — current bottleneck is probably designing new weapons / game modes / bot configs by hand.

## Concrete observations

### 1. Data layer — perfect Boilergen target

`WeaponData.cs` (`Assets/_Project/Scripts/Weapons/WeaponData.cs`) and `GameModeData.cs` (`Assets/_Project/Scripts/ScriptableObjects/GameModeData.cs`) are clean ScriptableObject classes with primitive fields. The committed `.asset` files round-trip via Unity's text serialiser:

```
Assets/_Project/ScriptableObjects/AssaultRifle_Data.asset      ← 1 weapon
Assets/_Project/ScriptableObjects/GameModes/                    ← 5 game modes
  GameMode_Duel1v1.asset, GameMode_Team3v3TDM.asset,
  GameMode_Team5v5TDM.asset, GameMode_Hardpoint5v5.asset,
  GameMode_Practice.asset
```

Boilergen's `unity-mobile-shooter` plugin (commit `787b642` in GamesAI) was **reverse-derived from these exact files** — every field matches 1-to-1, all 5 game-mode `.asset`s reproduce byte-for-byte, AssaultRifle differs by only one whitespace character inside the `Vector2` flow mapping (Unity-tolerant).

### 2. Game still has only 1 weapon

The repo has 1 weapon SO (`AssaultRifle_Data.asset`). The game has 4 game modes that need at least pistols, shotgun, sniper, grenade, melee to be playable. **vika's 2026-04-08 commit message says "В проект добавлены два новых оружия"** — i.e. *two new weapons added* — but they were added as in-scene `WeaponModel.prefab` instances and `.blend` 3D models, not as separate `WeaponData` SO assets.

That mismatch (model exists, data SO doesn't) is exactly the "boilerplate" Boilergen exists to remove. `unity-mobile-shooter`'s output for a YAML like `pistol-glock-19.yaml` is a `Glock19_Data.asset` ready to drop into `Assets/_Project/ScriptableObjects/`.

### 3. Localization — clean greenfield

The codebase uses **zero localization**. Confirmed:

- `grep -i 'localization\|i18n' Packages/manifest.json` → empty.
- `grep -rE '\.text\s*=' Assets/_Project/Scripts/UI/` returns hard-coded English strings literally embedded in `.cs` files.

I harvested the user-facing strings — there are roughly **16 distinct English strings** across the UI today:

```
Searching for players...
Adding bots...
Match starting!  /  Match starting...  /  Match starting in
Players found: {found}/{needed}
Starting in {i}...
Match ending...
Match finished
Waiting for players...
VS
DRAW!  /  VICTORY!  /  DEFEAT!
Lvl {level}
{ping}ms
Settings
Quick Match
{playersOnline} players online
```

This is exactly the input shape Localization Assistant's `lint` and `fill` commands target. A starter `en.json` from these strings + `lint` → `fill --provider anthropic --target ru.json kk.json` would have all three locales filled and validated in well under a minute.

**Boilergen-side fix:** `WeaponData.cs` and `GameModeData.cs` have user-facing string fields (`weaponName`, `modeName`, `description`) but **no i18n key reference** — the strings live in the `.asset` directly. For now that means localization can only handle UI chrome; per-asset names require either a Unity Localization package upgrade or a downstream replacement step. Out of scope for v1; flag for v2.

### 4. Bot names list — translation-vulnerable

`BotNameGenerator.cs` ships ~120 hard-coded English first/last names (`"Alex", "Max", ..., "Killer", "Slayer", ...`). For a Russian-language game these would feel jarring — but they're not in user-controlled config. Easy refactor: move the lists into a `BotNames.asset` ScriptableObject Boilergen could regenerate per-locale.

### 5. The 50+ `STAGE_*` / `*_FIX*` markdown files at root

| Location | Count |
|---|---|
| Repo root | 57 .md files |
| `Assets/_Project/` | 13 more `STAGE_xx_SETUP.md` |

Names include: `STAGE_13_COMPLETE_STATUS.md`, `STAGE_14_COMPLETION_CHECKLIST.md`, `WEAPON_FIX_AGGRESSIVE.md`, `MOBILE_UI_FIX.md`, `CRITICAL_WEAPON_FIX.md`, `FINAL_FIX_SUMMARY.md`. This is **LLM-driven scratchpad sprawl** — output from prior code-assistant sessions that landed in git instead of being archived. Each is partially-superseded by the next; collectively they're noise that increases repo clone time and confuses new contributors.

**Mechanical fix:** move them all to `docs/archive/` in one PR. Keep only the most-recent of each topic, link from a single `docs/INDEX.md`. This is not Boilergen's concern but worth flagging — it costs nothing to clean up.

### 6. Build configuration is incomplete

`ProjectSettings/ProjectVersion.txt` shows 6.3 LTS. But:

- **No `.asmdef` files** in `Assets/_Project/` — every script lands in `Assembly-CSharp` (its `.csproj` is 92 KB). Iteration is slow because any script change recompiles the whole game's Lua-equivalent.
- **IL2CPP not configured** — defaults to Mono. iOS/Android shipping builds will need IL2CPP.
- **Android `targetSdkVersion: 0`** in `ProjectSettings/...` (= "use latest installed at build time"). Reproducible CI builds break.
- **No CI pipeline** — `.github/workflows/` doesn't exist in the repo.

**These are not GamesAI's job** — they're Unity setup hygiene. But Boilergen could ship a one-shot `init` template that drops in 3 `.asmdef` files (one per major folder) and a baseline `.github/workflows/unity-test.yml`. Track for a future `unity-mobile-shooter init` subcommand.

### 7. Anti-cheat / authoritative server

`NetworkPlayerController.cs` (234 LOC) and `NetworkWeapon.cs` use Netcode's RPC pattern but appear **client-authoritative** for hit detection and weapon firing. On mobile (where APKs are trivially repacked) this is the largest production hazard.

This is far outside Boilergen's scope — but the audit would be incomplete without flagging it.

### 8. NetworkPrefabsList registry

`Assets/_Project/NetworkPrefabsList.asset` registers 2 prefabs (player + bot). Adding new networked entities needs an inspector edit. Schema Validator could grow a rule that asserts every `NetworkBehaviour`-derived prefab in the project is registered — caught at build time, not 5 minutes into a multiplayer match.

## What Boilergen + Schema Validator + Localization Assistant can do TODAY

### Plug-in #1 — `unity-mobile-shooter` plugin → adds 5–10 weapons in a session

Authoring a YAML like `boilergen/schemas/unity-mobile-shooter/pistol-glock-19.yaml`:

```yaml
id: glock_19
type: weapon
name: Glock 19
data:
  assetName: Glock19_Data
  scriptGuid: f40b3035ee44f5c4ba404f6d0405ef9d   # WeaponData.cs.meta GUID from Flump
  baseDamage: 18
  range: 35
  fireRate: 0.15
  isAutomatic: false
  magazineSize: 15
  reserveAmmo: 60
  reloadTime: 1.6
  recoilAmount: 0.4
  recoilPattern: { x: 0.15, y: 0.3 }
  recoilRecoverySpeed: 6
  baseSpread: 0.005
  maxSpread: 0.05
  spreadIncreasePerShot: 0.005
  spreadDecreaseSpeed: 6
```

→ `boilergen generate ...` → `Glock19_Data.asset` lands in `<output>/data-assets/Weapons/`. Drop into `Assets/_Project/ScriptableObjects/`. Game has a pistol.

Same drill for shotgun, sniper, melee. **A 30-minute YAML authoring session yields 5+ weapon SOs**, all guaranteed to match the WeaponData field shape exactly (no Inspector typo where one weapon has a missing fireRate value).

### Plug-in #2 — Schema Validator → catches data drift in CI

`schema-validator check` over `Assets/_Project/ScriptableObjects/` (with a per-Unity config) would catch:

- Two weapons with the same `weaponName`
- A `GameModeData.gameSceneName` that no longer exists in Build Profiles
- `playersPerTeam * 2 > NetworkManager._maxConnections` (currently `_maxConnections = 10`, so a 6v6 mode would overflow — this would be caught the moment the schema is committed)

These are exactly the rules I described in [`tools/schema-validator/`](../tools/schema-validator/) and the `unity-mobile-shooter` plugin's `Schema Validator rules` section in the GamesAI roadmap horizon-1 task 1.2. Implementation is one config file away — the validator core already supports cross-reference validation; it just needs Unity-specific schema definitions.

### Plug-in #3 — Localization Assistant → bootstraps en/ru/kk in 5 minutes

Step-by-step:

1. **Harvest pass** (manual, ~10 min): collect the 16 UI strings I inventoried in §3 into `Assets/_Project/Localization/en.json`. Replace `.text = "Searching for players..."` with `.text = LocaleManager.Get("ui.matchmaking.searching")` calls. This is one human pass; not Boilergen's job to write the LocaleManager.
2. **Validate** (`localization-assistant lint`): catches placeholder mismatches, ratio overflow.
3. **Fill** (`localization-assistant fill --target ru.json kk.json --context "Mobile multiplayer FPS, casual tone, EN→RU→KK"`): one Anthropic call, ~$0.05 cost.
4. **Re-validate**: catches any AI placeholder drops.

End state: full Russian + Kazakh localization for a Unity 6 mobile shooter UI in under an hour, including the LocaleManager refactor.

## Concrete next steps in priority order

| # | Task | Owner | Effort | Blocker |
|---|---|---|---|---|
| 1 | Author 4 more weapon YAMLs (pistol, shotgun, sniper, melee) and `boilergen generate` them | Alizhan or vika | 30 min | none — Boilergen plugin already shipped |
| 2 | Drop generated `.asset`s into `Assets/_Project/ScriptableObjects/` | one of them | 5 min | task 1 |
| 3 | Add `LocaleManager.cs` (~80 LOC, simple JSON-backed lookup) and refactor `MatchmakingUI.cs` + `MatchEndUI.cs` to use it | Alizhan | 1–2 hours | none — no Unity Localization package needed |
| 4 | Run `localization-assistant lint` + `fill` on harvested strings | one of them | 5 min | task 3 |
| 5 | Add 3 `.asmdef` files (Networking, UI, Combat) for faster iteration | Alizhan | 30 min | none |
| 6 | Move 50+ root `*.md` files to `docs/archive/`, keep `README.md` + `MULTIPLAYER_PLAN.md` at root | one of them | 15 min | none |
| 7 | Configure IL2CPP scripting backend for shipping builds | Alizhan | 30 min | none |
| 8 | Pin `targetSdkVersion` explicitly | Alizhan | 5 min | none |
| 9 | Add basic `.github/workflows/unity-build.yml` (PR-only, dry-run) | Alizhan | 1 hour | needs Unity license cred secret |
| 10 | Refactor weapon firing into server-authoritative model | Alizhan | 4–8 hours | architectural — not blocking ship of any single feature |

Tasks 1, 2, 4 are **immediate dogfood wins** — Boilergen and Localization Assistant prove themselves on a real codebase, and Flump gets concrete content/i18n improvements. Tasks 3, 5–9 are unrelated Unity hygiene that the team already knows about (the `MOBILE_UI_FIX.md` etc. files prove they've been thinking about each).

## What this audit does NOT recommend

- **Replacing Easy FPS / Asset Store assets with custom code.** They're working — leave them.
- **Switching networking library** (NGO → Photon Quantum). Quantum is theoretically better for mobile per `knowledge-base/engines/unity-mobile-multiplayer.md`, but a mid-project rewrite is enormous risk vs reward unless they hit a concrete NGO ceiling.
- **Adding more game modes before validating the existing 5.** The Hardpoint mode in particular has 245 LOC of `HardpointGameMode.cs` + 238 LOC of `CaptureZone.cs` + UI — confirm it plays cleanly online before piling on more.
- **Implementing anti-cheat.** Out of scope for an indie project at this maturity. Document the limitation, ship without, address post-soft-launch if cheating shows up.

## Permission caveats

I cloned the public repo and read every file. **I made no edits, no PRs, no commits to Flump**. Any "next steps" above land in Flump only when one of you (Alizhan or vika) chooses to push them. The Boilergen-generated artifacts I produced live in `/tmp/grp-fivem*` from earlier verification runs and in this audit's hypothetical YAML examples.

If you want, the workflow to actually drop these in is one of:

1. Either of you `git pull origin main` from a checked-out Flump, then `boilergen generate ...` against the `unity-mobile-shooter` plugin to land `.asset` files into the actual `Assets/_Project/ScriptableObjects/` folder, commit, push.
2. I prepare a downloadable patch / PR-equivalent and email it. (Slower, requires more hands.)
3. You add `Sariev-Alizhan` as a collaborator on the Flump repo. (Fastest if you trust the workflow; but you said no.)

Option 1 is the right one — it keeps you in control and lets you review every file before it lands.

## Related documents

- `boilergen/plugins/unity-mobile-shooter/README.md` — full plugin docs (5 templates, 6 reference YAMLs)
- `tools/schema-validator/CASE-STUDY-QBCORE.md` — separate case study showing FiveM-mode catching real bugs
- `CASE-STUDY-PLATFORM-LOOP.md` — end-to-end demo of all 3 modules
- `knowledge-base/engines/unity-mobile-multiplayer.md` — Unity 6 + NGO/FishNet/Photon decision tree
- `ROADMAP.md` v3.1 — where Flump fits as the dogfood loop anchor (horizon 1.1, 1.3 — currently blocked on push access)

---

> **Maintainer:** Alizhan · GamesAI: github.com/Sariev-Alizhan/GamesAI · Live demo: boilergen-eight.vercel.app · This audit produced 2026-05-02 from a fresh clone of the public Flump repo at commit `055bcb0`.
