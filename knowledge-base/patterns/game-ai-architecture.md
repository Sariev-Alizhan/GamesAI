---
type: pattern
slug: game-ai-architecture
title: Game AI architecture — behavior trees, utility AI, GOAP, FSM, HFSM
engine: other
content_format: mixed
language: csharp
license: open patterns / OSS implementations
source_url: https://en.wikipedia.org/wiki/Behavior_tree_(artificial_intelligence,_robotics_and_control)
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [game-ai, behavior-trees, utility-ai, goap, fsm, npcs]
---

# Game AI architecture — classical NPC decision-making patterns

> This entry is about **classical game AI**: the structured, deterministic,
> debuggable patterns that drive NPC behavior, opponent decisions, and ambient
> simulation in shipped games. It is **explicitly not** about generative AI for
> final game content. Generative AI for final art, dialogue, code, or music is
> in this project's red zones (see `project_red_zones`) and stays out of scope
> here.

---

## 1. What "game AI" means in 2026

When a designer says "the AI" inside a game studio, they almost never mean a
neural network. They mean the deterministic decision-making layer that picks
what an NPC does each tick — patrol vs chase vs flee, which cover slot to
take, when to reload, when to bark a line. The same layer drives opponent
behavior in a strategy game, ambient pedestrian simulation in an open world,
and the meta-orchestrator that decides when to spawn the next horde. It is a
solved field with four dominant patterns (FSM, BT, Utility AI, GOAP), a small
set of OSS implementations per engine, and roughly thirty years of postmortems
documenting their tradeoffs. **None of the patterns described below involve
generative models.** They are graphs and scoring functions evaluated on a
per-tick budget — debuggable, testable, and shippable. Generative AI for
final game content (writing the actual NPC dialogue, drawing the actual
texture, composing the actual track) is a separate question with separate
ethical and licensing problems, and this entry deliberately stays clear of it.

---

## 2. The four major patterns

### 2.1 Finite State Machine (FSM) and Hierarchical FSM (HFSM)

The simplest pattern: a fixed set of **states** and a set of **transitions**
between them. Each tick, the NPC is in exactly one state; transitions fire
when their guard conditions become true.

```
states:  [Idle, Patrol, Chase, Attack, Flee, Dead]
transitions:
  Idle -> Patrol     when timer > 5s
  Patrol -> Chase    when player_visible and distance < 30m
  Chase -> Attack    when distance < 5m
  Attack -> Flee     when health < 20%
  *      -> Dead     when health <= 0
```

Pros: trivially debuggable (you can see the current state), trivially
serializable (one enum), trivially testable (state × event matrix).

Cons: the transition table grows quadratically. Past about 20 states it
becomes a tangled mess where every new state requires touching N edges.

**HFSM** (Hierarchical FSM) is the standard mitigation: states can themselves
contain a sub-FSM. `Combat` becomes a parent state whose internal FSM has
`Attack`, `Reposition`, `Reload`, `TakeCover`. The parent FSM only sees
`Combat`. This nests cleanly and is what most "FSM" implementations in real
shipped games actually are.

### 2.2 Behavior Trees (BT)

A tree of **composite nodes** orchestrating **leaf nodes**. Each tick the
tree is traversed root-to-leaf and each node returns Success / Failure /
Running.

Composite node types:

- **Sequence** — runs children in order; fails on first child that fails
  (logical AND).
- **Selector** (a.k.a. Fallback) — runs children in order; succeeds on first
  child that succeeds (logical OR).
- **Parallel** — runs all children concurrently with a configurable
  success/failure policy.
- **Decorator** — wraps a child with a modifier (Inverter, Repeater,
  TimeLimit, Cooldown).

Leaves:

- **Action** — does something in the world (move, shoot, play animation).
- **Condition** — checks something (is enemy visible, am I low on health).

