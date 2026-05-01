#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from './commands/generate.js';
import { listCommand } from './commands/list.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('boilergen')
  .description('Code generator: YAML entity → boilerplate code across stack layers')
  .version('1.0.0');

program
  .command('generate <schema>')
  .description('Generate code from a YAML entity schema')
  .option('-p, --plugin <dir>', 'Plugin directory', './plugins/gm1')
  .option('-o, --output <dir>', 'Output base directory', './test-output')
  .option('--dry-run', 'Preview output without writing files')
  .action(async (schema: string, options: { plugin: string; output: string; dryRun?: boolean }) => {
    try {
      await generateCommand(schema, options);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available plugins')
  .option('-p, --plugins <dir>', 'Plugins directory', './plugins')
  .action(async (options: { plugins: string }) => {
    try {
      await listCommand(options);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create boilergen.config.yaml for a target project')
  .option('-p, --plugin <dir>', 'Plugin directory to base config on', './plugins/gm1')
  .option('-o, --output <file>', 'Output config file path', './boilergen.config.yaml')
  .option('-f, --force', 'Overwrite existing config file')
  .action(async (options: { plugin: string; output: string; force?: boolean }) => {
    try {
      await initCommand(options);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
