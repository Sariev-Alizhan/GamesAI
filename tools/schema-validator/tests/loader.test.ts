import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEntitiesFromDirectory } from '../src/core/loader.js';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'sv-load-')); });
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });

async function write(rel: string, body: string): Promise<void> {
  const full = join(dir, rel);
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, body, 'utf-8');
}

describe('loadEntitiesFromDirectory', () => {
  it('walks subdirectories and loads valid schemas', async () => {
    await write('a/foo.yaml', 'id: foo\ntype: weapon\nname: Foo\ndata: {damage: 10}');
    await write('b/bar.yaml', 'id: bar\ntype: enemy\nname: Bar\ndata: {hp: 100}');
    const { entities, issues } = await loadEntitiesFromDirectory(dir);
    expect(entities.map((e) => e.id).sort()).toEqual(['bar', 'foo']);
    expect(issues).toEqual([]);
  });

  it('skips node_modules and hidden folders', async () => {
    await write('node_modules/x/foo.yaml', 'id: hidden\ntype: x\nname: H\ndata: {}');
    await write('.git/y.yaml', 'id: hidden2\ntype: x\nname: H\ndata: {}');
    await write('real.yaml', 'id: real\ntype: x\nname: R\ndata: {}');
    const { entities } = await loadEntitiesFromDirectory(dir);
    expect(entities).toHaveLength(1);
    expect(entities[0]?.id).toBe('real');
  });

  it('skips config files and template/internal files', async () => {
    // Config files — would fail "missing id" validation if loaded
    await write('validator.config.yaml', 'namespaceByDirectory: true\nignoreOrphans: true');
    await write('build.config.yml', 'someOption: true');
    // Template / internal convention
    await write('_template.yaml', 'id: tpl\ntype: x\nname: T\ndata: {}');
    // README in YAML form (rare but possible)
    await write('README.yaml', 'description: docs');
    // Real entity
    await write('real.yaml', 'id: real\ntype: x\nname: R\ndata: {}');
    const { entities, issues } = await loadEntitiesFromDirectory(dir);
    expect(entities).toHaveLength(1);
    expect(entities[0]?.id).toBe('real');
    expect(issues).toEqual([]);
  });

  it('reports broken YAML as invalid-schema issue but continues', async () => {
    await write('broken.yaml', 'id: x\ntype: y\n  invalid: : :');
    await write('good.yaml', 'id: good\ntype: x\nname: G\ndata: {}');
    const { entities, issues } = await loadEntitiesFromDirectory(dir);
    expect(entities.map((e) => e.id)).toEqual(['good']);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.category).toBe('invalid-schema');
  });

  it('reports missing id', async () => {
    await write('no-id.yaml', 'type: weapon\nname: X\ndata: {}');
    const { entities, issues } = await loadEntitiesFromDirectory(dir);
    expect(entities).toHaveLength(0);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('Missing or invalid "id"');
  });

  it('reports missing type', async () => {
    await write('no-type.yaml', 'id: x\nname: X\ndata: {}');
    const { entities, issues } = await loadEntitiesFromDirectory(dir);
    expect(entities).toHaveLength(0);
    expect(issues[0]?.message).toContain('Missing or invalid "type"');
  });

  it('warns (not errors) on missing name', async () => {
    await write('no-name.yaml', 'id: x\ntype: weapon\ndata: {}');
    const { entities, issues } = await loadEntitiesFromDirectory(dir);
    expect(entities).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
  });

  it('handles missing data field gracefully', async () => {
    await write('no-data.yaml', 'id: x\ntype: weapon\nname: X');
    const { entities, issues } = await loadEntitiesFromDirectory(dir);
    expect(entities).toHaveLength(1);
    expect(entities[0]?.data).toEqual({});
    expect(issues).toEqual([]);
  });

  it('rejects array data field', async () => {
    await write('array-data.yaml', 'id: x\ntype: weapon\nname: X\ndata: [1, 2, 3]');
    const { entities, issues } = await loadEntitiesFromDirectory(dir);
    expect(entities).toHaveLength(0);
    expect(issues[0]?.message).toContain('"data" must be an object');
  });
});