```
Selector (root)
├── Sequence: Combat
│   ├── Condition: EnemyVisible
│   ├── Selector: EngageOrFlee
│   │   ├── Sequence: Flee
│   │   │   ├── Condition: HealthLow
│   │   │   └── Action: RunToCover
│   │   └── Sequence: Engage
│   │       ├── Action: AimAtEnemy
│   │       └── Action: Fire
└── Sequence: Idle
    ├── Action: Wander
    └── Action: PlayAmbientBark
```

BTs are **modular** (subtrees compose), **designer-friendly** (visual editors
are universal), and **inspectable at runtime** (highlight the active path).
Used in Halo 2 (the modern reference), every Sony first-party studio's shipped
title since roughly 2010, Bungie titles, most Unreal Engine third-party
projects, and as the default NPC AI pattern in both Unreal and Unity asset
ecosystems.

### 2.3 Utility AI

Each candidate **action** has a **score function** evaluated over the world
state; the AI picks the highest-scoring action each decision tick. Score
functions are typically products of normalized curves (linear, quadratic,
sigmoid, threshold) over inputs like distance, health, ammo, and time-since.

```
score("attack")  = curve_distance(distance) *
                   curve_ammo(ammo)         *
                   curve_health(health)
score("retreat") = curve_distance(distance) *
                   curve_health(1 - health) *
                   curve_cover(nearest_cover_distance)
score("idle")    = 0.05  // baseline
```

The Sims is the canonical example: every Sim object in the world advertises
"interactions" with utility scores against the Sim's current need vector
(hunger, fun, social, bladder). The Sim picks the object whose interaction
maximizes utility.

Pros: **less brittle** than BTs because there is no enumerated transition
table — adding a new action only requires writing its score function, and the
system continues to work. Naturally produces emergent and varied behavior.

Cons: **harder to debug** ("why did it pick that?" requires inspecting all
score functions and intermediate curves), and balancing the curves so the
right thing is picked in edge cases is notoriously fiddly.

### 2.4 GOAP (Goal-Oriented Action Planning)

An **A\*-like planner** that searches over a graph of actions, where each
action declares **preconditions** (world state required) and **effects**
(world state after). Given a **goal** (a desired world state) the planner
returns a **plan** — a sequence of actions whose combined effects achieve the
goal.

```
action: ReloadGun
  preconditions: { has_gun: true, has_ammo: true }
  effects:       { gun_loaded: true }
  cost: 2

action: KillEnemy
  preconditions: { enemy_visible: true, gun_loaded: true }
  effects:       { enemy_dead: true }
  cost: 5

goal: { enemy_dead: true }
=> plan: [ReloadGun, KillEnemy]
```

F.E.A.R. (Monolith, 2005) is the canonical reference and the talk that put
GOAP on the map for game devs. The Soldier AI famously felt smart because the
planner discovered tactically coherent multi-step plans (flank, suppress,
flush) emergently.

Pros: NPCs can **construct** behavior the designer didn't pre-author. Plans
read as intentional and intelligent.

Cons: **runtime cost is real**. The planner runs A* over the action space
every time the world changes meaningfully. F.E.A.R. shipped with roughly five
to seven simultaneous planners on Xbox-360-era hardware; pushing past
ten on modern hardware still requires careful budget management. Rarely
practical for crowd or open-world ambient AI.

---

## 3. Decision tree — picking a pattern

| NPC type                                  | Recommended pattern    | Why                                                                 |
| ----------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| Mobile-game grunt with 4-6 behaviors      | FSM                    | Trivial, cheap, no asset dependencies                               |
| Open-world ambient pedestrian             | HFSM or simple BT      | Need scale, not depth                                               |
| Shooter combatant (cover-based)           | BT                     | Designer authoring + composability is the killer feature            |
| Stealth game guard with perception        | BT + sensory layer     | BT for decisions, separate perception system for inputs             |
| The Sims-style life-sim agent             | Utility AI             | Emergence and need-balancing matter more than designer authoring    |
| Tactical squad AI (flanking, suppression) | GOAP (or BT + planner) | Multi-step intentional plans are the value proposition              |
| Strategy game faction AI                  | Utility AI + scripts   | Score-based macro decisions over a wide action space                |
| Boss with scripted phases                 | HFSM                   | Phases are states; scripted authoring is the point                  |
| Meta-orchestrator (director)              | Custom (see section 6) | Different problem entirely — not per-NPC, see AI Director           |

