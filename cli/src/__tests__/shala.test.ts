// src/__tests__/shala.test.ts — Testes unitários do Combo Científico de Custo Zero para Linguagem Ubíqua & SHALA
import { describe, it, expect } from 'vitest';
import {
  analisarFramesSemanticos,
  analisarAmbiguidadeEstrutural,
  calcularJSDivergence,
  analisarSinonimosOcultos,
  analisarConsistenciaGuardas,
  calcularShalaPragmatico,
} from '../lib/fase0/shala.ts';
import type { DictionaryTerm } from '@idd/core';

describe('Pilar 1: Frame Semantics (Fillmore)', () => {
  it('detecta ausência de política de resto em rateio financeiro', () => {
    const textoSemResto = 'O aplicativo deve dividir o valor total da conta entre os participantes.';
    const diags = analisarFramesSemanticos(textoSemResto);

    expect(diags.length).toBeGreaterThan(0);
    const diagResto = diags.find(d => d.frame === 'RateioFinanceiro' && d.slotFaltante.includes('Resto'));
    expect(diagResto).toBeDefined();
    expect(diagResto?.descricao).toContain('Política de Resto / Centavos Indivisíveis');
  });

  it('aprova rateio quando todos os slots obrigatórios (total, partes, resto) estão presentes', () => {
    const textoComResto = 'O aplicativo deve dividir o valor total da conta entre os participantes, com diferença de zero centavos e rodízio alfabético.';
    const diags = analisarFramesSemanticos(textoComResto);

    const diagsRateio = diags.filter(d => d.frame === 'RateioFinanceiro');
    expect(diagsRateio).toHaveLength(0);
  });

  it('detecta prazo temporal não mensurável', () => {
    const textoPrazoVago = 'O pagamento expira após um breve período.';
    const diags = analisarFramesSemanticos(textoPrazoVago);

    const diagPrazo = diags.find(d => d.frame === 'PrazoTemporal' && d.slotFaltante.includes('Mensurável'));
    expect(diagPrazo).toBeDefined();
  });

  it('aprova prazo temporal com duração objetiva e marco inicial', () => {
    const textoPrazoObjetivo = 'O pagamento expira após 15 minutos a partir de sua criação.';
    const diags = analisarFramesSemanticos(textoPrazoObjetivo);

    const diagsPrazo = diags.filter(d => d.frame === 'PrazoTemporal');
    expect(diagsPrazo).toHaveLength(0);
  });

  it('detecta ausência de sujeito autorizado em regras de controle de acesso (RBAC)', () => {
    const textoAcessoVago = 'O sistema deve permitir excluir a conta e alterar permissão.';
    const diags = analisarFramesSemanticos(textoAcessoVago);

    const diagAcesso = diags.find(d => d.frame === 'ControleDeAcesso');
    expect(diagAcesso).toBeDefined();
    expect(diagAcesso?.slotFaltante).toContain('Sujeito Autorizado');
  });

  it('detecta verbo transitivo deontológico solto sem argumento realizado', () => {
    const textoVerboSolto = 'O sistema deve cobrar.';
    const diags = analisarFramesSemanticos(textoVerboSolto);

    const diagSolto = diags.find(d => d.frame === 'AcaoTransitivaSemArgumento');
    expect(diagSolto).toBeDefined();
    expect(diagSolto?.descricao).toContain('cobrar');
  });
});

describe('Pilar 2: Earley Parser & Ambiguidade Estrutural (EARS-PT)', () => {
  it('detecta ambiguidade de escopo lógico em conjunção/disjunção mista ("A e B ou C")', () => {
    const texto = 'O sistema deve notificar o cliente e enviar sms ou disparar email ao fechar a conta.';
    const diags = analisarAmbiguidadeEstrutural(texto);

    expect(diags.length).toBeGreaterThan(0);
    const diagEscopo = diags.find(d => d.tipo === 'escopo_logico');
    expect(diagEscopo).toBeDefined();
    expect(diagEscopo?.leiturasPossiveis).toHaveLength(2);
    expect(diagEscopo?.leiturasPossiveis[0]).toContain('Leitura A');
    expect(diagEscopo?.leiturasPossiveis[1]).toContain('Leitura B');
  });

  it('detecta apego preposicional anfíbio (PP-attachment)', () => {
    const texto = 'O aplicativo deve notificar o cliente com pendência por email.';
    const diags = analisarAmbiguidadeEstrutural(texto);

    const diagPrep = diags.find(d => d.tipo === 'preposicao_anfibia');
    expect(diagPrep).toBeDefined();
    expect(diagPrep?.descricao).toContain('PP-attachment');
  });

  it('detecta termos vagos e subjetivos incompatíveis com rigor formal', () => {
    const textoVago = 'O carregamento da página deve ser rápido e a interface deve ser intuitiva.';
    const diags = analisarAmbiguidadeEstrutural(textoVago);

    const vagos = diags.filter(d => d.tipo === 'termo_vago_inadmissivel');
    expect(vagos.length).toBeGreaterThanOrEqual(1);
    expect(vagos.some(v => v.trecho.includes('rápido') || v.trecho.includes('intuitiv'))).toBe(true);
  });

  it('detecta ambiguidade de escopo em quantificador universal vs existencial', () => {
    const textoQuant = 'Todo usuário deve possuir uma chave.';
    const diags = analisarAmbiguidadeEstrutural(textoQuant);

    const quant = diags.find(d => d.tipo === 'quantificador_ambiguo');
    expect(quant).toBeDefined();
    expect(quant?.leiturasPossiveis[0]).toContain('Distributivo');
    expect(quant?.leiturasPossiveis[1]).toContain('Coletivo');
  });
});

