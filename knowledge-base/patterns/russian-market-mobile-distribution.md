---
type: pattern
slug: russian-market-mobile-distribution
title: Russian-market mobile distribution — RuStore, VK, MyGames, Yandex
engine: other
content_format: mixed
language: typescript
license: open patterns
source_url: https://www.rustore.ru/help/developers
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: critical
tags: [russian-market, mobile, distribution, rustore, vk, mygames, yandex, sanctions]
---

# Russian-market mobile distribution — RuStore, VK Play, MyGames, Yandex

This is a concrete distribution playbook for shipping a mobile game to a
Russian-speaking audience in 2026. It is not a copy of the Western
Google-Play-+-App-Store workflow. Sanctions, payment-network restrictions
and platform fragmentation pushed the market into a hybrid model where you
must integrate against several domestic stores, several auth providers and
several payment rails in parallel.

The pattern is written from the perspective of GamesAI's downstream
consumers — Grand Mobile (a Russian-market mobile MP project) and similar
Russian/CIS-targeted games. It applies whether the runtime is Unity,
Unreal, or HTML5.

## 1. The 2026 Russian-market mobile reality

The single most important framing point: **Google Play and the App Store
are still reachable, but they are no longer the centre of gravity for
Russian users.** They behave more like long-tail distribution channels;
the domestic stores are where day-1 installs and monetisation actually
happen.

What the picture looks like in practice:

- **Google Play** — the app is installable, but developer accounts
  registered to RU entities have been suspended in waves since 2022 and
  the suspensions have continued through 2025. In-app purchases via
  Google Play Billing do not settle to RU bank accounts. Practical
  workarounds (foreign LLC, foreign payout account) exist but introduce
  legal/tax exposure that small teams should not absorb without counsel.
- **Apple App Store** — the app is installable, but IAPs require a
  payment instrument tied to a non-RU card. Russian-issued Visa /
  Mastercard cards stopped working internationally in March 2022 and
  have not returned. MIR cards do not work in App Store. The result:
  even players who can download the game cannot pay through Apple
  without going out of their way (foreign card / gift card).
- **Domestic stores have matured.** The four that matter:
  - **RuStore** — official, backed by a consortium led by VK, mandated
    pre-install on devices sold in RU since 2023.
  - **VK Play Mobile** — VK's own gaming-first store/launcher.
  - **MyGames** (My.Games) — VK Group's international+RU games arm,
    historically strong on mid/hardcore mobile.
  - **Yandex Games Hub** — primarily an HTML5 portal that has been
    expanding toward native distribution and Yandex-account-tied
    installs.

The honest summary: **expect to support 3-4 stores on Android and to
treat iOS as a "best-effort" channel where most revenue will not arrive
through the App Store.**

## 2. RuStore deep-dive

RuStore is the de-facto primary Android store for new RU users.

### Pre-installation status

A 2022 Russian regulation requires Russian-software pre-installation on
phones sold in RU. RuStore is on that list. As of 2026:

- **Mandatory pre-install** on all smartphones sold through Russian
  retail under federal law 425-FZ. Distributors are responsible for
  flashing the image; OEMs cooperate to varying degrees.
- **Vendor coverage** (high-confidence): Xiaomi, Honor, Tecno, Infinix,
  ITEL, Realme, Vivo, Oppo, BQ, Inoi, F+, ZTE, Tecno-derivative brands.
  Samsung devices sold through Russian retail also receive RuStore as
  part of the pre-install pack, though Samsung's own Galaxy Store ships
  alongside it.
- **Huawei** ships HMS / AppGallery as the primary store but RuStore
  installs cleanly on top.
- **Pixel / international SKU devices** — RuStore is sideloadable via
  APK from rustore.ru.

The practical consequence: a fresh phone bought in any Russian retail
chain in 2026 already has RuStore on the home screen. Discovery there
is the closest analogue to Google-Play-default that exists in the
market.

### RuStore Pay SDK (Unity)

Verify the live state at <https://www.rustore.ru/help/sdk/> — the SDK
naming changed in 2024-2025.

- **BillingClient SDK (Unity)** — the original payments SDK. **Marked
  deprecated; support ends 2026-08-01.** After that date, processing
  stops including for existing subscriptions. Do not start new
  integrations against BillingClient.
