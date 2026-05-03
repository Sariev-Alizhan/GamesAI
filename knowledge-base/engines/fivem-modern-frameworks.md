---
type: engine
slug: fivem-modern-frameworks
title: FiveM modern RP frameworks — ox_core, Qbox, alternatives to QBCore
engine: fivem
content_format: lua
language: lua
license: mixed (LGPL-3.0 / MIT — see body)
source_url: https://github.com/overextended/ox_core
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: critical
tags: [fivem, ox_core, qbox, qbcore, esx, framework, server-architecture]
---

# FiveM modern RP frameworks

> **TL;DR.** QBCore still has the largest install base, but the centre of gravity has moved. New servers in 2026 are increasingly being recommended Qbox (a QBCore-lineage rewrite by ex-QBCore contributors) or ox_core (an Overextended ground-up rewrite written in TypeScript with typed Lua exports). Both depend on the Overextended resource stack — `oxmysql`, `ox_lib`, `ox_inventory`. ESX is legacy: still widespread, but no longer the default recommendation. This entry maps the landscape, drills into each modern framework, and answers the question Boilergen has to answer next: **do we add a `fivem-ox` target alongside `fivem-qb`?**

This entry complements [`qbcore-conventions.md`](./qbcore-conventions.md), which covers QBCore in depth. Here the focus is what comes *after* QBCore.

---

## 1. The FiveM RP framework landscape, 2026

For the better part of a decade, FiveM roleplay servers ran on one of two frameworks: **ESX** (the original, French-origin, 2017+) or **QBCore** (forked from ESX patterns in 2021, became dominant by 2023). In late 2022 a third path opened: a group of ex-QBCore contributors started **Qbox** as a successor / hard fork, and in parallel the **Overextended** collective — already known for `ox_inventory` and `ox_lib` — published **ox_core** as a ground-up alternative built around their existing resource stack. By 2026 the four-way picture is:

| Framework | License | Maintainer | MySQL dependency | Target API style | Status (May 2026) |
|---|---|---|---|---|---|
| **ESX** (`es_extended`) | GPL-3.0 | esx-framework org | `mysql-async` (legacy) or `oxmysql` | `ESX.GetPlayerFromId`, `xPlayer` object, shared globals | **Legacy.** Still widely deployed; new feature work is slow; most ecosystem energy has moved on. |
| **QBCore** (`qb-core`) | GPL-3.0 | qbcore-framework org | `oxmysql` | `QBCore.Functions.GetPlayer`, `Shared.Jobs/Vehicles/Items` registries, `PlayerData` per-player object | **Dominant install base, contested future.** Ongoing commits, but no tagged releases on GitHub; community sentiment increasingly mixed. |
| **Qbox** (`qbx_core`) | GPL-3.0 (inherits es_extended copyright header) | Qbox-project org (ex-QBCore contributors) | `oxmysql` (required) | Bridge layer mimics QBCore exports + native Qbox exports; integrates `ox_inventory`/`ox_lib` by default | **Production, fastest-growing.** v1.23.0 (Apr 2025), then v1.22.5 (Feb 2025) — steady release cadence. |
| **ox_core** | LGPL-3.0 | Overextended org | `oxmysql` (required) | Typed Lua exports via TypeScript-generated bindings; no `Shared.*` mutation; `Ox.GetPlayer`, `player:set/get` methods | **Production, smaller install base, technically the most modern.** Written 92.6% TypeScript, 6.5% Lua. Latest visible release v1.5.10. |

Two structural shifts matter:

