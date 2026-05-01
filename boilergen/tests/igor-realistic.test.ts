// Igor's realistic-scenarios audit. Mimics how the tool will be used in practice.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from '../src/core/generator.js';
import { loadPlugin } from '../src/core/plugin-loader.js';
import { loadSchema } from '../src/core/schema-loader.js';
import type { Schema } from '../src/core/types.js';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'boilergen-igor-real-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function setup(layout: Record<string, string>): Promise<string> {
  const root = join(dir, 'plugin');
  for (const [rel, content] of Object.entries(layout)) {
    const full = join(root, rel);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content, 'utf-8');
  }
  return root;
}

const base: Schema = { id: 'x', type: 'profession', name: 'X', data: {} };

describe('igor: realistic plugin with 30 templates', () => {
  it('large plugin loads and filters correctly', async () => {
    const layout: Record<string, string> = {};
    // 10 profession templates × 3 targets
    for (let i = 0; i < 10; i++) {
      layout[`targets/cpp/profession/file-${i}.cpp.hbs`] = `// p ${i} {{name}}`;
      layout[`targets/node/profession/file-${i}.ts.hbs`] = `// p ${i}`;
      layout[`targets/flutter/profession/file-${i}.dart.hbs`] = `// p ${i}`;
    }
    await setup(layout);
    const plugin = await loadPlugin(join(dir, 'plugin'));
    expect(plugin.templates).toHaveLength(30);

    const result = await generate({
      schema: base,
      plugin,
      targetRoots: { cpp: join(dir, 'a'), node: join(dir, 'b'), flutter: join(dir, 'c') },
    });
    expect(result.filesCreated).toHaveLength(30);
    expect(result.errors).toHaveLength(0);
  });
});

describe('igor: realistic incremental development', () => {
  it('add new entity type without breaking existing ones', async () => {
    const layout: Record<string, string> = {
      'targets/cpp/profession/Profession.cpp.hbs': '// {{name}}',
    };
    await setup(layout);
    let plugin = await loadPlugin(join(dir, 'plugin'));
    expect(plugin.templates).toHaveLength(1);

    // Now add a weapon entity-type later
    await mkdir(join(dir, 'plugin/targets/cpp/weapon'), { recursive: true });
    await writeFile(
      join(dir, 'plugin/targets/cpp/weapon/Weapon.cpp.hbs'),
      '// {{name}} weapon',
      'utf-8',
    );
    plugin = await loadPlugin(join(dir, 'plugin'));
    expect(plugin.templates).toHaveLength(2);

    // Generate profession — only profession files emitted
    const r1 = await generate({
      schema: base,
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(r1.filesCreated).toHaveLength(1);
    expect(r1.filesCreated[0]).toContain('Profession.cpp');
  });
});

describe('igor: realistic error recovery in batch generation', () => {
  it('error in template-3 does not stop templates 1, 2, 4, 5', async () => {
    const root = await setup({
      'targets/cpp/profession/F1.cpp.hbs': 'a {{name}}',
      'targets/cpp/profession/F2.cpp.hbs': 'b {{name}}',
      'targets/cpp/profession/F3.cpp.hbs': '{{# unclosed', // intentionally broken
      'targets/cpp/profession/F4.cpp.hbs': 'd {{name}}',
      'targets/cpp/profession/F5.cpp.hbs': 'e {{name}}',
    });
    const plugin = await loadPlugin(root);
    const r = await generate({
      schema: base,
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(r.filesCreated).toHaveLength(4);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]?.template).toContain('F3.cpp.hbs');
  });
});

describe('igor: realistic config-driven workflow (project integration)', () => {
  it('schema in one folder, config in another, output to a third', async () => {
    const projectDir = join(dir, 'gm1-server');
    await mkdir(projectDir, { recursive: true });

    const root = await setup({
      'targets/cpp/profession/{{pascalCase id}}.cpp.hbs':
        '// {{name}}\nclass {{pascalCase id}} {};\n',
    });
    const plugin = await loadPlugin(root);

    const out = join(projectDir, 'src/professions');
    const r = await generate({
      schema: { id: 'taxi_driver', type: 'profession', name: 'Таксист', data: {} },
      plugin,
      targetRoots: { cpp: out },
    });

    expect(r.filesCreated[0]).toBe(join(out, 'TaxiDriver.cpp'));
    const content = await readFile(r.filesCreated[0]!, 'utf-8');
    expect(content).toContain('class TaxiDriver');
    expect(content).toContain('// Таксист');
  });
});

describe('igor: realistic — loading a real YAML schema with $schema header', () => {
  it('YAML with yaml-language-server header parses cleanly', async () => {
    const schemaPath = join(dir, 'taxi.yaml');
    await writeFile(
      schemaPath,
      '# yaml-language-server: $schema=../boilergen.schema.json\n' +
        'id: taxi\ntype: profession\nname: Taxi\ndata:\n  baseSalary: 500\n',
      'utf-8',
    );
    const result = await loadSchema(schemaPath);
    expect(result.id).toBe('taxi');
    expect(result.data.baseSalary).toBe(500);
  });
});

describe('igor: realistic — entity type with hyphens or dots', () => {
  it('schema.type with dots ("rp.weapon") matches folder "rp.weapon"', async () => {
    const root = await setup({
      'targets/cpp/rp.weapon/F.cpp.hbs': '{{name}}',
    });
    const plugin = await loadPlugin(root);
    const r = await generate({
      schema: { ...base, type: 'rp.weapon', name: 'Test' },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(r.matchedTemplates).toBe(1);
    expect(r.filesCreated).toHaveLength(1);
  });
});

describe('igor: schema with rich data types', () => {
  it('booleans, nulls, dates render predictably', async () => {
    const root = await setup({
      'targets/cpp/profession/F.txt.hbs':
        'b={{data.b}}\nn={{data.n}}\nd={{data.d}}\nf={{data.f}}\n',
    });
    const plugin = await loadPlugin(root);
    const r = await generate({
      schema: {
        ...base,
        data: { b: true, n: null, d: 3.14, f: false },
      },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    expect(r.errors).toHaveLength(0);
    const content = await readFile(r.filesCreated[0]!, 'utf-8');
    expect(content).toContain('b=true');
    expect(content).toContain('n='); // null renders empty
    expect(content).toContain('d=3.14');
    expect(content).toContain('f=false');
  });
});
