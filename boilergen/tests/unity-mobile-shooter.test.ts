import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPlugin } from '../src/core/plugin-loader.js';
import { loadSchema } from '../src/core/schema-loader.js';
import { generate } from '../src/core/generator.js';

const REPO_ROOT = join(__dirname, '..');
const PLUGIN_DIR = join(REPO_ROOT, 'plugins', 'unity-mobile-shooter');
const SCHEMA_DIR = join(REPO_ROOT, 'schemas', 'unity-mobile-shooter');

let outDir: string;

beforeEach(async () => {
  outDir = await mkdtemp(join(tmpdir(), 'ums-test-'));
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

async function generateOne(schemaFile: string) {
  const plugin = await loadPlugin(PLUGIN_DIR);
  const schema = await loadSchema(join(SCHEMA_DIR, schemaFile));
  const result = await generate({
    schema,
    plugin,
    targetRoots: {
      'data-assets': join(outDir, 'data-assets'),
      i18n: join(outDir, 'i18n'),
    },
  });
  expect(result.errors).toEqual([]);
  return result;
}

describe('unity-mobile-shooter plugin', () => {
  it('loads with expected templates per entity type', async () => {
    const plugin = await loadPlugin(PLUGIN_DIR);
    expect(plugin.id).toBe('unity-mobile-shooter');
    const byEntity = plugin.templates.reduce<Record<string, number>>((acc, t) => {
      acc[t.entityType] = (acc[t.entityType] ?? 0) + 1;
      return acc;
    }, {});
    expect(byEntity).toEqual({ weapon: 2, gamemode: 2 });
  });

  it('renders weapon asset matching the Flump WeaponData fields exactly', async () => {
    await generateOne('assault-rifle.yaml');
    const content = await readFile(
      join(outDir, 'data-assets', 'Weapons', 'AssaultRifle_Data.asset'),
      'utf-8',
    );

    // Field set must match WeaponData.cs exactly — Unity serializer is strict on names.
    expect(content).toContain('m_Name: AssaultRifle_Data');
    expect(content).toContain('m_EditorClassIdentifier: Assembly-CSharp::WeaponData');
    expect(content).toContain('weaponName: Assault Rifle');
    expect(content).toContain('baseDamage: 20');
    expect(content).toContain('fireRate: 0.1');
    expect(content).toContain('isAutomatic: 1');
    expect(content).toContain('magazineSize: 30');
    expect(content).toContain('reserveAmmo: 90');
    expect(content).toContain('reloadTime: 2');
    expect(content).toContain('recoilPattern: {x: 0.3, y: 0.8 }');
    expect(content).toContain('baseSpread: 0.01');
    expect(content).toContain('spreadIncreasePerShot: 0.01');

    // Script GUID must come from the schema, not the placeholder fallback.
    expect(content).toContain('guid: f40b3035ee44f5c4ba404f6d0405ef9d');
    expect(content).not.toContain('__SCRIPT_GUID_HERE__');
  });

  it('renders all 5 game-mode assets with the right modeType enum int', async () => {
    const cases = [
      { file: 'duel-1v1.yaml',      asset: 'GameMode_Duel1v1.asset',      modeType: 0, players: 1, score: 5 },
      { file: 'team-3v3-tdm.yaml',  asset: 'GameMode_Team3v3TDM.asset',   modeType: 1, players: 3, score: 40 },
      { file: 'team-5v5-tdm.yaml',  asset: 'GameMode_Team5v5TDM.asset',   modeType: 2, players: 5, score: 50 },
      { file: 'hardpoint-5v5.yaml', asset: 'GameMode_Hardpoint5v5.asset', modeType: 3, players: 5, score: 150 },
      { file: 'practice.yaml',      asset: 'GameMode_Practice.asset',     modeType: 4, players: 1, score: 999 },
    ];

    for (const c of cases) {
      await generateOne(c.file);
      const content = await readFile(
        join(outDir, 'data-assets', 'GameModes', c.asset),
        'utf-8',
      );
      expect(content).toContain(`modeType: ${c.modeType}`);
      expect(content).toContain(`playersPerTeam: ${c.players}`);
      expect(content).toContain(`scoreLimit: ${c.score}`);
      expect(content).toContain('m_EditorClassIdentifier: Assembly-CSharp::FlumpGame.Data.GameModeData');
    }
  });

  it('emits per-entity i18n stub with en/ru/kk keys', async () => {
    await generateOne('team-5v5-tdm.yaml');
    const content = await readFile(
      join(outDir, 'i18n', 'GameModes', 'team_5v5_tdm.locale.json'),
      'utf-8',
    );
    const json = JSON.parse(content);
    expect(json['gamemode.team_5v5_tdm.name'].en).toBe('Team Deathmatch 5v5');
    expect(json['gamemode.team_5v5_tdm.description'].en).toContain('5v5 battle');
    expect(json['gamemode.team_5v5_tdm.name'].ru).toMatch(/^TODO:/);
    expect(json['gamemode.team_5v5_tdm.name'].kk).toMatch(/^TODO:/);
  });

  it('reverse-derived schemas keep canonical Flump field values', async () => {
    // Snapshot a few load-bearing values to catch accidental schema drift —
    // these schemas were derived from real committed .asset files in the Flump repo
    // and must stay in sync with the C# field shape.
    const arSchema = await loadSchema(join(SCHEMA_DIR, 'assault-rifle.yaml'));
    expect(arSchema.data).toMatchObject({
      assetName: 'AssaultRifle_Data',
      baseDamage: 20,
      magazineSize: 30,
      reloadTime: 2,
    });

    const t5Schema = await loadSchema(join(SCHEMA_DIR, 'team-5v5-tdm.yaml'));
    expect(t5Schema.data).toMatchObject({
      assetName: 'GameMode_Team5v5TDM',
      modeType: 2,
      playersPerTeam: 5,
      scoreLimit: 50,
      matchDurationSeconds: 600,
    });
  });
});
