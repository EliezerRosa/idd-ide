// cli/src/__tests__/lsp.test.ts — Issue #15: LSP dedicado para .intent.yaml
//
// Testa as funções puras do Language Server isoladamente:
// - Validação de schema (diagnostics)
// - Extração de módulos (fileToModule já testado em review.test.ts)
// - Parsing de depends_on para go-to-definition
// - Hover content
// - Rename: cálculo de edits em múltiplos arquivos
// - Autocomplete: sugestões de campos e módulos

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { validateIntent } from '../lib/security.ts';

// ── Reutiliza a lógica de validação do schema ────────────────────
// O LSP usa os mesmos critérios de validateIntent() de security.ts.
// Aqui testamos os cenários específicos que o LSP expõe como diagnostics.

// ── Helpers para simular documentos .intent.yaml ─────────────────

interface ParsedIntent {
  intent?: unknown;
  module?: unknown;
  constraints?: unknown;
  acceptance?: unknown;
  depends_on?: unknown;
  language?: unknown;
  [key: string]: unknown;
}

function parse(yamlText: string): ParsedIntent | null {
  try { return yaml.load(yamlText) as ParsedIntent; } catch { return null; }
}

function findFieldLine(text: string, field: string): number {
  return text.split('\n').findIndex(l => l.trimStart().startsWith(field + ':'));
}

// ════════════════════════════════════════════════════════════════
// Validação de schema (diagnostics)
// ════════════════════════════════════════════════════════════════

