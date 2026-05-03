---
type: engine
slug: naninovel
title: Naninovel — visual-novel framework, lessons for RP dialogue systems
engine: unity
content_format: code
language: csharp
license: commercial (Unity Asset Store) / Naninovel-specific
source_url: https://naninovel.com/
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: low
tags: [unity, naninovel, visual-novel, dialogue, scenario-scripting, dsl]
---

# Naninovel — research notes for RP dialogue systems

> Research entry, not an endorsement. Naninovel is a closed-source commercial
> Unity asset; GamesAI will not embed or depend on it. We document it because
> its scenario-scripting DSL, localization model, and command architecture are
> a useful reference for the dialogue/quest schemas Boilergen may grow into.

## 1. What Naninovel is

Naninovel is a commercial visual-novel framework distributed via the Unity
Asset Store. It has been actively maintained for roughly a decade (per the
vendor's site, May 2026), targets modern Unity LTS versions, and ships a
runtime plus an authoring layer: text-based scripts in a custom DSL
(NaniScript, file extension `.nani`) and an optional in-editor "Story Editor"
GUI. Out of the box it covers backgrounds, characters, audio, choices,
branching, save/load, and localization. License includes one year of support
and permanent access to future releases. It is closed-source; what we know
about its internals comes from the public documentation and the C# API
surface exposed to user scripts, not from the source.

For GamesAI, Naninovel is not a dependency, not a target engine, and not
something we recommend. It is a well-designed example of a content-creator
DSL that compiles to runtime data — and that is the only reason it is in
this knowledge base.

## 2. The .nani scenario DSL

A `.nani` script is a plain text file. Each non-empty line is either a
**command** (`@` prefix), a **generic line** of dialogue, a **label**
(`# label_name`), or a **comment** (`;`). Parameters are positional or
named, space-separated.

```nani
; cafe_intro.nani — small NaniScript sample

@bg cafe.day
@char Yuri.Default pos:35
@char Anna.Smile  pos:65

Yuri: Long time no see.
Anna: Yeah. Coffee?

@choice "Sure, the usual." goto:.usual
@choice "Actually, I have to run." goto:.leave

# usual
Yuri: One flat white, one cappuccino.
@goto cafe_chat

# leave
Anna: ...okay. Take care.
@if "{score_anna} > 5"
    Anna: Don't be a stranger.
@endif
@stop
```

Notable properties:

- **Command-per-line**: parser is line-oriented, not bracket/brace nested.
  Cheap to diff, cheap to grep, cheap for AI to author.
- **Generic dialogue lines** look like `Speaker: text`, no ceremony — the
  format that authors actually write the most is the lightest.
- **Branching** uses `@goto`, `@choice ... goto:label`, `@if/@endif`. Labels
  are local to the script (`.label`) or absolute (`script.label`).
- **Expressions** are strings with `{var}` interpolation — a tiny embedded
  expression language, not a full scripting host.

This is the same content-creator-friendly axis that Boilergen YAML schemas
sit on: humans edit text, the system compiles it, version control just works.

## 3. Why it is relevant to GamesAI

We do not ship visual-novel tools. Three things still transfer:

1. **DSL philosophy.** NaniScript is the textbook example of a content DSL
   that prioritizes the writer's typing speed over the compiler's elegance.
   Boilergen's YAML schemas live in the same niche — designer edits text,
   tool produces structured runtime data.
2. **Quest/dialogue overlap.** Branch-and-jump scenario syntax is
   structurally identical to a quest tree: nodes, choices, conditional
   transitions, end states. Grand Mobile and FiveM/QBCore RP servers
   express missions in exactly this shape, just embedded in Lua/C# instead
   of a clean DSL.
3. **Built-in localization.** NaniScript treats translation as a first-class
   concern via parallel localized scripts, not as an afterthought bolted on
   with `gettext`. That is the same posture as the localization-assistant
   module — translation surface is part of the schema, not a separate file
   tree the team forgets about.

## 4. Architecture (as documented)

Public API surface, inferred from official docs:

- **`ICommand`** — every directive (`@bg`, `@char`, `@goto`, custom user
  commands) implements this interface. Author-written C# can register new
  commands; the parser routes `@my_cmd arg1 arg2` to the matching type.
- **Script parser** — line-oriented, produces a list of typed command
  instances per script. Errors are reported with line/column, which makes
  authoring tooling (the VS Code extension) viable.
- **Player / runtime** — walks the command list, awaits async commands
  (e.g., character entrance animation) before moving on. Goto/if/choice
  mutate the program counter.
- **State manager** — save/load is implemented as serialized state
  snapshots: variables, current script + line, character/background state,
  audio state. Snapshots are plain serializable objects, not engine-specific
  binary blobs.
- **Localization layer** — see §5.

The pattern worth stealing: **a DSL whose every directive is a typed command
object behind one interface**. Adding a new directive is a new class, not a
parser change. That is exactly how Boilergen schema validators should grow.

## 5. Localization model

Naninovel's translation model is **parallel script files per locale**. The
authoritative script lives at e.g. `Resources/Naninovel/Scripts/cafe_intro.nani`;
translations live at
`Resources/Naninovel/Localization/<locale>/Text/Scripts/cafe_intro.nani` with
the same structure, only translatable text replaced. Identification is
**positional + key-based**: each translatable line gets a stable hash/ID so
that a translation can survive minor edits to the source script.

Trade-offs vs alternatives:

| Approach           | Pros                                           | Cons                                              |
|--------------------|------------------------------------------------|---------------------------------------------------|
| Naninovel parallel | Translator sees full context inline            | Drift between scripts; tooling required to sync   |
| `gettext` (.po)    | Mature tooling, translator-memory-friendly     | Loses narrative context, ID-only files            |
| ICU MessageFormat  | Plurals, gender, complex grammar handled       | Verbose; designers rarely author it correctly     |
| Key-only JSON      | Trivial to build                               | No context, no plurals, no fallback semantics     |

For RP servers the right answer is usually a hybrid: ICU for UI strings,
key-with-context for in-world dialogue. Naninovel's parallel-file model
only scales when the author and translator are the same small team.

## 6. What patterns transfer to Boilergen + RP

1. **Diff-friendly DSL beats GUI-only authoring.** A YAML or `.nani`-style
   text format is reviewable in PRs, scriptable, AI-authorable. GUI-only
   tools (Twine binary, RPG Maker projects) lose all of that.
2. **One pass, two outputs.** A future Boilergen `dialogue-quest` schema
   could compile a single YAML source into both:
   - a runtime state machine (QBCore mission script, Unity ScriptableObject,
     Godot Resource), and
   - a localization key set ready for the localization-assistant module.
   Naninovel does both jobs from one `.nani` source — that economy is the
   thing to copy, not the asset itself.
3. **Save-state as plain serialized objects.** No custom binary, no engine
   handles in the snapshot — serializable POCOs only. Same rule should
   apply to any state-snapshot feature in Boilergen-generated code.
4. **Typed-command parser pattern.** One interface per directive type beats
   a giant switch statement. Schema-validator already leans this way; the
   dialogue schema should formalize it.

## 7. What does NOT transfer

- **Runtime is Unity-only.** No FiveM/Lua, Godot, or generic-server target.
  Borrowing the runtime is not on the table; only the DSL/schema shape is.
- **Asset-store license.** Naninovel cannot be embedded, redistributed, or
  vendored into any OSS GamesAI module. Anything we publish must be a
  clean-room schema inspired by the public DSL, not a port of code.
- **Visual-novel flow assumptions.** Naninovel assumes a single linear
  player driving one scenario at a time. RP servers are concurrent,
  multi-actor, and authoritative on the server. Most of the runtime
  assumptions break in that environment.

## 8. Pitfalls and posture

- **Closed-source commercial asset.** Studios buying it lock into Unity +
  Asset Store ecosystem and the vendor's release cadence. If the vendor
  pauses development, you inherit the runtime as-is.
- **Authoring tooling is good but limited.** Official editor support is a
  Visual Studio Code extension plus the in-Unity Story Editor; there is
  no full standalone IDE, no language server beyond what the extension
  ships, no first-class CLI compiler outside of Unity's build pipeline.
- **Localization scaling.** Parallel-file model is great for one author +
  one translator, painful at studio scale without custom sync tooling.
- **Easy to over-borrow.** It is tempting to copy the directive set
  wholesale (`@bg`, `@char`, `@audio`). Resist — RP/quest content needs
  a different vocabulary (`@objective`, `@reward`, `@require_role`,
  `@dispatch_event`). Steal the *shape*, not the directives.

## 9. How this connects to Boilergen

- **Inspiration for a future `dialogue-quest` schema entry type.** Same
  philosophy as `localization` and `schema-validator`: one human-edited
  source compiles to engine-specific outputs (QBCore mission scripts,
  Unity ScriptableObjects, Godot Resources) plus a localization key
  set in one pass.
- **Reference for AI Describe.** When a user asks the assistant about
  VN-style branching dialogue inside their RP server, point at
  Naninovel's `@goto` / `@if` / `@choice` model as the prior art —
  then translate the answer into the RP server's own runtime.
- **Not a recommendation to build on Naninovel.** Anything we ship will
  be a clean-room schema, MIT/Apache-licensed, with no Naninovel code
  or assets in the dependency graph.

Concrete next step (only when the dialogue module's sprint comes up):
sketch a `dialogue-quest.schema.yaml` with nodes, choices, conditions,
and a `localizable: true` flag on every text field, and validate that
its compiled output covers at least the QBCore mission-script shape.

## 10. References

- Official site: <https://naninovel.com/>
- Documentation: <https://naninovel.com/guide/> (NaniScript reference,
  command list, localization guide, custom commands C# API)
- Unity Asset Store listing (commercial): linked from the official site
- Community forum / Discord: linked from the official site
- VS Code extension: official, available from the Visual Studio Marketplace

Cross-references in this knowledge base:

- `knowledge-base/sources/community-sentiment-ai-gamedev.md` — guardrails
  filter; this entry passes (research, no AI generation of final narrative)
- Boilergen modules: `localization-assistant` (parallel translation model
  comparison), `schema-validator` (typed-directive pattern)
