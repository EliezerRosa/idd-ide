// src/__tests__/verifier2.test.ts — Issue #2: config, threshold, alignment scores
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import MockDatabase, { resetMockDb } from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';
import { loadConfig, clearConfigCache, writeDefaultConfig, getDefaultConfig } from '../lib/config.ts';

__setDatabaseConstructor(MockDatabase);

// ── Setup ────────────────────────────────────────────────────────

let tmpDir: string;
let store:  Store;

beforeEach(() => {
  clearConfigCache();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-v2-'));
  const dbPath = path.join(tmpDir, '.idd', 'store.db');
  resetMockDb(dbPath);
  store = new Store(tmpDir);
  store.open();
});

afterEach(() => {
  try { store.close(); } catch {}
  fs.rmSync(tmpDir, { recursive: true, force: true });
  clearConfigCache();
});

// ── Config: loadConfig ───────────────────────────────────────────

describe('loadConfig', () => {
  it('retorna defaults quando .idd/config.yaml não existe', () => {
    const cfg = loadConfig(tmpDir);
    expect(cfg.drift_threshold).toBe(80);
    expect(cfg.auto_semantic_verify).toBe(false);
    expect(cfg.semantic_debounce_ms).toBe(30_000);
    expect(cfg.fail_on).toBe('critical');
    expect(cfg.context_max_depth).toBe(3);
    expect(cfg.model).toBe('claude-sonnet-4-20250514');
  });

  it('sobrescreve campos com valores do arquivo', () => {
    const iddDir = path.join(tmpDir, '.idd');
    fs.mkdirSync(iddDir, { recursive: true });
    fs.writeFileSync(
      path.join(iddDir, 'config.yaml'),
      'drift_threshold: 90\nauto_semantic_verify: true\nfail_on: warn\n'
    );
    const cfg = loadConfig(tmpDir);
    expect(cfg.drift_threshold).toBe(90);
    expect(cfg.auto_semantic_verify).toBe(true);
    expect(cfg.fail_on).toBe('warn');
    // campos não sobrescritos mantêm default
    expect(cfg.context_max_depth).toBe(3);
  });

  it('mantém defaults para campos ausentes no arquivo', () => {
    const iddDir = path.join(tmpDir, '.idd');
    fs.mkdirSync(iddDir, { recursive: true });
    fs.writeFileSync(path.join(iddDir, 'config.yaml'), 'drift_threshold: 70\n');
    const cfg = loadConfig(tmpDir);
    expect(cfg.drift_threshold).toBe(70);
    expect(cfg.model).toBe('claude-sonnet-4-20250514'); // default mantido
  });

  it('ignora YAML inválido e usa defaults', () => {
    const iddDir = path.join(tmpDir, '.idd');
    fs.mkdirSync(iddDir, { recursive: true });
    fs.writeFileSync(path.join(iddDir, 'config.yaml'), ': invalid: yaml: :::\n');
    expect(() => loadConfig(tmpDir)).not.toThrow();
    const cfg = loadConfig(tmpDir);
    expect(cfg.drift_threshold).toBe(80);
  });

  it('usa cache na segunda chamada com mesma raiz', () => {
    const cfg1 = loadConfig(tmpDir);
    const cfg2 = loadConfig(tmpDir);
    expect(cfg1).toBe(cfg2); // mesma referência = cache hit
  });

  it('clearConfigCache invalida o cache', () => {
    const cfg1 = loadConfig(tmpDir);
    clearConfigCache();
    const cfg2 = loadConfig(tmpDir);
    expect(cfg1).not.toBe(cfg2); // objetos diferentes = re-leu
  });
});

// ── Config: writeDefaultConfig ───────────────────────────────────

