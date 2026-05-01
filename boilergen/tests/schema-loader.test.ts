import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSchema } from '../src/core/schema-loader.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'boilergen-test-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function writeYaml(name: string, content: string): Promise<string> {
  const p = join(dir, name);
  await writeFile(p, content, 'utf-8');
  return p;
}

describe('loadSchema', () => {
  it('parses a valid schema with cyrillic and nested data', async () => {
    const path = await writeYaml(
      'ok.yaml',
      'id: taxi_driver\ntype: profession\nname: Таксист\ndata:\n  baseSalary: 500\n',
    );
    const result = await loadSchema(path);
    expect(result).toEqual({
      id: 'taxi_driver',
      type: 'profession',
      name: 'Таксист',
      data: { baseSalary: 500 },
    });
  });

  it('defaults missing data to empty object', async () => {
    const path = await writeYaml('no-data.yaml', 'id: x\ntype: y\nname: Z\n');
    const result = await loadSchema(path);
    expect(result.data).toEqual({});
  });

  it('throws with field paths when fields missing', async () => {
    const path = await writeYaml('bad.yaml', 'id: x\n');
    await expect(loadSchema(path)).rejects.toThrow(/type|name/);
  });

  it('throws on empty string in required field', async () => {
    const path = await writeYaml(
      'empty.yaml',
      'id: x\ntype: ""\nname: ok\n',
    );
    await expect(loadSchema(path)).rejects.toThrow(/type/);
  });

  it('throws on malformed YAML with parse error message', async () => {
    const path = await writeYaml('broken.yaml', 'id: x\n  bad: [unclosed\n');
    await expect(loadSchema(path)).rejects.toThrow(/parse YAML/);
  });

  it('throws on missing file', async () => {
    await expect(loadSchema(join(dir, 'nope.yaml'))).rejects.toThrow();
  });
});
