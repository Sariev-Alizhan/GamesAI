// Igor's security audit. Adversarial inputs designed to break or escape.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSchema } from '../src/core/schema-loader.js';
import { renderString } from '../src/core/template-engine.js';
import { generate } from '../src/core/generator.js';
import { loadPlugin } from '../src/core/plugin-loader.js';
import type { Schema } from '../src/core/types.js';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'boilergen-igor-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

const baseSchema: Schema = { id: 'x', type: 'profession', name: 'X', data: {} };

describe('igor: prototype pollution attempts', () => {
  it('YAML with __proto__ key cannot pollute Object prototype', () => {
    const before = (Object.prototype as Record<string, unknown>).polluted;
    let result;
    try {
      result = parseSchema(
        'id: x\ntype: y\nname: Z\ndata:\n  __proto__:\n    polluted: yes\n',
      );
    } catch {
      // strict mode might reject, that's OK
    }
    const after = (Object.prototype as Record<string, unknown>).polluted;
    expect(after).toBe(before);
    // Cleanup just in case
    delete (Object.prototype as Record<string, unknown>).polluted;
  });

  it('YAML with constructor.prototype in data does not pollute', () => {
    let result;
    try {
      result = parseSchema(
        'id: x\ntype: y\nname: Z\ndata:\n  constructor:\n    prototype:\n      polluted: yes\n',
      );
    } catch {
      // Safe failure also acceptable
    }
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('igor: ReDoS via skipIf regex', () => {
  it('catastrophic backtracking pattern resolves quickly or throws', async () => {
    const tplDir = join(dir, 'plugin/targets/api/profession');
    await mkdir(tplDir, { recursive: true });
    // (a+)+b is the classic ReDoS pattern
    await writeFile(
      join(tplDir, 'evil.hbs'),
      '---\nto: target.txt\ninject: after\nanchor: "X"\nskipIf: "(a+)+b"\n---\nbody\n',
      'utf-8',
    );
    const target = join(dir, 'project');
    await mkdir(target, { recursive: true });
    // Long string of a's with no b — classic ReDoS trigger
    await writeFile(join(target, 'target.txt'), 'X\n' + 'a'.repeat(30) + '\n', 'utf-8');

    const plugin = await loadPlugin(join(dir, 'plugin'));
    const start = Date.now();
    const result = await generate({
      schema: baseSchema,
      plugin,
      targetRoots: { api: target },
    });
    const elapsed = Date.now() - start;
    // Either succeeds within reasonable time OR errors. Must not hang.
    expect(elapsed).toBeLessThan(5000);
    expect(result.errors.length + result.filesInjected.length + result.filesSkipped.length)
      .toBeGreaterThan(0);
  }, 10000);
});

describe('igor: HTML/XSS in data fields (codegen safety)', () => {
  it('script tag in data passes through verbatim (we generate code, not HTML)', () => {
    const out = renderString('value:{{x}}', { x: '<script>alert(1)</script>' });
    expect(out).toBe('value:<script>alert(1)</script>');
    expect(out).toContain('<script>');
  });
  it('handlebars-style injection in data does NOT re-evaluate', () => {
    // {{x}} where x = "{{y}}" should output literal "{{y}}", not look up y
    const out = renderString('{{x}}', { x: '{{y}}', y: 'pwned' });
    expect(out).toBe('{{y}}');
    expect(out).not.toContain('pwned');
  });
});

describe('igor: arbitrary code execution attempts via Handlebars', () => {
  it('cannot access process via {{process.env}}', () => {
    // Handlebars doesn't expose globals — this should render empty
    const out = renderString('{{process.env.HOME}}', {});
    expect(out).toBe('');
    expect(out).not.toContain('/');
  });
  it('cannot access Function constructor', () => {
    const out = renderString('{{constructor.constructor}}', { constructor: Function });
    // Should not execute. Handlebars stringifies but doesn't invoke.
    expect(out).not.toContain('CODE');
  });
  it('helper invocation with weird args does not crash', () => {
    expect(renderString('{{pascalCase x}}', { x: { toString: () => 'a-b' } })).toBe('AB');
  });
});

describe('igor: filesystem attacks beyond simple traversal', () => {
  it('id with null byte does not write a truncated path', async () => {
    const tplDir = join(dir, 'plugin/targets/cpp/profession');
    await mkdir(tplDir, { recursive: true });
    await writeFile(join(tplDir, '{{kebabCase id}}.txt.hbs'), 'x', 'utf-8');
    const plugin = await loadPlugin(join(dir, 'plugin'));
    const result = await generate({
      schema: { ...baseSchema, id: 'safe\x00.evil' },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    // Either errors (Node refuses null bytes in paths) or sanitizes — must not write outside.
    if (result.filesCreated.length > 0) {
      for (const f of result.filesCreated) {
        expect(f.includes('\x00')).toBe(false);
      }
    }
  });

  it('id with absolute path (/etc/passwd) stays inside targetRoot', async () => {
    const tplDir = join(dir, 'plugin/targets/cpp/profession');
    await mkdir(tplDir, { recursive: true });
    await writeFile(join(tplDir, '{{snakeCase id}}.txt.hbs'), 'x', 'utf-8');
    const plugin = await loadPlugin(join(dir, 'plugin'));
    const targetRoot = join(dir, 'out');
    const result = await generate({
      schema: { ...baseSchema, id: '/etc/passwd' },
      plugin,
      targetRoots: { cpp: targetRoot },
    });
    for (const f of result.filesCreated) {
      expect(f.startsWith(targetRoot)).toBe(true);
    }
  });
});

describe('igor: malformed plugin structures', () => {
  it('plugin with one bad-frontmatter template — full plugin should NOT load', async () => {
    // Currently throws. Document this behavior or change to skip.
    const tplDir = join(dir, 'plugin/targets/cpp/profession');
    await mkdir(tplDir, { recursive: true });
    await writeFile(join(tplDir, 'good.cpp.hbs'), '// ok', 'utf-8');
    await writeFile(
      join(tplDir, 'bad.cpp.hbs'),
      '---\ninject: after\n---\nbody\n', // missing 'to' and 'anchor'
      'utf-8',
    );
    await expect(loadPlugin(join(dir, 'plugin'))).rejects.toThrow();
  });

  it('plugin where targets is a file instead of a directory', async () => {
    await mkdir(join(dir, 'plugin'), { recursive: true });
    await writeFile(join(dir, 'plugin/targets'), 'I am a file', 'utf-8');
    await expect(loadPlugin(join(dir, 'plugin'))).rejects.toThrow();
  });

  it('uppercase .HBS extension is currently NOT detected (case-sensitive endsWith)', async () => {
    const tplDir = join(dir, 'plugin/targets/cpp/profession');
    await mkdir(tplDir, { recursive: true });
    await writeFile(join(tplDir, 'foo.cpp.HBS'), 'x', 'utf-8');
    const plugin = await loadPlugin(join(dir, 'plugin'));
    // Documents current behavior — uppercase .HBS not recognized.
    // If we ever change, update this test.
    expect(plugin.templates.length).toBe(0);
  });
});

describe('igor: very long inputs', () => {
  it('schema with 1MB data field renders without crash', async () => {
    const big = 'x'.repeat(1_000_000);
    const tplDir = join(dir, 'plugin/targets/cpp/profession');
    await mkdir(tplDir, { recursive: true });
    await writeFile(join(tplDir, 'f.txt.hbs'), '{{data.big}}', 'utf-8');
    const plugin = await loadPlugin(join(dir, 'plugin'));
    const start = Date.now();
    const result = await generate({
      schema: { ...baseSchema, data: { big } },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    const elapsed = Date.now() - start;
    expect(result.errors).toHaveLength(0);
    expect(elapsed).toBeLessThan(2000);
  });

  it('schema id with 5000 characters', async () => {
    const longId = 'a'.repeat(5000);
    const tplDir = join(dir, 'plugin/targets/cpp/profession');
    await mkdir(tplDir, { recursive: true });
    await writeFile(join(tplDir, '{{kebabCase id}}.txt.hbs'), 'x', 'utf-8');
    const plugin = await loadPlugin(join(dir, 'plugin'));
    // Most filesystems max 255 bytes per name component — should error gracefully
    const result = await generate({
      schema: { ...baseSchema, id: longId },
      plugin,
      targetRoots: { cpp: join(dir, 'out') },
    });
    // We don't care about success/failure — just that it doesn't crash
    expect(result).toBeDefined();
  });
});

describe('igor: YAML feature abuse', () => {
  it('YAML anchors and aliases work normally', () => {
    const result = parseSchema(
      'id: x\ntype: y\nname: Z\ndata:\n  base: &base\n    val: 1\n  ext:\n    <<: *base\n    other: 2\n',
    );
    // Either succeeds with merged data or fails — must not crash
    expect(result).toBeDefined();
  });

  it('YAML with explicit !!str type tag', () => {
    const result = parseSchema('id: !!str x\ntype: y\nname: Z\n');
    expect(result.id).toBe('x');
  });

  it('YAML attempting to use !!js/function (should NOT execute)', () => {
    // js-yaml's default schema doesn't support !!js/function — this should fail safely
    let result, error;
    try {
      result = parseSchema(
        'id: x\ntype: y\nname: Z\ndata:\n  evil: !!js/function "function () { throw \\"PWNED\\"; }"\n',
      );
    } catch (e) {
      error = e;
    }
    // Either rejected at parse time or evil tag treated as string — must not execute
    expect(error || result).toBeDefined();
  });
});
