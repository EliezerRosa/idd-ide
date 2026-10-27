import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { renderRodada, lerRodadaRespondida, temAlgumaResposta } from '../lib/fase0/rodada.ts';
import { aplicarRodada } from '../lib/fase0/aplicar.ts';
import { arquivoRodada, caminhosCaso, inicializarCaso, lerDecisoes, lerDicionarioCaso, lerTexto } from '../lib/fase0/casos.ts';
import { normalizarSaida, type SaidaShada } from '../lib/fase0/shada.ts';

const saida: SaidaShada = normalizarSaida({
  perguntas: [
    { id: 'x', texto: 'Quem pode fechar a conta?', porque: 'Define autorização.', opcoes: ['Só o dono', 'Qualquer participante', 'Garçom'], bloqueante: true },
    { id: 'y', texto: 'Há gorjeta?', porque: 'Afeta o cálculo.', opcoes: [], bloqueante: true },
    { id: 'z', texto: 'Moeda única?', porque: 'Detalhe.', opcoes: ['Sim', 'Não'], bloqueante: false },
  ],
  propostas: [
    { id: 'a', tipo: 'intencao', alvo: 'INT-001', texto: 'Quando o dono fecha a conta, o [[Sistema]] deve bloquear novos itens.', tipoInvariante: '', termo: { definicao: '', kind: '', aliases: [], proibidos: [] }, justificativa: 'Fecha o ciclo de vida.' },
    { id: 'b', tipo: 'invariante', alvo: 'INV-001', texto: 'O total da [[Conta]] é sempre igual à soma dos itens.', tipoInvariante: 'cálculo', termo: { definicao: '', kind: '', aliases: [], proibidos: [] }, justificativa: 'Consistência.' },
    { id: 'c', tipo: 'termo', alvo: 'Conta', texto: '', tipoInvariante: '', termo: { definicao: 'Comanda compartilhada entre participantes', kind: 'aggregate', aliases: ['comanda'], proibidos: ['nota'] }, justificativa: 'Termo central.' },
    { id: 'd', tipo: 'intencao', alvo: 'novo', texto: 'O [[Sistema]] deve ratear o total.', tipoInvariante: '', termo: { definicao: '', kind: '', aliases: [], proibidos: [] }, justificativa: 'Rateio.' },
    { id: 'e', tipo: 'intencao', alvo: 'INT-009', texto: 'Proposta rejeitada.', tipoInvariante: '', termo: { definicao: '', kind: '', aliases: [], proibidos: [] }, justificativa: '' },
    { id: 'f', tipo: 'intencao', alvo: 'INT-010', texto: 'Sem decisão.', tipoInvariante: '', termo: { definicao: '', kind: '', aliases: [], proibidos: [] }, justificativa: '' },
  ],
  contradicoes: ['A fonte A diz X e a fonte B diz Y.'],
  observacoes: 'Observação de teste.',
});

