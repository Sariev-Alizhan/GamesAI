// Core types for the Schema Validator.
//
// We model game data as a registry of entities (each with id + type) and
// cross-references between them. A reference is "field X in entity A
// claims to point at an entity of type Y with id Z" — and our job is to
// confirm that entity Z actually exists.

export interface Entity {
  /** Source file path */
  path: string;
  /** Required: entity id (snake_case) */
  id: string;
  /** Required: entity type (e.g. weapon, enemy, item, profession) */
  type: string;
  /** Required: human-readable name */
  name: string;
  /** Free-form data */
  data: Record<string, unknown>;
}

export interface Reference {
  /** Which entity contains the reference */
  fromId: string;
  fromType: string;
  fromPath: string;
  /** Where in the entity (dotted path through .data, e.g. "data.dropTable[0]") */
  fieldPath: string;
  /** The id-like string that was found */
  referencedId: string;
  /** Optional: type hint for what this reference should resolve to.
   *  Comes from the validator config; null if we're inferring. */
  expectedType: string | null;
}

export type IssueSeverity = 'error' | 'warning';

export interface Issue {
  severity: IssueSeverity;
  category:
    | 'duplicate-id'
    | 'broken-reference'
    | 'orphan-entity'
    | 'invalid-schema'
    | 'reference-type-mismatch';
  message: string;
  path: string;
  /** For broken-reference issues: the entity and field involved */
  reference?: Reference;
}

export interface ValidatorConfig {
  /**
   * Explicit reference field mapping.
   *
   * Example:
   *   referenceFields:
   *     dropTable:    item
   *     lootTable:    item
   *     enemyPool:    enemy
   *     itemPool:     item
   *     nextLevel:    level
   *     prerequisiteQuestId: quest
   *
   * Field name → entity type the values should resolve to.
   * Validator will only treat exact-field-name matches as references.
   * If empty, falls back to heuristic detection.
   */
  referenceFields?: Record<string, string>;

  /**
   * Heuristic detection: any field name matching these suffixes is treated
   * as a reference field even without explicit config. Defaults to true.
   * Suffixes: Id, Pool, Table, Refs (case-insensitive).
   */
  useHeuristics?: boolean;

  /**
   * Suppress warnings for orphan entities (no incoming references).
   * Some entities are reached at runtime by other means (e.g. via player
   * input or quest scripts) and won't have schema-level incoming refs.
   */
  ignoreOrphans?: boolean;

  /**
   * String values that look like ids but are known to be category labels
   * or enum values, not foreign-key references. Skip them during
   * heuristic detection.
   */
  knownEnums?: string[];
}

export interface ValidationResult {
  entities: Entity[];
  references: Reference[];
  issues: Issue[];
  /** Quick stats for CLI output */
  stats: {
    totalEntities: number;
    totalReferences: number;
    errors: number;
    warnings: number;
    byType: Record<string, number>;
  };
}
