import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

let serverProcess: ChildProcess;
let serverUrl: string;
let pluginDir: string;
let workDir: string;

async function setupTestPlugin(): Promise<string> {
  workDir = await mkdtemp(join(tmpdir(), 'boilergen-web-test-'));
  pluginDir = join(workDir, 'test-plugin');
  const cppDir = join(pluginDir, 'targets/cpp/profession');
  await mkdir(cppDir, { recursive: true });
  await writeFile(
    join(cppDir, 'Profession{{pascalCase id}}.cpp.hbs'),
    '// {{name}}\nclass Profession{{pascalCase id}} {};\n',
    'utf-8',
  );
  return pluginDir;
}

async function waitForServer(url: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/plugin`);
      if (res.ok) return;
    } catch {
      // server not ready
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server at ${url} did not become ready in ${timeoutMs}ms`);
}

beforeAll(async () => {
  await setupTestPlugin();
  const port = 3100 + Math.floor(Math.random() * 100);
  serverUrl = `http://localhost:${port}`;
  serverProcess = spawn('npx', ['tsx', 'src/web/server.ts'], {
    env: { ...process.env, PORT: String(port), BOILERGEN_PLUGIN: pluginDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Must drain stdout/stderr — undrained pipes fill their buffer (~64KB on macOS)
  // and block the spawned process on the next write, causing intermittent test
  // failures when the server logs more than the buffer can hold.
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

describe('web server /api/plugin', () => {
  it('returns plugin metadata', async () => {
    const res = await fetch(`${serverUrl}/api/plugin`);
    const data = await res.json();
    expect(res.ok).toBe(true);
    expect(data.id).toBe('test-plugin');
    expect(data.templates).toHaveLength(1);
    expect(data.templates[0].target).toBe('cpp');
    expect(data.templates[0].entityType).toBe('profession');
  });
});

describe('web server /api/preview', () => {
  it('renders matching templates', async () => {
    const res = await fetch(`${serverUrl}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yaml: 'id: barista\ntype: profession\nname: Бариста\n',
      }),
    });
    const data = await res.json();
    expect(res.ok).toBe(true);
    expect(data.matched).toBe(1);
    expect(data.total).toBe(1);
    expect(data.files).toHaveLength(1);
    expect(data.files[0].path).toBe('cpp/ProfessionBarista.cpp');
    expect(data.files[0].content).toContain('class ProfessionBarista');
    expect(data.files[0].content).toContain('// Бариста');
  });

  it('filters by entity type — non-matching types yield zero files', async () => {
    const res = await fetch(`${serverUrl}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yaml: 'id: ak47\ntype: weapon\nname: AK-47\n',
      }),
    });
    const data = await res.json();
    expect(res.ok).toBe(true);
    expect(data.matched).toBe(0);
    expect(data.files).toHaveLength(0);
  });

  it('returns 400 with helpful error on invalid YAML', async () => {
    const res = await fetch(`${serverUrl}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml: 'id: x\n  bad: [unclosed\n' }),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/parse YAML/);
  });

  it('returns 400 on schema validation error', async () => {
    const res = await fetch(`${serverUrl}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml: 'id: x\n' }),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Schema validation failed/);
  });

  it('returns 400 when body is missing yaml field', async () => {
    const res = await fetch(`${serverUrl}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('yaml');
  });

  it('blocks path-traversal in id (returns 400, not the malicious path)', async () => {
    const res = await fetch(`${serverUrl}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yaml: 'id: ../../etc/passwd\ntype: profession\nname: Hack\ndata: {}',
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/traversal|outside/i);
  });

  it('rejects unknown top-level fields (typo guard)', async () => {
    const res = await fetch(`${serverUrl}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yaml: 'id: x\ntype: profession\nname: Test\nextra: oops\n',
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe('web server static files', () => {
  it('serves the SPA index at /', async () => {
    const res = await fetch(`${serverUrl}/`);
    expect(res.ok).toBe(true);
    const html = await res.text();
    expect(html).toContain('Boilergen');
    expect(html).toContain('yaml-input');
  });
});
