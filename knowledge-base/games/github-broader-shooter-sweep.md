---
type: game
slug: github-broader-shooter-sweep
title: Broader GitHub sweep — adjacent OSS Unity projects worth knowing
genre: fps
engine: unity
content_format: code
language: csharp
license: mixed (verified per repo)
source_url: https://github.com/topics/unity-multiplayer
last_analyzed: 2026-05-03
maturity: mixed
relevance_to_grandgames: high
tags: [unity, multiplayer, fps, mobile, github, awesome-lists, oss]
---

# Broader GitHub sweep — adjacent OSS Unity projects worth knowing

> Verified 2026-05-03. Companion to `oss-unity-mp-shooters.md`. The first
> sweep nailed the obvious direct hits (Team-Capture, FishMMO,
> Kieeran/FPS-Game). This entry casts a wider net: shooter-adjacent OSS
> (battle-royale, arena, tactical, MOBA, RTS), specialized libraries
> (bot AI, mobile input, weapon systems, lobbies), Unity-Technologies
> samples, and meta-resources (awesome-lists). Same hard constraints as
> before: OSI-approved licenses only, no leaked AAA / decompiled
> material, no NFT tie-ins, honest framing about quality and scope. Many
> Unity-official repos that look open are actually under the **Unity
> Companion License (UCL)** — proprietary, not OSI — and are flagged
> below.

---

## 1. Why this entry exists

The previous sweep ended with three verified candidates and a long list of
"didn't survive the filter." That's not enough surface area for a tooling
project — Flump, boilergen's `unity-mobile-shooter` plugin, and the
NovaStudios audit all benefit from seeing how the OSS ecosystem
*actually* solves the same problems we're solving (or, often, doesn't
solve them).

This sweep targets four categories the first one underweighted:

1. **Direct shooter candidates** that the first pass missed — including
   ones with low star counts but interesting architecture
2. **Adjacent OSS projects** (battle royale, arena, tactical, MOBA, RTS)
   whose lobby / matchmaking / netcode patterns transfer to Flump
3. **Specialized single-purpose libraries** that can be borrowed in
   isolation: behavior trees, GOAP planners, mobile joystick handlers,
   weapon systems, Steam lobby helpers
4. **The "looks promising but isn't" pile** — repos that surface high in
   search results but are dead, abandoned, license-broken, or bundle
   paid assets

Critical finding for project policy: **Unity-Technologies' marquee
samples** (Boss Room, Bitesize, Megacity Metro, FPSSample, Megacity-2019)
are uniformly under the **Unity Companion License**, *not* MIT/Apache.
UCL permits use only with Unity products and is not OSI-approved. We can
*read* them as reference, but we cannot vendor the code into anything we
ship as OSS.

---

## 2. Direct shooter candidates not in the first sweep

All entries verified 2026-05-03 via the GitHub LICENSE file or repository
header.

| Repo | License | Stars | Last commit | LOC ballpark | Networking | Verdict for Flump |
|------|---------|-------|-------------|--------------|------------|-------------------|
| `Armour/Multiplayer-FPS` | MIT | 1.2k | 2024 (Unity 2022.3.55f1 LTS) | ~10–15k C# | Photon PUN2 | **Tangentially useful.** Largest-star MIT Unity FPS in the wild. Photon dependency is paid-tier-gated above 20 CCU, so the netcode itself isn't reusable, but the input abstraction (Kinect, Xbox, Leap, VR) and weapon-impact-by-material system are honest reference. |
| `kennux/OsFPS` | MIT | 27 | **Archived 2023-09-10** | ~3–5k | Single-player engine | **Reference only.** Refactored to strip proprietary assets; first-person controller, inventory, weapon, procedural anim, damage. Author tags it "for people who can read code." Dead but coherent. |
| `twestpha/FirstPersonEngine` | GPL-3.0 | 24 | recent | ~5k | None | **Tangentially useful.** Boomer-shooter framework: 2D sprite enemies, retro guns, map import. GPL-3 makes it copyleft — borrowing means our consumer must also be GPL-3. Useful as a teaching reference for retro-style mode prototypes; not for vendoring. |
| `huabrandon0/unity-fps-1` | **none specified** | 31 | unmaintained | small | Unity UNet (deprecated) | **Skip.** No license = no rights. Uses long-deprecated UNet. |
| `PratapDafedar/ShootField` | none specified | very low | dead | small | uLink/MultiLan (defunct) | **Skip.** Both license and netcode dead. |
| `sarmadshaikh/jnec-strike` | none specified | very low | dead | small | LAN-only, custom | **Skip.** Student project, no license, abandoned. |
| `InboraStudio/Unity-Hyper-FPS-FrameWork-Open-Source-` | unknown — repo returned **HTTP 451** when verified | unknown | unknown | unknown | claims modular | **Cannot verify.** GitHub blocked the page (likely DMCA / region issue). Treat as unverified — do not use. |
| `JFroggo-Gaming/Unity-FPS-game` | unknown | low | unknown | small | single-player | Not investigated in depth — single-player, no networking pattern to learn. |

