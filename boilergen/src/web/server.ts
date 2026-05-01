import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { loadPlugin } from '../core/plugin-loader.js';
import { parseSchema } from '../core/schema-loader.js';
import { renderFile, renderString } from '../core/template-engine.js';
import { describeToYaml } from '../ai/describe.js';
import type { Plugin } from '../core/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');

// PLUGINS_ROOT defaults to ./plugins/ — the folder where every plugin lives.
// Each immediate subdirectory containing a `targets/` folder is treated as a plugin.
const PLUGINS_ROOT = process.env.BOILERGEN_PLUGINS_ROOT ?? resolve(projectRoot, 'plugins');
const SCHEMAS_ROOT = process.env.BOILERGEN_SCHEMAS_ROOT ?? resolve(projectRoot, 'schemas');

// Backward-compat with single-plugin mode used by some tests.
const LEGACY_PLUGIN_DIR = process.env.BOILERGEN_PLUGIN;

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

interface PreviewFile {
  path: string;
  content: string;
  templateSource: string;
  templatePath: string;
  target: string;
  entityType: string;
  inject?: { to: string; mode: 'after' | 'before'; anchor: string };
}

interface PreviewResponse {
  schema: { id: string; type: string; name: string; data: Record<string, unknown> };
  matched: number;
  total: number;
  files: PreviewFile[];
  error?: string;
}

interface PluginSummary {
  id: string;
  rootDir: string;
  templateCount: number;
  entityTypes: string[];
}

const pluginCache = new Map<string, Plugin>();
let pluginsListCache: PluginSummary[] | null = null;

