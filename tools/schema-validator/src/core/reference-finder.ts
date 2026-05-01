// Walks an entity's `data` object and identifies which fields hold
// cross-references to other entities.
//
// Detection strategy (in priority order):
//
//   1. Explicit config — if `referenceFields` map says "field X → type Y",
//      every value at field X is a reference to an entity of type Y.
//
//   2. Heuristic — field names ending in Id / Pool / Table / Refs are
//      treated as references with no type constraint (we just check
//      that *something* by that id exists). Toggle via useHeuristics.
//
// Reference *values* must be:
//   - Strings (single reference) or
//   - Arrays of strings (multi-reference)
//
// Empty strings, null, and undefined are skipped silently — they're
// "not set" rather than "broken".

import type { Entity, Reference, ValidatorConfig } from './types.js';

const HEURISTIC_SUFFIXES = ['id', 'pool', 'table', 'refs'];

function looksLikeReferenceField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return HEURISTIC_SUFFIXES.some((s) => lower.endsWith(s)) && lower !== 'id';
}

/**
 * Snake-case ID heuristic — strings that look like entity IDs.
 * Catches "taxi_driver", "ak_47", "level_1_grasslands", "slime", "gold_coin".
 * Excludes things like "Hello world" (uppercase, spaces), "AK-47" (caps, dash).
 *
 * We accept single-word lowercase strings (e.g. "slime") — game-data IDs are
 * often single words. Categories ("transport", "rifle") that look the same
 * should be opted out via the knownEnums config.
 */
const ID_LIKE_PATTERN = /^[a-z][a-z0-9_]*$/;

function isIdLikeString(value: unknown): value is string {
  return typeof value === 'string' && ID_LIKE_PATTERN.test(value);
}

interface WalkContext {
  fromId: string;
  fromType: string;
  fromPath: string;
  fromNamespace: string;
  refFields: Record<string, string>;
  useHeuristics: boolean;
  knownEnums: Set<string>;
  out: Reference[];
}

function walkValue(value: unknown, fieldPath: string, fieldName: string, ctx: WalkContext): void {
  // Resolve expected type for this field name (if any).
  const explicitType = ctx.refFields[fieldName] ?? null;
  const isHeuristicMatch = ctx.useHeuristics && looksLikeReferenceField(fieldName);
  const isReferenceField = explicitType !== null || isHeuristicMatch;

  if (typeof value === 'string') {
    if (!isReferenceField) return;
    if (!value || ctx.knownEnums.has(value)) return;
    // Heuristic-only mode: also require the string to be id-shaped.
    if (!explicitType && !isIdLikeString(value)) return;
    ctx.out.push({
      fromId: ctx.fromId,
      fromType: ctx.fromType,
      fromPath: ctx.fromPath,
      fromNamespace: ctx.fromNamespace,
      fieldPath,
      referencedId: value,
      expectedType: explicitType,
    });
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkValue(value[i], `${fieldPath}[${i}]`, fieldName, ctx);
    }
    return;
  }

  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      walkValue(v, `${fieldPath}.${k}`, k, ctx);
    }
  }
}

export function findReferences(
  entity: Entity,
  config: ValidatorConfig = {},
): Reference[] {
  const ctx: WalkContext = {
    fromId: entity.id,
    fromType: entity.type,
    fromPath: entity.path,
    fromNamespace: entity.namespace,
    refFields: config.referenceFields ?? {},
    useHeuristics: config.useHeuristics ?? true,
    knownEnums: new Set(config.knownEnums ?? []),
    out: [],
  };
  for (const [k, v] of Object.entries(entity.data)) {
    walkValue(v, `data.${k}`, k, ctx);
  }
  return ctx.out;
}
