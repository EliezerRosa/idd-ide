// extensions/idd-core/src/lsp/server.ts
// Language Server Protocol para arquivos .intent.yaml
// Oferece: diagnostics em tempo real, hover, go-to-definition, rename, autocomplete

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  HoverParams,
  Hover,
  MarkupKind,
  DefinitionParams,
  Location,
  Range,
  Position,
  RenameParams,
  WorkspaceEdit,
  TextEdit,
  PrepareRenameParams,
  RenameFile,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as path from 'node:path';
import * as fs   from 'node:fs';
import * as yaml from 'js-yaml';

// ── Schema válido ─────────────────────────────────────────────────

const REQUIRED_FIELDS = ['intent', 'module', 'constraints', 'acceptance'] as const;
const VALID_LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust', 'java'];
const VALID_FIELDS    = new Set([
  'intent', 'module', 'constraints', 'acceptance',
  'depends_on', 'used_by', 'language', 'framework', 'tags', 'version',
]);

// ── Conexão LSP ───────────────────────────────────────────────────

const connection = createConnection(ProposedFeatures.all);
const documents  = new TextDocuments(TextDocument);

let workspaceRoot: string | null = null;
let hasConfigCapability           = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  workspaceRoot = params.rootUri
    ? new URL(params.rootUri).pathname
    : params.rootPath ?? null;

  const caps = params.capabilities;
  hasConfigCapability = !!(caps.workspace?.configuration);

  return {
    capabilities: {
      textDocumentSync:     TextDocumentSyncKind.Incremental,
      completionProvider:   { resolveProvider: false, triggerCharacters: ['-', ' ', ':'] },
      hoverProvider:        true,
      definitionProvider:   true,
      renameProvider:       { prepareProvider: true },
    },
  };
});

connection.onInitialized(() => {
  if (hasConfigCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
});

// ── Diagnostics em tempo real ─────────────────────────────────────

function validateDocument(doc: TextDocument): Diagnostic[] {
  const text = doc.getText();
  const diagnostics: Diagnostic[] = [];

  let parsed: Record<string, unknown>;
  try {
    parsed = yaml.load(text) as Record<string, unknown>;
  } catch (e: any) {
    // YAML parse error
    const match = e.message.match(/line (\d+)/);
    const line  = match ? parseInt(match[1]) - 1 : 0;
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: { start: { line, character: 0 }, end: { line, character: 100 } },
      message: `YAML inválido: ${e.message}`,
      source: 'idd-lsp',
    });
    return diagnostics;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range:    zeroRange(),
      message:  'O arquivo deve ser um objeto YAML, não uma lista ou valor primitivo.',
      source:   'idd-lsp',
    });
    return diagnostics;
  }

  // Campos obrigatórios
  for (const field of REQUIRED_FIELDS) {
    if (!(field in parsed) || parsed[field] === null || parsed[field] === undefined) {
      const line = findFieldLine(text, field);
      diagnostics.push({
        severity:  DiagnosticSeverity.Error,
        range:     lineRange(line),
        message:   `Campo obrigatório "${field}" está ausente.`,
        source:    'idd-lsp',
        code:      `idd.missing.${field}`,
      });
    }
  }

  // intent: string >= 10 chars
  if (typeof parsed.intent === 'string' && parsed.intent.length < 10) {
    const line = findFieldLine(text, 'intent');
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range:    lineRange(line),
      message:  `"intent" deve ter ao menos 10 caracteres (atual: ${parsed.intent.length}).`,
      source:   'idd-lsp',
    });
  }

  // module: padrão dominio/sub
  if (typeof parsed.module === 'string' && !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(parsed.module)) {
    const line = findFieldLine(text, 'module');
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range:    lineRange(line),
      message:  `"module" deve seguir o formato "dominio/funcionalidade" em minúsculas (ex: auth/login).`,
      source:   'idd-lsp',
    });
  }

  // constraints/acceptance: array não vazio
  for (const field of ['constraints', 'acceptance'] as const) {
    if (field in parsed) {
      if (!Array.isArray(parsed[field])) {
        const line = findFieldLine(text, field);
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range:    lineRange(line),
          message:  `"${field}" deve ser uma lista YAML (array).`,
          source:   'idd-lsp',
        });
      } else if ((parsed[field] as unknown[]).length === 0) {
        const line = findFieldLine(text, field);
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range:    lineRange(line),
          message:  `"${field}" está vazio — adicione ao menos um item.`,
          source:   'idd-lsp',
        });
      }
    }
  }

  // language: enum
  if (typeof parsed.language === 'string' && !VALID_LANGUAGES.includes(parsed.language)) {
    const line = findFieldLine(text, 'language');
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range:    lineRange(line),
      message:  `Linguagem inválida: "${parsed.language}". Opções: ${VALID_LANGUAGES.join(', ')}.`,
      source:   'idd-lsp',
    });
  }

  // depends_on: formato modulo/sub
  if (Array.isArray(parsed.depends_on)) {
    (parsed.depends_on as unknown[]).forEach((dep, i) => {
      if (typeof dep === 'string' && !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(dep)) {
        const line = findFieldLine(text, 'depends_on');
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range:    lineRange(line + i + 1),
          message:  `"${dep}" tem formato inválido (esperado: modulo/sub).`,
          source:   'idd-lsp',
        });
      }
    });
  }

  // Campos desconhecidos
  for (const key of Object.keys(parsed)) {
    if (!VALID_FIELDS.has(key)) {
      const line = findFieldLine(text, key);
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range:    lineRange(line),
        message:  `Campo desconhecido "${key}" — verifique o schema .intent.yaml.`,
        source:   'idd-lsp',
      });
    }
  }

  return diagnostics;
}

