---
type: engine
slug: multiplayer-backends
title: Multiplayer backends 2026 — PlayFab, Nakama, AccelByte, Edgegap, Hathora
engine: other
content_format: mixed
language: typescript
license: mixed (commercial SaaS / OSS — see body)
source_url: https://heroiclabs.com/nakama
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [backend, baas, playfab, nakama, edgegap, hathora, accelbyte, mobile-mp]
---

# Multiplayer backends 2026 — PlayFab, Nakama, AccelByte, Edgegap, Hathora

> Decision-grade map of the live multiplayer-backend market as of May 2026.
> Hathora was acquired by Fireworks AI and is winding down its game-hosting
> business; Unity Multiplay reached EOL on 2026-04-01 and most customers
> migrated to Edgegap or to Rocket Science Group's "Multiplay by Rocket
> Science" continuation. Verify pricing and region availability before any
> production commit — these change quarterly.

## The backend choice matters early

A team building a multiplayer game picks (or builds) one of these in the
**first month** — usually before the first vertical slice ships. The choice
determines auth flow, player-data schema, currency model, server-orchestration
shape, and which platforms certify smoothly later. Switching back-ends after
soft-launch is a 3-6 month rewrite that touches client, build pipeline,
analytics, support tooling and (worst) live player data — almost nobody does
it cleanly. Treat the pick as architectural, not infrastructural: write down
which problems you're paying the vendor to solve (auth? hosting?
matchmaking? economy? all four?) and keep the list, because the moment a
vendor stops solving one of them at acceptable cost is the moment to start
the migration plan, not the moment the cheque comes due.

## The six categories

### PlayFab (Microsoft)

- **Vendor**: Microsoft (acquired 2018), now under the Azure-PlayFab service
  family.
- **License / hosting**: Closed SaaS. A Microsoft Entra (Azure AD) tenant is
  required to create a title; billing flows through an Azure subscription.
  No self-host option exists.
- **Surface area**: Identity (10+ login providers including Steam, Epic,
  Xbox Live, Apple, Google), virtual currencies, catalog/inventory v2,
  leaderboards/statistics, party/voice (PlayFab Party), Multiplayer Servers
  (Linux/Windows containers on Azure regions), CloudScript v2 (JavaScript)
  and Azure Functions integration for custom server logic, Insights/Explorer
  for analytics, segmentation and push.
- **Pricing tiers (verified May 2026)**: **Development Mode** (free, capped
  at **1,000 lifetime player accounts** per title — for prototypes only);
  **Standard** (monthly meters valued ~$400 USD pay-as-you-go thereafter);
  **Premium** (~$8,000 USD monthly meters, support with emergency
  escalations); **Enterprise** (negotiated, starts ~$10k/month). Meters bill
  per-event, per-API-call, per-server-minute — read the pricing-meters page
  before estimating.
- **Best at**: Live-service games on Microsoft platforms (Xbox, GDK), teams
  already on Azure, anyone who wants a single vendor for analytics +
  identity + servers. Maturity is the highest in this category.

### Nakama (Heroic Labs)

