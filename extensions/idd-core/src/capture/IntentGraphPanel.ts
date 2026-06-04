import * as vscode from 'vscode';
import * as path   from 'path';
import * as fs     from 'fs';
import { IntentStore, GraphData, GraphNode } from '../store/IntentStore';

export class IntentGraphPanel {
  static currentPanel: IntentGraphPanel | undefined;

  private readonly panel:       vscode.WebviewPanel;
  private readonly store:       IntentStore;
  private readonly context:     vscode.ExtensionContext;
  private disposables:          vscode.Disposable[] = [];
  private workspaceRoot:        string | undefined;

  static create(context: vscode.ExtensionContext, store: IntentStore): void {
    if (IntentGraphPanel.currentPanel) {
      IntentGraphPanel.currentPanel.panel.reveal(vscode.ViewColumn.Two);
      IntentGraphPanel.currentPanel.refresh();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'idd.graph', '⬡ Intent Graph',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    IntentGraphPanel.currentPanel = new IntentGraphPanel(panel, store, context);
  }

  private constructor(
    panel:   vscode.WebviewPanel,
    store:   IntentStore,
    context: vscode.ExtensionContext
  ) {
    this.panel         = panel;
    this.store         = store;
    this.context       = context;
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    this.panel.webview.html = this.buildHtml();
    this.refresh();

    // Auto-refresh when store changes
    store.onDidChange(() => this.refresh());

    // Messages from webview → extension
    this.panel.webview.onDidReceiveMessage(async msg => {
      switch (msg.command) {
        case 'openIntent': await this.openIntentFile(msg.module, msg.sub); break;
        case 'exportSvg':  await this.exportSvg(msg.svg);                  break;
        case 'refresh':    this.refresh();                                  break;
        case 'runVerify':  vscode.commands.executeCommand('idd.verify');    break;
      }
    }, null, this.disposables);

    this.panel.onDidDispose(() => {
      IntentGraphPanel.currentPanel = undefined;
      this.disposables.forEach(d => d.dispose());
    }, null, this.disposables);
  }

  refresh(): void {
    const data    = this.store.getGraphData();
    const drifts  = this.store.getActiveDrifts();
    this.panel.webview.postMessage({
      command:     'updateGraph',
      data,
      driftCount:  drifts.length,
      timestamp:   new Date().toLocaleTimeString('pt-BR')
    });
  }

  private async openIntentFile(module: string, sub: string): Promise<void> {
    if (!this.workspaceRoot) return;
    const candidates = [
      path.join(this.workspaceRoot, 'src', module, `${sub}.intent.yaml`),
      path.join(this.workspaceRoot, module, `${sub}.intent.yaml`),
    ];
    const found = candidates.find(p => fs.existsSync(p));
    if (found) {
      const doc = await vscode.workspace.openTextDocument(found);
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    } else {
      vscode.window.showWarningMessage(`Arquivo ${module}/${sub}.intent.yaml não encontrado.`);
    }
  }

  private async exportSvg(svgContent: string): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(
        path.join(this.workspaceRoot ?? '', 'intent-graph.svg')
      ),
      filters: { 'SVG': ['svg'], 'PNG': ['png'] }
    });
    if (!uri) return;
    fs.writeFileSync(uri.fsPath, svgContent, 'utf8');
    vscode.window.showInformationMessage(`Grafo exportado: ${uri.fsPath}`);
  }

  private buildHtml(): string {
    return /* html */`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IDD Intent Graph</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
<style>
:root {
  --ok:    #1D9E75; --ok-bg:    #EAF3DE;
  --drift: #E24B4A; --drift-bg: #FCEBEB;
  --warn:  #EF9F27; --warn-bg:  #FAEEDA;
  --orphan:#888780; --orphan-bg:#F1EFE8;
  --purple:#534AB7; --purple-bg:#EEEDFE;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--vscode-editor-background);font-family:var(--vscode-font-family);font-size:12px;display:flex;flex-direction:column;height:100vh;overflow:hidden}

/* ── Toolbar ── */
.toolbar{display:flex;align-items:center;gap:6px;padding:0 10px;height:40px;background:var(--vscode-sideBar-background);border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0}
.tb-title{font-weight:600;font-size:13px;margin-right:4px}
.tb-sep{width:1px;height:18px;background:var(--vscode-panel-border);margin:0 2px}
.filter-btn{padding:3px 8px;border:1px solid var(--vscode-panel-border);background:none;color:var(--vscode-editor-foreground);border-radius:4px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap}
.filter-btn.active{background:var(--purple-bg);border-color:var(--purple);color:var(--purple)}
.filter-btn .dot{width:7px;height:7px;border-radius:50%;display:inline-block}
.tb-right{margin-left:auto;display:flex;gap:4px;align-items:center}
.icon-btn{padding:4px 7px;background:none;border:1px solid var(--vscode-panel-border);border-radius:4px;cursor:pointer;color:var(--vscode-editor-foreground);font-size:12px}
.icon-btn:hover{background:var(--vscode-toolbar-hoverBackground)}
.status-pill{font-size:10px;padding:2px 7px;border-radius:10px;font-weight:500}

/* ── Main area ── */
.main{display:flex;flex:1;overflow:hidden;position:relative}
#cy{flex:1;min-width:0}

/* ── Info Panel ── */
.info-panel{width:220px;border-left:1px solid var(--vscode-panel-border);background:var(--vscode-sideBar-background);display:flex;flex-direction:column;overflow-y:auto;flex-shrink:0;transition:width .2s}
.info-panel.hidden{width:0;overflow:hidden;border:none}
.ip-head{padding:10px 12px;font-weight:600;font-size:12px;border-bottom:1px solid var(--vscode-panel-border);display:flex;align-items:center;justify-content:space-between}
.ip-close{background:none;border:none;cursor:pointer;font-size:14px;color:var(--vscode-descriptionForeground)}
.ip-body{padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.ip-row{display:flex;flex-direction:column;gap:2px}
.ip-label{font-size:10px;color:var(--vscode-descriptionForeground);text-transform:uppercase;letter-spacing:.04em}
.ip-val{font-size:12px;color:var(--vscode-editor-foreground);line-height:1.4}
.badge{display:inline-block;font-size:10px;padding:2px 7px;border-radius:10px;font-weight:500}
.badge-ok    {background:var(--ok-bg);color:var(--ok)}
.badge-drift {background:var(--drift-bg);color:var(--drift)}
.badge-warn  {background:var(--warn-bg);color:var(--warn)}
.badge-orphan{background:var(--orphan-bg);color:var(--orphan)}
.ip-actions{display:flex;flex-direction:column;gap:5px;margin-top:4px}
.ip-btn{padding:5px 10px;border-radius:4px;border:none;cursor:pointer;font-size:11px;text-align:left}
.ip-btn-primary{background:var(--purple-bg);color:var(--purple)}
.ip-btn-secondary{background:none;border:1px solid var(--vscode-panel-border);color:var(--vscode-editor-foreground)}
.dep-chip{display:inline-block;font-size:10px;padding:1px 6px;border-radius:10px;margin:1px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}

/* ── Drift alert ── */
.drift-alert{padding:6px 12px;background:var(--drift-bg);color:var(--drift);font-size:11px;display:none;align-items:center;gap:6px;flex-shrink:0;border-bottom:1px solid var(--drift);cursor:pointer}
.drift-alert.visible{display:flex}

/* ── Score bar ── */
.score-bar{height:4px;border-radius:2px;margin-top:4px}
.score-fill{height:100%;border-radius:2px;transition:width .4s}

/* ── Empty state ── */
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:var(--vscode-descriptionForeground)}
.empty-icon{font-size:32px;opacity:.4}
.empty-text{font-size:13px}
.empty-sub{font-size:11px;opacity:.7}
</style>
</head>
<body>

<div class="toolbar">
  <span class="tb-title">⬡ Graph</span>
  <div class="tb-sep"></div>

  <button class="filter-btn active" id="f-all"     onclick="setFilter('all')">Todas</button>
  <button class="filter-btn"        id="f-ok"      onclick="setFilter('ok')">
    <span class="dot" style="background:var(--ok)"></span>ok
  </button>
  <button class="filter-btn"        id="f-drift"   onclick="setFilter('drift')">
    <span class="dot" style="background:var(--drift)"></span>drift
  </button>
  <button class="filter-btn"        id="f-warn"    onclick="setFilter('warn')">
    <span class="dot" style="background:var(--warn)"></span>aviso
  </button>
  <button class="filter-btn"        id="f-orphan"  onclick="setFilter('orphan')">
    <span class="dot" style="background:var(--orphan)"></span>órfã
  </button>

  <div class="tb-right">
    <span id="node-count" style="font-size:11px;color:var(--vscode-descriptionForeground)"></span>
    <span id="ts" style="font-size:10px;color:var(--vscode-descriptionForeground)"></span>
    <div class="tb-sep"></div>
    <button class="icon-btn" title="Centralizar grafo"  onclick="cy && cy.fit()">⊹</button>
    <button class="icon-btn" title="Exportar SVG"       onclick="exportSvg()">↓ SVG</button>
    <button class="icon-btn" title="Verificar agora"    onclick="vscode.postMessage({command:'runVerify'})">▶ verify</button>
    <button class="icon-btn" title="Atualizar"          onclick="vscode.postMessage({command:'refresh'})">↺</button>
  </div>
</div>

<div class="drift-alert" id="drift-alert" onclick="vscode.postMessage({command:'runVerify'})">
  ⚠ <span id="drift-msg"></span> — clique para verificar
</div>

<div class="main">
  <div id="cy">
    <div class="empty" id="empty-state" style="display:none">
      <div class="empty-icon">⬡</div>
      <div class="empty-text">Nenhuma intenção registrada</div>
      <div class="empty-sub">Execute "idd generate" para começar</div>
    </div>
  </div>

  <div class="info-panel hidden" id="info-panel">
    <div class="ip-head">
      <span id="ip-title">—</span>
      <button class="ip-close" onclick="closePanel()">✕</button>
    </div>
    <div class="ip-body" id="ip-body"></div>
  </div>
</div>

<script>
const vscode = acquireVsCodeApi();

const STATUS_COLOR = {ok:'#1D9E75',drift:'#E24B4A',warn:'#EF9F27',orphan:'#888780',deprecated:'#888780'};
const STATUS_BG    = {ok:'#EAF3DE',drift:'#FCEBEB',warn:'#FAEEDA',orphan:'#F1EFE8',deprecated:'#F1EFE8'};

let cy          = null;
let allData     = null;
let filterMode  = 'all';
let animating   = new Set();

// ── Graph rendering ──────────────────────────────────────────────

function buildGraph(data) {
  allData = data;
  const visibleIds = filterMode === 'all'
    ? new Set(data.nodes.map(n => n.id))
    : new Set(data.nodes.filter(n => n.status === filterMode).map(n => n.id));

  const elements = [
    ...data.nodes
      .filter(n => visibleIds.has(n.id))
      .map(n => ({
        data: {
          id: n.id, label: n.module + '\\n' + n.sub,
          module: n.module, sub: n.sub, status: n.status,
          statement: n.statement, constraints: n.constraints,
          criteria: n.criteria, versions: n.versions,
          depends_on: n.depends_on, used_by: n.used_by,
          avg_score: n.avg_score, trend: n.trend,
          bg: STATUS_BG[n.status]  ?? '#F1EFE8',
          border: STATUS_COLOR[n.status] ?? '#888',
        }
      })),
    ...data.edges
      .filter(e => visibleIds.has(e.from) && visibleIds.has(e.to))
      .map(e => ({
        data: {
          id: e.from + '__' + e.to,
          source: e.from, target: e.to,
          drift: e.drift
        }
      }))
  ];

  if (elements.filter(e => !e.data.source).length === 0) {
    document.getElementById('empty-state').style.display = 'flex';
    return;
  }
  document.getElementById('empty-state').style.display = 'none';

  if (cy) cy.destroy();

  cy = cytoscape({
    container: document.getElementById('cy'),
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'label':            'data(label)',
          'text-valign':      'center',
          'text-halign':      'center',
          'text-wrap':        'wrap',
          'font-size':        11,
          'font-family':      'var(--vscode-font-family, system-ui)',
          'width':            68,
          'height':           68,
          'background-color': 'data(bg)',
          'border-color':     'data(border)',
          'border-width':     1.5,
          'color':            'data(border)',
          'transition-property': 'border-color border-width background-color',
          'transition-duration': '0.3s',
        }
      },
      {
        selector: 'node[status="drift"]',
        style: { 'border-width': 2.5, 'border-style': 'solid' }
      },
      {
        selector: 'node:selected',
        style: { 'border-color': '#534AB7', 'border-width': 3 }
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
        selector: 'edge[drift="true"]',
        style: {
          'line-color': '#F09595',
          'target-arrow-color': '#F09595',
          'line-style': 'dashed',
          'line-dash-pattern': [6, 3]
        }
      },
      {
        selector: 'node.pulsing',
        style: { 'border-color': '#E24B4A', 'border-width': 4 }
      }
    ],
    layout: { name: 'breadthfirst', directed: true, spacingFactor: 1.5, padding: 48 }
  });

  // Tap node → show info panel + highlight cascade
  cy.on('tap', 'node', evt => {
    const n = evt.target.data();
    showPanel(n);
    highlightCascade(n.id);
  });

  cy.on('tap', evt => {
    if (evt.target === cy) { closePanel(); cy.elements().removeClass('faded highlighted'); }
  });

  // Animate drift nodes
  animateDriftNodes();

  // Update header count
  const nodeCount = elements.filter(e => !e.data.source).length;
  document.getElementById('node-count').textContent = nodeCount + ' nós';
}

// ── Drift animation ───────────────────────────────────────────────

function animateDriftNodes() {
  if (!cy) return;
  cy.nodes('[status="drift"]').forEach(node => {
    let on = false;
    const id = node.id();
    if (animating.has(id)) return;
    animating.add(id);
    const iv = setInterval(() => {
      if (!cy || !cy.getElementById(id).length) { clearInterval(iv); animating.delete(id); return; }
      on = !on;
      cy.getElementById(id).style({ 'border-color': on ? '#E24B4A' : '#F09595', 'border-width': on ? 3 : 1.5 });
    }, 800);
  });
}

// ── Cascade highlight ─────────────────────────────────────────────

function highlightCascade(nodeId) {
  if (!cy) return;
  cy.elements().removeClass('faded highlighted');

  const affected = new Set([nodeId]);
  // Traverse successors (nodes that depend on this)
  cy.getElementById(nodeId).successors('node').forEach(n => affected.add(n.id()));
  // Traverse predecessors (nodes this depends on)
  cy.getElementById(nodeId).predecessors('node').forEach(n => affected.add(n.id()));

  cy.nodes().forEach(n => {
    if (!affected.has(n.id())) n.addClass('faded');
    else n.addClass('highlighted');
  });
  cy.edges().forEach(e => {
    const connected = affected.has(e.source().id()) && affected.has(e.target().id());
    if (!connected) e.addClass('faded');
  });
}

// ── Info panel ────────────────────────────────────────────────────

function showPanel(n) {
  document.getElementById('ip-title').textContent = n.module + '/' + n.sub;
  const scoreColor = n.avg_score >= 80 ? 'var(--ok)' : n.avg_score >= 60 ? 'var(--warn)' : 'var(--drift)';
  const trendIcon  = n.trend === 'up' ? '↑' : n.trend === 'down' ? '↓' : '→';
  const depsHtml   = (n.depends_on || []).map(d => \`<span class="dep-chip">\${d}</span>\`).join('') || '<span style="opacity:.5">—</span>';
  const usedHtml   = (n.used_by   || []).map(d => \`<span class="dep-chip">\${d}</span>\`).join('') || '<span style="opacity:.5">—</span>';

  document.getElementById('ip-body').innerHTML = \`
    <div class="ip-row">
      <span class="ip-label">status</span>
      <span><span class="badge badge-\${n.status}">\${n.status}</span></span>
    </div>
    <div class="ip-row">
      <span class="ip-label">intenção</span>
      <span class="ip-val" style="font-size:11px">\${n.statement || '—'}</span>
    </div>
    <div class="ip-row">
      <span class="ip-label">alinhamento</span>
      <div>
        <span style="color:\${scoreColor};font-weight:500">\${n.avg_score}% \${trendIcon}</span>
        <div class="score-bar" style="background:var(--vscode-panel-border)">
          <div class="score-fill" style="width:\${n.avg_score}%;background:\${scoreColor}"></div>
        </div>
      </div>
    </div>
    <div class="ip-row">
      <span class="ip-label">constraints · critérios · versões</span>
      <span class="ip-val">\${n.constraints} · \${n.criteria} · \${n.versions}</span>
    </div>
    <div class="ip-row">
      <span class="ip-label">depende de</span>
      <div>\${depsHtml}</div>
    </div>
    <div class="ip-row">
      <span class="ip-label">usado por</span>
      <div>\${usedHtml}</div>
    </div>
    <div class="ip-actions">
      <button class="ip-btn ip-btn-primary"
        onclick="vscode.postMessage({command:'openIntent',module:'\${n.module}',sub:'\${n.sub}'})">
        Abrir .intent.yaml ↗
      </button>
      \${n.status !== 'ok' ? \`<button class="ip-btn ip-btn-secondary"
        onclick="vscode.postMessage({command:'runVerify'})">
        Verificar alinhamento ▶
      </button>\` : ''}
    </div>
  \`;
  document.getElementById('info-panel').classList.remove('hidden');
}

function closePanel() {
  document.getElementById('info-panel').classList.add('hidden');
  if (cy) cy.elements().removeClass('faded highlighted');
}

// ── Filters ───────────────────────────────────────────────────────

function setFilter(mode) {
  filterMode = mode;
  ['all','ok','drift','warn','orphan'].forEach(m => {
    document.getElementById('f-' + m).classList.toggle('active', m === mode);
  });
  if (allData) buildGraph(allData);
}

// ── Export SVG ────────────────────────────────────────────────────

function exportSvg() {
  if (!cy) return;
  const svg = cy.svg({ scale: 2, full: true, output: 'string' });
  vscode.postMessage({ command: 'exportSvg', svg });
}

// ── Message handler ───────────────────────────────────────────────

window.addEventListener('message', e => {
  const msg = e.data;
  if (msg.command !== 'updateGraph') return;

  buildGraph(msg.data);

  // Drift alert bar
  const alert = document.getElementById('drift-alert');
  if (msg.driftCount > 0) {
    document.getElementById('drift-msg').textContent =
      msg.driftCount + ' intenção(ões) com drift detectado';
    alert.classList.add('visible');
  } else {
    alert.classList.remove('visible');
  }

  // Timestamp
  document.getElementById('ts').textContent = msg.timestamp ?? '';
});
</script>
</body>
</html>`;
  }
}
