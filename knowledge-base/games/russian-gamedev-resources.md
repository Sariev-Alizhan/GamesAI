---
type: pattern
slug: russian-gamedev-resources
title: Russian-speaking gamedev community — Unity MP shooter resources
genre: fps
engine: unity
content_format: mixed
language: csharp
license: mixed (verified per resource)
source_url: https://habr.com/ru/hub/unity_3d/
last_analyzed: 2026-05-03
maturity: mixed
relevance_to_grandgames: critical
tags: [unity, multiplayer, fps, mobile, russian, dtf, habr, gamedev, ru]
---

# Russian-speaking gamedev community — Unity MP shooter resources

> Verified 2026-05-03. Companion to `oss-unity-mp-shooters.md` and
> `youtube-learning-resources.md`, which are English-dominant. Grand
> Mobile and Flump both have Russian-speaking teams shipping to a
> Russian-speaking audience; this entry catalogues what's usable in RU
> — honest about how thin some of it is.

---

## 1. Why this entry exists

Project memory pins Grand Mobile (RU-market mobile MP) and Flump
(Unity 6.3 LTS mobile FPS, RU-speaking team) as the two real downstream
consumers. Three implications English-only sources can't cover:

1. **Sanctions reshape the backend stack.** Azure / PlayFab is
   payment-hostile from RU, AWS is partial, and many teams have
   migrated to RuStore IAP + Yandex Cloud + self-hosted Photon /
   Mirror. Brackeys / Code Monkey never mention this.
2. **The audience reads Russian.** Russian has 4 CLDR plural forms
   (one/few/many/other), distinguishes "ты" vs "вы", and Yandex Games
   / VK Play store pages are RU-first. Translation passes don't fix
   this.
3. **The community is smaller but concentrated.** A few Habr authors,
   two or three DTF threads, a handful of YouTube channels, one or
   two well-maintained GitHub repos cover most of what a junior on a
   RU-speaking team will actually find.

Honest scope: this is **less material than the English equivalent**. A
production-grade OSS Unity MP shooter from a RU-located maintainer does
not exist as far as this audit can find. What does exist: good
tutorials, a couple of useful architecture posts, and a real-world
sanctions-aware backend playbook.

---

## 2. Russian-speaking YouTube channels

### 2.1 Flatingo / flatingo family

- URL: https://www.youtube.com/@flatingofamily
- Maintainer: Andrey ("Флатинго"), UA-origin / now US, content in RU.
  Originally a 2D-Unity tutorial channel; pivoted toward an indie-dev
  label.
- Teaches: 2D Unity, level design, art pipeline, occasional MP chat /
  lobby clip. No production MP repos.
- Flump fit: weak for FPS netcode; useful for mobile HUD / 2D overlays.
- Verdict: known name, polished delivery, introductory.

### 2.2 Хауди Хо ("Howdy Ho")

- URL: https://www.youtube.com/channel/UC7f5bVxWsm3jlZIPDzOMcAg
- GitHub org: https://github.com/Howdy-Ho
- Teaches: broad IT / programming entertainment + Unity beginner
  videos. Also vocal critic of low-quality paid Unity courses, which
  is informative for newcomers picking a course.
- Flump fit: orientation-tier; do not cite as multiplayer architecture.
- Verdict: entertainment-first, technical-second.

### 2.3 RU Netcode-for-GameObjects tutorial cluster

The most-watched RU walkthrough is a multi-part series indexed under
"МУЛЬТИПЛЕЕР НА UNITY С ПОМОЩЬЮ NETCODE FOR GAME OBJECTS | ЧАСТЬ N":

- Part 1 setup: https://www.youtube.com/watch?v=w6_9Wj9JNuw (2023-11-27)
- Part 3 transport / authority:
  https://www.youtube.com/watch?v=ErJd-3oYG0g (2023-12-03)
- Part 5 aim + shoot:
  https://www.youtube.com/watch?v=OpbvMwiUdxM (2023-12-07)
- Lobby + Relay (sister series):
  https://www.youtube.com/watch?v=yzR1U-cmeTQ (2024-08-04)
