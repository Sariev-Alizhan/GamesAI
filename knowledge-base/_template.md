---
type: game | engine | pattern
slug: kebab-case-id
title: Human-readable title
genre: rp | rpg | fps | rts | mobile | sim | mmo | other
engine: unity | unreal | godot | custom-cpp | custom-rust | custom-js | other
content_format: json | yaml | xml | binary | code | mixed
language: cpp | csharp | rust | typescript | python | other
license: open-source license / proprietary
source_url: https://github.com/...
last_analyzed: 2026-MM-DD
maturity: production | alpha | hobby
relevance_to_grandgames: critical | high | medium | low
tags: [profession, weapon, vehicle, modding, ...]
---

# {Title}

> One-paragraph summary: what is this game/engine/pattern, why is it in our knowledge base, what does it teach us.

## Stack & scale

- **Engine / language:** ...
- **Lines of code:** ~XXk (rough)
- **Active contributors:** N (last 12 months)
- **Notable releases / forks:** ...

## Content architecture (the meat)

How does this project define and organize its game entities? This is the
section that informs Boilergen plugins for similar projects.

### Where entities live

- File format(s): JSON / YAML / SQL / generated code / etc.
- Directory layout: ...
- One source of truth or multiple? Pros/cons.

### Entity types we care about (map to our schema.type)

For each that exists in this project:

#### Profession / class / skill
- Field shape: ...
- Add-new-one workflow: ...
- Code generation involved? (Y/N — if yes, how)

#### Weapon / item
- ...

#### Vehicle
- ...

#### NPC / dialogue
- ...

### Localization
- Where stored: ...
- Format: ...

### Add-new-content workflow
- Step-by-step what a contributor does to add (e.g.) a new profession.
- Tooling involved.
- Where the community documentation lives.

## Patterns worth borrowing

Bullet-list of specific architectural decisions we should consider for our
own plugins or for advising users:

- **Pattern X**: brief description, why it works.
- **Pattern Y**: ...

## Anti-patterns / pitfalls

What this project gets wrong, or what made their content pipeline painful.

## How this connects to Boilergen

- What kind of plugin would we write for this stack? (cpp-server / unity-asset / etc.)
- What entity types from this project map cleanly to our `type` field?
- Templates we could build directly from this project's example data.
- Gaps — what does this project do that Boilergen can't yet support?

## References

- Main repo: ...
- Wiki / docs: ...
- Community / modding hub: ...
- Insightful blog posts / GDC talks: ...
