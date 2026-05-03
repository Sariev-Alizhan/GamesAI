---
type: engine
slug: unreal-niagara-vfx
title: Unreal Niagara — VFX system architecture, modules, performance
engine: unreal
content_format: code
language: cpp
license: Unreal Engine EULA (engine code) / docs from Epic
source_url: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-niagara-effects-for-unreal-engine
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: medium
tags: [unreal, ue5, niagara, vfx, particles, gpu]
---

# Unreal Niagara — VFX system architecture, modules, performance

> Niagara is Unreal Engine's modern VFX framework, replacing the legacy Cascade particle system. It is built around **composable Modules** with typed inputs/outputs — a pattern that maps almost one-to-one onto Boilergen's schema-component philosophy. This entry is a reference for that pattern, not a how-to-author-VFX guide.

## 1. What Niagara is, vs legacy Cascade

**Cascade** was the UE3/UE4-era particle system. Effects were assembled from a fixed set of hard-coded "modules" with limited extensibility — adding new behaviour required engine source changes. Cascade was officially deprecated in **UE 4.20** when Niagara shipped as the recommended successor, and was **removed as the default in UE 5.0** (still available behind a plugin during the 5.x line, but no longer receiving feature work).

**Niagara** is a node-graph–driven, fully data-oriented system. Effects are authored in the editor by composing **Modules** (graph snippets) onto **Emitters**, which roll up into a **System** asset. Behaviour is defined in HLSL-like graph nodes that compile down to either CPU code or compute shaders depending on emitter sim target. Custom Modules are first-class — designers and TAs can extend the system without engine code.

## 2. Architecture concepts

The hierarchy, top-down:

```
NiagaraSystem        (.uasset)  ← top-level effect, dropped into a level
 └─ NiagaraEmitter   (.uasset, can be standalone or inline in a System)
     └─ Stages: System / Emitter / Particle Spawn / Particle Update / Render
         └─ Modules (graph snippets executing per-stage)
             └─ Parameters (typed inputs — float, vector, color, struct)
                 └─ Data Interfaces (CPU↔GPU bridges to external data)
```

Concept-by-concept:

- **NiagaraSystem** — the top-level asset you place into a level or attach to a component. A System owns one or more Emitters and runs their simulation in lockstep.
- **NiagaraEmitter** — one visual element (sparks, smoke plume, debris). An Emitter has stages (Spawn, Update, Render) and a sim target (CPU or GPU).
- **Modules** — composable graph snippets that run in a stage. Examples shipped by Epic: `SpawnRate`, `InitializeParticle`, `AddVelocity`, `GravityForce`, `ColorOverLife`, `MeshRotationRate`, `ScaleColor`, `SpriteRenderer`. Designers stack them like layers in Photoshop.
- **Parameters** — typed values that flow between Modules. Niagara has a strong type system (`Float`, `Vector`, `Color`, `Position`, `LinearVelocity`, plus user structs). The Parameter Panel exposes them to designers and Blueprint.
- **Data Interfaces (NDIs)** — typed objects that bridge Niagara's simulation domain (especially GPU) to engine-side data: `NDI Skeletal Mesh` (sample bones/sockets/triangles), `NDI Static Mesh`, `NDI Curve`, `NDI Render Target`, `NDI Audio`, `NDI Collision Query`, `NDI Volume Texture`, `NDI Camera Query`. NDIs are the only sanctioned way for a GPU emitter to touch engine state.

A complete System might be: one CPU emitter for a few hero sparks (precise, gameplay-aware), plus one GPU emitter for the 50,000 dust particles in the cone (cheap, decorative, no gameplay coupling).

### Stages in detail

Each Emitter executes a fixed sequence of stages every frame. Modules attach to a specific stage:

| Stage             | Runs                              | Typical Modules                                                       |
| ----------------- | --------------------------------- | --------------------------------------------------------------------- |
| System Spawn      | Once when System spawns           | `Set System Variables`                                                |
| System Update     | Every frame, before emitters      | `Spawn Particles From Other Emitter`, system-wide curves              |
| Emitter Spawn     | Once when Emitter activates       | `Set Emitter Variables`, `Initialize Emitter`                         |
| Emitter Update    | Every frame, before particles     | `SpawnRate`, `SpawnBurst Instantaneous`, `Spawn Per Unit`             |
| Particle Spawn    | Per new particle, on creation     | `Initialize Particle`, `Shape Location`, `Add Velocity`               |
| Particle Update   | Per particle, every frame         | `Gravity Force`, `Drag`, `Color Over Life`, `Curl Noise Force`        |
| Render            | Per particle, on submission       | `Sprite Renderer`, `Mesh Renderer`, `Ribbon Renderer`, `Light Renderer` |

Designers compose effects by stacking Modules per-stage. The order of Modules within a stage matters — they execute top-to-bottom, and later Modules can read or overwrite outputs of earlier ones.

## 3. Module philosophy — Niagara's killer feature

A **Module** in Niagara is a re-usable piece of node-graph logic with typed inputs and typed outputs. It is not a class hierarchy — there is no "base Module" to inherit from. It is **composition**, not inheritance.

That principle has direct parallels:

| Niagara concept                  | Boilergen analogue                  |
| -------------------------------- | ----------------------------------- |
| Module (typed graph snippet)     | Schema component (typed YAML block) |
| Parameter (typed input)          | Schema field with type annotation   |
| System (compose Modules)         | Boilergen template (compose blocks) |
| Data Interface (engine bridge)   | Generator adapter (engine emitter)  |
| Stages (Spawn / Update / Render) | Generator phases (init / build / emit) |

Authoring a custom Module looks like:

1. Right-click in Content Browser → Niagara → Module Script.
2. Define inputs with `Map Get` nodes — each one declares a typed parameter. Example: `In Velocity (Vector)`, `In DampingFactor (Float)`.
3. Build the math in the graph (or drop into a Scratch Pad — see §5).
4. Define outputs with `Map Set` nodes — written back to the particle's parameter state.
5. The Module is now a draggable item in any Emitter's stage panel, with its inputs auto-exposed in the Selection panel.

The killer property: a Module written today plugs into Modules written by Epic, the marketplace, or a 2018-era project, **as long as types match**. There is no version coupling — each Module is a small, type-safe unit. This is the same property Boilergen's schema components aim for: a `react-form` component composes with an `api-route` component without either knowing about the other, because both speak the schema's type vocabulary.

A worked example — a hypothetical `RadialPushFromPoint` Module:

```
Inputs (Map Get):
  Center                : Position
  Strength              : Float (default 500.0)
  FalloffRadius         : Float (default 200.0)
  ParticlePosition      : Position   ← read from particle attribute

Body (graph):
  Delta       = ParticlePosition - Center
  Distance    = Length(Delta)
  Direction   = Normalize(Delta)
  Falloff     = saturate(1 - Distance / FalloffRadius)
  Force       = Direction * (Strength * Falloff)

Outputs (Map Set):
  Particles.Velocity += Force * DeltaTime
```

This Module has zero coupling to where `Center` comes from. A different System might bind `Center` to a player's position via a User Parameter; another might bind it to the position of a moving Actor via a Niagara Component property; another might bind it to the result of a previous Module in the same stage. The Module does not care. **That decoupling is the whole point of typed inputs.**

## 4. CPU vs GPU emitters

Each Emitter has a **Sim Target**: CPU Sim or GPUCompute Sim.

**CPU Sim**:
- Runs on the game thread / worker tasks.
- Can read/write game state freely (gameplay events, audio triggers, spawning Actors).
- Has full access to all Niagara features including `Event Handlers` for cross-emitter communication.
- Practical particle ceiling: ~10K active particles per emitter on desktop, ~1K–2K on mobile before frame-time pain.
- Right choice for: hero VFX with gameplay coupling (impact decals that spawn damage volumes, projectile particles that need precise hit detection, tutorial highlights).