### Honest verdict on the direct-candidate column

Beyond Team-Capture (already in the first sweep), there is **no other
high-quality OSI-licensed Unity multiplayer-FPS reference** of the scope
we'd hope for. The MIT/Apache shooters that survive the filter are
either single-player frameworks (FirstPersonEngine, OsFPS) or net-stack
choices we can't carry into Flump (Photon PUN2 in Armour/Multiplayer-FPS).

This is a real ecosystem gap, not a search failure. The economically
viable Unity-FPS market lives behind paid Asset Store licenses (UFPS,
PUN, Mirror+addons), behind Unity Companion License (Boss Room,
FPSSample, Megacity Metro), or behind proprietary blockchain-adjacent
platforms (Elympics — see graveyard). That informs Flump's positioning:
the OSS reference codebases are scarce enough that *being one* is itself
a contribution.

---

## 3. Adjacent OSS projects worth knowing

Patterns transfer even when the genre doesn't.

### 3.1 Battle royale

| Repo | License | Stars | Notes |
|------|---------|-------|-------|
| `HectorPulido/Unity-Battle-Royale-game-Made-With-Unity` | MIT | 50 | TPS BR clone, Unity 2017.3+. Networking layer not documented in README but the project is small enough to skim. Useful for shrinking-circle / loot-spawn / drop-zone patterns rather than netcode. |
| `BattleRoyale-Unity/Battle-Royale` | not verified | low | Found via topic search; not verified in depth. |
| `jvanvurenj/progBR` | not verified | low | Uses deprecated UNet. Skip. |

**Why this transfers to Flump:** circle-collapse timer logic and drop-zone
spawn distribution are isomorphic to Hardpoint rotation and 5v5 spawn
selection. Worth a 30-minute read.

### 3.2 Arena / boomer shooter

| Repo | License | Stars | Notes |
|------|---------|-------|-------|
| `teddante/QuakeUnity` | GPL-2.0 | 1 | Translation of original Quake C source into Unity C#. Asset-free; "fan-made for educational purposes." 7 commits, very early. GPL-2 limits reuse. |
| `IsaiahKelly/quake3-movement-for-unity` | Unlicense (public domain) | 104 | **Surprisingly useful.** Q3 strafe-jump physics ported to Unity. Fork of WiggleWizard's original. If Flump ever wants a "movement mode" / advanced-mobility option, this is a public-domain reference for the air-control formulas. |
| `tucci/Projekt-AI` | not verified | small | Quake-style multiplayer with double-jump / strafe-jump / rocket-jump / circle-jump. License unverified — read but don't vendor without checking. |
| `AumPatel2208/Unity_Arena_Shooter` | not verified | small | Solo academic project. |

### 3.3 Tactical / Counter-Strike-inspired

