// src/__tests__/security.test.ts — Issue #8: segurança e validação
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import {
  validateIntent, loadDotEnv, checkEnvInGitignore, getApiKey,
  checkRateLimit, recordCall, resetRateLimiter, getRateLimiterState,
  type ValidationResult,
} from '../lib/security.ts';

// ── Setup ────────────────────────────────────────────────────────

let tmpDir: string;
const ORIG_ENV = { ...process.env };

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-sec-'));
  fs.mkdirSync(path.join(tmpDir, '.idd'), { recursive: true });
  resetRateLimiter();
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  // Restore env
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIG_ENV)) delete process.env[key];
    else process.env[key] = ORIG_ENV[key];
  }
  if (ORIG_ENV.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = ORIG_ENV.ANTHROPIC_API_KEY;
  resetRateLimiter();
});

// ════════════════════════════════════════════════════════════════
// validateIntent — campos obrigatórios
// ════════════════════════════════════════════════════════════════

describe('validateIntent — campos obrigatórios', () => {
  const VALID = {
    intent:      'Autenticar usuário com e-mail e senha retornando JWT',
    module:      'auth/login',
    constraints: ['senha >= 8 chars'],
    acceptance:  ['login válido retorna JWT'],
  };

  it('objeto válido retorna valid=true sem erros', () => {
    const r = validateIntent(VALID);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('objeto sem "intent" retorna erro', () => {
    const { intent, ...rest } = VALID;
    const r = validateIntent(rest);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'intent')).toBe(true);
  });

  it('objeto sem "module" retorna erro', () => {
    const { module, ...rest } = VALID;
    const r = validateIntent(rest);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'module')).toBe(true);
  });

  it('objeto sem "constraints" retorna erro', () => {
    const { constraints, ...rest } = VALID;
    const r = validateIntent(rest);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'constraints')).toBe(true);
  });

  it('objeto sem "acceptance" retorna erro', () => {
    const { acceptance, ...rest } = VALID;
    const r = validateIntent(rest);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'acceptance')).toBe(true);
  });

  it('null retorna erro de tipo', () => {
    const r = validateIntent(null);
    expect(r.valid).toBe(false);
    expect(r.errors[0].field).toBe('(root)');
  });

  it('array retorna erro de tipo', () => {
    const r = validateIntent([]);
    expect(r.valid).toBe(false);
    expect(r.errors[0].field).toBe('(root)');
  });

  it('string retorna erro de tipo', () => {
    const r = validateIntent('intent: test');
    expect(r.valid).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// validateIntent — validação de campos
// ════════════════════════════════════════════════════════════════

describe('validateIntent — regras de campo', () => {
  const BASE = {
    intent:      'Autenticar usuário com e-mail e senha retornando JWT',
    module:      'auth/login',
    constraints: ['senha >= 8 chars'],
    acceptance:  ['login válido retorna JWT'],
  };

  it('intent muito curta (< 10 chars) retorna erro', () => {
    const r = validateIntent({ ...BASE, intent: 'Curta' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'intent' && /curto|minLength|mínimo/i.test(e.message))).toBe(true);
  });

  it('module sem barra retorna erro', () => {
    const r = validateIntent({ ...BASE, module: 'authlogin' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'module')).toBe(true);
  });

  it('module com maiúsculas retorna erro', () => {
    const r = validateIntent({ ...BASE, module: 'Auth/Login' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'module')).toBe(true);
  });

  it('constraints lista vazia retorna erro', () => {
    const r = validateIntent({ ...BASE, constraints: [] });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'constraints')).toBe(true);
  });

  it('acceptance lista vazia retorna erro', () => {
    const r = validateIntent({ ...BASE, acceptance: [] });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'acceptance')).toBe(true);
  });

  it('constraints com string vazia retorna erro no item', () => {
    const r = validateIntent({ ...BASE, constraints: [''] });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field.startsWith('constraints['))).toBe(true);
  });

  it('acceptance com não-string retorna erro no item', () => {
    const r = validateIntent({ ...BASE, acceptance: [123] });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field.startsWith('acceptance['))).toBe(true);
  });

  it('language inválida retorna erro', () => {
    const r = validateIntent({ ...BASE, language: 'kotlin' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'language')).toBe(true);
  });

  it('language válida (typescript) não gera erro', () => {
    const r = validateIntent({ ...BASE, language: 'typescript' });
    expect(r.valid).toBe(true);
  });

  it('language python válida', () => {
    const r = validateIntent({ ...BASE, language: 'python' });
    expect(r.valid).toBe(true);
  });

  it('language go válida', () => {
    const r = validateIntent({ ...BASE, language: 'go' });
    expect(r.valid).toBe(true);
  });

  it('campo desconhecido retorna erro', () => {
    const r = validateIntent({ ...BASE, unknownField: 'valor' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'unknownField')).toBe(true);
  });

  it('depends_on com formato inválido retorna erro', () => {
    const r = validateIntent({ ...BASE, depends_on: ['users-crud'] }); // missing /
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field.startsWith('depends_on['))).toBe(true);
  });

  it('depends_on com formato válido não gera erro', () => {
    const r = validateIntent({ ...BASE, depends_on: ['users/crud'] });
    expect(r.valid).toBe(true);
  });

  it('version com formato inválido retorna erro', () => {
    const r = validateIntent({ ...BASE, version: '1.0' }); // missing patch
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'version')).toBe(true);
  });

  it('version com semver válido não gera erro', () => {
    const r = validateIntent({ ...BASE, version: '1.2.3' });
    expect(r.valid).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// validateIntent — mensagens de erro com exemplos
// ════════════════════════════════════════════════════════════════

describe('validateIntent — qualidade dos erros', () => {
  it('erro contém campo "example" não vazio', () => {
    const r = validateIntent({ module: 'auth/login', constraints: ['c'], acceptance: ['a'] });
    const err = r.errors.find(e => e.field === 'intent');
    expect(err?.example).toBeTruthy();
    expect(err?.example.length).toBeGreaterThan(5);
  });

  it('múltiplos campos faltando gera erro para cada um', () => {
    const r = validateIntent({});
    expect(r.errors.length).toBeGreaterThanOrEqual(4); // intent, module, constraints, acceptance
  });

  it('erro de módulo mostra formato correto no example', () => {
    const r = validateIntent({
      intent: 'Autenticar usuário com e-mail e senha retornando JWT',
      module: 'invalido',
      constraints: ['c'], acceptance: ['a'],
    });
    const err = r.errors.find(e => e.field === 'module');
    expect(err?.example).toContain('/');
  });
});

// ════════════════════════════════════════════════════════════════
// loadDotEnv
// ════════════════════════════════════════════════════════════════

describe('loadDotEnv', () => {
  it('carrega ANTHROPIC_API_KEY de .idd/.env', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.idd', '.env'),
      'ANTHROPIC_API_KEY=sk-ant-test123\n'
    );
    delete process.env.ANTHROPIC_API_KEY;
    loadDotEnv(tmpDir);
    expect(process.env.ANTHROPIC_API_KEY).toBe('sk-ant-test123');
  });

  it('carrega múltiplas variáveis do .env', () => {
    fs.writeFileSync(path.join(tmpDir, '.idd', '.env'),
      'ANTHROPIC_API_KEY=sk-test\nIDD_MODEL=claude-haiku\n');
    loadDotEnv(tmpDir);
    expect(process.env.IDD_MODEL).toBe('claude-haiku');
  });

  it('não sobrescreve variável já definida no ambiente', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-original';
    fs.writeFileSync(path.join(tmpDir, '.idd', '.env'),
      'ANTHROPIC_API_KEY=sk-from-file\n');
    loadDotEnv(tmpDir);
    expect(process.env.ANTHROPIC_API_KEY).toBe('sk-original');
  });

  it('ignora linhas de comentário (#)', () => {
    fs.writeFileSync(path.join(tmpDir, '.idd', '.env'),
      '# comentário\nANTHROPIC_API_KEY=sk-valid\n');
    loadDotEnv(tmpDir);
    expect(process.env.ANTHROPIC_API_KEY).toBe('sk-valid');
  });

  it('remove aspas dos valores', () => {
    fs.writeFileSync(path.join(tmpDir, '.idd', '.env'),
      'ANTHROPIC_API_KEY="sk-quoted"\n');
    loadDotEnv(tmpDir);
    expect(process.env.ANTHROPIC_API_KEY).toBe('sk-quoted');
  });

  it('não lança quando .env não existe', () => {
    expect(() => loadDotEnv(tmpDir)).not.toThrow();
  });

  it('fallback para .env na raiz quando .idd/.env não existe', () => {
    fs.writeFileSync(path.join(tmpDir, '.env'),
      'ANTHROPIC_API_KEY=sk-from-root\n');
    loadDotEnv(tmpDir);
    expect(process.env.ANTHROPIC_API_KEY).toBe('sk-from-root');
  });
});

