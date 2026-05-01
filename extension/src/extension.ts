// Boilergen VS Code extension entry point.
// Registers right-click commands on YAML files: Preview and Generate.
// Internally shells out to the boilergen CLI installed in the user's
// Boilergen project — keeps the extension thin and reusable.

import * as vscode from 'vscode';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

interface BoilergenConfig {
  boilergenPath: string;
  defaultPlugin: string;
}

function getConfig(): BoilergenConfig {
  const cfg = vscode.workspace.getConfiguration('boilergen');
  let boilergenPath = cfg.get<string>('boilergenPath', '');
  if (!boilergenPath) {
    // Try ./boilergen/ in the workspace
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (ws) {
      const candidate = path.join(ws, 'boilergen');
      if (fs.existsSync(path.join(candidate, 'plugins'))) {
        boilergenPath = candidate;
      }
    }
  }
  return {
    boilergenPath,
    defaultPlugin: cfg.get<string>('defaultPlugin', 'gm1'),
  };
}

function runBoilergen(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsx', 'src/cli/index.ts', ...args], {
      cwd,
      env: { ...process.env },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? -1 }));
  });
}

function getYamlPath(uri: vscode.Uri | undefined): string | undefined {
  if (uri) return uri.fsPath;
  const editor = vscode.window.activeTextEditor;
  if (editor && /\.ya?ml$/.test(editor.document.fileName)) {
    return editor.document.fileName;
  }
  return undefined;
}

function ensureBoilergenPath(cfg: BoilergenConfig): boolean {
  if (!cfg.boilergenPath) {
    vscode.window
      .showErrorMessage(
        'Boilergen path not set. Configure boilergen.boilergenPath in settings.',
        'Open Settings',
      )
      .then((sel) => {
        if (sel === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'boilergen.boilergenPath');
        }
      });
    return false;
  }
  if (!fs.existsSync(path.join(cfg.boilergenPath, 'plugins'))) {
    vscode.window.showErrorMessage(
      `Boilergen not found at ${cfg.boilergenPath} (no plugins/ folder).`,
    );
    return false;
  }
  return true;
}

let previewPanel: vscode.WebviewPanel | undefined;

function openPreviewPanel(content: string, schemaName: string): void {
  if (previewPanel) {
    previewPanel.reveal(vscode.ViewColumn.Beside);
  } else {
    previewPanel = vscode.window.createWebviewPanel(
      'boilergenPreview',
      'Boilergen Preview',
      vscode.ViewColumn.Beside,
      { enableScripts: false, retainContextWhenHidden: true },
    );
    previewPanel.onDidDispose(() => {
      previewPanel = undefined;
    });
  }
  previewPanel.title = `Boilergen · ${schemaName}`;
  previewPanel.webview.html = renderPreviewHtml(content);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c));
}

