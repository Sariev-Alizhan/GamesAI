---
type: engine
slug: localization-frameworks
title: Localization frameworks — Unity Localization, i18next, Fluent, Crowdin/Lokalise
engine: other
content_format: mixed
language: typescript
license: mixed (Unity / MIT / Apache / commercial SaaS)
source_url: https://docs.unity3d.com/Packages/com.unity.localization@latest
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: critical
tags: [localization, i18n, unity-localization, i18next, fluent, crowdin, lokalise]
---

# Localization frameworks — survey for `localization-assistant`

> GamesAI's [`localization-assistant`](../../tools/localization-assistant) is
> the second product we shipped. Unlike `boilergen`, it meets users on
> whatever stack they already run — Unity Localization tables, a `Locale[]`
> Lua table in a FiveM resource, an i18next JSON namespace, a Crowdin
> export. This entry is the canonical map of those stacks so AI Describe
> (and any future "import from X" feature) reasons about realistic input
> shapes instead of guessing. Versions and licenses verified per stack —
> Russian/Slavic plural handling and OSS distribution licensing filter the
> candidate set hard.

## Stack & scale

- **Module touched:** [`tools/localization-assistant`](../../tools/localization-assistant) v0.2.0, MIT
- **Pipeline shape:** static lint → AI fill → re-lint (see [`patterns/locale-static-checks.md`](../patterns/locale-static-checks.md))
- **AI provider default:** Anthropic Claude via `@anthropic-ai/sdk`
- **File formats supported today:** JSON, YAML
- **File formats planned:** `.po` (gettext), `.ftl` (Project Fluent), Unity Localization CSV export
- **Frameworks profiled in this entry:** 4 native engine solutions, 4 engine-agnostic libraries, 6 TMS platforms

---

## 1. Why this matters

Localization is the single most-asked-for `boilergen` extension that isn't
boilerplate. Every Russian-market RP server already has *some* localization
stack — usually a Lua `Locale[]` in FiveM, sometimes Unity Localization
tables, very rarely a TMS. Replacing their stack is a non-starter;
augmenting it (lint, AI-fill, return in the original format) is a near-
instant sell. `localization-assistant` therefore has to know what these
formats look like in the wild. This entry is that map.

---

## 2. Per-engine native solutions

### 2.1 Unity Localization Package (`com.unity.localization`)

- **License:** Unity Companion License (Unity-specific source-available — usable inside Unity projects, not redistributable standalone). Docs site doesn't display the license inline; confirm in `Packages/packages-lock.json` if redistribution matters.
- **Latest stable:** `1.5.x` (verified via `com.unity.localization@latest` redirect on `docs.unity3d.com`, 2026-05-03). Re-check on entry refresh.
- **Status:** Unity-blessed, stable since 1.0 (2021); recommended replacement for the older `I2 Localization` Asset Store package.
- **Architecture:**
  - **String Tables** — keyed string entries per locale, scriptable-asset backed.
  - **Asset Tables** — same shape for Unity assets (textures, audio, prefabs) so a UI logo can vary per locale.
  - **Smart Strings** — `{0:plural:one|few|many|other}` placeholders resolved against Unity's CLDR-backed plural rules. This is what makes Unity Localization viable for Russian without hand-rolling plural logic.
  - **Locale fallback chains** — `ru-KZ → ru → en` cascade.
- **Editor UX:** native Localization Tables window; CSV / XLIFF import-export for handing files to translators or a TMS.
- **GamesAI relevance:** **critical** — Unity is the dominant engine in our Grand Mobile / personal-Unity-shooter wedge. `localization-assistant` v2 should at minimum round-trip the CSV export.

### 2.2 Godot built-in translation

- **License:** MIT (inherits from Godot itself).
- **Latest stable:** Godot 4.x (see [`engines/godot-version-matrix.md`](./godot-version-matrix.md)).
- **Architecture:**
  - First-class translation API: `tr("KEY")` and `tr_n("KEY", "KEY_PLURAL", n)`.
  - Source files: `.csv` (one row per key, columns per locale) and
    standard gettext `.po` / `.pot`.
  - Plural rules use the standard gettext `Plural-Forms:` header, so
    Slavic languages need explicit declarations (see §6).
- **Editor UX:** Project Settings → Localization → Translations import.
- **GamesAI relevance:** medium today (Godot is rising but not the
  Grand-Games wedge). Reading `.po` would unlock both Godot and any
  gettext-using project simultaneously, so the work amortizes.