- Framing video "Стоит ли начинать изучать Netcode for GameObjects?":
  https://www.youtube.com/watch?v=TNDH7umembY (2022-09-30)

Closest RU analogue to Code Monkey's NGO + Lobby + Relay flow. Uses
Unity Gaming Services Relay, which still works from RU at time of
writing — verify Relay region availability before depending on it for
production traffic. Treat as conceptual scaffolding; re-implement
against current package versions.

### 2.4 Channels named in the brief but not verifiable

**ITKINGDOM, Алексей Зыкунов / GameSamurai, Alex Solovyov, Олег
Соломатин / WhatTheBeat** — none surfaced production-quality, linkable
RU multiplayer content during this audit. Some may exist as small or
Telegram-only presences. Don't cite in onboarding docs without
re-verifying the channel publishes and any claimed GitHub repo is real
and licensed.

---

## 3. Habr / DTF / App2Top notable articles

### 3.1 Habr — "SharedLogic. Общий игровой код для Unity-клиента и
.NET-сервера"

- URL: https://habr.com/ru/articles/918220/
- Author: Nikolay Lezhnev. Date: 2025-06-13. Companion site:
  https://nikolaylezhnev.github.io/sharedlogic/
- Repo: https://github.com/NikolayLezhnev/sharedlogic/tree/article
  (license **not declared in article**; verify on GitHub before reuse)
- What it argues: Command-pattern hybrid where game logic lives in a
  single .NET assembly shared between Unity client (instant local
  feedback) and a .NET 8 web service (re-execution + state-hash
  validation against cheating). Reports ~17,700 req/s baseline, ~73,000
  req/s with in-memory profile cache on Ryzen 9 5900X.
- **Flump takeaway**: closest match to Flump's economic reality — a
  small RU-speaking team that can't pay Photon Server CCU tiers but
  needs server-authoritative validation. Directly portable to Flump's
  loadout / progression / currency layer (combat tick still needs real
  netcode; this is for the meta-economy). Worth a 1-day spike before
  the next economy sprint.
- Verdict: highest-signal RU-language Unity backend article in the last
  year. Verify GitHub LICENSE before copying code.

### 3.2 Habr — "Основы Unity + Mirror"

- URL: https://habr.com/ru/articles/549018/
- Author: Splendidus. Date: 2021-03-25 (updated 2022-11-26).
- Repo: https://github.com/Sp1endidus/HabrUnityMirror (license
  unspecified — read-and-learn only, don't redistribute).
- Teaches Mirror from zero — NetworkManager, NetworkMessage, SyncVar,
  SyncList, projectile spawning. Tested against Unity 2021.3.14f1 +
  Mirror 2022.10.0.
- **Flump fit**: outdated stack but cleanest RU intro to Mirror's
  mental model. Mirror is a credible fallback if Photon billing breaks
  or Unity Relay degrades for RU clients.

### 3.3 Habr — Netcode-for-GameObjects beginner explainer (Digital
Tatarstan)

- URL: https://habr.com/ru/companies/digital_tatarstan/articles/717270/
- Author: Vadim Nacharov, Kazan College of Communications instructor.
  Date: 2023-02-16. No repo.
- Covers Client-Host architecture with NGO, three-script split
  (GameNetPortal / ClientGameNetPortal / ServerGameNetPortal),
  ClientNetworkTransform usage. Pedagogical framing for students.
- **Flump fit**: useful citation for "why we picked NGO" when
  onboarding a junior — explains in their language why P2P-host beats
  dedicated-server costs for small games.

### 3.4 Habr — 2025 NGO tutorial cluster

- "Вселенная Сетевых Игр в Unity" (TatianaZo, 2025-06-19) —
  https://habr.com/ru/articles/920000/ — beginner explainer for
  NetworkVariable + ServerRpc + ClientRpc with the "magic radio"
  framing.
- "Сетевой чат в Unity" Parts 1-3 (2025-07 → 2025-08):
  https://habr.com/ru/articles/922740/,
  https://habr.com/ru/articles/933338/,
  https://habr.com/ru/articles/935080/.

