# GamesAI — Vision

> **Цель:** построить лучший AI-инструментарий для разработки игр в мире.
> Не одну фичу, не одну утилиту — **платформу**, которая ускоряет работу всех людей во всех департаментах gamedev-студии, для всех движков, на всех слоях production.
>
> Boilergen — первый камень. Он закладывает архитектурный паттерн (core + adapters + plugins) и репутационный фундамент. Дальше — расширение.

---

## North Star

**Любой человек в gamedev-студии открывает один интерфейс и получает AI-помощник заточенный именно под его роль и движок.**

- Программист на Unreal C++ → AI который понимает Unreal-конвенции, не общий ChatGPT
- Художник на Maya → AI который ускоряет техническую часть его работы (UV, retopology suggestions, не "генерирует за него арт")
- Геймдизайнер → AI который помогает с balance-симуляциями, генерацией test data, документированием design intent
- QA → AI который анализирует bug reports, предлагает test cases, ловит regressions
- Локализатор → AI который делает первый проход переводов с context-awareness про игру
- LiveOps → AI который мониторит метрики, ловит аномалии, предлагает A/B тесты
- Production / PM → AI который суммирует встречи, отслеживает blockers, генерирует status digest

Все эти модули — **на одной платформе**, с единой авторизацией, единым knowledge-base, единым билингом, едиными аудит-логами для студийного compliance.

---

## Двойная миссия

**Внутри Grand Games:** платформа становится production-tooling, ускоряющим разработку GM1 / GM2 / следующих проектов в 2-5×.

**Вне Grand Games:** open-source ядро + публичный SaaS даёт инструмент любой студии региона. Grand Games становится **первой студией региона которая показала путь** — это marketing-актив, репутационный moat, и потенциальный revenue stream.

---

## Архитектурные принципы платформы

Эти принципы — **не торгуются**. Каждое расширение проходит этот фильтр.

### 1. Core + Adapters + Plugins

Так же как сейчас Boilergen разделён на:
- **Core** (deterministic engine, без AI)
- **Adapters** (CLI / Web / MCP / VS Code extension)
- **Plugins** (gm1, generic-rp, future Unity / Godot / Unreal)

Каждый новый модуль платформы строится по той же схеме:
- Чистое ядро без AI-зависимости (можно работать без ключей)
- Несколько способов вызова (CLI, Web, IDE, API, MCP)
- Pluggable под разные движки / стеки / студии

**Никаких монолитов.** Каждый модуль — отдельный пакет, отдельный жизненный цикл, отдельный контракт.

### 2. AI как опциональный слой, не критический путь

Это рефлекс из Boilergen и он распространяется на платформу:

- Core function работает **без AI**.
- AI добавляет удобство (NL → структура, suggestions, summaries) — но никогда не блокирует базовую работу.
- Если у пользователя нет API ключа / нет интернета / не доверяет AI — модуль работает в детерминистичном режиме.

Это требование community sentiment (см. [`knowledge-base/sources/community-sentiment-ai-gamedev.md`](./knowledge-base/sources/community-sentiment-ai-gamedev.md)). Без него мы будем восприниматься как "ещё одна AI-startup" — это смерть позиционирования.

### 3. Programmer / artist / designer in control

AI **усиливает**, не **заменяет**. Это формулировка для каждого модуля:

| Модуль | Что AI делает | Что человек делает |
|---|---|---|
| Boilergen | Генерит boilerplate из шаблонов которые **ты написал** | Пишешь шаблоны, проверяешь output, владеешь кодом |
| AI Describe | Превращает NL в YAML | Проверяешь YAML перед генерацией |
| Localization Assistant | Первый проход перевода | Редактируешь, утверждаешь |
| Balance Simulator | Прогоняет сценарии с твоими формулами | Решаешь как менять числа |
| Bug Triage | Категоризует тикеты, предлагает fix | Принимаешь решение, пишешь код |
| Asset Tools | Optimization suggestions, naming, organization | Создаёшь арт |

**Никаких feature где AI = subject, человек = object.** Всегда наоборот.

### 4. Open-source ядро всегда

Каждый модуль платформы:
- Ядро открыто (MIT-style)
- Публичный репозиторий, публичные issues
- SaaS-обёртка (когда появится) — это удобство, не lock-in
- Студия может self-hostить любой модуль

Это не альтруизм — это **moat**. Закрытые AI-tools для gamedev будут переоценены/closed. Open-source с реальной комьюнити-traction — переживёт.

### 5. Department-aware, not engine-aware first

Большая ошибка которую делают AI-стартапы — они структурируют продукт по движкам ("Unity tool", "Unreal tool"). Это правильно для tooling-deep features, но **неправильно для платформы**.

Платформа структурирована по **роли пользователя**:
- Programming
- Art (technical art only — не generative)
- Game Design
- QA
- LiveOps
- Localization
- Production / PM
- Community / Support

Внутри каждой роли — модули, каждый модуль может быть engine-specific.

Почему: разработчик на Unity и разработчик на Unreal имеют общие проблемы (boilerplate, bug triage). Геймдизайнер и художник — разные. Сегментация по роли точнее.

---

## Phased build

Фазы на 2-3 года вперёд. Каждая Фаза — отдельный sprint, не параллельный.

### Phase 1 (СЕЙЧАС — 2026 Q2): Boilergen production-ready

Уже сделано большинство: CLI / Web / MCP / VS Code extension / AI Describe / generic-rp плагин / knowledge-base / community-sentiment guardrails.

Осталось: реальный Grand Games adoption, community traction (100+ stars, 5+ external users).

### Phase 2 (2026 Q3): Boilergen полноценный — больше движков, больше entity types

