// `localization-assistant lint` — deterministic checks before AI fill.
//
// Catches placeholder drops, length overflow, and per-key cap violations.
// No AI calls, no API key required, no network. Runs in milliseconds.
// Exit code: 1 if any errors found, 0 if only warnings or clean.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { loadLocale } from '../../core/extractor.js';
import { lint, type LintIssue, type LintRules } from '../../core/linter.js';

export interface LintCommandOptions {
  source: string;
  target: string[];
  rules?: string;
  warningsAsErrors?: boolean;
}

async function loadRules(path: string | undefined): Promise<LintRules> {
  if (!path) return {};
  const raw = await readFile(resolve(path), 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('rules file must be a JSON object');
    }
    return parsed as LintRules;
  } catch (err) {
    throw new Error(
      `Failed to parse rules file ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

const KIND_LABEL: Record<LintIssue['kind'], string> = {
  'missing-placeholder': '[missing-placeholder]',
  'extra-placeholder':   '[extra-placeholder]',
  'length-overflow':     '[length-overflow]',
  'length-cap-exceeded': '[length-cap-exceeded]',
};

function formatIssue(i: LintIssue): string {
  const tag = KIND_LABEL[i.kind];
  const colour = i.severity === 'error' ? chalk.red : chalk.yellow;
  return `  ${colour(tag.padEnd(22))} ${chalk.bold(i.key)}\n` +
         `    ${chalk.dim('source:')} ${i.sourceValue}\n` +
         `    ${chalk.dim('target:')} ${i.targetValue}\n` +
         `    ${chalk.dim('why:')}    ${i.message}`;
}

export async function lintCommand(options: LintCommandOptions): Promise<number> {
  const sourcePath = resolve(options.source);
  const targetPaths = options.target.map((t) => resolve(t));

  console.log(chalk.bold('localization-assistant lint'));
  console.log(`  Source: ${sourcePath}`);
  console.log(`  Targets: ${targetPaths.length}`);
  if (options.rules) console.log(`  Rules: ${options.rules}`);
  console.log();

  const rules = await loadRules(options.rules);
  const source = await loadLocale(sourcePath);
  const targets = await Promise.all(targetPaths.map(loadLocale));

  const report = lint(source, targets, rules);

  let cleanCount = 0;
  for (const target of targets) {
    const issues = report.byLanguage[target.language] ?? [];
    if (issues.length === 0) {
      console.log(chalk.green(`✓ ${target.language}`) + chalk.dim(' — no issues'));
      cleanCount++;
      continue;
    }
    const errors = issues.filter((i) => i.severity === 'error').length;
    const warnings = issues.filter((i) => i.severity === 'warning').length;
    const summary = [
      errors ? chalk.red(`${errors} error${errors === 1 ? '' : 's'}`) : null,
      warnings ? chalk.yellow(`${warnings} warning${warnings === 1 ? '' : 's'}`) : null,
    ].filter(Boolean).join(', ');
    console.log(chalk.bold(`✗ ${target.language}`) + chalk.dim(' — ') + summary);
    for (const i of issues) console.log(formatIssue(i));
    console.log();
  }

  console.log(chalk.dim('---'));
  if (report.totalIssues === 0) {
    console.log(chalk.green.bold(`✓ Clean. All ${targets.length} target(s) pass.`));
    return 0;
  }
  console.log(
    chalk.bold(`Total: `) +
    (report.errorCount   ? chalk.red(`${report.errorCount} errors`) + ' ' : '') +
    (report.warningCount ? chalk.yellow(`${report.warningCount} warnings`) : ''),
  );
  console.log(chalk.dim(`(${cleanCount}/${targets.length} target(s) clean)`));

  const failOnWarnings = options.warningsAsErrors ?? false;
  if (report.errorCount > 0 || (failOnWarnings && report.warningCount > 0)) return 1;
  return 0;
}
