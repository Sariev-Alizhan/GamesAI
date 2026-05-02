#!/usr/bin/env node
import { Command } from 'commander';
import { fillCommand } from './commands/fill.js';
import { lintCommand } from './commands/lint.js';

const program = new Command();

program
  .name('localization-assistant')
  .description('Localization linter + AI-powered fill for game development. Static checks (placeholder parity, length overflow) run before any AI; AI translates only what passes.')
  .version('0.2.0');

program
  .command('lint')
  .description('Deterministic checks on existing translations: placeholder parity, length overflow, per-key caps. No AI, no API key required.')
  .requiredOption('-s, --source <file>', 'Source locale file (e.g. en.json)')
  .requiredOption('-t, --target <file...>', 'One or more target locale files (e.g. ru.json kk.json)')
  .option('-r, --rules <file>', 'Path to a JSON rules file (maxLengthRatio, maxLengthByKey, severity overrides)')
  .option('--warnings-as-errors', 'Exit non-zero on warnings as well as errors')
  .action(async (options: { source: string; target: string[]; rules?: string; warningsAsErrors?: boolean }) => {
    try {
      const code = await lintCommand(options);
      process.exit(code);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('fill')
  .description('Fill missing keys in target locales using AI translation')
  .requiredOption('-s, --source <file>', 'Source locale file (e.g. en.json)')
  .requiredOption('-t, --target <file...>', 'One or more target locale files (e.g. ru.json kk.json)')
  .option('-c, --context <text>', 'Game context to improve translation quality (e.g. "fantasy RPG with medieval tone"). Anthropic only.')
  .option('-g, --glossary <file>', 'Path to a glossary JSON for consistent terminology (future)')
  .option('-p, --provider <name>', 'Translation provider: "anthropic" (default) or "deepl" (Pro key required)', 'anthropic')
  .option('--dry-run', 'Show what would be translated without calling AI or writing files')
  .action(async (options: {
    source: string;
    target: string[];
    context?: string;
    glossary?: string;
    provider?: string;
    dryRun?: boolean;
  }) => {
    try {
      const provider = options.provider === 'deepl' ? 'deepl' : 'anthropic';
      await fillCommand({ ...options, provider });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
