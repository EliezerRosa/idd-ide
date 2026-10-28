// src/lib/fase0/atividades.ts — Loop 2, etapa atividades: fluxos por caso de uso (raias, passos, transações, guardas).
// Formato (modelo/atividades.yaml), validação determinística e diagramas de atividades PlantUML (modelo/atividades/UC-NN.puml).
import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { CasosDeUso } from './casosDeUso.ts';

export interface PassoAtividade {
  id: string;
  /** 'Sistema' ou o nome de um ator declarado em casos-de-uso.yaml */
  raia: string;
  acao: string;
  /** TN-NN quando o passo do Sistema executa uma transação de negócio */
  transacao?: string;
  /** condição verificada antes de executar o passo/transação */
  guarda?: string;
  /** ação de recusa quando a guarda falha (encerra o fluxo sem efeito) */
  senao?: string;
}

export interface FluxoAtividade {
  uc: string;
  resumo: string;
  passos: PassoAtividade[];
}

export interface Atividades {
  atividades: FluxoAtividade[];
}

export const EXEMPLO_ATIVIDADES = `atividades:
  - uc: UC-01
    resumo: O responsável informa a chave Pix e o nome, e o sistema cria a mesa aberta.
    passos:
      - id: P-01
        raia: ResponsavelMesa
        acao: "Informa o próprio nome, a [[ChavePix]] e, opcionalmente, a [[TaxaServico]]."
      - id: P-02
        raia: Sistema
        acao: "Cria a [[Mesa]] aberta e registra o [[ResponsavelMesa]] como [[Participante]]."
        transacao: TN-01
        guarda: "O [[ResponsavelMesa]] informou a própria [[ChavePix]] e o próprio nome."
        senao: "Recusa a criação da [[Mesa]] e informa o dado obrigatório ausente."
`;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const opt = (v: unknown): string | undefined => { const s = str(v); return s || undefined; };

export type LeituraAtividades = { ok: true; atividades: Atividades } | { ok: false; erro: string };

export function lerAtividades(texto: string): LeituraAtividades {
  let raw: any;
  try { raw = yaml.load(texto); } catch (e) {
    return { ok: false, erro: `YAML inválido: ${e instanceof Error ? e.message.split('\n')[0] : e}` };
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.atividades)) {
    return { ok: false, erro: 'falta a lista atividades' };
  }
  const atividades: FluxoAtividade[] = raw.atividades.map((f: any) => ({
    uc: str(f?.uc),
    resumo: str(f?.resumo),
    passos: (Array.isArray(f?.passos) ? f.passos : []).map((p: any): PassoAtividade => ({
      id: str(p?.id),
      raia: str(p?.raia),
      acao: str(p?.acao),
      transacao: opt(p?.transacao),
      guarda: opt(p?.guarda),
      senao: opt(p?.senao),
    })),
  }));
  return { ok: true, atividades: { atividades } };
}

// ── Critérios (usados no Gate 2 e na prévia da rodada) ────────────

export interface ContextoAtividades {
  casos?: CasosDeUso;
}

export interface CriterioAtividades { id: string; descricao: string; ok: boolean; detalhe: string }

