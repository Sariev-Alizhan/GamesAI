# Schema Validator

> Cross-reference validator for game data + a FiveM resource graph linter. Catches broken references — loot table pointing at a non-existent item, level pool pointing at a deleted enemy, FiveM dependency name mismatched against folder case — **before runtime**.

**Module 3 in the [GamesAI platform](../../VISION.md).** Two modes:
- **`check`** — YAML/JSON game-data schemas. Pairs with Boilergen output.
- **`check-fivem`** — FiveM resources directory. Parses `fxmanifest.lua`, validates dependencies / script files / cross-resource refs.

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

## FiveM mode (`check-fivem`)

Validates a directory of FiveM resources. Each subfolder containing `fxmanifest.lua` (or legacy `__resource.lua`) is treated as a resource; categorisation folders (`[qb]`, `[standalone]`) are walked through transparently.

```bash
# Validate a FiveM resources directory
npx schema-validator check-fivem ./resources

# Treat warnings as errors for strict CI
npx schema-validator check-fivem ./resources --strict

# JSON output
npx schema-validator check-fivem ./resources --json | jq '.stats'
```

**What it catches:**

| Category | Severity | Example |
|---|---|---|
| `missing-manifest` | error | Folder looks like a resource but has no `fxmanifest.lua` |
| `manifest-parse-error` | warning | Unterminated string, broken Lua syntax |
| `missing-required-field` | error | `fx_version` or `game` not declared |
| `unknown-game` | warning | `game 'fivenights'` (allowed: gta5, rdr3, common) |
| `dependency-not-found` | error | `dependencies { 'qb-core' }` but no `qb-core/` folder in tree |
| `dependency-case-mismatch` | error | Folder is `qb-core`, manifest declares `QB-Core` — Linux runners fail this |
| `missing-script-file` | error | `client_scripts { 'client/main.lua' }` but file doesn't exist |
| `cross-resource-no-dep` | warning | `shared_scripts { '@ox_lib/init.lua' }` but `ox_lib` not in `dependencies` |
| `duplicate-resource` | error | Two folders with the same name in the tree |

**Why this exists:** xEdit/TES5Edit-style cross-reference validation has existed for Bethesda mods for 15+ years. There is no equivalent OSS tool for FiveM/altV/RAGE-MP — every server owner runs into the same Linux case-sensitivity, missing-script-file, and broken-dependency footguns alone. This linter is the missing static-type-check for Lua resources.

The Lua parser in `src/fivem/parser.ts` covers the narrow subset fxmanifests actually use — single-string fields, array literals, single-line + block comments, long-bracket `[[...]]` strings. Real Lua control flow (if/for/functions) is silently ignored without crashing — those resources just don't get validated.

## Status

**v0.2.0 — YAML game-data + FiveM resource graph.** Two commands (`check`, `check-fivem`). 70 tests covering loader, reference-finder, validator, namespaces, FiveM parser, FiveM validator.

Roadmap:
- v0.3 — Pre-commit hook integration (`schema-validator install-hook`)
- v0.4 — Watch mode for live validation during editing
- v0.5 — Web UI showing the entity graph with broken edges highlighted
- v0.6 — Format support beyond YAML (JSON, TOML)
- v0.7 — FiveM mode: SQL migration drift detection (column references in Lua vs schema)
- v0.8 — FiveM mode: qb-target zone validation against ped models

## License

MIT — see repo root.
