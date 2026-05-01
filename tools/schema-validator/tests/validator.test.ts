import { describe, it, expect } from 'vitest';
import { validate } from '../src/core/validator.js';
import type { Entity } from '../src/core/types.js';

function entity(id: string, type: string, data: Record<string, unknown> = {}): Entity {
  return { path: `/${id}.yaml`, id, type, name: id, data };
}

describe('validate — duplicate ids', () => {
  it('flags duplicate ids as errors', () => {
    const result = validate([
      entity('foo', 'weapon'),
      entity('foo', 'enemy'),
    ]);
    const dupes = result.issues.filter((i) => i.category === 'duplicate-id');
    expect(dupes).toHaveLength(1);
    expect(dupes[0]?.severity).toBe('error');
  });
});

describe('validate — broken references', () => {
  it('flags references to non-existent ids', () => {
    const result = validate(
      [entity('slime', 'enemy', { lootTable: ['health_potion', 'missing_item'] })],
      { ignoreOrphans: true },
    );
    const broken = result.issues.filter((i) => i.category === 'broken-reference');
    expect(broken).toHaveLength(2); // both health_potion and missing_item are missing
    expect(broken.every((i) => i.severity === 'error')).toBe(true);
  });

  it('passes when references resolve', () => {
    const result = validate(
      [
        entity('slime', 'enemy', { lootTable: ['health_potion'] }),
        entity('health_potion', 'item'),
      ],
      { ignoreOrphans: true },
    );
    const broken = result.issues.filter((i) => i.category === 'broken-reference');
    expect(broken).toEqual([]);
  });
});

describe('validate — type mismatch', () => {
  it('flags references where target is wrong type', () => {
    const result = validate(
      [
        entity('quest1', 'quest', { itemRewards: ['boss_zombie'] }),
        entity('boss_zombie', 'enemy'),
      ],
      {
        referenceFields: { itemRewards: 'item' },
        ignoreOrphans: true,
      },
    );
    const mismatches = result.issues.filter((i) => i.category === 'reference-type-mismatch');
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.message).toContain('expected type "item"');
    expect(mismatches[0]?.message).toContain('found "enemy"');
  });

  it('does not flag type mismatch when expectedType is null (heuristic-only)', () => {
    const result = validate(
      [
        entity('slime', 'enemy', { lootTable: ['gold_coin'] }),
        entity('gold_coin', 'currency'),
      ],
      { ignoreOrphans: true },
    );
    const mismatches = result.issues.filter((i) => i.category === 'reference-type-mismatch');
    expect(mismatches).toEqual([]);
  });
});

describe('validate — orphan detection', () => {
  it('warns about entities with no incoming references', () => {
    const result = validate([
      entity('lonely', 'item'),
      entity('also_lonely', 'enemy'),
    ]);
    const orphans = result.issues.filter((i) => i.category === 'orphan-entity');
    expect(orphans).toHaveLength(2);
    expect(orphans.every((i) => i.severity === 'warning')).toBe(true);
  });

  it('does not flag entities that are referenced', () => {
    const result = validate([
      entity('slime', 'enemy', { lootTable: ['gold'] }),
      entity('gold', 'item'),
    ]);
    const orphans = result.issues.filter((i) => i.category === 'orphan-entity');
    // slime is still orphan (nobody references it), but gold is not.
    expect(orphans).toHaveLength(1);
    expect(orphans[0]?.message).toContain('slime');
  });

  it('suppresses orphan warnings when ignoreOrphans: true', () => {
    const result = validate(
      [entity('lonely', 'item')],
      { ignoreOrphans: true },
    );
    expect(result.issues.filter((i) => i.category === 'orphan-entity')).toEqual([]);
  });
});

describe('validate — stats', () => {
  it('counts entities, references, errors, warnings', () => {
    const result = validate([
      entity('a', 'weapon', { lootTable: ['missing'] }),
      entity('b', 'item'),
    ]);
    expect(result.stats.totalEntities).toBe(2);
    expect(result.stats.totalReferences).toBe(1);
    expect(result.stats.byType).toEqual({ weapon: 1, item: 1 });
    expect(result.stats.errors).toBeGreaterThanOrEqual(1); // broken reference
  });
});
