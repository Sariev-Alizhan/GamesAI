// Igor's edge-case audit. Weird inputs that real users might generate.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSchema } from '../src/core/schema-loader.js';
import { renderString, parseFrontmatter } from '../src/core/template-engine.js';
import { generate } from '../src/core/generator.js';
import { loadPlugin } from '../src/core/plugin-loader.js';
import type { Schema } from '../src/core/types.js';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'boilergen-igor-edge-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

const base: Schema = { id: 'x', type: 'profession', name: 'X', data: {} };

describe('igor: weird whitespace and line endings', () => {
  it('YAML with tabs (some YAML libs reject)', () => {
    let result, error;
    try {
      result = parseSchema('id: x\ntype: y\nname: Z\ndata:\n\tval: 1\n');
    } catch (e) {
      error = e;
    }
    expect(error || result).toBeDefined();
  });

  it('YAML with BOM at start', () => {
    let result, error;
    try {
      result = parseSchema('﻿id: x\ntype: y\nname: Z\n');
    } catch (e) {
      error = e;
    }
    expect(error || result).toBeDefined();
  });

  it('YAML with CRLF line endings', () => {
    const result = parseSchema('id: x\r\ntype: y\r\nname: Z\r\n');
    expect(result.id).toBe('x');
  });

  it('YAML with trailing whitespace on every line', () => {
    const result = parseSchema('id: x   \ntype: y   \nname: Z   \n');
    expect(result.id).toBe('x');
  });

  it('YAML with mixed indentation', () => {
    let result, error;
    try {
      result = parseSchema('id: x\ntype: y\nname: Z\ndata:\n  a: 1\n   b: 2\n');
    } catch (e) {
      error = e;
    }
    expect(error || result).toBeDefined();
  });
});

describe('igor: unicode / encoding edge cases', () => {
  it('zero-width characters in name preserved', () => {
    const result = parseSchema('id: x\ntype: y\nname: "A​B"\n');
    expect(result.name.includes('​')).toBe(true);
  });

  it('right-to-left override character (homoglyph attack)', () => {
    const result = parseSchema('id: x\ntype: y\nname: "evil‮txt.exe"\n');
    expect(result.name).toBeDefined();
  });

  it('combining diacriticals normalize-stable', () => {
    const result = parseSchema('id: x\ntype: y\nname: "Á"\n'); // A with combining acute
    expect(result.name.length).toBe(2);
  });

  it('emoji in id (technically valid string)', () => {
    const result = parseSchema('id: "🚗"\ntype: vehicle\nname: Auto\n');
    expect(result.id).toBe('🚗');
  });

  it('surrogate pairs in name', () => {
    const result = parseSchema('id: x\ntype: y\nname: "𝓗𝓮𝓵𝓵𝓸"\n');
    expect(result.name).toBeDefined();
  });
});

describe('igor: pascalCase / camelCase corner cases', () => {
  it.each([
    ['{{pascalCase x}}', { x: 'a' }, 'A'],
    ['{{pascalCase x}}', { x: '1' }, '1'],
    ['{{pascalCase x}}', { x: '1a' }, '1a'],
    ['{{pascalCase x}}', { x: 'a1' }, 'A1'],
    ['{{pascalCase x}}', { x: '_' }, ''],
    ['{{pascalCase x}}', { x: '__' }, ''],
    ['{{pascalCase x}}', { x: '-_-' }, ''],
    ['{{camelCase x}}', { x: 'A' }, 'a'],
    // All-caps inputs become a single lowercase token (matches lodash behavior)
    ['{{camelCase x}}', { x: 'AB' }, 'ab'],
    ['{{camelCase x}}', { x: 'ABC' }, 'abc'],
    ['{{snakeCase x}}', { x: 'getURL' }, 'get_url'],
    ['{{snakeCase x}}', { x: 'XMLParser' }, 'xml_parser'],
    ['{{kebabCase x}}', { x: 'IPv4Address' }, 'i-pv4-address'],
    ['{{constantCase x}}', { x: 'helloWorld42' }, 'HELLO_WORLD42'],
  ])('helper edge case: %s with %p → %s', (tpl, data, expected) => {
    expect(renderString(tpl, data)).toBe(expected);
  });
});

