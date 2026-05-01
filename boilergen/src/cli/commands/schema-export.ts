import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { SchemaZod } from '../../core/schema-loader.js';

export interface SchemaExportCommandOptions {
  output?: string;
}

export async function schemaExportCommand(
  options: SchemaExportCommandOptions,
): Promise<void> {
  const jsonSchema = z.toJSONSchema(SchemaZod);
  const output = JSON.stringify(jsonSchema, null, 2);

  if (options.output) {
    const outputPath = resolve(options.output);
    await writeFile(outputPath, output + '\n', 'utf-8');
    console.log(`JSON Schema written to ${outputPath}`);
    console.log('');
    console.log('To get autocomplete in VS Code, add this header to your YAML files:');
    console.log(`  # yaml-language-server: $schema=${options.output}`);
  } else {
    console.log(output);
  }
}
