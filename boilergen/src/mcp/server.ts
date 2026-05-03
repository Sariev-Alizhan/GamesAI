#!/usr/bin/env node
// Boilergen MCP server — exposes the generator to AI assistants
// (Cursor, Claude Code, Windsurf, Continue) via the Model Context
// Protocol. Lets developers vibe-code: describe an entity in natural
// language, AI calls these tools, files appear in the project.
//
// Tools exposed:
//   - boilergen_list_plugins     — discover available plugins
//   - boilergen_list_entity_types — see what kinds of entities a plugin generates
//   - boilergen_preview          — dry-run: what would be generated, no disk writes
//   - boilergen_generate         — generate files on disk
//
// Usage in Cursor / Claude Code: add to MCP config
//   {
//     "mcpServers": {
//       "boilergen": {
//         "command": "npx",
//         "args": ["tsx", "/path/to/boilergen/src/mcp/server.ts"]
//       }
//     }
//   }

import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, basename, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { parseSchema } from '../core/schema-loader.js';
import { loadPlugin } from '../core/plugin-loader.js';
import { generate } from '../core/generator.js';
import { renderFile, renderString } from '../core/template-engine.js';
import { bootstrapProgrammatic } from '../cli/commands/bootstrap.js';

const DEFAULT_PLUGINS_DIR = process.env.BOILERGEN_PLUGINS_DIR ?? resolve(process.cwd(), 'plugins');
const DEFAULT_SCHEMAS_DIR = process.env.BOILERGEN_SCHEMAS_DIR ?? resolve(process.cwd(), 'schemas');

// Resolve KB dir relative to the running script — works for both
// `npm run mcp` (src/mcp/server.ts) and the published `boilergen-mcp` binary
// (dist/mcp/server.js bundled with knowledge-base/ as a sibling top-level dir).
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_KB_DIR = process.env.BOILERGEN_KB_DIR
  ?? resolve(__dirname, '..', '..', '..', 'knowledge-base');         // dev: src/mcp/server.ts → ../../../knowledge-base
const FALLBACK_KB_DIR = resolve(__dirname, '..', '..', 'knowledge-base'); // pkg: dist/mcp/server.js → ../../knowledge-base

async function findKbDir(): Promise<string | null> {
  for (const p of [DEFAULT_KB_DIR, FALLBACK_KB_DIR]) {
    try {
      const s = await stat(p);
      if (s.isDirectory()) return p;
    } catch { /* keep trying */ }
  }
  return null;
}

const server = new McpServer({
  name: 'boilergen',
  version: '1.1.0',
});

// ---- Tool 1: list plugins ----
server.registerTool(
  'boilergen_list_plugins',
  {
    title: 'List Boilergen Plugins',
    description:
      'List all available plugins in the plugins directory. Each plugin describes how to generate code for one game project (its templates, targets, entity types).',
    inputSchema: {
      pluginsDir: z
        .string()
        .optional()
        .describe(
          'Path to the plugins directory. Defaults to BOILERGEN_PLUGINS_DIR env or ./plugins.',
        ),
    },
  },
  async ({ pluginsDir }) => {
    const dir = pluginsDir ? resolve(pluginsDir) : DEFAULT_PLUGINS_DIR;
    const entries = await readdir(dir, { withFileTypes: true });
    const plugins = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      try {
        const plugin = await loadPlugin(join(dir, e.name));
        const byType: Record<string, number> = {};
        for (const t of plugin.templates) {
          byType[t.entityType] = (byType[t.entityType] ?? 0) + 1;
        }
        plugins.push({
          id: plugin.id,
          rootDir: plugin.rootDir,
          totalTemplates: plugin.templates.length,
          entityTypes: Object.entries(byType).map(([type, n]) => ({ type, templates: n })),
        });
      } catch (err) {
        plugins.push({ id: e.name, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ pluginsDir: dir, plugins }, null, 2) }],
    };
  },
);

// ---- Tool 2: list entity types in a plugin ----
server.registerTool(
  'boilergen_list_entity_types',
  {
    title: 'List Entity Types in a Plugin',
    description:
      'Show what entity types a plugin supports (profession, weapon, vehicle, etc.) and which targets/templates each one has. Use this before generate, to know what to put in schema.type.',
    inputSchema: {
      plugin: z
        .string()
        .describe('Path to the plugin directory (or just the plugin name if in default plugins dir)'),
    },
  },
  async ({ plugin: pluginArg }) => {
    const pluginPath = pluginArg.includes('/')
      ? resolve(pluginArg)
      : resolve(DEFAULT_PLUGINS_DIR, pluginArg);
    const plugin = await loadPlugin(pluginPath);
    const grouped: Record<string, Record<string, string[]>> = {};
    for (const tpl of plugin.templates) {
      const types = grouped[tpl.entityType] ?? {};
      types[tpl.target] = types[tpl.target] ?? [];
      types[tpl.target]!.push(tpl.outputRelPath);
      grouped[tpl.entityType] = types;
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ plugin: plugin.id, entityTypes: grouped }, null, 2) }],
    };
  },
);