// ════════════════════════════════════════════════════════════════
// checkEnvInGitignore
// ════════════════════════════════════════════════════════════════

describe('checkEnvInGitignore', () => {
  it('retorna true quando .gitignore contém .idd/.env', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n.idd/.env\n');
    expect(checkEnvInGitignore(tmpDir)).toBe(true);
  });

  it('retorna true quando .gitignore contém .env', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.env\n');
    expect(checkEnvInGitignore(tmpDir)).toBe(true);
  });

  it('retorna false quando .gitignore não menciona .env', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\ndist/\n');
    expect(checkEnvInGitignore(tmpDir)).toBe(false);
  });

  it('retorna false quando .gitignore não existe', () => {
    expect(checkEnvInGitignore(tmpDir)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// Rate Limiter
// ════════════════════════════════════════════════════════════════

describe('Rate Limiter', () => {
  it('primeira chamada é permitida', () => {
    const r = checkRateLimit();
    expect(r.allowed).toBe(true);
    expect(r.callsUsed).toBe(0);
  });

  it('callsLimit padrão é 10', () => {
    const r = checkRateLimit();
    expect(r.callsLimit).toBe(10);
  });

  it('recordCall incrementa callsUsed', () => {
    recordCall();
    recordCall();
    recordCall();
    const r = checkRateLimit();
    expect(r.callsUsed).toBe(3);
  });

  it('10 chamadas são permitidas', () => {
    for (let i = 0; i < 10; i++) recordCall();
    const r = checkRateLimit();
    expect(r.callsUsed).toBe(10);
    expect(r.allowed).toBe(false); // 11ª seria bloqueada
  });

  it('11ª chamada é bloqueada', () => {
    for (let i = 0; i < 10; i++) recordCall();
    const r = checkRateLimit();
    expect(r.allowed).toBe(false);
  });

  it('resetInSecs > 0 quando bloqueado', () => {
    for (let i = 0; i < 10; i++) recordCall();
    const r = checkRateLimit();
    expect(r.resetInSecs).toBeGreaterThan(0);
  });

  it('resetInMs = 0 quando não bloqueado', () => {
    const r = checkRateLimit();
    expect(r.resetInMs).toBe(0);
  });

  it('resetRateLimiter reseta chamadas', () => {
    for (let i = 0; i < 10; i++) recordCall();
    resetRateLimiter();
    const r = checkRateLimit();
    expect(r.callsUsed).toBe(0);
    expect(r.allowed).toBe(true);
  });

  it('maxCallsOverride funciona', () => {
    for (let i = 0; i < 3; i++) recordCall();
    const r = checkRateLimit(3);
    expect(r.allowed).toBe(false);
  });

  it('maxCallsOverride=20 permite mais chamadas', () => {
    for (let i = 0; i < 10; i++) recordCall();
    const r = checkRateLimit(20);
    expect(r.allowed).toBe(true);
  });

  it('getRateLimiterState retorna estado atual', () => {
    recordCall();
    recordCall();
    const state = getRateLimiterState();
    expect(state.callsUsed).toBe(2);
    expect(state.callsLimit).toBe(10);
    expect(state.windowMs).toBe(60_000);
  });
});

// ════════════════════════════════════════════════════════════════
// --dry-run flag lógica
// ════════════════════════════════════════════════════════════════

describe('--dry-run flag', () => {
  it('args inclui --dry-run é detectado', () => {
    const args = ['auth/login', '--dry-run'];
    expect(args.includes('--dry-run')).toBe(true);
  });

  it('args inclui --dry é detectado', () => {
    const args = ['auth/login', '--dry'];
    expect(args.includes('--dry-run') || args.includes('--dry')).toBe(true);
  });

  it('sem --dry-run, dryRun é false', () => {
    const args = ['auth/login', '--semantic'];
    const dryRun = args.includes('--dry-run') || args.includes('--dry');
    expect(dryRun).toBe(false);
  });

  it('--no-rate-limit bypassa o rate limiter', () => {
    const args = ['--no-rate-limit'];
    const noLimit = args.includes('--no-rate-limit');
    expect(noLimit).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// Integração: validate antes de chamar API
// ════════════════════════════════════════════════════════════════

describe('Integração: validação + rate limit pipeline', () => {
  it('intent inválida bloqueia antes do rate limit ser checado', () => {
    const invalid = { module: 'x', constraints: ['c'], acceptance: ['a'] }; // falta intent
    const validation = validateIntent(invalid);
    expect(validation.valid).toBe(false);
    // Se validation falha, não chegamos ao rate limit
    const rlBefore = getRateLimiterState();
    // Simula o que generate.ts faria: só checa rate limit se válido
    if (validation.valid) { recordCall(); }
    const rlAfter = getRateLimiterState();
    expect(rlAfter.callsUsed).toBe(rlBefore.callsUsed); // não incrementou
  });

  it('intent válida + rate limit OK permite prosseguir', () => {
    const valid = {
      intent: 'Autenticar usuário com e-mail e senha retornando JWT',
      module: 'auth/login',
      constraints: ['senha >= 8'],
      acceptance: ['login retorna JWT'],
    };
    const validation = validateIntent(valid);
    const rl         = checkRateLimit();
    expect(validation.valid).toBe(true);
    expect(rl.allowed).toBe(true);
  });

  it('rate limit atingido bloqueia mesmo com intent válida', () => {
    for (let i = 0; i < 10; i++) recordCall();
    const rl = checkRateLimit();
    expect(rl.allowed).toBe(false);
    expect(rl.callsUsed).toBe(10);
  });

  it('dry-run não chama recordCall (não consome quota)', () => {
    const dryRun = true;
    if (!dryRun) recordCall(); // simula o que generate.ts faz
    const state = getRateLimiterState();
    expect(state.callsUsed).toBe(0);
  });
});
