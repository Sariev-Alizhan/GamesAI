# Schema Validator

> Cross-reference validator for game data schemas. Catches broken references — loot table pointing at a non-existent item, level pool pointing at a deleted enemy, quest reward pointing at a typo'd item id — **before runtime**.

**Module 3 in the [GamesAI platform](../../VISION.md).** Pairs naturally with Boilergen — Boilergen generates entities, Schema Validator confirms their cross-references resolve.

## What it does

```
schemas/
├── enemies/
│   ├── slime.yaml         (lootTable: [health_potion, copper_coin])
│   └── goblin.yaml        (lootTable: [rusty_dagger, gold_coin])
└── items/
    ├── health_potion.yaml ✓
    ├── copper_coin.yaml   ✓
    └── rusty_dagger.yaml  ✓

   schema-validator check ./schemas
   ↓
   ✗ slime references "copper_coin" → exists ✓
   ✗ slime references "health_potion" → exists ✓
   ✗ goblin references "gold_coin" → MISSING (you probably meant copper_coin)
   ⚠ rusty_dagger has no incoming references (orphan)

   1 error, 1 warning
```

## Why this exists

In data-driven games, IDs string-typed and string-validated. Compilers don't help. Runtime crashes happen weeks after the typo — usually right after a release. Schema Validator runs in a CI step or as a pre-commit hook and fails the build the moment a reference breaks.

## Install

```bash
cd tools/schema-validator
npm install
npm run build
```

## Use

```bash
# Validate every YAML in ./schemas/
npx schema-validator check ./schemas

# Use explicit reference field config (recommended for precise type checking)
npx schema-validator check ./schemas --config ./validator.config.yaml

# Suppress orphan warnings (useful in early development)
npx schema-validator check ./schemas --ignore-orphans

# JSON output for CI integration
npx schema-validator check ./schemas --json | jq '.stats'
```

## Detection strategies

### 1. Heuristic detection (default ON)

Field names ending in `Id`, `Pool`, `Table`, `Refs` (case-insensitive) are treated as reference fields. Values that look like snake_case IDs are checked. Loose, false-positive-resistant — turn off with `--no-heuristics` if it's noisy.

### 2. Explicit config (recommended for production)

Create `validator.config.yaml`:

```yaml
referenceFields:
  lootTable:           item
  dropTable:           item
  enemyPool:           enemy
  itemPool:            item
  itemRewards:         item
  nextLevel:           level
  prerequisiteQuestId: quest
  targetId:            item   # quest objective target

# Strings that look like IDs but aren't (categories, enums, etc.)
knownEnums:
  - rifle
  - pistol
  - melee
  - sedan
  - super
  - main
  - side
  - kill
  - collect

# Suppress orphan warnings — some entities are spawned at runtime and won't have schema-level incoming refs
ignoreOrphans: true
```

The explicit form gives you **type-checked references** — Schema Validator will catch not just missing ids but also wrong types (e.g. a quest reward pointing at an enemy id instead of an item id).

## Issue categories

| Category | Severity | Example |
|---|---|---|
| `duplicate-id` | error | Two entities with the same id |
| `broken-reference` | error | Reference to a non-existent id |
| `reference-type-mismatch` | error | Reference resolves but type is wrong (e.g. expected item, got enemy) |
| `invalid-schema` | error/warning | Schema doesn't have id/type/name/data shape |
| `orphan-entity` | warning | Entity exists but nothing references it |

## Pairs with Boilergen

Boilergen generates schemas. Schema Validator confirms they fit together. Suggested workflow:

```bash
# In your project's CI / pre-push hook:
boilergen generate $(find schemas/ -name '*.yaml' -newer .last-generate)
schema-validator check ./schemas --config ./validator.config.yaml
```

If validation fails, the PR doesn't merge. Typos caught before they reach production.

## Status

**v0.1.0 — MVP.** Single command (`check`), works on YAML schemas with `id/type/name/data` shape (the Boilergen convention).

Roadmap:
- v0.2 — Pre-commit hook integration (`schema-validator install-hook`)
- v0.3 — Watch mode for live validation during editing
- v0.4 — Web UI showing the entity graph with broken edges highlighted
- v0.5 — Format support beyond YAML (JSON, TOML)

## License

MIT — see repo root.
