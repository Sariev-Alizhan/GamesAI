# GamesAI — Third-party licenses and AI model posture

> Audit date: 2026-05-02. Re-run before adding any new runtime dependency, AI model, or external API.

## Runtime dependencies — all permissive

Every production dependency in this repository is MIT, Apache 2.0, or BSD-style. No copyleft, no non-commercial, no vendor-lock-in licenses anywhere in the runtime path.

| Package | License | Used in |
|---|---|---|
| `@anthropic-ai/sdk` | MIT | boilergen (AI Describe), localization-assistant |
| `@modelcontextprotocol/sdk` | MIT | boilergen (MCP server) |
| `express` | MIT | boilergen (web playground), generated node-api targets |
| `handlebars` | MIT | boilergen (template engine) |
| `js-yaml` | MIT | boilergen, schema-validator |
| `zod` | MIT | boilergen |
| `commander`, `chalk` | MIT | All three modules (CLI) |

Re-verify with `find . -name package.json -not -path '*/node_modules/*' | xargs jq '.dependencies'`.

## AI providers — what we use, what we refuse, why

GamesAI's principle is **deterministic core + opt-in AI**. Every module works without any AI provider configured. AI is a layer on top, never a hard dependency.

### Currently used

- **Anthropic Claude API** (`@anthropic-ai/sdk`)
  - Used by: boilergen (AI Describe), localization-assistant (translation fill, default provider)
  - License posture: SOC 2 Type II; **does not train on customer data** (Anthropic ToS); commercial use OK.
  - User must provide `ANTHROPIC_API_KEY`. No baked-in keys, no shared inference.

- **DeepL Pro API** (no SDK — direct fetch to api.deepl.com)
  - Used by: localization-assistant (`fill --provider deepl`, opt-in alternative)
  - License posture: commercial use OK on paid tier; we explicitly do NOT support DeepL Free (TOS forbids "creating similar product...based on machine learning, including translations").
  - User must provide `DEEPL_API_KEY` for the Pro tier. They pay DeepL per character directly. No baked-in keys.
  - Limitation: DeepL doesn't support Kazakh, Uzbek, Thai, etc. — for those, use the Anthropic provider.

### On the roadmap (horizon 2-3, see ROADMAP.md)

- **Local Ollama** (MIT, vendors llama.cpp under MIT) — primary recommended runtime for users who want zero-network operation. Models still subject to their own licenses; we recommend Mistral / Qwen / DeepSeek (permissive) over Llama 3 (700M MAU clause).
- **Groq Cloud** free tier — secondary fallback; commercial use OK; **does not train on prompts** ([source](https://awesomeagents.ai/tools/free-ai-inference-providers-2026/)).
- **Cerebras** free tier — tertiary fallback; same posture as Groq.
- **OPUS-MT (Helsinki-NLP)** — CC-BY 4.0 (commercial OK with attribution); recommended **default offline translation engine** for localization-assistant; lower per-call quality than Claude but legally clean and zero-cost.
- **Crowdin / Lokalise APIs** — file-format adapters; OSS-friendly; native open APIs.
- **NVIDIA Audio2Face SDK** — MIT (plugins) + Apache 2.0 (Python); shipping in F1 25, Alien: Rogue Incursion. Pairs with localization-assistant for "translate dialog → dub → relipsync."

### Refused — open API exists, but we don't integrate

Either licensing-incompatible, or doctrine-violating, or both:

| Provider / Model | Reason |
|---|---|
| **NLLB-200** (Meta) | CC-BY-NC 4.0 — non-commercial. Cannot bundle or recommend. Use OPUS-MT instead. |
| **Mistral Experiment plan** | TOS bans production use; **prompts may be used for training**. Avoid as default. |
| **Google AI Studio (Gemini free)** | Data may be used to train unless opted out by API setting. Avoid as default. |
| **DeepL Free tier** | TOS forbids "creating similar product...whose primary purpose is to provide services based on machine learning, including translations." Cannot wrap. Pro tier OK. |
| **Suno / Udio** wrappers | Active label lawsuits; Suno has no official API; doctrine red zone (generative final music). |
| **ElevenLabs voice-cloning final VO** | Consent issues at scale + doctrine red zone (replaces VO actor). Placeholder use only, behind explicit user attestation. |
| **Inworld / Charisma runtime NPC dialogue** | Doctrine red zone (generative final narrative). Adjacent to GamesAI scope; we don't wrap or bless. |
| **Llama 3/4 weights** for default-bundled inference | 700M MAU clause + naming rules. Practical impact for users is nil, but for clean OSS distribution we prefer Mistral / Qwen / DeepSeek weights. |
| **Liquibase 5.0+** | Switched to FSL (Functional Source License) in 2025 — not OSI-open. Avoid bundling; OK to inspire schema-validator drift detection. |
| **LM Studio** | App is closed-source; license check required for redistribution. Avoid bundling. |

### Cfx.re (FiveM) Creator Platform License — Jan 12 2026

The Cfx.re Creator Platform License **prohibits using their Creator Services to source material for or promote generative AI tools**. GamesAI's `generic-rp` plugin and any future FiveM-aware extension treat Cfx Creator Services as **off-limits for AI training data and AI-marketing use**. Our positioning is **"deterministic tooling with opt-in AI"** — exactly the posture this license permits.

## Knowledge-base content

Files in `knowledge-base/` are curated by the maintainer from public sources, with citations. Content is original or quoted-with-attribution, MIT-licensed alongside the rest of the repo. Source URLs in each entry let users verify claims.

## How to add a new dependency / AI provider

1. Verify license: must be MIT / Apache 2.0 / BSD / clearly OSI-open. Reject GPL, AGPL, FSL, BSL, SSPL, CC-BY-NC, "non-commercial," "evaluation only."
2. Verify TOS: provider must NOT train on user prompts/data, OR must default-opt-out.
3. Verify commercial-use: explicitly permitted in license + TOS.
4. Update this file with the new entry. Don't merge a PR that adds a runtime dep without the NOTICE entry.

## Maintainer

Alizhan · raimzhan1907@gmail.com · github.com/Sariev-Alizhan

This file is a living document. Last updated 2026-05-02 (Roadmap v3.0 task 1.6 license hygiene audit).
