---
type: pattern
slug: locale-static-checks
title: Localization static checks — placeholder parity, length overflow, font coverage
content_format: json
language: typescript
license: mit
last_analyzed: 2026-05-02
maturity: production
relevance_to_grandgames: high
tags: [localization, i18n, lint, ci, deterministic]
---

# Localization static checks

> Most "broken localization in production" reports are caused by **mechanical
> failures** that AI translation cannot fix because they are not translation
> problems. Static checks catch them in CI before any AI fill runs. This entry
> documents the failure modes our [Localization Assistant linter](../../tools/localization-assistant/src/core/linter.ts)
> currently detects and the modes it should detect next.

## Why deterministic-first

Game localization vendors (Lokalise, Crowdin, Phrase, gridly) have spent ~10
years selling "AI translation memory + automation." Their adoption (45% per
[Google Cloud's Aug 2025 dev survey](https://www.googlecloudpresscorner.com/2025-08-18-90-of-Games-Developers-Already-Using-AI-in-Workflows,-According-to-New-Google-Cloud-Research))
proves the AI side of localization works. What hasn't been productised:
the **deterministic linter** sitting in front of the AI.

This is the same shape as `eslint` for code — a linter doesn't replace the
compiler, it tells you about classes of bugs the compiler doesn't catch.
For localization, the "compiler" (translator, AI or human) doesn't catch
the most expensive failures.

## Failure modes that are mechanical, not linguistic

### 1. Placeholder parity

Source: `"Welcome, {playerName}!"`
Target: `"Добро пожаловать!"`

Result: when the runtime substitutes `{playerName}`, the Russian player sees
no name. Often invisible until QA does a real session.

**Detect:** parse `{...}` placeholders from source and target with brace-depth
counter (handles ICU plural `{count, plural, one {# item} other {# items}}`),
diff variable names, flag `missing-placeholder` (error) and `extra-placeholder`
(warning — likely typo).

### 2. UI length overflow

Source: `"OK"` (2 chars)
Target German: `"Bestätigen"` (10 chars)

Result: button label clips, text overflows speech bubble, mobile UI breaks.

**Detect:** ratio target/source compared against per-language threshold.
Empirical defaults from [Phrase's localization guide](https://phrase.com/blog/posts/game-localization-best-practices/)
and historical post-mortems:

| Pair | Avg expansion ratio |
|---|---|
| en → de | ~1.3x |
| en → ru | ~1.5x |
| en → fr | ~1.3x |
| en → es | ~1.2x |
| en → ja | ~0.7x |
| en → ko | ~0.8x |

Plus a per-key hard cap for fixed-width UI (button labels, single-line
headers). When the cap fires, skip the ratio check — both flagging would
be redundant noise.

### 3. Font glyph coverage (planned, not yet implemented)

Source EN: `"Welcome"` — fits in any Latin font.
Target JA: `"ようこそ"` — needs CJK font subset.
Target HI: `"स्वागतम्"` — needs Devanagari + complex shaping.

If the game ships a font that doesn't cover the target's codepoints,
characters render as `□`/tofu boxes. This bug surfaces only on the player's
device, never in dev.

**Detect:** load the game's font file (TTF/OTF), extract `cmap` codepoint
table, verify every locale's text uses only covered codepoints. Flag
`font-glyph-missing` (error). Library candidates: `opentype.js` (MIT) or
`fontkit` (MIT) — both clean for OSS distribution.

### 4. Plural / gender rules (planned)

ICU MessageFormat:
```
{count, plural, one {# kill} other {# kills}}
```

Russian needs three forms: one (1 kill), few (2-4 kills), many (0, 5+ kills).
Target translation must declare all three:
```
{count, plural, one {# убийство} few {# убийства} many {# убийств}}
```

**Detect:** when source uses `plural`/`select`, verify target's branches cover
the language's required forms. Mapping per language is well-documented in
[Unicode CLDR](https://cldr.unicode.org/index/cldr-spec/plural-rules).

### 5. Untranslatable content drift (planned)

Source values that should *not* be translated (proper nouns, item ids, debug
text) sometimes leak through MT. Common patterns:

- All-caps debug strings: `"DEBUG_MODE_ENABLED"` — keep untouched.
- Markup-only strings: `"<color=red>{0}</color>"` — translate `{0}` only.
- File paths, URLs, version strings, IDs.

**Detect:** simple heuristics on source value shape; flag `should-not-translate`
(warning) when target diverges from source substring-wise where it should be
preserved.

## How AI fill fits in

Static lint runs **first**. The AI fill step then translates only the keys
that pass — placeholders pre-validated, length budgets known, font-coverage-
safe. Run lint **again** on AI output to catch any drops the AI introduced
(particularly relevant for DeepL, which doesn't preserve `{name}` style
placeholders the way Claude does).

The pipeline:

```
en.json (source)
   │
   ▼
[lint --rules rules.json]   ← deterministic, no AI, fast
   │   placeholder parity ✓
   │   length budgets ✓
   │   glyph coverage ✓ (planned)
   │
   ▼
[fill --provider claude|deepl]   ← AI fills missing/stub keys
   │
   ▼
[lint again]    ← catch AI-introduced regressions
   │
   ▼
ru.json, kk.json, de.json (filled, validated)
```

## How this connects to Boilergen

Boilergen's i18n target generates per-entity locale stubs:

```json
{
  "weapon.ak47.name": {
    "en": "AK-47",
    "ru": "TODO: перевести AK-47",
    "kk": "TODO: аудару AK-47"
  }
}
```

The placeholder-parity check has a free hand here: every key a Boilergen
template emits has the same placeholder set across locales (because they're
copies of the source). Drift only happens when humans edit. Linter catches
edit drift early.

## References

- Game Developer — "Game Translation Fails — Common Causes and How to Avoid Them": https://www.gamedeveloper.com/audio/game-translation-fails---common-causes-and-how-to-avoid-them
- Phrase blog — game localization best practices: https://phrase.com/blog/posts/game-localization-best-practices/
- Unicode CLDR plural rules: https://cldr.unicode.org/index/cldr-spec/plural-rules
- ICU MessageFormat: https://unicode-org.github.io/icu/userguide/format_parse/messages/
- Local impl: `tools/localization-assistant/src/core/linter.ts`
