// src/__tests__/context.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import MockDatabase from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';
import {
  resolveContext, formatContextForPrompt,
  clearCache, getCacheStats,
  type ContextResult,
} from '../lib/context.ts';

__setDatabaseConstructor(MockDatabase);

// ── Fixtures ─────────────────────────────────────────────────────

const DB_INTENT  = { module: 'db',       sub: 'connection', statement: 'Gerenciar pool de conexões com o banco' };
const USERS_INTENT = { module: 'users',  sub: 'crud',       statement: 'CRUD de usuários no banco de dados' };
const AUTH_INTENT  = { module: 'auth',   sub: 'login',      statement: 'Autenticar usuário com e-mail e senha' };
const DASHBOARD_INTENT = { module: 'dashboard', sub: 'access', statement: 'Controlar acesso ao dashboard' };

function seedStore(store: Store) {
  // Nível 3: db/connection (sem deps)
  const db = store.upsertIntent(DB_INTENT.module, DB_INTENT.sub, DB_INTENT.statement);
  store.setConstraints(db.id, ['max 10 conexões simultâneas', 'timeout de 30s']);
  store.addVersion(db.id, JSON.stringify({
    intent: DB_INTENT.statement, module: 'db/connection',
    constraints: ['max 10 conexões simultâneas', 'timeout de 30s'],
    acceptance: ['pool criado com max 10 conexões'],
    depends_on: [],
  }), 'hash-db-v1', 'claude-sonnet-4');

  // Nível 2: users/crud depende de db/connection
  const users = store.upsertIntent(USERS_INTENT.module, USERS_INTENT.sub, USERS_INTENT.statement);
  store.setConstraints(users.id, ['email deve ser único', 'senha nunca retornada em consultas']);
  store.addVersion(users.id, JSON.stringify({
    intent: USERS_INTENT.statement, module: 'users/crud',
    constraints: ['email deve ser único', 'senha nunca retornada em consultas'],
    acceptance: ['criar usuário retorna id', 'buscar por email'],
    depends_on: ['db/connection'],
  }), 'hash-users-v1', 'claude-sonnet-4');

  // Nível 1: auth/login depende de users/crud
  const auth = store.upsertIntent(AUTH_INTENT.module, AUTH_INTENT.sub, AUTH_INTENT.statement);
  store.setConstraints(auth.id, ['senha >= 8 chars', 'bloquear após 5 tentativas', 'JWT expira em 24h']);
  store.addVersion(auth.id, JSON.stringify({
    intent: AUTH_INTENT.statement, module: 'auth/login',
    constraints: ['senha >= 8 chars', 'bloquear após 5 tentativas', 'JWT expira em 24h'],
    acceptance: ['login válido retorna JWT', 'senha errada retorna 401'],
    depends_on: ['users/crud'],
  }), 'hash-auth-v1', 'claude-sonnet-4');

  // Nível 0: dashboard/access depende de auth/login
  const dash = store.upsertIntent(DASHBOARD_INTENT.module, DASHBOARD_INTENT.sub, DASHBOARD_INTENT.statement);
  store.setConstraints(dash.id, ['requer autenticação', 'sessão expira em 1h']);
  store.addVersion(dash.id, JSON.stringify({
    intent: DASHBOARD_INTENT.statement, module: 'dashboard/access',
    constraints: ['requer autenticação', 'sessão expira em 1h'],
    acceptance: ['usuário autenticado acessa', 'não autenticado redireciona'],
    depends_on: ['auth/login'],
  }), 'hash-dash-v1', 'claude-sonnet-4');

  return { db, users, auth, dash };
}

// ── Setup ────────────────────────────────────────────────────────

let tmpDir: string;
let store: Store;

beforeEach(() => {
  clearCache();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-ctx-'));
  store  = new Store(tmpDir);
  store.open();
});

afterEach(() => {
  try { store.close(); } catch {}
  fs.rmSync(tmpDir, { recursive: true, force: true });
  clearCache();
});

// ── Testes: resolução de 1 nível ─────────────────────────────────

describe('resolveContext — 1 nível', () => {
  it('resolve dependência direta corretamente', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['users/crud']);
    expect(ctx.deps).toHaveProperty('users/crud');
    expect(ctx.deps['users/crud'].statement).toContain('CRUD de usuários');
    expect(ctx.deps['users/crud'].constraints).toContain('email deve ser único');
    expect(ctx.deps['users/crud'].depth).toBe(1);
  });

  it('retorna deps vazio quando módulo não existe', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['inexistente/modulo']);
    expect(Object.keys(ctx.deps)).toHaveLength(0);
  });

  it('retorna deps vazio quando lista está vazia', async () => {
    const ctx = await resolveContext(store, []);
    expect(Object.keys(ctx.deps)).toHaveLength(0);
    expect(ctx.conflicts).toHaveLength(0);
  });

  it('resolve múltiplas dependências diretas', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['users/crud', 'db/connection']);
    expect(Object.keys(ctx.deps)).toHaveLength(2);
    expect(ctx.deps['users/crud']).toBeDefined();
    expect(ctx.deps['db/connection']).toBeDefined();
  });
});