- **Pay SDK (Unity)** — current generation. Replaces BillingClient.
  Feature parity for one-shot purchases and subscriptions. A migration
  guide is published in the same docs section.

Integration shape (Unity, current Pay SDK):

1. Add the RuStore Unity package (UPM tarball or .unitypackage from the
   docs).
2. Configure the RuStore application ID in `RuStorePayClient` settings.
3. Initialise the client at startup; check availability — RuStore must
   be installed and the user must be signed in.
4. Fetch product list via `GetProducts(productIds)`.
5. Trigger purchase via `PurchaseProduct(productId)`.
6. Confirm consumable purchases via `ConfirmPurchase(purchaseId)` —
   non-confirmed purchases auto-refund after a window.
7. Validate purchase server-side with the RuStore server-to-server API
   before granting entitlement.

### Revenue share, payouts, age verification

Numbers below are accurate to public terms documented at rustore.ru;
re-verify before signing.

- **Revenue share:** 0% commission on developer revenue under a
  promotional programme that has been extended through 2026 for most
  games categories. After-promo baseline that has been quoted: 15% for
  most goods, with reduced rates for subscriptions and small
  developers. Treat the headline 0% as time-limited and re-check at
  contract sign.
- **Payouts:** monthly settlement to a Russian bank account; foreign
  legal entities are accepted in principle but onboarding is heavier.
- **Age verification:** the store enforces a 0+/6+/12+/16+/18+ rating
  set during publish. Games with 18+ content require explicit user
  age-confirmation on first install and may have ad-network and
  featuring restrictions. Gambling-adjacent mechanics (loot boxes
  presented as gambling) require special declaration.

### Catalogue, moderation, build cadence

- Manifest moderation is human-in-the-loop. Typical first-review
  turnaround is 1-3 business days; updates after the first approval
  are faster.
- Builds are uploaded as APK or AAB; AAB is preferred and required
  for new apps as of 2025.
- Anti-cheat, telemetry SDKs and anything that fingerprints the device
  must be declared in the privacy questionnaire.

## 3. VK Play Mobile

VK Play started as a desktop launcher (think Russian Steam) and has a
mobile arm that is the second-most-important domestic Android channel
after RuStore.

- **Catalogue model:** curated; games are onboarded through a publisher
  contact rather than open self-publish. Smaller developers go through
  the VK Play Partners programme.
- **Monetisation:** in-app purchases handled through VK Pay; subscription
  model supported. Revenue share is in line with RuStore's promotional
  range for partnered titles.
- **Unity SDK:** VK Play SDK for Unity covers auth (VK ID), payments
  (VK Pay), and analytics. The package is distributed via VK developer
  portal rather than UPM registry; install is manual.
- **Cross-promotion:** VK Play Mobile titles get visibility in the VK
  social feed and in VK Play desktop launcher, which is meaningful for
  retention loops.

## 4. MyGames (My.Games)

MyGames is VK Group's games division. Historically a publisher (War
Robots, Hustle Castle, Rush Royale) more than a store, but they operate
**MyGames Store** for direct distribution and offer SDK-level services.

- **Direct distribution:** the MyGames website hosts APKs for their
  catalogue; for third-party titles this typically happens under a
  publishing deal rather than self-serve.
- **PlayHub / GEM SDK:** services SDK covering analytics, attribution,
  IAP, anti-fraud — historically used by their own portfolio, partially
  open to external studios.
- **Why it matters even if you do not publish through them:** their
  ad network and user-acquisition platform reach Russian-speaking
  audiences in segments that Google Ads has effectively walked away
  from.

## 5. Yandex Games Hub

Yandex's games platform.

- **Primary surface:** HTML5 / Web games, embedded inside Yandex
  Browser, Yandex search results, Yandex.Music sidebar, and as PWAs.
  This is the go-to channel for instant-play / hyper-casual on the
  RU market.
- **Native Android:** Yandex distributes a Yandex Games launcher app
  and is expanding into native distribution, but this is still
  catching up to RuStore / VK Play in 2026.
- **Auth + payments:** Yandex ID handles auth; payments go through
  YooMoney / SberPay / card. Revenue share is in the standard 30%
  range minus the platform's regional promo discounts.
- **Why it's worth integrating even for native devs:** a stripped-down
  HTML5 demo on Yandex Games Hub is a high-converting top-of-funnel
  channel that points users to the native install on RuStore.

## 6. Authentication

