# Boilergen — VS Code Extension

> Right-click any YAML schema → generate boilerplate across your stack in one command. Inside your editor, no terminal switching.

## What it does

- **Right-click on `.yaml` / `.yml`** in the file explorer → "Boilergen: Preview" or "Boilergen: Generate"
- **Editor title bar** has an eye icon (preview) when a YAML is open
- **Status bar** shows `$(sparkle) Boilergen` — clickable, opens the web playground
- **Webview preview panel** shows the dry-run result inline, no terminal needed

## Install (local development)

1. Build and package:
```bash
cd extension
npm install
npm run build
npm run package
```

2. Install the `.vsix`:
```bash
code --install-extension boilergen-vscode-0.1.0.vsix
```

3. Set the Boilergen path in VS Code settings (`Cmd+,`):
- `boilergen.boilergenPath`: absolute path to your Boilergen project (e.g. `/Users/me/dev/GamesAI/boilergen`)
- `boilergen.defaultPlugin`: plugin name (e.g. `gm1`)

Or commit a `.vscode/settings.json` in your workspace.

## Usage

### From Explorer (right-click)
1. Right-click any `barista.yaml` (or other entity schema)
2. Choose **"Boilergen: Preview Generated Files"** → opens preview panel
3. Or **"Boilergen: Generate Files"** → confirms, then writes files to disk

### From command palette (`Cmd+Shift+P`)
- `Boilergen: Preview Generated Files` — when a YAML is open in the editor
- `Boilergen: Generate Files`
- `Boilergen: Open Playground` — opens the web playground

## How it works

Thin wrapper. Spawns `npx tsx src/cli/index.ts generate ...` against your configured Boilergen project, parses the output, and renders results in a webview panel.

The extension does NOT bundle Boilergen — it uses the one you already have in your project. This means: any updates to Boilergen are picked up automatically, without reinstalling the extension.

## Future plans

- v0.2: visual schema editor (drag-drop fields, live validation against JSON Schema)
- v0.3: tree view of all generated files in your project
- v0.4: inline diff view (current → after-generate)
- v0.5: marketplace publication

## Development

```bash
npm run watch   # esbuild in watch mode
# Then F5 in VS Code to launch Extension Development Host
```
