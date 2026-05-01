---
type: pattern
slug: entity-component-system
title: Entity-Component-System (ECS)
genre: any
engine: any (notable: Bevy, Unity DOTS, Flecs, EnTT)
content_format: any
language: any
license: n/a
source_url: https://github.com/SanderMertens/ecs-faq
relevance_to_grandgames: medium-low for codegen scope (ECS is runtime architecture, not content storage), but worth knowing because misapplying it produces a content schema that doesn't fit the runtime
last_reviewed: 2026-05-01
---

# Entity-Component-System (ECS)

ECS is a runtime architecture pattern where:

- **Entities** are unique IDs (often just integers).
- **Components** are pure data structs attached to entities (no methods).
- **Systems** are functions that operate on all entities matching a component signature.

This is distinct from the older [Component-Based Design](./component-based-design.md) pattern, where components are objects with methods that own their own behaviour. ECS strictly separates data (components) from logic (systems) for cache-locality and parallelism wins.

## Why this matters for Boilergen

ECS is a **runtime** pattern, not a content-storage pattern. But it constrains what your content schemas should look like:

1. **Data-only components map naturally to YAML.** A component is already a flat data struct — that's exactly what a Boilergen schema is. The mapping is trivial.
2. **Composition over inheritance.** ECS forces you to think in terms of "this entity has X, Y, Z components", not "this entity IS-A subtype of Vehicle". Boilergen schemas should follow the same shape: small composable component-like fields, not deep inheritance hierarchies.
3. **Archetypes / prefabs are the content unit.** In ECS-based games, the equivalent of "a profession" or "a weapon" is an archetype — a named bundle of components with default values. This is *exactly* what a Boilergen entity is. The mental model translates 1:1.

## Canonical ECS frameworks

| Framework | Language | Notes |
|---|---|---|
| [Bevy](https://bevyengine.org/) | Rust | Modern, fast-growing, ergonomic |
| [Flecs](https://github.com/SanderMertens/flecs) | C / C++ | Mature, used by many studios |
| [EnTT](https://github.com/skypjack/entt) | C++ | Header-only, very popular in indie C++ games |
| [Unity DOTS](https://unity.com/dots) | C# | Unity's official ECS — coexists with GameObject |
| [Unreal Mass](https://dev.epicgames.com/documentation/en-us/unreal-engine/mass-entity-in-unreal-engine) | C++ | Unreal's ECS for crowds / large simulations |

## Archetype pattern (the content layer)

Most ECS frameworks have a notion of "spawn this entity from a template". The template lists which components the entity should have and their initial values:

```rust
// Bevy example (illustrative)
#[derive(Component)] struct Health(f32);
#[derive(Component)] struct Damage(f32);
#[derive(Component)] struct Magazine(u32);

fn spawn_ak47(commands: &mut Commands) {
    commands.spawn((
        Weapon { id: "ak47" },
        Damage(45.0),
        FireRate(600.0),
        Magazine { capacity: 30, current: 30 },
        Audio::Gunshot,
    ));
}
```

If we wanted to drive this from YAML (which is exactly the Boilergen use case), the template might look like:

```yaml
id: ak47
type: weapon
components:
  Weapon: { id: ak47 }
  Damage: 45.0
  FireRate: 600.0
  Magazine: { capacity: 30, current: 30 }
  Audio: Gunshot
```

This is a stricter shape than our current `data: { ... }` blob — it explicitly names which components attach to the entity. **For an ECS-based game (Bevy, EnTT, DOTS), this would be the correct schema shape.** For a non-ECS game (most traditional engines), the flatter `data:` blob is fine.

## Patterns worth borrowing

### 1. Components are pure data
A Boilergen schema field that's logic-heavy ("calculateAccuracyFromMovement") doesn't belong in the schema — it belongs in code. Schemas describe *what is*, not *what happens*. This aligns with ECS.

### 2. Composition not inheritance
There should be no `weapon.parent: pistol_base` in our schemas. If you want shared values, use composition (`weapon.includes: [audio_pack_pistol]`) or template inheritance at the codegen level. Inheritance in content data is a maintenance trap.

### 3. Archetype = entity type
Boilergen's `type: weapon` field is an archetype name. The data blob is the per-instance values. This already matches ECS thinking.

## Patterns to avoid

- **Don't model inheritance in YAML.** "Sniper rifle extends rifle extends weapon" sounds clean but hits the same problems as deep class hierarchies — distant changes break unrelated entities. Composition or codegen-time merging is safer.
- **Don't put behaviour in the schema.** No callbacks, no script paths inside the data block (game engines that allow this are sources of bugs). Codegen output can reference scripts by ID; the schema itself stays pure data.
- **Don't conflate components with entities.** A `Health` component is not an entity — it's a property of one. If your YAML has top-level `id: health_for_taxi_driver`, you're modelling at the wrong granularity.

## When ECS doesn't fit

Most existing commercial engines (Unity GameObject, Unreal Actor, Godot Node) are *not* pure ECS. They use the older [Component-Based Design](./component-based-design.md) pattern (objects with methods). For these engines, the simpler flat `data:` blob is more honest — pretending to do ECS in a non-ECS engine adds overhead without the cache wins.

GM1's stack (custom C++ + Node + Flutter) **probably isn't ECS** unless Igor explicitly built it that way. Default to the flat `data:` schema. Revisit if a future plugin targets Bevy / DOTS / Mass.

## Related entries

- [Component-Based Design](./component-based-design.md) — the older OO-flavoured cousin
- [Data-Driven Content Design](./data-driven-content.md) — the umbrella

## Sources

- [ECS FAQ by Sander Mertens (Flecs author)](https://github.com/SanderMertens/ecs-faq) — canonical reference
- [Bevy book](https://bevyengine.org/learn/) — modern Rust ECS
- [Game Programming Patterns: Component](https://gameprogrammingpatterns.com/component.html) — pre-ECS history
