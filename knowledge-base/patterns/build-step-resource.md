---
type: pattern
slug: build-step-resource
title: TypeScript-built FiveM resources — the "no manifest until npm run build" pattern
content_format: lua
language: typescript
license: varies
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: high
tags: [fivem, typescript, build-pipeline, oxmysql, ox_lib, gotcha]
---

# TypeScript-built FiveM resources

> A growing class of FiveM resources (notably from the `overextended` org —
> `oxmysql`, `ox_lib`, `ox_inventory`) ships their **source-tree** without a
> `fxmanifest.lua`. The manifest, plus all the runtime Lua, only appears
> after running `npm run build`. Server owners who clone the source repo
> instead of grabbing a release artefact end up with a non-functional resource
> that crashes the server on `ensure`. Boilergen's `schema-validator check-fivem`
> distinguishes this case from "missing dep" with a dedicated `dependency-no-manifest`
> warning (added 2026-05-02 from a real-world dogfood pass against `qb-core`).

## What you actually clone

`oxmysql` source layout from a clean clone:

```
oxmysql/
├── README.md
├── LICENSE
├── package.json
├── lerna.json
├── build.js              # esbuild config that produces dist/
├── src/
│   ├── client/...
│   ├── server/...
│   └── shared/...
├── lib/                  # post-build emitted Lua, gitignored
├── ui/                   # build outputs go here
└── ...
```

Note what is NOT there: `fxmanifest.lua`. It's generated as part of `npm run build`. Without it, FiveM cannot register the resource at all.

## How releases ship

Modern overextended-style resources publish **release artefacts** on GitHub:

- A `.zip` with the built outputs: `lib/` populated, `fxmanifest.lua` present, `dist/` contains compiled JS, etc.
- The source tag points at the same code, but expects you to build before use.

Server owners who follow tutorials that say "git clone the repo into your resources/ folder" get the source tree, not the release. The `ensure` line in `server.cfg` then fails because there's no manifest.

## What happens at runtime

```
hitch1: couldn't find resource oxmysql.
ensuring [3000] [defaults] [...]
[ensure] couldn't find resource oxmysql
```

Server logs are clear about the problem if you read them. The frustrating part is players will see "server is offline" and no admin will dig through txAdmin logs to find the line above. Schema Validator's job is to report this earlier — at PR review time, not at server-start time.

## How `schema-validator check-fivem` distinguishes the cases

A "missing dependency" can mean:

1. **The dep doesn't exist anywhere** — typo in `dependencies { 'doesnt-exist' }`. Hard error.
2. **The dep folder exists but with the wrong case** — Linux footgun. Hard error (`dependency-case-mismatch`).
3. **The dep folder exists, but it's a TS-built resource pre-build** — common, mechanical. **Warning, not error.**

The third case warrants a different message because the fix is mechanical and known: `cd <dep>/ && npm run build`, OR re-clone using the release artifact instead of the source repo. Boilergen's linter prints this exact remediation as part of the warning text:

```
⚠ [dependency-no-manifest] dependency "oxmysql" — folder exists but has no
  fxmanifest.lua (likely TS-built resource needing 'npm run build', or
  pre-release source checkout)
```

This was added in commit `21df0f0` after the QBCore dogfood pass found a real-world false-positive pattern. See `tools/schema-validator/CASE-STUDY-QBCORE.md` for the full context.

## Build-step resources we know about (2026-05)

The current population of TS-built FiveM resources (probably non-exhaustive):

- **oxmysql** (overextended) — the de facto MySQL adapter for QBCore. Replaces the legacy `mysql-async`.
- **ox_lib** (overextended) — UI primitives, callbacks, contextual menus. Ships heavy build outputs.
- **ox_inventory** (overextended) — inventory framework with React UI.
- **ox_target** (overextended) — successor to qb-target. React-built UI.
- **ox_core** (overextended) — Qbox/QBCore-alternative framework.
- **qbox** (Qbox-project) — Qbox itself, post-fork rewrite.

Older hand-written QBCore resources are NOT in this category — they ship `fxmanifest.lua` directly.

## Implications for Boilergen-generated resources

Boilergen outputs are NOT TS-built. The generated `fxmanifest.lua` lands directly in the resource folder, ready to ship. There's no build step. This is a deliberate choice — Boilergen's value prop is "from one YAML to working code in seconds," not "set up a TS build pipeline."

That said: **if a Boilergen-generated job depends on `oxmysql` for SQL persistence**, the user needs to either (a) install oxmysql via release artifact, or (b) clone the source and `npm run build`. We can't generate that dependency for them.

## Anti-pattern: vendoring built outputs

Some server packs vendor the built `lib/` and `dist/` directories of TS resources directly into git, "to avoid the build step." This works but loses the security signature of the GitHub release artefact and makes upgrades manual + error-prone. The correct mitigation is documentation (`server.cfg` should comment which resources need pre-build), not vendoring.

## How this connects to Boilergen

- `tools/schema-validator/src/fivem/validator.ts` distinguishes these three categories of dep failure (commit `21df0f0`).
- Boilergen's generated manifests don't depend on TS-built resources by default — only `qb-core` (which is hand-written). Optional `oxmysql` integration is documented in the generated `migrations/001_seed.sql` comment block.

## References

- oxmysql repo: https://github.com/overextended/oxmysql
- ox_lib repo: https://github.com/overextended/ox_lib
- Qbox project: https://github.com/Qbox-project/qbx_core
- Local linter logic: `tools/schema-validator/src/fivem/validator.ts`
- Earlier dogfood doc: `tools/schema-validator/CASE-STUDY-QBCORE.md`
