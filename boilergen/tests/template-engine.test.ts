import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderString, renderFile } from '../src/core/template-engine.js';

describe('renderString — case helpers', () => {
  const data = { id: 'taxi_driver' };
  it.each([
    ['{{pascalCase id}}', 'TaxiDriver'],
    ['{{camelCase id}}', 'taxiDriver'],
    ['{{snakeCase id}}', 'taxi_driver'],
    ['{{kebabCase id}}', 'taxi-driver'],
    ['{{constantCase id}}', 'TAXI_DRIVER'],
  ])('%s → %s', (tpl, expected) => {
    expect(renderString(tpl, data)).toBe(expected);
  });

  it('handles already-pascal input', () => {
    expect(renderString('{{snakeCase id}}', { id: 'TaxiDriver' })).toBe('taxi_driver');
  });

  it('handles single word', () => {
    expect(renderString('{{pascalCase id}}', { id: 'taxi' })).toBe('Taxi');
  });

  it('handles empty string', () => {
    expect(renderString('{{pascalCase id}}', { id: '' })).toBe('');
  });
});

describe('renderString — interpolation and conditionals', () => {
  it('substitutes nested fields', () => {
    expect(
      renderString('{{name}}: {{data.x}}', { name: 'A', data: { x: 42 } }),
    ).toBe('A: 42');
  });

  it('eq helper inside if block', () => {
    const tpl = '{{#if (eq type "profession")}}YES{{else}}NO{{/if}}';
    expect(renderString(tpl, { type: 'profession' })).toBe('YES');
    expect(renderString(tpl, { type: 'weapon' })).toBe('NO');
  });

  it('neq helper', () => {
    const tpl = '{{#if (neq a b)}}DIFF{{/if}}';
    expect(renderString(tpl, { a: 1, b: 2 })).toBe('DIFF');
    expect(renderString(tpl, { a: 1, b: 1 })).toBe('');
  });

  it('does not HTML-escape (we generate code, not markup)', () => {
    expect(renderString('a < b && c > d', {})).toBe('a < b && c > d');
    expect(renderString('{{x}}', { x: '<>"&' })).toBe('<>"&');
  });
});

describe('renderFile', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'boilergen-test-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads file and renders', async () => {
    const path = join(dir, 'tpl.hbs');
    await writeFile(path, 'class {{pascalCase id}} {};\n', 'utf-8');
    expect(await renderFile(path, { id: 'foo_bar' })).toBe('class FooBar {};\n');
  });
});
