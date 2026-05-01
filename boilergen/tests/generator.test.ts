import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from '../src/core/generator.js';
import type { Plugin, Schema } from '../src/core/types.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'boilergen-test-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function makeTemplate(relPath: string, content: string): Promise<string> {
  const abs = join(dir, 'plugin/targets', relPath);
  await mkdir(join(abs, '..'), { recursive: true });
  await writeFile(abs, content, 'utf-8');
  return abs;
}

const baseSchema: Schema = {
  id: 'taxi_driver',
  type: 'profession',
  name: 'Таксист',
  data: { x: 1 },
};

async function pluginWith(
  templates: Array<{ target: string; entityType: string; rel: string; content: string }>,
): Promise<Plugin> {
  const out = [];
  for (const t of templates) {
    const absPath = await makeTemplate(`${t.target}/${t.entityType}/${t.rel}`, t.content);
    out.push({ absPath, target: t.target, entityType: t.entityType, outputRelPath: t.rel });
  }
  return { id: 'plugin', rootDir: join(dir, 'plugin'), templates: out };
}

describe('generate', () => {
  it('renders matching templates and writes files', async () => {
    const plugin = await pluginWith([
      { target: 'cpp', entityType: 'profession', rel: '{{pascalCase id}}.cpp', content: '// {{name}}' },
    ]);
    const outDir = join(dir, 'out');
    const result = await generate({
      schema: baseSchema,
      plugin,
      targetRoots: { cpp: outDir },
    });
    expect(result.filesCreated).toHaveLength(1);
    expect(result.filesCreated[0]).toBe(join(outDir, 'TaxiDriver.cpp'));
    expect(await readFile(result.filesCreated[0]!, 'utf-8')).toBe('// Таксист');
  });

  it('filters templates that do not match schema.type', async () => {
    const plugin = await pluginWith([
      { target: 'cpp', entityType: 'profession', rel: 'P.cpp', content: 'P' },
      { target: 'cpp', entityType: 'weapon', rel: 'W.cpp', content: 'W' },
    ]);
    const result = await generate({
      schema: baseSchema, // type: profession
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(result.totalTemplates).toBe(2);
    expect(result.matchedTemplates).toBe(1);
    expect(result.filesCreated).toHaveLength(1);
    expect(result.filesCreated[0]).toContain('P.cpp');
  });

  it('dry-run does not write files', async () => {
    const plugin = await pluginWith([
      { target: 'cpp', entityType: 'profession', rel: 'F.cpp', content: 'X' },
    ]);
    const outDir = join(dir, 'out');
    const result = await generate({
      schema: baseSchema,
      plugin,
      targetRoots: { cpp: outDir },
      dryRun: true,
    });
    expect(result.filesCreated).toHaveLength(1);
    await expect(access(join(outDir, 'F.cpp'))).rejects.toThrow();
  });

  it('skips templates whose target is not in targetRoots', async () => {
    const plugin = await pluginWith([
      { target: 'cpp', entityType: 'profession', rel: 'A.cpp', content: 'a' },
      { target: 'node', entityType: 'profession', rel: 'B.ts', content: 'b' },
    ]);
    const result = await generate({
      schema: baseSchema,
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(result.filesCreated).toHaveLength(1);
    expect(result.filesSkipped).toHaveLength(1);
    expect(result.filesSkipped[0]?.reason).toContain('node');
  });

  it('records template errors without aborting the batch', async () => {
    const plugin = await pluginWith([
      { target: 'cpp', entityType: 'profession', rel: 'bad.cpp', content: '{{unclosed' },
      { target: 'cpp', entityType: 'profession', rel: 'good.cpp', content: 'ok' },
    ]);
    const result = await generate({
      schema: baseSchema,
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(result.errors).toHaveLength(1);
    expect(result.filesCreated).toHaveLength(1);
  });

  it('creates nested directories as needed', async () => {
    const plugin = await pluginWith([
      { target: 'cpp', entityType: 'profession', rel: 'Deep/Nested/F.cpp', content: 'x' },
    ]);
    const outDir = join(dir, 'out');
    await generate({
      schema: baseSchema,
      plugin,
      targetRoots: { cpp: outDir },
    });
    await expect(access(join(outDir, 'Deep/Nested/F.cpp'))).resolves.toBeUndefined();
  });
});
