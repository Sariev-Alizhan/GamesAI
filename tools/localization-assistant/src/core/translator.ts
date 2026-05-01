// AI translation layer using Claude. Prompt caching on the system block
// since it's stable across requests.

import Anthropic from '@anthropic-ai/sdk';
import type { MissingKey, TranslateOptions, Translation } from './types.js';

const SYSTEM_PROMPT_BASE = `You are a translator specialized in **video game localization**.

You will receive a list of strings that need to be translated from a source language to a target language. Your output is a JSON array of {"key": string, "value": string} objects, one per input string.

# Rules

1. Output ONLY raw JSON. No code fences, no preamble, no explanation.
2. Every object in the output must have:
   - "key": the exact string id from the input (do not invent keys, do not skip any)
   - "value": the translation in the target language
3. Preserve placeholders exactly: {0}, {{name}}, %s, $variable — these are runtime substitution tokens, never translate them.
4. Preserve markup tags exactly: <b>, <color=...>, [color=red] etc.
5. Keep the same number of newlines and approximate sentence count.
6. Match the **register and tone** of the source (formal/informal). Game text is usually informal/casual.
7. For names of items, characters, places: prefer **localized** versions if natural in the target language ("Огненный шар" for "Fireball" in Russian), but keep franchise names untouched ("AK-47" stays "AK-47").
8. If a string is a stub like "TODO: translate X" — translate X, ignore the TODO marker.

# Output format

Input:
[
  {"key": "weapon.ak47.name", "value": "AK-47", "from": "en", "to": "ru"},
  {"key": "ui.menu.start", "value": "Start Game", "from": "en", "to": "ru"}
]

Output:
[
  {"key": "weapon.ak47.name", "value": "АК-47"},
  {"key": "ui.menu.start", "value": "Начать игру"}
]`;

let cachedClient: Anthropic | null = null;

function getClient(apiKey?: string): Anthropic {
  if (apiKey) return new Anthropic({ apiKey });
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

/**
 * Translate a batch of missing keys. Sends them all in one Claude call —
 * cheaper and more contextually consistent than per-key calls.
 */
export async function translateBatch(
  missing: MissingKey[],
  sourceLanguage: string,
  opts: TranslateOptions = {},
): Promise<Translation[]> {
  if (missing.length === 0) return [];

  // Apply glossary first — these are pre-determined and don't need AI.
  const glossary = opts.glossary ?? {};
  const fromGlossary: Translation[] = [];
  const remaining: MissingKey[] = [];
  for (const m of missing) {
    const glossaryEntry = glossary[m.sourceValue];
    if (glossaryEntry && glossaryEntry[m.targetLanguage]) {
      fromGlossary.push({
        key: m.key,
        language: m.targetLanguage,
        value: glossaryEntry[m.targetLanguage]!,
        sourceValue: m.sourceValue,
        rationale: 'glossary',
      });
    } else {
      remaining.push(m);
    }
  }

  if (remaining.length === 0) return fromGlossary;

  // Group by target language so we can do one batch per language with cache.
  const byLanguage = new Map<string, MissingKey[]>();
  for (const m of remaining) {
    const list = byLanguage.get(m.targetLanguage) ?? [];
    list.push(m);
    byLanguage.set(m.targetLanguage, list);
  }

  const client = getClient(opts.apiKey);
  const aiTranslations: Translation[] = [];

  for (const [targetLang, batch] of byLanguage) {
    const userInput = JSON.stringify(
      batch.map((m) => ({
        key: m.key,
        value: m.sourceValue,
        from: sourceLanguage,
        to: targetLang,
      })),
      null,
      2,
    );

    const userMessage = opts.gameContext
      ? `Game context: ${opts.gameContext}\n\nTranslate from ${sourceLanguage} to ${targetLang}:\n\n${userInput}`
      : `Translate from ${sourceLanguage} to ${targetLang}:\n\n${userInput}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT_BASE,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    let rawText = '';
    for (const block of response.content) {
      if (block.type === 'text') rawText += block.text;
    }

    let parsed: unknown;
    try {
      // Strip code fences if Claude added them despite instructions.
      const cleaned = rawText.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new Error(
        `AI returned non-JSON for ${targetLang} batch: ${rawText.slice(0, 200)}... (${err instanceof Error ? err.message : err})`,
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`AI returned non-array for ${targetLang}: ${typeof parsed}`);
    }

    for (const item of parsed) {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof (item as Record<string, unknown>).key !== 'string' ||
        typeof (item as Record<string, unknown>).value !== 'string'
      ) {
        continue;
      }
      const typed = item as { key: string; value: string };
      const sourceItem = batch.find((m) => m.key === typed.key);
      if (!sourceItem) continue;
      aiTranslations.push({
        key: typed.key,
        language: targetLang,
        value: typed.value,
        sourceValue: sourceItem.sourceValue,
      });
    }
  }

  return [...fromGlossary, ...aiTranslations];
}