export function avaliarAtividades(
  leitura: LeituraAtividades | undefined,
  ctx: ContextoAtividades,
): { criterios: CriterioAtividades[]; avisos: string[] } {
  const avisos: string[] = [];
  const falha = (detalhe: string) => (id: string, descricao: string): CriterioAtividades => ({ id, descricao, ok: false, detalhe });
  const descricoes: Array<[string, string]> = [
    ['j', 'modelo/atividades.yaml aprovado, válido e com um fluxo por caso de uso'],
    ['k', 'toda transação de negócio é executada pelo Sistema no fluxo do seu caso de uso'],
    ['l', 'toda transação com pré-condição tem guarda e recusa (senao) no passo que a executa'],
    ['m', 'casos de uso, transações e raias citados existem em modelo/casos-de-uso.yaml'],
  ];
  if (!leitura || !leitura.ok) {
    const motivo = !leitura ? 'arquivo ausente' : leitura.erro;
    return { criterios: descricoes.map(([id, d]) => falha(motivo)(id, d)), avisos };
  }
  const { atividades: fluxos } = leitura.atividades;
  const ucs = ctx.casos?.casos_de_uso ?? [];
  const passosTotal = fluxos.reduce((s, f) => s + f.passos.length, 0);

  // (j) estrutura, ids e cobertura dos casos de uso
  const probJ: string[] = [];
  if (!fluxos.length) probJ.push('nenhum fluxo de atividade');
  const ucIds = fluxos.map(f => f.uc);
  const ucDup = [...new Set(ucIds.filter((x, i) => ucIds.indexOf(x) !== i))];
  if (ucDup.length) probJ.push(`fluxos repetidos: ${ucDup.join(', ')}`);
  const ucRuim = fluxos.filter(f => !/^UC-\d+$/.test(f.uc)).map(f => f.uc || '(sem uc)');
  if (ucRuim.length) probJ.push(`uc fora do padrão UC-NN: ${ucRuim.join(', ')}`);
  for (const f of fluxos) {
    if (!f.passos.length) { probJ.push(`${f.uc}: sem passos`); continue; }
    const pIds = f.passos.map(p => p.id);
    const pDup = [...new Set(pIds.filter((x, i) => pIds.indexOf(x) !== i))];
    if (pDup.length) probJ.push(`${f.uc}: passos repetidos ${pDup.join(', ')}`);
    const pRuim = f.passos.filter(p => !/^P-\d+$/.test(p.id)).map(p => p.id || '(sem id)');
    if (pRuim.length) probJ.push(`${f.uc}: passo fora do padrão P-NN (${pRuim.join(', ')})`);
    const semAcao = f.passos.filter(p => !p.acao).map(p => p.id || '(sem id)');
    if (semAcao.length) probJ.push(`${f.uc}: passo sem ação (${semAcao.join(', ')})`);
  }
  const cobertos = new Set(ucIds);
  const ucSemFluxo = ucs.map(u => u.id).filter(id => !cobertos.has(id));
  if (ucSemFluxo.length) probJ.push(`casos de uso sem fluxo: ${ucSemFluxo.join(', ')}`);
  const j: CriterioAtividades = {
    id: 'j', descricao: descricoes[0][1], ok: !probJ.length,
    detalhe: probJ.join('; ') || `${fluxos.length} fluxo(s), ${passosTotal} passo(s)`,
  };

  // (k) toda transação é executada pelo Sistema no fluxo do próprio caso de uso
  const probK: string[] = [];
  const porUc = new Map(fluxos.map(f => [f.uc, f]));
  let totalTns = 0;
  for (const u of ucs) {
    const fluxo = porUc.get(u.id);
    const tnsDoUc = new Set(u.transacoes.map(t => t.id));
    const executadas = new Set<string>();
    for (const p of fluxo?.passos ?? []) {
      if (!p.transacao) continue;
      executadas.add(p.transacao);
      if (p.raia !== 'Sistema') probK.push(`${u.id}/${p.id}: transação ${p.transacao} deve ter raia Sistema (atual: ${p.raia || 'vazia'})`);
      if (tnsDoUc.size && !tnsDoUc.has(p.transacao)) probK.push(`${u.id}/${p.id}: ${p.transacao} não pertence a ${u.id}`);
    }
    for (const t of u.transacoes) {
      totalTns++;
      if (!executadas.has(t.id)) probK.push(`${t.id} (${u.id}) não é executada no fluxo`);
    }
  }
  // se ainda não há casos de uso carregados, confere ao menos que passos com transação são do Sistema
  if (!ucs.length) {
    for (const f of fluxos) for (const p of f.passos) {
      if (p.transacao) {
        totalTns++;
        if (p.raia !== 'Sistema') probK.push(`${f.uc}/${p.id}: transação ${p.transacao} deve ter raia Sistema`);
      }
    }
  }
  const k: CriterioAtividades = {
    id: 'k', descricao: descricoes[1][1], ok: fluxos.length > 0 && totalTns > 0 && !probK.length,
    detalhe: probK.join('; ') || `${totalTns} transação(ões) executada(s)`,
  };

  // (l) toda transação com pré-condição tem guarda e senao no passo que a executa
  const probL: string[] = [];
  const tnMap = new Map(ucs.flatMap(u => u.transacoes.map(t => [t.id, t])));
  for (const f of fluxos) {
    for (const p of f.passos) {
      if (p.guarda && !p.senao) probL.push(`${f.uc}/${p.id}: tem guarda mas falta senao`);
      if (!p.guarda && p.senao) probL.push(`${f.uc}/${p.id}: tem senao mas falta guarda`);
      if (!p.transacao) continue;
      const tn = tnMap.get(p.transacao);
      if (tn && tn.pre.length > 0 && (!p.guarda || !p.senao)) {
        probL.push(`${f.uc}/${p.id} (${p.transacao}): transação com pré-condição exige guarda e senao`);
      }
    }
  }
  const comGuarda = fluxos.flatMap(f => f.passos).filter(p => p.guarda && p.senao).length;
  const l: CriterioAtividades = {
    id: 'l', descricao: descricoes[2][1], ok: fluxos.length > 0 && !probL.length,
    detalhe: probL.join('; ') || `${comGuarda} passo(s) com guarda/senao`,
  };

  // (m) referências a casos de uso, transações e raias existem em casos-de-uso.yaml
  const refs: string[] = [];
  const ucExistentes = new Set(ucs.map(u => u.id));
  const atores = new Set(['Sistema', ...(ctx.casos?.atores ?? []).map(a => a.nome)]);
  for (const f of fluxos) {
    if (ucs.length && !ucExistentes.has(f.uc)) refs.push(`caso de uso "${f.uc}" não existe em casos-de-uso.yaml`);
    for (const p of f.passos) {
      if (ctx.casos && !atores.has(p.raia)) refs.push(`${f.uc}/${p.id}: raia "${p.raia}" não é Sistema nem ator declarado`);
      if (p.transacao && ucs.length && !tnMap.has(p.transacao)) refs.push(`${f.uc}/${p.id}: transação "${p.transacao}" não existe`);
    }
  }
  const m: CriterioAtividades = {
    id: 'm', descricao: descricoes[3][1], ok: !refs.length,
    detalhe: refs.join('; ') || 'todas existem',
  };

  for (const u of ucs) {
    const fluxo = porUc.get(u.id);
    if (fluxo && !fluxo.passos.some(p => p.raia === u.ator)) {
      avisos.push(`${u.id}: nenhum passo na raia do ator principal (${u.ator})`);
    }
  }

  return { criterios: [j, k, l, m], avisos };
}

