---
type: engine
slug: unity-urp-mobile-rendering
title: Unity URP 17 — mobile rendering for FPS
engine: unity
content_format: code
language: csharp
license: Unity Companion License (UPM package) / docs from Unity
source_url: https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [unity, urp, render-pipeline, mobile, performance, fps]
---

# Unity URP 17 — mobile rendering for FPS

> Reference for AI Describe / Boilergen sessions that need to emit URP code or
> URP-aware advice for mobile FPS targets. Flump (the local Unity 6.3 LTS
> shooter that drives the `unity-mobile-shooter` Boilergen plugin) ships on
> URP 17.3 + Android/iOS. This entry catalogues the URP-specific knobs that
> matter on mobile, with honest gaps where URP doesn't fully match HDRP
> visual fidelity. Quotes from Unity Manual; sources, not source vendoring.
>
> **Last verified:** 2026-05-03. **Cross-refs:**
> [`unity-version-matrix.md`](./unity-version-matrix.md) (URP-version-per-LTS),
> [`unity-mobile-multiplayer.md`](./unity-mobile-multiplayer.md) (mobile budgets).

## 1. URP 17 version state

- **Current stable:** URP **17.6** (verified 2026-05-03 via
  `https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest`,
  redirects to `@17.6`).
- **Unity engine mapping:**
  - URP 17.0 — Unity 6.0 (Oct 2024)
  - URP 17.1 — Unity 6.1 (Mar 2025)
  - URP 17.2 — Unity 6.2 (Sept 2025)
  - URP 17.3 — Unity 6.3 LTS (Feb 2026) **← Flump**
  - URP 17.6 — current package head (works against Unity 6.x line)
- **Prior LTS line:** URP **14.x** ships with Unity 2022 LTS. The
  17.x → 14.x downgrade gap is large enough that any Boilergen template
  pinned to "URP 17" must guard against 2022-LTS callers.
- **What's new in 17.x vs 14.x worth caring about on mobile:**
  - **Render Graph API** is now the default in URP (was HDRP-only).
  - **GPU Resident Drawer** GA — collapses many small `MeshRenderer` draws
    into batched indirect draws (giant win for mobile RTS / open-world).
  - **Forward+** rendering path matures; **Deferred** finally added in 17.x
    but still discouraged for tile-based mobile GPUs.
  - **STP (Spatial-Temporal Post-processing)** mobile-friendly upscaler.

## 2. URP vs HDRP vs Built-in — why URP for mobile FPS

| Pipeline | Target | Mobile? | Notes |
|---|---|---|---|
| **Built-in (legacy)** | All historical Unity content | Possible but EOL | Unity has stopped feature work. Don't start a new mobile project here. |
| **URP** | Mobile, web, mid-spec PC, switch | **Yes — designed for it** | Forward / Forward+ tile-based, scales down to OpenGL ES 3.0 (URP 17 still supports). Single-pass Forward keeps overdraw cheap. |
| **HDRP** | Console / high-end PC AAA | **No** | Compute-shader heavy, requires SM 5.0+, deferred-only paths, real-time GI presumes desktop GPU bandwidth. Will not run acceptably on mobile. |

**Honest gap:** URP **does not match HDRP visual fidelity**. URP has no
volumetric clouds, no SSGI, no real-time path tracing, no full physically
based volumetric fog (URP 17 added a mobile-friendly fog volume, but it's
not the HDRP volumetric system). Studios that need HDRP-class visuals on
mobile are doing custom shader work, not staying on URP defaults.

For an FPS targeting Standoff 2 / Critical Ops fidelity (the realistic
target for a Russian-market mobile shooter — see
[`unity-mobile-multiplayer.md`](./unity-mobile-multiplayer.md)), URP 17 is
the correct call.

## 3. Renderer Features — mobile cost vs quality

Renderer Features are URP's extension points: a `ScriptableRendererFeature`
asset attached to a `UniversalRendererData` asset, executing extra passes
(SSAO, decals, screen-space shadows, custom blits) at known points in the
frame. On mobile every Renderer Feature has a measurable cost — enable
deliberately, never as defaults.

### SSAO (Screen Space Ambient Occlusion)

- Quality: visible improvement in indoor / cluttered scenes; small effect
  outdoors.
