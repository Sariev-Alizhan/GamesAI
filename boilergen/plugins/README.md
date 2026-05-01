# Plugins

Each plugin describes how to generate code for one game project. Plugins are **fully isolated** — adding a new project means adding a new sibling folder, with zero changes to existing plugins or to the core engine.

## Layout

```
plugins/
├── gm1/                              ← active (current production)
│   └── targets/
│       ├── cpp-server/
│       ├── node-api/
│       ├── flutter-admin/
│       └── shared/
└── gm2/                              ← TODO, added later
```

## How a plugin works

A plugin is a folder with a `targets/` subdirectory. Each `targets/<target-name>/` contains `.hbs` templates organized however the plugin author wants.

Example template path:

```
plugins/gm1/targets/cpp-server/professions/Profession{{pascalCase id}}.cpp.hbs
                  └─ target ─┘ └─────── output path (still un-rendered) ──────┘
```

When `boilergen generate` runs, both the path AND the content of each `.hbs` are rendered through Handlebars with the schema as context. The result is written to `<output-root>/<target>/<rendered-path>`.

## GM2 (planned)

GM2 is a separate game project (Unity client, Node backend) currently out of scope for Boilergen. When ready, a `gm2/` plugin will live here as a sibling to `gm1/` — they share zero code and can evolve independently. Adding GM2 will not touch `gm1/` or the core engine.