describe('Pilar 3: PMI + Jensen-Shannon Divergence (Sinônimos Ocultos)', () => {
  it('calcula divergência JSD = 0 para distribuições idênticas (similaridade 100%)', () => {
    const dist = { conta: 0.5, mesa: 0.5 };
    const jsd = calcularJSDivergence(dist, dist);
    expect(jsd).toBe(0);
  });

  it('calcula divergência JSD = 1 para distribuições disjuntas (similaridade 0%)', () => {
    const p = { pizza: 1.0 };
    const q = { carro: 1.0 };
    const jsd = calcularJSDivergence(p, q);
    expect(jsd).toBe(1);
  });

  it('identifica sinônimos ocultos que coocorrem nos mesmos contextos sem estarem unificados', () => {
    const textos = [
      'o garcom emite o comprovante da mesa com o valor total',
      'o cliente recebe o comprovante da mesa para pagar',
      'o garcom emite o recibo da mesa com o valor total',
      'o cliente recebe o recibo da mesa para pagar',
    ];

    const dicionario: DictionaryTerm[] = [
      { term: 'Mesa', definition: 'Encontro de consumo', kind: 'entity', aliases: [], forbidden: [] },
    ];

    const diags = analisarSinonimosOcultos(textos, dicionario);
    const par = diags.find(
      d => (d.termoA === 'comprovante' && d.termoB === 'recibo') ||
           (d.termoA === 'recibo' && d.termoB === 'comprovante')
    );

    expect(par).toBeDefined();
    expect(par?.similaridadeJSD).toBeGreaterThanOrEqual(0.70);
    expect(par?.recomendacao).toContain('dicionario.json');
  });

  it('não sinaliza termos que já foram devidamente unificados como aliases no dicionário', () => {
    const textos = [
      'o garcom emite o comprovante da mesa com o valor total',
      'o garcom emite o recibo da mesa com o valor total',
    ];

    const dicionario: DictionaryTerm[] = [
      { term: 'Comprovante', definition: 'Documento de pagamento', kind: 'entity', aliases: ['recibo'], forbidden: [] },
    ];

    const diags = analisarSinonimosOcultos(textos, dicionario);
    const par = diags.find(
      d => (d.termoA === 'comprovante' && d.termoB === 'recibo') ||
           (d.termoA === 'recibo' && d.termoB === 'comprovante')
    );
    expect(par).toBeUndefined();
  });
});

describe('Pilar 4: DPLL / Consistência de Guardas Condicionais', () => {
  it('detecta lacuna de borda quando há > e < sem regra de igualdade (=)', () => {
    const texto = `
    Se valor > 100 o cliente deve receber desconto especial.
    Se valor < 100 o cliente deve pagar o preco normal.
    `;
    const diags = analisarConsistenciaGuardas(texto);

    const lacuna = diags.find(d => d.tipo === 'lacuna_completude' && d.variavel.includes('valor'));
    expect(lacuna).toBeDefined();
    expect(lacuna?.intervalosFaltantesOuSobrepostos).toContain('valor == valor exato');
  });

  it('detecta sobreposição conflitante para valores de fronteira (>= e <=)', () => {
    const texto = `
    Se saldo >= 50 o sistema deve autorizar o saque.
    Se saldo <= 50 o sistema deve bloquear por seguranca.
    `;
    const diags = analisarConsistenciaGuardas(texto);

    const sobreposicao = diags.find(d => d.tipo === 'sobreposicao_conflitante' && d.variavel.includes('saldo'));
    expect(sobreposicao).toBeDefined();
    expect(sobreposicao?.detalhe).toContain('50');
  });
});

describe('Pilar 5: SHALA Pragmático a Custo Zero (Entropia H(Y|X) e Contraexemplos)', () => {
  it('calcula H(Y|X) = 2.00 bits e gera tabela de 4 modelos quando a regra de resto está omissa', () => {
    const intencoes = '- **INT-001** O aplicativo deve dividir o preço de cada [[ItemConsumido]] entre os participantes.';
    const invariantes = '- **INV-001** Todo item deve ter consumidor.';
    const frames = analisarFramesSemanticos(intencoes);

    const shala = calcularShalaPragmatico(intencoes, invariantes, frames);

    expect(shala.entropiaBits).toBe(2.0);
    expect(shala.grauAmbiguidade).toBe('ALTA');
    expect(shala.modelosConcorrentes).toBe(4);
    expect(shala.contraexemplos).toHaveLength(1);

    const ce = shala.contraexemplos[0];
    expect(ce.linhas.some(l => l.participanteOuVariavel === 'Ana')).toBe(true);
    expect(ce.linhas.some(l => l.participanteOuVariavel === 'Total Arrecadado')).toBe(true);
    expect(shala.perguntaSocratica).toContain('resto');
  });

  it('calcula H(Y|X) = 0.00 bits quando a regra de rodízio e soma zero estão explicitadas', () => {
    const intencoes = '- **INT-001** O aplicativo deve dividir as cotas em rodízio alfabético entre os participantes.';
    const invariantes = '- **INV-001** [cálculo] A soma das cotas de todos os participantes deve ser exatamente igual ao total com diferença de zero centavos.';
    const frames = analisarFramesSemanticos(`${intencoes}\n${invariantes}`);

    const shala = calcularShalaPragmatico(intencoes, invariantes, frames);

    expect(shala.entropiaBits).toBe(0.0);
    expect(shala.grauAmbiguidade).toBe('NULA');
    expect(shala.modelosConcorrentes).toBe(1);
    expect(shala.contraexemplos).toHaveLength(0);
    expect(shala.perguntaSocratica).toContain('Nenhuma ambiguidade');
  });
});

