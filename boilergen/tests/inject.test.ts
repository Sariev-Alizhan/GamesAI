import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from '../src/core/generator.js';
import { loadPlugin } from '../src/core/plugin-loader.js';
import { parseFrontmatter } from '../src/core/template-engine.js';
import type { Schema } from '../src/core/types.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'boilergen-test-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const schema: Schema = {
  id: 'taxi_driver',
  type: 'profession',
  name: 'Taxi',
  data: {},
};

async function setupPlugin(templateBody: string): Promise<string> {
  const tplPath = join(dir, 'plugin/targets/api/profession/router-register.ts.hbs');
  await mkdir(join(tplPath, '..'), { recursive: true });
  await writeFile(tplPath, templateBody, 'utf-8');
  return join(dir, 'plugin');
}

describe('parseFrontmatter', () => {
  it('extracts YAML frontmatter and body', () => {
    const r = parseFrontmatter('---\nto: x.ts\ninject: after\n---\nbody line\n');
    expect(r.frontmatter).toEqual({ to: 'x.ts', inject: 'after' });
    expect(r.body).toBe('body line\n');
  });

  it('returns null frontmatter when content has no leading ---', () => {
    const r = parseFrontmatter('just content\n');
    expect(r.frontmatter).toBeNull();
    expect(r.body).toBe('just content\n');
  });

  it('treats unclosed frontmatter as plain body', () => {
    const r = parseFrontmatter('---\nto: x.ts\nno end marker\n');
    expect(r.frontmatter).toBeNull();
    expect(r.body).toContain('to: x.ts');
  });
});

describe('plugin-loader frontmatter', () => {
  it('parses inject metadata into Template.inject', async () => {
    const pluginDir = await setupPlugin(
      '---\nto: src/router.ts\ninject: after\nanchor: "// REGISTRY"\n---\nregister({{camelCase id}});\n',
    );
    const plugin = await loadPlugin(pluginDir);
    expect(plugin.templates).toHaveLength(1);
    expect(plugin.templates[0]?.inject).toEqual({
      mode: 'after',
      to: 'src/router.ts',
      anchor: '// REGISTRY',
    });
  });

  it('throws on invalid frontmatter (missing required field)', async () => {
    const pluginDir = await setupPlugin(
      '---\nto: x.ts\ninject: after\n---\nbody\n',
    );
    await expect(loadPlugin(pluginDir)).rejects.toThrow(/anchor/);
  });

  it('throws on invalid inject mode', async () => {
    const pluginDir = await setupPlugin(
      '---\nto: x.ts\ninject: middle\nanchor: "X"\n---\nbody\n',
    );
    await expect(loadPlugin(pluginDir)).rejects.toThrow();
  });
});

