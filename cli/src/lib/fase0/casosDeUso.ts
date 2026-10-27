// src/lib/fase0/casosDeUso.ts — Loop 2, etapa UC: casos de uso decompostos até a transação de negócio.
// Formato (modelo/casos-de-uso.yaml), validação determinística e diagrama de contexto (PlantUML).
import yaml from 'js-yaml';
import type { DomainModel } from '../domain/types.ts';

export interface Transacao {
  id: string;
  nome: string;
  pre: string[];
  pos: string[];
  /** INV-NNN que a transação preserva ou verifica */
  invariantes: string[];
  /** "Classe" (cria/remove instâncias) ou "Classe.atributo" (altera o valor) */
  altera: string[];
  le: string[];
}

export interface CasoDeUso {
  id: string;
  nome: string;
  ator: string;
  intencoes: string[];
  transacoes: Transacao[];
}

export interface Ator { nome: string; tipo: 'humano' | 'sistema'; descricao: string }

export interface CasosDeUso { atores: Ator[]; casos_de_uso: CasoDeUso[] }

export const EXEMPLO_CASOS = `atores:
  - nome: ResponsavelMesa
    tipo: humano
    descricao: Participante que cria a mesa e recebe os pagamentos.
casos_de_uso:
  - id: UC-01
    nome: Criar mesa
    ator: ResponsavelMesa
    intencoes: [INT-005]
    transacoes:
      - id: TN-01
        nome: Criar mesa com chave Pix
        pre:
          - "O [[ResponsavelMesa]] informou a própria [[ChavePix]]."
        pos:
          - "A [[Mesa]] existe com a [[ChavePix]] do [[ResponsavelMesa]]."
        invariantes: []
        altera: [Mesa, Participante]
        le: []
`;

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : []);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

export type LeituraCasos = { ok: true; casos: CasosDeUso } | { ok: false; erro: string };

export function lerCasos(texto: string): LeituraCasos {
  let raw: any;
  try { raw = yaml.load(texto); } catch (e) {
    return { ok: false, erro: `YAML inválido: ${e instanceof Error ? e.message.split('\n')[0] : e}` };
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.casos_de_uso)) {
    return { ok: false, erro: 'falta a lista casos_de_uso' };
  }
  const atores: Ator[] = (Array.isArray(raw.atores) ? raw.atores : []).map((a: any) => ({
    nome: str(a?.nome), tipo: a?.tipo === 'sistema' ? 'sistema' : 'humano', descricao: str(a?.descricao),
  }));
  const casos_de_uso: CasoDeUso[] = raw.casos_de_uso.map((u: any) => ({
    id: str(u?.id), nome: str(u?.nome), ator: str(u?.ator), intencoes: lista(u?.intencoes),
    transacoes: (Array.isArray(u?.transacoes) ? u.transacoes : []).map((t: any) => ({
      id: str(t?.id), nome: str(t?.nome), pre: lista(t?.pre), pos: lista(t?.pos),
      invariantes: lista(t?.invariantes), altera: lista(t?.altera), le: lista(t?.le),
    })),
  }));
  return { ok: true, casos: { atores, casos_de_uso } };
}

// ── Critérios (usados no Gate 2 e na prévia da rodada) ────────────

export interface ContextoCasos {
  intencoes: string[];
  invariantes: string[];
  modelo?: DomainModel;
  termos: string[];
}

export interface CriterioCasos { id: string; descricao: string; ok: boolean; detalhe: string }

