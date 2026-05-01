// Edge-case audit for template engine helpers and rendering.
import { describe, it, expect } from 'vitest';
import { renderString, parseFrontmatter } from '../src/core/template-engine.js';

describe('audit: case helpers — adversarial inputs', () => {
  it.each([
    // Mixed separators
    ['{{pascalCase x}}', { x: 'foo-bar_baz qux' }, 'FooBarBazQux'],
    // Numbers as separators / inside
    ['{{pascalCase x}}', { x: 'ak_47' }, 'Ak47'],
    ['{{pascalCase x}}', { x: 'mark2_v3' }, 'Mark2V3'],
    // Already pascalCase input
    ['{{snakeCase x}}', { x: 'TaxiDriverPro' }, 'taxi_driver_pro'],
    // ALL_CAPS
    ['{{camelCase x}}', { x: 'TAXI_DRIVER' }, 'taxiDriver'],
    // single-char tokens
    ['{{constantCase x}}', { x: 'a-b-c' }, 'A_B_C'],
    // empty
    ['{{kebabCase x}}', { x: '' }, ''],
    // spaces
    ['{{snakeCase x}}', { x: 'hello world' }, 'hello_world'],
    // multiple spaces
    ['{{snakeCase x}}', { x: '  a   b  ' }, 'a_b'],
    // multiple separators in a row
    ['{{kebabCase x}}', { x: 'a___b' }, 'a-b'],
    // unicode (cyrillic) — passthrough lowercase
    ['{{snakeCase x}}', { x: 'Тест' }, 'тест'],
  ])('%s with %p → %s', (tpl, data, expected) => {
    expect(renderString(tpl, data)).toBe(expected);
  });
});

describe('audit: handlebars conditionals and missing data', () => {
  it('missing variable renders empty', () => {
    expect(renderString('value:{{x}}!', {})).toBe('value:!');
  });
  it('nested missing renders empty', () => {
    expect(renderString('value:{{data.x}}!', {})).toBe('value:!');
  });
  it('eq with undefined values', () => {
    expect(renderString('{{#if (eq a b)}}Y{{else}}N{{/if}}', {})).toBe('Y');
  });
  it('boolean values render as true/false', () => {
    expect(renderString('{{x}}', { x: true })).toBe('true');
    expect(renderString('{{x}}', { x: false })).toBe('false');
  });
  it('zero renders as 0', () => {
    expect(renderString('{{x}}', { x: 0 })).toBe('0');
  });
  it('null renders as empty', () => {
    expect(renderString('{{x}}', { x: null })).toBe('');
  });
  it('arrays accessible by index', () => {
    expect(renderString('{{x.[0]}}-{{x.[1]}}', { x: ['a', 'b'] })).toBe('a-b');
  });
  it('each block over array', () => {
    expect(renderString('{{#each x}}<{{this}}>{{/each}}', { x: ['a', 'b', 'c'] })).toBe('<a><b><c>');
  });
});

describe('audit: noEscape (codegen safety)', () => {
  it('preserves & < > in raw output', () => {
    expect(renderString('a < b && c > d', {})).toBe('a < b && c > d');
  });
  it('does not escape interpolated < >', () => {
    expect(renderString('{{x}}', { x: '<script>' })).toBe('<script>');
  });
  it('quotes are not escaped', () => {
    expect(renderString('"{{x}}"', { x: 'has "quotes"' })).toBe('"has "quotes""');
  });
});

describe('audit: parseFrontmatter edge cases', () => {
  it('returns null for content not starting with ---', () => {
    expect(parseFrontmatter('plain content').frontmatter).toBeNull();
  });
  it('returns null for content with --- but not at start', () => {
    expect(parseFrontmatter('foo\n---\nbar\n---\n').frontmatter).toBeNull();
  });
  it('handles \\r\\n line endings — degraded gracefully (does not parse)', () => {
    // \r\n at end of frontmatter delimiter not matched by our \n-only check.
    // Either parses or returns null cleanly — must not throw.
    const r = parseFrontmatter('---\r\nto: x\r\n---\r\nbody\r\n');
    expect(r).toBeDefined();
    expect(r.body).toBeTypeOf('string');
  });
  it('frontmatter that fails YAML parse falls back to no-frontmatter', () => {
    const r = parseFrontmatter('---\n[broken yaml\n---\nbody\n');
    expect(r.frontmatter).toBeNull();
    // body should contain everything (the whole content) since fallback path returns whole content
    expect(r.body.length).toBeGreaterThan(0);
  });
  it('empty frontmatter section parses as null', () => {
    const r = parseFrontmatter('---\n\n---\nbody\n');
    // Empty YAML between markers parses as null in js-yaml
    expect(r.frontmatter).toBeNull();
    expect(r.body).toBe('body\n');
  });
  it('frontmatter with only whitespace body', () => {
    const r = parseFrontmatter('---\nx: 1\n---\n');
    expect(r.frontmatter).toEqual({ x: 1 });
    expect(r.body).toBe('');
  });
});
