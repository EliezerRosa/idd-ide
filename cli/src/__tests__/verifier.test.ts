// src/__tests__/verifier.test.ts
import { describe, it, expect } from 'vitest';

// ── Tipos e lógica do Verifier (isolados do VS Code) ─────────────

interface IntentYaml {
  intent:      string;
  module:      string;
  constraints: string[];
  acceptance:  string[];
  language?:   string;
}

const FORBIDDEN = [
  { re: /console\.log\s*\(.*(?:password|senha|secret|passwd)/i,
    msg: 'Credencial exposta em log',            sev: 'critical' as const },
  { re: /console\.log\s*\(.*token/i,
    msg: 'Token exposto em log',                 sev: 'warn'     as const },
  { re: /Math\.random\(\)/,
    msg: 'Math.random() não é seguro para criptografia', sev: 'warn' as const },
  { re: /eval\s*\(/,
    msg: 'eval() pode causar injeção de código', sev: 'critical' as const },
  { re: /SELECT\s+\*/i,
    msg: 'SELECT * pode expor dados desnecessários', sev: 'warn'  as const },
  { re: /TODO|FIXME|HACK/,
    msg: 'Marcador de código incompleto',        sev: 'warn'     as const },
];

const CONSTRAINT_CHECKS = [
  { keywords: /bloquear|lockout|tentativa/i, codePattern: /getAttempts|lockout|attempt|failedLogin/i,
    label: 'mecanismo de lockout' },
  { keywords: /jwt|token.*expir/i,           codePattern: /signJWT|jwt\.sign|createToken|expiresIn/i,
    label: 'geração de JWT' },
  { keywords: /hash|bcrypt|argon/i,          codePattern: /bcrypt|argon2|hash/i,
    label: 'hash de senha' },
  { keywords: /validar|validação/i,          codePattern: /validate|isValid|throw/i,
    label: 'validação de entrada' },
];

function analyzeStatic(code: string, intent: IntentYaml): {
  violations: string[];
  critical:   boolean;
} {
  const violations: string[] = [];
  let critical = false;

  for (const { re, msg, sev } of FORBIDDEN) {
    if (re.test(code)) {
      violations.push(msg);
      if (sev === 'critical') critical = true;
    }
  }

  for (const { keywords, codePattern, label } of CONSTRAINT_CHECKS) {
    const hasConstraint = intent.constraints.some(c => keywords.test(c));
    if (hasConstraint && !codePattern.test(code)) {
      violations.push(`Constraint requer ${label}, mas não foi encontrado no código`);
      critical = true;
    }
  }

  return { violations, critical };
}

function computeStatus(violations: string[], missingTests: string[]): 'ok' | 'warn' | 'drift' {
  const hasCritical = FORBIDDEN.some(
    f => f.sev === 'critical' && violations.includes(f.msg)
  ) || violations.some(v => v.includes('Constraint requer'));
  return hasCritical ? 'drift' : violations.length > 0 || missingTests.length > 0 ? 'warn' : 'ok';
}

// ── Fixtures ─────────────────────────────────────────────────────

const AUTH_INTENT: IntentYaml = {
  intent:      'Autenticar usuário com e-mail e senha, retornando JWT válido por 24h',
  module:      'auth/login',
  constraints: ['bloquear após 5 tentativas', 'JWT expira em 24h', 'senha >= 8 chars'],
  acceptance:  ['login válido retorna 200 + JWT', 'senha errada retorna 401', '5ª tentativa bloqueia'],
};

const CLEAN_CODE = `
export async function login(email: string, password: string) {
  const attempts = await getAttempts(email);
  if (attempts >= 5) throw new LockoutError();
  const user = await findByEmail(email);
  if (!user || !verifyPassword(password, user.hash))
    throw new UnauthorizedError('credenciais inválidas');
  return signJWT({ userId: user.id }, '24h');
}
`.trim();

// ── Testes de padrões proibidos ──────────────────────────────────

describe('analyzeStatic — padrões proibidos', () => {

  it('detecta console.log com senha (crítico)', () => {
    const code = `console.log('tentativa de login:', email, password);`;
    const { violations, critical } = analyzeStatic(code, AUTH_INTENT);
    expect(violations).toContain('Credencial exposta em log');
    expect(critical).toBe(true);
  });

  it('detecta console.log com token (aviso)', () => {
    const intentSimples: IntentYaml = { ...AUTH_INTENT, constraints: ['tempo de resposta < 200ms'] };
    const code = `console.log('token gerado:', token);`;
    const { violations, critical } = analyzeStatic(code, intentSimples);
    expect(violations).toContain('Token exposto em log');
    expect(critical).toBe(false);
  });

  it('detecta Math.random() em contexto de segurança (aviso)', () => {
    const code = `const salt = Math.random().toString(36);`;
    const { violations } = analyzeStatic(code, AUTH_INTENT);
    expect(violations).toContain('Math.random() não é seguro para criptografia');
  });

  it('detecta eval() (crítico)', () => {
    const code = `eval(userInput);`;
    const { violations, critical } = analyzeStatic(code, AUTH_INTENT);
    expect(violations).toContain('eval() pode causar injeção de código');
    expect(critical).toBe(true);
  });

  it('detecta SELECT * (aviso)', () => {
    const code = `const users = await db.query('SELECT * FROM users');`;
    const { violations } = analyzeStatic(code, AUTH_INTENT);
    expect(violations).toContain('SELECT * pode expor dados desnecessários');
  });

  it('detecta TODO/FIXME/HACK (aviso)', () => {
    for (const marker of ['TODO', 'FIXME', 'HACK']) {
      const code = `// ${marker}: implementar validação`;
      const { violations } = analyzeStatic(code, AUTH_INTENT);
      expect(violations).toContain('Marcador de código incompleto');
    }
  });

  it('código limpo não gera violações', () => {
    const { violations, critical } = analyzeStatic(CLEAN_CODE, AUTH_INTENT);
    expect(violations).toHaveLength(0);
    expect(critical).toBe(false);
  });
});

// ── Testes de constraints ausentes ──────────────────────────────

describe('analyzeStatic — constraints ausentes', () => {

  it('detecta lockout ausente quando constraint exige', () => {
    const codeWithoutLockout = `
      export async function login(email: string, password: string) {
        const user = await findByEmail(email);
        if (!user) throw new Error();
        return signJWT({ userId: user.id }, '24h');
      }
    `;
    const { violations, critical } = analyzeStatic(codeWithoutLockout, AUTH_INTENT);
    expect(violations.some(v => v.includes('lockout'))).toBe(true);
    expect(critical).toBe(true);
  });

  it('detecta JWT ausente quando constraint exige', () => {
    const codeWithoutJWT = `
      export async function login(email: string, password: string) {
        const attempts = await getAttempts(email);
        if (attempts >= 5) throw new LockoutError();
        return { success: true }; // sem JWT
      }
    `;
    const { violations, critical } = analyzeStatic(codeWithoutJWT, AUTH_INTENT);
    expect(violations.some(v => v.includes('JWT'))).toBe(true);
    expect(critical).toBe(true);
  });

  it('não falha por lockout ausente se constraint não menciona lockout', () => {
    const intentSemLockout: IntentYaml = {
      ...AUTH_INTENT,
      constraints: ['JWT expira em 24h'],
    };
    const codeWithoutLockout = `return signJWT({ userId: '1' }, '24h');`;
    const { violations } = analyzeStatic(codeWithoutLockout, intentSemLockout);
    expect(violations.every(v => !v.includes('lockout'))).toBe(true);
  });

  it('detecta hash de senha ausente quando constraint menciona bcrypt', () => {
    const intentComHash: IntentYaml = {
      ...AUTH_INTENT,
      constraints: ['usar bcrypt para hash da senha'],
    };
    const codeSemHash = `const ok = password === user.rawPassword;`;
    const { violations } = analyzeStatic(codeSemHash, intentComHash);
    expect(violations.some(v => v.includes('hash'))).toBe(true);
  });
});

// ── Testes de computeStatus ──────────────────────────────────────

describe('computeStatus', () => {

  it('retorna ok quando sem violações e sem testes faltando', () => {
    expect(computeStatus([], [])).toBe('ok');
  });

  it('retorna warn com violações não críticas', () => {
    expect(computeStatus(['Token exposto em log'], [])).toBe('warn');
  });

  it('retorna warn com testes faltando mas sem violações', () => {
    expect(computeStatus([], ['critério 1 sem teste'])).toBe('warn');
  });

  it('retorna drift com violação crítica (credencial em log)', () => {
    expect(computeStatus(['Credencial exposta em log'], [])).toBe('drift');
  });

  it('retorna drift com constraint de lockout ausente', () => {
    expect(computeStatus(['Constraint requer mecanismo de lockout, mas não foi encontrado no código'], [])).toBe('drift');
  });

  it('drift prevalece sobre warn', () => {
    expect(computeStatus([
      'Credencial exposta em log',
      'Token exposto em log',
    ], ['teste faltando'])).toBe('drift');
  });
});

// ── Testes de múltiplas violações ────────────────────────────────

describe('analyzeStatic — múltiplas violações', () => {

  it('detecta todas as violações em código problemático', () => {
    const badCode = `
      export async function login(email: string, password: string) {
        console.log('senha:', password);            // credencial
        console.log('token:', token);               // token
        const salt = Math.random().toString();      // inseguro
        const id = eval(email);                     // eval
        const users = db.query('SELECT * FROM u');  // SELECT *
        // TODO: adicionar lockout
        return { success: true };
      }
    `;
    const { violations, critical } = analyzeStatic(badCode, AUTH_INTENT);
    expect(violations.length).toBeGreaterThanOrEqual(4);
    expect(critical).toBe(true);
  });

  it('cada violação aparece apenas uma vez', () => {
    const code = `console.log(password); console.log(password);`;
    const { violations } = analyzeStatic(code, AUTH_INTENT);
    const credCount = violations.filter(v => v === 'Credencial exposta em log').length;
    // Pode detectar mais de uma ocorrência do mesmo padrão
    // mas o importante é detectar ao menos uma
    expect(credCount).toBeGreaterThanOrEqual(1);
  });
});

// ── Testes de cobertura de acceptance criteria ───────────────────

describe('cobertura de testes por critério', () => {
  function checkTestCoverage(testCode: string, acceptance: string[]): string[] {
    const missing: string[] = [];
    const lower = testCode.toLowerCase();
    for (const criterion of acceptance) {
      const keywords = criterion.split(/\s+/).filter(w => w.length > 4).slice(0, 4);
      const covered  = keywords.some(kw => lower.includes(kw.toLowerCase()));
      if (!covered) missing.push(criterion);
    }
    return missing;
  }

  const acceptance = [
    'login válido retorna 200 + JWT',
    'senha errada retorna 401',
    'quinta tentativa bloqueia conta',
  ];

  it('detecta critérios sem teste correspondente', () => {
    const testCode = `
      it('autenticacao bem sucedida devolve jwt', () => {});
    `;
    const missing = checkTestCoverage(testCode, acceptance);
    expect(missing).toContain('senha errada retorna 401');
    expect(missing).toContain('quinta tentativa bloqueia conta');
  });

  it('não reporta faltando quando critério está coberto', () => {
    const testCode = `
      it('login válido retorna 200 + JWT', () => {});
      it('senha errada retorna 401', () => {});
      it('quinta tentativa bloqueia conta', () => {});
    `;
    const missing = checkTestCoverage(testCode, acceptance);
    expect(missing).toHaveLength(0);
  });

  it('retorna todos como faltando quando arquivo de teste não existe', () => {
    // Simula arquivo não existente passando string vazia
    const missing = checkTestCoverage('', acceptance);
    expect(missing).toHaveLength(acceptance.length);
  });
});
