// Walks a directory recursively, parses every .yaml/.yml file, returns
// a flat list of Entity objects. Schemas that don't have the required
// shape (id/type/name/data) become invalid-schema issues but don't block
// the rest of the run.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import yaml from 'js-yaml';
import type { Entity, Issue } from './types.js';

/**
 * Derive a namespace from a file path relative to the schemas root.
 * The first directory segment under root becomes the namespace.
 * If the file is directly in root (no subdirectory), namespace is "".
 *
 * Examples (root = /project/schemas):
 *   /project/schemas/godot/slime.yaml         → "godot"
 *   /project/schemas/unity/quests/main.yaml   → "unity"
 *   /project/schemas/loose-file.yaml          → ""
 */
export function namespaceFromPath(filePath: string, root: string): string {
  const rel = relative(root, filePath);
  const segments = rel.split(sep);
  if (segments.length <= 1) return '';
  return segments[0]!;
}

export interface LoadResult {
  entities: Entity[];
  issues: Issue[];
}

async function findYamlFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      // Skip hidden / build / dependency folders.
      if (name.startsWith('.') || name === 'node_modules' || name === 'dist') continue;
      const full = join(dir, name);
      let st;
      try {
        st = await stat(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        await walk(full);
      } else if (name.endsWith('.yaml') || name.endsWith('.yml')) {
        out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export async function loadEntitiesFromDirectory(
  root: string,
  options: { namespaceByDirectory?: boolean } = {},
): Promise<LoadResult> {
  const files = await findYamlFiles(root);
  const entities: Entity[] = [];
  const issues: Issue[] = [];
  const useNamespaces = options.namespaceByDirectory === true;

  for (const path of files) {
    let raw: string;
    try {
      raw = await readFile(path, 'utf-8');
    } catch (err) {
      issues.push({
        severity: 'error',
        category: 'invalid-schema',
        message: `Cannot read file: ${err instanceof Error ? err.message : String(err)}`,
        path,
      });
      continue;
    }

    let parsed: unknown;
    try {
      parsed = yaml.load(raw);
    } catch (err) {
      issues.push({
        severity: 'error',
        category: 'invalid-schema',
        message: `Invalid YAML: ${err instanceof Error ? err.message : String(err)}`,
        path,
      });
      continue;
    }

    if (!isPlainObject(parsed)) {
      issues.push({
        severity: 'error',
        category: 'invalid-schema',
        message: `Schema must be an object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`,
        path,
      });
      continue;
    }

    const id = parsed['id'];
    const type = parsed['type'];
    const name = parsed['name'];
    const data = parsed['data'] ?? {};

    if (typeof id !== 'string' || !id) {
      issues.push({
        severity: 'error',
        category: 'invalid-schema',
        message: `Missing or invalid "id" (must be non-empty string)`,
        path,
      });
      continue;
    }
    if (typeof type !== 'string' || !type) {
      issues.push({
        severity: 'error',
        category: 'invalid-schema',
        message: `Missing or invalid "type" (must be non-empty string) in entity "${id}"`,
        path,
      });
      continue;
    }
    if (typeof name !== 'string' || !name) {
      issues.push({
        severity: 'warning',
        category: 'invalid-schema',
        message: `Missing or invalid "name" in entity "${id}" — using id as fallback`,
        path,
      });
    }
    if (!isPlainObject(data)) {
      issues.push({
        severity: 'error',
        category: 'invalid-schema',
        message: `"data" must be an object in entity "${id}"`,
        path,
      });
      continue;
    }

    entities.push({
      path,
      id,
      type,
      name: typeof name === 'string' ? name : id,
      data,
      namespace: useNamespaces ? namespaceFromPath(path, root) : '',
    });
  }

  return { entities, issues };
}
