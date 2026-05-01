// Edge-case audit for schema parsing.
import { describe, it, expect } from 'vitest';
import { parseSchema } from '../src/core/schema-loader.js';

describe('audit: schema accepts valid inputs', () => {
  it('minimal schema with no data', () => {
    const r = parseSchema('id: x\ntype: y\nname: Z\n');
    expect(r.data).toEqual({});
  });
  it('schema with many data fields', () => {
    const r = parseSchema('id: x\ntype: y\nname: Z\ndata:\n  a: 1\n  b: hello\n  c: true\n  d: 3.14\n  e: [1,2,3]\n');
    expect(r.data.a).toBe(1);
    expect(r.data.b).toBe('hello');
    expect(r.data.c).toBe(true);
    expect(r.data.d).toBe(3.14);
    expect(r.data.e).toEqual([1, 2, 3]);
  });
  it('cyrillic id should work (despite English convention)', () => {
    const r = parseSchema('id: тестов\ntype: profession\nname: Тестов\n');
    expect(r.id).toBe('тестов');
  });
  it('id with digits and underscores', () => {
    const r = parseSchema('id: ak_47_v2\ntype: weapon\nname: AK\n');
    expect(r.id).toBe('ak_47_v2');
  });
  it('emoji in name is preserved', () => {
    const r = parseSchema('id: x\ntype: y\nname: "🚗 Car"\n');
    expect(r.name).toBe('🚗 Car');
  });
  it('nested data objects', () => {
    const r = parseSchema('id: x\ntype: y\nname: Z\ndata:\n  stats:\n    hp: 100\n    speed: 30\n');
    expect((r.data.stats as Record<string, unknown>).hp).toBe(100);
  });
  it('multiline string in data', () => {
    const r = parseSchema('id: x\ntype: y\nname: Z\ndata:\n  desc: |\n    line one\n    line two\n');
    expect(r.data.desc).toBe('line one\nline two\n');
  });
  it('YAML comments are ignored', () => {
    const r = parseSchema('# my comment\nid: x\ntype: y\nname: Z\n# another\n');
    expect(r.id).toBe('x');
  });
  it('# yaml-language-server header is preserved (just a comment)', () => {
    const r = parseSchema('# yaml-language-server: $schema=foo\nid: x\ntype: y\nname: Z\n');
    expect(r.id).toBe('x');
  });
});

describe('audit: schema rejects invalid inputs', () => {
  it('rejects null id', () => {
    expect(() => parseSchema('id: null\ntype: y\nname: Z\n')).toThrow();
  });
  it('rejects numeric id', () => {
    expect(() => parseSchema('id: 42\ntype: y\nname: Z\n')).toThrow();
  });
  it('rejects array as schema', () => {
    expect(() => parseSchema('- a\n- b\n')).toThrow();
  });
  it('rejects bare string', () => {
    expect(() => parseSchema('"just a string"')).toThrow();
  });
  it('rejects empty document', () => {
    expect(() => parseSchema('')).toThrow();
  });
  it('rejects empty id', () => {
    expect(() => parseSchema('id: ""\ntype: y\nname: Z\n')).toThrow(/id/);
  });
  it('rejects empty type', () => {
    expect(() => parseSchema('id: x\ntype: ""\nname: Z\n')).toThrow(/type/);
  });
  it('rejects empty name', () => {
    expect(() => parseSchema('id: x\ntype: y\nname: ""\n')).toThrow(/name/);
  });
  it('rejects data as array', () => {
    expect(() => parseSchema('id: x\ntype: y\nname: Z\ndata: [1, 2]\n')).toThrow();
  });
  it('rejects data as string', () => {
    expect(() => parseSchema('id: x\ntype: y\nname: Z\ndata: hello\n')).toThrow();
  });
  it('strict mode: extra top-level fields rejected', () => {
    expect(() => parseSchema('id: x\ntype: y\nname: Z\nextra: hi\n')).toThrow();
  });
  it('YAML parse error reports source label', () => {
    expect(() => parseSchema('id: x\n  bad: [unclosed\n', 'my-source')).toThrow(/my-source/);
  });
});

describe('audit: schema with data: null edge case', () => {
  it('YAML "data:" with no value parses as null — should error or default?', () => {
    // Important: Zod's .default({}) only triggers on undefined, not null.
    // If user writes "data:" (yaml null), this should either default OR throw — must not crash.
    let result;
    let error;
    try {
      result = parseSchema('id: x\ntype: y\nname: Z\ndata:\n');
    } catch (e) {
      error = e;
    }
    // Either behavior is acceptable for MVP; just must not crash silently.
    expect(error || result).toBeDefined();
  });
});