Not directly applicable to FPS hit-registration; good handoff for
juniors who haven't done network programming before.

### 3.5 DTF — "База по мультиплееру в Unity"

- URL: https://dtf.ru/gamedev/3690495-multiplayer-v-unity-vybor-tehnologij-i-optimizatsiya
- Practitioner overview comparing Photon (PUN / Fusion / Quantum),
  Mirror, FishNet, NGO in plain RU. Useful "current state of the
  stack" handout.

### 3.6 DTF — "Final Foe. О разработке сетевого мультиплеера на Unity"

- URL: https://dtf.ru/gamedev/1193253-final-foe-o-razrabotke-setevogo-multipleera-na-unity
- Devlog of a team adding Mirror MP to a Unity project over ~4 months.
  Concrete pain points (matchmaking, NAT, host migration). Not a
  tutorial; a war-story Flump leads should skim before committing to a
  netcode choice.

### 3.7 DTF — OSS project lists

- https://dtf.ru/gamedev/2186440-opensource-proekty-na-unity-chast-1
  + https://dtf.ru/tag/opensource — community-curated pointers to
  OpenArena, Mirror, PUN starters, indie OSS games. Starting point,
  not destination — verify each project's license and last-commit date.

### 3.8 App2Top — Russian mobile-gamedev industry portal

- URL: https://app2top.ru/
- Notable historical case: Game Insight on Guns of Boom retention
  (D1 40-60%):
  https://app2top.ru/industry/retenshn-1-go-dnya-kolebletsya-ot-40-do-60-protsentov-game-insight-o-svoem-novom-proekte-guns-of-boom-88210.html
- **Flump fit**: Guns of Boom is the closest RU-market precedent for
  "mobile MP FPS shipped from a RU-speaking studio at scale". Game
  Insight retention + LiveOps cadence are the realistic benchmarks
  Flump should measure against — not Western numbers.

### 3.9 Roman Ilyin — Unity localization deep-dive

- https://romanilyin.com/unity-localization/ — RU solo dev's writeup on
  building localization in Unity, including plural-form handling.
  Pairs with Unity's official Plural-Formatter docs (§6).

---

## 4. OSS projects from RU-speaking devs

Honest finding: this audit did **not** surface a production-grade,
OSI-licensed Unity multiplayer FPS from an explicitly RU-located
maintainer. The closest hits are tutorial-companion repos and back-end
utilities:

- **NikolayLezhnev/sharedlogic** —
  https://github.com/NikolayLezhnev/sharedlogic — hybrid Unity + .NET
  shared-logic skeleton (§3.1). Verify LICENSE on the repo.
- **Sp1endidus/HabrUnityMirror** —
  https://github.com/Sp1endidus/HabrUnityMirror — Mirror tutorial
  companion (§3.2). License unspecified.
- **VKCOM/vk-unity-sdk** —
  https://github.com/VKCOM/vk-unity-sdk — official VK API SDK for
  Unity (auth, social graph, sharing). Maintained by VK team.
- **VKCOM/vkid-android-sdk** —
  https://github.com/VKCOM/vkid-android-sdk — VK ID auth Android SDK;
  bridges to Unity via standard Android plugin pattern.

Not surfaced but worth re-checking quarterly: RU Ludum Dare entries
with public Unity MP prototypes, and any first-party VK Play / MyGames
public OSS samples (developer portals at https://documentation.vkplay.ru/
and https://developers.vkplay.ru/welcome did not expose a public
samples org during this audit).

When a junior asks for "a real RU-speaking team's GitHub-shaped FPS to
read", the honest answer right now is **read the English-language repos
in `oss-unity-mp-shooters.md`** and pair them with the RU-language
explainers in §2 / §3. Pretending otherwise wastes the reader's time.

---

## 5. Sanctions-aware backend alternatives

Most load-bearing section. English-language tutorials don't even
acknowledge the constraint.

### 5.1 What's broken / fragile

- **Microsoft Azure PlayFab** — payment from RU is hostile, account
  provisioning intermittent, region routing degraded. Not a viable
  primary backend for an RU entity in 2026. Migration narrative:
  https://medium.com/@imperium42/the-silent-death-of-playfab-29614f5b9f15.
