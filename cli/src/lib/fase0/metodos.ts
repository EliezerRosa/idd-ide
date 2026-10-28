// src/lib/fase0/metodos.ts — Loop 2, etapa de métodos circunscritos, contratos v2 e matriz de rastreabilidade.
import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import {
  CLASS_PATTERN,
  METHOD_PATTERN,
  VISIBILITIES,
  parseContract,
  type Visibility,
} from '@idd/core';
import type { DomainModel } from '../domain/types.ts';
import { lerTexto, type CasoPaths } from './casos.ts';
import type { CasosDeUso, Transacao } from './casosDeUso.ts';
import { lerEstados } from './estados.ts';

export interface AceitacaoSpec {
  dado: string;
  quando: string;
  entao: string;
}

export interface MetodoSpec {
  classe: string;
  metodo: string;
  visibilidade: Visibility;
  intencao: string;
  transacoes: string[];
  invariantes: string[];
  allowed_fields: string[];
  read_only_fields: string[];
  restricoes: string[];
  aceitacao: AceitacaoSpec[];
}

export interface Metodos {
  metodos: MetodoSpec[];
}

export const EXEMPLO_METODOS = `metodos:
  - classe: Mesa
    metodo: criar
    visibilidade: public
    intencao: "Criar uma [[Mesa]] aberta com a [[ChavePix]] e a [[TaxaServico]] do [[ResponsavelMesa]], registrando-o como [[Participante]]."
    transacoes: [TN-01]
    invariantes: []
    allowed_fields: [Mesa, Participante]
    read_only_fields: []
    restricoes:
      - "O [[ResponsavelMesa]] informou a própria [[ChavePix]] e o próprio nome."
    aceitacao:
      - dado: "O [[ResponsavelMesa]] informou nome válido e [[ChavePix]]."
        quando: "Mesa.criar é executado."
        entao: "A [[Mesa]] aberta é criada com a [[TaxaServico]] (ou 10% por padrão) e o [[ResponsavelMesa]] é registrado como [[Participante]]."
`;

export type LeituraMetodos =
  | { ok: true; metodos: Metodos }
  | { ok: false; erro: string };

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const arrStr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map(x => x.trim()) : [];

export function paraKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'item';
}

export function slugModulo(caso: string): string {
  return caso.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'dominio';
}

export function idCircunscrito(m: Pick<MetodoSpec, 'classe' | 'metodo'>): string {
  return `${m.classe}.${m.metodo}`;
}

export function lerMetodos(texto: string): LeituraMetodos {
  let raw: any;
  try {
    raw = yaml.load(texto);
  } catch (e) {
    return { ok: false, erro: `YAML inválido: ${e instanceof Error ? e.message.split('\n')[0] : e}` };
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.metodos)) {
    return { ok: false, erro: 'falta a lista metodos' };
  }
  const metodos: MetodoSpec[] = raw.metodos.map((m: any): MetodoSpec => {
    const vis = str(m?.visibilidade) || 'public';
    const aceitacao: AceitacaoSpec[] = (Array.isArray(m?.aceitacao) ? m.aceitacao : []).map((a: any): AceitacaoSpec => (
      typeof a === 'string'
        ? { dado: '', quando: '', entao: a.trim() }
        : { dado: str(a?.dado), quando: str(a?.quando), entao: str(a?.entao) }
    ));
    return {
      classe: str(m?.classe),
      metodo: str(m?.metodo),
      visibilidade: (VISIBILITIES.includes(vis as Visibility) ? vis : 'public') as Visibility,
      intencao: str(m?.intencao),
      transacoes: arrStr(m?.transacoes),
      invariantes: arrStr(m?.invariantes),
      allowed_fields: arrStr(m?.allowed_fields),
      read_only_fields: arrStr(m?.read_only_fields),
      restricoes: arrStr(m?.restricoes),
      aceitacao,
    };
  });
  return { ok: true, metodos: { metodos } };
}

export function mapaInvariantes(invariantesTexto: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const l of invariantesTexto.split(/\r?\n/)) {
    const match = l.match(/^- \*\*(INV-\d{3,})\*\*\s*(.+)$/);
    if (match) m.set(match[1], match[2].trim());
  }
  return m;
}