describe('rodada — render e leitura', () => {
  it('normaliza ids (P01.., PR01..)', () => {
    expect(saida.perguntas.map(q => q.id)).toEqual(['P01', 'P02', 'P03']);
    expect(saida.propostas.map(r => r.id)).toEqual(['PR01', 'PR02', 'PR03', 'PR04', 'PR05', 'PR06']);
  });

  it('renderiza o formato esperado', () => {
    const md = renderRodada('racha', 1, saida);
    expect(md).toContain('# Rodada 01 — racha');
    expect(md).toContain('idd fase0 loop1 racha');
    expect(md).toContain('### P01 · bloqueante');
    expect(md).toContain('### P03 · não bloqueante');
    expect(md).toContain('Por quê: Define autorização.');
    expect(md).toContain('2. Qualquer participante');
    expect(md).toContain('**Resposta:**');
    expect(md).toContain('### PR01 · intenção · INT-001');
    expect(md).toContain('### PR02 · invariante · INV-001');
    expect(md).toContain('> [cálculo] O total da [[Conta]]');
    expect(md).toContain('### PR03 · termo · Conta');
    expect(md).toContain('**Decisão:** [ ] aceitar  [ ] rejeitar');
    expect(md).toContain('**Texto final (opcional):**');
    expect(md).toContain('## Contradições');
    expect(md).toContain('## Observações');
  });

  it('rodada em branco não tem respostas', () => {
    const r = lerRodadaRespondida(renderRodada('racha', 1, saida), saida);
    expect(r.respostas).toEqual({});
    expect(Object.values(r.propostas).every(p => p.decisao === null)).toBe(true);
    expect(temAlgumaResposta(r)).toBe(false);
  });

  const responder = (md: string, id: string, texto: string): string =>
    md.replace(new RegExp(`(### ${id} ·[\\s\\S]*?\\*\\*Resposta:\\*\\*)`), `$1 ${texto}`);

  it('ida e volta: número, texto livre multilinha e marcações [x]/[X]', () => {
    let md = renderRodada('racha', 1, saida);
    md = responder(md, 'P02', '2'); // P02 não tem opções: fica literal
    md = responder(md, 'P03', '2\nlinha extra de comentário'); // P03 tem opções Sim/Não
    md = md.replace(/(### PR01 ·[\s\S]*?)\*\*Decisão:\*\* \[ \] aceitar  \[ \] rejeitar\n\n\*\*Texto final \(opcional\):\*\*/,
      '$1**Decisão:** [x] aceitar  [ ] rejeitar\n\n**Texto final (opcional):** Quando o dono fecha a conta, o [[Sistema]] deve travar a conta.\nSegunda linha do texto final.');
    md = md.replace(/(### PR02 ·[\s\S]*?)\[ \] rejeitar/, '$1[X] rejeitar');
    const r = lerRodadaRespondida(md, saida);
    expect(r.respostas.P01).toBeUndefined();
    expect(r.respostas.P02).toBe('2');
    expect(r.respostas.P03).toBe('2\nlinha extra de comentário');
    expect(r.propostas.PR01.decisao).toBe('aceitar');
    expect(r.propostas.PR01.textoFinal).toBe('Quando o dono fecha a conta, o [[Sistema]] deve travar a conta.\nSegunda linha do texto final.');
    expect(r.propostas.PR02.decisao).toBe('rejeitar');
    expect(r.propostas.PR03.decisao).toBeNull();
    expect(temAlgumaResposta(r)).toBe(true);
  });

  it('resposta numérica vira o texto da opção; várias opções são unidas', () => {
    const base = renderRodada('racha', 1, saida);
    expect(lerRodadaRespondida(responder(base, 'P01', '2'), saida).respostas.P01).toBe('Qualquer participante');
    expect(lerRodadaRespondida(responder(base, 'P01', '1, 3'), saida).respostas.P01).toBe('Só o dono; Garçom');
    expect(lerRodadaRespondida(responder(base, 'P01', '7'), saida).respostas.P01).toBe('7');
  });

  it('marcar aceitar e rejeitar ao mesmo tempo é ambíguo (pendente)', () => {
    const md = renderRodada('racha', 1, saida).replace('**Decisão:** [ ] aceitar  [ ] rejeitar', '**Decisão:** [x] aceitar  [x] rejeitar');
    expect(lerRodadaRespondida(md, saida).propostas.PR01.decisao).toBeNull();
  });
});

describe('aplicação da rodada', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-f0-'));
    inicializarCaso(root, 'racha');
  });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  function prepararRodada(editar: (md: string) => string): ReturnType<typeof caminhosCaso> {
    const p = caminhosCaso(root, 'racha');
    fs.writeFileSync(arquivoRodada(p, 1, 'json'), JSON.stringify(saida), 'utf8');
    fs.writeFileSync(arquivoRodada(p, 1, 'md'), editar(renderRodada('racha', 1, saida)), 'utf8');
    return p;
  }

  const aceitar = (md: string, id: string, final = ''): string =>
    md.replace(new RegExp(`(### ${id} ·[\\s\\S]*?)\\*\\*Decisão:\\*\\* \\[ \\] aceitar  \\[ \\] rejeitar\\n\\n\\*\\*Texto final \\(opcional\\):\\*\\*`),
      `$1**Decisão:** [x] aceitar  [ ] rejeitar\n\n**Texto final (opcional):** ${final}`);

  it('registra decisões, grava intenções/invariantes e atualiza o dicionário', () => {
    const p = prepararRodada(md => {
      let m = md.replace('3. Garçom\n\n**Resposta:**', '3. Garçom\n\n**Resposta:** 1');
      m = aceitar(m, 'PR01');
      m = aceitar(m, 'PR02');
      m = aceitar(m, 'PR03');
      m = aceitar(m, 'PR04', 'O [[Sistema]] deve ratear o total igualmente.');
      m = m.replace(/(### PR05 ·[\s\S]*?)\[ \] rejeitar/, '$1[x] rejeitar');
      return m;
    });
    const r = aplicarRodada(p, 1, '2026-10-27');
    expect(r).toMatchObject({ respondidas: 1, abertas: 2, aceitas: 4, rejeitadas: 1, pendentes: 1, invalidas: 0 });

    const int = lerTexto(p.intencoes);
    expect(int).toContain('- **INT-001** Quando o dono fecha a conta, o [[Sistema]] deve bloquear novos itens.');
    expect(int).toContain('- **INT-002** O [[Sistema]] deve ratear o total igualmente.'); // alvo "novo" -> próximo id
    expect(lerTexto(p.invariantes)).toContain('- **INV-001** [cálculo] O total da [[Conta]] é sempre igual à soma dos itens.');

    const dic = lerDicionarioCaso(p.dicionario);
    expect(dic.terms).toHaveLength(1);
    expect(dic.terms[0]).toMatchObject({ term: 'Conta', kind: 'aggregate', aliases: ['comanda'], forbidden: ['nota'] });

    const dec = lerTexto(p.decisoes);
    expect(dec).toContain('- [x] D-001 · R01/P01 · bloqueante · Quem pode fechar a conta? → Só o dono (2026-10-27)');
    expect(dec).toContain('- [ ] D-002 · R01/P02 · bloqueante · Há gorjeta?');
    expect(dec).toContain('- [ ] D-003 · R01/P03 · não-bloqueante · Moeda única?');
    expect(dec).toContain('· R01/PR01 · proposta aceita: INT-001 —');
    expect(dec).toContain('· R01/PR05 · proposta rejeitada: INT-009 (2026-10-27)');
    expect(dec).toContain('· R01/PR06 · não-bloqueante · proposta pendente: INT-010');
    const ds = lerDecisoes(dec);
    expect(ds.filter(d => !d.marcada && d.bloqueante).map(d => d.id)).toEqual(['D-002']);
    expect(ds.map(d => d.id)).toEqual(['D-001', 'D-002', 'D-003', 'D-004', 'D-005', 'D-006', 'D-007', 'D-008', 'D-009']);
  });

  it('substitui a linha existente do alvo e atualiza termo existente', () => {
    const p = prepararRodada(md => aceitar(aceitar(md, 'PR01'), 'PR03'));
    fs.appendFileSync(p.intencoes, '- **INT-001** Texto antigo.\n- **INT-005** Outra.\n');
    fs.writeFileSync(p.dicionario, JSON.stringify({ version: '1.0', terms: [{ term: 'Conta', definition: 'Definição antiga da conta', kind: 'concept', aliases: [], forbidden: [] }] }));
    aplicarRodada(p, 1, '2026-10-27');
    const int = lerTexto(p.intencoes);
    expect(int).not.toContain('Texto antigo');
    expect(int.match(/^- \*\*INT-001\*\*/gm)).toHaveLength(1);
    expect(int).toContain('**INT-005** Outra.');
    const dic = lerDicionarioCaso(p.dicionario);
    expect(dic.terms).toHaveLength(1);
    expect(dic.terms[0].definition).toBe('Comanda compartilhada entre participantes');
  });

  it('termo aceito mas inválido fica como decisão bloqueante e não toca o dicionário', () => {
    const curto = normalizarSaida({ ...saida, propostas: [{ ...saida.propostas[2], termo: { definicao: 'curta', kind: 'entity', aliases: [], proibidos: [] } }] });
    const p = caminhosCaso(root, 'racha');
    fs.writeFileSync(arquivoRodada(p, 1, 'json'), JSON.stringify(curto));
    fs.writeFileSync(arquivoRodada(p, 1, 'md'), aceitar(renderRodada('racha', 1, curto), 'PR01'));
    const r = aplicarRodada(p, 1, '2026-10-27');
    expect(r.invalidas).toBe(1);
    expect(lerDicionarioCaso(p.dicionario).terms).toHaveLength(0);
    expect(lerDecisoes(lerTexto(p.decisoes)).some(d => !d.marcada && d.bloqueante)).toBe(true);
  });

  it('é idempotente: reaplicar não muda nada', () => {
    const p = prepararRodada(md => aceitar(md, 'PR01'));
    aplicarRodada(p, 1, '2026-10-27');
    const antes = ['decisoes', 'intencoes', 'invariantes', 'dicionario'].map(k => lerTexto((p as any)[k]));
    const r2 = aplicarRodada(p, 1, '2026-10-28');
    expect(r2.jaAplicada).toBe(true);
    const depois = ['decisoes', 'intencoes', 'invariantes', 'dicionario'].map(k => lerTexto((p as any)[k]));
    expect(depois).toEqual(antes);
  });
});