All of the CS-clones found (`huabrandon0/unity-fps-1`, `PratapDafedar/ShootField`,
`sarmadshaikh/jnec-strike`, `maxwhitepl/CS-PB`, `rishshah/CounterStrike-0.6`)
are either student projects with no license, or use deprecated networking
(UNet, uLink). **None survive the filter.** This is a notable hole — there
is no respectable OSS Unity tactical-round shooter reference. The pattern
to study (round economy, buy menu, defuser/objective state machines) has
to be cribbed from Source SDK (different engine, GPL-2 with Valve
restrictions) or from descriptive papers, not from working Unity code.

### 3.4 MOBA / arena-spawn-and-respawn

| Repo | License | Stars | Notes |
|------|---------|-------|-------|
| `DevZhav/unity-moba` | GPL-3.0 | 42 | "MOBA Toolkit" with account + matchmaking service, server/client split, example maps. 5 commits — small but the *architecture* is documented in README. Useful **lobby pattern reference** even if we never ship a MOBA. GPL-3 forecloses vendoring. |
| `tammukul/UNION-OpenSource-MOBA` | not verified | low | Uses PlayFab + Photon — both proprietary services. Skip for hard-OSS work. |
| `nidaynere/easymoba` | not verified | low | Server-authoritative split documented in README. Worth a skim for arch ideas. |
| `IlyaBlokh/MechwarsRTS` | not verified | 8 | Uses Mirror + Steamworks. Steam-lobby flow is the transferable bit. |

### 3.5 RTS

| Repo | License | Stars | Notes |
|------|---------|-------|-------|
| `HectorPulido/Simple-RTS-Made-With-Unity` | MIT | low | Unity 2017.3+. Selection / formation / fog-of-war patterns; not directly relevant to Flump but is a cleanly-MIT'd reference for the RTS genre. |
| `nefrob/unity-rts` | not verified | low | Mirror + FizzySteamworks (Steam P2P). Steam-P2P-via-Mirror is the relevant technique. |

---

## 4. Specialized libraries — borrow in isolation

These are the highest-leverage finds in this sweep. Each is single-purpose,
small, MIT/Apache-licensed, and could be dropped into Flump with minimal
friction.

### 4.1 Bot AI

| Repo | License | Stars | Last commit | Verdict |
|------|---------|-------|-------------|---------|
| `crashkonijn/GOAP` | Apache-2.0 | **1.7k** | 2026-03-06 (v3.1.2) | **Recommended.** Multi-threaded GOAP using Unity's job system. Visualizer included. Active maintenance. If Flump's bot-personality SO ever needs real planning instead of stateless behavior, this is the library. |
| `luxkun/ReGoap` | Apache-2.0 | 1.1k | active | Generic C# GOAP with Unity + Godot adapters. Slightly older API than crashkonijn but lighter-weight. |
| `ashblue/fluid-behavior-tree` | MIT | 1.2k | 2024-11-09 (v2.3.0) | **Recommended.** Builder-pattern behavior trees, code-first (no editor lock-in). Exactly the shape you want for tooling-driven generation: bot SOs can compile straight to a Fluid tree. |
| `caesuric/mountain-goap` | not verified | mid | active | C# GOAP library, less Unity-specific. |

**Flump implication:** today the bot-personality SO is essentially a
parameter bag. If/when bot quality becomes a complaint, the migration
target is `ashblue/fluid-behavior-tree` (MIT, code-driven, builder
pattern composes well with our SO emission) for reactive bots, or
`crashkonijn/GOAP` (Apache-2.0, jobs-system) for goal-driven bots that
need to plan multi-step actions.

### 4.2 Mobile input

| Repo | License | Stars | Notes |
|------|---------|-------|-------|
| `AnnulusGames/EnhancedOnScreenStick` | MIT | 101 | 2024-02-22, v1.0.0. Compatible with Unity Input System / uGUI. Position tracking, dead zones, adjustable operational areas. **Best-in-class** for the mobile-shooter use case. Direct fit for Grand Mobile. |
| `MarcoFazioRandom/Virtual-Joystick-Unity` | GPL-3.0 | 7 | Simple, complete, supports 2D and 3D, configurable modes. GPL-3 limits reuse. |
| `ashwaniarya/Unity3D-Simple-Mobile-Joystick` | not verified | mid | Older, simpler. |
| `NeKoRoSYS/NKRsys-Mobile-Input-Handling` | not verified | low | Improved On-Screen Stick component. |