- **AWS** — partial; lawful exposure non-trivial.
- **Photon Engine (Exit Games, Hamburg)** — company still operates,
  RU devs still use it, but EU-RU payment friction makes annual license
  renewals procedurally hard. Several studios moved to self-hosted
  Photon Server or swapped to Mirror + custom relay.

### 5.2 What still works

- **Google Play developer console + IAP** — works from RU developer
  accounts (https://support.google.com/googleplay/answer/11959342).
  User-side card limitations apply.
- **Yandex Cloud** — practical default for hosting dedicated game
  servers, matchmaking, metric ingest from RU jurisdiction.
- **VK Cloud** (formerly Mail.ru Cloud Solutions) — secondary domestic
  IaaS option.

### 5.3 Domestic SDKs to learn

- **RuStore Pay SDK for Unity** —
  https://www.rustore.ru/help/en/sdk/pay/unity/10-1-1 and
  https://www.rustore.ru/help/en/sdk/payments/unity. Mandatory for
  monetising in RuStore-distributed APKs. Restricted to RU usage —
  don't bundle unconditionally in a global binary.
- **Yandex Games SDK** (web / WebGL Unity titles):
  https://yandex.ru/dev/games/doc/ru/ — auth, leaderboards, IAP for
  Yandex Games HTML5. UnityHub.ru walkthrough:
  https://unityhub.ru/guides/podklyuchaem-yandex-reklamu-dlya-yandeks-igr-na-unity_43.
- **VK Play developer dashboard** — https://developers.vkplay.ru/welcome,
  docs at https://documentation.vkplay.ru/. Less documented than
  RuStore; opt-in for indie devs.
- **VK Unity SDK** — https://github.com/VKCOM/vk-unity-sdk — in-game
  social graph features (friend lists, share, leaderboards vs VK
  friends).

### 5.4 Concrete Flump architecture recommendation

Flump targets RU-speaking mobile FPS players via Google Play + RuStore:

1. **Distribution**: Google Play primary; RuStore secondary for
   sanctions-resilient RU coverage.
2. **Build flag** separates RuStore SDK so the Google Play APK never
   includes RuStore IAP and vice versa — both stores reject the
   competitor's billing in their listing.
3. **Backend**: Yandex Cloud-hosted dedicated game server (Photon
   Server self-hosted, or pure Mirror + custom relay if budget
   hostile).
4. **Auth**: Google Sign-In on Play SKU; VK ID on RuStore SKU.
5. **Meta-economy / progression**: server-authoritative .NET 8 service
   on Yandex Cloud, validated via the SharedLogic command-hash pattern
   (§3.1) — keeps combat-tick netcode honest and progression
   cheat-resistant without per-CCU pricing.
6. **Telemetry**: avoid Azure App Insights / GA4 dependence on
   sanctioned regions; consider self-hosted ClickHouse on Yandex Cloud.

---

## 6. Localization patterns specific to RU / KK / UA markets

### 6.1 Plural forms (CLDR rule "russian")

Russian (and Ukrainian, Belarusian) use **4 CLDR plural categories**:
`one` / `few` / `many` / `other`. Russian examples:

- `one` — 1, 21, 31 (ending in 1, except 11): `1 патрон`
- `few` — 2-4, 22-24 (ending in 2-4, except 12-14): `3 патрона`
- `many` — 0, 5-20, 25-30 (ending in 5-9 or 11-14): `5 патронов`
- `other` — fractional values: `1.5 патрона`

Unity's Localization package (`com.unity.localization`) Plural
Formatter implements CLDR natively; format strings look like
`{0:plural(ru):патрон|патрона|патронов}`. Docs:
https://docs.unity3d.com/Packages/com.unity.localization@1.5/manual/Smart/Plural-Formatter.html

I2 Localization (paid asset) also implements all 4 RU forms.

**Anti-pattern**: a 2-form English `{0} patron(s)` mass-translated to
RU. Reads like broken Russian and draws user complaints. The 4-form
requirement applies to **every** quantity-bearing UI string (ammo,
kills, lobby player count, time-remaining, currency).

### 6.2 Formal vs informal address

"ты" (informal singular) vs "вы" (formal / plural). Mobile shooters
skew younger and competitive; Flump's audience expects **"ты"** in
tutorial copy and PvP UI. Using "вы" everywhere reads as
corporate/cold. Inverse: store / EULA / refund flows use "вы". Pick
once per UI surface and document in the localization style guide.

### 6.3 Kazakh and Ukrainian

- **Kazakh (kk-KZ)** — 2-form CLDR (`one` / `other`). Easier than
  Russian. Keep `kk-KZ` as a separate file from `ru-RU`.
- **Ukrainian (uk-UA)** — same 4-form CLDR rule as Russian.
  Politically and linguistically distinct vocabulary; do not auto-derive
  from RU translations.

For Grand Mobile / Flump priority: `ru-RU` first, `en-US` second,
`kk-KZ` third (KZ is meaningful share of RU-language mobile market and
Kazakh strings score well on App Store listing relevance even when
in-game UI defaults to Russian).

### 6.4 RU dev-side reference posts

- https://romanilyin.com/unity-localization/ — Roman Ilyin deep-dive.
- https://habr.com/ru/articles/694662/ — Habr: Локализация игр на Unity
  и Unreal.
- https://dtf.ru/gamedev/3691931-lokalizatsiya-v-unity-podkhody-i-instrumenty
  — DTF: localization base.

---

## 7. Honest section — what RU gamedev OSS doesn't have

The RU gamedev OSS community is **a fraction of the size** of the
English one. This audit could not find:

- A maintained, OSI-licensed, production-grade Unity MP FPS with an
  RU-located primary maintainer and an RU-language README.
- An RU equivalent of Unity Technologies' Boss Room reference.
- An RU equivalent of Code Monkey / Brackeys with comparable depth on
  multiplayer specifically.
- A community-maintained RU sanctions-aware backend cookbook (each
  studio has rebuilt this knowledge privately; this entry's §5 is the
  closest public synthesis we've assembled).

What does exist and is genuinely useful:

- One first-rate RU-authored architecture article (SharedLogic, §3.1).
- Two solid RU NGO tutorial paths (§2.3, §3.3, §3.4).
- A practitioner-grade DTF stack-comparison post (§3.5).
- An industry-portal benchmark precedent (Guns of Boom, §3.8).
- Domestic SDK documentation in Russian (RuStore, Yandex Games, VK Play
  — §5.3).

For Flump and Grand Mobile: **English-language OSS for deep
architecture references; Russian-language sources for the
backend/SDK/localization realities of shipping into RU-speaking
markets**. Don't pretend the RU community has parity with English;
don't ignore it either, because the parts it does have — sanctions-aware
ops, RuStore IAP, 4-form plural localization — are exactly the parts
English sources can't teach.

---

## 8. References

### Russian-speaking YouTube
- https://www.youtube.com/@flatingofamily — Flatingo, RU/EN, 2D Unity +
  indie devlogs.
- https://www.youtube.com/channel/UC7f5bVxWsm3jlZIPDzOMcAg — Хауди Хо,
  RU, broad IT / Unity beginner.
- https://www.youtube.com/watch?v=w6_9Wj9JNuw — RU NGO tutorial Part 1.
- https://www.youtube.com/watch?v=ErJd-3oYG0g — RU NGO tutorial Part 3.
- https://www.youtube.com/watch?v=OpbvMwiUdxM — RU NGO tutorial Part 5.
- https://www.youtube.com/watch?v=yzR1U-cmeTQ — RU lobby + Relay.
- https://www.youtube.com/watch?v=TNDH7umembY — "Стоит ли изучать NGO?"

### Habr long-form
- https://habr.com/ru/articles/918220/ — SharedLogic (Lezhnev,
  2025-06-13).
- https://nikolaylezhnev.github.io/sharedlogic/ — companion site.
- https://github.com/NikolayLezhnev/sharedlogic — repo (verify LICENSE).
- https://habr.com/ru/articles/549018/ — Mirror intro (Splendidus,
  2021/2022).
