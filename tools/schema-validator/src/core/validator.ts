// Top-level validator. Loads entities, finds references, builds registry,
// reports issues.
//
// Namespace handling:
//   - When config.namespaceByDirectory is true, entities are keyed by
//     `${namespace}:${id}`. References resolve same-namespace first; users
//     can disambiguate cross-namespace by writing the value as "ns:id".
//   - When false (default), the whole tree shares one namespace; equivalent
//     to keying by id alone.

import { loadEntitiesFromDirectory } from './loader.js';
import { findReferences } from './reference-finder.js';
import type {
  Entity,
  Issue,
  Reference,
  ValidationResult,
  ValidatorConfig,
} from './types.js';

export async function validateDirectory(
  root: string,
  config: ValidatorConfig = {},
): Promise<ValidationResult> {
  const namespaceByDirectory = config.namespaceByDirectory === true;
  const { entities, issues: loadIssues } = await loadEntitiesFromDirectory(root, {
    namespaceByDirectory,
  });
  return validate(entities, config, loadIssues);
}

/** Compose a registry key: "namespace:id" or just "id" when namespace is empty. */
function entityKey(namespace: string, id: string): string {
  return namespace === '' ? id : `${namespace}:${id}`;
}

/**
 * Resolve a reference id. If the value is "ns:id", look up that exact key.
 * Otherwise, prefer same-namespace, fall back to global (empty namespace).
 */
function resolveReference(
  byKey: Map<string, Entity>,
  fromNamespace: string,
  referencedId: string,
): { key: string; entity: Entity } | null {
  // Explicit cross-namespace form
  if (referencedId.includes(':')) {
    const e = byKey.get(referencedId);
    return e ? { key: referencedId, entity: e } : null;
  }
  // Same-namespace
  if (fromNamespace !== '') {
    const sameNs = byKey.get(`${fromNamespace}:${referencedId}`);
    if (sameNs) return { key: `${fromNamespace}:${referencedId}`, entity: sameNs };
  }
  // Global namespace
  const global = byKey.get(referencedId);
  if (global) return { key: referencedId, entity: global };
  return null;
}

export function validate(
  entities: Entity[],
  config: ValidatorConfig = {},
  preExistingIssues: Issue[] = [],
): ValidationResult {
  const issues: Issue[] = [...preExistingIssues];

  // Build registry by composite key, detecting duplicates within the same namespace.
  const byKey = new Map<string, Entity>();
  for (const entity of entities) {
    const key = entityKey(entity.namespace, entity.id);
    const existing = byKey.get(key);
    if (existing) {
      const ns = entity.namespace ? ` (in namespace "${entity.namespace}")` : '';
      issues.push({
        severity: 'error',
        category: 'duplicate-id',
        message: `Duplicate entity id "${entity.id}"${ns} — also defined at ${existing.path}`,
        path: entity.path,
      });
      continue;
    }
    byKey.set(key, entity);
  }

  // Collect every reference.
  const references: Reference[] = [];
  for (const entity of entities) {
    references.push(...findReferences(entity, config));
  }

  // Check each reference resolves.
  const incomingRefs = new Set<string>();
  for (const ref of references) {
    const resolved = resolveReference(byKey, ref.fromNamespace, ref.referencedId);
    if (!resolved) {
      issues.push({
        severity: 'error',
        category: 'broken-reference',
        message: `Entity "${ref.fromId}" references "${ref.referencedId}" at ${ref.fieldPath}, but no entity with that id exists`,
        path: ref.fromPath,
        reference: ref,
      });
      continue;
    }
    if (ref.expectedType !== null && resolved.entity.type !== ref.expectedType) {
      issues.push({
        severity: 'error',
        category: 'reference-type-mismatch',
        message: `Entity "${ref.fromId}" references "${ref.referencedId}" at ${ref.fieldPath}, expected type "${ref.expectedType}" but found "${resolved.entity.type}"`,
        path: ref.fromPath,
        reference: ref,
      });
      continue;
    }
    incomingRefs.add(resolved.key);
  }

  // Orphan check.
  if (!config.ignoreOrphans) {
    for (const [key, entity] of byKey) {
      if (!incomingRefs.has(key)) {
        const ns = entity.namespace ? ` (${entity.namespace})` : '';
        issues.push({
          severity: 'warning',
          category: 'orphan-entity',
          message: `Entity "${entity.id}"${ns} (${entity.type}) is not referenced by any other entity`,
          path: entity.path,
        });
      }
    }
  }

  const byType: Record<string, number> = {};
  for (const e of entities) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  }

  const stats = {
    totalEntities: entities.length,
    totalReferences: references.length,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    byType,
  };

  return { entities, references, issues, stats };
}
