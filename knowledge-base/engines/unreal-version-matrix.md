---
type: engine
slug: unreal-version-matrix
title: Unreal Engine version matrix UE4.27 → UE5.6 — Blueprint/C++ APIs, rendering, networking
engine: unreal
content_format: blueprint-cpp
language: cpp
license: proprietary-engine
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: medium
tags: [unreal, ue5, version-matrix, nanite, lumen, enhanced-input, c++, blueprint]
---

# Unreal Engine version matrix UE4.27 → UE5.6

> Reference for version-aware Unreal codegen. Used by AI Describe RAG when
> generating C++ / Blueprint API surface for plugins targeting specific UE
> versions. UE5.x is **mostly additive** (Nanite, Lumen, Enhanced Input added
> in 5.0; subsequent 5.x releases extend rather than break). The 4 → 5 jump
> is the only major break, and even that is gentler than Unity 2020→2022 or
> Godot 3→4.
>
> **Versions covered:** UE4.27 (last UE4 LTS-equivalent), UE5.0, 5.1, 5.2,
> 5.3, 5.4, 5.5, 5.6 (current). **Last verified:** 2026-05-03.
>
> **Status note for GamesAI:** No Boilergen plugin currently targets Unreal.
> This matrix is documented for **AI Describe RAG completeness** — when a
> user describes "Unreal" in NL, AI Describe should generate version-correct
> code from this matrix. A `unreal-c++` Boilergen plugin would be authored
> when a real UE studio shows interest.

## The 4 → 5 step (relatively gentle)

Unreal's 4 → 5 transition was substantial but **less destructive** than Unity 2020→2022 or Godot 3→4:

- C++ API mostly compatible — most UPROPERTY/UFUNCTION reflection survived
- Blueprint binary format compatible across 4.27 → 5.x (with conversion warnings)
- Most engine plugins recompile against 5.x with minor changes
- Editor UI redesigned; muscle memory broken but no asset loss

What did break:
- **Enhanced Input** replaces legacy Input system (added 5.0, default 5.1+)
- **Chaos Physics** replaces PhysX (added 5.0, default 5.1+)
- Renderer additions: **Nanite** (virtualised geometry) and **Lumen** (real-time GI) require 5.0+
- Some `K2Node_*` blueprint helpers renamed

## Per-version sections

### UE4.27 (released Aug 2021, supported through ~2024)

**Last UE4 LTS-equivalent. Many AAA shipped titles still use this through 2026.**

- **C++ runtime:** UE4 reflection system (UCLASS, USTRUCT, UPROPERTY, UFUNCTION). UnrealBuildTool, UBT modules.
- **Blueprint:** classic Blueprint editor, `K2Node_*` graph editing.
- **Rendering:** legacy renderer. No Nanite, no Lumen. Forward and Deferred shading. Mobile = Forward only.
- **Networking:** UE Replication (well-established). RPC via `UFUNCTION(Server/Client/NetMulticast)`.
- **Input:** Legacy Input system (`InputComponent->BindAction("Fire", ...)`).
- **Mobile:** Android API 21+, iOS 12+. Mobile rendering = Forward path; very different from desktop.
- **Notable APIs:** Niagara VFX system (mature), Chaos preview (off-by-default).
- **End-of-life:** Epic dropped active support late 2024; community forks for compatibility.

### UE5.0 (released April 2022)

**Marquee features that defined the 5.x series introduced here.**

- **C++ runtime:** UE5 reflection (mostly UE4-compatible). Modules build slightly differently.
- **Blueprint:** Same editor with cosmetic updates.
- **Rendering:**
  - **Nanite** (virtualised geometry): introduced. Unconstrained polygon counts for static meshes. **Desktop only at 5.0**, not mobile.
  - **Lumen** (dynamic GI): introduced. Real-time global illumination. Desktop / next-gen console. **Limited / off on mobile.**
  - **Virtual Shadow Maps**: introduced.
- **Networking:** Same UE Replication API.
- **Input:** **Enhanced Input** plugin introduced as recommended replacement for legacy Input. Both work side-by-side at 5.0.
- **Physics:** **Chaos Physics** introduced as default. PhysX deprecation begins.
- **Mobile:** **Nanite NOT supported on mobile at 5.0.** Lumen NOT supported. Mobile sticks to legacy paths.
- **Notable APIs:** World Partition (level streaming for open worlds), MetaHuman, MetaSounds preview.

### UE5.1 (Nov 2022)

