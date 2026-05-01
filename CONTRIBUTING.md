# Contributing to GamesAI

GamesAI is the seed of an open-source AI platform for game development. We welcome contributions across modules, plugins, and knowledge-base entries.

## What we accept

### Boilergen plugins (`boilergen/plugins/<your-engine>/`)
A new plugin for any engine or stack we don't cover yet (Unreal, Bevy, Phaser, RPG Maker, etc.) is the highest-value contribution. Follow the structure of `boilergen/plugins/godot-2d-platformer/` or `boilergen/plugins/unity-rpg/` — `targets/<layer>/<entity-type>/<file>.hbs`. Include a README explaining engine specifics and at least 2 example schemas in `boilergen/schemas/<your-engine>/`.

### Knowledge-base entries (`knowledge-base/{games,engines,patterns}/`)
Adding a case study of a real game or engine helps both human plugin authors and the AI Describe RAG layer. Use `_template.md` as a starting point. The `relevance_to_grandgames` field is informal — include why the entry would be useful to plugin authors.

### Bug fixes and tests
Always welcome. Tests live next to the module that needs them (e.g. `boilergen/tests/`, `tools/localization-assistant/tests/`). Use Vitest.

### New platform modules (`tools/<module-name>/`)
Bigger lift, but high-value. See `tools/localization-assistant/` for the reference structure: `src/core/`, `src/cli/`, tests, README. Read [`VISION.md`](./VISION.md) before proposing — modules must fit the platform direction and pass the [community sentiment guardrails](./knowledge-base/sources/community-sentiment-ai-gamedev.md).

## What we don't accept

- **Generative final-asset features** — no AI-painted final art, no AI-composed final music, no AI-written shipped narrative. See [community sentiment guardrails](./knowledge-base/sources/community-sentiment-ai-gamedev.md) for the reasoning.
- **Closed-source dependencies** without offline fallback.
- **NFT/blockchain integrations.** Off topic and a community trust trigger.
- **Plugins for piracy/cheating tooling.**

## Workflow

1. Open an issue describing the change before writing significant code, especially for new modules. We'd rather discuss scope upfront than reject a PR.
2. Fork, create a branch named `<area>/<short-description>` (e.g. `plugins/unreal-rpg`, `kb/openttd`, `loc/glossary-loading`).
3. Run tests locally:
   ```bash
   # For Boilergen
   cd boilergen && npm test

   # For Localization Assistant
   cd tools/localization-assistant && npm test
   ```
4. Run typecheck:
   ```bash
   npm run typecheck   # in the relevant module folder
   ```
5. Open a PR to `main`. Include in the description:
   - What problem you're solving
   - How you tested it
   - Any community sentiment risks (read the guardrails first if unsure)

## Style

- TypeScript strict mode is non-negotiable. All new code must typecheck under `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Comments explain *why*, not *what*. The code already shows what it does.
- One commit, one logical change. Use conventional-commit-style messages (`feat:`, `fix:`, `docs:`, `chore:`).
- No `TODO` comments without a tracking issue.

## Code of conduct

Be kind. Disagree on technical merit, never on identity. We hard-ban harassment, hate speech, and personal attacks. The repo maintainers reserve the right to ban contributors who don't meet this bar.

## Licensing

By contributing you agree your work is licensed under MIT (see [`LICENSE`](./LICENSE)).
