#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from './commands/generate.js';

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
  .action(async (schema: string, options: { plugin: string; output: string }) => {
    try {
      await generateCommand(schema, options);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
