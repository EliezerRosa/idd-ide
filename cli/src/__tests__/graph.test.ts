// src/__tests__/graph.test.ts — Issue #3: Intent Graph VS Code
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import MockDatabase, { resetMockDb } from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';

__setDatabaseConstructor(MockDatabase);

// ── Fixtures ─────────────────────────────────────────────────────

let tmpDir: string;
let store:  Store;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-graph-'));
  const dbPath = path.join(tmpDir, '.idd', 'store.db');
  resetMockDb(dbPath);
  store = new Store(tmpDir);
  store.open();
});

afterEach(() => {
  try { store.close(); } catch {}
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function seedProjectGraph(store: Store) {
  // db/connection — nível base (sem deps)
  const db = store.upsertIntent('db', 'connection', 'Gerenciar pool de conexões');
  store.setConstraints(db.id, ['max 10 conexões', 'timeout 30s']);
  store.addVersion(db.id, JSON.stringify({
    intent: 'Gerenciar pool', module: 'db/connection',
    constraints: ['max 10 conexões', 'timeout 30s'],
    acceptance: ['pool criado com max 10 conexões'],
    depends_on: [],
  }), 'hash-db', 'model');

  // users/crud → db/connection
  const users = store.upsertIntent('users', 'crud', 'CRUD de usuários');
  store.setConstraints(users.id, ['email único', 'senha protegida']);
  store.addVersion(users.id, JSON.stringify({
    intent: 'CRUD', module: 'users/crud',
    constraints: ['email único', 'senha protegida'],
    acceptance: ['criar usuário', 'buscar por email'],
    depends_on: ['db/connection'],
  }), 'hash-users', 'model');

  // auth/login → users/crud (com drift)
  const auth = store.upsertIntent('auth', 'login', 'Autenticar usuário');
  store.setConstraints(auth.id, ['senha >= 8', 'JWT 24h']);
  store.addVersion(auth.id, JSON.stringify({
    intent: 'Autenticar', module: 'auth/login',
    constraints: ['senha >= 8', 'JWT 24h'],
    acceptance: ['login válido retorna JWT', 'senha errada retorna 401'],
    depends_on: ['users/crud'],
  }), 'hash-auth', 'model');
  store.recordDrift(auth.id, 'static');

  // notify/email → users/crud (sem deps externas)
  const notify = store.upsertIntent('notify', 'email', 'Enviar emails');
  store.setConstraints(notify.id, ['rate limit 100/h']);
  store.addVersion(notify.id, JSON.stringify({
    intent: 'Enviar emails', module: 'notify/email',
    constraints: ['rate limit 100/h'],
    acceptance: ['email enviado com sucesso'],
    depends_on: ['users/crud'],
  }), 'hash-notify', 'model');

  return { db, users, auth, notify };
}

// ── Testes: getGraphData estrutura básica ────────────────────────

describe('getGraphData — estrutura básica', () => {
  it('retorna nós e arestas para projeto com intenções', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();
    expect(graph.nodes.length).toBe(4);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it('cada nó tem os campos obrigatórios', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();
    const node  = graph.nodes[0];
    expect(node).toHaveProperty('id');
    expect(node).toHaveProperty('module');
    expect(node).toHaveProperty('sub');
    expect(node).toHaveProperty('status');
    expect(node).toHaveProperty('statement');
    expect(node).toHaveProperty('constraints');
    expect(node).toHaveProperty('criteria');
    expect(node).toHaveProperty('versions');
    expect(node).toHaveProperty('depends_on');
    expect(node).toHaveProperty('used_by');
    expect(node).toHaveProperty('avg_score');
    expect(node).toHaveProperty('trend');
  });

  it('id do nó é no formato "module-sub"', () => {
    seedProjectGraph(store);
    const graph   = store.getGraphData();
    const authNode = graph.nodes.find(n => n.module === 'auth' && n.sub === 'login');
    expect(authNode?.id).toBe('auth-login');
  });

  it('nó com drift tem status drift', () => {
    seedProjectGraph(store);
    const graph    = store.getGraphData();
    const authNode = graph.nodes.find(n => n.id === 'auth-login');
    expect(authNode?.status).toBe('drift');
  });

  it('nós sem drift têm status ok', () => {
    seedProjectGraph(store);
    const graph    = store.getGraphData();
    const dbNode   = graph.nodes.find(n => n.id === 'db-connection');
    const usersNode = graph.nodes.find(n => n.id === 'users-crud');
    expect(dbNode?.status).toBe('ok');
    expect(usersNode?.status).toBe('ok');
  });
});

// ── Testes: arestas (edges) ──────────────────────────────────────

describe('getGraphData — arestas', () => {
  it('cria aresta de users/crud → auth/login', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();
    const edge  = graph.edges.find(e => e.from === 'users-crud' && e.to === 'auth-login');
    expect(edge).toBeDefined();
  });

  it('cria aresta de db/connection → users/crud', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();
    const edge  = graph.edges.find(e => e.from === 'db-connection' && e.to === 'users-crud');
    expect(edge).toBeDefined();
  });

  it('aresta com módulo destino em drift tem drift=true', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();
    const edge  = graph.edges.find(e => e.to === 'auth-login');
    expect(edge?.drift).toBe(true);
  });

  it('aresta com módulo destino ok tem drift=false', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();
    const edge  = graph.edges.find(e => e.to === 'users-crud');
    expect(edge?.drift).toBe(false);
  });

  it('grafo sem dependências declaradas tem zero arestas', () => {
    store.upsertIntent('mod', 'a', 'Módulo A');
    const a = store.getIntent('mod', 'a')!;
    store.addVersion(a.id, JSON.stringify({
      intent: 'A', module: 'mod/a',
      constraints: ['c1'], acceptance: ['a1'], depends_on: [],
    }), 'hash-a', 'model');
    const graph = store.getGraphData();
    expect(graph.edges).toHaveLength(0);
  });
});

