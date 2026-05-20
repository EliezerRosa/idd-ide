// src/__tests__/lang.test.ts
import { describe, it, expect } from 'vitest';
import {
  getLangConfig, detectLanguage, buildLangPrompt,
  runStaticChecks, generateTestScaffold, getFileExtension,
  getTestExtension,
} from '../lib/lang.ts';

// ── getLangConfig ────────────────────────────────────────────────

describe('getLangConfig', () => {
  it('retorna typescript por padrão', () => {
    const cfg = getLangConfig();
    expect(cfg.ext).toBe('ts');
    expect(cfg.testRunner).toContain('vitest');
  });

  it('retorna configuração python', () => {
    const cfg = getLangConfig('python');
    expect(cfg.ext).toBe('py');
    expect(cfg.testExt).toBe('test.py');
    expect(cfg.testRunner).toBe('pytest');
  });

  it('retorna configuração go', () => {
    const cfg = getLangConfig('go');
    expect(cfg.ext).toBe('go');
    expect(cfg.testRunner).toBe('go test ./...');
  });

  it('retorna configuração rust', () => {
    const cfg = getLangConfig('rust');
    expect(cfg.ext).toBe('rs');
    expect(cfg.testRunner).toBe('cargo test');
  });

  it('retorna configuração java', () => {
    const cfg = getLangConfig('java');
    expect(cfg.ext).toBe('java');
    expect(cfg.testRunner).toBe('mvn test');
  });

  it('faz fallback para typescript em linguagem desconhecida', () => {
    const cfg = getLangConfig('cobol');
    expect(cfg.ext).toBe('ts');
  });
});

// ── detectLanguage ───────────────────────────────────────────────

describe('detectLanguage', () => {
  it.each([
    ['src/auth/login.ts',   'typescript'],
    ['src/auth/login.py',   'python'],
    ['src/auth/login.go',   'go'],
    ['src/auth/login.js',   'javascript'],
    ['src/auth/login.rs',   'rust'],
    ['src/auth/Login.java', 'java'],
  ])('detecta linguagem de %s → %s', (filePath, expected) => {
    expect(detectLanguage(filePath)).toBe(expected);
  });

  it('faz fallback para typescript em extensão desconhecida', () => {
    expect(detectLanguage('src/main.rb')).toBe('typescript');
  });
});

// ── buildLangPrompt ──────────────────────────────────────────────

describe('buildLangPrompt', () => {
  it('inclui a linguagem no prompt', () => {
    const prompt = buildLangPrompt('python');
    expect(prompt).toContain('Python');
  });

  it('inclui framework quando fornecido', () => {
    const prompt = buildLangPrompt('python', 'fastapi');
    expect(prompt).toContain('fastapi');
  });

  it('prompt TypeScript menciona tipagem estrita', () => {
    const prompt = buildLangPrompt('typescript');
    expect(prompt.toLowerCase()).toContain('strict');
  });

  it('prompt Go menciona tratamento de erros', () => {
    const prompt = buildLangPrompt('go');
    expect(prompt.toLowerCase()).toContain('erro');
  });

  it('prompt Python menciona type hints', () => {
    const prompt = buildLangPrompt('python');
    expect(prompt.toLowerCase()).toContain('type hint');
  });
});

// ── runStaticChecks ──────────────────────────────────────────────

