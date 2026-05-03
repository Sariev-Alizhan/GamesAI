---
type: pattern
slug: state-persistence-patterns
title: Game state persistence patterns — snapshot, event sourcing, CRDT
engine: other
content_format: mixed
language: typescript
license: open patterns (no SDK lock-in)
source_url: https://martinfowler.com/eaaDev/EventSourcing.html
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [state, persistence, event-sourcing, snapshot, crdt, mmo, rp]
---

# Game state persistence patterns — snapshot, event sourcing, CRDT

> Three families of patterns for keeping game state alive across server restarts, client crashes, and network partitions. Picking the wrong one early is one of the most expensive mistakes a persistent-world game can make: the cost compounds with every player, every entity, every schema migration. This entry is engine-agnostic and SDK-agnostic — the goal is to give the team a vocabulary, a decision tree, and a list of pitfalls before they reach for any specific library.

## 1. Why this matters for RP / MMO / persistent worlds

Persistent multiplayer games — Grand Mobile RP server, FiveM/QBCore servers, MMOs, survival sandboxes, idle/citybuilder hybrids — share one inconvenient property: **the world keeps existing when no one is looking at it.** Or more precisely, the *intent* is that the world keeps existing. Whether it actually does depends entirely on how state gets persisted.

Concrete things a persistent-world game must keep alive across a server restart:

- **Player state**: position, inventory, money, skills, faction reputation, active job
- **World state**: doors open/closed, owned properties, vehicle positions, dropped items, NPC alive/dead status
- **Vehicle state**: ownership, fuel, damage, mods, last parked location
- **Inventory state**: per-container, per-stash, per-trunk — often hundreds of thousands of rows
- **Moderation state**: warns, mutes, bans, RP-rule strikes (MG/PG/DM/RK/TK), case history
- **Economy state**: market orders, transaction history, faction treasuries

Every one of these is a state-machine. The question is **how is the state written down**, and the answer determines:

- How much data players lose on a crash
- Whether moderators can audit "who did what when"
- Whether the team can add new fields next month without a migration nightmare
- Whether the database scales past the first 10k concurrent players or hits a wall at 1k

Three pattern families dominate. Most production games end up using a hybrid of two of them.

## 2. The three patterns

### 2.1 Snapshot persistence

**Definition**: at intervals (or on triggering events like disconnect, save command, autosave timer), serialize the entire current state of an entity (player, vehicle, faction) and write it to the database, overwriting the previous record.

```
T=0    player connects, state loaded from DB
T=5    player picks up item — in-memory state changes
T=10   player drives to position X — in-memory state changes
T=300  autosave fires — full snapshot written to DB (overwrites T=0 snapshot)
T=305  server crashes — state between T=300 and T=305 is LOST
```

The schema is usually a flat row per entity, plus a few related tables for variable-length collections (inventory items, vehicle mods, owned properties). Every save is an UPSERT.

**Pros**:
- Simple mental model — table per entity, row per instance, one UPDATE per save
- Fast reads — a single SELECT reconstructs the entity
- Trivial schema browsability — DBAs can read the table directly
- No replay logic needed on boot
- Familiar tooling — every relational DBA understands it; backups, replication, point-in-time recovery all work the way the team already knows
- Easy to onboard new engineers; the persistence layer doesn't introduce new mental models

**Cons**:
- **Write amplification**: saving a 50KB inventory blob every 60 seconds for 1000 players = 50MB/min of churn even if nothing changed
- **Lossy on crash**: anything between snapshots evaporates
- **Race conditions**: two save paths writing the same row corrupt each other if not serialized
- **Schema migration pain when shapes change**: nested JSON columns become unparseable when the code's expected shape drifts
- **No audit trail**: you cannot answer "what was this player's money 3 hours ago"
- **Bursty I/O**: if every player autosaves on the minute mark, every minute the database sees a write spike. Stagger save phases or pay for peak provisioning
- **No natural rollback**: undoing a bug that corrupted player state requires either a backup restore (heavy) or hand-written compensation code

### 2.2 Event sourcing

**Definition**: never store current state. Store the **immutable, append-only log of events** that produced the state. Reconstruct current state by replaying events from the start (or from the last snapshot, in hybrids).