describe('generator inject mode', () => {
  it('inserts after anchor line', async () => {
    const pluginDir = await setupPlugin(
      '---\nto: router.ts\ninject: after\nanchor: "// REGISTRY"\n---\nuse({{camelCase id}});\n',
    );
    const targetRoot = join(dir, 'project');
    await mkdir(targetRoot, { recursive: true });
    await writeFile(
      join(targetRoot, 'router.ts'),
      'import x;\n// REGISTRY\nfooter;\n',
      'utf-8',
    );

    const plugin = await loadPlugin(pluginDir);
    const result = await generate({ schema, plugin, targetRoots: { api: targetRoot } });

    expect(result.filesInjected).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    const final = await readFile(join(targetRoot, 'router.ts'), 'utf-8');
    expect(final).toBe('import x;\n// REGISTRY\nuse(taxiDriver);\nfooter;\n');
  });

  it('inserts before anchor line', async () => {
    const pluginDir = await setupPlugin(
      '---\nto: router.ts\ninject: before\nanchor: "// REGISTRY"\n---\nuse({{camelCase id}});\n',
    );
    const targetRoot = join(dir, 'project');
    await mkdir(targetRoot, { recursive: true });
    await writeFile(join(targetRoot, 'router.ts'), 'header;\n// REGISTRY\nfooter;\n', 'utf-8');

    const plugin = await loadPlugin(pluginDir);
    await generate({ schema, plugin, targetRoots: { api: targetRoot } });

    const final = await readFile(join(targetRoot, 'router.ts'), 'utf-8');
    expect(final).toBe('header;\nuse(taxiDriver);\n// REGISTRY\nfooter;\n');
  });

  it('skipIf prevents duplicate injection (idempotency)', async () => {
    // skipIf is a substring check (not regex) — see generator.ts comment.
    const pluginDir = await setupPlugin(
      '---\nto: router.ts\ninject: after\nanchor: "// REGISTRY"\nskipIf: "use({{camelCase id}})"\n---\nuse({{camelCase id}});\n',
    );
    const targetRoot = join(dir, 'project');
    await mkdir(targetRoot, { recursive: true });
    const initial = '// REGISTRY\nuse(taxiDriver);\n';
    await writeFile(join(targetRoot, 'router.ts'), initial, 'utf-8');

    const plugin = await loadPlugin(pluginDir);
    const result = await generate({ schema, plugin, targetRoots: { api: targetRoot } });

    expect(result.filesInjected).toHaveLength(0);
    expect(result.filesSkipped).toHaveLength(1);
    expect(result.filesSkipped[0]?.reason).toContain('skipIf matched');
    const final = await readFile(join(targetRoot, 'router.ts'), 'utf-8');
    expect(final).toBe(initial);
  });

  it('errors when target file does not exist', async () => {
    const pluginDir = await setupPlugin(
      '---\nto: missing.ts\ninject: after\nanchor: "X"\n---\nbody\n',
    );
    const targetRoot = join(dir, 'project');
    await mkdir(targetRoot, { recursive: true });

    const plugin = await loadPlugin(pluginDir);
    const result = await generate({ schema, plugin, targetRoots: { api: targetRoot } });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toMatch(/not found/);
  });

  it('errors when anchor is not present in target file', async () => {
    const pluginDir = await setupPlugin(
      '---\nto: router.ts\ninject: after\nanchor: "// MISSING"\n---\nbody\n',
    );
    const targetRoot = join(dir, 'project');
    await mkdir(targetRoot, { recursive: true });
    await writeFile(join(targetRoot, 'router.ts'), 'no anchor here\n', 'utf-8');

    const plugin = await loadPlugin(pluginDir);
    const result = await generate({ schema, plugin, targetRoots: { api: targetRoot } });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toMatch(/Anchor not found/);
  });

  it('dry-run does not modify target file', async () => {
    const pluginDir = await setupPlugin(
      '---\nto: router.ts\ninject: after\nanchor: "// X"\n---\nadded;\n',
    );
    const targetRoot = join(dir, 'project');
    await mkdir(targetRoot, { recursive: true });
    const original = '// X\n';
    await writeFile(join(targetRoot, 'router.ts'), original, 'utf-8');

    const plugin = await loadPlugin(pluginDir);
    const result = await generate({
      schema,
      plugin,
      targetRoots: { api: targetRoot },
      dryRun: true,
    });

    expect(result.filesInjected).toHaveLength(1);
    const final = await readFile(join(targetRoot, 'router.ts'), 'utf-8');
    expect(final).toBe(original);
  });

  it('renders Handlebars in to/anchor/skipIf paths', async () => {
    const pluginDir = await setupPlugin(
      '---\nto: "{{kebabCase id}}.ts"\ninject: after\nanchor: "// {{constantCase id}}"\n---\nbody\n',
    );
    const targetRoot = join(dir, 'project');
    await mkdir(targetRoot, { recursive: true });
    await writeFile(
      join(targetRoot, 'taxi-driver.ts'),
      '// TAXI_DRIVER\n',
      'utf-8',
    );

    const plugin = await loadPlugin(pluginDir);
    const result = await generate({ schema, plugin, targetRoots: { api: targetRoot } });

    expect(result.filesInjected).toHaveLength(1);
    expect(result.filesInjected[0]).toContain('taxi-driver.ts');
  });
});