export function mapaIntencoes(intencoesTexto: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const l of intencoesTexto.split(/\r?\n/)) {
    const match = l.match(/^- \*\*(INT-\d{3,})\*\*\s*(.+)$/);
    if (match) m.set(match[1], match[2].trim());
  }
  return m;
}

/** Constrói o objeto YAML de contrato .intent.yaml v2 para validação em @idd/core e serialização. */
export function paraContratoObjeto(
  caso: string,
  m: MetodoSpec,
  invDescMap?: Map<string, string>,
): Record<string, unknown> {
  const constraints = [
    ...m.invariantes.map(id => ({
      id,
      type: 'invariant',
      severity: 'critical',
      description: invDescMap?.get(id) ?? `Preservar invariante ${id}`,
    })),
    ...m.restricoes.map((desc, idx) => ({
      id: `C-${String(idx + 1).padStart(2, '0')}`,
      type: 'business',
      severity: 'critical',
      description: desc,
    })),
  ];
  const acceptance = m.aceitacao.map((a, idx) => ({
    id: `A-${String(idx + 1).padStart(2, '0')}`,
    given: a.dado,
    when: a.quando,
    then: a.entao,
  }));
  return {
    version: '2.0',
    module: `${slugModulo(caso)}/${paraKebab(m.classe)}-${paraKebab(m.metodo)}`,
    target_class: m.classe,
    target_method: m.metodo,
    intent: m.intencao,
    behavioral_contract: {
      visibility: m.visibilidade,
      state_mutation: {
        allowed_fields: m.allowed_fields,
        read_only_fields: m.read_only_fields,
      },
    },
    constraints,
    acceptance,
    tags: [...m.transacoes, ...m.invariantes],
  };
}

// ── Critérios (usados no Gate 2 e na prévia da rodada) ────────────

export interface ContextoMetodos {
  caso?: string;
  modelo?: DomainModel;
  casos?: CasosDeUso;
  invariantesTexto?: string;
}

export interface CriterioMetodos { id: string; descricao: string; ok: boolean; detalhe: string }

function normalizarCampoRef(classeMetodo: string, ref: string, merMap: Map<string, Set<string>>): string {
  if (ref.includes('.')) return ref;
  if (merMap.has(ref)) return ref;
  return `${classeMetodo}.${ref}`;
}

function campoCobreRef(campoNormalizado: string, refTn: string): boolean {
  if (campoNormalizado === refTn) return true;
  if (refTn.includes('.')) {
    const [cls] = refTn.split('.', 2);
    if (campoNormalizado === cls) return true;
  } else {
    if (campoNormalizado.startsWith(`${refTn}.`)) return true;
  }
  return false;
}

