// Deterministic linter for locale JSON files.
//
// Catches the failures that account for most "broken localization in production"
// reports — without calling any AI:
//
//   1. Placeholder mismatch:  source has {playerName}, target dropped it
//   2. Length overflow:       target translation 3x the source — UI overflow
//   3. Per-key length cap:    button labels capped at 12 chars regardless of source
//
// Run BEFORE the AI fill pass. AI translations land in already-validated shape,
// not the other way around. This is what turns the module from "GPT wrapper"
// into "linter + AI fill."
//
// Usage from code:
//   const issues = lint(source, [ru, kk], rules);
// Usage from CLI:
//   localization-assistant lint --source en.json --target ru.json kk.json --rules rules.json

import type { Locale } from './types.js';

export type IssueSeverity = 'error' | 'warning';

export type IssueKind =
  | 'missing-placeholder'   // source has {var}, target lost it
  | 'extra-placeholder'     // target has {var} that source doesn't
  | 'length-overflow'       // target / source ratio > maxLengthRatio for language
  | 'length-cap-exceeded';  // target exceeds per-key maxLengthByKey

export interface LintIssue {
  kind: IssueKind;
  severity: IssueSeverity;
  language: string;
  key: string;
  sourceValue: string;
  targetValue: string;
  /** Human-readable explanation — what's wrong and what to do. */
  message: string;
  /** Extra structured data per kind (placeholder name, length numbers, etc.). */
  details?: Record<string, unknown>;
}

export interface LintRules {
  /**
   * Max ratio target_length / source_length, per language.
   * `default` applies if a language is not listed. Default fallback: 1.5.
   *
   * Calibration hints (rough):
   *   en → de: ~1.3   en → ru: ~1.5   en → fr: ~1.3   en → ja: 0.7   en → ko: 0.8
   * (German/Russian expand, Japanese/Korean compress.)
   */
  maxLengthRatio?: Record<string, number>;
  /**
   * Hard length cap per source key — overrides ratio. Used for UI elements
   * with fixed width (button labels, single-line headers).
   */
  maxLengthByKey?: Record<string, number>;
  /**
   * Severity for each kind. Default: missing-placeholder = error,
   * extra-placeholder = warning, length-* = warning.
   */
  severity?: Partial<Record<IssueKind, IssueSeverity>>;
}

const DEFAULT_RATIO = 1.5;

const DEFAULT_SEVERITY: Record<IssueKind, IssueSeverity> = {
  'missing-placeholder': 'error',
  'extra-placeholder':   'warning',
  'length-overflow':     'warning',
  'length-cap-exceeded': 'error',
};

/**
 * Extract placeholders from a translation string. Supports the common formats
 * used by Unity Localization, ICU MessageFormat, i18next, react-intl:
 *
 *   {playerName}                                      → 'playerName'
 *   {0}, {1}                                          → '0', '1'
 *   {count, plural, one {# item} other {# items}}    → 'count'
 *
 * Walks the string with a brace-depth counter so nested braces inside ICU
 * plural/select forms are handled correctly — naive regex matches the inner
 * '{# item}' and misses the outer 'count'.
 *
 * NOT supported (out-of-scope for v1): printf-style %s/%d, ${name} JS templates,
 * @{name} Unreal-style. Add them if a real user reports a need.
 */
export function extractPlaceholders(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start !== -1) {
          const inner = text.slice(start + 1, i);
          // ICU "count, plural, one {...}" — keep only the leading variable name
          const variable = inner.split(',')[0]!.trim();
          if (variable.length > 0) out.push(variable);
          start = -1;
        }
      }
      // unbalanced '}' on its own — silently ignore
    }
  }
  return out;
}

function getRatio(rules: LintRules, language: string): number {
  return rules.maxLengthRatio?.[language] ?? rules.maxLengthRatio?.default ?? DEFAULT_RATIO;
}

function getSeverity(rules: LintRules, kind: IssueKind): IssueSeverity {
  return rules.severity?.[kind] ?? DEFAULT_SEVERITY[kind];
}