### 2.3 Unreal Internationalization

- **License:** Source-available under the Unreal Engine EULA. Anything
  shipped through this system is bound by the UE EULA — relevant if a
  studio is evaluating engine-agnostic alternatives for license reasons.
- **Latest stable:** UE 5.x (see [`engines/unreal-version-matrix.md`](./unreal-version-matrix.md)).
- **Architecture:**
  - `LOCTEXT(...)` / `NSLOCTEXT(...)` macros mark translatable text in
    C++; Blueprint has equivalent text-literal nodes.
  - Build-time gather pipeline produces `.manifest` (source keys) and
    per-locale `.archive` files (translations). Compiled to `.locres` at
    cook time.
  - Editor-driven workflow via the Localization Dashboard.
  - ICU MessageFormat plural / gender rules natively (since UE 4.13).
- **GamesAI relevance:** medium. `.archive` is JSON-shaped, so reading
  it is a straightforward extension once the JSON-driver is generalized.

### 2.4 FiveM / QBCore / ESX (Lua)

- **License:** the resource files themselves are whatever the resource
  author chose; QBCore is GPL-3.0, ESX is MIT, individual community
  resources vary wildly.
- **Pattern:** there is **no formal localization framework**. The de facto
  pattern is a Lua table:
  ```lua
  Locale = Locale or {}
  Locale['en'] = {
      ['shop_open'] = 'Shop is open',
      ['shop_closed'] = 'Shop closes at %s',
  }
  Locale['ru'] = {
      ['shop_open'] = 'Магазин открыт',
      ['shop_closed'] = 'Магазин закрывается в %s',
  }
  ```
  Fetched at runtime by a `_U(key, ...)` helper, usually `string.format`-based.
- **Plural handling:** none. Authors hand-roll `if count == 1 then ... end`
  branches or just ignore the problem.
- **Placeholder convention:** `%s` / `%d` (Lua `string.format`), occasionally
  `{name}` style if the resource ships its own helper.
- **GamesAI relevance:** **critical** — this is the dominant Russian-market
  RP stack. `localization-assistant` should support a Lua-table reader as a
  first-class import path. See [`engines/qbcore-conventions.md`](./qbcore-conventions.md).

---

## 3. Engine-agnostic libraries

### 3.1 i18next

- **License:** MIT (verified — `i18next/i18next` LICENSE on GitHub).
- **Languages:** JavaScript / TypeScript primary, with bindings for React,
  Vue, Angular, Node servers. There is no native C# / C++ port — Unity
  hybrid stacks that ship a WebView UI sometimes consume i18next from the
  embedded JS layer.
- **File format:** JSON namespaces, one file per `(namespace, locale)` pair.
- **Features:**
  - Plural categories via the `_one`, `_few`, `_many`, `_other` key
    suffix convention (CLDR-backed once `i18next-icu` plugin loaded).
  - Context / gender via `key_male`, `key_female`.
  - Interpolation `{{name}}` (double braces — different from ICU `{name}`).
  - Namespaces (one file per UI screen / domain).
  - Lazy-loading per locale.
- **GamesAI relevance:** high, because every web-based companion app, every
  Discord bot for an RP server, every admin dashboard sits in this
  ecosystem. The double-brace placeholder syntax is a separate dialect for
  the linter to learn.

### 3.2 Project Fluent (Mozilla)

- **License:** Apache 2.0 (verified — `projectfluent/fluent` GitHub LICENSE).
- **File format:** `.ftl` (Fluent Translation List), a custom DSL.
- **Designed by:** Mozilla, originally for Firefox. Now used by Wikimedia,
  KDE, and several indie game studios.
- **Why it's interesting:**
  - Treats messages as code: each message can have selectors (gender,
    plural, custom), term references (`{ -brand-name }`), and inline
    formatting — all in the source file rather than separate metadata.
  - Solves the problem ICU MessageFormat solves but with a more readable
    syntax that translators tolerate.
  - Already cited in our [`games/space-station-14.md`](../games/space-station-14.md)
    KB entry — SS14 uses Fluent for its localization, and SS14 is the
    largest OSS RP-multiplayer codebase we've profiled. Real precedent.
- **GamesAI relevance:** high — a `.ftl` reader/writer is the most
  defensible v2 format addition because (a) it's the most expressive,
  (b) the SS14 community is a target audience, (c) Apache 2.0 is OSS-clean.

### 3.3 gettext

