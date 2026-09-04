import * as vscode from 'vscode';
import { IntentStore } from '../store/IntentStore';
import { scanWorkspaceIntents } from './IntentWorkspaceScanner';

interface InboundMessage {
  command?: 'ready' | 'newIntent' | 'openContract';
  module?: string;
  fsPath?: string;
}

export class IntentWorkspacePanel {
  private static current: IntentWorkspacePanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  static show(context: vscode.ExtensionContext, store: IntentStore, selectedModule?: string): void {
    if (IntentWorkspacePanel.current) {
      IntentWorkspacePanel.current.panel.reveal(vscode.ViewColumn.Two);
      void IntentWorkspacePanel.current.publish(selectedModule);
      return;
    }
    const panel = vscode.window.createWebviewPanel('idd.intentWorkspace', 'IDD Intent Workspace', vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true
    });
    IntentWorkspacePanel.current = new IntentWorkspacePanel(panel, store, selectedModule);
  }

  private constructor(private readonly panel: vscode.WebviewPanel, store: IntentStore, selectedModule?: string) {
    panel.webview.html = this.html();

    panel.webview.onDidReceiveMessage(async (message: InboundMessage) => {
      if (message.command === 'ready') await this.publish(selectedModule);
      if (message.command === 'newIntent') await vscode.commands.executeCommand('idd.newIntent', message.module);
      if (message.command === 'openContract' && message.fsPath) await this.openContract(message.fsPath);
    }, undefined, this.disposables);

    const watcher = vscode.workspace.createFileSystemWatcher('**/*.intent.yaml');
    watcher.onDidChange(() => void this.publish(), undefined, this.disposables);
    watcher.onDidCreate(() => void this.publish(), undefined, this.disposables);
    watcher.onDidDelete(() => void this.publish(), undefined, this.disposables);
    this.disposables.push(watcher);

    store.onDidChange(() => void this.publish());
    panel.onDidDispose(() => this.dispose(), undefined, this.disposables);
  }

  private async publish(selectedModule?: string): Promise<void> {
    const intents = await scanWorkspaceIntents();
    await this.panel.webview.postMessage({ type: 'INTENTS_LOADED', payload: { intents, selectedModule } });
  }

  private async openContract(fsPath: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    } catch {
      vscode.window.showWarningMessage(`Contrato indisponível: ${fsPath}`);
    }
  }

  private dispose(): void {
    IntentWorkspacePanel.current = undefined;
    this.disposables.forEach(disposable => disposable.dispose());
  }

  private html(): string {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      :root{color-scheme:dark}*{box-sizing:border-box}
      body{margin:0;background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);font-family:var(--vscode-font-family);font-size:13px}
      .shell{display:grid;grid-template-columns:265px minmax(0,1fr);min-height:100vh}
      .list{border-right:1px solid var(--vscode-panel-border);padding:12px;overflow:auto}
      .list h1,.content h2{margin:0;font-size:14px}
      .eyebrow{margin:4px 0 14px;color:var(--vscode-descriptionForeground);font:10px var(--vscode-editor-font-family);letter-spacing:.08em;text-transform:uppercase}
      .context{margin-bottom:14px}
      .context-name{display:flex;align-items:center;gap:6px;padding:5px 7px;font:10px var(--vscode-editor-font-family);letter-spacing:.06em;text-transform:uppercase;color:var(--vscode-descriptionForeground)}
      .context-name em{margin-left:auto;font-style:normal;opacity:.7}
      .intent{width:100%;border:0;border-left:3px solid transparent;background:transparent;color:inherit;text-align:left;padding:8px 9px 8px 16px;cursor:pointer}
      .intent:hover,.intent.active{background:var(--vscode-list-hoverBackground);border-left-color:var(--vscode-focusBorder)}
      .intent strong{display:block;font-size:12px}
      .intent small{display:block;margin-top:3px;color:var(--vscode-descriptionForeground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto}
      .dot.aligned{background:#3fb883}.dot.advisory{background:#d5a029}.dot.critical{background:#d4605a}
      .content{padding:28px;max-width:960px;overflow:auto}
      .status{font:10px var(--vscode-editor-font-family);text-transform:uppercase;letter-spacing:.08em;color:var(--vscode-descriptionForeground)}
      .statement{margin:16px 0 8px;font-size:20px;line-height:1.5;max-width:780px}
      .explain{margin:0;color:var(--vscode-descriptionForeground);line-height:1.6}
      .panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:24px}
      .panel{padding:14px 16px;border-left:2px solid var(--vscode-focusBorder);background:var(--vscode-textBlockQuote-background)}
      .panel h3{margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:.07em}
      .panel ul{margin:0;padding-left:16px}
      .panel li{margin-bottom:6px;line-height:1.5}
      .panel p{margin:0;color:var(--vscode-descriptionForeground);line-height:1.55}
      .meta{margin-top:20px;font:10px var(--vscode-editor-font-family);color:var(--vscode-descriptionForeground)}
      .actions{display:flex;gap:8px;margin-top:22px}
      button.action{padding:7px 11px;border:1px solid var(--vscode-button-border,transparent);background:var(--vscode-button-background);color:var(--vscode-button-foreground);cursor:pointer}
      button.action.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}
      .empty{color:var(--vscode-descriptionForeground);line-height:1.6}
    </style></head><body><main class="shell">
      <aside class="list"><h1>Intent Navigator</h1><p class="eyebrow" id="summary">Lendo workspace...</p><div id="intent-tree"></div></aside>
      <section class="content" id="content"></section>
    </main><script>
      const vscode = acquireVsCodeApi();
      let intents = [];
      let selectedId;

      const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
      const selected = () => intents.find(intent => intent.id === selectedId);
      const listItems = items => items.map(item => '<li>' + esc(item) + '</li>').join('');

      function groupByContext() {
        const groups = new Map();
        for (const intent of intents) {
          if (!groups.has(intent.boundedContext)) groups.set(intent.boundedContext, []);
          groups.get(intent.boundedContext).push(intent);
        }
        return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      }

      function renderTree() {
        const tree = document.getElementById('intent-tree');
        const summary = document.getElementById('summary');
        const groups = groupByContext();
        summary.textContent = intents.length
          ? groups.length + ' bounded context(s) · ' + intents.length + ' contrato(s)'
          : 'Nenhum contrato encontrado';
        tree.innerHTML = groups.map(([context, items]) =>
          '<div class="context"><div class="context-name"><span class="dot ' + esc(items[0].status) + '"></span>' +
          esc(context) + '<em>' + items.length + '</em></div>' +
          items.map(intent =>
            '<button class="intent' + (intent.id === selectedId ? ' active' : '') + '" data-id="' + esc(intent.id) + '">' +
            '<strong>' + esc(intent.name) + '</strong><small>' + esc(intent.statement) + '</small></button>'
          ).join('') + '</div>'
        ).join('');
        tree.querySelectorAll('.intent').forEach(button => {
          button.onclick = () => { selectedId = button.dataset.id; render(); };
        });
      }

      function renderDetail() {
        const content = document.getElementById('content');
        const intent = selected();
        if (!intent) {
          content.innerHTML = '<div class="empty"><h2>Nenhum contrato de intenção no workspace</h2>' +
            '<p>A fonte de verdade começa por uma declaração de intenção em linguagem natural. Crie um contrato <code>.intent.yaml</code> para iniciar.</p>' +
            '<div class="actions"><button class="action" id="new">Nova intenção</button></div></div>';
          document.getElementById('new').onclick = () => vscode.postMessage({ command: 'newIntent' });
          return;
        }
        content.innerHTML =
          '<div class="status">' + esc(intent.boundedContext) + ' · ' + esc(intent.status) + '</div>' +
          '<p class="eyebrow">Intenção de negócio</p>' +
          '<h2 class="statement">' + esc(intent.statement) + '</h2>' +
          '<p class="explain">Este é o contrato de primeira ordem. YAML, implementação, testes e verificações são projeções verificáveis desta declaração.</p>' +
          '<div class="panels">' +
            '<div class="panel"><h3>Invariantes declaradas</h3>' +
              (intent.constraints.length ? '<ul>' + listItems(intent.constraints) + '</ul>' : '<p>Nenhuma restrição declarada.</p>') +
            '</div>' +
            '<div class="panel"><h3>Critérios de aceite</h3>' +
              (intent.acceptance.length ? '<ul>' + listItems(intent.acceptance) + '</ul>' : '<p>Nenhum critério declarado.</p>') +
            '</div>' +
          '</div>' +
          '<p class="meta">' + esc(intent.module) + ' · ' + esc(intent.language) + '</p>' +
          '<div class="actions"><button class="action" id="yaml">Abrir contrato YAML</button>' +
          '<button class="action secondary" id="new">Nova intenção</button></div>';
        document.getElementById('yaml').onclick = () => vscode.postMessage({ command: 'openContract', fsPath: intent.fsPath });
        document.getElementById('new').onclick = () => vscode.postMessage({ command: 'newIntent', module: intent.module });
      }

      function render() { renderTree(); renderDetail(); }

      window.addEventListener('message', event => {
        const { type, payload } = event.data ?? {};
        if (type !== 'INTENTS_LOADED') return;
        intents = payload?.intents ?? [];
        const requested = intents.find(intent => intent.module === payload?.selectedModule);
        selectedId = (requested ?? selected() ?? intents[0])?.id;
        render();
      });

      vscode.postMessage({ command: 'ready' });
    </script></body></html>`;
  }
}
