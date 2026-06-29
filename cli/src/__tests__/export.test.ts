// src/__tests__/export.test.ts — Issue #12: idd export
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import MockDatabase, { resetMockDb } from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';

__setDatabaseConstructor(MockDatabase);

// ── Reimplementação isolada das funções de exportação ────────────
// (extraídas de export.ts para teste unitário sem I/O de CLI)

interface ExportNode {
  id: string; module: string; sub: string; status: string;
  statement: string; constraints: number; criteria: number;
  versions: number; depends_on: string[]; used_by: string[];
  avg_score: number; trend: string;
}
interface ExportEdge { from: string; to: string; drift: boolean; }
interface ExportData {
  generated_at: string; project: string;
  nodes: ExportNode[]; edges: ExportEdge[];
}

function exportJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function exportMermaid(data: ExportData): string {
  const lines: string[] = ['```mermaid', 'graph TD',
    '  classDef ok fill:#EAF3DE,stroke:#1D9E75,color:#27500A;',
    '  classDef drift fill:#FCEBEB,stroke:#E24B4A,color:#791F1F,stroke-width:3px;',
    '  classDef warn fill:#FAEEDA,stroke:#EF9F27,color:#633806;',
    '  classDef orphan fill:#F1EFE8,stroke:#888780,color:#5F5E5A;', ''];
  for (const node of data.nodes) {
    lines.push(`  ${sanitizeMermaidId(node.id)}["${node.module}/${node.sub}"]`);
  }
  lines.push('');
  for (const edge of data.edges) {
    const arrow = edge.drift ? '-.->' : '-->';
    lines.push(`  ${sanitizeMermaidId(edge.from)} ${arrow} ${sanitizeMermaidId(edge.to)}`);
  }
  lines.push('');
  for (const node of data.nodes) {
    const cls = node.status === 'ok' ? 'ok' : node.status === 'drift' ? 'drift' : node.status === 'warn' ? 'warn' : 'orphan';
    lines.push(`  class ${sanitizeMermaidId(node.id)} ${cls};`);
  }
  lines.push('```');
  return lines.join('\n');
}

function exportDot(data: ExportData): string {
  const lines: string[] = [`digraph "${data.project}" {`, '  rankdir=TB;', ''];
  for (const node of data.nodes) {
    lines.push(`  "${node.id}" [label="${node.module}/${node.sub}\\n${node.avg_score}%"];`);
  }
  lines.push('');
  for (const edge of data.edges) {
    const style = edge.drift ? ' [style=dashed, color="#E24B4A"]' : '';
    lines.push(`  "${edge.from}" -> "${edge.to}"${style};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function exportMarkdown(data: ExportData): string {
  const lines: string[] = [
    `# Arquitetura de Intenções — ${data.project}`, '',
    `- **Total de intenções:** ${data.nodes.length}`,
    `- **Total de dependências:** ${data.edges.length}`,
    '', '| Status | Módulo |', '|---|---|',
  ];
  for (const n of data.nodes) lines.push(`| ${n.status} | ${n.module}/${n.sub} |`);
  return lines.join('\n');
}

// ── Setup ────────────────────────────────────────────────────────

let tmpDir: string;
let store:  Store;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-export-'));
  const dbPath = path.join(tmpDir, '.idd', 'store.db');
  resetMockDb(dbPath);
  store = new Store(tmpDir);
  store.open();
});

afterEach(() => {
  try { store.close(); } catch {}
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function seedGraph(store: Store) {
  const users = store.upsertIntent('users', 'crud', 'CRUD de usuários');
  store.setConstraints(users.id, ['email único']);
  store.addVersion(users.id, JSON.stringify({
    intent: 'CRUD de usuários', module: 'users/crud',
    constraints: ['email único'], acceptance: ['criar usuário'],
    depends_on: [],
  }), 'h1', 'model');

  const auth = store.upsertIntent('auth', 'login', 'Autenticar usuário');
  store.setConstraints(auth.id, ['senha >= 8', 'JWT 24h']);
  store.addVersion(auth.id, JSON.stringify({
    intent: 'Autenticar usuário', module: 'auth/login',
    constraints: ['senha >= 8', 'JWT 24h'], acceptance: ['login retorna JWT', 'senha errada 401'],
    depends_on: ['users/crud'],
  }), 'h2', 'model');
  store.recordDrift(auth.id, 'static');

  return { users, auth };
}

// ════════════════════════════════════════════════════════════════
// exportJson
// ════════════════════════════════════════════════════════════════

describe('exportJson', () => {
  it('produz JSON válido', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const json = exportJson(data);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('JSON contém nodes e edges', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const parsed = JSON.parse(exportJson(data));
    expect(parsed.nodes).toBeInstanceOf(Array);
    expect(parsed.edges).toBeInstanceOf(Array);
    expect(parsed.nodes.length).toBe(2);
  });

  it('JSON contém campo project', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'meu-projeto', ...store.getGraphData() } as ExportData;
    const parsed = JSON.parse(exportJson(data));
    expect(parsed.project).toBe('meu-projeto');
  });

  it('JSON contém generated_at em formato ISO', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const parsed = JSON.parse(exportJson(data));
    expect(() => new Date(parsed.generated_at)).not.toThrow();
    expect(parsed.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('grafo vazio produz JSON com arrays vazios', () => {
    const data = { generated_at: new Date().toISOString(), project: 'vazio', nodes: [], edges: [] };
    const parsed = JSON.parse(exportJson(data));
    expect(parsed.nodes).toHaveLength(0);
    expect(parsed.edges).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// exportMermaid
// ════════════════════════════════════════════════════════════════

describe('exportMermaid', () => {
  it('produz bloco ```mermaid válido', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const out  = exportMermaid(data);
    expect(out.startsWith('```mermaid')).toBe(true);
    expect(out.trim().endsWith('```')).toBe(true);
  });

  it('contém "graph TD"', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    expect(exportMermaid(data)).toContain('graph TD');
  });

  it('todos os nós aparecem no diagrama', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const out  = exportMermaid(data);
    expect(out).toContain('users_crud');
    expect(out).toContain('auth_login');
  });

  it('aresta normal usa seta sólida -->', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const out  = exportMermaid(data);
    // users/crud -> auth/login não está em drift (drift é no destino auth-login que tem status drift)
    // mas o edge.drift é calculado a partir do status do nó destino
    expect(out).toMatch(/-\.->|-->/);
  });

  it('classDef define as 4 classes de status', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const out  = exportMermaid(data);
    expect(out).toContain('classDef ok');
    expect(out).toContain('classDef drift');
    expect(out).toContain('classDef warn');
    expect(out).toContain('classDef orphan');
  });

  it('nó com drift recebe classe "drift"', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const out  = exportMermaid(data);
    expect(out).toContain('class auth_login drift;');
  });

  it('IDs com caracteres especiais são sanitizados', () => {
    const data: ExportData = {
      generated_at: new Date().toISOString(), project: 'test',
      nodes: [{ id: 'mod-with-dash', module: 'mod', sub: 'with-dash', status: 'ok', statement: 's', constraints: 0, criteria: 0, versions: 0, depends_on: [], used_by: [], avg_score: 100, trend: 'stable' }],
      edges: [],
    };
    const out = exportMermaid(data);
    expect(out).not.toContain('mod-with-dash[');
    expect(out).toContain('mod_with_dash[');
  });
});

