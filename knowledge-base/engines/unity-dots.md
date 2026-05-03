---
type: engine
slug: unity-dots
title: Unity DOTS 1.x — Entities, Burst, Jobs (when to opt in)
engine: unity
content_format: code
language: csharp
license: Unity Companion License (UPM packages) / docs
source_url: https://docs.unity3d.com/Packages/com.unity.entities@latest
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: medium
tags: [unity, dots, ecs, burst, jobs, performance]
---

# Unity DOTS 1.x — Entities, Burst, Jobs (when to opt in)

> Verified 2026-05-03 against the `com.unity.entities@1.3` package docs
> (latest manual at fetch time pointed at 1.3.15, supported on Unity
> 2022.3 LTS and Unity 6 / 2023.3+). DOTS itself is not a single package —
> it is a *bundle* of packages (`com.unity.entities`, `com.unity.burst`,
> `com.unity.collections`, `com.unity.entities.graphics`, `com.unity.physics`,
> `com.unity.netcode`) that ship and version semi-independently. "DOTS 1.x"
> in this entry means **Entities 1.x**, which is the marker most teams use
> for "the production-stable line" (vs. the long 0.x preview era of
> 2018–2022).

This entry exists so AI sessions can answer the recurring Grand-Games
question honestly: *"should our next mobile FPS / RP module use DOTS, or
stay on MonoBehaviour?"* Short answer: **mostly stay on MonoBehaviour**;
opt into DOTS only where the numbers force it (>1k active entities,
heavy physics, deterministic sim, or a network model that already wants
ECS — see Photon Quantum 3 cross-reference).

---

## 1. DOTS 1.x — state of play (2026-05-03)

- **Entities 1.3.x is the current stable line.** Earlier 1.0 (Apr 2023)
  was the "we promise no more rewrites" milestone after years of preview
  churn. 1.x has held its public API contract better than 0.x, but
  **minor versions still ship breaking changes** — the upgrade guide is
  not optional reading between, e.g., 1.0 → 1.2 → 1.3.
- **Editor support: Unity 2022.3 LTS and Unity 6 (2023.3+).** Unity 6
  is the recommended target for new DOTS work — Burst/Jobs improvements
  and Entities Graphics fixes land there first.
- **Production users exist but are still a minority.** Unity's own
  Megacity Metro sample (the spiritual successor to Megacity-2019,
  cross-reference `games/oss-unity-mp-shooters.md` and
  `games/github-broader-shooter-sweep.md`) is the highest-profile
  showcase: 100+ player vehicular combat with Netcode for Entities.
  Shipped commercial titles publicly using DOTS at scale: V Rising
  (Stunlock), parts of Last Epoch, parts of Cities: Skylines II's
  simulation backend.
- **DOTS is *not* the default Unity experience.** GameObject /
  MonoBehaviour remains the supported, documented, hireable-for path.
  DOTS is an opt-in, parallel runtime that you bridge into.

---

## 2. ECS Entities vs MonoBehaviour — mental-model differences

MonoBehaviour:

- *Object-oriented, reference-typed, GC-allocated.* Each `GameObject`
  owns a list of `Component` instances; logic lives in `Update()` /
  `FixedUpdate()` virtual calls dispatched per object.
- *Cache-unfriendly by construction.* Components for the same archetype
  are scattered across the managed heap; iterating 5k enemies hits
  hundreds of cache lines per frame.
- *Easy to reason about, easy to hire for.* 99% of Unity tutorials,
  Asset Store packages, and StackOverflow answers assume this model.

ECS / Entities:

- *Data-oriented, value-typed, struct components.* An `Entity` is a
  32-bit ID. Components are `IComponentData` structs stored in tightly
  packed `Chunk`s (16 KB each), grouped by **archetype** (the exact
  set of component types).
- *Iteration is `foreach` over chunks.* `SystemBase.OnUpdate` queries
  archetypes and reads/writes structs in linear memory — cache-friendly,
  Burst-compilable, parallelisable across cores.
- *No virtual dispatch, no GC.* Systems are static-ish; behaviour is
  composed by *which components an entity has*, not by class hierarchy.

