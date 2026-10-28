// src/lib/fase0/estados.ts — Loop 2, etapa estados: máquinas de estado das entidades com ciclo de vida.
// Formato (modelo/estados.yaml), validação determinística (alcance a partir de [*], coerência com transações)
// e diagramas de estados PlantUML (modelo/estados/<Classe>.puml).
import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { DomainModel } from '../domain/types.ts';
import type { CasosDeUso } from './casosDeUso.ts';

export interface Estado {
  nome: string;
  descricao: string;
}

export interface TransicaoEstado {
  /** nome de um estado declarado ou '[*]' (criação da instância) */
  de: string;
  /** nome de um estado declarado ou '[*]' (encerramento/remoção) */
  para: string;
  /** TN-NN de modelo/casos-de-uso.yaml que dispara a transição */
  transacao: string;
  guarda?: string;
  efeito?: string;
}

export interface MaquinaEstado {
  classe: string;
  estados: Estado[];
  transicoes: TransicaoEstado[];
}

export interface Estados {
  maquinas: MaquinaEstado[];
}

export const EXEMPLO_ESTADOS = `maquinas:
  - classe: Mesa
    estados:
      - nome: Aberta
        descricao: "[[Mesa]] criada (fechada_em vazio); aceita novos [[Participante]]s e [[ItemConsumido]]s."
      - nome: Fechada
        descricao: "[[Mesa]] encerrada para consumo (fechada_em preenchido); habilita pagamentos."
    transicoes:
      - de: "[*]"
        para: Aberta
        transacao: TN-01
        efeito: "Cria a [[Mesa]] aberta com o [[ResponsavelMesa]]."
      - de: Aberta
        para: Fechada
        transacao: TN-05
        guarda: "A [[Mesa]] não está fechada."
        efeito: "Preenche Mesa.fechada_em."
`;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const opt = (v: unknown): string | undefined => { const s = str(v); return s || undefined; };

export type LeituraEstados = { ok: true; estados: Estados } | { ok: false; erro: string };

export function lerEstados(texto: string): LeituraEstados {
  let raw: any;
  try { raw = yaml.load(texto); } catch (e) {
    return { ok: false, erro: `YAML inválido: ${e instanceof Error ? e.message.split('\n')[0] : e}` };
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.maquinas)) {
    return { ok: false, erro: 'falta a lista maquinas' };
  }
  const maquinas: MaquinaEstado[] = raw.maquinas.map((m: any): MaquinaEstado => ({
    classe: str(m?.classe),
    estados: (Array.isArray(m?.estados) ? m.estados : []).map((e: any): Estado => (
      typeof e === 'string'
        ? { nome: e.trim(), descricao: '' }
        : { nome: str(e?.nome), descricao: str(e?.descricao) }
    )),
    transicoes: (Array.isArray(m?.transicoes) ? m.transicoes : []).map((t: any): TransicaoEstado => ({
      de: str(t?.de),
      para: str(t?.para),
      transacao: str(t?.transacao),
      guarda: opt(t?.guarda),
      efeito: opt(t?.efeito),
    })),
  }));
  return { ok: true, estados: { maquinas } };
}

// ── Critérios (usados no Gate 2 e na prévia da rodada) ────────────

export interface ContextoEstados {
  modelo?: DomainModel;
  casos?: CasosDeUso;
}

export interface CriterioEstados { id: string; descricao: string; ok: boolean; detalhe: string }

/** Classes cujo estado muda após a criação (alguma transação altera `Classe.atributo`). */
export function classesComCicloDeVida(casos?: CasosDeUso): string[] {
  const out = new Set<string>();
  for (const u of casos?.casos_de_uso ?? []) {
    for (const t of u.transacoes) {
      for (const ref of t.altera) {
        const [cls, attr] = ref.split('.');
        if (cls && attr) out.add(cls);
      }
    }
  }
  return [...out];
}