export function avaliarCasos(leitura: LeituraCasos | undefined, ctx: ContextoCasos): { criterios: CriterioCasos[]; avisos: string[] } {
  const avisos: string[] = [];
  const falha = (detalhe: string) => (id: string, descricao: string): CriterioCasos => ({ id, descricao, ok: false, detalhe });
  const descricoes: Array<[string, string]> = [
    ['e', 'modelo/casos-de-uso.yaml aprovado, válido e com ids únicos'],
    ['f', 'toda transação tem ao menos 1 pré-condição e 1 pós-condição'],
    ['g', 'toda intenção é coberta por algum caso de uso'],
    ['h', 'nenhuma invariante órfã (toda INV é tocada por alguma transação)'],
    ['i', 'atores, intenções, invariantes, classes e atributos citados existem'],
  ];
  if (!leitura || !leitura.ok) {
    const motivo = !leitura ? 'arquivo ausente' : leitura.erro;
    return { criterios: descricoes.map(([id, d]) => falha(motivo)(id, d)), avisos };
  }
  const { atores, casos_de_uso: ucs } = leitura.casos;
  const tns = ucs.flatMap(u => u.transacoes.map(t => ({ uc: u, t })));

  // (e) estrutura e ids
  const problemas: string[] = [];
  if (!ucs.length) problemas.push('nenhum caso de uso');
  const ids = [...ucs.map(u => u.id), ...tns.map(x => x.t.id)];
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) problemas.push(`ids repetidos: ${dup.join(', ')}`);
  const ucRuim = ucs.filter(u => !/^UC-\d+$/.test(u.id)).map(u => u.id || '(sem id)');
  const tnRuim = tns.filter(x => !/^TN-\d+$/.test(x.t.id)).map(x => x.t.id || '(sem id)');
  if (ucRuim.length || tnRuim.length) problemas.push(`ids fora do padrão UC-NN/TN-NN: ${[...ucRuim, ...tnRuim].join(', ')}`);
  const semTn = ucs.filter(u => !u.transacoes.length).map(u => u.id);
  if (semTn.length) problemas.push(`casos de uso sem transação: ${semTn.join(', ')}`);
  const e: CriterioCasos = { id: 'e', descricao: descricoes[0][1], ok: !problemas.length, detalhe: problemas.join('; ') || `${ucs.length} caso(s) de uso, ${tns.length} transação(ões)` };

  // (f) pré e pós
  const semPrePos = tns.filter(x => !x.t.pre.length || !x.t.pos.length).map(x => x.t.id);
  const f: CriterioCasos = { id: 'f', descricao: descricoes[1][1], ok: tns.length > 0 && !semPrePos.length, detalhe: semPrePos.length ? `sem pré ou pós: ${semPrePos.join(', ')}` : `${tns.length} transação(ões) completas` };

  // (g) cobertura das intenções
  const cobertas = new Set(ucs.flatMap(u => u.intencoes));
  const descobertas = ctx.intencoes.filter(i => !cobertas.has(i));
  const g: CriterioCasos = { id: 'g', descricao: descricoes[2][1], ok: ucs.length > 0 && !descobertas.length, detalhe: descobertas.length ? `sem caso de uso: ${descobertas.join(', ')}` : `${ctx.intencoes.length} intenção(ões) cobertas` };

  // (h) invariantes órfãs
  const tocadas = new Set(tns.flatMap(x => x.t.invariantes));
  const orfas = ctx.invariantes.filter(i => !tocadas.has(i));
  const h: CriterioCasos = { id: 'h', descricao: descricoes[3][1], ok: tns.length > 0 && !orfas.length, detalhe: orfas.length ? `órfãs: ${orfas.join(', ')}` : `${ctx.invariantes.length} invariante(s) tocadas` };

  // (i) referências
  const refs: string[] = [];
  const nomesAtores = new Set(atores.map(a => a.nome));
  for (const u of ucs) if (!nomesAtores.has(u.ator)) refs.push(`${u.id}: ator "${u.ator}" não declarado`);
  const ints = new Set(ctx.intencoes);
  const invs = new Set(ctx.invariantes);
  for (const u of ucs) for (const i of u.intencoes) if (!ints.has(i)) refs.push(`${u.id}: ${i} não existe`);
  const classes = new Map((ctx.modelo?.entities ?? []).map(c => [c.name, new Set(c.attributes.map(a => a.name))]));
  for (const { t } of tns) {
    for (const i of t.invariantes) if (!invs.has(i)) refs.push(`${t.id}: ${i} não existe`);
    for (const ref of [...t.altera, ...t.le]) {
      const [cls, attr] = ref.split('.');
      const attrs = classes.get(cls);
      if (!attrs) refs.push(`${t.id}: classe "${cls}" não está no MER`);
      else if (attr && !attrs.has(attr)) refs.push(`${t.id}: atributo "${ref}" não está no MER`);
    }
  }
  const i: CriterioCasos = { id: 'i', descricao: descricoes[4][1], ok: !refs.length, detalhe: refs.join('; ') || 'todas existem' };

  const termos = new Set(ctx.termos.map(x => x.toLowerCase()));
  const atoresFora = atores.filter(a => a.tipo === 'humano' && !termos.has(a.nome.toLowerCase())).map(a => a.nome);
  if (atoresFora.length) avisos.push(`atores humanos fora do dicionário: ${atoresFora.join(', ')}`);
  const somenteLeitura = tns.filter(x => !x.t.altera.length).map(x => x.t.id);
  if (somenteLeitura.length) avisos.push(`transações que não alteram nada (consulta?): ${somenteLeitura.join(', ')}`);

  return { criterios: [e, f, g, h, i], avisos };
}

// ── Diagrama de contexto ──────────────────────────────────────────

const alias = (s: string): string => s.replace(/[^A-Za-z0-9_]/g, '_');

/** Diagrama de casos de uso com a fronteira do sistema: atores fora, UCs dentro. */
export function renderContexto(sistema: string, c: CasosDeUso): string {
  const L = ['@startuml', 'left to right direction', `title Contexto — ${sistema}`, ''];
  for (const a of c.atores) {
    L.push(a.tipo === 'sistema'
      ? `actor "${a.nome}" as ${alias(a.nome)} <<sistema>>`
      : `actor "${a.nome}" as ${alias(a.nome)}`);
  }
  L.push('', `rectangle "${sistema}" {`);
  for (const u of c.casos_de_uso) L.push(`  usecase "${u.id} ${u.nome}" as ${alias(u.id)}`);
  L.push('}', '');
  for (const u of c.casos_de_uso) L.push(`${alias(u.ator)} --> ${alias(u.id)}`);
  L.push('@enduml', '');
  return L.join('\n');
}