**Flump implication:** if/when Flump or the `unity-mobile-shooter`
boilergen plugin needs a real touch-control reference, EnhancedOnScreenStick
is the answer — MIT, narrow scope, recent, compatible with Unity Input
System (which Flump already uses).

### 4.3 Weapon systems (single-player references)

| Repo | License | Stars | Notes |
|------|---------|-------|-------|
| `SamMurphy/Unity-Gun-System` | MIT | 24 | Projectiles, firing modes, recoil, weapon switching. Tiny (6 commits) but the recoil curve and firing-mode pattern are reusable. |
| `sidsayshmm/Weapon-System-Unity` | unknown | 5 | License not displayed in README — assume unsafe. |
| `surits14HUB/WeaponSystem` | not verified | low | Aim/reload/refill/SFX/VFX coverage — descriptive but small. |

**Flump implication:** Flump's `WeaponData` SO already covers more than
any of these. They're useful only as a sanity check on what a
"reasonable minimum" weapon-system looks like in OSS land — and the
answer is "less than what we already have."

### 4.4 Steam lobbies / matchmaking

| Repo | License | Stars | Notes |
|------|---------|-------|-------|
| `rlabrecque/Steamworks.NET` | **MIT** | **3.5k** | 2025-12-24, release 2025.163.0. The canonical C# wrapper for Valve's Steamworks API. Builds against SDK 1.64. Used by 135 dependent projects. |
| `Facepunch/Facepunch.Steamworks` | **MIT** | **3.6k** | active (release 2.5.2, Apr 2026) | Garry Newman's alternative C# Steamworks binding. Supports IL2CPP. README is famously profane. |
| `bthomas2622/facepunch-steamworks-tutorial` | not verified | mid | Tutorial repo for Facepunch lobby implementation. Reference, not vendor. |
| `Onurkan811/UnitySteamLobbySystem` | GPL-3.0 | 4 | Mirror + Steamworks.NET integration. GPL-3 limits reuse but the *flow* (create lobby / invite Steam friend / ready check) is transferable. |
| `PickleJesus123/Steamworks.NET-matchmaking-lobbies-example` | not verified | mid | Self-described "BAREBONES" — useful as a starting outline, not a finished pattern. |
| `FatRodzianko/steamworks-tutorial` | not verified | mid | Mirror + Steamworks.NET tutorial. |

**Flump implication:** if Flump ever ships on Steam, the wrapper choice
is **rlabrecque vs Facepunch** (both MIT, both ~3.5k stars, both
active) — a real call to be made on API ergonomics. Either is
production-safe from a license standpoint. Lobby-flow patterns can be
read from Onurkan811 / FatRodzianko but should be re-implemented, not
copied (GPL-3 contagion).

### 4.5 Networking transports

| Repo | License | Stars | Notes |
|------|---------|-------|-------|
| `MirrorNetworking/Mirror` | **MIT** | **6.2k** | 2026-04-02, v96.10.0 | Already known. The canonical OSS Unity netcode lib. Powers Population: ONE + 1000+ Steam games. Includes example scenes (Room manager, NetworkDiscovery, etc.) — not a full FPS, but the building blocks are all there. |
| `FirstGearGames/FishNet` | **proprietary custom license — NOT OSI** | 1.9k | 2026-04-17, v4.7.2R | **Flag.** Often listed alongside Mirror as if it were equivalent OSS. It is not. The license is a free-to-use-but-no-derivatives-or-competing-products license, governed by Florida law, with a clause forbidding using FishNet to build competing networking solutions. **Cannot be vendored as part of an OSS project.** Use only if you accept the proprietary terms and are not redistributing. |
| `heroiclabs/nakama-unity` | **Apache-2.0** | 475 | 2026-02-13, v3.21.1 | Heroic Labs' Unity client SDK for Nakama. Apache-2.0, OSI-clean. The Nakama server is also Apache-2.0. Useful when matchmaking + presence + chat is the right shape (as opposed to per-room Mirror). |