- **Cost:** ~1.5–3 ms on a mid-range Adreno 6xx at 1080p, half-resolution.
  At full res, can reach 4–6 ms — frame-budget-blowing on a 60 FPS target
  (16.6 ms total).
- **Recommended:** **half-resolution** + Performance preset (not Quality).
  Disable on low-end tier. Consider baking AO into lightmaps for static
  geometry instead.

### Screen Space Shadows (Cascade Shadow Maps screen-space resolve)

- URP supports a screen-space shadow resolve pass that smooths cascade
  transitions for the directional light. Looks better than per-fragment
  cascade sampling, costs an extra full-screen pass.
- **Mobile cost:** ~0.8–1.5 ms.
- **Recommended:** OFF on low-end Android, ON for iOS / high-end Android
  if shadows are part of the look.

### Lens Flare (URP 17 Data-Driven Lens Flares)

- Cost is per-flare, dependent on element count. Sun flare with 5 elements
  is ~0.3–0.5 ms.
- **Mobile gotcha:** lens flare overdraw on tile-based GPUs (Adreno, Mali)
  can spike if elements are large and overlap. Tune element scale conservatively.
- **Recommended:** ON at low element counts; reserve for sun + maybe one
  hero light. Disable in cutscene-free combat to recover frame time.

## 4. Shader Graph + Custom Shaders — mobile-friendly URP patterns

URP shaders **must use URP-compatible HLSL includes**, not Built-in
includes. Wrong include = pink shader at runtime.

```hlsl
// URP-compatible vertex/fragment shader skeleton
Shader "Custom/MobileLit" {
    Properties {
        _BaseMap ("Base Map", 2D) = "white" {}
        _BaseColor ("Base Color", Color) = (1,1,1,1)
    }
    SubShader {
        Tags { "RenderPipeline" = "UniversalPipeline" "Queue" = "Geometry" }
        Pass {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            // ... vert + frag implementations
            ENDHLSL
        }
    }
}
```

### Shader Graph mobile patterns

- **Target:** set `Universal` Target with **Lit** master node for PBR, or
  **Unlit** for UI/decals/holograms.
- **Surface Options:** prefer **Opaque** + AlphaClip over Transparent —
  transparent is fillrate-killer on tile-based mobile GPUs.
- **Reduce sample count:** every `Sample Texture 2D` node is a bandwidth
  hit. Pack masks (R/G/B/A channels = 4 grayscale masks) instead of using
  4 textures.
- **Avoid loops in fragment.** Tile-based mobile GPUs serialise ALU per
  thread; loops compound the cost.
- **No tessellation** in URP shader graph for mobile — tessellation
  shaders aren't supported on most mobile GPUs (only top-tier Adreno 7xx /
  Mali Immortalis).

### Custom shader anti-patterns on mobile

- `Standard` shader from Built-in pipeline → **silently won't render**, will
  appear pink.
- `discard;` heavy use → breaks early-Z; always sort opaque vs alpha-test
  geometry layers explicitly.
- `tex2Dlod` / `SampleLevel` in fragment → forces texture cache miss.
- Per-pixel matrix inversion → use vertex space if possible.

## 5. Forward+ vs Deferred — what URP 17 supports, mobile constraints

URP 17 supports **three rendering paths**:

| Path | URP version | Mobile? | When |
|---|---|---|---|
| **Forward** | All | Yes (default) | Single-pass tile-based; cheapest overall, but per-fragment light cost scales linearly with light count. Use when scene has ≤ 4 lights affecting any pixel. |
| **Forward+** | URP 12+ (2022 LTS+) | Yes (recommended) | Tile-based light culling — supports many lights cheaply. **Default for mobile in 2022 LTS+.** Roughly 2× the GPU memory bandwidth of Forward but constant per-light cost. |
| **Deferred** | URP 17+ (Unity 6+) | **Discouraged** | Requires MRT (multiple render targets) — kills bandwidth on tile-based GPUs. Falls back to Forward on devices without proper MRT support. |

**Mobile recommendation:**
- **Forward+** is the right default for a mobile FPS with multiple
  dynamic lights (muzzle flashes, grenades, flashlights).
- **Forward** if your scene is light-baked + ≤ 4 dynamic lights touching
  any pixel.
- **Never deferred on mobile** — even on Adreno 7xx where it works, the
  bandwidth cost defeats tile-based optimisation.

## 6. Lighting — real-time vs baked vs mixed

