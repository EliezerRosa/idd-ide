import { describe, it, expect } from 'vitest';
import { lintTexto, casaMolde } from '../lib/fase0/lintLn.ts';
import type { UbiquitousDictionary } from '@idd/core';

const dic: UbiquitousDictionary = {
  version: '1.0',
  terms: [
    { term: 'Sistema', definition: 'O sistema de racha de conta', kind: 'service', aliases: ['plataforma'], forbidden: ['app'] },
    { term: 'Pedido', definition: 'Pedido feito por um cliente', kind: 'entity', aliases: [], forbidden: ['ordem'] },
  ],
};

const regras = (t: string, d?: UbiquitousDictionary) => lintTexto(t, { dicionario: d }).map(x => x.regra);

describe('lint-ln — regras de prosa', () => {
  it('LN001 termos vagos (positivo e negativo)', () => {
    expect(regras('A resposta deve ser rápida e flexível, etc.')).toEqual(expect.arrayContaining(['LN001']));
    expect(lintTexto('A resposta deve ser rápida, etc.').filter(d => d.regra === 'LN001').length).toBe(2);
    expect(regras('O Sistema deve responder em até 2 segundos.')).not.toContain('LN001');
    expect(lintTexto('Isto é adequado.')[0].severidade).toBe('aviso');
  });

  it('LN002 e/ou é erro', () => {
    const d = lintTexto('O cliente paga em dinheiro e/ou cartão.');
    expect(d.find(x => x.regra === 'LN002')?.severidade).toBe('erro');
    expect(regras('O cliente paga em dinheiro ou cartão.')).not.toContain('LN002');
  });

  it('LN003 voz passiva sem agente', () => {
    expect(regras('O pedido foi cancelado.')).toContain('LN003');
    expect(regras('Os pedidos serão enviados amanhã.')).toContain('LN003');
    expect(regras('O pedido foi cancelado pelo cliente.')).not.toContain('LN003');
    expect(regras('O pedido foi cancelado por um operador.')).not.toContain('LN003');
    expect(regras('O valor é válido.')).not.toContain('LN003');
    expect(lintTexto('O pedido foi cancelado.').find(x => x.regra === 'LN003')?.mensagem).toContain('quem executa a ação?');
  });

  it('LN004 anáfora ambígua em início de frase', () => {
    expect(regras('Ele deve salvar o pedido.')).toContain('LN004');
    expect(regras('O cliente paga. Isso gera uma nota.')).toContain('LN004');
    expect(regras('O mesmo cliente deve receber aviso.')).toContain('LN004');
    expect(regras('O cliente paga porque ele quer.')).not.toContain('LN004');
  });

  it('LN005 tempo não mensurável (sem duplicar LN001)', () => {
    const d = lintTexto('Enviar o aviso o mais rápido possível.');
    expect(d.map(x => x.regra)).toEqual(['LN005']);
    expect(regras('Atualizar periodicamente e imediatamente.')).toEqual(['LN005', 'LN005']);
    expect(regras('Enviar o aviso em até 5 segundos.')).not.toContain('LN005');
  });

  it('ignora blocos de código e citações de fonte', () => {
    const t = ['> o sistema deve ser rápido e/ou flexível', '```', 'rápido e/ou etc.', '```', 'Texto normal.'].join('\n');
    expect(lintTexto(t)).toEqual([]);
  });

  it('linha e coluna são 1-based', () => {
    const d = lintTexto('linha um\nO cliente e/ou o dono.')[0];
    expect(d.linha).toBe(2);
    expect(d.coluna).toBe(11);
  });
});

describe('lint-ln — dicionário', () => {
  it('LN006 termo marcado ausente do dicionário', () => {
    expect(regras('- **INT-001** O [[Sistema]] deve ligar o [[Robo]].', dic)).toContain('LN006');
    expect(regras('- **INT-001** O [[Sistema]] deve registrar o [[Pedido]].', dic)).not.toContain('LN006');
    expect(regras('- **INT-001** O [[plataforma]] deve registrar o [[Pedido]].', dic)).not.toContain('LN006');
  });

  it('LN007 sinônimo proibido em qualquer lugar', () => {
    const d = lintTexto('O app deve registrar a ordem.', { dicionario: dic });
    expect(d.filter(x => x.regra === 'LN007').length).toBe(2);
    expect(d[0].sugestao).toContain('[[Sistema]]');
    expect(regras('O mapa deve registrar.', dic)).not.toContain('LN007');
  });

  it('LN008 termo do dicionário sem marcação (info)', () => {
    const d = lintTexto('O sistema deve registrar o pedido.', { dicionario: dic });
    expect(d.filter(x => x.regra === 'LN008').map(x => x.severidade)).toEqual(['info', 'info']);
    expect(regras('O [[Sistema]] deve registrar o [[Pedido]].', dic)).not.toContain('LN008');
  });

  it('sem dicionário, LN006-LN008 não rodam', () => {
    expect(regras('O [[Robo]] deve ligar.')).toEqual([]);
  });
});