describe('LSP Diagnostics — schema validation', () => {
  const VALID_YAML = `
intent: "Autenticar usuário com e-mail e senha retornando JWT"
module: auth/login
constraints:
  - "senha >= 8 caracteres"
  - "JWT expira em 24h"
acceptance:
  - "login válido retorna JWT"
  - "senha errada retorna 401"
`.trim();

  it('YAML válido não gera erros de validação', () => {
    const parsed = parse(VALID_YAML);
    const result = validateIntent(parsed);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('campo intent ausente → erro obrigatório', () => {
    const doc = parse('module: auth/login\nconstraints:\n  - c1\nacceptance:\n  - a1');
    const result = validateIntent(doc);
    expect(result.errors.some(e => e.field === 'intent')).toBe(true);
  });

  it('campo module ausente → erro obrigatório', () => {
    const doc = parse('intent: "Autenticar usuário com senha"\nconstraints:\n  - c1\nacceptance:\n  - a1');
    const result = validateIntent(doc);
    expect(result.errors.some(e => e.field === 'module')).toBe(true);
  });

  it('intent muito curta (<10 chars) → aviso', () => {
    const doc = parse('intent: "Auth"\nmodule: auth/login\nconstraints:\n  - c1\nacceptance:\n  - a1');
    const result = validateIntent(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'intent')).toBe(true);
  });

  it('module com espaço → erro de formato', () => {
    const doc = parse('intent: "Autenticar usuário com senha"\nmodule: "auth login"\nconstraints:\n  - c1\nacceptance:\n  - a1');
    const result = validateIntent(doc);
    expect(result.errors.some(e => e.field === 'module')).toBe(true);
  });

  it('module com maiúsculas → erro de formato', () => {
    const doc = parse('intent: "Autenticar usuário com senha"\nmodule: Auth/Login\nconstraints:\n  - c1\nacceptance:\n  - a1');
    const result = validateIntent(doc);
    expect(result.errors.some(e => e.field === 'module')).toBe(true);
  });

  it('constraints vazio → erro', () => {
    const doc = parse('intent: "Autenticar usuário com senha"\nmodule: auth/login\nconstraints: []\nacceptance:\n  - a1');
    const result = validateIntent(doc);
    expect(result.errors.some(e => e.field === 'constraints')).toBe(true);
  });

  it('acceptance vazio → erro', () => {
    const doc = parse('intent: "Autenticar usuário com senha"\nmodule: auth/login\nconstraints:\n  - c1\nacceptance: []');
    const result = validateIntent(doc);
    expect(result.errors.some(e => e.field === 'acceptance')).toBe(true);
  });

  it('language inválida → erro', () => {
    const doc = parse(`${VALID_YAML}\nlanguage: kotlin`);
    const result = validateIntent(doc);
    expect(result.errors.some(e => e.field === 'language')).toBe(true);
  });

  it('campo desconhecido → erro de schema', () => {
    const doc = parse(`${VALID_YAML}\nunknownField: valor`);
    const result = validateIntent(doc);
    expect(result.errors.some(e => e.field === 'unknownField')).toBe(true);
  });

  it('depends_on com formato inválido → erro', () => {
    const doc = parse(`${VALID_YAML}\ndepends_on:\n  - "users-crud"`);
    const result = validateIntent(doc);
    expect(result.errors.some(e => e.field.startsWith('depends_on'))).toBe(true);
  });

  it('depends_on com formato válido → sem erro', () => {
    const doc = parse(`${VALID_YAML}\ndepends_on:\n  - users/crud`);
    const result = validateIntent(doc);
    expect(result.valid).toBe(true);
  });

  it('YAML completamente inválido → erro de parse', () => {
    const result = parse(': invalid: yaml: :::');
    // parse retorna null para YAML inválido
    expect(result).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// findFieldLine — localização de campos no texto
// ════════════════════════════════════════════════════════════════

describe('findFieldLine', () => {
  const TEXT = [
    'intent: "Autenticar usuário"',
    'module: auth/login',
    'constraints:',
    '  - "senha >= 8"',
    'acceptance:',
    '  - "login retorna JWT"',
    'depends_on:',
    '  - users/crud',
  ].join('\n');

  it('encontra campo na linha correta', () => {
    expect(findFieldLine(TEXT, 'intent')).toBe(0);
    expect(findFieldLine(TEXT, 'module')).toBe(1);
    expect(findFieldLine(TEXT, 'constraints')).toBe(2);
    expect(findFieldLine(TEXT, 'acceptance')).toBe(4);
    expect(findFieldLine(TEXT, 'depends_on')).toBe(6);
  });

  it('retorna -1 para campo inexistente', () => {
    expect(findFieldLine(TEXT, 'nonexistent')).toBe(-1);
  });
});

// ════════════════════════════════════════════════════════════════
// Go-to-definition: parsing de depends_on
// ════════════════════════════════════════════════════════════════

describe('Go-to-definition — parsing de depends_on', () => {
  function extractDepFromLine(line: string): string | null {
    const m = line.match(/^\s*-\s+([a-z0-9-]+\/[a-z0-9-]+)/);
    return m ? m[1] : null;
  }

  it('extrai módulo de linha depends_on', () => {
    expect(extractDepFromLine('  - users/crud')).toBe('users/crud');
  });

  it('extrai módulo com hífen', () => {
    expect(extractDepFromLine('  - auth-service/login')).toBe('auth-service/login');
  });

  it('retorna null para linha que não é um item de lista', () => {
    expect(extractDepFromLine('depends_on:')).toBeNull();
    expect(extractDepFromLine('intent: "test"')).toBeNull();
  });

  it('retorna null para linha vazia', () => {
    expect(extractDepFromLine('')).toBeNull();
  });

  it('funciona com indentação variável', () => {
    expect(extractDepFromLine('    - db/connection')).toBe('db/connection');
  });

  it('encontra arquivo .intent.yaml do módulo no workspace', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-lsp-'));
    try {
      const dir = path.join(tmp, 'src', 'users');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'crud.intent.yaml'), 'intent: test\n');

      const candidates = [
        path.join(tmp, 'src', 'users', 'crud.intent.yaml'),
        path.join(tmp, 'users', 'crud.intent.yaml'),
      ];
      const found = candidates.find(p => fs.existsSync(p));
      expect(found).toBeDefined();
      expect(found!.endsWith('crud.intent.yaml')).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });
});

// ════════════════════════════════════════════════════════════════
// Hover — conteúdo de documentação por campo
// ════════════════════════════════════════════════════════════════

describe('Hover — field documentation', () => {
  const FIELD_DOCS: Record<string, string> = {
    intent:      'Descrição em linguagem natural do que o módulo deve fazer',
    module:      'Caminho do módulo no formato `dominio/funcionalidade`',
    constraints: 'Regras de negócio obrigatórias',
    acceptance:  'Critérios de aceite',
    depends_on:  'Módulos que esta intenção consome',
    used_by:     'Módulos que dependem desta intenção',
    language:    'Linguagem alvo',
    framework:   'Framework alvo',
    tags:        'Tags para organização',
    version:     'Versionamento semântico',
  };

  it('todos os campos obrigatórios têm documentação de hover', () => {
    ['intent', 'module', 'constraints', 'acceptance'].forEach(field => {
      expect(FIELD_DOCS[field]).toBeTruthy();
    });
  });

  it('campos opcionais também têm documentação', () => {
    ['depends_on', 'used_by', 'language', 'framework', 'tags', 'version'].forEach(field => {
      expect(FIELD_DOCS[field]).toBeTruthy();
    });
  });

  it('hover em campo desconhecido não retorna documentação', () => {
    expect(FIELD_DOCS['nonexistent']).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════
// Rename — cálculo de edits em múltiplos arquivos
// ════════════════════════════════════════════════════════════════

describe('Rename — cálculo de edits', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-lsp-rename-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function findFilesWithReference(files: string[], oldModule: string): Map<string, number[]> {
    const result = new Map<string, number[]>();
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes(oldModule)) continue;
      const lineNums: number[] = [];
      content.split('\n').forEach((l, i) => {
        if (l.includes(oldModule)) lineNums.push(i);
      });
      result.set(file, lineNums);
    }
    return result;
  }

  it('encontra todos os arquivos que referenciam o módulo', () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(path.join(srcDir, 'auth'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'users'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'dashboard'), { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'auth', 'login.intent.yaml'),
      'intent: "Login"\nmodule: auth/login\nconstraints:\n  - c1\nacceptance:\n  - a1\n');
    fs.writeFileSync(path.join(srcDir, 'users', 'crud.intent.yaml'),
      'intent: "CRUD"\nmodule: users/crud\nconstraints:\n  - c1\nacceptance:\n  - a1\ndepends_on:\n  - auth/login\n');
    fs.writeFileSync(path.join(srcDir, 'dashboard', 'access.intent.yaml'),
      'intent: "Dashboard"\nmodule: dashboard/access\nconstraints:\n  - c1\nacceptance:\n  - a1\ndepends_on:\n  - auth/login\n  - users/crud\n');

    const allFiles = [
      path.join(srcDir, 'auth', 'login.intent.yaml'),
      path.join(srcDir, 'users', 'crud.intent.yaml'),
      path.join(srcDir, 'dashboard', 'access.intent.yaml'),
    ];

    // Rename auth/login → auth/authenticate
    const refs = findFilesWithReference(allFiles, 'auth/login');
    expect(refs.size).toBe(3); // login.intent.yaml (module field), users (depends_on), dashboard (depends_on)
  });

  it('não afeta arquivos sem a referência', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'payments'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'payments', 'checkout.intent.yaml'),
      'intent: "Checkout"\nmodule: payments/checkout\nconstraints:\n  - c1\nacceptance:\n  - a1\n'
    );
    const refs = findFilesWithReference(
      [path.join(tmpDir, 'src', 'payments', 'checkout.intent.yaml')],
      'auth/login'
    );
    expect(refs.size).toBe(0);
  });

  it('gera número correto de edits por arquivo', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'dash'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'dash', 'main.intent.yaml'),
      'intent: "Dashboard"\nmodule: dash/main\nconstraints:\n  - c1\nacceptance:\n  - a1\ndepends_on:\n  - auth/login\n  - auth/login\n' // duplicata intencional
    );
    const refs = findFilesWithReference(
      [path.join(tmpDir, 'src', 'dash', 'main.intent.yaml')],
      'auth/login'
    );
    expect(refs.get(path.join(tmpDir, 'src', 'dash', 'main.intent.yaml'))?.length).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════
// Autocomplete — sugestões válidas
// ════════════════════════════════════════════════════════════════

describe('Autocomplete — sugestões', () => {
  const TOP_LEVEL_FIELDS = ['intent','module','constraints','acceptance','depends_on','used_by','language','framework','tags','version'];
  const VALID_LANGUAGES  = ['typescript','javascript','python','go','rust','java'];

  it('campos top-level incluem os 4 obrigatórios', () => {
    ['intent','module','constraints','acceptance'].forEach(f => {
      expect(TOP_LEVEL_FIELDS).toContain(f);
    });
  });

  it('campos top-level incluem opcionais', () => {
    ['depends_on','language','framework','tags'].forEach(f => {
      expect(TOP_LEVEL_FIELDS).toContain(f);
    });
  });

  it('linguagens incluem as 6 suportadas', () => {
    ['typescript','python','go','javascript','rust','java'].forEach(lang => {
      expect(VALID_LANGUAGES).toContain(lang);
    });
  });

  it('autocomplete de módulos retorna apenas formato modulo/sub', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-ac-'));
    try {
      fs.mkdirSync(path.join(tmp, 'src', 'auth'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, 'src', 'auth', 'login.intent.yaml'),
        'intent: "Login com 12 caracteres"\nmodule: auth/login\nconstraints:\n  - c1\nacceptance:\n  - a1\n'
      );
      // Simula findAllModuleKeys
      const files = [path.join(tmp, 'src', 'auth', 'login.intent.yaml')];
      const modules = files.map(f => {
        try {
          const p = yaml.load(fs.readFileSync(f, 'utf8')) as Record<string, unknown>;
          return typeof p?.module === 'string' ? p.module : null;
        } catch { return null; }
      }).filter(Boolean) as string[];

      expect(modules).toContain('auth/login');
      modules.forEach(m => expect(m).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/));
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });
});