---

## 4. OSS and commercial implementations

License each one before depending on it. The implementations below are the
ones that actually ship; "asset-store BT plugin #47" is not a serious choice.

| Implementation         | Engine     | License             | Notes                                                                 |
| ---------------------- | ---------- | ------------------- | --------------------------------------------------------------------- |
| Behavior Designer      | Unity      | Commercial (Opsive) | Most-used Unity BT in production; mature; visual editor               |
| NodeCanvas             | Unity      | Commercial          | BT + FSM + Utility AI in one plugin; visual editor                    |
| Owlcat-Ink Behavior Tree | Unity    | MIT                 | Actually-OSS Unity BT; smaller community than the commercial options  |
| Unreal Behavior Trees  | Unreal     | Engine source       | First-party BT + Blackboard system; the Unreal default                |
| StateTree              | Unreal     | Engine source       | Newer first-party hybrid BT/HFSM; Epic is pushing it as BT successor  |
| bevy_behave            | Bevy / ECS | MIT/Apache-2.0      | BT designed for Bevy's ECS; idiomatic Rust component model            |
| LimboAI                | Godot      | MIT                 | Mature BT + HFSM plugin for Godot 4; the de-facto Godot BT            |
| Beehave                | Godot      | MIT                 | Pure-GDScript BT; lighter weight than LimboAI                         |
| Utility-AI (open impls)| any        | various             | Far less standardized than BTs; most teams roll their own             |

For GOAP specifically, no OSS implementation has reached the maturity of BT
plugins — most shipped GOAP systems are bespoke per studio. CrashGOAP and a
handful of Unity asset-store packages exist; treat them as references rather
than dependencies.

---

## 5. Sensory architecture — the vital companion

A common rookie mistake: wiring NPC decisions directly to ground-truth game
state. The NPC "sees" the player by querying the player's transform; it
"hears" gunfire by querying a global event bus. The result feels like
**cheating AI** — the NPC reacts to information the player cannot observe and
the player notices immediately.

The fix is a **perception system** layered between the world and the
decision-maker:

```
World state ──► Sensors ──► Perception/Memory ──► BT/FSM/Utility leaves
                (sight,     (last-known-position,
                hearing,     confidence, decay,
                smell)       investigation-targets)
```

Sensors model real constraints: cone-of-vision angles, occlusion checks,
hearing radii falloff with surface and distance, line-of-sight raycasts.
Perception buffers convert raw sensor hits into NPC-owned beliefs with
confidence and decay (the NPC saw you 3 seconds ago at position X; confidence
decays linearly to zero over 8 seconds). The decision layer queries beliefs,
not ground truth.

F.E.A.R. is again the canonical reference: its perception system was as much
of the AI's reputation as the GOAP planner. The Soldiers felt smart because
the planner had **realistic** inputs to plan over — they investigated
last-known positions, lost the player when the player broke line-of-sight,
and committed to wrong guesses in human-feeling ways.

For RP-server NPC scripting this matters less when NPCs are pure quest givers
but matters a lot the moment NPCs become hostile or investigative — anti-cheat
NPCs, gang AI, police pursuit logic.

---

## 6. The AI Director pattern

A separate layer **above** per-NPC AI: a meta-AI that orchestrates **pacing**.
It does not control individual NPCs; it decides when to spawn waves, when to
grant a breather, when to escalate intensity, when to drop loot.

Left 4 Dead's Director is the canonical reference and the talk Valve gave on
it remains the cleanest exposition. The Director tracks per-player **stress**
(damage taken, time-since-last-event, distance-from-team) and uses it to
schedule horde spawns, special-infected placements, and item drops to keep the
group inside a target stress band.

The pattern generalizes well beyond zombie shooters. Any game with a
designer-controlled tension curve benefits from a Director-shaped layer —
RP-server event scheduling, dynamic open-world events, roguelike encounter
generation. Conceptually it is just "Utility AI applied to the world rather
than to an NPC," with the score function maximizing fun rather than NPC
self-interest.

