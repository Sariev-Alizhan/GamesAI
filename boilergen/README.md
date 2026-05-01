# Boilergen

Code generator for Grand Games projects. Turns YAML entity descriptions into boilerplate code across the GM1 stack (C++ server, Node API, Flutter admin, JSON i18n, DB migrations).

## Quick start

```bash
npm install
npm run build
node dist/cli/index.js generate ./schemas/gm1/dummy-profession.yaml
```

Output goes to `./test-output/<target>/<rendered-path>`.

## Commands

```
boilergen generate <schema>             Generate code from a YAML entity
  -p, --plugin <dir>     Plugin directory (default: ./plugins/gm1)
  -o, --output <dir>     Output base directory (default: ./test-output)
  -c, --config <file>    Use boilergen.config.yaml (overrides --plugin/--output)
  --dry-run              Preview output without writing files

boilergen list                          List available plugins
  -p, --plugins <dir>    Plugins directory (default: ./plugins)

boilergen init                          Create boilergen.config.yaml in a target project
  -p, --plugin <dir>     Plugin directory to base config on
  -o, --output <file>    Output config file path (default: ./boilergen.config.yaml)
  -f, --force            Overwrite existing config

boilergen schema-export                 Print/save JSON Schema for YAML autocomplete
  -o, --output <file>    Write to file instead of stdout

boilergen --help                        Show all commands
```

## Architecture

```
src/
├── core/                    # reusable library, no CLI deps
│   ├── types.ts             # Schema, Plugin, Template, InjectSpec
│   ├── schema-loader.ts     # YAML → Zod-validated Schema
│   ├── template-engine.ts   # Handlebars + helpers, frontmatter parser
│   ├── plugin-loader.ts     # recursive .hbs discovery + frontmatter
│   ├── config-loader.ts     # boilergen.config.yaml parser
│   └── generator.ts         # orchestrator (write + inject modes)
│
└── cli/                     # thin Commander wrapper over core
    ├── index.ts
    └── commands/{generate,list,init,schema-export}.ts

plugins/<plugin>/targets/<target>/<entity-type>/<output-path>.hbs
schemas/<plugin>/<entity>.yaml
```

The `core/` library is intentionally decoupled from the CLI — future MCP-server, web UI, or HTTP API adapters can import the same `loadSchema`, `loadPlugin`, and `generate` functions without touching the engine.

## Schema format

Each YAML schema describes one entity:

```yaml
# yaml-language-server: $schema=../boilergen.schema.json
id: taxi_driver           # unique snake_case identifier
type: profession          # entity type — must match a folder under targets/<target>/
name: Таксист             # human-readable name
data:                     # free-form payload, accessible via {{data.X}}
  baseSalary: 500
  category: transport
```

The `# yaml-language-server` header gives VS Code (with the Red Hat YAML extension) live autocomplete and validation. Generate the schema file with `boilergen schema-export -o ./schemas/boilergen.schema.json`.

## Template layout convention

```
plugins/<plugin>/targets/<target>/<entity-type>/<output-path>.hbs
                          │       │              │
                          │       │              └─ rendered output path (Handlebars OK)
                          │       └─ must match schema.type to be applied
                          └─ destination layer (cpp-server, node-api, etc.)
```

Templates whose `<entity-type>` does not match `schema.type` are silently filtered. Templates not following the layout (no entity-type folder) are loaded with a warning and never match anything.

## Template helpers

Available in any `.hbs` template (in both filenames and content):

| Helper | Input | Output |
|---|---|---|
| `{{pascalCase id}}` | `taxi_driver` | `TaxiDriver` |
| `{{camelCase id}}` | `taxi_driver` | `taxiDriver` |
| `{{snakeCase id}}` | `taxi_driver` | `taxi_driver` |
| `{{kebabCase id}}` | `taxi_driver` | `taxi-driver` |
| `{{constantCase id}}` | `taxi_driver` | `TAXI_DRIVER` |
| `{{#if (eq type "profession")}}...{{/if}}` | — | conditional via `eq` / `neq` |

Output is **never HTML-escaped** — we generate code, not markup.

## Inject mode (in-place file editing)

Templates can declare YAML frontmatter to **modify existing files** instead of creating new ones — useful for auto-registering generated entities in routers, indexes, etc.

```hbs
---
to: src/router.ts                        # required, relative to target root
inject: after                             # required: 'after' or 'before'
anchor: "// ROUTES_REGISTRY"              # required, substring marker
skipIf: "{{camelCase id}}Controller"      # optional, regex idempotency guard
---
import { {{camelCase id}}Controller } from './controllers/{{kebabCase id}}.js';
router.use({{camelCase id}}Controller);
```

All four frontmatter fields are rendered through Handlebars with the schema as context. If `skipIf` matches the target file, the inject is skipped (idempotent). If the anchor isn't found, an error is reported (the batch continues with other templates).

## Project config (`boilergen.config.yaml`)

Place this in the **target project** (the GM1 repo, not Boilergen) to map the plugin's targets to actual paths in that project:

```yaml
plugin: ../boilergen/plugins/gm1
targets:
  cpp-server: ./server/src
  node-api: ./api/src
  flutter-admin: ./admin/lib
  shared: .
```

Then run from the target project:
```bash
boilergen generate ../boilergen/schemas/gm1/barista.yaml --config ./boilergen.config.yaml
```

Bootstrap with `boilergen init` to get a pre-filled template.

## NPM scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Run CLI via `tsx` (no build step needed) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled version |
| `npm run typecheck` | Verify types without emitting |
| `npm test` | Run Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run clean` | Remove `dist/` |

## Tests

Vitest suite in `tests/`, ~50 tests covering all five core modules and inject feature. Each test uses isolated `os.tmpdir()` fixtures — no shared state, no risk of mutating project files.

## Status

**MVP feature-complete on dummy data.** Real GM1 templates pending input from the lead developer.

- ✅ Schema parsing + validation
- ✅ Template rendering with case helpers
- ✅ Plugin discovery with entity-type filtering
- ✅ File generation (write mode + inject mode)
- ✅ Dry-run preview
- ✅ Project-level config files
- ✅ JSON Schema export for IDE autocomplete
- ✅ Test coverage (50/50 green)
- ⏳ Real GM1 templates (Stage 3, blocked on lead dev input)

GM2 plugin (Unity + Node) is currently out of scope. May share entity schemas with GM1 in the future via a `shared/` plugin layer; not part of MVP.
