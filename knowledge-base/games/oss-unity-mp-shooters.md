---
type: game
slug: oss-unity-mp-shooters
title: Open-source Unity multiplayer shooter repos — reference roundup
genre: fps
engine: unity
content_format: code
language: csharp
license: mixed (verified per repo, all OSI-approved)
source_url: https://github.com/topics/unity-multiplayer
last_analyzed: 2026-05-03
maturity: mixed
relevance_to_grandgames: high
tags: [unity, multiplayer, fps, mobile, shooter, reference, oss]
---

# Open-source Unity multiplayer shooter repos — reference roundup

> Verified 2026-05-03. We need reference Unity multiplayer-shooter codebases
> we can legally read and borrow patterns from while building tooling around
> Flump (NovaStudios). The hard constraint is **OSI-approved licenses
> only** and **zero leaked or reverse-engineered material** — that filter
> kills most of what comes up when you search "unity FPS github." This
> entry documents what survives the filter, what each survivor is actually
> good for, and where the marketing slide ends and the working code begins.

---

## 1. Why this entry exists

The Flump audit (`handoff/05-FLUMP-AUDIT.md`) ended on a clean state: 11.4k
LOC of C# on Unity 6.3 LTS + Netcode for GameObjects 2.9.1, four PvP modes
declared (Duel1v1, Team3v3TDM, Team5v5TDM, Hardpoint5v5) plus Practice, one
weapon SO shipped against four mode types that need at least pistol /
shotgun / sniper / melee to be playable. Boilergen's `unity-mobile-shooter`
plugin currently emits **7 entity types** (`weapon`, `gamemode`, `player`,
`bot-personality`, `map`, `loadout`, `project-init`) across **13 example
schemas** reverse-derived from Flump's own `WeaponData` / `GameModeData`
ScriptableObjects.

Two questions the plugin keeps bumping into and can't answer alone:

1. **Are we modelling the right entity surface?** The plugin generates SOs,
   but Flump's `NetworkPlayerController.cs` and `NetworkWeapon.cs` (the
   *runtime* code that consumes those SOs) live in the closed Flump repo.
   What does a good open `NetworkPlayerController` look like in 2026?
2. **Where do the gaps go next?** Mobile touch input bindings, hitbox /
   lag-comp scaffolding, server-authoritative match state, FSM/BT bot
   AI — none of these are Boilergen targets yet. Knowing which existing
   OSS shooters *already* solved them lets us either (a) cite them as
   "use this, don't regenerate" or (b) plan an entity type for them.

Constraints (from the project's `NOTICE.md` and landing-page positioning
that we explicitly market "we refused leaked code" as competitive moat):