```
Event log:
  {t: 0,   type: PlayerSpawned,  player: 42, pos: [0,0,0]}
  {t: 5,   type: ItemPickedUp,   player: 42, item: "ak47"}
  {t: 10,  type: PlayerMoved,    player: 42, pos: [100,200,0]}
  {t: 30,  type: JobChanged,     player: 42, from: "civ", to: "police"}
  {t: 60,  type: PlayerWarned,   player: 42, reason: "MG", mod: 7}

Current state = fold(events, initialState, applyEvent)
```

In TypeScript form, the apply function looks like:

```ts
function applyEvent(state: PlayerState, event: PlayerEvent): PlayerState {
  switch (event.type) {
    case 'PlayerSpawned': return { ...state, pos: event.pos, alive: true };
    case 'ItemPickedUp':  return { ...state, inv: [...state.inv, event.item] };
    case 'PlayerMoved':   return { ...state, pos: event.pos };
    case 'JobChanged':    return { ...state, job: event.to };
    case 'PlayerWarned':  return { ...state, warns: [...state.warns, event] };
  }
}

const currentState = events.reduce(applyEvent, initialState);
```

This signature is also where the discipline lives: every new event type must be handled, every old event type must keep being handled forever, and the function must be deterministic.

**Pros**:
- **Full audit trail for free** — every action is recorded with timestamp and actor. Natural fit for RP moderation: "show me everything player 42 did in the last hour" is a SELECT, not a forensic exercise
- **Time-travel debugging**: replay events up to T=29 to see the world before the JobChanged
- **Append-only writes** are cheap and crash-safe — partial writes are detectable and discardable
- **Multiple read models**: derive different projections (leaderboards, analytics, moderation views) from the same event stream
- **Crash recovery to millisecond granularity** — only the in-flight event is at risk

**Cons**:
- **Read latency**: replaying years of events on every boot is unfeasible. Snapshot acceleration (periodic checkpoints) is mandatory at scale
- **Complexity tax**: the team must internalize "current state is a derived value" — a different mindset than CRUD
- **Event schema is forever**: once an event type is published, the code must be able to read it ten years later. New code must handle old shapes
- **Debugging with stale reducers**: a bug in the apply function manifests as wrong state, but the events are correct — and rebuilds re-trigger the bug
- **Storage growth** — 1000 players * 100 events/sec * 365 days = a lot. Compaction strategy needed

### 2.3 CRDT (Conflict-free Replicated Data Types)

**Definition**: data structures (counters, sets, maps, sequences) designed so that concurrent writes from multiple replicas can be merged deterministically without coordination, regardless of order. The merge function is associative, commutative, and idempotent.

```
Replica A: counter = inc(0) = 1, then inc = 2
Replica B: counter = inc(0) = 1, then inc = 2
Merge(A, B) = 4    // deterministic, no conflict resolution needed
```

**Pros**:
- **Distributed-friendly** — multiple servers / regions / offline clients can write independently and reconcile later
- **Offline-first** — perfect for mobile games that lose connectivity mid-action
- **No coordination overhead** — no locks, no consensus rounds for the common case
- **Strong eventual consistency** without the operational cost of strong consistency

**Cons**:
- **Counterintuitive semantics**: "last write wins" is rarely what you want, and CRDTs that aren't LWW (OR-sets, RGAs, etc.) take real study to use correctly
- **Mostly the wrong fit for authoritative-server games**: if there is one authoritative server, there is no need to merge concurrent writes — the server serializes everything. CRDT shines when there is **no single authority**
- **Limited type vocabulary** — not every game-state shape can be expressed as a CRDT
- **Storage and metadata overhead** — vector clocks, tombstones, version vectors aren't free

**When CRDT genuinely fits a game**: collaborative level editors, multi-region MMO worlds where each region is authoritative for its own slice, mobile-first social games where the client must accept inputs while offline and reconcile on reconnect. Almost never the right tool for an authoritative RP server.

## 3. Decision tree — game type to pattern

