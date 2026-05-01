// Read locale JSON files (flat or nested) and produce a normalized
// Locale object. Also: diff a source locale against a target to find
// missing translation keys.

import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { FlatLocale, Locale, MissingKey, NestedLocale } from './types.js';

/** Convert nested object to flat dotted-key map. */
export function flatten(obj: NestedLocale, prefix = ''): FlatLocale {
  const out: FlatLocale = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[fullKey] = value;
    } else if (value !== null && typeof value === 'object') {
      Object.assign(out, flatten(value as NestedLocale, fullKey));
    }
  }
  return out;
}

/** Inverse of flatten — rebuild nested structure from dotted keys. */
export function nest(flat: FlatLocale): NestedLocale {
  const out: NestedLocale = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cursor: NestedLocale = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      const existing = cursor[part];
      if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) {
        cursor[part] = {};
      }
      cursor = cursor[part] as NestedLocale;
    }
    cursor[parts[parts.length - 1]!] = value;
  }
  return out;
}

/**
 * Heuristically infer language code from filename.
 * en.json → en, ru.json → ru, locale-kk.json → kk, messages.kk.json → kk, etc.
 */
export function inferLanguage(filePath: string): string {
  const name = basename(filePath, extname(filePath)).toLowerCase();
  // Match common patterns: "en", "ru-RU", "locale-kk", "kk_KZ", "messages.kk".
  // Separators include `.` so "messages.kk" → kk.
  const m = name.match(/(?:^|[-_.])([a-z]{2})(?:[-_][a-z]{2})?$/);
  return m ? m[1]! : name;
}

/** Detect whether a parsed JSON object is flat (all string values) or nested. */
export function detectLayout(obj: unknown): 'flat' | 'nested' {
  if (typeof obj !== 'object' || obj === null) return 'flat';
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) return 'nested';
  }
  return 'flat';
}

export async function loadLocale(filePath: string): Promise<Locale> {
  const raw = await readFile(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse JSON in ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Locale file must be a JSON object, got: ${typeof parsed}`);
  }
  const layout = detectLayout(parsed);
  const entries = layout === 'flat'
    ? (parsed as FlatLocale)
    : flatten(parsed as NestedLocale);
  return {
    language: inferLanguage(filePath),
    entries,
    layout,
  };
}

/**
 * Diff source vs target — return keys that exist in source but are missing
 * (or empty/TODO) in target. We treat the following as "needs translation":
 *
 * - Key entirely absent
 * - Empty string value
 * - Value starting with "TODO" (case-insensitive) — common Boilergen-generated stub
 * - Value that equals the source value (untranslated copy)
 */
export function diffLocales(source: Locale, target: Locale): MissingKey[] {
  const missing: MissingKey[] = [];
  for (const [key, sourceValue] of Object.entries(source.entries)) {
    const targetValue = target.entries[key];
    const needsFill =
      targetValue === undefined ||
      targetValue.trim() === '' ||
      /^todo\b/i.test(targetValue.trim()) ||
      targetValue === sourceValue;
    if (needsFill) {
      missing.push({ key, sourceValue, targetLanguage: target.language });
    }
  }
  return missing;
}
