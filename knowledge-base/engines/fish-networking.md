---
type: engine
slug: fish-networking
title: Fish-Networking — modern OSS Unity netcode with built-in CSP
engine: unity
content_format: code
language: csharp
license: custom-permissive (FirstGearGames; royalty-free, source-available; networking-product carve-out)
source_url: https://github.com/FirstGearGames/FishNet
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [unity, networking, fishnet, csp, lag-compensation, multiplayer]
---

# Fish-Networking — modern OSS Unity netcode with built-in CSP

> Snapshot of Fish-Networking (FishNet) as of 2026-05-03. FishNet is the
> third real OSS option in 2026 alongside Mirror and NGO, and the only
> one of the three with **client-side prediction (CSP)** and
> **server-side lag compensation** in the box. This entry exists so
> Boilergen's Unity plugin family knows where FishNet sits in the
> decision tree, what to borrow for codegen, and what to be honest
> about (smaller community, custom licence, Pro-tier paywall).

## 1. What FishNet is and why it exists

FishNet is a high-level Unity networking library, source-available on GitHub since 2021, authored and maintained by Benjamin Berwick (FirstGearGames). It was built specifically to fix the gaps that made teams outgrow Mirror — bandwidth bloat at scale, no first-class client-side prediction, no server-side lag compensation, and a snapshot/delta encoder that hadn't been rewritten in years. As of v4.7.2R (17 April 2026, ~192 tagged releases on GitHub, ~1.9k stars) it is in active weekly development. The library is server-authoritative by design, has no CCU caps and no royalties, and sustains itself on Patreon/GitHub Sponsors plus a paid **FishNet-Pro** tier that gates a subset of advanced features (lag compensation, level-of-detail, network code-stripping, advanced extrapolation). The core (`FishNet/`) is freely usable for any game under a custom permissive licence — see §9 — but it is **not** OSI-MIT; the licence carves out competing networking products and reserves Pro features to purchasers.

## 2. Where FishNet sits in the 2026 Unity networking decision tree

Four real choices for a Unity team in mid-2026:

| Library | Licence | Maintainer | Strength | Weakness |
|---|---|---|---|---|
| **NGO 2.x** (Netcode for GameObjects) | MIT (Unity) | Unity first-party | Engine-blessed, UGS Relay/Lobby/Matchmaker integration, official samples (Boss Room) | No built-in CSP or rollback; transport story dominated by UTP; smaller ecosystem of community transports |
| **Mirror 96.x** | MIT | Community (vis2k + Mirror team) | Mature, simple HLAPI, huge tutorial corpus, every transport under the sun, claimed 1000+ Steam titles | Heavier on the wire than FishNet at scale; no first-class CSP; weak object pooling story |
| **FishNet 4.x** | Custom permissive (free core + Pro) | Community (FirstGearGames) | Built-in CSP + Replicate/Reconcile, lag compensation (Pro), ~70% higher client FPS and 67–78% lower bandwidth than Mirror in independent benchmarks | Younger codebase, smaller tutorial corpus, fewer asset-store add-ons, advanced features behind Pro paywall, breaking changes between major versions (v2 → v3 → v4) |
| **Photon Fusion 2 / Quantum 3** | Paid SaaS | Exit Games | Tick-based simulation, deterministic ECS (Quantum), Photon Cloud relay; **Quantum free up to 100 CCU since 2025** | Closed source, vendor lock-in, royalties / CCU pricing, opaque internals when you need to debug |

**When you'd pick FishNet over Mirror — concrete trade-offs:**

- You need **CSP and rollback in the box**. Mirror gives you authoritative server + interpolation; if you need true client-side prediction for a competitive shooter, you build it on Mirror or you adopt FishNet. FishNet ships the Replicate/Reconcile pattern as a first-class API.
- **Bandwidth at scale matters.** The independent StinkySteak benchmarks (see §6) put FishNet 4× cheaper than Mirror on the "Move Y" snapshot scenario at default settings. Fine for 8-player co-op either way; meaningful for 64-player BR or 100+ CCU MMO zones.
- **Performance per packet matters.** SyncVar/NetworkProperty processing on FishNet is ~2-3× faster per tick than Mirror at 24 clients per the same benchmarks.
- You want **PredictionRigidbody / NetworkAnimator / NetworkTransform extrapolation** without writing them yourself.
- New project, no UNet legacy, no asset-store dependency on Mirror-only addons.

