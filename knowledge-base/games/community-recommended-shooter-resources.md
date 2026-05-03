---
type: pattern
slug: community-recommended-shooter-resources
title: Community-vetted OSS Unity MP shooter resources (Reddit / forums / awesome-lists)
genre: fps
engine: unity
content_format: mixed
language: csharp
license: mixed (verified per resource)
source_url: https://www.reddit.com/r/Unity3D/
last_analyzed: 2026-05-03
maturity: mixed
relevance_to_grandgames: high
tags: [unity, multiplayer, fps, mobile, reddit, forums, community, learning]
---

# Community-vetted OSS Unity MP shooter resources (Reddit / forums / awesome-lists)

> Verified 2026-05-03. The companion entry `oss-unity-mp-shooters.md` enumerated
> what survives when you ask GitHub directly. This entry asks the second
> question: *what does the community actually point new MP-FPS developers at*,
> when the community is Reddit, Unity Discussions, gamedev.net, awesome-lists
> and engineering blogs? The answers overlap less than you'd expect — Reddit
> consensus heavily over-indexes on tutorials and Asset-Store templates,
> awesome-lists drift toward dead repos, and the few links that genuinely
> teach mobile MP-FPS patterns are mostly *articles*, not *codebases*.

---

## 1. Why this entry exists

The Flump audit (`handoff/05-FLUMP-AUDIT.md`) and the GitHub-direct roundup
(`oss-unity-mp-shooters.md`) together gave us 3 OSI-licensed Unity MP
shooter codebases worth reading and 5 honest exclusions. That research had
a blind spot: it only looked at code. It did not look at what r/Unity3D
upvotes, what Unity Discussions stickies, what awesome-lists curate, or
what blog posts the community treats as canonical.

This matters because:

1. Reddit / forum threads catch projects that GitHub topic search misses
   (small repos under-tagged, side-project gists, blog-post code drops).
2. Community vetting is a different filter than license vetting — a 4-star
   MIT repo with no community traction is usually abandoned-student-work,
   regardless of how clean its `LICENSE` file is.
3. The *articles* the community links are often more valuable than the
   code. Gabriel Gambetta, Glenn Fiedler, the Riot Valorant netcode
   post-mortem — these aren't Unity-specific but they're the canon
   Reddit answers with when someone asks "where do I start with
   FPS netcode?".

What this entry is **not**: a curated playlist of YouTube tutorials. We
intentionally exclude paid courses (Udemy, GameDev.tv) and the long tail
of YouTube tutorial channels — they're surveyed elsewhere and don't fit
the OSS-resources lens.

---

## 2. Top community-recommended OSS / source-available projects

The matrix below is everything that came up >1 time across r/Unity3D /
Unity Discussions / awesome-lists / curated-networking-lists searches and
*also* survived a basic "is this still alive in 2026?" check. License
column is the *honest* license (Unity Companion License is not OSI).