| Game shape | Recommended pattern | Notes |
|---|---|---|
| Single-player save game | Snapshot | One file, one player, periodic + on-quit save |
| Mobile idle/casual | Snapshot + cloud-save | Local primary, cloud reconcile on launch |
| FiveM RP server (small, < 64 players) | Snapshot (QBCore default) | Save on disconnect/dispose, periodic autosave |
| FiveM RP server (large, > 200 players) | **Hybrid: snapshot + event log on side** | Snapshot for fast reads, event log for moderation audit |
| MMO with shards | Per-shard snapshot + cross-shard event log | Each shard is authoritative; cross-shard ops are events |
| Mobile MP shooter (Grand Mobile-shape) | Snapshot for player profile, in-memory only for match state | Match state is ephemeral, doesn't need persistence |
| Survival sandbox | **Event sourcing with snapshots** | Audit + rollback are first-class needs (grief recovery) |
| Idle/citybuilder | Snapshot | State changes are rare, full overwrites are fine |
| Collaborative level editor | CRDT | Multi-user concurrent editing, no central authority |
| Cross-region MMO with no single authority | CRDT for shared state, snapshot per region | The 1% case where CRDT genuinely earns its complexity |

### How to use the decision tree

The table is a starting point, not a verdict. Walk it in this order:

1. **What is the worst data-loss outcome we can tolerate?** If any loss is unacceptable (paid items, ranked progress), the loss-window of pure snapshot is too wide — add an audit log or move to event-sourced.
2. **Does the team need an audit trail by design?** RP servers with moderation almost always do. Once audit is required, the audit log is mandatory regardless of which pattern owns the canonical state.
3. **Will the team realistically maintain forever-compatible event schemas?** If the answer is no, pure event sourcing will hurt within a year. Choose snapshot-primary with audit on the side.
4. **Is there a single authoritative server?** If yes, CRDT is overkill. If no (offline mobile, multi-region), CRDT becomes a candidate.
5. **What is the team's familiarity with each pattern?** A team that has shipped event-sourced systems before pays a smaller complexity tax than a team learning it for the first time on a deadline.

## 4. Hybrid patterns

The two pure patterns each have a corresponding well-known hybrid that addresses the worst weakness of each.

### 4.1 Event-sourced with periodic snapshots

The "Kafka + KSQL" pattern in game form. Events are the source of truth, but every N events (or every M minutes) a snapshot of derived state is written. On boot, load the latest snapshot, then replay only the events newer than the snapshot timestamp. Read latency goes from O(events_since_genesis) to O(events_since_last_snapshot).

This is what large-scale event-sourced systems converge to. The snapshot is a cache of the fold, not the source of truth — if a snapshot is corrupted, throw it out and rebuild from events.

Operational rules that come with this pattern:

- Snapshots include the event-log offset they were built from. Boot reads `latest_snapshot.offset`, then replays `events where offset > latest_snapshot.offset`.
- Snapshots are versioned the same way events are. A snapshot built by code v1 may be unreadable by code v3; in that case, throw the snapshot away and rebuild.
- Snapshot generation runs on a separate worker, not the request path. The simulation should never block on snapshot I/O.
- Old events stay in the log even after they are "covered" by a snapshot — at minimum until the next snapshot lands successfully, and usually much longer for audit.

### 4.2 Snapshot-primary with audit log on the side

The pragmatic hybrid most production RP servers actually run. The primary persistence path is snapshots — fast reads, simple schema, designer-friendly. In parallel, every state-changing action emits an event to an append-only audit log (a separate table, often a separate database, often Kafka or a logfile rotated to S3).

The audit log is **not used to reconstruct state** — that's what the snapshot is for. The audit log exists for:

- Moderation ("show me what this player did")
- Forensics ("how did this duped item enter the economy")
- Analytics ("what's the most common job transition")
- Rollback evidence ("we have proof we can revert this")

This is the lowest-risk way to get most event-sourcing benefits without committing to event sourcing as the primary persistence model.

