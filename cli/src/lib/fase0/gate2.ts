// src/lib/fase0/gate2.ts — Gate 2 (fim do loop 2): critérios determinísticos, a IA não aprova a própria saída.
// Etapas: MER → casos de uso (com contexto) → atividades → estados. A seguinte (métodos) acrescenta critérios aqui.
import * as fs from 'node:fs';
import { decomposeBCNF, lostDependencies } from '../domain/fds.ts';
import { analyzeEntity, entityRelation } from '../domain/normalizer.ts';
import { parseMermaid } from '../domain/parser.ts';
import type { DomainEntity, DomainModel } from '../domain/types.ts';
import { avaliarAtividades, lerAtividades } from './atividades.ts';
import { lerDecisoes, lerDicionarioCaso, lerTexto, type CasoPaths } from './casos.ts';
import { avaliarCasos, lerCasos } from './casosDeUso.ts';
import { avaliarEstados, lerEstados } from './estados.ts';
import { extrairItens } from './lintLn.ts';

export type EtapaLoop2 = 'mer' | 'uc' | 'atividades' | 'estados';
export const ETAPAS: EtapaLoop2[] = ['mer', 'uc', 'atividades', 'estados'];

export interface CriterioGate2 {
  id: string;
  /** etapa a que o critério pertence; 'geral' vale para todas */
  etapa: EtapaLoop2 | 'geral';
  descricao: string;
  ok: boolean;
  detalhe: string;
}

export interface Gate2Resultado {
  verde: boolean;
  criterios: CriterioGate2[];
  /** não reprovam: classes fora do dicionário etc. */
  avisos: string[];
  /** primeira etapa com critério reprovado (a geral conta na última etapa iniciada) */
  etapa: EtapaLoop2 | 'concluido';
}

/** Kinds do dicionário que precisam virar classe no MER. */
const KINDS_COM_CLASSE = new Set(['entity', 'aggregate']);

export interface DiagnosticoEntidade {
  entidade: string;
  chaves: string[][];
  forma: string;
  /** BCNF, ou 3NF aceita porque a decomposição BCNF perderia dependência */
  ok: boolean;
  motivo: string;
}

/**
 * Regra da forma normal alvo (decisão do autor, 2026-10-27): BCNF por padrão; 3NF é aceita quando
 * a decomposição BCNF calculada perderia alguma dependência funcional.
 */
export function diagnosticarEntidade(e: DomainEntity): DiagnosticoEntidade {
  const a = analyzeEntity(e);
  const base = { entidade: e.name, chaves: a.keys, forma: a.normalForm };
  if (a.normalForm === 'BCNF') return { ...base, ok: true, motivo: 'BCNF' };
  if (a.normalForm === '3NF') {
    const { attributes, fds } = entityRelation(e);
    const perdidas = lostDependencies(a.cover, decomposeBCNF(attributes, fds).map(p => p.attributes));
    if (perdidas.length) return { ...base, ok: true, motivo: '3NF aceita: a decomposição BCNF perderia dependência' };
    return { ...base, ok: false, motivo: '3NF, mas a decomposição BCNF preserva as dependências: decomponha' };
  }
  const v = a.violations[0];
  return { ...base, ok: false, motivo: `${a.normalForm}: viola ${v.form} em {${v.fd.determinant.join(', ')}} → {${v.fd.dependent.join(', ')}}` };
}

export function lerModelo(texto: string): DomainModel {
  return parseMermaid(texto);
}

