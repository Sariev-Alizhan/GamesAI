import { readdir } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';
import type { Plugin, Template } from './types.js';

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

  const templates: Template[] = hbsFiles.map((absPath) => {
    const relFromTargets = relative(targetsDir, absPath);
    const parts = relFromTargets.split(sep);
    const target = parts[0] ?? '';
    const restPath = parts.slice(1).join(sep);
    const outputRelPath = restPath.replace(/\.hbs$/, '');
    return { absPath, target, outputRelPath };
  });

  return { id, rootDir: pluginDir, templates };
}