1. **The Overextended stack won the resource layer.** Whether you run QBCore, Qbox, or ox_core, the *de facto* inventory is `ox_inventory`, the *de facto* library is `ox_lib`, the *de facto* MySQL adapter is `oxmysql`. QBCore servers still sometimes ship `qb-inventory`, but new server tutorials in 2025-2026 mostly steer toward `ox_inventory`. This means the framework-level differences are narrower than they look — most resources interact with `ox_*` exports rather than with framework internals.
2. **"QBCore-compatible" is now the contract, not the framework.** Qbox actively advertises a bridge layer so that "most QB resources work with 0 effort." ox_core does *not* claim QBCore compatibility. So the migration story splits into a smooth path (QBCore → Qbox) and a steep path (anything → ox_core).

Honest read on "who's winning": **ESX is in maintenance mode, QBCore still has the most servers but is losing momentum, Qbox is the active growth vector, ox_core is the technical reference but smaller in raw adoption.** Multiple 2025-2026 community write-ups (Lation Scripts, VertexMods, qboxcore.com) recommend Qbox over QBCore for new servers; ox_core appears more often in resource development circles than in turnkey-server circles. None of this means ESX or QBCore servers are going away — there are too many existing scripts — but the *new-server default* has shifted.

---

## 2. ox_core deep-dive

Repo: <https://github.com/overextended/ox_core>
Docs: <https://overextended.dev/ox_core> (formerly coxdocs.dev)
License: **LGPL-3.0** (verified from `LICENSE` file)
Latest release confirmed in repo: **v1.5.10**

### Architecture

`ox_core` is unusual among FiveM frameworks: the source is **92.6% TypeScript**, compiled to a single bundled JS module that runs on the FXServer Node runtime, with a thin Lua surface (~6.5% of the codebase) that exposes the API to Lua resources via FiveM `exports`. The repo layout reflects this:

```
client/          # client-side TS
server/          # server-side TS (player, vehicle, group modules)
common/          # shared TS utilities
lib/             # Lua glue exposing exports
locales/
sql/             # schema migrations
types/           # TypeScript type definitions consumed by @overextended/ox_core npm package
```

Hard dependencies:

- `oxmysql` — MySQL adapter (no `mysql-async` fallback)
- `ox_lib` — utility library (UI, callbacks, zones)
- `ox_inventory` — companion inventory (highly recommended; `ox_core` assumes it for item-related operations)

### Player state — how it differs from QBCore

QBCore stores per-player state in a `PlayerData` table held inside `QBCore.Players[source]` and replicated to the client as a global table:

```lua
-- QBCore client side
local PlayerData = QBCore.Functions.GetPlayerData()
print(PlayerData.job.name)              -- direct field access
TriggerEvent('QBCore:Client:OnJobUpdate', PlayerData.job)
```

The shape of `PlayerData` is convention, not contract — resources mutate it, listen for `QBCore:Player:SetPlayerData` and re-read fields. This is fast to write but fragile: any resource can mutate the table; field renames are silent breaks.

`ox_core` instead exposes a **player object** retrieved through a typed export, with getter/setter methods rather than direct field access:

```lua
-- ox_core server side (Lua consumer)
local Ox = exports.ox_core

local player = Ox:GetPlayer(source)        -- returns a player handle
local citizenid = player.stateId            -- read via property
player:setGroup('police', 4)                -- mutate via method, not via Shared.* table
local groups = player:getGroups()           -- typed return
```

Two things follow from this:

- **No global `Shared.Jobs` registry to mutate at runtime.** ox_core groups are loaded from configuration and managed via the player handle. There is no equivalent of QBCore's `QBCore.Functions.AddJob('newjob', {...})` that monkey-patches a shared table seen by every resource. Adding a "job" in ox_core is adding a row to the `ox_groups` table or config and granting it via `player:setGroup()`.
- **TypeScript generates the contract.** The `@overextended/ox_core` npm package ships type definitions that JS resources can consume directly, and Lua consumers get the same methods via exports. When ox_core renames or changes a method, TypeScript consumers break at build time, not at runtime.

### Why some servers prefer it

The recurring developer arguments for ox_core, observable in cfx.re forum threads and the Overextended Discord:

- **Typed exports beat global tables** for medium-large servers where many resources touch player state. If `ox_core` removes a method, every Lua consumer fails *loudly*; if QBCore removes a `PlayerData` field, half the resources go subtly wrong.
- **No monkey-patching.** Resources cannot mutate `QBCore.Shared.Jobs` and have other resources silently depend on the mutation. ox_core forces the registry to be the database, not the runtime.
- **Tighter dependency surface.** `oxmysql` + `ox_lib` + `ox_inventory` + `ox_core` is a small, coherent stack from one maintainer collective. QBCore's surface is larger and less consistent (mixed `qb-*` and `ox_*` resources).

The recurring counter-arguments:

- **Smaller resource ecosystem.** "ox_core-native" resources are still a minority — most paid scripts target QBCore (and increasingly Qbox via the bridge). A new server starting on ox_core writes more glue.
- **Steeper onboarding.** No `Shared.Jobs` table to edit means newcomers can't just open a Lua file and add a job — they have to learn the groups API and the SQL schema.

---

## 3. Qbox deep-dive

Repo: <https://github.com/Qbox-project/qbx_core>
Docs: <https://docs.qbox.re/>
License: **GPL-3.0** (verified from `LICENSE` file — interestingly, the file still carries the original `es_extended` / "Jérémie N'gadi 2015-2021" copyright header, reflecting the QBCore-via-ESX lineage)
Latest release: **v1.23.0** (April 15, 2025)

### Lineage and what they changed

Qbox started **September 27, 2022** as a successor to `qb-core`, founded by ex-QBCore contributors. It is *not* a passive fork — the `qbx_core` README and FAQ frame it as a refactor with three explicit goals: code quality, security, and lower performance overhead.

Concrete deltas vs upstream QBCore:

- **Bridge layer for backward compatibility.** Qbox preserves the `QBCore.Functions.GetPlayer`-style surface so that "most QB resources" run unchanged. The qualifier the Qbox FAQ adds: scripts that bypassed the documented API (direct database writes to the players table, hand-rolled job mutations) won't work. *Documented* QBCore patterns work; *folklore* QBCore patterns don't.
- **Built-in multicharacter and multi-job/gang.** In QBCore these are typically separate resources (`qb-multicharacter`, third-party multijob scripts). In Qbox they are first-class.
- **Queue system, persistent player vehicles** built into core.
- **Hooks** module for Ox-style resource extension.
- **Ox stack as default**: `ox_inventory`, `ox_lib`, `oxmysql` are required, not optional. Qbox does not ship a "qbx-inventory" — it adopts `ox_inventory` outright.

### Maintenance velocity

Looking at the GitHub releases page:

- v1.23.0 — April 15, 2025
- v1.22.5 — February 5, 2025
- v1.22.4 — January 10, 2025
- v1.22.3 — December 7, 2024
- v1.22.2/.1/.0 — December 2-5, 2024

That is roughly **monthly tagged releases** with patch releases mixed in — a steady cadence over a multi-year window. By contrast, `qb-core` does not publish tagged releases on GitHub at all (the repo header reads "No releases published") — development happens on `main` directly. For server operators who care about pinning to a known version, Qbox is the more disciplined option.

### Sample API

```lua
-- Qbox: still recognisable to QBCore developers
local QBCore = exports['qb-core']:GetCoreObject()  -- bridge alias works
local Player = QBCore.Functions.GetPlayer(source)  -- works via bridge

-- but the native idiom uses qbx_core exports directly:
local player = exports.qbx_core:GetPlayer(source)
exports.qbx_core:SetJob(source, 'police', 2)       -- mutate via export, not Shared
```

The bridge means a QBCore-targeted Boilergen module would *probably* run on Qbox unchanged, provided it sticks to documented `QBCore.Functions.*` calls and avoids reaching into `QBCore.Shared.Jobs` to add/remove rows at runtime.

---

## 4. Migration story — QBCore → Qbox vs QBCore → ox_core

