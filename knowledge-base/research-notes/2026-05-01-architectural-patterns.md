---
type: research-notes
date: 2026-05-01
agent: architectural-patterns-survey
status: complete
---

# Architectural patterns in gamedev — synthesis (2026-05-01)

> Output of a research run on canonical entity/content architecture patterns. Distilled key takeaways below.

## Top 8 patterns (priority order for Boilergen)

1. **Data-driven design** (umbrella philosophy)
2. **ScriptableObject pattern** (Unity)
3. **DataAsset / DataTable pattern** (Unreal)
4. **Entity-Component-System** (ECS — Unity DOTS, Bevy, Unreal Mass)
5. **Component-based design** (classical, pre-ECS — 95% of shipped games)
6. **Asset pipelines & codegen integration**
7. **Modding architecture** (overlay vs plugin vs data-only)
8. **Save/load and content schema versioning**

Full details in entries under `knowledge-base/patterns/` and `knowledge-base/engines/`.

## Cross-cutting insights (most important)

- **Everyone separates schema definition from instance data, but they all do it differently.**
  - Unity: schema in `.cs` (code), instance in `.asset` (binary).
  - Unreal: schema in `UCLASS`/`USTRUCT` C++, data in `.uasset`.
  - Cataclysm DDA: schema implicit-in-the-loader, instance data in JSON.
  - ECS: schema in component struct definitions, instance data in flat archetype storage.
  - **Boilergen unifies these via Zod schema + YAML — that's our differentiator.**

- **Binary asset formats lose to text formats in git-heavy workflows.** Every team using ScriptableObjects or DataAssets eventually adds a JSON/YAML import layer to escape merge hell. **Permanent tailwind for our YAML-first approach.**

- **The "data DSL trap" recurs.** Teams start with simple data, then need conditionals (skipIf), then loops, then expressions, and reinvent a bad scripting language. CDDA's dialogue conditions, behavior trees in JSON, etc. **Lesson: when content needs control flow, embed Lua/JS, don't extend YAML.**

- **ECS adoption is structural, not aesthetic.** Teams move to ECS for performance with thousands of entities (RTS, simulation, large-scale physics). RP/RPG with hundreds of entities don't need it. **GG should not adopt ECS unless GM2 hits a perf wall.**

- **Modding ecosystems boost long-tail content massively.** Skyrim, CDDA, Stardew Valley, Factorio — community content libraries dwarf the original game. Boilergen Hub will inherit these dynamics if we ship plugin marketplace.

## Verdict for Grand Games

GM1's stack is custom C++ + Node + Flutter — none of the engine-specific patterns (ScriptableObject, DataAsset, Godot Resource) apply directly to GM1. So:

**Study deeply:**
- Data-driven design (umbrella philosophy you already half-embody)
- Cataclysm DDA's content layer (already in our base — closest cousin to GM1)
- Modding architecture (overlay model — directly relevant to Boilergen Hub roadmap)
- Schema versioning (becomes load-bearing once plugins are shared)

**Study lightly (one entry each, not deep dives):**
- ScriptableObject + DataAsset — for when we write Unity/Unreal plugins

**Skip / deprioritize:**
- ECS — irrelevant unless GM2 architecture changes radically. Don't burn time.
- Godot Resources — similar shape to ScriptableObject, smaller audience.

## Sources (reading list)

- [Game Programming Patterns by Robert Nystrom](https://gameprogrammingpatterns.com/) — free online; Type Object + Component patterns
- [Data-Oriented Design (Mike Acton, CppCon 2014)](https://www.youtube.com/watch?v=rX0ItVEVjHc) — strict cache-layout discipline
- [Overwatch ECS Deep Dive (GDC 2017)](https://www.gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and) — canonical case study
- [Bevy 0.18 release](https://bevy.org/news/bevy-0-18/) — current state of ECS
- [Unity DOTS roadmap (March 2026)](https://discussions.unity.com/t/coreclr-scripting-and-ecs-status-update-march-2026/1711852)
- [Unity ScriptableObject manual](https://docs.unity3d.com/Manual/class-ScriptableObject.html)
- [Unreal Asset Manager / DataTables](https://dev.epicgames.com/documentation/en-us/unreal-engine/data-driven-gameplay-elements-in-unreal-engine)
- [Cataclysm DDA JSON_INFO.md](https://github.com/CleverRaven/Cataclysm-DDA/blob/master/doc/JSON_INFO.md) — canonical content modding reference
- [Stardew Valley + SMAPI modding](https://stardewvalleywiki.com/Modding:Index)
