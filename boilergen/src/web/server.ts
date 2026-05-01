import { readFile } from 'node:fs/promises';
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

const PLUGIN_DIR = process.env.BOILERGEN_PLUGIN ?? resolve(projectRoot, 'plugins/gm1');
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

let cachedPlugin: Plugin | null = null;

async function getPlugin(): Promise<Plugin> {
  if (!cachedPlugin) cachedPlugin = await loadPlugin(PLUGIN_DIR);
  return cachedPlugin;
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(join(__dirname, 'public')));

app.get('/api/plugin', async (_req, res) => {
  try {
    const plugin = await getPlugin();
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

app.post('/api/preview', async (req, res) => {
  try {
    const { yaml: yamlText } = req.body as { yaml?: string };
    if (typeof yamlText !== 'string') {
      res.status(400).json({ error: 'Body must be { yaml: string }' });
      return;
    }
    const schema = parseSchema(yamlText, '<browser-input>');
    const plugin = await getPlugin();
    const matched = plugin.templates.filter((t) => t.entityType === schema.type);

    const files: PreviewFile[] = [];
    for (const tpl of matched) {
      const renderedRelPath = renderString(tpl.outputRelPath, schema);
      // Safety: reject path-traversal attempts at the preview layer too,
      // mirroring the generator's ensureWithin guard.
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

app.post('/api/describe', async (req, res) => {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Body must be { prompt: string } with a non-empty prompt' });
      return;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        error:
          'AI describe is not configured. Set ANTHROPIC_API_KEY in the environment to enable this feature.',
      });
      return;
    }
    const plugin = await getPlugin();
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
    console.log(`Using plugin: ${PLUGIN_DIR}`);
  });
}
