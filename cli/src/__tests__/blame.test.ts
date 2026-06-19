// src/__tests__/blame.test.ts — Issue #10: idd blame
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import MockDatabase, { resetMockDb } from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';
import {
  isGitRepo, getCurrentGitIdentity, getCurrentCommit,
  getFileHistory, getFileCreator, getFileLastModifier,
} from '../lib/git.ts';

__setDatabaseConstructor(MockDatabase);

// ── Setup ─────────────────────────────────────────────────────────

let tmpDir: string;
let store:  Store;

function initGitRepo(dir: string): void {
  execSync('git init -q', { cwd: dir });
  execSync('git config user.name "Test Author"', { cwd: dir });
  execSync('git config user.email "test@example.com"', { cwd: dir });
}

function commitFile(dir: string, relPath: string, content: string, message: string): void {
  const fullPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  execSync(`git add "${relPath}"`, { cwd: dir });
  execSync(`git commit -q -m "${message}"`, { cwd: dir });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-blame-'));
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
// isGitRepo
// ════════════════════════════════════════════════════════════════

describe('isGitRepo', () => {
  it('retorna false para diretório sem .git', () => {
    expect(isGitRepo(tmpDir)).toBe(false);
  });

  it('retorna true após git init', () => {
    initGitRepo(tmpDir);
    expect(isGitRepo(tmpDir)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// getCurrentGitIdentity
// ════════════════════════════════════════════════════════════════

describe('getCurrentGitIdentity', () => {
  it('retorna null quando não é repo git', () => {
    expect(getCurrentGitIdentity(tmpDir)).toBeNull();
  });

  it('retorna name e email configurados', () => {
    initGitRepo(tmpDir);
    const identity = getCurrentGitIdentity(tmpDir);
    expect(identity).not.toBeNull();
    expect(identity!.name).toBe('Test Author');
    expect(identity!.email).toBe('test@example.com');
  });
});

// ════════════════════════════════════════════════════════════════
// getCurrentCommit
// ════════════════════════════════════════════════════════════════

describe('getCurrentCommit', () => {
  it('retorna null quando não é repo git', () => {
    expect(getCurrentCommit(tmpDir)).toBeNull();
  });

  it('retorna null em repo git sem commits', () => {
    initGitRepo(tmpDir);
    expect(getCurrentCommit(tmpDir)).toBeNull();
  });

  it('retorna hash curto após primeiro commit', () => {
    initGitRepo(tmpDir);
    commitFile(tmpDir, 'README.md', '# Test', 'initial commit');
    const commit = getCurrentCommit(tmpDir);
    expect(commit).not.toBeNull();
    expect(commit!.length).toBeGreaterThanOrEqual(7);
  });
});

// ════════════════════════════════════════════════════════════════
// getFileHistory
// ════════════════════════════════════════════════════════════════

describe('getFileHistory', () => {
  it('retorna array vazio quando não é repo git', () => {
    expect(getFileHistory(tmpDir, 'foo.txt')).toHaveLength(0);
  });

  it('retorna array vazio para arquivo nunca commitado', () => {
    initGitRepo(tmpDir);
    commitFile(tmpDir, 'README.md', '# Test', 'initial');
    expect(getFileHistory(tmpDir, 'nao-existe.txt')).toHaveLength(0);
  });

  it('retorna 1 commit para arquivo commitado uma vez', () => {
    initGitRepo(tmpDir);
    commitFile(tmpDir, 'src/auth/login.intent.yaml', 'intent: test', 'add login intent');
    const history = getFileHistory(tmpDir, 'src/auth/login.intent.yaml');
    expect(history).toHaveLength(1);
    expect(history[0].author).toBe('Test Author');
    expect(history[0].email).toBe('test@example.com');
    expect(history[0].message).toBe('add login intent');
  });

  it('retorna múltiplos commits em ordem decrescente (mais recente primeiro)', () => {
    initGitRepo(tmpDir);
    commitFile(tmpDir, 'src/auth/login.intent.yaml', 'v1', 'first version');
    commitFile(tmpDir, 'src/auth/login.intent.yaml', 'v2', 'second version');
    commitFile(tmpDir, 'src/auth/login.intent.yaml', 'v3', 'third version');
    const history = getFileHistory(tmpDir, 'src/auth/login.intent.yaml');
    expect(history).toHaveLength(3);
    expect(history[0].message).toBe('third version');
    expect(history[2].message).toBe('first version');
  });

  it('respeita o parâmetro limit', () => {
    initGitRepo(tmpDir);
    for (let i = 1; i <= 5; i++) {
      commitFile(tmpDir, 'src/x.intent.yaml', `v${i}`, `commit ${i}`);
    }
    const history = getFileHistory(tmpDir, 'src/x.intent.yaml', 2);
    expect(history).toHaveLength(2);
  });

  it('cada commit tem hash de 8 caracteres', () => {
    initGitRepo(tmpDir);
    commitFile(tmpDir, 'a.txt', 'content', 'msg');
    const history = getFileHistory(tmpDir, 'a.txt');
    expect(history[0].hash).toHaveLength(8);
  });

  it('histórico não afeta outros arquivos não relacionados', () => {
    initGitRepo(tmpDir);
    commitFile(tmpDir, 'a.intent.yaml', 'a', 'commit a');
    commitFile(tmpDir, 'b.intent.yaml', 'b', 'commit b');
    const historyA = getFileHistory(tmpDir, 'a.intent.yaml');
    const historyB = getFileHistory(tmpDir, 'b.intent.yaml');
    expect(historyA).toHaveLength(1);
    expect(historyB).toHaveLength(1);
    expect(historyA[0].message).toBe('commit a');
    expect(historyB[0].message).toBe('commit b');
  });
});

// ════════════════════════════════════════════════════════════════
// getFileCreator / getFileLastModifier
// ════════════════════════════════════════════════════════════════

describe('getFileCreator', () => {
  it('retorna null para arquivo sem histórico', () => {
    initGitRepo(tmpDir);
    expect(getFileCreator(tmpDir, 'nao-existe.txt')).toBeNull();
  });

  it('retorna o commit mais antigo (criação)', () => {
    initGitRepo(tmpDir);
    commitFile(tmpDir, 'auth/login.intent.yaml', 'v1', 'criação inicial');
    commitFile(tmpDir, 'auth/login.intent.yaml', 'v2', 'atualização');
    commitFile(tmpDir, 'auth/login.intent.yaml', 'v3', 'mais uma atualização');
    const creator = getFileCreator(tmpDir, 'auth/login.intent.yaml');
    expect(creator?.message).toBe('criação inicial');
  });
});

describe('getFileLastModifier', () => {
  it('retorna null para arquivo sem histórico', () => {
    initGitRepo(tmpDir);
    expect(getFileLastModifier(tmpDir, 'nao-existe.txt')).toBeNull();
  });

  it('retorna o commit mais recente', () => {
    initGitRepo(tmpDir);
    commitFile(tmpDir, 'auth/login.intent.yaml', 'v1', 'criação inicial');
    commitFile(tmpDir, 'auth/login.intent.yaml', 'v2', 'última atualização');
    const modifier = getFileLastModifier(tmpDir, 'auth/login.intent.yaml');
    expect(modifier?.message).toBe('última atualização');
  });
});

// ════════════════════════════════════════════════════════════════
// Store: git_author / git_email em addVersion
// ════════════════════════════════════════════════════════════════

describe('Store.addVersion — autoria git', () => {
  it('persiste git_author e git_email quando fornecidos', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    const v = store.addVersion(intent.id, '{}', 'hash1', 'model', {
      author: 'Alice', email: 'alice@example.com', commit: 'abc123',
    });
    expect(v.git_author).toBe('Alice');
    expect(v.git_email).toBe('alice@example.com');
    expect(v.git_commit).toBe('abc123');
  });

  it('git_author é null quando gitInfo não fornecido', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    const v = store.addVersion(intent.id, '{}', 'hash1', 'model');
    expect(v.git_author).toBeNull();
    expect(v.git_email).toBeNull();
  });

  it('getVersions retorna git_author persistido', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    store.addVersion(intent.id, '{}', 'hash1', 'model', {
      author: 'Bob', email: 'bob@example.com',
    });
    const versions = store.getVersions(intent.id);
    expect(versions[0].git_author).toBe('Bob');
    expect(versions[0].git_email).toBe('bob@example.com');
  });

  it('múltiplas versões podem ter autores diferentes', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    store.addVersion(intent.id, '{}', 'hash1', 'model', { author: 'Alice', email: 'a@x.com' });
    store.addVersion(intent.id, '{}', 'hash2', 'model', { author: 'Bob',   email: 'b@x.com' });
    const versions = store.getVersions(intent.id);
    expect(versions[0].git_author).toBe('Bob');   // mais recente
    expect(versions[1].git_author).toBe('Alice'); // mais antigo
  });
});

// ════════════════════════════════════════════════════════════════
// Pipeline e2e: git init + commit + store + blame data
// ════════════════════════════════════════════════════════════════

describe('Pipeline e2e — blame completo', () => {
  it('fluxo completo: git commit + store version → dados consistentes', () => {
    initGitRepo(tmpDir);
    commitFile(tmpDir, 'src/auth/login.intent.yaml',
      'intent: "Autenticar usuário"\nmodule: auth/login\n', 'feat: criar intent auth/login');

    const identity = getCurrentGitIdentity(tmpDir)!;
    const commit    = getCurrentCommit(tmpDir);

    const intent = store.upsertIntent('auth', 'login', 'Autenticar usuário');
    const version = store.addVersion(intent.id, '{}', 'hash1', 'claude-sonnet-4', {
      author: identity.name, email: identity.email, commit: commit ?? undefined,
    });

    expect(version.git_author).toBe('Test Author');
    expect(version.git_email).toBe('test@example.com');

    const fileHistory = getFileHistory(tmpDir, 'src/auth/login.intent.yaml');
    expect(fileHistory[0].author).toBe(version.git_author);
    expect(fileHistory[0].email).toBe(version.git_email);
  });

  it('blame --all: múltiplas intenções com autores diferentes', () => {
    const login = store.upsertIntent('auth', 'login', 'Login');
    const crud  = store.upsertIntent('users', 'crud', 'CRUD');
    store.addVersion(login.id, '{}', 'h1', 'm', { author: 'Alice', email: 'a@x.com' });
    store.addVersion(crud.id,  '{}', 'h2', 'm', { author: 'Bob',   email: 'b@x.com' });

    const intents = store.listIntents();
    expect(intents).toHaveLength(2);

    const authors = intents.map(i => store.getVersions(i.id)[0]?.git_author);
    expect(authors).toContain('Alice');
    expect(authors).toContain('Bob');
  });

  it('intenção sem versões não quebra blame', () => {
    store.upsertIntent('orphan', 'module', 'Sem versão ainda');
    const intent   = store.getIntent('orphan', 'module')!;
    const versions = store.getVersions(intent.id);
    expect(versions).toHaveLength(0);
    // blame deve lidar graciosamente com isso (não testado via CLI direto, mas a função não lança)
    expect(() => store.getVersions(intent.id)).not.toThrow();
  });
});