- **License:** GPL-3.0 (the GNU `gettext` toolchain itself; the `.po` /
  `.mo` *file format* is a public standard, so reading/writing the format
  in MIT code is fine — only linking against `libintl` would inherit GPL).
- **Tooling:** decades-mature. Poedit (free + paid tiers), Lokalize (KDE,
  GPL), Weblate's built-in editor, every major translator has used it.
- **Plural story:** `Plural-Forms:` header in each `.po` file, e.g. for
  Russian:
  ```
  Plural-Forms: nplurals=4; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : n%10==0 || (n%10>=5 && n%10<=9) || (n%100>=11 && n%100<=14) ? 2 : 3);
  ```
  Powerful but fragile — a wrong header silently mistranslates plurals.
  No native gender / select; common workaround is contextual key names.
- **GamesAI relevance:** medium. Worth supporting because Godot uses it,
  Weblate prefers it, and many smaller engines export to it.

### 3.4 ICU MessageFormat

- **License:** ICU License (BSD-style, permissive — verified on icu.unicode.org).
- **What it is:** a *pattern syntax*, not a runtime library. The IBM-
  originated standard for representing localized messages with
  placeholders, plural / select / gender branches, and CLDR plural rules.
- **Implementations:** `icu4c` (C/C++), `icu4j` (Java), `messageformat`
  (JS/TS, MIT), `formatjs` (React), `intl-messageformat` (browser),
  `Unity Localization Smart Strings` partially.
- **Why it matters:** it is the **lingua franca** for "I want plural and
  gender to actually work in Russian and Arabic". Unreal uses it natively.
  Unity Smart Strings are an ICU-flavoured subset. Project Fluent borrows
  conceptually.
- **GamesAI relevance:** **critical** — even if we never ship our own ICU
  parser, our linter must recognize `{count, plural, one {...} other {...}}`
  syntax to avoid false positives on placeholder-parity checks. Already
  partially handled in [`patterns/locale-static-checks.md`](../patterns/locale-static-checks.md) §1.

---

## 4. Translation Management Systems (TMS)

These are SaaS / self-hosted platforms that sit between developers and
translators, with web editors, glossaries, translation memory, and CI
hooks.

### 4.1 Crowdin

- **License:** commercial SaaS. Free tier for OSS projects (verified
  current policy on `crowdin.com/page/open-source-project-setup`,
  re-verify before recommending).
- **Integrations:** native plugins / SDKs for Unity (Asset Store package),
  Unreal (`Crowdin-UE` GitHub repo), Godot (community), plus generic
  CLI / GitHub Action.
- **Strengths:** mature ecosystem, dominant in indie + AAA gamedev (used
  by Cyberpunk 2077, Hearthstone, many smaller titles), translation
  memory carries across projects, glossary support.
- **Weaknesses:** UI gets complex past 5 locales; pricing scales with
  source-string count.
- **GamesAI relevance:** high — most likely TMS for users running paid
  workflow. A "push linted JSON to Crowdin, pull translations back" flow
  is a defensible v2 feature.

### 4.2 Lokalise

- **License:** commercial SaaS. No published free OSS tier last we
  checked — verify before quoting.
- **Strengths:** the cleanest REST API in the space, well-documented
  webhooks, good CI/CD story. Designers prefer it for Figma plugin.
- **Weaknesses:** more web/mobile-app oriented than gamedev specifically;
  fewer engine-native plugins than Crowdin.
- **GamesAI relevance:** medium-high — second most-likely TMS we'll see
  in the wild, especially for studios with a strong web footprint.

### 4.3 Weblate

- **License:** GPL-3.0 (verified — `WeblateOrg/weblate` GitHub LICENSE).
- **Hosting:** self-hostable (Docker), or Hosted Weblate SaaS (paid;
  free for libre projects).
- **Strengths:** **the** option for sovereign / self-hosted localization.
  Built around git: every translation is a commit on the project's repo.
  Native gettext, XLIFF, JSON, YAML, Android XML, iOS strings, and a
  dozen others.
- **Weaknesses:** UI is functional rather than polished; smaller
  translator pool than Crowdin.
- **GamesAI relevance:** **critical for the Russian-market story.**
  Sovereign-hosting and OSS GPL-3.0 fit Russian-studio constraints
  (no SaaS dependence, no foreign data residency). A Weblate webhook
  integration is on the v2 roadmap.

### 4.4 Smartling, Phrase, Transifex (others)