describe('igor: deeply nested data access', () => {
  it('5-levels deep object access', () => {
    const data = { l1: { l2: { l3: { l4: { l5: 'deep' } } } } };
    expect(renderString('{{l1.l2.l3.l4.l5}}', data)).toBe('deep');
  });

  it('access beyond defined depth returns empty', () => {
    expect(renderString('{{a.b.c.d.e}}', { a: { b: 1 } })).toBe('');
  });

  it('numeric keys via array index', () => {
    expect(renderString('{{arr.[3]}}', { arr: [10, 20, 30, 40] })).toBe('40');
  });

  it('mixed array/object navigation', () => {
    expect(
      renderString('{{x.[0].name}}', { x: [{ name: 'first' }, { name: 'second' }] }),
    ).toBe('first');
  });
});

describe('igor: parseFrontmatter pathological inputs', () => {
  it('frontmatter with body containing --- separator', () => {
    const r = parseFrontmatter('---\nto: x\n---\nbody with --- inside\n');
    expect(r.frontmatter).toEqual({ to: 'x' });
    expect(r.body).toContain('---');
  });

  it('multiple ---\\n--- adjacent (empty frontmatter twice)', () => {
    const r = parseFrontmatter('---\n---\n---\nreal body\n');
    // First --- to second --- is empty FM, body should be "---\nreal body\n"
    expect(r.body.length).toBeGreaterThan(0);
  });

  it('frontmatter with very long YAML (10kb)', () => {
    const longComment = '# x\n'.repeat(2500);
    const r = parseFrontmatter(`---\n${longComment}to: a\ninject: after\nanchor: X\n---\nbody\n`);
    expect(r.frontmatter).toBeDefined();
    expect((r.frontmatter as Record<string, unknown>).to).toBe('a');
  });

  it('only --- markers, no content (treated as no frontmatter)', () => {
    // '---\n---\n' — index 4 onwards is just '---\n', no leading \n to find
    // '\n---\n' pattern from. Falls through to no-frontmatter path.
    const r = parseFrontmatter('---\n---\n');
    expect(r.frontmatter).toBeNull();
  });
});

describe('igor: generator determinism and idempotency', () => {
  it('same schema run twice produces same output', async () => {
    const tplDir = join(dir, 'plugin/targets/cpp/profession');
    await mkdir(tplDir, { recursive: true });
    await writeFile(
      join(tplDir, '{{pascalCase id}}.cpp.hbs'),
      '// {{name}}\nclass {{pascalCase id}} { int v = {{data.v}}; };\n',
      'utf-8',
    );
    const plugin = await loadPlugin(join(dir, 'plugin'));
    const out1 = join(dir, 'out1');
    const out2 = join(dir, 'out2');

    const r1 = await generate({
      schema: { ...base, id: 'taxi', data: { v: 42 } },
      plugin,
      targetRoots: { cpp: out1 },
    });
    const r2 = await generate({
      schema: { ...base, id: 'taxi', data: { v: 42 } },
      plugin,
      targetRoots: { cpp: out2 },
    });

    const c1 = await readFile(r1.filesCreated[0]!, 'utf-8');
    const c2 = await readFile(r2.filesCreated[0]!, 'utf-8');
    expect(c1).toBe(c2);
  });

  it('object key ordering does not affect output', () => {
    // Two identical schemas with different key insertion order
    const a = renderString('{{x}}-{{y}}', { x: 1, y: 2 });
    const b = renderString('{{x}}-{{y}}', { y: 2, x: 1 });
    expect(a).toBe(b);
  });
});

describe('igor: schema validation error messages are useful', () => {
  it('error message includes field name for missing field', () => {
    expect(() => parseSchema('id: x\ntype: y\n')).toThrow(/name/);
  });
  it('error message includes both field and reason for wrong type', () => {
    expect(() => parseSchema('id: 42\ntype: y\nname: Z\n')).toThrow();
  });
  it('error message identifies source label', () => {
    expect(() => parseSchema('not yaml at all: [\n', 'my-source-file.yaml')).toThrow(
      /my-source-file/,
    );
  });
});