documents.onDidChangeContent(change => {
  const diags = validateDocument(change.document);
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics: diags });
});

// ── Hover ─────────────────────────────────────────────────────────

const FIELD_DOCS: Record<string, string> = {
  intent:      '**intent** *(obrigatório)*\n\nDescrição em linguagem natural do que o módulo deve fazer. Mínimo 10 caracteres.',
  module:      '**module** *(obrigatório)*\n\nCaminho do módulo no formato `dominio/funcionalidade`. Exemplo: `auth/login`.',
  constraints: '**constraints** *(obrigatório)*\n\nRegras de negócio obrigatórias. Cada item é verificado continuamente pelo Verifier.',
  acceptance:  '**acceptance** *(obrigatório)*\n\nCritérios de aceite. Cada item vira automaticamente um caso de teste.',
  depends_on:  '**depends_on** *(opcional)*\n\nMódulos que esta intenção consome. O Context Manager injeta os contratos dessas dependências no prompt do LLM.',
  used_by:     '**used_by** *(opcional)*\n\nMódulos que dependem desta intenção. Gerenciado automaticamente pelo IDE.',
  language:    `**language** *(opcional)*\n\nLinguagem alvo. Opções: ${VALID_LANGUAGES.join(', ')}.`,
  framework:   '**framework** *(opcional)*\n\nFramework alvo. Exemplo: `express`, `fastapi`, `gin`.',
  tags:        '**tags** *(opcional)*\n\nTags para organização e filtros no Intent Graph.',
  version:     '**version** *(opcional)*\n\nVersionamento semântico. Gerenciado automaticamente pelo Intent Store.',
};

