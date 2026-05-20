import * as vscode from 'vscode';
import * as fs     from 'fs';
import * as path   from 'path';
import * as yaml   from 'js-yaml';
import { IntentStore } from '../store/IntentStore';
import { IntentEngine, IntentYaml } from '../engine/IntentEngine';

export class IntentCapturePanel {
  static currentPanel: IntentCapturePanel | undefined;

  private readonly panel:   vscode.WebviewPanel;
  private readonly store:   IntentStore;
  private readonly engine:  IntentEngine;
  private readonly context: vscode.ExtensionContext;
  private disposables:      vscode.Disposable[] = [];

  static async create(
    context: vscode.ExtensionContext,
    store: IntentStore,
    engine: IntentEngine,
    prefillModule?: string
  ): Promise<void> {
    if (IntentCapturePanel.currentPanel) {
      IntentCapturePanel.currentPanel.panel.reveal(vscode.ViewColumn.Two);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'idd.capture', 'IDD — Nova Intenção',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    IntentCapturePanel.currentPanel = new IntentCapturePanel(panel, store, engine, context, prefillModule);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    store: IntentStore,
    engine: IntentEngine,
    context: vscode.ExtensionContext,
    prefillModule?: string
  ) {
    this.panel   = panel;
    this.store   = store;
    this.engine  = engine;
    this.context = context;

    this.panel.webview.html = this.buildHtml(prefillModule);

    // Mensagens do webview → extensão
    this.panel.webview.onDidReceiveMessage(async msg => {
      switch (msg.command) {

        case 'generate': {
          const intent = msg.intent as IntentYaml;
          await this.saveAndGenerate(intent);
          break;
        }

        case 'saveYaml': {
          await this.saveYamlOnly(msg.intent as IntentYaml);
          break;
        }

        case 'getIntents': {
          const intents = this.store.listIntents();
          this.panel.webview.postMessage({ command: 'intents', data: intents });
          break;
        }
      }
    }, null, this.disposables);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private async saveAndGenerate(intent: IntentYaml): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const yamlPath = await this.saveYamlOnly(intent);
    if (!yamlPath) return;

    this.panel.webview.postMessage({ command: 'status', text: 'Gerando código...' });
    try {
      await this.engine.generateFromFile(yamlPath, this.store);
      this.panel.webview.postMessage({ command: 'done', module: intent.module });
    } catch (err: any) {
      vscode.window.showErrorMessage(`IDD Engine: ${err.message}`);
      this.panel.webview.postMessage({ command: 'error', text: err.message });
    }
  }

  private async saveYamlOnly(intent: IntentYaml): Promise<string | null> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return null;

    const [module, sub] = intent.module.split('/');
    const dir = path.join(workspaceRoot, 'src', module);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const yamlPath = path.join(dir, `${sub}.intent.yaml`);
    fs.writeFileSync(yamlPath, yaml.dump(intent, { lineWidth: 80 }), 'utf8');

    const stored = this.store.upsertIntent(module, sub, intent.intent);
    this.store.setConstraints(stored.id, intent.constraints);

    const doc = await vscode.workspace.openTextDocument(yamlPath);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);