describe('lint-ln — intenções (EARS-PT)', () => {
  const ok = [
    'O [[Sistema]] deve registrar o pedido.',
    'Quando o cliente confirma o pedido, o [[Sistema]] deve registrar a venda.',
    'Enquanto o pedido está aberto, o [[Sistema]] não deve aceitar pagamento.',
    'Se o pagamento falha, então o [[Sistema]] deve notificar o cliente.',
    'Onde houver desconto, o [[Sistema]] deve exibir o valor original.',
    'Enquanto a conta está aberta, quando o cliente paga, o [[Sistema]] deve abater o saldo.',
    'Os [[Clientes]] devem aceitar os termos.',
  ];
  for (const f of ok) {
    it(`aceita: ${f}`, () => {
      expect(casaMolde(f)).toBe(true);
      expect(regras(`- **INT-001** ${f}`)).not.toContain('LN010');
    });
  }

  it('rejeita frases fora do molde', () => {
    expect(regras('- **INT-001** O [[Sistema]] registra o pedido.')).toContain('LN010');
    expect(regras('- **INT-001** Quando o cliente confirma o pedido o [[Sistema]] deve registrar.')).toContain('LN010');
    expect(regras('- **INT-001** Se o pagamento falha, o [[Sistema]] deve notificar.')).toContain('LN010');
    expect(regras('- **INT-001** [[Sistema]] deve registrar o pedido.')).toContain('LN010');
    expect(regras('- **INT-001** O [[Sistema]] deve registrar o pedido')).toContain('LN010');
    const d = lintTexto('- **INT-001** O [[Sistema]] registra o pedido.').find(x => x.regra === 'LN010')!;
    expect(d.severidade).toBe('erro');
    expect(d.mensagem).toContain('deve');
  });
});

describe('lint-ln — invariantes', () => {
  it('LN011 tipo inválido ou ausente', () => {
    expect(regras('- **INV-001** [bonito] Todo saldo é sempre igual a zero.')).toContain('LN011');
    expect(regras('- **INV-001** Todo saldo é sempre igual a zero.')).toContain('LN011');
    expect(regras('- **INV-001** [integridade] Todo pagamento sempre pertence a uma conta.')).not.toContain('LN011');
    expect(regras('- **INV-002** [autorização] Só o dono pode editar; ninguém não pode apagar.')).not.toContain('LN011');
    expect(regras('- **INV-003** [cálculo] O total = soma dos itens.')).toEqual([]);
  });

  it('LN012 enunciado sem marcador testável', () => {
    expect(regras('- **INV-001** [estado] O pedido tem um status bonito.')).toContain('LN012');
    for (const e of ['sempre', 'nunca é', 'deve ter', 'não pode ser', 'no máximo 3', 'no mínimo 1', 'exatamente 1', 'igual a 0', 'x = y', 'a ≤ b', 'a ≥ b', 'a < b', 'a > b']) {
      expect(regras(`- **INV-001** [estado] O valor ${e}`)).not.toContain('LN012');
    }
  });

  it('LN013 id duplicado', () => {
    const t = '- **INT-001** O [[Sistema]] deve a.\n- **INT-001** O [[Sistema]] deve b.\n- **INV-001** [estado] sempre a\n- **INV-001** [estado] sempre b';
    const d = lintTexto(t).filter(x => x.regra === 'LN013');
    expect(d.map(x => x.linha)).toEqual([2, 4]);
    expect(d[0].severidade).toBe('erro');
    expect(regras('- **INT-001** O [[Sistema]] deve a.\n- **INT-002** O [[Sistema]] deve b.')).not.toContain('LN013');
  });
});
