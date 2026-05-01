import { resolve } from 'node:path';
import { loadSchema } from '../../core/schema-loader.js';
import { loadPlugin } from '../../core/plugin-loader.js';
import { generate } from '../../core/generator.js';

export interface GenerateCommandOptions {
  plugin: string;
  output: string;
}

export async function generateCommand(
  schemaArg: string,
  options: GenerateCommandOptions,
): Promise<void> {
  const schemaPath = resolve(schemaArg);
  const pluginPath = resolve(options.plugin);
  const outputPath = resolve(options.output);

  const schema = await loadSchema(schemaPath);
  console.log(`Loaded schema: ${schema.id} (${schema.type})`);

  const plugin = await loadPlugin(pluginPath);
  console.log(`Loaded plugin "${plugin.id}": ${plugin.templates.length} templates`);

  const targetRoots: Record<string, string> = {};
  for (const tpl of plugin.templates) {
    if (!(tpl.target in targetRoots)) {
      targetRoots[tpl.target] = resolve(outputPath, tpl.target);
    }
  }

  const result = await generate({ schema, plugin, targetRoots });

  console.log(`Generated ${result.filesCreated.length} files:`);
  for (const f of result.filesCreated) {
    console.log(`  [OK] ${f}`);
  }

  if (result.filesSkipped.length > 0) {
    console.log(`Skipped ${result.filesSkipped.length} templates:`);
    for (const s of result.filesSkipped) {
      console.log(`  [SKIP] ${s.template} (${s.reason})`);
    }
  }

  if (result.errors.length > 0) {
    console.log(`Errors (${result.errors.length}):`);
    for (const e of result.errors) {
      console.log(`  [ERR] ${e.template}: ${e.message}`);
    }
    process.exit(1);
  }
}