- **Rendering:** Lumen + Nanite improvements. Mobile path still legacy.
- **Input:** **Enhanced Input is the default for new projects.** Legacy still works.
- **Notable APIs:** Procedural Content Generation (PCG) framework, Lyra sample-game polished.

### UE5.2 (May 2023)

- **Rendering:** Substrate (next-gen material system) preview. Continued Nanite / Lumen perf work.
- **Networking:** Iris (next-gen replication system) preview.
- **Notable APIs:** Procedural rigging (CR), enhanced Niagara fluid sims.

### UE5.3 (Sept 2023)

- **Rendering:** Skeletal mesh Nanite preview (animated meshes finally Nanite-eligible).
- **Mobile:** Forward Shading Path matures. iOS 14+ supported. Vulkan path on Android improves.
- **Notable APIs:** Mover preview (next-gen character movement framework).

### UE5.4 (April 2024)

**Significant performance + tooling release.**

- **Rendering:** Animation performance improvements, MultiDraw rendering (Nanite). VSM (Virtual Shadow Maps) defaults.
- **Mobile:** Unified mobile renderer makes substantial perf gains.
- **Tooling:** Animator updates, USD pipeline improvements.
- **Notable APIs:** Motion Matching, Modular Game Features (mature).

### UE5.5 (Nov 2024)

- **Rendering:** Mega Lights (clustered lighting), better Lumen scaling.
- **Mobile:** **Mobile Forward Shading + Substrate** (limited). Recommended starting point for shipping mobile.
- **Networking:** Iris replication system stable.
- **Notable APIs:** Animator polished, USD scene description first-class.

### UE5.6 (current — early 2026)

- **Rendering:** Nanite Skeletal Meshes GA (animated Nanite available everywhere). Mega Lights default in feature levels that support it.
- **Mobile:** Full Mobile Substrate support (limited material complexity), Vulkan default.
- **Networking:** Iris is recommended for new projects.
- **Tooling:** AI-powered material assistant (preview); USDZ/glTF round-tripping.
- **Recommended target for new desktop / console projects in 2026.**

## Breaking changes table

| Area | UE4.27 | UE5.0+ | Workaround |
|---|---|---|---|
| Input | `InputComponent->BindAction("Fire", IE_Pressed, this, &APawn::Fire)` | `EnhancedInputComponent->BindAction(FireAction, ETriggerEvent::Triggered, this, &APawn::Fire)` | `#if ENGINE_MAJOR_VERSION >= 5 && ENGINE_MINOR_VERSION >= 1` for Enhanced Input |
| Physics | `UPrimitiveComponent->SetSimulatePhysics(true)` (PhysX backend) | (same API; Chaos backend) | None — API surface preserved; perf characteristics differ |
| Rendering | Forward / Deferred via Project Settings | Add Nanite/Lumen toggles | Project Settings; no codegen impact |
| C++ engine version | `ENGINE_MAJOR_VERSION == 4` | `ENGINE_MAJOR_VERSION == 5` | `#if ENGINE_MAJOR_VERSION >= 5` macro |
| Blueprint asset | UE4 `.uasset` v4 | UE5 `.uasset` v5 | Open in 5.x once to upgrade; no in-place backwards mode |
| Content Browser | UE4 layout | UE5 layout | Editor UI only — no content impact |

## Final version matrix table

Rows = API areas. Columns = key UE versions. Cells = recommended call site + 1-line code snippet.

| Area | UE4.27 | UE5.1 | UE5.5 | UE5.6 (current) |
|---|---|---|---|---|
| **C++ class declaration** | `UCLASS()` (UE4 reflection) | `UCLASS()` (same) | (same) | (same) |
| **Property** | `UPROPERTY(EditAnywhere)` | (same) | (same) | (same) |
| **Server RPC** | `UFUNCTION(Server, Reliable)` | (same) | (same) | (same) |
| **Input action bind** | `InputComponent->BindAction("Fire", IE_Pressed, this, &Fn)` | `EnhancedInputComponent->BindAction(FireAction, Triggered, this, &Fn)` | (same) | (same) |
| **Static mesh** | `UStaticMesh*` (no Nanite) | `UStaticMesh*` (Nanite opt-in via asset settings) | (same; Nanite default-on for high-poly) | (same; Skeletal Mesh Nanite GA) |
| **GI** | Lightmaps, baked | Lumen (default desktop) | (same; Mega Lights) | (same; tuned) |
| **Mobile renderer** | Forward Shading | Forward Shading | Forward + Substrate | Forward + Substrate (default) |
| **Replication** | Native UE Replication | (same) | Iris available | Iris recommended |

## Mobile-readiness flags