export function avaliarEstados(
  leitura: LeituraEstados | undefined,
  ctx: ContextoEstados,
): { criterios: CriterioEstados[]; avisos: string[] } {
  const avisos: string[] = [];
  const falha = (detalhe: string) => (id: string, descricao: string): CriterioEstados => ({ id, descricao, ok: false, detalhe });
  const descricoes: Array<[string, string]> = [
    ['n', 'modelo/estados.yaml aprovado, válido e cobrindo toda classe com atributo alterado'],
    ['o', 'toda transição é disparada por transação que altera a classe, sem mutação sem transição'],
    ['p', 'toda máquina parte de [*] e todos os seus estados são alcançáveis'],
    ['q', 'classes e transações citadas existem no MER e em modelo/casos-de-uso.yaml'],
  ];
  if (!leitura || !leitura.ok) {
    const motivo = !leitura ? 'arquivo ausente' : leitura.erro;
    return { criterios: descricoes.map(([id, d]) => falha(motivo)(id, d)), avisos };
  }
  const { maquinas } = leitura.estados;
  const tns = (ctx.casos?.casos_de_uso ?? []).flatMap(u => u.transacoes);
  const tnMap = new Map(tns.map(t => [t.id, t]));
  const classesCiclo = classesComCicloDeVida(ctx.casos);

  // (n) estrutura e cobertura das classes com atributo alterado
  const probN: string[] = [];
  if (!maquinas.length) probN.push('nenhuma máquina de estado');
  const clsIds = maquinas.map(m => m.classe);
  const clsDup = [...new Set(clsIds.filter((x, i) => clsIds.indexOf(x) !== i))];
  if (clsDup.length) probN.push(`classes repetidas: ${clsDup.join(', ')}`);
  for (const m of maquinas) {
    if (!m.classe) { probN.push('máquina sem classe'); continue; }
    if (!m.estados.length) probN.push(`${m.classe}: sem estados`);
    if (!m.transicoes.length) probN.push(`${m.classe}: sem transições`);
    const nomes = m.estados.map(e => e.nome);
    if (nomes.some(n => !n || n === '[*]')) probN.push(`${m.classe}: estado com nome inválido`);
    const dup = [...new Set(nomes.filter((x, i) => nomes.indexOf(x) !== i))];
    if (dup.length) probN.push(`${m.classe}: estados repetidos ${dup.join(', ')}`);
    if (classesCiclo.includes(m.classe) && m.estados.length < 2) {
      probN.push(`${m.classe}: tem atributo alterado em transação e precisa de ao menos 2 estados`);
    }
  }
  const cobertas = new Set(clsIds);
  const faltando = classesCiclo.filter(c => !cobertas.has(c));
  if (faltando.length) probN.push(`classes com atributo alterado sem máquina de estado: ${faltando.join(', ')}`);
  const totalEstados = maquinas.reduce((s, m) => s + m.estados.length, 0);
  const n: CriterioEstados = {
    id: 'n', descricao: descricoes[0][1], ok: !probN.length,
    detalhe: probN.join('; ') || `${maquinas.length} máquina(s), ${totalEstados} estado(s)`,
  };

  // (o) coerência transições × transações (toda transição tem TN que altera a classe; toda TN que altera a classe dispara transição)
  const probO: string[] = [];
  const totalTransicoes = maquinas.reduce((s, m) => s + m.transicoes.length, 0);
  const tocaClasse = (altera: string[], cls: string): boolean => altera.some(r => r === cls || r.startsWith(`${cls}.`));
  for (const m of maquinas) {
    const disparadas = new Set<string>();
    for (const tr of m.transicoes) {
      if (!/^TN-\d+$/.test(tr.transacao)) {
        probO.push(`${m.classe} (${tr.de} → ${tr.para}): transação "${tr.transacao || '(vazia)'}" fora do padrão TN-NN`);
        continue;
      }
      disparadas.add(tr.transacao);
      const tn = tnMap.get(tr.transacao);
      if (tn && !tocaClasse(tn.altera, m.classe)) {
        probO.push(`${m.classe}: ${tr.transacao} não altera ${m.classe} em casos-de-uso.yaml`);
      }
    }
    for (const tn of tns) {
      if (tocaClasse(tn.altera, m.classe) && !disparadas.has(tn.id)) {
        probO.push(`${m.classe}: ${tn.id} altera ${m.classe} mas não dispara transição`);
      }
    }
  }
  const o: CriterioEstados = {
    id: 'o', descricao: descricoes[1][1], ok: maquinas.length > 0 && totalTransicoes > 0 && !probO.length,
    detalhe: probO.join('; ') || `${totalTransicoes} transição(ões) coerente(s)`,
  };

  // (p) estado inicial [*] e alcançabilidade de todos os estados
  const probP: string[] = [];
  for (const m of maquinas) {
    const validos = new Set(m.estados.map(e => e.nome));
    const iniciais = m.transicoes.filter(t => t.de === '[*]');
    if (!iniciais.length) probP.push(`${m.classe}: sem transição inicial a partir de [*]`);
    for (const t of m.transicoes) {
      if (t.de !== '[*]' && !validos.has(t.de)) probP.push(`${m.classe}: estado de origem "${t.de}" não declarado`);
      if (t.para !== '[*]' && !validos.has(t.para)) probP.push(`${m.classe}: estado de destino "${t.para}" não declarado`);
      if (t.de === '[*]' && t.para === '[*]') probP.push(`${m.classe}: transição [*] → [*] inválida`);
    }
    const visitados = new Set<string>(['[*]']);
    const fila: string[] = ['[*]'];
    while (fila.length) {
      const atual = fila.shift()!;
      for (const t of m.transicoes) {
        if (t.de === atual && !visitados.has(t.para)) {
          visitados.add(t.para);
          fila.push(t.para);
        }
      }
    }
    const inalcancaveis = m.estados.map(e => e.nome).filter(nome => !visitados.has(nome));
    if (inalcancaveis.length) probP.push(`${m.classe}: estados inalcançáveis a partir de [*]: ${inalcancaveis.join(', ')}`);
  }
  const p: CriterioEstados = {
    id: 'p', descricao: descricoes[2][1], ok: maquinas.length > 0 && !probP.length,
    detalhe: probP.join('; ') || 'todos os estados alcançáveis a partir de [*]',
  };

  // (q) classes existem no MER e transações existem em casos-de-uso.yaml
  const refs: string[] = [];
  const classesMer = new Set((ctx.modelo?.entities ?? []).map(e => e.name));
  for (const m of maquinas) {
    if (classesMer.size && !classesMer.has(m.classe)) refs.push(`classe "${m.classe}" não está no MER`);
    for (const t of m.transicoes) {
      if (tns.length && t.transacao && !tnMap.has(t.transacao)) refs.push(`${m.classe}: transação "${t.transacao}" não existe em casos-de-uso.yaml`);
    }
  }
  const q: CriterioEstados = {
    id: 'q', descricao: descricoes[3][1], ok: !refs.length,
    detalhe: refs.join('; ') || 'todas existem',
  };

  for (const m of maquinas) {
    const semDesc = m.estados.filter(e => !e.descricao).map(e => e.nome);
    if (semDesc.length) avisos.push(`${m.classe}: estados sem descrição: ${semDesc.join(', ')}`);
  }

  return { criterios: [n, o, p, q], avisos };
}