- **Vendor**: Heroic Labs.
- **License / hosting**: **Apache 2.0** for the server and all official
  client SDKs ([github.com/heroiclabs/nakama](https://github.com/heroiclabs/nakama)).
  Self-host on any Linux box / k8s cluster, or use Heroic Cloud (managed) /
  Heroic Cloud Private (single-tenant). Commercial licences also available
  for dual-licence work.
- **Surface area**: Auth (device, email, social, custom), users/friends/groups,
  realtime sockets, **authoritative match runtime**, matchmaker, leaderboards
  and tournaments, storage engine, in-app-purchase validation, party,
  notifications, Satori (LiveOps & A/B) as a paid add-on.
- **Latest version (verified)**: **Nakama v3.38.0**, released **March 2026**.
  Requires `nakama-common` v1.43.0 for the Go runtime.
- **Server-authoritative game logic**: Match handlers in **TypeScript /
  JavaScript, Lua, or Go** running inside the Nakama process. Lua and TS
  hot-reload; Go compiles to a `.so` plugin loaded at boot.
- **Best at**: Teams that want to **own their stack**, indie/mid studios
  willing to operate Postgres + a Linux box, anyone in a region where US-SaaS
  data residency is a problem (the OSS server runs anywhere a Postgres does).

### AccelByte (AccelByte Inc.)

- **Vendor**: AccelByte (Seattle / Yogyakarta), founded by ex-Epic engineers.
- **License / hosting**: Closed SaaS (AccelByte Gaming Services / AGS) plus
  a separately licenced AccelByte Development Toolkit (ADT) for the client
  SDK. No public self-host.
- **Surface area**: Modular — IAM, lobby, matchmaking v2, session, DSMC
  (dedicated server manager), inventory, catalog, entitlements, achievements,
  challenges, social, UGC, anti-cheat integration, analytics. Pieces are
  bought à la carte.
- **Console story**: Strongest in the category. Used in shipping
  cross-platform titles (Krafton, Dreamhaven and others publicly listed),
  with explicit support for Sony / Microsoft / Nintendo certification
  workflows — this is what justifies the price tag for AAA.
- **Pricing**: Not publicly listed; quote-only. Free trial (90 days AGS,
  30 days ADT, no card). Practically: targets **larger studios and
  publishers**, not solo indies.
- **Best at**: Cross-platform titles with **console SKUs**, AA/AAA budgets,
  publishers who need an entitlements-system that survives a Sony/Microsoft
  cert audit.

### Edgegap

- **Vendor**: Edgegap Technologies (Montreal).
- **What it is**: **Game-server hosting and orchestration only.** Not a
  BaaS. No auth, no leaderboards, no economy. You bring a Linux container,
  Edgegap deploys it close to the players who join a session.
- **Footprint**: **615+ edge locations** across 17 cloud and bare-metal
  providers (verified from edgegap.com homepage and docs, May 2026). Pay-
  per-minute, no commit, no upfront.
- **Multiplay angle**: Unity announced Multiplay EOL in late 2025; the
  service was retired **2026-04-01**. Edgegap published official Unity and
  Unreal migration plugins and is the de-facto migration destination for
  Multiplay customers. Unity also licensed the Multiplay codebase to
  **Rocket Science Group** ("Multiplay by Rocket Science"), which targeted
  late-Q1-2026 go-live as a continuation option for studios that needed
  Multiplay-API parity.
- **Russia note**: Edgegap docs explicitly warn that "some regions
  (e.g. China, Russia) may be restricted due to localized sanctions."
  Verify current Moscow / St-Petersburg availability with sales before
  promising Russian-market players in-region servers.

### Hathora

- **Vendor**: Hathora Inc., **acquired by Fireworks AI in 2026**.
- **Status (verified May 2026)**: **Game-hosting service is shutting down.**
  The platform is "frozen with immediate effect and will permanently shut
  down after ninety (90) days." Hathora is directing existing customers to
  **GameFabric by Nitrado** as the recommended migration path; Docker-native
  workflows are documented to map across.
- **Historical note (kept for migrations)**: Hathora launched 2022, offered
  container-based game-server hosting plus a built-in matchmaker with
  unusually good developer-experience (`hathora deploy` to a global edge
  in minutes). Strong reference customer base in indie multiplayer
  (Mythic Legion, several Steam shooters). DX-quality bar set by Hathora
  is what every competitor is now measured against — even if the company
  itself is gone.
- **What to do today**: **Do not start new projects on Hathora.** If you
  inherit a Hathora deployment, plan the move to GameFabric / Edgegap /
  Nakama-managed-cluster inside the 90-day window.

### Custom backend (Node + Postgres / Go + Redis)

- **When it makes sense**:
  - The game's **rules** are the product (deck-builder economy, MMO sim,
    crypto-of-the-week tokenomics) and you need full control of every
    write path.
  - You already employ a backend team and a vendor would just become a
    fourth deploy target.
  - Data residency / compliance forbids US SaaS (e.g. RU/CN markets,
    KZ government contracts, regulated gambling).
  - Player-count is small enough that a single VPS + managed Postgres is
    cheaper than the smallest paid PlayFab tier.
- **When it doesn't**: First multiplayer project, no SRE on the team,
  publishing on a console (the cert teams will *not* love your bespoke
  IAM), or a deadline shorter than four months.
- **Realistic stacks 2026**: Node 22 + Fastify + Postgres + Redis;
  Go 1.23 + chi + Postgres + NATS; Bun + Hono + Postgres for the very
  lean. WebSocket gateway in front, dedicated game-servers behind
  Edgegap or self-hosted.

## Decision matrix

| Backend | Pricing model | Self-hostable | MP-server hosting | Auth | Economy | Anti-cheat | Best-fit project size |
| ------- | ------------- | ------------- | ----------------- | ---- | ------- | ---------- | --------------------- |
| **PlayFab** | Free dev mode (1k accts) → $400/$8k/$10k+ tiers, metered | No | Yes (Azure regions) | Yes (10+ providers) | Yes (Economy v2) | Via partners | Mid → AAA, Xbox/GDK |
| **Nakama OSS** | $0 server, infra only | **Yes** (Apache 2.0) | Match runtime, not dedicated DS hosting | Yes | Custom (build on storage) | Server-auth + EAC integration | Indie → mid, OSS-friendly |
| **Nakama Cloud** | Quote, usage tiers | Migration possible | Same runtime, managed | Yes | Custom | Same | Indie → AAA who want managed |
| **AccelByte** | Quote (AGS + ADT) | No | Yes (DSMC) | Yes (IAM) | Yes (catalog/entitlements) | Integration-ready | AA → AAA, console-heavy |
| **Edgegap** | Pay-per-minute | No (it *is* the host) | **Yes — only this** | No | No | No | Anyone needing dedicated DS |
| **Hathora** | n/a (sunset 2026) | No | Was yes — discontinuing | Limited | No | No | **Do not start new projects** |
| **Custom** | Your infra bill | Yes (you wrote it) | If you build it | If you build it | If you build it | If you build it | Niche / regulated / control-needed |

## Russian-market mobile multiplayer constraint

This is the live constraint for **Grand Mobile** and Alizhan's Unity shooter,
not theory:

- **PlayFab is sanctions-vulnerable.** It runs on Microsoft Azure and is
  billed through an Azure subscription. A Russian legal entity cannot
  reliably maintain an Azure billing relationship under current sanctions;
  even if a tenant survives today, it can be suspended without notice.
  **Do not** build a Russian-market mobile MP game's identity & player-data
  on PlayFab.
- **AccelByte** is similar — US-incorporated SaaS, sanctions risk applies.
- **Nakama self-hosted is the safer pick.** Apache 2.0 server, deploy on
  a VPS inside RU (Selectel, Yandex Cloud, VK Cloud) or a friendly-region
  POP (Almaty / Astana for Grand Games' Kazakhstani identity). Heroic Labs
  is UK-based and the binary is freely downloadable; Heroic Cloud the
  managed product carries the same sanctions caveats as PlayFab and should
  be avoided for RU titles.
- **Edgegap** explicitly notes Russia / China region restrictions. Verify
  Moscow and Saint-Petersburg POP availability with sales before promising
  in-region game servers — at time of writing (May 2026) this is *not*
  guaranteed and depends on which underlying provider currently has
  capacity. Fallback options are Almaty (Kazakhstan) and Yerevan (Armenia)
  — both reachable from European RU under ~80ms.
- **Custom on RU infra** remains the bullet-proof option for regulated /
  state-adjacent titles.

## What to pick when

| Situation | Pick |
| --------- | ---- |
| Hobby / game-jam | **None.** Steam P2P, Photon Free tier, or your home box. Don't pay for backend until there are players. |
| Indie targeting <100k DAU | **Nakama self-hosted** on a single VPS (8 vCPU / 32GB / managed Postgres ~$80/mo) — or **Hathora-replacement (GameFabric / Edgegap)** if you only need server hosting and use Steamworks for identity. |
| Indie scaling to 1M+ DAU | **Nakama Cloud** or **PlayFab Standard**. The Nakama path keeps optionality (you can leave); PlayFab gives Azure-grade analytics and Xbox/GDK integration out of the box. |
| Console publishing (PS5 / Xbox / Switch) | **AccelByte** or **PlayFab**. Cert support and entitlement-system maturity are the differentiators — your console-cert producer will thank you. |
| Server-heavy / dedicated containers | **Edgegap** (or GameFabric-by-Nitrado) for raw hosting; **Nakama match runtime** if your "server" is mostly authoritative game logic that fits in the same process as the social layer. |
| Russian-market mobile MP | **Nakama self-hosted on RU / KZ infra**, custom auth, in-region game servers via Yandex Cloud or Selectel. Avoid PlayFab/AccelByte/Heroic-Cloud. |

## Server-authoritative game logic — the actual ergonomics

This is the deciding factor for many shooter / RP / sim teams.

### Nakama match runtime

```ts
// match_handler.ts — runs inside the Nakama process
let matchInit: nkruntime.MatchInitFunction = (ctx, logger, nk, params) => {
  return { state: { players: {} }, tickRate: 20, label: "" };
};

let matchLoop: nkruntime.MatchLoopFunction = (ctx, logger, nk, dispatcher, tick, state, messages) => {
  for (const msg of messages) {
    // authoritative simulation step here
  }
  return { state };
};
```

- One file, hot-reloadable, deployed by `nakama` server boot.
- Direct access to storage / leaderboards / RPC from inside the loop.
- 20-60 Hz tick rates are normal; matches scale per-CPU.
- TypeScript via the embedded `goja` runtime; Go for max throughput; Lua
  for the legacy crowd.
- **Trade-off**: match runtime is co-resident with social-server; for
  large-scale dedicated-server sims (PvP shooter at 64+ players) you'll
  still want a separate DS process and Edgegap/GameFabric to host it.

### PlayFab CloudScript v2

```js
// CloudScript handler — runs in Azure-hosted V8
handlers.awardWin = function (args, context) {
  server.UpdatePlayerStatistics({
    PlayFabId: currentPlayerId,
    Statistics: [{ StatisticName: "wins", Value: args.wins }]
  });
  return { ok: true };
};
```

- JavaScript only, request/response handlers (no long-lived loops).
- For anything authoritative-realtime, you actually use **Azure Functions
  + PlayFab Multiplayer Servers**, not CloudScript — CloudScript is for
  small server-side adjudications (claim reward, validate purchase, etc.).
- More moving parts than Nakama for the same problem; better catalog /
  entitlements story when you get there.

### Verdict

For an **RP / shooter / sim** where a server tick must adjudicate every
input, Nakama's in-process match handlers are the cleanest model in this
category. PlayFab's split (CloudScript for short ops + Multiplayer Servers
for sessions) is more powerful at scale but more boilerplate at start.

## Patterns worth borrowing for Boilergen

The thing all six options have in common is **schema-defined entities**:

- **User profile schema** (display name, avatar, level, currencies)
- **Leaderboard definitions** (id, scoring function, reset cadence,
  per-region vs global)
- **Virtual currency definitions** (id, decimals, sources, sinks)
- **Catalog items** (id, price-in-currencies, grants, consumable vs
  durable)
- **Match types / matchmaker rules**

Each vendor renders these into wildly different artefacts (PlayFab Admin
API JSON, Nakama Lua/TS module + Postgres migration, custom REST endpoint
+ DB schema). That's exactly the shape Boilergen handles well: one YAML
spec → multiple compile targets.

A `backend-stubs` plugin could emit, from a single
`game.backend.yaml`:

- **Nakama** — TypeScript runtime module with RPC stubs, leaderboard
  registrations, virtual-currency wallet helpers; Postgres migration.
- **PlayFab** — Admin API requests / `pf` CLI scripts to provision the
  same shape; CloudScript handler stubs.
- **Custom (Node + Postgres)** — Fastify route stubs, Drizzle schema,
  Zod validators.

Boilergen's existing schema-validator already speaks the YAML idiom; this
slots in cleanly as a third target plugin after `boilergen` and
`localization-assistant`.

## Pitfalls

- **Vendor lock-in.** Of the six, only **Nakama (OSS)** and **custom**
  give you exit-velocity. PlayFab and AccelByte player IDs and economies
  are practically un-portable; Edgegap/Hathora hosting is portable in
  principle (they run your container) but the orchestration glue isn't.
- **PlayFab pricing complexity.** Meters are per-event, per-API-call,
  per-server-minute, with separate buckets for analytics, multiplayer
  servers and Party. Build a per-player per-month cost estimate *before*
  you sign — there are credible reports of mid-sized titles being
  surprised on the first invoice.
- **Microsoft-account dependency for PlayFab.** No Azure subscription =
  no PlayFab. This is the single biggest red flag for the
  Russian-market.
- **Edgegap is hosting only.** Auth / state / leaderboards still need a
  backend. Treat Edgegap as "ECS for game-servers", not "backend-as-a-
  service".
- **Hathora sunset.** Anyone who started a project on Hathora 6 months
  ago has 90 days to migrate. Don't add to that pile.
- **Region-by-region pricing varies heavily.** Asia-Pacific is typically
  1.4-2x Europe/NA on every vendor. South-America is sometimes worse.
  Verify per-region pricing before promising in-region servers in your
  pitch deck.
- **Console-cert paperwork.** PlayFab and AccelByte have it built in;
  with Nakama or custom you'll spend weeks on Sony/Microsoft compliance
  paperwork yourself.

## How this connects to Boilergen

1. **`backend-stubs` plugin** — described above. From one
   `game.backend.yaml` emit Nakama match-handler scaffolding + PlayFab
   CloudScript variant + custom-Node skeleton. Same shape as the existing
   boilergen / localization-assistant / schema-validator plugins.
2. **AI Describe routing** — when a user asks Boilergen "where do I
   store player progression for my Unity RP?", the answer is the
   "What to pick when" table above, filtered by the project profile
   they've already declared (target platform, est. DAU, region,
   monetisation model). This file is the canonical source for that
   routing.