// ---- Tool 3: preview (dry-run) ----
server.registerTool(
  'boilergen_preview',
  {
    title: 'Preview Generated Files (Dry-Run)',
    description:
      'Take a YAML entity description and return the files that WOULD be generated, with their paths and full rendered content. NO files are written to disk. Use this to verify before calling boilergen_generate.',
    inputSchema: {
      yaml: z
        .string()
        .describe('YAML content of the entity. Required fields: id, type, name. Optional: data (free-form object).'),
      plugin: z
        .string()
        .describe('Path to plugin directory or plugin name in default plugins dir'),
    },
  },
  async ({ yaml: yamlContent, plugin: pluginArg }) => {
    const pluginPath = pluginArg.includes('/')
      ? resolve(pluginArg)
      : resolve(DEFAULT_PLUGINS_DIR, pluginArg);
    const schema = parseSchema(yamlContent, '<mcp-input>');
    const plugin = await loadPlugin(pluginPath);
    const matched = plugin.templates.filter((t) => t.entityType === schema.type);
    const files = [];
    for (const tpl of matched) {
      const renderedRelPath = renderString(tpl.outputRelPath, schema);
      const content = await renderFile(tpl.absPath, schema);
      files.push({
        target: tpl.target,
        relativePath: `${tpl.target}/${renderedRelPath}`,
        content,
        injectMode: tpl.inject?.mode,
      });
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              schema,
              matchedTemplates: matched.length,
              totalTemplates: plugin.templates.length,
              files,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

// ---- Tool 4: generate (writes files to disk) ----
server.registerTool(
  'boilergen_generate',
  {
    title: 'Generate Files',
    description:
      'Generate code files from a YAML entity description. Writes files to disk under the specified targetRoots. Use boilergen_preview first to verify output before committing to disk.',
    inputSchema: {
      yaml: z.string().describe('YAML content of the entity'),
      plugin: z.string().describe('Plugin directory path or name'),
      targetRoots: z
        .record(z.string(), z.string())
        .describe(
          'Map of target name → absolute output directory. E.g., { "cpp-server": "/path/to/server/src", "node-api": "/path/to/api/src" }. Each plugin defines its own target names — use boilergen_list_entity_types to see them.',
        ),
      dryRun: z
        .boolean()
        .optional()
        .describe('If true, log what would be done but do not write files. Defaults to false.'),
    },
  },
  async ({ yaml: yamlContent, plugin: pluginArg, targetRoots, dryRun }) => {
    const pluginPath = pluginArg.includes('/')
      ? resolve(pluginArg)
      : resolve(DEFAULT_PLUGINS_DIR, pluginArg);
    const schema = parseSchema(yamlContent, '<mcp-input>');
    const plugin = await loadPlugin(pluginPath);
    const resolvedTargets: Record<string, string> = {};
    for (const [k, v] of Object.entries(targetRoots)) {
      resolvedTargets[k] = resolve(v);
    }
    const result = await generate({
      schema,
      plugin,
      targetRoots: resolvedTargets,
      dryRun: dryRun ?? false,
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ---- Tool: bootstrap (one-shot scaffold from all schemas in a plugin) ----
server.registerTool(
  'boilergen_bootstrap',
  {
    title: 'Bootstrap a project from a plugin\'s example schemas',
    description:
      'One-shot project scaffold: loop through every YAML in a plugin\'s schemas directory and generate each into one output dir. Designed for the "ship a complete Flump-class FPS in one command" use case — saves the AI from making 22 separate generate calls during a session. Supports --only / --skip substring filters to scope to a subset.',
    inputSchema: {
      plugin: z.string().describe('Path to plugin directory (e.g. /Users/you/dev/GamesAI/boilergen/plugins/unity-mobile-shooter)'),
      outputDir: z.string().describe('Absolute output directory (e.g. /Users/you/dev/Flump/Assets/_Project)'),
      schemasDir: z.string().optional().describe('Override schemas directory (defaults to <cwd>/schemas/<plugin-name>)'),
      only: z.string().optional().describe('Comma-separated substrings — only run schemas whose filename matches one'),
      skip: z.string().optional().describe('Comma-separated substrings — skip schemas whose filename matches one'),
    },
  },
  async ({ plugin, outputDir, schemasDir, only, skip }) => {
    const opts: { plugin: string; output: string; schemasDir?: string; only?: string; skip?: string } = {
      plugin,
      output: outputDir,
    };
    if (schemasDir !== undefined) opts.schemasDir = schemasDir;
    if (only !== undefined) opts.only = only;
    if (skip !== undefined) opts.skip = skip;
    const result = await bootstrapProgrammatic(opts);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

// ---- Tool 5: list bundled example schemas ----
server.registerTool(
  'boilergen_list_schemas',
  {
    title: 'List Bundled Example Schemas',
    description:
      'List every example YAML schema bundled with the project (schemas/<plugin>/*.yaml). Returns plugin / id / type / summary so the AI can pick a starting point for a new entity instead of writing one from scratch.',
    inputSchema: {
      schemasDir: z.string().optional().describe('Override schemas directory (defaults to ./schemas)'),
      plugin: z.string().optional().describe('Filter to one plugin name'),
    },
  },
  async ({ schemasDir, plugin: pluginFilter }) => {
    const dir = schemasDir ? resolve(schemasDir) : DEFAULT_SCHEMAS_DIR;
    type SchemaSummary = { plugin: string; file: string; id: string; type: string; name: string; firstComment?: string };
    const out: SchemaSummary[] = [];
    let pluginDirs: string[];
    try {
      pluginDirs = (await readdir(dir, { withFileTypes: true }))
        .filter(d => d.isDirectory()).map(d => d.name);
    } catch {
      return { content: [{ type: 'text', text: JSON.stringify({ error: `schemas dir not found: ${dir}` }) }] };
    }
    for (const pName of pluginDirs) {
      if (pluginFilter && pName !== pluginFilter) continue;
      const pDir = join(dir, pName);
      let files: string[];
      try {
        files = (await readdir(pDir)).filter(f => /\.ya?ml$/.test(f));
      } catch { continue; }
      for (const f of files) {
        try {
          const text = await readFile(join(pDir, f), 'utf8');
          const schema = parseSchema(text, join(pDir, f));
          const firstComment = (text.match(/^#\s+(.+)$/m) || [])[1];
          const summary: SchemaSummary = {
            plugin: pName,
            file: relative(dir, join(pDir, f)),
            id: String(schema.id),
            type: String(schema.type),
            name: String(schema.name ?? ''),
          };
          if (firstComment) summary.firstComment = firstComment;
          out.push(summary);
        } catch { /* skip bad YAMLs */ }
      }
    }
    return { content: [{ type: 'text', text: JSON.stringify({ schemasDir: dir, total: out.length, schemas: out }, null, 2) }] };
  },
);

// ---- Tool 6: list KB entries ----
server.registerTool(
  'boilergen_list_kb',
  {
    title: 'List Knowledge-Base Entries',
    description:
      'List every Markdown entry in the GamesAI knowledge-base (engines / games / patterns / research-notes / sources). Returns slug / title / type / engine / tags so the AI can decide what to read next via boilergen_read_kb. Use this BEFORE answering any engine/version/pattern question — there are 59+ entries grounding our positioning.',
    inputSchema: {
      category: z.enum(['engines', 'games', 'patterns', 'research-notes', 'sources']).optional()
        .describe('Filter to one category folder. Omit to list all.'),
    },
  },
  async ({ category }) => {
    const kb = await findKbDir();
    if (!kb) return { content: [{ type: 'text', text: JSON.stringify({ error: 'knowledge-base directory not found' }) }] };
    const cats = category ? [category] : ['engines', 'games', 'patterns', 'research-notes', 'sources'];
    const entries: Array<{ category: string; slug: string; title: string; type: string; engine?: string; tags?: string[]; relPath: string }> = [];
    for (const cat of cats) {
      const catDir = join(kb, cat);
      let files: string[];
      try { files = (await readdir(catDir)).filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md'); }
      catch { continue; }
      for (const f of files) {
        try {
          const text = await readFile(join(catDir, f), 'utf8');
          const fm = parseFrontmatter(text);
          const e: { category: string; slug: string; title: string; type: string; engine?: string; tags?: string[]; relPath: string } = {
            category: cat,
            slug: typeof fm.slug === 'string' ? fm.slug : f.replace(/\.md$/, ''),
            title: typeof fm.title === 'string' ? fm.title : f,
            type: typeof fm.type === 'string' ? fm.type : '',
            relPath: relative(kb, join(catDir, f)),
          };
          if (typeof fm.engine === 'string') e.engine = fm.engine;
          if (Array.isArray(fm.tags)) e.tags = fm.tags as string[];
          entries.push(e);
        } catch { /* skip */ }
      }
    }
    return { content: [{ type: 'text', text: JSON.stringify({ kbDir: kb, total: entries.length, entries }, null, 2) }] };
  },
);

// ---- Tool 7: read one KB entry ----
server.registerTool(
  'boilergen_read_kb',
  {
    title: 'Read a Knowledge-Base Entry',
    description:
      'Read the full Markdown content of one KB entry by relative path (e.g., "engines/mirror-networking.md") or by slug (e.g., "mirror-networking"). Returns frontmatter + body. Use this AFTER boilergen_list_kb to ground answers in our research.',
    inputSchema: {
      path: z.string().describe('Relative path under knowledge-base/ (e.g., "engines/mirror-networking.md") or just the slug'),
    },
  },
  async ({ path }) => {
    const kb = await findKbDir();
    if (!kb) return { content: [{ type: 'text', text: JSON.stringify({ error: 'knowledge-base directory not found' }) }] };
    let absPath: string | null = null;
    if (path.includes('/')) {
      absPath = resolve(kb, path);
    } else {
      // slug lookup — search every category
      for (const cat of ['engines', 'games', 'patterns', 'research-notes', 'sources']) {
        const candidate = resolve(kb, cat, `${path}.md`);
        try { await stat(candidate); absPath = candidate; break; } catch { /* keep looking */ }
      }
    }
    if (!absPath) return { content: [{ type: 'text', text: JSON.stringify({ error: `KB entry not found: ${path}` }) }] };
    try {
      const text = await readFile(absPath, 'utf8');
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }] };
    }
  },
);

// ---- Tool 8: keyword-search the KB ----
server.registerTool(
  'boilergen_search_kb',
  {
    title: 'Search the Knowledge-Base',
    description:
      'Case-insensitive keyword search across all KB entry bodies. Returns the top N matches with surrounding context. Cheaper than read_kb when you only need to know if a topic is covered.',
    inputSchema: {
      query: z.string().describe('Keyword or short phrase to search for'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results (default 10)'),
    },
  },
  async ({ query, limit }) => {
    const kb = await findKbDir();
    if (!kb) return { content: [{ type: 'text', text: JSON.stringify({ error: 'knowledge-base directory not found' }) }] };
    const max = limit ?? 10;
    const needle = query.toLowerCase();
    const hits: Array<{ relPath: string; line: number; snippet: string; title?: string }> = [];
    const kbDir: string = kb;
    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) await walk(p);
        else if (e.isFile() && e.name.endsWith('.md') && !e.name.startsWith('_') && e.name !== 'README.md') {
          const text = await readFile(p, 'utf8').catch(() => '');
          const fm = parseFrontmatter(text);
          const lines = text.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            if (line.toLowerCase().includes(needle)) {
              const hit: { relPath: string; line: number; snippet: string; title?: string } = {
                relPath: relative(kbDir, p),
                line: i + 1,
                snippet: line.trim().slice(0, 220),
              };
              if (typeof fm.title === 'string') hit.title = fm.title;
              hits.push(hit);
              if (hits.length >= max) return;
            }
          }
        }
        if (hits.length >= max) return;
      }
    }
    await walk(kbDir);
    return { content: [{ type: 'text', text: JSON.stringify({ query, total: hits.length, hits }, null, 2) }] };
  },
);

// ---- Frontmatter parser (no extra dep) ----
function parseFrontmatter(md: string): Record<string, string | string[]> {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string | string[]> = {};
  for (const raw of (m[1] ?? '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    val = val.replace(/^['"]|['"]$/g, '');
    if (val.startsWith('[') && val.endsWith(']')) {
      out[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    } else {
      out[key] = val;
    }
  }
  return out;
}

// ---- Boot stdio transport ----
const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`[boilergen-mcp] ready · plugins=${DEFAULT_PLUGINS_DIR} · schemas=${DEFAULT_SCHEMAS_DIR}\n`);
process.stderr.write(`[boilergen-mcp] tools (9): list_plugins, list_entity_types, preview, generate, bootstrap, list_schemas, list_kb, read_kb, search_kb\n`);

void basename;
