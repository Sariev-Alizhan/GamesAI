import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

export interface BoilergenConfig {
  plugin: string;
  targets: Record<string, string>;
}

const ConfigZod = z.object({
  plugin: z.string().min(1),
  targets: z.record(z.string(), z.string().min(1)),
});

export async function loadConfig(filePath: string): Promise<BoilergenConfig> {
  const absPath = resolve(filePath);
  const raw = await readFile(absPath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse YAML at ${absPath}:\n${msg}`);
  }

  const result = ConfigZod.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Config validation failed for ${absPath}:\n${issues}`);
  }

  const baseDir = dirname(absPath);
  return {
    plugin: resolve(baseDir, result.data.plugin),
    targets: Object.fromEntries(
      Object.entries(result.data.targets).map(([k, v]) => [k, resolve(baseDir, v)]),
    ),
  };
}