Mobile FPS lighting is almost always **mixed**: baked indirect lighting
(lightmaps + light probes) + real-time direct lighting (sun + a small
number of dynamic lights).

### Real-time

- Sun (directional) only, with shadows. Every additional real-time shadow-
  casting light adds a full shadow map render pass.
- **Per-pixel light count:** keep ≤ 1 (sun) + 0–2 dynamic. Forward+
  loosens this but still has shadow-pass cost.
- Disable shadows on muzzle-flash / grenade lights — they're sub-second
  and shadows add no visible quality.

### Baked

- **Lightmaps** for static geometry — bake at 20–40 texels/unit on mobile
  (vs 80+ on desktop). Use Progressive GPU Lightmapper.
- Static flag must be set on geometry; dynamic objects skip lightmaps.
- Compress to ASTC 6×6 or BC1 — uncompressed lightmaps eat 50+ MB easily.

### Mixed mode (Subtractive vs Shadowmask)

| Mode | Mobile? | Notes |
|---|---|---|
| **Baked Indirect** | Yes (recommended) | Direct light is real-time, indirect baked. Cheapest for mixed lighting. |
| **Subtractive** | Yes | Dynamic objects get real-time directional shadows; static get baked. Simple, fast, looks worst (single shadow colour). |
| **Shadowmask** | Yes (highest quality) | 4 baked shadow occluders + real-time shadows blended. Higher memory cost (extra texture per light). |

### Light Probes

- Bake **light probes** for dynamic objects in baked-only zones. ~50–200
  probes per typical FPS map level. Probe groups + manual placement at
  doorways and lighting transitions, not auto-generated grids.
- **Reflection probes:** baked, low resolution (64–128 px). Real-time
  reflection probes are bandwidth-prohibitive on mobile.

## 7. Post-processing volumes — mobile ENABLE / DISABLE

URP uses **Volume framework** (component on a GameObject, Global or local,
priority-blended). On mobile, every post-processing effect is a full-screen
pass — costs add up fast. Audit ruthlessly.

| Effect | Cost (mid Android, 1080p) | Mobile recommendation |
|---|---|---|
| **Bloom** | ~1.5–2.5 ms | ENABLE — but **Fast Mode** + low iterations (4). Critical for muzzle flashes / explosions readability. |
| **Tonemapping (ACES / Neutral)** | ~0.3 ms | ENABLE — Neutral on mobile (ACES is more expensive). |
| **Color Grading (LUT)** | ~0.4 ms | ENABLE — bake your look into a 32×32×32 LUT. |
| **Vignette** | ~0.3 ms | OK on iOS / high-end; DISABLE on low-end. |
| **Chromatic Aberration** | ~0.4 ms | DISABLE on mobile — adds nothing players notice. |
| **Lens Distortion** | ~0.5 ms | DISABLE unless gameplay-critical (scope view). |
| **Film Grain** | ~0.5 ms | DISABLE — looks bad at mobile resolutions, costs frame time. |
| **Depth of Field** | ~2–4 ms | DISABLE in gameplay; ENABLE for cutscenes/menus only. |
| **Motion Blur** | ~1.5–3 ms | DISABLE on mobile — at 30 FPS it makes movement look juddery, at 60 the cost isn't worth it. |
| **Auto Exposure** | ~0.6 ms | DISABLE on mobile — use fixed exposure. |
| **SSR (screen space reflections)** | ~3–5 ms | NOT AVAILABLE in URP 17 (HDRP only). |
| **SSGI** | n/a | NOT AVAILABLE in URP 17. |
| **Volumetric Fog** | ~2–4 ms | URP 17 mobile fog volume — ENABLE if look needs it; budget carefully. |

**Default mobile post stack:** Bloom (Fast) + Tonemap (Neutral) + LUT
color grading. That's it. Add anything else only when frame budget allows.

## 8. SRP Batcher + GPU Instancing — when each kicks in

Both reduce CPU draw-call overhead, but they're orthogonal:

### SRP Batcher

- **Active when:** all materials in a batch use the **same shader variant**
  (different material values OK, different shaders or keywords NO).
- **Win:** ~3–10× draw call CPU cost reduction by reusing material
  property buffers per shader.
- **Enable:** Project Settings → Graphics → URP asset → **SRP Batcher** ON
  (default in URP 17 for new projects).
