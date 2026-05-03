---
type: engine
slug: godot-3-to-4-migration
title: Godot 3 → 4 migration cheat-sheet — GDScript v2, scene format, renderer
engine: godot
content_format: code
language: gdscript
license: MIT
source_url: https://github.com/godotengine/godot
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [godot, godot4, gdscript, migration, scene-format, renderer]
---

# Godot 3 → 4 migration cheat-sheet

> Concrete syntax pairs and breaking-change notes for the Godot 3.5 LTS → 4.x
> jump. Companion to `godot-version-matrix.md`. Verified against the upstream
> migration guide and the Godot 4.6.2 / 4.5.2 stable releases (April 2026).

## 1. Why this matters

The Godot 3.5 LTS → 4.x jump is the single largest migration in OSS gamedev
right now: a brand-new Vulkan renderer, a from-scratch GDScript v2 with
typed-by-default semantics, a renumbered scene format, GDNative replaced by
GDExtension, and a high-level multiplayer rewrite. The official upgrade tool
handles maybe 70–80 % of the mechanical churn; the rest — `@tool` editor
plugins, C# projects, custom GDNative modules, networking — is where projects
stall for weeks. Most "should we upgrade?" questions GamesAI users will ask
hit at least three of those walls simultaneously, so this entry is the
canonical reference we point them at before generating any v2 code.

Latest verified stable: **Godot 4.6.2** (2026-04-01) and the parallel
**4.5.2** maintenance line (2026-03-19). Godot 3.6 is the final 3.x release
and is in security-only maintenance.

## 2. GDScript v1 → v2 cheat-sheet

GDScript v2 is closer to a typed Python with annotations than to v1. Every
v1 keyword that read "magical" became an `@`-prefixed annotation, and the
type system actually means something at runtime now.

### Properties: `setget` → `set`/`get` blocks

```gdscript
# Godot 3 (GDScript v1)
var health = 100 setget set_health, get_health

func set_health(value):
    health = clamp(value, 0, 100)

func get_health():
    return health
```

```gdscript
# Godot 4 (GDScript v2)
var health: int = 100:
    set(value):
        health = clamp(value, 0, 100)
    get:
        return health
```

### Tool scripts: `tool` → `@tool`

```gdscript
# Godot 3
tool
extends EditorPlugin
```

```gdscript
# Godot 4
@tool
extends EditorPlugin
```

### Exports: `export` → `@export` (typed)

```gdscript
# Godot 3 — type was a hint, not a contract
export(int) var damage = 10
export(String, "Sword", "Bow", "Staff") var weapon_type = "Sword"
export(NodePath) var target_path
```

```gdscript
# Godot 4 — type comes from the variable, annotation only when needed
@export var damage: int = 10
@export_enum("Sword", "Bow", "Staff") var weapon_type: String = "Sword"
@export var target_path: NodePath
@export_range(0.0, 1.0, 0.01) var volume: float = 0.5
@export_file("*.json") var config_path: String
```

### Coroutines: `yield` → `await`

```gdscript
# Godot 3
func wait_then_fire():
    yield(get_tree().create_timer(1.0), "timeout")
    fire()

# multi-step
func combo():
    yield(animation, "animation_finished")
    yield(get_tree(), "idle_frame")
```

```gdscript
# Godot 4 — first-class signal awaits, no string lookup
func wait_then_fire() -> void:
    await get_tree().create_timer(1.0).timeout
    fire()

func combo() -> void:
    await animation.animation_finished
    await get_tree().process_frame
```

### Typed return types now idiomatic

```gdscript
# Godot 3 — return type was uncommon, often omitted
func _ready():
    pass

func damage(amount):
    return health - amount
```

```gdscript
# Godot 4 — typed signatures are the convention
func _ready() -> void:
    pass

func damage(amount: int) -> int:
    return health - amount
```

### Typed arrays and dictionaries (4.0+ / 4.4+)

```gdscript
# Godot 3 — Array was always Variant-typed
var enemies = []
var scores = {}
```