**When you'd pick Mirror over FishNet:**

- You're **porting from UNet HLAPI** — Mirror keeps the `[SyncVar]` / `[Command]` / `[ClientRpc]` shape verbatim; FishNet's API is structurally different (`[Replicate]` / `[Reconcile]` for prediction, `SyncVar<T>` rather than `[SyncVar]` decorating a field).
- **Tutorial coverage / Stack Overflow corpus** matters more than runtime efficiency. Mirror has years of community content; FishNet's corpus is smaller and skewed toward Discord and YouTube.
- You need a specific Mirror-only transport (Apple GameCenter, an obscure community relay) that FishNet doesn't have an equivalent for.
- You want **MIT** licensing without the FishNet competitor-carveout clause (relevant if you might fork the netcode itself).

**When NGO wins instead:** Unity-first-party support contract, UGS Relay/Lobby out of the box, Boss Room sample as a starting point.

**When Photon wins instead:** You don't want to run servers — Photon Cloud absorbs that. Or you're shipping a deterministic competitive title and Quantum 3's rollback is the right tool.

## 3. Built-in features Mirror lacks

Five features ship with FishNet that Mirror either doesn't have or makes you build yourself:

- **Client-side prediction (CSP).** Replicate/Reconcile API lets the client run inputs immediately against a local simulation, the server replays the same inputs authoritatively, and any divergence is reconciled with smoothing. This is the same conceptual pattern that Source/Quake/Overwatch use — FishNet exposes it as two attributed methods on a `NetworkBehaviour`. Mirror requires you to implement it yourself.
- **Server-side lag compensation (Pro).** Roll back collider state on the server to where the firing client *saw* the target, then re-test the hit. Critical for "I shot them, why no hit?" in hitscan shooters. FishNet bakes this in via `RollbackManager` + `ColliderRollback` components. Mirror has no equivalent — you write it or pick FishNet.
- **PredictionRigidbody.** Wraps Unity's Rigidbody with the velocity / kinematic / pending-force bookkeeping the prediction system needs. You add forces through `PredictionRigidbody.AddForce()` instead of `Rigidbody.AddForce()`, call `Simulate()` at the end of your replicate method, and `Reconcile()` in your reconcile method — the rest is automatic.
- **Automatic interpolation + prediction smoothing.** `NetworkTransform` interpolates remote-owned objects on clients; the prediction system smooths owner-side rendering when the server reconciles a small misprediction so the local player doesn't see a jitter snap. Mirror's `NetworkTransform` interpolates but has no equivalent prediction-smoothing layer.
- **Object pooling baked in.** `NetworkObject.Spawn()` integrates with FishNet's built-in pool registry. Mirror requires manual `NetworkClient.RegisterSpawnHandler` plumbing — the API exists but is easy to leak and isn't taught well in the official docs.

## 4. Architecture concepts

FishNet's mental model is also **NetworkBehaviour-centric**, but with a different surface from Mirror:

- **`NetworkBehaviour`** — base class for any GameObject script that owns synchronized state, RPCs, or prediction methods. Provides `IsServerInitialized`, `IsClientInitialized`, `IsOwner`, `Owner`. Spawned objects need a `NetworkObject` component (FishNet's analogue of Mirror's `NetworkIdentity`).
- **`[SyncVar]`** — server-to-client field replication. Recent FishNet versions also expose a generic `SyncVar<T>` wrapper as the recommended modern form. Hooks via `OnChange` events. Collection variants: `SyncList<T>`, `SyncDictionary<TKey,TValue>`, `SyncHashSet<T>`, `SyncTimer`, `SyncStopwatch`.
- **`[ServerRpc]`** — client-to-server RPC (analogue of Mirror's `[Command]`). Defaults to "owner only"; `RequireOwnership = false` to allow non-owner sends.
- **`[ObserversRpc]`** — server-to-all-observing-clients RPC (analogue of Mirror's `[ClientRpc]`). `[TargetRpc]` for a single connection.
- **`[Replicate]` / `[Reconcile]`** — prediction-system attributes (see §5). No Mirror analogue.
- **`NetworkManager`** — singleton orchestrator: holds `TransportManager`, `ServerManager`, `ClientManager`, `TimeManager`, `SceneManager`, `ObserverManager`. Most teams subclass it.
- **Transports**, pluggable, defaults shipped in-tree:
  - **Tugboat** — reliable UDP, the default desktop/mobile transport, replaces the older "FishyUTP" / LiteNetLib-based defaults.
  - **Bayou** — WebSocket transport for WebGL clients.
  - **Multipass** — runs multiple transports on the same server (e.g. Tugboat for native + Bayou for WebGL clients in the same session).
  - **Yak** (Pro) — offline / single-player transport so the same multiplayer codepath can run without a network.
  - Community: **FishySteamworks** (Steam P2P + dedicated, Steamworks.NET-based), **FishyFacepunch** (Steam P2P, Facepunch.Steamworks-based), **FishyEOS** (Epic Online Services), **FishyUnityTransport** (UTP bridge for parity with NGO transport choices).

The codegen story is also IL post-processing — FishNet runs a custom processor over the compiled assemblies to emit serializers, replicate/reconcile dispatch, dirty-bit logic, and SyncVar deltas. Same architectural family as Mirror's Weaver: no runtime reflection, all generated at build time. This is why FishNet bumps occasionally introduce *recompile-the-world* breaking changes when the codegen contract changes (most painful at v3 → v4).

## 5. Small example: a predicted player with Replicate / Reconcile

Adapted from the official FishNet documentation pattern for a code-driven `PredictionRigidbody` controller. Compiles against FishNet 4.x.

```csharp
using FishNet.Component.Prediction;
using FishNet.Object;
using FishNet.Object.Prediction;
using FishNet.Transporting;
using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class PredictionPlayer : NetworkBehaviour
{
    public PredictionRigidbody PredictionRigidbody = new();

    [SerializeField] private float _moveForce = 15f;
    [SerializeField] private float _jumpForce = 8f;

    private bool _jumpQueued;

    public override void OnStartNetwork()
    {
        PredictionRigidbody.Initialize(GetComponent<Rigidbody>());
        TimeManager.OnTick      += TimeManager_OnTick;
        TimeManager.OnPostTick  += TimeManager_OnPostTick;
    }

    public override void OnStopNetwork()
    {
        TimeManager.OnTick      -= TimeManager_OnTick;
        TimeManager.OnPostTick  -= TimeManager_OnPostTick;
    }

    private void Update()
    {
        if (IsOwner && Input.GetKeyDown(KeyCode.Space))
            _jumpQueued = true;
    }

    // ----- Replicate: runs on owner immediately, on server when it receives input,
    // and on non-owner clients during reconciliation replays.
    [Replicate]
    private void RunInputs(ReplicateData data,
                           ReplicateState state = ReplicateState.Invalid,
                           Channel channel = Channel.Unreliable)
    {
        var forces = new Vector3(data.Horizontal, 0f, data.Vertical) * _moveForce;
        PredictionRigidbody.AddForce(forces);
        if (data.Jump)
            PredictionRigidbody.AddForce(Vector3.up * _jumpForce, ForceMode.Impulse);
        PredictionRigidbody.AddForce(Physics.gravity * 3f);
        PredictionRigidbody.Simulate();
    }

    // ----- Reconcile: server sends authoritative state, client rewinds + replays
    // pending inputs forward from that state.
    [Reconcile]
    private void ReconcileState(ReconcileData data,
                                Channel channel = Channel.Unreliable)
    {
        PredictionRigidbody.Reconcile(data.PredictionRigidbody);
    }

    private void TimeManager_OnTick()
    {
        RunInputs(BuildInputs());
    }

    private void TimeManager_OnPostTick()
    {
        if (!IsServerInitialized) return;
        ReconcileState(new ReconcileData(PredictionRigidbody));
    }

    private ReplicateData BuildInputs()
    {
        if (!IsOwner) return default;
        var data = new ReplicateData(
            jump:       _jumpQueued,
            horizontal: Input.GetAxisRaw("Horizontal"),
            vertical:   Input.GetAxisRaw("Vertical"));
        _jumpQueued = false;
        return data;
    }

    public struct ReplicateData : IReplicateData
    {
        public bool  Jump;
        public float Horizontal;
        public float Vertical;
        public ReplicateData(bool jump, float horizontal, float vertical) : this()
        {
            Jump = jump; Horizontal = horizontal; Vertical = vertical;
        }
        private uint _tick;
        public void Dispose() {}
        public uint GetTick()           => _tick;
        public void SetTick(uint value) => _tick = value;
    }

    public struct ReconcileData : IReconcileData
    {
        public PredictionRigidbody PredictionRigidbody;
        public ReconcileData(PredictionRigidbody pr) : this() { PredictionRigidbody = pr; }
        private uint _tick;
        public void Dispose() {}
        public uint GetTick()           => _tick;
        public void SetTick(uint value) => _tick = value;
    }
}
```

That is the entire surface for a CSP-rigidbody player. The codegen wires up the dispatch, the prediction system handles tick scheduling, replay, and smoothing.

## 6. Independent benchmarks vs Mirror

Source: [`StinkySteak/unity-netcode-benchmark`](https://github.com/StinkySteak/unity-netcode-benchmark) — open-source, reproducible, Unity 2021.3.21f1, Mono BiRP, Windows. The latest published bandwidth run is dated 07/12/2023 (commit `b216908`); CPU-per-tick run is dated 17/03/2024. The repo notes server-CPU benchmarks have since been discontinued because not every netcode is tick-based, but the FishNet vs Mirror numbers below are the most-cited public figures and remain widely circulated as the comparison baseline through 2026.

**Bandwidth — server-out kBps (lower is better)**, scenario = networked transforms:

| Scenario | Mirror 86.4.0 (KCP) | FishNet 3.11.10 (Tugboat) | FishNet improvement |
|---|---|---|---|
| Move Y (one-axis) | 267 kBps | **62 kBps** | **−77%** |
| Move All Axis | 307 kBps | **103 kBps** | **−66%** |
| Move Wander (random) | 459 kBps | **145 kBps** | **−68%** |

Reading: FishNet uses **roughly one-third the bandwidth** of Mirror at default transform-sync settings. The "~67–78% lower bandwidth" figure that appears in this knowledge base and in `unity-mobile-multiplayer.md` traces back to exactly these three rows.

**CPU per server tick — NetworkTransform processing (ms, lower is better)**:

| Clients | Mirror | FishNet | NGO |
|---|---|---|---|
| 0 | 0.060 | **0.034** | 0.13 |
| 6 | 0.067 | **0.034** | 0.18 |
| 12 | 0.071 | **0.035** | 0.30 |
| 24 | 0.079 | **0.036** | ERROR (NGO) |

**CPU per server tick — SyncVar / NetworkProperty (ms, lower is better)**:

| Clients | Mirror | FishNet | NGO |
|---|---|---|---|
| 0 | 0.017 | **0.0115** | 0.030 |
| 24 | 0.030 | **0.0116** | 0.078 |

Reading: FishNet is ~2× faster than Mirror per server tick on transforms and ~2.5× faster on SyncVar processing at 24 clients. The "~70% higher client FPS" claim in the existing repo prose is an extrapolation from the inverse of CPU-per-tick and matches the order of magnitude shown here, but the repo does not publish a direct client-FPS table — cite "lower per-tick CPU" rather than "70% client FPS" when precision matters.

Honest caveats: (a) the benchmark uses defaults (FishNet `Precision 0.01` vs Mirror Unreliable Transform), so the comparison is "out of the box" not "tuned". A heavily tuned Mirror compresses better. (b) The benchmark is two years old at the time of this writing; both libraries have moved. The relative ordering has not flipped per community reports through 2026, but if the gap matters to a release decision, re-run the benchmark on your target hardware.

## 7. Real production deployments

Hard verification is thin — FishNet doesn't maintain a public showcase comparable to Mirror's, and Steam/itch don't expose netcode SDK in store metadata except via [SteamDB's auto-detected `tech/SDK/FishNet/` listing](https://steamdb.info/tech/SDK/FishNet/), which confirms the library is shipping in commercial titles but doesn't expose individual game names through unauthenticated browsing. What can be verified through primary sources:

- **FPS Land** — official FishNet-Pro project from FirstGearGames. Server-authoritative FPS with four weapon types, lag-compensated firing, grenades, item pickups, movement modifiers. V3 shipped, V4 in development as of mid-2026. Documented at the FishNet [Pro, Projects, and Support](https://fish-networking.gitbook.io/docs/overview/readme/pro-projects-and-support) page.
- **Lobby and Worlds** — official FishNet-Pro project. Single-server lobby + multi-instance world solution with sign-in, password-protected rooms, ready-up, kick. Same source as above.
- **FishMMO** — open-source MMO template built on FishNet by `jimdroberts`, [github.com/jimdroberts/FishMMO](https://github.com/jimdroberts/FishMMO). Not a shipped commercial title but a public reference codebase that demonstrates production-shape patterns (zone servers, world database, character persistence).
- **Edgegap netcode-sample-unity-fishnet** — first-party sample from Edgegap (managed dedicated-server provider, used by Mirror titles too) demonstrating headless FishNet servers on their orchestration platform: [github.com/edgegap/netcode-sample-unity-fishnet](https://github.com/edgegap/netcode-sample-unity-fishnet). Confirms FishNet is a supported netcode on a major commercial server-orchestration platform.

For commercial Steam titles, [SteamDB's FishNet SDK page](https://steamdb.info/tech/SDK/FishNet/) is the most reliable index but the list isn't reproducible from a public CLI. Treat "FishNet has commercial Steam adoption" as confirmed by the SteamDB tracker; treat specific title attributions you'll see on Reddit/Discord (Murky Divers, World Eternal Online, etc.) as **unverified by primary source** unless the developer has publicly credited FishNet — at the time of this writing the public credits we could verify are FPS Land, Lobby and Worlds, and the FishMMO/Edgegap reference projects above.

## 8. Patterns worth borrowing for Boilergen

Three patterns translate directly to GamesAI's codegen mission:

**(a) Replicate/Reconcile API shape is the modern convergence point.**
Look at Photon Quantum's `Frame.Predicted` / `Frame.Verified` split, Netick's `[Networked]` + `[OnInput]` + rollback ticks, FishNet's `[Replicate]` / `[Reconcile]`, and Unreal's `GetLifetimeReplicatedProps` + `ServerMove` / `ClientCorrection` — they're all expressing the same concept (input struct → predicted simulation → server reconciliation → client smoothing). When Boilergen eventually emits networking scaffolding, the **Replicate/Reconcile pair** is the right abstraction to template against. Generate two methods, two structs (`IReplicateData`, `IReconcileData` analogues), and one `PredictionRigidbody`-equivalent wrapper — that template maps cleanly onto FishNet, onto a hand-rolled Mirror prediction layer, and even onto an Unreal `CharacterMovementComponent` extension.

**(b) IL post-processor as the codegen *downstream*, not a competitor.**
Same lesson as the Mirror entry: FishNet's codegen runs on the compiled assembly, after Roslyn. Boilergen emits source. The two layers compose perfectly — Boilergen produces `NetworkBehaviour` subclasses with `[Replicate]` / `[Reconcile]` annotations, the FishNet processor takes those and emits the dispatch glue. Never try to replicate or fight the IL processor.

**(c) Multi-transport indirection as a config concept.**
FishNet's `Multipass` (run Tugboat *and* Bayou simultaneously so native + WebGL clients share one server) is the cleanest expression of "transport is config, not architecture". Any Boilergen plugin that generates server-launcher YAML should treat the transport list as an array, not a string — because real shipped games run two or three at once.

## 9. Pitfalls — be honest

- **Smaller community than Mirror.** Mirror's GitHub Discussions, Stack Overflow tag, and YouTube tutorial corpus all dwarf FishNet's. FishNet's strongest community surface is its [Discord](https://discord.gg/Ta9HgDh4Hj), which is responsive but doesn't index well in search engines.
- **Tutorial corpus skews recent and YouTube-heavy.** When FishNet broke API between v2 → v3 → v4, a lot of older tutorials silently went stale. Always check the publish date of any FishNet tutorial against the current major version.
- **Asset-store ecosystem is shallower.** Inventory systems, character controllers, and dialogue plugins overwhelmingly default to Mirror or NGO compatibility. FishNet integrations exist for the major Heathen / Opsive / Mirror-Networking-shared assets but the long tail is thinner.
- **Pro paywall on advanced features.** Lag compensation, level-of-detail, code-stripping, NetworkTransform extrapolation, Yak (offline transport) are FishNet-Pro only. Pro is bought via Patreon / GitHub Sponsors / direct from FirstGearGames, with a 20-member team-distribution cap per the [licence text](https://github.com/FirstGearGames/FishNet/blob/main/LICENSE.md). Workable for indies; awkward for larger studios that prefer everything-in-the-box OSS like Mirror.
- **Licence is custom-permissive, not OSI-MIT.** The free core is royalty-free for game development, but §2.b of the FishNet licence says "Other products of like Software (explicitly networking solutions) may not use, reverse engineer, or implement Software in part or full" — meaning you cannot fork FishNet to build a competing netcode, and the licence is incompatible with strict OSI definitions. For game dev this never matters; for tooling that wants to integrate FishNet *as a library*, read the licence.
- **Breaking changes between major versions.** v2 → v3 was a near-rewrite of the prediction system; v3 → v4 broke transport APIs and several SyncVar shapes. Plan for a meaningful upgrade pass at each major bump. Mirror has been more stable on this axis for the last three years.
- **Unity 6.x compatibility:** v4.7.x lists Unity 2021 / 2022 / 6 LTS as supported. Treat Unity 6.3 LTS + FishNet 4.7.x as production-ready but smoke-test IL2CPP iOS / Android / WebGL builds on each Unity bump (same caveat as Mirror — IL post-processors lag Unity major-version IL changes).

## 10. How this connects to Boilergen

GamesAI's `unity-mobile-shooter` plugin (shipped 2026-05-02, see [`knowledge-base/engines/unity-mobile-multiplayer.md`](unity-mobile-multiplayer.md)) deliberately emits **only data-assets and i18n stubs** — never networking-layer code — because Mirror, NGO, FishNet, and Quantum each have a fundamentally different runtime API. That decision still stands. The relationship to FishNet specifically:

- **`unity-mobile-multiplayer.md` already ranks FishNet ahead of Mirror for new-project mobile builds** (Quantum > FishNet > Fusion 2 > NGO > Mirror). This entry is the deep dive that ranking points to.
- **Should `unity-mobile-shooter` add a FishNet target alongside Mirror?** *Eventually yes, but not yet.* The current Boilergen priority order (per `MEMORY.md`) is RP for studios first → mobile-MP-Russian-market wedge second → multi-engine knowledge base third. A FishNet target on `unity-mobile-shooter` is the right next-or-second-next networking-codegen module after we ship the equivalent Mirror target — not the first networking module. FishNet's Replicate/Reconcile shape is also the right *primary* template if we only ever emit one networking target, because the same template cross-compiles cleanly to Mirror with manual prediction wiring, but the inverse isn't true.
- **Add a future `fishnet-host` plugin (Horizon 3, optional).** Targets: a `NetworkManager` subclass + `PredictionRigidbody` player template + Tugboat + Bayou Multipass config + Edgegap deploy YAML. Serves the indie-studio audience that wants modern netcode without paying Photon's CCU bills.
- **What to borrow from FishNet's design:** the Replicate/Reconcile struct-pair pattern (`IReplicateData` + `IReconcileData`) is the right shape for any future input-spec YAML. The Multipass pattern (multiple transports as an array) is the right shape for transport config in any generated server-launcher file.
- **Naming caution:** "FishNet" and "Fish-Networking" refer to the same project; the GitHub repo is `FirstGearGames/FishNet`. Always cite the major version (v4.x) — the API gap between v3 and v4 is wide enough that a wrong-version snippet won't compile.

## 11. References

- **Source:** [github.com/FirstGearGames/FishNet](https://github.com/FirstGearGames/FishNet) — ~1.9k stars, ~192 tagged releases, latest v4.7.2R (17 April 2026), licence at [LICENSE.md](https://github.com/FirstGearGames/FishNet/blob/main/LICENSE.md).
- **Official docs (GitBook):** [fish-networking.gitbook.io/docs](https://fish-networking.gitbook.io/docs) — manual, attribute reference, prediction guides, transport docs.
- **Pro / Projects / Support:** [fish-networking.gitbook.io/docs/overview/readme/pro-projects-and-support](https://fish-networking.gitbook.io/docs/overview/readme/pro-projects-and-support) — FishNet-Pro feature list, FPS Land + Lobby and Worlds project pages.
- **Prediction creating-code guide:** [fish-networking.gitbook.io/docs/guides/features/prediction/creating-code/controlling-an-object](https://fish-networking.gitbook.io/docs/guides/features/prediction/creating-code/controlling-an-object).
- **PredictionRigidbody reference:** [fish-networking.gitbook.io/docs/guides/features/prediction/predictionrigidbody](https://fish-networking.gitbook.io/docs/guides/features/prediction/predictionrigidbody).
- **Discord community:** [discord.gg/Ta9HgDh4Hj](https://discord.gg/Ta9HgDh4Hj) — primary support surface.
- **Independent benchmarks:** [github.com/StinkySteak/unity-netcode-benchmark](https://github.com/StinkySteak/unity-netcode-benchmark) — bandwidth result file [`benchmark-result/bandwidth/07-12-2023.md`](https://github.com/StinkySteak/unity-netcode-benchmark/blob/master/benchmark-result/bandwidth/07-12-2023.md), CPU result file [`benchmark-result/server-cpu/17-03-2024.md`](https://github.com/StinkySteak/unity-netcode-benchmark/blob/master/benchmark-result/server-cpu/17-03-2024.md).
- **Edgegap reference sample:** [github.com/edgegap/netcode-sample-unity-fishnet](https://github.com/edgegap/netcode-sample-unity-fishnet) — official FishNet headless-server sample on a commercial orchestration platform.
- **FishMMO open-source template:** [github.com/jimdroberts/FishMMO](https://github.com/jimdroberts/FishMMO) — community MMO reference codebase.
- **SteamDB SDK tracker:** [steamdb.info/tech/SDK/FishNet/](https://steamdb.info/tech/SDK/FishNet/) — auto-detected list of Steam games shipping with FishNet.
- **Asset Store listings:** [FishNet free](https://assetstore.unity.com/packages/tools/network/fishnet-networking-evolved-207815), [FishNet Pro](https://assetstore.unity.com/packages/tools/network/fishnet-pro-networking-evolved-287711).
- **Cross-reference inside this repo:** [`knowledge-base/engines/mirror-networking.md`](mirror-networking.md) (the comparison anchor); [`knowledge-base/engines/unity-mobile-multiplayer.md`](unity-mobile-multiplayer.md) (verdict ranking, mobile context); [`knowledge-base/engines/unity-version-matrix.md`](unity-version-matrix.md) (per-Unity-version networking notes).