- **Mobile gotcha:** breaks if shader uses `MaterialPropertyBlock` for
  per-instance values — use it for the explicit per-instance case (e.g.
  unique health bar colours), accept the SRP-batcher break.

### GPU Instancing

- **Active when:** same mesh + same material + `enableInstancing = true`
  on material, drawn via `Graphics.DrawMeshInstanced` or marked instanceable.
- **Win:** thousands of identical objects in 1 draw call — perfect for
  bullets, debris, foliage, grass.
- **Mobile gotcha:** OpenGL ES 3.0 supports instancing but with a smaller
  uniform buffer cap (~16 KB) — limits to ~1000 instances per call vs 4000
  on Vulkan/Metal. Batch accordingly.

### GPU Resident Drawer (URP 17 / Unity 6+)

- The new boss tier. Replaces SRP Batcher for static-mesh-heavy scenes.
- Detects compatible renderers automatically and packs them into a single
  GPU-resident batch with indirect draws.
- **Mobile readiness:** GA in URP 17.x but requires SM 4.5+ / Vulkan or
  Metal — won't kick in on OpenGL ES 3.0 fallback path.
- **Enable:** URP asset → Rendering → **GPU Resident Drawer** = `Instanced
  Drawing`.

## 9. Quality Settings — 30/60 FPS tier, render scale, AA

The Quality Settings asset (`ProjectSettings/QualitySettings.asset`)
combined with per-tier URP asset variants is how shipping mobile titles
ship "Low / Medium / High" graphics presets.

### Recommended tier matrix

| Setting | Low (30 FPS Android) | Medium (60 FPS Android) | High (60 FPS iOS / flagship) |
|---|---|---|---|
| **Target framerate** | 30 | 60 | 60 |
| **Render scale** | 0.7–0.85 | 0.85–1.0 | 1.0 |
| **MSAA** | Disabled | 2× | 4× |
| **Anti-aliasing (camera post)** | None | FXAA | SMAA / FXAA |
| **STP (Spatial-Temporal upscaler)** | OFF (cost > win at 30 FPS) | Optional | ON if undersampling |
| **Shadows** | Hard, 1 cascade, 1024 px | Soft, 2 cascade, 2048 px | Soft, 4 cascade, 2048 px |
| **Shadow distance** | 30 m | 50 m | 80 m |
| **Texture quality** | Half-res | Full | Full |
| **Anisotropic filtering** | Disabled | Per-texture | Forced 4× |
| **LOD bias** | 0.7 | 1.0 | 1.0 |
| **Pixel light count** | 1 | 2 | 4 (Forward+) |

### Anti-aliasing choices on mobile

- **MSAA 2×/4×** — best quality vs cost on tile-based GPUs (free in tile
  memory, expensive on resolve). 2× is the mobile sweet spot.
- **FXAA** — cheap shader pass (~0.4 ms). Good fallback when MSAA isn't
  affordable. Slight blur.
- **SMAA** — better edges than FXAA, ~0.8–1.2 ms. iOS-tier only.
- **TAA** — URP 17 supports it but it's controversial on mobile due to
  ghosting at low frame rates. Avoid at 30 FPS.
- **STP** — URP 17 spatio-temporal upscaler. Render at 0.66–0.75× scale,
  upscale with temporal accumulation. Requires stable 60 FPS to look good
  — don't ship at 30 FPS with STP enabled.

## 10. Mobile-specific gotchas — OpenGL ES vs Vulkan, Android driver bugs

### OpenGL ES vs Vulkan on Android

URP supports both. Player Settings → Other Settings → **Graphics APIs for
Android** lets you set the priority order.

| API | Pros | Cons |
|---|---|---|
| **OpenGL ES 3.2** | Universal (every Android device since 2017). Predictable. | Higher driver overhead, no compute on some devices, no proper instancing limits. |
| **Vulkan** | Lower driver overhead, better multi-threading, GPU Resident Drawer support, modern features (compute, indirect draws). | **Driver bugs on older Android.** Some chipsets (early Mali, early Adreno 5xx) have known crashes. |

**Recommended order for mobile FPS in 2026:**
- **Vulkan** primary, **OpenGL ES 3.2** fallback. Test extensively on
  Adreno 5xx, Mali G7x, and any Samsung Exynos device — these are the
  Vulkan-driver pain points.

### Known Android driver bugs to avoid

