#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from './commands/generate.js';
import { listCommand } from './commands/list.js';
import { initCommand } from './commands/init.js';
import { schemaExportCommand } from './commands/schema-export.js';
import { watchCommand } from './commands/watch.js';
import { bootstrapCommand } from './commands/bootstrap.js';

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
  .option('-c, --config <file>', 'Use boilergen.config.yaml (overrides --plugin/--output)')
  .option('--dry-run', 'Preview output without writing files')
  .action(async (schema: string, options: { plugin: string; output: string; config?: string; dryRun?: boolean }) => {
    try {
      await generateCommand(schema, options);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('bootstrap')
  .description('One-shot scaffold: generate every schema in a plugin\'s schemas dir into one output dir (Flump-class project setup in 1 command)')
  .requiredOption('-p, --plugin <dir>', 'Plugin directory (e.g. plugins/unity-mobile-shooter)')
  .requiredOption('-o, --output <dir>', 'Output base directory (e.g. ~/Flump/Assets/_Project)')
  .option('-s, --schemas-dir <dir>', 'Schemas directory (defaults to ./schemas/<plugin-name>)')
  .option('--only <substrings>', 'Comma-separated substrings — only run schemas whose filename matches one')
  .option('--skip <substrings>', 'Comma-separated substrings — skip schemas whose filename matches one')
  .action(async (options: { plugin: string; output: string; schemasDir?: string; only?: string; skip?: string }) => {
    try {
      await bootstrapCommand(options);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('watch <schema-or-dir>')
  .description('Re-run generate on every YAML change (tight Unity/UE/Godot dev loop)')
  .option('-p, --plugin <dir>', 'Plugin directory', './plugins/gm1')
  .option('-o, --output <dir>', 'Output base directory', './test-output')
  .option('-c, --config <file>', 'Use boilergen.config.yaml (overrides --plugin/--output)')
  .action(async (target: string, options: { plugin: string; output: string; config?: string }) => {
    try {
      await watchCommand(target, options);
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
  .command('schema-export')
  .description('Print/save JSON Schema for YAML entity files (enables IDE autocomplete)')
  .option('-o, --output <file>', 'Write to file instead of stdout')
  .action(async (options: { output?: string }) => {
    try {
      await schemaExportCommand(options);
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
