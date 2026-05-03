---
type: pattern
slug: bevy-ecs-patterns
title: Bevy ECS — Rust gamedev's pure-data approach to game state
engine: other
content_format: code
language: rust
license: MIT / Apache-2.0
source_url: https://github.com/bevyengine/bevy
last_analyzed: 2026-05-03
maturity: alpha
relevance_to_grandgames: medium
tags: [bevy, rust, ecs, scene-format, hot-reload, data-driven]
---

# Bevy ECS — Rust gamedev's pure-data approach to game state

Research note for the GamesAI knowledge base. Examines what the Bevy engine
does with its ECS and scene format, and which of those ideas are worth
borrowing for Boilergen / RP-studio tooling. **This is not a recommendation
to build on Bevy** — it is a study of patterns.

## 1. Bevy in 2026

Bevy is a free, open-source, data-driven game engine written in Rust. As of
this writing the engine is on **0.18.1** (March 2, 2026), released roughly
two months after **0.18** (January 13, 2026), which itself followed **0.17**
(September 30, 2025). It remains pre-1.0 — the project's own README still
warns of breaking API changes roughly every three months, and the maintainers
have not committed to a 1.0 timeline.

Despite the 0.x label, Bevy is no longer a toy: ~46k GitHub stars, 174
contributors on the 0.18 cycle, and a growing list of *actually shipped*
commercial games. Public examples tracked by `thisweekinbevy.com` include
**Tiny Glade** (Pounce Light, on Steam — castle-building with custom
rendering), **LongStory 2** (Bloom Digital, visual novel), **POLDERS**
(Dutch city-builder), and various Bevy Jam / Ludum Dare entries. The Pounce
Light team has presented Bevy-based rendering tech at the Graphics
Programming Conference. Adoption is indie-scale; no AAA studio uses Bevy in
production.

So: real, growing, technically interesting — but still pre-1.0, still
churning, still niche.

## 2. The ECS architecture in Bevy

Bevy's ECS is the cleanest mainstream implementation of the "pure" ECS
philosophy currently in production use.

- **Entities** are 64-bit IDs. Nothing else. No class, no inheritance, no
  GameObject wrapper. An entity is just an opaque handle.
- **Components** are plain Rust structs that implement the `Component`
  trait. They hold *data only* — no methods that act on world state, no
  virtual dispatch, no lifecycle hooks attached to them.
- **Systems** are plain Rust functions. Bevy inspects each function's
  parameter list at compile time to figure out what data it touches, and
  schedules systems to run in parallel when their data accesses don't
  conflict.

The ergonomic magic comes from a small set of system parameters:

- `Query<&T>` / `Query<&mut T>` — iterate entities that have component `T`.
  Filters like `With<Player>` or `Without<Frozen>` narrow the set without
  reading those components.
- `Res<T>` / `ResMut<T>` — access singleton "resources" (game config, asset
  servers, time).
- `Commands` — deferred world mutations: spawn entities, despawn, insert or
  remove components. Applied at the end of the schedule stage so they don't
  conflict with parallel reads.

A small system that finds wounded players and queues a heal pickup spawn:

```rust
use bevy::prelude::*;

#[derive(Component)]
struct Player;

#[derive(Component)]
struct Health(f32);

#[derive(Component)]
struct HealPickup;

fn spawn_pickups_for_wounded(
    players: Query<(&Transform, &Health), With<Player>>,
    mut commands: Commands,
) {
    for (transform, health) in &players {
        if health.0 < 30.0 {
            commands.spawn((
                HealPickup,
                Transform::from_translation(transform.translation),
            ));
        }
    }
}
```

No inheritance, no manager singletons, no `GetComponent<T>()`. The function
signature *is* the dependency declaration, and Bevy's scheduler reads it
directly.

## 3. Bevy's scene format (`.scn.ron`)

Bevy serializes worlds to **RON** (Rusty Object Notation), a format that
looks like a hybrid of JSON and Rust struct literals. A scene is a list of
entities, each entity is a map of component-type → component-data. Anything
that implements `Reflect` and is registered in the type registry can be
serialized.

A trimmed scene fragment looks roughly like:

```ron
(
  resources: {},
  entities: {
    0: (
      components: {
        "my_game::Player": (),
        "my_game::Health": (45.0),
        "bevy_transform::components::transform::Transform": (
          translation: (0.0, 1.0, 0.0),
          rotation: (0.0, 0.0, 0.0, 1.0),
          scale: (1.0, 1.0, 1.0),
        ),
      },
    ),
  },
)
```

Hot reload is handled by Bevy's `AssetServer` + filesystem watcher: enable
the `file_watcher` cargo feature, edit a `.scn.ron` on disk, and the change
propagates to the running game. The same pipeline serves meshes, textures,
shaders, and any custom asset type.

**Why this matters to GamesAI:** this is the closest thing in the wild to
"a YAML-ish file that *is* the game state, edited by humans, hot-loaded by
the engine." Boilergen's mission — schema-defined entities that compile to
engine-specific code — is conceptually adjacent. Bevy is what the world
looks like if the schema *is* the engine's native format.

## 4. Comparison to Unity DOTS / Unity ECS

