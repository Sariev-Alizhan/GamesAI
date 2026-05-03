---
type: engine
slug: photon-quantum-3
title: Photon Quantum 3 — deterministic ECS for competitive multiplayer
engine: unity
content_format: code
language: csharp
license: commercial (Photon SaaS) — free up to 100 CCU since 2025
source_url: https://doc.photonengine.com/quantum/current/getting-started/quantum-intro
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [unity, photon, quantum, deterministic, ecs, rollback, mobile-mp]
---

# Photon Quantum 3 — deterministic ECS for competitive multiplayer

> Verified 2026-05-03 against the Photon Quantum docs landing page, the
> September-2024 "Unity Verified Solution" announcement, and the public
> Quantum pricing page. The Quantum SDK itself is closed-source — every
> claim below comes from public Photon documentation, blog posts, or
> third-party showcases. No leaked SDK material is referenced.

---

## 1. What Quantum is, and why it exists

**Photon Quantum** is a **server-authoritative deterministic ECS** that runs
on top of Photon's relay/quantum-server infrastructure. Photon ships *two*
distinct Unity netcode products and they are not interchangeable:

- **Photon Fusion 2** — snapshot/state-replication netcode. Server (or host)
  owns state, sends interpolated/compressed snapshots to clients. Great
  for shooters, MMO-style worlds, anything where authoritative state is
  the simplest model.
- **Photon Quantum 3** — *deterministic predict-and-rollback* ECS. Only
  player **inputs** travel over the wire. Every client re-simulates the
  same frames from the same inputs and arrives at the same `Frame` byte-
  for-byte. The server is a *verifier* and input router, not a state
  authority.

Quantum exists because snapshot models break down at high entity counts,
high tick-rates, or high player counts: you simply cannot snapshot 32-player
networked physics at 60 Hz and stay inside a mobile data budget. Quantum
sidesteps the problem — `inputs * players * tickrate` is tiny compared to
`world_state * tickrate`.

Public confirmation: Photon's own marketing line for Quantum 3 is
*"the most performant and reliable solution for developing multiplayer
games in Unity"*, and the engine became a **Unity Verified Solution on
2024-09-06** (announced on the Photon Engine blog).

---

## 2. The deterministic-lockstep mental model

Classic *lockstep* (think early RTS netcode) waits for every player's input
before advancing the simulation — one slow player stalls everyone.
Quantum is a **predict-and-rollback** variant of lockstep:

1. The local client predicts the next frame using its *own* input + a
   guess for remote inputs (usually "repeat last frame").
2. Inputs travel through the Photon Quantum server, which assigns each
   tick a verified input set and broadcasts it.
3. When a confirmed input set arrives that contradicts a prediction,
   the client **rolls back** to the last verified frame, re-applies the
   confirmed inputs, and re-simulates forward to the current tick.
4. Because every system is deterministic and operates on the same
   `Frame` data, every client converges on the same state.

Why this matters for the games we care about:

- **100+ player battle royales**: the wire only carries inputs, not
  positions. Stumble Guys runs 32 players with full physics on low-end
  Android phones precisely because Quantum is on the wire.
- **Fighting games / precise rollback**: rollback netcode (GGPO, Skull-
  girls, Street Fighter 6) requires byte-equal simulation across
  machines. A snapshot model literally cannot give you the frame-perfect
  rollback that competitive fighters demand.
- **RTS / autobattler**: late-joiners can replay the input log to
  resync — no need to ship a state snapshot.
- **Replays for free**: input log + initial seed = perfect replay. The
  same property powers Quantum's server-provided replay feature.

Determinism is *load-bearing* — see the pitfalls section.

---

## 3. Quantum 3 vs Quantum 2 vs Fusion 2 — pick one

