# Roadmap — GamesAI Platform

> Tactical 6–12 month plan. Дополняет [`VISION.md`](./VISION.md) (стратегия 2-3 года). Эта версия (v3.0, 2026-05-02) перерасчитана **после глубокого research-цикла**: pain points (FiveM/altV/RAGE), конкурентный анализ (modl.ai / Inworld / Layer.ai / Convai / Charisma / Codegen.com), open-source building blocks (OPUS-MT vs NLLB licensing, Audio2Face, Crowdin/Lokalise APIs), AI tools по ролям gamedev (Google Cloud Aug 2025: 90% adoption, top areas localization 45% / codegen 44% / playtest 47%), Unity mobile MP shooter SOTA (Photon Quantum / FishNet / Edgegap), и аудит реальных downstream-проектов (Grand Mobile + Flump).

---

## Что изменилось с v2.0 (2026-05-01)

| Изменение | Источник |
|---|---|
| **3 модуля шипнуты**, не 1 | tools/localization-assistant + tools/schema-validator + boilergen |
| **5 engine plugins**, не 1 | gm1, generic-rp, godot-2d-platformer, unity-rpg, **unity-mobile-shooter** (новый) |
| **CI зелёный** + Vercel auto-deploy | GitHub Actions (787b642) |
| **Конкуренты идентифицированы** — никто не строит exactly наш bucket | research 2026-05-02 |
| **License hygiene** теперь критична — несколько ловушек найдены | OPUS-MT vs NLLB, Mistral Experiment TOS, Cfx.re Jan 12 2026 |
| **2 реальных downstream-юзера** | Grand Mobile (employer) + Flump (личный Unity shooter) |
| **Dogfood loop** становится главной feedback-петлёй | unity-mobile-shooter plugin reverse-derived из Flump |
| **Pitch меняется** | "save boilerplate" → "ship richer X in 1 day instead of 1 week" |

## Что было закрыто в session 2026-05-02

За одну рабочую сессию закрыто 11 задач из roadmap (16 commits на main):

**Horizon-1 (4/6):**
- ✅ 1.2 Schema Validator rules (housePropertyId → property cross-ref)
- ✅ 1.4 generic-rp expansion (business / organization / family / property)
- ✅ 1.5 README pitch update + сравнительная таблица "How we're different"
- ✅ 1.6 License hygiene audit (NOTICE.md)
- ⏳ 1.1 Wire unity-mobile-shooter в Flump — Flump-блок (нужен push-доступ)
- ⏳ 1.3 Localization Assistant bootstrap на Flump — Flump-блок

**Horizon-2 (5/6):**
- ✅ 2.1 Localization Assistant статические проверки (linter)
- ✅ 2.3 Schema Validator FiveM-mode фундамент
- ✅ 2.4 Public case study × 2 (QBCore findings + end-to-end PLATFORM-LOOP)
- ✅ 2.5 Knowledge-base 16 → 25 entries
- ✅ 2.6 DeepL Pro adapter
- ⏳ 2.2 Crowdin/Lokalise — deferred

**Horizon-3 (1/6):**
- ✅ 3.1 FiveM target в generic-rp — full coverage 7 entity types

**Дополнительная work за session 2026-05-02 / 2026-05-03 (не в исходном horizon plan):**
- ✅ Flump audit (`handoff/05-FLUMP-AUDIT.md`) — concrete adoption plan для team
- ✅ Game-source triage (11 repos triaged, refused leaked, kept legitimate)
- ✅ Mindustry deep-dive (GPL-3 hybrid content system audit)
- ✅ Beyond All Reason audit (978 units validates balance-smell design)
- ✅ Quake QC comparative entry (4 eras of game data architecture)
- ✅ **Space Station 14 deep-dive** — largest OSS YAML-prototype RP-multiplayer (2068 prototypes / 10670 entities / 9101 inheritance edges; multi-parent, Fluent FTL, 25 prototype types — все patterns которые мы должны украсть)
- ✅ **Engine version matrix framework** + 4 entries (Unity 2020 LTS → 6.3 LTS, FiveM fxmanifest evolution, Godot 3.5 → 4.5 с migration recipes, Unreal UE4.27 → UE5.6) — для version-aware codegen через AI Describe RAG

