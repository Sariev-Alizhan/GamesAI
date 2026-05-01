# Knowledge Base — почему она существует и как пользоваться

> Это короткая страница чтобы Игорь (или любой новый разработчик) понял: что лежит в `/knowledge-base`, зачем оно там, и как использовать в работе.

## TL;DR

В `/knowledge-base` лежит **15 структурированных записей** о том, как разные игры и движки организуют контент. Каждая запись — это конкретный паттерн или case study, не пустые рассуждения.

**Главная для тебя:** [`engines/fivem-resources.md`](../knowledge-base/engines/fivem-resources.md) — анализ того, как FiveM/altV/RAGE (прямые соседи GM1 в GTA-RP пространстве) описывают **jobs / vehicles / weapons**. Содержит конкретные предложения по схемам Boilergen.

## Зачем это нужно

Три причины, почему мы вкладываемся в knowledge base:

1. **Не пишем шаблоны вслепую.** Когда мы делаем Boilergen-плагин под новый стек, мы хотим знать "а как это устроено в реальных играх", а не угадывать.
2. **AI Describe станет умнее.** В будущем (Phase 2) feature "опиши на русском → AI делает YAML" будет читать эту базу как контекст. AI начнёт ссылаться на реальные паттерны: "это похоже на структуру вот этой игры, я бы добавил такие поля".
3. **Defensible asset.** Конкуренты могут скопировать Boilergen за неделю. Knowledge base строится месяцами и становится моатом.

## Что внутри (15 записей)

```
knowledge-base/
├── README.md                ← навигация
├── _template.md             ← шаблон для новых записей
├── games/                   ← 7 case studies реальных игр
│   ├── cataclysm-dda.md       (RPG / C++ / JSON — лучший data-driven пример)
│   ├── dwarf-fortress.md
│   ├── factorio.md
│   ├── foundry-vtt.md         (TS / JSON — document-model + system split)
│   ├── openra.md              (C# / YAML — traits с inheritance)
│   ├── stardew-valley.md
│   └── wesnoth.md
├── engines/                 ← 4 движка/фреймворка
│   ├── unity-scriptable-object.md
│   ├── unreal-data-asset.md
│   ├── godot-resources.md     (text .tres — самый codegen-friendly)
│   └── fivem-resources.md     ← ⭐ ПРЯМО ПРО НАС (GTA-RP)
└── patterns/                ← 4 cross-cutting паттерна
    ├── data-driven-content.md     (зонтик философии)
    ├── component-based-design.md
    ├── entity-component-system.md
    └── asset-pipelines.md
```

## Конкретное предложение которое уже всплыло

В [`engines/fivem-resources.md`](../knowledge-base/engines/fivem-resources.md) есть открытие: **все большие RP-фреймворки (QBCore, ESX) описывают профессии с tiered grades:**

```lua
['taxi'] = {
  label = 'Downtown Cab Co.',
  grades = {
    ['0'] = { name = 'Recruit',     payment = 50  },
    ['1'] = { name = 'Driver',      payment = 75  },
    ['2'] = { name = 'Experienced', payment = 100 },
    ['3'] = { name = 'Boss', isboss = true, payment = 150 },
  },
}
```

Сейчас наша `dummy-profession.yaml` имеет только flat `baseSalary`. Реальные RP-jobs — иерархические.

**Что предлагается:** когда дойдём до Этапа 3 (реальные шаблоны GM1), уточнить у Игоря — нужна ли в GM1 grade-система, и если да — добавить `grades` как first-class поле в profession schema.

## Как читать это в свободные 30 минут

Если у тебя 30 минут и хочешь максимум пользы:

1. [`patterns/data-driven-content.md`](../knowledge-base/patterns/data-driven-content.md) — философия зачем мы вообще делаем YAML→код (5 мин)
2. [`engines/fivem-resources.md`](../knowledge-base/engines/fivem-resources.md) — самое релевантное для GM1 (10 мин)
3. [`games/cataclysm-dda.md`](../knowledge-base/games/cataclysm-dda.md) — лучший worked example полностью data-driven игры (10 мин)
4. [`patterns/asset-pipelines.md`](../knowledge-base/patterns/asset-pipelines.md) — как Boilergen встраивается в build target проекта (5 мин)

## Как контрибьютить

Шаблон в `_template.md`. Главный критерий: "если завтра я буду писать Boilergen-плагин под этот стек — этой записи будет достаточно чтобы стартовать?". Если нет — записи не хватает.

## Сейчас хочется добавить (TODO)

Из `knowledge-base/research-notes/` следующие приоритеты:

- **Pattern: manifest-first plugin design** — FiveM resources + Foundry systems сходятся к одному паттерну, стоит выделить отдельной записью.
- **Modding ecosystems deep dive** — предыдущий research-агент упёрся в rate-limit, надо переспустить.
- **Custom MMO server case studies** — RP-adjacent проекты вроде TrinityCore/AzerothCore не покрыты.

---

**Sources:**
- [knowledge-base/README.md](../knowledge-base/README.md) — полный index
- [github.com/Sariev-Alizhan/GamesAI](https://github.com/Sariev-Alizhan/GamesAI) — публичный репо
