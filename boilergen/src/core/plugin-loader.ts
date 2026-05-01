import { readFile, readdir } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';
import { z } from 'zod';
import { parseFrontmatter } from './template-engine.js';
import type { InjectSpec, Plugin, Template } from './types.js';

const FrontmatterZod = z.object({
  to: z.string().min(1),
  inject: z.enum(['after', 'before']),
  anchor: z.string().min(1),
  skipIf: z.string().optional(),
});

async function findHbsFiles(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.hbs')) {
        out.push(full);
      }
    }
  }
  await walk(rootDir);
  return out;
}

export async function loadPlugin(pluginDir: string): Promise<Plugin> {
  const id = basename(pluginDir);
  const targetsDir = join(pluginDir, 'targets');

  let hbsFiles: string[];
  try {
    hbsFiles = await findHbsFiles(targetsDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Plugin "${id}" has no targets/ folder at ${targetsDir}`);
    }
    throw err;
  }

  const templates: Template[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];

  for (const absPath of hbsFiles) {
    const relFromTargets = relative(targetsDir, absPath);
    const parts = relFromTargets.split(sep);
    const target = parts[0] ?? '';
    const entityType = parts[1] ?? '';
    const restPath = parts.slice(2).join(sep);

    if (!target || !entityType || !restPath) {
      skipped.push({
        path: absPath,
        reason: `expected layout 'targets/<target>/<entity-type>/<file>', got '${relFromTargets}'`,
      });
      continue;
    }

    const content = await readFile(absPath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);

    let inject: InjectSpec | undefined;
    if (frontmatter !== null) {
      const result = FrontmatterZod.safeParse(frontmatter);
      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('; ');
        throw new Error(`Invalid frontmatter in ${absPath}: ${issues}`);
      }
      inject = {
        mode: result.data.inject,
        to: result.data.to,
        anchor: result.data.anchor,
        ...(result.data.skipIf !== undefined && { skipIf: result.data.skipIf }),
      };
    }

    const outputRelPath = restPath.replace(/\.hbs$/, '');
    templates.push({
      absPath,
      target,
      entityType,
      outputRelPath,
      ...(inject !== undefined && { inject }),
    });
  }

  if (skipped.length > 0) {
    const list = skipped.map((s) => `  - ${s.path}: ${s.reason}`).join('\n');
    console.warn(`Plugin "${id}": ${skipped.length} template(s) skipped due to layout:\n${list}`);
  }

  return { id, rootDir: pluginDir, templates };
}
