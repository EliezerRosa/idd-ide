import * as fs from 'node:fs';
// src/lib/lang.ts — suporte multi-linguagem para o Intent Engine

export type Language = 'typescript' | 'python' | 'go' | 'javascript' | 'rust' | 'java';

export interface LangConfig {
  ext:          string;          // extensão do arquivo de código
  testExt:      string;          // extensão do arquivo de testes
  testRunner:   string;          // comando para rodar testes
  promptHints:  string[];        // dicas injetadas no prompt do LLM
  staticChecks: StaticCheck[];   // padrões proibidos específicos da linguagem
  testTemplate: (module: string, acceptance: string[]) => string;
}

interface StaticCheck {
  pattern:  RegExp;
  message:  string;
  severity: 'critical' | 'warn';
}

// ── TypeScript ───────────────────────────────────────────────────

const typescript: LangConfig = {
  ext:        'ts',
  testExt:    'test.ts',
  testRunner: 'npx vitest run',
  promptHints: [
    'Use TypeScript com tipagem estrita (strict mode).',
    'Prefira async/await a callbacks.',
    'Use tipos explícitos — evite "any".',
    'Exporte apenas o necessário.',
    'Testes com Vitest: import { describe, it, expect } from "vitest".',
  ],
  staticChecks: [
    { pattern: /:\s*any\b/,               message: 'Uso de "any" — prefira tipos explícitos',       severity: 'warn'     },
    { pattern: /require\s*\(/,            message: 'Use import ES modules em vez de require()',      severity: 'warn'     },
    { pattern: /console\.log.*(?:password|senha|secret|passwd)/i,
                                          message: 'Credencial em console.log',                     severity: 'critical' },
    { pattern: /console\.log.*token/i,    message: 'Token exposto em log',                          severity: 'warn'     },
    { pattern: /Math\.random\(\)/,        message: 'Math.random() não é seguro para criptografia',  severity: 'warn'     },
    { pattern: /eval\s*\(/,              message: 'eval() — risco de injeção de código',            severity: 'critical' },
    { pattern: /TODO|FIXME|HACK/,        message: 'Marcador de código incompleto presente',         severity: 'warn'     },
  ],
  testTemplate: (module, acceptance) => {
    const [, sub] = module.split('/');
    const tests   = acceptance.map((a, i) =>
      `  it('${a}', async () => {\n    // TODO: implementar teste\n    expect(true).toBe(true);\n  });`
    ).join('\n\n');
    return `import { describe, it, expect } from 'vitest';\nimport { ${sub} } from './${sub}.ts';\n\ndescribe('${module}', () => {\n${tests}\n});\n`;
  },
};

// ── Python ───────────────────────────────────────────────────────

const python: LangConfig = {
  ext:        'py',
  testExt:    'test.py',
  testRunner: 'pytest',
  promptHints: [
    'Use Python 3.11+ com type hints (PEP 484).',
    'Prefira dataclasses ou Pydantic para modelos de dados.',
    'Use async/await para operações I/O (asyncio).',
    'Siga PEP 8: snake_case para funções e variáveis.',
    'Testes com pytest: use fixtures e assert direto.',
    'Docstrings no formato Google style.',
    'Levante exceções específicas — nunca capturar Exception genérica sem re-raise.',
  ],
  staticChecks: [
    { pattern: /print\s*\(.*(?:password|senha|secret|passwd)/i,
      message: 'Credencial em print()', severity: 'critical' },
    { pattern: /logging\.(?:info|debug|warning).*(?:password|senha|secret)/i,
      message: 'Credencial em log', severity: 'critical' },
    { pattern: /except\s+Exception\s*:/,
      message: 'Captura genérica de Exception — use exceção específica', severity: 'warn' },
    { pattern: /except\s*:/,
      message: 'Bare except — capture exceções específicas', severity: 'warn' },
    { pattern: /eval\s*\(/,
      message: 'eval() — risco de injeção de código', severity: 'critical' },
    { pattern: /pickle\.loads/,
      message: 'pickle.loads() inseguro com dados não confiáveis', severity: 'warn' },
    { pattern: /os\.system\s*\(/,
      message: 'os.system() — prefira subprocess com lista de args', severity: 'warn' },
    { pattern: /subprocess\.call\(.*shell=True/,
      message: 'shell=True em subprocess — risco de injeção', severity: 'critical' },
    { pattern: /#\s*type:\s*ignore/,
      message: '# type: ignore suprime verificação de tipos', severity: 'warn' },
    { pattern: /assert\s+.+,?.*\btest\b/i,
      message: 'Usar pytest.raises() em vez de assert para testes de exceção', severity: 'warn' },
  ],
  testTemplate: (module, acceptance) => {
    const [, sub] = module.split('/');
    const tests   = acceptance.map((a, i) =>
      `def test_${sub}_${i + 1}():\n    """${a}"""\n    # TODO: implementar\n    assert True`
    ).join('\n\n\n');
    return `import pytest\nfrom ${sub} import ${sub}\n\n\n${tests}\n`;
  },
};

// ── Go ───────────────────────────────────────────────────────────

const go: LangConfig = {
  ext:        'go',
  testExt:    'test.go',
  testRunner: 'go test ./...',
  promptHints: [
    'Use Go 1.21+.',
    'Trate erros explicitamente — nunca ignore com _.',
    'Use context.Context como primeiro parâmetro em funções I/O.',
    'Prefira interfaces pequenas.',
    'Siga as convenções do gofmt.',
    'Testes com o pacote "testing" padrão: func TestXxx(t *testing.T).',
    'Use table-driven tests quando há múltiplos casos.',
    'Nomes exportados têm documentação GoDoc.',
  ],
  staticChecks: [
    { pattern: /fmt\.(?:Print|Println|Printf).*(?:password|senha|secret|passwd)/i,
      message: 'Credencial em fmt.Print', severity: 'critical' },
    { pattern: /log\.(?:Print|Println|Printf).*(?:password|senha|secret|passwd)/i,
      message: 'Credencial em log.Print', severity: 'critical' },
    { pattern: /\.Fatal\(err\)|log\.Fatal\(/,
      message: 'log.Fatal() — use retorno de erro em vez de matar o processo', severity: 'warn' },
    { pattern: /panic\s*\(/,
      message: 'panic() — use retorno de error para fluxo normal', severity: 'warn' },
    { pattern: /\.\s*Unwrap\(\)\s*\.|err\.\(\*.*\)\.Msg/,
      message: 'Unwrap manual de error — prefira errors.As()', severity: 'warn' },
    { pattern: /interface\s*\{\s*\}/,
      message: 'interface{} vago — use any (Go 1.18+) ou tipo específico', severity: 'warn' },
    { pattern: /\/\/\s*nolint/,
      message: '//nolint suprime análise estática — documente o motivo', severity: 'warn' },
    { pattern: /os\.Getenv\(.*(?:password|secret|key)/i,
      message: 'Variável de ambiente sensível — use vault ou secret manager', severity: 'warn' },
    { pattern: /http\.DefaultClient\b/,
      message: 'http.DefaultClient sem timeout — crie cliente com timeout explícito', severity: 'warn' },
  ],
  testTemplate: (module, acceptance) => {
    const [pkg, sub] = module.split('/');
    const tests = acceptance.map((a, i) => {
      const name = `Test${capitalize(sub)}_Case${i + 1}`;
      return `func ${name}(t *testing.T) {\n\t// ${a}\n\tt.Skip("TODO: implementar")\n}`;
    }).join('\n\n');
    return `package ${pkg}_test\n\nimport (\n\t"testing"\n)\n\n${tests}\n`;
  },
};

// ── JavaScript ──────────────────────────────────────────────────

const javascript: LangConfig = {
  ext:        'js',
  testExt:    'test.js',
  testRunner: 'npx vitest run',
  promptHints: [
    'Use ESModules (import/export).',
    'Use JSDoc para documentação de tipos.',
    'Prefira async/await.',
    'Testes com Vitest.',
  ],
  staticChecks: [
    { pattern: /console\.log.*password/i, message: 'Credencial em console.log', severity: 'critical' },
    { pattern: /var\s+/,                  message: 'Use const/let em vez de var', severity: 'warn' },
    { pattern: /==\s*(?!null|undefined)/,  message: 'Use === para comparação estrita', severity: 'warn' },
  ],
  testTemplate: typescript.testTemplate,
};

// ── Rust ─────────────────────────────────────────────────────────

const rust: LangConfig = {
  ext:        'rs',
  testExt:    'rs',           // testes embutidos no mesmo arquivo
  testRunner: 'cargo test',
  promptHints: [
    'Use Rust 2021 edition.',
    'Trate erros com Result<T, E> — evite unwrap() em produção.',
    'Prefira String em vez de &str para dados owned.',
    'Use #[derive(Debug, Clone)] onde apropriado.',
    'Testes no módulo #[cfg(test)] no mesmo arquivo.',
    'Use async-std ou tokio para código assíncrono.',
  ],
  staticChecks: [
    { pattern: /println!.*(?:password|senha|secret)/i,
      message: 'Credencial em println!', severity: 'critical' },
    { pattern: /\.unwrap\(\)/,
      message: 'unwrap() pode causar panic — use ? ou expect() com mensagem', severity: 'warn' },
    { pattern: /unsafe\s*\{/,
      message: 'Bloco unsafe — documente a justificativa', severity: 'warn' },
  ],
  testTemplate: (module, acceptance) => {
    const [, sub] = module.split('/');
    const tests   = acceptance.map((a, i) =>
      `    #[test]\n    fn test_${sub}_${i + 1}() {\n        // ${a}\n        todo!();\n    }`
    ).join('\n\n');
    return `#[cfg(test)]\nmod tests {\n    use super::*;\n\n${tests}\n}\n`;
  },
};

// ── Registry ─────────────────────────────────────────────────────

const LANG_MAP: Record<Language, LangConfig> = {
  typescript, python, go, javascript, rust,
  java: {
    ext: 'java', testExt: 'Test.java', testRunner: 'mvn test',
    promptHints: [
      'Use Java 21+.',
      'Use Records para DTOs imutáveis.',
      'Prefira Optional a null.',
      'Testes com JUnit 5.',
    ],
    staticChecks: [
      { pattern: /System\.out\.print.*(?:password|senha)/i,
        message: 'Credencial em System.out', severity: 'critical' },
      { pattern: /e\.printStackTrace\(\)/,
        message: 'printStackTrace() — use um logger estruturado', severity: 'warn' },
    ],
    testTemplate: (module, acceptance) => {
      const [pkg, sub] = module.split('/');
      const Cap        = capitalize(sub);
      const tests      = acceptance.map((a, i) =>
        `    @Test\n    void test${Cap}Case${i + 1}() {\n        // ${a}\n        // TODO\n    }`
      ).join('\n\n');
      return `package ${pkg};\n\nimport org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;\n\nclass ${Cap}Test {\n\n${tests}\n}\n`;
    },
  },
};

// ── Funções públicas ─────────────────────────────────────────────

export function getLangConfig(language?: string): LangConfig {
  const lang = (language ?? 'typescript').toLowerCase() as Language;
  return LANG_MAP[lang] ?? typescript;
}

export function autoDetectLanguage(moduleDir: string): Language | null {
  if (!fs.existsSync(moduleDir)) return null;
  const files = fs.readdirSync(moduleDir);
  const extCounts: Record<string, number> = {};
  for (const f of files) {
    const ext = f.split('.').pop()?.toLowerCase();
    if (ext && ext !== 'yaml' && ext !== 'md') {
      extCounts[ext] = (extCounts[ext] ?? 0) + 1;
    }
  }
  // Pick most common extension
  const topExt = Object.entries(extCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!topExt) return null;
  const map: Record<string, Language> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', mjs: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
  };
  return map[topExt] ?? null;
}

export function detectLanguage(filePath: string): Language {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':  return 'typescript';
    case 'py':  return 'python';
    case 'go':  return 'go';
    case 'js':  return 'javascript';
    case 'rs':  return 'rust';
    case 'java':return 'java';
    default:    return 'typescript';
  }
}

export function buildLangPrompt(language: Language, framework?: string): string {
  const cfg  = getLangConfig(language);
  const fwk  = framework ? ` com framework ${framework}` : '';
  return [
    `Linguagem: ${language}${fwk}.`,
    ...cfg.promptHints,
  ].join('\n');
}

export function runStaticChecks(
  code: string,
  language: Language
): Array<{ message: string; severity: 'critical' | 'warn' }> {
  const cfg      = getLangConfig(language);
  const results  = [];
  for (const check of cfg.staticChecks) {
    if (check.pattern.test(code)) {
      results.push({ message: check.message, severity: check.severity });
    }
  }
  return results;
}

export function getFileExtension(language: Language): string {
  return getLangConfig(language).ext;
}

export function getTestExtension(language: Language): string {
  return getLangConfig(language).testExt;
}

export function generateTestScaffold(
  module: string, acceptance: string[], language: Language
): string {
  return getLangConfig(language).testTemplate(module, acceptance);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
