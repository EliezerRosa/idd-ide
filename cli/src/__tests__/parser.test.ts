// src/__tests__/parser.test.ts
import { describe, it, expect } from 'vitest';

// Re-implementamos buildPrompt aqui para testar isolado
// (evita dependência de vscode no CLI)

interface IntentYaml {
  intent:      string;
  module:      string;
  constraints: string[];
  acceptance:  string[];
  depends_on?: string[];
  language?:   string;
  framework?:  string;
}

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

// ── testes ───────────────────────────────────────────────────────

const BASE_INTENT: IntentYaml = {
  intent:      'Autenticar usuário com e-mail e senha',
  module:      'auth/login',
  constraints: ['senha >= 8 chars', 'bloquear após 5 tentativas', 'JWT expira em 24h'],
  acceptance:  ['login válido retorna 200 + JWT', 'senha errada retorna 401'],
  language:    'typescript',
};

describe('buildPrompt — system prompt', () => {
  it('menciona o módulo no system prompt', () => {
    const { system } = buildPrompt(BASE_INTENT, {});
    expect(system).toContain('auth/login');
  });

  it('instrui a retornar JSON com campos corretos', () => {
    const { system } = buildPrompt(BASE_INTENT, {});
    expect(system).toContain('"code"');
    expect(system).toContain('"tests"');
    expect(system).toContain('"docs"');
  });

  it('instrui a respeitar constraints', () => {
    const { system } = buildPrompt(BASE_INTENT, {});
    expect(system.toLowerCase()).toContain('constraint');
  });

  it('instrui a gerar um teste por critério', () => {
    const { system } = buildPrompt(BASE_INTENT, {});
    expect(system.toLowerCase()).toContain('teste');
  });
});

describe('buildPrompt — user prompt', () => {
  it('inclui a declaração da intenção', () => {
    const { user } = buildPrompt(BASE_INTENT, {});
    expect(user).toContain('Autenticar usuário com e-mail e senha');
  });

  it('inclui o módulo', () => {
    const { user } = buildPrompt(BASE_INTENT, {});
    expect(user).toContain('auth/login');
  });

  it('inclui a linguagem', () => {
    const { user } = buildPrompt(BASE_INTENT, {});
    expect(user).toContain('typescript');
  });

  it('inclui todas as constraints numeradas', () => {
    const { user } = buildPrompt(BASE_INTENT, {});
    expect(user).toContain('1. senha >= 8 chars');
    expect(user).toContain('2. bloquear após 5 tentativas');
    expect(user).toContain('3. JWT expira em 24h');
  });

  it('inclui todos os critérios de aceite numerados', () => {
    const { user } = buildPrompt(BASE_INTENT, {});
    expect(user).toContain('1. login válido retorna 200 + JWT');
    expect(user).toContain('2. senha errada retorna 401');
  });

  it('inclui framework quando fornecido', () => {
    const intent = { ...BASE_INTENT, framework: 'express' };
    const { user } = buildPrompt(intent, {});
    expect(user).toContain('express');
  });

  it('usa python quando linguagem é python', () => {
    const intent = { ...BASE_INTENT, language: 'python' };
    const { user } = buildPrompt(intent, {});
    expect(user).toContain('python');
    expect(user).not.toContain('typescript');
  });
});

describe('buildPrompt — contexto de dependências', () => {
  const depCtx = {
    'users/crud': {
      statement:   'Gerenciar usuários no banco de dados',
      constraints: ['email único', 'senha nunca retornada em texto claro'],
      version:     '1.2.0',
    },
  };

  it('inclui contexto de dependências quando presente', () => {
    const { user } = buildPrompt(BASE_INTENT, depCtx);
    expect(user).toContain('CONTEXTO DAS DEPENDÊNCIAS');
    expect(user).toContain('users/crud');
  });

  it('inclui a statement da dependência', () => {
    const { user } = buildPrompt(BASE_INTENT, depCtx);
    expect(user).toContain('Gerenciar usuários no banco de dados');
  });

  it('inclui constraints da dependência', () => {
    const { user } = buildPrompt(BASE_INTENT, depCtx);
    expect(user).toContain('email único');
  });

  it('não inclui seção de dependências quando vazia', () => {
    const { user } = buildPrompt(BASE_INTENT, {});
    expect(user).not.toContain('CONTEXTO DAS DEPENDÊNCIAS');
  });

  it('múltiplas dependências são todas incluídas', () => {
    const multiDep = {
      ...depCtx,
      'notify/email': { statement: 'Enviar e-mails', constraints: [], version: '1.0.0' },
    };
    const { user } = buildPrompt(BASE_INTENT, multiDep);
    expect(user).toContain('users/crud');
    expect(user).toContain('notify/email');
  });
});

describe('buildPrompt — output parsing', () => {
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
        code:  extractBlock('typescript') || raw,
        tests: extractBlock('test') || '',
        docs:  extractBlock('markdown') || '',
      };
    }
  }

  it('parseia JSON puro corretamente', () => {
    const raw    = '{"code":"const x=1","tests":"test()","docs":"# docs"}';
    const parsed = parseOutput(raw);
    expect(parsed.code).toBe('const x=1');
    expect(parsed.tests).toBe('test()');
    expect(parsed.docs).toBe('# docs');
  });

  it('parseia JSON dentro de bloco markdown', () => {
    const raw    = '```json\n{"code":"const x=1","tests":"","docs":""}\n```';
    const parsed = parseOutput(raw);
    expect(parsed.code).toBe('const x=1');
  });

  it('faz fallback para extração por bloco quando JSON inválido', () => {
    const raw = [
      'Aqui está o código:',
      '```typescript',
      'export function login() {}',
      '```',
      '```test',
      'it("works", () => {})',
      '```',
    ].join('\n');
    const parsed = parseOutput(raw);
    expect(parsed.code).toContain('login');
    expect(parsed.tests).toContain('it(');
  });

  it('retorna raw como code quando nenhum bloco encontrado', () => {
    const raw    = 'código sem bloco';
    const parsed = parseOutput(raw);
    expect(parsed.code).toBe('código sem bloco');
  });
});
