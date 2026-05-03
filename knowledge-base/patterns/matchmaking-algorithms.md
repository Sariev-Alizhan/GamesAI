---
type: pattern
slug: matchmaking-algorithms
title: Matchmaking algorithms — Elo, Glicko-2, TrueSkill 2, OpenSkill
engine: other
content_format: mixed
language: typescript
license: mixed (MIT / BSD / open papers)
source_url: https://en.wikipedia.org/wiki/Glicko_rating_system
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [matchmaking, elo, glicko-2, trueskill, openskill, multiplayer]
---

# Matchmaking algorithms — Elo, Glicko-2, TrueSkill 2, OpenSkill

> Every competitive multiplayer game eventually has to answer "who plays whom?"
> The answer is a *rating model* + a *matchmaking pipeline* that wraps it.
> Pick the wrong rating model and matches feel one-sided; pick the wrong
> pipeline and queues take forever or stomps go unprevented. This entry surveys
> the four production-grade algorithms — Elo, Glicko-2, TrueSkill 2, OpenSkill
> — explains when each is right, and lays out the operational concerns
> (bucketing, region affinity, anti-stomp) that sit on top of any of them.

## 1. Why this matters

Grand Games' wedge is mobile multiplayer for the Russian-speaking market. Two
real downstream products need matchmaking: **Grand Mobile** (mini-games
embedded in the RP loop — races, arena, gang fights) and **Flump shooter**
(classic FPS team modes, the canonical TrueSkill / OpenSkill case).

Matchmaking sits directly on the **retention curve**. A new player who eats
three stomps in their first five matches churns; a veteran who waits 4 minutes
for a sweaty mirror match churns slower but just as surely. The rating model
plus the pipeline around it is one of the highest-leverage systems in any
competitive game — and a clean engineering reference (not AAA marketing) is
missing in Russian-language gamedev material entirely.

## 2. The four algorithms

### Elo

**Origin.** Designed by Arpad Elo (1960s) for chess. Adopted by FIDE in 1970.
The simplest rating system that actually works.

**What it tracks.** A single scalar rating per player. New players start at a
fixed value (commonly 1200 or 1500). After each match the winner's rating
increases and the loser's decreases by an amount proportional to the *expected*
outcome — beating a much higher-rated opponent gains more than beating a peer.

```
expected_a = 1 / (1 + 10^((rating_b - rating_a) / 400))
new_rating_a = rating_a + K * (score_a - expected_a)
```

`K` is the step size. Chess uses 10–40 depending on player tier. Games
typically use 16–32.

**Strengths.** Trivial to implement (one formula, no state besides the rating).
Well-understood. Stateless and deterministic — easy to reason about and to
test.