Google Sign-In is the canonical "default" auth on Android worldwide and
**it is unreliable on Russian devices** in 2026. Google Play Services
itself works on most devices, but devices sold in RU after 2024
increasingly ship without GMS pre-installed or with degraded GMS, and
even where GMS works, OAuth flows that bounce through Google
account-management web pages occasionally fail under DPI conditions.

Auth providers to support, ranked by RU-market reach:

- **VK ID** — the dominant social-auth in RU/CIS; analogous to
  Facebook Login in the West. SDK available for Unity, Unreal, native
  Android, and HTML5. Required if publishing on VK Play Mobile.
- **Yandex ID** — broad coverage, especially among users who already
  have Yandex.Mail / Yandex.Plus subscriptions. Strong for Yandex
  Games Hub and Yandex Browser embeds.
- **Apple Sign-In** — works through the App Store install path.
  Mandatory if you ship on iOS and offer any other social login per
  Apple's review rules.
- **Telegram OAuth (Login Widget)** — high RU reach, particularly
  among 18-35 audiences. Works well for web / HTML5; native flow on
  mobile is via deep-link to Telegram app.
- **Sber ID** — banking-tied auth, covers a very large user base in
  RU because Sberbank is universal. Stronger trust signal for
  payments-heavy flows. Documented at id.sber.ru.
- **Phone-number / SMS** — falls back to RU SMS gateways
  (SMS.ru, SMSAero, MTT, etc.); avoid Twilio because it does not
  consistently terminate to MTS / MegaFon / Beeline / Tele2 in 2026.
- **Google Sign-In** — keep it for users on international SKU devices,
  but never make it the only option.

Practical pattern: **VK ID + Yandex ID + Apple Sign-In + Phone**
covers > 95% of the addressable market with no Google dependency.

## 7. Payments

Card-network sanctions are the binding constraint. Visa, Mastercard
and AmEx exited Russia in March 2022 and have not returned;
RU-issued cards from those networks work only domestically. MIR
(Russian domestic network) is the only card rail that works inside
RU but is essentially unsupported abroad.

For mobile games this means **Stripe / Adyen / Braintree are not
viable** as primary processors. Use domestic rails:

- **YooMoney** (formerly Yandex.Money, now owned by Sber) — broad
  e-wallet + card-acquiring; canonical default for RU online
  payments. Documented at yookassa.ru.
- **SberPay** — Sberbank's payment service; trust signal for the
  ~70% of RU adults who bank with Sber. SBP (System of Fast
  Payments) integration is included.
- **Tinkoff Pay** — T-Bank's payment service; strong for younger /
  urban users. Excellent developer documentation. Now branded
  "T-Pay" after the Tinkoff → T-Bank rebrand.
- **SBP (Система Быстрых Платежей)** — the Central Bank of Russia's
  instant payment rail. Lowest fees (0.4-0.7%), supported by all
  major RU banks. Should be offered as a payment option alongside
  card.
- **Mobile carrier billing** — MTS, MegaFon, Beeline, Tele2 (Yota
  is a Tele2 sub-brand). Aggregators: Fortumo, A1 Telekom (where
  still operational), Centili, Mobi.Money. Useful for low-ticket
  IAPs and for users without bank cards (teen audience).
- **Crypto** — increasingly common in RU as a fallback rail. Out of
  scope for App Store / Play Store distribution; only consider for
  direct-distribution channels and only if your legal context allows.

For the in-app-purchase flow on the domestic stores, use the store's
own payments rather than a third-party processor:

- RuStore → RuStore Pay
- VK Play Mobile → VK Pay
- MyGames Store → MyGames Wallet / Direct Payments
- Yandex Games Hub → YooMoney / SberPay through Yandex's flow

## 8. Backend hosting

PlayFab is operated by Microsoft on Azure; the Azure regions that
served RU traffic were spun down and Microsoft suspended new sales in
RU in 2022. PlayFab is functionally not viable as a backend for a
RU-market game in 2026 — latency from non-RU PlayFab regions is poor
and there are billing and data-residency issues.

Replacements that work:

- **Yandex Cloud** — primary recommendation. Compute Cloud (VMs),
  Managed Kubernetes, Managed PostgreSQL / MySQL / ClickHouse / YDB,
  Object Storage (S3-compatible), Cloud CDN, Cloud Functions,
  Serverless Containers, Network/Application Load Balancer, Message
  Queue, and Monium observability. Multi-region inside RU plus a
  Kazakhstan presence.