**Текущее состояние:**
- **24 commits** на main за session
- boilergen 228 + localization 64 + schema-validator 73 = **365 тестов** (было ~291)
- 51 templates в generic-rp (было 12)
- 3 модуля v0.2.0 (было 0.1.0 каждый)
- **Knowledge-base: 34 entries** (было 16) — engines (12), games (10), patterns (7), research-notes (3), sources (2)
- Все 3 модуля имеют production-grade README + CASE-STUDY где applicable
- License posture зафиксирован в `NOTICE.md` — refused leaked Far Cry 1 / unknown p4ss / hacking requests; only OSI/permissive sources цитируются

---

## Где мы сейчас (точка отсчёта — 2 мая 2026)

| Что | Статус |
|---|---|
| **Boilergen** — CLI + Web + MCP + VS Code extension + AI Describe + RAG | ✅ v1.x production |
| **Localization Assistant** — AI-fill missing translations | ✅ v0.1 MVP, 32 теста |
| **Schema Validator** — namespace-aware cross-ref checker | ✅ v0.1 MVP, 44 теста, namespace mode |
| 5 engine plugins | ✅ gm1, generic-rp, godot-2d-platformer, unity-rpg, unity-mobile-shooter |
| GitHub Actions CI (3 джоба) | ✅ зелёный |
| Vercel auto-deploy на push | ✅ live: boilergen-eight.vercel.app |
| Knowledge-base + RAG в AI Describe | ✅ 16 entries (games / engines / patterns / research-notes) |
| Тесты: 215 (boilergen) + 32 (localization) + 44 (schema-validator) | ✅ |
| **Реальный adoption внутри Grand Games** | ⏳ Игорь не дал контекст GM1 |
| **Реальный adoption на Flump (личный Unity shooter)** | 🟡 plugin готов, осталось wire в проект |
| **External pilot studios** | ⏳ 0, целимся на 1-3 в Q3-Q4 |

**Главное за прошлую неделю:** платформа выросла с 1 до 3 модулей, с 1 до 5 плагинов, появилась реальная dogfood-возможность (Flump). Игорь больше не на критическом пути — Flump его заменяет как primary feedback channel.

---

## Стратегические анкеры (от VISION.md, не торгуются)

1. **Core + Adapters + Plugins** на каждом модуле.
2. **AI как опциональный слой**, не критический путь.
3. **Open-source forever** (MIT). Closed-source AI без offline fallback = community trigger.
4. **Department-aware**, не engine-aware first.
5. **One module per sprint** — реальный gap между модулями для observation/feedback.
6. **Каждое расширение** проходит community-sentiment filter (`knowledge-base/sources/community-sentiment-ai-gamedev.md`).

---

## Что мы узнали из research (key findings)

**Конкуренция.** Никто не строит deterministic engine-aware codegen + cross-ref validation для gamedev. Бакет пустой. modl.ai (closed-SaaS QA, $10M raised) — closest neighbour, но другой бакет. Inworld / Layer / Convai / Charisma / Promethean — все в generative-content, которое мы не делаем.

**Юридическая граница.** Cfx.re в Jan 12 2026 версии Creator Platform License **запрещает** использовать их Creator Services для обучения / promotion генеративных AI. Мы deterministic — соответствуем. Позиционируемся как "deterministic tooling с опциональным AI", не "AI for FiveM".

**License hygiene** (must-have в OSS):
- ✅ OPUS-MT (CC-BY 4.0 commercial OK), tree-sitter (MIT), ts-morph (MIT), Audio2Face SDK (MIT/Apache от Sept 2025)
- ✅ Free LLM fallback chain: local Ollama → Groq → Cerebras (не тренируются на промптах)
- ❌ NLLB-200 (CC-BY-NC, non-commercial)
- ❌ Mistral Experiment / Gemini free (тренируются на промптах + TOS forbids production)
- ❌ DeepL Free tier ("creating similar product" forbidden); DeepL Pro OK с BYO-key
- ❌ Liquibase 5.0 (FSL license)
- ❌ Suno / Udio / ElevenLabs voice cloning (red zone + лицензионные иски)

**Adopt-rate calibration** (Google Cloud Aug 2025, 615 devs): localization 45%, codegen 44%, playtest/balance 47%. Мы уже в первых двух. Остальное (animation Audio2Face, LiveOps анализ) — namespace-расширения существующих модулей, не новые модули.

**xEdit / TES5Edit existing 15+ лет** validates Schema Validator's thesis. Gap = engine-neutral OSS-версия для современных движков.

---

## Roadmap по горизонтам

### Горизонт 1 — 2 weeks (immediate, до 2026-05-16)

**Цель:** закрыть dogfood loop с Flump, расширить generic-rp под Grand Mobile реальные системы.

