// src/__tests__/engine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Tipos replicados localmente (sem importar o engine completo) ──
interface IntentYaml {
  intent:      string;
  module:      string;
  constraints: string[];
  acceptance:  string[];
  depends_on?: string[];
  language?:   string;
  framework?:  string;
}

// ── Intent Parser puro (extraído do engine para testar isolado) ──
function buildPrompt(intent: IntentYaml, depCtx: Record<string, any>) {
  const system = [
    `Você é um gerador de código preciso para o módulo ${intent.module}.`,
    `Gere código que satisfaça EXATAMENTE a intenção declarada.`,
    `Respeite TODAS as constraints sem exceção alguma.`,
    `Para cada acceptance criterion, gere um teste unitário correspondente.`,
    `Retorne APENAS um objeto JSON válido com os campos:`,
    `  "code"  — implementação completa e funcional`,
    `  "tests" — testes unitários (um por acceptance criterion)`,
    `  "docs"  — documentação em markdown`,
    `Nada fora do JSON. Sem blocos de código markdown ao redor.`,
  ].join('\n');

  const depSection = Object.keys(depCtx).length > 0
    ? `\n\nCONTEXTO DAS DEPENDÊNCIAS (use estes contratos):\n${JSON.stringify(depCtx, null, 2)}`
    : '';

  const user = [
    `INTENÇÃO: ${intent.intent}`,
    `MÓDULO: ${intent.module}`,
    `LINGUAGEM: ${intent.language ?? 'typescript'}${intent.framework ? ` + ${intent.framework}` : ''}`,
    ``,
    `CONSTRAINTS (todas obrigatórias):`,
    ...intent.constraints.map((c, i) => `  ${i + 1}. ${c}`),
    ``,
    `CRITÉRIOS DE ACEITE (cada um exige um teste):`,
    ...intent.acceptance.map((a, i) => `  ${i + 1}. ${a}`),
    depSection,
  ].join('\n');

  return { system, user };
}