/** Check placeholder parity between source and target translations. */
export function checkPlaceholders(
  sourceLocale: Locale,
  targetLocale: Locale,
  rules: LintRules = {},
): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const [key, sourceValue] of Object.entries(sourceLocale.entries)) {
    const targetValue = targetLocale.entries[key];
    if (targetValue === undefined || targetValue === '') continue; // missing-key is the fill tool's job, not ours

    const sourceVars = new Set(extractPlaceholders(sourceValue));
    const targetVars = new Set(extractPlaceholders(targetValue));

    for (const v of sourceVars) {
      if (!targetVars.has(v)) {
        issues.push({
          kind: 'missing-placeholder',
          severity: getSeverity(rules, 'missing-placeholder'),
          language: targetLocale.language,
          key,
          sourceValue,
          targetValue,
          message: `target dropped placeholder {${v}} present in source`,
          details: { placeholder: v },
        });
      }
    }
    for (const v of targetVars) {
      if (!sourceVars.has(v)) {
        issues.push({
          kind: 'extra-placeholder',
          severity: getSeverity(rules, 'extra-placeholder'),
          language: targetLocale.language,
          key,
          sourceValue,
          targetValue,
          message: `target has placeholder {${v}} not present in source — likely typo`,
          details: { placeholder: v },
        });
      }
    }
  }
  return issues;
}

/** Check length expansion ratio + per-key hard caps. */
export function checkLength(
  sourceLocale: Locale,
  targetLocale: Locale,
  rules: LintRules = {},
): LintIssue[] {
  const issues: LintIssue[] = [];
  const ratio = getRatio(rules, targetLocale.language);

  for (const [key, sourceValue] of Object.entries(sourceLocale.entries)) {
    const targetValue = targetLocale.entries[key];
    if (targetValue === undefined || targetValue === '') continue;

    // Per-key hard cap takes precedence over ratio.
    const cap = rules.maxLengthByKey?.[key];
    if (cap !== undefined && targetValue.length > cap) {
      issues.push({
        kind: 'length-cap-exceeded',
        severity: getSeverity(rules, 'length-cap-exceeded'),
        language: targetLocale.language,
        key,
        sourceValue,
        targetValue,
        message: `target ${targetValue.length} chars exceeds hard cap of ${cap}`,
        details: { length: targetValue.length, cap },
      });
      continue; // skip ratio if cap already flagged
    }

    if (sourceValue.length === 0) continue; // can't compute ratio against empty source
    const actualRatio = targetValue.length / sourceValue.length;
    if (actualRatio > ratio) {
      issues.push({
        kind: 'length-overflow',
        severity: getSeverity(rules, 'length-overflow'),
        language: targetLocale.language,
        key,
        sourceValue,
        targetValue,
        message: `target ${targetValue.length} chars / source ${sourceValue.length} chars = ${actualRatio.toFixed(2)}x (limit ${ratio}x)`,
        details: {
          sourceLength: sourceValue.length,
          targetLength: targetValue.length,
          ratio: Number(actualRatio.toFixed(3)),
          maxRatio: ratio,
        },
      });
    }
  }
  return issues;
}

export interface LintReport {
  byLanguage: Record<string, LintIssue[]>;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
}

/** Run all checks for one source against all targets, return aggregate report. */
export function lint(source: Locale, targets: Locale[], rules: LintRules = {}): LintReport {
  const byLanguage: Record<string, LintIssue[]> = {};
  let errorCount = 0;
  let warningCount = 0;

  for (const target of targets) {
    const issues = [
      ...checkPlaceholders(source, target, rules),
      ...checkLength(source, target, rules),
    ];
    byLanguage[target.language] = issues;
    for (const i of issues) {
      if (i.severity === 'error') errorCount++;
      else warningCount++;
    }
  }

  return {
    byLanguage,
    totalIssues: errorCount + warningCount,
    errorCount,
    warningCount,
  };
}
