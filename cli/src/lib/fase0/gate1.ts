// src/lib/fase0/gate1.ts — Gate 1 (fim do loop 1): critérios determinísticos, a IA não aprova a própria saída
import { lerDecisoes, lerDicionarioCaso, lerTexto, type CasoPaths } from './casos.ts';
import { extrairItens, lintTexto, type DiagnosticoLn } from './lintLn.ts';
import {
  calcularShalaPragmatico,
  analisarFramesSemanticos,
  analisarAmbiguidadeEstrutural,
  analisarConsistenciaGuardas,
} from './shala.ts';

export interface CriterioGate {
  id: 'a' | 'b' | 'c' | 'd' | 'e';
  descricao: string;
  ok: boolean;
  detalhe: string;
  /** critério consultivo: aparece no checklist e gera perguntas, mas não reprova o gate */
  consultivo?: boolean;
}

export interface Gate1Resultado {
  verde: boolean;
  criterios: CriterioGate[];
}

export interface DiagnosticosCaso {
  intencoes: DiagnosticoLn[];
  invariantes: DiagnosticoLn[];
}

export function lintCaso(p: CasoPaths): DiagnosticosCaso {
  const dicionario = lerDicionarioCaso(p.dicionario);
  return {
    intencoes: lintTexto(lerTexto(p.intencoes), { dicionario, arquivo: 'intencoes.md' }),
    invariantes: lintTexto(lerTexto(p.invariantes), { dicionario, arquivo: 'invariantes.md' }),
  };
}

export function avaliarGate1(p: CasoPaths, diag: DiagnosticosCaso = lintCaso(p)): Gate1Resultado {
  const txtInt = lerTexto(p.intencoes);
  const txtInv = lerTexto(p.invariantes);
  const todos = [...diag.intencoes, ...diag.invariantes];

  // (a) lint sem erros
  const erros = todos.filter(d => d.severidade === 'erro');
  const a: CriterioGate = {
    id: 'a', descricao: 'intencoes.md e invariantes.md sem erros do lint',
    ok: erros.length === 0,
    detalhe: erros.length === 0 ? 'nenhum erro' : `${erros.length} erro(s): ${[...new Set(erros.map(e => e.regra))].join(', ')}`,
  };

  // (b) toda invariante com id + tipo válido + marcador testável
  const itensInv = extrairItens(txtInv, 'INV');
  const linhasInv = listaDeItens(txtInv);
  const semId = linhasInv.filter(l => !itensInv.some(it => it.linha === l));
  const ruins = new Set<number>(semId);
  for (const d of diag.invariantes) if (d.regra === 'LN011' || d.regra === 'LN012') ruins.add(d.linha);
  const b: CriterioGate = {
    id: 'b', descricao: 'toda invariante tem id, tipo válido e enunciado testável',
    ok: ruins.size === 0,
    detalhe: ruins.size === 0 ? `${itensInv.length} invariante(s) válida(s)` : `${ruins.size} invariante(s) com problema (linhas ${[...ruins].sort((x, y) => x - y).join(', ')})`,
  };

  // (c) nenhuma decisão bloqueante em aberto
  const abertas = lerDecisoes(lerTexto(p.decisoes)).filter(d => !d.marcada && d.bloqueante);
  const c: CriterioGate = {
    id: 'c', descricao: 'nenhuma decisão bloqueante em aberto em decisoes.md',
    ok: abertas.length === 0,
    detalhe: abertas.length === 0 ? 'nenhuma' : `${abertas.length} em aberto: ${abertas.map(d => d.id).join(', ')}`,
  };

  // (d) pelo menos 1 intenção e 1 invariante
  const nInt = extrairItens(txtInt, 'INT').length;
  const nInv = itensInv.length;
  const d: CriterioGate = {
    id: 'd', descricao: 'pelo menos 1 intenção e 1 invariante',
    ok: nInt >= 1 && nInv >= 1,
    detalhe: `${nInt} intenção(ões), ${nInv} invariante(s)`,
  };

  // (e) CONSULTIVO (proposta §4, Gate 1): dispersão de interpretações vira pergunta, não reprovação.
  // A SHALA é heurística (regex + contagem de modelos por regra fixa); não prova univocidade.
  const txtConsolidado = `${txtInt}\n\n${txtInv}`;
  const frames = analisarFramesSemanticos(txtConsolidado);
  const estrutural = analisarAmbiguidadeEstrutural(txtConsolidado);
  const guardas = analisarConsistenciaGuardas(txtConsolidado);
  const shala = calcularShalaPragmatico(txtInt, txtInv, frames, estrutural, guardas);
  const e: CriterioGate = {
    id: 'e',
    descricao: '(consultivo) SHALA não detecta interpretações concorrentes',
    ok: shala.entropiaBits === 0,
    consultivo: true,
    detalhe: shala.entropiaBits === 0
      ? 'nenhuma detectada pelas heurísticas'
      : `${shala.modelosConcorrentes} interpretações estimadas (${shala.entropiaBits} bits); pergunta sugerida: ${shala.perguntaSocratica}`,
  };

  const criterios = [a, b, c, d, e];
  return { verde: criterios.every(x => x.ok || x.consultivo), criterios };
}

/** Linhas (1-based) de itens de lista fora de código e citações. */
function listaDeItens(texto: string): number[] {
  const out: number[] = [];
  let emCodigo = false;
  texto.split(/\r?\n/).forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) { emCodigo = !emCodigo; return; }
    if (emCodigo || /^\s*>/.test(raw)) return;
    if (/^\s*[-*]\s+\S/.test(raw)) out.push(i + 1);
  });
  return out;
}