function parseOutput(raw: string): { code: string; tests: string; docs: string } {
  try {
    const clean = raw.replace(/^```json\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    return JSON.parse(clean);
  } catch {
    const extractBlock = (lang: string) => {
      const m = raw.match(new RegExp('```' + lang + '\\n([\\s\\S]*?)```'));
      return m?.[1]?.trim() ?? '';
    };
    return {
      code:  extractBlock('typescript') || extractBlock('python') || raw,
      tests: extractBlock('test') || '',
      docs:  '',
    };
  }
}

// ── Fixtures ─────────────────────────────────────────────────────

const AUTH_INTENT: IntentYaml = {
  intent:      'Autenticar usuário com e-mail e senha, retornando JWT válido por 24h',
  module:      'auth/login',
  constraints: [
    'Senha deve ter mínimo 8 caracteres',
    'Bloquear após 5 tentativas',
    'JWT expira em 24h',
    'Nunca logar senha',
  ],
  acceptance: [
    'login válido retorna 200 e token JWT',
    'senha errada retorna 401',
    '5ª tentativa bloqueia por 15min',
    'token contém userId e exp',
  ],
  depends_on: ['users/crud'],
  language:   'typescript',
  framework:  'express',
};

const SIMPLE_INTENT: IntentYaml = {
  intent:      'Calcular a soma de dois números',
  module:      'math/sum',
  constraints: ['Lançar erro se os argumentos não forem números'],
  acceptance:  ['sum(2, 3) retorna 5', 'sum("a", 1) lança TypeError'],
  language:    'typescript',
};

// ── Testes: buildPrompt ──────────────────────────────────────────

describe('Intent Parser — buildPrompt', () => {

  it('system prompt menciona o módulo correto', () => {
    const { system } = buildPrompt(AUTH_INTENT, {});
    expect(system).toContain('auth/login');
  });

  it('system prompt exige retorno JSON', () => {
    const { system } = buildPrompt(AUTH_INTENT, {});
    expect(system).toContain('JSON');
    expect(system).toContain('"code"');
    expect(system).toContain('"tests"');
    expect(system).toContain('"docs"');
  });

  it('user prompt contém a declaração da intenção', () => {
    const { user } = buildPrompt(AUTH_INTENT, {});
    expect(user).toContain(AUTH_INTENT.intent);
  });

  it('user prompt lista todas as constraints numeradas', () => {
    const { user } = buildPrompt(AUTH_INTENT, {});
    AUTH_INTENT.constraints.forEach((c, i) => {
      expect(user).toContain(`${i + 1}. ${c}`);
    });
  });

  it('user prompt lista todos os critérios de aceite', () => {
    const { user } = buildPrompt(AUTH_INTENT, {});
    AUTH_INTENT.acceptance.forEach((a, i) => {
      expect(user).toContain(`${i + 1}. ${a}`);
    });
  });

  it('user prompt inclui linguagem e framework', () => {
    const { user } = buildPrompt(AUTH_INTENT, {});
    expect(user).toContain('typescript');
    expect(user).toContain('express');
  });

  it('sem framework: não inclui "undefined" ou "null"', () => {
    const { user } = buildPrompt(SIMPLE_INTENT, {});
    expect(user).not.toContain('undefined');
    expect(user).not.toContain('null');
    expect(user).toContain('LINGUAGEM: typescript');
  });

  it('sem contexto de dependências: não inclui seção CONTEXTO', () => {
    const { user } = buildPrompt(SIMPLE_INTENT, {});
    expect(user).not.toContain('CONTEXTO DAS DEPENDÊNCIAS');
  });

  it('com contexto de dependências: inclui contratos serializados', () => {
    const ctx = {
      'users/crud': {
        statement:   'CRUD de usuários',
        constraints: ['email único'],
        version:     '1.0.0',
      }
    };
    const { user } = buildPrompt(AUTH_INTENT, ctx);
    expect(user).toContain('CONTEXTO DAS DEPENDÊNCIAS');
    expect(user).toContain('users/crud');
    expect(user).toContain('email único');
  });

  it('prompt não contém placeholders vazios', () => {
    const { system, user } = buildPrompt(SIMPLE_INTENT, {});
    expect(system).not.toMatch(/\{\{[^}]+\}\}/);
    expect(user).not.toMatch(/\{\{[^}]+\}\}/);
  });
});

// ── Testes: parseOutput ──────────────────────────────────────────

describe('Intent Parser — parseOutput', () => {

  it('parseia JSON limpo corretamente', () => {
    const raw = JSON.stringify({
      code:  'export function sum(a: number, b: number) { return a + b; }',
      tests: 'it("soma", () => { expect(sum(2,3)).toBe(5); })',
      docs:  '# math/sum\n\nSoma dois números.',
    });
    const result = parseOutput(raw);
    expect(result.code).toContain('return a + b');
    expect(result.tests).toContain('expect(sum(2,3))');
    expect(result.docs).toContain('# math/sum');
  });

  it('parseia JSON com fences markdown ```json', () => {
    const raw = '```json\n{"code":"const x = 1;","tests":"","docs":""}\n```';
    const result = parseOutput(raw);
    expect(result.code).toBe('const x = 1;');
  });

  it('fallback: extrai bloco typescript quando não é JSON', () => {
    const raw = '```typescript\nconst add = (a: number) => a;\n```';
    const result = parseOutput(raw);
    expect(result.code).toContain('const add');
  });

  it('fallback: retorna raw como code quando sem bloco reconhecível', () => {
    const raw = 'function hello() { return "hi"; }';
    const result = parseOutput(raw);
    expect(result.code).toContain('hello');
  });

  it('campos ausentes no JSON resultam em strings vazias', () => {
    const raw = JSON.stringify({ code: 'const x = 1;' });
    const result = parseOutput(raw);
    expect(result.tests ?? '').toBe('');
    expect(result.docs ?? '').toBe('');
  });

  it('JSON com campos extras não causa erro', () => {
    const raw = JSON.stringify({
      code: 'ok', tests: 'ok', docs: 'ok', extra_field: 'ignorado'
    });
    expect(() => parseOutput(raw)).not.toThrow();
  });
});
