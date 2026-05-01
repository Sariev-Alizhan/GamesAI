---
type: sources
slug: external-resources
title: External Gamedev Resources — curated directory
date_collected: 2026-05-01
maintainer: Alizhan
---

# External Gamedev Resources

A curated directory of external gamedev resources discovered during knowledge-base research. Organized by category. Not a comprehensive list — only entries we'd actually use as starting points for further analysis or as references in conversations.

## How this fits into Boilergen

Three downstream uses:

1. **Source-mining for new knowledge-base entries** — awesome-lists below point at hundreds of open-source games and engines we haven't analyzed yet. When we want to add a new entry to `/knowledge-base/games/`, this is the first place to look.
2. **AI Describe context** — when AI Describe gets RAG'd in a future phase, these external resources become candidate retrieval targets (selectively, with attribution).
3. **Strategic outreach (Phase 5)** — the publishers directory becomes useful when Boilergen has traction and we want to talk to studios about adoption.

---

## Category 1 — Awesome lists for gamedev

GitHub "awesome" lists are curated indexes of resources for a topic. The ones below cover gamedev specifically.

| List | Scope | Why useful |
|---|---|---|
| [notpresident35/awesome-learn-gamedev](https://github.com/notpresident35/awesome-learn-gamedev) | Learning gamedev (general) | Best starting point for someone new to gamedev. Source-rich for our knowledge base. |
| [insthync/awesome-unity3d](https://github.com/insthync/awesome-unity3d) | Unity-specific | Some entries dated, but the ScriptableObject / DataAsset patterns we'd care about are evergreen. |
| [StefanoCecere/awesome-opensource-unity](https://github.com/StefanoCecere/awesome-opensource-unity) | Open-source Unity projects | Direct candidates for new `knowledge-base/games/` entries on the Unity side. |
| Search: [`awesome` topic on GitHub](https://github.com/search?q=awesome&type=repositories) | Anything | Use with `gamedev`, `unity`, `godot`, `unreal`, `bevy` qualifiers to filter. |

**For our knowledge base:** the awesome-opensource-unity list is the highest-priority follow-up — it gives concrete repos to analyze for Unity entries (we currently only have the abstract ScriptableObject pattern, no concrete game).

## Category 2 — Asset resources (3D / 2D / audio)

For when we (or someone using Boilergen) needs free or paid assets.

| Resource | Type | Notes |
|---|---|---|
| [devanshutak25/3d-resources](https://github.com/devanshutak25/3d-resources) | 3D / 2D / gamedev resources directory | Active work-in-progress (Nov 2025). Worth bookmarking, not yet comprehensive. |
| [freegameassets.com](https://www.freegameassets.com/) | Free 2D/3D assets | Mentioned alongside the directory above. |
| [freesound.org](https://freesound.org/) | Free sounds | Standard reference for SFX. CC-licensed. |
| [knell.medieval.software](https://knell.medieval.software/) | Sound effect synthesizer | Generates SFX procedurally. Free. |
| [Live2D](https://www.live2d.com/) | 2D skeletal animation | Industry-standard for stylized 2D. Paid. |
| [Spine](http://esotericsoftware.com/) | 2D skeletal animation | Alternative to Live2D, also paid. |

**For our knowledge base:** asset resources are *not* our primary scope (we focus on code patterns, not asset libraries). Listed here for completeness — if a future Boilergen plugin needs to reference asset-pipeline conventions, these are the typical sources.

## Category 3 — Industry / publisher directories

For when Boilergen has traction and we want to talk to studios.

| Resource | Description |
|---|---|
| [Powell Group 2022 Publisher List](https://www.dropbox.com/s/069sqmy5zax670a/2022%20Powell%20Group%20Publisher%20List.pdf?dl=0) | 600+ video game publishers, with platforms each publishes on. Updated annually. Dated 2021/2022 — verify current contacts before pitching. |

**For our knowledge base:** **not relevant** to code patterns. Listed because it became part of the research stream. Move to `roadmap-related/` if a separate folder makes sense in the future.

## Category 4 — Game programming references (canonical)

Books / sites we already cite in `/patterns/` entries:

| Reference | URL | Used in |
|---|---|---|
| Game Programming Patterns (Robert Nystrom) | https://gameprogrammingpatterns.com/ | `patterns/component-based-design.md`, `patterns/data-driven-content.md` |
| ECS FAQ (Sander Mertens) | https://github.com/SanderMertens/ecs-faq | `patterns/entity-component-system.md` |
| Unity Manual (ScriptableObject) | https://docs.unity3d.com/Manual/class-ScriptableObject.html | `engines/unity-scriptable-object.md` |
| Unreal Data-Driven Gameplay docs | https://dev.epicgames.com/documentation/en-us/unreal-engine/data-driven-gameplay-elements-in-unreal-engine | `engines/unreal-data-asset.md` |
| Godot Resource docs | https://docs.godotengine.org/en/stable/classes/class_resource.html | `engines/godot-resources.md` |
| FiveM scripting manual | https://docs.fivem.net/docs/scripting-manual/ | `engines/fivem-resources.md` |

---

## Out of scope (intentionally not listed)

- IPA / sideloading / game-piracy directories — outside Boilergen's scope.
- Single-game subreddits / wiki dumps — too narrow, not actionable for codegen.
- Asset-store storefronts (Unity Asset Store, Unreal Marketplace) — well-known, no curation needed.

## How to add a new entry to this file

1. Verify the resource is still alive (check last commit / last update date).
2. Add to the relevant category. If no category fits, add a new category.
3. Always include a one-line "why useful for us" — if you can't write one, the entry probably doesn't belong.

## Source provenance

- Awesome-lists category: Reddit thread r/GameDevelopment (April 2025), shared by Alizhan 2026-05-01.
- Asset resources category: Reddit thread r/gamedev "Massive repository of 3D, 2D and game dev resources" (May 2026), shared by Alizhan 2026-05-01.
- Publishers directory: Reddit thread r/gamedev "Directory of over 600 video game publishers" (2022), shared by Alizhan 2026-05-01.

---

> Maintained as a working document. Add new resources as they come up. Remove entries that go stale or get superseded.