**Weaknesses.** No uncertainty modeling (a 5-game and a 5000-game player can
share a rating, and the system can't tell them apart). No time decay. And
**1v1 only** — team adaptations exist (average team ratings, apply Elo to the
team-vs-team) but the results are noisy.

**When to use it.** Strict 1v1 games where simplicity outweighs accuracy:
chess clones, two-player card games, simple fighting-game ladders. **NOT**
for team games, FFA, or anything that needs fast convergence for new players.

### Glicko-2

**Origin.** Mark Glickman (Boston University, 1995 → 2012). Designed
explicitly to fix Elo's "no uncertainty" problem. Used by Lichess, Counter-
Strike's old MM system, and many indie ladders.

**What it tracks.** Three numbers per player:

- **Rating** (`r`) — same idea as Elo, scaled around 1500.
- **Rating Deviation** (`RD`) — the system's uncertainty about that rating.
  New players start with a high RD (default 350). After many games it
  shrinks. RD inflates back over idle time.
- **Volatility** (`σ`) — how erratic the player's results have been recently.
  Stable players have low volatility; players who just rapidly improved or
  declined have high volatility.

The update math is more involved than Elo (a few iterations of a Newton
solver) but it's still pure: `(rating, RD, vol)` plus a list of recent
opponents and outcomes → new `(rating, RD, vol)`.

**Strengths.** Confidence intervals (RD=80 ≈ ±160 rating points 95% CI), so
matchmaking can bracket fair opponents on confidence rather than raw rating.
Time decay is built in — RD inflates while you're idle, then shrinks fast
once you return. Open, unencumbered, MIT-licensed reference impls available.

**Weaknesses.** Still fundamentally **1v1**; team adaptations exist
(sum-of-team-ratings Bayesian variants) but aren't part of the canonical
spec. A bit harder to explain to non-engineers ("why three numbers?").

**When to use it.** Any 1v1 ranked mode where you want confidence-aware
matchmaking. Lichess is the reference implementation in production at scale
(tens of millions of accounts).

**OSS implementations to start from.**

- `glicko2` on npm (MIT) — small, well-tested.
- `python-glicko2` (BSD) — Heungsub Lee's Python port.
- `go-glicko2` (MIT) — multiple implementations; pick one with tests.

### TrueSkill 1 / TrueSkill 2

**Origin.** Microsoft Research (Herbrich, Minka, Graepel, 2006 for
TrueSkill 1; Minka et al. 2018 for TrueSkill 2). Bayesian skill rating with
first-class team and FFA support. Powered Xbox Live matchmaking from launch
through the Halo / Gears / Forza era.

**What it tracks.** Per player: mean skill `μ` and standard deviation `σ`.
Conceptually similar to Glicko's rating + RD, but the update math is a
factor-graph / message-passing inference (not a closed-form formula). The
factor graph extends naturally to:

- **Teams** of any size (not just 1v1)
- **Free-for-all** with any number of players
- **Partial orderings** (player A finished above B, B and C tied, etc.)

**TrueSkill 2 (2018) adds** better draw handling, **partial team
participation** (players joining / leaving mid-match), score-weighted updates
(a 50–0 win counts more than 50–48), and faster convergence for new players.

**Strengths.** Genuinely models team / FFA structure. Battle-tested at
console-platform scale.

**Weaknesses.** **Patent encumbered.** Microsoft holds patents on parts of
the TrueSkill family; the reference C# code is published under MS-RL (not
OSI-approved). For commercial games in markets where Microsoft enforces
patents, **verify licensing with legal counsel** before integrating. Also
more complex to implement than Glicko-2, and the hyperparameters (β, τ, draw
probability) require data to tune.

**When to use it.** When you can clear the IP and need first-class team / FFA
support and have the engineering bandwidth. In practice many studios choose
OpenSkill (below) for the same shape without the IP risk.

### OpenSkill

**Origin.** Vivek Joshi, 2020+. Pure-OSS reimplementation of the TrueSkill-
family ideas, **explicitly avoiding the patented portions**. BSD-3-Clause
licensed. Maintained Python, JavaScript, Elixir, and Rust ports.

**What it tracks.** Same `(μ, σ)` shape as TrueSkill, with first-class team
and FFA support. Crucially, it offers **multiple model choices**:

- **Plackett–Luce** — the default; handles k-way orderings well, good for
  battle-royale and racing.
- **Bradley–Terry (full)** — pairwise comparisons; closer to classical
  TrueSkill behavior.
- **Bradley–Terry (partial)** — cheaper computation for very large FFAs.
- **Thurstone–Mosteller (full / partial)** — Gaussian-cdf variants useful
  when the noise model needs to be heavier-tailed.

You pick the model when you instantiate the rater; the API surface stays
stable across them. This is a major practical advantage — you can A/B different
models on real match data without rewriting the integration.

**Strengths.** No patent risk (BSD-3-Clause, openly developed). TrueSkill-
class accuracy in independent benchmarks. Teams, FFA, partial orderings,
draws all supported. Actively maintained as of 2026.

**Weaknesses.** Younger than TrueSkill — less battle-tested at console scale,
though several mid-size studios run it in production. Multiple model choices
means one more design decision; pick a default and stick to it unless you
have data.

**When to use it.** **Default recommendation for new team / FFA games**, both
internal Grand Games products and OSS users of any future Boilergen
matchmaking module.

**OSS implementations.**

- Python: `openskill.py` (BSD-3) — reference impl, most features.
- JavaScript / TypeScript: `openskill.js` (BSD-3) — feature parity for the
  common models.
- Elixir: `openskill.ex` (BSD-3).
- Rust: `openskill-rs` (BSD-3).

## 3. Decision tree

