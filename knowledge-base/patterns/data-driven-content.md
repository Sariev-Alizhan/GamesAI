---
type: pattern
slug: data-driven-content
title: Data-Driven Content Design
genre: any
engine: any
content_format: any
language: any
license: n/a
source_url: https://gameprogrammingpatterns.com/
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: critical
tags: [philosophy, data-driven, json, yaml, hot-reload, separation-of-concerns]
---

# Data-Driven Content Design

> The umbrella philosophy that every other pattern in this knowledge base is an instance of: **game logic stays in code; game content lives in structured data files** (JSON, YAML, binary blobs, database rows) that the engine reads at startup or runtime.

## What it is

The principle: separate "what the game does" (rules, systems, algorithms — code) from "what's in the game" (entities, parameters, content — data). Designers, balance teams, localizers edit the data; engineers maintain the code that interprets it.

In practice this looks like:
- A `weapons.json` (or `data/weapons/ak47.yaml`, or a Google Sheet exported to CSV) defines damage, fire rate, magazine size for every weapon
- The engine loads these at startup or hot-reloads on file change
- Adding a new weapon = adding a data entry. **No code changes.**

## Why it exists

Content authors (designers, balancers, localizers) outnumber engineers 5–10× on most game teams. Forcing them through code review every time a sword's damage tweaks is a productivity disaster.

The numbers compound. A 5-minute build × 100 balance iterations per week = 8 hours of blocked-on-build time per week, per balance designer. Hot-reload turns that into seconds.

## Where it's used

Essentially every modern AAA engine and most successful indies:
- **id Tech** → Doom Eternal's content pipelines
- **Supercell** mobile titles — economy configs hot-reload from server, no client patch needed
- **Rimworld, Cataclysm DDA, Stardew Valley** — entire game state is JSON/XML
- **Genshin Impact** — characters, weapons, talents all data-driven (server-pushed)

## Tradeoffs

### When it shines
- Content iteration is fast (no rebuild)
- Balance designers are unblocked
- Modding ecosystem follows naturally — community can edit the same data files
- Localization is decoupled from engineering
- A/B testing economies becomes configuration, not deployment

### When it falls apart — the "data DSL trap"

Teams start with simple data. Then they need:
- "If the player is level 10+, drop a different loot table" → adds a `condition` field with a custom string DSL
- "Loop over party members and apply this buff" → adds a `for_each` block to YAML
- "Compute (base * (1 + bonus)) for each item" → embeds expressions in JSON

Each addition seems small. After 6 months you've reinvented a worse Lua. The YAML schema is now a 200-line spec, no syntax highlighting works, errors are inscrutable, and you can't run a debugger on it.

**Symptom:** when content authors start asking for "just one more conditional," it's time to embed a real scripting language (Lua, JavaScript, Python) and stop expanding YAML expressiveness.

CDDA's dialogue conditions are the canonical example — a beautiful intent, escalating to a tarpit by year 5.

## How it informs Boilergen

Boilergen **is** a data-driven authoring tool. The whole architecture endorses this philosophy:
- YAML is the source of truth (`schemas/*.yaml`)
- Templates transform data into per-stack code (the codegen layer is what other teams call an "asset pipeline")
- Plugin authors define **shapes**, not values

### Specific implications

- **Don't extend YAML expressiveness** for control flow. If a generated weapon needs custom logic, that logic goes in handwritten code (or a hand-written `.cpp` file alongside the generated one), not in YAML.
- **Honor the "schemaless `data`" choice.** Boilergen's `schema.data` is intentionally a free-form `Record<string, unknown>` so per-game vocabulary doesn't require core-engine changes. **Different games need different fields, and that's fine.** Don't try to standardize what every "weapon" looks like across games — let plugins decide.
- **AI Describe should treat YAML as canonical.** When the AI emits YAML, it's emitting *content*, not code. Logic lives in handwritten files the developer maintains.
- **Hot-reload is a future feature.** Today Boilergen runs on demand. A future watch mode (`boilergen watch`) for plugins that emit JSON-only outputs would close the loop.

## Anti-patterns / pitfalls

- **Over-modeling.** Teams new to data-driven design try to put EVERYTHING in YAML. Rendering pipelines. Combat resolution. AI behavior. Don't. Data describes content; code describes behavior.
- **Extending the format instead of escaping it.** When YAML feels inadequate, the right answer is "embed a scripting language," not "add another nested syntax."
- **Custom DSL with no tooling.** If you must invent a DSL, make it close enough to a real format (JSON, YAML, Lua) that existing editors and tools work. Don't invent ad-hoc whitespace-sensitive grammars.
- **Schema drift between code and data.** When the loader code expects fields that the data lacks (or vice versa), the bug is silent. **Use schema validation** (Zod, JSON Schema, Cerberus, Pydantic) at load time so this fails loudly.

## References

- **[Game Programming Patterns — Bob Nystrom](https://gameprogrammingpatterns.com/)** — the canonical free book. Read the Component, Type Object, and Service Locator chapters. ~3 hours total.
- **[Data-Oriented Design — Mike Acton, CppCon 2014](https://www.youtube.com/watch?v=rX0ItVEVjHc)** — different but related. About cache layout, not just data/code split. Worth watching once.
- **[Mike Acton's Data-Oriented Design Resources](https://github.com/dbartolini/data-oriented-design)** — collected articles & links.
- **[Cataclysm DDA — JSON_INFO.md](https://github.com/CleverRaven/Cataclysm-DDA/blob/master/doc/JSON_INFO.md)** — see [our entry on CDDA](../games/cataclysm-dda.md) for distilled patterns.
