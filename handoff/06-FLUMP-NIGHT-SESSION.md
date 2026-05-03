# Flump night-session bootstrap (MCP-first)

> Goal: a fresh Claude Code / Cursor / Windsurf session opens **inside the
> Flump game repo**, has GamesAI's full toolkit + 59-entry knowledge base
> available via MCP, and starts shipping code immediately. Two sessions
> are expected — this doc is the handoff for both.

---

## What the Flump session will have

- **8 MCP tools** exposed by `boilergen-mcp`:
  - `boilergen_list_plugins` — discover available plugins
  - `boilergen_list_entity_types` — see what kinds of entities a plugin generates
  - `boilergen_list_schemas` — list all 20 example YAML schemas in unity-mobile-shooter
  - `boilergen_preview` — dry-run codegen, returns rendered files without writing
  - `boilergen_generate` — write generated files to disk (Flump's Assets/_Project)
  - `boilergen_list_kb` — list all 59 knowledge-base entries
  - `boilergen_read_kb` — read one entry by slug or path
  - `boilergen_search_kb` — keyword search across the whole KB
- The **unity-mobile-shooter** plugin shipped with 7 entity types:
  - `weapon` / `gamemode` / `player` / `bot-personality` / `map` / `loadout` / `project-init`
- 20 ready-to-generate example schemas for Flump:
  - 6 weapons (assault-rifle, glock-19, spas-12, awm-338, ump-45, combat-knife)
  - 5 game modes (duel-1v1, team-3v3-tdm, team-5v5-tdm, hardpoint-5v5, practice)
  - 3 player classes (assault, scout, heavy)
  - 2 bot personalities (rookie, veteran)
  - 1 map (warehouse)
  - 2 loadouts (assault-starter, sniper)
  - 1 project-init (drops LocaleManager.cs + en.json)

---

## Setup — copy-paste this once

### Step 1. Clone GamesAI alongside Flump

```bash
# Wherever you keep your projects:
cd ~/dev
git clone https://github.com/Sariev-Alizhan/GamesAI.git    # if not already cloned
cd GamesAI/boilergen
npm install
npm run build
```

The `npm run build` step is what produces `dist/mcp/server.js` — the MCP
server entrypoint that Claude Code / Cursor will spawn.

### Step 2. Add the MCP server to your IDE

#### A) **Claude Code** (anthropic CLI)

The repo ships a ready `.mcp.json` at the repo root. Either:

- Run Claude Code from inside `~/dev/GamesAI/` (it auto-loads the file), OR
- Copy the entry into your global `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "boilergen": {
      "command": "node",
      "args": ["/Users/alizhan/dev/GamesAI/boilergen/dist/mcp/server.js"],
      "env": {
        "BOILERGEN_PLUGINS_DIR": "/Users/alizhan/dev/GamesAI/boilergen/plugins",
        "BOILERGEN_SCHEMAS_DIR": "/Users/alizhan/dev/GamesAI/boilergen/schemas",
        "BOILERGEN_KB_DIR": "/Users/alizhan/dev/GamesAI/knowledge-base"
      }
    }
  }
}
```

Restart Claude Code. Confirm with `/mcp` — should list `boilergen` as connected.

#### B) **Cursor**

Settings → MCP → Add new MCP server → paste the same JSON snippet. Restart.

#### C) **Windsurf**

Settings → Cascade → MCP servers → New → paste the same JSON. Restart.

#### D) **Continue / other**

Their docs vary; the `command` + `args` shape above is standard MCP and
works everywhere.

### Step 3. Open the Flump repo as your working directory

```bash
cd ~/dev/Flump   # or wherever your Flump repo lives
claude                          # or `cursor .` / `windsurf .`
```

The MCP tools are now available — the AI can reach into GamesAI without
you having to copy-paste anything from this repo.

---

## Smoke-test the connection (paste into the new session)

Once connected, ask the AI:

```
Use the boilergen MCP tools to:
1. boilergen_list_plugins — list every plugin available
2. boilergen_list_entity_types with plugin="unity-mobile-shooter"
3. boilergen_list_schemas with plugin="unity-mobile-shooter"
4. boilergen_search_kb with query="Flump"
```

Expected: 5 plugins, 7 entity types in unity-mobile-shooter, 20 schemas
listed, search hit on `handoff/05-FLUMP-AUDIT.md`.

If any of those return errors → check `dist/` was built (`cd boilergen
&& npm run build`) and the absolute paths in `.mcp.json` match your
machine.

---

## Recommended first-prompt for the Flump session

After the smoke test passes, paste this opening prompt verbatim:

```
We are working on Flump (Unity 6.3 LTS mobile FPS, Netcode for
GameObjects 2.9.1, Android 25+ / iOS 12+).

Before suggesting anything, run:
  - boilergen_search_kb query="Flump"
  - boilergen_read_kb path="handoff/05-FLUMP-AUDIT.md"
  - boilergen_read_kb path="games/oss-unity-mp-shooters.md"
  - boilergen_list_schemas plugin="unity-mobile-shooter"

Then ask me what we're shipping tonight. Ground every recommendation
in either an existing KB entry or a generated schema; flag when you
have to deviate from that.

Hard constraints (project red zones — refuse and explain):
  - No leaked AAA code references
  - No generative-AI-finishes-the-game positioning
  - No NFT / blockchain features
  - No bypassing anti-cheat / hacks
```

The AI now has full grounding and won't waste turns "exploring the
codebase from scratch."

---

## Token-efficient working pattern (for night-long session)

Each tool call counts against context window. Stay efficient:

| Pattern | Use |
|---|---|
| `boilergen_search_kb` | Cheap; use this FIRST to check if a topic is covered |
| `boilergen_list_kb` | Mid-cost; use to plan what to read in detail |
| `boilergen_read_kb` | Expensive (full file); only after search/list confirms relevance |
| `boilergen_list_schemas` | Use BEFORE writing a YAML by hand — there's almost certainly an example to copy |
| `boilergen_preview` | Use BEFORE `_generate` so you can spot-check output before writing files to Flump's Assets/ |
| `boilergen_generate` | Last step; writes files to disk |

A typical "add a new weapon to Flump" round-trip is ~4 tool calls:
1. `boilergen_list_schemas` → see the 6 weapon examples
2. `boilergen_read_kb` slug=`unity-scriptable-object` → confirm SO conventions
3. `boilergen_preview` with the new YAML → verify rendered .asset
4. `boilergen_generate` → write Flump's Assets/_Project/ScriptableObjects/Weapons/

---

## What to add between the two sessions

After session #1 ends, share back:

1. **Which MCP tools you actually used** (and which you didn't — they're candidates for removal or merger)
2. **Which KB entries the AI wanted that didn't exist** (gap list)
3. **Which schema entity types you wished existed but had to author by hand** (next plugin work)
4. **Token-budget breakdown** — was any single tool call dominant?

I'll use that to:
- Add missing entity types to `unity-mobile-shooter` plugin
- Author missing KB entries (likely concrete patterns Flump-specific)
- Optimize MCP tool surface (combine / split / re-name based on actual usage)
- Update this doc with lessons learned for session #2

---

## Troubleshooting

- **"MCP server boilergen failed to connect"** — make sure `boilergen/dist/mcp/server.js` exists. If not: `cd boilergen && npm install && npm run build`.
- **"knowledge-base directory not found"** — set `BOILERGEN_KB_DIR` env var explicitly in the `.mcp.json` config to the absolute path.
- **`boilergen_generate` writes to wrong directory** — pass absolute paths in `targetRoots`. Relative paths resolve against the MCP server's CWD which may not be your Flump repo.
- **AI ignores the KB tools and tries to invent answers** — paste the recommended-first-prompt above; explicitly tell it to call `boilergen_search_kb` first.

---

## Repo state at handoff (commit `374bf9e` and beyond)

- 59 KB entries (engines 25 / games 16 / patterns 12 / research-notes 4 / sources 2)
- 5 plugins (boilergen / generic-rp / fivem-qb / unity-mobile-shooter / unity-rpg / godot-2d-platformer / unity-rpg)
- 365 tests passing
- Web playground live at https://boilergen-eight.vercel.app/
- Marketing site live at https://boilergen-eight.vercel.app/landing.html

---

## License + posture (carry these into the night session)

- MIT licensed across the board
- License-cleanliness is the platform's competitive moat — DO NOT introduce leaked, decompiled, or red-zone-licensed material into Flump via the AI
- Anthropic Claude is the default AI provider; opt-in BYO-key for DeepL Pro
- All KB research verified per-source license before publishing — same standard applies to anything we generate