The mental flip teams stumble on: in ECS, *behaviour lives in systems,
not entities*. An entity that "is a bullet" is just an entity with
`Translation`, `Velocity`, `BulletTag`, `LifetimeExpiry`. The
`BulletMovementSystem` operates on every entity that matches that
archetype. There is no `Bullet.cs` class.

---

## 3. Burst compiler — HPC# subset, when to use `[BurstCompile]`

**Burst** is an LLVM-backed AOT compiler that takes a constrained
subset of C# (called *HPC#* — High-Performance C#) and produces
native, SIMD-vectorised code. It is the single largest reason DOTS
exists.

HPC# constraints (the ones that bite):

- **No managed types.** No `class`, no `string`, no `object`, no
  delegates that capture managed state, no `try`/`catch` (mostly).
- **Blittable structs only.** `int`, `float`, `bool`, fixed-size
  buffers, `NativeArray<T>`, `Unity.Mathematics` types
  (`float3`, `quaternion`).
- **No GC allocations.** Use `Allocator.Temp` / `Allocator.TempJob` /
  `Allocator.Persistent` with `NativeContainer`-flavoured collections.

When to apply `[BurstCompile]`:

- **Always** on `IJob*` jobs that touch >hundreds of elements per
  frame.
- **Always** on `ISystem` (the unmanaged-system path) implementations
  in 1.x — `ISystem` is Burst-compatible end-to-end, `SystemBase` is
  not.
- **Selectively** on hot static methods called from Burst code. Don't
  bother on cold path / one-shot init code — Burst compile is not free
  at edit time.

Rule of thumb: code outside `[BurstCompile]` runs Mono/IL2CPP-managed
and gives up most of the DOTS perf win. If you are not Bursting, you
are not really doing DOTS — you're just paying its complexity cost.

---

## 4. C# Job System — `IJob` vs `IJobParallelFor` vs `IJobChunk`

The Job System predates Entities and works fine *without* ECS — it is
just "safe, schedulable, multithreaded work units over `NativeArray`".
The three variants you'll actually pick between:

- **`IJob`** — single job, single thread, runs off the main thread.
  Use for one big serial chunk of work you want off the frame
  (e.g. a procedural mesh bake, a path-cache rebuild).
- **`IJobParallelFor`** — splits a flat range `[0, length)` across
  worker threads. The classic choice for "do the same thing to every
  element of a `NativeArray`" — particle updates, raycast batches,
  per-vertex transforms.
- **`IJobChunk`** (DOTS-only) — iterates ECS *chunks* in parallel.
  Each worker gets one chunk (~16 KB of components) and walks it
  linearly. This is the canonical DOTS pattern; `Entities.ForEach` /
  `SystemAPI.Query` desugar to this.

Sequencing rules that matter in practice:

- `JobHandle.CombineDependencies` chains jobs; the safety system
  errors hard if you write to the same `NativeArray` from two jobs
  without a dependency between them.
- `[ReadOnly]` on a job field is mandatory if you want concurrent
  reads — it's not a hint.
- Never call `.Complete()` mid-frame unless you have to. The whole
  point is to overlap with main-thread work.

---

## 5. Subscene workflow — authoring vs runtime data

Subscenes are the bridge between "Editor humans want GameObjects" and
"runtime wants packed entity chunks":

- An **authoring scene** (loaded as a `SubScene`) contains
  GameObjects with `*Authoring : MonoBehaviour` components.
- At bake time (entering Play, or building), Unity runs **bakers**
  (`Baker<TAuthoring>` subclasses) that emit `IComponentData` onto an
  `Entity`.
- The result is serialised to a binary entity blob loaded at runtime —
  no GameObject conversion happens on the device.

Why this matters:

- Designers keep working in the standard Unity hierarchy — placing
  prefabs, tweaking values, using gizmos. They never see an `Entity`.
- Bakers are pure functions of authoring state — re-baking is cheap
  and incremental in the editor, deterministic on build.
- *Mistake to avoid:* doing per-instance baking work that the runtime
  could do. Bake once, share across instances via shared components or
  blob assets where possible.

---

## 6. Hybrid path — ECS for sim, MonoBehaviour for UI/managers

Almost no shipping DOTS title is *pure* ECS. The realistic Grand-Games
shape looks like:

- **MonoBehaviour layer** — UI (uGUI / UI Toolkit), audio mixer wiring,
  scene loaders, save/load, IAP, analytics, anti-cheat hooks, editor
  tooling. All the stuff that already has a working asset-store /
  framework answer.
- **ECS layer** — the simulation: enemy AI, bullets, projectiles,
  physics-driven props, large crowd / vehicle counts, deterministic
  match logic.
- **Bridge** — a small surface of "hybrid components" (managed
  components on entities) or per-frame copy-out systems that read
  ECS state into a few singleton MonoBehaviours so UI can data-bind.

This is roughly how Megacity Metro, V Rising and Cities: Skylines II
are publicly described. Treat ECS as the *engine room*, not the *whole
ship*.

---

## 7. When DOTS pays off

DOTS is worth the complexity tax when **at least two** of these are
true for the system you're building:

- **>1k active entities updating per frame.** Bullets, particles
  treated as entities, RTS units, vehicle crowds, dense AI swarms.
  Below ~1k, MonoBehaviour + a bit of pooling is faster *to ship*
  and fast enough at runtime.
- **Physics-heavy simulation.** Unity Physics (DOTS) and Havok Physics
  for Unity scale to entity counts that PhysX-on-GameObject simply
  cannot match.
- **Determinism is a hard requirement.** Replays, lockstep / rollback
  netcode, server-authoritative re-sim. ECS + Burst + fixed-point or
  carefully managed `float` math is the realistic path; MonoBehaviour
  is too non-deterministic across platforms.
- **Large open-world streaming.** Subscene streaming was designed for
  the Megacity-class problem (millions of authored objects, thousands
  active).
- **You are already on Quantum / Netcode for Entities.** Cross-reference
  §9 — the netcode forces ECS upstream.

---

## 8. When NOT to use DOTS

Refuse-to-recommend list, in priority order:

- **Small entity counts (<a few hundred).** A standard MonoBehaviour
  + object-pool architecture will hit 60 FPS on the same target
  hardware with a fraction of the engineering cost.
- **MonoBehaviour-heavy team.** If your devs are mid-level Unity
  generalists with no ECS experience, the ramp-up will eat your
  schedule. DOTS errors are *not* friendly — `EntityCommandBuffer`
  ordering bugs, structural-change exceptions, Burst safety errors.
- **Deadline pressure / single-sprint deliverable.** Do not start a
  team's first DOTS adoption against a hard publisher milestone.
- **Asset Store dependency.** Most Asset Store packages are
  GameObject-only. If your game leans on, say, a popular dialogue
  system, an inventory framework, or a third-party FPS controller,
  porting cost can dwarf any perf win.
- **You wanted "performance" and haven't profiled.** Most "Unity is
  slow" issues at the scale Grand Mobile / RP modules operate at are
  *GC, draw calls, or scripting allocations* — fix those first; a
  quiet `Profiler` + `Memory Profiler` pass beats a DOTS rewrite
  every time.

Said plainly: DOTS is **not a panacea**. Most Unity teams stay on
MonoBehaviour because for most games, MonoBehaviour is the right
answer.

---

## 9. DOTS vs Photon Quantum (cross-reference)

Both DOTS and Photon Quantum 3 (`engines/photon-quantum-3.md`) are
ECS-shaped, but they answer different questions:

| Axis             | Unity DOTS (Entities 1.x)              | Photon Quantum 3                                |
|------------------|----------------------------------------|-------------------------------------------------|
| Primary purpose  | Local high-perf simulation             | Networked deterministic simulation              |
| Determinism      | Possible, not enforced                 | Enforced — fixed-point math, byte-stable frames |
| Network model    | Bring your own (NGO, NfE, FishNet…)    | Predict-and-rollback baked in                   |
| License          | Unity Companion License (free w/ Unity)| Commercial SaaS, free up to 100 CCU            |
| Source available | Most packages source-available         | Closed-source SDK                               |
| Mobile fit       | Workable, profile carefully            | Photon's *recommended* mobile FPS path         |

When to pick which:

- **Single-player or session-server with custom netcode:** DOTS, if
  you need the perf.
- **Competitive / synchronous multiplayer mobile, especially RU/CIS
  market:** Quantum is usually the faster path to a shippable game —
  the rollback netcode is the hard part, and Photon already solved it.