- **Adreno 5xx Vulkan compute shader hangs** — disable compute paths on
  Snapdragon 6xx-era devices (detect via `SystemInfo.graphicsDeviceName`).
- **Mali Bifrost early-Z bugs with `discard`** — heavy AlphaClip can
  cause visual artefacts. Sort opaque-then-alpha-test layers explicitly.
- **PowerVR (older) tile memory limits** — URP forward+ tile size assumes
  ≥ 16 KB tile memory; older PowerVR can OOM in tile cache.
- **Vulkan + Android 11 instability** — some devices (Samsung Galaxy S9
  / S10 on Android 11) crash on Vulkan compute. Fall back to ES.
- **HDR display chain** — HDR output on Android is patchy; avoid HDR
  swap-chain on mobile, target sRGB.

### iOS specifics

- **Metal only.** No OpenGL ES on iOS since iOS 12 (deprecated) / iOS 17
  (removed).
- Metal is generally more stable than Android Vulkan — fewer
  per-device gotchas.
- **iOS thermal throttling** is aggressive — sustain at 60 FPS for ~10
  minutes then expect throttling. Use `Adaptive Performance` package to
  detect and downgrade quality dynamically.

## Honest gaps and limitations

- **URP does not match HDRP visual fidelity** — no SSGI, no SSR, no
  volumetric clouds, no path tracing. Studios chasing AAA mobile visuals
  do custom shader work outside URP defaults.
- **Vulkan-on-Android is still flaky** on a long tail of devices (Mali
  G7x, older Adreno). Plan for a fallback path and device-detect logic.
- **Render Graph in URP 17** is stable but the migration cost from older
  custom Renderer Features (URP 14) is non-trivial — expect several days
  per custom feature when upgrading from 2022 LTS to 6.3 LTS.
- **No URP equivalent of HDRP's `Lit` master shader fidelity** — URP Lit
  has fewer features (no anisotropy, no clear-coat, no SSS at HDRP
  quality). Custom shader graphs fill the gap.

## How this connects to Boilergen / GamesAI

- The `unity-mobile-shooter` Boilergen plugin (added 2026-05-02) targets
  Unity 6.3 LTS + URP 17.3. When generating `WeaponData` ScriptableObjects,
  it does NOT emit shader assets — those are owned by the user's URP-asset
  configuration and are too project-specific to template.
- Future work (ROADMAP): a `unity-urp-mobile-config` Boilergen target that
  generates a tiered Quality Settings + URP Asset + Renderer Data triple
  (Low/Medium/High) from a single YAML manifest. Saves the manual setup
  this entry catalogues.
- For AI Describe RAG: when a user asks "make this Unity weapon look
  cinematic," check if their project is URP first (Project Settings →
  Graphics → Scriptable Render Pipeline Settings asset). If URP, do not
  recommend HDRP-only effects (SSR, volumetric clouds, SSGI). Suggest
  URP-compatible alternatives (baked reflections, fog volume, SSAO).

## References

- Unity Manual — URP introduction:
  https://docs.unity3d.com/6000.2/Documentation/Manual/urp/urp-introduction.html
- URP package latest:
  https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest
- Unity Mobile Optimization guide:
  https://docs.unity3d.com/Manual/MobileOptimisation.html
- Unity Learn URP courses:
  https://learn.unity.com/search?k=%5B%22q%3Aurp%22%5D
- URP shader writing guide:
  https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.6/manual/writing-custom-shaders-urp.html
- Adaptive Performance (Android thermal management):
  https://docs.unity3d.com/Packages/com.unity.adaptiveperformance@latest
- Local cross-references:
  [`unity-version-matrix.md`](./unity-version-matrix.md) (URP-version-per-LTS),
  [`unity-mobile-multiplayer.md`](./unity-mobile-multiplayer.md) (mobile network / battery budgets),
  `boilergen/plugins/unity-mobile-shooter/` (current plugin assumes URP 17.3).

## License notes

URP package source ships under the **Unity Companion License** (UPM
package). That license permits use of the package with Unity but does
**not** permit redistributing modified copies of Unity-shipped shader
source. Quoting from the docs (as in section 4 above) is fair use for
reference; vendoring `Lighting.hlsl` or any URP shader file into the
GamesAI repo is not. When Boilergen needs URP-aware shaders, generate
them fresh from URP's documented `#include` paths — don't copy URP source.