| Game mode | Player count | Recommended algorithm | Reason |
|-----------|--------------|------------------------|--------|
| Strict 1v1, simple ladder | 2 | Elo | Trivial to ship, players understand it |
| Strict 1v1, ranked / serious | 2 | Glicko-2 | Confidence-aware, time decay, OSS |
| 1v1 with rapid skill change (kids' tournament, training mode) | 2 | Glicko-2 | Volatility tracks improvement |
| Symmetric team (5v5 shooter, 3v3 brawler) | 6–10 | OpenSkill (Plackett–Luce) | First-class team support, no IP risk |
| Asymmetric team (4v1, attackers/defenders) | varies | OpenSkill (Bradley–Terry) | Per-side model fits asymmetry |
| FFA / battle royale (10–100 players) | 10–100 | OpenSkill (Plackett–Luce, partial) | Designed for k-way orderings |
| Racing | 4–20 | OpenSkill (Plackett–Luce) | Position-based outcomes |
| MOBA-style 5v5 with role queues | 10 | OpenSkill + role-aware bucketing | Rating per (player, role) |
| AAA console title with legal team | any | TrueSkill 2 | Worth the IP review for the extra fidelity |
| RP server (Grand Mobile main loop) | 50–200 | none — RP is not competitive | Use reputation / role progression instead |

The "RP server" row is important: matchmaking does NOT belong on the main RP
loop. It belongs on the *competitive sub-modes* embedded inside it (gang
warfare, arena, races).

## 4. Beyond the rating: the matchmaking pipeline

The rating model produces a number. The **pipeline** turns numbers into actual
matches. Four operational concerns dominate:

### Bucketing

Group players into rating bands. Bucket width is a hyperparameter — narrower
buckets mean fairer matches but longer queues. Typical: ±100 rating points,
expanded by +50 every 30 seconds the player is queued. With Glicko-2 /
OpenSkill, bucket on `μ - k·σ` and `μ + k·σ` (a confidence band) rather than
on raw `μ` — this lets uncertain new players match more flexibly.

### Latency / region affinity

Players should match within their **regional pool first**. Pool definition
should reflect actual ping geography, not political borders:

- For Russian-market mobile: a Moscow pool and an Eastern-pool (Yekaterinburg
  / Novosibirsk) typically need to be separate. Cross-pool ping easily exceeds
  60ms one-way.
- Cross-region matchmaking should only kick in after a long queue (90s+) and
  with explicit player consent ("expand search?" prompt).

### Queue-time tolerance

The "wait longer for a better match" knob. Implement as a function of queued
time:

```
allowed_rating_delta(t) = base_delta + growth_rate * t
allowed_ping_ms(t)      = base_ping  + ping_growth * t
```

Stop expanding once you hit a hard cap (e.g., 250ms ping, ±400 rating). Past
that point you're better off telling the player "no match available" than
shipping a stomp.

### Anti-stomp guards

Even with a good rating model, the matchmaker should refuse certain pairings:

- **5-stack vs solo-queue** in a 5v5 mode. A pre-made coordinated team has a
  voice-comms advantage worth ~200 effective rating points; rating alone
  doesn't catch this. Either match stacks against stacks, or apply a
  stack-size MMR penalty.
- **Streak-based suppression.** A player who just won 5 in a row gets matched
  *up* slightly to dampen runaway dominance; one who just lost 5 in a row
  gets matched *down* to break the tilt cycle. Controversial — see SBMM
  controversy below — but used in many AAA titles.
- **New-account guard.** A 1-day-old account should never matchmake against
  veterans, even if their rating drift suggests it. Hold them in a "newbie
  pool" for the first ~20 matches.

## 5. The SBMM controversy

Skill-based matchmaking (SBMM) is contentious in the AAA shooter community
(*Apex Legends*, *Call of Duty: Modern Warfare* / *Warzone*). The complaint
isn't that matches are unfair — it's the opposite. SBMM produces *too-fair*
matches:

- Every match feels sweaty.
- The skill-curve plateaus (you never feel like you "got better").
- "Pubstomping" (a high-skill player having fun against weaker opposition) is
  impossible.

The opposing position: SBMM protects new and casual players, who would
otherwise churn from constant losses. A game without SBMM is a game where the
top 5% has fun and the bottom 95% slowly leaves.

The compromise most studios land on:

- **Casual modes** use loose SBMM or pure random matchmaking — "feel-good"
  matches with mixed skill levels.
- **Ranked modes** use strict SBMM — sweaty matches expected.

For Grand Games products: keep ranked sub-modes strictly skill-matched and
casual sub-modes loose. **Never** apply strict SBMM to RP-mode mini-games
embedded in the main world; players didn't queue, they walked into the arena.

## 6. Implementation patterns

The good news: **all four algorithms are pure functions of state**. This makes
them easy to integrate and easy to test.

### Stateless rating computation

```typescript
// Pseudo-code, OpenSkill flavor
type Rating = { mu: number; sigma: number };

function updateRatings(
  teams: Rating[][],          // ordered by finishing position
  model: OpenSkillModel,
): Rating[][] {
  return model.rate(teams);   // pure function, no I/O, no globals
}
```

Same shape for Glicko-2 (input rating + RD + volatility + opponent list,
output new triple). Same for Elo (input two ratings + outcome, output two new
ratings). This lets you:

- **Unit-test exhaustively** with table-driven tests.
- **Replay** historical matches against a candidate algorithm to compare
  before deploying.
- **A/B test** algorithms by computing both in parallel and showing one
  publicly while logging the other.

### Persistence shape

Store per `(player_id, game_mode)`:

- `rating` (or `mu`)
- `rd` (or `sigma`)
- `volatility` (Glicko-2 only)
- `last_updated_at` (for time decay)
- `match_count` (for newbie-pool gating)

**Always per game mode, never global.** A 5v5 shooter rating tells you
nothing about the same player's racing skill.

### Atomicity

Compute the new ratings on **match end**, in a single transaction:

1. Read all participants' current ratings (one query, indexed lookup).
2. Compute new ratings (pure function, ~milliseconds).
3. Write all new ratings + a match-history row in one transaction.

Avoid the antipattern of writing each player's rating separately — partial
failures leave the system inconsistent. If your rating store and match-history
store are separate (e.g., Postgres + ClickHouse), use an outbox table.

### Server architecture

Rating computation is cheap enough to run in the match-server process at match
end. Break it out into a dedicated service only if you need centralized A/B
(computing rival algorithms in parallel) or you're sharing ratings across
fleets. For Nakama (Grand Mobile's likely backend), implement as a match
handler callback; for FiveM, a server-side Lua module; for Unity headless
servers, a C# service in the match-end pipeline.

## 7. Russian-market mobile constraint

Mobile-MP in the Russian market has constraints that re-shape the pipeline:

- **Latency budgets are tight.** 4G/LTE players carry 30–60ms baseline jitter
  already; an extra 100+ms of cross-region ping makes shooters unplayable and
  races feel rubber-banded.
- **Regional pools matter more than skill brackets.** Better to match a
  ±200-rating delta within Moscow than a perfect-rating opponent in Frankfurt.
- **Pool density varies by hour.** Russian prime-time evenings produce dense
  pools; off-hours are thin, so the pipeline must gracefully degrade.

Practical rule for Grand Mobile: **match within ~50ms RTT first, then expand
rating, then expand region, then offer "queue with bots" rather than a stomp.**

## 8. What Boilergen could borrow

A future `matchmaking` schema entry type could codify the rating model + the
pipeline knobs as data, and emit per-target glue code:

```yaml
type: matchmaking
data:
  model: openskill            # one of: elo | glicko2 | openskill | trueskill2
  variant: plackett-luce      # openskill model variant
  modes:
    - id: arena_5v5
      team_size: 5
      teams_per_match: 2
      bucket_width: 100
      bucket_growth_per_30s: 50
      max_ping_ms: 80
      anti_stomp:
        forbid_stack_vs_solo: true
        newbie_pool_until_matches: 20
    - id: race_royale_20
      team_size: 1
      teams_per_match: 20
      bucket_width: 150
```

Per-target codegen:

- **TypeScript** — Nakama match handler module (Grand Mobile backend).
- **Lua** — server-side FiveM module (RP arena sub-modes).
- **C#** — Unity headless server module (Flump shooter).

This connects to the existing
[`role-grade-hierarchy.md`](./role-grade-hierarchy.md) pattern: just as that
entry recognized "tiered grades" as one shape across job/business/org/family,
this entry recognizes "rated competitive mode" as one shape across arena
modes, races, FFAs, and tournaments. Same pattern-recognition discipline.

## 9. Pitfalls

### New-player onboarding

Pure Glicko-2 / TrueSkill assigns ~1500 (μ=25, σ=8.33 for default OpenSkill)
as the starting rating. With high RD/σ, the system *thinks* it doesn't know
the player — but the matchmaker still has to put them somewhere. If you
bucket on `μ` alone, new players match against the global average (i.e.,
veterans), lose, and churn.

**Fix.** Provisional matches: hold new players in a newbie pool for the first
10–20 matches against newbies + bots. Their σ shrinks fast, and by the time
they exit the pool they have a meaningful rating. Lichess, Dota 2, Apex all
do this.

### Smurfing

A high-skill player creates a fresh account and trivially demolishes the
newbie pool. Toxic for new-player retention.

**Defense-in-depth fixes** (no single one is enough): device fingerprinting
(same IP/device family flagged for review), behavioral telemetry (accuracy /
movement patterns matching a known veteran), a hard placement floor for new
accounts so they can't drop arbitrarily low and farm the newbie pool, and
phone / payment verification gating ranked queue access.

### Rating inflation / deflation over time

Over months and years, the rating distribution can drift. New-player influx
deflates the mean (newbies feed losses to veterans). High churn at the bottom
inflates the mean (only good players stick around).

**Fix.** Periodic recalibration. Once a season (3–6 months), rescale the
distribution back to a target mean and standard deviation. Communicate the
soft reset clearly so players don't feel cheated.

### Wrong primary sort key

Sort purely by rating → fast queues, bad matches. Sort purely by ideal-match
score → perfect matches, unbounded queues. Use a composite score
(`w_rating * rating_fit + w_ping * ping_fit + w_wait * queued_seconds +
w_party * party_compat`) and tune the weights against retention metrics, not
against feel.

### Believing the ladder is a complete signal

Rating tells you skill. It does not tell you toxicity, AFK rate, or smurf
likelihood. Feed **multiple signals** into match formation; rating-only
matchmaking puts the toxic top of the ladder against everyone else.

## 10. References

### Papers (open-access)

- Glickman, M. E. (2012). *Example of the Glicko-2 system.*
  http://www.glicko.net/glicko/glicko2.pdf — the canonical Glicko-2 reference,
  worked example included.
- Glickman, M. E. (1999). *Parameter estimation in large dynamic paired
  comparison experiments.* Journal of the Royal Statistical Society — the
  original Glicko paper.
- Herbrich, R., Minka, T., Graepel, T. (2006). *TrueSkill: A Bayesian Skill
  Rating System.* NeurIPS 2006. Available from MSR.
- Minka, T., Cleven, R., Zaykov, Y. (2018). *TrueSkill 2: An Improved
  Bayesian Skill Rating System.* MSR-TR-2018-8. Open PDF on Microsoft Research
  site.
- Joshi, V. (2020+). *OpenSkill: A faster asymmetric multi-team, multiplayer
  rating system.* — see the openskill.py docs and README for citations.

### OSS implementations (verified licenses)

- `glicko2` (npm) — MIT.
- `python-glicko2` (Heungsub Lee) — BSD.
- `openskill.py` — BSD-3-Clause.
- `openskill.js` — BSD-3-Clause.
- `openskill.ex` — BSD-3-Clause.
- TrueSkill reference C# (Microsoft) — MS-RL, **not OSI-approved**, treat as
  proprietary for safety.

### Industry / blog references

- Apex Legends Respawn devblog on SBMM (multiple posts, 2020–2024) — the most
  thorough public discussion of an AAA SBMM controversy.
- Call of Duty (Activision) developer blog post on SBMM, 2023 — official
  position statement.
- Riot Games dev blog: Valorant matchmaking philosophy — useful for the
  bucketing + queue-time tolerance discussion.
- Lichess Glicko-2 documentation — production reference at scale.

### Local artefacts

- [`knowledge-base/patterns/role-grade-hierarchy.md`](./role-grade-hierarchy.md)
  — sibling pattern entry, same "recognize the shape, codegen across targets"
  discipline.
- Future: `boilergen/plugins/competitive/` — proposed module, would consume a
  `matchmaking` schema entry type and emit Nakama / FiveM / Unity glue code.
