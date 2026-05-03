---
type: pattern
slug: youtube-learning-resources
title: YouTube tutorial channels for Unity 3D MP shooter dev
genre: fps
engine: unity
content_format: code
language: csharp
license: mixed (linked repos verified per item)
source_url: https://www.youtube.com/results?search_query=unity+multiplayer+fps+tutorial
last_analyzed: 2026-05-03
maturity: mixed
relevance_to_grandgames: high
tags: [unity, multiplayer, fps, mobile, tutorials, youtube, learning]
---

# YouTube tutorial channels for Unity 3D MP shooter dev

> Verified 2026-05-03. Companion to `oss-unity-mp-shooters.md`. That entry
> filtered for OSI-licensed production-grade repos and only 3 survived
> (Open Tactics, Trifecta, fps-multiplayer-unity). The harsh truth: the
> Flump tooling sprint cannot live on 3 reference repos. YouTube tutorial
> series fill the gap — they are smaller-scope, often outdated, but they
> teach **specific patterns** (a lobby flow, a hit-registration loop, a
> mobile FAB for shooting) that production repos either skip or bury.

---

## 1. Why this entry exists

`oss-unity-mp-shooters.md` killed every Unity Companion License repo
(Boss Room, FPSSample, Bitesize) because we cannot vendor or re-distribute
those patterns. **Tutorials are different**: a YouTuber's repo is *their*
work, licensed how they say (often MIT / Unlicense), and the patterns are
explicitly designed to be copied. The trade-off is depth — a 90-minute
"complete multiplayer FPS" video does not teach lag compensation. We need
to be honest about which channels teach what, and which ones are 50% camera
+ click-to-shoot demos with `[SyncVar]` slapped on top.

This entry is a **filter for engineering time**. Flump's open questions
right now are: mobile FPS touch input, NGO 2.x lobby flow, hardpoint mode
state machine, bot AI scaffolding for low-pop modes. For each question,
which video would I send a new hire to?

---

## 2. Channel-by-channel summary

| Channel | Best for Flump? | Has linked repo | Repo license | Notes |
|---|---|---|---|---|
| **Code Monkey** (Hugo Carvalho) | YES | Project files via website (not GitHub) | Author-restricted (educational use) | Best free NGO course on the internet. Kitchen Chaos multiplayer = closest thing to a full UGS Lobby+Relay walk-through |
| **Dapper Dino** (Nathan Farrer) | Mid | `DapperDino/Mirror-Multiplayer-Tutorials` | MIT | Lobby/room scripts are good. Mirror, not NGO — translation cost |
| **Natty Creations / Natty GameDev** | Low — content sparse | None confirmed | n/a | Couldn't verify a current FPS series with a linked repo |
| **Tarodev** (Matthew Spencer) | NO for MP, YES for arch | `Matthew-J-Spencer/Tarodev` (utilities) | MIT | Featured in Unity's "9 tools for MP dev" but no MP series of his own. Use for clean-arch / 2D controller patterns only |
| **Brackeys** (archived 2020) | Reference only | `Brackeys/MultiplayerFPS-Tutorial` | Unlicense | Built on **uNet (deprecated)**. Educational lineage value only — every Unity FPS tutorial since copies the structure |
| **JabrilsXR** | NO | None found | n/a | Not a Unity MP tutorial source despite the name |
| **GameDev Guide** | Low | None confirmed | n/a | Architecture content, no multiplayer series |
| **Sebastian Lague** | NO | n/a | n/a | Algorithmic content (procgen, raymarching). No networking content |
| **GameDev.tv** (Game Dev Television) | Mid (paid) | Course-bundled, not public | proprietary | Two MP courses — Mirror RTS course + NGO top-down shooter course. Quality is solid but **paid** and not redistributable |
| **Sasquatch B Studios** | Low | Misc tutorial repos | varies | Husband-and-wife channel; metroidvania-focused. No FPS or NGO MP series |
| **GameDevHQ** | NO | Bootcamp-bundled | proprietary | Paid program; no useful free MP-FPS content |
| **Imphenzia** (Stefan Persson) | Indirect | Asset packages, not GH repos | Asset Store EULA | Built `Line War` (4-yr MP project) — devlog has war stories, not tutorial code. Useful for "what hurts at scale" not "how do I write an RPC" |
| **Faryon Productions** | n/a — not found | n/a | n/a | Couldn't verify the channel exists under that name |
| **Mind With Games** | n/a — not found | n/a | n/a | Couldn't verify a current channel matching this name |
| **Tom60chat** | Mid | `Tom60chat/MultiplayerFPS-Tutorial` | Unlicense | Brackeys' uNet tutorial **upgraded to Mirror**. Unity 2019.3, archived Jan 2022. Useful for studying the Mirror port pattern |
| **TUTOUNITYFR (zef)** | Mid (FR) | `TUTOUNITYFR/creer-un-fps-multijoueur-mirror-unity` | Public | French series. Good for non-EN learners; same generation as Brackeys port |

