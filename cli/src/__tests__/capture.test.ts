// src/__tests__/capture.test.ts — Issue #16: idd capture
import { describe, it, expect } from 'vitest';
import { parseExpansion, expandedToYaml } from '../commands/capture.ts';
import { validateIntent } from '../lib/security.ts';

// ════════════════════════════════════════════════════════════════
// parseExpansion
// ════════════════════════════════════════════════════════════════

describe('parseExpansion', () => {
  it('parseia JSON limpo corretamente', () => {
    const raw = JSON.stringify({
      intent: 'Autenticar usuário', module: 'auth/login',
      constraints: ['c1'], acceptance: ['a1'],
    });
    const result = parseExpansion(raw);
    expect(result.intent).toBe('Autenticar usuário');
    expect(result.module).toBe('auth/login');
  });

  it('remove fence ```json ao redor do JSON', () => {
    const raw = '```json\n{"intent":"x","module":"a/b","constraints":["c"],"acceptance":["a"]}\n```';
    const result = parseExpansion(raw);
    expect(result.intent).toBe('x');
  });

  it('lança erro para JSON inválido', () => {
    expect(() => parseExpansion('não é json')).toThrow();
  });

  it('preserva depends_on quando presente', () => {
    const raw = JSON.stringify({
      intent: 'x', module: 'a/b', constraints: ['c'], acceptance: ['a'],
      depends_on: ['users/crud'],
    });
    const result = parseExpansion(raw);
    expect(result.depends_on).toEqual(['users/crud']);
  });

  it('depends_on ausente não lança erro', () => {
    const raw = JSON.stringify({ intent: 'x', module: 'a/b', constraints: ['c'], acceptance: ['a'] });
    const result = parseExpansion(raw);
    expect(result.depends_on).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════
// expandedToYaml
// ════════════════════════════════════════════════════════════════

describe('expandedToYaml', () => {
  const BASE = {
    intent:      'Autenticar usuário com e-mail e senha',
    module:      'auth/login',
    constraints: ['senha >= 8 caracteres', 'bloquear após 5 tentativas'],
    acceptance:  ['login válido retorna JWT', 'senha errada retorna 401'],
  };

  it('gera YAML com campo intent entre aspas', () => {
    const yaml = expandedToYaml(BASE);
    expect(yaml).toContain('intent: "Autenticar usuário com e-mail e senha"');
  });

  it('gera YAML com módulo correto', () => {
    const yaml = expandedToYaml(BASE);
    expect(yaml).toContain('module: auth/login');
  });

  it('gera YAML com todas as constraints', () => {
    const yaml = expandedToYaml(BASE);
    BASE.constraints.forEach(c => expect(yaml).toContain(c));
  });

  it('gera YAML com todos os critérios de aceite', () => {
    const yaml = expandedToYaml(BASE);
    BASE.acceptance.forEach(a => expect(yaml).toContain(a));
  });

  it('inclui depends_on quando fornecido', () => {
    const yaml = expandedToYaml({ ...BASE, depends_on: ['users/crud'] });
    expect(yaml).toContain('depends_on:');
    expect(yaml).toContain('users/crud');
  });

  it('omite depends_on quando vazio', () => {
    const yaml = expandedToYaml({ ...BASE, depends_on: [] });
    expect(yaml).not.toContain('depends_on:');
  });

  it('inclui language quando passado como parâmetro', () => {
    const yaml = expandedToYaml(BASE, 'python');
    expect(yaml).toContain('language: python');
  });

  it('language do parâmetro tem prioridade sobre expanded.language', () => {
    const yaml = expandedToYaml({ ...BASE, language: 'go' }, 'python');
    expect(yaml).toContain('language: python');
    expect(yaml).not.toContain('language: go');
  });

  it('usa expanded.language quando parâmetro não fornecido', () => {
    const yaml = expandedToYaml({ ...BASE, language: 'rust' });
    expect(yaml).toContain('language: rust');
  });

  it('escapa aspas duplas internas no intent', () => {
    const yaml = expandedToYaml({ ...BASE, intent: 'Validar "token" do usuário' });
    expect(yaml).toContain('\\"token\\"');
  });

  it('escapa aspas duplas em constraints', () => {
    const yaml = expandedToYaml({ ...BASE, constraints: ['campo "email" obrigatório'] });
    expect(yaml).toContain('\\"email\\"');
  });

  it('sempre inclui version 0.0.0', () => {
    const yaml = expandedToYaml(BASE);
    expect(yaml).toContain('version: "0.0.0"');
  });
});

// ════════════════════════════════════════════════════════════════
// Pipeline e2e: expansão → YAML → validação
// ════════════════════════════════════════════════════════════════

describe('Pipeline e2e — capture → YAML → validate', () => {
  it('expansão simples gera YAML válido pelo schema', async () => {
    const raw = JSON.stringify({
      intent: 'Autenticar usuário com email e senha, retornando JWT válido por 24h',
      module: 'auth/login',
      constraints: ['senha >= 8 caracteres', 'JWT expira em 24h'],
      acceptance: ['login válido retorna JWT', 'senha errada retorna 401'],
    });
    const expanded = parseExpansion(raw);
    const yaml      = expandedToYaml(expanded, 'typescript');
    const js        = await import('js-yaml');
    const result    = validateIntent(js.load(yaml) as unknown);
    expect(result.valid).toBe(true);
  });

  it('expansão com depends_on gera YAML válido', async () => {
    const raw = JSON.stringify({
      intent: 'Listar pedidos do usuário autenticado com paginação',
      module: 'orders/list',
      constraints: ['máximo 50 itens por página', 'requer autenticação'],
      acceptance: ['lista retorna itens paginados', 'sem auth retorna 401'],
      depends_on: ['auth/login', 'orders/crud'],
    });
    const expanded = parseExpansion(raw);
    const yaml      = expandedToYaml(expanded);
    const js        = await import('js-yaml');
    const result    = validateIntent(js.load(yaml) as unknown);
    expect(result.valid).toBe(true);
  });

  it('módulo sobrescrito pelo usuário (--module=) reflete no YAML final', () => {
    const raw = JSON.stringify({
      intent: 'Processar pagamento via cartão de crédito com retry',
      module: 'payment/process', // sugestão do LLM
      constraints: ['validar CVV antes de processar'],
      acceptance: ['pagamento aprovado retorna confirmação'],
    });
    const expanded = parseExpansion(raw);
    expanded.module = 'payments/credit-card'; // usuário força via --module=
    const yaml = expandedToYaml(expanded);
    expect(yaml).toContain('module: payments/credit-card');
    expect(yaml).not.toContain('module: payment/process');
  });

  it('descrição com caracteres especiais não quebra o YAML', async () => {
    const raw = JSON.stringify({
      intent: 'Validar entrada do usuário (formato "email@domínio")',
      module: 'validation/email',
      constraints: ['aceitar apenas formato RFC 5322'],
      acceptance: ['email válido retorna true'],
    });
    const expanded = parseExpansion(raw);
    const yaml      = expandedToYaml(expanded);
    const js        = await import('js-yaml');
    expect(() => js.load(yaml)).not.toThrow();
  });
});