**GPU Sim** (compute shader):
- Runs on the GPU as a compute dispatch.
- Cannot directly call into CPU code — only Data Interfaces are allowed.
- Particle ceiling: hundreds of thousands to low millions on desktop, **highly platform-dependent** on mobile.
- Right choice for: ambient density effects (rain, snow, dust, sparks shower, fluid sims, large-scale debris).

**Mobile constraints (UE 5.1+):**

Niagara GPU emitters on mobile shipped meaningfully in **UE 5.1** (mobile compute support was previously experimental / incomplete). Even in 5.x, mobile GPU emitters carry caveats:

- Compute shader support requires **Vulkan** on Android (ES 3.1 path is more limited), **Metal 2.4+** on iOS.
- Tile-based deferred GPUs (Apple, most Adreno/Mali) pay a memory bandwidth tax for compute readback.
- Many Data Interfaces are CPU-only — using them forces the emitter back to CPU sim or fails to compile.
- Effective ceiling on mid-tier Android: ~5K–20K GPU particles per System before frame budget pressure.

For Grand Mobile (Unity, mobile-first MP, Russian market) the takeaway is conceptual, not operational: **assume mobile particle budgets are an order of magnitude tighter than desktop, regardless of engine**.

## 5. Niagara Scratch Pads (UE 5.x+)

A common pain in 4.x was that any one-off math — a custom curve evaluation, a quick cross product, a weird bias — required authoring a **separate Module asset** in the Content Browser. That polluted the asset list and discouraged tweaking.

**Scratch Pads** (introduced in 5.0, matured through 5.x) let a TA/designer write inline graph or HLSL nodes **directly inside an Emitter or System**, without creating a saved Module. The Scratch Pad lives in the asset itself.

```
Emitter
 └─ Scratch Pad: "ImpactDistanceFalloff"
     ├─ Input: ParticlePosition (Position)
     ├─ Input: ImpactCenter (Position)
     ├─ HLSL: float d = length(ParticlePosition - ImpactCenter);
     │        return saturate(1.0 - d / Radius);
     └─ Output: Falloff (Float)
```

When a Scratch Pad pattern stabilises and is used in three+ Systems, the standard refactor is "promote to Module" via right-click → "Convert to Module Script". Same input/output contract, now reusable across the project.

The Boilergen-style mental model: Scratch Pad is the inline lambda; a promoted Module is the named, exported function.

## 6. Verify in 2026

UE 5.6 (latest stable per the engine version matrix) introduced **Fast Geometry Streaming** for Nanite + landscape, and there are open questions about how Niagara Asset references interact with the streaming pipeline (specifically around Niagara Systems referencing streamed meshes via NDI Static Mesh).

**Action**: WebFetch the UE 5.6 release notes (https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-6-release-notes) and the Niagara section specifically. Likely areas of change to verify:

- NDI Static Mesh / NDI Skeletal Mesh behaviour with streamed-LOD meshes.
- Mobile Niagara renderer feature additions (5.5 added Lumen-aware lit particles on mobile experimentally).
- Whether the Scratch Pad → Module promotion workflow has new affordances.
- Any deprecations of legacy Modules (the spawn rate / spawn burst Module surface has churned).

This entry will be revisited after the 5.6 changelog audit pass; current content is accurate as of UE 5.4 / 5.5 baseline.

## 7. Pitfalls

