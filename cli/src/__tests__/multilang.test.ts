// src/__tests__/multilang.test.ts — Issue #6: multi-linguagem e2e
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import {
  getLangConfig, autoDetectLanguage, detectLanguage, buildLangPrompt,
  runStaticChecks, generateTestScaffold, getFileExtension, getTestExtension,
  type Language,
} from '../lib/lang.ts';

// ── Setup ─────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-ml-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ════════════════════════════════════════════════════════════════
// Python
// ════════════════════════════════════════════════════════════════

describe('Python — configuração', () => {
  it('extensão de código é .py', () => {
    expect(getFileExtension('python')).toBe('py');
  });

  it('extensão de teste é test.py', () => {
    expect(getTestExtension('python')).toBe('test.py');
  });

  it('test runner é pytest', () => {
    expect(getLangConfig('python').testRunner).toBe('pytest');
  });

  it('prompt hints incluem type hints PEP 484', () => {
    const hints = buildLangPrompt('python');
    expect(hints).toContain('Python');
    expect(hints).toMatch(/type hints|PEP/i);
  });

  it('prompt hints incluem pytest', () => {
    const hints = buildLangPrompt('python');
    expect(hints).toContain('pytest');
  });

  it('prompt com framework inclui framework no texto', () => {
    const hints = buildLangPrompt('python', 'fastapi');
    expect(hints).toContain('fastapi');
  });
});

describe('Python — geração de scaffold de testes', () => {
  const acceptance = [
    'login válido retorna token JWT',
    'senha incorreta retorna 401',
    'conta bloqueada retorna 423',
  ];

  it('scaffold Python usa função def test_*', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'python');
    expect(s).toContain('def test_');
  });

  it('scaffold Python inclui import pytest', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'python');
    expect(s).toContain('import pytest');
  });

  it('scaffold Python importa o módulo correto', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'python');
    expect(s).toContain('from login import');
  });

  it('scaffold Python tem uma função de teste por critério', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'python');
    const count = (s.match(/def test_/g) ?? []).length;
    expect(count).toBe(acceptance.length);
  });

  it('scaffold Python inclui docstring com o critério', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'python');
    expect(s).toContain('login válido retorna token JWT');
  });
});

describe('Python — verificações estáticas', () => {
  it('detecta print com senha (critical)', () => {
    const checks = runStaticChecks(`print(f"debug: {password}")`, 'python');
    expect(checks.some(c => c.severity === 'critical' && /credencial|print/i.test(c.message))).toBe(true);
  });

  it('detecta except Exception genérico (warn)', () => {
    const checks = runStaticChecks(`
try:
    login(email, pwd)
except Exception:
    pass`, 'python');
    expect(checks.some(c => /Exception/i.test(c.message))).toBe(true);
    expect(checks.some(c => c.severity === 'warn')).toBe(true);
  });

  it('detecta bare except (warn)', () => {
    const checks = runStaticChecks(`
try:
    do_something()
except:
    pass`, 'python');
    expect(checks.some(c => /bare except/i.test(c.message))).toBe(true);
  });

  it('detecta eval() (critical)', () => {
    const checks = runStaticChecks(`result = eval(user_input)`, 'python');
    expect(checks.some(c => c.severity === 'critical' && /eval/i.test(c.message))).toBe(true);
  });

  it('detecta os.system() (warn)', () => {
    const checks = runStaticChecks(`os.system("rm -rf " + path)`, 'python');
    expect(checks.some(c => /os\.system/i.test(c.message))).toBe(true);
  });

  it('detecta subprocess com shell=True (critical)', () => {
    const checks = runStaticChecks(`subprocess.call(cmd, shell=True)`, 'python');
    expect(checks.some(c => c.severity === 'critical' && /shell=True/i.test(c.message))).toBe(true);
  });

  it('detecta pickle.loads (warn)', () => {
    const checks = runStaticChecks(`data = pickle.loads(raw)`, 'python');
    expect(checks.some(c => /pickle/i.test(c.message))).toBe(true);
  });

  it('código Python limpo não gera violações', () => {
    const clean = `
from typing import Optional
import bcrypt
import jwt

def login(email: str, password: str) -> str:
    user = find_by_email(email)
    if not user or not bcrypt.checkpw(password.encode(), user.password_hash):
        raise ValueError("Credenciais inválidas")
    return jwt.encode({"user_id": user.id}, SECRET_KEY, algorithm="HS256")`;
    const checks = runStaticChecks(clean, 'python');
    expect(checks).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// Go
// ════════════════════════════════════════════════════════════════

describe('Go — configuração', () => {
  it('extensão de código é .go', () => {
    expect(getFileExtension('go')).toBe('go');
  });

  it('extensão de teste é test.go (convenção _test.go do Go)', () => {
    expect(getTestExtension('go')).toBe('test.go');
  });

  it('test runner é go test ./...', () => {
    expect(getLangConfig('go').testRunner).toBe('go test ./...');
  });

  it('prompt hints incluem context.Context', () => {
    const hints = buildLangPrompt('go');
    expect(hints).toMatch(/context\.Context/i);
  });

  it('prompt hints incluem table-driven tests', () => {
    const hints = buildLangPrompt('go');
    expect(hints).toMatch(/table.driven/i);
  });

  it('prompt com framework gin inclui gin', () => {
    const hints = buildLangPrompt('go', 'gin');
    expect(hints).toContain('gin');
  });
});

describe('Go — geração de scaffold de testes', () => {
  const acceptance = [
    'login válido retorna token JWT',
    'senha incorreta retorna erro',
    'conta bloqueada retorna erro de lockout',
  ];

  it('scaffold Go usa package *_test', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'go');
    expect(s).toContain('package auth_test');
  });

  it('scaffold Go importa "testing"', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'go');
    expect(s).toContain('"testing"');
  });

  it('scaffold Go tem func Test* por critério', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'go');
    const count = (s.match(/func Test/g) ?? []).length;
    expect(count).toBe(acceptance.length);
  });

  it('scaffold Go tem parâmetro *testing.T', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'go');
    expect(s).toContain('*testing.T');
  });

  it('scaffold Go usa t.Skip("TODO")', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'go');
    expect(s).toContain('t.Skip');
  });

  it('scaffold Go usa Case1, Case2... por critério', () => {
    const s = generateTestScaffold('auth/login', acceptance, 'go');
    expect(s).toContain('Case1');
    expect(s).toContain('Case2');
    expect(s).toContain('Case3');
  });
});