async function discoverPlugins(): Promise<string[]> {
  // If legacy single-plugin mode is set, expose only that one.
  if (LEGACY_PLUGIN_DIR) return [LEGACY_PLUGIN_DIR];

  let entries: string[];
  try {
    entries = await readdir(PLUGINS_ROOT);
  } catch {
    return [];
  }
  const dirs: string[] = [];
  for (const entry of entries) {
    const full = join(PLUGINS_ROOT, entry);
    let st;
    try {
      st = await stat(full);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    // Only count it as a plugin if a targets/ folder exists.
    try {
      const targetsStat = await stat(join(full, 'targets'));
      if (targetsStat.isDirectory()) dirs.push(full);
    } catch {
      // no targets/ — not a plugin
    }
  }
  return dirs.sort();
}

async function listPlugins(): Promise<PluginSummary[]> {
  if (pluginsListCache) return pluginsListCache;
  const dirs = await discoverPlugins();
  const summaries: PluginSummary[] = [];
  for (const dir of dirs) {
    try {
      const plugin = await loadPlugin(dir);
      pluginCache.set(plugin.id, plugin);
      summaries.push({
        id: plugin.id,
        rootDir: plugin.rootDir,
        templateCount: plugin.templates.length,
        entityTypes: [...new Set(plugin.templates.map((t) => t.entityType))].sort(),
      });
    } catch {
      // skip broken plugins silently — they shouldn't break the whole UI.
    }
  }
  pluginsListCache = summaries;
  return summaries;
}

async function getPluginById(id: string): Promise<Plugin> {
  if (pluginCache.has(id)) return pluginCache.get(id)!;
  // Force a list refresh to populate cache.
  await listPlugins();
  if (pluginCache.has(id)) return pluginCache.get(id)!;
  throw new Error(`Plugin "${id}" not found. Available: ${[...pluginCache.keys()].join(', ') || '(none)'}`);
}

async function getDefaultPluginId(): Promise<string> {
  const all = await listPlugins();
  if (all.length === 0) throw new Error('No plugins found in ' + PLUGINS_ROOT);
  // Stable default: prefer "generic-rp" if present, else first alphabetical.
  const generic = all.find((p) => p.id === 'generic-rp');
  return (generic ?? all[0]!).id;
}

async function listExamples(pluginId: string): Promise<{ slug: string; path: string }[]> {
  const dir = join(SCHEMAS_ROOT, pluginId);
  try {
    const entries = await readdir(dir);
    return entries
      .filter((e) => e.endsWith('.yaml') || e.endsWith('.yml'))
      .map((e) => ({ slug: e.replace(/\.(yaml|yml)$/, ''), path: join(dir, e) }))
      .sort((a, b) => a.slug.localeCompare(b.slug));
  } catch {
    return [];
  }
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(join(__dirname, 'public')));

// Multi-plugin endpoints.
app.get('/api/plugins', async (_req, res) => {
  try {
    const summaries = await listPlugins();
    const def = summaries.length > 0 ? await getDefaultPluginId() : null;
    res.json({ plugins: summaries, default: def });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/plugin/:id', async (req, res) => {
  try {
    const plugin = await getPluginById(req.params.id);
    res.json({
      id: plugin.id,
      rootDir: plugin.rootDir,
      templates: plugin.templates.map((t) => ({
        target: t.target,
        entityType: t.entityType,
        outputRelPath: t.outputRelPath,
        inject: t.inject ?? null,
      })),
    });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/plugin/:id/examples', async (req, res) => {
  try {
    await getPluginById(req.params.id); // validate plugin exists
    const examples = await listExamples(req.params.id);
    res.json({ examples: examples.map((e) => ({ slug: e.slug })) });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/plugin/:id/example/:slug', async (req, res) => {
  try {
    await getPluginById(req.params.id);
    const examples = await listExamples(req.params.id);
    const found = examples.find((e) => e.slug === req.params.slug);
    if (!found) {
      res.status(404).json({ error: `Example "${req.params.slug}" not found in plugin "${req.params.id}"` });
      return;
    }
    const yamlText = await readFile(found.path, 'utf-8');
    res.json({ slug: found.slug, yaml: yamlText });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Per-plugin preview.
app.post('/api/plugin/:id/preview', async (req, res) => {
  try {
    const { yaml: yamlText } = req.body as { yaml?: string };
    if (typeof yamlText !== 'string') {
      res.status(400).json({ error: 'Body must be { yaml: string }' });
      return;
    }
    const schema = parseSchema(yamlText, '<browser-input>');
    const plugin = await getPluginById(req.params.id);
    const matched = plugin.templates.filter((t) => t.entityType === schema.type);

    const files: PreviewFile[] = [];
    for (const tpl of matched) {
      const renderedRelPath = renderString(tpl.outputRelPath, schema);
      if (renderedRelPath.split(/[/\\]/).some((seg) => seg === '..')) {
        res.status(400).json({
          error: `Refusing to render path with traversal segments: ${renderedRelPath}. Check schema.id for ../ characters.`,
        });
        return;
      }
      const content = await renderFile(tpl.absPath, schema);
      const templateSource = await readFile(tpl.absPath, 'utf-8');
      const baseFile: PreviewFile = {
        path: `${tpl.target}/${renderedRelPath}`,
        content,
        templateSource,
        templatePath: tpl.absPath,
        target: tpl.target,
        entityType: tpl.entityType,
      };
      if (tpl.inject) {
        baseFile.inject = {
          to: renderString(tpl.inject.to, schema),
          mode: tpl.inject.mode,
          anchor: renderString(tpl.inject.anchor, schema),
        };
      }
      files.push(baseFile);
    }

    const response: PreviewResponse = {
      schema,
      matched: matched.length,
      total: plugin.templates.length,
      files,
    };
    res.json(response);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/plugin/:id/describe', async (req, res) => {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Body must be { prompt: string } with a non-empty prompt' });
      return;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        error: 'AI describe is not configured. Set ANTHROPIC_API_KEY in the environment to enable this feature.',
      });
      return;
    }
    const plugin = await getPluginById(req.params.id);
    const entityTypes = [...new Set(plugin.templates.map((t) => t.entityType))].sort();
    const result = await describeToYaml({ prompt: prompt.trim(), entityTypes });
    res.json({
      yaml: result.yaml,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cacheReadTokens: result.cacheReadTokens,
        cacheWriteTokens: result.cacheWriteTokens,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Legacy single-plugin endpoints (maintained for backward compat).
// They proxy to the default plugin (generic-rp by preference).
app.get('/api/plugin', async (_req, res) => {
  try {
    const id = await getDefaultPluginId();
    const plugin = await getPluginById(id);
    res.json({
      id: plugin.id,
      rootDir: plugin.rootDir,
      templates: plugin.templates.map((t) => ({
        target: t.target,
        entityType: t.entityType,
        outputRelPath: t.outputRelPath,
        inject: t.inject ?? null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Legacy /api/preview — runs against the default plugin.
app.post('/api/preview', async (req, res) => {
  try {
    const { yaml: yamlText } = req.body as { yaml?: string };
    if (typeof yamlText !== 'string') {
      res.status(400).json({ error: 'Body must be { yaml: string }' });
      return;
    }
    const schema = parseSchema(yamlText, '<browser-input>');
    const id = await getDefaultPluginId();
    const plugin = await getPluginById(id);
    const matched = plugin.templates.filter((t) => t.entityType === schema.type);

    const files: PreviewFile[] = [];
    for (const tpl of matched) {
      const renderedRelPath = renderString(tpl.outputRelPath, schema);
      if (renderedRelPath.split(/[/\\]/).some((seg) => seg === '..')) {
        res.status(400).json({
          error: `Refusing to render path with traversal segments: ${renderedRelPath}. Check schema.id for ../ characters.`,
        });
        return;
      }
      const content = await renderFile(tpl.absPath, schema);
      const templateSource = await readFile(tpl.absPath, 'utf-8');
      const baseFile: PreviewFile = {
        path: `${tpl.target}/${renderedRelPath}`,
        content,
        templateSource,
        templatePath: tpl.absPath,
        target: tpl.target,
        entityType: tpl.entityType,
      };
      if (tpl.inject) {
        baseFile.inject = {
          to: renderString(tpl.inject.to, schema),
          mode: tpl.inject.mode,
          anchor: renderString(tpl.inject.anchor, schema),
        };
      }
      files.push(baseFile);
    }

    res.json({
      schema,
      matched: matched.length,
      total: plugin.templates.length,
      files,
    } satisfies PreviewResponse);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Legacy /api/describe — runs against the default plugin.
app.post('/api/describe', async (req, res) => {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Body must be { prompt: string } with a non-empty prompt' });
      return;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        error: 'AI describe is not configured. Set ANTHROPIC_API_KEY in the environment to enable this feature.',
      });
      return;
    }
    const id = await getDefaultPluginId();
    const plugin = await getPluginById(id);
    const entityTypes = [...new Set(plugin.templates.map((t) => t.entityType))].sort();
    const result = await describeToYaml({ prompt: prompt.trim(), entityTypes });
    res.json({
      yaml: result.yaml,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cacheReadTokens: result.cacheReadTokens,
        cacheWriteTokens: result.cacheWriteTokens,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default app;

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  app.listen(PORT, () => {
    console.log(`Boilergen web playground running on http://localhost:${PORT}`);
    console.log(`Plugins root: ${PLUGINS_ROOT}`);
    console.log(`Schemas root: ${SCHEMAS_ROOT}`);
  });
}
