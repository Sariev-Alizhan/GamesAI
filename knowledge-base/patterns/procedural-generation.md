---
type: pattern
slug: procedural-generation
title: Procedural content generation — WFC, noise, L-systems, grammar-based
engine: other
content_format: mixed
language: typescript
license: open patterns / OSS implementations
source_url: https://en.wikipedia.org/wiki/Procedural_generation
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: medium
tags: [procgen, wave-function-collapse, perlin-noise, l-systems, content-generation]
---

# Procedural content generation — WFC, noise, L-systems, grammar-based

> Procgen is not a magic "infinite game" button.
> It is a **designer leverage multiplier**: a way for one designer plus a constraint system to produce the variety it would take a 10-person content team to author by hand.
> Used badly it produces beige slop.
> Used well it ships *Caves of Qud*, *Townscaper*, and *Dwarf Fortress*.

## What procgen actually delivers for indie / RP / mobile teams

For a team like Grand Games — small designer headcount, large content surface (quests, item drops, NPC dialogue, map regions, vendor inventories, ambient barks, faction news, weather events) — procgen is the difference between "we can ship 5 hand-built variants" and "we can ship 500 variants that all feel hand-built because the designer authored the *constraints*, not each output." That is the actual value proposition: not infinite content, but **leverage**.

One designer plus a working procgen system equals 100 levels worth of variation, because the designer's authorship moves up one level of abstraction (from "this dungeon" to "the rules every dungeon must obey"). The designer becomes a *gardener* tending the generator's outputs rather than a *bricklayer* placing every brick. The output count goes up by 100×; the designer headcount stays at 1; the per-output design *control* drops, but the total *space* of outputs the team can ship explodes.

This is **categorically distinct from "AI-generated final content"** (a [GamesAI red zone](../../VISION.md)). Procgen here means deterministic, rule-based, designer-authored systems — Wave Function Collapse, noise functions, L-systems, grammars. The designer writes the tile set, the constraint table, the grammar productions, the seed range. The system enumerates the space the designer defined. No model is hallucinating quests; the designer is parameterising a generator.

That distinction is what makes procgen something Boilergen-style tooling can endorse without crossing the "no generative final art / music / narrative" line. Procgen is *combinatorial enumeration of human-authored building blocks*. Generative AI is *interpolation in a learned latent space of other people's work*. They are not the same activity, even when the surface output looks superficially similar.

## Four major techniques

### 1. Noise-based (Perlin, Simplex, Worley/Voronoi)

Smooth, continuous gradient functions over 2D / 3D / 4D space. Sample `noise(x, y)` and you get a deterministic pseudo-random value that varies smoothly with position — perfect for terrain heightmaps, cloud density, biome blending, cave systems, texture variation, animation jitter, particle behaviour, audio modulation.

The major variants:

- **Perlin noise** (Ken Perlin, 1983) — the original gradient noise.
  Patent on the *improved* (Simplex) gradient construction (US 6,867,776, expired 2022).
  Classic Perlin is and always was patent-free.
- **Simplex / OpenSimplex2** — Perlin's successor.
  Fewer directional artifacts, faster in higher dimensions.
  **OpenSimplex2** by Kurt Spencer is BSD-2-Clause, the safe OSS reference implementation in C / Java / JS / Rust ports.
  Use this rather than rolling your own — the gradient tables and hash functions are subtle and easy to get wrong.
- **Worley / Voronoi noise** (Steven Worley, 1996) — distance-to-nearest-feature-point.
  Cellular patterns, organic textures, cracked-mud, foam, stone, scales, leather, hammered metal.
  The "F1 minus F2" trick produces edge-only patterns useful for cobblestones and shattered glass.
- **Value noise** — the cheapest cousin.
  Random values at integer lattice points, smoothly interpolated.
  Faster than Perlin, less natural-looking. Fine for low-frequency masks.
- **Curl noise** — derived from a vector noise field.
  Divergence-free, used for fluid-like particle motion (smoke, fire, leaves on the wind).

Cost is `O(1)` per sample. You can layer **octaves** (fractal Brownian motion / fBm) for natural-looking detail: sum noise at frequencies 1, 2, 4, 8 with amplitudes 1, 0.5, 0.25, 0.125, and you get convincing coastlines, cloudscapes, and mountain ranges.