export function avaliarGate2(p: CasoPaths): Gate2Resultado {
  const avisos: string[] = [];
  const texto = fs.existsSync(p.dominio) ? lerTexto(p.dominio) : '';
  const modelo = texto ? lerModelo(texto) : undefined;
  const classes = (modelo?.entities ?? []).filter(e => !e.abstract);

  const a: CriterioGate2 = {
    id: 'a', etapa: 'mer', descricao: 'modelo/dominio.mmd aprovado e com ao menos 1 classe',
    ok: classes.length > 0,
    detalhe: !texto ? 'arquivo ausente' : `${classes.length} classe(s)`,
  };

  const dic = lerDicionarioCaso(p.dicionario);
  const nomes = new Set(classes.map(e => e.name.toLowerCase()));
  const faltando = dic.terms.filter(t => KINDS_COM_CLASSE.has(t.kind) && !nomes.has(t.term.toLowerCase())).map(t => t.term);
  const b: CriterioGate2 = {
    id: 'b', etapa: 'mer', descricao: 'todo termo entity/aggregate do dicionário tem classe homônima',
    ok: classes.length > 0 && faltando.length === 0,
    detalhe: faltando.length ? `sem classe: ${faltando.join(', ')}` : 'todos presentes',
  };
  const conhecidos = new Set(dic.terms.flatMap(t => [t.term, ...t.aliases]).map(x => x.toLowerCase()));
  const fora = classes.filter(e => !conhecidos.has(e.name.toLowerCase())).map(e => e.name);
  if (fora.length) avisos.push(`classes fora do dicionário (proponha o termo ou renomeie): ${fora.join(', ')}`);

  const diags = classes.map(diagnosticarEntidade);
  const ruins = diags.filter(d => !d.ok);
  const c: CriterioGate2 = {
    id: 'c', etapa: 'mer', descricao: 'toda classe em BCNF (ou 3NF quando a BCNF perderia dependência)',
    ok: classes.length > 0 && ruins.length === 0,
    detalhe: ruins.length ? ruins.map(d => `${d.entidade}: ${d.motivo}`).join('; ') : `${diags.length} classe(s) conforme(s)`,
  };

  const abertas = lerDecisoes(lerTexto(p.decisoes)).filter(d => !d.marcada && d.bloqueante);
  const d: CriterioGate2 = {
    id: 'd', etapa: 'geral', descricao: 'nenhuma decisão bloqueante em aberto em decisoes.md',
    ok: abertas.length === 0,
    detalhe: abertas.length === 0 ? 'nenhuma' : `${abertas.length} em aberto: ${abertas.map(x => x.id).join(', ')}`,
  };

  // etapa UC (casos de uso até a transação de negócio)
  const leituraUc = fs.existsSync(p.casos) ? lerCasos(lerTexto(p.casos)) : undefined;
  const casos = avaliarCasos(leituraUc, {
    intencoes: extrairItens(lerTexto(p.intencoes), 'INT').map(x => x.id),
    invariantes: extrairItens(lerTexto(p.invariantes), 'INV').map(x => x.id),
    modelo,
    termos: dic.terms.flatMap(t => [t.term, ...t.aliases]),
  });
  avisos.push(...casos.avisos);

  // etapa atividades (fluxos por caso de uso)
  const leituraAtiv = fs.existsSync(p.atividades) ? lerAtividades(lerTexto(p.atividades)) : undefined;
  const atividades = avaliarAtividades(leituraAtiv, {
    casos: leituraUc && leituraUc.ok ? leituraUc.casos : undefined,
  });
  avisos.push(...atividades.avisos);

  // etapa estados (máquinas de estado das entidades com ciclo de vida)
  const leituraEst = fs.existsSync(p.estados) ? lerEstados(lerTexto(p.estados)) : undefined;
  const estados = avaliarEstados(leituraEst, {
    modelo,
    casos: leituraUc && leituraUc.ok ? leituraUc.casos : undefined,
  });
  avisos.push(...estados.avisos);

  const criterios: CriterioGate2[] = [
    a, b, c,
    ...casos.criterios.map(x => ({ ...x, etapa: 'uc' as const })),
    ...atividades.criterios.map(x => ({ ...x, etapa: 'atividades' as const })),
    ...estados.criterios.map(x => ({ ...x, etapa: 'estados' as const })),
    d,
  ];
  const reprovada = ETAPAS.find(e => criterios.some(x => x.etapa === e && !x.ok));
  const etapa = reprovada ?? (d.ok ? 'concluido' : ETAPAS[ETAPAS.length - 1]);
  return { verde: criterios.every(x => x.ok), criterios, avisos, etapa };
}