| # | Задача | DoD |
|---|---|---|
| 1.1 | Wire `unity-mobile-shooter` в Flump | YAML → `.asset` файлы лягут в `Assets/_Project/ScriptableObjects/`; 5 game modes уже сгенерированы; добавлены 2-3 новых weapons через YAML вместо ручного inspector |
| 1.2 | Schema Validator rules для `unity-mobile-shooter` | `gameSceneName` есть в Build Profiles; `playersPerTeam*2 ≤ NetworkManager.maxConnections`; weapon `iconPath` resolves; rules в `boilergen/schemas/validator.config.yaml` |
| 1.3 | Localization Assistant bootstrap на Flump | Harvest hard-coded strings из `Assets/_Project/Scripts/UI/*.cs` → `en.json`; AI fill `ru.json` + `kk.json`; report missing keys |
| 1.4 | Расширить `generic-rp` на 4 entity types | `business`, `organization`, `family`, `property` — паттерн job/vehicle/weapon × 4 targets + i18n; reference YAMLs grounded в Grand Mobile системы (support.grnd.gg) |
| 1.5 | README / landing pitch update | Главный pitch меняется на "ship richer X in 1 day instead of 1 week"; добавлен раздел "Differs from modl.ai / Inworld / Layer" |
| 1.6 | License hygiene audit | Проверить что NLLB не используется нигде; Localization Assistant default = OPUS-MT; LLM provider chain документирован |

**Критерий успеха горизонта:** Flump имеет 5+ weapon SO сгенерированных через Boilergen; локализация Flump полная en/ru; Grand Mobile entity types покрыты в generic-rp; landing объясняет позиционирование.

---

### Горизонт 2 — 1 month (до 2026-06-02)

**Цель:** Localization Assistant production-ready на 2+ реальных проектах; первая публичная демонстрация платформы.

| # | Задача | Статус | DoD / commit |
|---|---|---|---|
| 2.1 | Localization Assistant статические проверки до AI fill | ✅ DONE | placeholder parity + length-overflow ratio + per-key cap; commit `c614c4e` |
| 2.2 | Crowdin / Lokalise file-format адаптеры | ⏳ DEFERRED | большая задача, лучше с реальным pilot — отложено к h-3 |
| 2.3 | Schema Validator FiveM-mode (фундамент) | ✅ DONE | parseFxManifest + cross-ref check + 9 issue categories; commit `2f9c1bb` + `21df0f0` |
| 2.4 | Public case study #1 | ✅ DONE × 2 | `tools/schema-validator/CASE-STUDY-QBCORE.md` + `CASE-STUDY-PLATFORM-LOOP.md` end-to-end |
| 2.5 | Knowledge-base extends to 25+ entries | ✅ DONE | 16 → 25; commits `8b345bc` + `a42d634` |
| 2.6 | DeepL Pro адаптер (BYO-key) | ✅ DONE | опциональный provider в Localization Assistant `--provider deepl`; commit `a5ea038` |

**Итог горизонта-2:** **5/6 закрыто, 1 deferred** (Crowdin/Lokalise — без реального pilot бессмысленно строить).

---

### Горизонт 3 — Q3 2026 (3 месяца, до 2026-08-02)

**Цель:** wedge = FiveM/RP/мобильная аудитория. Первый внешний pilot studio.

| # | Задача | Статус | DoD / commit |
|---|---|---|---|
| 3.1 | FiveM target в `generic-rp` (qb-target / ox-target preset) | ✅ DONE | full coverage 7 entity types (job/vehicle/weapon/business/organization/family/property); commits `984128f` + `e8a3783` + `ec43ef6`. PASSES check-fivem by construction. |
| 3.2 | Schema Validator FiveM resource-graph mode (полный) | ⏳ open | SQL drift detection + `qb-target` zone validation против ped models. Фундамент уже в h-2 (`2f9c1bb`); это расширение. |
| 3.3 | NVIDIA Audio2Face SDK интеграция | ⏳ open | требует hardware/setup для тестирования; defer до реального запроса от user'а |
| 3.4 | Первый external pilot | ⏳ open | требует attention/outreach — продукт готов |
| 3.5 | Schema Validator: opt-in "balance smell" pass | ⏳ open | LLM advisory над outlier detection (детерминистичная часть может быть без AI: z-score статистика на numeric поля per entity type) |
| 3.6 | Templates marketplace alpha | ⏳ open | CONTRIBUTING.md + plugin submission convention + license-check workflow |