export function avaliarMetodos(
  leitura: LeituraMetodos | undefined,
  ctx: ContextoMetodos,
): { criterios: CriterioMetodos[]; avisos: string[] } {
  const avisos: string[] = [];
  const falha = (detalhe: string) => (id: string, descricao: string): CriterioMetodos => ({ id, descricao, ok: false, detalhe });
  const descricoes: Array<[string, string]> = [
    ['r', 'modelo/metodos.yaml aprovado, válido e com métodos circunscritos únicos (Classe.metodo)'],
    ['s', 'toda transação de negócio mapeia para ao menos 1 método e toda invariante da transação está no método'],
    ['t', 'coerência contrato × modelo: todo atributo alterado/lido pela transação está em allowed_fields/read_only_fields dos seus métodos (sem sobreposição)'],
    ['u', 'classes, atributos, transações e invariantes citados existem e todo método gera um contrato .intent.yaml v2 válido em @idd/core'],
  ];
  if (!leitura || !leitura.ok) {
    const motivo = !leitura ? 'arquivo ausente' : leitura.erro;
    return { criterios: descricoes.map(([id, d]) => falha(motivo)(id, d)), avisos };
  }

  const { metodos } = leitura.metodos;
  const caso = ctx.caso ?? 'dominio';
  const classes = (ctx.modelo?.entities ?? []).filter(e => !e.abstract);
  const merMap = new Map<string, Set<string>>(
    classes.map(c => [c.name, new Set(c.attributes.map(a => a.name))]),
  );
  const tns = (ctx.casos?.casos_de_uso ?? []).flatMap(u => u.transacoes);
  const tnMap = new Map<string, Transacao>(tns.map(t => [t.id, t]));
  const invMap = mapaInvariantes(ctx.invariantesTexto ?? '');

  // (r) estrutura e unicidade de Classe.metodo
  const probR: string[] = [];
  if (!metodos.length) probR.push('nenhum método');
  const vistos = new Set<string>();
  for (const m of metodos) {
    const id = idCircunscrito(m);
    if (!m.classe || !CLASS_PATTERN.test(m.classe)) probR.push(`classe inválida "${m.classe}"`);
    if (!m.metodo || !METHOD_PATTERN.test(m.metodo)) probR.push(`${m.classe || '?'}: método inválido "${m.metodo}"`);
    if (m.classe && m.metodo) {
      if (vistos.has(id)) probR.push(`método duplicado: ${id}`);
      vistos.add(id);
    }
    if (m.intencao.length < 10) probR.push(`${id}: intencao curta (< 10 caracteres)`);
    if (!m.transacoes.length) probR.push(`${id}: sem transações`);
    if (m.invariantes.length + m.restricoes.length === 0) probR.push(`${id}: precisa de ao menos 1 invariante ou restrição`);
    if (!m.aceitacao.length || m.aceitacao.some(a => a.entao.length < 5)) probR.push(`${id}: precisa de critério de aceitação com "entao"`);
  }
  const r: CriterioMetodos = {
    id: 'r', descricao: descricoes[0][1],
    ok: probR.length === 0,
    detalhe: probR.length ? probR.slice(0, 4).join('; ') : `${metodos.length} método(s) circunscrito(s)`,
  };

  // (s) toda transação mapeia para >= 1 método e toda invariante da transação está no(s) método(s)
  const probS: string[] = [];
  const metodosPorTn = new Map<string, MetodoSpec[]>();
  for (const m of metodos) {
    for (const t of m.transacoes) {
      const arr = metodosPorTn.get(t) ?? [];
      arr.push(m);
      metodosPorTn.set(t, arr);
    }
  }
  for (const [tnId, tn] of tnMap) {
    const ms = metodosPorTn.get(tnId) ?? [];
    if (!ms.length) {
      probS.push(`${tnId} sem método`);
      continue;
    }
    const invs = new Set(ms.flatMap(m => m.invariantes));
    for (const inv of tn.invariantes) {
      if (!invs.has(inv)) probS.push(`${tnId}: invariante ${inv} ausente do(s) método(s)`);
    }
  }
  const s: CriterioMetodos = {
    id: 's', descricao: descricoes[1][1],
    ok: tns.length > 0 && probS.length === 0,
    detalhe: !tns.length ? 'casos de uso ausentes' : probS.length ? probS.slice(0, 4).join('; ') : `${tns.length} transação(ões) coberta(s)`,
  };

  // (t) coerência contrato × modelo: allowed_fields e read_only_fields
  const probT: string[] = [];
  for (const m of metodos) {
    const overlap = m.allowed_fields.filter(f => m.read_only_fields.includes(f));
    if (overlap.length) probT.push(`${idCircunscrito(m)}: sobreposição allowed/read_only (${overlap.join(', ')})`);
  }
  for (const [tnId, tn] of tnMap) {
    const ms = metodosPorTn.get(tnId) ?? [];
    if (!ms.length) continue;
    const allowedNorm = ms.flatMap(m => m.allowed_fields.map(f => normalizarCampoRef(m.classe, f, merMap)));
    const readNorm = ms.flatMap(m => [
      ...m.read_only_fields.map(f => normalizarCampoRef(m.classe, f, merMap)),
      ...m.allowed_fields.map(f => normalizarCampoRef(m.classe, f, merMap)),
    ]);
    for (const ref of tn.altera) {
      if (!allowedNorm.some(a => campoCobreRef(a, ref))) {
        probT.push(`${tnId}: altera "${ref}" ausente de allowed_fields`);
      }
    }
    for (const ref of tn.le) {
      if (!readNorm.some(rRef => campoCobreRef(rRef, ref))) {
        probT.push(`${tnId}: lê "${ref}" ausente de read_only_fields/allowed_fields`);
      }
    }
  }
  const t: CriterioMetodos = {
    id: 't', descricao: descricoes[2][1],
    ok: metodos.length > 0 && probT.length === 0,
    detalhe: probT.length ? probT.slice(0, 4).join('; ') : 'allowed_fields e read_only_fields coerentes com as transações',
  };

  // (u) referências existentes e contrato v2 válido em @idd/core
  const probU: string[] = [];
  const checarRef = (m: MetodoSpec, ref: string): void => {
    if (!classes.length) return;
    const norm = normalizarCampoRef(m.classe, ref, merMap);
    const [cls, attr] = norm.split('.', 2);
    const attrs = merMap.get(cls);
    if (!attrs) probU.push(`${idCircunscrito(m)}: classe inexistente no MER "${cls}"`);
    else if (attr && !attrs.has(attr)) probU.push(`${idCircunscrito(m)}: atributo inexistente no MER "${cls}.${attr}"`);
  };
  for (const m of metodos) {
    if (classes.length && !merMap.has(m.classe)) probU.push(`${idCircunscrito(m)}: classe "${m.classe}" fora do MER`);
    for (const tnId of m.transacoes) {
      if (tns.length && !tnMap.has(tnId)) probU.push(`${idCircunscrito(m)}: transação "${tnId}" inexistente`);
    }
    for (const inv of m.invariantes) {
      if (invMap.size > 0 && !invMap.has(inv)) probU.push(`${idCircunscrito(m)}: invariante "${inv}" inexistente`);
    }
    for (const f of m.allowed_fields) checarRef(m, f);
    for (const f of m.read_only_fields) checarRef(m, f);

    const parsed = parseContract(paraContratoObjeto(caso, m, invMap));
    if (!parsed.ok) {
      probU.push(`${idCircunscrito(m)}: contrato v2 inválido (${parsed.issues.map(i => `${i.field}: ${i.message}`).join(', ')})`);
    }
  }
  const u: CriterioMetodos = {
    id: 'u', descricao: descricoes[3][1],
    ok: metodos.length > 0 && classes.length > 0 && tns.length > 0 && probU.length === 0,
    detalhe: !classes.length ? 'MER ausente' : !tns.length ? 'casos de uso ausentes' : probU.length ? probU.slice(0, 4).join('; ') : `${metodos.length} contrato(s) .intent.yaml v2 válido(s)`,
  };

  return { criterios: [r, s, t, u], avisos };
}