| Dimension | **Quantum 3** | **Quantum 2** | **Fusion 2** |
|-----------|---------------|---------------|--------------|
| Network model | Deterministic predict + rollback (inputs only) | Same as Q3, older API | Snapshot interpolation, server-authoritative |
| State representation | Pure ECS (`Frame`, struct components in unmanaged memory) | Pure ECS, older codegen | OOP — `NetworkBehaviour` on `MonoBehaviour` GameObjects |
| Math | FP fixed-point (`FP`, `FPVector2/3`, `FPQuaternion`) | FP fixed-point | Standard `float` / `Vector3` |
| Codegen | `.qtn` DSL → C# via `Quantum.CodeGen.Qtn` | `.qtn` DSL, older toolchain | None at this layer |
| Unity Verified | Yes (2024-09-06) | No | Yes |
| Free dev tier | 100 CCU (since 2023, kept in 2026 pricing) | Same | Same family of tiers |
| Best for | Fighting / BR / RTS / autobattler / mobile MP physics | Legacy projects mid-development | Shooters, persistent worlds, lobby-style coop |
| Migration cost | Reference architecture going forward | Migrate to Q3 if greenfield | Different product — different API entirely |

Decision rule for Grand Games / Grand Mobile work:

- New mobile-MP project with PvP physics or low data budget → **Quantum 3**.
- Existing project on Quantum 2 → finish it on 2, plan Q3 for the next
  game, not a mid-project rewrite.
- New shooter where authoritative server is fine and you don't need
  rollback → **Fusion 2**.
- Coop campaign or instanced PvE → either works; Fusion 2 is usually
  faster to ship.

---

## 4. Architecture concepts

Quantum's runtime is intentionally tiny — a handful of types do almost
all the work.

- **`Frame`** — the entire authoritative simulation state for a single
  tick. Stored in a single contiguous unmanaged buffer so that copying
  / rollback is a `memcpy`. `Frame` is also the API surface: systems
  receive `Frame f` and call `f.Filter<…>()`, `f.Add<T>()`,
  `f.Get<T>(EntityRef)`.
- **`Globals`** — a singleton struct *inside* the `Frame` for global
  game state (round timer, scores, current phase). Defined in `.qtn`
  as `global { … }`.
- **`EntityRef`** — a stable handle into the entity table. Survives
  rollback because the table is part of `Frame`.
- **Components** — POD structs (no managed references) declared in
  `.qtn`, code-generated into C# inside `Quantum.Simulation.dll`.
  Lives in unmanaged memory inside `Frame`.
- **Systems** — game logic. Common base classes:
  - `SystemMainThread` — bare per-frame `Update(Frame f)`.
  - `SystemMainThreadFilter<T>` — auto-iterates entities matching
    a generated filter struct (one or more components).
  - `SystemSignalsOnly` — never updates; only reacts to **Signals**
    (Quantum's typed event/RPC bus inside the simulation, e.g.
    `ISignalOnPlayerAdded`).
- **`.qtn` DSL files** — Quantum's own DSL for declaring components,
  globals, signals, and inputs. Compiled by
  `Quantum.CodeGen.Qtn.dll` into C# at edit-time. **This is the
  pattern Boilergen explicitly mirrors** — see section 8.

Lifecycle on the client:
```
Unity MonoBehaviour view  ←—polls—  QuantumRunner  →  Frame (predicted)
                                      ↑                   ↑
                                      |                   |
                              local input + verified  rollback when
                              inputs from server      verified set diverges
```

The Unity GameObject layer is *only a view*. Systems must never read
from `MonoBehaviour` state — that breaks determinism (see pitfalls).

---

## 5. A small `.qtn` + system pair

Component declared in `Game.qtn`:

```qtn
// Game.qtn — Quantum DSL
component Health
{
    FP Current;
    FP Max;
}

component DamageOverTime
{
    FP DamagePerSecond;
    FP RemainingSeconds;
}

signal OnUnitDied(EntityRef unit);
```

The codegen emits `Quantum.Health`, `Quantum.DamageOverTime`, and an
`ISignalOnUnitDied` interface. Then a system:

```csharp
// DamageOverTimeSystem.cs
using Photon.Deterministic;

namespace Quantum
{
    public unsafe class DamageOverTimeSystem
        : SystemMainThreadFilter<DamageOverTimeSystem.Filter>
    {
        public struct Filter
        {
            public EntityRef Entity;
            public Health* Health;
            public DamageOverTime* DoT;
        }

        public override void Update(Frame f, ref Filter filter)
        {
            var dt = f.DeltaTime; // FP
            filter.DoT->RemainingSeconds -= dt;

            if (filter.DoT->RemainingSeconds <= FP._0)
            {
                f.Remove<DamageOverTime>(filter.Entity);
                return;
            }

            filter.Health->Current -= filter.DoT->DamagePerSecond * dt;

            if (filter.Health->Current <= FP._0)
            {
                f.Signals.OnUnitDied(filter.Entity);
                f.Destroy(filter.Entity);
            }
        }
    }
}
```

Things to notice — every one of them is a determinism rule:

- All math is `FP` (fixed-point), never `float`.
- Components are passed as **pointers** into `Frame`'s unmanaged buffer
  — direct, allocation-free mutation.
- Signals (`OnUnitDied`) fire **inside the simulation**, so other
  systems react in the same frame deterministically. Unity-side view
  code subscribes via `QuantumEvent` (a separate, *non-deterministic*
  channel for view-only effects).

---

## 6. Pricing reality, 2026

Verified against `photonengine.com/quantum/pricing` on **2026-05-03**:

| Tier | CCU | Price | Notes |
|------|-----|-------|-------|
| Development Only | 20 | $0 | 60 GB traffic / month, dev/test |
| **Free 100 CCU** | 100 | **$0** | One app, ~40k MAU, 0.3 TB traffic |
| 100 CCU (paid) | 100 | $95 one-time / 12 months | Production |
| 500 CCU | 500 | $125 / month | Burstable |
| 1,000 CCU | 1,000 | $250 / month | Burstable |
| 2,000 CCU | 2,000 | $500 / month | Burstable |
| Premium Cloud | up to 50,000 | $0.50 / CCU, $1,000 / month minimum | Includes 6 TB traffic |
| Enterprise Cloud | custom | custom | Dedicated, SLA |

The **100 CCU free tier** has been in place since the May-2023 "Quantum
is now FREE for development" announcement and is still on the public
pricing page in 2026. This is the reason a small studio can prototype
on Quantum without a card on file.

The license itself remains **commercial** — the Quantum SDK is
distributed via the Unity Asset Store / Photon dashboard under a
proprietary EULA. There is **no source available**. Reflect that
honestly in any GamesAI material.

---

## 7. Real shipping titles (verified)

Confirmed via Photon Engine's official `/quantum/showcase` page and
the announcement of the free tier:

- **Stumble Guys** — Kitka Games / Scopely — 32-player physics party
  battle royale, the headline showcase. Photon claims ~25M daily players
  and #1 in 50 countries. Shipped on iOS, Android, PC.
- **LEGO Brawls** — Red Games Co. / The LEGO Group — cross-platform
  party brawler (Switch, mobile, Apple Arcade). Explicitly named in the
  ExitGames announcement of the free tier.
- **LEGO Star Wars Battles** — Apple Arcade competitive lane-pusher /
  card battler. Named alongside LEGO Brawls in Photon's marketing.
- **Battlelands Royale** — Futureplay — 32-player top-down BR, an early
  Quantum reference title; still cited in Photon material.

The marketing page also lists logos for Scopely and Gearbox among
"Selected Quantum Customers" without per-game attribution — so we don't
quote those as confirmed Quantum titles in GamesAI content.

> **Note**: Zooba (Wildlife Studios) is sometimes listed with Quantum in
> third-party blog posts, but it is **not present on the official
> Photon showcase page** as of 2026-05-03. Treat as unconfirmed.

