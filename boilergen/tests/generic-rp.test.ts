import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPlugin } from '../src/core/plugin-loader.js';
import { loadSchema } from '../src/core/schema-loader.js';
import { generate } from '../src/core/generator.js';

const REPO_ROOT = join(__dirname, '..');
const PLUGIN_DIR = join(REPO_ROOT, 'plugins', 'generic-rp');
const SCHEMA_DIR = join(REPO_ROOT, 'schemas', 'generic-rp');

let outDir: string;

beforeEach(async () => {
  outDir = await mkdtemp(join(tmpdir(), 'grp-test-'));
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

const TARGETS = ['cpp-server', 'node-api', 'flutter-admin', 'shared', 'fivem-qb'] as const;

async function generateOne(schemaFile: string) {
  const plugin = await loadPlugin(PLUGIN_DIR);
  const schema = await loadSchema(join(SCHEMA_DIR, schemaFile));
  const result = await generate({
    schema,
    plugin,
    targetRoots: Object.fromEntries(TARGETS.map((t) => [t, join(outDir, t)])),
  });
  expect(result.errors).toEqual([]);
  return result;
}

describe('generic-rp plugin — full FiveM-QB coverage on all 7 entity types', () => {
  it('exposes 51 templates: 4 base targets × 7 entity types + FiveM-QB on all 7', async () => {
    const plugin = await loadPlugin(PLUGIN_DIR);
    expect(plugin.id).toBe('generic-rp');
    expect(plugin.templates).toHaveLength(51);

    const byEntity = plugin.templates.reduce<Record<string, number>>((acc, t) => {
      acc[t.entityType] = (acc[t.entityType] ?? 0) + 1;
      return acc;
    }, {});
    // FiveM-QB target adds:
    //   - job: 5 files (fxmanifest, config, server, client, migration)
    //   - other entities: 3 files each (fxmanifest, config, server) — no
    //     client/migration since their runtime contracts are simpler.
    expect(byEntity).toEqual({
      job: 9,            // 4 base + 5 fivem-qb
      vehicle: 7,        // 4 base + 3 fivem-qb
      weapon: 7,
      business: 7,
      organization: 7,
      family: 7,
      property: 7,
    });
  });

  it('generates business entity with C++ class + grades + node API + Flutter form + i18n', async () => {
    await generateOne('24-7-store.yaml');

    const cpp = await readFile(join(outDir, 'cpp-server', 'Businesses', 'BusinessStore247.cpp'), 'utf-8');
    expect(cpp).toContain('class BusinessStore247 : public BaseBusiness');
    expect(cpp).toContain('BusinessCategory::SHOP');
    expect(cpp).toContain('OwnerType::STATE');
    expect(cpp).toContain('funds_           = 50000;');
    expect(cpp).toContain('"Кассир"');         // grade 0
    expect(cpp).toContain('"Управляющий"');    // grade 2 BOSS

    const node = await readFile(join(outDir, 'node-api', 'businesses', 'store-24-7.controller.ts'), 'utf-8');
    expect(node).toContain("category: 'shop'");
    expect(node).toContain('markupPercent: 25');
    expect(node).toContain('store247BusinessRouter.put');
    expect(node).toContain('store247BusinessRouter.get');

    const flutter = await readFile(join(outDir, 'flutter-admin', 'businesses', 'store_24_7_form.dart'), 'utf-8');
    expect(flutter).toContain('class Store247BusinessForm');

    const locale = JSON.parse(
      await readFile(join(outDir, 'shared', 'i18n', 'store_24_7.locale.json'), 'utf-8'),
    );
    expect(locale['business.store_24_7.name'].ru).toBe('Магазин 24/7');
    expect(locale['business.store_24_7.grade.2'].ru).toBe('Управляющий');
  });

  it('generates organization entity with ranks (level + isLeader) and territories', async () => {
    await generateOne('police-department.yaml');

    const cpp = await readFile(join(outDir, 'cpp-server', 'Organizations', 'OrganizationLspd.cpp'), 'utf-8');
    expect(cpp).toContain('OrgCategory::GOVERNMENT');
    expect(cpp).toContain('color_           = "#1E3A8A";');
    expect(cpp).toContain('maxMembers_      = 80;');
    // 6 ranks, last one is leader
    expect(cpp).toContain('"Курсант"');
    expect(cpp).toContain('{ /* rank 5 */ "Шеф полиции", 5, true },');
    // territories
    expect(cpp).toContain('"downtown_district"');
    expect(cpp).toContain('"airport_zone"');

    const locale = JSON.parse(
      await readFile(join(outDir, 'shared', 'i18n', 'lspd.locale.json'), 'utf-8'),
    );
    expect(locale['organization.lspd.rank.5'].ru).toBe('Шеф полиции');
  });

  it('generates family entity with kinship roles and a property cross-reference', async () => {
    await generateOne('ivanov-family.yaml');

    const cpp = await readFile(join(outDir, 'cpp-server', 'Families', 'FamilyIvanovFamily.cpp'), 'utf-8');
    expect(cpp).toContain('FamilyCategory::CIVILIAN');
    expect(cpp).toContain('housePropertyId_  = "apartment_riverside_204";');
    // Roles capped at 1/1/6
    expect(cpp).toContain('"Глава семьи", true, 1');
    expect(cpp).toContain('"Супруг(а)", false, 1');
    expect(cpp).toContain('"Ребёнок", false, 6');
  });

  it('generates property entity with feature list and ownership', async () => {
    await generateOne('apartment-riverside-204.yaml');

    const cpp = await readFile(
      join(outDir, 'cpp-server', 'Properties', 'PropertyApartmentRiverside204.cpp'),
      'utf-8',
    );
    expect(cpp).toContain('PropertyCategory::APARTMENT');
    expect(cpp).toContain('purchasePrice_    = 250000;');
    expect(cpp).toContain('rentPricePerDay_  = 1500;');
    expect(cpp).toContain('maxOccupants_     = 4;');
    expect(cpp).toContain('ownership_        = "state";');
    // 3 features
    expect(cpp).toContain('"garage_2_slots"');
    expect(cpp).toContain('"storage_50_kg"');
    expect(cpp).toContain('"balcony"');
  });

  it('the existing 3 entity types still generate without regression', async () => {
    // Sanity: adding 4 new entity types must not break the 3 original ones.
    for (const f of ['taxi-driver.yaml', 'bmw-m5.yaml', 'ak47.yaml']) {
      const result = await generateOne(f);
      expect(result.filesCreated.length).toBeGreaterThan(0);
    }
  });

  it('generates a complete FiveM/QBCore resource for a job — manifest + config + server + client + migration', async () => {
    await generateOne('taxi-driver.yaml');
    const fivemRoot = join(outDir, 'fivem-qb', 'jobs', 'taxi-driver');

    // 1. fxmanifest.lua — must declare fx_version, game, dependencies on qb-core,
    //    and NOT have a stale '@qb-core/import.lua' reference (modern convention).
    const manifest = await readFile(join(fivemRoot, 'fxmanifest.lua'), 'utf-8');
    expect(manifest).toContain("fx_version 'cerulean'");
    expect(manifest).toContain("game 'gta5'");
    expect(manifest).toMatch(/dependencies\s*\{\s*'qb-core'/);
    // Modern convention: '@qb-core/import.lua' should not appear in the
    // shared_scripts BLOCK (the comment can mention it as historical context).
    const sharedBlock = manifest.match(/shared_scripts\s*\{[^}]*\}/)?.[0] ?? '';
    expect(sharedBlock).not.toContain('@qb-core/import.lua');

    // 2. config.lua — Config.Job table with all grades.
    const config = await readFile(join(fivemRoot, 'config.lua'), 'utf-8');
    expect(config).toContain("name        = 'taxi_driver'");
    expect(config).toContain("label       = 'Таксист'");
    expect(config).toContain('defaultDuty = true');
    expect(config).toContain('offDutyPay  = false');
    // 4 grades, indexed 0..3
    expect(config).toContain("['0'] = { name = 'Стажёр'");
    expect(config).toContain("['3'] = { name = 'Управляющий', payment = 150, isboss = true }");

    // 3. server/main.lua — registers job via QBCore.Functions.AddJob.
    const server = await readFile(join(fivemRoot, 'server', 'main.lua'), 'utf-8');
    expect(server).toContain("exports['qb-core']:GetCoreObject()");
    expect(server).toContain('QBCore.Functions.AddJob(Config.Job.name');
    expect(server).toContain('taxi-driver:server:paycheck');

    // 4. client/main.lua — registers OnJobUpdate, exposes /toggleduty<Pascal> command.
    const client = await readFile(join(fivemRoot, 'client', 'main.lua'), 'utf-8');
    expect(client).toContain("exports['qb-core']:GetCoreObject()");
    expect(client).toContain("RegisterNetEvent('QBCore:Client:OnJobUpdate'");
    expect(client).toContain('toggledutyTaxiDriver'); // PascalCase command name

    // 5. migrations/001_seed.sql — exists, references entity id.
    const migration = await readFile(join(fivemRoot, 'migrations', '001_seed.sql'), 'utf-8');
    expect(migration).toContain("'taxi_driver'");
    expect(migration).toContain("'Таксист'");
  });

  it('generates FiveM-QB vehicle resource — registers into QBCore.Shared.Vehicles', async () => {
    await generateOne('bmw-m5.yaml');
    const root = join(outDir, 'fivem-qb', 'vehicles', 'bmw-m5');

    const manifest = await readFile(join(root, 'fxmanifest.lua'), 'utf-8');
    expect(manifest).toContain("fx_version 'cerulean'");
    expect(manifest).toMatch(/dependencies\s*\{\s*'qb-core'/);

    const config = await readFile(join(root, 'config.lua'), 'utf-8');
    expect(config).toContain("name      = 'bmw_m5'");
    expect(config).toContain("model     = 'bmw_m5_competition_2024'");
    expect(config).toContain("category  = 'super'");
    expect(config).toContain('price     = 950000');
    expect(config).toContain('tradeable = true');

    const server = await readFile(join(root, 'server', 'main.lua'), 'utf-8');
    expect(server).toContain("exports['qb-core']:GetCoreObject()");
    expect(server).toContain('QBCore.Shared.Vehicles[Config.Vehicle.name]');
    expect(server).toContain('GetHashKey(Config.Vehicle.model)');
  });

  it('generates FiveM-QB weapon resource — registers into QBCore.Shared.Weapons', async () => {
    await generateOne('ak47.yaml');
    const root = join(outDir, 'fivem-qb', 'weapons', 'ak47');

    const config = await readFile(join(root, 'config.lua'), 'utf-8');
    expect(config).toContain("name          = 'ak47'");
    expect(config).toContain("weaponHash    = 'AK47'"); // CONSTANT_CASE
    expect(config).toContain('damage        = 45');
    expect(config).toContain('magazineSize  = 30');
    expect(config).toContain("requiredLicense = 'rifle_class_a'");

    const server = await readFile(join(root, 'server', 'main.lua'), 'utf-8');
    expect(server).toContain('QBCore.Shared.Weapons[hash]');
    expect(server).toContain('GetHashKey(Config.Weapon.weaponHash)');
  });

  it('generates FiveM-QB business resource with grades + funds + markup', async () => {
    await generateOne('24-7-store.yaml');
    const root = join(outDir, 'fivem-qb', 'businesses', 'store-24-7');

    const config = await readFile(join(root, 'config.lua'), 'utf-8');
    expect(config).toContain("name          = 'store_24_7'");
    expect(config).toContain("category      = 'shop'");
    expect(config).toContain("ownerType     = 'state'");
    expect(config).toContain('funds         = 50000');
    expect(config).toContain('markupPercent = 25');
    expect(config).toContain("['0'] = { name = 'Кассир'");
    expect(config).toContain("['2'] = { name = 'Управляющий', payment = 300, isboss = true }");

    const server = await readFile(join(root, 'server', 'main.lua'), 'utf-8');
    expect(server).toContain('_G.BoilergenBusinesses');
    expect(server).toContain("exports('GetBusinessConfig'");
  });

  it('generates FiveM-QB organization resource — gangs slot into QBCore.Shared.Gangs', async () => {
    await generateOne('police-department.yaml');
    const root = join(outDir, 'fivem-qb', 'organizations', 'lspd');

    const config = await readFile(join(root, 'config.lua'), 'utf-8');
    expect(config).toContain("name        = 'lspd'");
    expect(config).toContain("category    = 'government'");
    expect(config).toContain("color       = '#1E3A8A'");
    expect(config).toContain('maxMembers  = 80');
    expect(config).toContain("['5'] = { name = 'Шеф полиции', isboss = true }");
    expect(config).toContain("'downtown_district'");

    const server = await readFile(join(root, 'server', 'main.lua'), 'utf-8');
    // Shared.Gangs registration only fires for gang/mafia categories
    expect(server).toContain("Config.Organization.category == 'gang'");
    expect(server).toContain('_G.BoilergenOrganizations');
  });

  it('generates FiveM-QB family resource with kinship roles (custom convention)', async () => {
    await generateOne('ivanov-family.yaml');
    const root = join(outDir, 'fivem-qb', 'families', 'ivanov-family');

    const config = await readFile(join(root, 'config.lua'), 'utf-8');
    expect(config).toContain("name             = 'ivanov_family'");
    expect(config).toContain("category         = 'civilian'");
    expect(config).toContain('maxMembers       = 8');
    expect(config).toContain("housePropertyId  = 'apartment_riverside_204'");
    expect(config).toContain("name = 'Глава семьи', isHead = true, maxOccupants = 1");
    expect(config).toContain("name = 'Ребёнок', isHead = false, maxOccupants = 6");
  });

  it('generates FiveM-QB property resource with feature list and ownership', async () => {
    await generateOne('apartment-riverside-204.yaml');
    const root = join(outDir, 'fivem-qb', 'properties', 'apartment-riverside-204');

    const config = await readFile(join(root, 'config.lua'), 'utf-8');
    expect(config).toContain("name             = 'apartment_riverside_204'");
    expect(config).toContain("category         = 'apartment'");
    expect(config).toContain('purchasePrice    = 250000');
    expect(config).toContain('rentPricePerDay  = 1500');
    expect(config).toContain('maxOccupants     = 4');
    expect(config).toContain("ownership        = 'state'");
    expect(config).toContain("'garage_2_slots'");
    expect(config).toContain("'balcony'");
  });
});