- **Smartling** — enterprise TMS, strong in marketing localization, rare in gamedev. Commercial.
- **Phrase** — bought Memsource and rebranded; broad but less gamedev presence than Crowdin. Commercial. Their gamedev blog is cited in [`patterns/locale-static-checks.md`](../patterns/locale-static-checks.md).
- **Transifex** — early TMS, lost ground to Crowdin/Lokalise; still used by some OSS projects. Commercial.

Mentioned for completeness; no integration work until a real user asks.

---

## 5. The "static checks before AI fill" philosophy

This section is the architectural anchor for every other section. It is
also the headline differentiator of `localization-assistant` versus the
TMS platforms above.

The pipeline shape (per [`patterns/locale-static-checks.md`](../patterns/locale-static-checks.md)):

```
source.{json,yaml,po,ftl}
   │
   ▼
[ lint ]   ← deterministic, no AI, fast
   │   placeholder parity (handles {name}, {{name}}, %s, ICU {n, plural, …})
   │   length-overflow budget (per-language ratio + per-key hard cap)
   │   font glyph coverage (planned)
   │   plural-branch coverage (planned)
   │   should-not-translate heuristics (planned)
   │
   ▼
[ AI fill ]   ← Claude (default), DeepL Pro (BYO-key opt-in)
   │            ONLY translates keys that passed lint
   │
   ▼
[ lint again ]   ← catches AI-introduced placeholder drops
   │
   ▼
target.{json,yaml,po,ftl} per locale
```

The principle: **mechanical failures get caught mechanically**. AI is for
the linguistic work; AI is not for catching `{playerName}` being silently
dropped from a Russian translation. TMS platforms have *some* lint, but
it's a check-box feature for them — for `localization-assistant` it is
the product. Same move `eslint` made versus the JS compiler: AI is the
compiler here, we're the linter catching what the compiler doesn't.

---

## 6. Russian-market / Slavic plural rules

The single most-broken thing in localization tooling that wasn't designed
for Slavic languages is plural handling. English has 2 plural forms (one,
other). Russian has 4: **one**, **few**, **many**, **other**.

CLDR-spec mapping for Russian (`ru`):

| count examples | category |
|---|---|
| 1, 21, 31, 41, 51, 61, 71… (n%10==1 && n%100!=11) | **one** — "1 убийство" |
| 2-4, 22-24, 32-34… (n%10 in 2..4 && n%100 not in 12..14) | **few** — "2 убийства" |
| 0, 5-20, 25-30, 35-40… | **many** — "0 убийств", "5 убийств" |
| 1.5, 2.7 (decimals) | **other** — "1,5 убийства" |

How each stack handles this:

| Stack | Russian-plural support | Notes |
|---|---|---|
| **ICU MessageFormat** | Native via CLDR | The reference implementation. |
| **Unity Localization Smart Strings** | Native | Unity ships CLDR data; `{0:plural:one|few|many|other}` works out of the box. |
| **Unreal Internationalization** | Native | Uses ICU under the hood since UE 4.13. |
| **Project Fluent** | Native via selectors | `{ $count -> [one] … [few] … [many] … *[other] … }` |
| **i18next** | Yes, via `_one` / `_few` / `_many` / `_other` key suffixes | Requires `i18next-icu` plugin for full CLDR; without it, falls back to a 2-form heuristic which is wrong for Russian. |
| **gettext (.po)** | Yes if `Plural-Forms:` header is set correctly | Easy to forget; Poedit auto-fills it from a language picker. The header above (§3.3) is the canonical Russian one. |
| **Godot tr_n** | Defers to gettext | Same caveat as gettext. |
| **FiveM Lua `Locale[]`** | None | Authors hand-roll or just print "5 убийство" (wrong). |