The "not found" entries (Natty Creations, Faryon Productions, Mind With
Games, JabrilsXR-as-FPS) are honest negatives — searches for those exact
names did not surface a verifiable Unity multiplayer FPS series with
public repo. Treat them as "didn't exist or wasn't findable" rather than
"missed."

---

## 3. Top 5 specific video series worth deep-diving

Ordered by Flump-relevance, not by view count.

### 3.1 Code Monkey — "Learn Unity Multiplayer (FREE Complete Course, NGO)"

- Video: <https://www.youtube.com/watch?v=7glCsF9fv3s> (the 2023 NGO course)
- Long-form follow-up: <https://www.youtube.com/watch?v=3yuBOB3VrCk> ("COMPLETE Unity Multiplayer Tutorial")
- Project files: `unitycodemonkey.com/kitchenchaosmultiplayercourse.php`
  (download via author's site; **not** distributed via GitHub by Hugo himself)
- Length: ~7 hours core + extensions
- Topics: NGO connection lifecycle, ServerRpc / ClientRpc, NetworkVariables,
  NetworkObject lifecycle, character selection, **Unity Lobby**, **Relay**,
  Steam transport bridge
- License nuance: project files are author-distributed and intended for
  learners. Patterns can be re-implemented; you cannot re-host the assets.
  Code Monkey is referenced in the official Unity Multiplayer docs, so the
  pedagogy is endorsed by Unity.
- Why it matters for Flump: the **only** end-to-end NGO+Lobby+Relay walk
  from a single trustworthy source. Flump's `NetworkPlayerController.cs`
  and lobby scripts are descended from the same idioms. If you write down
  the Kitchen Chaos lobby state machine as a diagram, you have ~70% of
  what Flump needs for Duel1v1 quickplay matchmaking.

### 3.2 Dapper Dino — Mirror Multiplayer Tutorials (lobby focus)

- Repo: <https://github.com/DapperDino/Mirror-Multiplayer-Tutorials> (MIT)
- Specific files worth reading:
  - `Assets/Tutorials/Lobby/Scripts/NetworkManagerLobby.cs`
  - `Assets/Tutorials/Lobby/Scripts/NetworkRoomPlayerLobby.cs`
- Topics: lobby flow, ready-up, scene transition from lobby to game scene,
  player slots, host migration concepts
- Why it matters for Flump: even though Flump uses NGO not Mirror, the
  **lobby pattern is engine-agnostic**. The "lobby player → game player"
  swap, the ready-state SyncVar, and the scene-transition gate translate
  almost line-for-line into NGO `NetworkVariable<bool>` + `SceneManager`.
- Quality verdict: educational. Code is clean, comments are sparse. Watch
  at 1.5x. Do not vendor — re-implement.

### 3.3 Brackeys — MultiplayerFPS-Tutorial (historical reference)

- Repo: <https://github.com/Brackeys/MultiplayerFPS-Tutorial> (Unlicense, public domain)
- Built on **Unity Networking (uNet)**, which Unity deprecated in 2018
- Why it still matters: the **structural template** — `Player.cs`,
  `PlayerShoot.cs`, `PlayerSetup.cs`, `PlayerManager.cs`, `MatchManager.cs`
  separation — is the lineage every "build a Unity MP FPS" tutorial since
  has copied. Reading it teaches you the *vocabulary* of the genre even
  if the API has rotated through uNet → Mirror → MLAPI → NGO
- DO NOT use the actual code. uNet does not exist in modern Unity.
- Mirror-upgraded fork that *is* runnable:
  <https://github.com/Tom60chat/MultiplayerFPS-Tutorial> (Unlicense, Unity 2019.3, archived)

### 3.4 Unity official — "Intro to Unity 6 Multiplayer: Distributed Authority"

- Video: <https://www.youtube.com/watch?v=9wNKZPoMWvw> (Nov 2024)
- Follow-up: <https://www.youtube.com/watch?v=Ndixa64p3dQ> (Feb 2025)
- Unite 2024 deep-dive: <https://www.youtube.com/watch?v=3jBOTk_qozA>
- Why it matters for Flump: NGO 2.x's **distributed authority** mode is
  new in the same package version Flump uses (NGO 2.9.1). It changes the
  "who owns this NetworkObject" answer at runtime — relevant for hardpoint
  capture logic where ownership of the cap zone moves between teams.
  Even if Flump stays on classic server-auth, knowing the DA mental model
  prevents you from designing yourself into a corner.

### 3.5 Photon Fusion BR200 sample (video walkthroughs + repo)

- Sample landing: <https://www.photonengine.com/samples>
- Hathora-integrated fork: <https://github.com/hathora/photon-fusion-br>
  (license unspecified — treat as **read-only reference**, do not vendor)
- Why it matters for Flump: BR200 is a 200-player, 60Hz client-prediction
  reference. Flump's largest mode is 5v5, but BR200 demonstrates the
  *upper bound* of what client prediction + interpolation looks like in
  Unity right now. The dedicated-server hosting flow (Hathora /
  UGS Game Server Hosting) is also the same pattern Flump will need
  if it scales past Relay.
- Honest caveat: not a tutorial, it's a sample. You'll need to read it
  side-by-side with Photon's docs.

---

## 4. Russian-language tutorials — for Grand Mobile / Flump audience

Flump's primary audience overlaps with Grand Mobile's: Russian-speaking
mobile players. Tutorial content for Russian-speaking devs in this exact
niche (Unity 3D MP shooter) is **thinner than expected**. Honest survey:

### 4.1 What exists

- **3D шутер с мультиплеером в Unity** (anonymous, ~6-part series) —
  e.g. <https://www.youtube.com/watch?v=rmidcOOhFII> (Урок #1) and
  <https://www.youtube.com/watch?v=GkeoANH3Xos> (Урок #4 — Multiplayer).
  No verifiable GitHub repo linked. Pre-NGO era.
- **itProger** course "Создание шутера на Unity3D" — paid Russian-language
  course, includes networking module. Not free, no public repo.
- **Хауди Хо** — popular Russian IT/dev channel (Howdy Ho). Does *general*
  Unity intros and entertainment IT content; **does not** have a dedicated
  Unity MP FPS tutorial series. Useful for onboarding non-devs into the
  vocabulary; not useful for Flump-grade engineering.
- **Flatingo** — Russian Unity creator focused on **2D level design**, not
  multiplayer FPS. Not relevant for Flump.

### 4.2 What does not exist (verified negative)

- A Russian-language NGO 2.x complete-project series with public repo and
  current Unity LTS. We did not find one as of 2026-05-03.
- A Russian-language Photon Fusion FPS course at the depth of Code Monkey's
  English NGO course. The market gap is real.

### 4.3 Implication for GamesAI

Localized tutorial content is a **distribution opportunity** for the OSS
mission, not just an audit finding. If GamesAI's localization-assistant
module ever ships translation of MIT-licensed tutorial repos with attribution
intact, the Russian-speaking Unity-MP audience has measurable unmet demand.
Flag for VISION.md backlog, not for current sprint.

---

## 5. What NOT to watch (anti-patterns)

These are common YouTube failure modes. Honest list — calling them out so
the team does not waste an afternoon following one.

1. **"Build a complete multiplayer FPS in Unity in 1 hour"** — almost
   universally a single-machine *split-screen* demo with `Input.GetAxis`
   per player. Zero networking. The thumbnail says multiplayer. The video
   does not deliver multiplayer.
2. **"Multiplayer FPS in Unity with Photon PUN"** dated pre-2022 —
   PUN 2 still works but Exit Games' active investment is in Fusion.
   Patterns from PUN era do not translate cleanly to Fusion's tick-based
   prediction model.
3. **uNet tutorials still hosted on YouTube without "deprecated" warning** —
   uNet was killed in 2018. Any tutorial that opens with `using UnityEngine.Networking;`
   and `[SyncVar]` from `NetworkBehaviour` is teaching dead API. Brackeys
   gets a pass because of historical-template value (§3.3); newer uploads
   teaching uNet do not.
4. **"Make a Mirror FPS"** that ends at "two cubes can shoot bullets at
   each other on localhost" — no lag compensation, no client prediction,
   no hit reconciliation. This is *every* Mirror tutorial under 6 hours.
   Useful only as a vocabulary primer.
5. **Asset-Store-flip videos** — "I made a multiplayer FPS in Unity!"
   that turn out to be MFPS 2.0 / Modular MP FPS Engine + reskin. The
   creator did not write the netcode. The repo, if any, is just project
   wiring. Skip.
6. **AAA-clone "Make Call of Duty in Unity"** — clickbait. Reverse-eng
   adjacent at best, scope-fraud at worst. Hard skip per project red zones.

---

## 6. Concrete patterns extracted (Flump-applicable)

Each line: *what video / repo* → *what to do with it in Flump*.

- **Code Monkey NGO course § Lobby section** → mirror the
  `LobbyManager.Singleton` pattern for Flump's Quickplay; do **not** copy
  the singleton anti-pattern wholesale, but the Lobby SDK call sequence
  (CreateLobby → JoinLobby → StartRelay → StartHost) is the canonical flow
  Flump should follow.
- **Code Monkey NGO course § Character Selection** → applicable as-is for
  Flump's loadout-pick screen before TDM matches; loadout SOs are already
  modeled in Boilergen `unity-mobile-shooter` plugin (§Flump audit p. 4).
- **DapperDino `NetworkRoomPlayerLobby.cs`** → translate the ready-state
  + scene-transition handshake into NGO `NetworkVariable<bool>` +
  `NetworkManager.SceneManager.LoadScene`. Pattern is engine-agnostic.
- **Brackeys `Player.cs` / `PlayerSetup.cs` separation** → keep as the
  **mental model** for Flump's player composition (controller vs setup
  vs network vs visual). Do not import the code.