| Version | Android | iOS | Recommended for new mobile? |
|---|---|---|---|
| UE4.27 | ✅ but old | ✅ but old | ❌ EOL |
| UE5.0 | ⚠️ rough | ⚠️ rough | ❌ early |
| UE5.2 | 🟡 better | 🟡 better | 🟡 OK |
| UE5.4 | ✅ | ✅ | 🟡 step to 5.5 |
| **UE5.5+** | ✅ | ✅ | ✅ **recommended** |

Note: Unreal mobile shipping is heavier than Unity / Godot mobile. APK / IPA sizes routinely 200MB+. Studios shipping mobile typically use **Unity** for casual / mid-core titles and **UE5** for AAA mobile (e.g. Genshin Impact wasn't UE5 but Tencent's similar AAA titles are).

## Backwards-compat recipes for codegen

UE has rich preprocessor support — `ENGINE_MAJOR_VERSION` / `ENGINE_MINOR_VERSION` macros let one .cpp / .h work across versions.

### Enhanced Input vs Legacy Input

```cpp
#if ENGINE_MAJOR_VERSION >= 5 && ENGINE_MINOR_VERSION >= 1
    // Enhanced Input (UE5.1+)
    if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(InputComponent))
    {
        EIC->BindAction(FireAction, ETriggerEvent::Triggered, this, &APlayerController::OnFire);
    }
#else
    // Legacy Input (UE4.x and UE5.0)
    InputComponent->BindAction("Fire", IE_Pressed, this, &APlayerController::OnFire);
#endif
```

### Module include preamble

```cpp
// Modules must be included differently per version
#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#if ENGINE_MAJOR_VERSION >= 5
#include "EnhancedInputComponent.h"
#endif
```

### Blueprint property exposure

```cpp
UCLASS()
class MYGAME_API AMyActor : public AActor {
    GENERATED_BODY()

#if ENGINE_MAJOR_VERSION >= 5
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Setup")
    TObjectPtr<UStaticMeshComponent> Mesh;  // UE5 prefers TObjectPtr
#else
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Setup")
    UStaticMeshComponent* Mesh;             // UE4 raw pointer
#endif
};
```

`TObjectPtr<>` was added in UE5 as a wrapper around raw `UObject*` for future incremental garbage collection. Currently behaves identically to raw pointer in non-Editor builds; provides verification in Editor.

## How AI Describe consumes this matrix

When the user asks "generate a UE5.5 player controller," AI Describe:

1. Loads this entry via RAG
2. Pulls the **5.5 column** + Enhanced Input row
3. Generates C++ with `UEnhancedInputComponent`, `TObjectPtr<>`, Iris-friendly replication patterns
4. If the user says "needs to also work on UE4.27," AI consults the **breaking changes table** column-by-column and emits `#if ENGINE_MAJOR_VERSION >= 5` blocks per the workaround column

## What this matrix does NOT cover

- **Marketplace plugins** (third-party assets, gameplay frameworks). They have their own lifecycle.
- **UEFN** (Unreal Editor for Fortnite). Different product / different runtime.
- **Verse** language (Fortnite scripting). Separate language ecosystem.
- **Niagara module authoring** (effect plugin development).
- **Custom build tools** (UnrealBuildTool customisation).

## Why no Boilergen Unreal plugin yet

GamesAI's `unity-rpg`, `unity-mobile-shooter`, `godot-2d-platformer`, `generic-rp` plugins exist because of demonstrated demand (Flump for Unity; tutorials for Godot; Grand Mobile for RP). No active studio in our orbit ships UE-based games as of 2026-05.

A `unreal-c++` Boilergen plugin would be authored as a sibling to existing plugins when:
1. A real UE studio shows interest, OR
2. The platform's broader credibility could materially benefit from UE coverage (e.g. for a major launch / showcase)

Until then, this entry serves AI Describe RAG users who ask about UE in natural language without needing dedicated codegen templates.

## Sources

- Epic Unreal Documentation versions: https://dev.epicgames.com/documentation/en-us/unreal-engine
- UE5.0 release: https://www.unrealengine.com/en-US/blog/announcing-unreal-engine-5
- UE5.4 release: https://www.unrealengine.com/en-US/blog/unreal-engine-5-4-is-now-available
- UE5.6 release: https://www.unrealengine.com/en-US/blog/unreal-engine-5-6
- Enhanced Input docs: https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine
- Local cross-references:
  - [`engines/unreal-data-asset.md`](./unreal-data-asset.md) — UE Data Asset pattern
  - [`engines/_version-matrix-template.md`](./_version-matrix-template.md) — entry shape
