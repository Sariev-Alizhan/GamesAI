---
type: engine
slug: unity-mobile-multiplayer
title: Unity 6 mobile multiplayer — networking stack landscape (2025-2026)
engine: unity
content_format: scriptableobject
language: csharp
license: varies-per-component
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: critical
tags: [unity, multiplayer, mobile, networking, photon, fishnet, ngo, edgegap, anti-cheat]
---

# Unity 6 mobile multiplayer — networking stack landscape

> Snapshot of what shipping mobile multiplayer Unity games actually use in
> 2025-2026 — networking library, server orchestration, anti-cheat. Updated
> 2026-05-02 from a focused research pass; verify before quoting in
> production decisions.

## Networking library — the four real choices

### Photon Quantum 3 — Photon's pick for *mobile* shooters

- Deterministic ECS with predict/rollback. Survives 4G jitter better than
  client-server prediction because all clients re-simulate identically.
- Photon explicitly recommends Quantum (not Fusion) for **casual / mobile FPS
  games** — citation: their own [Quantum overview page](https://www.photonengine.com/quantum).
- **Unity Verified Solution** as of 2025; **free up to 100 CCU** ([gamefromscratch coverage](https://gamefromscratch.com/photon-quantum-now-free-for-developers/)).

### Photon Fusion 2 — Photon's pick for PC/console competitive

- Built-in client-side prediction, lag compensation, tick-based simulation.
- Sample: Photon's official [Simple FPS](https://doc.photonengine.com/fusion/current/game-samples/simple-fps/overview) deploys to Hathora/Edgegap.
- Better fit for desktop competitive shooters than mobile — that's Quantum's lane.

### FishNet — open-source indie favourite

- Independent benchmarks: [StinkySteak/unity-netcode-benchmark](https://github.com/StinkySteak/unity-netcode-benchmark) — FishNet ~70% higher client FPS, **67–78% less bandwidth than Mirror**, scales to 200 clients while Mirror v66 collapses.
- Ships client-side prediction + lag compensation; MIT-style license.
- Strongest indie pick for mobile FPS that wants OSS without Photon's pricing.

### Netcode for GameObjects (NGO) — Unity's first-party

- Community guidance: ideal for **2–10 player co-op**. Acceptable for 5v5 mobile shooter, but no built-in prediction/rollback — bring your own.
- Has [lag compensation patterns documented](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.4/manual/learn/dealing-with-latency.html).
- Unity-supported, integrates with Unity Multiplayer Services.
- This is what the local Flump shooter uses (NGO 2.9.1, observed 2026-05-02).

### Mirror — the legacy spiritual successor to UNet

- Simple API, lots of tutorials. Heavier on the wire and slower than FishNet at scale per the benchmarks above.
- Still actively maintained but on a downward adoption curve relative to FishNet for new projects.

**Verdict for indie mobile 5v5 shooter:**
Quantum > FishNet > Fusion 2 > NGO > Mirror

## Server orchestration — Multiplay is dead

- **Unity Multiplay was deprecated April 1, 2026** ([gameye.com](https://gameye.com/unity-multiplay-migration/), [edgegap migration guide](https://edgegap.com/blog/easily-migrate-from-unity-s-multiplay-to-edgegap-s-game-server-hosting)).
- **Edgegap** is the de facto replacement: 615+ edge locations, sub-3-second cold-start, Unity Editor plugin that containerizes and deploys, claimed 30–50% cost reduction vs Multiplay.
- **PlayFab Multiplayer Servers** (Microsoft) — alternative; more enterprise-aligned.
- **Hathora** — strong with Photon Fusion 2 ([turnkey integration](https://blog.hathora.dev/optimizing-game-server-efficiency-with-photon-fusion-2-and-hathora/)).

For studios shipping mobile multiplayer in 2026: Edgegap is the safe default unless already on PlayFab.

## Authoritative-server is non-negotiable on mobile

APKs are trivially repacked. Any economy-relevant state — currency, inventory, kill counts — **must** be server-validated, not client-asserted. Source consensus across [getgud.io](https://www.getgud.io/blog/unity-anti-cheat-integration-best-practices-and-pitfalls-revealed/), [bomberbot.com](https://www.bomberbot.com/proxy/a-comprehensive-guide-to-preventing-cheating-in-unity-games/), and the [Mirror cheating docs](https://mirror-networking.gitbook.io/docs/security/cheating).

The hard truth from Mirror's docs: "in FPS, trusting the client with aiming is inevitable — anything else must be server-validated." You cannot prevent aimbots; you can prevent inventory dupes.

## Anti-cheat for mobile

Off-the-shelf Asset Store choices that ship with real titles:

- **Code Stage Anti-Cheat Toolkit** ([codestage.net](https://codestage.net/uas/actk/)) — memory/time tamper detection.
- **ByteProtector** ([assetstore link](https://assetstore.unity.com/packages/tools/utilities/byteprotector-mobile-anti-cheat-286004)) — APK/IPA repack detection.

Both are paid tools, not OSS. There is no production-grade OSS Unity mobile anti-cheat as of 2026 — gap in the market, but not in scope for GamesAI.

## Performance budgets — what shipping titles target

Backed by [Generalist Programmer's mobile guide](https://generalistprogrammer.com/tutorials/unity-mobile-game-optimization-complete-guide), [Angry Shark Studio](https://www.angry-shark-studio.com/blog/unity-mobile-performance-memory-management/), [TECHsWILL 2025 guide](https://www.techswill.com/2025/05/26/the-ultimate-unity-optimization-guide-for-mobile-games-2025-edition/), and [appwill low-end Android guide](https://appwill.co/optimizing-unity-games-for-low-end-devices-in-2025/):

| Constraint | Low-end Android | High-end Android / iOS |
|---|---|---|
| RAM ceiling | < 1 GB | < 2 GB |
| Draw calls / frame | < 200 | < 500 |
| Texture sizes | 256–512 px max, ASTC/ETC2 | up to 1024 px |
| Network snapshot rate | 10–20 Hz, delta-compressed | 20–30 Hz |
| Frame target | 30 FPS sustained | 60 FPS |
| Battery | physics tick capped at 30 Hz, shadows off, post off | full quality |

> **Top retention killer:** 60% of users uninstall apps that drop below 30 FPS ([Generalist Programmer](https://generalistprogrammer.com/tutorials/unity-mobile-game-optimization-complete-guide)).

## Reference shipping titles (Unity)

- **Standoff 2** (Axlebolt) — ~200M downloads, the genre leader in mobile shooters. Confirmed Unity ([Standoff 2 on Unity Play](https://play.unity.com/en/games/cbadef6a-c047-4109-bfba-0dfd0134c76d/standoff-2)).
- **Critical Ops** (Critical Force) — Unity.
- **Modern Combat 5** (Gameloft) — Unity.
- **Battle Prime, MaskGun** — Unity.

Open-source reference projects worth studying:

- [Unity-Technologies/FPSSample](https://github.com/Unity-Technologies/FPSSample) — Unity's official multiplayer FPS sample, older but comprehensive.
- [Photon Fusion Simple FPS](https://doc.photonengine.com/fusion/current/game-samples/simple-fps/overview) — current, deploys to Hathora/Edgegap.
- [Elympics/template-fps](https://github.com/Elympics/template-fps) — open-source FPS template.
- [Brackeys/MultiplayerFPS-Tutorial](https://github.com/Brackeys/MultiplayerFPS-Tutorial) — pedagogical.

## How this connects to Boilergen

Boilergen ships [`unity-mobile-shooter`](../../boilergen/plugins/unity-mobile-shooter/) (added 2026-05-02) — generates `WeaponData`/`GameModeData` ScriptableObjects + i18n stubs from one YAML. The plugin currently emits **data-assets** and **i18n** targets only; it does not generate networking-layer code because every networking choice (Quantum/FishNet/NGO) has a fundamentally different runtime API and would force an opinionated framework choice on the user.

Future work (ROADMAP horizon 3+):
- Generate `NetworkBehaviour` stubs for NGO from the same YAML if the user opts in.
- A separate `unity-mobile-shooter-network-quantum` sibling plugin for Quantum Photon.
- Build-pipeline scripts (IL2CPP toggle, ASTC variants, multi-arch) — codegen-able boilerplate that exists once per project.

## Anti-patterns to avoid

- **Trusting the client with hit detection on mobile.** Every cheat tutorial on YouTube starts here. Use server-side hit reconciliation with reasonable lag compensation (200–500 ms window).
- **Synchronising at 60 Hz.** Mobile networks (4G, public Wi-Fi) cannot sustain it; battery dies; bandwidth quotas eat the player's data plan. Production builds delta-compress and snapshot at 20–30 Hz.
- **Storing currency client-side.** Always server-of-record. Anti-Cheat Toolkit can detect tampering after the fact, but not preventing it on a rooted device.
- **Locked-in to a deprecated server platform.** Multiplay's April 2026 shutdown caught many studios mid-flight. Pick a vendor with healthy migration paths (Edgegap, Hathora) over walled-garden offerings.

## References

All claims above link to a primary source. The 2026-05-02 research pass that produced this entry also informed `tools/schema-validator/src/fivem/parser.ts` (FiveM lint) and `boilergen/plugins/unity-mobile-shooter/` (codegen).