| Project | License | Community surface | State 2026-05-03 | Verdict for Flump |
|---|---|---|---|---|
| [Unity-Technologies/com.unity.multiplayer.samples.coop](https://github.com/Unity-Technologies/com.unity.multiplayer.samples.coop) (Boss Room) | **Unity Companion** (NOT OSI) | r/Unity3D top recommendation for any "learn NGO" question; CodeMonkey, Unity Learn, Edgegap all link it | v3.0.0 released 2025-08-06, **1.9k stars**, Unity 6000.0 LTS | **Read for patterns, do not lift code.** UCL forbids closed-source derivative works. Best-architected NGO sample available. |
| [Unity-Technologies/megacity-metro](https://github.com/Unity-Technologies/megacity-metro) | **Unity Companion** (NOT OSI) | Unity blog "multiplayer resource roundup" headline demo; mentioned across Unity Discussions for ECS+netcode | 1.1k stars, 261 forks, 20 commits on master, **mobile builds documented (iOS/Android)** | **Read-only.** The closest thing to a Flump-class Unity Companion sample — 150-CCU vehicle shooter, server-auth, prediction, lag-comp, Vivox, mobile builds. UCL still bites. |
| [Voltstro-Studios/Team-Capture](https://github.com/Voltstro-Studios/Team-Capture) | **AGPL-3.0** | JackyChenGit awesome-unity-games "Shooter" entry; appears in StefanoCecere awesome-opensource-unity | last push 2026-03-24, 177 stars, alpha (covered in detail in `oss-unity-mp-shooters.md` §3.1) | **Read-only**, AGPL viral. Already in our shortlist. |
| [Unity-Technologies/FPSSample](https://github.com/Unity-Technologies/FPSSample) | **Unity Companion** (NOT OSI) | The single most-recommended "look at this" project across forums; speaker talk: Peter Andreasen "Deep-Dive Into Networking for Unity's FPS Sample" Unite LA 2018 | **Archived / Unity 2018.3 era** — abandoned for 7 years | **Avoid as code reference.** Andreasen's Unite talk slides are still the better artifact than the codebase itself. |
| [Armour/Multiplayer-FPS](https://github.com/Armour/Multiplayer-FPS) | MIT | Top GitHub search hit; recurring in Reddit "open source unity FPS" threads; awesome-opensource-unity entry | ~1.1k stars but **last meaningful activity 2020 (UNet era)**, README itself flags input branches "not maintained since 2020" | **Avoid.** Already excluded in `oss-unity-mp-shooters.md` §6 — UNet-based, dead. |
| [hathora/unity-ngo-minimal-sample](https://github.com/hathora/unity-ngo-minimal-sample) | MIT | Hathora vendor sample, occasionally linked from r/gamedev hosting threads | 0 stars, low engagement — but vendor-maintained | **Skim only.** Useful if you specifically use Hathora hosting; otherwise too thin. |
| [edgegap/unity-ngo-relay-sample](https://github.com/edgegap/unity-ngo-relay-sample) | unspecified (treat as ARR) | Edgegap vendor sample, linked from their hosting docs | 0 stars, 4 commits, no LICENSE file — **defaults to all-rights-reserved** | **Avoid.** No license = not legally usable. |
| [Elympics/template-fps](https://github.com/Elympics/template-fps) | MIT (wrapper) | Recurring in "ready-made FPS template" Reddit threads | Vendor-tied to Elympics framework, framework is blockchain-adjacent | **Avoid.** Already excluded in `oss-unity-mp-shooters.md` §6 — triggers project red-zone. |
| [kennux/OsFPS](https://github.com/kennux/OsFPS) | MIT | Recurring in old r/Unity3D "open source FPS" threads, often as the *only* answer | Single-author engine project, **not actively maintained**, "not a game-ready drag and drop FPS engine" per README | **Avoid as template, useful for engine-design ideas.** Already excluded in `oss-unity-mp-shooters.md` §6. |
| [joaoborks/unity-fastpacedmultiplayer](https://github.com/joaoborks/unity-fastpacedmultiplayer) | MIT | Recurring "fast-paced multiplayer Unity" search hit; cited in Gambetta-implementation discussions | **Archived 2019-07-27, 195 stars.** Owner deprecated when UNet was killed. | **Avoid as runtime code, useful as historical pattern artifact.** Implements Gambetta architecture (CSP / server reconciliation / entity interpolation) but on UNet. |
| [Unity-Technologies/Megacity-2019](https://github.com/Unity-Technologies/Megacity-2019) | **Unity Companion** | Linked from older Unity blog posts | **Deprecated** in favour of megacity-metro, 530 stars | **Avoid.** Use megacity-metro. |
| [RamiAhmed/Gambetta_NetworkedDemo](https://github.com/RamiAhmed/Gambetta_NetworkedDemo) | (no LICENSE — treat as ARR) | Cited as "Gambetta-in-Unity reference" | Ancient (Lidgren-based, pre-UNet-pre-Mirror) | **Avoid as code, read for shape only.** The article it implements (Gambetta) is the actual valuable thing. |

The honest summary: **of all community-recommended Unity MP-FPS code,
exactly zero meet (a) OSI-licensed, (b) actively maintained 2026, (c)
mobile-targeted, (d) production-grade.** The closest miss is Boss Room
(production-grade, active, but Unity Companion). The second-closest is
Megacity Metro (production-grade, mobile builds documented, but Unity
Companion). Team-Capture (`oss-unity-mp-shooters.md` §3.1) remains the
only OSI-licensed candidate the community surfaces, at AGPL with the
viral-license caveat that means we cite, not copy.

---

## 3. Notable Unity Forum / Reddit threads worth bookmarking

Unity Discussions blocks scrapers (HTTP 403 to WebFetch as of 2026-05-03)
so these summaries are based on search-engine snippets and titles. URL +
expected consensus is reliable; verbatim quotes are not. Verify any of
them by visiting in a browser.

### 3.1 Networking-framework choice (the perennial question)

- ["Which Multiplayer Solution for Fast Paced Shooters?"](https://discussions.unity.com/t/which-multiplayer-solution-for-fast-paced-shooters/901408) — recurring decision thread; consensus pattern: Mirror / FishNet for indie cost-control, NGO for the "Unity-blessed path", Photon Fusion for managed-cloud, Quantum for deterministic / esports.
- ["Is Netcode for Gameobjects viable for a mid-scale FPS?"](https://discussions.unity.com/t/is-netcode-for-gameobjects-viable-for-a-mid-scale-fps/899584) — direct relevance to Flump (NGO 2.9.1, 5v5). Community answer is qualified "yes for ≤16 CCU instanced sessions, you'll outgrow it for 64+." Flump sits inside the safe range.
- ["FPS (First Person Shooter) Networking Architecture"](https://discussions.unity.com/t/fps-first-person-shooter-networking-architecture/427209) — older thread; answers cite Gambetta + Valve source-engine paper + Gaffer as canonical (same canon as §5).
- ["Best way to make a mobile realtime multiplayer game with NGO"](https://discussions.unity.com/t/best-way-to-make-a-mobile-realtime-multiplayer-game-with-ngo/1626669) — surfaces the iOS-backgrounding auto-disconnect problem; Flump will hit this.
- ["Mirror vs NGO vs FishNet for a LAN game"](https://discussions.unity.com/t/what-library-would-be-the-best-for-a-simple-lan-game-mirror-vs-netcode-for-gameobjects-vs-fishnet/951271) — three-way comparison; cross-checks our `engines/` entries.

### 3.2 Roadmap / official direction

- ["Unity Multiplayer Roadmap Update – March 2025 Highlights"](https://discussions.unity.com/t/unity-multiplayer-roadmap-update-march-2025-highlights/1618064) — Host Migration for Netcode for Entities entered experimental.
- ["Multiplayer development status and next milestones – September 2024"](https://discussions.unity.com/t/multiplayer-development-status-and-next-milestones-september-2024/1521688) — older milestone snapshot for trajectory.

### 3.3 Mobile / performance specifics

- ["Low FPS on mobile due to Prediction + Physics (Netcode for Entities)"](https://discussions.unity.com/t/low-fps-on-mobile-due-to-prediction-physics-simulation-netcode-for-entities/1702810) — concrete numbers: PC ~60fps, iPhone 13 45–60fps, mid-tier Android 15–25fps. Cautionary tale for "we'll just use Netcode for Entities on mobile."
- ["Mobile 3D multiplayer top-down shooter bullets — pool vs particle?"](https://discussions.unity.com/t/mobile-3d-multiplayer-top-down-shooter-bullets-instantiate-objectpool-or-particle-system/797493) — projectile-pooling consensus.

### 3.4 Community-showcase threads (mostly closed-source, listed for awareness)

- ["MultiPal FPS Template (NGO+UGS)"](https://discussions.unity.com/t/multipal-fps-online-multiplayer-action-game-template-ngo-ugs/942785) — closed-source paid Asset Store template; not OSS but recurring "shortcut" recommendation.
- ["Multiplayer Third Person Shooter for PC and Mobile"](https://discussions.unity.com/t/multiplayer-third-person-shooter-for-pc-and-mobile/929339) — community showcase, closed-source.
- ["OpenFPS — open-source community game"](https://discussions.unity.com/t/openfps-an-open-source-community-made-game-just-started/708094) — recurring search hit; project never produced a viable codebase.

---

## 4. Awesome-* lists that include Unity MP / FPS projects

Curated lists drift toward bit-rot — most "awesome-X" repos accumulate
links and rarely prune. Verify the *underlying* repo is alive before
trusting any of these lists' inclusion as a quality signal.

| List | Stars | Last meaningful update | Useful entries |
|---|---|---|---|
| [StefanoCecere/awesome-opensource-unity](https://github.com/StefanoCecere/awesome-opensource-unity) | ~varies | Active (last update within 7d as of 2026-05-03) | FishNet, Mirror, Multiplayer-FPS (dead), Forge Networking Remastered (3y dormant), nakama backend |
| [JackyChenGit/awesome-unity-games](https://github.com/JackyChenGit/awesome-unity-games) | small | Sporadic | FPS Sample (UCL, dead), Team-Capture (AGPL), ECS Network Racing, Megacity-2019 (deprecated). **README itself warns "some projects may lack current licenses, requiring independent verification before use."** Cite that warning to the reader, don't paper over it. |
| [UnityCommunity/AwesomeUnityCommunity](https://github.com/UnityCommunity/AwesomeUnityCommunity) | 638 | Periodic | Asset / resource focused, less code-sample focused; cross-references Mirror + Photon |
| [proyecto26/awesome-unity](https://github.com/proyecto26/awesome-unity) | varies | Periodic | General Unity games, includes Multiplayer-FPS (dead) |
| [gafferongames/GameNetworkingResources](https://github.com/gafferongames/GameNetworkingResources) | ~9k | Active | THE canonical networking-articles list. Not Unity-specific but every Unity-MP-FPS dev should read it. See §5. |
| [0xFA11/MultiplayerNetworkingResources](https://github.com/0xFA11/MultiplayerNetworkingResources) | varies | Active | Also non-Unity-specific but has a strong Unity-libraries section + curated GDC talks (incl. Andreasen FPS Sample deep-dive) |
| [5-digits/Awesome-Game-Networking](https://github.com/5-digits/Awesome-Game-Networking) | varies | Periodic | Largely overlaps gafferongames/GameNetworkingResources |
| [miwarnec/Game-Networking-Resources](https://github.com/miwarnec/Game-Networking-Resources) | varies | Periodic | Maintained by Mirror's lead; same canon as gafferongames + Mirror-specific notes |

**Practical takeaway:** of the 8 lists, 2 are genuinely worth a careful
read (`gafferongames/GameNetworkingResources` and the Mirror-author
mirror at `miwarnec/Game-Networking-Resources`). The Unity-specific
"awesome" lists are useful only as starting search queries — every entry
needs the per-repo activity + license re-check we did in
`oss-unity-mp-shooters.md` §1's filter.

---

## 5. Engineering blog posts / articles worth reading

These are what every credible Reddit / Unity Discussions answer
eventually links when someone asks "how do FPS networking actually
work?". None of them are Unity-tutorial-friendly; all of them are the
canon you have to internalise to read the code in §2 with intent.

### 5.1 Foundational canon

- [Gambetta — "Fast-Paced Multiplayer" series](https://www.gabrielgambetta.com/client-server-game-architecture.html) — most-cited intro to CSP, server reconciliation, entity interpolation, lag compensation. Language-agnostic (TS demos) but maps directly onto NGO `NetworkVariable<T>` + `[ServerRpc]`.
- [Glenn Fiedler — Gaffer on Games](https://gafferongames.com/) — reliable-UDP, snapshot interpolation, networked physics. "Networked Physics in Virtual Reality" is Unity-specific (PhysX); rest is protocol-level but applicable.
- [Valve — Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking) — 2001-vintage canonical lag-comp paper. Still the reference every modern FPS post-mortem starts from.
- **Riot — "Peeking into Valorant's Netcode"** — modern peeker's-advantage treatment, indexed in `gafferongames/GameNetworkingResources`.
- **Bungie / Aldridge — "I Shot You First"** (Halo: Reach GDC) and **Activision — "Fighting Latency on CoD: Black Ops III"** (GDC) — AAA lag-mitigation playbooks.
- **DICE — "How a Shooter Shoots"** — Battlefield 3 networking analysis.

### 5.2 Unity-specific talks

- [Peter Andreasen (Unity) — "Deep-Dive Into Networking for Unity's FPS Sample"](https://www.youtube.com/watch?v=k6JTaFE7SYI) (Unite LA 2018) — architectural narration of FPSSample. **The talk outlives the (dead, UCL) codebase.** Read if you only have an hour of FPSSample-adjacent time.
- [Tim Johansson (Unity) — "Intro to DOTS and Netcode"](https://www.youtube.com/watch?v=P_-FoJuaYOI) (Unite EU 2019) — Netcode-for-Entities path; orthogonal to Flump's NGO-2.9 stack.
- [Christof Wegmann (Exit Games) — "Photon vs UNet"](https://www.youtube.com/watch?v=Y1my5bKhKJY) (Unite EU 2017) — historical reference, Photon shape hasn't changed much since.
- [David Salz (Sandbox Interactive) — "Building a PvP focused MMO" (Albion)](https://www.youtube.com/watch?v=x_4Y2-B-THo) (Unite EU 2016) — interest-management discussion transfers to any large-instance shooter.

### 5.3 Mid-tier / community blog posts

What r/Unity3D actually links when someone asks for a Unity write-up. Quality mixed, but the consensus signal is real.

- [Christian Tucker — "Seamless fast paced multiplayer in Unity3D" (CSP impl)](https://medium.com/@christian.tucker_68732/seamless-fast-paced-multiplayer-in-unity3d-implementing-client-side-prediction-ab520bf49bd1) — older but the math is timeless.
- [DEV / devsdaddy — Unity + Node.js MP architecture](https://dev.to/devsdaddy/creating-safe-and-fast-multiplayer-in-games-on-unity-and-nodejs-with-examples-3hk8) — useful if considering custom backend over NGO host model.
- [HackerNoon — "Unity Realtime Multiplayer Pt 7: Architectures in Different Genres"](https://hackernoon.com/unity-realtime-multiplayer-part-7-architectures-in-different-genres) — quick genre-by-genre mental map.
- [4AM Games — "Fast-Paced Multiplayer Implementation Series"](https://fouramgames.com/blog/fast-paced-multiplayer-implementation) — indie studio implementation diary.

### 5.4 Unity official (partisan but sound)

- [Unity — "Ultimate guide: Multiplayer Networking for Advanced Unity Developers" (ebook)](https://unity.com/blog/multiplayer-networking-ebook)
- [Unity blog — "Multiplayer resource roundup"](https://unity.com/blog/engine-platform/multiplayer-resource-roundup)

---

## 6. What NOT to follow — common community recommendations that are bad bets

This section is the entry's reason for existing. The Reddit / awesome-list
ecosystem amplifies certain recommendations that DO NOT survive a careful
read. Cataloguing them so we don't get caught.

1. **"Just clone FPSSample"** — most common Reddit answer to "open source Unity FPS." Archived since 2018 (Unity 2018.3), **Unity Companion License**. Won't compile on 6.3, predates NGO entirely, can't ship inside closed-source. The Andreasen Unite LA 2018 talk is the only valuable FPSSample artifact in 2026.
2. **"Just clone Boss Room"** — second most common. Genuinely the best NGO sample, but **Unity Companion, not OSI**. Read for patterns, do not paste. (License header verified in `oss-unity-mp-shooters.md` §6.)
3. **"Just use Photon Fusion / Quantum"** — valid technically, not OSS. Out of scope — see `engines/photon-quantum-3.md`.
4. **"Armour/Multiplayer-FPS is a great starter"** — 1.1k stars but **UNet-based (deprecated 2018)**, README admits branches "not maintained since 2020." Learning a dead API.
5. **"OsFPS is the open-source FPS engine"** — single-author, README itself disclaims it's not drop-in, no community contribs. Engine-design reading only.
6. **"Forge Networking Remastered is great"** — 1.5k stars, **last update 3y ago**, studio pivoted. Historical, not active.
7. **"Use Asset Store FPS template X"** (MultiPal FPS, Photon PUN2-FPS, Jimmy Vegas, Rio 3D Studios) — not OSS, Asset Store EULA forbids redistribution, often bundled with paid assets that pollute fork legality. Same trap as Kieeran/FPS-Game (`oss-unity-mp-shooters.md` §3.3).
8. **"Port Gambetta_NetworkedDemo / unity-fastpacedmultiplayer"** — Lidgren/UNet implementations of Gambetta's architecture. Architecture sound, runtime dead. Read Gambetta's article and re-implement on NGO 2.9 — don't port dead code.
9. **"YouTube tutorial X is all you need"** (CodeMonkey, Tarodev, Brackeys, Dani) — none of them have shipped a production mobile MP FPS. CodeMonkey's NGO course is good for NGO basics; tutorial code is teaching-grade. Concept primer, not project skeleton.
10. **"Boss Room + UGS is the prod path"** — Unity-blessed but session-management is sized for 8-player coop dungeons, not matchmade competitive 5v5. Architecture borrows, glue code does not.
11. **Generic "open source FPS recommendation" Reddit threads** — most upvoted answers are usually (1)–(7) above. Default skepticism.
12. **Repos with no LICENSE file** (`edgegap/unity-ngo-relay-sample`, Gambetta_NetworkedDemo) — default to all-rights-reserved under US copyright. **Cannot legally fork or ship.**
13. **Repos bundling Asset Store packages in `Assets/`** — wrapper MIT does NOT cover bundled paid assets. Diagnostic heuristic: vendor-named subfolders in `Assets/`. See `oss-unity-mp-shooters.md` §3.3.
14. **Paid itch.io source drops** ($5 Jimmy Vegas FPS, etc.) — license to use, not redistribute. Not OSS.

---

## 7. Recommendations distilled for Flump / unity-mobile-shooter plugin

After running the community-vetting pass, the actionable adjustments to
the picture from `oss-unity-mp-shooters.md` are:

1. **Add Megacity Metro to the read-only reading list.** It's UCL
   (cite-don't-paste) but it documents iOS/Android builds, vehicle-
   shooter combat, server-auth + prediction + lag-comp, and Vivox — the
   closest community-vetted artifact to Flump's actual shape. The
   read-only constraint matches Boss Room's; the patterns transfer.
2. **Bookmark the Andreasen FPSSample Unite LA 2018 talk** as the
   canonical FPS-architecture-on-Unity reference. Cheaper than reading
   the dead codebase and covers the same design.
3. **Add Gambetta + Gaffer + Valve source paper to the project's
   `references/` reading list.** Not Unity-specific but every FPS
   networking decision Flump makes will trace back to one of them.
4. **Treat r/Unity3D / r/gamedev "what should I clone" answers as
   *search seeds*, not endorsements.** Every recommendation needs the
   `oss-unity-mp-shooters.md` §1 filter pass before being trusted.
5. **No new entity-types are warranted from this pass.** The five
   plugin-v2 additions in `oss-unity-mp-shooters.md` §5 still stand —
   community-vetting confirms the gaps, doesn't reveal new ones.

---

## 8. References — full URL list

Repos:
- https://github.com/Unity-Technologies/com.unity.multiplayer.samples.coop
- https://github.com/Unity-Technologies/megacity-metro
- https://github.com/Unity-Technologies/Megacity-2019
- https://github.com/Unity-Technologies/FPSSample
- https://github.com/Voltstro-Studios/Team-Capture
- https://github.com/Armour/Multiplayer-FPS
- https://github.com/hathora/unity-ngo-minimal-sample
- https://github.com/edgegap/unity-ngo-relay-sample
- https://github.com/Elympics/template-fps
- https://github.com/kennux/OsFPS
- https://github.com/joaoborks/unity-fastpacedmultiplayer
- https://github.com/RamiAhmed/Gambetta_NetworkedDemo
- https://github.com/RamiAhmed/Gambetta_LocalDemo
- https://github.com/BeardedManStudios/ForgeNetworkingRemastered

Awesome-lists:
- https://github.com/StefanoCecere/awesome-opensource-unity
- https://github.com/JackyChenGit/awesome-unity-games
- https://github.com/UnityCommunity/AwesomeUnityCommunity
- https://github.com/proyecto26/awesome-unity
- https://github.com/gafferongames/GameNetworkingResources
- https://github.com/0xFA11/MultiplayerNetworkingResources
- https://github.com/5-digits/Awesome-Game-Networking
- https://github.com/miwarnec/Game-Networking-Resources

Unity Discussions threads:
- https://discussions.unity.com/t/which-multiplayer-solution-for-fast-paced-shooters/901408
- https://discussions.unity.com/t/is-netcode-for-gameobjects-viable-for-a-mid-scale-fps/899584
- https://discussions.unity.com/t/fps-first-person-shooter-networking-architecture/427209
- https://discussions.unity.com/t/best-way-to-make-a-mobile-realtime-multiplayer-game-with-ngo/1626669
- https://discussions.unity.com/t/what-library-would-be-the-best-for-a-simple-lan-game-mirror-vs-netcode-for-gameobjects-vs-fishnet/951271
- https://discussions.unity.com/t/unity-multiplayer-roadmap-update-march-2025-highlights/1618064
- https://discussions.unity.com/t/multiplayer-development-status-and-next-milestones-september-2024/1521688
- https://discussions.unity.com/t/low-fps-on-mobile-due-to-prediction-physics-simulation-netcode-for-entities/1702810
- https://discussions.unity.com/t/mobile-3d-multiplayer-top-down-shooter-bullets-instantiate-objectpool-or-particle-system/797493
- https://discussions.unity.com/t/multipal-fps-online-multiplayer-action-game-template-ngo-ugs/942785
- https://discussions.unity.com/t/multiplayer-third-person-shooter-for-pc-and-mobile/929339
- https://discussions.unity.com/t/openfps-an-open-source-community-made-game-just-started/708094

Articles / canonical reading:
- https://www.gabrielgambetta.com/client-server-game-architecture.html
- https://gafferongames.com/
- https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
- https://medium.com/@christian.tucker_68732/seamless-fast-paced-multiplayer-in-unity3d-implementing-client-side-prediction-ab520bf49bd1
- https://dev.to/devsdaddy/creating-safe-and-fast-multiplayer-in-games-on-unity-and-nodejs-with-examples-3hk8
- https://hackernoon.com/unity-realtime-multiplayer-part-7-architectures-in-different-genres
- https://fouramgames.com/blog/fast-paced-multiplayer-implementation
- https://unity.com/blog/multiplayer-networking-ebook
- https://unity.com/blog/engine-platform/multiplayer-resource-roundup

Talks (YouTube):
- https://www.youtube.com/watch?v=k6JTaFE7SYI — Andreasen, "Deep-Dive Into Networking for Unity's FPS Sample" (Unite LA 2018)
- https://www.youtube.com/watch?v=P_-FoJuaYOI — Tim Johansson, "Intro to DOTS and Netcode" (Unite EU 2019)
- https://www.youtube.com/watch?v=Y1my5bKhKJY — Christof Wegmann, "Photon vs UNet" (Unite EU 2017)
- https://www.youtube.com/watch?v=x_4Y2-B-THo — David Salz, "Building a PvP focused MMO" Albion (Unite EU 2016)

itch.io tag pages (for browsing, not endorsement):
- https://itch.io/games/made-with-unity/tag-open-source
- https://itch.io/games/genre-shooter/tag-open-source

Cross-references in this knowledge-base:
- `knowledge-base/games/oss-unity-mp-shooters.md` — the GitHub-direct roundup this entry complements
- `knowledge-base/engines/mirror-networking.md`
- `knowledge-base/engines/fish-networking.md`
- `knowledge-base/engines/photon-quantum-3.md`
- `knowledge-base/engines/unity-mobile-multiplayer.md`
- `knowledge-base/handoff/05-FLUMP-AUDIT.md`

---

## 9. Verification footer

All URLs above were surfaced via WebSearch on 2026-05-03. Repository
states (stars, last commit, license) for the projects in §2 were
verified by direct WebFetch of the GitHub repo pages on the same date,
except where flagged ("Not visible in fetch") — those rely on
search-engine snippets and should be re-checked in a browser before
acting on them.

Unity Discussions threads (§3) are listed by URL only — Unity
Discussions returned HTTP 403 to WebFetch on 2026-05-03 so the consensus
summaries are based on search-engine snippets and the threads' own
titles. Anyone using this entry should open the threads in a browser to
read the actual discussion before quoting it.

No Reddit threads are individually URL'd because Reddit search via
WebSearch returned no direct r/Unity3D thread URLs in the May 2026
search window — likely a combination of Reddit's API restrictions and
the indexer's site-restriction handling. The community-consensus claims
in this entry are derived from (a) cross-referenced forum threads on
Unity Discussions which mirror the same advice, (b) the awesome-lists
which catalogue the same projects, and (c) the search-result snippet
content from broader (non-site-restricted) queries that surfaced
Reddit-style threads on Stack Exchange / GameDev.net mirrors. **If the
Reddit corpus is load-bearing for any future decision, search Reddit
directly** — this entry's coverage of pure r/Unity3D threads is honestly
weaker than its coverage of Unity Discussions.

No leaked or reverse-engineered AAA shooter material is referenced. No
paid Asset Store template or course is endorsed. Where a closed-source
or Unity Companion-licensed project is mentioned (Boss Room, FPSSample,
Megacity Metro), the inclusion is read-only-pattern-reference and the
license status is stated explicitly.