---

## 7. Concrete RP-server use cases

**Today (QBCore baseline):** NPC scripts in QBCore servers and the wider FiveM
ecosystem are almost universally simple FSMs — Idle, Patrol, Aggressive,
Dead — implemented inline in Lua resource scripts. There is no shared
abstraction. Each resource reinvents the same handful of states with subtly
different transition rules.

**Near-term opportunity:** a designer-authored, server-side BT runtime for
NPCs reacting to RP rule violations. Grand Games's RP rule vocabulary
(`MG`/`PG`/`DM`/`RK`/`TK` — see `project_grand_games_rp`) maps naturally to
BT condition leaves: `IsPlayerCommittingDM`, `IsPlayerInRKWindow`,
`IsModeratorOnline`. Action leaves wrap existing moderation primitives:
`SpawnNPCWitness`, `LogToModerationQueue`, `EscalateToAdmin`.

```
Selector: NPCWitnessReaction
├── Sequence: WitnessDM
│   ├── Condition: IsPlayerCommittingDM
│   ├── Condition: NPCHasLineOfSight
│   ├── Action: PlayPanicAnimation
│   └── Action: LogToModerationQueue
├── Sequence: WitnessRobbery
│   ├── Condition: IsRobberyInProgress
│   ├── Condition: IsCivilianClass
│   └── Action: CallPoliceNPC
```

A YAML schema describing the tree, compiled per-server to a runtime FSM/BT
representation, would let server admins author NPC behavior the same way
they author jobs and businesses today — and would inherit the RP rule
vocabulary instead of reinventing it.

**Cross-link:** the moderation/permission shape lives in
`role-grade-hierarchy.md`; the per-rule moderation flow is the natural
consumer of NPC-witness BT outputs.

---

## 8. Mobile constraints

The four patterns scale very differently:

| Pattern    | Cost per NPC per tick | Scale ceiling on mobile |
| ---------- | --------------------- | ----------------------- |
| FSM        | O(1) — constant       | Hundreds                |
| HFSM       | O(depth)              | Hundreds                |
| BT         | O(active path length) | ~50-100 with full ticks |
| Utility AI | O(actions × inputs)   | Tens to ~50             |
| GOAP       | O(plan-search)        | Single digits           |

For a mobile multiplayer scenario with 32+ NPCs (Grand Mobile-class — see
`project_grand_mobile_and_personal_unity`), the survival strategy is
universal:

1. **Distance-based tick-rate throttling.** NPCs near the player tick at full
   rate; NPCs at medium distance tick every Nth frame; NPCs far from any
   player tick on the order of once per second or freeze entirely.
2. **Spatial culling.** NPCs outside any active player's area-of-interest are
   suspended, not just throttled.
3. **Behavior LOD.** Far-away NPCs run a degraded BT (only the patrol/idle
   subtree); close NPCs run the full tree.
4. **Server authority over plans.** GOAP plan-search runs server-side and
   pushes the resulting linear plan to clients as data; clients execute the
   plan as a simple FSM.

These are not optimizations to bolt on later. They are architectural and
must be in the BT/FSM runtime from day one; retrofitting tick-rate throttling
to a per-NPC BT that assumes constant tick rate is painful.

---

## 9. What Boilergen could do

Boilergen's existing schema entry types (`job`, `business`, `organization`)
all share the role-grade-hierarchy shape. NPC behavior is the next entry
type that would fit cleanly:

- **Future entry type: `npc-behavior`.** YAML state-machine description in,
  BT scaffolding out — initially Lua for QBCore, optionally C# for Unity and
  GDScript for Godot once the cross-engine knowledge-base broadens.
- **Engine-aware emit.** Same input YAML; per-engine compiler. The engine
  difference is mostly in the leaf-action API surface (how do you raycast,
  how do you trigger an animation), not in the BT topology.