### QBCore → Qbox (gentle path)

What survives:

- `exports['qb-core']:GetCoreObject()` and the resulting `QBCore.Functions.GetPlayer`, `QBCore.Functions.GetPlayers`, money/job/gang reads.
- `QBCore:Server:OnPlayerLoaded`, `QBCore:Client:OnPlayerLoaded` events.
- Item definitions in `qb-core/shared/items.lua` — Qbox reads them through the bridge for compatibility.
- `Shared.Jobs` and `Shared.Vehicles` *reads* (resources that look up a job's grades to render a UI).

What breaks:

- **Runtime mutation of `Shared.Jobs`.** `QBCore.Functions.AddJob('mafia', {...})` at runtime either no-ops or works partially under Qbox — the canonical Qbox path is `exports.qbx_core:CreateJob(...)` and persistence via the database.
- **Direct DB writes to `players.job` / `players.gang` columns.** Qbox normalises job/gang data differently and expects mutations to go through exports.
- **`qb-inventory` assumptions.** If your resource calls `exports['qb-inventory']:OpenInventory(...)`, you need to swap to `ox_inventory` exports.
- **`qb-target` assumptions** — see Pitfalls below.

### QBCore → ox_core (steep path)

What survives:

- `oxmysql` queries (assuming you already use it).
- `ox_lib` calls (callbacks, zones, UI).
- `ox_inventory` integration (item definitions live in `ox_inventory/data/items.lua` either way).

What breaks:

- **Anything reading `PlayerData.job.name` directly.** Replace with `Ox:GetPlayer(source):getGroup('police')` or equivalent.
- **`Shared.Jobs` and `Shared.Vehicles` lookups.** ox_core's groups and vehicles live in the database; resources query via exports. Code that iterates `for k, v in pairs(QBCore.Shared.Jobs)` to render a UI has to be rewritten against `Ox:GetGroups()` (or pre-loaded server-side and shipped to the client).
- **Event names.** `QBCore:Server:OnPlayerLoaded` → `ox:playerLoaded`. Migrators have to grep every event handler.
- **Money model.** QBCore's `PlayerData.money.cash`/`bank` becomes ox_core's account API (`player:getAccount('cash')`).

This is not a 1-day migration. ox_core is a credible target for a *new* server or a server willing to rewrite its resource layer; it is rarely a credible target for an existing 50+ resource QBCore server.

---

## 5. Cfx.re January 12, 2026 license posture

Cfx.re updated its **Creator Platform License Agreement (PLA)** effective **January 12, 2026** (PDF: <https://static.cfx.re/platform-license-agreement-12-jan-2026.pdf>). The update aligned the FiveM/RedM creator terms with Rockstar Games' broader Terms of Service revisions following the Cfx.re acquisition.

What it does and doesn't mean for forks of QBCore / Qbox / ox_core:

- **The PLA governs the *Creator Services* (FiveM/RedM platform itself), not third-party open-source resources.** A GPL-3.0 fork of qb-core or an LGPL-3.0 fork of ox_core remains governed by its own licence — the PLA does not retroactively relicense community code.
- **The PLA's restrictions section *does* restrict reverse-engineering, decompiling, or making derivative works of the FXServer/Creator Services themselves.** This affects forks of `citizenfx/fivem`, not forks of qb-core.
- **Monetisation language is the contentious part.** The "Prohibited Methods" section is read by parts of the community as restricting Virtual Items / loot boxes / cosmetic-pack revenue inside FiveM servers. This affects how server operators *use* QBCore/Qbox/ox_core (specifically, paid in-game shops); it does not affect the legality of distributing the framework code.
- **Net effect for OSS framework forks: unchanged.** GPL-3.0 (qb-core, qbx_core) and LGPL-3.0 (ox_core) forks remain freely forkable. The PLA changes the rules of *operating a server*, not the rules of *publishing framework code*.

There is no provision in the January 12, 2026 PLA that singles out QBCore, Qbox, or ox_core. The official cfx.re announcement thread offers no framework-specific guidance.

---

## 6. What this means for Boilergen's FiveM-QB target

Boilergen currently ships a `fivem-qb` target (added 2026-05-02) that generates QBCore-conformant resource skeletons. The question is whether to add a sibling `fivem-ox` target — and how much of the existing generator generalises.

### Should we add `fivem-ox`?

**Yes, but as a sibling target, not a replacement.** Reasoning:

- QBCore is the install-base leader; Qbox is the growth vector; ox_core is the technical reference. A toolkit that wants to be relevant to *modern* FiveM development needs to speak ox_core's idioms.
- The `fivem-qb` target *already* runs on Qbox via the bridge layer with no extra work — Qbox is a free win, not a new target. The decision is really "do we add `fivem-ox`?", not "do we add `fivem-qbox`?".
- Cost-wise, `fivem-ox` is a smaller delta than it looks because ~70% of a generated FiveM resource is engine-agnostic (manifest, locale stubs, command registration, oxmysql calls).

### Patterns that generalise across QBCore / Qbox / ox_core

These can live in a shared FiveM template layer:

- **`fxmanifest.lua` shape** — game, fx_version, dependencies block, client/server scripts.
- **Vehicle definitions** — when sourced from `ox_inventory` or shared YAML config, the same data feeds either framework.
- **Job grade structure** — the *shape* (`{ name, payment, isboss }`) is the same; only the registration call differs.
- **Target zones** — `ox_target` works against either framework. (Servers on `qb-target` need adapter code; see Pitfalls.)
- **oxmysql queries** — identical across all three frameworks.
- **ox_lib callbacks, notifications, dialogs** — identical surface.

### Patterns that do NOT generalise — generator must branch

- **Player state access.** This is the hard one:
  - QBCore: `QBCore.Functions.GetPlayer(source).PlayerData.job.name`
  - Qbox (native): `exports.qbx_core:GetPlayer(source).PlayerData.job.name` (bridge form: same as QBCore)
  - ox_core: `exports.ox_core:GetPlayer(source):getGroup('police')`
- **Job registration.** QBCore mutates `Shared.Jobs` at runtime; ox_core does not allow that — jobs must be seeded into the `ox_groups` table.
- **Money APIs.** `PlayerData.money.bank` (QBCore/Qbox) vs `player:getAccount('bank')` (ox_core).
- **Player loaded events.** Different event names — generator must emit the right `RegisterNetEvent` per target.

### Concrete recommendation

Boilergen modules should default to a **`fivem-qb`** target with a **`--target=ox`** flag that swaps the player-state, job-registration, money-API, and event-name templates. Shared blocks (manifest, oxmysql, ox_lib, ox_inventory glue) stay in one place. This matches the "one module per sprint" cadence: ship ox target as its own sprint after the QB target stabilises.

---

## 7. Pitfalls

- **`ox_inventory` hard-coupling.** Both Qbox and ox_core assume `ox_inventory`. Generated resources that call `exports['qb-inventory']:OpenInventory` will break on Qbox/ox_core. Generator needs an inventory-adapter abstraction (`ox_inventory` default, `qb-inventory` opt-in for legacy QBCore).
- **`qb-target` vs `ox_target` divergence.** `qb-target` and `ox_target` have similar but **not identical** APIs. Common gotcha: option callback signature differs (`function(entity)` vs `function(data)`). Generated target zones should default to `ox_target` and provide a `qb-target` shim only if the user opts in.
- **ESX → ox_core migration is *steep*.** Worse than QBCore → ox_core, because ESX's `xPlayer` object has even more direct field access and ESX-specific events. Do not undersell this — a server on `es_extended` cannot just "switch to ox_core" over a weekend.
- **`Shared.Jobs` runtime mutation is not portable.** A QBCore resource that calls `QBCore.Functions.AddJob('mafia', {...})` at startup may work on QBCore, partially work on Qbox (depending on bridge version), and *not* work on ox_core. Never recommend runtime job mutation in generated code — always recommend seeding the database / config.
- **`qbx_core` LICENSE file still carries the es_extended copyright header.** This is correct attribution (Qbox inherits from QBCore which inherits from ESX patterns), but it surprises auditors. Document this so contributors don't think it's a bug.
- **`PlayerData` mutation across frameworks.** QBCore allows you to write directly to `PlayerData.metadata.something` and re-trigger a sync event. Qbox tolerates this through the bridge but discourages it. ox_core does not allow it — you must call setters. Generated code should always go through setters.
- **No tagged releases on `qb-core` itself.** If a Boilergen-generated resource pins `qb-core@v1.x.x`, that version doesn't exist as a GitHub release tag. Pin to a commit SHA or a date, not a SemVer tag.
- **Dual-target tests are 2x the CI matrix.** Adding a `fivem-ox` target means CI needs FXServer fixtures for both QBCore and ox_core. Plan for that before the sprint, not during.

---

## 8. References

**Repos (verified licenses)**

- [overextended/ox_core](https://github.com/overextended/ox_core) — LGPL-3.0
- [Qbox-project/qbx_core](https://github.com/Qbox-project/qbx_core) — GPL-3.0 (with es_extended copyright header)
- [qbcore-framework/qb-core](https://github.com/qbcore-framework/qb-core) — GPL-3.0
- [esx-framework/esx_core](https://github.com/esx-framework/esx_core) — GPL-3.0
- [overextended/ox_inventory](https://github.com/overextended/ox_inventory) — companion inventory used by all three modern stacks
- [overextended/ox_lib](https://github.com/overextended/ox_lib) — utility library
- [overextended/oxmysql](https://github.com/overextended/oxmysql) — MySQL adapter

**Documentation**

- [overextended.dev](https://overextended.dev/) — official ox_core / ox_lib / ox_inventory docs (formerly coxdocs.dev)
- [docs.qbox.re](https://docs.qbox.re/) — official Qbox documentation
- [docs.qbox.re/faq](https://docs.qbox.re/faq) — Qbox FAQ (covers QBCore relationship, bridge layer)

**Cfx.re license / official posts**

- [Creator Platform License Agreement (Jan 12, 2026 PDF)](https://static.cfx.re/platform-license-agreement-12-jan-2026.pdf)
- [cfx.re support article on PLA](https://support.cfx.re/hc/en-us/articles/24856975424924-Rockstar-Games-Creator-Platform-License-Agreement)
- [cfx.re forum announcement: Updates to the Creator Platform License Agreement](https://forum.cfx.re/t/updates-to-the-creator-platform-license-agreement/5371920)

**Community comparisons (use with caution — vendor blogs, but useful for popularity signals)**

- Lation Scripts: "Best FiveM Framework in 2026: ESX vs QBCore vs Qbox" — <https://lationscripts.com/blog/what-is-the-best-fivem-framework>
- VertexMods: "QBOX vs QBCore" — <https://vertexmods.com/blog/qbox-vs-qbcore>
- qboxcore.com: "Qbox vs QBCore: which FiveM framework is best in 2025?" — <https://qboxcore.com/qbox-vs-qbcore/>

**Related Boilergen knowledge-base entries**

- [`qbcore-conventions.md`](./qbcore-conventions.md) — `Shared.*` registries, `GetCoreObject()`, dependency loading
- [`fivem-cross-resource-patterns.md`](./fivem-cross-resource-patterns.md) — exports, events, callbacks across resources
- [`fivem-resources.md`](./fivem-resources.md) — annotated list of canonical FiveM resources
- [`fivem-version-matrix.md`](./fivem-version-matrix.md) — framework / FXServer / artifact compatibility
