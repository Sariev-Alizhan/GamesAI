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
└── fivem-qb/                    # FiveM/QBCore drop-in resources — one folder per entity
    ├── jobs/<id>/                  job (5 files): fxmanifest, config, server, client, migration
    ├── vehicles/<id>/              vehicle (3 files): fxmanifest, config, server
    ├── weapons/<id>/               weapon (3 files): fxmanifest, config, server
    ├── businesses/<id>/            business (3 files): fxmanifest, config, server
    ├── organizations/<id>/         organization (3 files): fxmanifest, config, server
    ├── families/<id>/              family (3 files): fxmanifest, config, server
    └── properties/<id>/            property (3 files): fxmanifest, config, server
```

If you fork this plugin into a different stack (e.g. Unity C# server + Vue admin), just swap the templates inside each `targets/<layer>/<entity-type>/` folder. The schema stays the same.

## FiveM/QBCore output — full coverage (all 7 entity types)

The `fivem-qb` target produces a complete drop-in resource per entity. A server owner can copy any `<output>/fivem-qb/<plural>/<id>/` folder into their `resources/` and `ensure <id>` it.

Every generated manifest is structured to **pass `schema-validator check-fivem` by construction** (see [`tools/schema-validator/CASE-STUDY-PLATFORM-LOOP.md`](../../../CASE-STUDY-PLATFORM-LOOP.md) for end-to-end demo):

- `fx_version 'cerulean'` and `game 'gta5'` are always present
- `dependencies { 'qb-core' }` declared (modern exports-based pattern; no `@qb-core/...` shared_scripts)
- `lua54 'yes'` is set so modern Lua features compile

### Entity-by-entity behaviour

| Entity | Registers into | Extra runtime |
|---|---|---|
| `job` | `QBCore.Functions.AddJob(name, ...)` | `<id>:server:paycheck` event stub; client `/toggleduty<Pascal>` command for QA |
| `vehicle` | `QBCore.Shared.Vehicles[name]` | `GetHashKey(model)` filled in automatically |
| `weapon` | `QBCore.Shared.Weapons[hash]` | `ammotype`/`damagereason` derived from category + label |
| `business` | `_G.BoilergenBusinesses` + `exports('GetBusinessConfig')` | framework-neutral surface (qb-shops / qb-businesses / qbx_management can read) |
| `organization` | `QBCore.Shared.Gangs[name]` for category=gang/mafia; `_G.BoilergenOrganizations` otherwise | conditional registration based on category |
| `family` | `_G.BoilergenFamilies` + `exports('GetFamilyConfig')` | custom convention (no QBCore canonical family system) |
| `property` | `_G.BoilergenProperties` + `exports('GetPropertyConfig')` | maps loosely onto qb-houses / qb-apartments |

For the rationale on why these conventions matter (Shared.* registries vs `_G` fallback, dependency declaration, lua54 directive), see [`knowledge-base/engines/qbcore-conventions.md`](../../../knowledge-base/engines/qbcore-conventions.md).

For why `job.grades`, `business.grades`, `organization.ranks`, and `family.roles` all share the same shape (and why that's intentional), see [`knowledge-base/patterns/role-grade-hierarchy.md`](../../../knowledge-base/patterns/role-grade-hierarchy.md).

## Open questions

- Should `job.grades` support an inheritance chain (grade 2 inherits permissions from grade 1)? Currently flat. Most RP frameworks keep them flat — start simple.
- Should `vehicle.engine.handling` reference an external file or be inlined? Currently inlined string ref. FiveM convention is external `.meta` file.

These are the kinds of decisions that get easier when a real studio (Grand Games or another) adopts the plugin and pushes back.

## Sources

- Pattern derived from: [`knowledge-base/engines/fivem-resources.md`](../../../knowledge-base/engines/fivem-resources.md)
- See also: [`knowledge-base/games/foundry-vtt.md`](../../../knowledge-base/games/foundry-vtt.md) for the system/module split that inspired the layer separation.
