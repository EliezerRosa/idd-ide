import * as path from 'path';
import * as vscode from 'vscode';
import { Intent, IntentStore } from '../store/IntentStore';

export class IntentWorkspacePanel {
  private static current: IntentWorkspacePanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  static show(context: vscode.ExtensionContext, store: IntentStore, selectedModule?: string): void {
    if (this.current) {
      this.current.panel.reveal(vscode.ViewColumn.Two);
      this.current.publish(store.listIntents(), selectedModule);
      return;
    }
    const panel = vscode.window.createWebviewPanel('idd.intentWorkspace', 'IDD Intent Workspace', vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true
    });
    this.current = new IntentWorkspacePanel(panel, store);
    this.current.publish(store.listIntents(), selectedModule);
  }

  private constructor(private readonly panel: vscode.WebviewPanel, private readonly store: IntentStore) {
    panel.webview.html = this.html();
    panel.webview.onDidReceiveMessage(async (message: { command?: string; module?: string }) => {
      if (message.command === 'ready') this.publish(store.listIntents());
      if (message.command === 'newIntent') await vscode.commands.executeCommand('idd.newIntent', message.module);
      if (message.command === 'openYaml' && message.module) await this.openYaml(message.module);
    }, undefined, this.disposables);
    panel.onDidDispose(() => this.dispose(), undefined, this.disposables);
    store.onDidChange(() => this.publish(store.listIntents()));
  }

  private publish(intents: Intent[], selectedModule?: string): void {
    this.panel.webview.postMessage({ command: 'intents', intents, selectedModule });
  }

  private async openYaml(module: string): Promise<void> {
    const [segment, name] = module.split('/');
    if (!segment || !name) return;
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return;
    const uri = vscode.Uri.file(path.join(root, 'src', segment, `${name}.intent.yaml`));
    try {
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri), vscode.ViewColumn.One);
    } catch {
      vscode.window.showWarningMessage(`Contrato não encontrado: ${module}.intent.yaml`);
    }
  }

  private dispose(): void {
    IntentWorkspacePanel.current = undefined;
    this.disposables.forEach(disposable => disposable.dispose());
  }

  private html(): string {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);font-family:var(--vscode-font-family);font-size:13px}.shell{display:grid;grid-template-columns:245px minmax(0,1fr);min-height:100vh}.list{border-right:1px solid var(--vscode-panel-border);padding:12px}.list h1,.content h2{margin:0;font-size:14px}.eyebrow{margin:4px 0 14px;color:var(--vscode-descriptionForeground);font:10px var(--vscode-editor-font-family);letter-spacing:.08em;text-transform:uppercase}.intent{width:100%;border:0;border-left:3px solid transparent;background:transparent;color:inherit;text-align:left;padding:9px;cursor:pointer}.intent:hover,.intent.active{background:var(--vscode-list-hoverBackground);border-left-color:var(--vscode-focusBorder)}.intent strong{display:block;font-size:12px}.intent small{display:block;margin-top:4px;color:var(--vscode-descriptionForeground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.content{padding:28px;max-width:940px}.status{font:10px var(--vscode-editor-font-family);color:#7ee2b8;text-transform:uppercase;letter-spacing:.08em}.statement{margin:17px 0 8px;font-size:20px;line-height:1.5;max-width:760px}.explain{margin:0;color:var(--vscode-descriptionForeground);line-height:1.6}.invariants{margin:24px 0;padding:14px 16px;border-left:2px solid var(--vscode-focusBorder);background:var(--vscode-textBlockQuote-background)}.invariants h3{margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.07em}.invariants p{margin:0;line-height:1.55}.actions{display:flex;gap:8px;margin-top:22px}button.action{padding:7px 11px;border:1px solid var(--vscode-button-border,transparent);background:var(--vscode-button-background);color:var(--vscode-button-foreground);cursor:pointer}button.action.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}.empty{color:var(--vscode-descriptionForeground);line-height:1.6}
    </style></head><body><main class="shell"><aside class="list"><h1>Intent Navigator</h1><p class="eyebrow">Contratos registrados</p><div id="intent-list"></div></aside><section class="content" id="content"></section></main><script>
      const vscode=acquireVsCodeApi();let intents=[];let selected;const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
      function render(){const list=document.getElementById('intent-list'),content=document.getElementById('content');list.innerHTML=intents.map(intent=>'<button class="intent '+(intent.id===selected?.id?'active':'')+'" data-id="'+intent.id+'"><strong>'+escape(intent.module+'/'+intent.sub)+'</strong><small>'+escape(intent.statement)+'</small></button>').join('');document.querySelectorAll('.intent').forEach(button=>button.onclick=()=>{selected=intents.find(intent=>intent.id===button.dataset.id);render()});if(!selected){content.innerHTML='<div class="empty"><h2>Nenhuma intenção registrada</h2><p>A fonte de verdade começa por uma declaração de intenção em linguagem natural. Crie ou abra um contrato para iniciar.</p><div class="actions"><button class="action" id="new">Nova intenção</button></div></div>';document.getElementById('new').onclick=()=>vscode.postMessage({command:'newIntent'});return}content.innerHTML='<div class="status">'+escape(selected.status)+'</div><p class="eyebrow">Intenção de negócio</p><h2 class="statement">'+escape(selected.statement)+'</h2><p class="explain">Este é o contrato de primeira ordem. YAML, implementação, testes e verificações são projeções verificáveis desta declaração.</p><div class="invariants"><h3>Governança</h3><p>Hard gates bloqueiam apenas violações determinísticas; pareceres consultivos não interrompem a edição.</p></div><div class="actions"><button class="action" id="yaml">Abrir contrato YAML</button><button class="action secondary" id="new">Nova intenção</button></div>';document.getElementById('yaml').onclick=()=>vscode.postMessage({command:'openYaml',module:selected.module+'/'+selected.sub});document.getElementById('new').onclick=()=>vscode.postMessage({command:'newIntent'})}
      window.addEventListener('message',event=>{if(event.data.command!=='intents')return;intents=event.data.intents;selected=intents.find(intent=>intent.module+'/'+intent.sub===event.data.selectedModule)||intents.find(intent=>intent.id===selected?.id)||intents[0];render()});vscode.postMessage({command:'ready'});
    </script></body></html>`;
  }
}