connection.onHover(async (params: HoverParams): Promise<Hover | null> => {
  const doc  = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const text = doc.getText();
  const pos  = params.position;
  const line = text.split('\n')[pos.line] ?? '';

  // Detecta qual campo está sendo hovereado
  const fieldMatch = line.match(/^(\w+)\s*:/);
  if (fieldMatch) {
    const field = fieldMatch[1];
    const docs  = FIELD_DOCS[field];
    if (docs) {
      // Módulos em depends_on: mostra contexto do módulo referenciado
      const depValueMatch = line.match(/^\s*-\s+([a-z0-9-]+\/[a-z0-9-]+)/);
      if (depValueMatch && workspaceRoot) {
        const extra = getModuleSummary(workspaceRoot, depValueMatch[1]);
        return {
          contents: { kind: MarkupKind.Markdown, value: extra ?? docs },
          range: lineRange(pos.line),
        };
      }
      return { contents: { kind: MarkupKind.Markdown, value: docs }, range: lineRange(pos.line) };
    }
  }

  // Hover em valores de depends_on
  const depMatch = line.match(/^\s*-\s+([a-z0-9-]+\/[a-z0-9-]+)/);
  if (depMatch && workspaceRoot) {
    const summary = getModuleSummary(workspaceRoot, depMatch[1]);
    if (summary) {
      return { contents: { kind: MarkupKind.Markdown, value: summary }, range: lineRange(pos.line) };
    }
  }

  return null;
});

function getModuleSummary(root: string, moduleKey: string): string | null {
  const [mod, sub] = moduleKey.split('/');
  const candidates = [
    path.join(root, 'src', mod, `${sub}.intent.yaml`),
    path.join(root, mod, `${sub}.intent.yaml`),
  ];
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) return null;
  try {
    const parsed = yaml.load(fs.readFileSync(found, 'utf8')) as Record<string, unknown>;
    const lines  = [
      `**${moduleKey}**`,
      '',
      `${parsed.intent ?? '—'}`,
      '',
    ];
    if (Array.isArray(parsed.constraints) && parsed.constraints.length > 0) {
      lines.push(`**Constraints:** ${(parsed.constraints as string[]).slice(0, 3).join(' · ')}`);
    }
    return lines.join('\n');
  } catch { return null; }
}

// ── Go-to-definition ──────────────────────────────────────────────

connection.onDefinition(async (params: DefinitionParams): Promise<Location | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc || !workspaceRoot) return null;

  const line = doc.getText().split('\n')[params.position.line] ?? '';
  const depMatch = line.match(/^\s*-\s+([a-z0-9-]+\/[a-z0-9-]+)/);
  if (!depMatch) return null;

  const [mod, sub] = depMatch[1].split('/');
  const candidates = [
    path.join(workspaceRoot, 'src', mod, `${sub}.intent.yaml`),
    path.join(workspaceRoot, mod, `${sub}.intent.yaml`),
  ];
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) return null;

  return {
    uri:   'file://' + found,
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  };
});

// ── Rename ────────────────────────────────────────────────────────

connection.onPrepareRename(async (params: PrepareRenameParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const line = doc.getText().split('\n')[params.position.line] ?? '';
  const moduleMatch = line.match(/^module:\s*([a-z0-9-]+\/[a-z0-9-]+)/);
  if (moduleMatch) {
    const start = line.indexOf(moduleMatch[1]);
    return {
      range: {
        start: { line: params.position.line, character: start },
        end:   { line: params.position.line, character: start + moduleMatch[1].length },
      },
      placeholder: moduleMatch[1],
    };
  }
  return null;
});

connection.onRenameRequest(async (params: RenameParams): Promise<WorkspaceEdit | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc || !workspaceRoot) return null;

  const text = doc.getText();
  const lines = text.split('\n');
  const line  = lines[params.position.line] ?? '';
  const moduleMatch = line.match(/^module:\s*([a-z0-9-]+\/[a-z0-9-]+)/);
  if (!moduleMatch) return null;

  const oldModule = moduleMatch[1];
  const newModule = params.newName;
  const changes: Record<string, TextEdit[]> = {};

  // 1. Atualiza o arquivo atual
  const docUri = params.textDocument.uri;
  changes[docUri] = [
    {
      range: {
        start: { line: params.position.line, character: line.indexOf(oldModule) },
        end:   { line: params.position.line, character: line.indexOf(oldModule) + oldModule.length },
      },
      newText: newModule,
    }
  ];

  // 2. Atualiza depends_on em todos os outros .intent.yaml do workspace
  const intentFiles = findAllIntentFiles(workspaceRoot);
  for (const filePath of intentFiles) {
    if ('file://' + filePath === docUri) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes(oldModule)) continue;
      const fileLines = content.split('\n');
      const edits: TextEdit[] = [];
      fileLines.forEach((l, i) => {
        if (l.includes(oldModule)) {
          const col = l.indexOf(oldModule);
          edits.push({
            range: { start: { line: i, character: col }, end: { line: i, character: col + oldModule.length } },
            newText: newModule,
          });
        }
      });
      if (edits.length > 0) changes['file://' + filePath] = edits;
    } catch { /* skip */ }
  }

  return { changes };
});

