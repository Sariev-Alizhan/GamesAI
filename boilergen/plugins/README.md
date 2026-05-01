# Plugins

Each plugin describes how to generate code for one game project. Plugins are **fully isolated** — adding a new project means adding a sibling folder, with zero changes to existing plugins or to the core engine.

## Layout

```
plugins/
├── gm1/                              ← active (current production)
│   └── targets/
│       ├── cpp-server/<entity-type>/...
│       ├── node-api/<entity-type>/...
│       ├── flutter-admin/<entity-type>/...
│       └── shared/<entity-type>/...
└── gm2/                              ← deferred (Unity + Node)
```

## Convention

Templates **must** follow this layout:

```
plugins/<plugin>/targets/<target>/<entity-type>/<output-path>.hbs
                          │       │              │
                          │       │              └─ rendered output path (Handlebars OK)
                          │       └─ must equal schema.type — used for filtering
                          └─ destination layer name
```

Example:

```
plugins/gm1/targets/cpp-server/profession/Professions/Profession{{pascalCase id}}.cpp.hbs
                  └─ target ─┘└entity-type┘└──── output path (still un-rendered) ─────┘
```

When `boilergen generate <schema>` runs:
1. Schema's `type` is matched against `<entity-type>` folders. Templates whose folder doesn't match are silently filtered (a "weapon" generation never picks up "profession" templates).
2. The output path AND content of each `.hbs` are rendered through Handlebars with the schema as context.
3. Result is written to `<targetRoot>/<rendered-output-path>`.

Templates that do not follow this convention (no entity-type folder) are loaded with a console warning and never match anything.

## Inject templates

Templates with YAML frontmatter modify existing files instead of creating new ones. See [boilergen/README.md](../README.md#inject-mode-in-place-file-editing) for details.

## GM2 (deferred)

GM2 is the same game on a different tech stack (Unity client, Node backend). Currently out of scope for Boilergen MVP. When v2 stabilizes, we may either:

- Add a sibling `plugins/gm2/` plugin with its own templates (zero code shared with gm1/), OR
- Introduce a shared schema layer where one YAML entity description generates code for both v1 and v2 plugins.

Either approach is achievable without touching `gm1/` or the core engine.
