import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadConfig } from '../src/core/config-loader.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'boilergen-test-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function writeConfig(content: string): Promise<string> {
  const p = join(dir, 'boilergen.config.yaml');
  await writeFile(p, content, 'utf-8');
  return p;
}

describe('loadConfig', () => {
  it('parses a valid config and resolves relative paths', async () => {
    const path = await writeConfig(
      'plugin: ./plugins/gm1\ntargets:\n  cpp: ./server/src\n  node: ./api/src\n',
    );
    const config = await loadConfig(path);
    expect(config.plugin).toBe(resolve(dir, 'plugins/gm1'));
    expect(config.targets.cpp).toBe(resolve(dir, 'server/src'));
    expect(config.targets.node).toBe(resolve(dir, 'api/src'));
  });

  it('keeps absolute paths absolute', async () => {
    const path = await writeConfig(
      'plugin: /absolute/path\ntargets:\n  cpp: /abs/cpp\n',
    );
    const config = await loadConfig(path);
    expect(config.plugin).toBe('/absolute/path');
    expect(config.targets.cpp).toBe('/abs/cpp');
  });

  it('throws when plugin field missing', async () => {
    const path = await writeConfig('targets:\n  cpp: ./x\n');
    await expect(loadConfig(path)).rejects.toThrow(/plugin/);
  });

  it('throws when targets field missing', async () => {
    const path = await writeConfig('plugin: ./x\n');
    await expect(loadConfig(path)).rejects.toThrow(/targets/);
  });

  it('throws on empty target value', async () => {
    const path = await writeConfig(
      'plugin: ./x\ntargets:\n  cpp: ""\n',
    );
    await expect(loadConfig(path)).rejects.toThrow();
  });

  it('throws on malformed YAML', async () => {
    const path = await writeConfig('plugin: ./x\n  bad: [unclosed\n');
    await expect(loadConfig(path)).rejects.toThrow(/parse YAML/);
  });
});