The honest tradeoff: the audit log can drift from the snapshot (one writes, the other doesn't, then the server crashes). The team must accept that the audit log is "best effort" rather than "source of truth," and design moderation flows around that reality. In practice this is fine for most use cases — moderators don't need every keystroke, they need enough signal to investigate.

## 5. Concrete implementations in the wild

### 5.1 QBCore (FiveM)

**Pattern**: pure snapshot via `oxmysql`. Player data is loaded from `players` table on join, kept in memory in `QBCore.Players`, and written back on:
- Disconnect (`playerDropped` handler)
- Resource stop (`onResourceStop`)
- Periodic autosave (interval, configurable, default 5 minutes)
- Manual save commands

**Pros for QBCore**: simple, every server admin can read/edit the table directly with TablePlus, schema is flat enough to migrate with ALTER TABLE.

**Cons for QBCore**: 5-minute autosave window means a server crash loses up to 5 minutes per player — and FiveM servers crash. Inventory dupe glitches often exploit the snapshot window (transfer item, crash server before save, both copies persist).

**Mitigations Grand Games-shape teams have shipped**: shorter autosave intervals (60s) at the cost of write amplification, plus an event log for inventory mutations specifically.

### 5.2 Nakama

**Pattern**: framework-agnostic. Match handlers (`match_loop` in TypeScript/Lua/Go) define their own persistence strategy. The framework provides:
- **Storage engine** (collection/key/value JSON) — natural fit for snapshots
- **Notifications + audit** — usable as an event log
- **Leaderboards / tournaments** — derived projections, often event-sourced internally

The framework doesn't impose a pattern. Production Nakama deployments range from pure snapshot (simple match) to full event sourcing (tournament systems, ranked ladders).

### 5.3 Unity DOTS / Photon Quantum

**Pattern**: Quantum is **literally a snapshot per simulation tick**. The `Frame` is a deterministic, serializable struct containing the entire game state. Replay = save the input stream and replay it through the deterministic simulation, which is event sourcing for free.

This is a beautiful theoretical fit, but only works because Quantum mandates determinism. The pattern doesn't generalize to non-deterministic engines — you cannot trivially get "replay = event sourcing" from Unity without DOTS, because re-running with the same inputs doesn't reproduce the same outputs.

The lesson Quantum teaches: **if you can make the simulation deterministic, persistence and replay collapse into the same problem.**

### 5.4 Minecraft / Bedrock servers

**Pattern**: chunk-level snapshot persistence. The world is sliced into chunks (16x16x256 in classic, region-files of 32x32 chunks each). Each chunk gets a snapshot to disk on unload, on world-save tick, and on shutdown. Player data lives in a separate `playerdata/<uuid>.dat` snapshot.

This works because chunks are spatially independent — saving chunk A doesn't require coordinating with chunk B. It scales linearly with active region count, not with player count. The same pattern applies to any voxel/tile-based persistent world.

### 5.5 SpacetimeDB / authoritative-DB game servers

**Pattern**: the database is the game server. Mutations are transactions; reads are SELECTs over current state. The "save" question disappears because there is no in-memory state separate from the persisted state — every mutation is durable by construction.

The cost: every gameplay action pays the latency of a transaction. The benefit: zero data loss on crash, no save-window dupe glitches. Suitable for games where action rate is low (turn-based, slow-tick MMOs) but unsuitable for high-tick simulation.

## 6. The crash recovery problem

Every persistence pattern is ultimately judged by what happens when the server crashes mid-frame.

| Pattern | Crash loss window | Recovery procedure |
|---|---|---|
| Pure snapshot, 5-min autosave | Up to 5 minutes | Load latest snapshot, accept the loss |
| Pure snapshot, on-mutation save | Up to 1 mutation | Load latest snapshot |
| Pure event sourcing | Up to 1 event (the in-flight one) | Replay all events from genesis |
| Event sourcing + snapshot | Up to 1 event | Load latest snapshot, replay events newer than snapshot |
| Snapshot + audit log | Up to 1 mutation (in audit), up to autosave (in snapshot) | Load snapshot, optionally replay audit forward |

The crash-recovery story is also a **player-trust story**. Players who lose 5 minutes of progress every crash will quit. Players who lose 1 second will not notice. The cost of avoiding 5 minutes of loss is real engineering work; the cost of losing 5 minutes is real player churn. The right tradeoff depends on crash frequency.

A few crash-recovery design questions every persistent-world team should answer explicitly:

- **What is the worst-case loss window we will accept?** If the answer is "5 minutes," the answer to autosave interval is also 5 minutes (or shorter, with margin).
- **How do we detect that a crash happened?** A clean shutdown writes a sentinel ("clean exit"); boot checks for the sentinel. Missing sentinel = crash recovery path.
- **What does crash recovery announce to players?** Silent recovery is fine for small losses; large losses need a notification ("server restarted, last save was at X").
- **Are there transactions that span multiple entities?** A trade between two players is two writes. If only one lands before the crash, the world is now in a state that the simulation never produced. Either use a real transaction or a compensation step.
- **Do we test the crash recovery path?** The only way to trust crash recovery is to regularly kill the server uncleanly in a staging environment and verify the recovery story holds.

## 7. Schema migration story

This is where the real long-term cost of the choice shows up. A live game's data model will change. How painful that is depends on the pattern.

### Snapshot

- **Adding a column**: easy. New column defaults to NULL, code reads it as an Option, fills in default. ALTER TABLE.
- **Renaming a column**: medium. Add new column, dual-write for a deploy, backfill old → new, drop old.
- **Restructuring nested JSON**: hard. Every existing row needs a one-time migration script. Risk of data loss if migration is buggy. Often shipped as "old shape and new shape both supported in code, migrate on next save."
- **Splitting one entity into two**: very hard. Effectively a data-migration project.

### Event sourcing

- **Events are immutable**: once an event of type `PlayerWarned v1` is in the log, it stays in the log forever. The replay code must understand `PlayerWarned v1` ten years from now.
- **Adding a new event type**: trivial. New code emits it; old code never saw it.
- **Changing an existing event type**: forbidden. Instead, version the event: `PlayerWarned v2`. Both versions live in the log; the apply function dispatches on version.
- **Removing an event type**: forbidden in practice. Even if no new events of that type are emitted, the old ones must still replay correctly.
- **The killer move**: snapshot acceleration also lets you "compact" — once a snapshot covers events older than X, you *can* archive those events to cold storage. But you cannot delete them and still claim full history.

**Practical advice (independent of pattern)**:

- **Version every event from day one** — even v1 should literally be `{type: "PlayerWarned", v: 1, ...}`. Adding versioning later is much harder than starting with it.
- **Never delete event types**. If you stop using one, the apply function still needs to handle its presence in old logs.
- **Snapshot schemas should be additive when possible** — adding optional fields with defaults is cheap; restructuring nested shapes is expensive.
- **Write a schema migration test that loads a snapshot from 6 months ago and asserts current code still reads it.**

## 8. What Boilergen + GamesAI care about

The schema-validator module already validates entity definitions (the data side of the data-driven-content pattern). State-persistence is the natural next concern: an event-sourced game has *another* schema — the event schema — and that schema also needs validation, version-discipline, and replay-safety guarantees.

A future companion module could:

- Validate event-schema definitions (every event type has a version field, schema, apply-function signature)
- Detect breaking changes to event types between commits (renaming a field on `PlayerWarned v1` is a regression that will corrupt replay; the linter catches it)
- Generate replay-test scaffolds: load a fixture event log, fold through current code, assert the resulting state matches a golden snapshot
- Flag unbounded event-log growth without compaction strategy

Cross-references in this knowledge base:

- `patterns/data-driven-content.md` — entity *definitions* are content; entity *state* is what this entry is about. The two patterns sit on opposite sides of the runtime: definitions are read once, state is written constantly.
- `patterns/build-step-resource.md` — schema validation at build time, the same idea applied to event schemas. A linter that fails the build on a breaking event-shape change is the cheapest way to enforce versioning discipline.
- `patterns/role-grade-hierarchy.md` — moderation state is one of the strongest arguments for event sourcing in RP servers. The role-grade structure (MG/PG/DM/RK/TK) generates exactly the kind of timestamped, attributed, auditable events that event sourcing is built for.
- `patterns/component-based-design.md` and `patterns/entity-component-system.md` — entity composition is what gets persisted; how components serialize is the practical interface between architecture and storage.

The thread connecting these: GamesAI's modules don't directly touch persistence, but they all influence what persistence has to deal with. A schema-validator that catches a breaking change today saves a 3am rollback next quarter.

### Migration tooling worth building once

Regardless of the pattern, a few pieces of tooling pay for themselves the first time a migration goes wrong:

- **A snapshot diff tool** — feed in two snapshots (or a snapshot and a fixture), produce a structured diff. Lets the team review what a migration changed before deploying.
- **A replay-from-fixture test** — load a captured event log into a fresh DB, run code against it, assert the resulting state. Catches breaking changes to apply functions before production sees them.
- **A "shadow read" mode** — for snapshot migrations, the new code reads both old and new shapes and asserts they are equivalent. Run for a week before flipping the canonical reader to the new shape.

These exist for any persistence pattern; the cost of building them is small relative to the cost of a failed migration in production.

## 9. Pitfalls

- **Trying to event-source a game that doesn't need it**. A single-player puzzle game does not need event sourcing. A 50-player FiveM server probably doesn't either. Premature event sourcing imposes complexity tax for no benefit.
- **Snapshot frequency too low**. Players will not forgive 5-minute losses on crash. Either lower the interval (and pay for write amplification) or add an audit log to recover the gap.
- **Event-log unbounded growth**. Without compaction, the log grows forever. After year three the boot-time replay takes longer than the server uptime. Snapshot-on-event-log is mandatory at scale.
- **CRDT for authoritative game state**. If there is one server that owns truth, you do not have concurrent writes from multiple authorities. CRDTs solve a problem you don't have, and impose semantics that confuse the team.
- **Mixing patterns without naming the boundary**. "We snapshot the player but event-source the moderation log" is a fine architecture — but the team must explicitly name where the boundary is and what guarantees each side gives. Implicit hybrids become unmaintainable.
- **Treating the audit log as a backup**. The audit log in a snapshot-primary system is not a recovery source for player state — it's evidence. Don't promise rollback from audit unless you've actually built and tested the rollback path.
- **Storing large blobs in the event log**. An event of type `InventoryFullyReplaced` carrying a 50KB JSON payload defeats the point of event sourcing (small, semantic events). Either keep events small or accept that the log is now also a snapshot store.
- **Saving on every mutation without batching**. 1000 players each emitting 50 mutations/sec = 50k writes/sec to the database. Batch and coalesce.
- **Conflating "save" with "commit"**. A save can succeed in memory and fail to durably write. The save path must report failure back to whoever asked, and the game must decide what to do — retry, queue, or surface to the player.
- **Trusting the database as the only durability layer**. Cloud DBs can be down, mid-failover, or rate-limiting. A short on-disk write-ahead buffer on the game server gives a second chance.
- **Storing pointers across restarts**. In-memory pointers, runtime entity IDs, native handles — none of these survive a restart. Only stable, regenerable IDs belong in persistence.
- **Persisting computed/derived state alongside source state**. If you store both `xp` and `level` (where `level = f(xp)`), they will eventually disagree. Persist source, compute derived on read.

## 10. Russian-market mobile constraint

Grand Mobile and similar mobile-MP-Russian-market shooters/RP-mobile titles run on a long tail of low-end Android devices. The persistence pattern must respect constraints these devices impose:

- **Limited write IOPS**. Cheap eMMC storage handles a few hundred small writes per second before throttling. Persisting every action locally murders the device.
- **Battery drain from frequent flushes**. Each flush wakes the storage controller; aggregated flushing extends battery life.
- **App lifecycle is hostile**. Android can kill the app at any moment. The OS does not promise to call your `onPause` handler. Persistence must assume the app will die without warning.
- **Network is intermittent**. Train tunnels, elevators, rural areas. Cloud-only persistence breaks; offline-only persistence loses progress on device loss.

The pattern that consistently works for this market:

- **Local snapshot** — periodic flush to local storage (every N seconds or N actions, whichever comes first), with on-pause and on-low-memory triggers as best-effort
- **Cloud-save sync** — PlayFab, GameFabric, Nakama, or a custom backend, syncs the snapshot when connectivity is good
- **Conflict resolution on cloud-local divergence** — usually "newest wins" with a UI prompt for ambiguous cases
- **Avoid event sourcing on the device** — event-log replay on cold-start makes the app feel slow; users blame the game, not the storage subsystem

For the server-side of the mobile MP architecture, normal server-side patterns apply (snapshot or hybrid as per the decision tree); the special constraints above are about the **client** persistence layer.

A concrete sketch for a Grand Mobile-shape mobile RP/shooter persistence stack:

- **Authoritative server** keeps player profile in snapshot form (PostgreSQL or similar), match state in memory only (matches end, state evaporates by design)
- **Inventory and economy mutations** also write to a side audit log (Kafka or a simple append-only table) — supports moderation and dupe-glitch forensics
- **Mobile client** keeps a thin local snapshot for offline display (last seen profile, owned items, last match results) — never used as source of truth, only for UX while reconnecting
- **Network failure UX** shows the player a clear "offline, changes will sync" banner; aggressive optimistic UI is avoided for any state with monetary value (purchases, trades)
- **Region-aware writes** — for Russian-market players, regional DB primaries reduce write latency from 200ms+ (transcontinental) to 20ms (local)

### Observability — what to measure regardless of pattern

Every persistence layer in a production game should emit at least the following metrics. Without them, the team is flying blind during the exact incidents the persistence pattern is supposed to survive.

- **Save success rate** (per entity type, per region) — drops below 100% mean silent data loss happening right now
- **Save latency p50/p95/p99** — the long tail is what kills players' progress on crash, not the median
- **Save queue depth** — if mutations arrive faster than they can be persisted, the queue grows without bound; this is the canary for write-amplification problems
- **Time since last successful snapshot, per entity** — how much would each player lose if the server died right now
- **Event-log lag** (event-sourced systems) — gap between event production and event durable-write
- **Replay duration on boot** — should be flat or shrinking; if it grows over time, the snapshot strategy isn't keeping up
- **Schema-version distribution in the store** — how many rows are still on the old shape; informs migration timeline
- **Audit log dropped events** — the audit log being best-effort is fine; not knowing how often it drops is not

A simple Grafana dashboard with these metrics turns persistence from a black box into a system the team can reason about. Build it before you need it.

## 11. References

- **Martin Fowler — Event Sourcing** — `https://martinfowler.com/eaaDev/EventSourcing.html` — the canonical pattern definition. Read first.
- **Greg Young — CQRS + Event Sourcing talks** — multiple recordings on YouTube; Young is the most influential practical voice on event sourcing in production. The "Event Sourcing is hard" talk in particular is required reading before committing to the pattern.
- **Marc Shapiro et al. — A comprehensive study of Convergent and Commutative Replicated Data Types** (INRIA, 2011) — the foundational CRDT paper. Defines the type vocabulary (G-Counter, PN-Counter, OR-Set, LWW-Register, RGA, etc.) and proves convergence properties.
- **Photon Quantum Frame docs** — cross-reference; Quantum's deterministic Frame model is a real-world example of "snapshot per tick + input log = event sourcing for free." See the engine knowledge-base entry for Quantum.
- **Game Programming Patterns — Game Loop / Update Method** — adjacent reading; the simulation loop is the producer of state changes that any persistence pattern must keep up with.
- **Designing Data-Intensive Applications (Kleppmann)** — chapters 5 (replication), 7 (transactions), 11 (stream processing) cover the general theory underneath all three patterns. Not game-specific but the best single source on the tradeoffs.
- **QBCore source** (FiveM) — `https://github.com/qbcore-framework` — read `qb-core/server/player.lua` for a real-world snapshot persistence implementation.
- **Nakama documentation — Storage Engine + Match Handler API** — concrete framework for either pattern; useful as a baseline for what "persistence as a service" looks like.
- **Eventide Project documentation** — `https://eventide-project.org/` — opinionated, production-grade event sourcing framework. Most useful for the *operational* side: how to run event-sourced services without losing your mind.
- **Akka Persistence** — `https://doc.akka.io/docs/akka/current/typed/persistence.html` — actor-model event sourcing with snapshots. The reference implementation many later systems imitate.
- **Yjs and Automerge** — practical CRDT libraries; read their docs to understand what CRDT semantics actually feel like before committing to the model.
- **Jepsen reports** — `https://jepsen.io/` — independent testing of distributed databases. Required reading before trusting any DB to give the consistency it claims; the persistence pattern only matters if the underlying store actually delivers.

---

> The single most important sentence in this entry: **most games should start with snapshot persistence and add an audit log when they need one.** Pure event sourcing is a powerful tool with a real cost; CRDT is a specialized tool for a narrow problem. The hybrid "snapshot-primary with audit log on the side" is what production RP servers converge to, and it's the right default for any new persistent-world project until measured needs prove otherwise.
