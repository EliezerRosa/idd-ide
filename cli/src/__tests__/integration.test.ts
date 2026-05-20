// src/__tests__/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { getLangConfig, runStaticChecks, generateTestScaffold } from '../lib/lang.ts';

// ── Mock sincrono de SQLite ───────────────────────────────────────
// Importa o mock diretamente para injetar via __setDatabaseConstructor
import MockDatabase from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';

// Injeta o mock antes de qualquer teste
__setDatabaseConstructor(MockDatabase);

// ── Fixtures ─────────────────────────────────────────────────────

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

const INTENT_USERS_CRUD = {
  intent:      'Gerenciar usuários no banco de dados (criar, ler, atualizar, remover)',
  module:      'users/crud',
  constraints: ['email deve ser único', 'senha nunca retornada em consultas'],
  acceptance:  ['criar usuário com e-mail único', 'buscar usuário por e-mail'],
  depends_on:  [] as string[],
  language:    'typescript' as const,
};

// ── Setup ────────────────────────────────────────────────────────

let tmpDir: string;
let store:  Store;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-integration-'));
  store  = new Store(tmpDir);
  store.open();
});

afterEach(() => {
  try { store.close(); } catch {}
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Pipeline: Captura → Store → Context ─────────────────────────

describe('Pipeline Captura → Store → Context Manager', () => {

  it('registra dependência antes de gerar intenção dependente', () => {
    const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
    store.setConstraints(users.id, INTENT_USERS_CRUD.constraints);
    store.addVersion(users.id, JSON.stringify(INTENT_USERS_CRUD), 'hash-users', 'model');

    const ctx = store.getDependencyContext(['users/crud']);
    expect(ctx).toHaveProperty('users/crud');
    expect(ctx['users/crud'].statement).toContain('Gerenciar usuários');
    expect(ctx['users/crud'].constraints).toContain('email deve ser único');
  });

  it('contexto vazio quando dependência não registrada', () => {
    const ctx = store.getDependencyContext(['payments/process']);
    expect(ctx).toEqual({});
  });

  it('registra auth/login com dependência resolvida', () => {
    // Registra users/crud primeiro
    const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
    store.setConstraints(users.id, INTENT_USERS_CRUD.constraints);
    store.addVersion(users.id, JSON.stringify(INTENT_USERS_CRUD), 'hash-users', 'model');

    // Registra auth/login
    const login = store.upsertIntent('auth', 'login', INTENT_AUTH_LOGIN.intent);
    store.setConstraints(login.id, INTENT_AUTH_LOGIN.constraints);
    store.addVersion(login.id, JSON.stringify(INTENT_AUTH_LOGIN), 'hash-login', 'model');

    // Context Manager resolve dependências
    const ctx = store.getDependencyContext(['users/crud']);
    expect(ctx['users/crud'].version).toBe('0.0.1');

    // Grafo tem ambos os nós
    const graph = store.getGraphData();
    expect(graph.nodes).toHaveLength(2);
    const loginNode = graph.nodes.find(n => n.id === 'auth-login');
    expect(loginNode).toBeDefined();
    expect(loginNode!.status).toBe('ok');
  });
});

// ── Pipeline: Geração de Artefatos ───────────────────────────────

describe('Pipeline Geração de Artefatos', () => {

  it('gera estrutura de arquivos correta para TypeScript', () => {
    const cfg    = getLangConfig('typescript');
    const module = 'auth/login';
    const tmpModDir = path.join(tmpDir, 'src', 'auth');
    fs.mkdirSync(tmpModDir, { recursive: true });

    // Simula Output Formatter escrevendo artefatos
    const code  = `export async function login() { return signJWT({}, "24h"); }`;
    const tests = `import { it, expect } from 'vitest';\nit('login retorna JWT', () => {});`;
    const docs  = `# auth/login\nAutentica usuário.`;

    fs.writeFileSync(path.join(tmpModDir, `login.${cfg.ext}`),  code);
    fs.writeFileSync(path.join(tmpModDir, `login.${cfg.testExt}`), tests);
    fs.writeFileSync(path.join(tmpModDir, 'login.md'), docs);

    expect(fs.existsSync(path.join(tmpModDir, 'login.ts'))).toBe(true);
    expect(fs.existsSync(path.join(tmpModDir, 'login.test.ts'))).toBe(true);
    expect(fs.existsSync(path.join(tmpModDir, 'login.md'))).toBe(true);

    const readCode = fs.readFileSync(path.join(tmpModDir, 'login.ts'), 'utf8');
    expect(readCode).toContain('signJWT');
  });

  it('gera estrutura de arquivos correta para Python', () => {
    const cfg     = getLangConfig('python');
    const tmpPyDir = path.join(tmpDir, 'src', 'auth');
    fs.mkdirSync(tmpPyDir, { recursive: true });

    const code  = `def login(email: str, password: str) -> str:\n    return create_jwt({"user": email})`;
    const tests = `def test_login_valido():\n    """login válido retorna JWT"""\n    assert True`;

    fs.writeFileSync(path.join(tmpPyDir, `login.${cfg.ext}`),  code);
    fs.writeFileSync(path.join(tmpPyDir, `login.${cfg.testExt}`), tests);

    expect(fs.existsSync(path.join(tmpPyDir, 'login.py'))).toBe(true);
    expect(fs.existsSync(path.join(tmpPyDir, 'login.test.py'))).toBe(true);

    const readCode = fs.readFileSync(path.join(tmpPyDir, 'login.py'), 'utf8');
    expect(readCode).toContain('create_jwt');
  });

  it('scaffold de Go inclui package e func Test', () => {
    const scaffold = generateTestScaffold('auth/login', ['login válido retorna JWT', 'senha errada retorna 401'], 'go');
    expect(scaffold).toContain('package auth_test');
    expect(scaffold).toContain('func TestLogin_Case1');
    expect(scaffold).toContain('func TestLogin_Case2');
    expect(scaffold).toContain('"testing"');
  });
});

// ── Pipeline: Verifier ───────────────────────────────────────────

describe('Pipeline Verifier — cenários realistas', () => {

  const CLEAN_LOGIN_TS = `
import { findByEmail } from '../users/crud';
import { verifyPassword, signJWT } from './auth-utils';
import { getAttempts, incrementAttempts, lockAccount } from './lockout';

export async function login(email: string, password: string): Promise<string> {
  const attempts = await getAttempts(email);
  if (attempts >= 5) {
    await lockAccount(email);
    throw new Error('Conta bloqueada');
  }
  const user = await findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await incrementAttempts(email);
    throw new Error('Credenciais inválidas');
  }
  return signJWT({ userId: user.id }, '24h');
}`.trim();

  const DIRTY_LOGIN_TS = `
export async function login(email: string, password: string) {
  console.log(\`tentativa de login: \${email} / \${password}\`);
  const user = await findByEmail(email);
  // TODO: adicionar lockout depois
  return Math.random().toString(36);
}`.trim();

  const DIRTY_LOGIN_PY = `
def login(email: str, password: str):
    print(f"login: {email} / {password}")
    try:
        user = find_by_email(email)
    except Exception:
        pass
    return eval("create_token()")`.trim();

  it('código alinhado não gera violações', () => {
    const checks = runStaticChecks(CLEAN_LOGIN_TS, 'typescript');
    expect(checks).toHaveLength(0);
  });

  it('código com múltiplos problemas de segurança', () => {
    const checks = runStaticChecks(DIRTY_LOGIN_TS, 'typescript');
    const msgs   = checks.map(c => c.message);
    expect(msgs.some(m => m.toLowerCase().includes('credencial') || m.toLowerCase().includes('console'))).toBe(true);
    expect(checks.some(c => c.severity === 'critical')).toBe(true);
    expect(checks.some(c => c.message.includes('Math.random'))).toBe(true);
    expect(checks.some(c => c.message.toLowerCase().includes('incompleto') || c.message.includes('TODO'))).toBe(true);
  });

  it('código Python com problemas detectados', () => {
    const checks = runStaticChecks(DIRTY_LOGIN_PY, 'python');
    const msgs   = checks.map(c => c.message);
    expect(msgs.some(m => m.toLowerCase().includes('print') || m.toLowerCase().includes('credencial'))).toBe(true);
    expect(msgs.some(m => m.toLowerCase().includes('exception') || m.toLowerCase().includes('genérica'))).toBe(true);
    expect(msgs.some(m => m.toLowerCase().includes('eval'))).toBe(true);
  });
});

// ── Pipeline: Drift → Store → Graph ─────────────────────────────

describe('Pipeline Drift → Store → Graph', () => {

  it('drift em users/crud propaga para auth/login via grafo', () => {
    // Setup: registra as duas intenções
    const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
    store.addVersion(users.id, JSON.stringify(INTENT_USERS_CRUD), 'hash-u', 'model');

    const login = store.upsertIntent('auth', 'login', INTENT_AUTH_LOGIN.intent);
    store.addVersion(login.id, JSON.stringify(INTENT_AUTH_LOGIN), 'hash-l', 'model');

    // Drift detectado em users/crud
    store.recordDrift(users.id, 'static');

    // Verifica propagação no grafo
    const graph = store.getGraphData();
    const usersNode = graph.nodes.find(n => n.id === 'users-crud');
    expect(usersNode?.status).toBe('drift');

    // auth/login depende de users/crud → deve ser revisado
    const edges = graph.edges.filter(e => e.to === 'auth-login');
    expect(edges.some(e => e.from === 'users-crud')).toBe(true);
  });

  it('resolver drift atualiza status para ok', () => {
    const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
    store.recordDrift(users.id, 'static');

    // Status mudou para drift
    const afterDrift = store.getIntent('users', 'crud');
    expect(afterDrift?.status).toBe('drift');

    // Dev corrige e seta status ok
    store.setStatus(users.id, 'ok');
    const afterFix = store.getIntent('users', 'crud');
    expect(afterFix?.status).toBe('ok');

    // Drifts ativos ainda existem (resolução acontece via resolveDrift)
    const activeDrifts = store.getActiveDrifts();
    expect(activeDrifts).toHaveLength(1); // ainda ativo até ser resolvido
  });

  it('snapshot preserva estado de drift', () => {
    const login = store.upsertIntent('auth', 'login', INTENT_AUTH_LOGIN.intent);
    store.addVersion(login.id, JSON.stringify(INTENT_AUTH_LOGIN), 'hash-l', 'model');
    store.recordDrift(login.id, 'semantic');

    const snapshotPath = store.snapshot('v1.0.0-test');
    expect(fs.existsSync(snapshotPath)).toBe(true);
    expect(snapshotPath).toContain('v1.0.0-test');
  });
});

// ── Cenário E2E ──────────────────────────────────────────────────

describe('Cenário E2E — fluxo completo de uma intenção', () => {

  it('ciclo completo: captura → dependências → artefatos → verificação → drift → resolução', () => {
    // 1. Captura: registra users/crud (dependência)
    const users = store.upsertIntent('users', 'crud', INTENT_USERS_CRUD.intent);
    store.setConstraints(users.id, INTENT_USERS_CRUD.constraints);
    store.addVersion(users.id, JSON.stringify(INTENT_USERS_CRUD), 'hash-users-v1', 'claude-sonnet-4');

    // 2. Captura: registra auth/login
    const login = store.upsertIntent('auth', 'login', INTENT_AUTH_LOGIN.intent);
    store.setConstraints(login.id, INTENT_AUTH_LOGIN.constraints);
    store.addVersion(login.id, JSON.stringify(INTENT_AUTH_LOGIN), 'hash-login-v1', 'claude-sonnet-4');

    // 3. Context Manager resolve dependências corretamente
    const ctx = store.getDependencyContext(['users/crud']);
    expect(ctx['users/crud']).toBeDefined();
    expect(ctx['users/crud'].constraints).toEqual(INTENT_USERS_CRUD.constraints);

    // 4. Artefatos gerados — scaffold de testes cobre todos os critérios
    const scaffold = generateTestScaffold(
      'auth/login', INTENT_AUTH_LOGIN.acceptance, 'typescript'
    );
    expect(scaffold).toContain('describe');
    INTENT_AUTH_LOGIN.acceptance.forEach((_a, i) => {
      expect(scaffold).toContain(`Case${i + 1}`);
    });

    // 5. Verificação estática: código alinhado passa
    const cleanCode = `
      export async function login(email: string, password: string) {
        const attempts = await getAttempts(email);
        if (attempts >= 5) throw new LockoutError();
        const user = await findByEmail(email);
        if (!verifyPassword(password, user.hash)) throw new UnauthorizedError();
        return signJWT({ userId: user.id }, "24h");
      }
    `;
    const checks = runStaticChecks(cleanCode, 'typescript');
    expect(checks).toHaveLength(0);

    // 6. Drift detectado: dev remove lockout
    store.recordDrift(login.id, 'static');
    expect(store.getIntent('auth', 'login')?.status).toBe('drift');
    expect(store.getActiveDrifts()).toHaveLength(1);

    // 7. Resolução: dev corrige, atualiza versão
    store.setStatus(login.id, 'ok');
    const v2 = store.addVersion(login.id, JSON.stringify({ ...INTENT_AUTH_LOGIN }), 'hash-login-v2', 'claude-sonnet-4');
    expect(v2.version).toBe('0.0.2');
    expect(store.getIntent('auth', 'login')?.status).toBe('ok');

    // 8. Versões refletem histórico
    const versions = store.getVersions(login.id);
    expect(versions).toHaveLength(2);
    expect(versions[0].version).toBe('0.0.2'); // mais recente primeiro

    // 9. Grafo final: ambos alinhados
    const graph = store.getGraphData();
    expect(graph.nodes.every(n => n.status === 'ok')).toBe(true);
  });
});