- https://github.com/Sp1endidus/HabrUnityMirror — Mirror tutorial repo.
- https://habr.com/ru/companies/digital_tatarstan/articles/717270/ — NGO
  pedagogy (Nacharov, 2023-02-16).
- https://habr.com/ru/articles/920000/ — "Вселенная Сетевых Игр"
  (TatianaZo, 2025-06-19).
- https://habr.com/ru/articles/922740/ — NGO chat Part 1.
- https://habr.com/ru/articles/933338/ — Part 2.
- https://habr.com/ru/articles/935080/ — Part 3.
- https://habr.com/ru/articles/694662/ — Localization Unity / Unreal.

### DTF + gamedev.ru
- https://dtf.ru/gamedev/3690495-multiplayer-v-unity-vybor-tehnologij-i-optimizatsiya
  — MP stack comparison.
- https://dtf.ru/gamedev/1193253-final-foe-o-razrabotke-setevogo-multipleera-na-unity
  — Final Foe Mirror devlog.
- https://dtf.ru/gamedev/2186440-opensource-proekty-na-unity-chast-1 —
  OSS Unity list.
- https://dtf.ru/tag/opensource — OSS tag.
- https://dtf.ru/gamedev/3691931-lokalizatsiya-v-unity-podkhody-i-instrumenty
  — Localization base.
