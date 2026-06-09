// src/__tests__/diff.test.ts — Issue #7: idd diff com LCS real
import { describe, it, expect } from 'vitest';
import { computeLcsDiff, diffStats } from '../commands/diff.ts';

// ── Testes: LCS básico ───────────────────────────────────────────

describe('computeLcsDiff — textos idênticos', () => {
  it('dois textos iguais geram apenas linhas ok', () => {
    const code = 'function login() {}\nexport default login;';
    const diff = computeLcsDiff(code, code);
    expect(diff.every(l => l.kind === 'ok')).toBe(true);
  });

  it('número de linhas bate com o texto', () => {
    const code = 'a\nb\nc';
    const diff = computeLcsDiff(code, code);
    expect(diff).toHaveLength(3);
    expect(diff[0].lineNo).toBe(1);
    expect(diff[2].lineNo).toBe(3);
  });

  it('linhas ok têm originalLineNo igual ao lineNo', () => {
    const code = 'x = 1\ny = 2';
    const diff = computeLcsDiff(code, code);
    diff.forEach(l => {
      expect(l.originalLineNo).toBe(l.lineNo);
    });
  });
});

describe('computeLcsDiff — linhas adicionadas', () => {
  it('detecta linha adicionada no final', () => {
    const original = 'function login() {}\n';
    const current  = 'function login() {}\nconsole.log("debug");\n';
    const diff     = computeLcsDiff(original, current);
    const added    = diff.filter(l => l.kind === 'added');
    expect(added).toHaveLength(1);
    expect(added[0].content).toContain('console.log');
  });

  it('detecta linha adicionada no meio', () => {
    const original = 'line1\nline3\n';
    const current  = 'line1\nline2\nline3\n';
    const diff     = computeLcsDiff(original, current);
    const added    = diff.filter(l => l.kind === 'added');
    expect(added).toHaveLength(1);
    expect(added[0].content).toBe('line2');
  });

  it('linhas adicionadas não têm originalLineNo', () => {
    const diff  = computeLcsDiff('a\n', 'a\nb\n');
    const added = diff.filter(l => l.kind === 'added');
    expect(added[0].originalLineNo).toBeUndefined();
  });

  it('múltiplas linhas adicionadas numeradas sequencialmente', () => {
    const diff  = computeLcsDiff('', 'a\nb\nc\n');
    const added = diff.filter(l => l.kind === 'added');
    expect(added[0].lineNo).toBe(1);
    expect(added[1].lineNo).toBe(2);
    expect(added[2].lineNo).toBe(3);
  });
});

describe('computeLcsDiff — linhas removidas', () => {
  it('detecta linha removida do final', () => {
    const original = 'function login() {}\nconsole.log("debug");\n';
    const current  = 'function login() {}\n';
    const diff     = computeLcsDiff(original, current);
    const removed  = diff.filter(l => l.kind === 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].content).toContain('console.log');
  });

  it('detecta linha removida do meio', () => {
    const original = 'line1\nline2\nline3\n';
    const current  = 'line1\nline3\n';
    const diff     = computeLcsDiff(original, current);
    const removed  = diff.filter(l => l.kind === 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].content).toBe('line2');
  });

  it('linha removida tem originalLineNo correto', () => {
    const original = 'a\nb\nc\n';
    const current  = 'a\nc\n';
    const diff     = computeLcsDiff(original, current);
    const removed  = diff.filter(l => l.kind === 'removed');
    expect(removed[0].originalLineNo).toBe(2); // 'b' era linha 2
  });
});

describe('computeLcsDiff — linhas modificadas (add+remove)', () => {
  it('linha alterada aparece como remove + add', () => {
    const original = 'return jwt.sign({}, "1h");\n';
    const current  = 'return jwt.sign({}, "24h");\n';
    const diff     = computeLcsDiff(original, current);
    const removed  = diff.filter(l => l.kind === 'removed');
    const added    = diff.filter(l => l.kind === 'added');
    expect(removed.length).toBeGreaterThan(0);
    expect(added.length).toBeGreaterThan(0);
  });

  it('diff entre textos completamente diferentes gera only add+remove', () => {
    const diff    = computeLcsDiff('abc\n', 'xyz\n');
    const removed = diff.filter(l => l.kind === 'removed');
    const added   = diff.filter(l => l.kind === 'added');
    expect(removed).toHaveLength(1);
    expect(added).toHaveLength(1);
  });
});

// ── Testes: drift detection inline ──────────────────────────────

describe('computeLcsDiff — anotações de drift inline', () => {
  it('linha adicionada com console.log+password marcada como drift', () => {
    const original = 'function login(e, p) { return token; }\n';
    const current  = 'function login(e, p) { console.log(p); return token; }\n';
    const diff     = computeLcsDiff(original, current);
    // The added line with console.log(p) — p is a password variable
    // Won't trigger because 'p' doesn't match /password|senha|secret|passwd/
    // Let's use a name that matches
    const current2 = 'function login(e, password) { console.log(password); return token; }\n';
    const diff2    = computeLcsDiff(original, current2);
    const driftLines = diff2.filter(l => l.kind === 'drift');
    expect(driftLines.length).toBeGreaterThan(0);
  });

  it('linha adicionada com eval() marcada como drift', () => {
    const original = 'const x = data;\n';
    const current  = 'const x = eval(data);\n';
    const diff     = computeLcsDiff(original, current);
    const driftLines = diff.filter(l => l.kind === 'drift');
    expect(driftLines.length).toBeGreaterThan(0);
    expect(driftLines[0].annotation).toMatch(/DRIFT|eval/i);
  });

  it('linha adicionada com Math.random() marcada como warn', () => {
    const original = 'const salt = crypto.randomBytes(16);\n';
    const current  = 'const salt = Math.random().toString();\n';
    const diff     = computeLcsDiff(original, current);
    const warnLines = diff.filter(l => l.kind === 'warn');
    expect(warnLines.length).toBeGreaterThan(0);
  });

  it('linha adicionada com TODO marcada como warn', () => {
    const diff = computeLcsDiff('', '// TODO: implementar lockout\n');
    const warn = diff.filter(l => l.kind === 'warn');
    expect(warn).toHaveLength(1);
    expect(warn[0].annotation).toMatch(/incompleto|TODO/i);
  });

  it('linhas removidas não recebem anotação de drift', () => {
    const original = 'console.log(password);\n';
    const current  = '\n';
    const diff     = computeLcsDiff(original, current);
    const removed  = diff.filter(l => l.kind === 'removed');
    expect(removed).toHaveLength(1);
    // Removed line is just 'removed' — no drift annotation applied to deletions
    expect(removed[0].kind).toBe('removed');
  });
});