**Критерий успеха Q3:** есть FiveM-aware preset который можно показать на cfx.re forum (✅ есть, 7 entity types); Schema Validator ловит 5+ real bugs в реальных проектах (✅ 6 warnings + 0 false-positive errors на qbcore tree); 1+ external user написал feedback issue (⏳ open).

---

### Горизонт 4 — Q4 2026 (6 месяцев, до 2026-11-02)

**Цель:** 4-й модуль (если RP traction validated) + community traction.

| # | Задача | DoD |
|---|---|---|
| 4.1 | 4-й модуль: FiveM Discord bug-triage bot | Парсит Lua tracebacks, fxmanifest mismatches, `ox_lib` version errors; группирует duplicates; opt-in LLM clarifier; deployable как Discord bot для одного RP-сервера |
| 4.2 | 3 external pilot studios | 3 разных studios используют ≥1 модуль в production, дают named-customer signal |
| 4.3 | Knowledge-base 50+ entries | Добавлены кейсы реальных RP игр (изучаем чужие репозитории — отложенный приоритет из 2026-05-02 разговора) |
| 4.4 | Public reference customer page | "Used at Grand Games / [Studio 2] / [Studio 3]" в README |
| 4.5 | GDC / podcast / blog mention | 1+ external mention в gamedev media |
| 4.6 | Bot schema in unity-mobile-shooter | Когда `BotData` SO появится в Flump, добавляем третий entity type |

**Критерий успеха Q4:** 3+ studios pilot, 200+ GitHub stars (если real adoption, не маркетинг), 10+ external contributors с merged PRs.

---

### Горизонт 5 — 2027 (12 месяцев)

**Условный.** Активируется только если горизонты 1-4 validated.

- **VISION.md Phase 4** (Game Design tooling — Balance Simulator) — переход в спец-домен после того как RP wedge проверен.
- **Decision point:** SaaS layer (revenue-generating hosted версия) / acquisition conversation / continue OSS-only.
- **VISION.md Phase 5** (QA tooling — bug triage, test case generator) — если RP Discord-бот доказал что "AI-augmented QA" работает.

---

## KPI realistic (не vanity)

Anti-pattern: "100k stars в год". Real signal: реальное использование.

### 3 месяца (до 2026-08-02)

| Метрика | Сейчас | Цель |
|---|---|---|
| Дней между новыми weapons во Flump (proxy для Boilergen ROI) | N/A | <1 (vs ручной inspector прямо сейчас) |
| Реальных проектов на Localization Assistant | 0 | 2 (Flump + Grand Mobile или внешний) |
| Real bugs которые поймал Schema Validator | 0 | 5+ |
| External contributors с merged PR | 0 | 1+ |
| Mention в gamedev media | 0 | 1+ (HN top 100 / r/gamedev / Twitter тред 100+ likes) |
| GitHub stars | <10 | 50+ только-если-real-usage |

### 6 месяцев (до 2026-11-02)

| Метрика | Цель |
|---|---|
| External pilot studios | 3+ |
| Named reference customers | 3+ |
| GitHub stars | 200+ |
| External contributors | 10+ |
| Knowledge-base entries | 50+ |

### 12 месяцев (2027 май)

| Метрика | Цель |
|---|---|
| VISION.md Phase 3 (Localization production) | 100% complete |
| VISION.md Phase 4 (Schema Validator + Balance Simulator) | 70% complete |
| Studios using ≥1 модуль в production | 5+ |
| Decision point | SaaS / Acquisition / Continue OSS-only — informed решение |

**Revenue не цель в первый год.** Proof-of-value first. SaaS layer обсуждается только после Q4 traction.

---

## Что НЕ делаем (research-confirmed)

Расширенный red-zone лист после research:

- ❌ Generative final art / music / narrative (VISION + community sentiment)
- ❌ AI-balanced game numbers без human review (VISION)
- ❌ NFT / blockchain (VISION + community trigger)
- ❌ Closed-source AI без offline fallback (VISION + Cfx.re Jan 12 2026 license)
- ❌ Wrap **Suno / Udio** (red zone + active label lawsuits)
- ❌ Wrap **ElevenLabs voice cloning final VO** (consent + red zone)
- ❌ Wrap **Inworld / Charisma runtime NPC dialogue** (narrative red zone)
- ❌ Use **NLLB-200** (CC-BY-NC — non-commercial)
- ❌ Default to **Mistral Experiment / Gemini free** (train on prompts)
- ❌ Wrap **DeepL Free tier** (TOS forbids "similar product")
- ❌ Bundle **Liquibase 5.0** (FSL license)
- ❌ Bundle **LM Studio** (closed-source app)
- ❌ Forced consulting / agency / custom-development for revenue (VISION distraction warning)

