import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateFiveMResources } from '../src/fivem/validator.js';
import type { FxValidationResult } from '../src/fivem/types.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fivem-test-'));
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

async function makeResource(
  resourcePath: string,
  manifestContent: string,
  files: Record<string, string> = {},
): Promise<void> {
  await mkdir(resourcePath, { recursive: true });
  await writeFile(join(resourcePath, 'fxmanifest.lua'), manifestContent, 'utf-8');
  for (const [path, content] of Object.entries(files)) {
    const full = join(resourcePath, path);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content, 'utf-8');
  }
}

function categorise(result: FxValidationResult): Record<string, number> {
  const by: Record<string, number> = {};
  for (const i of result.issues) by[i.category] = (by[i.category] ?? 0) + 1;
  return by;
}

describe('validateFiveMResources — clean cases', () => {
  it('reports no issues for a single well-formed resource', async () => {
    await makeResource(
      join(root, 'qb-core'),
      `fx_version 'cerulean'
       game 'gta5'
       client_scripts { 'client/main.lua' }
       server_scripts { 'server/main.lua' }`,
      { 'client/main.lua': '-- client', 'server/main.lua': '-- server' },
    );
    const result = await validateFiveMResources(root);
    expect(result.stats.errors).toBe(0);
    expect(result.stats.warnings).toBe(0);
    expect(result.stats.totalResources).toBe(1);
  });

  it('walks categorisation folders ([qb], [standalone]) and finds nested resources', async () => {
    await makeResource(
      join(root, '[qb]', 'qb-core'),
      `fx_version 'cerulean'\ngame 'gta5'`,
    );
    await makeResource(
      join(root, '[standalone]', 'oxmysql'),
      `fx_version 'cerulean'\ngame 'gta5'`,
    );
    const result = await validateFiveMResources(root);
    expect(result.stats.totalResources).toBe(2);
    expect(result.resources.map((r) => r.name).sort()).toEqual(['oxmysql', 'qb-core']);
  });
});

describe('validateFiveMResources — required fields', () => {
  it('errors when fx_version is missing', async () => {
    await makeResource(join(root, 'broken'), `game 'gta5'`);
    const result = await validateFiveMResources(root);
    expect(categorise(result)['missing-required-field']).toBeGreaterThanOrEqual(1);
    expect(result.stats.errors).toBeGreaterThan(0);
  });

  it('errors when game is missing', async () => {
    await makeResource(join(root, 'broken'), `fx_version 'cerulean'`);
    const result = await validateFiveMResources(root);
    const cats = categorise(result);
    expect(cats['missing-required-field']).toBeGreaterThanOrEqual(1);
  });

  it('warns when game is unknown (not gta5/rdr3/common)', async () => {
    await makeResource(join(root, 'r'), `fx_version 'cerulean'\ngame 'fivenights'`);
    const result = await validateFiveMResources(root);
    expect(categorise(result)['unknown-game']).toBe(1);
  });
});

