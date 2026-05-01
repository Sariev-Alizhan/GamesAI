#!/usr/bin/env node
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Command } from 'commander';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { validateDirectory } from '../core/validator.js';
import type { Issue, ValidatorConfig } from '../core/types.js';

const program = new Command();

program
  .name('schema-validator')
  .description('Cross-reference validator for game data schemas. Catches typos in id-references before runtime.')
  .version('0.1.0');

program
  .command('check')
  .description('Validate every YAML schema in a directory')
  .argument('<dir>', 'Directory of schemas (recursive)')
  .option('-c, --config <file>', 'Path to validator config YAML (referenceFields, knownEnums, etc.)')
  .option('--ignore-orphans', 'Suppress orphan-entity warnings')
  .option('--no-heuristics', 'Disable suffix-based reference detection (use only explicit config)')
  .option('--json', 'Emit JSON output instead of human-readable')
  .action(async (dir: string, options: { config?: string; ignoreOrphans?: boolean; heuristics?: boolean; json?: boolean }) => {
    try {
      const config = await loadConfig(options.config);
      if (options.ignoreOrphans !== undefined) config.ignoreOrphans = options.ignoreOrphans;
      if (options.heuristics === false) config.useHeuristics = false;

      const result = await validateDirectory(resolve(dir), config);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.stats.errors > 0 ? 1 : 0);
      }

      printHumanReport(result.issues, result.stats);
      process.exit(result.stats.errors > 0 ? 1 : 0);
    } catch (err) {
      console.error(chalk.red('✗ ' + (err instanceof Error ? err.message : String(err))));
      process.exit(2);
    }
  });

program.parse();

async function loadConfig(path: string | undefined): Promise<ValidatorConfig> {
  if (!path) return {};
  const raw = await readFile(resolve(path), 'utf-8');
  const parsed = yaml.load(raw);
  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Config file must be a YAML object');
  }
  return parsed as ValidatorConfig;
}

function printHumanReport(issues: Issue[], stats: { totalEntities: number; totalReferences: number; errors: number; warnings: number; byType: Record<string, number> }): void {
  console.log(chalk.bold('schema-validator'));
  console.log();

  // Stats line
  const typeBreakdown = Object.entries(stats.byType)
    .sort()
    .map(([t, n]) => `${t}: ${n}`)
    .join(', ');
  console.log(chalk.dim(`Loaded ${stats.totalEntities} entities (${typeBreakdown})`));
  console.log(chalk.dim(`Found ${stats.totalReferences} cross-references`));
  console.log();

  if (issues.length === 0) {
    console.log(chalk.green('✓ All schemas valid. No issues found.'));
    return;
  }

  // Group by category for readability.
  const byCategory = new Map<string, Issue[]>();
  for (const issue of issues) {
    const list = byCategory.get(issue.category) ?? [];
    list.push(issue);
    byCategory.set(issue.category, list);
  }

  for (const [category, list] of byCategory) {
    const heading = formatCategory(category, list.length);
    console.log(heading);
    for (const issue of list) {
      const prefix = issue.severity === 'error' ? chalk.red('  ✗') : chalk.yellow('  ⚠');
      console.log(`${prefix} ${issue.message}`);
      console.log(chalk.dim(`     at ${issue.path}`));
    }
    console.log();
  }

  const summary = `${stats.errors} error(s), ${stats.warnings} warning(s)`;
  if (stats.errors > 0) {
    console.log(chalk.bold.red(`✗ ${summary}`));
  } else {
    console.log(chalk.bold.yellow(`⚠ ${summary}`));
  }
}

function formatCategory(category: string, count: number): string {
  const label = category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return chalk.bold(`${label} (${count})`);
}
