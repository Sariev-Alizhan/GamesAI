#!/usr/bin/env node
import { Command } from 'commander';
import { fillCommand } from './commands/fill.js';

const program = new Command();

program
  .name('localization-assistant')
  .description('AI-powered locale file filler for game development. Reads source-language JSON, finds missing keys in target locales, generates translations via Claude.')
  .version('0.1.0');

program
  .command('fill')
  .description('Fill missing keys in target locales using AI translation')
  .requiredOption('-s, --source <file>', 'Source locale file (e.g. en.json)')
  .requiredOption('-t, --target <file...>', 'One or more target locale files (e.g. ru.json kk.json)')
  .option('-c, --context <text>', 'Game context to improve translation quality (e.g. "fantasy RPG with medieval tone")')
  .option('-g, --glossary <file>', 'Path to a glossary JSON for consistent terminology (future)')
  .option('--dry-run', 'Show what would be translated without calling AI or writing files')
  .action(async (options: { source: string; target: string[]; context?: string; glossary?: string; dryRun?: boolean }) => {
    try {
      await fillCommand(options);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