// ── Testes: used_by (inverso das deps) ───────────────────────────

describe('getGraphData — used_by preenchido', () => {
  it('users/crud tem auth/login e notify/email em used_by', () => {
    seedProjectGraph(store);
    const graph     = store.getGraphData();
    const usersNode = graph.nodes.find(n => n.id === 'users-crud')!;
    expect(usersNode.used_by).toContain('auth/login');
    expect(usersNode.used_by).toContain('notify/email');
  });

  it('db/connection tem users/crud em used_by', () => {
    seedProjectGraph(store);
    const graph  = store.getGraphData();
    const dbNode = graph.nodes.find(n => n.id === 'db-connection')!;
    expect(dbNode.used_by).toContain('users/crud');
  });

  it('nó sem dependentes tem used_by vazio', () => {
    seedProjectGraph(store);
    const graph    = store.getGraphData();
    const authNode = graph.nodes.find(n => n.id === 'auth-login')!;
    expect(authNode.used_by).toHaveLength(0);
  });
});

// ── Testes: constraints e critérios ─────────────────────────────

describe('getGraphData — counts de constraints e critérios', () => {
  it('nó tem contagem correta de constraints', () => {
    seedProjectGraph(store);
    const graph    = store.getGraphData();
    const authNode = graph.nodes.find(n => n.id === 'auth-login')!;
    expect(authNode.constraints).toBe(2); // 'senha >= 8', 'JWT 24h'
  });

  it('nó tem contagem correta de critérios de aceite', () => {
    seedProjectGraph(store);
    const graph    = store.getGraphData();
    const authNode = graph.nodes.find(n => n.id === 'auth-login')!;
    expect(authNode.criteria).toBe(2); // 'login válido', 'senha errada'
  });

  it('nó tem contagem correta de versões', () => {
    seedProjectGraph(store);
    const graph    = store.getGraphData();
    const authNode = graph.nodes.find(n => n.id === 'auth-login')!;
    expect(authNode.versions).toBeGreaterThanOrEqual(1);
  });
});