// ── Diagramas de atividades (PlantUML) ────────────────────────────

const limpo = (s: string): string => s.replace(/;/g, ',').replace(/\r?\n/g, ' ').trim();

/** Gera o diagrama de atividades PlantUML de um caso de uso, com raias e desvios de guarda. */
export function renderAtividadePuml(sistema: string, fluxo: FluxoAtividade, nomeUc?: string): string {
  const titulo = nomeUc ? `${fluxo.uc} ${nomeUc} — ${sistema}` : `${fluxo.uc} — ${sistema}`;
  const L: string[] = ['@startuml', `title ${titulo}`, ''];
  let raiaAtual = '';
  let iniciado = false;
  for (const p of fluxo.passos) {
    if (p.raia && p.raia !== raiaAtual) {
      L.push(`|${p.raia}|`);
      raiaAtual = p.raia;
    }
    if (!iniciado) { L.push('start'); iniciado = true; }
    const tn = p.transacao ? ` [${p.transacao}]` : '';
    if (p.guarda) {
      L.push(`if (${limpo(p.guarda)}?) then (sim)`);
      L.push(`  :${p.id}${tn} ${limpo(p.acao)};`);
      L.push('else (não)');
      L.push(`  :${limpo(p.senao ?? 'Recusa a operação.')};`);
      L.push('  stop');
      L.push('endif');
    } else {
      L.push(`:${p.id}${tn} ${limpo(p.acao)};`);
    }
  }
  if (iniciado) L.push('stop');
  L.push('@enduml', '');
  return L.join('\n');
}

/** Grava `modelo/atividades/<UC-NN>.puml` para cada fluxo aprovado. */
export function gravarAtividadesPuml(dir: string, sistema: string, a: Atividades, casos?: CasosDeUso): void {
  fs.mkdirSync(dir, { recursive: true });
  const nomes = new Map((casos?.casos_de_uso ?? []).map(u => [u.id, u.nome]));
  for (const f of a.atividades) {
    if (!/^UC-\d+$/.test(f.uc)) continue;
    fs.writeFileSync(path.join(dir, `${f.uc}.puml`), renderAtividadePuml(sistema, f, nomes.get(f.uc)), 'utf8');
  }
}

