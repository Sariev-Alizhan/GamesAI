import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPlugin } from '../src/core/plugin-loader.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'boilergen-test-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function makePlugin(layout: Record<string, string>): Promise<string> {
  const pluginDir = join(dir, 'myplugin');
  for (const [relPath, content] of Object.entries(layout)) {
    const full = join(pluginDir, relPath);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content, 'utf-8');
  }
  return pluginDir;
}

describe('loadPlugin', () => {
  it('discovers templates following <target>/<entity-type>/<file> convention', async () => {
    const pluginDir = await makePlugin({
      'targets/cpp-server/profession/Profession.cpp.hbs': '// foo',
      'targets/node-api/weapon/wp.controller.ts.hbs': '// bar',
    });
    const plugin = await loadPlugin(pluginDir);
    expect(plugin.id).toBe('myplugin');
    expect(plugin.templates).toHaveLength(2);

    const cpp = plugin.templates.find((t) => t.target === 'cpp-server');
    expect(cpp?.entityType).toBe('profession');
    expect(cpp?.outputRelPath).toBe('Profession.cpp');

    const node = plugin.templates.find((t) => t.target === 'node-api');
    expect(node?.entityType).toBe('weapon');
    expect(node?.outputRelPath).toBe('wp.controller.ts');
  });

  it('preserves nested output subfolders inside entity-type dir', async () => {
    const pluginDir = await makePlugin({
      'targets/cpp-server/weapon/Weapons/AK.cpp.hbs': '// x',
    });
    const plugin = await loadPlugin(pluginDir);
    expect(plugin.templates[0]?.outputRelPath).toBe('Weapons/AK.cpp');
  });

  it('skips templates without entity-type folder and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pluginDir = await makePlugin({
      'targets/cpp-server/Bad.cpp.hbs': '// no entity-type',
      'targets/cpp-server/profession/Good.cpp.hbs': '// ok',
    });
    const plugin = await loadPlugin(pluginDir);
    expect(plugin.templates).toHaveLength(1);
    expect(plugin.templates[0]?.outputRelPath).toBe('Good.cpp');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('throws when targets/ directory is missing', async () => {
    const pluginDir = join(dir, 'empty-plugin');
    await mkdir(pluginDir, { recursive: true });
    await expect(loadPlugin(pluginDir)).rejects.toThrow(/no targets\//);
  });

  it('returns empty templates list for empty targets/', async () => {
    const pluginDir = join(dir, 'empty-targets');
    await mkdir(join(pluginDir, 'targets'), { recursive: true });
    const plugin = await loadPlugin(pluginDir);
    expect(plugin.templates).toEqual([]);
  });

  it('ignores non-.hbs files', async () => {
    const pluginDir = await makePlugin({
      'targets/cpp/profession/file.txt': 'not a template',
      'targets/cpp/profession/file.hbs': '// real',
    });
    const plugin = await loadPlugin(pluginDir);
    expect(plugin.templates).toHaveLength(1);
  });
});
