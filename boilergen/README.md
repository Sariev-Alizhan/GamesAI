# Boilergen

Code generator for Grand Games projects. Turns YAML entity descriptions into boilerplate code across the GM1 stack (C++ server, Node API, Flutter admin, shared assets).

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

boilergen --help                        Show all commands
```

## Architecture

```
src/
├── core/                    # reusable library, no CLI deps
│   ├── types.ts             # Schema, Plugin, Template
│   ├── schema-loader.ts     # YAML → Zod-validated Schema
│   ├── template-engine.ts   # Handlebars + helpers
│   ├── plugin-loader.ts     # recursive .hbs discovery
│   └── generator.ts         # orchestrator
└── cli/                     # thin Commander wrapper over core
    ├── index.ts
    └── commands/generate.ts

plugins/<plugin>/targets/<target>/<path-with-{{handlebars}}>.hbs
schemas/<plugin>/<entity>.yaml
```

The `core/` library is intentionally decoupled from the CLI — future MCP-server, web UI, or HTTP API adapters can import the same `loadSchema`, `loadPlugin`, and `generate` functions without touching the engine.

## Schema format

Each YAML schema describes one entity:

```yaml
id: taxi_driver           # unique snake_case identifier
type: profession          # entity type (used in templates and routing)
name: Таксист             # human-readable name
data:                     # free-form payload, accessible via {{data.X}}
  baseSalary: 500
  category: transport
```

## Template helpers

Available in any `.hbs` template (in both filenames and content):

- `{{pascalCase id}}` → `TaxiDriver`
- `{{camelCase id}}` → `taxiDriver`
- `{{snakeCase id}}` → `taxi_driver`
- `{{kebabCase id}}` → `taxi-driver`
- `{{constantCase id}}` → `TAXI_DRIVER`
- `{{#if (eq type "profession")}}...{{/if}}` — conditional via `eq` / `neq`

## NPM scripts

- `npm run dev` — run CLI via tsx (no build step needed)
- `npm run build` — compile TypeScript to `dist/`
- `npm run start` — run compiled version
- `npm run typecheck` — verify types without emitting
- `npm run clean` — remove `dist/`

## Status

MVP complete. Dummy templates for the `profession` entity demonstrate the full pipeline end-to-end. Real GM1 templates pending input from the lead developer (Stage 3 of the project plan).

GM2 plugin (Unity client, Node backend) will be added later as `plugins/gm2/` and is currently out of scope.
