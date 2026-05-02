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

Generates code into four targets:

```
<output>/
├── cpp-server/        # game-server-side: classes for Job / Vehicle / Weapon
├── node-api/          # admin REST API endpoints for editing/listing
├── flutter-admin/     # admin form widget
└── shared/            # locale JSON (ru/en/kk placeholders)
```

If you fork this plugin into a different stack (e.g. Unity C# server + Vue admin), just swap the templates inside each `targets/<layer>/<entity-type>/` folder. The schema stays the same.

## Open questions

- Should `job.grades` support an inheritance chain (grade 2 inherits permissions from grade 1)? Currently flat. Most RP frameworks keep them flat — start simple.
- Should `vehicle.engine.handling` reference an external file or be inlined? Currently inlined string ref. FiveM convention is external `.meta` file.

These are the kinds of decisions that get easier when a real studio (Grand Games or another) adopts the plugin and pushes back.

## Sources

- Pattern derived from: [`knowledge-base/engines/fivem-resources.md`](../../../knowledge-base/engines/fivem-resources.md)
- See also: [`knowledge-base/games/foundry-vtt.md`](../../../knowledge-base/games/foundry-vtt.md) for the system/module split that inspired the layer separation.
