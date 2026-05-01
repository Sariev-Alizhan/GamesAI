import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { renderFile, renderString } from './template-engine.js';
import type { Plugin, Schema, Template } from './types.js';

function ensureWithin(absPath: string, root: string): void {
  const rel = relative(root, absPath);
  if (rel.startsWith('..') || (rel !== '' && rel.split(sep)[0] === '..')) {
    throw new Error(
      `Refusing to write outside target root: "${absPath}" escapes "${root}". ` +
        `Check schema.id and template paths for traversal characters (../).`,
    );
  }
}

export interface GenerateOptions {
  schema: Schema;
  plugin: Plugin;
  targetRoots: Record<string, string>;
  dryRun?: boolean;
}

export interface GenerateResult {
  filesCreated: string[];
  filesInjected: string[];
  filesSkipped: Array<{ template: string; reason: string }>;
  errors: Array<{ template: string; message: string }>;
  totalTemplates: number;
  matchedTemplates: number;
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const { schema, plugin, targetRoots } = opts;
  const matched = plugin.templates.filter((t) => t.entityType === schema.type);
  const result: GenerateResult = {
    filesCreated: [],
    filesInjected: [],
    filesSkipped: [],
    errors: [],
    totalTemplates: plugin.templates.length,
    matchedTemplates: matched.length,
  };

  for (const tpl of matched) {
    const targetRoot = targetRoots[tpl.target];
    if (!targetRoot) {
      result.filesSkipped.push({
        template: tpl.absPath,
        reason: `target "${tpl.target}" not configured in targetRoots`,
      });
      continue;
    }

    try {
      if (tpl.inject) {
        const outcome = await performInject(tpl, schema, targetRoot, opts.dryRun ?? false);
        if (outcome.skipped) {
          result.filesSkipped.push({ template: tpl.absPath, reason: outcome.skipped });
        } else {
          result.filesInjected.push(outcome.target);
        }
      } else {
        const renderedRelPath = renderString(tpl.outputRelPath, schema);
        const renderedContent = await renderFile(tpl.absPath, schema);
        const outputPath = resolve(targetRoot, renderedRelPath);
        ensureWithin(outputPath, resolve(targetRoot));

        if (!opts.dryRun) {
          await mkdir(dirname(outputPath), { recursive: true });
          await writeFile(outputPath, renderedContent, 'utf-8');
        }

        result.filesCreated.push(outputPath);
      }
    } catch (err) {
      result.errors.push({
        template: tpl.absPath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

async function performInject(
  tpl: Template,
  schema: Schema,
  targetRoot: string,
  dryRun: boolean,
): Promise<{ target: string; skipped?: string }> {
  const inject = tpl.inject!;
  const renderedTo = renderString(inject.to, schema);
  const renderedAnchor = renderString(inject.anchor, schema);
  const renderedSkipIf = inject.skipIf ? renderString(inject.skipIf, schema) : null;
  const renderedBody = await renderFile(tpl.absPath, schema);

  const targetPath = resolve(targetRoot, renderedTo);
  ensureWithin(targetPath, resolve(targetRoot));

  let content: string;
  try {
    content = await readFile(targetPath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Inject target file not found: ${targetPath}`);
    }
    throw err;
  }

  if (renderedSkipIf) {
    let pattern: RegExp;
    try {
      pattern = new RegExp(renderedSkipIf);
    } catch (err) {
      throw new Error(
        `Invalid skipIf regex "${renderedSkipIf}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (pattern.test(content)) {
      return { target: targetPath, skipped: `skipIf matched in ${targetPath}` };
    }
  }

  const anchorIdx = content.indexOf(renderedAnchor);
  if (anchorIdx === -1) {
    throw new Error(`Anchor not found in ${targetPath}: "${renderedAnchor}"`);
  }

  const lineStart = content.lastIndexOf('\n', anchorIdx) + 1;
  const lineEndIdx = content.indexOf('\n', anchorIdx);
  const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx + 1;

  const insertion = renderedBody.endsWith('\n') ? renderedBody : renderedBody + '\n';
  const newContent =
    inject.mode === 'after'
      ? content.slice(0, lineEnd) + insertion + content.slice(lineEnd)
      : content.slice(0, lineStart) + insertion + content.slice(lineStart);

  if (!dryRun) {
    await writeFile(targetPath, newContent, 'utf-8');
  }
  return { target: targetPath };
}
