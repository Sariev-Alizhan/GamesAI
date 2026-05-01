// Tests for the multi-plugin endpoints introduced when Boilergen pivoted to
// support multiple plugins side-by-side in the web UI.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

let serverProcess: ChildProcess;
let serverUrl: string;
let pluginsRoot: string;
let schemasRoot: string;
let workDir: string;

async function setupTwoPlugins(): Promise<{ pluginsRoot: string; schemasRoot: string }> {
  workDir = await mkdtemp(join(tmpdir(), 'boilergen-multi-test-'));
  pluginsRoot = join(workDir, 'plugins');
  schemasRoot = join(workDir, 'schemas');

  // Plugin 1: alpha — one entity type "profession"
  const alphaTpl = join(pluginsRoot, 'alpha/targets/cpp/profession');
  await mkdir(alphaTpl, { recursive: true });
  await writeFile(
    join(alphaTpl, '{{snakeCase id}}.cpp.hbs'),
    '// alpha — {{name}}\nclass Profession{{pascalCase id}} {};\n',
    'utf-8',
  );

  // Plugin 2: beta — one entity type "weapon"
  const betaTpl = join(pluginsRoot, 'beta/targets/scripts/weapon');
  await mkdir(betaTpl, { recursive: true });
  await writeFile(
    join(betaTpl, '{{snakeCase id}}.gd.hbs'),
    '# beta — {{name}}\nclass_name Weapon{{pascalCase id}}\n',
    'utf-8',
  );

  // Schemas — one example per plugin
  await mkdir(join(schemasRoot, 'alpha'), { recursive: true });
  await writeFile(
    join(schemasRoot, 'alpha/medic.yaml'),
    'id: medic\ntype: profession\nname: Medic\ndata: {}\n',
    'utf-8',
  );
  await mkdir(join(schemasRoot, 'beta'), { recursive: true });
  await writeFile(
    join(schemasRoot, 'beta/sword.yaml'),
    'id: sword\ntype: weapon\nname: Sword\ndata: {}\n',
    'utf-8',
  );

  return { pluginsRoot, schemasRoot };
}

async function waitForServer(url: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/plugins`);
      if (res.ok) return;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server at ${url} did not become ready in ${timeoutMs}ms`);
}

beforeAll(async () => {
  await setupTwoPlugins();
  const port = 3300 + Math.floor(Math.random() * 100);
  serverUrl = `http://localhost:${port}`;
  serverProcess = spawn('npx', ['tsx', 'src/web/server.ts'], {
    env: {
      ...process.env,
      PORT: String(port),
      BOILERGEN_PLUGINS_ROOT: pluginsRoot,
      BOILERGEN_SCHEMAS_ROOT: schemasRoot,
      // Make sure legacy single-plugin mode is OFF
      BOILERGEN_PLUGIN: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout?.on('data', () => {});
  serverProcess.stderr?.on('data', () => {});
  await waitForServer(serverUrl);
}, 15000);

afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill('SIGKILL');
    await new Promise((r) => setTimeout(r, 100));
  }
  if (workDir) await rm(workDir, { recursive: true, force: true });
});

describe('GET /api/plugins', () => {
  it('lists every plugin under plugins/', async () => {
    const res = await fetch(`${serverUrl}/api/plugins`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.plugins.map((p: { id: string }) => p.id).sort()).toEqual(['alpha', 'beta']);
  });

  it('reports template count and entity types per plugin', async () => {
    const res = await fetch(`${serverUrl}/api/plugins`);
    const data = await res.json();
    const alpha = data.plugins.find((p: { id: string }) => p.id === 'alpha');
    expect(alpha.templateCount).toBe(1);
    expect(alpha.entityTypes).toEqual(['profession']);
    const beta = data.plugins.find((p: { id: string }) => p.id === 'beta');
    expect(beta.templateCount).toBe(1);
    expect(beta.entityTypes).toEqual(['weapon']);
  });

  it('exposes a default plugin id', async () => {
    const res = await fetch(`${serverUrl}/api/plugins`);
    const data = await res.json();
    expect(['alpha', 'beta']).toContain(data.default);
  });
});

describe('GET /api/plugin/:id', () => {
  it('returns full plugin details for a known id', async () => {
    const res = await fetch(`${serverUrl}/api/plugin/alpha`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.id).toBe('alpha');
    expect(data.templates).toHaveLength(1);
    expect(data.templates[0].entityType).toBe('profession');
  });

  it('returns 404 for unknown plugin id', async () => {
    const res = await fetch(`${serverUrl}/api/plugin/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/plugin/:id/examples and /example/:slug', () => {
  it('lists example schema slugs', async () => {
    const res = await fetch(`${serverUrl}/api/plugin/alpha/examples`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.examples.map((e: { slug: string }) => e.slug)).toEqual(['medic']);
  });

  it('returns the YAML content of one example', async () => {
    const res = await fetch(`${serverUrl}/api/plugin/alpha/example/medic`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.slug).toBe('medic');
    expect(data.yaml).toContain('id: medic');
    expect(data.yaml).toContain('type: profession');
  });

  it('returns 404 for unknown example slug', async () => {
    const res = await fetch(`${serverUrl}/api/plugin/alpha/example/ghost`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/plugin/:id/preview', () => {
  it('renders templates against the named plugin', async () => {
    const res = await fetch(`${serverUrl}/api/plugin/beta/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yaml: 'id: katana\ntype: weapon\nname: Katana\ndata: {}',
      }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.matched).toBe(1);
    expect(data.files).toHaveLength(1);
    expect(data.files[0].content).toContain('beta — Katana');
    expect(data.files[0].content).toContain('class_name WeaponKatana');
  });

  it('matches no templates when entity type does not exist in plugin', async () => {
    const res = await fetch(`${serverUrl}/api/plugin/alpha/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yaml: 'id: x\ntype: weapon\nname: X\ndata: {}',
      }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.matched).toBe(0);
    expect(data.files).toHaveLength(0);
  });

  it('returns 404 for preview against unknown plugin', async () => {
    const res = await fetch(`${serverUrl}/api/plugin/ghost/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yaml: 'id: x\ntype: y\nname: Z\ndata: {}',
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe('Plugin isolation', () => {
  it('alpha YAML does not produce beta files and vice versa', async () => {
    // alpha plugin has only profession templates; sending a profession YAML
    // through it must not somehow leak into beta's weapon templates.
    const resAlpha = await fetch(`${serverUrl}/api/plugin/alpha/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yaml: 'id: paladin\ntype: profession\nname: Paladin\ndata: {}',
      }),
    });
    const dataAlpha = await resAlpha.json();
    expect(dataAlpha.files).toHaveLength(1);
    expect(dataAlpha.files[0].path).toContain('cpp/');
    expect(dataAlpha.files[0].path).not.toContain('scripts/');
  });
});