    return yamlPath;
  }

  private buildHtml(prefillModule?: string): string {
    const prefill = prefillModule ? `"${prefillModule}"` : '""';
    return /* html */`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IDD — Captura de Intenção</title>
<style>
  :root {
    --purple: #534AB7; --purple-light: #EEEDFE; --purple-mid: #AFA9EC;
    --teal: #0F6E56; --teal-light: #E1F5EE;
    --red: #E24B4A; --red-light: #FCEBEB;
    --amber: #854F0B; --amber-light: #FAEEDA;
    --green: #27500A; --green-light: #EAF3DE;
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --border: var(--vscode-panel-border, #e0e0e0);
    --input-bg: var(--vscode-input-background);
    --input-border: var(--vscode-input-border);
    --btn-bg: var(--vscode-button-background, #534AB7);
    --btn-fg: var(--vscode-button-foreground, #fff);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family, system-ui); font-size: 13px; background: var(--bg); color: var(--fg); padding: 20px; }
  h1 { font-size: 16px; font-weight: 600; margin-bottom: 4px; color: var(--purple); }
  .subtitle { font-size: 12px; color: #888; margin-bottom: 24px; }
  .step { margin-bottom: 22px; }
  .step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--purple-light); color: var(--purple); font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step-label { font-size: 12px; font-weight: 600; }
  .step-desc { font-size: 11px; color: #888; margin-bottom: 8px; margin-left: 30px; }
  textarea, input[type=text] {
    width: 100%; padding: 7px 10px; border: 1px solid var(--input-border, #ccc);
    background: var(--input-bg); color: var(--fg); border-radius: 6px; font-size: 12px;
    font-family: inherit; resize: vertical;
  }
  textarea:focus, input[type=text]:focus { outline: none; border-color: var(--purple); }
  .tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .tag {
    display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px;
    border-radius: 20px; font-size: 11px; cursor: pointer; user-select: none;
  }
  .tag-purple { background: var(--purple-light); color: var(--purple); }
  .tag-red    { background: var(--red-light);    color: var(--red); }
  .tag-teal   { background: var(--teal-light);   color: var(--teal); }
  .tag-amber  { background: var(--amber-light);  color: var(--amber); }
  .tag .remove { font-size: 13px; line-height: 1; opacity: .6; }
  .tag .remove:hover { opacity: 1; }
  .add-input-row { display: flex; gap: 6px; margin-top: 6px; }
  .add-input-row input { flex: 1; }
  .add-btn {
    padding: 6px 12px; background: var(--purple-light); color: var(--purple);
    border: none; border-radius: 6px; font-size: 12px; cursor: pointer; white-space: nowrap;
  }
  .add-btn:hover { background: var(--purple-mid); color: #fff; }
  .preview-box {
    background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px;
    padding: 10px 12px; font-family: monospace; font-size: 11px; line-height: 1.7;
    color: #888; margin-top: 10px; white-space: pre-wrap; max-height: 200px; overflow-y: auto;
  }
  .actions { display: flex; gap: 8px; margin-top: 24px; }
  .btn-primary {
    flex: 1; padding: 9px 16px; background: var(--btn-bg); color: var(--btn-fg);
    border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .btn-primary:hover { opacity: .9; }
  .btn-ghost {
    padding: 9px 16px; background: none; border: 1px solid var(--border);
    color: var(--fg); border-radius: 6px; font-size: 13px; cursor: pointer;
  }
  .status-bar {
    margin-top: 14px; padding: 8px 12px; border-radius: 6px;
    font-size: 12px; display: none;
  }
  .status-bar.info    { background: var(--purple-light); color: var(--purple); display: block; }
  .status-bar.success { background: var(--green-light);  color: var(--green);  display: block; }
  .status-bar.error   { background: var(--red-light);    color: var(--red);    display: block; }
</style>
</head>
<body>
<h1>⬡ Nova Intenção</h1>
<p class="subtitle">Declare o que o código deve fazer — não como implementar.</p>

<div class="step">
  <div class="step-header">
    <div class="step-num">1</div>
    <span class="step-label">O que esta intenção deve fazer?</span>
  </div>
  <p class="step-desc">Descreva em linguagem natural. Seja específico sobre o comportamento esperado.</p>
  <input type="text" id="module" placeholder="Módulo (ex: auth/login)" style="margin-bottom:8px">
  <textarea id="intent" rows="3" placeholder="Ex: Autenticar usuário com e-mail e senha, retornando JWT válido por 24h."></textarea>
</div>

<div class="step">
  <div class="step-header">
    <div class="step-num">2</div>
    <span class="step-label">Restrições e regras de negócio</span>
  </div>
  <p class="step-desc">O que esta intenção não pode fazer ou deve respeitar?</p>
  <div class="tag-row" id="constraints-tags"></div>
  <div class="add-input-row">
    <input type="text" id="constraint-input" placeholder="Ex: senha >= 8 caracteres">
    <button class="add-btn" onclick="addConstraint()">+ Adicionar</button>
  </div>
</div>

<div class="step">
  <div class="step-header">
    <div class="step-num">3</div>
    <span class="step-label">Critérios de aceite</span>
  </div>
  <p class="step-desc">Como saber que a intenção foi satisfeita? Cada item vira um teste.</p>
  <div class="tag-row" id="acceptance-tags"></div>
  <div class="add-input-row">
    <input type="text" id="acceptance-input" placeholder="Ex: login válido retorna 200 + token JWT">
    <button class="add-btn" onclick="addAcceptance()">+ Adicionar</button>
  </div>
</div>

<div class="step">
  <div class="step-header">
    <div class="step-num">4</div>
    <span class="step-label">Dependências (opcional)</span>
  </div>
  <p class="step-desc">Outros módulos que esta intenção usa (alimenta o Context Manager).</p>
  <div class="tag-row" id="deps-tags"></div>
  <div class="add-input-row">
    <input type="text" id="deps-input" placeholder="Ex: users/crud">
    <button class="add-btn" onclick="addDep()">+ Vincular</button>
  </div>
</div>

<div class="step">
  <div class="step-header">
    <div class="step-num">5</div>
    <span class="step-label">Preview — .intent.yaml</span>
  </div>
  <div class="preview-box" id="preview">Preencha os campos acima para ver o preview.</div>
</div>

<div class="actions">
  <button class="btn-ghost" onclick="saveOnly()">Salvar YAML</button>
  <button class="btn-primary" onclick="generate()">⚡ Gerar código</button>
</div>

<div class="status-bar" id="status"></div>

<script>
  const vscode = acquireVsCodeApi();
  const prefillModule = ${prefill};

  const constraints = [];
  const acceptance  = [];
  const deps        = [];

  if (prefillModule) document.getElementById('module').value = prefillModule;

  function addTag(arr, container, value, cls) {
    if (!value.trim()) return;
    arr.push(value.trim());
    const tag = document.createElement('span');
    tag.className = 'tag ' + cls;
    tag.innerHTML = value.trim() + '<span class="remove" onclick="removeTag(this,'+JSON.stringify(arr)+',\''+container+'\')">×</span>';
    document.getElementById(container).appendChild(tag);
    updatePreview();
  }

  function removeTag(el, arr, container) {
    const tag = el.parentElement;
    const idx = Array.from(document.getElementById(container).children).indexOf(tag);
    arr.splice(idx, 1);
    tag.remove();
    updatePreview();
  }

  function addConstraint() {
    const inp = document.getElementById('constraint-input');
    addTag(constraints, 'constraints-tags', inp.value, 'tag-purple');
    inp.value = '';
  }

  function addAcceptance() {
    const inp = document.getElementById('acceptance-input');
    addTag(acceptance, 'acceptance-tags', inp.value, 'tag-teal');
    inp.value = '';
  }

  function addDep() {
    const inp = document.getElementById('deps-input');
    addTag(deps, 'deps-tags', inp.value, 'tag-amber');
    inp.value = '';
  }

  ['constraint-input','acceptance-input','deps-input'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      if (id === 'constraint-input') addConstraint();
      if (id === 'acceptance-input') addAcceptance();
      if (id === 'deps-input')       addDep();
    });
  });

  ['module','intent'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });

  function buildIntent() {
    return {
      intent:      document.getElementById('intent').value,
      module:      document.getElementById('module').value,
      constraints: [...constraints],
      acceptance:  [...acceptance],
      depends_on:  deps.length ? [...deps] : undefined,
      language:    'typescript'
    };
  }

  function updatePreview() {
    const obj = buildIntent();
    const lines = [
      'intent: "' + obj.intent + '"',
      'module: ' + obj.module,
      'constraints:',
      ...obj.constraints.map(c => '  - "' + c + '"'),
      'acceptance:',
      ...obj.acceptance.map(a => '  - "' + a + '"'),
      ...(obj.depends_on?.length ? ['depends_on:', ...obj.depends_on.map(d => '  - ' + d)] : [])
    ];
    document.getElementById('preview').textContent = lines.join('\\n');
  }

  function setStatus(msg, type) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = 'status-bar ' + type;
  }

  function saveOnly() {
    vscode.postMessage({ command: 'saveYaml', intent: buildIntent() });
    setStatus('YAML salvo.', 'success');
  }

  function generate() {
    const obj = buildIntent();
    if (!obj.module.includes('/')) { setStatus('Módulo inválido — use o formato dominio/funcionalidade.', 'error'); return; }
    if (!obj.intent)               { setStatus('Descreva a intenção no campo 1.', 'error'); return; }
    if (!obj.constraints.length)   { setStatus('Adicione ao menos uma constraint.', 'error'); return; }
    if (!obj.acceptance.length)    { setStatus('Adicione ao menos um critério de aceite.', 'error'); return; }
    setStatus('Enviando para o Intent Engine…', 'info');
    vscode.postMessage({ command: 'generate', intent: obj });
  }

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.command === 'status') setStatus(msg.text, 'info');
    if (msg.command === 'done')   setStatus('✓ Código gerado para ' + msg.module, 'success');
    if (msg.command === 'error')  setStatus('Erro: ' + msg.text, 'error');
  });
</script>
</body>
</html>`;
  }

  dispose(): void {
    IntentCapturePanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