// ── Testes: resolução transitiva ─────────────────────────────────

describe('resolveContext — resolução transitiva', () => {
  it('resolve 2 níveis: auth/login → users/crud', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['auth/login']);
    expect(ctx.deps).toHaveProperty('auth/login');
    expect(ctx.deps).toHaveProperty('users/crud');
    expect(ctx.deps['auth/login'].depth).toBe(1);
    expect(ctx.deps['users/crud'].depth).toBe(2);
  });

  it('resolve 3 níveis: auth/login → users/crud → db/connection', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['auth/login'], { maxDepth: 3 });
    expect(ctx.deps).toHaveProperty('auth/login');
    expect(ctx.deps).toHaveProperty('users/crud');
    expect(ctx.deps).toHaveProperty('db/connection');
    expect(ctx.deps['db/connection'].depth).toBe(3);
    expect(ctx.depth_max).toBe(3);
  });

  it('não ultrapassa maxDepth=1 quando configurado', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['auth/login'], { maxDepth: 1 });
    expect(ctx.deps).toHaveProperty('auth/login');
    expect(ctx.deps).not.toHaveProperty('users/crud');
    expect(ctx.deps).not.toHaveProperty('db/connection');
  });

  it('não ultrapassa maxDepth=2', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['auth/login'], { maxDepth: 2 });
    expect(ctx.deps).toHaveProperty('auth/login');
    expect(ctx.deps).toHaveProperty('users/crud');
    expect(ctx.deps).not.toHaveProperty('db/connection');
  });

  it('não entra em loop em grafo cíclico', async () => {
    // Cria ciclo: A → B → A
    const a = store.upsertIntent('mod', 'a', 'Módulo A');
    const b = store.upsertIntent('mod', 'b', 'Módulo B');
    store.addVersion(a.id, JSON.stringify({
      intent: 'A', module: 'mod/a', constraints: ['c1'], acceptance: ['a1'],
      depends_on: ['mod/b'],
    }), 'hash-a', 'model');
    store.addVersion(b.id, JSON.stringify({
      intent: 'B', module: 'mod/b', constraints: ['c2'], acceptance: ['a2'],
      depends_on: ['mod/a'], // ciclo!
    }), 'hash-b', 'model');

    // Não deve lançar nem travar — deve retornar com os dois nós
    const ctx = await resolveContext(store, ['mod/a'], { maxDepth: 5 });
    expect(ctx.deps).toHaveProperty('mod/a');
    expect(ctx.deps).toHaveProperty('mod/b');
    expect(Object.keys(ctx.deps)).toHaveLength(2); // sem duplicatas
  });

  it('depth_max reflete profundidade real atingida', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['auth/login'], { maxDepth: 3 });
    expect(ctx.depth_max).toBe(3);
  });
});

// ── Testes: cache ────────────────────────────────────────────────

describe('resolveContext — cache por hash', () => {
  it('segunda chamada idêntica usa cache', async () => {
    seedStore(store);
    await resolveContext(store, ['users/crud']);

    // Segunda chamada
    const ctx2 = await resolveContext(store, ['users/crud']);
    expect(ctx2.cached).toContain('users/crud');
    expect(ctx2.resolved).not.toContain('users/crud');
  });

  it('cache é invalidado quando hash muda', async () => {
    seedStore(store);

    // Primeira resolução
    const ctx1 = await resolveContext(store, ['users/crud']);
    expect(ctx1.resolved).toContain('users/crud');

    // Simula mudança na intenção: nova versão com hash diferente
    const intent = store.getIntent('users', 'crud')!;
    store.addVersion(intent.id, JSON.stringify({
      intent: USERS_INTENT.statement, module: 'users/crud',
      constraints: ['email único', 'senha protegida', 'novo constraint'],
      acceptance: ['criar usuário', 'buscar por email'],
      depends_on: ['db/connection'],
    }), 'hash-users-v2-NOVO', 'claude-sonnet-4');

    // Segunda resolução deve re-buscar (hash mudou)
    const ctx2 = await resolveContext(store, ['users/crud']);
    expect(ctx2.resolved).toContain('users/crud');
    expect(ctx2.cached).not.toContain('users/crud');
  });

  it('noCache: true ignora o cache completamente', async () => {
    seedStore(store);
    await resolveContext(store, ['users/crud']);

    const ctx2 = await resolveContext(store, ['users/crud'], { noCache: true });
    expect(ctx2.resolved).toContain('users/crud');
    expect(ctx2.cached).not.toContain('users/crud');
  });

  it('getCacheStats retorna entradas corretas', async () => {
    seedStore(store);
    await resolveContext(store, ['auth/login'], { maxDepth: 3 });

    const stats = getCacheStats();
    expect(stats.size).toBeGreaterThanOrEqual(3); // auth/login + users/crud + db/connection
    expect(stats.entries[0]).toHaveProperty('key');
    expect(stats.entries[0]).toHaveProperty('hash');
    expect(stats.entries[0]).toHaveProperty('age_s');
  });

  it('clearCache reseta o cache', async () => {
    seedStore(store);
    await resolveContext(store, ['users/crud']);
    expect(getCacheStats().size).toBeGreaterThan(0);

    clearCache();
    expect(getCacheStats().size).toBe(0);
  });
});

