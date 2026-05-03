---
type: engine
slug: godot-version-matrix
title: Godot version matrix 3.5 → 4.5 — GDScript v1/v2, scene format, breaking changes
engine: godot
content_format: gdscript
language: gdscript
license: mit
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [godot, gdscript, version-matrix, 3-to-4-migration, mobile, scene-format]
---

# Godot version matrix 3.5 → 4.5

> Reference for version-aware Godot codegen. Used by AI Describe RAG when
> generating GDScript / `.tscn` scene files / project configs. Godot's
> versioning has **one massive break** (3.x → 4.0 in 2023, GDScript syntax
> rewrite + renderer rewrite + scene format changes) and otherwise smooth
> minor releases.
>
> **Versions covered:** 3.5 LTS (legacy), 4.0, 4.1, 4.2, 4.3, 4.4, 4.5
> (current). **Last verified:** 2026-05-03.

## The 3 → 4 wall

The single most important fact about Godot versioning: **Godot 3 and Godot 4 are different engines** that share branding. A Godot 3 project does not open in Godot 4 without a migration tool pass, and even then the migration is ~80% mechanical at best — many APIs renamed, GDScript syntax changed, scene format changed.

| | Godot 3 (3.0 → 3.5 LTS) | Godot 4 (4.0 → 4.5 current) |
|---|---|---|
| **GDScript** | v1 (Python-ish, `setget` keyword, untyped-by-default) | v2 (typed-by-default, `set/get` keyword renamed, `await` instead of `yield`) |
| **Renderer** | GLES2 / GLES3 | Vulkan (default) / OpenGL Compatibility (mobile) |
| **Native scripting** | GDNative (C/C++ via DLL) | **GDExtension** (replacement, ABI-stable) |
| **Scene format `.tscn`** | v1 schema | v3 schema (numbered up by 1 per major release) |
| **Mobile** | OpenGL ES, mature | Vulkan or Compatibility renderer; mature only since 4.2 |
| **Default size** | ~30 MB editor | ~80 MB editor |

A Godot 3 project authored with the godot-2d-platformer Boilergen plugin (current at this commit) **will not open in Godot 4** without manual migration. **Boilergen's `godot-2d-platformer` plugin currently targets Godot 3.5 syntax** for backwards compat with older tutorials; a future `godot-4` sibling plugin should be authored when a real Godot-4 user requests it.

## Per-version sections

### Godot 3.5 LTS (released Aug 2022, supported through ~2025)

- **GDScript:** v1 syntax. Classes use `extends`, members default-public, `setget` for properties.
- **Renderer:** GLES2 (mobile-friendly, low-end devices) and GLES3 (mid-range+). No Vulkan.
- **Native scripting:** GDNative — C++ via shared library + ABI shim. Fragile across versions.
- **Scene format:** `.tscn` v1.
- **Mobile:** Stable Android / iOS targets. Tested on Android 21+, iOS 11+.
- **Notable APIs:** `KinematicBody2D` for platforming, `Area2D` for triggers, `Tween` node, `Particles2D`.
- **End-of-life:** support ended early 2025; security fixes only.

### Godot 4.0 (released March 2023)

**The break.** Almost every API renamed or restructured.

- **GDScript:** v2 syntax. **Typed-by-default**, `setget` removed (use `set`/`get` syntax inline), `yield` → `await`, `tool` → `@tool` (annotation), `export var` → `@export var`, signals connected via `.connect(callable)` not string-based.
- **Renderer:** Vulkan default. OpenGL "Compatibility" renderer for low-end devices.
- **Native scripting:** **GDExtension** replaces GDNative. ABI-stable across Godot 4.x versions.
- **Scene format:** `.tscn` v3.
- **Mobile:** Vulkan on mid-range Android (API 24+), Compatibility renderer fallback on low-end. iOS 13+.
- **Notable APIs:** `CharacterBody2D` (replaces `KinematicBody2D`), `move_and_slide()` returns void (use `is_on_floor()` after), Tween is now `create_tween()` API.
- **Notable removals:** `KinematicBody2D` (renamed `CharacterBody2D`), `Spatial` node (renamed `Node3D`), `Particles2D` (renamed `GPUParticles2D`).

