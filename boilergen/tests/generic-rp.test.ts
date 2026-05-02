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

const TARGETS = ['cpp-server', 'node-api', 'flutter-admin', 'shared'] as const;

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

describe('generic-rp plugin (extended with business / organization / family / property)', () => {
  it('exposes 7 entity types × 4 targets = 28 templates', async () => {
    const plugin = await loadPlugin(PLUGIN_DIR);
    expect(plugin.id).toBe('generic-rp');
    expect(plugin.templates).toHaveLength(28);

    const byEntity = plugin.templates.reduce<Record<string, number>>((acc, t) => {
      acc[t.entityType] = (acc[t.entityType] ?? 0) + 1;
      return acc;
    }, {});
    expect(byEntity).toEqual({
      job: 4,
      vehicle: 4,
      weapon: 4,
      business: 4,
      organization: 4,
      family: 4,
      property: 4,
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
});
