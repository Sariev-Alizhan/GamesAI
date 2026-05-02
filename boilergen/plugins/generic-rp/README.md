# Generic RP Plugin

Universal Boilergen plugin for **GTA-style multiplayer roleplay** projects (any stack — these templates are illustrative, easy to adapt).

## Why this exists

The `gm1/` plugin is specific to one studio's stack. This plugin (`generic-rp/`) is the *opposite* — it's a reference plugin that:

1. **Demonstrates the right schema shapes** for the most common RP entities (job / vehicle / weapon).
2. Embeds patterns observed in the dominant FiveM/altV/RAGE ecosystem (see [`knowledge-base/engines/fivem-resources.md`](../../../knowledge-base/engines/fivem-resources.md)).
3. Works out of the box for *any* studio that wants to try Boilergen — fork this plugin, replace templates with their own engine bindings.

## What's different from `gm1/`

| Aspect | gm1/ (specific) | generic-rp/ (reference) |
|---|---|---|
| Job schema | `baseSalary: 500` (flat) | `grades: [...]` (tiered) — like every real RP framework |
| Vehicle | One blob | Split into `engine` (handling, model) and `economy` (price, dealer) |
| Weapon | One blob | Split into `combat` (damage, fire rate) and `economy` (price, license) |
| Targets | C++ server / Node API / Flutter admin / shared | Same four layers — easy to fork into other stacks |

## Entity types

### `job` (3 templates × 4 layers + i18n)

A roleplay profession — taxi driver, police officer, mechanic, etc. **Has tiered grades** (Recruit / Driver / Boss). Every grade has its own pay, name, and `isBoss` flag (controls hire/fire permissions, business funds).

### `vehicle` (3 templates × 4 layers + i18n)

A drivable car / bike / boat. Two layers:
- **engine** — `model` (engine spawn name), `handling` ref. Bound to actual game engine.
- **economy** — `price`, `dealer`, `category` (sports / sedan / truck), `tradeable`. Pure RP layer.

### `weapon` (3 templates × 4 layers + i18n)

A firearm or melee. Two layers:
- **combat** — `damage`, `fireRate`, `magazineSize`, `range`. Engine-bound.
- **economy** — `price`, `vendor`, `license` (which RP license is required to buy). Pure RP layer.

### `business` (4 templates × 4 layers + i18n)

A commercial enterprise (shop / restaurant / garage / casino / bank). Owned by `state`, `player`, or `organization`. Has tiered `grades` like jobs (employee → manager → boss), a `funds` balance, a `markupPercent` over base item prices, and a `locationId` reference.

### `organization` (4 templates × 4 layers + i18n)

A faction or legal organization (gang / legal / government / civilian). Has hierarchical `ranks` (level 0 → leader), a `color` for UI tags, `maxMembers`, and a list of `territories` (zone ids). Different from `job` — a player may hold a `job` AND belong to an `organization`.

### `family` (4 templates × 4 layers + i18n)

A roleplay family unit (civilian / mafia / dynasty). Mirrors Grand Mobile's "Family" system. Has kinship `roles` (head / spouse / child) with `maxOccupants` per role, plus a `housePropertyId` cross-reference to a `property` entity.

### `property` (4 templates × 4 layers + i18n)

Real estate (apartment / house / garage / business_slot). Has `locationId`, `purchasePrice`, `rentPricePerDay`, `maxOccupants`, an `ownership` field (`state` / `player_<id>` / `organization_<id>`), and a list of feature tags.

## Schema examples

See [`schemas/generic-rp/`](../../schemas/generic-rp/) — seven real-shaped schemas demonstrating each entity type:

- `taxi-driver.yaml` (job), `bmw-m5.yaml` (vehicle), `ak47.yaml` (weapon)
- `24-7-store.yaml` (business), `police-department.yaml` (organization), `ivanov-family.yaml` (family), `apartment-riverside-204.yaml` (property)

Use them as starting points.

## Output structure

Generates code into five targets (job has all five, others have four):

```
<output>/
├── cpp-server/                  # game-server-side: classes for Job / Vehicle / Weapon / etc.
├── node-api/                    # admin REST API endpoints for editing/listing
├── flutter-admin/               # admin form widget
├── shared/                      # locale JSON (ru/en/kk placeholders)
└── fivem-qb/                    # FiveM/QBCore drop-in resource per job (job entity only, v1)
    └── jobs/<id>/
        ├── fxmanifest.lua       # cerulean, dependencies { 'qb-core' }
        ├── config.lua           # Config.Job table with grades
        ├── server/main.lua      # QBCore.Functions.AddJob registration + payroll stub
        ├── client/main.lua      # OnJobUpdate handler + /toggleduty<Job> command
        └── migrations/001_seed.sql  # optional INSERT, commented by default
```

If you fork this plugin into a different stack (e.g. Unity C# server + Vue admin), just swap the templates inside each `targets/<layer>/<entity-type>/` folder. The schema stays the same.

## FiveM/QBCore output (job entity)

The `fivem-qb` target produces a complete drop-in resource — a server owner can copy `<output>/fivem-qb/jobs/<id>/` into their `resources/` folder and `ensure <id>` it.

The generated manifest is structured to **pass `schema-validator check-fivem` by construction** (see `tools/schema-validator/`):

- `fx_version 'cerulean'` and `game 'gta5'` are always present
- Every `@<resource>/...` reference is reflected in `dependencies { ... }` (we use the modern exports-based pattern, so there are no `@qb-core/...` shared_scripts at all — just `dependencies { 'qb-core' }`)
- `lua54 'yes'` is set so modern Lua features compile

Generated `client/main.lua` exposes `/toggleduty<PascalJob>` for QA — strip it before shipping if you don't want player-facing duty toggles. Generated `server/main.lua` includes a stub event `<job>:server:paycheck` you can hook your custom payout logic into; QBCore's default paycheck system already pays based on `Player.PlayerData.job.grade.payment` so the stub is opt-in.

v1 covers job only. Vehicle / weapon / business / organization / family / property FiveM targets are tracked for v2 (each maps to its own QBCore convention — `qb-vehicleshop`, `qb-shops`, `qb-gangs`, etc.).

## Open questions

- Should `job.grades` support an inheritance chain (grade 2 inherits permissions from grade 1)? Currently flat. Most RP frameworks keep them flat — start simple.
- Should `vehicle.engine.handling` reference an external file or be inlined? Currently inlined string ref. FiveM convention is external `.meta` file.

These are the kinds of decisions that get easier when a real studio (Grand Games or another) adopts the plugin and pushes back.

## Sources

- Pattern derived from: [`knowledge-base/engines/fivem-resources.md`](../../../knowledge-base/engines/fivem-resources.md)
- See also: [`knowledge-base/games/foundry-vtt.md`](../../../knowledge-base/games/foundry-vtt.md) for the system/module split that inspired the layer separation.
