---
type: engine
slug: unity-version-matrix
title: Unity version matrix 2020 LTS → 6.3 LTS — version-aware codegen reference
engine: unity
content_format: csharp
language: csharp
license: proprietary-engine
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: critical
tags: [unity, version-matrix, networking, input-system, render-pipeline, localization, mobile]
---

# Unity version matrix 2020 LTS → 6.3 LTS

> Reference for version-aware Unity C# codegen. Used by AI Describe RAG to
> emit APIs that work on the user's specific Unity version. Per-major
> sections cover scripting/runtime, networking, input, rendering,
> localization, mobile readiness. Final matrix table at the bottom is the
> citation source AI Describe uses for one-line code-snippet decisions.
>
> **Versions covered:** 2020 LTS, 2021 LTS, 2022 LTS, 2023.x (transition),
> Unity 6.0, 6.1, 6.2, 6.3 LTS. **Last verified:** 2026-05-03.

## Coverage statement

This matrix tracks **LTS lines** (2020, 2021, 2022, 6.0, 6.3) as the canonical version targets. Non-LTS releases (2023.x, 6.1, 6.2) are documented for migration reference only — production studios should target an LTS.

**Currently shipped GamesAI plugins assume:**
- `unity-mobile-shooter` plugin (`boilergen/plugins/unity-mobile-shooter/`) — Unity 6.3 LTS (Flump's version)
- `unity-rpg` plugin — Unity 2022 LTS as floor (works on 6.x without changes)

## Per-version sections

### Unity 2020 LTS (released June 2020, support ended Q1 2023)

- **Scripting backend:** Mono (default) / IL2CPP (mobile builds). .NET Standard 2.0.
- **Networking:** **UNet deprecated and removed.** `UnityEngine.Networking` namespace gone. **MLAPI** (early Multiplayer Networking package, before NGO rename) is the recommended path; Mirror is the popular community alternative for 2020-era projects.
- **Input:** Legacy `UnityEngine.Input` class (`Input.GetButton("Fire1")`) is default. New **Input System** package (`com.unity.inputsystem`) available but **opt-in via Project Settings → Player → Active Input Handling**.
- **Rendering:** Built-in Render Pipeline default. **URP** and **HDRP** ship as opt-in packages — choose one at project creation. Switching mid-project is destructive.
- **Localization:** `com.unity.localization` package is **early preview**. Practical i18n in 2020 was hand-rolled JSON readers + custom UI.
- **Mobile:** Android API 21+, iOS 11+ supported. IL2CPP required for shipping.
- **Notable APIs introduced:** Burst compiler stable, Job System matures, Addressables 1.x stable.
- **Known pain points:** rendering pipeline migration is destructive; networking landscape still in flux.

### Unity 2021 LTS (released Aug 2021, support ended Q1 2024)

- **Scripting backend:** .NET Standard 2.1 (vs 2.0 in 2020). Allows `Span<T>`, `ref struct`, async-streams (`IAsyncEnumerable`).
- **Networking:** **Netcode for GameObjects (NGO)** released as **preview** mid-lifecycle, replacing MLAPI. Most studios in 2021–22 stayed on MLAPI; NGO became default in 2022.
- **Input:** Input System package now **strongly recommended**, but legacy still default for backwards compat. Many tutorials still teach `Input.GetButton`.
- **Rendering:** URP improvements: 2D Renderer matures, custom render features. **Render Graph API** appears in HDRP only (not URP yet).
- **Localization:** `com.unity.localization` reaches **1.0** stable. Editor UI for string tables, asset tables, locales. CSV import/export.
- **Mobile:** Android 30 default target SDK. iOS 12+. Universal Render Pipeline becomes the recommended choice for mobile.
- **Notable APIs:** Visual Scripting (renamed from Bolt) integrated. Animation Rigging package matures. Addressables 1.20+.

### Unity 2022 LTS (released April 2022, support ended Q1 2025)

**Most-deployed LTS as of 2026 — many production projects still on this.**

- **Scripting backend:** .NET Standard 2.1 baseline.
- **Networking:** **NGO 1.x is stable and recommended.** MLAPI fully deprecated, gone from package manager. Mirror still used by many existing projects but no longer Unity's path.
- **Input:** Input System **becomes default for new projects** in 2022 LTS (legacy still works). Recommended path: `InputAction` + `InputActionAsset`.
- **Rendering:** URP gets **Forward+ rendering** (alternative to Forward / Deferred) — better performance for many lights on mobile. Render Graph API still HDRP-only.
- **Localization:** Mature 1.4+. Smart strings (string interpolation in localized text), pluralization rules per locale (CLDR), Google Sheets import.
- **Mobile:** Android 31+ target SDK by 2024 due to Play Store policy. ARM64-only builds for Play Store. IL2CPP required.
- **Notable APIs:** UI Toolkit (replacement for IMGUI/uGUI) production-ready for runtime. Cloud Code, Lobby, Relay Unity Services.
- **Notable deprecations from 2021:** MLAPI removed; old Mecanim animation events less common; ParticleSystem.MinMaxCurve API changes.

### Unity 2023.x (non-LTS, April 2023 → 2024 transition)

- **Status:** Transitional. Don't ship on 2023.x — it was the bridge to Unity 6. Either stay on 2022 LTS or jump to Unity 6.
- **Notable:** Multiplayer Services package consolidates Lobby / Relay / Authentication. Sentis (ML inference, replacing Barracuda) preview. GPU Resident Drawer experimental.
- **Mobile:** Same as 2022.

### Unity 6.0 (renamed from 2024.1, October 2024)

**Versioning reset — Unity dropped the "year.major" naming. Unity 6 is the new major.**

- **Scripting backend:** .NET Standard 2.1 still. Roslyn analysers more aggressive in editor.
- **Networking:** **NGO 2.0** stable. New `NetworkManager` API, `NetworkObject` lifecycle changes. Multiplayer Center hub in editor — central place to choose network solution.
- **Input:** Input System default. `InputAction.Performed`, control schemes mature.
- **Rendering:** **GPU Resident Drawer** GA — massive draw-call reduction for many-mesh scenes (huge win for mobile RTS / open-world). **Render Graph API** comes to URP (was HDRP-only). New URP **forward+** lighting improvements.
- **Localization:** 1.5+. Smart Format extension for ICU MessageFormat-style.
- **Mobile:** Android 35 target SDK by 2025. Better thermal throttling controls. **Web platform** back to first-class (WebGPU support).
- **Notable APIs:** Adaptive Performance package mature for mobile thermal management. Cloud Save 3.0.

### Unity 6.1 (March 2025, non-LTS)

- **Status:** Bridge to 6.3 LTS. Don't ship.
- **Notable:** Multiplayer Center polished. Render Graph API more URP samples. Additional Input System enhancements.

### Unity 6.2 (Sept 2025, non-LTS)

- **Status:** Bridge to 6.3 LTS. Don't ship.
- **Notable:** Localization 1.6+ with Crowdin integration. NGO 2.5+ adds fault tolerance.

### Unity 6.3 LTS (Feb 2026, current LTS)

**Current recommended target for new mobile / multiplayer projects. Flump uses 6000.3.3f1.**

- **Scripting backend:** .NET Standard 2.1 baseline. .NET 9 runtime preview for desktop only.
- **Networking:** **NGO 2.9.x** stable. Server Snapshot API, improved ownership transfer, deterministic spawn order.
- **Input:** Input System default. New `EnhancedTouchSupport` API for mobile.
- **Rendering:** URP Render Graph stable. GPU Resident Drawer + Forward+ default for new mobile projects. HDRP for desktop AAA.
- **Localization:** 1.7+. ICU MessageFormat support for plurals/select. Native CLDR plural rules per locale.
- **Mobile:** Android 35 target SDK enforced. iOS 14+. ARM64 only. **IL2CPP required for both platforms.** Visual scripting performance improvements for runtime.
- **Notable APIs:** Multiplayer Center ships pre-configured for NGO + Lobby + Relay default. Quantum 3 Photon also surfaced as recommended option for competitive games.
- **Notable deprecations:** legacy `UnityEngine.Input` officially deprecated (still works but emits warnings). UnityEvent serialization changes.

## Breaking changes table

| Area | Before → After | Workaround |
|---|---|---|
| Networking | UNet `UnityEngine.Networking` (2020) → MLAPI (2021) → NGO 1.x (2022) → NGO 2.x (6.0+) | Use `#if UNITY_2022_3_OR_NEWER` for NGO 1.x; bare NGO 2.x for 6.0+. Migration: replace `using UnityEngine.Networking;` with `using Unity.Netcode;` and update `NetworkBehaviour` lifecycle hooks. |
| Input | `Input.GetButton("Fire1")` (2020) → `InputSystem.actions["Fire"].WasPressedThisFrame()` (2022+) | `#if ENABLE_INPUT_SYSTEM` guards (this define is set by package manager when Input System package installed). |
| Rendering | Built-in (2020) → URP/HDRP opt-in (2021) → URP default (2022) → URP+Render Graph (6.0) | Render Graph: `#if UNITY_6000_0_OR_NEWER` for new API; pre-6 use legacy URP rendererfeature pattern. |
| Localization | hand-rolled JSON (2020) → `com.unity.localization` 1.0 (2021) → ICU plurals (6.0+) | Package version detect via `#if PACKAGE_LOCALIZATION_PRESENT`; specific feature gates require feature-flag checks against package version. |
| Mobile target SDK | Android 21 (2020) → 30 (2021 LTS) → 31 (2022 LTS) → 35 (6.0+, Play Store mandate) | Set explicitly in PlayerSettings; don't rely on "auto" — see `handoff/05-FLUMP-AUDIT.md` task #8. |
| Scripting Define | (none) | `UNITY_2020_3_OR_NEWER`, `UNITY_2021_3_OR_NEWER`, `UNITY_2022_3_OR_NEWER`, `UNITY_2023_1_OR_NEWER`, `UNITY_6000_0_OR_NEWER` |

## Final version matrix table

Rows = API areas. Columns = LTS versions in scope. Cells = **what to use** + 1-line code snippet (this is what AI Describe RAG cites).

| Area | 2020 LTS | 2022 LTS | 6.0 | 6.3 LTS (current) |
|---|---|---|---|---|
| **Scripting runtime** | .NET Standard 2.0 / Mono | .NET Standard 2.1 / Mono+IL2CPP | .NET Standard 2.1 | .NET Standard 2.1, .NET 9 preview |
| **Networking — server start** | `NetworkManager.singleton.StartServer()` (UNet) | `NetworkManager.Singleton.StartServer()` (NGO 1.x) | (same NGO 2.0) | `NetworkManager.Singleton.StartServer()` (NGO 2.9) |
| **Networking — spawn** | `NetworkServer.Spawn(go)` | `go.GetComponent<NetworkObject>().Spawn()` | (same) | (same) |
| **Networking — RPC** | `[Command]` / `[ClientRpc]` (UNet) | `[ServerRpc]` / `[ClientRpc]` (NGO) | (same) | (same; deprecation warnings on legacy) |
| **Input — single button** | `Input.GetButtonDown("Fire1")` | `playerInput.actions["Fire"].WasPressedThisFrame()` | (same) | (same; legacy deprecated warning) |
| **Input — touch** | `Input.GetTouch(0).position` | `Touchscreen.current.primaryTouch.position.ReadValue()` | (same) | `EnhancedTouchSupport.Enable()` + `Touch.activeTouches` |
| **Render pipeline (mobile)** | Built-in (default) | URP (Forward+) | URP + GPU Resident Drawer | URP + GPU Resident Drawer + Render Graph |
| **Localization** | hand-rolled JSON | `LocalizationSettings.StringDatabase.GetLocalizedString(...)` | (same) | (same; ICU plural via `Smart{strings}`) |
| **Build — Android scripting** | Mono OR IL2CPP | IL2CPP recommended | IL2CPP required (Play Store) | IL2CPP required, ARM64-only |
| **Build — iOS scripting** | IL2CPP only | IL2CPP only | IL2CPP only | IL2CPP only |

## Mobile-readiness flags (Boilergen-relevant)

| Version | Android | iOS | Recommended for new mobile project? |
|---|---|---|---|
| 2020 LTS | ✅ but old | ✅ but old | ❌ EOL |
| 2021 LTS | ✅ | ✅ | ❌ EOL |
| 2022 LTS | ✅ | ✅ | 🟡 OK if existing project; otherwise prefer 6.x |
| 6.0 | ✅ | ✅ | 🟡 stepping stone to 6.3 LTS |
| **6.3 LTS** | ✅ | ✅ | ✅ **recommended for all new mobile projects** |

## Backwards-compatibility recipes for codegen

When emitting C# that needs to support multiple Unity versions, use these preprocessor patterns:

### Networking (UNet → NGO migration)

```csharp
#if UNITY_2022_3_OR_NEWER
using Unity.Netcode;
public class PlayerController : NetworkBehaviour {
    public override void OnNetworkSpawn() { /* NGO 1.x+ */ }
}
#else
using UnityEngine.Networking;
public class PlayerController : NetworkBehaviour {
    public override void OnStartServer() { /* UNet legacy */ }
}
#endif
```

### Input system

```csharp
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
private void Update() {
    if (_actions["Fire"].WasPressedThisFrame()) Fire();
}
#else
private void Update() {
    if (Input.GetButtonDown("Fire1")) Fire();
}
#endif
```

### Mobile touch (6.3 LTS Enhanced Touch vs older)

```csharp
#if UNITY_6000_0_OR_NEWER
using UnityEngine.InputSystem.EnhancedTouch;
private void OnEnable() => EnhancedTouchSupport.Enable();
#endif
```

## How AI Describe consumes this matrix

When the user requests "generate a Unity 6.3 weapon controller," AI Describe:

1. Loads this entry via RAG (semantic search on "Unity 6.3" + "weapon" + "controller")
2. Pulls the **6.3 LTS column** of the version matrix table
3. Generates code using only APIs flagged for 6.3 (NGO 2.9, Input System, URP+Render Graph, Enhanced Touch)
4. If user asks to "support 2022 LTS too," AI consults the **breaking changes table**, identifies what differs, emits the appropriate `#if UNITY_X_OR_NEWER` blocks per the workaround column

The result: codegen output that compiles on the user's stated version without manual fixes. This is the value-add over "AI generates Unity code" without version awareness — generic AI emits whatever API it's been trained on, often a mix from different versions that fails to compile.

## What this matrix does NOT cover

- **Asset Store package versions** (Photon Fusion, Mirror, Cinemachine, etc.) — those have their own semver lifecycle. See [`engines/unity-mobile-multiplayer.md`](./unity-mobile-multiplayer.md) for Photon Fusion / Quantum / FishNet comparison.
- **Unity Services backend** (UGS, Cloud Save, Authentication) — service versions are separate from engine versions.
- **Editor extensions / IDE versions** (Visual Studio, Rider).
- **Tech-preview features** that haven't shipped LTS yet (Unity 7, .NET 9 mobile, etc.).

## Sources

- Unity Manual versions selector: https://docs.unity3d.com/Manual/index.html
- 2020 LTS release notes: https://unity.com/releases/editor/whats-new/2020.3.0
- 2022 LTS release notes: https://unity.com/releases/editor/whats-new/2022.3.0
- Unity 6 release announcement: https://unity.com/releases/unity-6
- 6.3 LTS announcement (current): https://unity.com/releases/editor/whats-new/6000.3.0
- NGO release history: https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.9/manual/index.html
- Local cross-references: `engines/unity-scriptable-object.md` (SO patterns), `engines/unity-mobile-multiplayer.md` (multiplayer-specific), `boilergen/plugins/unity-mobile-shooter/` (current plugin assumes 6.3 LTS).