```gdscript
# Godot 4.0+ typed arrays
var enemies: Array[Node] = []
var scores: Array[int] = [0, 0, 0]

# Godot 4.4+ typed dictionaries
var stats: Dictionary[String, int] = {"hp": 100, "mp": 50}
```

### Lambdas (new in v2)

```gdscript
# Godot 3 — no lambdas, had to make a method
func _ready():
    var btn = Button.new()
    btn.connect("pressed", self, "_on_btn_pressed")

func _on_btn_pressed():
    print("clicked")
```

```gdscript
# Godot 4 — lambdas + Callable-based connect
func _ready() -> void:
    var btn := Button.new()
    btn.pressed.connect(func() -> void: print("clicked"))
```

### Signal connection: string → Signal object

```gdscript
# Godot 3
timer.connect("timeout", self, "_on_timeout", [arg1, arg2])
```

```gdscript
# Godot 4
timer.timeout.connect(_on_timeout.bind(arg1, arg2))
```

### Lifecycle calls — no implicit super

This one bites people. In Godot 4, `_ready()`, `_process()`, `_input()`,
`_notification()` etc. **no longer auto-call the parent's version**. You
must call `super()` explicitly:

```gdscript
# Godot 4
func _ready() -> void:
    super()  # required if parent has logic in _ready
    do_my_thing()
```

### 3D node renames

Every 2D-or-3D-ambiguous node got a suffix in Godot 4:

| Godot 3 | Godot 4 |
|---|---|
| `Spatial` | `Node3D` |
| `KinematicBody` | `CharacterBody3D` |
| `KinematicBody2D` | `CharacterBody2D` |
| `Area` | `Area3D` |
| `RayCast` | `RayCast3D` |
| `Camera` | `Camera3D` |
| `RigidBody` | `RigidBody3D` |

`CharacterBody*D` also replaced the `move_and_slide` return-value pattern with
the `velocity` property + `move_and_slide()` call (no args).

## 3. Scene & resource format

Godot keeps two on-disk forms for scenes and resources:

- **`.tscn` / `.tres`** — text format, human-readable, designed to be
  diff-friendly. Schema version bumped (`format=2` in 3.x, `format=3` in
  4.x). Editing across the boundary by hand is possible but tedious; the
  upgrade tool is the safer path.
- **`.scn` / `.res`** — binary, used by the importer for shipped builds
  (faster load, smaller). Always derived from the text form at import time;
  you do not edit `.scn` directly.

Diff and code-review story is one of Godot's quiet strengths versus Unity
prefab YAML and Unreal `.uasset`: a `.tscn` is plain INI-with-headings, so
PR review of a scene change is actually readable. This stayed true across
the 3 → 4 break — only the `format=` header bumped and node class names
changed.

### Inherited scenes ("inherited from")

In Godot 3.x the inherited-scene chain stored the parent path and a list of
overrides. In Godot 4 the same concept exists but is recorded with explicit
`instance=ExtResource(...)` references at every inherited node, and the
diff tooling handles parent-scene changes more predictably. Most projects
will not notice unless they had deep inheritance chains; those that did
should re-save every inherited scene through the editor after running the
upgrade tool, or risk silent override loss.

### Resource UIDs (4.0+)

Godot 4 added `uid://` references alongside `res://` paths. Renaming a
script or scene now updates references via UID instead of path, which makes
refactors much less destructive — but means a Godot-3 codegen tool that
writes raw `res://` paths into `.tscn` will work, just without the rename
safety net.

## 4. Renderer rewrite

Godot 4 ships **three** renderers; the choice is per-project, not per-scene:

| Renderer | Backend | Target | When to pick |
|---|---|---|---|
| **Forward+** | Vulkan | Desktop, high-end mobile | Default. Clustered forward, full feature set, SDFGI / SSIL / volumetric fog. |
| **Mobile** | Vulkan | Mobile, integrated GPUs | Same Vulkan backend, simpler shading, no clustered lights. Matured around 4.2. |
| **Compatibility** | OpenGL ES 3.0 / WebGL 2 | Old hardware, web export, very low-end Android | Replaces the missing GLES3 fallback. Initially shipped 4.0; matured through 4.2–4.4. |