Unity introduced DOTS (Data-Oriented Tech Stack) and its ECS in 2018-onwards
as an opt-in alternative to GameObjects/MonoBehaviour. As of 2026 it remains
*hybrid*: most Unity codebases still use GameObjects, and DOTS lives next
to them. This creates real friction:

- Two mental models in one codebase. A `Transform` (MonoBehaviour) and a
  `LocalTransform` (DOTS) are different types with different lifecycles.
- DOTS pulls developers into Burst-compiled jobs, blittable structs, and
  manual archetype thinking — culturally a long way from `MonoBehaviour.Update()`.
- Migrations from MonoBehaviour to DOTS are *project-wide refactors*, not
  drop-ins.

Bevy never had the GameObject/MonoBehaviour model, so it never had to
maintain compatibility with it. Every Bevy developer learns ECS as the
*only* model. There is no hybrid — and culturally, no resistance.

This is a useful lesson for GamesAI: **schema-driven tooling lands easier
in projects whose existing model already matches the schema.** Pushing
DOTS-style data orientation into a MonoBehaviour-heavy Unity RP codebase
will hurt; pushing schema files into a project that already has YAML configs
will not.

## 5. What's worth borrowing for Boilergen / RP studios

Three patterns transfer cleanly:

1. **Pure-data components → schema-driven entity definitions.** A Bevy
   component is a data struct with no behavior. A Boilergen schema entry
   should aim for the same property: pure data, no embedded logic, behavior
   layered on top by generated code. This is already how the
   `boilergen-eight` v3 schemas look; Bevy validates the direction.

2. **Systems-as-functions → rules engine.** Bevy systems are plain
   functions whose signatures declare what they touch. The
   `role-grade-hierarchy.md` pattern entry in this knowledge base describes
   RP rule predicates (e.g., "leader can promote to grade ≤ own − 1"). A
   ruleset shaped like Bevy systems — pure functions over data, with
   declared dependencies — is straightforward to test, reason about, and
   later compile to multiple engines.

3. **Asset hot-reload via watcher → `boilergen --watch`.** Bevy's
   filesystem watcher is small, clear, and immediately useful. A `--watch`
   mode for Boilergen that re-runs codegen when a schema file changes is a
   modest implementation lift and would meaningfully shorten the
   schema-edit → game-test loop. Track this as a future module candidate;
   does not need a sprint of its own yet.

## 6. Anti-patterns / pitfalls

Honest costs of the Bevy approach:

- **Borrow-checker bottlenecks.** Naively designed ECS code can hit Rust's
  aliasing rules — two systems wanting `&mut` the same component, or a
  system wanting `&Transform` and `&mut Transform` for different entities.
  Bevy provides escape hatches (`ParamSet`, `Without` filters,
  `Query::iter_combinations_mut`), but new contributors regularly trip on
  this.
- **API churn.** Every 0.x → 0.x+1 release has breaking changes. Migration
  guides are good, but a Bevy project pinned to 0.13 in 2024 needs real
  work to reach 0.18 in 2026.
- **No 1.0 commitment.** The maintainers have explicitly declined to set a
  1.0 date. This is fine for hobby and indie projects; it is a real risk
  for studios with a multi-year support window.
- **Ecosystem gaps.** Tooling like editors, profilers, and asset pipelines
  is improving (the official Bevy editor work is ongoing) but is years
  behind Unity / Unreal.

For Grand Games and Flump (the two real downstream consumers of GamesAI
tooling per `project_grand_mobile_and_personal_unity.md`), Bevy is **not
production-viable**. Both ship on engines with mature mobile / multiplayer
runtimes; Bevy is neither.

## 7. How this connects to Boilergen

We do **not** need a `boilergen-bevy` plugin. Bevy's audience does not
overlap with the RP / mobile-MP studios Boilergen targets first
(`project_priority_rp_first.md`).

What we *do* take from Bevy is design pressure:

- Keep schema entries pure data; do not let logic creep in.
- Let downstream code generation and runtime layers do the work.
- Watch-mode is a small, high-leverage feature when we get to it.

If a future generic-RP template ever needs an "engine-native scene format"
target — say, generating `.scn.ron` for a Bevy demo of an RP rules engine —
the cost is small because the schema philosophies already align.

## 8. References

- Bevy homepage — `https://bevy.org/`
- Bevy on GitHub — `https://github.com/bevyengine/bevy` (MIT or Apache-2.0,
  ~46k stars, latest 0.18.1, March 2026)
- ECS quick-start — `https://bevy.org/learn/quick-start/getting-started/ecs/`
- Bevy news / release notes — `https://bevy.org/news/`
- This Week in Bevy — `https://thisweekinbevy.com/` (community newsletter
  by chris biscardi; tracks shipping games and ecosystem crates)
- Pounce Light (Tiny Glade) talk at Graphics Programming Conference — see
  TWiB archives
- No GDC 2025 / 2026 sessions on Bevy specifically as of this note's date;
  Bevy presence has been at smaller venues (GP Conference, RustConf, FOSDEM)

## Summary

Bevy is a serious-but-pre-1.0 Rust engine whose ECS and scene format are
the cleanest production-grade examples of the "pure data + functions over
data" approach. GamesAI should not build on it, but should borrow its
schema philosophy and consider a watcher-driven `--watch` mode for
Boilergen when bandwidth allows. Re-evaluate adoption posture if Bevy
reaches 1.0 with a stable API surface.
