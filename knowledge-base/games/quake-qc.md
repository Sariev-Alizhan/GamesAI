---
type: game
slug: quake-qc
title: Quake (1996) — QuakeC and the dawn of data-as-code
genre: fps
engine: id-tech-2
content_format: code
language: quakec
license: gpl-2.0
source_url: https://github.com/id-Software/Quake
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: low
tags: [history, fps, quakec, scripting, data-as-code, modding]
---

# Quake (1996) — QuakeC and the dawn of data-as-code

> Quake's release in 1996 contained one of gaming's first **shipped scripting
> systems for non-engineer authors**: QuakeC (QC), a domain-specific language
> with C-like syntax that compiled to a bytecode (qcvm) the engine
> interpreted at runtime. Every weapon, monster, item, door, and trigger in
> the base game was defined in QC, **not** in the engine's C code. This
> historical entry traces the line from QuakeC → Stardew Valley XML →
> Mindustry Java DSL → Boilergen YAML — a lineage of game devs trying to
> separate **what entities do** from **how the engine runs**.

## Stack & scale (1996)

- **Engine / language:** id Tech 2 (C engine + QuakeC bytecode VM)
- **Lines of code (QC):** ~10,000 across 34 .qc files in `qw-qc/`
- **Author:** John Carmack et al.
- **License (current):** GPL-2 (id Software released the source in 1999)
- **Why it shipped this way:** id wanted modders to extend gameplay without compiling C. QC was the bridge.

## Content architecture

### Entities are functions, not data

The Quake source ships `qw-qc/items.qc`, `qw-qc/weapons.qc`, `qw-qc/monsters.qc` etc. Each weapon is a **function**, not a data struct:

```c
// qw-qc/items.qc — Quake's "data" for the rocket launcher
void() weapon_rocketlauncher =
{
    if (deathmatch <= 3)
    {
        precache_model ("progs/g_rock.mdl");
        precache_model ("progs/missile.mdl");
        // ... more init
        self.classname = "weapon_rocketlauncher";
        setmodel (self, "progs/g_rock.mdl");
        self.weapon = IT_ROCKET_LAUNCHER;
        self.netname = "Rocket Launcher";
        // ... event hooks
    }
};
```

Compare this to a modern data-driven entity in Mindustry's `Items.java`:

```java
copper = new Item("copper", Color.valueOf("d99d73")){{
    hardness = 1;
    cost = 0.5f;
    alwaysUnlocked = true;
}};
```

Or in Boilergen YAML:

```yaml
id: rocket_launcher
type: weapon
data:
  damage: 100
  splashRadius: 200
  ammoType: rockets
  netname: "Rocket Launcher"
```

QC is **code-as-data through function definitions**. Mindustry is **code-as-data through static fields**. Boilergen is **data-as-code through codegen**. Same impulse, three eras of execution.

### Why QC mattered

- **First-class modding** at a time when most games shipped no scripting at all.
- **Hot-recompile loop** for designers — change a weapon, recompile QC, restart server. Faster than rebuilding the C engine.
- **Cross-platform** — QC bytecode ran the same on every supported OS, while C had to be recompiled per platform.

The idea echoed forward into:

- **Half-Life's Source SDK** (entity logic in C++ but driven by `.fgd` data files for the editor)
- **Doom 3's Idtech 4 scripts**
- **UnrealScript** (1998, then deprecated for Blueprints in UE4)
- Modern data-driven content in everything from Stardew Valley to Mindustry to Foundry VTT

## What this teaches us

### 1. The right granularity for "scripting" depends on the team

QuakeC made sense because id had ~12 employees and one designer. They wanted to ship one game well; the cost of writing function-based entity definitions was low for them, and the upside (mod ecosystem) was enormous.

Mindustry's first-party-Java + mod-HJSON two-tier (see [`mindustry.md`](./mindustry.md)) is the same impulse split across two audiences: full Java for the maintainer, JSON-equivalent for everyone else.

Boilergen takes the further step: **data is the source, code is the output**. Designer authors YAML; codegen produces type-safe C# / Lua / TypeScript. The team gets type safety AND a designer-friendly authoring surface, at the cost of a build step.

### 2. Bytecode VMs enable cross-platform without rebuilds

QC's compile-once-run-everywhere predates JavaScript by two years and Java by one. The pattern resurfaced in Lua scripting (used by Beyond All Reason, FiveM, World of Warcraft addons), Ren'Py for visual novels, and modern ECMAScript-flavored embedding (V8 in Unity). For Boilergen, this is a "things to consider" reference — **maybe one of our future targets is a small embedded VM, not just static codegen**. Track for v3+.

### 3. Function-as-entity is a maintenance burden at scale

Quake had ~30 weapons + ~20 monsters. Function-as-entity scaled to that size. At 200 entities, the function form drowns: hard to diff balance changes, hard to enforce field consistency across entities. **Every modern engine that started with function-as-entity migrated to data-driven** within 5-10 years. Boilergen's bet is to skip the function-as-entity phase entirely.

## Anti-patterns

### Behavioural mixing

QC functions like `weapon_rocketlauncher` mix four concerns: model precaching, classname assignment, event handler registration, animation triggering. Splitting these by hand is what every QC mod ended up doing. Modern data-driven approaches separate them by file/field type at the source.

### State machine in a goto chain

Quake's monster behaviour scripts use `nextthink` + function pointers as a state machine. QC doesn't have proper state machines, so monsters' `walk_1`, `walk_2`, `walk_3` chains are functions calling each other via timer. **It works**, but a modern equivalent would use either a state-machine asset (Mindustry's `BehaviorTree`) or an explicit state enum. Don't ship this in 2026 starter templates.

## How this connects to GamesAI

GamesAI's `unity-mobile-shooter` plugin sits in the **opposite corner of the design space** from QC:

- QC: function-as-entity, no schema, runtime VM
- GamesAI: data-as-entity (YAML), explicit schema (`unity-mobile-shooter/weapon`), build-time codegen

We don't ship a runtime VM. Designers don't write code. The trade-off is a build step (Boilergen invocation) for a cleaner authoring surface and stronger compile-time guarantees.

That said — **if Boilergen ever needs to support live-editable entities** (e.g. an admin panel that lets server staff hot-tune a job's grades without redeploy), we'd be reaching for QC's idea: a small VM consumed by the deterministic code. That's a v4 conversation.

## References

- Quake source repo: https://github.com/id-Software/Quake (GPL-2)
- QuakeC source files: `qw-qc/` and `WinQuake/qc/` directories
- John Carmack's `.plan` files (historical context for QC design choices): https://github.com/floft/carmack-plans
- Compare to: [`games/mindustry.md`](./mindustry.md) (Java DSL approach), [`patterns/data-driven-content.md`](../patterns/data-driven-content.md) (modern approach)