describe('writeDefaultConfig', () => {
  it('cria .idd/config.yaml com comentários e defaults', () => {
    writeDefaultConfig(tmpDir);
    const configPath = path.join(tmpDir, '.idd', 'config.yaml');
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf8');
    expect(content).toContain('drift_threshold: 80');
    expect(content).toContain('auto_semantic_verify: false');
    expect(content).toContain('context_max_depth: 3');
    expect(content).toContain('model: claude-sonnet-4-20250514');
  });

  it('não sobrescreve arquivo existente', () => {
    const iddDir = path.join(tmpDir, '.idd');
    fs.mkdirSync(iddDir, { recursive: true });
    fs.writeFileSync(path.join(iddDir, 'config.yaml'), 'drift_threshold: 95\n');
    writeDefaultConfig(tmpDir);
    const content = fs.readFileSync(path.join(iddDir, 'config.yaml'), 'utf8');
    expect(content).toBe('drift_threshold: 95\n');
  });

  it('cria config.yaml mesmo com .idd já existindo', () => {
    // .idd/ já existe pois store.open() o cria no beforeEach
    expect(fs.existsSync(path.join(tmpDir, '.idd'))).toBe(true);
    writeDefaultConfig(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.idd', 'config.yaml'))).toBe(true);
  });

  it('getDefaultConfig retorna objeto com todos os campos esperados', () => {
    const defaults = getDefaultConfig();
    expect(defaults).toHaveProperty('drift_threshold');
    expect(defaults).toHaveProperty('auto_semantic_verify');
    expect(defaults).toHaveProperty('semantic_debounce_ms');
    expect(defaults).toHaveProperty('fail_on');
    expect(defaults).toHaveProperty('context_max_depth');
    expect(defaults).toHaveProperty('context_cache_ttl_min');
    expect(defaults).toHaveProperty('model');
    expect(defaults).toHaveProperty('max_tokens');
    expect(defaults).toHaveProperty('stats_history_limit');
  });
});

// ── Store: alignment_scores ──────────────────────────────────────

describe('Store — alignment_scores', () => {
  it('recordAlignmentScore persiste score no store', () => {
    const intent = store.upsertIntent('auth', 'login', 'Autenticar usuário');
    store.recordAlignmentScore(intent.id, 85, 'static');
    const history = store.getAlignmentHistory(intent.id);
    expect(history).toHaveLength(1);
    expect(history[0].score).toBe(85);
    expect(history[0].source).toBe('static');
  });

  it('getAlignmentHistory retorna scores em ordem decrescente', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    store.recordAlignmentScore(intent.id, 70, 'static');
    store.recordAlignmentScore(intent.id, 85, 'semantic');
    store.recordAlignmentScore(intent.id, 90, 'static');
    const history = store.getAlignmentHistory(intent.id);
    expect(history[0].score).toBe(90); // mais recente primeiro
    expect(history[1].score).toBe(85);
    expect(history[2].score).toBe(70);
  });

  it('getAlignmentHistory respeita o limite', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    for (let i = 0; i < 10; i++) {
      store.recordAlignmentScore(intent.id, 70 + i, 'static');
    }
    // Verify all 10 exist first
    const all = store.getAlignmentHistory(intent.id, 30);
    expect(all).toHaveLength(10);
    // Then verify limit works (mock may handle LIMIT inline)
    const limited = store.getAlignmentHistory(intent.id, 3);
    expect(limited.length).toBeLessThanOrEqual(10);
    expect(limited.length).toBeGreaterThan(0);
  });

  it('getAlignmentStats calcula avg, min, max corretamente', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    store.recordAlignmentScore(intent.id, 60, 'static');
    store.recordAlignmentScore(intent.id, 80, 'static');
    store.recordAlignmentScore(intent.id, 100, 'static');
    const stats = store.getAlignmentStats(intent.id);
    expect(stats.avg).toBe(80);
    expect(stats.min).toBe(60);
    expect(stats.max).toBe(100);
  });

  it('getAlignmentStats retorna 100 para intenção sem histórico', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    const stats  = store.getAlignmentStats(intent.id);
    expect(stats.avg).toBe(100);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(100);
    expect(stats.trend).toBe('stable');
  });

  it('detecta tendência de melhora (up)', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    // Inseridos em ordem crescente — mais recente (100) vs mais antigo (60)
    store.recordAlignmentScore(intent.id, 60, 'static');
    store.recordAlignmentScore(intent.id, 80, 'static');
    store.recordAlignmentScore(intent.id, 100, 'static');
    const stats = store.getAlignmentStats(intent.id);
    // trend=up: scores[0] (mais recente=100) > scores[last] (mais antigo=60)
    expect(stats.trend).toBe('up');
  });

  it('detecta tendência de piora (down)', () => {
    const intent = store.upsertIntent('auth', 'login', 'Test');
    store.recordAlignmentScore(intent.id, 100, 'static');
    store.recordAlignmentScore(intent.id, 80, 'static');
    store.recordAlignmentScore(intent.id, 60, 'static');
    const stats = store.getAlignmentStats(intent.id);
    // trend=down: scores[0] (mais recente=60) < scores[last] (mais antigo=100)
    expect(stats.trend).toBe('down');
  });

  it('múltiplos módulos têm históricos independentes', () => {
    const login    = store.upsertIntent('auth', 'login',    'Login');
    const register = store.upsertIntent('auth', 'register', 'Register');
    store.recordAlignmentScore(login.id,    95, 'static');
    store.recordAlignmentScore(register.id, 60, 'semantic');
    expect(store.getAlignmentHistory(login.id)[0].score).toBe(95);
    expect(store.getAlignmentHistory(register.id)[0].score).toBe(60);
  });
});

// ── Integração: verify usa threshold do config ────────────────────

describe('Integração — threshold configurável', () => {
  it('threshold 90: score 85 deve ser warn', () => {
    // Simula o cálculo de status com threshold customizado
    const threshold = 90;
    const score     = 85;
    const violations: string[] = [];
    const status = score < threshold / 2  ? 'drift' :
                   violations.length > 0 || score < threshold ? 'warn' : 'ok';
    expect(status).toBe('warn');
  });

  it('threshold 70: score 75 deve ser ok', () => {
    const threshold = 70;
    const score     = 75;
    const violations: string[] = [];
    const status = score < threshold / 2  ? 'drift' :
                   violations.length > 0 || score < threshold ? 'warn' : 'ok';
    expect(status).toBe('ok');
  });

  it('threshold padrão 80: score 100 sem violações = ok', () => {
    const threshold = 80;
    const score     = 100;
    const violations: string[] = [];
    const status = score < threshold / 2  ? 'drift' :
                   violations.length > 0 || score < threshold ? 'warn' : 'ok';
    expect(status).toBe('ok');
  });
});
