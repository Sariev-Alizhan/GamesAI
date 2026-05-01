---
type: game
slug: foundry-vtt
title: Foundry VTT
genre: rpg
engine: custom-js (Electron + Node)
content_format: json
language: typescript
license: proprietary core (paid), MIT/GPL for systems and modules
source_url: https://foundryvtt.com/api/
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: high
tags: [json, document-model, vtt, dnd5e, pf2e, system, module, compendium, active-effects]
---

# Foundry VTT

> A virtual tabletop application for running pen-and-paper RPGs (D&D, Pathfinder, Call of Cthulhu, dozens of others). **The closest publicly-documented analogue to the entity-rich content authoring problem Boilergen targets.** Each "system" (a TTRPG implementation like dnd5e or pf2e) defines an entire schema for items, characters, spells, abilities; modules add content packs against that schema. Tens of thousands of community-authored items, spells, and adventures exist as JSON documents. **High strategic relevance** — this is exactly the entity-content domain Boilergen could power.

## Stack & scale

- **Engine / language:** Node.js + Electron (desktop) or pure server (hosted), TypeScript on the client
- **Open vs proprietary:** Foundry's core is paid + closed-source, but every "system" implementation (the actual game rules) is open-source on GitHub
- **Active systems:** dnd5e (1.5k+ stars), pf2e (700+ stars), CoC, Vampire, Cyberpunk, Star Wars, dozens more
- **Module ecosystem:** thousands of modules on the official Bazaar + community sites
- **Sales:** $50 one-time per GM — niche but loyal market

## Content architecture (the meat)

### Where entities live

Foundry's content lives in three places:

1. **System code** (e.g. https://github.com/foundryvtt/dnd5e) — defines schemas, sheets, dice mechanics. TypeScript with declarative `Schema` definitions.
2. **System packs** (compendiums shipped in the system) — JSON arrays of items/actors/spells. E.g. dnd5e ships hundreds of standard spells in a compendium pack.
3. **Module packs** (community-authored content) — same format, dropped into `worlds/<world>/modules/<module>/packs/`.

### Document model (the central abstraction)

Every entity is a **Document** with a `_id`, `name`, `type`, `system: {...}`, `flags`, `effects` (Active Effects), `ownership`, etc.

Document classes (the type hierarchy):
- `Actor` — characters, NPCs, vehicles
- `Item` — items, spells, features, classes, equipment
- `JournalEntry` — story content
- `Scene` — battle maps, locations
- `Macro` — automation scripts
- `RollTable` — random tables
- `Cards`, `Playlist`, `User`, etc.

Each Document has a system-defined `type` field that selects a sub-schema. E.g. `Item` types in dnd5e: weapon, equipment, consumable, tool, loot, background, class, subclass, spell, feat, race.

### Example — dnd5e Item.weapon document

```json
{
  "_id": "abcd1234efgh5678",
  "name": "Longsword",
  "type": "weapon",
  "img": "icons/weapons/swords/sword-broad-steel.webp",
  "system": {
    "description": { "value": "<p>A versatile martial weapon.</p>" },
    "source": "PHB pg. 149",
    "weight": 3,
    "price": { "value": 15, "denomination": "gp" },
    "rarity": "common",
    "weaponType": "martialM",
    "damage": {
      "parts": [["1d8 + @mod", "slashing"]],
      "versatile": "1d10 + @mod"
    },
    "properties": ["ver"],
    "proficient": null
  },
  "effects": [],
  "flags": {},
  "ownership": { "default": 0 }
}
```

### System schema definition (the dnd5e example)

```typescript
// dnd5e/module/data/item/weapon.mjs (simplified)
export default class WeaponData extends ItemDataModel {
  static defineSchema() {
    return {
      description: new SchemaField({...}),
      source: new StringField({initial: ""}),
      weight: new NumberField({required: true, initial: 0}),
      price: new SchemaField({...}),
      rarity: new StringField({...}),
      weaponType: new StringField({...}),
      damage: new SchemaField({...}),
      properties: new ArrayField(new StringField()),
      proficient: new BooleanField({initial: null, nullable: true})
    };
  }
}
```

This is a strong pattern: **schema definitions live in code with full TypeScript-like typing**, separate from instance data (JSON in compendium packs).

### Compendium packs — the modder's interface

A pack is a folder or LevelDB file containing many JSON documents. Module manifest (`module.json`):

```json
{
  "id": "my-content-pack",
  "title": "Custom Spells Pack",
  "description": "...",
  "version": "1.0.0",
  "compatibility": { "minimum": "12", "verified": "12.331" },
  "relationships": {
    "systems": [{ "id": "dnd5e", "type": "system", "compatibility": {...} }]
  },
  "packs": [
    { "name": "spells", "label": "Custom Spells", "type": "Item", "path": "packs/spells" }
  ]
}
```

Then `packs/spells/` is either a directory of `.json` files (one document per file, modern v12+) or a LevelDB store (legacy).

### Active Effects (data-driven mechanics)

Effects modify other documents declaratively:

```json
{
  "name": "Bless",
  "changes": [
    { "key": "system.bonuses.attack", "mode": 2, "value": "+1d4" }
  ],
  "duration": { "rounds": 10 },
  "transfer": false
}
```

`mode` is an enum: ADD/MULTIPLY/OVERRIDE/UPGRADE/DOWNGRADE/CUSTOM. The engine applies effects when computing actor stats. **A small declarative language for game-effect deltas — pattern worth noting.**

### Localization

- Each module/system ships `lang/<locale>.json` files
- Hierarchical key-value: `"ITEM.TypeWeapon": "Weapon"`, `"DND5E.WeaponPropertiesVer": "Versatile"`
- UI references via `{{localize "ITEM.TypeWeapon"}}` in Handlebars templates
- `i18n.localize()` and `i18n.format()` API in code

### Add-new-content workflow

For a non-coder adding a custom spell pack:

1. Use a tool like **Compendium Folders** module or **Foundry Item Editor** UI to author items in-game
2. Export as compendium pack via right-click → Export
3. Wrap in a `module.json` manifest, zip, distribute via Bazaar / GitHub
4. End users install via "Install Module" button

For a coder authoring directly:

1. Create folder `<modname>/`, `module.json`, `packs/<packname>/<entry>.json`
2. JSON entries match system schema
3. `npm run pack` (or Foundry's CLI) compiles to LevelDB if needed
4. Test via Foundry's "Manifest URL" install

## Patterns worth borrowing

- **Document type hierarchy with sub-types in `system`.** Same pattern as our `schema.type` + `data` split, but with **engine-defined parent classes** (Actor/Item/...) and system-defined sub-types within. **Worth borrowing for Boilergen plugin architecture:** core types (entity), plugin-defined sub-types (profession/weapon/vehicle).
- **Schema definitions in code (DataModel API).** Foundry's `SchemaField`, `StringField`, `NumberField` etc. give TypeScript-like declarations. **Direct analogue to our Zod schemas.** Validates the shape of our approach.
- **Active Effects — declarative effect deltas.** Worth understanding deeply for any future Boilergen feature in the "modify other entities at runtime" space (e.g. status effects, buffs, conditional bonuses).
- **Manifest with compatibility ranges (`compatibility: { minimum, verified, maximum }`).** Sophisticated than `info.json` (Factorio) or `manifest.json` (Stardew). **Borrow this for Boilergen Hub.**
- **Compendiums-as-arrays of documents.** Each entity is one JSON file, the pack is the directory. **Same shape as our `schemas/<plugin>/<entity>.yaml` convention.**

## Anti-patterns / pitfalls

- **LevelDB packs (legacy) are git-hostile.** Foundry v11 → v12 migrated packs from LevelDB to plain JSON folders specifically to fix this. **Lesson:** start with plain text formats; never go binary "for performance" without measuring.
- **Active Effects as a mini-DSL has growth pressure.** Modules increasingly want effects with custom modes, scripts, conditions. The DSL trap noted in `patterns/data-driven-content.md`.
- **System fragmentation.** dnd5e items and pf2e items have completely different `system` schemas. Cross-system content (e.g. a "longsword" usable in both) requires translation layers. **Boilergen's per-plugin isolation matches this reality** — different games need different schemas, that's fine.
- **Versioning of pack content vs module manifest.** A module's version doesn't track individual document changes. Modders accept this; for Boilergen Hub, we should consider per-template versioning.

## How this connects to Boilergen

- **Plugin candidate:** `foundry-vtt-pack` target. Each Boilergen entity → a JSON document in `<plugin>/packs/<entity-type>/<id>.json`. Module manifest co-generated.
- **Entity-type mapping:**
  - Boilergen `weapon` → Foundry `Item type=weapon` (schema varies per system — dnd5e vs pf2e differ)
  - Boilergen `npc` → Foundry `Actor type=npc`
  - Boilergen `profession` → Foundry `Item type=class` or `type=background` (dnd5e specifics)
  - Boilergen `spell` (we don't have this — opportunity) → Foundry `Item type=spell`
- **Strategic fit:** **HIGH.** This is exactly the audience for AI Describe — game designers and TTRPG GMs without coding skills who want to author entity-rich content. A `foundry-vtt-pack` plugin would unlock a real OSS content-creation workflow.
- **What we'd learn from a deep build:** how to handle **system-specific sub-schemas** (dnd5e vs pf2e). Currently Boilergen plugins are flat — one plugin per game. Foundry shows us we might need **plugin-with-sub-systems** in the future.

## References

- **API docs:** https://foundryvtt.com/api/
- **Knowledge base / community wiki:** https://foundryvtt.wiki/en/development
- **dnd5e system source:** https://github.com/foundryvtt/dnd5e
- **pf2e system source (most active community-driven):** https://github.com/foundryvtt/pf2e
- **Module development guide:** https://foundryvtt.com/article/module-development/
- **System development guide:** https://foundryvtt.com/article/system-development/
- **Foundry Bazaar (module hub):** https://foundryvtt.com/packages/
- **Document & DataModel API:** https://foundryvtt.com/api/classes/foundry.documents.Document.html