Two important honest notes:

- **GLES2 is gone for good.** If your Godot 3 project relied on GLES2 to
  ship on ancient Android, there is no Godot 4 path for that hardware. Stay
  on 3.6 or accept the floor lift.
- **Vulkan-only on desktop in early 4.0** caused real pain on older Intel
  iGPUs and Windows machines without modern drivers. The Compatibility
  renderer is the sanctioned answer and works on desktop too as of 4.3+,
  but expect missing features (no SDFGI, no volumetric fog, simpler shadows).

Reduz / Juan Linietsky's blog series on the renderer rewrite is the
canonical "why" reference — see the references section.

## 5. Networking changes

The high-level multiplayer (HLMP) API was rewritten. The Godot 3
`master`/`puppet`/`remote` keyword soup is gone; everything is now
annotation-based and lives on dedicated nodes.

### `@rpc` decorator replaces remote/master/puppet keywords

```gdscript
# Godot 3
remote func shoot(direction):       # any peer can call
    pass

master func take_damage(amount):    # only network master (server) can call
    pass

puppet func sync_position(pos):     # server tells clients
    pass
```

```gdscript
# Godot 4
@rpc("any_peer", "call_local", "reliable")
func shoot(direction: Vector3) -> void:
    pass

@rpc("authority", "call_remote", "reliable")
func take_damage(amount: int) -> void:
    pass

@rpc("authority", "call_remote", "unreliable_ordered", 0)
func sync_position(pos: Vector3) -> void:
    pass
```

`@rpc` arguments: `mode` (`"any_peer"` or `"authority"`), call mode
(`"call_local"` / `"call_remote"`), transfer (`"reliable"` /
`"unreliable"` / `"unreliable_ordered"`), and channel index.

### MultiplayerSpawner / MultiplayerSynchronizer / MultiplayerPeer

Godot 4 introduced two replication nodes that replaced a lot of bespoke
network glue you had to write in 3.x:

- **`MultiplayerPeer`** — the transport. Concrete implementations:
  `ENetMultiplayerPeer` (UDP, default), `WebSocketMultiplayerPeer`,
  `WebRTCMultiplayerPeer`. You assign one to
  `multiplayer.multiplayer_peer` and HLMP routes everything through it.
- **`MultiplayerSpawner`** — declares which scenes are spawnable across the
  network and replicates `add_child` / `queue_free` automatically.
- **`MultiplayerSynchronizer`** — declares a per-property replication
  config (which fields to sync, on spawn vs. on change, with which
  authority). Replaces hand-written "send my position every tick" loops.

For RP-style projects (Grand Mobile-adjacent use cases), this trio is
roughly the Godot answer to FiveM's `TriggerClientEvent` / state-bag
pattern, without the Lua transport layer.

## 6. Things that did NOT migrate gracefully

Being honest about the rough edges, because pretending a migration is
painless is exactly the kind of advice that gets engineers burned:

### C# performance regressions in early 4.x

The .NET 6 port replaced Mono and brought modern C# but came with real
performance regressions in 4.0–4.2 versus Godot 3 Mono — particularly in
hot-loop interop with engine types. The situation improved through 4.3 /
4.4 with `Variant` marshalling fixes. As of 4.5/4.6 it is much better but
still worth profiling if your project is C#-heavy and physics-bound.
**Mobile and Web exports for C# are a moving target** — they were missing
at 4.0, partial at 4.2, and have been progressively restored; verify
against the current release notes before committing a mobile-C# project to
Godot 4.

### GDExtension replaces GDNative

GDNative (Godot 3) and GDExtension (Godot 4) are not source-compatible.
The C++ binding library structure changed, the ABI changed, lifecycle
hooks changed. A non-trivial GDNative module is a **full port**, not a
recompile — budget weeks, not days. The upside is that GDExtension is
ABI-stable across 4.x minor releases, which GDNative never was.

### Godot 3 Mono is EOL

The Godot 3 Mono build line is no longer receiving updates. The official
migration path is "rewrite to .NET 6 on Godot 4," with all the caveats
above. There is no Godot 3.x .NET 6 backport. Pure-GDScript Godot 3
projects can stay on 3.6 indefinitely; C# Godot 3 projects effectively have
to migrate or fork.

