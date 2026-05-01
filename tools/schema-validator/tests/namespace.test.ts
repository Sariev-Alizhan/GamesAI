// Tests for namespace-aware mode — same id across different top-level
// folders is not a duplicate.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { namespaceFromPath, loadEntitiesFromDirectory } from '../src/core/loader.js';
import { validate, validateDirectory } from '../src/core/validator.js';
import type { Entity } from '../src/core/types.js';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'sv-ns-')); });
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });

async function write(rel: string, body: string): Promise<void> {
  const full = join(dir, rel);
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, body, 'utf-8');
}

describe('namespaceFromPath', () => {
  it('uses first directory segment as namespace', () => {
    expect(namespaceFromPath('/root/godot/slime.yaml', '/root')).toBe('godot');
  });

  it('uses first segment even for deeply nested files', () => {
    expect(namespaceFromPath('/root/unity/quests/main.yaml', '/root')).toBe('unity');
  });

  it('returns empty string for files directly in root', () => {
    expect(namespaceFromPath('/root/loose.yaml', '/root')).toBe('');
  });
});

describe('loadEntitiesFromDirectory — namespace mode', () => {
  it('assigns namespaces from top-level directory when enabled', async () => {
    await write('godot/slime.yaml', 'id: slime\ntype: enemy\nname: Slime\ndata: {}');
    await write('unity/slime.yaml', 'id: slime\ntype: enemy\nname: Slime\ndata: {}');
    const { entities } = await loadEntitiesFromDirectory(dir, { namespaceByDirectory: true });
    expect(entities).toHaveLength(2);
    const namespaces = entities.map((e) => e.namespace).sort();
    expect(namespaces).toEqual(['godot', 'unity']);
  });

  it('leaves namespace empty when feature is off', async () => {
    await write('godot/slime.yaml', 'id: slime\ntype: enemy\nname: Slime\ndata: {}');
    const { entities } = await loadEntitiesFromDirectory(dir);
    expect(entities[0]?.namespace).toBe('');
  });
});

describe('validate — namespace isolation', () => {
  function entity(id: string, type: string, namespace: string, data: Record<string, unknown> = {}): Entity {
    return { path: `/${namespace}/${id}.yaml`, id, type, name: id, data, namespace };
  }

  it('does NOT flag same id across different namespaces as duplicate', () => {
    const result = validate([
      entity('slime', 'enemy', 'godot'),
      entity('slime', 'enemy', 'unity'),
    ], { ignoreOrphans: true });
    const dupes = result.issues.filter((i) => i.category === 'duplicate-id');
    expect(dupes).toEqual([]);
  });

  it('still flags duplicate ids inside the same namespace', () => {
    const result = validate([
      entity('slime', 'enemy', 'godot'),
      entity('slime', 'item', 'godot'),
    ], { ignoreOrphans: true });
    const dupes = result.issues.filter((i) => i.category === 'duplicate-id');
    expect(dupes).toHaveLength(1);
    expect(dupes[0]?.message).toContain('namespace "godot"');
  });

  it('resolves references same-namespace first', () => {
    const result = validate([
      entity('slime', 'enemy', 'godot', { lootTable: ['gold_coin'] }),
      entity('gold_coin', 'item', 'godot'),
      // a "gold_coin" in unity should NOT match the godot reference
      entity('gold_coin', 'item', 'unity'),
    ], { ignoreOrphans: true });
    const broken = result.issues.filter((i) => i.category === 'broken-reference');
    expect(broken).toEqual([]);
  });

  it('reports broken when no same-namespace match and no global match', () => {
    const result = validate([
      entity('slime', 'enemy', 'godot', { lootTable: ['unity_item'] }),
      entity('unity_item', 'item', 'unity'),
    ], { ignoreOrphans: true });
    const broken = result.issues.filter((i) => i.category === 'broken-reference');
    expect(broken).toHaveLength(1);
  });

  it('explicit cross-namespace prefix "ns:id" works', () => {
    const result = validate([
      entity('slime', 'enemy', 'godot', { lootTable: ['unity:gold_coin'] }),
      entity('gold_coin', 'item', 'unity'),
    ], { ignoreOrphans: true });
    const broken = result.issues.filter((i) => i.category === 'broken-reference');
    expect(broken).toEqual([]);
  });
});

describe('validateDirectory — end-to-end with namespaces', () => {
  it('our exact bug case: same id in different plugin folders is not a duplicate', async () => {
    await write('gm1/dummy-profession.yaml', 'id: taxi_driver\ntype: profession\nname: Driver\ndata: {}');
    await write('generic-rp/taxi-driver.yaml', 'id: taxi_driver\ntype: job\nname: Driver\ndata: {}');
    const result = await validateDirectory(dir, { namespaceByDirectory: true, ignoreOrphans: true });
    const dupes = result.issues.filter((i) => i.category === 'duplicate-id');
    expect(dupes).toEqual([]);
    expect(result.entities).toHaveLength(2);
  });
});
