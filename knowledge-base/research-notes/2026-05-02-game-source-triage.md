---
type: research-notes
slug: 2026-05-02-game-source-triage
title: Triage of 11 game source repos for GamesAI knowledge-base study
date: 2026-05-02
maintainer: Alizhan
relevance_to_grandgames: medium
---

# Triage of game source repos suggested for study

User-supplied list (2026-05-02). Each repo classified by **license cleanliness** and **relevance to GamesAI's wedge** (RP/multiplayer mobile, deterministic codegen, content data architecture).

## Tier A — clean OSS, high relevance, study-worthy

### Mindustry (`Anuken/Mindustry`)

- **License:** GPL-3, fully OSI-open
- **Relevance:** ⭐⭐⭐⭐⭐ — mobile-shipping (Android+iOS), multiplayer, hybrid first-party-code + mod-HJSON content system
- **Status:** **deep-dive complete** — see [`knowledge-base/games/mindustry.md`](../games/mindustry.md)
- **Key takeaways:** code-as-content for first-party, HJSON for mods; 36-locale `.properties` bundles; tombstone-enum for save-version discipline; `<type>.<id>.<field>` localization convention validated

### Beyond All Reason (`beyond-all-reason/Beyond-All-Reason`)

- **License:** GPL-2 + MIT mix (mostly Lua + Spring/Recoil engine)
- **Relevance:** ⭐⭐⭐ — competitive RTS, mature balance/unit data, strong community modding; less directly relevant to mobile multiplayer, but the unit-data and balance-tuning pattern is transferable
- **Recommended depth:** medium audit — how unit / weapon / cost YAML/Lua files are structured, what tooling they use for balance review
- **Defer reason:** not in immediate wedge path; revisit when Schema Validator's "balance smell" pass is built

### OpenJK (`JACoders/OpenJK`)

- **License:** GPL-2 (Star Wars Jedi Knight: Jedi Academy + Outcast, id Tech 3 derivative)
- **Relevance:** ⭐⭐ — historical reference for FPS architecture, but pre-mobile era code; useful when documenting `unity-mobile-shooter` design choices in opposition to legacy id-Tech-3 approaches
- **Recommended depth:** light skim — citation-only

### id Software repos (`id-Software/*`: Doom, Quake, Quake II, Wolfenstein, RTCW, Doom 3, etc.)

- **License:** GPL-2 across the board
- **Relevance:** ⭐⭐ — historical / educational. The patterns (`bsp` rendering, `qcvm` scripting in Quake, Doom WAD format) are foundational but pre-modern
- **Recommended depth:** light reference. Quake's QC scripting pattern is interestingly close to Boilergen's data-as-code idea, worth a single comparative entry someday

## Tier B — patterns useful, license requires care

### Barotrauma (`FakeFishGames/Barotrauma`)

- **License:** **source-available** with custom EULA — NOT OSI-open
- **Relevance:** ⭐⭐⭐⭐ — multiplayer C# submarine sim with rich XML content (items, jobs, talents, fabrication recipes, missions). Closest match to RP-flavored multiplayer with deep content data
- **Recommended depth:** medium audit, **patterns only — do not copy code**. We can describe the XML schema patterns and how multiplayer authority is split between server and clients
- **Defer reason:** EULA review needed before deep audit; lower urgency than Mindustry

### Pokémon Emerald decomp (`pret/pokeemerald`)

- **License:** code is the decomp authors' work, but **all assets / IP belong to Pokémon Co**. Disassembly legality is gray; in practice it has been tolerated, never blessed
- **Relevance:** ⭐⭐⭐ — interesting GBA-era data architecture (move data, species data, trainer data — all in narrow C structs). Patterns are transferable; cite sparingly
- **Recommended depth:** patterns-only, never quote field shapes verbatim
- **Defer reason:** legal risk if cited too directly. Skip for now

### Prince of Persia Apple II (`jmechner/Prince-of-Persia-Apple-II`)

- **License:** Mechner released under custom restrictive license (research/education only)
- **Relevance:** ⭐ — historical curiosity, 6502 assembly, no architectural patterns relevant to modern game dev
- **Recommended depth:** none. Would be a charming reference but the legal posture isn't worth the cost

### StarMade (`StarMade`)

- **License:** proprietary; source released for modders, not commercial reuse
- **Relevance:** ⭐⭐ — voxel sandbox, less directly applicable to RP/shooter wedge
- **Recommended depth:** light skim. Voxel terrain serialization is a niche reference

## Tier C — refused

### Far Cry 1 Source Full (`StrongPC123/Far-Cry-1-Source-Full`)

- **License:** **leaked, not legally open** — Crytek/Ubisoft IP
- **Decision:** **REFUSED**. Studying or citing this source puts GamesAI under copyright-infringement risk. Mirroring it on GitHub does not change its legal posture; it remains stolen IP
- **Even patterns-only is risky** because there's no clean way to cite findings without the source itself being the citation. Skip entirely

### p4ss (`p4sstime/p4ss`)

- **License:** unverified
- **Relevance:** unknown, no README excerpt available, very low star count
- **Decision:** skip until user clarifies what this is

## Recommended next-session actions

If we pick this thread back up:

1. **Beyond All Reason audit** (Tier A, deferred). Focus: unit data files, balance review tooling, 200-player coordination patterns. Maps onto Schema Validator's planned "balance smell" pass.
2. **Barotrauma patterns-only audit** (Tier B). Re-read EULA, then study XML content schemas without copying. Maps onto a future `barotrauma-mod` Boilergen plugin (similar shape to the proposed `mindustry-mod` plugin).
3. **Quake C / QuakeC comparative pattern entry** (Tier A, light). One short knowledge-base entry comparing Quake's QC bytecode-scripting approach to modern data-as-code (Mindustry) and codegen (Boilergen).
4. **Skip everything in Tier C indefinitely.** The legal hazard is real and the productivity gain is zero.

## Why I dwelled on legal cleanliness

GamesAI is **OSI-open MIT** and is built on the doctrine that every dependency we use is licence-clean (see `NOTICE.md`). Studying source code under restrictive or leaked licenses can leak into the project as inadvertent code-copying or trained-model bias. The rule for this knowledge-base: **only cite sources whose terms allow study and citation**. Mindustry (GPL-3) does. Far Cry 1 (leaked) doesn't.

This is the same posture the Cfx.re Creator Platform License (Jan 12 2026) requires — see [`engines/qbcore-conventions.md`](../engines/qbcore-conventions.md) for the parallel.