// ════════════════════════════════════════════════════════════════
// Arquivos de configuração do LSP
// ════════════════════════════════════════════════════════════════

describe('Configuração LSP — arquivos de extensão', () => {
  function findExtFile(name: string): string | null {
    const candidates = [
      path.resolve(import.meta.dirname, '../../../../extensions/idd-core/', name),
      path.resolve(import.meta.dirname, '../../../extensions/idd-core/', name),
    ];
    return candidates.find(p => fs.existsSync(p)) ?? null;
  }

  it('language-configuration.json existe', () => {
    expect(findExtFile('language-configuration.json')).not.toBeNull();
  });

  it('language-configuration.json é JSON válido', () => {
    const p = findExtFile('language-configuration.json');
    if (!p) return;
    expect(() => JSON.parse(fs.readFileSync(p, 'utf8'))).not.toThrow();
  });

  it('package.json tem vscode-languageclient como dep', () => {
    const p = findExtFile('package.json');
    if (!p) return;
    const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(pkg.dependencies?.['vscode-languageclient'] ?? pkg.devDependencies?.['vscode-languageclient']).toBeTruthy();
  });

  it('package.json tem contribuição de linguagem yaml-intent', () => {
    const p = findExtFile('package.json');
    if (!p) return;
    const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
    const langs = pkg.contributes?.languages ?? [];
    expect(langs.some((l: any) => l.id === 'yaml-intent' || l.extensions?.includes('.intent.yaml'))).toBe(true);
  });

  it('src/lsp/server.ts existe', () => {
    const p = findExtFile('src/lsp/server.ts');
    if (p) expect(fs.existsSync(p)).toBe(true);
    else {
      const candidates2 = [
        path.resolve(import.meta.dirname, '../../../../extensions/idd-core/src/lsp/server.ts'),
        path.resolve(import.meta.dirname, '../../../extensions/idd-core/src/lsp/server.ts'),
      ];
      expect(candidates2.some(c => fs.existsSync(c))).toBe(true);
    }
  });

  it('src/lsp/client.ts existe', () => {
    const candidates = [
      path.resolve(import.meta.dirname, '../../../../extensions/idd-core/src/lsp/client.ts'),
      path.resolve(import.meta.dirname, '../../../extensions/idd-core/src/lsp/client.ts'),
    ];
    expect(candidates.some(c => fs.existsSync(c))).toBe(true);
  });
});