// ── Testes: detecção de conflitos ────────────────────────────────

describe('resolveContext — detecção de conflitos', () => {
  it('sem conflitos em deps compatíveis', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['auth/login'], { maxDepth: 3 });
    expect(ctx.conflicts).toHaveLength(0);
  });

  it('detecta conflito de JWT expiração inconsistente', async () => {
    const m1 = store.upsertIntent('auth', 'mobile', 'Auth mobile');
    const m2 = store.upsertIntent('auth', 'web',    'Auth web');
    store.addVersion(m1.id, JSON.stringify({
      intent: 'Auth mobile', module: 'auth/mobile',
      constraints: ['JWT expira em 1h'], acceptance: ['token válido'],
      depends_on: [],
    }), 'hash-mobile', 'model');
    store.addVersion(m2.id, JSON.stringify({
      intent: 'Auth web', module: 'auth/web',
      constraints: ['JWT expira em 24h'], acceptance: ['token válido'],
      depends_on: [],
    }), 'hash-web', 'model');

    const ctx = await resolveContext(store, ['auth/mobile', 'auth/web']);
    expect(ctx.conflicts.length).toBeGreaterThan(0);
    const conflict = ctx.conflicts[0];
    expect(conflict.reason).toContain('JWT');
    expect([conflict.module_a, conflict.module_b]).toContain('auth/mobile');
    expect([conflict.module_a, conflict.module_b]).toContain('auth/web');
  });

  it('detecta conflito de soft vs hard delete', async () => {
    const m1 = store.upsertIntent('users', 'soft',  'Usuários com soft delete');
    const m2 = store.upsertIntent('users', 'hard',  'Usuários com hard delete');
    store.addVersion(m1.id, JSON.stringify({
      intent: 'Soft', module: 'users/soft',
      constraints: ['soft delete — nunca remover fisicamente'], acceptance: ['a'],
      depends_on: [],
    }), 'hash-s', 'model');
    store.addVersion(m2.id, JSON.stringify({
      intent: 'Hard', module: 'users/hard',
      constraints: ['delete permanente do banco'], acceptance: ['a'],
      depends_on: [],
    }), 'hash-h', 'model');

    const ctx = await resolveContext(store, ['users/soft', 'users/hard']);
    expect(ctx.conflicts.length).toBeGreaterThan(0);
    expect(ctx.conflicts[0].reason).toContain('delete');
  });
});

// ── Testes: formatContextForPrompt ───────────────────────────────

describe('formatContextForPrompt', () => {
  it('retorna string vazia quando sem deps', () => {
    const ctx: ContextResult = { deps: {}, conflicts: [], cached: [], resolved: [], depth_max: 0 };
    expect(formatContextForPrompt(ctx)).toBe('');
  });

  it('inclui cabeçalho CONTEXTO DAS DEPENDÊNCIAS', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['users/crud']);
    const prompt = formatContextForPrompt(ctx);
    expect(prompt).toContain('CONTEXTO DAS DEPENDÊNCIAS');
  });

  it('inclui statement de cada dependência', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['users/crud']);
    const prompt = formatContextForPrompt(ctx);
    expect(prompt).toContain('CRUD de usuários');
  });

  it('inclui constraints de cada dependência', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['users/crud']);
    const prompt = formatContextForPrompt(ctx);
    expect(prompt).toContain('email deve ser único');
  });

  it('inclui aviso de conflito quando detectado', async () => {
    const m1 = store.upsertIntent('a', 'x', 'A');
    const m2 = store.upsertIntent('b', 'y', 'B');
    store.addVersion(m1.id, JSON.stringify({ intent: 'A', module: 'a/x', constraints: ['JWT expira em 1h'], acceptance: [], depends_on: [] }), 'h1', 'm');
    store.addVersion(m2.id, JSON.stringify({ intent: 'B', module: 'b/y', constraints: ['JWT expira em 24h'], acceptance: [], depends_on: [] }), 'h2', 'm');
    const ctx = await resolveContext(store, ['a/x', 'b/y']);
    const prompt = formatContextForPrompt(ctx);
    expect(prompt).toContain('CONFLITOS');
  });

  it('deps transitivas aparecem com indentação de profundidade', async () => {
    seedStore(store);
    const ctx = await resolveContext(store, ['auth/login'], { maxDepth: 3 });
    const prompt = formatContextForPrompt(ctx);
    // auth/login está em profundidade 1 (sem indentação)
    expect(prompt).toContain('[auth/login]');
    // users/crud está em profundidade 2 (1 nível de indentação)
    expect(prompt).toContain('  [users/crud]');
    // db/connection está em profundidade 3 (2 níveis de indentação)
    expect(prompt).toContain('    [db/connection]');
  });
});