- **Tom60chat Mirror upgrade port** → study the diff between the Brackeys
  uNet original and the Mirror port. That diff *is* the migration template
  if Flump ever needs to evaluate a transport switch.
- **Unity DA Unite 2024 talk** → before designing Hardpoint capture-zone
  ownership, read DA model. Decide explicitly whether cap zones are
  server-owned (classic) or distributed-owned (DA). Document in Flump's
  ADR set, do not leave implicit.
- **Photon Fusion BR200 (read-only)** → reference for how prediction +
  reconciliation is structured at Fusion-tier polish. Even if Flump stays
  NGO, the *interpolation buffer sizing* commentary in Fusion docs is
  transferable.
- **NGO Bitesize "Client Driven" sample** (referenced from Unity docs,
  not vendorable due to Unity Companion License) → read once for
  client-driven movement patterns; re-implement, do not copy.
- **Imphenzia Line War devlog** → not code, but the war stories about
  scaling headless Linux Unity servers are the only public account of
  that exact problem. Useful when Flump outgrows Relay.

---

## 7. Cross-references inside this knowledge base

- `knowledge-base/games/oss-unity-mp-shooters.md` — the production-grade
  filtered list this entry supplements.
- `knowledge-base/engines/version-matrix.md` — Unity LTS line tutorials
  should target.