- **GPU emitter cost on mobile** — see §4. Designers used to a desktop budget ship effects that murder mid-tier Android. Niagara has per-platform overrides (Effect Type → Performance Baselines) but they require explicit setup. Unset = "everything runs everywhere at full budget" = bad.
- **Data Interfaces leak GPU memory if mismanaged** — `NDI Render Target` and `NDI Volume Texture` allocate GPU resources that persist for the lifetime of the System component. Spawning a System per-projectile and never deactivating it leaks. Fix: use Niagara Component Pool (built-in) and call `Deactivate()` then `DestroyComponent()` on hit/expire.
- **Debugging Niagara performance requires Unreal Insights** — the in-editor stats overlay (`stat Niagara`) shows aggregate counts but not per-emitter cost breakdown. Real diagnosis means recording an Insights trace with the `NiagaraSystem` and `GPU` channels enabled, then opening the Niagara Insights view to see per-stage / per-Module cost.
- **Module versioning** — Niagara Modules support a version system, but most projects ignore it. When a Module's input signature changes, every dependent System silently breaks (parameter unset → zero value → invisible particles). Fix: bump the version explicitly and provide an upgrade script in the Module's version asset.
- **CPU emitters in PIE feel cheap, on device they aren't** — Editor PIE runs on a fast worker thread pool. Standalone game / packaged build runs on a tighter task budget. Always profile in Standalone mode at minimum.
- **Significance Manager is opt-in, not automatic** — Niagara has a Significance Manager that culls effects by distance/screen-size, but Systems do not register with it by default. A scene with 200 Niagara Components all simulating off-screen at full LOD is a real and common cause of frame drops in open worlds. Fix: set `Effect Type` per System and configure significance handling there.
- **Looping vs one-shot lifetime confusion** — a System with `Loop Behavior = Infinite` will never auto-destroy its component. Spawning these via `SpawnSystemAtLocation` without holding a reference to deactivate later is a leak. For one-shot impacts use `Loop Behavior = Once` and `Auto Destroy = true` on the component.

## 8. What Boilergen could borrow

The Module-as-typed-composable-unit pattern is **exactly** the schema-component philosophy. A Niagara Module exposes typed inputs, runs deterministic logic, exposes typed outputs, and composes with other Modules without either side knowing about the other — limited only by the type contract. That is the same property a Boilergen schema component should have: an `auth-jwt` block exposes typed outputs (e.g., `userIdSource: enum`, `tokenLifetimeSeconds: int`), an `api-route` block consumes them, and the two compose without coupling.

Concrete future use case (low priority, niche but feasible): **a Boilergen plugin that emits Niagara Module assets from a YAML schema**. Imagine:

```yaml
# niagara-module.yaml
name: ImpactDistanceFalloff
stage: ParticleUpdate
inputs:
  - name: ParticlePosition
    type: Position
  - name: ImpactCenter
    type: Position
  - name: Radius
    type: Float
outputs:
  - name: Falloff
    type: Float
body_hlsl: |
  float d = length(ParticlePosition - ImpactCenter);
  return saturate(1.0 - d / Radius);
```

Generator emits a `.uasset` (binary, requires Unreal commandlet) plus a `.h/.cpp` companion if the Module needs C++ helpers. Realistically this is a UE-native authoring problem and Boilergen would not own it — but the **pattern overlap** is worth documenting for any future "engine-asset generator" sprint. Tagged `relevance_to_grandgames: medium` precisely because the architectural pattern is reusable even if the specific emitter is not on the roadmap.

Adjacent insights worth porting into Boilergen's schema-component design (none of these are blocking, just informed-by):

1. **Strong typing at the parameter boundary is non-negotiable.** Niagara enforces type compatibility at graph-edit time, not at runtime. A user cannot wire a `Float` into a `Position` socket. Boilergen's schema validator (`schema-validator` module) already does the analogous check at YAML parse time — keep enforcing it loudly.
2. **Stage segregation prevents whole classes of bugs.** Niagara won't let an `Emitter Update` Module write to a particle attribute, because particles don't exist at that scope yet. The constraint is enforced by the type system. Boilergen's analogue: phase tags on schema components (`phase: scaffold` vs `phase: api-binding` vs `phase: client-only`) — already partially modelled, worth tightening.
3. **Module versioning with explicit upgrade scripts.** Niagara learned (the hard way) that silent breakage is the worst failure mode. When a Module's input signature changes, the new version owns an upgrade script that migrates old usages. Boilergen schema components should follow suit — a `schema_version` field plus optional `migrations:` block beats silent template breakage.