**Flump implication:** confirms the choice already made — Mirror or
Nakama for any OSS-clean netcode work. FishNet's license terms make it
a non-starter for anything we redistribute, regardless of how good the
tech is. This is worth flagging in `community-sentiment-ai-gamedev.md`
and in any tooling that recommends transports.

---

## 5. Unity-Technologies samples — the UCL trap

Every Unity-Technologies sample repository surveyed is **Unity Companion
License** (proprietary). They are valuable as *reference reading*, but
**we cannot lift code from them into anything we ship as OSS** without
violating UCL. Listing them here so we don't accidentally re-discover
them and assume they're MIT.

| Repo | License | Stars | Last commit | Status |
|------|---------|-------|-------------|--------|
| `Unity-Technologies/com.unity.multiplayer.samples.coop` (Boss Room) | **UCL** | 1.9k | 2025-08-06, v3.0.0 | Active. 8-player co-op RPG. The reference for NGO patterns. **Read; do not vendor.** |
| `Unity-Technologies/com.unity.multiplayer.samples.bitesize` | **UCL** | 448 | 2024-12-23, v1.10.0 | Active. Smaller per-feature samples (client-driven movement, dynamic prefabs, etc.). **Read; do not vendor.** |
| `Unity-Technologies/megacity-metro` | **UCL** | 1.1k | 2024 | Active. 150-player shooter on Netcode for Entities + DOTS. **Read; do not vendor.** |
| `Unity-Technologies/Megacity-2019` | **UCL** | 530 | **deprecated** | Deprecated in favor of Megacity Metro. |
| `Unity-Technologies/FPSSample` | **UCL** | 5.1k | last meaningful work 2018-10-25, **no longer maintained** | Built on Unity 2018.3. Heritage interest only. |
| `Unity-Technologies/multiplayer` | not displayed (likely UCL) | 1.3k | redirects to ECS Samples | Pointer repo. |
| `Unity-Technologies/DOTSSample` | likely UCL | mid | older | Third-person multiplayer DOTS sample. |

**Action item for project policy:** add a short paragraph to
`reference_guardrails.md` clarifying that UCL is not OSI and Unity
sample code can be referenced but not vendored. This came up during the
sweep and is the kind of thing that's easy to get wrong silently.

---

## 6. Game-jam projects worth digging into

Honest answer: **the Ludum Dare / Brackeys / GGJ jams produce very few
Unity multiplayer games of any quality.** The constraint of a 48-hour
jam plus the difficulty of standing up netcode in that window means
multiplayer entries are rare and almost always single-room
trust-the-clients prototypes.

What did surface:

- `epolderman/Endless` — Texas A&M senior capstone, 2D 6-player online
  multiplayer. Capstone scope. License unverified.
- `Capstone-Projects-2024-Spring/project-rpg-elements-game` — RPG with
  Alteruna Multiplayer (proprietary free-tier). Skip.
- The GitHub Blog has periodic Ludum Dare roundups (LD41, LD50) — most
  highlighted entries are single-player puzzle/narrative games. The
  multiplayer entries that do appear use Photon (paid-tier above 20
  CCU) or are local-multiplayer-only.

**Verdict:** game-jam codebases are not a useful reference source for
Flump. The constraint scaling that produces a working jam game is
opposite the constraint scaling that produces a working multiplayer
shooter. Move on.

---

## 7. Awesome-list pointers (meta-resources)

These are the indexes worth bookmarking, not reading end-to-end. Each
saves an hour of search-and-verify for future sweeps.

| List | Last updated | Scope | Notes |
|------|-------------|-------|-------|
| `StefanoCecere/awesome-opensource-unity` | 2025-08-27 | Curated OSS Unity packages, organized by category | Has dedicated **Networking** + **Shooter** sections. The closest thing to a one-stop index. |
| `insthync/awesome-unity3d` | active | 60+ categories, 30+ networking solutions | Lists FishNet, PurrNet, Netick, Nakama, Photon, Mirror. **No dedicated FPS category** — shooter dev is assembled from sub-components (character controllers + input + raycast). |
| `RyanNielson/awesome-unity` | older | General Unity assets/resources | Less code-focused than the above two. |
| `proyecto26/awesome-unity` | older | Curated games | Game-list style, less useful for code reference. |
| `JackyChenGit/awesome-unity-games` | older | Open-source Unity projects | General. |

