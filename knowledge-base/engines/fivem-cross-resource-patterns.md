---
type: engine
slug: fivem-cross-resource-patterns
title: FiveM cross-resource imports — the @-prefix without dependency declaration
engine: fivem
content_format: lua-manifest
language: lua
license: cfx-creator-license
source_url: https://github.com/qbcore-framework/qb-spawn
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: critical
tags: [fivem, qbcore, dependency-graph, manifest, anti-pattern, technical-debt]
---

# FiveM cross-resource imports — the `@-prefix` without `dependencies`

> Production FiveM resources routinely reference scripts from other resources
> via the `@<resource>/path.lua` syntax in `shared_scripts`/`server_scripts`,
> but **forget to declare those resources in `dependencies { ... }`**. This
> works at runtime due to FiveM's lexicographic load order. It is fragile
> technical debt — and very common in the QBCore ecosystem.
> Verified on `qb-core`, `qb-spawn`, `qb-multicharacter` (2026-05-02 dogfood
> via `schema-validator check-fivem`).

## What the pattern looks like

In `qb-spawn/fxmanifest.lua`:

```lua
fx_version 'cerulean'
game 'gta5'

shared_scripts {
    '@qb-core/import.lua',           -- ← resource ref via @-prefix
    'config.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',        -- ← another resource ref
    '@qb-apartments/server/main.lua',-- ← yet another
    'server/main.lua',
}

-- ⚠ NO `dependencies { ... }` block at all
```

The `@-prefix` tells FiveM "this script lives inside another resource and that
resource must already be loaded." But there is **no machine-checkable link**
between the `@`-prefixed path and a `dependencies` declaration.

## Why it works at runtime (today)

- FiveM loads resources alphabetically by default unless `ensure` order
  overrides it in `server.cfg`.
- `qb-core` loads before `qb-spawn` because `c < s`. The implicit assumption
  holds for now.
- Modders rely on this convention. Hundreds of community resources do the
  same.

## Why it's a problem

1. **Linux runners are case-sensitive.** Folder `QB-Core` ≠ declared `@qb-core/...`. Server fails to start with a cryptic missing-script error rather than a clear dependency error. (Found in `qb-target` declaring `dependencies { 'PolyZone' }` against actual folder `PolyZone` — caught by case-mismatch check; the same class of bug recurs without explicit deps.)
2. **`server.cfg` `ensure` order shuffling silently breaks loads.** A server admin who reorders `ensure` for some unrelated reason can flip the load order so `@qb-core/...` references resolve before `qb-core` itself is up.
3. **No CI enforcement.** Without explicit `dependencies`, no static tool can verify the graph. New contributors can introduce broken @-refs and CI passes.
4. **Fork hostility.** A studio forks QBCore, renames `qb-core` → `studio-core`, but consumer resources don't know to update — they just have implicit `@qb-core/...` strings everywhere.

## The fix is mechanical

Every `@<resource>/...` reference in `shared_scripts`/`server_scripts`/`client_scripts`/`files` should also appear in `dependencies { ... }`. This is exactly what `schema-validator check-fivem`'s `cross-resource-no-dep` warning enforces (severity: warning by default; can be promoted to error via `--strict`).

Example correction for `qb-spawn`:

```lua
fx_version 'cerulean'
game 'gta5'

shared_scripts { '@qb-core/import.lua', 'config.lua' }
server_scripts { '@oxmysql/lib/MySQL.lua', '@qb-apartments/server/main.lua', 'server/main.lua' }

dependencies {
    'qb-core',         -- now explicit
    'oxmysql',
    'qb-apartments',
}
```

## How prevalent is this in the QBCore ecosystem

From a 4-resource sample (qb-core, qb-target, qb-spawn, qb-multicharacter) on 2026-05-02:

| Resource | `@`-refs | Declared deps | Mismatches |
|---|---|---|---|
| qb-core | 0 | `oxmysql` | — |
| qb-target | 0 | `PolyZone` (case-sensitive ✓) | — |
| qb-spawn | 3 (`@qb-core`, `@oxmysql`, `@qb-apartments`) | none | **3** |
| qb-multicharacter | 2 (`@oxmysql`, `@qb-apartments`) | none | **2** |

5 mismatches in 4 random resources. Pattern is endemic.

## How this connects to Boilergen

When Boilergen ships a FiveM target preset (planned: `unity-rpg`-style sibling for FiveM, see ROADMAP.md horizon 3 task 3.1), every generated `fxmanifest.lua` should:

1. Auto-derive `dependencies { ... }` from any `@<resource>/...` references in the script lists.
2. Place dep declarations in source order so PR diffs are minimal.
3. Optionally emit a `lua54 'yes'` block when modern Lua features are used in the templates.

This is one feature where Boilergen's deterministic codegen creates manifests that pass `schema-validator check-fivem` by construction — no possibility of drift.

## References

- Cfx.re Creator Platform License (Jan 12 2026): https://static.cfx.re/platform-license-agreement-12-jan-2026.pdf
- qb-core (the framework): https://github.com/qbcore-framework/qb-core
- qb-spawn (example offender): https://github.com/qbcore-framework/qb-spawn
- ox_lib (the modern dependency-tracking alternative): https://github.com/overextended/ox_lib
- Local dogfood case study: `tools/schema-validator/CASE-STUDY-QBCORE.md`
