# Boilergen MCP — vibe-coding в Cursor / Claude Code

> Подключаешь Boilergen к AI-IDE и **говоришь словами** что нужно сгенерировать. AI вызывает Boilergen, файлы появляются в проекте. Никакого CLI, никакого YAML вручную.

## Что получаешь

```
Ты в Cursor:    "create a sniper rifle called M24, damage 90, fire rate 60, magazine 5"
                                    ↓
                         Cursor → Boilergen MCP
                                    ↓
                  YAML → 4 файла в твоём проекте, готовый код
```

Зачем: **0 переключения контекста.** Не уходишь из IDE. Не пишешь YAML. Описываешь словами.

---

## Установка в Cursor

1. Открой Cursor → **Settings → Cursor Settings → Features → MCP**
2. Кликни **"+ Add new MCP server"**
3. Вставь конфиг:

```json
{
  "mcpServers": {
    "boilergen": {
      "command": "npx",
      "args": ["tsx", "/абсолютный/путь/к/boilergen/src/mcp/server.ts"],
      "env": {
        "BOILERGEN_PLUGINS_DIR": "/абсолютный/путь/к/boilergen/plugins"
      }
    }
  }
}
```

4. Сохрани → перезапусти Cursor.
5. В чате Cursor увидишь иконку MCP. Boilergen в списке доступных серверов.

## Установка в Claude Code

В корне твоего проекта (или ~/.claude/) создай файл `.mcp.json`:

```json
{
  "mcpServers": {
    "boilergen": {
      "command": "npx",
      "args": ["tsx", "/path/to/boilergen/src/mcp/server.ts"],
      "env": {
        "BOILERGEN_PLUGINS_DIR": "/path/to/boilergen/plugins"
      }
    }
  }
}
```

Или через CLI: `claude mcp add boilergen npx tsx /path/to/server.ts`.

## Установка в Windsurf

В `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "boilergen": {
      "command": "npx",
      "args": ["tsx", "/path/to/boilergen/src/mcp/server.ts"]
    }
  }
}
```

---

## Доступные tools

| Tool | Что делает |
|---|---|
| `boilergen_list_plugins` | Список доступных плагинов и сколько шаблонов в каждом |
| `boilergen_list_entity_types` | Какие типы сущностей поддерживает плагин (profession, weapon, vehicle...) |
| `boilergen_preview` | **Dry-run** — рендерит файлы в памяти, возвращает paths + content. Ничего не пишет на диск. |
| `boilergen_generate` | Реально пишет файлы на диск в указанные `targetRoots`. |

AI разберётся сам какой когда вызывать.

---

## Примеры запросов в IDE

```
"Покажи какие плагины boilergen у меня есть"
→ AI вызывает boilergen_list_plugins

"Какие типы сущностей в плагине gm1?"
→ AI вызывает boilergen_list_entity_types

"Создай оружие AK-47 с уроном 45"
→ AI делает YAML, вызывает boilergen_preview, показывает результат

"Сгенерируй и сохрани в репозиторий"
→ AI вызывает boilergen_generate с реальными targetRoots
```

---

## Workflow для команды

### Game-designer (без знания кода)
```
1. Открывает Cursor
2. Пишет: "новая профессия — таксист, базовая зарплата 500, категория транспорт"
3. AI создаёт схему, генерит файлы
4. PR в репо
5. Программист только пишет ИГРОВУЮ ЛОГИКУ
```

### Senior dev
```
1. Открывает любой `.yaml` в проекте
2. Cmd+K: "expand this with attack animation fields"
3. AI умеет работать с существующими схемами
4. Вызывает boilergen_preview → видит what будет → одобряет → boilergen_generate
```

---

## Локальный тест без IDE

```bash
cd boilergen
npm run mcp
# сервер слушает на stdio, отправляй JSON-RPC сообщения
```

Тестовый init handshake:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | npm run mcp
```

---

## Безопасность

MCP-сервер работает локально через stdio (никаких сетевых endpoints). Все данные — твои.

Tools `boilergen_generate` пишет файлы только в указанные тобой `targetRoots`. **Path-traversal заблокирован** на уровне core (см. ensureWithin guard) — даже если AI попробует записать в `/etc/passwd`, не выйдет.

---

## Версия + статус

- MCP SDK: `@modelcontextprotocol/sdk@1.29.0`
- Protocol version: `2024-11-05`
- Tested: Cursor (works), Claude Code (works), Windsurf (works)
- Boilergen version: 1.1.0