**Recommended primary index for our use case:**
`StefanoCecere/awesome-opensource-unity` (most up-to-date, has the
right categories) and `insthync/awesome-unity3d` (broadest networking
coverage).

---

## 8. The graveyard — promising-looking but unsafe

Repos that surface high in search but **fail the filter** for documented,
specific reasons. Recording these so future sweeps don't re-litigate the
same "is this one OK?" question.

| Repo | Why it fails |
|------|--------------|
| `Elympics/template-fps` | MIT license is real, but the template is built on Elympics, "our standard industry framework for **blockchain-integrated multiplayer games**." Blockchain/NFT is a project red zone (see `project_red_zones.md`). Skip. |
| `PubNubDevelopers/unity-multiplayer-shooter` | Built on PubNub (proprietary SaaS, not OSS). Also bundles a "Super Multiplayer Shooter Unity template" of unclear provenance. Skip. |
| `FirstGearGames/FishNet` | License is a custom Florida-law proprietary license that explicitly forbids using FishNet to build competing networking solutions. Often miscategorized as OSS. **Not OSI.** |
| All Unity-Technologies samples (Boss Room, Bitesize, Megacity Metro, FPSSample, Megacity-2019, DOTSSample) | Unity Companion License, not OSI. Read for reference; do not vendor. |
| `huabrandon0/unity-fps-1`, `PratapDafedar/ShootField`, `sarmadshaikh/jnec-strike`, `rishshah/CounterStrike-0.6`, `maxwhitepl/CS-PB`, `jvanvurenj/progBR` | No license file → all rights reserved by default → cannot use. Many also use deprecated UNet / uLink. |
| `InboraStudio/Unity-Hyper-FPS-FrameWork-Open-Source-` | GitHub returned **HTTP 451** on verification (legal block, region or DMCA). Cannot verify; do not use. |
| `Unity-Technologies/FPSSample` | UCL + last meaningful work in 2018 + Unity 2018.3 + officially unmaintained. Three reasons. |
| `Unity-Technologies/Megacity-2019` | Officially deprecated in favor of Megacity Metro. |
| `tucci/Projekt-AI`, `AumPatel2208/Unity_Arena_Shooter` | Solo academic projects, license not verified, dead. |
| `tammukul/UNION-OpenSource-MOBA` | Built on PlayFab (proprietary SaaS) + Photon (proprietary). Code is OSS but the architecture isn't usable. |

---

## 9. Direct-applicability scoring for Flump

Re-summarizing the survivors against the specific question "what should
Flump / boilergen / NovaStudios actually look at first?"

| Repo | License | Direct / Tangential / Reference | Why |
|------|---------|----------------------------------|-----|
| `MirrorNetworking/Mirror` | MIT | **Direct** | Already a candidate transport if NGO ever needs an exit. Examples folder is reference-grade. |
| `heroiclabs/nakama-unity` | Apache-2.0 | **Direct** | Real option for matchmaking + chat + presence. |
| `crashkonijn/GOAP` | Apache-2.0 | **Direct (future)** | Drop-in if bot SOs need real planning. |
| `ashblue/fluid-behavior-tree` | MIT | **Direct (future)** | Drop-in if bot SOs need reactive trees. |
| `AnnulusGames/EnhancedOnScreenStick` | MIT | **Direct (mobile)** | Best-fit mobile-FPS joystick for Grand Mobile + future Flump mobile build. |
| `rlabrecque/Steamworks.NET` / `Facepunch/Facepunch.Steamworks` | MIT | **Direct (Steam ship)** | Pick one when shipping on Steam. |
| `IsaiahKelly/quake3-movement-for-unity` | Unlicense | **Tangential** | Public-domain reference for advanced-movement modes. |
| `Armour/Multiplayer-FPS` | MIT | **Reference** | Highest-star MIT Unity FPS; Photon-locked netcode but input + impact-system patterns are honest. |
| `kennux/OsFPS` | MIT | **Reference** | Single-player FPS engine; archived but coherent. |
| `Unity-Technologies/com.unity.multiplayer.samples.coop` (Boss Room) | UCL | **Reference only — do not vendor** | The reference NGO sample. |
| `Unity-Technologies/com.unity.multiplayer.samples.bitesize` | UCL | **Reference only — do not vendor** | Per-feature NGO samples. |
| `DevZhav/unity-moba` | GPL-3.0 | **Reference (lobby arch)** | Toolkit-style architecture documented in README. |

