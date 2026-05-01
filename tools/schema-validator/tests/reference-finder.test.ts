import { describe, it, expect } from 'vitest';
import { findReferences } from '../src/core/reference-finder.js';
import type { Entity } from '../src/core/types.js';

function makeEntity(data: Record<string, unknown>): Entity {
  return {
    path: '/test/entity.yaml',
    id: 'test_entity',
    type: 'enemy',
    name: 'Test',
    data,
    namespace: '',
  };
}

describe('findReferences — heuristic detection (default)', () => {
  it('detects "lootTable" array as reference field', () => {
    const refs = findReferences(makeEntity({ lootTable: ['health_potion', 'gold_coin'] }));
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.referencedId)).toEqual(['health_potion', 'gold_coin']);
  });

  it('detects "*Pool" as reference field', () => {
    const refs = findReferences(makeEntity({ enemyPool: ['slime_a', 'slime_b'] }));
    expect(refs).toHaveLength(2);
  });

  it('detects "*Refs" as reference field', () => {
    const refs = findReferences(makeEntity({ targetRefs: ['quest_a'] }));
    expect(refs).toHaveLength(1);
  });

  it('detects single-string reference, not just array', () => {
    const refs = findReferences(makeEntity({ nextLevel: 'level_2_caves' }));
    expect(refs).toHaveLength(1);
    expect(refs[0]?.referencedId).toBe('level_2_caves');
  });

  it('skips non-id-shaped strings under heuristic mode', () => {
    // "Hello world" is not snake_case → not detected as reference.
    const refs = findReferences(makeEntity({ lootTable: ['Hello world', 'real_id'] }));
    expect(refs).toHaveLength(1);
    expect(refs[0]?.referencedId).toBe('real_id');
  });

  it('does NOT detect plain "id" field as a reference', () => {
    const refs = findReferences(makeEntity({ id: 'self', name: 'X' }));
    expect(refs).toHaveLength(0);
  });

  it('does NOT detect non-reference fields by name', () => {
    const refs = findReferences(makeEntity({ damage: 10, fireRate: 600, description: 'long text here' }));
    expect(refs).toHaveLength(0);
  });

  it('skips empty strings and known-enum values', () => {
    const refs = findReferences(
      makeEntity({ enemyPool: ['', 'slime'], unitTypeId: 'humanoid' }),
      { knownEnums: ['humanoid'] },
    );
    expect(refs.map((r) => r.referencedId)).toEqual(['slime']);
  });
});

describe('findReferences — explicit config', () => {
  it('treats explicitly-mapped fields as references regardless of name shape', () => {
    const refs = findReferences(
      makeEntity({ flavor: 'red_apple' }), // "flavor" wouldn't match heuristic
      {
        referenceFields: { flavor: 'item' },
        useHeuristics: false,
      },
    );
    expect(refs).toHaveLength(1);
    expect(refs[0]?.referencedId).toBe('red_apple');
    expect(refs[0]?.expectedType).toBe('item');
  });

  it('records the expected type from explicit config', () => {
    const refs = findReferences(
      makeEntity({ enemyPool: ['goblin'] }),
      { referenceFields: { enemyPool: 'enemy' } },
    );
    expect(refs[0]?.expectedType).toBe('enemy');
  });

  it('preserves null expectedType for heuristic-only matches', () => {
    const refs = findReferences(makeEntity({ lootTable: ['gold'] }));
    expect(refs[0]?.expectedType).toBeNull();
  });

  it('disables heuristics when useHeuristics: false and no explicit config', () => {
    const refs = findReferences(
      makeEntity({ lootTable: ['gold'] }),
      { useHeuristics: false },
    );
    expect(refs).toEqual([]);
  });
});

describe('findReferences — nested data', () => {
  it('walks nested objects', () => {
    const refs = findReferences(
      makeEntity({
        rewards: { itemPool: ['silver_ring', 'mana_potion'] },
      }),
    );
    expect(refs).toHaveLength(2);
    expect(refs[0]?.fieldPath).toContain('itemPool');
  });

  it('records correct field path for array index', () => {
    const refs = findReferences(makeEntity({ enemyPool: ['a_one', 'b_two'] }));
    expect(refs[0]?.fieldPath).toBe('data.enemyPool[0]');
    expect(refs[1]?.fieldPath).toBe('data.enemyPool[1]');
  });
});