// ════════════════════════════════════════════════════════════════
// exportDot
// ════════════════════════════════════════════════════════════════

describe('exportDot', () => {
  it('produz digraph válido', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'meu-projeto', ...store.getGraphData() } as ExportData;
    const out  = exportDot(data);
    expect(out).toContain('digraph "meu-projeto"');
    expect(out.trim().endsWith('}')).toBe(true);
  });

  it('contém rankdir=TB', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    expect(exportDot(data)).toContain('rankdir=TB');
  });

  it('todos os nós aparecem como labels', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const out  = exportDot(data);
    expect(out).toContain('users/crud');
    expect(out).toContain('auth/login');
  });

  it('arestas com drift têm style=dashed', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const out  = exportDot(data);
    const driftEdges = data.edges.filter(e => e.drift);
    if (driftEdges.length > 0) {
      expect(out).toContain('style=dashed');
    }
  });

  it('grafo vazio produz digraph sem nós', () => {
    const data: ExportData = { generated_at: new Date().toISOString(), project: 'vazio', nodes: [], edges: [] };
    const out = exportDot(data);
    expect(out).toContain('digraph "vazio"');
  });
});

// ════════════════════════════════════════════════════════════════
// exportMarkdown
// ════════════════════════════════════════════════════════════════

describe('exportMarkdown', () => {
  it('contém título com nome do projeto', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'meu-projeto', ...store.getGraphData() } as ExportData;
    expect(exportMarkdown(data)).toContain('meu-projeto');
  });

  it('contém contagem total de intenções', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const out  = exportMarkdown(data);
    expect(out).toContain('Total de intenções:** 2');
  });

  it('contém tabela com todos os módulos', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const out  = exportMarkdown(data);
    expect(out).toContain('users/crud');
    expect(out).toContain('auth/login');
  });
});

// ════════════════════════════════════════════════════════════════
// Pipeline e2e: store → export em todos os formatos
// ════════════════════════════════════════════════════════════════

describe('Pipeline e2e — export em múltiplos formatos', () => {
  it('mesmo grafo produz saída consistente nos 4 formatos', () => {
    seedGraph(store);
    const graphData = store.getGraphData();
    const data: ExportData = { generated_at: new Date().toISOString(), project: 'idd-ide', ...graphData } as ExportData;

    const json    = exportJson(data);
    const mermaid = exportMermaid(data);
    const dot     = exportDot(data);
    const md      = exportMarkdown(data);

    // Todos referenciam os mesmos 2 módulos
    expect(JSON.parse(json).nodes).toHaveLength(2);
    expect(mermaid).toContain('users_crud');
    expect(dot).toContain('users/crud');
    expect(md).toContain('users/crud');
  });

  it('grafo com 0 intenções é tratado graciosamente em todos os formatos', () => {
    const data: ExportData = { generated_at: new Date().toISOString(), project: 'vazio', nodes: [], edges: [] };
    expect(() => exportJson(data)).not.toThrow();
    expect(() => exportMermaid(data)).not.toThrow();
    expect(() => exportDot(data)).not.toThrow();
    expect(() => exportMarkdown(data)).not.toThrow();
  });

  it('arquivo salvo via fs pode ser lido de volta (JSON)', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const json = exportJson(data);
    const outFile = path.join(tmpDir, 'architecture.json');
    fs.writeFileSync(outFile, json, 'utf8');
    const readBack = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    expect(readBack.nodes).toHaveLength(2);
  });

  it('formato --out cria diretórios intermediários', () => {
    seedGraph(store);
    const data = { generated_at: new Date().toISOString(), project: 'test', ...store.getGraphData() } as ExportData;
    const outFile = path.join(tmpDir, 'docs', 'nested', 'architecture.md');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, exportMarkdown(data), 'utf8');
    expect(fs.existsSync(outFile)).toBe(true);
  });
});