- **VK Cloud** (formerly MCS — Mail.ru Cloud Solutions) — full IaaS,
  managed databases including Tarantool, S3-compatible storage. Good
  fit if you are already in the VK ecosystem.
- **Selectel** — strong on bare-metal and dedicated GPU; useful for
  game-server hosts that need predictable per-instance cost.
- **SberCloud** (Cloud.ru) — Sber-backed; broad managed service set
  including Kubernetes and AI inference.
- **Self-hosted in CIS** — colocation / dedicated in Kazakhstan
  (data centres in Almaty / Astana operated by Kazakhtelecom and
  several private DCs), Belarus, Armenia (Yerevan DC, used heavily
  by exit-routed RU traffic), Uzbekistan. Useful if you need a
  legal entity outside RU but still want sub-50ms latency to RU
  users.

Pattern: **deploy game-servers / matchmaking in Yandex Cloud
Moscow + Kazakhstan, store player data in YDB or managed Postgres,
use Object Storage for assets, and put Cloud CDN in front of the
client manifest / patches.**

## 9. Anti-cheat and fraud

The Western anti-cheat market (BattlEye, Easy Anti-Cheat / EAC,
Denuvo Anti-Cheat) primarily targets desktop / console and is
weakly applicable to mobile. On mobile, the realistic options:

- **In-house signal collection** — emulator detection, root /
  jailbreak detection, app-tampering detection, behaviour analytics.
  Most large RU mobile titles run their own pipeline rather than
  buying a third-party SDK.
- **Server-authoritative gameplay** — the highest-leverage move: do
  not trust the client for anything that affects economy, ranking
  or matchmaking. This is engine- and design-level work, not a
  vendor purchase.
- **MyGames anti-fraud / Anti-Cheat Toolkit (Unity asset)** — used
  by a meaningful slice of RU mobile devs.
- **AppsFlyer Protect360 / Adjust Fraud Prevention** — install-fraud
  rather than gameplay anti-cheat. Both still operate in RU as of
  2026, with reduced support footprint.
- **Captchas:** reCAPTCHA is unreliable from RU IPs. Yandex SmartCaptcha
  is the local replacement and integrates cleanly with Yandex Cloud.

Cross-reference: see also `knowledge-base/patterns/anti-cheat-options.md`
for the engine-agnostic discussion.

## 10. Localisation

Language priority for RU-market mobile in 2026:

- **Primary:** Russian (`ru`). Required for store listings on RuStore
  and VK Play; required by 425-FZ for any pre-installed software.
- **Secondary CIS-Russophone:** Kazakh (`kk`), Uzbek (`uz`), Kyrgyz
  (`ky`), Belarusian (`be`). Most of these audiences also read
  Russian fluently, so RU is the fallback locale; localising the
  store listing alone is often enough.
- **Ukrainian (`uk`):** **politically sensitive — handle carefully.**
  There is meaningful RU-targeted demand for UK localisation from
  Ukrainian players inside the EU and Ukraine. Independently of
  political position, ukrainian-language localisation is not
  controversial in itself, but: do not force-default UK to RU
  speakers; do not use phrasing or place-names that take a side;
  do not bundle UK with "RU dialects". Treat UK as a fully
  separate first-class locale or do not ship it. If your team
  cannot commit to that level of care, ship RU-only and let
  community translators contribute via a public glossary.
- **English (`en`):** for international visibility from the same
  build; cheap to add.

Cross-reference: tooling for catching missing or bad keys lives in
`knowledge-base/patterns/locale-static-checks.md` and the GamesAI
`localization-assistant` module.

## 11. Legal

Three legal regimes shape what shipping a mobile game in RU actually
involves:

- **152-FZ (personal data law).** Personal data of RU citizens must be
  initially collected and stored on servers physically located in
  Russia. Sync to foreign servers is allowed for some operations,
  but the *primary* copy must be in-RU. This is the binding reason
  Yandex Cloud / VK Cloud / Selectel exist as a category. Practical
  pattern: collect identifiers, accounts and payment metadata in a
  RU-region database; replicate non-PII gameplay analytics to
  ClickHouse anywhere convenient.
