# Localization Assistant

> AI-powered locale file filler for game development. Reads your source-language JSON, finds missing keys in target locales, fills them with Claude-generated translations using game-specific context.

**Module 2 in the [GamesAI platform](../../VISION.md).** Pairs naturally with Boilergen — Boilergen generates i18n stubs with `TODO` placeholders, Localization Assistant fills them with real translations.

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

**v0.1.0 — MVP.** Single command (`fill`), single use case (translate missing keys via AI). Tested core (extractor, writer, glossary path).

Roadmap:
- v0.2 — `--glossary` file loading
- v0.3 — `extract` command (find translation keys directly in source code, not JSON)
- v0.4 — Web UI integrated with Boilergen playground
- v0.5 — Translation memory (cache common phrases per project)

## License

MIT — see repo root.
