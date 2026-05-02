import { describe, it, expect } from 'vitest';
import { parseFxManifest, getString, getArray } from '../src/fivem/parser.js';

describe('parseFxManifest — basic shapes', () => {
  it('parses single-string fields with single quotes', () => {
    const m = parseFxManifest(`
      fx_version 'cerulean'
      game 'gta5'
      author 'A. Lizhan'
    `);
    expect(getString(m, 'fx_version')).toBe('cerulean');
    expect(getString(m, 'game')).toBe('gta5');
    expect(getString(m, 'author')).toBe('A. Lizhan');
  });

  it('parses single-string fields with double quotes', () => {
    const m = parseFxManifest(`fx_version "cerulean"`);
    expect(getString(m, 'fx_version')).toBe('cerulean');
  });

  it('parses long-bracket [[...]] strings (multi-line description)', () => {
    const m = parseFxManifest(`
      description [[Multi-line
description here]]
    `);
    expect(getString(m, 'description')).toContain('Multi-line');
    expect(getString(m, 'description')).toContain('description here');
  });

  it('parses array fields (table literals)', () => {
    const m = parseFxManifest(`
      shared_scripts {
        '@ox_lib/init.lua',
        'config.lua',
      }
      dependencies { 'qb-core', 'oxmysql' }
    `);
    expect(getArray(m, 'shared_scripts')).toEqual(['@ox_lib/init.lua', 'config.lua']);
    expect(getArray(m, 'dependencies')).toEqual(['qb-core', 'oxmysql']);
  });

  it('treats keys case-insensitively', () => {
    const m = parseFxManifest(`FX_VERSION 'cerulean'`);
    expect(getString(m, 'fx_version')).toBe('cerulean');
    expect(getString(m, 'FX_VERSION')).toBe('cerulean');
  });

  it('preserves order of keys via order array', () => {
    const m = parseFxManifest(`
      fx_version 'cerulean'
      game 'gta5'
      author 'X'
    `);
    expect(m.order).toEqual(['fx_version', 'game', 'author']);
  });
});

describe('parseFxManifest — comments', () => {
  it('strips line comments', () => {
    const m = parseFxManifest(`
      -- this is a comment
      fx_version 'cerulean' -- inline
      -- another
      game 'gta5'
    `);
    expect(getString(m, 'fx_version')).toBe('cerulean');
    expect(getString(m, 'game')).toBe('gta5');
  });

  it('strips multi-line block comments', () => {
    const m = parseFxManifest(`
      --[[
        Block comment with
        multiple lines and 'string-looking' bits
      ]]
      fx_version 'cerulean'
    `);
    expect(getString(m, 'fx_version')).toBe('cerulean');
  });
});

describe('parseFxManifest — robustness', () => {
  it('does not throw on full Lua we do not understand', () => {
    const m = parseFxManifest(`
      local foo = 1
      if foo == 1 then
        fx_version 'cerulean'
      end
      game 'gta5'
    `);
    expect(() => parseFxManifest('local x = function() end')).not.toThrow();
    expect(getString(m, 'fx_version')).toBe('cerulean');
    expect(getString(m, 'game')).toBe('gta5');
  });

  it('marks unrecognised shapes as unknown without crashing', () => {
    const m = parseFxManifest(`
      weird_field { ['nested'] = { 'a', 'b' } }
      fx_version 'cerulean'
    `);
    expect(m.fields.get('weird_field')?.kind).toBe('unknown');
    expect(getString(m, 'fx_version')).toBe('cerulean');
  });

  it('records unterminated string as parse issue but keeps parsing', () => {
    const m = parseFxManifest(`
      author 'broken
      fx_version 'cerulean'
    `);
    expect(m.parseIssues.length).toBeGreaterThan(0);
    // Even with the bad string, downstream key still parsed
    expect(m.fields.has('fx_version')).toBe(true);
  });
});

describe('parseFxManifest — real-world fixtures', () => {
  it('handles a typical qb-core-style manifest', () => {
    const m = parseFxManifest(`
fx_version 'cerulean'
game 'gta5'

author 'QBCore'
description 'Roleplay Framework'
version '1.2.6'

shared_scripts {
    '@ox_lib/init.lua',
    'shared/locale.lua',
    'shared/main.lua',
}

client_scripts {
    'client/main.lua',
    'client/events.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/main.lua',
    'server/player.lua',
}

files {
    'locale/en.lua',
}

dependencies {
    'oxmysql',
    'ox_lib',
}

lua54 'yes'
    `);
    expect(getString(m, 'fx_version')).toBe('cerulean');
    expect(getString(m, 'game')).toBe('gta5');
    expect(getString(m, 'version')).toBe('1.2.6');
    expect(getArray(m, 'shared_scripts')).toContain('@ox_lib/init.lua');
    expect(getArray(m, 'server_scripts')).toContain('@oxmysql/lib/MySQL.lua');
    expect(getArray(m, 'dependencies')).toEqual(['oxmysql', 'ox_lib']);
    expect(getString(m, 'lua54')).toBe('yes');
  });
});
