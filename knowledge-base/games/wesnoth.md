---
type: game
slug: wesnoth
title: "Battle for Wesnoth (WML)"
genre: rts
engine: custom-cpp
content_format: text (WML)
language: cpp
license: GPL v2+
source_url: https://github.com/wesnoth/wesnoth
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: low
tags: [wml, custom-dsl, turn-based-strategy, units, scenarios, eras, addon-server]
---

# Battle for Wesnoth (WML)

> Open-source turn-based fantasy strategy game, in active development since 2003. Defines its own markup language — WML (Wesnoth Markup Language) — for content. Studied here as an example of **a custom DSL that grew over 20 years**: WML started simple and now supports macros, conditionals, includes, and ML-style branching. Strong cautionary tale for the "data DSL trap" pattern, plus a working example of **in-game add-on distribution** (built-in download server for community mods).

## Stack & scale

- **Engine / language:** C++ + WML for all content + Lua for advanced scripting
- **Active development:** 22 years, regular releases
- **Mainline content:** ~25 official campaigns + ~15 unit factions across multiple eras
- **Add-on server:** thousands of community add-ons available via in-game download
- **Active contributors:** dozens, mature codebase

## Content architecture (the meat)

### Where entities live

Inside the game data folder (or any add-on):

```
data/
  core/
    units/
      humans/
        Loyalists/
          fighter.cfg
          horseman.cfg
          ...
      elves/
      orcs/
      ...
    eras/
      era_default.cfg
      era_heroes.cfg
    multiplayer/
      _main.cfg
      maps/
      scenarios/
    macros/
      ai/
      utils/
      items/
    terrain.cfg
    terrain-graphics.cfg
  campaigns/
    Heir_To_The_Throne/
      _main.cfg
      scenarios/
      maps/
      music/
      utils/
```

Add-ons follow the same layout under `~/.local/share/wesnoth/<version>/data/add-ons/<name>/`.

### WML format

WML is a custom hierarchical markup that *looks* like INI but allows nesting:

```
[unit_type]
    id=Elvish Fighter
    name= _ "Elvish Fighter"
    race=elf
    image="units/elves-wood/fighter.png"
    profile="portraits/elves/fighter.png"
    hitpoints=33
    movement_type=woodland
    movement=5
    experience=40
    level=1
    alignment=neutral
    advances_to=Elvish Captain
    cost=14
    usage=fighter
    description= _ "Elves are not warlike by nature, but..."
    [resistance]
        blade=80
        pierce=80
        impact=90
        fire=100
        cold=100
        arcane=110
    [/resistance]
    [attack]
        name=sword
        description= _ "sword"
        type=blade
        range=melee
        damage=5
        number=4
        icon=attacks/sword-elven.png
    [/attack]
    [attack]
        name=bow
        type=pierce
        range=ranged
        damage=3
        number=3
    [/attack]
[/unit_type]
```

