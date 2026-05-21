// src/__tests__/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { getLangConfig, runStaticChecks, generateTestScaffold } from '../lib/lang.ts';
import MockDatabase, { resetMockDb } from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';

// Injeta o mock antes de qualquer teste
__setDatabaseConstructor(MockDatabase);

// ── Fixtures ──────────────────────────────────────────────────────

const INTENT_USERS_CRUD = {
  intent:      'Gerenciar usuários no banco de dados (criar, ler, atualizar, remover)',
  module:      'users/crud',
  constraints: ['email deve ser único', 'senha nunca retornada em consultas'],
  acceptance:  ['criar usuário com e-mail único', 'buscar usuário por e-mail'],
  depends_on:  [] as string[],
  language:    'typescript' as const,
};

const INTENT_AUTH_LOGIN = {
  intent:      'Autenticar usuário com e-mail e senha, retornando JWT válido por 24h',
  module:      'auth/login',
  constraints: ['bloquear após 5 tentativas', 'JWT expira em 24h', 'nunca logar senha'],
  acceptance:  [
    'login válido retorna 200 + JWT',
    'senha errada retorna 401',
    '5ª tentativa bloqueia conta',
    'token decodificado contém userId',
  ],
  depends_on:  ['users/crud'],
  language:    'typescript' as const,
};

// ── Helpers ───────────────────────────────────────────────────────

let testCounter = 0;

function freshStore(): { store: Store; tmpDir: string; dbPath: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `idd-test-${++testCounter}-`));
  // Default dbPath: tmpDir/.idd/store.db — unique because tmpDir is unique
  const dbPath = path.join(tmpDir, '.idd', 'store.db');
  resetMockDb(dbPath);  // clear any stale state for this path
  const store = new Store(tmpDir);
  store.open();
  return { store, tmpDir, dbPath };
}

function cleanup(store: Store, tmpDir: string, dbPath: string): void {
  try { store.close(); } catch {}
  resetMockDb(dbPath);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}

// ── Pipeline: Captura → Store → Context Manager ───────────────────

describe('Pipeline Captura → Store → Context Manager', () => {

  it('registra dependência e resolve contexto corretamente', () => {
    const { store, tmpDir, dbPath } = freshStore();
    console.log('dbPath:', dbPath);
    try {
      const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
      console.log('upserted:', users?.id, users?.module);
      const list = store.listIntents();
      console.log('listIntents count:', list.length);
      expect(users).toBeDefined();
      expect(users.module).toBe('users');

      store.setConstraints(users.id, INTENT_USERS_CRUD.constraints);
      store.addVersion(users.id, JSON.stringify(INTENT_USERS_CRUD), 'hash-users', 'claude-sonnet-4');

      // getIntent deve encontrar o registro
      const found = store.getIntent('users', 'crud');
      expect(found).toBeDefined();
      expect(found!.statement).toContain('Gerenciar usuários');

      // Context Manager resolve dependência
      const ctx = store.getDependencyContext(['users/crud']);
      expect(ctx).toHaveProperty('users/crud');
      expect(ctx['users/crud'].constraints).toContain('email deve ser único');
    } finally {
      cleanup(store, tmpDir, dbPath);
    }
  });

  it('contexto vazio quando dependência não registrada', () => {
    const { store, tmpDir, dbPath } = freshStore();
    try {
      const ctx = store.getDependencyContext(['payments/process']);
      expect(ctx).toEqual({});
    } finally {
      cleanup(store, tmpDir, dbPath);
    }
  });

  it('registra auth/login com dependência resolvida e versão correta', () => {
    const { store, tmpDir, dbPath } = freshStore();
    try {
      // Registra users/crud
      const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
      store.setConstraints(users.id, INTENT_USERS_CRUD.constraints);
      store.addVersion(users.id, JSON.stringify(INTENT_USERS_CRUD), 'hash-u', 'model');

      // Registra auth/login
      const login = store.upsertIntent('auth', 'login', INTENT_AUTH_LOGIN.intent);
      store.setConstraints(login.id, INTENT_AUTH_LOGIN.constraints);
      store.addVersion(login.id, JSON.stringify(INTENT_AUTH_LOGIN), 'hash-l', 'model');

      // Ambos encontráveis
      expect(store.getIntent('users', 'crud')).toBeDefined();
      expect(store.getIntent('auth', 'login')).toBeDefined();

      // Versão da dependência
      const ctx = store.getDependencyContext(['users/crud']);
      expect(ctx['users/crud'].version).toBe('0.0.1');

      // Lista completa
      const all = store.listIntents();
      expect(all.length).toBe(2);
    } finally {
      cleanup(store, tmpDir, dbPath);
    }
  });
});

// ── Pipeline: Geração de Artefatos ───────────────────────────────

