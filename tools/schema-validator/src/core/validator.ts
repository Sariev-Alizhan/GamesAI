// Top-level validator. Loads entities, finds references, builds registry,
// reports issues.

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
  const { entities, issues: loadIssues } = await loadEntitiesFromDirectory(root);
  return validate(entities, config, loadIssues);
}

export function validate(
  entities: Entity[],
  config: ValidatorConfig = {},
  preExistingIssues: Issue[] = [],
): ValidationResult {
  const issues: Issue[] = [...preExistingIssues];

  // Build registry by id, detecting duplicates.
  const byId = new Map<string, Entity>();
  for (const entity of entities) {
    const existing = byId.get(entity.id);
    if (existing) {
      issues.push({
        severity: 'error',
        category: 'duplicate-id',
        message: `Duplicate entity id "${entity.id}" — also defined at ${existing.path}`,
        path: entity.path,
      });
      // Keep the first one in the registry; the second is the "duplicate"
      // for purposes of reference resolution.
      continue;
    }
    byId.set(entity.id, entity);
  }

  // Collect every reference.
  const references: Reference[] = [];
  for (const entity of entities) {
    references.push(...findReferences(entity, config));
  }

  // Check each reference resolves.
  const incomingRefs = new Set<string>();
  for (const ref of references) {
    const target = byId.get(ref.referencedId);
    if (!target) {
      issues.push({
        severity: 'error',
        category: 'broken-reference',
        message: `Entity "${ref.fromId}" references "${ref.referencedId}" at ${ref.fieldPath}, but no entity with that id exists`,
        path: ref.fromPath,
        reference: ref,
      });
      continue;
    }
    if (ref.expectedType !== null && target.type !== ref.expectedType) {
      issues.push({
        severity: 'error',
        category: 'reference-type-mismatch',
        message: `Entity "${ref.fromId}" references "${ref.referencedId}" at ${ref.fieldPath}, expected type "${ref.expectedType}" but found "${target.type}"`,
        path: ref.fromPath,
        reference: ref,
      });
      continue;
    }
    incomingRefs.add(ref.referencedId);
  }

  // Orphan check: entities that nobody references.
  // (Many entities will legitimately be orphans — top-level levels, root
  // quests, player-spawn weapons. So this is a warning, opt-out by default.)
  if (!config.ignoreOrphans) {
    for (const entity of byId.values()) {
      if (!incomingRefs.has(entity.id)) {
        issues.push({
          severity: 'warning',
          category: 'orphan-entity',
          message: `Entity "${entity.id}" (${entity.type}) is not referenced by any other entity`,
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