- **OSI-approved licenses only** — MIT / Apache 2.0 / BSD / GPL / MPL.
  Verified per repo via the GitHub `/license` API (which uses GitHub's
  Licensee classifier on the repo's `LICENSE` file).
- **Unity Companion License is NOT acceptable** for our purposes.
  That kills Boss Room, FPSSample, and the Bitesize samples even though
  Unity ships them publicly on GitHub. They are source-available, not
  open-source. See §6.
- **No leaked AAA code** (Far Cry 1, Quake 3 Arena leak, CS:GO leak,
  Valorant beta leak, etc.). Asking the question rhetorically — none of
  the candidates below carry leaked material.
- **No decompiled DLLs / extracted asset bundles.**
- Must actually **be multiplayer** — single-player FPS controllers don't
  teach netcode. Networking layer must exist (Mirror / NGO / FishNet /
  Photon / custom).
- Mobile-friendly is ideal but PC FPS demonstrating reusable patterns is
  acceptable when flagged honestly.

---

## 2. The repo shortlist

Three repos cleared the filter. Two more get an honourable mention as
*examples-within-a-library* rather than full game projects, and ~5
candidates that came up in search were rejected — see §6.

| Repo | License | Networking | Game modes | Mobile? | Bots? | Quality | Best for learning |
|---|---|---|---|---|---|---|---|
| [Voltstro-Studios/Team-Capture](https://github.com/Voltstro-Studios/Team-Capture) | **AGPL-3.0** | Mirror | none shipped (DM-style + pickups) | No (Win/Linux only) | No | early alpha but disciplined architecture | weapon-as-ScriptableObject hierarchy; lag compensation; server-auth movement |
| [jimdroberts/FishMMO](https://github.com/jimdroberts/FishMMO) | **MIT** | FishNet | n/a (MMO, not shooter) | WebGL build present, no touch input | No | active 2026, large surface | server/client/shared assembly split; auth + lobby + DB integration patterns |
| [Kieeran/FPS-Game](https://github.com/Kieeran/FPS-Game) | **MIT** (wrapper only — see §3.3) | NGO + Unity Lobby + Relay | basic deathmatch (TDM/Bomb planned) | No | **Yes** — FSM + Behavior Tree | thesis-grade educational | NGO matchmaking flow; FSM+BT bot architecture |
| [MirrorNetworking/Mirror](https://github.com/MirrorNetworking/Mirror) — `Examples/` | **MIT** | Mirror | TopDownShooter + LagCompensation samples | No | trivial enemy in TopDownShooter | reference snippets, not games | minimal `LagCompensation` cube-vs-cube primer; `TopDownShooter` Player + Enemy + Network split |
| [FirstGearGames/FishNet](https://github.com/FirstGearGames/FishNet) — examples | custom permissive (see `engines/fish-networking.md`) | FishNet | none (transport demos) | No | No | mature library, no shooter sample | CSP + lag-comp APIs themselves |

LOC ballpark (from GitHub API `size` field, KB of repo storage, *not*
SLOC) for the three full-project candidates:

- Team-Capture: 805 MB repo, ~177 stars, 30 forks, 1,564 commits, last
  push **2026-03-24**, language C# (92.5%).
- FishMMO: 184 MB repo, ~117 stars, 32 forks, last push **2026-04-09**,
  language C# (98.4%).
- Kieeran/FPS-Game: 1.4 GB repo (heavy due to bundled commercial assets —
  see §3.3 caveat), 4 stars, 2 forks, 657 commits, last push
  **2026-04-28**, language C# (94.8%).

All three are unarchived and have commits in the last 60 days as of
2026-05-03.

---

## 3. Per-repo deep-dives

### 3.1 Team-Capture (Voltstro-Studios) — the AGPL Mirror reference

- **URL:** https://github.com/Voltstro-Studios/Team-Capture
- **License:** **GNU AGPL-3.0** — verified via `repos/Voltstro-Studios/Team-Capture/license` (`spdx_id: AGPL-3.0`). License header confirmed by file fetch: `GNU AFFERO GENERAL PUBLIC LICENSE / Version 3, 19 November 2007`.
- **In-source license headers** present in every file: `// Team-Capture / Copyright (C) 2019-2021 Voltstro-Studios / This project is governed by the AGPLv3 License.`
- **Activity:** Created 2019-11-15, last push 2026-03-24, 1,564 commits, **177 stars / 30 forks**. The README itself self-describes as "in a very early alpha" — read patterns, don't expect a finished game.
- **Networking:** Mirror (see `engines/mirror-networking.md`).

#### What's actually there

Verified by walking the repo tree
(`api.github.com/repos/Voltstro-Studios/Team-Capture/git/trees/master?recursive=1`):

```
src/Team-Capture/Assets/Scripts/
├── Core/Networking/         Client.cs, Server.cs, TCNetworkManager.cs,
│                            TCAuthenticator.cs, ServerConfig.cs
├── LagCompensation/         LagCompensationManager.cs,
│                            LagCompensatedObject.cs,
│                            LagCompensationFrameData.cs
├── Player/
│   ├── Movement/            PlayerMovementManager.cs (NetworkBehaviour),
│   │                        PlayerTransformSync.cs, PlayerGfxMover.cs
│   │   └── States/          PlayerInputs.cs, PlayerState.cs,
│   │                        PlayerTransformSnapshot.cs
│   ├── PlayerInputManager.cs, PlayerSetup.cs, PlayerManager.cs,
│   ├── PlayerWeaponRecoil.cs, PlayerCameraEffects.cs, PlayerDeathCam.cs
├── Weapons/                 WeaponBase.cs (abstract ScriptableObject),
│                            WeaponDefault.cs, WeaponMelee.cs,
│                            WeaponProjectile.cs, WeaponManager.cs,
│                            WeaponFireMode.cs, WeaponDefaultReloadMode.cs,
│                            WeaponSway.cs, BulletTracer.cs
│   ├── Effects/             {Default,Melee,Projectile}EffectsMessage.cs
│   ├── Jobs/                CreateDirectionsJob.cs (Burst job)
│   ├── Projectiles/         ProjectileBase.cs, ProjectileRocket.cs
│   └── UI/                  IHudUpdateMessage.cs + impls
└── Pickups/                 Pickup.cs, HealthPickup.cs, WeaponPickup.cs
```

#### Patterns worth borrowing into Flump / unity-mobile-shooter

1. **Weapon-as-abstract-ScriptableObject hierarchy** —
   `Assets/Scripts/Weapons/WeaponBase.cs` is `public abstract class
   WeaponBase : ScriptableObject` with subclasses `WeaponDefault`,
   `WeaponMelee`, `WeaponProjectile`. Flump currently has one
   `WeaponData` SO that crams *all* weapon types into one shape (see
   FLUMP-AUDIT §1). Team-Capture's split would let unity-mobile-shooter
   emit a parent + 3 specialised SOs instead of the current single SO.
   Concretely: `weapon-base.yaml` → `WeaponBase.asset` (id, prefab ref,
   sway, recoil), then `weapon-firearm.yaml` / `weapon-melee.yaml` /
   `weapon-projectile.yaml` extending it. **Tradeoff:** more entity
   types in the plugin, but each is narrower and validates better.

2. **Lag compensation is its own subsystem, not a feature flag** —
   `Assets/Scripts/LagCompensation/LagCompensationManager.cs` plus
   `LagCompensatedObject.cs` and `LagCompensationFrameData.cs`. They keep
   per-frame snapshots of every `LagCompensatedObject`, then on a
   server-side hitscan rewind to the shooter's RTT-shifted frame. Flump
   ships no lag-comp today (FLUMP-AUDIT didn't see one) — when it
   becomes a need, this is the canonical small-codebase pattern to copy
   the *shape* of (the AGPL means we cite, not paste).

3. **`ServerConfig` as a plain serialised file, not Unity SO** —
   `Core/Networking/ServerConfig.cs` is a regular C# class persisted via
   their `ObjectSerializer`, *not* a ScriptableObject. Right call — server
   config is read by headless Linux builds where Unity's SO loader is
   noisy. unity-mobile-shooter currently has no server-config entity;
   this argues for a future `server-config` type that emits a JSON file
   plus a `ServerConfig.cs` deserializer, *not* an `.asset`.

4. **`Input/InputReader.cs` as the seam** — single class translates new
   Input System actions into `PlayerInputs` struct that `PlayerMovementManager`
   consumes. This is the right place to graft mobile touch on top of
   desktop without the rest of the player code knowing the difference —
   the desktop variant is just one of two `InputReader` implementations.
   Direct mapping for Flump: a `MobileInputReader` that fills the same
   struct from on-screen joystick + fire button.

#### Anti-patterns to AVOID

- **AGPL viral compat.** Flump is closed-source. Anything pasted from
  Team-Capture would force Flump itself open under AGPL. Read it for
  patterns, do not copy code into Flump or Boilergen templates.
  Boilergen's emitted code is its own original work derived from the
  Flump (closed) source; nothing pasted in from Team-Capture.
- **`PlayerWeaponRecoil.cs` lives on the player, not the weapon.** Means
  every weapon SO has to declare recoil values that get *applied by* a
  player-side script. Flump's current `WeaponData` already does the
  cleaner thing (recoil is on the weapon SO), don't regress to T-C's
  layout just because it's there.
- Project depends on **Mirror's `[SyncVar]` / `[Command]` model**. NGO
  uses `NetworkVariable<T>` and `[ServerRpc]` / `[ClientRpc]` — the
  patterns transfer but the literal attributes don't. Mental conversion
  required when reading, this is not a copy-paste source.

### 3.2 FishMMO (jimdroberts) — the active MIT FishNet codebase

- **URL:** https://github.com/jimdroberts/FishMMO
- **License:** **MIT** — verified via license API. Header: `MIT License /
  Copyright (c) 2023 jimdroberts`.
- **Activity:** Created 2023-03-16, last push **2026-04-09**, **117 stars
  / 32 forks**. Active in 2026. C# 98.4%.
- **Networking:** FishNet (see `engines/fish-networking.md`). Server-auth.
- **Caveat:** **MMO, not FPS.** No combat-shooter loop, no weapon
  recoil/spread. Listed here because it is the largest, most active,
  fully MIT-licensed FishNet game-template on GitHub and the
  *non-combat* networking layer (assembly split, lobby, auth, DB,
  patcher) is exactly what a Flump-class production game also needs and
  doesn't get from a "minimal FPS sample."

#### What's actually there

Walked tree:

```
FishMMO-Unity/Assets/Scripts/
├── Client/                  Client.cs, ClientPostbootSystem.cs,
│   │                        ClientNamingSystem.cs,
│   │                        ClientSSLCertificateHandler.cs,
│   │                        ServerConnectionType.cs
│   ├── Authentication/
│   ├── Input/
│   ├── Launcher/
│   ├── UI/
│   └── WebGL/
├── Server/
│   ├── Core/                connection / world server scaffolding
│   ├── Database/            EFCore migrations + repo layer
│   └── Implementation/
└── Shared/
    ├── Bootstrap/
    ├── Network/
    ├── Tools/
    └── Entity/
        ├── BaseCharacter.cs, ICharacter.cs,
        │   ICharacterBehaviour.cs, IPlayerCharacter.cs,
        │   CharacterBehaviour.cs, CharacterFlags.cs
        ├── Ability/, Achievement/, Archetype/, Buff/,
        ├── CharacterAttribute/, Dialogue/, Faction/,
        ├── Friend/, Guild/  (etc.)
```

Plus sibling top-level projects in the monorepo: `FishMMO-Database`,
`FishMMO-WebServers`, `FishMMO-Logger`, `FishMMO-AppHealthMonitor`,
`FishMMO-DiscordBot`, `FishMMO-Patcher`, `FishMMO-Setup`.

#### Patterns worth borrowing

1. **Three-assembly split: `Client` / `Server` / `Shared`.** Compile-time
   wall against accidentally referencing client UI from server logic.
   Flump's current layout (`Assets/_Project/Scripts/`) is one assembly;
   when it grows, the FishMMO split is the proven precedent. This is
   independent of FishNet vs NGO — works either way.
2. **Interface-first character model** — `ICharacter`, `ICharacterBehaviour`,
   `IPlayerCharacter` in `Shared/Entity/`. Means bots and players share
   one interface surface; combat code doesn't branch on `is BotCharacter`.
   Direct read across to Flump where the bot AI (per FLUMP-AUDIT) is its
   own `BotAI.cs` and may share little with the player. unity-mobile-shooter's
   `bot-personality` entity could grow a sibling `character-interface`
   pattern that emits both `IPlayerCharacter` and `IBotCharacter` from one
   schema.
3. **`Setup` as a separate buildable project** — `FishMMO-Setup` is a
   standalone .NET app for installing DB schema, generating certs,
   bootstrapping config. Mirrors what Boilergen's `project-init` schema
   does in spirit; FishMMO's version is the bigger, more battle-tested
   shape to grow toward.
4. **WebGL / Launcher / Patcher separation** in `Client/`. These aren't
   shooter patterns *per se* but a Flump shipping on Android / iOS will
   eventually need the same separation (a thin platform-launcher that
   pulls down the Unity bundle).

#### Anti-patterns to AVOID

- It's an MMO codebase. Combat assumptions, spawn timing, network tick
  rate, interest management — **all wrong for a 5v5 instanced shooter**.
  Specifically, MMO-style "everything's a NetworkObject in the world"
  costs bandwidth that Hardpoint5v5 doesn't need. Read the structure,
  ignore the gameplay loop.
- EFCore + relational DB layer is **overkill** for a per-match shooter.
  Flump's matches end in minutes; SQLite-per-match or just
  in-memory-then-blob would do. Don't pull in the EFCore dependency by
  reflex.

### 3.3 Kieeran/FPS-Game — bot AI reference, with a license caveat

- **URL:** https://github.com/Kieeran/FPS-Game
- **License:** **MIT** on the wrapper repo. Header: `MIT License /
  Copyright (c) 2026 Kieeran`. **But see caveat below — the bundled
  third-party Asset Store packages are not MIT and do not transitively
  inherit the wrapper license.**
- **Activity:** Created 2024-11-30, last push **2026-04-28**, **4 stars /
  2 forks**, 657 commits. Recent and active, but tiny audience. Project
  description self-identifies as an "academic thesis project."
- **Networking:** Netcode for GameObjects (NGO) + Unity Lobby + Unity Relay
  (matches Flump's stack, the closest-to-Flump candidate of the three).

#### What's actually there

Walked tree:

```
Assets/
├── 3D Game Kit - Character Pack/    ← Unity Asset Store, NOT MIT
├── Behavior Designer/               ← Asset Store paid, NOT MIT
├── Behavior Designer Movement/      ← Asset Store paid, NOT MIT
├── Dark UI/                         ← Asset Store, NOT MIT
├── Invector-3rdPersonController_LITE/  ← Asset Store, NOT MIT
├── MON Studios LLC/                 ← Asset Store, NOT MIT
├── Matthew Guz/                     ← bundled artist asset
├── DefaultNetworkPrefabs.asset      ← NGO config
└── FPS-Game/Scripts/                ← author's own MIT code
    ├── Bot/                         FSM + BT bot architecture
    │   ├── BotController.cs, BotTactics.cs, AIInputFeeder.cs,
    │   │   AITarget.cs, BlackboardLinker.cs, FSMState.cs,
    │   │   PerceptionSensor.cs, WaypointPath.cs
    │   └── Task/                    individual BT task nodes
    ├── ScriptableObject/            data-layer SOs
    ├── System/                      shared subsystems
    ├── TacticalAI/                  higher-level AI tactics
    ├── Lobby Script/                NGO Lobby + Relay glue
    ├── Firearm.cs, GunManager.cs, Bullet.cs, Magazine.cs,
    ├── BulletManager.cs, BulletHole.cs, BulletHoleManager.cs,
    ├── BulletTrails.cs, AmmoLoads.cs, GrenadeLoads.cs,
    ├── Grenade.cs, Melees.cs, ReloadEffect.cs, ShootEffect.cs,
    ├── DamageGun.cs, HealthBarSystem.cs, HealthPickup.cs,
    ├── Inventory.cs, Enemy.cs, Entity.cs, Dummy.cs,
    ├── Scoreboard.cs, GameSceneManager.cs, SpawnPosition.cs,
    ├── PlayerWeapon.cs, WeaponManager.cs, WeaponSwitching.cs,
    └── _PlayerMovement.cs, _SwayAndBob.cs, _TestRelay.cs,
        __Gun.cs (real firearm impl)
```

#### License caveat in detail

This is the most important honest finding in the entry. The repo has an
`MIT LICENSE` file, but the `Assets/` folder also contains:

- `Behavior Designer/` and `Behavior Designer Movement/` — **Opsive**'s
  paid Asset Store package, redistribution prohibited by Asset Store EULA.
- `Invector-3rdPersonController_LITE/` — Invector's free-tier Asset Store
  package, also under Asset Store EULA, not MIT.
- `Dark UI`, `MON Studios LLC`, `3D Game Kit - Character Pack` — same
  story.

**The MIT license on the wrapper does NOT cover those bundled assets.**
Reading the *author's own scripts* (`Assets/FPS-Game/Scripts/`) is fine
under MIT. Cloning the whole repo and shipping a derivative is a
distinct, almost-certainly-violating act with respect to the bundled
commercial assets. Practical rule for us: read `FPS-Game/Scripts/Bot/`,
do **not** clone the repo to fork.

(This is a recurring failure mode of student / small Unity projects on
GitHub — `.gitignore` is set up wrong and Asset Store packages get
committed. We should treat any Unity repo whose `Assets/` folder
contains vendor-named subfolders with the same suspicion.)

#### Patterns worth borrowing (from Kieeran's own code only)

1. **FSM + Behavior Tree hybrid for bots** — `BotController.cs` declares
   `enum State { None, Idle, Patrol, Combat }` as the high-level state
   machine, then delegates the *moment-to-moment* behaviour
   (LookAround / ScanArea / Seek / AimAtPlayer / Attack) into the
   Behavior Tree (which the author runs through Behavior Designer — but
   the *pattern* is independent of the runtime). For unity-mobile-shooter:
   this is the strongest argument yet for a richer `bot-personality`
   schema that emits both an `enum` declaration and a per-state config
   block (idle radius, patrol points, combat range gating). The current
   `bot-rookie.yaml` / `bot-veteran.yaml` are flat tunables — they could
   become `state-machine.states[].behaviors[]` lists.
2. **`AIInputFeeder.cs`** — feeds the bot's decisions into the **same
   input pipeline** the player uses. Means one `PlayerMovement.cs`
   serves both bot and player; bot is just a different input source.
   This is the FishMMO interface pattern made concrete in a shooter.
   Direct lift candidate for Flump's BotAI / NetworkPlayerController
   integration.
3. **Server-authoritative bots run on the host** — readme calls out that
   bots are "host-controlled AI bots synchronized across the network."
   Right call for matchmaking-fill scenarios where a 5v5 has 7 humans +
   3 bots and you can't trust the bots' clients (because there are no
   bot clients). Direct relevance to Flump's stated need for "bot AI
   for matchmaking fill."

#### Anti-patterns to AVOID

- **Stub `PlayerWeapon.cs`** — fetched and confirmed it's literally a
  `MonoBehaviour` with `Start() {}`, `Update() {}`, and a list field.
  The *real* weapon code is in `__Gun.cs` (note the leading underscores
  — author convention for scratch files). Don't be misled by the
  obvious-looking name.
- **Leading-underscore "scratch file" convention** for production-ish
  code (`_PlayerMovement.cs`, `_SwayAndBob.cs`, `__Gun.cs`,
  `_TestRelay.cs`) is a code smell — they're temporary names that hardened
  into permanent ones. Read for content, don't replicate the convention.
- **No mobile touch input.** Repo is desktop-only. If we want a touch
  reference we still need to find one elsewhere or build it ourselves.
- **No actual game modes shipped** — readme says "Team Deathmatch, Bomb
  Defusal" planned. Today there is one DM-style loop. Don't expect
  Hardpoint reference here.

### 3.4 Mirror's `Examples/TopDownShooter` and `Examples/LagCompensation`

- **URL:** https://github.com/MirrorNetworking/Mirror — `Assets/Mirror/Examples/`
- **License:** **MIT**, verified via license API. Mirror itself is the
  longest-lived MIT Unity netcode (see `engines/mirror-networking.md`).
- **Activity:** v96.10.0 tag April 2026, **6,155 stars**, 853 forks. Push
  2026-04-13.

These are not full games — they are intentionally tiny reference
implementations. Worth scanning specifically because:

- `Examples/TopDownShooter/Scripts/` ships exactly six files: `CameraTopDown.cs`,
  `CanvasHUD.cs`, `CanvasTopDown.cs`, `EnemyTopDown.cs`, `NetworkTopDown.cs`,
  `PlayerTopDown.cs`, `RespawnPortal.cs`. The minimum viable
  Player + Enemy + NetworkManager + Respawn split. Topdown perspective
  doesn't matter — the message-flow shape transfers to FPS.
- `Examples/LagCompensation/` ships `Capture2D.cs`, `ClientCube.cs`,
  `ServerCube.cs`, `Snapshot3D.cs`. **The simplest possible primer on
  client-side prediction + server reconciliation** in any OSS Unity
  netcode — fits in one read, no game-loop noise. If we ever want to
  document lag-comp in the KB without paywalled content, this is the
  source.

Use case: documentation / KB cross-references, *not* templates.

### 3.5 FishNet (FirstGearGames) — examples are CSP/lag-comp drills, no shooter

Already documented in `engines/fish-networking.md`. Listed here for
completeness — its built-in examples demonstrate FishNet's CSP and lag-
compensation APIs but it ships no FPS sample. FishNet's licence is the
custom permissive one (royalty-free, source-available, with a competing-
networking-product carve-out and Pro features behind a paywall). It is
*not* OSI-MIT — see the engines entry for the full rundown.

---

## 4. Cross-references

- `engines/mirror-networking.md` — Mirror is what Team-Capture is built
  on; same `[SyncVar]` / `[Command]` HLAPI shape that pre-dates NGO. MIT.
- `engines/fish-networking.md` — FishNet is what FishMMO is built on.
  Custom permissive, server-auth, in-the-box CSP and lag-comp.
- `engines/photon-quantum-3.md` — closed-source commercial alternative
  no candidate above uses; included in the decision-tree comparison.
- `engines/unity-mobile-multiplayer.md` — the broader landscape entry that
  this roundup is the "sample-code half" of.
- `handoff/05-FLUMP-AUDIT.md` — the closed Flump repo this entire
  roundup is in service of.

---

## 5. Recommendations for unity-mobile-shooter plugin v2

Five concrete additions inspired by the research, in priority order.

1. **`weapon-base` + specialised-weapon entity types (split from current
   `weapon`).** Driven by Team-Capture's `WeaponBase : ScriptableObject`
   abstract + `WeaponDefault` / `WeaponMelee` / `WeaponProjectile`
   subclasses. Migration path: keep existing `weapon` schema as
   `weapon-firearm` (the dominant case in Flump), add `weapon-melee` and
   `weapon-projectile` with narrower field sets. Validates better, makes
   schema files shorter, keeps the magazine/spread fields off the combat
   knife.
2. **`bot-state-machine` entity type, replacing or extending the current
   flat `bot-personality`.** Driven by Kieeran's `BotController.cs`
   FSM+BT hybrid. Schema would declare `states: [Idle, Patrol, Combat]`
   plus per-state `behaviors:` lists. Emits a `BotStateMachine.cs` and a
   companion `BotPersonality.asset` SO that the SM script reads. Keeps
   the data-driven Boilergen story but lets the generated code actually
   *do* something rather than be tunables-only.
3. **`network-input` entity type emitting an `InputReader.cs` interface
   and pluggable `DesktopInputReader` / `MobileInputReader` / `BotInputReader`
   implementations.** Driven by Team-Capture's `Input/InputReader.cs`
   pattern + Kieeran's `AIInputFeeder.cs`. This is the unification hook
   where mobile touch input slots in without the rest of the player code
   knowing. **Highest-leverage single addition for Flump specifically**,
   because Flump is mobile and the current Boilergen plugin emits no
   input layer at all.
4. **`server-config` entity type emitting a JSON file + `ServerConfig.cs`
   plain-C# deserializer (NOT a ScriptableObject).** Driven by
   Team-Capture's `Core/Networking/ServerConfig.cs`. ScriptableObjects
   don't load well in headless Linux dedicated-server builds; plain JSON
   does. Right entity to model the divide explicitly.
5. **`assembly-split` project-init variant — emits `*.asmdef` files for
   `Client` / `Server` / `Shared` assemblies.** Driven by FishMMO. Today
   the `project-init` schema lays down `LocaleManager.cs` + `en.json`;
   adding the assembly-split scaffolding alongside lets a fresh project
   not paint itself into the "everything's one assembly, refactor later"
   corner that Flump already partially has.

Each of these can ship as a separate sprint per the cadence preference —
they're independent.

---

## 6. Honest caveats — what's GOOD vs MARKETING SLIDE

This section is the entry's reason for existing. The web is full of
"unity multiplayer FPS github" search results that don't survive reading.
What we rejected and why:

- **Unity Boss Room** (`com.unity.multiplayer.samples.coop`) — **Unity
  Companion License**. Verified by fetching `LICENSE.md`: header reads
  "Boss Room: Small Scale Co-op Sample © 2021 Unity Technologies.
  Licensed under the Unity Companion License for Unity-dependent
  projects." Not OSI-approved. **Excluded.** Architecturally excellent
  — would otherwise be the top recommendation — but the licence kills
  it for our positioning.
- **Unity FPSSample** — same Unity Companion License (verified, header
  reads "Copyright (c) 2018 Unity Technologies ApS. Licensed under the
  Unity Companion License for Unity-dependent projects"). Also archived,
  Unity 2018.3 era, no longer maintained. **Double-excluded.**
- **Unity Bitesize Multiplayer Samples** (`com.unity.multiplayer.samples.bitesize`)
  — same Unity Companion License (verified). Includes a 2D Space Shooter
  but no FPS. **Excluded.**
- **Elympics/template-fps** — MIT licence, but the framework it depends on
  (Elympics) is described in their own docs as for "blockchain-integrated
  multiplayer games." That triggers our project-level red zone (NFT /
  blockchain, see project red-zones memory). **Excluded.**
- **Armour/Multiplayer-FPS** — MIT, ~1.2k stars, but uses **Photon Unity
  Networking 2 (PUN2)** which is closed-source third-party with a CCU
  paywall. The README itself notes specialised input branches "are not
  maintained since 2020." **Excluded** — old, dependency-heavy, dormant.
- **prabdhal/FPS-Shooter-Network-Game** — MIT, FishNet, but only **6
  stars**, last push **2023-04-19** (no pushes for 2+ years), `archived`
  flag false but de facto abandoned. **Excluded** — would mislead more
  than help.
- **InboraStudio/Unity-Hyper-FPS-FrameWork-Open-Source-** — repo
  responded HTTP 451 (legally restricted in our jurisdiction at fetch
  time). Could not verify license or contents. **Excluded** on
  unverifiable grounds; do not cite.
- **kennux/OsFPS** — older, unmaintained, single-author engine project,
  not a full game and not actively used. Skipped.
- **condidios/ecs-netcode-multiplayer-demo** — 3 stars, no LICENSE file
  (defaults to all-rights-reserved — *not* open source despite "open"
  vibes). **Excluded** for licence absence.
- **MultiplayerFPS-Tutorial / Death-Match-3D / etc.** — the long tail of
  student tutorial repos on GitHub topic pages. Almost all are 50–500
  LOC student exercises. Skipped without individual treatment.

What this means in practice: of the **~10 repos** that surface for
"open-source Unity multiplayer FPS" searches, **only 3** clear the
combined OSI-licence + still-active + non-trivial filter (Team-Capture,
FishMMO, Kieeran/FPS-Game), and even those come with caveats — Team-
Capture is AGPL (read-only for us), FishMMO is an MMO not a shooter, and
Kieeran's repo bundles paid Asset Store packages that pollute the
licence at the *bundle* level.

The truth-in-advertising statement: **there is no OSI-licensed
production-quality Unity multiplayer mobile FPS on GitHub today.** The
Flump-class game does not have a peer in OSS. The patterns above are the
best available proxies.

---

## 7. Licence verification footer

Every repository cited as a candidate (Team-Capture, FishMMO,
Kieeran/FPS-Game, MirrorNetworking/Mirror) was verified on **2026-05-03**:

- License classification fetched from `api.github.com/repos/<owner>/<repo>/license`
  (GitHub Licensee classifier).
- `LICENSE` / `LICENSE.md` file headers fetched and read.
- For Team-Capture, in-source per-file licence headers spot-checked
  (`WeaponBase.cs`, `PlayerMovementManager.cs`).

Rejected candidates (Boss Room, FPSSample, Bitesize) were rejected on
verified Unity Companion License headers, *not* on hearsay.

Kieeran/FPS-Game's bundled commercial Asset Store packages were
identified by listing `Assets/` and inspecting vendor-named subfolders;
the licence caveat in §3.3 is based on the public Unity Asset Store EULA
that prohibits redistribution.

No leaked AAA shooter source code (Far Cry 1, Quake 3 leak,
CS-beta/CS:GO leak, Valorant beta, etc.) is referenced. No
reverse-engineered or decompiled material is referenced. No paywalled
SDKs were quoted from. Where a closed-source reference is mentioned
(Photon Quantum 3, FishNet Pro tier, Boss Room), the citation is to
public documentation only.

If this entry is updated, re-verify each `LICENSE` URL — repos can and
do change licences. The 2026-05-03 snapshot is the warranty boundary.