// ── Diagramas de estados (PlantUML) ───────────────────────────────

const alias = (s: string): string => s.replace(/[^A-Za-z0-9_]/g, '_');
const limpo = (s: string): string => s.replace(/\r?\n/g, ' ').trim();

/** Gera o diagrama de estados PlantUML de uma classe. */
export function renderEstadoPuml(sistema: string, m: MaquinaEstado, casos?: CasosDeUso): string {
  const nomesTn = new Map((casos?.casos_de_uso ?? []).flatMap(u => u.transacoes.map(t => [t.id, t.nome])));
  const L: string[] = ['@startuml', `title Estados de ${m.classe} — ${sistema}`, ''];
  for (const e of m.estados) {
    const id = alias(e.nome);
    L.push(`state "${limpo(e.nome)}" as ${id}`);
    if (e.descricao) L.push(`${id} : ${limpo(e.descricao)}`);
  }
  if (m.estados.length) L.push('');
  for (const t of m.transicoes) {
    const de = t.de === '[*]' ? '[*]' : alias(t.de);
    const para = t.para === '[*]' ? '[*]' : alias(t.para);
    const nome = nomesTn.get(t.transacao);
    const guarda = t.guarda ? ` [${limpo(t.guarda)}]` : '';
    const efeito = t.efeito ? ` / ${limpo(t.efeito)}` : '';
    L.push(`${de} --> ${para} : ${t.transacao}${nome ? ` ${nome}` : ''}${guarda}${efeito}`);
  }
  L.push('@enduml', '');
  return L.join('\n');
}

/** Grava `modelo/estados/<Classe>.puml` para cada máquina aprovada. */
export function gravarEstadosPuml(dir: string, sistema: string, e: Estados, casos?: CasosDeUso): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const m of e.maquinas) {
    if (!m.classe) continue;
    fs.writeFileSync(path.join(dir, `${m.classe}.puml`), renderEstadoPuml(sistema, m, casos), 'utf8');
  }
}

