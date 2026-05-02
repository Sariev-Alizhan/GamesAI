---
type: pattern
slug: role-grade-hierarchy
title: Tiered grades — the role-and-permission pattern shared across job/business/organization
content_format: yaml
language: cross-cutting
license: mit
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: critical
tags: [rp, qbcore, schema-design, permissions, hierarchy, cross-cutting]
---

# Tiered grades — the cross-cutting hierarchy pattern

> Roleplay servers across QBCore, ESX, Qbox, and custom-stack frameworks all
> use the same shape for "an entity with a tiered membership and a boss flag":
> `grades` (or `ranks`, or `roles`) — an ordered list, each entry has a name,
> a payment/permission delta, and an `isBoss`/`isLeader` boolean. This pattern
> recurs in **job, business, and organization** entities. Recognizing it as
> one pattern lets a tool generate the same scaffolding for all three.
> Boilergen's `generic-rp` plugin uses this insight directly.

## The pattern in one sentence

```
{
  grades: [
    { name: <string>, <numeric or permission delta>, isBoss: <bool> },
    ...
  ]
}
```

The list is ordered — index 0 is the lowest grade, last index is the highest. The `isBoss` flag (sometimes `isLeader`, `isHead`) singles out the role with hire/fire / fund-management / membership-manage permissions.

## Where it appears

### Jobs

Roleplay professions: taxi driver, mechanic, police officer.

```yaml
type: job
data:
  grades:
    - { name: Trainee,     payment: 50,  isBoss: false }
    - { name: Driver,      payment: 75,  isBoss: false }
    - { name: Senior,      payment: 100, isBoss: false }
    - { name: Manager,     payment: 150, isBoss: true }
```

QBCore's `QBCore.Shared.Jobs` registry uses this exact shape with `payment` as numeric salary per grade and `isboss` controlling hire/fire authority.

### Businesses

Commercial enterprises: shops, restaurants, garages.

```yaml
type: business
data:
  grades:
    - { name: Cashier,     payment: 100, isBoss: false }
    - { name: Senior,      payment: 175, isBoss: false }
    - { name: Manager,     payment: 300, isBoss: true }
```

In QBCore-like frameworks the manager-grade controls the business's `funds` field, sets prices, hires/fires.

### Organizations (gangs / legal factions)

```yaml
type: organization
data:
  ranks:                         # called "ranks" rather than "grades"
    - { name: Recruit,    level: 0, isLeader: false }
    - { name: Lieutenant, level: 1, isLeader: false }
    - { name: Boss,       level: 2, isLeader: true }
```

Note the rename: `grades → ranks`, `payment → level`, `isBoss → isLeader`. The semantics are different (gangs don't pay salaries, they have hierarchical respect-levels), but the SHAPE — ordered list, name, ordinal field, top-flag bool — is the same.

QBCore slots gangs into `QBCore.Shared.Gangs` keyed by name with the same `grades` substructure (renamed for fit). Boilergen's `fivem-qb/organization/` template registers `category == 'gang' | 'mafia'` orgs into Shared.Gangs and exposes the rest via `_G.BoilergenOrganizations`.

### Families (Grand Mobile-specific)

```yaml
type: family
data:
  roles:                         # called "roles" — kinship slots, not pay tiers
    - { name: Head,        isHead: true,  maxOccupants: 1 }
    - { name: Spouse,      isHead: false, maxOccupants: 1 }
    - { name: Child,       isHead: false, maxOccupants: 6 }
```

A further variation: family `roles` cap how many concurrent members can occupy each slot. The shape is broader (per-role capacity), but `isHead` plays the same role as `isBoss`/`isLeader`.

## Why the pattern recurs

It recurs because RP servers all need to answer the same question: "**given a player and an entity (job/business/org/family), what permissions do they have?**" The answer is always "look up their grade index, check the top-flag bool." Frameworks that tried more elaborate models (per-permission flags, role-based ACLs) got reverted because no UI / event system in the FiveM ecosystem expects them. The simple ordered-list-with-boss-flag wins by Schelling-point.

## Implications for tooling

Recognising the pattern means:

1. **One template macro for all four entity types.** The Boilergen `generic-rp` plugin's i18n template uses `{{#each data.grades}}` (or `data.ranks`/`data.roles`) and emits one locale entry per grade. The generator doesn't care which entity type produced the array — it just iterates.

2. **One validator rule for all four entity types.** A "no two grades have the same name" constraint applies equally to jobs, businesses, organizations, and families. Schema Validator's reference-finder is type-agnostic for this reason.

3. **One AI Describe behaviour.** When a user asks "create a job with three grades," Boilergen's AI Describe (RAG-fed) understands the shape regardless of whether the request was for a job, business, or org. Hits this entry in the knowledge base, generates the correct `grades` array.

## Anti-patterns

### Putting permission flags as named booleans

```yaml
# BAD: doesn't compose with QBCore Shared.* registries
grades:
  - { name: Manager, canHire: true, canFire: true, canSetPrice: true }
```

QBCore's UI doesn't read `canHire`/`canFire`. It reads `isboss`. Use the convention.

### Skipping the index-based ordering

```yaml
# BAD: dictionary instead of ordered list
grades:
  trainee:  { payment: 50,  isBoss: false }
  manager:  { payment: 150, isBoss: true }
```

QBCore expects a string-int-keyed dict (`['0']`, `['1']`...) at registration time. Boilergen's template emits the int-keyed form even though the YAML source is an ordered list — best of both worlds.

### Putting a salary on a gang

```yaml
type: organization
data:
  category: gang
  grades:
    - { name: Soldier, payment: 100, isBoss: false }   # ← unused; gangs don't pay salaries
```

Gang membership is a hierarchy, not a paid job. The convention is `ranks` with `level`/`isLeader`, not `grades` with `payment`/`isBoss`. Boilergen's `organization` schema enforces this rename.

## How this connects to Boilergen and Schema Validator

- **Boilergen schemas** (`boilergen/schemas/generic-rp/`) use the right field name per entity type: `grades` for job/business, `ranks` for organization, `roles` for family. The templates dispatch on the right name.
- **Schema Validator** treats grade/rank/role names as candidate IDs only when explicitly configured — by default they're enums (not foreign-key references). This is the right call: a grade name is a label, not a cross-reference.
- **AI Describe RAG**: when a user prompt mentions hierarchy/permissions/grade, this entry fires and primes the model to use the established shape.

## References

- QBCore Shared.Jobs / Shared.Gangs registries: https://github.com/qbcore-framework/qb-core/blob/main/shared/jobs.lua
- ESX `addJob` API (the older convention): https://documentation.esx-framework.org/server/jobs/
- Qbox jobs system: https://github.com/Qbox-project/qbx_core/tree/main/shared
- Local artefacts:
  - `boilergen/plugins/generic-rp/targets/fivem-qb/job/jobs/`
  - `boilergen/plugins/generic-rp/targets/fivem-qb/business/businesses/`
  - `boilergen/plugins/generic-rp/targets/fivem-qb/organization/organizations/`
  - `boilergen/plugins/generic-rp/targets/fivem-qb/family/families/`