- **Both at once:** Quantum *is* an ECS — you don't usually layer
  Entities under it. Pick one ECS world.

For the Grand Games priority order ("RP for studios first" — see
project memory), neither DOTS nor Quantum is the immediate need.
Both become relevant once we move past RP into Grand Mobile-style
synchronous mobile MP.

---

## 10. Mobile constraints

DOTS works on mobile — Unity ships ARM64 Burst targets and Megacity
Metro has documented mobile builds. But there are real gotchas:

- **Job System overhead on low-end Android.** Worker thread count
  scales with logical CPU cores; on a 4-core Snapdragon-6xx-class
  device, splitting a small workload across jobs can be *slower* than
  running it serially. Profile before parallelising.
- **Burst AOT increases build size.** Each platform/architecture slice
  adds compiled native code; on a tight APK budget this matters.
- **Memory ceilings.** Chunk-based storage trades RAM for cache
  friendliness — `Persistent` allocations on entry-tier Android (2 GB
  RAM, OS already eating ~1 GB) can OOM faster than equivalent
  GameObject pools.
- **Thermal throttling.** A DOTS sim that pegs all four cores at 60 Hz
  will throttle within minutes on a passively-cooled phone. Frame-rate
  cap and "active job worker count" are real shipping levers.
- **iOS bitcode + Burst.** Long-standing footgun area; verify on
  current Unity 6 / Xcode combo before locking architecture.

Practical Grand-Games mobile rule: **do the prototype in
MonoBehaviour, profile on a *real* low-end Android device (not the
Editor, not a flagship), and only then decide if DOTS earns its keep
for that specific bottleneck.**

---

## 11. Honest framing — rough edges in 1.x

Things AI sessions should not gloss over:

- **Minor-version breaking changes.** 1.0 → 1.1 → 1.2 → 1.3 each
  shipped non-trivial migration steps. Plan upgrade windows; don't
  silently bump.
- **Tooling gaps.** Entities Hierarchy, Entities Inspector, and the
  DOTS Editor work, but lag the GameObject equivalents in polish.
  Debug-by-print is still common.
- **Documentation churn.** Manual pages have moved between 0.x, 1.0,
  and 1.x revisions; older Stack Overflow / forum answers are often
  silently wrong now (`Entities.ForEach` deprecated in favour of
  `SystemAPI.Query`, `JobComponentSystem` removed, etc.).
- **Entities Graphics** (formerly Hybrid Renderer V2) is solid for
  large instance counts but not feature-parity with the standard
  renderer for niche shading paths. Verify shader compatibility early.
- **Netcode for Entities** is production-usable but smaller community
  than NGO/FishNet — fewer Asset Store integrations, fewer tutorials.
- **Hireable supply is thin.** "Unity dev" is a market; "Unity DOTS
  dev" is a much smaller market. Factor into team-scaling plans.

None of this means DOTS is bad — it means DOTS is a *power tool*.
Don't reach for it because it's new; reach for it when MonoBehaviour
has provably failed.

---

## References

- Unity Entities 1.x manual — <https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/index.html>
- Unity Burst manual — <https://docs.unity3d.com/Packages/com.unity.burst@latest>
- Unity Collections manual — <https://docs.unity3d.com/Packages/com.unity.collections@latest>
- Unity C# Job System docs — <https://docs.unity3d.com/Manual/JobSystem.html>
- Megacity Metro sample — cross-reference `knowledge-base/games/oss-unity-mp-shooters.md` and `knowledge-base/games/github-broader-shooter-sweep.md` (Unity Companion License, read-only).
- Photon Quantum 3 cross-reference — `knowledge-base/engines/photon-quantum-3.md`.
- Unity 6 mobile multiplayer landscape — `knowledge-base/engines/unity-mobile-multiplayer.md`.

## Constraints

- Unity Companion License covers `com.unity.entities` and the rest of
  the DOTS package set. Source is *available* for reading; it is **not
  OSI-open**. Do not vendor Unity package source into GamesAI repos —
  link to docs / GitHub instead.
- Honest framing is mandatory: DOTS is **not** a default recommendation
  for Grand-Games tooling. Default to MonoBehaviour; recommend DOTS
  only when §7 conditions clearly apply and §8 disqualifiers do not.