---

## 8. Patterns worth borrowing for Boilergen

Quantum is, structurally, a **DSL → C# code-generator** wrapped around
a deterministic ECS runtime. The codegen layer lives at
`Assets/Photon/Quantum/Editor/CodeGen` and ships as
`Quantum.CodeGen.Qtn.dll`. This is a directly-applicable pattern for
Boilergen:

1. **Schema-first authoring** — Quantum users declare components in
   `.qtn`, never in raw C#. A `.qtn` file *cannot* express something
   undeterministic (no managed types, no `float`). The DSL is itself
   a guard rail. Boilergen's schema layer should aspire to the same
   property: schemas should make invalid states *unrepresentable*, not
   just rejected by validation.
2. **Codegen output is a sealed boundary** — Quantum's generated C#
   sits in `Quantum.Simulation.dll`. Game code consumes it but never
   writes into the generated folder. Boilergen already follows this
   convention; Quantum is good external evidence the pattern scales to
   AAA-mobile codebases.
3. **Signals as a typed, in-simulation event bus** — generated from
   `.qtn` `signal` declarations. Worth a template in Boilergen for
   anyone scaffolding a Unity ECS project.
4. **Frame snapshotting for save/load** — because `Frame` is a single
   unmanaged buffer, "save game" is a `memcpy` and a write. This is
   the same idea as the snapshot-driven save format we sketched in
   the schema-validator module's roadmap. Quantum is prior art that
   the technique works in production at 60 Hz.
5. **Replays from input logs** — replays are not a feature, they are a
   *consequence* of the architecture. Any GamesAI tool that touches RP
   moderation (the MG/PG/DM/RK/TK vocabulary in our project memory)
   should consider input-log replay as the underlying primitive for
   "show me what the player did at 22:14:03".

---

## 9. Pitfalls

- **`float` is forbidden inside the simulation.** Every Quantum bug
  tracker thread eventually traces back to someone using `Mathf.Sin`
  or `UnityEngine.Random` in a system. Use `FPMath`, `RNGSession`, and
  the Quantum-provided fixed-point types. The compiler does not catch
  this; a desync at minute 7 of a match catches it for you.
- **MonoBehaviour state must never feed into the simulation.** The
  view is allowed to read `Frame`. Systems are *not* allowed to read
  the view. Mixing the two is the most common source of "works in
  editor, desyncs in build" bugs.
- **Determinism is fragile across platforms** — different x86/ARM SIMD
  paths, different JIT versions, IL2CPP vs Mono, even some hardware
  intrinsics can break byte-equality. Quantum mitigates with FP math
  and a checksum-based desync detector, but you must still test on the
  actual target devices, not just the editor.
- **Vendor lock-in to Photon Cloud.** The Quantum server is closed.
  Self-hosting is gated behind the Enterprise Cloud tier. If you're
  building a project that *must* eventually run on a sovereign /
  on-prem stack (a real concern for some Russian-market mobile titles
  on our roadmap), Quantum's hosting story is a strategic risk worth
  surfacing on day one, not month nine.
- **The .qtn DSL has its own learning curve.** It is small but it is
  not C#; team members will paste C# patterns into it and be confused
  when codegen fails. Worth a one-page cheat sheet in any team that
  adopts it.
- **Closed-source SDK.** When a bug is in Quantum itself, your only
  recourse is the Photon support forum. Plan accordingly.

---

## 10. How this connects to Boilergen + the GamesAI roadmap

**Should we ship a `unity-quantum` Boilergen plugin?** *Yes — but not
this sprint.* The case for it:

- Quantum is the single best technical match for the **mobile-MP
  Russian-market wedge** flagged in our project memory (Grand Mobile
  + Alizhan's Unity shooter). 100 CCU free tier means an indie can
  start without procurement.
- Quantum's `.qtn` → C# pipeline is the same shape as Boilergen — a
  plugin would mostly be schema entries and a thin generator, not a
  new architecture.
- Stumble Guys is a public proof point we can cite in the OSS
  positioning material without needing internal Grand Games data.

Schema entry types that should map cleanly to Quantum constructs:

| GamesAI schema entity | Quantum target |
|-----------------------|----------------|
| `component` | `.qtn` `component` block (with FP types) |
| `entity_archetype` | Entity prototype + initial component set |
| `system` | `SystemMainThread` / `SystemMainThreadFilter<T>` C# class skeleton |
| `signal` | `.qtn` `signal` declaration + `ISignalXxx` C# interface |
| `global_state` | `.qtn` `global { … }` block |
| `input` | `.qtn` `input { … }` block + serializer |

Sequencing on the roadmap:

1. **Now (sprint-current)**: keep the three shipped modules
   (boilergen / localization-assistant / schema-validator) stable.
2. **Next sprint**: knowledge-base-only entry (this file) so the
   research is captured and citable.
3. **Sprint after schema-validator stabilises**: a minimal
   `unity-quantum` plugin that emits `.qtn` from a Boilergen schema
   and a stub `SystemMainThreadFilter<T>` per declared system. Scope:
   one example schema, one example system, end-to-end.
4. **Later**: replay-log tooling, since input logs naturally feed the
   RP moderation use-case in Grand Games.

Out of scope (red zones — see project memory): we do not generate
*final* gameplay code, balancing data, or AI behaviour for shipped
games. The plugin would scaffold *structure*, not gameplay.

---

## 11. References

Official (Photon):

- [Quantum 3 Intro — official docs](https://doc.photonengine.com/quantum/current/quantum-intro)
- [Quantum 3 — What's New In 3.0](https://doc.photonengine.com/quantum/current/getting-started/whats-new)
- [Quantum 3 — DSL (game state)](https://doc.photonengine.com/quantum/current/manual/quantum-ecs/dsl)
- [Quantum 3 — Systems (game logic)](https://doc.photonengine.com/quantum/current/manual/quantum-ecs/systems)
- [Quantum 3 — Components](https://doc.photonengine.com/quantum/current/manual/quantum-ecs/components)
- [Quantum 3 — Release Notes](https://doc.photonengine.com/quantum/current/getting-started/release-notes/)
- [Quantum 3 API — `Quantum.Editor.QuantumCodeGenQtn`](https://doc-api.photonengine.com/en/quantum/current/class_quantum_1_1_editor_1_1_quantum_code_gen_qtn.html)
- [Quantum 3 API — `Quantum.ComponentFilterStruct<T>`](https://doc-api.photonengine.com/en/quantum/current/struct_quantum_1_1_component_filter_struct.html)
- [Quantum product page](https://www.photonengine.com/quantum)
- [Quantum showcase (shipping titles)](https://www.photonengine.com/en-us/quantum/showcase)
- [Photon blog — Quantum 3 as Unity Verified Solution (2024-09-06)](https://blog.photonengine.com/the-evolution-of-deterministic-multiplayer-photon-quantum-now-a-unity-verified-solution/)
- [Photon blog — Quantum is now FREE for Development (announcement of 100 CCU tier)](https://blog.photonengine.com/photon-quantum-is-now-free-for-development/)

Internal cross-references inside this repo:

- `knowledge-base/engines/unity-mobile-multiplayer.md` — engine baseline
- `knowledge-base/engines/mirror-networking.md` — OSS counterpart
- `knowledge-base/engines/fish-networking.md` — OSS counterpart with CSP
- `knowledge-base/sources/community-sentiment-ai-gamedev.md` — guardrail filter

> **License honesty footer.** Quantum is commercial, closed-source
> software distributed under Photon's EULA. Everything in this entry
> is derived from Photon's public documentation, public blog posts,
> public pricing page, and public showcase listings. No SDK source
> code, no leaked internals, no reverse-engineered material.
