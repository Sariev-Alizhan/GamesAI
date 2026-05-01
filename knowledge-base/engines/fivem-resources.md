---
type: engine
slug: fivem-resources
title: FiveM / altV / RAGE Multiplayer Resources
genre: rp / mmo
engine: fivem, altv, ragemp
content_format: lua, javascript, json
language: lua, javascript, csharp
license: various (FiveM EULA, altV MIT, etc.)
source_url: https://docs.fivem.net/docs/scripting-manual/introduction/introduction-to-resources/
relevance_to_grandgames: high — direct neighbour in the GTA-RP space, GM1 audience overlaps heavily; their patterns are what your players have seen elsewhere
last_reviewed: 2026-05-01
---

# FiveM / altV / RAGE Multiplayer Resources

The dominant scripting frameworks for GTA V multiplayer (and by proxy the entire commercial GTA-RP scene) all converge on the same architectural primitive: the **resource**. A resource is a self-contained folder with a manifest, scripts, configs, and assets. The server loads them on startup, and they communicate via events.

This is the closest existing analogue to what Grand Games is doing — and probably what GM1's design instincts already mirror.

## Why this matters for Boilergen

Two reasons:

1. **Players' mental model** — anyone coming from FiveM / altV expects a "resource" to mean a self-contained chunk of content with a manifest. If GM1's plugin/content layout deviates wildly, modders/contractors familiar with FiveM will have a learning curve. Borrowing the conceptual shape is free brand alignment.
2. **Concrete content patterns** — the FiveM ecosystem has converged (after 8+ years of trial and error) on certain patterns for jobs, vehicles, weapons, businesses. These are exactly the entity types Boilergen targets. We can validate our schema designs against what the FiveM community has settled on.

## Content architecture: the resource manifest

Every FiveM resource has an `fxmanifest.lua` (or older `__resource.lua`):

```lua
fx_version 'cerulean'
game 'gta5'

author 'Grand Games'
description 'Taxi Driver Job'
version '1.0.0'

shared_scripts {
    'config.lua',
    'shared/locale.lua',
}
client_scripts {
    'client/main.lua',
}
server_scripts {
    'server/main.lua',
    '@oxmysql/lib/MySQL.lua',
}

dependencies {
    'qb-core',
    'oxmysql',
}
```

This is a **declarative content unit** — exactly the shape a Boilergen plugin emits.

## Job / Profession pattern (qb-core / es_extended)

The two dominant frameworks (QBCore and ESX) define jobs almost identically:

```lua
-- QBCore.Shared.Jobs (excerpt)
['taxi'] = {
    label = 'Downtown Cab Co.',
    defaultDuty = true,
    offDutyPay = false,
    grades = {
        ['0'] = { name = 'Recruit', payment = 50 },
        ['1'] = { name = 'Driver',  payment = 75 },
        ['2'] = { name = 'Experienced', payment = 100 },
        ['3'] = { name = 'Boss', isboss = true, payment = 150 },
    },
},
```

**Patterns to extract:**

- `id` (key), `label` (display), `grades` (rank table) → these are the canonical fields.
- Each grade has its own payment, name, and boss flag.
- Multi-language support is handled separately (locale file), not embedded in the job definition.

**Boilergen mapping** — a `profession` schema for a GTA-RP plugin should cover exactly these fields. Compare with our current `dummy-profession.yaml` — we have `baseSalary` but not `grades`. Real RP jobs are tiered. **This is a concrete schema improvement** worth proposing to Igor.

## Vehicle pattern (vehicles.meta + shared config)

Vehicles in FiveM are weirder — base data lives in GTA's own `vehicles.meta` XML, but RP frameworks layer their own data on top:

```lua
-- QBCore Vehicles
['adder'] = {
    name = 'Adder',
    brand = 'Truffade',
    model = 'adder',
    price = 1000000,
    category = 'super',
    type = 'automobile',
    shop = 'pdm',
},
```

