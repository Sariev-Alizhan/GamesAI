import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadPlugin } from '../../core/plugin-loader.js';

export interface ListCommandOptions {
  plugins: string;
}

export async function listCommand(options: ListCommandOptions): Promise<void> {
  const pluginsDir = resolve(options.plugins);

  let entries;
  try {
    entries = await readdir(pluginsDir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Plugins directory not found: ${pluginsDir}`);
      process.exit(1);
    }
    throw err;
  }

  const pluginDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => join(pluginsDir, e.name));

  if (pluginDirs.length === 0) {
    console.log(`No plugins found in ${pluginsDir}`);
    return;
  }

  console.log(`Plugins in ${pluginsDir}:\n`);

  for (const pluginDir of pluginDirs) {
    try {
      const plugin = await loadPlugin(pluginDir);

      const byEntity: Record<string, Record<string, number>> = {};
      for (const tpl of plugin.templates) {
        if (!byEntity[tpl.entityType]) byEntity[tpl.entityType] = {};
        const types = byEntity[tpl.entityType] ?? {};
        types[tpl.target] = (types[tpl.target] ?? 0) + 1;
        byEntity[tpl.entityType] = types;
      }

      console.log(`  ${plugin.id}`);
      console.log(`    Path:      ${plugin.rootDir}`);
      console.log(`    Templates: ${plugin.templates.length}`);

      for (const [entityType, byTarget] of Object.entries(byEntity).sort()) {
        const targetList = Object.entries(byTarget)
          .map(([t, n]) => `${t}: ${n}`)
          .join(', ');
        console.log(`      ${entityType.padEnd(12)} ${targetList}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${pluginDir} (invalid: ${msg})`);
    }
  }
}
