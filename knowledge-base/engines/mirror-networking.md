---
type: engine
slug: mirror-networking
title: Mirror Networking — community successor to UNet for Unity
engine: unity
content_format: code
language: csharp
license: MIT
source_url: https://github.com/MirrorNetworking/Mirror
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [unity, networking, mirror, mlapi, ngo, multiplayer]
---

# Mirror Networking — community successor to UNet for Unity

> Snapshot of Mirror Networking as of 2026-05-03. Mirror is the longest-lived
> open-source Unity networking library still in active production use.
> This entry exists so Boilergen's Unity plugin family knows where Mirror
> sits in the 2026 Unity networking decision tree, what to borrow, and
> what to ignore. Honest about pitfalls.

## 1. What Mirror is + history

Mirror is a high-level Unity networking library (MIT-licensed, open source) that began in 2018 as a community fork of Unity's deprecated **UNet HLAPI**. Unity's own timeline — confirmed by the [UNet Deprecation FAQ](https://support.unity.com/hc/en-us/articles/360001252086-UNet-Deprecation-FAQ) — went UNet (deprecated August 2018, HLAPI removed after 2018.4 LTS, LLAPI removed in Unity 2022.2, hosting service shut down 7 July 2025) → Unity adopting the third-party **MLAPI** project in December 2020 → MLAPI being renamed **Netcode for GameObjects (NGO)** as Unity's first-party offering. Mirror sat outside that lineage entirely: a parallel community project that kept the familiar `[SyncVar]` / `[Command]` / `[ClientRpc]` HLAPI shape alive and rebuilt the internals (transports, weaver, scene management) without breaking userland code. As of v96.10.0 (2 April 2026, ~1,975 tagged releases on GitHub) it is still under weekly development, with the maintainers claiming use in 1000+ Steam titles.

## 2. Where Mirror sits in the Unity networking decision tree (2026)

Four real choices for a Unity team in mid-2026:

| Library | License | Maintainer | Strength | Weakness |
|---|---|---|---|---|
| **NGO 2.x** (Netcode for GameObjects) | MIT (Unity) | Unity first-party | Engine-blessed, Unity Multiplayer Services integration, Relay/Lobby/Matchmaker | No built-in client-side prediction or rollback; smaller ecosystem of community transports |
| **Mirror 96.x** | MIT | Community (vis2k + Mirror team) | Mature, simple HLAPI surface, huge tutorial corpus, every transport under the sun | Heavier on the wire than FishNet at scale; no first-class CSP; lags Unity 6.x adoption by a release |
| **Fish-Networking (FishNet)** | MIT | Community (FirstGearGames) | Built-in CSP + lag compensation, ~70% higher client FPS and 67–78% lower bandwidth than Mirror in independent benchmarks ([StinkySteak](https://github.com/StinkySteak/unity-netcode-benchmark)) | Younger codebase, smaller tutorial corpus, fewer asset-store add-ons |
| **Photon Fusion 2 / Quantum 3** | Paid SaaS | Exit Games | Tick-based simulation, deterministic ECS (Quantum), Photon Cloud relay out-of-the-box; **Quantum free up to 100 CCU since 2025** | Closed source, vendor lock-in, royalties / CCU pricing, opaque internals when you need to debug |

**When you'd pick Mirror over NGO — concrete trade-offs:**

- You want a **fully self-hosted** stack (your own dedicated Linux box, Docker, Edgegap container) without any Unity Cloud account or UGS dependency. NGO works standalone too, but the docs and samples assume UGS Relay/Lobby; Mirror doesn't push you toward any cloud.
- You need **transport choice**. Mirror ships KCP, Telepathy (TCP), WebSockets and supports a long tail of community transports — FizzySteamworks, Epic Online Services, ENET, LiteNetLib, Apple GameCenter — with a clean transport-abstraction interface. NGO's transport story is dominated by Unity Transport Package (UTP); swapping is harder.
- You're **porting from UNet HLAPI**. Mirror is the path of least pain — `[SyncVar]`, `[Command]`, `[ClientRpc]` are still spelled the same way.
- Your team values **simpler internals you can read**. Mirror's source is ~50k lines of straightforward C#; NGO's network variable / messaging system has more layers.
- You're targeting **Unity 2020 / 2021 LTS** because of platform constraints (older Android NDK, console SDK floor). Mirror still supports those. NGO 2.x has dropped older Unity versions.

**When NGO wins instead:**

- You want Unity to own the bug. First-party support, official roadmap, integrations into Unity Multiplayer Services (Relay, Lobby, Matchmaker, Multiplay→Edgegap migration paths).
- You need the official Unity sample stack (Boss Room, etc.) as a starting point.
- Your studio already pays for Unity Pro and wants the support contract to cover networking.

**When FishNet wins instead:**

- New project, no UNet legacy, performance/bandwidth matters. FishNet's benchmarks against Mirror are damning at >100 CCU.
- You want CSP + lag compensation in the box without writing it yourself.

**When Photon wins instead:**

- You don't want to run servers. Period. Photon Cloud absorbs that.
- You're shipping a deterministic mobile shooter — Quantum 3's rollback is the right tool, not Mirror's snapshot model.

## 3. Architecture concepts that actually matter

Mirror's mental model is **NetworkBehaviour-centric**: any GameObject you want to network gets a `NetworkIdentity` component plus one or more `NetworkBehaviour` subclasses. The server is authoritative; clients receive state.

- **`NetworkBehaviour`** — base class. Replaces `MonoBehaviour` for any class that owns synchronized state or RPC methods. Provides `isServer`, `isClient`, `isLocalPlayer`, `connectionToClient`.
- **`[SyncVar]`** — server-to-client field replication. Up to 64 per `NetworkBehaviour` (a hard cap baked into the dirty-bitmask). Optional `hook` for change callbacks. `SyncList<T>`, `SyncDictionary<T>`, `SyncSet<T>` for collections.
- **`[Command]`** — client-to-server RPC. By default only the local player can send commands on their own player object; pass `requiresAuthority = false` to allow non-owner commands (rare and security-sensitive).
- **`[ClientRpc]`** — server-to-all-clients RPC. `[TargetRpc]` for a specific connection, `[ClientCallback]` / `[ServerCallback]` to silently no-op on the wrong side.
- **`NetworkManager`** — singleton orchestrator: holds the active transport, Player Prefab, scene list, network address, max connections. Most teams subclass it.
- **Transports** — pluggable. Defaults shipped in-tree:
  - **KCP** (reliable UDP, default; good cross-platform pick)
  - **Telepathy** (TCP, simple, easy to debug, latency-sensitive)
  - **Threaded variants** (Telepathy is multi-threaded; KCP has worker variants)
  - **WebSockets** (for WebGL clients)
  - Community: **FizzySteamworks**, **Epic Online Services**, **LiteNetLib**, **ENET**, Apple GameCenter, self-hosted relay.

The **Weaver** is the load-bearing piece for codegen people: an IL post-processor that runs after Roslyn compiles your scripts, walks the assembly looking for `[SyncVar]` / `[Command]` / `[ClientRpc]`, and emits the serialization, dirty-bit logic, and dispatch glue at compile time. No reflection at runtime, no source generators (the project predates them) — just IL rewriting. This is the same architectural choice Roslyn source generators would make today, and the reason Mirror's per-frame networking overhead stays low.

Smallest meaningful example:

```csharp
using Mirror;
using UnityEngine;

public class Health : NetworkBehaviour
{
    [SyncVar(hook = nameof(OnHealthChanged))]
    public int hp = 100;

    [Command]
    public void CmdTakeDamage(int amount)
    {
        // runs on server, automatic authority check
        hp = Mathf.Max(0, hp - amount);
        if (hp == 0) RpcOnDeath();
    }

    [ClientRpc]
    void RpcOnDeath()
    {
        // runs on every client
        GetComponent<Animator>().SetTrigger("Die");
    }

    void OnHealthChanged(int oldHp, int newHp)
    {
        // runs on clients when the SyncVar changes
        UIHealthBar.Refresh(newHp);
    }
}
```

That's the entire surface a designer needs to internalize. The Weaver generates the wire format.

## 4. Real production deployments

Confirmed, with primary sources:

- **Population: ONE** (BigBoxVR, then Meta) — VR battle royale, ~10M+ Quest installs after Meta's June 2021 acquisition. BigBoxVR adopted Mirror in February 2019 and hired one of the Mirror engineers; called out by name on the [Mirror GitHub README](https://github.com/MirrorNetworking/Mirror).
- **Naïca Online** — French-team 2D pixel-art MMORPG, public beta November 2020, still live. Documented as an early Mirror adopter on the [Mirror "Unity for MMORPGs" community guide](https://mirror-networking.gitbook.io/docs/community-guides/unity-for-mmorpgs).
- **Zooba** (Wildlife Studios) — top-down battle royale, 100M+ mobile downloads. Listed on the Mirror landing page; Wildlife is a known Unity shop.
- **Liar's Bar** — 4-player social-deduction card/dice multiplayer, ~20k+ overwhelmingly positive Steam reviews, sleeper hit of late 2024. Built on Unity + Mirror per Mirror's own production roster.

Not listed because it could not be verified to a primary source: most of the "1000+ Steam games" figure on the Mirror homepage. That number is plausible (Mirror has been the de facto OSS pick for years) but there is no public registry — treat the four titles above as the verified set.

## 5. Patterns worth borrowing for the Boilergen Unity plugin

Three patterns are directly relevant to GamesAI's codegen mission:

**(a) The Weaver / compile-time codegen pattern.**
Mirror generates per-type readers, writers, dirty-bit handlers, and command/RPC dispatch tables at build time, not at runtime. This is exactly the design philosophy Boilergen already uses: emit boring, debuggable, fully-typed C# at generate-time so the runtime stays predictable. If we ever ship a `mirror-host` plugin, the Mirror Weaver becomes the *downstream* compiler — Boilergen emits `NetworkBehaviour` subclasses and lets the Weaver do the rest. We should never try to replace or duplicate Weaver.

**(b) Transport abstraction.**
Mirror's `Transport` base class is a 200-line interface: `ServerStart()`, `ServerSend()`, `ClientConnect()`, `ClientSend()`, plus events. That's the right shape for any plugin that wants to remain steam/relay/dedicated-server agnostic. NGO's UTP-first design is more rigid. If Boilergen ever generates server-launcher scaffolding, Mirror's transport interface is the cleaner reference.

**(c) Scene-based room model vs. lobby-system.**
Mirror has two patterns out of the box:
- **NetworkManager + single scene** — host owns the world, clients join the scene. Simplest. What Population: ONE built on.
- **NetworkRoomManager** — explicit lobby/room scene, then transition to gameplay scene with player slot reservation. More appropriate for round-based shooters.

Both are documented at [mirror-networking.gitbook.io](https://mirror-networking.gitbook.io/). For RP-style persistent worlds (Grand Mobile's wedge), the single-scene additive-loading model is the right reference. For round-based mobile, NetworkRoomManager. Boilergen's `unity-mobile-shooter` plugin should generate **NetworkRoomManager-shaped** scaffolding if/when we add a Mirror target.

## 6. Pitfalls — be honest

- **Object pooling story is weak.** Mirror's `NetworkServer.Spawn` / `Destroy` defaults to instantiation/destruction. There is a custom-spawn-handler API (`NetworkClient.RegisterSpawnHandler`) you can plug a pool into, but it's manual, easy to leak, and not taught well. NGO's `NetworkObjectPool` sample is more polished; FishNet has pooling baked in. If you ship an MMO-style world on Mirror, you write the pool.
- **Scene management on host migration is fragile.** Mirror's scene-change flow assumes the server stays the server. If the host drops in a host-client topology, there is no built-in seamless host migration — the session ends. Photon and some FishNet patterns handle this; Mirror does not. Plan around it (dedicated-server topology, or accept session-end on host loss).
- **Unity 6.x compatibility status (mid-2026):** Mirror officially lists Unity 2019 / 2020 / 2021 / 2022 / 6 as supported on the GitHub README. The official docs still recommend 2020 or 2021 LTS as the safe choice. Unity 6.0 / 6.3 LTS works in practice, but the Weaver has historically lagged Unity major-version IL changes by 1-2 releases — treat Unity 6.3 LTS + Mirror v96.x as **production-ready but verify with your specific platform builds** (IL2CPP iOS, IL2CPP Android, WebGL all need a smoke test on each Unity bump).
- **No first-class client-side prediction.** Mirror gives you authoritative server + interpolation; if you need rollback or true CSP for a competitive shooter, you build it yourself or pick FishNet/Quantum.
- **Bandwidth at scale.** Mirror's snapshot/delta encoder is older than FishNet's. Independent benchmarks (linked above) show 2-4× bandwidth at 100+ CCU. Fine for 8-player co-op, expensive for 64-player BR.
- **64 SyncVar cap per NetworkBehaviour** is real — it's a `ulong` dirty-bitmask. If you have a god-class `Player.cs` with 70 synced fields, split it.

## 7. How this connects to Boilergen

GamesAI's `unity-mobile-shooter` plugin (shipped 2026-05-02) deliberately emits **only data assets and i18n stubs** — not networking code — because each library (Mirror / NGO / FishNet / Quantum) has a different runtime API, and forcing one would alienate the others. Mirror's role in Boilergen's roadmap:

- **Add a `mirror-host` plugin (Horizon 3, optional).** Targets: a `NetworkRoomManager` subclass + per-weapon `NetworkBehaviour` stubs + room/lobby scene scaffolding. This is high value for the QBCore-style RP studio audience that prefers self-hosted dedicated servers — Mirror is a natural fit for that audience because it doesn't drag in Unity Cloud. Lower priority than nailing FiveM/QBCore for the actual current wedge.
- **What to borrow from Mirror's design:** the Weaver pattern (compile-time IL post-processing) is conceptually the same thing Boilergen does in source. The transport-abstraction interface is a reference for any future server-launcher codegen.
- **What NOT to borrow from NGO:** NGO's tight coupling to Unity Multiplayer Services. Boilergen's plugins must remain cloud-agnostic — Edgegap, Hathora, raw Linux box, Steam P2P — all valid deploy targets. NGO patterns push the user toward UGS Relay / Lobby / Matchmaker; we don't want plugin templates that assume a specific cloud.
- **Naming caution:** Mirror, MLAPI, NGO, and UNet are easily conflated. Plugin docs should cite the exact package version (`com.unity.netcode.gameobjects@2.x` for NGO; Mirror v96.x by tagged release).

## 8. References

- **Source:** [github.com/MirrorNetworking/Mirror](https://github.com/MirrorNetworking/Mirror) — MIT, ~6.2k stars, 1975+ tagged releases, latest v96.10.0 (2 April 2026).
- **Official docs:** [mirror-networking.gitbook.io/docs](https://mirror-networking.gitbook.io/docs) — manual, attribute reference, transport docs, MMORPG community guide.
- **SyncVar reference:** [mirror-networking.gitbook.io/docs/manual/guides/synchronization/syncvars](https://mirror-networking.gitbook.io/docs/manual/guides/synchronization/syncvars).
- **Attributes reference:** [mirror-networking.gitbook.io/docs/manual/guides/attributes](https://mirror-networking.gitbook.io/docs/manual/guides/attributes).
- **Cheating / security guide (cited in `unity-mobile-multiplayer.md`):** [mirror-networking.gitbook.io/docs/security/cheating](https://mirror-networking.gitbook.io/docs/security/cheating).
- **NGO vs Mirror — Unity's official comparison:** [docs.unity.com/en-us/relay/ngo-vs-mirror-for-relay](https://docs.unity.com/en-us/relay/ngo-vs-mirror-for-relay).
- **Independent benchmarks:** [github.com/StinkySteak/unity-netcode-benchmark](https://github.com/StinkySteak/unity-netcode-benchmark) — Mirror vs FishNet vs NGO vs Fusion vs Netick.
- **UNet deprecation timeline:** [Unity Support — UNet Deprecation FAQ](https://support.unity.com/hc/en-us/articles/360001252086-UNet-Deprecation-FAQ); [UNet service shutdown discussion](https://discussions.unity.com/t/unity-unet-service-final-shutdown-faq/1611981) (final shutdown 7 July 2025).
- **MLAPI → NGO transition:** [GameFromScratch — Unity Make MLAPI Official](https://gamefromscratch.com/unity-make-mlapi-official-networking-library-for-gameobjects/); [docs-multiplayer.unity3d.com upgrade-from-mlapi guide](https://docs-multiplayer.unity3d.com/netcode/1.6.0/installation/upgrade_from_mlapi/).
- **Cross-reference inside this repo:** `knowledge-base/engines/unity-mobile-multiplayer.md` (verdict ranking, mobile context); `knowledge-base/engines/unity-version-matrix.md` (per-Unity-version networking notes).