### Bullet physics gone

Default 3D physics in Godot 3 had a Bullet backend option; Godot 4 only
ships `GodotPhysics`. Behaviour differs subtly enough that physics-heavy
3D projects need re-tuning.

### Editor plugins

`@tool` scripts that drove editor UI in 3.x broke in essentially every
non-trivial way: signal connection syntax, EditorPlugin API surface, dock
registration. This is the #1 source of "I ran the upgrade tool and the
editor is broken" reports.

## 7. What this means for Boilergen

Concrete implications for our `boilergen-godot` plugin:

- **Default to GDScript v2 with typed annotations.** Generated `.gd` files
  should use `@tool` / `@export` / `await` / `super()` / typed signatures.
  A v1 emission mode is not worth carrying — Godot 3.6 is in security-only
  maintenance and our forward audience is on 4.x.
- **YAML schema → `.tscn` stub generation is feasible.** Because the scene
  format is plain text with a stable line-based grammar, we can emit a
  starter scene from the same YAML that drives the script. `format=3`,
  explicit `[ext_resource]` headers, and `uid://` placeholders that the
  editor will fill on first open.
- **Migration-assistant features are within reach.** A future
  `godot migrate` mode could ingest the user's YAML, detect Godot-3 idioms
  (e.g. `setget`, `yield`, `master`/`puppet`/`remote`, untyped
  `export(int)`), and surface "your YAML targets a Godot 3 idiom; here's
  the v2 equivalent" as a build-time warning. This is a natural sibling to
  the `localization-assistant` and `schema-validator` modules and fits the
  "phased build cadence" rhythm — one module per sprint.
- **Renderer field belongs in the YAML.** `renderer: forward_plus | mobile
  | compatibility` should be a first-class project option so we can emit
  the matching `project.godot` `rendering/renderer/rendering_method`
  setting and warn when a user picks a feature their chosen renderer does
  not support.

## 8. Pitfalls

- **Editor-plugin-heavy projects are the worst case.** If the project
  leans hard on `@tool` scripts, custom EditorPlugins, or third-party
  asset-store editor extensions, plan for the migration to take longer
  than the gameplay code port. Most breakage lives there.
- **Mono ↔ pure-GDScript divergence.** The migration cost gap between a
  pure-GDScript Godot 3 project and a Mono Godot 3 project is roughly an
  order of magnitude. Pure-GDScript hits the script-syntax churn and is
  done; Mono additionally hits the .NET 6 rewrite, the platform-export
  regressions, and any GDNative interop ports.
- **Don't trust the upgrade tool blindly.** It does not back up your
  project. Run on a clean git branch, expect to hand-fix everything
  inside `_ready()`, and re-save every inherited scene by hand.
- **Networking is not a 1:1 port.** The replication-node model (Spawner /
  Synchronizer) is genuinely different from "wire up RPCs and hope" — it
  pays to redesign the replication layer, not translate it.
- **GLES2 hardware is left behind.** If your Russian-market mobile target
  list still includes pre-2014 Android devices, Godot 4 cannot serve them.
  Stay on 3.6 or pick another engine for that tier.

## 9. References

- Official migration guide:
  https://docs.godotengine.org/en/stable/tutorials/migrating/upgrading_to_godot_4.html
- GDScript 2.0 changes:
  https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html
- High-level multiplayer:
  https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html
- Godot release archive (4.6.2 stable, 2026-04-01; 4.5.2 stable,
  2026-03-19): https://github.com/godotengine/godot/releases
- Reduz / Juan Linietsky on the Godot 4 renderer rewrite:
  https://godotengine.org/article/vulkan-progress-report-4 and the
  follow-up clustered-forward posts on the same blog
- Companion entry in this knowledge base:
  `knowledge-base/engines/godot-version-matrix.md` (per-version matrix and
  per-feature flags)
- Companion entry: `knowledge-base/engines/godot-resources.md` (general
  Godot pointers used by codegen)