// ── Autocomplete ──────────────────────────────────────────────────

connection.onCompletion(async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const text  = doc.getText();
  const lines = text.split('\n');
  const line  = lines[params.position.line] ?? '';

  // Autocomplete de campos top-level
  if (/^[a-z]*$/.test(line.trim())) {
    return [
      { label: 'intent',      kind: CompletionItemKind.Field, detail: 'Obrigatório — descrição da intenção' },
      { label: 'module',      kind: CompletionItemKind.Field, detail: 'Obrigatório — dominio/funcionalidade' },
      { label: 'constraints', kind: CompletionItemKind.Field, detail: 'Obrigatório — regras de negócio' },
      { label: 'acceptance',  kind: CompletionItemKind.Field, detail: 'Obrigatório — critérios de aceite' },
      { label: 'depends_on',  kind: CompletionItemKind.Field, detail: 'Opcional — dependências do módulo' },
      { label: 'language',    kind: CompletionItemKind.Field, detail: 'Opcional — linguagem de implementação' },
      { label: 'framework',   kind: CompletionItemKind.Field, detail: 'Opcional — framework alvo' },
      { label: 'tags',        kind: CompletionItemKind.Field, detail: 'Opcional — tags para o Intent Graph' },
      { label: 'version',     kind: CompletionItemKind.Field, detail: 'Opcional — versão semântica' },
    ];
  }

  // Autocomplete de linguagens
  if (line.trimStart().startsWith('language:')) {
    return VALID_LANGUAGES.map(lang => ({
      label: lang, kind: CompletionItemKind.EnumMember,
    }));
  }

  // Autocomplete de módulos existentes no workspace em depends_on/used_by
  if ((line.includes('- ') || line.match(/^\s+-\s*$/)) && workspaceRoot) {
    const parsed = yaml.load(text) as Record<string, unknown> | null;
    const inDepsContext = isInDepsContext(lines, params.position.line);
    if (inDepsContext) {
      const modules = findAllModuleKeys(workspaceRoot);
      return modules.map(m => ({
        label: m, kind: CompletionItemKind.Reference,
        detail: 'Módulo IDD disponível',
      }));
    }
  }

  return [];
});

// ── Helpers ───────────────────────────────────────────────────────

function zeroRange(): Range {
  return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
}

function lineRange(line: number): Range {
  const l = Math.max(0, line);
  return { start: { line: l, character: 0 }, end: { line: l, character: 200 } };
}

function findFieldLine(text: string, field: string): number {
  const lines = text.split('\n');
  return lines.findIndex(l => l.trimStart().startsWith(field + ':')) ?? 0;
}

function findAllIntentFiles(root: string): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !['node_modules', '.git', '.idd', 'dist'].includes(entry.name)) {
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.intent.yaml')) {
          results.push(full);
        }
      }
    } catch { /* skip */ }
  }
  walk(root);
  return results;
}

function findAllModuleKeys(root: string): string[] {
  return findAllIntentFiles(root).map(file => {
    try {
      const parsed = yaml.load(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
      return typeof parsed?.module === 'string' ? parsed.module : null;
    } catch { return null; }
  }).filter(Boolean) as string[];
}

function isInDepsContext(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const l = lines[i].trimEnd();
    if (/^(depends_on|used_by):/.test(l)) return true;
    if (/^\w+:/.test(l) && !/^(depends_on|used_by):/.test(l)) return false;
    if (l === '') return false;
  }
  return false;
}

// ── Start ─────────────────────────────────────────────────────────

documents.listen(connection);
connection.listen();