- `knowledge-base/sources/community-sentiment-ai-gamedev.md` — explains
  why we lean on tutorial repos (community trust) over scraped/leaked code.

---

## 8. References (full URL list)

**Code Monkey**
- <https://www.youtube.com/watch?v=7glCsF9fv3s> — Learn Unity Multiplayer FREE Complete Course (NGO)
- <https://www.youtube.com/watch?v=3yuBOB3VrCk> — COMPLETE Unity Multiplayer Tutorial (NGO long-form)
- <https://www.youtube.com/watch?v=YmUnXsOp_t0> — Simplest Multiplayer Game free course
- <https://www.youtube.com/watch?v=-KDlEBfCBiU> — Lobby (Unity Gaming Services)
- <https://unitycodemonkey.com/kitchenchaosmultiplayercourse.php> — project files

**Dapper Dino**
- <https://github.com/DapperDino/Mirror-Multiplayer-Tutorials> — MIT, lobby + room scripts

**Brackeys + descendants**
- <https://github.com/Brackeys/MultiplayerFPS-Tutorial> — Unlicense, uNet, historical
- <https://github.com/Tom60chat/MultiplayerFPS-Tutorial> — Unlicense, Mirror port, Unity 2019.3 archived
- <https://github.com/TUTOUNITYFR/creer-un-fps-multijoueur-mirror-unity> — French series