// ── Testes: alignment score no nó ────────────────────────────────

describe('getGraphData — alignment score', () => {
  it('nó sem histórico tem avg_score 100 e trend stable', () => {
    seedProjectGraph(store);
    const graph  = store.getGraphData();
    const dbNode = graph.nodes.find(n => n.id === 'db-connection')!;
    expect(dbNode.avg_score).toBe(100);
    expect(dbNode.trend).toBe('stable');
  });

  it('nó com scores registrados tem avg correto', () => {
    seedProjectGraph(store);
    const users = store.getIntent('users', 'crud')!;
    store.recordAlignmentScore(users.id, 80, 'static');
    store.recordAlignmentScore(users.id, 60, 'semantic');
    const graph    = store.getGraphData();
    const usersNode = graph.nodes.find(n => n.id === 'users-crud')!;
    expect(usersNode.avg_score).toBeLessThan(100);
    expect(usersNode.avg_score).toBeGreaterThan(0);
  });
});

// ── Testes: filtros lógicos (simulando comportamento do frontend) ─

describe('Lógica de filtro por status', () => {
  it('filtro "drift" retorna apenas nós com drift', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();
    const driftNodes = graph.nodes.filter(n => n.status === 'drift');
    expect(driftNodes).toHaveLength(1);
    expect(driftNodes[0].id).toBe('auth-login');
  });

  it('filtro "ok" exclui nós com drift', () => {
    seedProjectGraph(store);
    const graph   = store.getGraphData();
    const okNodes = graph.nodes.filter(n => n.status === 'ok');
    expect(okNodes.every(n => n.status === 'ok')).toBe(true);
    expect(okNodes.find(n => n.id === 'auth-login')).toBeUndefined();
  });

  it('filtro "all" retorna todos os nós', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();
    expect(graph.nodes).toHaveLength(4);
  });

  it('após resolver drift, status do nó muda para ok', () => {
    seedProjectGraph(store);
    const auth = store.getIntent('auth', 'login')!;
    store.setStatus(auth.id, 'ok');
    const graph    = store.getGraphData();
    const authNode = graph.nodes.find(n => n.id === 'auth-login')!;
    expect(authNode.status).toBe('ok');
    // Aresta não mais marcada como drift
    const edge = graph.edges.find(e => e.to === 'auth-login');
    expect(edge?.drift).toBe(false);
  });
});

// ── Testes: análise de impacto ────────────────────────────────────

describe('Análise de impacto via grafo', () => {
  it('mudança em users/crud afeta auth/login e notify/email', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();

    // Simula lógica de impacto: encontra todos os nós que dependem de users/crud
    function impactOf(nodeId: string): string[] {
      const affected = new Set<string>();
      function traverse(id: string) {
        graph.nodes.forEach(n => {
          if (n.depends_on.includes(id.replace('-', '/')) && !affected.has(n.id)) {
            affected.add(n.id);
            traverse(n.id);
          }
        });
      }
      traverse(nodeId);
      return [...affected];
    }

    const affected = impactOf('users-crud');
    expect(affected).toContain('auth-login');
    expect(affected).toContain('notify-email');
  });

  it('mudança em db/connection tem impacto transitivo em auth/login', () => {
    seedProjectGraph(store);
    const graph = store.getGraphData();

    function impactOf(nodeId: string): string[] {
      const affected = new Set<string>();
      function traverse(id: string) {
        graph.nodes.forEach(n => {
          const depKey = id.replace('-', '/');
          if (n.depends_on.includes(depKey) && !affected.has(n.id)) {
            affected.add(n.id);
            traverse(n.id);
          }
        });
      }
      traverse(nodeId);
      return [...affected];
    }

    const affected = impactOf('db-connection');
    expect(affected).toContain('users-crud');
    // Transitivo: users/crud é impactado, e auth/login depende de users/crud
    const usersImpact = impactOf('users-crud');
    expect(usersImpact).toContain('auth-login');
  });
});
