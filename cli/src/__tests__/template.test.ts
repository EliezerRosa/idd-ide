// src/__tests__/template.test.ts — Issue #9: Intent Templates
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import {
  BUILTIN_TEMPLATES, listTemplates, getTemplate,
  applyVariables, templateToYaml, saveTemplate,
  type IntentTemplate,
} from '../lib/templates/index.ts';
import { validateIntent } from '../lib/security.ts';

// ── Setup ─────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-tmpl-'));
  fs.mkdirSync(path.join(tmpDir, '.idd', 'templates'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ════════════════════════════════════════════════════════════════
// Built-in templates
// ════════════════════════════════════════════════════════════════

describe('BUILTIN_TEMPLATES — estrutura', () => {
  it('existe ao menos 7 templates built-in', () => {
    expect(BUILTIN_TEMPLATES.length).toBeGreaterThanOrEqual(7);
  });

  it('cada template tem os campos obrigatórios', () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.name,        `${t.name} deve ter name`).toBeTruthy();
      expect(t.category,    `${t.name} deve ter category`).toBeTruthy();
      expect(t.description, `${t.name} deve ter description`).toBeTruthy();
      expect(t.tags,        `${t.name} deve ter tags`).toBeInstanceOf(Array);
      expect(t.body.intent,      `${t.name}.intent`).toBeTruthy();
      expect(t.body.constraints, `${t.name}.constraints`).toBeInstanceOf(Array);
      expect(t.body.acceptance,  `${t.name}.acceptance`).toBeInstanceOf(Array);
      expect(t.body.constraints.length, `${t.name} precisa de constraints`).toBeGreaterThan(0);
      expect(t.body.acceptance.length,  `${t.name} precisa de acceptance`).toBeGreaterThan(0);
    }
  });

  it('templates built-in têm nomes únicos', () => {
    const names = BUILTIN_TEMPLATES.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('template "crud" existe', () => {
    expect(BUILTIN_TEMPLATES.find(t => t.name === 'crud')).toBeDefined();
  });

  it('template "auth-jwt" existe', () => {
    expect(BUILTIN_TEMPLATES.find(t => t.name === 'auth-jwt')).toBeDefined();
  });

  it('template "webhook" existe', () => {
    expect(BUILTIN_TEMPLATES.find(t => t.name === 'webhook')).toBeDefined();
  });

  it('template "email" existe', () => {
    expect(BUILTIN_TEMPLATES.find(t => t.name === 'email')).toBeDefined();
  });

  it('template "health-check" existe', () => {
    expect(BUILTIN_TEMPLATES.find(t => t.name === 'health-check')).toBeDefined();
  });

  it('categorias são válidas', () => {
    const validCats = ['crud','auth','api','infra','notify','custom'];
    for (const t of BUILTIN_TEMPLATES) {
      expect(validCats).toContain(t.category);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// listTemplates / getTemplate
// ════════════════════════════════════════════════════════════════

describe('listTemplates', () => {
  it('retorna todos os built-ins quando não há locais', () => {
    const templates = listTemplates(tmpDir);
    expect(templates.length).toBeGreaterThanOrEqual(BUILTIN_TEMPLATES.length);
  });

  it('inclui template local', () => {
    const local: IntentTemplate = {
      name: 'meu-template', category: 'custom',
      description: 'Template local de teste',
      tags: ['custom'],
      body: { intent: 'Fazer algo', constraints: ['c1'], acceptance: ['a1'] },
    };
    saveTemplate(local, tmpDir);
    const list = listTemplates(tmpDir);
    expect(list.find(t => t.name === 'meu-template')).toBeDefined();
  });

  it('template local sobrescreve built-in de mesmo nome', () => {
    const override: IntentTemplate = {
      name: 'crud', category: 'custom',
      description: 'CRUD customizado',
      tags: ['crud'],
      body: { intent: 'Meu CRUD customizado', constraints: ['c1'], acceptance: ['a1'] },
    };
    saveTemplate(override, tmpDir);
    const list     = listTemplates(tmpDir);
    const crudTmpl = list.find(t => t.name === 'crud')!;
    expect(crudTmpl.body.intent).toBe('Meu CRUD customizado');
  });
});

describe('getTemplate', () => {
  it('retorna template built-in pelo nome', () => {
    const t = getTemplate('crud', tmpDir);
    expect(t).not.toBeNull();
    expect(t!.name).toBe('crud');
  });

  it('retorna null para nome inexistente', () => {
    expect(getTemplate('inexistente', tmpDir)).toBeNull();
  });

  it('retorna template local quando existe', () => {
    const local: IntentTemplate = {
      name: 'meu-local', category: 'custom',
      description: 'Local', tags: ['local'],
      body: { intent: 'Local intent', constraints: ['c'], acceptance: ['a'] },
    };
    saveTemplate(local, tmpDir);
    const t = getTemplate('meu-local', tmpDir);
    expect(t).not.toBeNull();
    expect(t!.description).toBe('Local');
  });
});

// ════════════════════════════════════════════════════════════════
// applyVariables
// ════════════════════════════════════════════════════════════════

describe('applyVariables', () => {
  const crudTemplate = BUILTIN_TEMPLATES.find(t => t.name === 'crud')!;

  it('substitui {{entity}} em intent', () => {
    const applied = applyVariables(crudTemplate, { entity: 'usuário' });
    expect(applied.body.intent).toContain('usuário');
    expect(applied.body.intent).not.toContain('{{entity}}');
  });

  it('substitui {{entity}} em todos os constraints', () => {
    const applied = applyVariables(crudTemplate, { entity: 'produto' });
    const allText = applied.body.constraints.join(' ');
    expect(allText).not.toContain('{{entity}}');
  });

  it('substitui {{entity}} em todos os acceptance criteria', () => {
    const applied = applyVariables(crudTemplate, { entity: 'pedido' });
    const allText = applied.body.acceptance.join(' ');
    expect(allText).not.toContain('{{entity}}');
  });

  it('preserva {{var}} não fornecida', () => {
    const applied = applyVariables(crudTemplate, {});
    expect(applied.body.intent).toContain('{{entity}}');
  });

  it('substitui {{provider}} no template webhook', () => {
    const webhookTmpl = getTemplate('webhook', tmpDir)!;
    const applied     = applyVariables(webhookTmpl, { provider: 'Stripe' });
    expect(applied.body.intent).toContain('Stripe');
    expect(applied.body.intent).not.toContain('{{provider}}');
  });

  it('não modifica o template original', () => {
    const original = crudTemplate.body.intent;
    applyVariables(crudTemplate, { entity: 'user' });
    expect(crudTemplate.body.intent).toBe(original);
  });
});

// ════════════════════════════════════════════════════════════════
// templateToYaml
// ════════════════════════════════════════════════════════════════

describe('templateToYaml', () => {
  const crudTemplate = BUILTIN_TEMPLATES.find(t => t.name === 'crud')!;

  it('gera YAML com campo intent', () => {
    const yaml = templateToYaml(crudTemplate, 'users/crud');
    expect(yaml).toContain('intent:');
  });

  it('gera YAML com módulo correto', () => {
    const yaml = templateToYaml(crudTemplate, 'users/crud');
    expect(yaml).toContain('module: users/crud');
  });

  it('gera YAML com constraints', () => {
    const yaml = templateToYaml(crudTemplate, 'users/crud');
    expect(yaml).toContain('constraints:');
    expect(yaml).toContain('  - "');
  });

  it('gera YAML com acceptance', () => {
    const yaml = templateToYaml(crudTemplate, 'users/crud');
    expect(yaml).toContain('acceptance:');
  });

  it('gera YAML com language quando fornecido', () => {
    const yaml = templateToYaml(crudTemplate, 'users/crud', 'python');
    expect(yaml).toContain('language: python');
  });

  it('gera YAML com version 0.0.0', () => {
    const yaml = templateToYaml(crudTemplate, 'users/crud');
    expect(yaml).toContain('version: "0.0.0"');
  });

  it('YAML gerado passa na validação do schema', async () => {
    const applied = applyVariables(crudTemplate, { entity: 'usuário' });
    const yaml    = templateToYaml(applied, 'users/crud', 'typescript');
    const js      = await import('js-yaml');
    const parsed  = js.load(yaml) as unknown;
    const result  = validateIntent(parsed);
    expect(result.valid).toBe(true);
  });

  it('todos os built-ins geram YAML válido com variáveis preenchidas', async () => {
    const js = await import('js-yaml');
    const variables = { entity: 'user', provider: 'Stripe' };
    for (const template of BUILTIN_TEMPLATES) {
      const applied = applyVariables(template, variables);
      const yaml    = templateToYaml(applied, 'test/module', 'typescript');
      const parsed  = js.load(yaml) as unknown;
      const result  = validateIntent(parsed);
      expect(result.valid, `Template "${template.name}" deve gerar YAML válido`).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// saveTemplate / loadLocalTemplates
// ════════════════════════════════════════════════════════════════

describe('saveTemplate', () => {
  const custom: IntentTemplate = {
    name: 'custom-test', category: 'custom',
    description: 'Template de teste',
    tags: ['test'],
    body: {
      intent:      'Fazer {{action}} no {{entity}}',
      constraints: ['Validar antes de processar'],
      acceptance:  ['Ação executada com sucesso'],
    },
  };

  it('cria arquivo .template.json no diretório correto', () => {
    saveTemplate(custom, tmpDir);
    const file = path.join(tmpDir, '.idd', 'templates', 'custom-test.template.json');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('retorna caminho do arquivo criado', () => {
    const result = saveTemplate(custom, tmpDir);
    expect(result).toContain('custom-test.template.json');
  });

  it('arquivo JSON é válido e contém os campos', () => {
    saveTemplate(custom, tmpDir);
    const file    = path.join(tmpDir, '.idd', 'templates', 'custom-test.template.json');
    const content = JSON.parse(fs.readFileSync(file, 'utf8')) as IntentTemplate;
    expect(content.name).toBe('custom-test');
    expect(content.body.intent).toBe('Fazer {{action}} no {{entity}}');
  });

  it('cria diretório .idd/templates/ se não existir', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-empty-'));
    try {
      saveTemplate(custom, emptyDir);
      expect(fs.existsSync(path.join(emptyDir, '.idd', 'templates'))).toBe(true);
    } finally {
      fs.rmSync(emptyDir, { recursive: true });
    }
  });

  it('template salvo é carregado pelo listTemplates', () => {
    saveTemplate(custom, tmpDir);
    const list = listTemplates(tmpDir);
    expect(list.find(t => t.name === 'custom-test')).toBeDefined();
  });

  it('sobrescreve template existente de mesmo nome', () => {
    saveTemplate(custom, tmpDir);
    const updated = { ...custom, description: 'Versão atualizada' };
    saveTemplate(updated, tmpDir);
    const file    = path.join(tmpDir, '.idd', 'templates', 'custom-test.template.json');
    const content = JSON.parse(fs.readFileSync(file, 'utf8')) as IntentTemplate;
    expect(content.description).toBe('Versão atualizada');
  });
});

// ════════════════════════════════════════════════════════════════
// Pipeline e2e: template → aplicar → validar
// ════════════════════════════════════════════════════════════════

describe('Pipeline e2e: template → apply → validate', () => {
  it('crud template + entity=Product → YAML válido', async () => {
    const t       = getTemplate('crud', tmpDir)!;
    const applied = applyVariables(t, { entity: 'Product' });
    const yaml    = templateToYaml(applied, 'products/crud', 'typescript');
    const js      = await import('js-yaml');
    const result  = validateIntent(js.load(yaml) as unknown);
    expect(result.valid).toBe(true);
  });

  it('auth-jwt template + entity=user → YAML válido', async () => {
    const t       = getTemplate('auth-jwt', tmpDir)!;
    const applied = applyVariables(t, { entity: 'user' });
    const yaml    = templateToYaml(applied, 'auth/login', 'python');
    const js      = await import('js-yaml');
    const result  = validateIntent(js.load(yaml) as unknown);
    expect(result.valid).toBe(true);
  });

  it('webhook template + provider=GitHub → YAML válido', async () => {
    const t       = getTemplate('webhook', tmpDir)!;
    const applied = applyVariables(t, { provider: 'GitHub' });
    const yaml    = templateToYaml(applied, 'github/webhook', 'go');
    const js      = await import('js-yaml');
    const result  = validateIntent(js.load(yaml) as unknown);
    expect(result.valid).toBe(true);
  });

  it('template local salvo pode ser recuperado e aplicado', async () => {
    const custom: IntentTemplate = {
      name: 'meu-fluxo', category: 'custom',
      description: 'Fluxo customizado',
      tags: ['custom'],
      body: {
        intent: 'Processar {{tipo}} para {{destino}}',
        constraints: ['Validar tipo antes de processar'],
        acceptance:  ['Tipo válido processado com sucesso'],
      },
    };
    saveTemplate(custom, tmpDir);

    const loaded  = getTemplate('meu-fluxo', tmpDir)!;
    const applied = applyVariables(loaded, { tipo: 'pedido', destino: 'estoque' });
    const yaml    = templateToYaml(applied, 'orders/process', 'typescript');
    const js      = await import('js-yaml');
    const result  = validateIntent(js.load(yaml) as unknown);
    expect(result.valid).toBe(true);
    expect(yaml).toContain('pedido');
    expect(yaml).toContain('estoque');
  });
});
