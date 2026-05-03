---
type: pattern
slug: mobile-fps-performance
title: Mobile FPS performance — frame budget, draw calls, memory, battery
engine: unity
content_format: mixed
language: csharp
license: open patterns
source_url: https://docs.unity3d.com/Manual/MobileOptimisation.html
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: critical
tags: [unity, mobile, performance, fps, optimization, battery]
---

# Mobile FPS performance — frame budget, draw calls, memory, battery

> Concrete optimisation patterns for shipping a 60 FPS mobile FPS on the
> mid-range Android floor that defines the Russian market in 2026 — Snapdragon
> 695 / Mediatek Dimensity 700-tier devices (Galaxy A14, Realme C-series,
> Redmi 12). Open patterns; no engine lock-in. Numbers verified against the
> [Unity Mobile Optimisation manual](https://docs.unity3d.com/Manual/MobileOptimisation.html),
> Arm's [Mobile Studio guidance](https://developer.arm.com/documentation/102179/latest/),
> and Google's [Android GPU Inspector docs](https://developer.android.com/agi).
>
> Cross-links: [`unity-mobile-multiplayer.md`](../engines/unity-mobile-multiplayer.md)
> for networking budget · `unity-urp-mobile-rendering.md` (planned) for the
> URP-specific rendering pass · [`photon-quantum-3.md`](../engines/photon-quantum-3.md)
> for deterministic-sim CPU cost on mobile.

## 1. Frame budget — where the milliseconds actually go

Targets:

| Target FPS | Frame budget | Realistic split (CPU main / CPU render / GPU / GC headroom) |
|---|---|---|
| 60 FPS | **16.6 ms** | 6 / 4 / 5 / 1.6 ms |
| 30 FPS | **33.3 ms** | 12 / 8 / 11 / 2 ms |
| 90 FPS (Pixel 8 Pro tier) | 11.1 ms | 4 / 3 / 3.5 / 0.6 ms |

The four bucket meaning:

- **CPU main thread** — gameplay scripts (`Update`, `FixedUpdate`), animation
  evaluation, physics, AI, networking ticks. This is where Unity scripts run
  by default and where most ship-blocking regressions originate.
- **CPU render thread** — building command buffers, culling, batching,
  uploading transforms. Unity 2022+ default is multithreaded rendering;
  disabling it (`PlayerSettings.MTRendering = false`) sinks main-thread perf.
- **GPU** — vertex + fragment shading, blits, post-processing, UI overdraw.
  On a Snapdragon 695 (Adreno 619) the GPU is the more common bottleneck
  than the CPU; on a Dimensity 700 (Mali-G57 MC2) it is *often* the CPU.
- **GC headroom** — every garbage allocation in the frame eventually triggers
  a Boehm GC pause. On IL2CPP mobile, a 1–2 ms incremental GC slice is
  acceptable; a 30 ms full GC stall is a guaranteed jank spike.

Profiling rule of thumb (Unity Profiler, on-device, **development build**):
if the green CPU bar is consistently above 12 ms at 60 FPS target, you have
~4 ms of unplanned slack and any new feature will push you off-budget.

## 2. Draw call budget — SRP Batcher and instancing

Mid-range Android caps from real shipping titles (Standoff 2, Critical Ops,
PUBG Mobile Lite):

| Tier | Draw call budget per frame | Set-pass calls |
|---|---|---|
| Low-end Android (Adreno 5xx, Mali-G52) | **50–80** | < 30 |
| Mid-range Android (Adreno 619, Mali-G57) | **80–150** | < 60 |
| High-end Android / iPhone 12+ | **200–400** | < 120 |

`SetPass` calls — material/shader changes — cost more than draw calls
themselves. The order is: shader switch > material switch > batched draws.

**SRP Batcher** (URP/HDRP) is the default win: groups draws sharing the same
shader variant into a single command buffer block. Requirements:

- All material properties in a single `CBUFFER_START(UnityPerMaterial) ...
  CBUFFER_END` block.
- No `MaterialPropertyBlock` use (it bypasses the batcher).
- Compatible shader (`#pragma shader_feature` is fine; per-instance overrides
  are not).

When SRP Batcher is not enough, **GPU Instancing** for repeated meshes
(props, foliage, debris). Enable on the material; meshes must share material
*and* mesh instance. Typical win: 200 trees → 1 draw call.

When neither helps (UI, particles): **dynamic batching** still works for
meshes < 300 verts; **static batching** for non-moving level geometry (costs
build-time memory, saves frame-time draws).

## 3. Memory — the 1–2 GB practical APK / RAM ceiling

Practical Android budgets, accounting for the OS, system services, and the
foreground app's process limit:

| Device tier | RAM total | Foreground app limit (heap + native) | Practical asset budget |
|---|---|---|---|
| Galaxy A14 / Redmi 12 (4 GB) | 4 GB | ~1 GB | 700–800 MB |
| Snapdragon 695 mid (6 GB) | 6 GB | ~1.5 GB | 1.0–1.2 GB |
| Flagship Android (8–12 GB) | 8+ GB | ~2.5 GB | 1.8–2.0 GB |
| iPhone 12+ (4–6 GB) | varies | ~2 GB before jetsam | 1.5 GB |

APK / AAB size is a separate concern: Google Play hard cap is 200 MB base
APK + Play Asset Delivery up to 4 GB. Russian-market reality: **mobile data
plans average 12–20 GB/mo**, so install size > 1 GB hurts conversion. Target
< 500 MB base install, rest via Addressables / Asset Bundles fetched on first
boot when on Wi-Fi.

RAM-pressure signals that mean "drop a LOD now":

- `Application.lowMemory` event fires (iOS + Android).
- Native heap (Mali / Adreno textures) trending up frame-over-frame.
- `System.GC.GetTotalMemory(false)` exceeds 250 MB managed heap on a 4 GB
  device.

Mitigation: unload unused Addressables groups (`Addressables.Release`),
flush distant chunks, downgrade texture variants. See
[`unity-addressables.md`](../engines/unity-addressables.md) for the
streaming pipeline.

## 4. Texture compression — pick the format per platform

| Platform | Format | Ratio | Notes |
|---|---|---|---|
| Android (modern, 2018+) | **ASTC 4x4 / 6x6 / 8x8** | 8–32:1 | Variable block size, quality knob; 6x6 is a good default for albedo |
| Android (legacy fallback) | **ETC2 RGBA8 / RGB8** | 4–8:1 | Required for OpenGL ES 3.0 baseline; covers ~99% of Android in 2026 |
| iOS | **ASTC** (or PVRTC for very old) | 8–32:1 | A8+ supports ASTC; PVRTC is legacy |
| Desktop / WebGL2 | **BC7 / DXT5** | 4:1 | BC7 for high quality, DXT5 for size |
| UI sprites (alpha critical) | **ASTC 4x4 / RGBA32 uncompressed** | 1–4:1 | Compression artefacts on text are immediately visible |

In Unity: **per-platform overrides** in the Texture Importer. Set
`Default → Compressed (Low Quality)`, then override `Android → ASTC 6x6`,
`iOS → ASTC 6x6`, `Standalone → BC7`. Build pipeline picks the right
variant per target.

Streaming + Mip Maps: enable **Texture Streaming** (`QualitySettings.streamingMipmapsActive = true`)
on a 4 GB-RAM device — Unity loads only the mip levels currently visible,
typical 30–50% texture-RAM reduction at the cost of a 2-frame load lag when
the camera approaches new geometry.

## 5. Mesh & LOD strategies

**LODGroup** is the baseline: each renderer has 2–4 LODs, Unity swaps based
on screen-space size. Targets per LOD on mobile:

| LOD | Screen size | Triangle count | Use case |
|---|---|---|---|
| LOD0 | > 50% | full (5–15k for a character) | hero asset close-up |
| LOD1 | 20–50% | ~50% of LOD0 | mid distance |
| LOD2 | 5–20% | 10–20% of LOD0 | far distance |
| LOD3 / Impostor | < 5% | billboard / 200-tri proxy | horizon |

**Mesh Combine** for static scene geometry: bake adjacent props into a
single mesh asset at build time, slashes draw calls but increases per-mesh
memory. Use for: rocks in a level chunk, modular wall pieces. Don't use
for: anything that needs independent culling or lightmapping.

**Impostors** (octahedral or billboard) for distant trees/buildings: pre-rendered
sprite atlases that face the camera. Tools: Amplify Impostors, Unity's
[OctahedralImpostors sample](https://github.com/Unity-Technologies/com.unity.demoteam.digital-human).
Trade RAM (atlas) for GPU (vertex transforms).

For an FPS specifically: enemy LOD aggressively. A character at 50 m needs
~1500 tris; close-quarters needs the full ~12k.

## 6. Mobile shaders — the rules

Mobile GPUs (Adreno, Mali, PowerVR) are tile-based deferred renderers. They
hate three things:

- **Branching in fragment shaders.** A dynamic `if` causes both branches to
  execute on the warp. Replace with `step()`, `lerp()`, or precomputed
  shader variants (`#pragma shader_feature`).
- **High overdraw.** Tile renderers re-shade pixels that get covered. Sort
  opaque front-to-back, keep transparent count low, avoid full-screen quads
  in the middle of the pipeline.
- **Unnecessary precision.** Use `half` (fp16) for colour, normals, UVs —
  vertex positions often need `float` (fp32). On Adreno/Mali, fp16 ALUs
  are 2× the throughput of fp32.

Concrete URP rules for a mobile FPS:

- One shader per material category (opaque-character, opaque-environment,
  transparent-FX, UI). Atlas materials so a single draw covers many objects.
- **No real-time shadows** on low-end; baked lighting + a single directional
  light's shadow on hero characters only. Shadow distance: 20–30 m.
- **No screen-space ambient occlusion** at < 60 FPS budget. Use baked AO
  in the lightmap.
- **No bloom / no DOF** on Snapdragon 695-tier; bloom alone can cost 2–3 ms
  GPU on Adreno 619.
- **MSAA off** at 1080p+. Use FXAA — half the cost of MSAA 2×, "good enough"
  for a 6-inch screen.

Atlas materials: pack texture variations into a single material with UV
offsets in the mesh. 50 weapon skins → 1 material → 1 SRP-batched draw
batch.

## 7. Physics — PhysX cost on mobile

Unity uses NVIDIA PhysX on all platforms including mobile. Cost factors:

- **Active rigidbodies**: each sleeping body is ~free; each awake body
  costs solver time. Cap awake bodies per scene at ~50 on mid-range.
- **Continuous collision detection (CCD)**: 5–10× cost of discrete. Reserve
  for projectiles only.
- **Mesh colliders**: convex meshes only on dynamic bodies. Static
  environment can use concave but pre-bake the cooked data (Unity does
  this on import — never call `Mesh.RecalculateBounds` at runtime on a
  collider mesh).

Tuning (`Edit → Project Settings → Physics`):

| Setting | Default | Mobile FPS recommended |
|---|---|---|
| `Fixed Timestep` (Time settings) | 0.02 (50 Hz) | **0.0333 (30 Hz)** for low-end, 0.02 for high-end |
| `Default Solver Iterations` | 6 | **4** for mobile |
| `Default Solver Velocity Iterations` | 1 | 1 |
| `Default Contact Offset` | 0.01 | **0.02** — fewer contact recalculations |
| `Sleep Threshold` | 0.005 | **0.01** — bodies sleep sooner |
| `Auto Sync Transforms` | off | off (must stay off — on costs 2–4 ms/frame) |

`FixedUpdate` at 30 Hz means physics ticks ~half as often as render. For
character controllers that need precise input, run movement in `Update` and
use `Rigidbody.MovePosition` from `FixedUpdate` for collision sweep.

For a 5v5 mobile FPS: ragdolls disabled or limited to 2 active at a time;
weapon recoil simulated as animation, not physics; bullet impact decals as
particle effects, not collider spawns.

## 8. Audio — compressed in-mem vs streaming

Per Unity's [audio compression docs](https://docs.unity3d.com/Manual/class-AudioClip.html):

| Sound type | Load type | Compression | Mobile rationale |
|---|---|---|---|
| One-shot SFX (footsteps, gunshots) | **Decompress on load** | Vorbis Q 70 or ADPCM | Decoded once into RAM; instant playback, no per-play CPU |
| UI clicks, voice lines (short) | **Compressed in memory** | Vorbis Q 70 | Cheap CPU decode at play, small RAM |
| Music | **Streaming** | Vorbis Q 50 | Streamed from disk; no RAM cost beyond a small ring buffer |
| Ambient loops | **Compressed in memory** | Vorbis Q 60 | Small loops decoded on play |
| **Voice chat** | runtime path, not AudioClip | **Opus 16–24 kbps** | Industry standard for low-bandwidth voice; ~3 ms/frame encode on Snapdragon 695 |

Channel limits: cap simultaneous `AudioSource`s at 16 on low-end, 32 on
mid-range. Unity's [`AudioSource.priority`](https://docs.unity3d.com/ScriptReference/AudioSource-priority.html)
controls eviction — set explicit priorities (gunshot = 0, footstep = 128,
distant ambient = 256).

Voice chat: use Opus via Photon Voice 2 or Vivox; never raw PCM (10× the
bandwidth). 16 kbps Opus is intelligible; 24 kbps is "in-game-clear."

## 9. Battery — thermal throttling and sustained load

A mid-range Android device sustains peak GPU load for **~3–5 minutes**
before the kernel thermal governor steps in. After throttle:

- GPU clock drops 30–50% — bloom that was 2 ms costs 4 ms, frame budget
  collapses.
- CPU big cores throttle to medium-cluster speeds — gameplay scripts that
  fit in 6 ms now take 10 ms.
- Battery temperature triggers vibration in some launchers (UX disaster).

Patterns that survive a 20-minute match:

- **Cap framerate**: `Application.targetFrameRate = 60` (or 30 on low-end).
  Free-run uncapped FPS on the menu screen will pin the GPU at 100%.
- **Drop quality after sustained heat**: monitor `Battery.temperature`
  (where exposed) or use a moving average of `Time.smoothDeltaTime`. If
  frame time > 20 ms for 10 s straight, demote a quality level (shadows
  off, half-res post).
- **Vsync off, target framerate on**: vsync forces wait-for-display;
  `targetFrameRate` lets Unity sleep. Battery delta is measurable.
- **Background services off**: location, foreground audio focus when
  inactive. `OnApplicationPause(true)` → drop physics tick, mute audio,
  pause network heartbeat.

Sustained-load testing: run a 20-minute bot match on the **lowest** target
device. Measure FPS p99, battery % drop, and case temperature. Acceptance
criteria from shipping titles: < 8% battery / 20 min, < 42°C case temp,
> 90% of frames at target.

## 10. Profiling on-device

In rough order of usefulness:

- **Unity Profiler** (development build) connected via USB / wireless ADB.
  Frame timeline, CPU sample profiler, GPU usage module. The first stop.
- **Unity Frame Debugger** — step through every draw call in a frame, see
  which renderer issued it and which shader variant. Catches batching
  failures.
- **Unity Memory Profiler** package — heap snapshots, native vs managed
  split, asset attribution. Catches Texture / Mesh leaks that elude the
  CPU profiler.
- **Android GPU Inspector** (AGI) by Google — replaced Snapdragon Profiler
  for most workflows; supports Adreno + Mali + PowerVR. Per-tile heatmaps,
  shader-stall analysis. Free.
- **Snapdragon Profiler** (Qualcomm) — Adreno-only but deepest hardware
  counters; good for shader optimisation on Adreno 6xx/7xx.
- **Mali Graphics Debugger** (Arm) — equivalent for Mali GPUs.
- **Xcode Instruments** (iOS) — Time Profiler, Allocations, Metal System
  Trace. Mandatory for iOS shipping.
- **Perfetto** — Android-wide system trace; useful for "is the OS preempting
  us?" investigations.

Test matrix: profile on the *minimum* spec device (Galaxy A14 in the Russian
market case), not the developer's flagship. A scene that runs at 60 FPS on
a Pixel 8 Pro can collapse to 22 FPS on an A14.

## 11. Networking on mobile

(See [`unity-mobile-multiplayer.md`](../engines/unity-mobile-multiplayer.md)
for the networking-stack landscape; this is the bandwidth/CPU side.)

Per-tick budgets for a 5v5 mobile FPS at 20 Hz tick rate:

| Metric | Target | Rationale |
|---|---|---|
| Snapshot size (out) | < 1.2 KB | Stay under typical MTU 1500 minus headers; one IP packet per tick |
| Tick rate | 20 Hz | 50 ms cadence; 30 Hz on flagship; 10 Hz minimum on low-end |
| Per-player bandwidth | 30–60 KB/s up, 60–120 KB/s down | Sustainable on 4G; ~30 MB / 10-min match |
| Packet loss tolerance | 5% before perceptible | 4G real-world packet loss is 1–3% |
| Round-trip time budget | < 120 ms client→server→client | Beyond this, prediction/rollback becomes mandatory |

Russian-market network reality: 4G coverage is excellent in cities, patchy
in regions; 5G is < 10% of the user base in 2026. **Cellular vs Wi-Fi**:
on cellular, jitter is 30–80 ms typical; on Wi-Fi (especially shared home
APs), jitter spikes to 100–200 ms in evenings. Design for the cellular
case; Wi-Fi will then "just work."

CPU cost of networking on Snapdragon 695:

- Photon Quantum deterministic sim of a 10-player session: ~2 ms/frame.
- FishNet RPC dispatch + serialisation at 20 Hz: ~1 ms/frame.
- NGO at 20 Hz with ~50 NetworkVariables: ~1.5 ms/frame.

These come out of the 6 ms main-thread budget — non-trivial.

Cellular vs Wi-Fi UX: detect via `Application.internetReachability`. On
`ReachableViaCarrierDataNetwork`, drop tick rate to 15 Hz and disable
voice-chat-by-default (asks user opt-in to spend cellular data).

## 12. Russian-market device floor

Real device specs as of Q2 2026 — these are the "must-run-well-on" list
for a Russian-market mobile FPS:

| Device | SoC | GPU | RAM | Price tier (RUB) | Market share notes |
|---|---|---|---|---|---|
| **Samsung Galaxy A14** | Exynos 850 / Helio G80 | Mali-G52 MC2 | 4 GB | 12-15k | Best-selling sub-15k Android in RU |
| **Samsung Galaxy A24** | Helio G99 | Mali-G57 MC2 | 6 GB | 18-22k | Mainstream mid-range |
| **Realme C53 / C55** | Unisoc T612 / Helio G88 | Mali-G57 MC1 | 4–8 GB | 11-15k | Aggressive value play, big in regions |
| **Xiaomi Redmi 12** | Helio G88 | Mali-G52 MC2 | 4 GB | 13-16k | Top-3 by volume in RU |
| **Xiaomi Redmi Note 12** | Snapdragon 685 | Adreno 610 | 6 GB | 17-22k | Mid-range default |
| **Honor X8 / X9** | Snapdragon 680/695 | Adreno 610/619 | 6 GB | 18-25k | Re-emergent post-Huawei split |
| **Tecno / Infinix mid** | Helio G99 / Dimensity 6020 | Mali-G57 | 8 GB | 14-18k | Africa-focused brands gaining RU regional share |

What this floor means for a mobile FPS:

- **Floor SoC**: Helio G88 / Snapdragon 680. Mali-G52 MC2 / Adreno 610.
- **Floor GPU**: ~150 GFLOPS FP32, no real geometry shaders, no compute
  in the hot path.
- **Floor RAM**: 4 GB total → ~700 MB practical asset budget.
- **Floor screen**: 1080×2400 (some still 720×1600 — render at 720p and
  upscale if you want consistent perf).
- **Floor target**: **30 FPS sustained**, 720p render scale, shadows off,
  post off, draw calls < 80, snapshot rate 15 Hz.

Mid-range default (the Redmi Note 12 / Galaxy A24 / Honor X8 cluster):
60 FPS at 1080p with one dynamic light's shadow, simple post (FXAA only),
draw calls 80–150, snapshot rate 20 Hz.

Flagship cap (Galaxy S22+, iPhone 12+, Pixel 7+): 60 FPS at native res with
full quality. *Don't* bother with 90/120 FPS — battery cost is severe and
the perceptible benefit on a 6-inch screen during gunplay is marginal.

## Reference open patterns / repos

- Unity's [Mobile Optimisation manual](https://docs.unity3d.com/Manual/MobileOptimisation.html) — the source of truth for engine-specific guidance.
- Unity's [Optimize your mobile game performance e-book](https://unity.com/resources/mobile-game-optimization-tips-ebook-data-oriented-design) — 80-page deep dive, free, regularly updated.
- Arm's [Mobile Studio docs](https://developer.arm.com/Tools%20and%20Software/Arm%20Mobile%20Studio) — vendor-agnostic profiling concepts.
- Google's [Android GPU Inspector](https://developer.android.com/agi) — frame trace + system trace.
- [Unity-Technologies/BoatAttack](https://github.com/Unity-Technologies/BoatAttack) — the official URP mobile reference scene.
- [Unity-Technologies/MegacityMultiplayer](https://github.com/Unity-Technologies/MegacityMultiplayer) — DOTS + Netcode reference; not mobile-tuned but instructive on draw-call discipline.

## Anti-patterns

- **Profiling on the developer's flagship.** A scene that runs on a Pixel 8
  Pro at 60 FPS has zero predictive value for how it runs on a Galaxy A14.
- **Letting frame rate run uncapped.** Burns battery, generates heat,
  triggers thermal throttling that then violates your real target.
- **Ignoring SRP Batcher requirements.** A single non-conformant material
  silently breaks batching for a whole shader group. Frame Debugger will
  tell you "Batch broken because: ..." — read it.
- **Trusting `Application.systemMemorySize`.** It reports total device RAM,
  not what your process can have. Use the practical-budget table above.
- **Running physics at 50 Hz with 100 awake bodies on a Snapdragon 695.**
  This is a 12-ms-per-frame mistake.
- **Music as decompress-on-load.** A 4-minute Vorbis track decoded into RAM
  is 40 MB. Stream it.
- **Sending 60 Hz snapshots on cellular.** Burns the user's data plan,
  dies in jitter, no perceptible advantage. 20 Hz with delta + interp is
  the right answer.
- **Targeting 60 FPS on the floor device.** 30 FPS sustained is the honest
  Russian-market mid-range target for an FPS. Promise 60 only on mid-range
  and up.

## How this connects to GamesAI / Boilergen

Boilergen's `unity-mobile-shooter` plugin (added 2026-05-02, see
[`unity-mobile-multiplayer.md`](../engines/unity-mobile-multiplayer.md))
generates ScriptableObject data and i18n stubs. A future
`unity-mobile-perf-quality-tiers` codegen target could emit a
`QualitySettings.preset[]` block driven from a YAML manifest — three tiers
(low / mid / high) with the texture / shadow / draw-call budgets above
baked in, plus a `DeviceTier.Detect()` helper that maps SoC string to tier.

Schema-validator could lint against the budget table — flag scenes whose
combined static-batch draw count exceeds the configured tier's budget at
import time, before the build hits a real device. This is the kind of
pre-commit safety net the Russian-market mid-range deserves.