describe('validateFiveMResources — dependency resolution', () => {
  it('errors when a declared dependency does not exist as a folder', async () => {
    await makeResource(
      join(root, 'consumer'),
      `fx_version 'cerulean'\ngame 'gta5'\ndependencies { 'doesnt-exist' }`,
    );
    const result = await validateFiveMResources(root);
    expect(categorise(result)['dependency-not-found']).toBe(1);
  });

  it('catches the Linux footgun: dependency case mismatch', async () => {
    await makeResource(
      join(root, 'QB-Core'),       // actual folder uses caps
      `fx_version 'cerulean'\ngame 'gta5'`,
    );
    await makeResource(
      join(root, 'consumer'),
      `fx_version 'cerulean'\ngame 'gta5'\ndependencies { 'qb-core' }`,
    );
    const result = await validateFiveMResources(root);
    const cats = categorise(result);
    expect(cats['dependency-case-mismatch']).toBe(1);
    expect(cats['dependency-not-found']).toBe(undefined);  // matched (insensitively), so it's case-mismatch not not-found
  });

  it('passes when dependency exists with exact case', async () => {
    await makeResource(join(root, 'oxmysql'), `fx_version 'cerulean'\ngame 'gta5'`);
    await makeResource(
      join(root, 'consumer'),
      `fx_version 'cerulean'\ngame 'gta5'\ndependencies { 'oxmysql' }`,
    );
    const result = await validateFiveMResources(root);
    expect(categorise(result)['dependency-not-found']).toBe(undefined);
    expect(categorise(result)['dependency-case-mismatch']).toBe(undefined);
  });

  it('also accepts the legacy "dependency" (singular) form', async () => {
    await makeResource(join(root, 'oxmysql'), `fx_version 'cerulean'\ngame 'gta5'`);
    await makeResource(
      join(root, 'consumer'),
      `fx_version 'cerulean'\ngame 'gta5'\ndependency 'oxmysql'`,
    );
    const result = await validateFiveMResources(root);
    expect(result.stats.errors).toBe(0);
  });
});

describe('validateFiveMResources — script file references', () => {
  it('errors when a client_scripts file is missing', async () => {
    await makeResource(
      join(root, 'r'),
      `fx_version 'cerulean'\ngame 'gta5'\nclient_scripts { 'client/main.lua' }`,
      { /* no actual main.lua */ },
    );
    const result = await validateFiveMResources(root);
    expect(categorise(result)['missing-script-file']).toBe(1);
  });

  it('skips wildcards (does not flag glob patterns)', async () => {
    await makeResource(
      join(root, 'r'),
      `fx_version 'cerulean'\ngame 'gta5'\nfiles { 'html/*.png' }`,
    );
    const result = await validateFiveMResources(root);
    expect(categorise(result)['missing-script-file']).toBe(undefined);
  });

  it('warns when @other-resource referenced without dep declaration', async () => {
    await makeResource(
      join(root, 'ox_lib'),
      `fx_version 'cerulean'\ngame 'gta5'`,
      { 'init.lua': '-- ox_lib init' },
    );
    await makeResource(
      join(root, 'consumer'),
      `fx_version 'cerulean'\ngame 'gta5'\nshared_scripts { '@ox_lib/init.lua' }`,
      // missing dependencies { 'ox_lib' }
    );
    const result = await validateFiveMResources(root);
    expect(categorise(result)['cross-resource-no-dep']).toBe(1);
  });

  it('errors when @other-resource references a non-existent file', async () => {
    await makeResource(
      join(root, 'ox_lib'),
      `fx_version 'cerulean'\ngame 'gta5'`,
      // no init.lua
    );
    await makeResource(
      join(root, 'consumer'),
      `fx_version 'cerulean'\ngame 'gta5'\nshared_scripts { '@ox_lib/init.lua' }\ndependencies { 'ox_lib' }`,
    );
    const result = await validateFiveMResources(root);
    expect(categorise(result)['missing-script-file']).toBe(1);
  });
});

describe('validateFiveMResources — stats', () => {
  it('counts resources, dependencies, and script references', async () => {
    await makeResource(join(root, 'oxmysql'), `fx_version 'cerulean'\ngame 'gta5'`);
    await makeResource(
      join(root, 'r'),
      `fx_version 'cerulean'
       game 'gta5'
       dependencies { 'oxmysql' }
       client_scripts { 'client/a.lua', 'client/b.lua' }
       files { 'data/*.json' }`,
      { 'client/a.lua': '', 'client/b.lua': '' },
    );
    const result = await validateFiveMResources(root);
    expect(result.stats.totalResources).toBe(2);
    expect(result.stats.totalDependencies).toBe(1);
    // 2 client_scripts + 1 files entry = 3 script refs
    expect(result.stats.totalScriptReferences).toBe(3);
  });
});
