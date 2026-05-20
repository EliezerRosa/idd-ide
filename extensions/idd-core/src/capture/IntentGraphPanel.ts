import * as vscode from 'vscode';
import { IntentStore } from '../store/IntentStore';

export class IntentGraphPanel {
  static currentPanel: IntentGraphPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly store: IntentStore;
  private disposables: vscode.Disposable[] = [];

  static create(context: vscode.ExtensionContext, store: IntentStore): void {
    if (IntentGraphPanel.currentPanel) {
      IntentGraphPanel.currentPanel.panel.reveal(vscode.ViewColumn.Two);
      IntentGraphPanel.currentPanel.refresh();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'idd.graph', 'IDD — Intent Graph',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    IntentGraphPanel.currentPanel = new IntentGraphPanel(panel, store);
  }

  private constructor(panel: vscode.WebviewPanel, store: IntentStore) {
    this.panel = panel;
    this.store = store;
    this.panel.webview.html = this.buildHtml();
    this.refresh();

    store.onDidChange(() => this.refresh());
    this.panel.onDidDispose(() => {
      IntentGraphPanel.currentPanel = undefined;
      this.disposables.forEach(d => d.dispose());
    }, null, this.disposables);
  }

  refresh(): void {
    const data = this.store.getGraphData();
    this.panel.webview.postMessage({ command: 'updateGraph', data });
  }

  private buildHtml(): string {
    return /* html */`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>IDD Intent Graph</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--vscode-editor-background); font-family: var(--vscode-font-family); font-size: 12px; overflow: hidden; }
  #cy { width: 100vw; height: calc(100vh - 44px); }
  .toolbar {
    height: 44px; display: flex; align-items: center; gap: 8px; padding: 0 14px;
    background: var(--vscode-sideBar-background); border-bottom: 1px solid var(--vscode-panel-border);
  }
  .toolbar span { font-weight: 600; font-size: 13px; color: var(--vscode-editor-foreground); }
  .legend { display: flex; gap: 12px; margin-left: auto; }
  .leg { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--vscode-descriptionForeground); }
  .leg-dot { width: 9px; height: 9px; border-radius: 50%; }
  .info-box {
    position: absolute; bottom: 14px; right: 14px; min-width: 200px; max-width: 280px;
    background: var(--vscode-editorWidget-background, #fff);
    border: 1px solid var(--vscode-panel-border); border-radius: 8px;
    padding: 12px 14px; font-size: 12px; display: none;
  }
  .info-box.visible { display: block; }
  .info-title { font-weight: 600; margin-bottom: 6px; }
  .info-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .info-label { color: var(--vscode-descriptionForeground); }
  .badge {
    font-size: 10px; padding: 2px 7px; border-radius: 10px;
    font-weight: 500; display: inline-block;
  }
  .badge-ok    { background: #EAF3DE; color: #27500A; }
  .badge-drift { background: #FCEBEB; color: #791F1F; }
  .badge-warn  { background: #FAEEDA; color: #633806; }
  .badge-orphan{ background: #F1EFE8; color: #5F5E5A; }
</style>
</head>
<body>
<div class="toolbar">
  <span>⬡ Intent Graph</span>
  <div class="legend">
    <div class="leg"><div class="leg-dot" style="background:#1D9E75"></div>alinhada</div>
    <div class="leg"><div class="leg-dot" style="background:#E24B4A"></div>drift</div>
    <div class="leg"><div class="leg-dot" style="background:#EF9F27"></div>aviso</div>
    <div class="leg"><div class="leg-dot" style="background:#888780"></div>órfã</div>
  </div>
</div>
<div id="cy"></div>
<div class="info-box" id="info-box">
  <div class="info-title" id="info-title">—</div>
  <div class="info-row"><span class="info-label">status</span><span id="info-status">—</span></div>
  <div class="info-row"><span class="info-label">módulo</span><span id="info-module">—</span></div>
</div>

<script>
const STATUS_COLOR = { ok:'#1D9E75', drift:'#E24B4A', warn:'#EF9F27', orphan:'#888780', deprecated:'#888780' };
const STATUS_BG    = { ok:'#EAF3DE', drift:'#FCEBEB', warn:'#FAEEDA', orphan:'#F1EFE8', deprecated:'#F1EFE8' };

let cy = null;

function buildGraph(data) {
  const elements = [
    ...data.nodes.map(n => ({
      data: {
        id: n.id, label: n.module + '\\n' + n.sub,
        module: n.module, sub: n.sub, status: n.status,
        bg: STATUS_BG[n.status] ?? '#F1EFE8',
        border: STATUS_COLOR[n.status] ?? '#888'
      }
    })),
    ...data.edges.map(e => ({ data: { id: e.from+'__'+e.to, source: e.from, target: e.to } }))
  ];

  if (cy) { cy.destroy(); cy = null; }

  cy = cytoscape({
    container: document.getElementById('cy'),
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'label':              'data(label)',
          'text-valign':        'center',
          'text-halign':        'center',
          'text-wrap':          'wrap',
          'font-size':          11,
          'font-family':        'system-ui',
          'width':              70,
          'height':             70,
          'background-color':   'data(bg)',
          'border-color':       'data(border)',
          'border-width':       1.5,
          'color':              'data(border)'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 1.2,
          'line-color': '#CCCCCC',
          'target-arrow-color': '#CCCCCC',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 0.8
        }
      },
      {
        selector: 'node[status="drift"]',
        style: { 'border-width': 2.5 }
      },
      {
        selector: 'node:selected',
        style: { 'border-width': 3, 'border-color': '#534AB7' }
      }
    ],
    layout: { name: 'breadthfirst', directed: true, spacingFactor: 1.4, padding: 40 }
  });

  cy.on('tap', 'node', evt => {
    const n = evt.target.data();
    document.getElementById('info-title').textContent = n.module + '/' + n.sub;
    document.getElementById('info-module').textContent = n.module + '/' + n.sub;
    document.getElementById('info-status').innerHTML =
      '<span class="badge badge-' + n.status + '">' + n.status + '</span>';
    document.getElementById('info-box').classList.add('visible');
  });

  cy.on('tap', evt => {
    if (evt.target === cy) document.getElementById('info-box').classList.remove('visible');
  });
}

window.addEventListener('message', e => {
  if (e.data.command === 'updateGraph') buildGraph(e.data.data);
});
</script>
</body>
</html>`;
  }
}
