import { describe, it, expect } from 'vitest';
import {
  extractPlaceholders,
  checkPlaceholders,
  checkLength,
  lint,
  type LintRules,
} from '../src/core/linter.js';
import type { Locale } from '../src/core/types.js';

function locale(language: string, entries: Record<string, string>): Locale {
  return { language, layout: 'flat', entries };
}

describe('extractPlaceholders', () => {
  it('returns empty for plain text', () => {
    expect(extractPlaceholders('hello world')).toEqual([]);
  });

  it('extracts named placeholder', () => {
    expect(extractPlaceholders('Hello, {playerName}!')).toEqual(['playerName']);
  });

  it('extracts positional placeholders', () => {
    expect(extractPlaceholders('{0} killed {1}')).toEqual(['0', '1']);
  });

  it('extracts ICU plural variable, ignores format details', () => {
    expect(
      extractPlaceholders('{count, plural, one {# item} other {# items}}'),
    ).toEqual(['count']);
  });

  it('handles mixed placeholders', () => {
    expect(
      extractPlaceholders('Hello {playerName}, you have {count, plural, one {# kill} other {# kills}}'),
    ).toContain('playerName');
    expect(
      extractPlaceholders('Hello {playerName}, you have {count, plural, one {# kill} other {# kills}}'),
    ).toContain('count');
  });

  it('does not crash on unbalanced braces', () => {
    expect(() => extractPlaceholders('hello {broken')).not.toThrow();
    expect(extractPlaceholders('hello {broken')).toEqual([]);
  });
});

describe('checkPlaceholders', () => {
  it('flags missing placeholder as error', () => {
    const src = locale('en', { 'g.welcome': 'Hello, {playerName}!' });
    const tgt = locale('ru', { 'g.welcome': 'Привет!' });   // dropped {playerName}
    const issues = checkPlaceholders(src, tgt);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toBe('missing-placeholder');
    expect(issues[0]!.severity).toBe('error');
    expect(issues[0]!.details).toMatchObject({ placeholder: 'playerName' });
  });

  it('flags extra placeholder as warning', () => {
    const src = locale('en', { 'g.greet': 'Hello!' });
    const tgt = locale('ru', { 'g.greet': 'Привет, {whoIsThis}!' });
    const issues = checkPlaceholders(src, tgt);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toBe('extra-placeholder');
    expect(issues[0]!.severity).toBe('warning');
  });

  it('passes when placeholders match', () => {
    const src = locale('en', { 'g.welcome': 'Hello, {playerName}!' });
    const tgt = locale('ru', { 'g.welcome': 'Привет, {playerName}!' });
    expect(checkPlaceholders(src, tgt)).toEqual([]);
  });

  it('skips check when target has no entry (fill tool will handle it)', () => {
    const src = locale('en', { 'g.welcome': 'Hello, {playerName}!' });
    const tgt = locale('ru', {});
    expect(checkPlaceholders(src, tgt)).toEqual([]);
  });

  it('respects severity overrides from rules', () => {
    const src = locale('en', { 'g.welcome': 'Hello, {playerName}!' });
    const tgt = locale('ru', { 'g.welcome': 'Привет!' });
    const rules: LintRules = { severity: { 'missing-placeholder': 'warning' } };
    const issues = checkPlaceholders(src, tgt, rules);
    expect(issues[0]!.severity).toBe('warning');
  });
});

describe('checkLength', () => {
  it('flags overflow when target / source ratio exceeds default 1.5x', () => {
    const src = locale('en', { 'ui.btn.ok': 'OK' });                     // 2 chars
    const tgt = locale('de', { 'ui.btn.ok': 'Bestätigen' });             // 10 chars → 5x
    const issues = checkLength(src, tgt);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toBe('length-overflow');
    expect(issues[0]!.details).toMatchObject({ sourceLength: 2, targetLength: 10 });
    expect((issues[0]!.details as Record<string, number>).ratio).toBeGreaterThan(1.5);
  });

  it('uses per-language ratio when provided', () => {
    const src = locale('en', { 'g.body': '12345' });           // 5 chars
    const tgt = locale('ja', { 'g.body': '1234567' });         // 7 chars → 1.4x
    // Default 1.5x → 7/5 = 1.4 passes. But ja override 0.7 → fails (1.4 > 0.7).
    const issuesDefault = checkLength(src, tgt);
    expect(issuesDefault).toHaveLength(0);
    const issuesJa = checkLength(src, tgt, { maxLengthRatio: { ja: 0.7 } });
    expect(issuesJa).toHaveLength(1);
  });

  it('respects per-key hard cap and skips ratio check when cap fires', () => {
    const src = locale('en', { 'ui.btn.confirm': 'OK' });
    const tgt = locale('ru', { 'ui.btn.confirm': 'Подтвердить' });   // 11 chars
    const rules: LintRules = { maxLengthByKey: { 'ui.btn.confirm': 8 } };
    const issues = checkLength(src, tgt, rules);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toBe('length-cap-exceeded');
    expect(issues[0]!.severity).toBe('error');
    expect(issues[0]!.details).toMatchObject({ length: 11, cap: 8 });
  });

  it('does not flag when target is missing or empty', () => {
    const src = locale('en', { 'g.body': 'hello world' });
    const tgt = locale('ru', { 'g.body': '' });
    expect(checkLength(src, tgt)).toEqual([]);
  });

  it('handles zero-length source without dividing by zero', () => {
    const src = locale('en', { 'g.empty': '' });
    const tgt = locale('ru', { 'g.empty': 'Не пусто' });
    expect(checkLength(src, tgt)).toEqual([]);
  });

  it('per-key cap takes priority — ratio is not also flagged', () => {
    const src = locale('en', { 'ui.btn.x': 'OK' });            // 2 chars
    const tgt = locale('ru', { 'ui.btn.x': 'Подтвердить' });   // 11 chars (5.5x ratio + cap-exceed)
    const rules: LintRules = { maxLengthByKey: { 'ui.btn.x': 8 } };
    const issues = checkLength(src, tgt, rules);
    // Should produce ONE issue (cap), not two.
    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toBe('length-cap-exceeded');
  });
});

describe('lint (full report)', () => {
  it('returns aggregate report grouped by language with error/warning counts', () => {
    const src = locale('en', {
      'g.welcome': 'Hello, {playerName}!',
      'ui.btn.ok': 'OK',
    });
    const ru = locale('ru', {
      'g.welcome': 'Привет!',                 // missing-placeholder → error
      'ui.btn.ok': 'Подтвердить',             // ratio 5.5x → warning (length-overflow)
    });
    const kk = locale('kk', {
      'g.welcome': 'Сәлем, {playerName}!',    // OK
      'ui.btn.ok': 'OK',                      // OK
    });

    const report = lint(src, [ru, kk]);

    expect(report.errorCount).toBe(1);
    expect(report.warningCount).toBe(1);
    expect(report.totalIssues).toBe(2);
    expect(report.byLanguage.ru).toHaveLength(2);
    expect(report.byLanguage.kk).toEqual([]);
  });

  it('returns clean report when nothing fails', () => {
    const src = locale('en', { 'a': 'hi' });
    const tgt = locale('ru', { 'a': 'привет' }); // 6 chars / 2 chars = 3x — wait, fails default 1.5x
    // Use a more forgiving rule for this one
    const rules: LintRules = { maxLengthRatio: { default: 5.0 } };
    const report = lint(src, [tgt], rules);
    expect(report.totalIssues).toBe(0);
  });
});
