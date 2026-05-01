import { resolve } from 'node:path';
import { loadSchema } from '../../core/schema-loader.js';
import { loadPlugin } from '../../core/plugin-loader.js';
import { loadConfig } from '../../core/config-loader.js';
import { generate } from '../../core/generator.js';

export interface GenerateCommandOptions {
  plugin: string;
  output: string;
  config?: string;
  dryRun?: boolean;
}

export async function generateCommand(
  schemaArg: string,
  options: GenerateCommandOptions,
): Promise<void> {
  const schemaPath = resolve(schemaArg);

  let pluginPath: string;
  let targetRoots: Record<string, string>;

  if (options.config) {
    const config = await loadConfig(options.config);
    console.log(`Loaded config: ${resolve(options.config)}`);
    pluginPath = config.plugin;
    targetRoots = config.targets;
  } else {
    pluginPath = resolve(options.plugin);
    targetRoots = {};
  }

  const schema = await loadSchema(schemaPath);
  console.log(`Loaded schema: ${schema.id} (${schema.type})`);

  const plugin = await loadPlugin(pluginPath);
  console.log(`Loaded plugin "${plugin.id}": ${plugin.templates.length} templates`);

  if (!options.config) {
    const outputPath = resolve(options.output);
    const matchingTargets = new Set(
      plugin.templates.filter((t) => t.entityType === schema.type).map((t) => t.target),
    );
    for (const target of matchingTargets) {
      targetRoots[target] = resolve(outputPath, target);
    }
  }

  const dryRun = options.dryRun ?? false;
  const result = await generate({ schema, plugin, targetRoots, dryRun });

  console.log(
    `Matched ${result.matchedTemplates}/${result.totalTemplates} templates for entity type "${schema.type}"`,
  );

  const verb = dryRun ? 'Would generate' : 'Generated';
  const tag = dryRun ? '[DRY]' : '[OK]';
  console.log(`${verb} ${result.filesCreated.length} files:`);
  for (const f of result.filesCreated) {
    console.log(`  ${tag} ${f}`);
  }

  if (result.filesInjected.length > 0) {
    const verbI = dryRun ? 'Would inject into' : 'Injected into';
    const tagI = dryRun ? '[DRY-INJECT]' : '[INJECT]';
    console.log(`${verbI} ${result.filesInjected.length} files:`);
    for (const f of result.filesInjected) {
      console.log(`  ${tagI} ${f}`);
    }
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
