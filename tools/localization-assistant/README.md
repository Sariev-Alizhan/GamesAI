# Localization Assistant

> Localization linter + AI-powered fill for game development. Static checks (placeholder parity, length overflow, per-key caps) run **before** any AI; AI translates only what passes lint.

**Module 2 in the [GamesAI platform](../../VISION.md).** Two commands: `lint` (deterministic, no API key needed) and `fill` (AI-powered). Pairs naturally with Boilergen — Boilergen generates i18n stubs with `TODO` placeholders, `lint` validates the source, `fill` translates with real translations.

## What it does

```
en.json (source, 200 keys, all English)
   +
ru.json (target, 150 keys filled, 50 keys with "TODO: translate ..." stubs)
   +
kk.json (target, 80 keys filled, 120 keys missing entirely)
   ↓
   localization-assistant fill --source en.json --target ru.json kk.json
   ↓
ru.json (200 keys, all filled)
kk.json (200 keys, all filled)
```

## What it does NOT do

- **Translate already-translated keys.** Existing non-stub values are preserved. We never overwrite a real translation.
- **Replace human review.** AI gives you a quality first pass. Native-speaker review is still recommended for shipped games.
- **Translate code.** This is for locale JSON only.

## Install

```bash
cd tools/localization-assistant
npm install
npm run build
```

## Use

### `lint` — deterministic checks (no AI, no API key)

```bash
# Catch placeholder drops, length overflow, per-key cap violations
npx localization-assistant lint --source en.json --target ru.json kk.json

# With custom rules (per-locale ratios + per-key caps)
npx localization-assistant lint \
  --source en.json \
  --target ru.json kk.json de.json \
  --rules locale-rules.json

# Treat warnings as errors for strict CI
npx localization-assistant lint --source en.json --target ru.json --warnings-as-errors
```

Exit code: `0` if clean, `1` if any errors. Suitable for CI gates.

**What it catches:**

| Issue | Example | Severity |
|---|---|---|
| `missing-placeholder` | `source: "Hello, {playerName}!"` → `target: "Привет!"` (dropped `{playerName}`) | error |
| `extra-placeholder` | `target: "Привет, {whoIsThis}!"` (no such var in source — likely typo) | warning |
| `length-overflow` | `source: "OK" (2 chars)` → `target: "Bestätigen" (10 chars, 5x)` exceeds default 1.5x ratio | warning |
| `length-cap-exceeded` | `source: "OK"` → `target: "Подтвердить" (11 chars)` exceeds hard cap of 8 chars on `ui.btn.confirm` | error |

**Rules file (JSON, optional):**

```json
{
  "maxLengthRatio": {
    "default": 1.5,
    "ru": 1.5,
    "de": 1.4,
    "ja": 0.7,
    "ko": 0.8
  },
  "maxLengthByKey": {
    "ui.button.confirm": 12,
    "ui.button.cancel": 12,
    "ui.toast.title": 24
  },
  "severity": {
    "extra-placeholder": "error"
  }
}
```

### `fill` — AI translation of missing/stub keys

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Basic fill — auto-detects source as 'en' from filename
npx localization-assistant fill --source en.json --target ru.json kk.json

# With game context — improves translation tone
npx localization-assistant fill \
  --source en.json \
  --target ru.json kk.json \
  --context "fantasy RPG with medieval tone, dark high-fantasy style"

# Dry run — see what would be translated without calling AI or writing files
npx localization-assistant fill --source en.json --target ru.json --dry-run
```

**Recommended workflow:** `lint` → human review of any errors → `fill` for the missing keys → `lint` again to verify the AI's output passes the same checks.

## Supported layouts

Both flat and nested JSON layouts are detected automatically and preserved on write.

**Flat:**
```json
{
  "weapon.ak47.name": "AK-47",
  "ui.menu.start": "Start Game"
}
```

**Nested:**
```json
{
  "weapon": {
    "ak47": { "name": "AK-47" }
  },
  "ui": {
    "menu": { "start": "Start Game" }
  }
}
```

Internally everything operates on flat keys. The original layout is restored at write time so PR diffs stay clean.

## What counts as "missing"

A key needs a translation if any of:

1. The key is entirely absent from the target file.
2. The value is an empty string.
3. The value starts with `TODO` (case-insensitive). This catches Boilergen-generated stubs.
4. The value equals the source-language value verbatim (untranslated copy).

This means you can re-run the command safely — already-translated keys are preserved.

## How translation quality is achieved

- **Game-aware system prompt** — the AI knows it's translating for a video game, not generic content. Tone defaults to informal/casual (typical game text).
- **Placeholder preservation** — `{0}`, `{{name}}`, `%s` are never translated.
- **Markup preservation** — `<color=...>`, `<b>`, `[i]` tags survive intact.
- **Batched calls per language** — sends every missing key for one target language in a single call. AI sees them together and produces consistent terminology.
- **Prompt caching** — system prompt is cached after first call, so subsequent calls cost ~10% of the first. Filling 500 keys in 3 languages typically costs less than $0.50.
- **Glossary support** (planned) — pre-determined translations for franchise-specific terms ("Fireball" → "Огненный шар"). Glossary entries take precedence over AI translation.

## Pairs with Boilergen

When Boilergen generates a new i18n stub like:

```json
{
  "enemy.slime.name": {
    "en": "Green Slime",
    "ru": "TODO: перевести Green Slime",
    "kk": "TODO: аудару Green Slime"
  }
}
```

Run Localization Assistant pointing at all three locales — it picks up `en` as source, sees `ru` and `kk` as stubs (TODO prefix), generates real translations.

This is the value of multi-module platform: separate concerns, but the workflows compose.

## Status

**v0.2.0 — linter + AI fill.** Two commands: `lint` (deterministic checks, no API key, runs in milliseconds), `fill` (AI translation of missing keys). 51 tests covering core (extractor, writer, linter).

Roadmap:
- v0.3 — `extract` command (find translation keys directly in source code, not JSON)
- v0.4 — Crowdin / Lokalise file-format adapters (XLIFF, PO push-back via API)
- v0.5 — DeepL Pro adapter (BYO-key, opt-in alternative to Claude)
- v0.6 — Glyph coverage check (verify target text fits in a specified font's codepoint set)
- v0.7 — Web UI integrated with Boilergen playground
- v0.8 — Translation memory (cache common phrases per project)

## License

MIT — see repo root.
