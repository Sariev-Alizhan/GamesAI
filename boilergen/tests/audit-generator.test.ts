// Edge-case audit for generator behavior and security.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { generate } from '../src/core/generator.js';
import { loadPlugin } from '../src/core/plugin-loader.js';
import type { Schema } from '../src/core/types.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'boilergen-audit-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function setupPlugin(layout: Record<string, string>): Promise<string> {
  const pluginDir = join(dir, 'plugin');
  for (const [rel, content] of Object.entries(layout)) {
    const full = join(pluginDir, rel);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content, 'utf-8');
  }
  return pluginDir;
}

const baseSchema: Schema = { id: 'x', type: 'profession', name: 'X', data: {} };

describe('audit: generator handles weird IDs and data', () => {
  it('id with leading number renders predictably', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/profession/{{kebabCase id}}.cpp.hbs': '// {{name}}',
    });
    const plugin = await loadPlugin(pluginDir);
    const r = await generate({
      schema: { ...baseSchema, id: '7taxi' },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(r.errors).toHaveLength(0);
    expect(r.filesCreated[0]).toContain('7taxi.cpp');
  });

  it('id with only special chars (no alpha) — does not crash', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/profession/{{snakeCase id}}.txt.hbs': '{{name}}',
    });
    const plugin = await loadPlugin(pluginDir);
    const r = await generate({
      schema: { ...baseSchema, id: '___---' },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    // Either succeeds (writing a file with empty-stem name) or errors cleanly — must not crash
    expect(r.errors.length + r.filesCreated.length).toBeGreaterThan(0);
  });

  it('very long name (10kb) does not break', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/profession/file.txt.hbs': '{{name}}',
    });
    const plugin = await loadPlugin(pluginDir);
    const longName = 'A'.repeat(10_000);
    const r = await generate({
      schema: { ...baseSchema, name: longName },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    const written = await readFile(r.filesCreated[0]!, 'utf-8');
    expect(written.length).toBe(10_000);
  });

  it('data with arrays and nested objects renders deep', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/profession/file.txt.hbs': '{{data.arr.[0]}}-{{data.nested.key}}',
    });
    const plugin = await loadPlugin(pluginDir);
    const r = await generate({
      schema: { ...baseSchema, data: { arr: ['a', 'b'], nested: { key: 'k' } } },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(r.errors).toHaveLength(0);
    const written = await readFile(r.filesCreated[0]!, 'utf-8');
    expect(written).toBe('a-k');
  });
});

describe('audit: generator security — path traversal', () => {
  it('id containing ../../ is treated as a name token, not a path component', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/profession/{{kebabCase id}}.txt.hbs': 'x',
    });
    const plugin = await loadPlugin(pluginDir);
    const targetRoot = join(dir, 'out');
    await mkdir(targetRoot, { recursive: true });

    const r = await generate({
      schema: { ...baseSchema, id: '../../etc/passwd' },
      plugin,
      targetRoots: { cpp: targetRoot },
    });

    // CRITICAL: file must end up INSIDE targetRoot, not outside.
    if (r.filesCreated.length > 0) {
      for (const f of r.filesCreated) {
        const resolved = resolve(f);
        expect(resolved.startsWith(targetRoot)).toBe(true);
      }
    }
    // We expect the safety guard to either error or skip — never silently write
    // outside the root. A good outcome: error message mentions our guard.
    if (r.errors.length > 0) {
      expect(r.errors[0]?.message).toMatch(/Refusing to write outside/);
    }
  });

  it('inject "to:" with ../../ does not escape targetRoot', async () => {
    const pluginDir = await setupPlugin({
      'targets/api/profession/router.hbs':
        '---\nto: ../../../../../../../tmp/escape.txt\ninject: after\nanchor: "X"\n---\nbody\n',
    });
    const plugin = await loadPlugin(pluginDir);
    const targetRoot = join(dir, 'out');
    await mkdir(targetRoot, { recursive: true });

    const r = await generate({
      schema: baseSchema,
      plugin,
      targetRoots: { api: targetRoot },
    });

    // Inject will fail with "file not found" because target file doesn't exist —
    // that's acceptable. Critical: no actual escape.
    // If error, message should mention the resolved path is outside targetRoot
    // (or just file-not-found, also fine).
    expect(r.errors.length + r.filesSkipped.length).toBeGreaterThan(0);
  });
});

describe('audit: generator with empty / no-match cases', () => {
  it('plugin with zero templates → zero output, no errors', async () => {
    const pluginDir = join(dir, 'empty-plugin');
    await mkdir(join(pluginDir, 'targets'), { recursive: true });
    const plugin = await loadPlugin(pluginDir);
    const r = await generate({
      schema: baseSchema,
      plugin,
      targetRoots: {},
    });
    expect(r.totalTemplates).toBe(0);
    expect(r.matchedTemplates).toBe(0);
    expect(r.errors).toHaveLength(0);
  });

  it('schema.type matches no entity-type folder → empty result', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/weapon/W.cpp.hbs': 'x',
    });
    const plugin = await loadPlugin(pluginDir);
    const r = await generate({
      schema: { ...baseSchema, type: 'unknownType' },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(r.totalTemplates).toBe(1);
    expect(r.matchedTemplates).toBe(0);
    expect(r.filesCreated).toHaveLength(0);
  });

  it('all targets unconfigured → all skipped, none errored', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/profession/A.cpp.hbs': 'x',
      'targets/node/profession/B.ts.hbs': 'x',
    });
    const plugin = await loadPlugin(pluginDir);
    const r = await generate({
      schema: baseSchema,
      plugin,
      targetRoots: {}, // nothing configured
    });
    expect(r.filesCreated).toHaveLength(0);
    expect(r.filesSkipped).toHaveLength(2);
    expect(r.errors).toHaveLength(0);
  });
});

describe('audit: generator dry-run guarantees', () => {
  it('dry-run does not create any directories', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/profession/Deep/Nested/file.cpp.hbs': 'x',
    });
    const plugin = await loadPlugin(pluginDir);
    const outDir = join(dir, 'out');
    await generate({
      schema: baseSchema,
      plugin,
      targetRoots: { cpp: outDir },
      dryRun: true,
    });
    await expect(access(outDir)).rejects.toThrow();
  });

  it('dry-run still reports correct filesCreated paths', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/profession/{{pascalCase id}}.cpp.hbs': 'x',
    });
    const plugin = await loadPlugin(pluginDir);
    const r = await generate({
      schema: { ...baseSchema, id: 'taxi_driver' },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
      dryRun: true,
    });
    expect(r.filesCreated).toHaveLength(1);
    expect(r.filesCreated[0]).toContain('TaxiDriver.cpp');
  });
});

describe('audit: re-run and overwrite', () => {
  it('re-run with same schema overwrites existing files', async () => {
    const pluginDir = await setupPlugin({
      'targets/cpp/profession/F.txt.hbs': '{{data.v}}',
    });
    const plugin = await loadPlugin(pluginDir);
    const outDir = join(dir, 'out');

    await generate({
      schema: { ...baseSchema, data: { v: 'first' } },
      plugin,
      targetRoots: { cpp: outDir },
    });
    await generate({
      schema: { ...baseSchema, data: { v: 'second' } },
      plugin,
      targetRoots: { cpp: outDir },
    });

    const content = await readFile(join(outDir, 'F.txt'), 'utf-8');
    expect(content).toBe('second');
  });
});
