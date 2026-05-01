#!/usr/bin/env node
import { loadSchema } from '../core/schema-loader.js';

const schemaPath = process.argv[2] ?? './schemas/gm1/dummy-profession.yaml';

try {
  const schema = await loadSchema(schemaPath);
  console.log('Loaded schema:');
  console.log(JSON.stringify(schema, null, 2));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