- **Cross-link to `role-grade-hierarchy.md`.** RP rule reactions live at the
  intersection of NPC behavior and moderation hierarchy; the schema for
  "which NPC ranks can witness which violation" reuses the grades pattern.
- **Cross-link to `procedural-generation.md`** (where it exists). Procedural
  NPC personalities are best modeled as parameter ranges over BT leaf
  thresholds — aggression threshold, flee health-percent, patrol radius.
  The BT topology stays fixed; the leaf parameters become a generator.

The pattern is exactly the one Boilergen has already validated three times
over: a small YAML, a code-generator, an opt-in adoption story for server
owners. NPC behavior is the same shape applied to a new domain.

---

## 10. Pitfalls

- **BT bloat.** A combat NPC with 30+ behaviors becomes a BT with hundreds
  of nodes and unmaintainable copy-paste subtrees. Mitigation: subtree
  references (Behavior Designer and NodeCanvas both support these),
  parameterized subtrees, and ruthless refactoring.
- **FSM transition explosion.** Past ~20 states the transition matrix has
  ~400 cells and you start missing transitions in code review. The HFSM
  refactor is mandatory long before that point.
- **GOAP runtime cost.** More than 5-10 simultaneous planners and your
  frame budget is gone. Cap plan-search depth, cache plans across ticks,
  and run plan-search on a worker thread.
- **Utility AI scoring is hard to balance.** The first three NPCs are easy;
  the fourth introduces an interaction the curves did not anticipate, and
  you spend two days re-tuning. Mitigate with logging-of-scores tooling
  from day one — a designer needs to be able to ask "why did it pick that"
  and get a per-action score breakdown.
- **Visual-editor vs code source-of-truth war.** Designers want to author
  in a visual editor; programmers want behavior in version-controllable
  code. Pick one source of truth and treat the other as derived. Most
  teams that try to keep both in sync end up with neither working.
- **Perception as an afterthought.** NPCs hooked directly to ground-truth
  player state always feel like cheating. Build the perception layer first;
  the BT comes second.
- **Mobile tick-rate retrofit.** As covered in section 8 — distance-based
  throttling is architectural, not an optimization.
- **Generative-AI temptation.** "Why not have an LLM pick the next action?"
  Because it is non-deterministic, expensive at runtime, ungamerstandable,
  unmoderatable, untranslatable into the languages your players actually
  speak, and uninspectable in a postmortem. The four patterns above are
  the answer; LLMs are not.

---

## 11. References

- **AI Game Programming Wisdom** (Charles River Media, 4 volumes, 2002-2008)
  — the foundational anthology; still the right starting point.
- **AI for Games** by Ian Millington (3rd ed., CRC Press, 2019) — the
  textbook; covers all four patterns in production-grade depth.
- **Damian Isla, "Handling Complexity in the Halo 2 AI" (GDC 2005)** — the
  paper that put BTs on the map for game devs.
- **Jeff Orkin, "Three States and a Plan: The AI of F.E.A.R." (GDC 2006)**
  — the GOAP postmortem.
- **Mike Booth, "The AI Systems of Left 4 Dead" (AIIDE 2009)** — the AI
  Director paper.
- **Robin Hunicke et al., "MDA: A Formal Approach to Game Design and Game
  Research"** — frames AI Director-shaped systems in design terms.
- **GDC AI Summit talks** (2010-present, vault.gdcconf.com) — annual,
  practitioner-focused, the single best source for what is actually
  shipping.
- **Wikipedia: Behavior tree (AI, robotics and control)** —
  https://en.wikipedia.org/wiki/Behavior_tree_(artificial_intelligence,_robotics_and_control)

---

## 12. Bottom line

Classical game AI is a mature, well-documented field with four dominant
patterns and a clean per-engine OSS landscape. For Grand Games and the
broader RP-server ecosystem the immediate value is the BT pattern wrapped in
a YAML schema and emitted as Lua — the Boilergen-shaped intervention applied
to NPC behavior. None of this requires generative AI, and going there would
trade debuggability, moderation, and player trust for a marginal authoring
convenience. The four patterns above are the answer.