### Godot 4.1 (June 2023)

- **GDScript:** v2 stabilising. Minor type-inference improvements.
- **Renderer:** Movie Maker mode for offline rendering. Render pipeline tweaks.
- **Notable APIs:** Performance Monitor improvements, async resource loader.
- **Mobile:** Vulkan default on Android 31+; Compatibility for older.

### Godot 4.2 (Nov 2023)

- **GDScript:** Typed lambdas, generic-style `Array[Type]` annotations.
- **Renderer:** Mobile Vulkan path matures. Real-world ship-able for mobile. Tile rendering improvements.
- **Mobile:** This is the **first version most studios ship to mobile** with Godot 4. 4.0 and 4.1 had real perf issues on mid-range Android.
- **Notable APIs:** `EditorInterface` improvements for plugin authors.

### Godot 4.3 (Aug 2024)

- **GDScript:** Async signals, fold-out variable annotations.
- **Renderer:** Tighter Vulkan / Metal feature parity. WebGPU experimental.
- **Notable APIs:** `Node.get_tree_string()` for debugging, Web export improvements.

### Godot 4.4 (May 2025)

- **GDScript:** Match-statement enhancements, iterator-pattern improvements.
- **Renderer:** Real-time global illumination tweaks. Compatibility renderer optimisations for the lowest-end Android.
- **Mobile:** Recommended target for new mobile Godot 4 projects in 2025.

### Godot 4.5 (current, late 2025 / early 2026)

- **GDScript:** Stable. No major language additions; bug fixes and performance.
- **Renderer:** Stabilised. WebGPU promoted from experimental.
- **Notable APIs:** Multiplayer — improved `MultiplayerSpawner` / `MultiplayerSynchronizer`. Better high-level networking out of the box.
- **Mobile:** Vulkan + Compatibility both production-stable. **Recommended target for new Godot mobile projects.**
- **Build:** Android target SDK 35 enforced (Play Store mandate). iOS 14+.

## Breaking changes table

| Area | Godot 3.5 | Godot 4.0+ | Workaround / migration |
|---|---|---|---|
| Script keyword | `tool` | `@tool` annotation | Add `@` prefix |
| Property accessors | `setget set_x, get_x` | `var x: int: set = set_x, get = get_x` | Migration tool partial |
| Signal connect | `obj.connect("sig", target, "method")` | `obj.sig.connect(target.method)` | Manual rewrite |
| Async wait | `yield(get_tree(), "idle_frame")` | `await get_tree().process_frame` | Mechanical |
| Export var | `export(int) var x = 0` | `@export var x: int = 0` | Annotation rewrite |
| 3D root node | `Spatial` | `Node3D` | Rename |
| 2D physics body | `KinematicBody2D` | `CharacterBody2D` | Rename + `move_and_slide` API change |
| Particles | `Particles2D` | `GPUParticles2D` | Rename |
| Scene format | `.tscn` v1 | `.tscn` v3 | Save in 4.x to upgrade |
| Renderer choice | GLES2/3 | Vulkan / Compatibility | Project setting + per-asset import options |

## Final version matrix table

Rows = API areas. Columns = supported versions. Cells = recommended call site + 1-line code snippet (this is what AI Describe RAG cites).

| Area | Godot 3.5 LTS | Godot 4.2 | Godot 4.5 (current) |
|---|---|---|---|
| **2D character** | `extends KinematicBody2D` | `extends CharacterBody2D` | (same as 4.2) |
| **2D move** | `move_and_slide(velocity, Vector2.UP)` | `velocity = vel; move_and_slide()` | (same as 4.2) |
| **Signal connect** | `area.connect("body_entered", self, "_on_entered")` | `area.body_entered.connect(_on_entered)` | (same) |
| **Export var** | `export(int) var hp = 100` | `@export var hp: int = 100` | (same) |
| **Tool script** | `tool` keyword line 1 | `@tool` annotation line 1 | (same) |
| **Multiplayer** | `NetworkedMultiplayerENet` (low-level) | `MultiplayerSpawner` / `MultiplayerSynchronizer` (high-level) | (same; improved sync) |
| **Async** | `yield(get_tree(), "idle_frame")` | `await get_tree().process_frame` | (same) |
| **Mobile renderer** | GLES2/3 | Vulkan default; Compatibility fallback | (same; Compatibility tuned) |
| **Web export** | HTML5 export, GLES2 | WebGL2 / WebGPU experimental | WebGPU stable |