- https://dtf.ru/apanasik/207576-vybiraem-pravilnuyu-biblioteku-dlya-multipleera
  — Picking an MP library (Apanasik).
- https://gamedev.ru/unity/forum/?id=259858 — Mirror lobby max
  connections.
- https://gamedev.ru/unity/forum/?id=228700 — Networked shooter
  solutions thread.

### App2Top
- https://app2top.ru/ — front page.
- https://app2top.ru/industry/retenshn-1-go-dnya-kolebletsya-ot-40-do-60-protsentov-game-insight-o-svoem-novom-proekte-guns-of-boom-88210.html
  — Guns of Boom retention case.

### Domestic SDKs and stores
- https://www.rustore.ru/help/en/sdk/pay/unity/10-1-1 — RuStore Pay
  SDK Unity (latest).
- https://www.rustore.ru/help/en/sdk/payments/unity — RuStore IAP +
  Subscriptions Unity SDK.
- https://www.rustore.ru/help/en/sdk/vk-id — VK ID auth via RuStore.
- https://www.rustore.ru/developer/en — RuStore developer console.
- https://yandex.ru/dev/games/doc/ru/ — Yandex Games SDK.
- https://yandex.ru/dev/games/doc/ru/services/about-monetization —
  Yandex Games monetization.
- https://unityhub.ru/guides/podklyuchaem-yandex-reklamu-dlya-yandeks-igr-na-unity_43
  — Yandex Ads in Unity.
- https://documentation.vkplay.ru/ — VK Play developer docs.
- https://developers.vkplay.ru/welcome — VK Play dashboard.
- https://github.com/VKCOM/vk-unity-sdk — VK Unity SDK.
- https://github.com/VKCOM/vkid-android-sdk — VK ID Android SDK.

### Localization
- https://docs.unity3d.com/Packages/com.unity.localization@1.5/manual/Smart/Plural-Formatter.html
  — Unity Localization Plural Formatter (CLDR).
- http://inter-illusion.com/assets/I2LocalizationManual/Plurals.html —
  I2 Localization plurals manual.
- https://romanilyin.com/unity-localization/ — Roman Ilyin deep-dive.

### Sanctions / market context
- https://medium.com/@imperium42/the-silent-death-of-playfab-29614f5b9f15
  — PlayFab migration narrative (EN, the canonical "why we left"
  reference RU teams cite).
- https://meduza.io/en/feature/2024/12/19/return-of-the-pirates —
  Meduza on how sanctions reshaped RU game industry.
- https://support.google.com/googleplay/answer/11959342 — Google Play
  RU/UA sanctions guidance.

---

*Last verified 2026-05-03. Re-audit recommended quarterly: RuStore SDK
versions roll fast, Photon billing posture is unstable, and the Habr
NGO tutorial cluster is still actively publishing.*