- **Age-rating system.** Federal law 436-FZ defines age categories
  0+, 6+, 12+, 16+, 18+. Categories must be displayed on the store
  listing and inside the app. RuStore enforces declared rating;
  mismatches surface in moderation. 18+ ratings restrict certain
  promotion channels.
- **Fan-content / IP rules.** Russia recognises fan-content
  doctrines similar to fair-use but without the same case law
  base. If your game leans on parody, fan-creative or
  user-generated-content of recognisable IPs, get counsel — the
  cost of being wrong is asymmetrically high.
- **Loot boxes / gambling-adjacent.** Not formally regulated as
  gambling at federal level as of 2026, but RuStore moderation
  treats clearly-gambling-shaped mechanics restrictively. CBR
  guidance is tightening; expect this to formalise within
  12-18 months.

This pattern is not legal advice. Engage a Russian-jurisdiction lawyer
before shipping.

## 12. Honest framing

Shipping a mobile game to the Russian market is not a translation
project on top of a Western build pipeline. It is a parallel
distribution programme. Realistic expectations:

- **Extra integration work: 30-50%** on top of a Western-only build.
  That covers: 3-4 store SDKs (RuStore Pay, VK Play, MyGames where
  relevant, Apple/Google as long-tail), 3-4 auth providers
  (VK ID + Yandex ID + Apple + phone), 2-3 payment rails (YooMoney,
  SberPay, SBP, carrier billing as fallback), backend redeployment
  to Yandex Cloud / VK Cloud, SmartCaptcha, RU-side analytics
  pipeline.
- **Two release calendars.** Each store has its own moderation
  queue, build format requirements, and policy review. Plan for two
  parallel CI lanes feeding store-specific artifacts.
- **Different telemetry stack.** GA4 / Firebase Analytics work but
  are noisy from RU IPs. Yandex Metrika and AppMetrica (Yandex's
  mobile analytics) are the local defaults and integrate with the
  Yandex Cloud data pipeline.
- **Different ad network.** Google AdMob and Meta Audience Network
  have reduced RU footprints. Yandex Ads, VK Ads, MyTracker,
  myTarget, AdRiver and Astra cover the gap. CPM and fill rates are
  meaningfully different from Western benchmarks; do not project
  Western ARPDAU onto a RU launch.
- **Customer support in RU.** Trivially obvious, but worth stating:
  English-only support tickets get bad reviews on RuStore.

The payoff: the RU-speaking mobile audience is large (~140M in RU
plus ~60M Russophone CIS), under-served by Western publishers since
2022, and has an established willingness to pay through domestic
rails. Treating the integration work as the moat, not as friction,
is the right framing for studios that decide to invest.

## References

Primary sources to verify against — re-check before any contract or
launch decision:

- RuStore developer portal — <https://www.rustore.ru/help/developers>
- RuStore Pay SDK docs — <https://www.rustore.ru/help/sdk/>
- VK developer portal — <https://dev.vk.com/>, VK Play partners —
  <https://vkplay.ru/dev/>
- MyGames developer site — <https://mygames.tech/>
- Yandex Cloud — <https://yandex.cloud/en/>
- Yandex Games Hub — <https://yandex.com/dev/games/>
- YooMoney / YooKassa — <https://yookassa.ru/developers>
- SberPay developer — <https://developer.sber.ru/>
- T-Bank acquiring (Tinkoff Pay) — <https://www.tbank.ru/business/acquiring/>
- SBP (Central Bank of Russia, FAQ) — <https://sbp.nspk.ru/>
- Federal law 152-FZ summary — Roskomnadzor, <https://rkn.gov.ru/>
- Industry analysis benchmarks — App2Top.ru
  (<https://app2top.ru/>) for RU mobile market revenue and download
  benchmarks, GameDev.ru for engineering-side discussion.

## Cross-references inside this knowledge base

- `knowledge-base/patterns/anti-cheat-options.md` — generic anti-cheat
  framing that this pattern narrows for the RU-mobile context.
- `knowledge-base/patterns/locale-static-checks.md` — RU/KK/UK string
  validation tooling that GamesAI's localization-assistant module
  builds on.
- `knowledge-base/sources/community-sentiment-ai-gamedev.md` — guardrail
  filter for any AI-tooling decisions inside this distribution path.
- `VISION.md` — confirms RU-market mobile distribution as a primary
  GamesAI use-case via Grand Mobile and the Russian-market wedge.
