---
type: pattern
slug: asset-pipelines
title: Asset Pipelines & Codegen Integration
genre: any
engine: any
content_format: any
language: any
license: n/a
source_url: n/a
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: high
tags: [pipeline, build, codegen, importer, automation]
---

# Asset Pipelines & Codegen Integration

> Every game has an asset pipeline — the path from authored content (Photoshop, Maya, JSON, spreadsheet) to engine-loadable format. Most engines have one (Unity Importers, Unreal UAT, Godot's `import` files). **What's underspecified everywhere is how generated content fits in.** Boilergen IS one component of an asset pipeline, and how it integrates with the rest determines whether teams adopt it.

## The shape of a typical asset pipeline

```
   ┌──── source content (humans + tools author this) ──────────┐
   │  - .psd / .ma / .blend  (art)                              │
   │  - .wav / .ogg          (audio)                            │
   │  - .yaml / .json / .csv (data)  ← Boilergen authors here   │
   │  - .lua / .py           (scripts)                          │
   └───────────────────────┬───────────────────────────────────┘
                           ↓
   ┌──── importers / processors (build-time transforms) ───────┐
   │  - Photoshop → .png/.dds/.basisu                           │
   │  - JSON      → engine-native (.uasset / .asset / DB rows)  │
   │  - YAML      → C++ classes (Boilergen!) + JSON instances   │
   └───────────────────────┬───────────────────────────────────┘
                           ↓
   ┌──── engine-loadable build artifacts ──────────────────────┐
   │  - texture atlases, mesh blobs                             │
   │  - compiled shader bytecode                                │
   │  - typed C++ headers + linkable code                       │
   │  - JSON content packs ready to ship                        │
   └───────────────────────────────────────────────────────────┘
```

**Boilergen sits in the importer layer.** Not in the engine, not at the source — at the transform between "human-authored YAML" and "engine-consumable artifacts."

## What every engine has done

- **Unity** — automatic importers (textures, audio, FBX, anim) + custom `AssetPostprocessor` scripts users can add
- **Unreal** — UAT (Unreal Automation Tool) + Build.cs + custom Editor utility scripts
- **Godot** — `.import` files describe per-asset import settings; sidecar to source files
- **Cocos2d, Defold, others** — variants of the same idea

## What every team has hand-rolled

The engine handles standard assets (image, audio, mesh). What it doesn't handle: **bespoke transforms specific to your game**.

Examples teams typically write themselves:
- Localization extraction: walk all source files, gather strings, emit `.po` files
- Balance config compilation: take 10 spreadsheets, normalize, emit one binary blob the runtime loads
- Schema validation: ensure new content follows the rules before commit
- Cross-references check: every weapon's `referenced_animation` actually exists
- Content registry generation: scan all files, emit a "things that exist" lookup table

These are usually written in **Python** (most studios) or **Node.js** (newer studios). They sit between version control and the engine, often invoked via Make/Gradle/Bazel/npm scripts.

**This is where Boilergen lives.** It's a custom transform: YAML → multi-stack code.

## Where things break

### "Pipeline" is overstated

In most teams, "the asset pipeline" is a loose collection of:
- Some Python scripts in `tools/`
- A Makefile that runs them in some order
- An undocumented dependency graph between them
- One person who knows what runs when

Boilergen, when adopted, **adds another node to this graph** the team must wire in. If the wiring is wrong:
- Generated files get out of sync (someone edits the generated `.cpp` not the YAML)
- The build doesn't run Boilergen → CI passes locally but breaks the next dev's checkout
- File-watch loops cause infinite regeneration

### Hot-reload is rare

Most asset pipelines run at build time, not edit time. Hot-reload (edit YAML → see change in running game) requires:
- The engine to support hot-replacement of the generated artifacts
- The pipeline to detect the YAML change quickly enough
- Some kind of file-watch loop running

Boilergen v1 is build-time only. **Future feature: `boilergen watch`** — a daemon that re-generates on YAML save, cooperates with engine hot-reload.

### Determinism

For caching to work, identical inputs must produce identical outputs. Boilergen mostly satisfies this (Handlebars is deterministic, Zod parsing is deterministic), but:
- File system ordering (`readdir`) can differ between machines → templates loaded in different order → cache miss
- Timestamps embedded in output → spurious diffs

Boilergen has no embedded timestamps in output (deliberate), and `findHbsFiles` returns paths in `readdir` order which we should sort to make it cross-OS deterministic.

## How Boilergen integrates today

Three ways teams plug Boilergen in:

### 1. Pre-build hook
```json
{
  "scripts": {
    "prebuild": "boilergen generate ./schemas/*.yaml --config ./boilergen.config.yaml",
    "build": "tsc && webpack"
  }
}
```
**Pros:** simple, explicit, runs every build.
**Cons:** every build runs `boilergen generate` even if YAML didn't change. With 100+ schemas, this adds time.

### 2. CI-only generation
- Devs run `boilergen` manually when they edit YAML
- CI verifies that generated files match (run `--dry-run` and diff)
- Generated files committed to repo

**Pros:** fast local builds, no surprises.
**Cons:** every YAML edit requires a `boilergen` run + commit. Easy to forget.

### 3. Engine-integrated (advanced)
- Custom Unity `AssetPostprocessor` that detects `.yaml` changes and runs Boilergen as a subprocess
- Unreal Editor plugin that does the same
- Godot tool script that watches `schemas/`

**Pros:** invisible to designers, hot-reload-like.
**Cons:** plugin per engine, more code to maintain, harder to debug.

## How Boilergen should advise users

In the docs, recommend:
1. **Default: pre-build hook** for small projects (< 50 schemas).
2. **CI verification** for medium projects — devs run `boilergen` manually, CI catches oversights.
3. **Watch mode** (when it exists) for active development.
4. **Engine-integrated** only when the team has > 1 engineer dedicated to tooling.

Document the **CI verification snippet** as a copy-paste:

```yaml
# .github/workflows/verify-codegen.yml
- name: Verify Boilergen artifacts up-to-date
  run: |
    npx boilergen generate ./schemas/*.yaml --config ./boilergen.config.yaml
    git diff --exit-code || (echo "Generated files out of date — run boilergen locally and commit" && exit 1)
```

## How AI Describe relates

AI Describe is upstream of the asset pipeline:
```
[user types description] → [Claude] → [YAML] → [Boilergen pipeline] → [code]
```

This is **deliberate** — AI emits structured data, not code. The asset pipeline still owns the transform from data to code. **Don't let AI generate target code directly.** That breaks:
- Determinism (LLM outputs vary between runs)
- Reviewability (humans can review YAML diffs; can't review LLM-generated C++ diffs)
- Schema validation (Zod catches missing fields in YAML; nothing catches missing fields in arbitrary C++)

Keep the data-driven philosophy. AI is a YAML author, not a code author.

## References

- **[Unity Manual — AssetPostprocessor](https://docs.unity3d.com/ScriptReference/AssetPostprocessor.html)**
- **[Unreal Engine — Asset Manager](https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine)**
- **[Godot — Importing Assets](https://docs.godotengine.org/en/stable/getting_started/workflow/assets/importing_assets.html)**
- **[GDC — Building Game Build Pipelines That Don't Suck](https://www.gdcvault.com/play/1024456/)** — practical pipeline talk
- **[Mike Acton on Pipeline Determinism](https://www.youtube.com/watch?v=rX0ItVEVjHc)** — touches on this in his Data-Oriented Design talk

## See also

- [`patterns/data-driven-content.md`](./data-driven-content.md) — what flows through the pipeline
- [`patterns/component-based-design.md`](./component-based-design.md) — what comes out the other end
- [`engines/unity-scriptable-object.md`](../engines/unity-scriptable-object.md) — Unity's specific pipeline integration point
