// `localization-assistant fill` — the main command.
//
// Reads a source locale, reads each target locale, finds missing keys
// in each target, batches them through the AI translator, merges results
// back, writes target files in their original layout.

import { resolve } from 'node:path';
import chalk from 'chalk';
import { diffLocales, loadLocale } from '../../core/extractor.js';
import { translateBatch } from '../../core/translator.js';
import { mergeTranslations, writeLocale } from '../../core/writer.js';
import type { Locale, Translation } from '../../core/types.js';

export interface FillCommandOptions {
  source: string;
  target: string[];
  context?: string;
  dryRun?: boolean;
  glossary?: string;
  provider?: 'anthropic' | 'deepl';
}

export async function fillCommand(options: FillCommandOptions): Promise<void> {
  const sourcePath = resolve(options.source);
  const targetPaths = options.target.map((t) => resolve(t));

  console.log(chalk.bold(`localization-assistant fill`));
  console.log(`  Source: ${sourcePath}`);
  console.log(`  Targets: ${targetPaths.length}\n`);

  const source = await loadLocale(sourcePath);
  console.log(chalk.dim(`Source: ${source.language} · ${Object.keys(source.entries).length} keys · ${source.layout} layout`));

  const targets: Locale[] = [];
  for (const tp of targetPaths) {
    try {
      const t = await loadLocale(tp);
      targets.push(t);
      console.log(chalk.dim(`Target: ${t.language} · ${Object.keys(t.entries).length} keys · ${t.layout} layout`));
    } catch (err) {
      console.error(chalk.red(`  [ERR] ${tp}: ${err instanceof Error ? err.message : String(err)}`));
    }
  }
  console.log();

  // Collect every missing key across every target into a single batch.
  const allMissing = targets.flatMap((t) => diffLocales(source, t));
  if (allMissing.length === 0) {
    console.log(chalk.green('✓ All target locales are complete. Nothing to translate.'));
    return;
  }
  console.log(chalk.yellow(`Need to translate ${allMissing.length} keys across ${targets.length} target(s).`));

  if (options.dryRun) {
    console.log(chalk.dim('\n--dry-run — no AI calls, no file writes. Missing keys per target:'));
    for (const t of targets) {
      const m = diffLocales(source, t);
      console.log(`  ${chalk.cyan(t.language)}: ${m.length} missing`);
      for (const k of m.slice(0, 5)) {
        console.log(chalk.dim(`    - ${k.key} (${k.sourceValue.slice(0, 40)}${k.sourceValue.length > 40 ? '…' : ''})`));
      }
      if (m.length > 5) console.log(chalk.dim(`    … and ${m.length - 5} more`));
    }
    return;
  }

  const provider = options.provider ?? 'anthropic';
  const requiredEnvVar = provider === 'deepl' ? 'DEEPL_API_KEY' : 'ANTHROPIC_API_KEY';
  if (!process.env[requiredEnvVar]) {
    console.error(chalk.red(`\n✗ ${requiredEnvVar} environment variable is not set.`));
    console.error(chalk.dim(
      provider === 'deepl'
        ? 'Get a Pro key at https://www.deepl.com/pro-api  (Free tier is not supported — TOS)'
        : 'Get one at https://console.anthropic.com/settings/keys',
    ));
    process.exit(1);
  }

  const providerLabel = provider === 'deepl' ? 'DeepL Pro' : 'Claude';
  console.log(chalk.dim(`\nCalling ${providerLabel} (one batch per target language)...`));
  const translateOpts: {
    provider: 'anthropic' | 'deepl';
    gameContext?: string;
    glossary?: Record<string, Record<string, string>>;
  } = { provider };
  if (options.context) translateOpts.gameContext = options.context;
  if (provider === 'deepl' && options.context) {
    console.warn(chalk.yellow(
      '⚠ --context is supported only by the Anthropic provider; DeepL ignores it.',
    ));
  }
  // glossary loading via --glossary path is a future enhancement; for now no-op.
  const translations = await translateBatch(allMissing, source.language, translateOpts);
  console.log(chalk.green(`✓ Got ${translations.length} translations.\n`));

  // Merge each target's translations and write.
  for (const t of targets) {
    const targetTranslations: Translation[] = translations.filter((tr) => tr.language === t.language);
    const merge = mergeTranslations(t, source.entries, targetTranslations);
    const updated: Locale = { ...t, entries: merge.entries };
    const targetPath = targetPaths[targets.indexOf(t)]!;
    await writeLocale(targetPath, updated);
    console.log(chalk.green(`  ✓ ${t.language}`) + chalk.dim(` — ${merge.updated} updated, ${merge.preserved} preserved → ${targetPath}`));
  }

  console.log(chalk.bold.green(`\n✓ Done. ${allMissing.length} translations written across ${targets.length} files.`));
}
