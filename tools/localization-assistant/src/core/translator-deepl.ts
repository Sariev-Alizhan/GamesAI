// DeepL Pro translator — opt-in alternative to Anthropic Claude.
//
// User provides DEEPL_API_KEY for the Pro tier (api.deepl.com).
// We do NOT support DeepL Free tier (api-free.deepl.com): their TOS forbids
// "creating similar product...whose primary purpose is to provide services
// based on machine learning, including translations" — bundling Free into
// an OSS translation tool is the kind of "similar product" they prohibit.
// Pro is fine: server-side BYO-key, user pays per character to DeepL directly.
//
// DeepL is excellent for plain text but does NOT understand {playerName}-style
// placeholders the way Claude does — it may translate them. We compensate by:
//   1. preserve_formatting=true on the API call
//   2. recommending users run `localization-assistant lint` AFTER fill to
//      catch any placeholder drops
//
// For Kazakh (kk), Indonesian (id), and other languages DeepL doesn't support,
// we throw a clear error pointing at Anthropic instead.

import type { MissingKey, Translation } from './types.js';

const DEEPL_PRO_ENDPOINT = 'https://api.deepl.com/v2/translate';

/**
 * Map ISO 639-1 → DeepL target_lang code.
 * Source: https://developers.deepl.com/docs/resources/supported-languages
 *
 * For English target, DeepL requires regional variant (EN-US or EN-GB);
 * we default to EN-US since most games default to American English.
 */
const TARGET_LANG_MAP: Record<string, string> = {
  bg: 'BG', cs: 'CS', da: 'DA', de: 'DE', el: 'EL',
  en: 'EN-US', es: 'ES', et: 'ET', fi: 'FI', fr: 'FR',
  hu: 'HU', id: 'ID', it: 'IT', ja: 'JA', ko: 'KO',
  lt: 'LT', lv: 'LV', nb: 'NB', nl: 'NL', pl: 'PL',
  pt: 'PT-PT', ro: 'RO', ru: 'RU', sk: 'SK', sl: 'SL',
  sv: 'SV', tr: 'TR', uk: 'UK', zh: 'ZH',
};

/**
 * Map ISO 639-1 → DeepL source_lang code.
 * Source codes are simpler — no regional variants.
 */
const SOURCE_LANG_MAP: Record<string, string> = {
  bg: 'BG', cs: 'CS', da: 'DA', de: 'DE', el: 'EL',
  en: 'EN', es: 'ES', et: 'ET', fi: 'FI', fr: 'FR',
  hu: 'HU', id: 'ID', it: 'IT', ja: 'JA', ko: 'KO',
  lt: 'LT', lv: 'LV', nb: 'NB', nl: 'NL', pl: 'PL',
  pt: 'PT', ro: 'RO', ru: 'RU', sk: 'SK', sl: 'SL',
  sv: 'SV', tr: 'TR', uk: 'UK', zh: 'ZH',
};

export function isDeepLSupported(language: string): boolean {
  return language.toLowerCase() in TARGET_LANG_MAP;
}

export interface DeepLOptions {
  apiKey?: string;
  /** Endpoint override — only used by tests. Defaults to Pro endpoint. */
  endpoint?: string;
}

interface DeepLResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

/**
 * Translate a batch of missing keys via DeepL Pro.
 *
 * Throws if:
 *   - No API key (env DEEPL_API_KEY or opts.apiKey)
 *   - Any target language is not in DeepL's supported list — caller should
 *     fall back to Anthropic for those keys.
 */
export async function translateBatchDeepL(
  missing: MissingKey[],
  sourceLanguage: string,
  opts: DeepLOptions = {},
): Promise<Translation[]> {
  if (missing.length === 0) return [];

  const apiKey = opts.apiKey ?? process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error(
      'DeepL provider requires DEEPL_API_KEY (Pro tier). Get one at ' +
      'https://www.deepl.com/pro-api — Free tier is not supported (TOS).',
    );
  }

  const endpoint = opts.endpoint ?? DEEPL_PRO_ENDPOINT;
  const sourceCode = SOURCE_LANG_MAP[sourceLanguage.toLowerCase()];
  if (!sourceCode) {
    throw new Error(
      `DeepL does not support source language "${sourceLanguage}". ` +
      `Supported: ${Object.keys(SOURCE_LANG_MAP).join(', ')}.`,
    );
  }

  // Group by target language — DeepL takes one target_lang per request.
  const byLanguage = new Map<string, MissingKey[]>();
  for (const m of missing) {
    const list = byLanguage.get(m.targetLanguage) ?? [];
    list.push(m);
    byLanguage.set(m.targetLanguage, list);
  }

  // Validate all target languages first — fail fast before any network call.
  for (const lang of byLanguage.keys()) {
    if (!isDeepLSupported(lang)) {
      throw new Error(
        `DeepL does not support target language "${lang}". ` +
        `Supported: ${Object.keys(TARGET_LANG_MAP).join(', ')}. ` +
        `Use --provider anthropic for unsupported languages.`,
      );
    }
  }

  const out: Translation[] = [];

  for (const [targetLang, batch] of byLanguage) {
    const targetCode = TARGET_LANG_MAP[targetLang.toLowerCase()]!;
    const texts = batch.map((m) => m.sourceValue);

    const body = {
      text: texts,
      source_lang: sourceCode,
      target_lang: targetCode,
      preserve_formatting: true,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'localization-assistant/0.2.0',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `DeepL API error ${response.status} for ${targetLang} batch: ${errText.slice(0, 300)}`,
      );
    }

    const data = (await response.json()) as DeepLResponse;
    if (!Array.isArray(data.translations) || data.translations.length !== batch.length) {
      throw new Error(
        `DeepL returned ${data.translations?.length ?? 'no'} translations for ${batch.length}-item batch (lang=${targetLang})`,
      );
    }

    for (let i = 0; i < batch.length; i++) {
      const m = batch[i]!;
      const t = data.translations[i]!;
      out.push({
        key: m.key,
        language: m.targetLanguage,
        value: t.text,
        sourceValue: m.sourceValue,
        rationale: 'deepl-pro',
      });
    }
  }

  return out;
}