describe('Go — verificações estáticas', () => {
  it('detecta fmt.Println com credencial (critical)', () => {
    const checks = runStaticChecks(`fmt.Println("debug:", password)`, 'go');
    expect(checks.some(c => c.severity === 'critical' && /credencial|fmt\.Print/i.test(c.message))).toBe(true);
  });

  it('detecta log.Printf com secret (critical)', () => {
    const checks = runStaticChecks(`log.Printf("secret=%s", secret)`, 'go');
    expect(checks.some(c => c.severity === 'critical')).toBe(true);
  });

  it('detecta panic() (warn)', () => {
    const checks = runStaticChecks(`
func processData(data []byte) {
    if data == nil { panic("nil data") }
}`, 'go');
    expect(checks.some(c => /panic/i.test(c.message))).toBe(true);
  });

  it('detecta log.Fatal() (warn)', () => {
    const checks = runStaticChecks(`log.Fatal(err)`, 'go');
    expect(checks.some(c => /Fatal/i.test(c.message))).toBe(true);
  });

  it('detecta interface{} vago (warn)', () => {
    const checks = runStaticChecks(`func Process(data interface{}) error {}`, 'go');
    expect(checks.some(c => /interface\{\}/i.test(c.message))).toBe(true);
  });

  it('detecta http.DefaultClient (warn)', () => {
    const checks = runStaticChecks(`resp, err := http.DefaultClient.Get(url)`, 'go');
    expect(checks.some(c => /DefaultClient/i.test(c.message))).toBe(true);
  });

  it('detecta //nolint (warn)', () => {
    const checks = runStaticChecks(`x := foo() //nolint:errcheck`, 'go');
    expect(checks.some(c => /nolint/i.test(c.message))).toBe(true);
  });

  it('código Go limpo não gera violações', () => {
    const clean = `
package auth

import (
    "context"
    "errors"
    "time"
    "github.com/golang-jwt/jwt/v5"
)

func Login(ctx context.Context, email, password string) (string, error) {
    user, err := findByEmail(ctx, email)
    if err != nil {
        return "", errors.New("credenciais inválidas")
    }
    if !checkPassword(password, user.PasswordHash) {
        return "", errors.New("credenciais inválidas")
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": user.ID,
        "exp":     time.Now().Add(24 * time.Hour).Unix(),
    })
    return token.SignedString(jwtSecret)
}`;
    const checks = runStaticChecks(clean, 'go');
    expect(checks).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// autoDetectLanguage
// ════════════════════════════════════════════════════════════════

describe('autoDetectLanguage — detecção automática por diretório', () => {
  it('detecta TypeScript por arquivos .ts', () => {
    fs.writeFileSync(path.join(tmpDir, 'login.ts'), '');
    fs.writeFileSync(path.join(tmpDir, 'utils.ts'), '');
    expect(autoDetectLanguage(tmpDir)).toBe('typescript');
  });

  it('detecta Python por arquivos .py', () => {
    fs.writeFileSync(path.join(tmpDir, 'login.py'), '');
    fs.writeFileSync(path.join(tmpDir, 'utils.py'), '');
    expect(autoDetectLanguage(tmpDir)).toBe('python');
  });

  it('detecta Go por arquivos .go', () => {
    fs.writeFileSync(path.join(tmpDir, 'login.go'), '');
    fs.writeFileSync(path.join(tmpDir, 'login_test.go'), '');
    expect(autoDetectLanguage(tmpDir)).toBe('go');
  });

  it('detecta JavaScript por arquivos .js', () => {
    fs.writeFileSync(path.join(tmpDir, 'app.js'), '');
    expect(autoDetectLanguage(tmpDir)).toBe('javascript');
  });

  it('detecta Rust por arquivos .rs', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.rs'), '');
    expect(autoDetectLanguage(tmpDir)).toBe('rust');
  });

  it('retorna null para diretório inexistente', () => {
    expect(autoDetectLanguage('/caminho/que/nao/existe')).toBeNull();
  });

  it('retorna null para diretório vazio', () => {
    expect(autoDetectLanguage(tmpDir)).toBeNull();
  });

  it('ignora arquivos .yaml e .md na detecção', () => {
    fs.writeFileSync(path.join(tmpDir, 'login.intent.yaml'), '');
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '');
    expect(autoDetectLanguage(tmpDir)).toBeNull();
  });

  it('quando misto, retorna a linguagem mais comum', () => {
    // 3 arquivos .py vs 1 .ts → Python
    fs.writeFileSync(path.join(tmpDir, 'a.py'), '');
    fs.writeFileSync(path.join(tmpDir, 'b.py'), '');
    fs.writeFileSync(path.join(tmpDir, 'c.py'), '');
    fs.writeFileSync(path.join(tmpDir, 'd.ts'), '');
    expect(autoDetectLanguage(tmpDir)).toBe('python');
  });
});

// ════════════════════════════════════════════════════════════════
// detectLanguage (por extensão de arquivo)
// ════════════════════════════════════════════════════════════════

describe('detectLanguage — por extensão de arquivo', () => {
  it('detecta typescript de arquivo .ts', () => {
    expect(detectLanguage('/src/auth/login.ts')).toBe('typescript');
  });

  it('detecta python de arquivo .py', () => {
    expect(detectLanguage('/src/auth/login.py')).toBe('python');
  });

  it('detecta go de arquivo .go', () => {
    expect(detectLanguage('/src/auth/login.go')).toBe('go');
  });

  it('detecta javascript de arquivo .js', () => {
    expect(detectLanguage('/src/auth/login.js')).toBe('javascript');
  });

  it('detecta rust de arquivo .rs', () => {
    expect(detectLanguage('/src/lib.rs')).toBe('rust');
  });

  it('detecta java de arquivo .java', () => {
    expect(detectLanguage('/src/Login.java')).toBe('java');
  });

  it('fallback para typescript em extensão desconhecida', () => {
    expect(detectLanguage('/src/something.xyz')).toBe('typescript');
  });
});

// ════════════════════════════════════════════════════════════════
// buildLangPrompt — injeção de convenções no prompt
// ════════════════════════════════════════════════════════════════

describe('buildLangPrompt — convenções para o LLM', () => {
  it('TypeScript: menciona strict mode', () => {
    expect(buildLangPrompt('typescript')).toMatch(/strict/i);
  });

  it('TypeScript: menciona Vitest', () => {
    expect(buildLangPrompt('typescript')).toContain('Vitest');
  });

  it('Python: menciona PEP 8', () => {
    expect(buildLangPrompt('python')).toMatch(/PEP 8/i);
  });

  it('Python: menciona async/await + asyncio', () => {
    expect(buildLangPrompt('python')).toMatch(/async/i);
  });

  it('Go: menciona tratamento de erros explícito', () => {
    expect(buildLangPrompt('go')).toMatch(/erro/i);
  });

  it('Go: menciona gofmt', () => {
    expect(buildLangPrompt('go')).toMatch(/gofmt/i);
  });

  it('Rust: menciona Result<T, E>', () => {
    expect(buildLangPrompt('rust')).toMatch(/Result/i);
  });

  it('Java: menciona JUnit 5', () => {
    expect(buildLangPrompt('java')).toMatch(/JUnit/i);
  });

  it('todas as linguagens retornam string não vazia', () => {
    const langs: Language[] = ['typescript','python','go','javascript','rust','java'];
    for (const lang of langs) {
      expect(buildLangPrompt(lang).length).toBeGreaterThan(10);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// Pipeline e2e simulado: captura → geração → verificação
// ════════════════════════════════════════════════════════════════

describe('Pipeline e2e simulado — Python auth/login', () => {
  const INTENT_PYTHON = {
    intent:      'Autenticar usuário com email e senha, retornando JWT',
    module:      'auth/login',
    constraints: ['senha >= 8 chars', 'JWT expira em 24h', 'nunca logar senha'],
    acceptance:  ['login válido retorna token', 'senha errada lança ValueError'],
    language:    'python' as Language,
  };

  const CLEAN_PY = `
from typing import Optional
import bcrypt, jwt

def login(email: str, password: str) -> str:
    user = find_by_email(email)
    if not user or not bcrypt.checkpw(password.encode(), user.hash):
        raise ValueError("Credenciais inválidas")
    return jwt.encode({"user_id": str(user.id)}, SECRET, algorithm="HS256")
`.trim();

  const DIRTY_PY = `
def login(email, password):
    print(f"login attempt: {email} / {password}")
    try:
        user = find_by_email(email)
    except Exception:
        pass
    return eval("create_token(user)")
`.trim();

  it('código limpo Python não gera violações', () => {
    const checks = runStaticChecks(CLEAN_PY, 'python');
    expect(checks).toHaveLength(0);
  });

  it('código sujo Python gera violações críticas e avisos', () => {
    const checks = runStaticChecks(DIRTY_PY, 'python');
    expect(checks.some(c => c.severity === 'critical')).toBe(true); // print pwd + eval
    expect(checks.length).toBeGreaterThanOrEqual(3);
  });

  it('scaffold tem função de teste para cada critério de aceite', () => {
    const scaffold = generateTestScaffold(
      INTENT_PYTHON.module, INTENT_PYTHON.acceptance, 'python'
    );
    INTENT_PYTHON.acceptance.forEach(a => {
      expect(scaffold).toContain(a);
    });
  });

  it('extensões de arquivo Python corretas', () => {
    const cfg = getLangConfig('python');
    expect(cfg.ext).toBe('py');
    expect(cfg.testExt).toBe('test.py');
  });
});

describe('Pipeline e2e simulado — Go users/crud', () => {
  const INTENT_GO = {
    intent:      'CRUD de usuários com context e tratamento de erros explícito',
    module:      'users/crud',
    constraints: ['usar context.Context', 'retornar errors, não panic', 'email único'],
    acceptance:  ['criar usuário retorna ID', 'email duplicado retorna erro'],
    language:    'go' as Language,
  };

  const CLEAN_GO = `
package users

import (
    "context"
    "errors"
)

var ErrDuplicateEmail = errors.New("email já cadastrado")

func Create(ctx context.Context, email, passwordHash string) (string, error) {
    exists, err := emailExists(ctx, email)
    if err != nil { return "", err }
    if exists    { return "", ErrDuplicateEmail }
    return insertUser(ctx, email, passwordHash)
}
`.trim();

  const DIRTY_GO = `
package users

import (
    "fmt"
    "net/http"
)

func Create(email, password string) interface{} {
    fmt.Println("creating user:", email, password)
    resp, _ := http.DefaultClient.Get("http://api/users")
    if resp == nil { panic("api unavailable") }
    return nil
}
`.trim();

  it('código limpo Go não gera violações', () => {
    const checks = runStaticChecks(CLEAN_GO, 'go');
    expect(checks).toHaveLength(0);
  });

  it('código sujo Go gera violações críticas e avisos', () => {
    const checks = runStaticChecks(DIRTY_GO, 'go');
    expect(checks.some(c => c.severity === 'critical')).toBe(true); // print+password
    expect(checks.some(c => /panic/i.test(c.message))).toBe(true);
    expect(checks.some(c => /interface\{\}/i.test(c.message))).toBe(true);
    expect(checks.some(c => /DefaultClient/i.test(c.message))).toBe(true);
  });

  it('scaffold Go tem package correto', () => {
    const scaffold = generateTestScaffold(
      INTENT_GO.module, INTENT_GO.acceptance, 'go'
    );
    expect(scaffold).toContain('package users_test');
  });

  it('scaffold Go tem um TestCase por critério', () => {
    const scaffold = generateTestScaffold(
      INTENT_GO.module, INTENT_GO.acceptance, 'go'
    );
    const count = (scaffold.match(/func Test/g) ?? []).length;
    expect(count).toBe(INTENT_GO.acceptance.length);
  });

  it('extensões de arquivo Go corretas', () => {
    const cfg = getLangConfig('go');
    expect(cfg.ext).toBe('go');
    expect(cfg.testExt).toBe('test.go'); // arquivos _test.go
    expect(cfg.testRunner).toBe('go test ./...');
  });
});