```ts
function fbm(x: number, y: number, octaves = 5): number {
  let sum = 0, amp = 1, freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * simplex2(x * freq, y * freq);
    freq *= 2;
    amp *= 0.5;
  }
  return sum;
}
```

*No Man's Sky*, *Minecraft* terrain, every modern open-world heightmap pipeline — all noise-based at the core. The expensive parts are not the noise itself; they are the post-processing (erosion simulations, biome assignment, prop placement, mesh tessellation) layered on top.

### 2. Wave Function Collapse (WFC)

Tile-based constraint propagation algorithm by **mxgmn (Maxim Gumin)**, MIT-licensed reference implementation on GitHub (`github.com/mxgmn/WaveFunctionCollapse`, ~22k stars). Inspired by quantum wave-function collapse and texture synthesis from Paul Merrell's earlier "Model Synthesis" work.

The core idea, in five steps:

1. Each cell on a grid starts in a **superposition** of every possible tile.
2. **Adjacency rules** (learned from an example image, or hand-authored as a table) say which tiles can sit next to which.
3. Pick the **lowest-entropy cell** (the one with fewest remaining options) and **collapse** it to one specific tile, weighted by frequency.
4. **Propagate** the constraints to neighbours via arc consistency — neighbours lose any tiles incompatible with the just-collapsed choice, recursively.
5. Repeat until either everything is collapsed (success) or you hit a contradiction (backtrack, or restart with a new seed).

Tiny conceptual example — three tiles `Sea`, `Beach`, `Land` with rules `Sea ↔ Beach`, `Beach ↔ Land` (no `Sea ↔ Land` direct adjacency). Run WFC on a 32×32 grid and you get coastlines that always have a beach between sea and land, every time, with no special-case code.

Add `River`, `Bridge`, `Road` with their own adjacency rules (`River ↔ Bridge`, `Bridge ↔ Road`, `Road ↔ Land`, etc.) and the system composes them coherently — the constraint graph does the work that would otherwise be a thousand lines of bespoke layout code.

WFC is **brilliant for**:

- Tile maps and isometric cities
- Building exteriors and interiors
- Dungeon corridor layouts
- Knitwear patterns and decorative tiling
- Sokoban puzzles and Minesweeper-like boards
- Simple wiring layouts and PCB-style arrangements
- Generated icons and UI panels

*Townscaper* is the canonical commercial showcase. The two main flavours are **Overlapping WFC** (rules learned from an N×N sample image) and **Tiled WFC** (rules hand-authored as an adjacency table). Tiled is what most game implementations actually use because it gives the designer direct control over the constraint graph.

### 3. L-systems (Lindenmayer systems)

Formal rewriting grammars invented by botanist Aristid Lindenmayer (1968) to model plant growth. You start with an axiom string and iteratively replace symbols according to production rules. A turtle-graphics interpreter walks the resulting string to draw branching structures.

```
axiom: F
rule:  F → F[+F]F[-F]F
```

After three iterations you have a recognizable bush. Symbols: `F` = move forward drawing, `+` / `-` = rotate, `[` / `]` = push/pop turtle state for branching.

Variants:

- **Stochastic L-systems** pick rules probabilistically (`F → F[+F]F` with p=0.6, `F → F[-F]F` with p=0.4) for natural variation between runs.
- **Parametric L-systems** carry numeric parameters through productions (`F(d) → F(d*0.7)[+F(d*0.7)]F(d*0.7)` for diminishing branch lengths).
- **Context-sensitive L-systems** let productions depend on neighbouring symbols (signalling between leaves and roots — a leaf can "tell" its parent branch to grow thicker if it's collecting more sun).
- **Open L-systems** read from and write to an environment, used for plants that respond to obstacles, light, or water.

Used for **trees, plants, river networks, road layouts, lightning, blood vessels, coral, shells, fractal architecture, any branching/recursive structure**. *SpeedTree*, *Houdini* foliage tools, every "instant forest" plugin owes a debt to L-systems. The Prusinkiewicz–Lindenmayer book *The Algorithmic Beauty of Plants* (free online at algorithmicbotany.org) is the canonical reference and one of the prettiest CS books ever published.

### 4. Grammar-based content (Tracery, generative grammars)

Context-free grammars applied to **text, names, item descriptions, recipe templates, quest stubs, dialogue snippets, headlines, error messages, fantasy place names, faction mottos**. The reference implementation is **Tracery** by **Kate Compton** (Apache 2.0, JS, also ported to a dozen other languages — Cheap Bots Done Quick was built on it).

```json
{
  "origin": "#hero# slew #monster# in #place#",
  "hero":   ["a knight", "a rogue", "a cleric"],
  "monster":["a goblin", "a wraith", "an old serpent"],
  "place":  ["the deep wood", "Mirkholm Pass", "the salt marsh"]
}
```

Expand `#origin#` and you get a sentence. Then add:

- **Nesting** — `#hero#` can itself be a rule that expands further (`#class# named #name#`).
- **Modifiers** — `#monster.capitalize#`, `#item.s#` for plural, `#name.a#` for "a/an" article selection.
- **Variables** — `[hero:#hero#]` saves an expansion to reuse the same hero across the sentence.
- **Weighted choices** — productions can be biased to favour or rare-trigger certain options.

…and you have *@TwoHeadlinesBot* and most of the procedural-text NaNoGenMo (National Novel Generation Month) ecosystem. For RP servers this maps cleanly onto **rumour generation, item flavour text, NPC ambient dialogue, quest objective templates, vendor sales pitches, in-world graffiti, faction news bulletins, radio chatter** — all things designers want variation in but cannot hand-author 10,000 of.

Worth noting: grammars are also how *Dwarf Fortress* names its dwarves and forts, how *Caves of Qud* names its mutations, and how *Hades* assembles its boon descriptions. It is a quiet workhorse pattern that ships in nearly every text-heavy game.

## Real-world use cases

- **Townscaper** (Oskar Stålberg, 2020) — WFC on an *irregular* (non-square) grid for instant whimsical coastal villages.
  The clearest "WFC as a *toy*" demo ever shipped — there is no game loop, no objective, just the constraint solver as a pure aesthetic experience.
  Stålberg's GDC talks ("Beyond Townscaper", "Wave Function Collapse in Bad North") are required viewing and the best technical introduction to WFC outside mxgmn's repo.

- **Caves of Qud** (Freehold Games, ~2015–ongoing) — heavy procgen on basically everything: world map, towns, factions, history, item names, mutations, quests, even villages-of-NPCs-with-personalities.
  Hybrid: hand-authored systems compose with procgen tables.
  Brian Bucklew's GDC talks ("Dungeon Generation in Caves of Qud", "Procedural History and Dynamic Quest Generation in Caves of Qud") are the canonical reference for *how to actually ship a procgen-heavy game* without it dissolving into mush.

- **Dwarf Fortress** (Bay 12 Games, 2006–ongoing) — generates centuries of world history (kingdoms, wars, legends, named heroes, megabeasts, succession crises, religious schisms) before the player ever arrives, then plays the simulation forward.
  The "history is the content" school of procgen — the *story is what the simulation already did*, not what the designer hand-wrote.
  Tarn Adams' interviews (Roguelike Celebration, GDC) are the foundational document for ambitious-simulation procgen.

- **No Man's Sky** (Hello Games, 2016) — noise + math (Perlin-family + analytic functions + a curated palette of "biome" presets and creature-part libraries) for planet-scale variation.
  The infamous launch taught the industry that *quantity of procgen ≠ player-perceived variety*; the post-launch updates added more curated systems (story missions, hand-authored set-pieces, base building) on top of the procgen substrate.
  A perfect cautionary case study in "tame your procgen with hand-craft".

- **Spelunky** (Derek Yu, 2008/2012) — hand-authored room templates assembled by a level-flow algorithm.
  The "room grammar" approach: small bits of designer-craft, large procedural composition.
  Probably the most-imitated indie procgen pattern ever, and the reason every roguelike post-2013 looks broadly similar.

- **Minecraft** (Mojang, 2009) — noise terrain + structured procgen (villages, strongholds, ocean monuments, biomes) + entirely emergent player content on top.
  The world is the platform; the players are the content team.

- **Diablo / Path of Exile** — hand-authored tile sets composed by a procedural layout algorithm; loot tables are pure procgen on top of curated rarity tiers and affix pools.
  Loot procgen is a separate subfield — see "Diablo loot algorithm" GDC talks for the canonical pattern.

- **Hades** (Supergiant, 2020) — hand-authored rooms picked by a procedural sequencer with run-shape constraints (early/mid/late biome arc, encounter type quotas, boon-rarity pacing).
  Procgen at the *meta* level, hand-craft at the *moment-to-moment* level.

- **Slay the Spire** (Mega Crit, 2019) — hand-authored cards + procgen run composition (deck, map, shop offerings, relic pool).
  The cards themselves are completely fixed; everything *around* them is procgen.

## The "tame procgen" pattern

The most successful AAA / serious-indie approach is what you might call **tame procgen**. Four rules, in order:

1. **Deterministic seeded generation.**
   Same seed → same world, every time.
   Lets QA reproduce bugs ("repro on seed 0xDEADBEEF, region 14_22").
   Lets players share seeds ("the perfect Spelunky seed for sub-3-minute runs").
   Lets you snapshot-test the generator in CI.
   Non-deterministic procgen ("can't reproduce, won't fix") is poison and you will regret it for the lifetime of the project.

2. **Designer-curated parameter ranges.**
   Designers don't expose `0.0 – 1.0` for every knob; they pick the range that produces good results and lock the rest.
   The system explores within designer-blessed bounds.
   The procgen author's first job is *defining the space*, not *exploring all of it*.

3. **Manual override of "blessed" outputs.**
   When the generator produces something especially good, designers can save that seed / output as a hand-curated set-piece.
   *Spelunky* does this with named rooms.
   *Caves of Qud* does it with hand-built historic sites embedded in procgen world maps.
   *Dwarf Fortress* does it by letting the player retire and revisit forts.

4. **Procgen suggests; designer approves.**
   The pipeline has a human review step for high-visibility content (boss layouts, town centres, story-critical regions).
   Procgen for the long tail; hand-craft for the spotlight.
   The asymmetry of player attention — they will examine the opening hour for hundreds of hours of cumulative scrutiny across all players, and the generated 4,000th sidequest for thirty seconds — should drive where you spend craft.

## Combining with hand-authored content

Pure procgen feels samey within an hour. Pure hand-authored content costs too much per square metre. The shipping answer is **hybrid**:

- *Stardew Valley* — hand-authored maps with procgen monster placement, crop yields, geode contents, mine layouts.
  The town is fixed; the dungeon is shuffled.
- *Caves of Qud* — hand-authored core questline + hand-built historic sites + procgen world / towns / mutations woven around them.
  The hand-built parts are the *anchors*; the procgen is the *tissue connecting them*.
- *Diablo / Path of Exile* — hand-authored tile sets composed by a procedural layout algorithm; loot tables are pure procgen on top of curated rarity tiers.
- *Hades* — hand-authored rooms picked by a procedural sequencer with run-shape constraints (early/mid/late, biome arc, encounter type quotas).
- *Slay the Spire* — hand-authored cards + procgen run composition (deck, map, shop offerings).
  The cards themselves are completely fixed; everything *around* them is procgen.

The Caves of Qud GDC talks by **Brian Bucklew** are the canonical reference here — particularly "Dungeon Generation in Caves of Qud" and the broader talks on layered systems. If you watch one procgen talk, watch Bucklew. If you watch two, watch Bucklew and Stålberg. The two together cover roughly 80% of practical shipped-game procgen wisdom.

## Performance constraints

- **Noise** — `O(1)` per sample, trivially parallelisable, GPU-friendly.
  No realistic limit; modern engines sample millions of points per frame for shaders.
  Octaves multiply by a small constant (typically 4–8).
  The expensive part is not the noise function; it is whatever you do *with* the value (mesh generation, biome lookup, prop placement).

- **WFC** — naive backtracking is **O(n²)** or worse on grid size and is prone to contradictions on large grids that force the solver to restart from scratch.
  Practical advice: do it **offline at build time** for grids larger than ~64×64, or **chunk the grid** into independently-solved regions with carefully-designed chunk boundaries.
  Real-time WFC is fine for small UI / decoration scales (inventory panels, room dressings, generated icons) but disastrous as a per-frame open-world solution.

- **L-systems** — string length grows **exponentially** in iteration count if productions add symbols.
  Three rounds of `F → FF[+F][-F]` and you are already past 10 KB of string; six rounds and you have crashed the heap.
  Cap iteration depth, use parametric L-systems with thresholds (stop branching when branch diameter < ε), and consider GPU-instanced rendering of the resulting geometry.

- **Grammars (Tracery-style)** — basically free for typical text generation (microseconds per sentence).
  Watch out for recursive productions that can blow up if not bounded — `#sentence# → "and " #sentence#` will run forever without a depth cap.

- **Determinism** — always seed your RNG explicitly.
  One seed per generation context — world seed, region seed derived from world seed + coords, encounter seed derived from region seed + tick, etc.
  Never `Math.random()` in a procgen path that needs to be reproducible.
  Use a seedable PRNG like xorshift, PCG, or splitmix64; the JS standard `Math.random` is unseedable.

## What Boilergen could borrow

Procgen is *medium* relevance to GamesAI directly (we are a tooling platform, not a game engine), but the **shape** of the procgen pipeline is suspiciously similar to Boilergen's shape:

- Boilergen today: **YAML schema → curated template → one output file**.
- Boilergen with a "variant generator": **YAML schema → curated parameter ranges → N variations** for a designer to pick from.

Concrete near-future feature idea: take a `weapon.yaml` schema and a small variation manifest:

```yaml
# weapon-variants.yaml
base: weapons/ak47.yaml
ranges:
  damage:    { min: 80,  max: 120, step: 5 }
  fire_rate: { min: 5,   max: 9,   step: 0.5 }
  magazine:  { min: 20,  max: 35,  step: 5 }
ammo_type:    [556, 762, 9mm]
name_grammar: tracery_rules.json
emit:         10
seed:         0xC0FFEE
```

…and emit 10 distinct weapon variants for the designer to skim and "bless" the ones they want to ship. That is exactly the **schema → curated range → multiple variations** pattern from procgen, applied to gameplay data instead of map tiles. The designer is still the author; Boilergen is just enumerating the space they parameterised.

The same shape extends naturally to other Boilergen modules:

- A **localization variant generator** — given one source string and a Tracery-style template (`"#greeting#, #title# #name#!"`), emit variations for context coverage (formal/informal, masculine/feminine subject, plural/singular).
- A **schema variant generator** — given a base entity schema, emit "tier" variants (basic / advanced / elite) with stat ranges scaled by a designer-set curve.
- A **scenario seeder** — given an RP role table, emit N starting scenarios for a server's first week of content.
- A **test fixture generator** — given a content schema, emit N valid fixtures across the parameter space for property-based tests of game logic.

Critically, **none of this involves AI generating final content**. The designer authors the schema, the ranges, the grammar, the curve, the role table. Boilergen enumerates the space the designer defined. The output is *structured variation within designer-set bounds*, not a model hallucinating gameplay.

That keeps us cleanly inside the [VISION.md](../../VISION.md) red lines while still giving teams real content leverage. The same line that distinguishes "procgen" from "generative AI" in the games world distinguishes "Boilergen variant generator" from "an LLM emitting weapon stats" in our tooling world.

## Russian-market mobile

Procgen has a specific value for mobile — and especially for **Grand Mobile**: **lower asset budget for the same player-perceived variety, which means smaller APK download size**. The Russian / CIS mobile market is brutal about install size; sub-100 MB APKs convert dramatically better than 500 MB+ installs over flaky LTE in the regions and on the device tiers Grand Mobile actually targets.

A procedural quest module for an RP server — quest objectives composed from a small grammar, target NPCs / locations sampled from existing world data, reward tables generated within designer-blessed ranges — would let Grand Mobile ship far more quest variety per megabyte of APK than any hand-authored equivalent. Same logic for ambient dialogue, vendor inventories, random encounter tables, daily/weekly events, faction news tickers, weather variation. Procgen is a **compression strategy** for content, and compression is exactly what mobile distribution rewards.

Secondary benefit: procgen content is patchable as data, not as code. A new grammar file, a new tile set, a new parameter range — all hot-reloadable / OTA-pushable without a Play Store / RuStore review cycle. For a Russian-market product where store review timing is unpredictable and where RuStore / NashStore / Google Play coverage varies, that flexibility is a real ops win.

(See also [data-driven-content.md](./data-driven-content.md) — procgen is the natural extension of data-driven design to *generation rules*, not just static values.)

## Pitfalls

- **"Procgen everything" is a meme that wastes time.**
  It is a tool, not an aesthetic.
  Use it where it provides leverage (long-tail content, parametric variation, content quantities a human cannot author by hand).
  Hand-author the things players will spend the most time looking at (the opening hour, the boss room, the home base, the marketing screenshots).
  The first project a procgen-curious team builds is usually too procgen-heavy; the second usually has the right ratio.

- **Players notice repetition fast.**
  Pure procgen without curation, weighting, or a "blessed set-piece" overlay feels samey within a session.
  The human eye is extremely good at pattern-matching repeated tile compositions or recurring grammar fragments — *"I've seen that boulder before"* shows up in Steam reviews of even highly-praised procgen games.
  Curation is not optional.
  If your generator produces 10,000 outputs and 20 of them are great, your job is to surface those 20, not to ship all 10,000.

- **Determinism matters for replay / debug / community.**
  Non-deterministic procgen means QA can't reproduce a "I was stuck inside a wall on planet X" bug, players can't share seeds, speedrunners can't compete on a fair playing field, mod authors can't snapshot-test their tweaks, and you can't snapshot-test the generator in CI.
  Always seed explicitly; always make the seed user-visible if it is at all interesting.
  Treat the seed as a player-facing feature, not an implementation detail.

- **Difficulty curves are hard.**
  Hand-authored levels can carefully escalate complexity.
  Procgen needs an explicit difficulty parameter that the generator respects, or you ship a game where Run 1 is harder than Run 12, and your reviewers say "the difficulty is all over the place" without being able to articulate why.

- **Procgen is not free authorship.**
  The designer effort moves *up* a level (from levels to level-rules), not away.
  A team that "doesn't have time to author content" usually does not have time to author a procgen system either, because designing the constraint graph is itself a significant content-authoring task.
  Allocate accordingly.

- **WFC contradictions.**
  If your tile set has under-constrained adjacency rules WFC can hit unsolvable states and either backtrack forever or fail outright.
  Spend the time getting the constraint table right; that is where the design effort lives.
  Tooling that visualises *which* adjacency caused a contradiction is invaluable and worth building before you ship.

- **Grammar-based text drifts into nonsense.**
  Tracery-style grammars can produce sentences that are syntactically valid but semantically confused (`"the cleric slew the cleric in Mirkholm Pass"`).
  Add per-rule constraints (no repeated `[hero]` and `[monster]` from the same pool) or ship a curation pass.
  The same applies to procgen NPC generation — without inter-attribute constraints you get coherent-on-paper NPCs that feel uncanny in play.

## References

- **Wave Function Collapse** — `github.com/mxgmn/WaveFunctionCollapse` by Maxim Gumin (MIT).
  The canonical implementation; every WFC port traces back here.
  Read the README *and* the linked papers (Merrell's Model Synthesis, Karth & Smith's "WaveFunctionCollapse is Constraint Solving in the Wild").

- **Tracery** — `github.com/galaxykate/tracery` by Kate Compton (Apache 2.0).
  The reference grammar engine for procedural text.
  Compton's "Tracery: An Author-Focused Generative Text Tool" paper is the design rationale.

- **OpenSimplex2** — `github.com/KdotJPG/OpenSimplex2` by Kurt Spencer (BSD-2-Clause).
  The post-Perlin-patent OSS noise reference.
  Use this rather than rolling your own gradient table.

- **Caves of Qud GDC talks** — Brian Bucklew on dungeon generation, history simulation, and shipping a procgen-heavy roguelike.
  The single most useful set of talks for anyone seriously building procgen content systems.
  Search "Bucklew GDC" on YouTube; they are all free.

- **"Procedural Content Generation in Games"** — textbook by Noor Shaker, Julian Togelius, Mark J. Nelson.
  Free PDF at `pcgbook.com`.
  The academic survey: search-based PCG, constraint-based PCG, grammar-based PCG, evaluation methods, mixed-initiative PCG.
  The reference work for the field, accessible to practitioners.

- **"The Algorithmic Beauty of Plants"** — Prusinkiewicz & Lindenmayer, free PDF at `algorithmicbotany.org/papers/abop`.
  The L-systems bible.
  Beautiful even if you only flip through the figures.

- **Townscaper / Oskar Stålberg** GDC and EGX talks ("Beyond Townscaper", "Wave Function Collapse in Bad North") — the "WFC as a toy" school.
  Best practical intro to WFC for newcomers.

- **Spelunky** — Derek Yu, *Spelunky* (Boss Fight Books, 2016).
  Chapter on level generation is the gold-standard write-up of room-template + procedural-flow hybrid procgen.
  Short book, worth the afternoon.

- **"Game Programming Patterns"** chapter on data-driven content (related, see [data-driven-content.md](./data-driven-content.md)) — procgen is a natural extension of data-driven design once your "data" includes generation rules rather than just static values.
  Boilergen's variant-generator roadmap sits exactly at the intersection.
