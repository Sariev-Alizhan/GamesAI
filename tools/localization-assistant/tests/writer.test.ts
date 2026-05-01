import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeTranslations, writeLocale } from '../src/core/writer.js';
import type { Locale, Translation } from '../src/core/types.js';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'loc-w-test-')); });
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });

describe('mergeTranslations — what gets overwritten', () => {
  const source = { 'a.name': 'Alpha', 'b.name': 'Beta', 'c.name': 'Gamma' };

  it('fills in missing keys', () => {
    const target: Locale = { language: 'ru', layout: 'flat', entries: { 'a.name': 'Альфа' } };
    const trs: Translation[] = [
      { key: 'b.name', language: 'ru', value: 'Бета', sourceValue: 'Beta' },
      { key: 'c.name', language: 'ru', value: 'Гамма', sourceValue: 'Gamma' },
    ];
    const result = mergeTranslations(target, source, trs);
    expect(result.updated).toBe(2);
    expect(result.entries).toEqual({ 'a.name': 'Альфа', 'b.name': 'Бета', 'c.name': 'Гамма' });
  });

  it('overwrites TODO stubs', () => {
    const target: Locale = {
      language: 'ru',
      layout: 'flat',
      entries: { 'a.name': 'Альфа', 'b.name': 'TODO: translate', 'c.name': 'Гамма' },
    };
    const trs: Translation[] = [
      { key: 'b.name', language: 'ru', value: 'Бета', sourceValue: 'Beta' },
    ];
    const result = mergeTranslations(target, source, trs);
    expect(result.updated).toBe(1);
    expect(result.entries['b.name']).toBe('Бета');
  });

  it('preserves real translations even if AI provides one', () => {
    const target: Locale = {
      language: 'ru',
      layout: 'flat',
      entries: { 'a.name': 'Альфа (manual)', 'b.name': 'Бета', 'c.name': 'Гамма' },
    };
    const trs: Translation[] = [
      { key: 'a.name', language: 'ru', value: 'AI version', sourceValue: 'Alpha' },
    ];
    const result = mergeTranslations(target, source, trs);
    expect(result.preserved).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.entries['a.name']).toBe('Альфа (manual)');
  });

  it('ignores translations for the wrong target language', () => {
    const target: Locale = { language: 'ru', layout: 'flat', entries: {} };
    const trs: Translation[] = [
      { key: 'a.name', language: 'kk', value: 'Альфа казахская', sourceValue: 'Alpha' },
    ];
    const result = mergeTranslations(target, source, trs);
    expect(result.updated).toBe(0);
  });
});

describe('writeLocale — round-trip preserves layout', () => {
  it('writes flat layout', async () => {
    const path = join(dir, 'out-flat.json');
    const locale: Locale = {
      language: 'ru',
      layout: 'flat',
      entries: { 'b.name': 'Бета', 'a.name': 'Альфа' },
    };
    await writeLocale(path, locale);
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw);
    // Keys sorted for stable diffs
    expect(Object.keys(parsed)).toEqual(['a.name', 'b.name']);
  });

  it('writes nested layout when source was nested', async () => {
    const path = join(dir, 'out-nested.json');
    const locale: Locale = {
      language: 'ru',
      layout: 'nested',
      entries: { 'ui.start': 'Старт', 'ui.quit': 'Выйти', 'weapon.sword': 'Меч' },
    };
    await writeLocale(path, locale);
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.ui).toEqual({ quit: 'Выйти', start: 'Старт' });
    expect(parsed.weapon).toEqual({ sword: 'Меч' });
  });

  it('output is sorted for stable git diffs', async () => {
    const path = join(dir, 'out-sorted.json');
    const locale: Locale = {
      language: 'ru',
      layout: 'flat',
      entries: { z: 'Z', a: 'A', m: 'M' },
    };
    await writeLocale(path, locale);
    const raw = await readFile(path, 'utf-8');
    expect(Object.keys(JSON.parse(raw))).toEqual(['a', 'm', 'z']);
  });

  it('ends file with newline (POSIX convention)', async () => {
    const path = join(dir, 'out-newline.json');
    const locale: Locale = { language: 'en', layout: 'flat', entries: { x: 'X' } };
    await writeLocale(path, locale);
    const raw = await readFile(path, 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
  });
});
