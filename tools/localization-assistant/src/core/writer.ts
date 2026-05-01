// Merge translations back into a target locale and write to disk in the
// original layout (flat or nested).

import { writeFile } from 'node:fs/promises';
import { nest } from './extractor.js';
import type { FlatLocale, Locale, Translation } from './types.js';

export interface MergeResult {
  /** Number of keys that were updated (existing values overwritten or new keys added) */
  updated: number;
  /** Number of keys that already had a non-stub translation and were left alone */
  preserved: number;
  /** Final flat locale entries after merge */
  entries: FlatLocale;
}

/**
 * Merge translations into a target locale. Existing non-stub values in
 * target take precedence (we never overwrite a real translation). Stub
 * values (TODO, empty, equal-to-source) get replaced.
 */
export function mergeTranslations(
  target: Locale,
  sourceEntries: FlatLocale,
  translations: Translation[],
): MergeResult {
  const result: FlatLocale = { ...target.entries };
  let updated = 0;
  let preserved = 0;

  for (const t of translations) {
    if (t.language !== target.language) continue;
    const existing = result[t.key];
    const isStub =
      existing === undefined ||
      existing.trim() === '' ||
      /^todo\b/i.test(existing.trim()) ||
      existing === sourceEntries[t.key];
    if (isStub) {
      result[t.key] = t.value;
      updated++;
    } else {
      preserved++;
    }
  }

  return { updated, preserved, entries: result };
}

/**
 * Write the locale back to disk in its original layout.
 */
export async function writeLocale(filePath: string, locale: Locale): Promise<void> {
  const out = locale.layout === 'flat' ? locale.entries : nest(locale.entries);
  // Sort top-level keys for stable diffs in source control.
  const sorted = sortKeys(out);
  await writeFile(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
}

function sortKeys(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = sortKeys((value as Record<string, unknown>)[key]);
  }
  return out;
}