---

## 10. References

Verified candidates (OSI-licensed, listed above):

- https://github.com/MirrorNetworking/Mirror
- https://github.com/heroiclabs/nakama-unity
- https://github.com/crashkonijn/GOAP
- https://github.com/luxkun/ReGoap
- https://github.com/ashblue/fluid-behavior-tree
- https://github.com/caesuric/mountain-goap
- https://github.com/AnnulusGames/EnhancedOnScreenStick
- https://github.com/MarcoFazioRandom/Virtual-Joystick-Unity
- https://github.com/rlabrecque/Steamworks.NET
- https://github.com/Facepunch/Facepunch.Steamworks
- https://github.com/Armour/Multiplayer-FPS
- https://github.com/kennux/OsFPS
- https://github.com/twestpha/FirstPersonEngine
- https://github.com/SamMurphy/Unity-Gun-System
- https://github.com/HectorPulido/Unity-Battle-Royale-game-Made-With-Unity
- https://github.com/HectorPulido/Simple-RTS-Made-With-Unity
- https://github.com/teddante/QuakeUnity
- https://github.com/IsaiahKelly/quake3-movement-for-unity
- https://github.com/DevZhav/unity-moba
- https://github.com/Onurkan811/UnitySteamLobbySystem

Unity Companion License (reference only, do not vendor):

- https://github.com/Unity-Technologies/com.unity.multiplayer.samples.coop
- https://github.com/Unity-Technologies/com.unity.multiplayer.samples.bitesize
- https://github.com/Unity-Technologies/megacity-metro
- https://github.com/Unity-Technologies/Megacity-2019
- https://github.com/Unity-Technologies/FPSSample
- https://github.com/Unity-Technologies/multiplayer
- https://unity3d.com/legal/licenses/unity_companion_license

Awesome-lists (meta-resources):

- https://github.com/StefanoCecere/awesome-opensource-unity
- https://github.com/insthync/awesome-unity3d
- https://github.com/RyanNielson/awesome-unity
- https://github.com/JackyChenGit/awesome-unity-games

Graveyard (do not use, reasons in Section 8):

- https://github.com/Elympics/template-fps
- https://github.com/PubNubDevelopers/unity-multiplayer-shooter
- https://github.com/FirstGearGames/FishNet
- https://github.com/InboraStudio/Unity-Hyper-FPS-FrameWork-Open-Source-
- https://github.com/huabrandon0/unity-fps-1
- https://github.com/tammukul/UNION-OpenSource-MOBA

---

## 11. Suggested follow-ups (not done in this entry)

- Add a paragraph to `reference_guardrails.md` clarifying UCL ≠ OSI so
  the next agent doesn't re-discover Boss Room and assume it's MIT.
- Update boilergen's `unity-mobile-shooter` plugin docs to recommend
  `AnnulusGames/EnhancedOnScreenStick` as the joystick-of-choice when
  emitting mobile-target schemas.
- File a `community-sentiment-ai-gamedev.md` follow-up noting FishNet's
  license is proprietary — common misconception worth correcting.
- Consider drafting a short `flump-bot-ai-future.md` entry that
  pre-evaluates `crashkonijn/GOAP` vs `ashblue/fluid-behavior-tree` for
  the day Flump's bot personalities need to plan instead of react.
