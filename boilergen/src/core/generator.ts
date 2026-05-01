import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { renderFile, renderString } from './template-engine.js';
import type { Plugin, Schema } from './types.js';

export interface GenerateOptions {
  schema: Schema;
  plugin: Plugin;
  targetRoots: Record<string, string>;
}

export interface GenerateResult {
  filesCreated: string[];
  filesSkipped: Array<{ template: string; reason: string }>;
  errors: Array<{ template: string; message: string }>;
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const { schema, plugin, targetRoots } = opts;
  const result: GenerateResult = {
    filesCreated: [],
    filesSkipped: [],
    errors: [],
  };

  for (const tpl of plugin.templates) {
    const targetRoot = targetRoots[tpl.target];
    if (!targetRoot) {
      result.filesSkipped.push({
        template: tpl.absPath,
        reason: `target "${tpl.target}" not configured in targetRoots`,
      });
      continue;
    }

    try {
      const renderedRelPath = renderString(tpl.outputRelPath, schema);
      const renderedContent = await renderFile(tpl.absPath, schema);
      const outputPath = resolve(targetRoot, renderedRelPath);

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, renderedContent, 'utf-8');

      result.filesCreated.push(outputPath);
    } catch (err) {
      result.errors.push({
        template: tpl.absPath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
