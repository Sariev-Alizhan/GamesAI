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

import { readdir } from 'node:fs/promises';
import { resolve, basename, join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { parseSchema } from '../core/schema-loader.js';
import { loadPlugin } from '../core/plugin-loader.js';
import { generate } from '../core/generator.js';
import { renderFile, renderString } from '../core/template-engine.js';

const DEFAULT_PLUGINS_DIR = process.env.BOILERGEN_PLUGINS_DIR ?? resolve(process.cwd(), 'plugins');

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

// ---- Boot stdio transport ----
const transport = new StdioServerTransport();
await server.connect(transport);
// Server is now running over stdio. Cursor / Claude Code talk to it via JSON-RPC.
process.stderr.write(`[boilergen-mcp] ready · plugins dir: ${DEFAULT_PLUGINS_DIR}\n`);

// Suppress unused import warning for basename (kept for future use)
void basename;
