// src/__tests__/review.test.ts — Issue #14: IDD Review
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import MockDatabase, { resetMockDb } from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';
import {
  fileToModule, suggestReviewers, formatPrComment,
  analyzeModules, type FileChange, type ReviewResult, type ModuleReview,
} from '../commands/review.ts';

__setDatabaseConstructor(MockDatabase);

// ── Setup ────────────────────────────────────────────────────────

let tmpDir: string;
let store:  Store;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-review-'));
  const dbPath = path.join(tmpDir, '.idd', 'store.db');
  resetMockDb(dbPath);
  store = new Store(tmpDir);
  store.open();
});

afterEach(() => {
  try { store.close(); } catch {}
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ════════════════════════════════════════════════════════════════
// fileToModule
// ════════════════════════════════════════════════════════════════

describe('fileToModule', () => {
  it('detecta módulo de arquivo TypeScript', () => {
    const m = fileToModule('src/auth/login.ts');
    expect(m?.module).toBe('auth');
    expect(m?.sub).toBe('login');
  });

  it('detecta módulo de arquivo Python', () => {
    const m = fileToModule('src/auth/login.py');
    expect(m?.module).toBe('auth');
    expect(m?.sub).toBe('login');
  });

  it('detecta módulo de arquivo de teste', () => {
    const m = fileToModule('src/auth/login.test.ts');
    expect(m?.module).toBe('auth');
    expect(m?.sub).toBe('login');
  });

  it('detecta módulo de .intent.yaml', () => {
    const m = fileToModule('src/auth/login.intent.yaml');
    expect(m?.module).toBe('auth');
    expect(m?.sub).toBe('login');
  });

  it('detecta módulo de arquivo Go com _test', () => {
    const m = fileToModule('src/users/crud_test.go');
    expect(m?.module).toBe('users');
    expect(m?.sub).toBe('crud');
  });

  it('detecta módulo sem prefixo src/', () => {
    const m = fileToModule('auth/login.ts');
    expect(m?.module).toBe('auth');
    expect(m?.sub).toBe('login');
  });

  it('retorna null para arquivo na raiz sem módulo', () => {
    expect(fileToModule('README.md')).toBeNull();
  });

  it('retorna null para arquivo vazio', () => {
    expect(fileToModule('')).toBeNull();
  });

  it('funciona com separadores Windows', () => {
    const m = fileToModule('src\\auth\\login.ts');
    expect(m?.module).toBe('auth');
    expect(m?.sub).toBe('login');
  });

  it('detecta módulo de usuários', () => {
    const m = fileToModule('src/users/crud.ts');
    expect(m?.module).toBe('users');
    expect(m?.sub).toBe('crud');
  });
});

// ════════════════════════════════════════════════════════════════
// suggestReviewers
// ════════════════════════════════════════════════════════════════

describe('suggestReviewers', () => {
  it('retorna array vazio para módulo sem intenção', () => {
    const reviewers = suggestReviewers(store, 'auth', 'login');
    expect(reviewers).toHaveLength(0);
  });

  it('retorna autor quando há versões com git_author', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    store.addVersion(intent.id, '{}', 'h1', 'm', { author: 'Alice', email: 'a@x.com' });
    store.addVersion(intent.id, '{}', 'h2', 'm', { author: 'Alice', email: 'a@x.com' });
    store.addVersion(intent.id, '{}', 'h3', 'm', { author: 'Bob',   email: 'b@x.com' });

    const reviewers = suggestReviewers(store, 'auth', 'login');
    expect(reviewers[0]).toBe('Alice'); // Alice tem mais versões
    expect(reviewers).toContain('Bob');
  });

  it('retorna no máximo 3 revisores', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    ['Alice','Bob','Charlie','Dave'].forEach((name, i) =>
      store.addVersion(intent.id, '{}', `h${i}`, 'm', { author: name, email: `${name}@x.com` })
    );
    const reviewers = suggestReviewers(store, 'auth', 'login');
    expect(reviewers.length).toBeLessThanOrEqual(3);
  });

  it('ignora versões sem git_author', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    store.addVersion(intent.id, '{}', 'h1', 'm');
    const reviewers = suggestReviewers(store, 'auth', 'login');
    expect(reviewers).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// formatPrComment
// ════════════════════════════════════════════════════════════════

describe('formatPrComment', () => {
  const makeResult = (overrides: Partial<ReviewResult> = {}): ReviewResult => ({
    pr: '42', base: 'main', head: 'feature/auth',
    totalFiles: 3, modules: [], blockers: 0, warnings: 0,
    summary: '✅ Todos os módulos alinhados',
    ...overrides,
  });

  it('contém cabeçalho ## ⬡ IDD Review', () => {
    const comment = formatPrComment(makeResult());
    expect(comment).toContain('## ⬡ IDD Review');
  });

  it('contém número do PR', () => {
    const comment = formatPrComment(makeResult({ pr: '99' }));
    expect(comment).toContain('99');
  });

  it('contém referências de base e head', () => {
    const comment = formatPrComment(makeResult());
    expect(comment).toContain('main');
    expect(comment).toContain('feature/auth');
  });

  it('mostra ✅ Aprovado quando sem problemas', () => {
    const comment = formatPrComment(makeResult({ blockers: 0, warnings: 0 }));
    expect(comment).toContain('✅ Aprovado');
  });

  it('mostra ❌ Bloqueado quando há drift', () => {
    const comment = formatPrComment(makeResult({ blockers: 2, warnings: 0 }));
    expect(comment).toContain('❌ Bloqueado');
  });

  it('mostra ⚠ Avisos quando há warnings sem drift', () => {
    const comment = formatPrComment(makeResult({ blockers: 0, warnings: 3 }));
    expect(comment).toContain('⚠ Avisos');
  });

  it('tabela inclui todos os módulos', () => {
    const modules: ModuleReview[] = [
      { module: 'auth', sub: 'login', status: 'ok', score: 100, violations: [], missingTests: [], filesChanged: [], suggestedReviewers: [] },
      { module: 'users', sub: 'crud', status: 'drift', score: 30, violations: ['credencial exposta'], missingTests: [], filesChanged: [], suggestedReviewers: [] },
    ];
    const comment = formatPrComment(makeResult({ modules, blockers: 1 }));
    expect(comment).toContain('auth/login');
    expect(comment).toContain('users/crud');
  });

  it('detalha violações na seção de detalhes', () => {
    const modules: ModuleReview[] = [{
      module: 'auth', sub: 'login', status: 'drift', score: 30,
      violations: ['Credencial exposta em log'], missingTests: [],
      filesChanged: ['src/auth/login.ts'], suggestedReviewers: [],
    }];
    const comment = formatPrComment(makeResult({ modules, blockers: 1 }));
    expect(comment).toContain('Credencial exposta em log');
  });

  it('mostra revisores sugeridos quando disponíveis', () => {
    const modules: ModuleReview[] = [{
      module: 'auth', sub: 'login', status: 'warn', score: 70,
      violations: [], missingTests: [],
      filesChanged: ['src/auth/login.ts'], suggestedReviewers: ['Alice', 'Bob'],
    }];
    const comment = formatPrComment(makeResult({ modules, warnings: 1 }));
    expect(comment).toContain('@Alice');
    expect(comment).toContain('@Bob');
  });

  it('módulo sem intent mostra aviso de idd new', () => {
    const modules: ModuleReview[] = [{
      module: 'payments', sub: 'checkout', status: 'no-intent', score: -1,
      violations: [], missingTests: [],
      filesChanged: ['src/payments/checkout.ts'], suggestedReviewers: [],
    }];
    const comment = formatPrComment(makeResult({ modules, warnings: 1 }));
    expect(comment).toContain('idd new payments/checkout');
  });

  it('sempre inclui rodapé com link para IDD IDE', () => {
    const comment = formatPrComment(makeResult());
    expect(comment).toContain('IDD Review');
    expect(comment).toContain('github.com/EliezerRosa/idd-ide');
  });
});

// ════════════════════════════════════════════════════════════════
// analyzeModules
// ════════════════════════════════════════════════════════════════

describe('analyzeModules', () => {
  const CLEAN_TS = `
export async function login(email: string, password: string): Promise<string> {
  const attempts = await getAttempts(email);
  if (attempts >= 5) throw new LockoutError();
  const user = await findByEmail(email);
  if (!user || !verifyPassword(password, user.hash)) throw new UnauthorizedError();
  return signJWT({ userId: user.id }, '24h');
}`.trim();

  const DIRTY_TS = `
export async function login(email: string, password: string) {
  console.log('login attempt: ' + email + ' / ' + password);
  return Math.random().toString(36);
}`.trim();

  const makeChange = (filePath: string, content: string, status: FileChange['status'] = 'modified'): FileChange => ({
    path: filePath, status, additions: 5, deletions: 2, content,
  });

  it('retorna no-intent para arquivo sem intenção IDD', async () => {
    const changes = [makeChange('src/auth/login.ts', CLEAN_TS)];
    const results = await analyzeModules(changes, store, tmpDir, false, '', '');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('no-intent');
  });

  it('retorna ok para código limpo com intenção', async () => {
    const intent = store.upsertIntent('auth', 'login', 'Autenticar usuário');
    store.setConstraints(intent.id, ['senha segura']);
    const changes = [makeChange('src/auth/login.ts', CLEAN_TS)];
    const results = await analyzeModules(changes, store, tmpDir, false, '', '');
    expect(results[0].status).toBe('ok');
    expect(results[0].violations).toHaveLength(0);
  });

  it('detecta violações no código sujo', async () => {
    const intent = store.upsertIntent('auth', 'login', 'Autenticar usuário');
    store.setConstraints(intent.id, ['nunca logar senha']);
    const changes = [makeChange('src/auth/login.ts', DIRTY_TS)];
    const results = await analyzeModules(changes, store, tmpDir, false, '', '');
    expect(results[0].violations.length).toBeGreaterThan(0);
    expect(results[0].status).not.toBe('ok');
  });

  it('detecta testes faltando quando só código foi modificado', async () => {
    const intent = store.upsertIntent('auth', 'login', 'Autenticar usuário');
    store.addVersion(intent.id, JSON.stringify({
      intent: 'Autenticar', module: 'auth/login',
      constraints: ['senha segura'], acceptance: ['login retorna JWT', 'senha errada 401'],
      depends_on: [],
    }), 'hash1', 'model');
    const changes = [makeChange('src/auth/login.ts', CLEAN_TS)];
    const results = await analyzeModules(changes, store, tmpDir, false, '', '');
    // Code modified but no test file → missing tests from acceptance criteria
    expect(results[0].missingTests.length).toBeGreaterThan(0);
  });

  it('não reporta testes faltando quando arquivo de teste foi incluído', async () => {
    const intent = store.upsertIntent('auth', 'login', 'Autenticar usuário');
    store.setConstraints(intent.id, ['senha segura']);
    const changes = [
      makeChange('src/auth/login.ts',      CLEAN_TS),
      makeChange('src/auth/login.test.ts', 'it("test", () => {})'),
    ];
    const results = await analyzeModules(changes, store, tmpDir, false, '', '');
    expect(results[0].missingTests).toHaveLength(0);
  });

  it('agrupa múltiplos arquivos do mesmo módulo', async () => {
    store.upsertIntent('auth', 'login', 'Autenticar usuário');
    const changes = [
      makeChange('src/auth/login.ts',      CLEAN_TS),
      makeChange('src/auth/login.test.ts', 'it("test", () => {})'),
    ];
    const results = await analyzeModules(changes, store, tmpDir, false, '', '');
    expect(results).toHaveLength(1); // agrupados no mesmo módulo
    expect(results[0].filesChanged).toHaveLength(2);
  });

  it('analisa múltiplos módulos independentemente', async () => {
    store.upsertIntent('auth', 'login', 'Login');
    store.upsertIntent('users', 'crud',  'CRUD');
    const changes = [
      makeChange('src/auth/login.ts',  CLEAN_TS),
      makeChange('src/users/crud.ts',  DIRTY_TS),
    ];
    const results = await analyzeModules(changes, store, tmpDir, false, '', '');
    expect(results).toHaveLength(2);
    const authResult  = results.find(r => r.module === 'auth')!;
    const usersResult = results.find(r => r.module === 'users')!;
    expect(authResult.status).toBe('ok');
    expect(usersResult.violations.length).toBeGreaterThan(0);
  });

  it('ignora arquivos deletados na análise estática', async () => {
    store.upsertIntent('auth', 'login', 'Login');
    const changes: FileChange[] = [{
      path: 'src/auth/login.ts', status: 'deleted',
      additions: 0, deletions: 10, content: undefined,
    }];
    const results = await analyzeModules(changes, store, tmpDir, false, '', '');
    expect(results[0].violations).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// Workflow YAML existe e tem estrutura correta
// ════════════════════════════════════════════════════════════════

describe('idd-review.yml — workflow GitHub Actions', () => {
  const findWorkflow = (): string | null => {
    const candidates = [
      path.resolve(import.meta.dirname, '../../../../.github/workflows/idd-review.yml'),
      path.resolve(import.meta.dirname, '../../../.github/workflows/idd-review.yml'),
    ];
    return candidates.find(p => fs.existsSync(p)) ?? null;
  };

  it('arquivo idd-review.yml existe', () => {
    expect(findWorkflow()).not.toBeNull();
  });

  it('é YAML válido e contém chave "on"', async () => {
    const p = findWorkflow();
    if (!p) return;
    const yaml = await import('js-yaml');
    const content = fs.readFileSync(p, 'utf8');
    const parsed = yaml.load(content) as any;
    expect(parsed).toHaveProperty('on');
  });

  it('tem job "review" com step de IDD Review', () => {
    const p = findWorkflow();
    if (!p) return;
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toContain('idd review');
    expect(content).toContain('pull_request');
  });

  it('posta comentário no PR via github-script', () => {
    const p = findWorkflow();
    if (!p) return;
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toContain('github-script');
    expect(content).toContain('IDD Review');
  });

  it('suporta fail-on como input configurável', () => {
    const p = findWorkflow();
    if (!p) return;
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toContain('fail-on');
  });

  it('suporta semantic como input booleano', () => {
    const p = findWorkflow();
    if (!p) return;
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toContain('semantic');
  });
});