function renderPreviewHtml(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; line-height: 1.6; }
  pre { background: var(--vscode-textCodeBlock-background); padding: 12px; border-radius: 4px; overflow: auto; font-family: var(--vscode-editor-font-family); font-size: 12px; }
  h2 { color: #dc2626; margin-top: 24px; font-size: 14px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 4px; }
  .badge { display: inline-block; background: rgba(220, 38, 38, 0.15); color: #ef4444; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-family: var(--vscode-editor-font-family); margin-right: 6px; }
</style></head>
<body>${content}</body></html>`;
}

function parsePreviewOutput(stdout: string): {
  schemaInfo: string;
  matched: string;
  files: Array<{ path: string; tag: string }>;
} {
  const lines = stdout.split('\n');
  const schemaLine = lines.find((l) => l.startsWith('Loaded schema:')) ?? '';
  const matchedLine = lines.find((l) => l.startsWith('Matched ')) ?? '';
  const files: Array<{ path: string; tag: string }> = [];
  for (const l of lines) {
    const m = l.match(/^\s*\[(DRY|OK|INJECT|DRY-INJECT)\]\s+(.+)$/);
    if (m) files.push({ tag: m[1]!, path: m[2]! });
  }
  return { schemaInfo: schemaLine, matched: matchedLine, files };
}

export function activate(context: vscode.ExtensionContext): void {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.text = '$(sparkle) Boilergen';
  status.tooltip = 'Boilergen — right-click a YAML file to generate code';
  status.command = 'boilergen.openPlayground';
  status.show();
  context.subscriptions.push(status);

  // Preview command
  context.subscriptions.push(
    vscode.commands.registerCommand('boilergen.preview', async (uri?: vscode.Uri) => {
      const yamlPath = getYamlPath(uri);
      if (!yamlPath) {
        vscode.window.showErrorMessage('Boilergen: open or right-click a .yaml file.');
        return;
      }
      const cfg = getConfig();
      if (!ensureBoilergenPath(cfg)) return;

      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Boilergen: rendering preview…' },
        async () => runBoilergen(cfg.boilergenPath, [
          'generate',
          yamlPath,
          '--plugin',
          path.join(cfg.boilergenPath, 'plugins', cfg.defaultPlugin),
          '--dry-run',
        ]),
      );

      if (result.code !== 0) {
        vscode.window.showErrorMessage(`Boilergen failed: ${result.stderr.trim() || result.stdout.trim()}`);
        return;
      }

      const { schemaInfo, matched, files } = parsePreviewOutput(result.stdout);
      const html = `
        <h2>Schema</h2>
        <div>${escapeHtml(schemaInfo)}</div>
        <div style="margin-top:8px;">${escapeHtml(matched)}</div>
        <h2>Files that would be generated (${files.length})</h2>
        ${files.length === 0
          ? '<p style="color:var(--vscode-descriptionForeground)">No matching templates for this entity type.</p>'
          : '<ul>' + files.map((f) => `<li><span class="badge">${f.tag}</span><code>${escapeHtml(f.path)}</code></li>`).join('') + '</ul>'}
        <h2>Raw CLI output</h2>
        <pre>${escapeHtml(result.stdout)}</pre>
      `;
      openPreviewPanel(html, path.basename(yamlPath));
    }),
  );

  // Generate command
  context.subscriptions.push(
    vscode.commands.registerCommand('boilergen.generate', async (uri?: vscode.Uri) => {
      const yamlPath = getYamlPath(uri);
      if (!yamlPath) {
        vscode.window.showErrorMessage('Boilergen: open or right-click a .yaml file.');
        return;
      }
      const cfg = getConfig();
      if (!ensureBoilergenPath(cfg)) return;

      const confirm = await vscode.window.showWarningMessage(
        `Generate files from ${path.basename(yamlPath)}? Existing files at the target paths will be overwritten.`,
        { modal: true },
        'Generate',
      );
      if (confirm !== 'Generate') return;

      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Boilergen: generating…' },
        async () => runBoilergen(cfg.boilergenPath, [
          'generate',
          yamlPath,
          '--plugin',
          path.join(cfg.boilergenPath, 'plugins', cfg.defaultPlugin),
        ]),
      );

      if (result.code !== 0) {
        vscode.window.showErrorMessage(`Boilergen failed: ${result.stderr.trim() || result.stdout.trim()}`);
        return;
      }
      const { files } = parsePreviewOutput(result.stdout);
      vscode.window.showInformationMessage(
        `Boilergen: generated ${files.length} file${files.length === 1 ? '' : 's'}`,
        'Show output',
      ).then((sel) => {
        if (sel === 'Show output') {
          const html = `<h2>Generated</h2><ul>${files
            .map((f) => `<li><span class="badge">${f.tag}</span><code>${escapeHtml(f.path)}</code></li>`)
            .join('')}</ul><h2>Raw output</h2><pre>${escapeHtml(result.stdout)}</pre>`;
          openPreviewPanel(html, path.basename(yamlPath));
        }
      });
    }),
  );

  // Open web playground
  context.subscriptions.push(
    vscode.commands.registerCommand('boilergen.openPlayground', () => {
      vscode.env.openExternal(vscode.Uri.parse('https://boilergen-eight.vercel.app'));
    }),
  );
}

export function deactivate(): void {
  /* nothing to clean up */
}