---

## Decision points (когда переоцениваем)

| Когда | Сигнал | Что решаем |
|---|---|---|
| **2 weeks** | Если dogfood loop с Flump не работает (Boilergen не подходит на свой Unity) | Fundamental product flaw — переоценить архитектуру плагинов |
| **1 month** | Если Localization Assistant не сходит на 2+ проектах | Module-3 не готова к public — отложить outreach |
| **3 months** | Если кроме меня и Grand Mobile никто не пробует | Distribution problem — фокус на community / outreach перед новыми фичами |
| **6 months** | Если 3 studios pilot достигнут | Зелёный свет: 4-й модуль + templates marketplace |
| **6 months** | Если 0-1 external pilot | Wedge не работает — переоценить позиционирование, возможно переключиться с RP на другой gamedev сегмент |
| **12 months** | Если общая traction есть | Decision: SaaS layer / acquisition conversation / continue |

---

## Что НЕ блокирует прогресс

Список explicit для self-discipline:

- **Игорь молчит** → продолжаем dogfood на Flump + generic-rp с Grand Mobile public systems (support.grnd.gg)
- **Внешние studios не появляются Q1-Q2** → Grand Mobile + Flump = 2 реальных канала; продукт всё равно растёт
- **GitHub stars медленно растут** → не паника, real adoption важнее vanity metric
- **Конкурент строит похожее** → у нас 1+ year head start + OSS moat. Не реагируем pivot'ом, ускоряем shipping
- **AI provider rate limits / pricing меняются** → fallback chain (local Ollama → Groq → Cerebras) защищает от этого

---

## Ключевая мысль

**Dogfood loop = эпицентр развития.** Если я (Alizhan) активно использую все 3 модуля на Flump — найду friction, починю friction, продукт станет хорошим. Без dogfood, roadmap = фантазия. Каждые 2 недели должны быть commits в Flump через Boilergen + локализация через Localization Assistant + валидация через Schema Validator.

Если dogfood loop ломается — это причина остановиться и пересмотреть, а не причина искать новых features.

---

## Что прошу от себя

1. **Не делать всё сразу.** Один horizon — один фокус. Горизонт 1 не закроется → горизонт 2 не начинается.
2. **Каждое расширение через community sentiment filter** + research-backed red zones.
3. **Документировать.** Этот файл, VISION.md, knowledge-base, READMEs — обновляем при каждом sprint.
4. **Слушать пользователей.** Если кто-то пробует и говорит "не работает" — приоритет N°1, не игнорировать.
5. **Не хайпить.** Это набор практичных инструментов. Не "AI революция". Не "10x productivity".
6. **Auto-commit + auto-push после verify** — durable instruction 2026-05-02.
7. **Dogfood каждые 2 недели.** Если за 2 недели не было активной работы на Flump через Boilergen — что-то пошло не так.

---

## Что прошу от руководства Grand Games

(По мере роста, не сейчас.)

1. **Согласие что платформа open-source.** Внутреннее использование GG бесплатно навсегда; внешний SaaS-revenue (когда появится) — обсуждается.
2. **Бюджет на Anthropic API + хостинг** — порядка $500–2000/мес по мере роста.
3. **Право платформе развиваться независимо от GG-приоритетов.** Если GG закрывает GM1 завтра — платформа продолжает.
4. **Готовность стать reference-кейсом.** Когда платформа выходит за пределы GG — GG появляется в "we use this" страничке как первая студия.

---

## Соотношение с другими документами

- **`VISION.md`** — strategic 2-3 года, принципы, phased build через 2028.
- **`ROADMAP.md`** (этот файл) — tactical 6-12 месяцев, конкретные задачи с DoD.
- **`knowledge-base/sources/community-sentiment-ai-gamedev.md`** — guardrails community.
- **`handoff/03-ROADMAP.md`** — версия для Игоря, фокус на Boilergen Phase 1-2.

---

> *"Мы строим инструмент которым хочется пользоваться. Сначала — Flump и Grand Mobile. Потом — везде где есть gamedev."*

> Версия: 3.0 (2026-05-02, post-research) · GitHub: https://github.com/Sariev-Alizhan/GamesAI · Live: https://boilergen-eight.vercel.app · Maintainer: Alizhan
