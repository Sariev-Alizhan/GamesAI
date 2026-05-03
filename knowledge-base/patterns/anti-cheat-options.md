---
type: pattern
slug: anti-cheat-options
title: Anti-cheat options 2026 — VAC, EAC, BattlEye, server-authoritative
engine: other
content_format: mixed
language: csharp
license: mixed (commercial SDKs + first-principles practices)
source_url: https://easy.ac/en-us/
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [anti-cheat, vac, eac, battleye, server-authority, security]
---

# Anti-cheat options 2026 — VAC, EAC, BattlEye, server-authoritative

> A defensive-security overview of the anti-cheat (AC) landscape as it stands
> in May 2026. Aimed at studios choosing an AC stack and at GamesAI users
> asking "how do I keep cheaters off my RP server?" — not at anyone trying to
> bypass anti-cheat.
>
> **Defensive scope. No bypass content. No how-to-cheat content.** Where a
> kernel-mode AC has well-documented Linux/Steam Deck consequences, the
> consequences are described so studios can make an informed call. Where a
> known cheat technique exists, it is named only at the level required to
> understand what is being defended against — implementation detail is
> deliberately omitted.

## 1. The cheating threat model in 2026

A modern multiplayer game has to defend against five overlapping categories
of cheats:

- **Wallhacks / ESP** — the client renders information it shouldn't have
  (enemy positions through walls, item highlights, cooldown timers visible
  on opponents). Root cause is almost always *over-broadcasting* — the
  server sends entity transforms or state the client doesn't strictly need
  to render the current frame.
- **Aimbots / triggerbots** — automated targeting. Modern variants split
  into (i) software-input-injection, the kind kernel-mode AC catches, and
  (ii) external hardware (DMA capture cards, second PCs running CV on a
  capture stream and synthesising HID input) which kernel-mode AC cannot
  see at all.
- **Mods / asset replacement** — swapping textures or models so targets
  glow, hitboxes are visualised, or smokes turn transparent. The line
  between "QoL mod" and "cheat" is policy, not technology.
- **Packet manipulation / replay** — forging or replaying network frames to
  spoof actions the client never performed (duped items, teleportation,
  speed hacks, bypassed cooldowns).
- **Automation bots** — long-running scripted accounts that farm currency,
  spam chat, scout markets, or grief.

The relative weighting differs sharply by genre — competitive FPS lives and
dies on (a) and (b), MMOs care most about (e), RP servers (Grand Mobile,
FiveM, GTA-style frameworks) care most about (c) and (d). No single AC
product covers all five categories, and the most effective defence almost
always lives on the **server**, not the client. This entry argues that
position throughout.

## 2. The three commercial anti-cheats

### VAC — Valve Anti-Cheat

- **Cost**: free for any title shipping on Steam.
- **Detection model**: signature-based file/memory scanning at the
  user-space level; ban-wave cadence (cheats accumulate detection
  signatures, then a wave of bans goes out weeks/months later). Augmented
  since ~2024 by **VAC Live**, an ML-driven server-side heuristic system
  that bans on behaviour patterns. CS2's "VAC 3.0" rollout in 2026 is the
  current public face of VAC Live.
- **Strengths**:
  - Zero integration friction for Steam-distributed games.
  - Integrates with Steam Matchmaking via VAC-Secure.
  - Doesn't run a kernel driver — doesn't kill Linux/Steam Deck support.
  - Free.
- **Weaknesses**:
  - Weak against bespoke / private cheats that don't carry known
    signatures.
  - Ban-wave cadence means cheaters get hours-to-weeks of value before
    bans land.
  - VAC Live's heuristic side has produced false-positive incidents — a
    January 2026 sensitivity tweak handed bans to CS2 players whose warmup
    mouse-spin looked like a spinbot.
  - Steam-only. Not an option for non-Steam titles.
- **Bottom line**: a sensible default for any Steam game. Free,
  non-invasive, decent floor — but not a complete answer for high-stakes
  competitive titles. Best paired with strong server authority.