**Unity official + samples**
- <https://github.com/Unity-Technologies/com.unity.multiplayer.samples.coop> — Boss Room, Unity Companion License (read-only)
- <https://github.com/Unity-Technologies/com.unity.multiplayer.samples.bitesize> — Bitesize, Unity Companion License
- <https://github.com/Unity-Technologies/FPSSample> — FPSSample (archived, Unity Companion)
- <https://github.com/Unity-Technologies/com.unity.netcode.gameobjects> — NGO source
- <https://www.youtube.com/watch?v=9wNKZPoMWvw> — Intro to Unity 6 Distributed Authority
- <https://www.youtube.com/watch?v=Ndixa64p3dQ> — DA upgrade overview
- <https://www.youtube.com/watch?v=3jBOTk_qozA> — Unite 2024 DA deep-dive

**Photon Fusion**
- <https://www.photonengine.com/samples> — Fusion sample index
- <https://github.com/hathora/photon-fusion-br> — BR200 + Hathora integration
- <https://doc.photonengine.com/fusion/current/game-samples/br200/overview> — BR200 docs

**Tarodev**
- <https://github.com/Matthew-J-Spencer/Tarodev> — MIT utilities, no MP code
- <https://www.youtube.com/watch?v=_LJKIwmOyJA> — 9 tools for MP dev (Unity sponsored)

**GameDev.tv courses (paid, not redistributable)**
- <https://gamedev.tv/p/unity-multiplayer-coding-and-networking> — Mirror RTS
- <https://gamedev.tv/courses/unity-multiplayer-netcode> — NGO top-down shooter

**Russian-language**
- <https://www.youtube.com/watch?v=rmidcOOhFII> — 3D шутер с мультиплеером Урок #1
- <https://www.youtube.com/watch?v=GkeoANH3Xos> — 3D шутер с мультиплеером Урок #4 (Multiplayer)
- <https://itproger.com/course/3d-shooter> — itProger paid course (RU)

**Mobile FPS controller reference**
- <https://github.com/whateep/Mobile-FPS-and-TPS-controller-for-Unity> — touch-controller codebase paired with the author's tutorials

---

*Last verified 2026-05-03. Re-verify links every two quarters; YouTube video
URLs are stable but channel renames and repo archivals happen — DapperDino
and Tom60chat repos in particular have not seen commits in 2+ years and
should be treated as historical references, not living code.*
