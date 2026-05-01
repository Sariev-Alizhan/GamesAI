import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import type { Schema } from './types.js';

export const SchemaZod = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
});

export async function loadSchema(filePath: string): Promise<Schema> {
  const absPath = resolve(filePath);
  const raw = await readFile(absPath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse YAML at ${absPath}:\n${msg}`);
  }

  const result = SchemaZod.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Schema validation failed for ${absPath}:\n${issues}`);
  }

  return result.data;
}
