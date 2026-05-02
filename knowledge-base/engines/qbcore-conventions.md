---
type: engine
slug: qbcore-conventions
title: QBCore framework conventions — Shared.* registries, dependency loading, exports
engine: fivem
content_format: lua
language: lua
license: gpl-3.0
source_url: https://github.com/qbcore-framework/qb-core
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: critical
tags: [fivem, qbcore, conventions, shared-registries, exports]
---

# QBCore framework conventions

> The QBCore framework dominates the FiveM RP server scene. Most "QBCore-compatible" resources interact with three things: a small set of `QBCore.Shared.*` registries, the `exports['qb-core']:GetCoreObject()` runtime accessor, and a load-order-via-dependencies convention. Knowing these conventions tells you how to write a resource that **slots cleanly** into any QBCore server. Boilergen's FiveM-QB target (added 2026-05-02) is built around them.

## The three conventions that matter

### 1. Access the framework via `exports['qb-core']:GetCoreObject()`

The legacy QBCore convention was to import shared scripts from qb-core into your `fxmanifest.lua`:

```lua
shared_scripts {
    '@qb-core/import.lua',   -- legacy
    'config.lua',
}
```

Modern resources skip this and access the framework at runtime:

```lua
local QBCore = exports['qb-core']:GetCoreObject()
```

This is more robust to internal qb-core file reorganisation. The cost is one extra `dependencies { 'qb-core' }` entry to ensure load order. Boilergen-generated resources use this modern pattern by default — generated `fxmanifest.lua` files have no `@qb-core/...` shared_script references.

### 2. Register data into `QBCore.Shared.*` tables

QBCore has a small set of in-memory registries that drive UI, shop, and inventory systems:

| Registry | Used by | Field shape |
|---|---|---|
| `QBCore.Shared.Jobs` | qb-core, qb-management | `{ label, defaultDuty, offDutyPay, grades = { [grade] = { name, payment, isboss } } }` |
| `QBCore.Shared.Vehicles` | qb-vehicleshop, dealers | `{ name, brand, model, price, category, hash, shop, tradeable }` |
| `QBCore.Shared.Weapons` | qb-weapons, weapondrawing | keyed by `GetHashKey('WEAPON_NAME')`; value: `{ name, label, weapontype, ammotype, damagereason, ... }` |
| `QBCore.Shared.Gangs` | qb-gangmenu | `{ label, grades = { [grade] = { name, isboss } } }` |
| `QBCore.Shared.Items` | qb-inventory | `{ name, label, weight, type, image, unique, useable, shouldClose, description }` |

These registries are **just Lua tables on the QBCore object**. A resource registers into them on its `CreateThread`-on-start handler. Multiple resources contributing to the same registry is the norm — qb-core seeds defaults, then individual job resources add their entries on top.

The `QBCore.Functions.AddJob(name, table)` helper is sugar over `QBCore.Shared.Jobs[name] = table`. Same for AddGang, etc. Use the function form for consistency.

### 3. Declare dependencies for load order

If your resource calls `exports['qb-core']:GetCoreObject()` at script-load time, qb-core must already be loaded. The `dependencies { ... }` block in `fxmanifest.lua` handles this:

```lua
dependencies {
    'qb-core',
    'oxmysql',
}
```

FiveM resolves these dependencies and starts them in topological order. **It is not safe** to skip the declaration even when an alphabetic load order happens to work — server admins reorder via `ensure` directives in `server.cfg` and your resource breaks silently. (This is the failure mode `schema-validator check-fivem` catches via the `cross-resource-no-dep` warning — see `engines/fivem-cross-resource-patterns.md`.)

## What a typical QBCore job resource looks like

A complete drop-in QBCore job resource has 3-5 files:

```
resources/[jobs]/qb-taxi/
├── fxmanifest.lua      manifest with deps on qb-core
├── config.lua          Config.Job = { name, label, grades, ... }
├── server/main.lua     QBCore.Functions.AddJob() + custom payroll/events
├── client/main.lua     OnJobUpdate handler + commands
└── locale/en.lua       optional, for qb-core's locale system
```

`Config.Job` is a convention; the same data could live anywhere, but `Config = Config or {}` at the top of `config.lua` plus a single `Config.Job` table is what every QBCore job resource does — easy to scan, easy to override.