**Implication for `localization-assistant`:** when source uses ICU plural
syntax and target locale is `ru`, `uk`, `pl`, `cs`, `sr`, `sk`, etc., the
linter must verify all four required branches exist. This is on the
roadmap (planned check #4 in `patterns/locale-static-checks.md`) and is
the single highest-leverage Russian-market feature we can ship.

---

## 7. AI translation providers

Already covered in detail in [`sources/community-sentiment-ai-gamedev.md`](../sources/community-sentiment-ai-gamedev.md);
this section is a one-screen summary so this entry stands alone.

| Provider | Used | License | Notes |
|---|---|---|---|
| **Anthropic Claude** | Yes — current default | Commercial API | Preserves `{placeholder}` reliably; good at Russian; matches the rest of the GamesAI stack (the `@anthropic-ai/sdk` is already a transitive dep). |
| **DeepL Pro** | Yes — opt-in via BYO key | Commercial API | Excellent on European pairs; weaker on placeholder preservation than Claude, hence the mandatory re-lint pass in §5. |
| **DeepL Free** | **Refused** | Free-tier TOS prohibits commercial / redistributable use | We're an OSS tool; users would unknowingly violate TOS. Hard refuse. |
| **NLLB-200 (Meta)** | **Refused** | CC-BY-NC | Non-commercial license; OSS distribution conflicts. |
| **Mistral free tier** | **Refused** | Free-tier TOS issues + inconsistent Russian quality | Skip. |
| **OpenAI GPT-4o** | Available via user-supplied adapter | Commercial API | Not the default; users can wire it up if they prefer. |

The default-Claude choice is an architectural detail, not an ideological
one. The provider interface in `tools/localization-assistant/src/core/`
abstracts it; new providers can be added without touching the lint layer.

---

## 8. Decision tree — which stack for which team

A rough recommendation matrix. "Team size" is engineers + designers
who'll touch the localization files, not total studio headcount.

| Engine / context | Team size | Budget | Recommended stack |
|---|---|---|---|
| Unity, indie / solo | 1–3 | $0 | Unity Localization Package + GitHub-hosted JSON, run `localization-assistant` lint in CI |
| Unity, mid-studio | 4–15 | < $200/mo | Unity Localization + **Crowdin** OSS-tier or paid, or **Lokalise** if web-app heavy |
| Unity, AAA / publisher constraints | 15+ | flexible | Unity Localization + Crowdin Enterprise or in-house Weblate |
| Unreal, any size | any | varies | Unreal Internationalization (mandatory — the engine assumes it) + Crowdin via the UE plugin |
| Godot | any | $0 preferred | Built-in `tr()` + `.po` files + **Weblate** (both GPL, ideologically aligned) |
| FiveM / QBCore / ESX | 1–5 typically | $0 | Lua `Locale[]` tables (no realistic alternative); run `localization-assistant` over them once Lua-table reader lands |
| Custom engine (C++ / Rust) | any | varies | **ICU MessageFormat** + JSON storage, optional **Project Fluent** for richer grammar |
| Web companion / Discord bot / dashboard | 1–5 | $0 | **i18next** (de facto standard) + JSON namespaces |
| Russian-market sovereign hosting | any | $0–self-host | **Weblate** self-hosted + gettext or JSON; this is the only stack that satisfies sovereign-data constraints out of the box |

If the team can't pick one row, the safe default is "store keys in JSON,
lint with `localization-assistant`, defer the TMS choice until you have a
second locale that's *actually* shipping."

---

## 9. What Boilergen + GamesAI does

### Today (`localization-assistant` v0.2.0)

- Engine-agnostic, file-format-agnostic for **JSON and YAML** input.
- Static lint: placeholder parity (with ICU plural awareness) and
  length-overflow ratio checks per-locale.
- AI fill via Anthropic Claude; respects keys that already have values.
- CLI surface: `localization-assistant lint`, `localization-assistant fill`.
- MIT-licensed; OSS-distributable; integrated into CI alongside `boilergen`
  and `schema-validator`.

### Roadmap (v2 candidates, in priority order)

1. **Lua-table reader** (`Locale = { ['en'] = { … } }`) — unlocks the
   FiveM / QBCore / ESX market, our actual wedge.
2. **`.po` reader/writer** — unlocks Godot users and anyone exporting
   from Weblate / Poedit.
3. **`.ftl` (Project Fluent) reader/writer** — unlocks SS14 ecosystem
   and gives us the most expressive format we support.
4. **ICU MessageFormat parser** — currently we recognize ICU plural
   syntax in placeholder-parity checks but don't validate the inner
   grammar; adding a real parser unlocks plural-branch coverage check.
5. **Weblate webhook integration** — push linted files to a Weblate
   project, receive translation-complete callbacks, run the re-lint.
6. **Unity Localization CSV export round-trip** — read the CSV that
   Unity's editor exports, lint, fill, write back.
7. **Crowdin OTA integration** — for studios already on Crowdin who
   want our lint to gate their commits.

### Cross-links to existing patterns and entries

- [`patterns/locale-static-checks.md`](../patterns/locale-static-checks.md) — the canonical lint-rule reference.
- [`sources/community-sentiment-ai-gamedev.md`](../sources/community-sentiment-ai-gamedev.md) — AI-provider rationale and the OSS-license refusal list.
- [`engines/qbcore-conventions.md`](./qbcore-conventions.md) — context for the FiveM Lua `Locale[]` pattern.
- [`games/space-station-14.md`](../games/space-station-14.md) — Project Fluent in production at scale.
- [`engines/unity-version-matrix.md`](./unity-version-matrix.md), [`engines/unreal-version-matrix.md`](./unreal-version-matrix.md), [`engines/godot-version-matrix.md`](./godot-version-matrix.md) — engine-version compatibility for the native solutions above.

---

## 10. Pitfalls

A non-exhaustive list of failure modes we have seen or expect to see
when running `localization-assistant` against real-world projects. Each
one is a candidate for a future lint rule.

### 10.1 Translating without context

Translator (human or AI) sees `{name}` and has no idea whether it's a
player, item, city, or NPC name. Russian inflects all of these differently
by case (nominative, genitive, accusative). Result: grammatically wrong
translations even though every key is filled. **Mitigation:** key-naming
conventions (`item.name.{name}`, `npc.greeting.{name}`) and per-key
context comments. ICU and Fluent support context metadata; goes unused
90% of the time.

### 10.2 Hard-coded English strings via debug paths

`Debug.Log("Player " + name + " died")` doesn't go through the
localization pipeline. When QA switches to Russian and the log reads in
English, the bug report says "Russian translation broken" even though no
translation key is involved. Sometimes these strings *do* reach the
player (uncaught exception toasts). **Mitigation:** static check for
`string + variable` concatenation in UI-adjacent code; planned.

### 10.3 Length overflow on UI elements

German ~30% longer than English; Russian ~50% longer; Finnish can be
100%+ for compound words. Button labels clip, speech bubbles overflow,
mobile portrait mode breaks. The empirical ratio table in
[`patterns/locale-static-checks.md`](../patterns/locale-static-checks.md) §2 is the current defense; ships today.

### 10.4 Asset variants per locale forgotten

The "OPEN" sign on a UI texture is baked into the PNG; Russian build
ships the English PNG. Unity Asset Tables and `LocalizedTexture` exist
to prevent this — only if the team remembers to use them. No linter
catches this today; requires referencing the project's asset graph.

### 10.5 Plural-forms header copy-paste rot

In gettext `.po` workflows, the `Plural-Forms:` header gets copy-pasted
and ends up wrong for the actual locale (e.g. English `nplurals=2` on a
Russian file). Russian plurals collapse to two forms. Hard to spot in
review because the file *looks* correct. **Mitigation:** linter check
comparing header against CLDR-canonical for the file's locale; planned
with `.po` reader.

### 10.6 Mixing placeholder dialects

One project ends up with `{name}` (custom), `{{name}}` (i18next), `%s`
(Lua / printf), `{0}` (.NET / Smart Strings) in one repo. The linter
needs to know which dialect each file uses; today it heuristically
detects from file path conventions, which is fragile. A `.localizerc`
is on the roadmap.

### 10.7 AI-introduced placeholder drops (re-lint catches this)

DeepL has historically translated `Hello, {name}` as `Привет, {имя}` —
translating the placeholder name itself. Claude is much better but not
perfect. The mandatory re-lint pass after AI fill catches this; it is
the most important reason the pipeline runs lint twice.

---

## 11. References

- **Unity Localization** — official docs: <https://docs.unity3d.com/Packages/com.unity.localization@latest>
- **i18next** — <https://www.i18next.com> | repo: <https://github.com/i18next/i18next>
- **Project Fluent (Mozilla)** — <https://projectfluent.org> | spec: <https://projectfluent.org/fluent/guide/>
- **gettext** — <https://www.gnu.org/software/gettext/manual/gettext.html>
- **ICU MessageFormat** — <https://unicode-org.github.io/icu/userguide/format_parse/messages/>
- **Crowdin** — <https://crowdin.com> | OSS tier: <https://crowdin.com/page/open-source-project-setup>
- **Lokalise** — <https://lokalise.com>
- **Weblate** — <https://weblate.org> | repo: <https://github.com/WeblateOrg/weblate>
- **Unicode CLDR plural-rules** — <https://cldr.unicode.org/index/cldr-spec/plural-rules>
- **Phrase blog — game localization best practices** — <https://phrase.com/blog/posts/game-localization-best-practices/>
- **Local impl** — [`tools/localization-assistant/src/`](../../tools/localization-assistant/src/), [`patterns/locale-static-checks.md`](../patterns/locale-static-checks.md)
