import { watch as fsWatch, statSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { generateCommand } from './generate.js';

interface WatchOptions {
  plugin: string;
  output: string;
  config?: string;
}

/**
 * Watch a YAML schema file (or a directory of them) and re-run `generate`
 * on every change. Designed for tight schema-edit → game-test loops:
 * edit your weapon YAML in VS Code, the .cs / .asset / .locale.json
 * files refresh in your Unity project's Assets/, hit Play.
 *
 * Uses Node's built-in `fs.watch` — no external dependency. Debounced
 * 250ms because most editors fire 2-3 events per save (atomic-rename
 * pattern).
 */
export async function watchCommand(target: string, options: WatchOptions): Promise<void> {
  const absolute = resolve(target);
  let isDir = false;
  try {
    isDir = statSync(absolute).isDirectory();
  } catch {
    console.error(chalk.red(`✗ Cannot read: ${absolute}`));
    process.exit(1);
  }

  console.log(chalk.bold(`\nboilergen watch — ${isDir ? 'directory' : 'file'}: ${chalk.cyan(absolute)}`));
  console.log(chalk.dim(`  plugin:  ${options.plugin}`));
  console.log(chalk.dim(`  output:  ${options.output}`));
  console.log(chalk.dim('  Ctrl+C to stop\n'));

  // Initial run
  await runOnce(absolute, options, /*initial*/ true);

  // Debounced re-run
  let timer: NodeJS.Timeout | null = null;
  let inFlight = false;
  const queue: Set<string> = new Set();

  function schedule(filename: string) {
    queue.add(filename);
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      timer = null;
      const files = Array.from(queue);
      queue.clear();
      if (inFlight) {
        // collapse — re-fire after current run finishes
        for (const f of files) queue.add(f);
        return;
      }
      inFlight = true;
      try {
        for (const f of files) {
          if (isDir) {
            const fullPath = resolve(absolute, f);
            await runOnce(fullPath, options, false);
          } else {
            await runOnce(absolute, options, false);
            break; // single-file: only run once
          }
        }
      } finally {
        inFlight = false;
        if (queue.size > 0) {
          // changes happened during the run — re-schedule
          schedule('queued');
        }
      }
    }, 250);
  }

  // Built-in watcher; recursive on macOS/Windows, no recursion on Linux
  // (which is fine — the dir-level events still fire for top-level files).
  const watcher = fsWatch(absolute, { recursive: isDir }, (_event, filename) => {
    if (!filename) return;
    // Only react to .yaml / .yml changes, ignore editor swap files
    if (!/\.(ya?ml)$/i.test(filename)) return;
    if (filename.startsWith('.')) return;
    schedule(filename);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.dim('\n\nstopped.'));
    watcher.close();
    process.exit(0);
  });
}

async function runOnce(schemaPath: string, options: WatchOptions, initial: boolean): Promise<void> {
  const ts = new Date().toLocaleTimeString();
  const tag = initial ? chalk.cyan('[init]') : chalk.yellow('[regen]');
  console.log(`${chalk.dim(ts)} ${tag} ${schemaPath}`);
  try {
    // exactOptionalPropertyTypes: only include config when defined
    const genOpts: { plugin: string; output: string; config?: string } = {
      plugin: options.plugin,
      output: options.output,
    };
    if (options.config !== undefined) genOpts.config = options.config;
    await generateCommand(schemaPath, genOpts);
    console.log(chalk.green('  ✓ done\n'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.red(`  ✗ ${msg}\n`));
  }
}