Boilergen's `fivem-qb` target generates exactly this shape from a YAML schema. The grades dictionary mirrors QBCore's required `['0']`, `['1']`, etc. string-int keying.

## Common mistakes (and what catches them)

### Mistake: missing `lua54 'yes'` directive

QBCore uses Lua 5.4 features (integer division `//`, `<close>` annotations). Without `lua54 'yes'` in `fxmanifest.lua`, your resource compiles under Lua 5.3 and crashes on first encounter of a 5.4 idiom. **Boilergen always emits this directive** in generated manifests.

### Mistake: registering inside an event handler instead of `CreateThread`

```lua
-- BAD: only fires after the resource is fully loaded; if anything else
-- imported your config first, it sees an empty registry.
RegisterNetEvent('QBCore:Server:OnPlayerLoaded', function()
    QBCore.Functions.AddJob(...)
end)
```

```lua
-- GOOD: registers at script load, before any other resource queries it.
CreateThread(function()
    QBCore.Functions.AddJob(...)
end)
```

Boilergen's server-side templates use the `CreateThread` form.

### Mistake: hard-coding job IDs in places besides Config

Junior devs often write:

```lua
if PlayerData.job.name == 'taxi' then ... end
```

…rather than:

```lua
if PlayerData.job.name == Config.Job.name then ... end
```

Boilergen-generated `client/main.lua` uses the `Config.Job.name` form, so renaming the job in YAML auto-propagates.

## Forks of QBCore — what differs

The community has several active forks, each subtly different:

| Fork | Stewardship | Key differences |
|---|---|---|
| **qbcore-framework/qb-core** | Original (Kakarot et al.) | Reference. Slow but stable. |
| **Qbox-project/qbx_core** | qbcore-framework alumni | Cleaner code, `qbx:` namespaced events, ox_lib integration baked in. Backwards-compatible with QBCore APIs in most places. |
| **JG-RP/qb-core** | JG community | Adds reservations system, custom inventory tweaks. |

For Boilergen output, we target the canonical qbcore-framework conventions. Forks that maintain API compat (Qbox especially) accept the same generated code with no changes.

## Cfx.re Creator Platform License (Jan 12 2026)

The platform license under which all FiveM/RedM code operates **prohibits using Cfx Creator Services to source material for, or to promote, generative AI tools** ([source](https://static.cfx.re/platform-license-agreement-12-jan-2026.pdf)). This means:

- A third-party can't scrape Cfx.re forum posts to train a "FiveM Code Assistant" model — that's a license violation.
- Boilergen ships zero pre-trained AI weights, no embeddings derived from Cfx.re content. Our AI layer (Anthropic Claude) is an opt-in API call, not a baked-in model. The deterministic templates are what we ship.

This is a real reason why GamesAI's "deterministic core + opt-in AI" doctrine is a fit for the FiveM market specifically — it's the only legal posture for AI tooling that touches QBCore code.

## How this connects to Boilergen

`boilergen/plugins/generic-rp/targets/fivem-qb/` (added 2026-05-02) generates resources following these conventions:

- Modern exports-based access (no `@qb-core/import.lua` shared_scripts)
- `dependencies { 'qb-core' }` declared
- `lua54 'yes'` set
- `CreateThread` registration patterns
- `Config.<EntityType>` convention with idiomatic field names
- Where applicable, slots into `QBCore.Shared.*` registries (Jobs, Vehicles, Weapons, Gangs)

For entity types without a canonical Shared.* registry (business, family, property), the templates expose data via `_G.Boilergen<Type>s` and `exports('Get<Type>Config')` so any downstream framework — qb-shops, qb-management, qb-houses, custom tooling — can read it.

## References

- qb-core repo: https://github.com/qbcore-framework/qb-core
- Qbox fork: https://github.com/Qbox-project/qbx_core
- ox_lib (the modern dep-tracking alt): https://github.com/overextended/ox_lib
- Cfx.re Platform License (Jan 12 2026): https://static.cfx.re/platform-license-agreement-12-jan-2026.pdf
- Local artefacts: `boilergen/plugins/generic-rp/targets/fivem-qb/`
