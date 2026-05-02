// Core types for the Localization Assistant.
//
// We support TWO common JSON locale layouts:
//
// 1. Flat keys:    { "weapon.ak47.name": "АК-47", "ui.menu.start": "Старт" }
// 2. Nested:       { "weapon": { "ak47": { "name": "АК-47" } } }
//
// Internally we always work with flat dotted keys, converting at the I/O
// boundary. This keeps every intermediate operation (diff, translate, merge)
// straightforward.

export type FlatLocale = Record<string, string>;

export type NestedLocale = { [key: string]: string | NestedLocale };

export interface Locale {
  /** ISO 639-1 language code (en, ru, kk, etc.) */
  language: string;
  /** Flat dotted-key representation, regardless of source layout */
  entries: FlatLocale;
  /** Original layout — preserved so we can round-trip it on write */
  layout: 'flat' | 'nested';
}

export interface MissingKey {
  key: string;
  /** Source-language value (the thing the AI will translate from) */
  sourceValue: string;
  /** Target language code we need a translation for */
  targetLanguage: string;
}

export interface Translation {
  key: string;
  language: string;
  value: string;
  /** Source value used as input — kept for review/UX */
  sourceValue: string;
  /** Reasoning if AI provided one (for review mode) */
  rationale?: string;
}

export type TranslationProvider = 'anthropic' | 'deepl';

export interface TranslateOptions {
  apiKey?: string;
  /**
   * Which translation provider to use.
   *   'anthropic' (default) — Claude API. Best for game-specific tone, glossary,
   *      and placeholder preservation. Supports any language pair.
   *   'deepl'             — DeepL Pro API. Higher per-call quality on plain text
   *      for European/major Asian languages, but doesn't preserve {placeholder}
   *      tokens reliably (run `lint` after fill to catch drops). Pro only —
   *      Free tier TOS forbids wrapping.
   */
  provider?: TranslationProvider;
  /**
   * Optional context to inject into the system prompt — e.g. "this is a
   * fantasy RPG game with medieval tone". Improves translation quality
   * for genre-specific terminology. Anthropic-only.
   */
  gameContext?: string;
  /**
   * Glossary of terms that must translate consistently — e.g.
   * { "Fireball": { "ru": "Огненный шар", "kk": "От шары" } }
   * Glossary entries take precedence over any AI translation. Provider-agnostic.
   */
  glossary?: Record<string, Record<string, string>>;
}