## Mobile-readiness flags

| Version | Android | iOS | Recommended for new mobile? |
|---|---|---|---|
| 3.5 LTS | ✅ but old | ✅ but old | ❌ EOL, 4.x is the path |
| 4.0 | ⚠️ rough | ⚠️ rough | ❌ early |
| 4.1 | 🟡 better | 🟡 better | ❌ wait for 4.2 |
| 4.2 | ✅ ship-able | ✅ ship-able | 🟡 OK |
| 4.4 | ✅ | ✅ | 🟡 stepping stone |
| **4.5** | ✅ | ✅ | ✅ **recommended** |

## Backwards-compat recipes for codegen

### GDScript signal connection (3 vs 4)

GDScript has no preprocessor directives. Codegen must pick a target version per project.

**Boilergen pattern**: emit Godot 4.x syntax by default (modern), with a `--godot-3-compat` flag in the plugin to emit 3.x syntax.

```gdscript
# Godot 4.x (default Boilergen output)
func _ready() -> void:
    body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node2D) -> void:
    # ...
```

```gdscript
# Godot 3.5 LTS (legacy --godot-3-compat output)
func _ready():
    connect("body_entered", self, "_on_body_entered")

func _on_body_entered(body):
    # ...
```

### Project settings format

`project.godot` schema differs:

```ini
; Godot 3
config/version=3
[application]
config/name="MyGame"
run/main_scene="res://Main.tscn"
```

```ini
; Godot 4
config_version=5
[application]
config/name="MyGame"
run/main_scene="res://main.tscn"
```

Boilergen's `godot-2d-platformer` plugin's project.godot template should declare `config_version=5` for Godot 4 targets, `config/version=3` for Godot 3.

## Why the godot-2d-platformer Boilergen plugin currently targets Godot 3

(For maintainer reference — the existing `boilergen/plugins/godot-2d-platformer/` plugin templates were authored to match the most-cited beginner tutorials, most of which were for Godot 3.5 LTS at the time of plugin authoring.)

**Action item**: when a real Godot-4 user requests it, fork the plugin to `godot-4-2d-platformer` (sibling pattern, like `unity-rpg` vs `unity-mobile-shooter`). The schema YAML stays the same — only templates change. ETA: ~2 hours of work whenever the demand surfaces.

## How AI Describe consumes this matrix

When the user asks "generate a Godot 4.5 player controller," AI Describe:

1. Loads this entry via RAG (semantic search on "Godot 4" + "player" + "controller")
2. Pulls the **4.5 column** of the version matrix
3. Generates GDScript v2 syntax: `@export`, `extends CharacterBody2D`, `signal.connect(callable)`, `await`
4. If the user says "I'm still on 3.5," AI checks the **breaking changes table** column-by-column and emits 3.x-flavored code

## What this matrix does NOT cover

- **C# scripting in Godot** — Godot 4.0+ supports C# (Mono) but it's a parallel language to GDScript with its own version constraints. Track separately if a real C#-Godot project shows up.
- **GDExtension authoring** — writing C++ extensions is a separate ecosystem
- **Asset import options** (texture compression, audio formats per platform) — non-codegen relevant
- **Editor plugin authoring** — different surface than runtime scripting

## Sources

- Godot Manual: https://docs.godotengine.org/en/stable/
- 3.5 LTS docs: https://docs.godotengine.org/en/3.5/
- 4.0 release notes: https://godotengine.org/article/godot-4-0-sets-sail/
- 4.5 release page: https://godotengine.org/download/
- 3 → 4 migration guide: https://docs.godotengine.org/en/stable/tutorials/migrating/upgrading_to_godot_4.html
- Local cross-references:
  - [`engines/godot-resources.md`](./godot-resources.md) — Godot Resource SO pattern
  - `boilergen/plugins/godot-2d-platformer/` — current plugin assumes Godot 3.5 syntax (action item documented above)
