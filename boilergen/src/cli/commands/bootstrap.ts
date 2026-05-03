import { readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import chalk from 'chalk';
import { generateCommand } from './generate.js';

interface BootstrapOptions {
  plugin: string;
  output: string;
  schemasDir?: string;
  only?: string;     // comma-separated substrings to filter on
  skip?: string;     // comma-separated substrings to skip
}

/**
 * One-shot project scaffold: loop through every YAML in a schemas directory
 * and run `generate` for each. Designed for the Flump-night-session use
 * case where you want a ready-to-Play project in one command instead of
 * 22 boilergen invocations.
 *
 * Default schemas dir = ./schemas/<plugin-id> relative to CWD if not given.
 *
 * Examples:
 *   boilergen bootstrap --plugin unity-mobile-shooter --output ~/Flump/Assets/_Project
 *   boilergen bootstrap --plugin unity-mobile-shooter --output . --only weapon,loadout
 *   boilergen bootstrap --plugin unity-mobile-shooter --output . --skip project-init
 */
export async function bootstrapCommand(options: BootstrapOptions): Promise<void> {
  const pluginPath = resolve(options.plugin);
  const outputPath = resolve(options.output);

  // schemasDir defaults to <cwd>/schemas/<basename of plugin>
  const pluginName = options.plugin.replace(/\/$/, '').split('/').pop() ?? '';
  const schemasDir = options.schemasDir
    ? resolve(options.schemasDir)
    : resolve(process.cwd(), 'schemas', pluginName);

  console.log(chalk.bold(`\nboilergen bootstrap`));
  console.log(chalk.dim(`  plugin:   ${pluginPath}`));
  console.log(chalk.dim(`  schemas:  ${schemasDir}`));
  console.log(chalk.dim(`  output:   ${outputPath}\n`));

  let yamlFiles: string[];
  try {
    yamlFiles = (await readdir(schemasDir))
      .filter(f => /\.ya?ml$/i.test(f))
      .filter(f => f !== 'validator.config.yaml')
      .sort();
  } catch {
    console.error(chalk.red(`✗ Schemas dir not found: ${schemasDir}`));
    process.exit(1);
  }

  // Apply --only / --skip filters
  if (options.only) {
    const needles = options.only.split(',').map(s => s.trim()).filter(Boolean);
    yamlFiles = yamlFiles.filter(f => needles.some(n => f.includes(n)));
  }
  if (options.skip) {
    const skips = options.skip.split(',').map(s => s.trim()).filter(Boolean);
    yamlFiles = yamlFiles.filter(f => !skips.some(n => f.includes(n)));
  }

  if (yamlFiles.length === 0) {
    console.log(chalk.yellow('No YAML schemas matched the filter.'));
    return;
  }

  console.log(chalk.cyan(`Generating ${yamlFiles.length} entities…\n`));

  let ok = 0;
  let failed = 0;
  const results: Array<{ schema: string; status: 'ok' | 'fail'; error?: string }> = [];

  for (const f of yamlFiles) {
    const schemaPath = join(schemasDir, f);
    const tag = chalk.dim(`[${(yamlFiles.indexOf(f) + 1).toString().padStart(2)}/${yamlFiles.length}]`);
    process.stdout.write(`${tag} ${f.padEnd(40)} `);
    try {
      // Suppress generate's own output by capturing console.log
      const origLog = console.log;
      console.log = () => { /* swallow */ };
      try {
        await generateCommand(schemaPath, { plugin: pluginPath, output: outputPath });
      } finally {
        console.log = origLog;
      }
      console.log(chalk.green('✓'));
      ok++;
      results.push({ schema: f, status: 'ok' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`✗  ${msg}`));
      failed++;
      results.push({ schema: f, status: 'fail', error: msg });
    }
  }

  console.log('');
  console.log(chalk.bold(`Done — ${chalk.green(ok)} ok, ${chalk.red(failed)} failed`));
  console.log(chalk.dim(`Output written to: ${outputPath}`));

  if (failed > 0) {
    console.log('\nFailures:');
    for (const r of results.filter(r => r.status === 'fail')) {
      console.log(`  ${chalk.red('✗')} ${r.schema} — ${r.error}`);
    }
    process.exit(1);
  }
}

/** Programmatic API used by the MCP tool (returns structured result, no console output). */
export async function bootstrapProgrammatic(options: BootstrapOptions): Promise<{
  schemasDir: string;
  outputDir: string;
  total: number;
  ok: number;
  failed: number;
  results: Array<{ schema: string; status: 'ok' | 'fail'; error?: string }>;
}> {
  const pluginPath = resolve(options.plugin);
  const outputPath = resolve(options.output);
  const pluginName = options.plugin.replace(/\/$/, '').split('/').pop() ?? '';
  const schemasDir = options.schemasDir
    ? resolve(options.schemasDir)
    : resolve(process.cwd(), 'schemas', pluginName);

  let yamlFiles: string[];
  try {
    yamlFiles = (await readdir(schemasDir))
      .filter(f => /\.ya?ml$/i.test(f))
      .filter(f => f !== 'validator.config.yaml')
      .sort();
  } catch {
    return { schemasDir, outputDir: outputPath, total: 0, ok: 0, failed: 1, results: [{ schema: '<dir>', status: 'fail', error: `Schemas dir not found: ${schemasDir}` }] };
  }

  if (options.only) {
    const needles = options.only.split(',').map(s => s.trim()).filter(Boolean);
    yamlFiles = yamlFiles.filter(f => needles.some(n => f.includes(n)));
  }
  if (options.skip) {
    const skips = options.skip.split(',').map(s => s.trim()).filter(Boolean);
    yamlFiles = yamlFiles.filter(f => !skips.some(n => f.includes(n)));
  }

  const results: Array<{ schema: string; status: 'ok' | 'fail'; error?: string }> = [];
  let ok = 0, failed = 0;
  for (const f of yamlFiles) {
    try {
      const origLog = console.log;
      console.log = () => { /* swallow */ };
      try {
        await generateCommand(join(schemasDir, f), { plugin: pluginPath, output: outputPath });
      } finally {
        console.log = origLog;
      }
      ok++;
      results.push({ schema: f, status: 'ok' });
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ schema: f, status: 'fail', error: msg });
    }
  }

  return { schemasDir, outputDir: outputPath, total: yamlFiles.length, ok, failed, results };
}

// Suppress unused-import warning
void readFile;
