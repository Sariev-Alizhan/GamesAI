---
type: pattern
slug: component-based-design
title: Component-Based Design (Classical)
genre: any
engine: unity, unreal, godot, others
content_format: any
language: any
license: n/a
source_url: https://gameprogrammingpatterns.com/component.html
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: high
tags: [unity, unreal, godot, components, oop, composition]
---

# Component-Based Design (Classical)

> The dominant pattern in shipped games today: an entity is a **bag of components**, each carrying both data and behavior, communicating through their host. Composition replaces inheritance hierarchies. **Probably 95% of shipped games today.**

## What it is

An `Entity` (Unity `GameObject`, Unreal `Actor`, Godot `Node`, custom engine's `Entity` class) is a heap-allocated object that owns a list of `Component` objects. Each component:
- Has a focused responsibility (`HealthComponent`, `RigidbodyComponent`, `WeaponHandlerComponent`)
- Can be added/removed at runtime (or design-time)
- Communicates with sibling components on the same entity, sometimes with components on other entities

You compose entities by combining components, not by extending a class hierarchy:
- Player = `Transform` + `Rigidbody` + `Input` + `Health` + `Inventory`
- Zombie = `Transform` + `Rigidbody` + `AI` + `Health`
- Health pickup = `Transform` + `Trigger` + `HealthEffect`

Same `Health` and `Transform` everywhere. **Reuse without inheritance.**

## Why it exists

The pre-component answer was inheritance: `MonsterBase → MeleeMonster → Zombie`. This breaks down at scale:
- `FlyingMeleeMonster` — multiple inheritance? Mixins? A god class with flags?
- Want a flying zombie that's also rideable? Inheritance can't compose features that cross-cut categories.

Components solve this with composition: bolt on a `FlyComponent` to anything that needs to fly. **Orthogonal features stay orthogonal.**

This was the central thesis of Bob Nystrom's *Game Programming Patterns* "Component" chapter — read that for the canonical formulation.

## Where it's used

- **Unity** — every `MonoBehaviour` is a component. The whole engine is built on this model.
- **Unreal** — Actors own ActorComponents (also USceneComponents for transform-aware ones). Same idea, different naming.
- **Godot** — Nodes and the scene tree. A node is a component-with-children.
- **Cocos2d, Defold, Construct** — same pattern, smaller scope.
- **Custom engines** — most do it (including, in spirit, GM1's C++ server, where game logic lives in classes that wrap entity state).

## Tradeoffs

### Vs. inheritance hierarchies
- ✅ Composition over inheritance — orthogonal features stay orthogonal
- ✅ Designers can mix components in the editor without programmer help
- ✅ Easier to refactor — adding a feature is adding a component, not editing a hierarchy
- ❌ Component-to-component communication can be ugly (`GetComponent<HealthComponent>()` calls everywhere)
- ❌ Performance: virtual dispatch, indirection, GC pressure, bad cache locality

### Vs. ECS (Entity-Component-System)
- ✅ Familiar OO ergonomics — everyone gets it
- ✅ Easier debugging (each entity is one debuggable object)
- ✅ Sufficient for most games (RP, RPG, mobile) — perf hits show up at thousands of entities
- ❌ Worse cache behavior, virtual calls, GC churn
- ❌ Harder to parallelize (each component holds state)

For 95% of games, classical components are "good enough" and ECS is over-engineering.

## How it informs Boilergen

Boilergen-generated code typically lives in this world. Our existing GM1 templates produce:
- **`flutter-admin/<entity>_form.dart`** — a Flutter widget (a component in Flutter's tree)
- **`node-api/<entity>.controller.ts`** — a controller (a component of an Express app)
- **`cpp-server/<Entity>.cpp`** — a class that gets composed into a game world

All three are component-style outputs. **Boilergen's templates naturally fit component-based engines** — generate one self-contained piece per entity, drop into a project, register.

### What this means for plugin authors

When writing a Boilergen plugin for Unity, Unreal, or Godot:
- One entity → one component class definition (or two: a definition class + an instance asset)
- The plugin's templates should NOT couple unrelated components — keep `WeaponDefinition` separate from `WeaponBehavior`
- **Naming convention:** suffix-style works well — `<Entity>Controller`, `<Entity>Component`, `<Entity>Behavior`. Already what our cpp/node templates do.

### What it means for AI Describe

When generating YAML, the AI doesn't need to know about components — that's a code-level concern handled by templates. But the AI **should not** try to model "this profession is a child of TaxiDriver which is a child of Driver which is a child of NPC." Inheritance modeling in YAML reintroduces the problem components solve. **Keep entities flat.**

## Anti-patterns / pitfalls

- **God components.** A `GameManagerComponent` that does everything kills the model. Each component should fit on a screen.
- **Hidden dependencies via `GetComponent` chains.** When `WeaponComponent` calls `GetComponent<HealthComponent>().Damage()`, that's a hidden dependency. Make it explicit (constructor-injected, event-based, or DI'd).
- **Inheritance creep.** Some component frameworks (Unity, Unreal) allow inheriting MonoBehaviour/UComponent. Tempting, but each layer of inheritance defeats the composition. Try to keep concrete components flat.
- **Blob components.** A "PlayerData" component with 80 fields isn't a component — it's a struct masquerading as one. Decompose.

## References

- **[Game Programming Patterns — Component chapter](https://gameprogrammingpatterns.com/component.html)** — start here.
- **[Unity manual — Components](https://docs.unity3d.com/Manual/Components.html)**
- **[Unreal Engine — Components](https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine)**
- **[Godot — Nodes and Scenes](https://docs.godotengine.org/en/stable/getting_started/step_by_step/nodes_and_scenes.html)**

## See also

- [`patterns/data-driven-content.md`](./data-driven-content.md) — the orthogonal axis (data vs. code separation, distinct from class composition)
- [`engines/unity-scriptable-object.md`](../engines/unity-scriptable-object.md) — Unity's specific data-asset pattern, often paired with components