Notes:
- Tags wrap with `[name]...[/name]` (HTML-style closing tags)
- Translation marker: `_ "..."` — strings prefixed with underscore-space are extracted for gettext
- Hierarchy is explicit — `[attack]` inside `[unit_type]`
- Order does NOT matter within a tag (unlike DF's order-dependent raws)

### Macros — WML's escape hatch

WML supports user-defined macros via `#define`:

```
#define UNIT_DEFAULT_DAMAGE_RES BLADE PIERCE IMPACT FIRE COLD ARCANE
[resistance]
    blade={BLADE}
    pierce={PIERCE}
    impact={IMPACT}
    fire={FIRE}
    cold={COLD}
    arcane={ARCANE}
[/resistance]
#enddef

# Usage:
{UNIT_DEFAULT_DAMAGE_RES 80 80 90 100 100 110}
```

This crossed the line into a "real" programming language — macros, conditionals (`{IFDEF}`), includes (`{~add-ons/...}`).

### Lua — for what WML can't do

WML can't express runtime logic or complex AI. Wesnoth embeds Lua:

```
[event]
    name=start
    [lua]
        code=<<
            wesnoth.message("Hello from Lua!")
        >>
    [/lua]
[/event]
```

This is **the right answer to the data-DSL trap** — when WML was about to become a programming language, the team embedded Lua instead of growing WML further.

### Entity types we care about

#### Unit (`[unit_type]`)
- Hitpoints, movement type, attacks, resistances
- `advances_to:` for unit progression (level up to Captain → Marshal)
- `usage:` for AI hint (fighter / mixed / archer / scout)
- `[attack]` sub-blocks for each attack mode
- Closest WML analogue to our `weapon` + `npc` combined

#### Faction (`[multiplayer_side]`)
- Leader unit, recruit list (which units can be recruited), playable colors
- Used in eras to define the available factions

#### Era (`[era]`)
- A bundle of factions playable in multiplayer
- Mainline: era_default, era_heroes, era_khalifate, etc.

#### Scenario (`[scenario]`)
- Map, victory conditions, starting units, story events
- The most complex WML structure; heavy use of events + Lua

#### Profession-equivalent
- Not really. Closest is `usage:` on units (fighter/scout/mixed) — strategic role.

### Localization

- Built-in translation system using gettext
- Strings marked with `_ "..."` syntax extracted to `.po` files
- Add-on authors translate independently
- Mature: 50+ languages with ongoing maintenance

### Add-new-content workflow (modder)

For an add-on author creating a new unit:

1. Make folder `~/.local/share/wesnoth/<version>/data/add-ons/<name>/`
2. Add `_server.pbl` (publish manifest) + `_main.cfg` (entry point)
3. Add unit definition in `units/<faction>/<unit>.cfg`
4. Add sprites in `images/units/...`
5. Run game; add-on shows up in campaigns / multiplayer
6. Click "Publish" in-game add-on manager → uploads to add-on server
7. Other players download via in-game add-on browser

**Built-in add-on distribution server** is unique among the games surveyed. Eliminates the Nexus/CurseForge dependency.

## Patterns worth borrowing

- **In-game add-on distribution.** Built-in download/upload server eliminates external hosting friction. **Worth borrowing for Boilergen Hub** — direct integration could matter for adoption.
- **Translation markers in data (`_ "..."`).** Strings are inline with content but auto-extracted for translation. **Cleaner than separate keys-and-values systems** when the translation surface is small.
- **Embedded Lua over expanded markup.** When WML was about to grow conditionals + loops + variables, the team embedded Lua. **The lesson:** for control flow, embed a real language; don't grow YAML.
- **Hierarchical, order-independent tags.** Unlike DF raws (order-dependent state machine), WML's `[attack]` inside `[unit_type]` is explicitly nested and order-independent. Easier to read, easier to mod.

## Anti-patterns / pitfalls

- **WML accumulated 20 years of features.** Macros, conditionals, includes, deprecation warnings — modern WML files reference patterns from 2005. Onboarding is hard; documentation is patchy.
- **Custom DSL with limited tooling.** No first-class IDE support (some Wesnoth-specific Sublime/Emacs modes exist). No JSON Schema equivalent. Modders learn by reading existing units.
- **Translation strings inline with code.** Easier per-string but harder to bulk-update than a separate `i18n/` folder. Trade-off; OpenRA's Fluent approach is cleaner at scale.
- **Add-on server fragility.** Centralized; when it goes down, all add-on distribution stops. Hub-style decentralized (via GitHub URLs) is more robust.

## How this connects to Boilergen

- **Plugin candidate:** `wesnoth-wml` target. Each Boilergen entity → a `.cfg` file in WML format with translation markers.
- **Entity-type mapping:**
  - Boilergen `weapon` → WML `[unit_type] [attack]` sub-block (weapons are not first-class entities in Wesnoth — they're attached to units)
  - Boilergen `npc` → WML `[unit_type]`
  - Boilergen `vehicle` → no fit (no vehicles in turn-based strategy)
  - Boilergen `profession` → no fit
- **Strategic fit:** **LOW.** Niche audience, idiosyncratic format, declining mod scene. Worth understanding for the patterns; not worth building a plugin for unless requested.
- **Lessons we apply elsewhere:**
  - Reject custom DSL temptation; YAML is good enough, embed scripting languages for logic
  - **Built-in distribution > external** — Boilergen Hub should consider in-tool (Boilergen CLI command) plus web for the marketplace
  - Translation as inline markers vs separate files — trade-off worth knowing case-by-case

## References

- **WML Syntax Reference:** https://wiki.wesnoth.org/SyntaxWML
- **Unit Type WML reference:** https://wiki.wesnoth.org/UnitTypeWML
- **Creating Units tutorial:** https://wiki.wesnoth.org/CreatingUnits
- **Lua API:** https://wiki.wesnoth.org/LuaAPI
- **Add-on server protocol:** https://wiki.wesnoth.org/AddonServerProtocol
- **Source repo:** https://github.com/wesnoth/wesnoth
- **Add-on browser:** https://addons.wesnoth.org/