**Patterns to extract:**

- Base game model is referenced by spawn name (`model`), not generated.
- Shop placement (`shop`), category (`super` / `sports` / `compact`), and economy (`price`) live in a separate layer from physics/handling.
- Brand is a separate field for filtering/UI.

**Boilergen implication** — the `vehicle` schema for an RP plugin should split between **content metadata** (price, brand, category) and **engine binding** (model name, handling reference). Two layers, not one flat blob.

## Weapon pattern (weapons.meta + shared config)

Same split as vehicles. Weapon stats (damage, accuracy, recoil) live in `weapons.meta` (game-engine layer); RP-level economy (price, vendor, license requirements) lives in a Lua config.

```lua
['weapon_pistol'] = {
    name = 'Pistol',
    label = 'Pistol',
    weapontype = 'Pistol',
    ammotype = 'AMMO_PISTOL',
    damagereason = 'Shot',
    price = 5000,
    license = 'pistol',
},
```

## Patterns worth borrowing

### 1. Manifest-first resources
Every content unit has an explicit manifest declaring what it ships, what it depends on, and what version it is. Maps onto Boilergen plugins — each `plugins/<id>/` should have a manifest (we have `config.yaml.example` placeholder; this is the right direction).

### 2. Tiered jobs with grades
RP jobs are not flat. They have promotion grades, each with its own payment and permissions. The `boss` flag controls administrative actions (hiring, firing, business funds). Boilergen's `profession` schema should support this from day one if targeting RP.

### 3. Locale separation
Display strings (labels, descriptions) are not in the job/vehicle/weapon definition. They live in a separate locale file keyed by ID. This is exactly what our `shared/i18n/` pattern does — validation that we got this right.

### 4. Server / client / shared script split
A resource has up to three layers: shared (loaded both sides), client (loaded only on player), server (loaded only on game server). Each script declares its scope. Boilergen plugins targeting RP should mirror this in template organization (`targets/server`, `targets/client`, `targets/shared`).

### 5. Dependency graph
The manifest declares dependencies on other resources. The server load order respects this. We don't model this yet in Boilergen plugins — worth considering for the Grand Games plugin if we ship multiple Boilergen-managed entity types that reference each other.

## Patterns to avoid

- **Hardcoded GUIDs everywhere.** FiveM's older codebases had jobs identified by numeric IDs that were duplicated across server and client. Modern RP servers use string IDs. Always strings, never numerics.
- **Flat config files with thousands of entries.** Some legacy RP servers have a single 5000-line `config_jobs.lua`. This is hard to PR-review, hard to merge, and hostile to per-job ownership. Boilergen-style "one file per entity" is strictly better.
- **Mixing engine bindings with content data.** When `vehicles.meta` overrides handling are inlined into the same Lua table as economy data, you can't change one without touching the other. Two-layer split (game-engine vs. content-economy) is essential.

## Why this is the most relevant entry for Grand Games

GM1 is in the same product category as the games this ecosystem powers. Whatever you do for content schemas, your developers (and likely Igor) have probably worked with or alongside FiveM-style resources. **Aligning Boilergen schemas with the conventions this ecosystem has converged on is essentially free leverage** — no learning curve, no novelty risk, and a clear path to onboarding outside contractors who have FiveM experience.

The single highest-leverage change would be **adding `grades` to the profession schema** as a first-class field. That alone would 10x the realism of generated profession files for an RP context.

## Related entries

- [Data-Driven Content Design](../patterns/data-driven-content.md) — the umbrella pattern
- [Component-Based Design](../patterns/component-based-design.md) — RP frameworks use ECS-lite for player state

## Sources

- FiveM docs: [Introduction to resources](https://docs.fivem.net/docs/scripting-manual/introduction/introduction-to-resources/)
- QBCore Framework: https://github.com/qbcore-framework/qb-core
- ESX Framework: https://github.com/esx-framework/esx_core
- altV docs: https://docs.altv.mp/