describe('runStaticChecks', () => {

  describe('TypeScript', () => {
    it('detecta credencial em console.log', () => {
      const code    = `console.log('user password:', password);`;
      const results = runStaticChecks(code, 'typescript');
      expect(results).toContainEqual(
        expect.objectContaining({ severity: 'critical' })
      );
    });

    it('detecta uso de any', () => {
      const code    = `function process(data: any) {}`;
      const results = runStaticChecks(code, 'typescript');
      expect(results.some(r => r.message.toLowerCase().includes('any'))).toBe(true);
    });

    it('detecta require() em módulo ESM', () => {
      const code    = `const fs = require('fs');`;
      const results = runStaticChecks(code, 'typescript');
      expect(results.some(r => r.message.toLowerCase().includes('require'))).toBe(true);
    });

    it('código limpo não gera violações', () => {
      const code    = `export async function login(email: string): Promise<User> {}`;
      const results = runStaticChecks(code, 'typescript');
      expect(results).toHaveLength(0);
    });
  });

  describe('Python', () => {
    it('detecta credencial em print()', () => {
      const code    = `print(f"senha do usuario: {password}")`;
      const results = runStaticChecks(code, 'python');
      expect(results).toContainEqual(
        expect.objectContaining({ severity: 'critical' })
      );
    });

    it('detecta captura genérica de Exception', () => {
      const code    = `except Exception:\n    pass`;
      const results = runStaticChecks(code, 'python');
      expect(results.some(r => r.message.toLowerCase().includes('exception'))).toBe(true);
    });

    it('detecta eval()', () => {
      const code    = `result = eval(user_input)`;
      const results = runStaticChecks(code, 'python');
      expect(results).toContainEqual(
        expect.objectContaining({ severity: 'critical' })
      );
    });

    it('detecta pickle.loads', () => {
      const code    = `data = pickle.loads(raw_bytes)`;
      const results = runStaticChecks(code, 'python');
      expect(results.some(r => r.message.toLowerCase().includes('pickle'))).toBe(true);
    });

    it('código limpo não gera violações', () => {
      const code    = `async def login(email: str, password: str) -> User:\n    pass`;
      const results = runStaticChecks(code, 'python');
      expect(results).toHaveLength(0);
    });
  });

  describe('Go', () => {
    it('detecta credencial em fmt.Print', () => {
      const code    = `fmt.Printf("password: %s", password)`;
      const results = runStaticChecks(code, 'go');
      expect(results).toContainEqual(
        expect.objectContaining({ severity: 'critical' })
      );
    });

    it('detecta panic() como tratamento de erro', () => {
      const code    = `if err == nil { panic(err) }`;
      const results = runStaticChecks(code, 'go');
      expect(results.some(r => r.message.toLowerCase().includes('panic'))).toBe(true);
    });

    it('código limpo não gera violações', () => {
      const code    = `func Login(ctx context.Context, email, password string) (*User, error) {}`;
      const results = runStaticChecks(code, 'go');
      expect(results).toHaveLength(0);
    });
  });

  describe('Rust', () => {
    it('detecta unwrap() em Rust', () => {
      const code    = `let value = result.unwrap();`;
      const results = runStaticChecks(code, 'rust');
      expect(results.some(r => r.message.toLowerCase().includes('unwrap'))).toBe(true);
    });

    it('detecta bloco unsafe', () => {
      const code    = `unsafe { ptr.read() }`;
      const results = runStaticChecks(code, 'rust');
      expect(results.some(r => r.message.toLowerCase().includes('unsafe'))).toBe(true);
    });
  });
});

// ── generateTestScaffold ─────────────────────────────────────────

describe('generateTestScaffold', () => {
  const acceptance = [
    'login válido retorna 200',
    'senha inválida retorna 401',
  ];

  it('gera scaffold TypeScript com Vitest', () => {
    const scaffold = generateTestScaffold('auth/login', acceptance, 'typescript');
    expect(scaffold).toContain('vitest');
    expect(scaffold).toContain('describe');
    expect(scaffold).toContain('it(');
    expect(scaffold).toContain('login válido retorna 200');
  });

  it('gera scaffold Python com pytest', () => {
    const scaffold = generateTestScaffold('auth/login', acceptance, 'python');
    expect(scaffold).toContain('import pytest');
    expect(scaffold).toContain('def test_');
    expect(scaffold).toContain('login válido retorna 200');
  });

  it('gera scaffold Go com testing', () => {
    const scaffold = generateTestScaffold('auth/login', acceptance, 'go');
    expect(scaffold).toContain('testing');
    expect(scaffold).toContain('func Test');
    expect(scaffold).toContain('*testing.T');
  });

  it('gera scaffold Rust com #[cfg(test)]', () => {
    const scaffold = generateTestScaffold('auth/login', acceptance, 'rust');
    expect(scaffold).toContain('#[cfg(test)]');
    expect(scaffold).toContain('#[test]');
    expect(scaffold).toContain('fn test_');
  });

  it('gera scaffold Java com JUnit 5', () => {
    const scaffold = generateTestScaffold('auth/login', acceptance, 'java');
    expect(scaffold).toContain('@Test');
    expect(scaffold).toContain('junit.jupiter');
  });

  it('inclui todos os critérios de aceite', () => {
    const scaffold = generateTestScaffold('auth/login', acceptance, 'typescript');
    for (const criterion of acceptance) {
      expect(scaffold).toContain(criterion);
    }
  });
});

// ── getFileExtension / getTestExtension ──────────────────────────

describe('extensões de arquivo', () => {
  it.each([
    ['typescript', 'ts',     'test.ts'  ],
    ['python',     'py',     'test.py'  ],
    ['go',         'go',     'test.go'  ],
    ['javascript', 'js',     'test.js'  ],
    ['rust',       'rs',     'rs'       ],
    ['java',       'java',   'Test.java'],
  ])('%s → ext=%s, testExt=%s', (lang, ext, testExt) => {
    expect(getFileExtension(lang as any)).toBe(ext);
    expect(getTestExtension(lang as any)).toBe(testExt);
  });
});