describe('Pipeline Geração de Artefatos', () => {

  it('gera estrutura de arquivos correta para TypeScript', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-artifacts-'));
    try {
      const cfg    = getLangConfig('typescript');
      const modDir = path.join(tmpDir, 'src', 'auth');
      fs.mkdirSync(modDir, { recursive: true });

      const code  = `export async function login() { return signJWT({}, "24h"); }`;
      const tests = `import { it, expect } from 'vitest';\nit('login retorna JWT', () => {});`;
      const docs  = `# auth/login\nAutentica usuário.`;

      fs.writeFileSync(path.join(modDir, `login.${cfg.ext}`), code);
      fs.writeFileSync(path.join(modDir, `login.${cfg.testExt}`), tests);
      fs.writeFileSync(path.join(modDir, 'login.md'), docs);

      expect(fs.existsSync(path.join(modDir, 'login.ts'))).toBe(true);
      expect(fs.existsSync(path.join(modDir, 'login.test.ts'))).toBe(true);
      expect(fs.existsSync(path.join(modDir, 'login.md'))).toBe(true);
      expect(fs.readFileSync(path.join(modDir, 'login.ts'), 'utf8')).toContain('signJWT');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('gera estrutura de arquivos correta para Python', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-py-'));
    try {
      const cfg    = getLangConfig('python');
      const modDir = path.join(tmpDir, 'src', 'auth');
      fs.mkdirSync(modDir, { recursive: true });

      fs.writeFileSync(path.join(modDir, `login.${cfg.ext}`),
        `def login(email: str, password: str) -> str:\n    return create_jwt({"user": email})`);
      fs.writeFileSync(path.join(modDir, `login.${cfg.testExt}`),
        `def test_login_valido():\n    assert True`);

      expect(fs.existsSync(path.join(modDir, 'login.py'))).toBe(true);
      expect(fs.existsSync(path.join(modDir, 'login.test.py'))).toBe(true);
      expect(fs.readFileSync(path.join(modDir, 'login.py'), 'utf8')).toContain('create_jwt');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('scaffold de Go inclui package e func Test', () => {
    const scaffold = generateTestScaffold(
      'auth/login',
      ['login válido retorna JWT', 'senha errada retorna 401'],
      'go'
    );
    expect(scaffold).toContain('package auth_test');
    expect(scaffold).toContain('func TestLogin_Case1');
    expect(scaffold).toContain('func TestLogin_Case2');
    expect(scaffold).toContain('"testing"');
  });
});

// ── Pipeline: Verifier ────────────────────────────────────────────

describe('Pipeline Verifier — cenários realistas', () => {

  const CLEAN_CODE = `
    import { getAttempts, lockAccount } from './lockout';
    import { findByEmail } from '../users/crud';
    import { verifyPassword, signJWT } from './auth-utils';
    export async function login(email: string, password: string) {
      const attempts = await getAttempts(email);
      if (attempts >= 5) { await lockAccount(email); throw new Error('Bloqueado'); }
      const user = await findByEmail(email);
      if (!user || !verifyPassword(password, user.hash)) throw new Error('Inválido');
      return signJWT({ userId: user.id }, '24h');
    }`.trim();

  const DIRTY_CODE = `
    export async function login(email: string, password: string) {
      console.log(\`login: \${email} / \${password}\`);
      const user = await findByEmail(email);
      // TODO: adicionar lockout depois
      return Math.random().toString(36);
    }`.trim();

  const DIRTY_PYTHON = `
    def login(email: str, password: str):
        print(f"login: {email} / {password}")
        try:
            user = find_by_email(email)
        except Exception:
            pass
        return eval("create_token()")`.trim();

  it('código alinhado não gera violações estáticas', () => {
    const checks = runStaticChecks(CLEAN_CODE, 'typescript');
    expect(checks).toHaveLength(0);
  });

  it('detecta múltiplos problemas no código sujo TypeScript', () => {
    const checks = runStaticChecks(DIRTY_CODE, 'typescript');
    const msgs   = checks.map(c => c.message);
    // console.log com senha → critical
    expect(checks.some(c => c.severity === 'critical')).toBe(true);
    // Math.random → warn
    expect(msgs.some(m => m.includes('Math.random'))).toBe(true);
    // TODO → warn
    expect(msgs.some(m => m.toLowerCase().includes('incompleto'))).toBe(true);
  });

  it('detecta problemas específicos de Python', () => {
    const checks = runStaticChecks(DIRTY_PYTHON, 'python');
    const msgs   = checks.map(c => c.message);
    expect(msgs.some(m => m.toLowerCase().includes('print') || m.toLowerCase().includes('credencial'))).toBe(true);
    expect(msgs.some(m => m.toLowerCase().includes('exception') || m.toLowerCase().includes('genérica'))).toBe(true);
    expect(msgs.some(m => m.toLowerCase().includes('eval'))).toBe(true);
  });
});

// ── Pipeline: Drift → Store → Graph ──────────────────────────────

describe('Pipeline Drift → Store → Graph', () => {

  it('drift em users/crud muda status para drift', () => {
    const { store, tmpDir, dbPath } = freshStore();
    try {
      const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
      expect(store.getIntent('users', 'crud')?.status).toBe('ok');

      store.recordDrift(users.id, 'static');
      expect(store.getIntent('users', 'crud')?.status).toBe('drift');
    } finally {
      cleanup(store, tmpDir, dbPath);
    }
  });

  it('resolver drift atualiza status para ok', () => {
    const { store, tmpDir, dbPath } = freshStore();
    try {
      const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
      store.recordDrift(users.id, 'static');
      expect(store.getIntent('users', 'crud')?.status).toBe('drift');

      store.setStatus(users.id, 'ok');
      expect(store.getIntent('users', 'crud')?.status).toBe('ok');
      expect(store.getActiveDrifts().length).toBeGreaterThanOrEqual(1);
    } finally {
      cleanup(store, tmpDir, dbPath);
    }
  });

  it('grafo propaga arestas de dependência', () => {
    const { store, tmpDir, dbPath } = freshStore();
    try {
      const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
      store.addVersion(users.id, JSON.stringify(INTENT_USERS_CRUD), 'hash-u', 'model');

      const login = store.upsertIntent('auth', 'login', INTENT_AUTH_LOGIN.intent);
      store.addVersion(login.id, JSON.stringify(INTENT_AUTH_LOGIN), 'hash-l', 'model');

      const graph = store.getGraphData();
      expect(graph.nodes.length).toBe(2);
      // auth/login declara depends_on: users/crud → deve ter aresta
      expect(graph.edges.some(e => e.from === 'users-crud' && e.to === 'auth-login')).toBe(true);
    } finally {
      cleanup(store, tmpDir, dbPath);
    }
  });

  it('snapshot preserva estado do store', () => {
    const { store, tmpDir, dbPath } = freshStore();
    try {
      const login = store.upsertIntent('auth', 'login', INTENT_AUTH_LOGIN.intent);
      store.addVersion(login.id, JSON.stringify(INTENT_AUTH_LOGIN), 'hash-l', 'model');

      const snapshotPath = store.snapshot('v1.0.0-test');
      expect(fs.existsSync(snapshotPath)).toBe(true);
    } finally {
      cleanup(store, tmpDir, dbPath);
    }
  });
});

// ── Cenário E2E ───────────────────────────────────────────────────

describe('Cenário E2E — fluxo completo de uma intenção', () => {

  it('ciclo completo: captura → dependências → artefatos → verificação → drift → resolução', () => {
    const { store, tmpDir, dbPath } = freshStore();
    try {
      // 1. Registra users/crud (dependência)
      const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
      store.setConstraints(users.id, INTENT_USERS_CRUD.constraints);
      store.addVersion(users.id, JSON.stringify(INTENT_USERS_CRUD), 'hash-u-v1', 'claude-sonnet-4');
      expect(store.getIntent('users', 'crud')).toBeDefined();

      // 2. Registra auth/login
      const login = store.upsertIntent('auth', 'login', INTENT_AUTH_LOGIN.intent);
      store.setConstraints(login.id, INTENT_AUTH_LOGIN.constraints);
      store.addVersion(login.id, JSON.stringify(INTENT_AUTH_LOGIN), 'hash-l-v1', 'claude-sonnet-4');
      expect(store.getIntent('auth', 'login')).toBeDefined();

      // 3. Context Manager resolve dependências
      const ctx = store.getDependencyContext(['users/crud']);
      expect(ctx['users/crud']).toBeDefined();
      expect(ctx['users/crud'].constraints).toEqual(INTENT_USERS_CRUD.constraints);

      // 4. Scaffold de testes cobre todos os critérios
      const scaffold = generateTestScaffold('auth/login', INTENT_AUTH_LOGIN.acceptance, 'typescript');
      expect(scaffold).toContain('describe');
      // TypeScript template usa o texto do critério como nome do it()
      INTENT_AUTH_LOGIN.acceptance.forEach(a => expect(scaffold).toContain(a));

      // 5. Código alinhado: sem violações
      const cleanCode = `
        const attempts = await getAttempts(email);
        if (attempts >= 5) throw new LockoutError();
        const user = await findByEmail(email);
        if (!verifyPassword(password, user.hash)) throw new UnauthorizedError();
        return signJWT({ userId: user.id }, "24h");
      `;
      expect(runStaticChecks(cleanCode, 'typescript')).toHaveLength(0);

      // 6. Drift detectado
      store.recordDrift(login.id, 'static');
      expect(store.getIntent('auth', 'login')?.status).toBe('drift');
      expect(store.getActiveDrifts().length).toBeGreaterThanOrEqual(1);

      // 7. Dev corrige, nova versão
      store.setStatus(login.id, 'ok');
      const v2 = store.addVersion(login.id, JSON.stringify(INTENT_AUTH_LOGIN), 'hash-l-v2', 'claude-sonnet-4');
      expect(v2.version).toBe('0.0.2');
      expect(store.getIntent('auth', 'login')?.status).toBe('ok');

      // 8. Histórico de versões
      const versions = store.getVersions(login.id);
      expect(versions.length).toBe(2);
      expect(versions[0].version).toBe('0.0.2');

      // 9. Grafo final: nós presentes e aresta correta
      const graph = store.getGraphData();
      expect(graph.nodes.length).toBe(2);
      expect(graph.edges.some(e => e.from === 'users-crud' && e.to === 'auth-login')).toBe(true);
    } finally {
      cleanup(store, tmpDir, dbPath);
    }
  });
});
