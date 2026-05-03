---
type: engine
slug: _version-matrix-template
title: Engine version matrix — template
content_format: mixed
language: varies
license: mit
last_analyzed: 2026-05-02
maturity: template
relevance_to_grandgames: meta
tags: [template, engine-versions, version-matrix, codegen, rag]
---

# Engine version matrix — how we document version-aware codegen

> Meta-document. **Do not delete.** This template defines the shape that every `engines/<engine>-version-matrix.md` entry follows. It is consumed by AI Describe RAG to make version-appropriate API choices when generating code, and by future Boilergen template authors to know which preprocessor directives / `#if` blocks to emit.

## Why per-engine version matrices

Unity 2020 ↔ Unity 6.3 differ massively in networking APIs (UNet → MLAPI → Netcode for GameObjects), input handling (legacy `Input` → Input System package), rendering (Built-in → URP/HDRP → Render Graph), and localization. Generating C# that works on one breaks on the other.

Three approaches to handle this in a codegen platform:

| | Pro | Con |
|---|---|---|
| **A. Per-version template directories** (`targets/data-assets-unity-2020/...`, `-unity-2022/...`, `-unity-6.3/...`) | Each version exact | Template explosion: 11 versions × 7 entity types × 4 targets = unmaintainable |
| **B. Conditional compilation in templates** (emit `#if UNITY_2021_OR_NEWER`) | One template, all versions | Only works where engine itself has preprocessor directives |
| **C. Knowledge-base + AI RAG** (this approach) | Zero template churn; AI Describe reads version matrix at generation time and produces correct API calls | AI must be enabled; deterministic templates can't enforce version |

GamesAI uses **C + selective B**: knowledge-base entries are the source of truth on what APIs exist when, AI Describe consults them to write version-correct code, and where the engine supports preprocessor directives (Unity `#if UNITY_X`, FiveM `lua54 'yes'`) templates can hard-code multi-version output.

## Required sections per engine

Every `engines/<engine>-version-matrix.md` entry must contain:

### 1. Coverage statement (top of file)

```
Versions covered: <FROM> through <TO> (LTS only / inclusive of preview / etc.)
Last verified: YYYY-MM-DD against <official source URL>
LTS line vs main line clearly marked
```

### 2. Per-major-version section

For every major version in scope, document:

- **Default scripting/runtime** (e.g. Unity Mono / IL2CPP, Godot GDScript v1/v2)
- **Networking** — what's the recommended path for that version
- **Input** — APIs available, recommended path
- **Rendering** — pipelines available, recommended path for indie
- **Localization** — package status, format, ICU support
- **Build** — mobile relevance, target SDK, native binding gotchas
- **Notable APIs introduced**
- **Notable deprecations from prior version**
- **Mobile readiness** flag (Boolean: ready for Android API X+ / iOS Y+)

### 3. Breaking changes between versions

Tables of the form:

| Area | Before (vX.Y) | After (vA.B) | Workaround |
|---|---|---|---|
| Networking | `using UnityEngine.Networking;` (UNet) | `using Unity.Netcode;` (NGO) | `#if UNITY_2022_OR_NEWER ... #else ... #endif` |

Workarounds should be **codegen-friendly** — explicit preprocessor blocks the template can emit, not "rewrite your code."

### 4. Final version matrix table

Rows = API areas. Columns = supported versions. Cells = recommended call site + 1-line code snippet.

| Area | v1 | v2 | v3 | ... |
|---|---|---|---|---|
| Networking spawn | `NetworkServer.Spawn(go)` | `go.GetComponent<NetworkObject>().Spawn()` | (same) | ... |

This table is what AI Describe RAG cites verbatim when generating code.

### 5. Sources / citations

- Official manual URL per version
- Release notes URL per version
- Date of last verification

## Engines to cover (2020-2026)

Tracked work. Status updates as entries land.

| Engine | Versions in scope | Status | Entry |
|---|---|---|---|
| Unity | 2020 LTS / 2021 LTS / 2022 LTS / 2023.x / 6.0 / 6.1 / 6.2 / 6.3 LTS | ✅ shipped 2026-05-03 | [`unity-version-matrix.md`](./unity-version-matrix.md) |
| FiveM / Cfx.re | manifest 'adamant' / 'cerulean' / 'bodacious' + qb-core / Qbox / ox_core forks | ✅ shipped 2026-05-03 | [`fivem-version-matrix.md`](./fivem-version-matrix.md) |
| Godot | 3.5 LTS / 4.0 / 4.1 / 4.2 / 4.3 / 4.4 / 4.5 | ✅ shipped 2026-05-03 | [`godot-version-matrix.md`](./godot-version-matrix.md) |
| Unreal | UE4.27 / UE5.0 / UE5.1 / UE5.2 / UE5.3 / UE5.4 / UE5.5 / UE5.6 | ✅ shipped 2026-05-03 (RAG-only; no Boilergen plugin yet) | [`unreal-version-matrix.md`](./unreal-version-matrix.md) |
| Bevy (Rust) | 0.10 / 0.11 / ... / 0.16 | ⏳ defer (rapid churn — perhaps a "stick to 0.14 LTS" strategy is more realistic than version matrix) | TBD |
| Roblox / Luau | continuous | ⏳ defer (no current Boilergen plugin) | TBD |
| Photon | Fusion 1/2/3, Quantum 1/2/3 | 🟡 covered partially in `engines/unity-mobile-multiplayer.md` | partial |

The Unity matrix is **first** because Flump (audited 2026-05-02) runs on Unity 6.3 LTS, so it's the most actively-consulted RAG source.

## How AI Describe consumes these entries

When a user asks "generate a Unity weapon controller for Unity 2022 LTS," AI Describe:

1. Loads relevant knowledge-base entries via embedding similarity (RAG)
2. Pulls `engines/unity-version-matrix.md`'s **2022 LTS** section into the system context
3. Generates code using only APIs documented as "available in 2022 LTS"
4. If the user didn't specify a version, AI Describe uses the **most-recent LTS** (e.g. Unity 6.3 LTS at the time of writing)

Concrete behavior: if the user asks "make it work on Unity 2020 too", AI Describe reads the **2020 LTS** column of the version matrix table, identifies what differs from 2022 (e.g. Input System not default), and emits `#if UNITY_2022_OR_NEWER ... #else ... #endif` blocks per the workaround column.

## What this template does NOT cover

- **Plugin / Asset Store package versions** that aren't part of the engine itself (e.g. Photon Fusion 1 vs 2 — that's tracked in `engines/unity-mobile-multiplayer.md`).
- **Custom forks** of engines (e.g. modified Unity for VR-specific platforms).
- **Tooling versions** (Visual Studio, Rider, JetBrains versions) — those are environmental, not codegen-relevant.

## Maintenance cadence

- **Quarterly review** of each entry against the latest LTS / stable release
- **Immediately update** when a major version drops (Unity 7, Godot 5, etc.)
- **Verify links** — official documentation URLs change ~yearly

If an entry hasn't been verified in 6+ months, mark it `STALE` in the frontmatter and prioritise re-verification before AI Describe trusts it.

## Sources

This template synthesises patterns from:

- Microsoft .NET API compat tables (the canonical "version matrix" pattern in software docs)
- React's "browser support matrix" approach
- Unity's own [Unity Manual version selector](https://docs.unity3d.com/Manual/index.html) (drop-down at top of every page)