## 9. Connection to Grand Games / Flump

Medium relevance, conceptual rather than operational:

- **Flump** (Alizhan's personal Unity shooter) does not use UE. Unity's equivalent is the VFX Graph (HDRP/URP), which borrowed heavily from Niagara's Module-graph philosophy — so the patterns transfer.
- **Grand Mobile** (Grand Games' flagship Unity mobile MP) is also Unity. Same VFX Graph story; same mobile-particle-budget caveats from §4.
- **Grand Games' RP / open-source RP work** is FiveM / RedM (no Niagara) and a future possible UE-RP track. If the team ever evaluates UE for a server-RP project, Niagara is the only sanctioned VFX path in UE 5.x.

UE5 Niagara is a **reference architecture** for any modern GPU particle system — the type system, Module composability, and Data Interface boundary are the standard against which Unity VFX Graph, Godot's GPUParticles3D, and any in-house GPU particle work are measured. Filed for completeness; no immediate Boilergen module depends on it.

When evaluating a future tooling track that touches VFX (e.g. an asset-pack emitter, a content-pipeline validator, or a profiler-output parser), the priority order should be:

1. Unity VFX Graph first — Flump and Grand Mobile both run on it.
2. Niagara second — only if a UE-RP project materialises in the Grand Games OSS track.
3. Godot GPUParticles3D third — long tail, niche regional studios.

This ordering matches the project's RP-first / Russian-mobile-MP-first priorities; Niagara sits in the middle band where the patterns inform schema design today even though the engine itself is not on the active roadmap.

## 10. References

- **Epic — Niagara Effects Overview**: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-niagara-effects-for-unreal-engine
- **Epic — Niagara Key Concepts**: https://dev.epicgames.com/documentation/en-us/unreal-engine/key-concepts-in-niagara-effects-for-unreal-engine
- **Epic — Niagara Module Scripts**: https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-niagara-effects-in-unreal-engine
- **Epic — Niagara Data Interfaces**: https://dev.epicgames.com/documentation/en-us/unreal-engine/niagara-data-interfaces-in-unreal-engine
- **Epic — Niagara Scratch Pad Modules**: https://dev.epicgames.com/documentation/en-us/unreal-engine/niagara-scratch-pad-modules-in-unreal-engine
- **Epic — Niagara Performance & Optimization**: https://dev.epicgames.com/documentation/en-us/unreal-engine/niagara-performance-and-optimization-in-unreal-engine
- **GDC 2018 — "Programmable VFX with Unreal Engine's Niagara"** (Wyeth Johnson, Epic) — the original Niagara unveiling talk; defines the Module philosophy.
- **GDC 2021 — "Building Visual Effects for Fortnite Battle Royale"** — production-scale Niagara in a shipping title.
- **GDC 2023 — "Visualizing FORSPOKEN: Niagara at scale"** (Luminous → Niagara migration case study).
- **Lyra Starter Game** (Epic-published, free on Marketplace) — best public example of production Niagara use; weapon impact and ability VFX live in `Content/Effects/Niagara/`. Lyra is the recommended reference instead of pasting engine source (UE EULA bound).
- **Unreal Engine source** — `Engine/Plugins/FX/Niagara/Source/` in the engine tree. Read-only reference for licensees; not mirrored here per EULA.

---

**Cross-references**:
- `knowledge-base/engines/unreal-version-matrix.md` — UE 5.x version-by-version feature support, including Niagara mobile renderer milestones.
- `knowledge-base/engines/unreal-data-asset.md` — the data-asset half of UE's content pipeline; Niagara Systems are themselves PrimaryDataAsset-class.
- `knowledge-base/engines/unity-version-matrix.md` — Unity VFX Graph parallels for Flump / Grand Mobile relevance.