- Plugins для Unity, Godot, FiveM, RAGE-MP, custom MMO servers
- Templates marketplace
- Schema-from-existing-code (reverse-engineer YAML from existing files)
- RAG в AI Describe, использование knowledge-base
- Multi-tenant хостинг (студии могут пользоваться без локальной установки)

### Phase 3 (2026 Q4): второй модуль платформы — Localization Assistant

Самый "безопасный" второй модуль — community ничего не имеет против AI translation (это уже норма с DeepL).

- Plug в проект, найти все локализационные ключи, предложить первый проход переводов
- Context-aware (знает что игра RP, переведёт `taxi` правильно)
- Glossary management
- Diff-режим для review

Доказывает что архитектура платформы работает для второго модуля — не только для Boilergen.

### Phase 4 (2027 Q1): Game Design tooling — Balance Simulator + Schema Validator

Опять "безопасная" зона:
- Balance Simulator: прогоняешь экономику игры через тысячи сценариев, видишь edge cases
- Schema Validator: компилируешь все YAML / JSON / data files в проекте, ловишь несоответствия

Не генерирует контент — анализирует и валидирует. Полностью в зоне comfort gamedev community.

### Phase 5 (2027 Q2-Q3): QA tooling

- Bug triage assistant (категоризация, дедупликация, priority suggestions)
- Test case generator from feature description (не запускает тесты — предлагает что покрыть)
- Regression detector в pipeline

### Phase 6 (2027 Q4): LiveOps tooling

- Anomaly detection в метриках
- A/B test design helper
- Player segmentation suggestions
- Retention forecast based on past events

Это уже advanced, требует data integration.

### Phase 7 (2028+): Art & Production tooling

Самые "красные зоны" — оставлены последними.

**Art:** ТОЛЬКО technical art. Optimization, naming conventions, asset organization, batch operations. **Никакой генерации final art.**

**Production:** meeting summaries, status digest, blocker tracking, planning helpers. Опять — суммаризация, не creation.

---

## Что НИКОГДА не делаем

Жёсткие границы. Если кто-то предлагает — refuse, объясняй что это вредит позиционированию.

- ❌ Generative final art (sprites, models, textures для shipping)
- ❌ Generative final music / sound design
- ❌ AI-написанный final narrative / dialogue
- ❌ Auto-balanced game numbers без human review
- ❌ "AI plays your game" features
- ❌ Closed-source AI features без offline fallback
- ❌ "Replace your artist / designer / writer" marketing
- ❌ NFT / blockchain интеграции (community trigger)
- ❌ Lock-in SaaS без self-host опции

---

## KPI на 12 месяцев

| Метрика | Сейчас | Через год |
|---|---|---|
| Модулей на платформе | 1 (Boilergen) | 3 (Boilergen + Localization + Balance Simulator) |
| Поддерживаемых движков | 1 (custom C++/Node) | 5+ (Unity, Godot, FiveM, Unreal, custom) |
| GitHub stars (объединённо) | <10 | 500+ |
| Active users / неделю (web playground) | 0 | 200+ |
| Студий в пилоте | 1 (GG) | 5+ |
| Контрибьюторы (external) | 0 | 10+ |
| Knowledge-base entries | 16 | 50+ |
| Mention в gamedev-медиа / podcasts | 0 | 3+ |

---

## KPI на 3 года (амбиция)

К концу 2028:

- Платформа = **дефолт-инструментарий для постсоветских инди-студий**
- 50+ студий пользуются хотя бы одним модулем в production
- Revenue from SaaS layer (если решаем монетизировать) — самоокупает team
- Acquisition offers / partnership discussions с крупными engine vendors (Unity, Epic) — даже если не принимаем, signal зрелости
- Реальное влияние на скорость gamedev в регионе (измеримо: студии-пользователи быстрее выпускают игры)

---

## Что прошу от себя

1. **Не делать всё сразу.** Один модуль — один sprint. Между модулями — реальный gap для observation, обратной связи, итерации.
2. **Каждое расширение — через community sentiment filter.** Если новая фича триггерит red zone из [`knowledge-base/sources/community-sentiment-ai-gamedev.md`](./knowledge-base/sources/community-sentiment-ai-gamedev.md) — пересматриваем или отказываемся.
3. **Документировать как этот файл.** Vision без письменной формы — мираж.
4. **Слушать пользователей.** Если кто-то использует Boilergen и говорит "я хочу X" — записать. Если 5 человек говорят то же — приоритет.
5. **Не размазываться на консалтинг / agency / custom development.** Платформа > проекты. Соблазн делать кастом-работу за деньги — distraction.

---

## Что прошу от руководства Grand Games

(Не сейчас, а по мере роста.)

1. **Согласие что платформа open-source.** Внутреннее использование GG бесплатно навсегда; внешний SaaS-revenue (когда появится) — обсуждается.
2. **Бюджет на Anthropic API + хостинг** — порядка $500–2000/мес по мере роста.
3. **Право платформе развиваться независимо от GG-приоритетов.** Если GG закрывает GM1 завтра — платформа продолжает.
4. **Готовность стать reference-кейсом.** Когда платформа выходит за пределы GG — GG появляется в "we use this" страничке как первая студия.

---

## Соотношение с другими документами

- **`ROADMAP.md`** — конкретный план на 6-12 месяцев. Tactical.
- **`VISION.md`** (этот файл) — strategic, на 2-3 года, с принципами.
- **`knowledge-base/sources/community-sentiment-ai-gamedev.md`** — guardrails которые применяются в каждом vision-уровневом решении.
- **`handoff/03-ROADMAP.md`** — версия roadmap для Игоря, фокус на Boilergen Phase 1-2.

---

> *"Мы не делаем AI игру. Мы делаем gamedev лучше для всех кто его делает."*

> Версия: 1.0 (2026-05-01) · Maintainer: Alizhan
