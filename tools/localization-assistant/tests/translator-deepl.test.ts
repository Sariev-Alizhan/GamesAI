import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { translateBatchDeepL, isDeepLSupported } from '../src/core/translator-deepl.js';
import type { MissingKey } from '../src/core/types.js';

const fixtureMissing = (overrides: Partial<MissingKey> = {}): MissingKey => ({
  key: 'ui.greet',
  sourceValue: 'Hello',
  targetLanguage: 'ru',
  ...overrides,
});

describe('isDeepLSupported', () => {
  it('returns true for major European/Asian languages', () => {
    expect(isDeepLSupported('en')).toBe(true);
    expect(isDeepLSupported('ru')).toBe(true);
    expect(isDeepLSupported('de')).toBe(true);
    expect(isDeepLSupported('ja')).toBe(true);
    expect(isDeepLSupported('zh')).toBe(true);
  });

  it('returns false for languages DeepL does not support', () => {
    expect(isDeepLSupported('kk')).toBe(false);  // Kazakh — not in DeepL
    expect(isDeepLSupported('uz')).toBe(false);  // Uzbek
    expect(isDeepLSupported('th')).toBe(false);  // Thai
  });

  it('is case-insensitive', () => {
    expect(isDeepLSupported('EN')).toBe(true);
    expect(isDeepLSupported('Ru')).toBe(true);
  });
});

describe('translateBatchDeepL — input validation', () => {
  it('returns empty array immediately for empty input', async () => {
    const result = await translateBatchDeepL([], 'en', { apiKey: 'fake' });
    expect(result).toEqual([]);
  });

  it('throws when no API key is provided and DEEPL_API_KEY is unset', async () => {
    const original = process.env.DEEPL_API_KEY;
    delete process.env.DEEPL_API_KEY;
    try {
      await expect(
        translateBatchDeepL([fixtureMissing()], 'en'),
      ).rejects.toThrow(/DEEPL_API_KEY/);
    } finally {
      if (original !== undefined) process.env.DEEPL_API_KEY = original;
    }
  });

  it('throws clear error when source language is not DeepL-supported', async () => {
    await expect(
      translateBatchDeepL([fixtureMissing()], 'kk', { apiKey: 'fake' }),
    ).rejects.toThrow(/DeepL does not support source language/);
  });

  it('throws clear error when any target language is not DeepL-supported (Kazakh case)', async () => {
    await expect(
      translateBatchDeepL(
        [fixtureMissing({ targetLanguage: 'kk' })],
        'en',
        { apiKey: 'fake' },
      ),
    ).rejects.toThrow(/DeepL does not support target language "kk".*--provider anthropic/s);
  });
});

describe('translateBatchDeepL — HTTP behavior', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('calls DeepL Pro endpoint with correct auth + body, parses translations', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      translations: [
        { detected_source_language: 'EN', text: 'Привет' },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await translateBatchDeepL(
      [fixtureMissing()],
      'en',
      { apiKey: 'test-key' },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://api.deepl.com/v2/translate');
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('DeepL-Auth-Key test-key');
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.source_lang).toBe('EN');
    expect(body.target_lang).toBe('RU');
    expect(body.text).toEqual(['Hello']);
    expect(body.preserve_formatting).toBe(true);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: 'ui.greet',
      language: 'ru',
      value: 'Привет',
      sourceValue: 'Hello',
      rationale: 'deepl-pro',
    });
  });

  it('uses regional EN-US for English target (DeepL requires regional variant)', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      translations: [{ detected_source_language: 'RU', text: 'Hello' }],
    }), { status: 200 }));

    await translateBatchDeepL(
      [fixtureMissing({ sourceValue: 'Привет', targetLanguage: 'en' })],
      'ru',
      { apiKey: 'k' },
    );

    const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.target_lang).toBe('EN-US');
    expect(body.source_lang).toBe('RU');
  });

  it('groups by target language — one HTTP call per language batch', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({
        translations: [{ detected_source_language: 'EN', text: 'Привет' }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        translations: [{ detected_source_language: 'EN', text: 'Hallo' }],
      }), { status: 200 }));

    await translateBatchDeepL(
      [
        fixtureMissing({ targetLanguage: 'ru' }),
        fixtureMissing({ targetLanguage: 'de' }),
      ],
      'en',
      { apiKey: 'k' },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('throws on non-OK response with response text in error', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('quota exceeded', { status: 456 }));
    await expect(
      translateBatchDeepL([fixtureMissing()], 'en', { apiKey: 'k' }),
    ).rejects.toThrow(/DeepL API error 456.*quota exceeded/s);
  });

  it('throws if returned translations count does not match input batch size', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      translations: [],  // empty
    }), { status: 200 }));

    await expect(
      translateBatchDeepL([fixtureMissing()], 'en', { apiKey: 'k' }),
    ).rejects.toThrow(/returned 0 translations for 1-item batch/);
  });

  it('uses custom endpoint when supplied (test injection)', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      translations: [{ detected_source_language: 'EN', text: 'X' }],
    }), { status: 200 }));

    await translateBatchDeepL(
      [fixtureMissing()],
      'en',
      { apiKey: 'k', endpoint: 'https://test.example/v2/translate' },
    );

    expect(fetchSpy.mock.calls[0]![0]).toBe('https://test.example/v2/translate');
  });
});