3. **Schema-validator extension** — the user-profile / leaderboard /
   currency entity definitions can be checked against the same JSON-
   Schema-style validator already shipped, before any backend stub is
   generated. Errors-at-author-time beat errors-at-deploy-time.

## References

- **Nakama** — [heroiclabs.com/nakama](https://heroiclabs.com/nakama) /
  [github.com/heroiclabs/nakama](https://github.com/heroiclabs/nakama)
  (Apache 2.0; v3.38.0 March 2026)
- **PlayFab** —
  [learn.microsoft.com/gaming/playfab](https://learn.microsoft.com/en-us/gaming/playfab/)
  /
  [pricing-overview](https://learn.microsoft.com/en-us/gaming/playfab/pricing/pricing-overview)
- **AccelByte** — [accelbyte.io](https://accelbyte.io/) (AGS + ADT,
  quote-only, console-cert friendly)
- **Edgegap** — [edgegap.com](https://edgegap.com/) /
  [docs.edgegap.com](https://docs.edgegap.com/) (615+ locations,
  pay-per-minute; Russia/China region caveats)
- **Hathora** — [hathora.dev](https://hathora.dev/) — **shutdown notice
  active May 2026**, migration to GameFabric by Nitrado
- **GameFabric by Nitrado** — recommended migration target from Hathora
- **Multiplay by Rocket Science** — Unity-licensed Multiplay continuation
  for studios needing API parity post-EOL (April 2026)
- **GDC talks worth tracking** — "Backend Architecture for Live Service
  Games" (recurring track), "Picking the Right Backend for Your
  Multiplayer Game" (Heroic Labs, GDC 2025)
- **Comparison reading** — Edgegap's own
  [edgegap-vs-unity-multiplay](https://edgegap.com/comparison/edgegap-vs-unity-multiplay)
  page (vendor-biased but factual on feature deltas), Gameye's
  [Unity Multiplay migration guide](https://gameye.com/unity-multiplay-migration/)