// ── Saídas: contratos .intent.yaml v2 e rastreabilidade.md ─────────

export function renderContratoYaml(caso: string, m: MetodoSpec, invDescMap?: Map<string, string>): string {
  const obj = paraContratoObjeto(caso, m, invDescMap);
  return yaml.dump(obj, { lineWidth: 120, noRefs: true });
}

export function renderRastreabilidadeMd(
  caso: string,
  doc: Metodos,
  casos?: CasosDeUso,
  intencoesTexto = '',
  invariantesTexto = '',
  estadosTexto = '',
): string {
  const intMap = mapaIntencoes(intencoesTexto);
  const invMap = mapaInvariantes(invariantesTexto);
  const estadosParsed = estadosTexto.trim() ? lerEstados(estadosTexto) : undefined;
  const transicoesPorTn = new Map<string, string[]>();
  if (estadosParsed && estadosParsed.ok) {
    for (const maq of estadosParsed.estados.maquinas) {
      for (const tr of maq.transicoes) {
        const arr = transicoesPorTn.get(tr.transacao) ?? [];
        arr.push(`${maq.classe}: ${tr.de} → ${tr.para}`);
        transicoesPorTn.set(tr.transacao, arr);
      }
    }
  }

  const metodosPorTn = new Map<string, MetodoSpec[]>();
  const metodosPorInv = new Map<string, MetodoSpec[]>();
  for (const m of doc.metodos) {
    for (const t of m.transacoes) {
      const arr = metodosPorTn.get(t) ?? [];
      arr.push(m);
      metodosPorTn.set(t, arr);
    }
    for (const inv of m.invariantes) {
      const arr = metodosPorInv.get(inv) ?? [];
      arr.push(m);
      metodosPorInv.set(inv, arr);
    }
  }

  const linhas: string[] = [
    `# Matriz de Rastreabilidade — ${caso}`,
    '',
    '> Gerada automaticamente pelo IDD a partir dos artefatos aprovados da Fase 0 (Loops 1 e 2).',
    '',
    '## 1. Intenções → Casos de Uso → Transações → Métodos → Contratos',
    '',
    '| Intenção | Caso(s) de Uso | Transação(ões) | Método(s) Circunscrito(s) | Contrato(s) v2 |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const [intId] of intMap) {
    const ucs = (casos?.casos_de_uso ?? []).filter(u => u.intencoes.includes(intId));
    const ucIds = ucs.map(u => `${u.id} (${u.nome})`).join(', ') || '—';
    const tns = ucs.flatMap(u => u.transacoes);
    const tnIds = tns.map(t => t.id).join(', ') || '—';
    const ms = [...new Map(tns.flatMap(t => metodosPorTn.get(t.id) ?? []).map(m => [idCircunscrito(m), m])).values()];
    const mIds = ms.map(m => `\`${idCircunscrito(m)}\``).join(', ') || '—';
    const contratos = ms.map(m => `\`contratos/${idCircunscrito(m)}.intent.yaml\``).join(', ') || '—';
    linhas.push(`| **${intId}** | ${ucIds} | ${tnIds} | ${mIds} | ${contratos} |`);
  }

  linhas.push(
    '',
    '## 2. Invariantes → Transações → Métodos → Contratos',
    '',
    '| Invariante | Transação(ões) | Método(s) Circunscrito(s) | Contrato(s) v2 |',
    '| --- | --- | --- | --- |',
  );

  for (const [invId] of invMap) {
    const tns = (casos?.casos_de_uso ?? []).flatMap(u => u.transacoes).filter(t => t.invariantes.includes(invId));
    const tnIds = tns.map(t => t.id).join(', ') || '—';
    const ms = metodosPorInv.get(invId) ?? [];
    const mIds = ms.map(m => `\`${idCircunscrito(m)}\``).join(', ') || '—';
    const contratos = ms.map(m => `\`contratos/${idCircunscrito(m)}.intent.yaml\``).join(', ') || '—';
    linhas.push(`| **${invId}** | ${tnIds} | ${mIds} | ${contratos} |`);
  }

  linhas.push(
    '',
    '## 3. Transações de Negócio → Estados → Métodos → Mutação de Estado',
    '',
    '| Transação | Caso de Uso | Transições de Estado | Método(s) | `allowed_fields` | `read_only_fields` |',
    '| --- | --- | --- | --- | --- | --- |',
  );

  for (const uc of casos?.casos_de_uso ?? []) {
    for (const tn of uc.transacoes) {
      const trs = (transicoesPorTn.get(tn.id) ?? []).join('; ') || '— (sem mudança de estado)';
      const ms = metodosPorTn.get(tn.id) ?? [];
      const mIds = ms.map(m => `\`${idCircunscrito(m)}\``).join(', ') || '—';
      const allowed = [...new Set(ms.flatMap(m => m.allowed_fields))].map(f => `\`${f}\``).join(', ') || '—';
      const readOnly = [...new Set(ms.flatMap(m => m.read_only_fields))].map(f => `\`${f}\``).join(', ') || '—';
      linhas.push(`| **${tn.id}** (${tn.nome}) | ${uc.id} | ${trs} | ${mIds} | ${allowed} | ${readOnly} |`);
    }
  }

  linhas.push('');
  return linhas.join('\n');
}

export function gravarContratosERastreabilidade(
  p: CasoPaths,
  caso: string,
  doc: Metodos,
  casos?: CasosDeUso,
): void {
  const intencoesTexto = lerTexto(p.intencoes);
  const invariantesTexto = lerTexto(p.invariantes);
  const estadosTexto = lerTexto(p.estados);
  const invMap = mapaInvariantes(invariantesTexto);

  fs.mkdirSync(p.contratosDir, { recursive: true });
  const esperados = new Set<string>();
  for (const m of doc.metodos) {
    const file = `${idCircunscrito(m)}.intent.yaml`;
    esperados.add(file);
    fs.writeFileSync(path.join(p.contratosDir, file), renderContratoYaml(caso, m, invMap), 'utf8');
  }
  for (const f of fs.readdirSync(p.contratosDir)) {
    if (f.endsWith('.intent.yaml') && !esperados.has(f)) {
      fs.unlinkSync(path.join(p.contratosDir, f));
    }
  }

  const rastreioMd = renderRastreabilidadeMd(caso, doc, casos, intencoesTexto, invariantesTexto, estadosTexto);
  fs.writeFileSync(p.rastreabilidade, rastreioMd, 'utf8');
}