### EAC — Easy Anti-Cheat (Epic, since 2018)

- **Cost**: **free** when integrated via **Epic Online Services (EOS)** —
  this is the standard 2026 integration path. Standalone non-EOS EAC
  licensing exists but the EOS route is the one new projects pick.
- **Detection model**: kernel-mode driver on Windows, integrity checks on
  game binaries and process memory, plus Epic-side telemetry. Server-side
  hooks for game-event validation. Unreal Engine integration is
  particularly polished — a few clicks in the EOS portal plus a plugin
  enable.
- **Linux/Steam Deck**: **supported via Proton/Wine since 2022** — devs
  flip a checkbox in the EOS Developer Portal to enable Linux/Mac/Steam
  Deck. **Adoption is the bottleneck, not the technology.** Some shipping
  titles enable it (Rocket League added EAC in April 2026 with Linux/Deck
  support intact); others ship EAC and leave the Linux toggle off,
  breaking Deck.
- **Strengths**:
  - Industry-standard, large catalogue of pre-built game-engine
    integrations (Unreal especially).
  - Reasonable free tier via EOS.
  - Kernel-level coverage on Windows.
  - Cross-platform path exists if you opt in.
- **Weaknesses**:
  - Kernel-mode driver controversy persists — installs a Windows ring-0
    component with the surface area that implies.
  - On Linux/Deck the protection is effectively user-space (runs under
    Proton without kernel access), which is less invasive but also less
    effective — you get the cross-platform reach at the cost of weaker
    Linux-side detection.
  - Epic-account ecosystem coupling if you go the EOS route (not always a
    problem, but it's a coupling).
  - Vendor lock-in at the engine plugin level.

### BattlEye

- **Cost**: **commercial / paid licensing**, negotiated case-by-case (no
  public price sheet). BattlEye does not publish rates; studios contact
  `license[at]battleye.com` directly. Generally regarded as cost-effective
  at scale, expensive for small projects. No free tier.
- **Detection model**: kernel-mode driver, in-game memory integrity,
  server-side validation hooks, BattlEye-side telemetry pipeline. Strong
  reputation for catching private cheats — anecdotally the toughest of the
  three against bespoke development.
- **Notable users**: ARMA 3 / Reforger, DayZ, Rainbow Six Siege, PUBG,
  Escape from Tarkov, Squad. Heavy in mil-sim, tac-shooter, and
  large-scale-PvP genres.
- **Linux/Steam Deck**: support exists via Proton (announced 2021–2022
  alongside EAC), but again adoption is per-title. Some BattlEye titles
  enable Deck, others don't. Same opt-in dynamic as EAC.
- **Strengths**:
  - Strong detection record against private/custom cheats.
  - Established in mil-sim and tac-shooter spaces.
  - Server-event hooks well suited to large-team multiplayer.
  - Active update cadence — BattlEye operationally pushes signatures fast.
- **Weaknesses**:
  - Paid; no free tier.
  - Closed commercial; no source visibility.
  - Vendor lock-in identical to EAC.
  - Kernel-driver caveats identical to EAC — same Windows ring-0 surface,
    same Linux-via-Proton trade-off.

### Honourable mention — nProtect GameGuard

Not in the "big three" but worth flagging because **Helldivers 2** uses it
and it generated significant 2024–2026 controversy. Korean-origin (INCA
Internet), kernel-mode on Windows, frequently described as rootkit-class
by critics. On Linux/Proton it loses its kernel hooks (no native Linux
kernel module) and runs as a less-privileged user-space component — which
is paradoxically why HD2 plays on Steam Deck at all. **Not recommended for
new Western projects** given the reputational baggage and the limited
Western dev-support footprint.

### Honourable mention — Riot Vanguard

Vanguard is the in-house Riot anti-cheat used by Valorant and (since 2024)
League of Legends. Kernel-mode, boot-time driver, very intrusive — runs at
boot regardless of whether the game is launched. Not licensable to third
parties. Mentioned here only because it's the reference point industry
discussion frequently anchors on ("Why doesn't EAC catch what Vanguard
catches?" — because Vanguard accepts more user trust cost in exchange for
detection depth). Not an option for outside studios.

## 3. Linux / Steam Deck reality check

The 2022–2024 period was the low point: kernel-mode AC silently broke
several major multiplayer titles for Steam Deck users right as the Deck
was becoming the most successful handheld gaming PC ever shipped. Three
patterns emerged and are still in force in 2026.

**Pattern A — vendor enables Linux, dev opts in.** EAC and BattlEye both
shipped Proton-compatible builds. When the dev flips the toggle, the game
works on Deck. **Rocket League (April 2026)** is the textbook recent
example: Psyonix added EAC and kept Linux/Deck working — the announcement
explicitly called out continued Steam Deck support. Apex Legends, Fall
Guys, Dead by Daylight, and a number of Unreal-based shooters also enabled
it. As of mid-2026 the technology is mature.

**Pattern B — vendor enables Linux, dev does NOT opt in.** Same EAC, same
BattlEye, but the studio leaves the Linux box unchecked and the game
becomes Deck-incompatible. This is now a **publishing decision, not a
technical limitation**. Studios cite anti-cheat efficacy ("kernel coverage
we don't get on Proton") and support load (one more platform to QA) as
reasons. Players generally find this answer unsatisfying given that
several flagship titles demonstrate the cross-platform path works.

**Pattern C — kernel-mode AC with no Linux story at all.** nProtect
GameGuard is the most prominent example. The game still runs on
Linux/Deck because the kernel module doesn't load (no Linux build), but
the Windows-side surface area remains a security concern that hasn't gone
away in community discussion of Helldivers 2.

**Valve's CS2 stance** is the philosophical counter-example: Valve has
explicitly avoided kernel-mode AC for CS2 because they're betting on
Linux/Deck, and instead leans entirely on **VAC Live** server-side
heuristics. The 2026 VAC Live updates ("VAC 3.0") show this approach can
work for a flagship title — but it took years of ML investment, accepts a
higher false-positive rate than kernel-mode peers, and required Valve's
unique data position (every VAC-enabled game's telemetry).

For RP and indie studios in 2026 the practical takeaway is:
**if you want Steam Deck users, EAC-via-EOS-with-Linux-enabled is the
path of least resistance.** BattlEye works too but costs more. Avoid AC
vendors that have no Proton story unless you have a hard reason and have
budgeted for the lost Deck audience.

## 4. Server-authoritative architecture as the real anti-cheat

This section is the most important one in this entry, and the one most
often skipped by studios shopping for an AC SKU. It is not glamorous,
there is no licence to buy, and no vendor will pitch it to you — which is
exactly why it is the most under-invested-in defence in the industry.

**First principles.** A cheat can only manipulate what the client knows
or what the server trusts. If the client doesn't know the enemy's
position behind the wall, a wallhack has nothing to render. If the server
validates every shot's geometry and timing, an aimbot reduces to "moves
the cursor faster than humanly possible" — a much narrower detection
surface than "shoots people perfectly through smoke and across map." If
the server is the only source of truth for items and currency, an
inventory mod is a cosmetic-only annoyance instead of an economy-breaking
exploit.

**The implications for system design.**

- **Visibility culling on the server, not the client.** Don't send entity
  transforms the client doesn't need to render. Most engines default to
  broadcasting a generous radius around each player; tightening that
  radius (and clipping by occlusion where feasible) destroys most
  ESP/wallhack value. Counter-Strike 2 and Valorant both invest heavily
  here; older Source-engine games used to leak too much, and ESP was
  trivial as a result.
- **Authoritative hit detection.** Client says "I shot at world-coord X
  with weapon Y at time T." Server independently rewinds, validates the
  line-of-sight, validates ammo / cooldown / weapon-state, and decides
  whether the hit lands. Client predictions are display-only — they make
  the game feel responsive, but they do not influence the canonical
  outcome.
- **Authoritative inventory and economy.** No "client says I picked up
  the item, server believes it." Item pickups originate as server events,
  not client claims. Currency mutations originate server-side. Anything
  client-initiated is an *intent*, not a *fact*.
- **Rate-limit and bound every input.** Movement vectors clamped to max
  speed. Action frequencies (shoot, interact, chat) capped per-tick.
  Anything outside the envelope is *discarded*, not banned-on — many
  false positives come from network jitter, not cheats. A discard says
  "your client misbehaved, no harm done"; a ban says "we're sure you're
  a cheater" and that bar has to be much higher.
- **Replay-safe action IDs.** Each action carries a server-issued nonce
  so a replayed packet is detected and dropped.
- **No client-trusted RNG.** Loot rolls, crit chances, anything with
  randomness — server-side, with the seed never leaving the server.
  Otherwise a tampered client predicts outcomes and only "submits"
  favourable rolls.

A server-authoritative architecture is **harder to retrofit than to
build in**, which is why it is the most cited "I wish we'd done that
earlier" lesson among multiplayer postmortems. **It is also free**, in
the sense that no AC vendor licence is involved — just engineering rigour
and willingness to push more compute server-side.

For FiveM / Grand Mobile specifically: most cheat resources work because
they exploit *client-trusted state* — items added to client inventory
without server verification, money set client-side and only later
reconciled, teleport allowed because the server accepts arbitrary
client-supplied coordinates, vehicle spawn allowed via client-only event
trigger. The defence is the same defence as any multiplayer game:
**the server is the source of truth.** Every framework convention in
QBCore / ESX / Qbox that tells you to use server-side events for state
mutations is anti-cheat advice in disguise.

## 5. Server-side detection patterns

Once you have server-authoritative gameplay, you can run detection on the
resulting telemetry. Detection patterns that work and have been validated
in production at multiple studios:

- **Statistical anomaly detection.** Headshot percentage, accuracy over
  distance, time-to-target after enemy reveal, kill-streak distributions.
  Build per-player baselines and flag outliers. Modern stacks (CS2 VAC
  Live, Valorant Vanguard's server side, EOS Player Reports) all sit on
  this idea. The trick is the baseline — a global threshold ("anyone
  over 80% headshots is banned") catches pros and bans them; a personal
  baseline ("this player has been at 30% headshots for 200 hours and is
  now at 75%") catches the actual change.
- **Replay analysis post-match.** Record the server-side authoritative
  match log; run anomaly detection async. Lets you ban without affecting
  the live game and avoids real-time false-positive pressure. CS2's
  Overwatch (community-review) layered on top of automated replay
  analysis is the canonical pattern.
- **Telemetry baselining per-player.** What does THIS player normally do?
  Sudden 3x accuracy improvement after a long break is the kind of signal
  a heuristic catches that a static threshold misses. Combine with hours
  played and recent device fingerprint (is this even the same person?)
  and you have a strong "account compromise vs cheat" signal.
- **Crowd-sourced reporting.** Player reports as a prior — high-report
  players get more aggressive scanning. Cheap, effective, prone to abuse
  (review the reports, don't auto-ban). Reports are evidence weighting,
  not verdicts.
- **Honeypots.** Server-only entities that should never be visible to a
  normal client. If the client interacts with them — moves toward them
  before they should be in line-of-sight, snaps the cursor to them in a
  later frame — it was rendering hidden state. False-positive rate is
  near-zero when the honeypot design is tight.
- **Network anomaly detection.** Impossible movement (teleport),
  impossible action rates (1000 weapon-fire events per second),
  out-of-sequence packets. These shouldn't get past your input bounding
  in the first place; if they do, that's a defence-in-depth signal that
  the client is misbehaving.

None of these require a kernel driver. All of them require a half-decent
data pipeline, which is a smaller ask than a kernel driver in 2026.

## 6. VAC-secure / matchmaking integration

Steam offers **VAC-Secure matchmaking** as an opt-in flag. Players banned
by VAC in any VAC-enabled game are excluded from VAC-Secure lobbies for
the offending game, and Steam exposes the secure-flag to the matchmaker.
Effect: a soft "trusted lobby" tier. Combined with **Steam Family View /
phone-verification gating**, you get a usable trust signal without writing
your own reputation system.

CS2 layers Trust Factor and Prime status on top of VAC-Secure to triage
matchmaking pools — Prime requires a phone number tied to an unrestricted
account, Trust Factor is a Valve-side opaque score. The architecture
pattern is reusable: **multi-tier trust, route by trust, ban when
detection confidence is high enough.**

For RP/FiveM servers there's no Steam-Matchmaking integration to plug
into, but the analogous pattern is **whitelist + tiered trust**: new
players land in a low-trust pool with stricter logging, graduate to full
access after N hours of clean play, lose tier on confirmed bad behaviour.
This is the Grand Mobile-style pattern and it works — most established
RP servers run a variant.

## 7. Mobile anti-cheat 2026

Mobile is a separate ecosystem with its own primitives.

- **Google Play Integrity API** (Android). Replaces the older SafetyNet.
  Server-side attestation of three signals: device integrity (rooted?
  bootloader unlocked?), app integrity (is the running APK the unmodified
  one Google distributed?), and account licensing. Free. Universally used
  by mobile MP titles in 2026. Returns a JWT the game server validates;
  the client cannot spoof it without compromising the device. Tier
  decisions ("strong" / "basic" / "device-unverified") are server-side
  policy.
- **Apple DeviceCheck / App Attest**. iOS equivalents. App Attest is the
  newer (iOS 14+) primitive for proving the app is genuine and the device
  hasn't been tampered. Server-side only — the attestation token is
  verified against Apple's API. DeviceCheck (older) gives a 2-bit
  per-device-per-app persistent flag, useful for "this device has been
  banned" enforcement that survives reinstall.
- **Tencent's MTP / TP anti-cheat (ACE)**. Used by PUBG Mobile, Honor of
  Kings, large Asia-market titles. Heavier client agent, deeper integrity
  checks, oriented toward markets with widespread sideloaded modified
  APKs. Closed/commercial; mostly relevant to studios publishing in
  CN/SEA via Tencent or NetEase partnerships.
- **Server-authoritative still applies.** Even with Play Integrity green,
  the mobile client can be MITM'd at the network layer; bound and
  validate every input on the server. Mobile's tighter sandboxing makes
  client tampering harder than on PC, but it does not make the server-
  authoritative discipline optional.
- **Emulator detection** is its own sub-problem on Android. Most mobile
  titles either explicitly support emulator play (in their own segregated
  matchmaking) or block it via Play Integrity device-integrity tier.
  Picking a stance early is much cheaper than retrofitting one.

Grand Mobile ships on Android — Play Integrity is table stakes. iOS
DeviceCheck/App Attest covers the iOS side. Tencent ACE only enters
consideration if a CN partner publishing deal happens.

## 8. The decision tree

A short table to short-circuit decision paralysis. Recommendations are
defaults — every project has caveats.

| Game type | Distribution | Recommended AC stack |
|---|---|---|
| Steam-only competitive FPS, large budget | Steam | EAC-via-EOS (kernel on Win, user-space on Linux) **+** server-authoritative **+** server-side stats detection **+** VAC-Secure matchmaking |
| Steam-only competitive FPS, small budget | Steam | VAC (free) **+** server-authoritative **+** stats detection **+** VAC-Secure matchmaking |
| MilSim / tac-shooter | Steam / Epic | BattlEye if budget allows; otherwise EAC-via-EOS. Always server-authoritative. |
| Co-op PvE | Any | EAC-via-EOS or none — emphasis on server-authoritative + lobby trust |
| MMO | Proprietary launcher | Server-authoritative is 90% of the answer; add EAC/BattlEye if PvP exists |
| RP server (FiveM / Grand Mobile / GTA-style) | Custom / Steam | **Server-authoritative is the entire answer.** Whitelist + admin tooling + resource-source-control. AC products mostly N/A. |
| Mobile MP, Western markets | Play Store / App Store | Play Integrity + App Attest + server-authoritative |
| Mobile MP, CN/SEA distribution | Local stores | Tencent ACE (if publishing partner requires) + server-authoritative |
| Indie multiplayer | Steam | VAC + server-authoritative — don't over-engineer |
| Single-player | Any | None — anti-cheat is a multiplayer-only tax |
| Speedrun-friendly title | Any | None / minimal — cheats vs runs is a community-policy problem, not an AC problem |

The pattern visible in the table: **server-authoritative appears in every
non-trivial row.** That is the load-bearing recommendation. Vendor choice
is the minor variable.

## 9. What Boilergen + GamesAI should care about

GamesAI is **not** in the anti-cheat business. We do not ship AC code, do
not ship AC SDKs, and do not generate code that touches AC kernel
drivers. The relevance to our roadmap is narrower but real:

- **Schema Validator's FiveM mode could detect common cheat-resource
  patterns in `fxmanifest.lua` / resource manifests.** Specific signals
  worth flagging:
  - Resources that import `executor` / `menu` libraries with names
    matching known menu families.
  - Resources that register no client-server events but ship large
    obfuscated client scripts.
  - Resources that bundle precompiled `.luac` of suspicious size with no
    accompanying source.
  - Resources that hook into `playerSpawned` / `playerConnecting` only to
    overwrite admin tables.

  This is **suspicious-pattern flagging**, not antivirus — a "you might
  want to look at this" warning, not a verdict. Signature-style detection
  is out of scope (we don't ship a signature DB). Spec lives in
  `apps/schema-validator/` if/when this lands; not committed yet.

- **AI Describe answers** should reference this KB entry when users ask
  about cheaters in their RP server. The RAG system already cites pattern
  entries; this one becomes the canonical first stop for "how do I deal
  with cheaters" questions, with the load-bearing recommendation being
  "make the server authoritative, then everything else gets easier."

- **Boilergen-generated server code stays server-authoritative by
  default.** If a generated job/business/organization template ever gives
  the client authority over money or items, that's a bug class, not a
  feature. This entry is the rationale behind that rule and should be
  cited in code review of new Boilergen templates.

- **What we do NOT do.** No AC code generation. No "anti-cheat resource"
  templates. No bypass-detection logic that touches kernel-mode anything.
  No advice on circumventing AC. No reverse-engineering writeups. The
  line is clear and we hold it. If a user prompts AI Describe for cheat
  development help, the assistant declines and points back at this entry.

## 10. Pitfalls

- **Kernel-mode AC + Linux gaming reality.** Even in 2026, choosing
  kernel-mode AC and *not* enabling the Proton path costs you Steam Deck
  users. Decide deliberately; don't drift into the choice by inertia.
- **False positives are a support nightmare.** Every kernel-mode AC has
  shipped at least one update that banned thousands of innocent players
  (CS2 VAC Live January 2026 is the freshest example, with mouse-spin
  warmup behaviour misclassified as spinbots). Build a fast appeal
  pipeline before you ship aggressive detection. "AI-driven heuristic
  with no human review loop" is the worst of all worlds — it bans at
  scale and apologises by hand.
- **AC vendor lock-in.** EAC and BattlEye integrate at the engine level
  (Unreal plugin, custom hooks). Switching vendors mid-project is weeks
  of work and re-certification on every supported platform. Pick once,
  pick carefully.
- **AC ≠ moderation.** Anti-cheat catches cheaters. It does not catch
  grief, slurs, exploits-of-design (vs exploits-of-code), wash-trading,
  RMT, or coordinated griefing rings. A separate moderation /
  trust-and-safety stack is required and is an entirely separate problem
  with its own staffing and tooling implications.
- **Russian / CIS market reality.** Steam restrictions affect distribution
  in RU/BY since 2022; payment rails, currency support, and account
  access have all degraded. VAC's value drops where Steam access itself
  is degraded. Grand Mobile ships outside Steam for this reason; Play
  Integrity + Apple App Attest + server-authority do most of the lifting
  for the CIS player base. Do not assume "Steam + VAC" is a default for
  this market.
- **Don't ban-wave too aggressively in small games.** Ban-waves work
  because they hide signature thresholds from cheat developers. In a 200-
  CCU game, a ban-wave reveals everything (one cheat dev runs ten
  accounts, watches which get hit). Smaller games should bias toward
  replay-analysis and per-player anomalies, banned individually.
- **Don't conflate AC with DRM.** They share the kernel-driver
  controversy but solve different problems. A piracy-prevention DRM
  driver does not catch aimbots. An aimbot-detection AC does not stop
  piracy. Studios that bolt them together get the worst PR of both — the
  user-trust cost of two ring-0 drivers, the protection of neither at
  full strength.
- **Don't trust client-side checks.** Any check that runs on the client
  is being executed in an environment the cheater controls. Client-side
  checks raise the cost of cheat development by a small constant; they
  do not stop cheats. Treat client-side checks as one signal in a
  defence-in-depth stack, never as the line of defence.
- **Don't underestimate hardware cheats.** DMA cards and second-PC
  CV-aim setups are the 2024–2026 frontier. Kernel-mode AC sees nothing
  of these — they look like "very good player with very good mouse." The
  only counter is server-side behavioural detection on the patterns
  they produce (pre-aim, snap-to-head latency, occlusion-defying
  awareness).

## 11. References

- Easy Anti-Cheat (Epic Online Services): https://easy.ac/en-us/
- BattlEye: https://www.battleye.com/
- Valve Anti-Cheat overview (Steamworks): https://partner.steamgames.com/doc/features/anticheat
- Google Play Integrity API: https://developer.android.com/google/play/integrity
- Apple App Attest / DeviceCheck: https://developer.apple.com/documentation/devicecheck
- EOS launches Anti-Cheat for Linux/Mac/Steam Deck: https://onlineservices.epicgames.com/news/epic-online-services-launches-anti-cheat-support-for-linux-mac-and-steam-deck
- Rocket League adds EAC with Linux/Deck support intact (April 2026): https://www.gamingonlinux.com/2026/04/rocket-league-adds-easy-anti-cheat-with-steam-deck-linux-still-supported/
- Helldivers 2 nProtect GameGuard controversy thread: https://www.resetera.com/threads/helldivers-2-incorporates-nprotect-gameguard-on-pc-a-kernel-level-rootkit-anti-cheat-technical-director-responds-to-the-controversy-on-reddit.808530/
- VAC Live "VAC 3.0" 2026 rollout coverage: https://www.strafe.com/news/read/vac-live-update-devastates-cs2-cheating-community/
- Linux gaming compatibility 2026 overview: https://www.geeky-gadgets.com/linux-gaming-massive-upgrade-2026/
- BattlEye vs EAC comparison context: https://www.getgud.io/blog/battleeye-vs-easy-anti-cheat-which-is-better/

## Local artefacts

- This entry — `knowledge-base/patterns/anti-cheat-options.md`
- Related: `knowledge-base/patterns/role-grade-hierarchy.md` —
  server-authoritative permission model for RP entities; same first
  principle applied to job/business/org permissions.
- Related (when written):
  `knowledge-base/patterns/server-authoritative-multiplayer.md` —
  deep-dive on the architecture this entry repeatedly references.
- Schema Validator FiveM-mode resource-pattern check:
  `apps/schema-validator/` (TODO, not yet implemented; see section 9 for
  the suspicious-pattern signal list this would key off).
