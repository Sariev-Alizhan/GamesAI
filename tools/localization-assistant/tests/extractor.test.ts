import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectLayout,
  diffLocales,
  flatten,
  inferLanguage,
  loadLocale,
  nest,
} from '../src/core/extractor.js';
import type { Locale } from '../src/core/types.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'loc-test-'));
});

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe('flatten', () => {
  it('flattens single-level nested', () => {
    expect(flatten({ a: 'A', b: 'B' })).toEqual({ a: 'A', b: 'B' });
  });
  it('flattens deep nested with dots', () => {
    expect(flatten({ a: { b: { c: 'C' } }, d: 'D' })).toEqual({ 'a.b.c': 'C', d: 'D' });
  });
  it('handles already-flat keys with dots', () => {
    expect(flatten({ 'weapon.ak47.name': 'AK-47' })).toEqual({ 'weapon.ak47.name': 'AK-47' });
  });
});

describe('nest', () => {
  it('nests dotted keys back into objects', () => {
    expect(nest({ 'a.b.c': 'C', d: 'D' })).toEqual({ a: { b: { c: 'C' } }, d: 'D' });
  });
  it('round-trips with flatten', () => {
    const original = { x: { y: { z: 'Z' }, w: 'W' } };
    expect(nest(flatten(original))).toEqual(original);
  });
});

describe('inferLanguage', () => {
  it.each([
    ['en.json', 'en'],
    ['ru.json', 'ru'],
    ['kk.json', 'kk'],
    ['locale-ru.json', 'ru'],
    ['ru-RU.json', 'ru'],
    ['en_US.json', 'en'],
    ['/path/to/messages.kk.json', 'kk'],
  ])('infers %s → %s', (path, expected) => {
    expect(inferLanguage(path)).toBe(expected);
  });
});

describe('detectLayout', () => {
  it('detects flat when all values are strings', () => {
    expect(detectLayout({ a: 'A', b: 'B' })).toBe('flat');
  });
  it('detects nested when any value is an object', () => {
    expect(detectLayout({ a: 'A', b: { c: 'C' } })).toBe('nested');
  });
});

describe('loadLocale', () => {
  it('loads flat layout', async () => {
    const path = join(dir, 'en.json');
    await writeFile(path, JSON.stringify({ 'ui.start': 'Start' }), 'utf-8');
    const locale = await loadLocale(path);
    expect(locale.language).toBe('en');
    expect(locale.layout).toBe('flat');
    expect(locale.entries['ui.start']).toBe('Start');
  });
  it('loads nested layout and flattens internally', async () => {
    const path = join(dir, 'ru.json');
    await writeFile(path, JSON.stringify({ ui: { start: 'Старт' } }), 'utf-8');
    const locale = await loadLocale(path);
    expect(locale.language).toBe('ru');
    expect(locale.layout).toBe('nested');
    expect(locale.entries['ui.start']).toBe('Старт');
  });
  it('throws on malformed JSON', async () => {
    const path = join(dir, 'bad.json');
    await writeFile(path, '{ broken', 'utf-8');
    await expect(loadLocale(path)).rejects.toThrow(/Failed to parse JSON/);
  });
  it('throws on non-object root', async () => {
    const path = join(dir, 'array.json');
    await writeFile(path, '[1, 2, 3]', 'utf-8');
    await expect(loadLocale(path)).rejects.toThrow(/JSON object/);
  });
});

describe('diffLocales — what counts as missing', () => {
  const source: Locale = {
    language: 'en',
    layout: 'flat',
    entries: {
      'a.name': 'Alpha',
      'b.name': 'Beta',
      'c.name': 'Gamma',
      'd.name': 'Delta',
    },
  };

  it('detects missing keys', () => {
    const target: Locale = { language: 'ru', layout: 'flat', entries: { 'a.name': 'Альфа' } };
    const missing = diffLocales(source, target);
    expect(missing.map((m) => m.key).sort()).toEqual(['b.name', 'c.name', 'd.name']);
  });

  it('detects empty-string values as missing', () => {
    const target: Locale = {
      language: 'ru',
      layout: 'flat',
      entries: { 'a.name': 'Альфа', 'b.name': '', 'c.name': 'Гамма', 'd.name': 'Дельта' },
    };
    expect(diffLocales(source, target).map((m) => m.key)).toEqual(['b.name']);
  });

  it('detects TODO-prefixed values as missing (case insensitive)', () => {
    const target: Locale = {
      language: 'ru',
      layout: 'flat',
      entries: {
        'a.name': 'Альфа',
        'b.name': 'TODO: translate Beta',
        'c.name': 'todo: Гамма',
        'd.name': 'Дельта',
      },
    };
    expect(diffLocales(source, target).map((m) => m.key).sort()).toEqual(['b.name', 'c.name']);
  });

  it('detects untranslated copies (target equals source) as missing', () => {
    const target: Locale = {
      language: 'ru',
      layout: 'flat',
      entries: { 'a.name': 'Альфа', 'b.name': 'Beta', 'c.name': 'Gamma', 'd.name': 'Дельта' },
    };
    expect(diffLocales(source, target).map((m) => m.key).sort()).toEqual(['b.name', 'c.name']);
  });

  it('preserves real translations as not-missing', () => {
    const target: Locale = {
      language: 'ru',
      layout: 'flat',
      entries: { 'a.name': 'Альфа', 'b.name': 'Бета', 'c.name': 'Гамма', 'd.name': 'Дельта' },
    };
    expect(diffLocales(source, target)).toEqual([]);
  });

  it('attaches sourceValue and targetLanguage to each missing entry', () => {
    const target: Locale = { language: 'kk', layout: 'flat', entries: {} };
    const missing = diffLocales(source, target);
    expect(missing.every((m) => m.targetLanguage === 'kk')).toBe(true);
    const a = missing.find((m) => m.key === 'a.name');
    expect(a?.sourceValue).toBe('Alpha');
  });
});