// ── Testes: diffStats ────────────────────────────────────────────

describe('diffStats', () => {
  it('retorna 0 adicionadas e 0 removidas para textos iguais', () => {
    const code  = 'line1\nline2\n';
    const diff  = computeLcsDiff(code, code);
    const stats = diffStats(diff);
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
  });

  it('conta linhas adicionadas corretamente', () => {
    const diff  = computeLcsDiff('a\n', 'a\nb\nc\n');
    const stats = diffStats(diff);
    expect(stats.added).toBe(2);
    expect(stats.removed).toBe(0);
  });

  it('conta linhas removidas corretamente', () => {
    const diff  = computeLcsDiff('a\nb\nc\n', 'a\n');
    const stats = diffStats(diff);
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(2);
  });

  it('conta adds e removes independentemente', () => {
    const diff  = computeLcsDiff('a\nb\n', 'a\nc\nd\n');
    const stats = diffStats(diff);
    expect(stats.added).toBeGreaterThan(0);
    expect(stats.removed).toBeGreaterThan(0);
  });
});

// ── Testes: casos de borda ────────────────────────────────────────

describe('computeLcsDiff — casos de borda', () => {
  it('diff com original vazio retorna todas adicionadas', () => {
    const diff = computeLcsDiff('', 'a\nb\nc\n');
    expect(diff.every(l => l.kind === 'added')).toBe(true);
  });

  it('diff com current vazio retorna todas removidas', () => {
    const diff = computeLcsDiff('a\nb\nc\n', '');
    expect(diff.every(l => l.kind === 'removed')).toBe(true);
  });

  it('diff com ambos vazios retorna array vazio', () => {
    expect(computeLcsDiff('', '')).toHaveLength(0);
  });

  it('diff de arquivo grande completo em <100ms', () => {
    const genCode = Array.from({ length: 200 }, (_, i) => `const x${i} = ${i};`).join('\n');
    const curCode = Array.from({ length: 200 }, (_, i) =>
      i % 20 === 0 ? `// changed line ${i}` : `const x${i} = ${i};`
    ).join('\n');
    const start = Date.now();
    computeLcsDiff(genCode, curCode);
    expect(Date.now() - start).toBeLessThan(100);
  });
});

// ── Testes: cenário realista auth/login ──────────────────────────

describe('computeLcsDiff — cenário realista auth/login', () => {
  const GENERATED = `
export async function login(email: string, password: string) {
  const attempts = await getAttempts(email);
  if (attempts >= 5) throw new LockoutError();
  const user = await findByEmail(email);
  if (!user || !verifyPassword(password, user.hash)) {
    await incrementAttempts(email);
    throw new UnauthorizedError('credenciais invalidas');
  }
  return signJWT({ userId: user.id }, '24h');
}`.trim();

  const WITH_DRIFT = `
export async function login(email: string, password: string) {
  // TODO: adicionar lockout depois
  const user = await findByEmail(email);
  console.log('login attempt: ' + email + ' / ' + password);
  if (!user || !verifyPassword(password, user.hash)) {
    throw new UnauthorizedError('invalido');
  }
  return signJWT({ userId: user.id }, '1h');
}`.trim();

  it('detecta linhas removidas (lockout removido)', () => {
    const diff    = computeLcsDiff(GENERATED, WITH_DRIFT);
    const removed = diff.filter(l => l.kind === 'removed');
    expect(removed.some(l => l.content.includes('getAttempts'))).toBe(true);
  });

  it('detecta TODO como warn', () => {
    const diff = computeLcsDiff(GENERATED, WITH_DRIFT);
    const warn = diff.filter(l => l.kind === 'warn');
    expect(warn.some(l => l.content.includes('TODO'))).toBe(true);
  });

  it('detecta console.log com password como drift', () => {
    const diff  = computeLcsDiff(GENERATED, WITH_DRIFT);
    const drift = diff.filter(l => l.kind === 'drift');
    expect(drift.some(l => l.content.includes('console.log'))).toBe(true);
  });

  it('linhas inalteradas permanecem como ok', () => {
    const diff = computeLcsDiff(GENERATED, WITH_DRIFT);
    const ok   = diff.filter(l => l.kind === 'ok');
    expect(ok.some(l => l.content.includes('findByEmail'))).toBe(true);
    expect(ok.some(l => l.content.includes('export async function'))).toBe(true);
  });

  it('diffStats mostra adds e removes significativos', () => {
    const diff  = computeLcsDiff(GENERATED, WITH_DRIFT);
    const stats = diffStats(diff);
    expect(stats.added).toBeGreaterThan(0);
    expect(stats.removed).toBeGreaterThan(0);
  });
});
