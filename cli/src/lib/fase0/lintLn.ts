// src/lib/fase0/lintLn.ts — lint determinístico de ambiguidade em linguagem natural controlada (PT-BR)
// Sem LLM: regras fixas sobre o texto das intenções e invariantes (Fase 0, loop 1).
import { findTerm, type UbiquitousDictionary } from '@idd/core';

export type Severidade = 'erro' | 'aviso' | 'info';

export interface DiagnosticoLn {
  regra: string;
  severidade: Severidade;
  /** 1-based */
  linha: number;
  /** 1-based */
  coluna: number;
  trecho: string;
  mensagem: string;
  sugestao?: string;
  arquivo?: string;
}

export interface LintOpts {
  dicionario?: UbiquitousDictionary;
  arquivo?: string;
}

export const TIPOS_INVARIANTE = ['integridade', 'unicidade', 'temporal', 'autorização', 'cálculo', 'estado'] as const;

const B0 = '(?<![\\p{L}\\p{N}_])';
const B1 = '(?![\\p{L}\\p{N}_])';

function palavra(alternativas: string, flags = 'giu'): RegExp {
  return new RegExp(`${B0}(?:${alternativas})${B1}`, flags);
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VAGOS = palavra([
  'adequad[oa]s?', 'apropriad[oa]s?', 'rápid[oa]s?', 'eficientes?', 'fác(?:il|eis)', 'amigáve(?:l|is)',
  'flexíve(?:l|is)', 'robust[oa]s?', 'intuitiv[oa]s?', 'suficientes?', 'razoáve(?:l|is)', 'aproximadamente',
  'vári[oa]s', 'algun[s]?', 'alguma[s]?', 'muit[oa]s', 'pouc[oa]s', 'normalmente', 'geralmente',
  'às vezes', 'quando possível', 'se necessário', 'entre outros', 'etc\\.?',
].join('|'));
const TEMPO = palavra('em breve|imediatamente|logo|o mais rápido possível|periodicamente|regularmente');
const E_OU = /(?<![\p{L}\p{N}_])e\/ou(?![\p{L}\p{N}_])/giu;
const PASSIVA = /(?<![\p{L}\p{N}_])(é|são|será|serão|foi|foram|seja|sejam)\s+(\p{L}+(?:ad|id)[oa]s?)(?![\p{L}\p{N}_])/giu;
const NAO_PARTICIPIO = /^(nada|cada|rápid|válid|inválid|sólid|líquid|vazi|lúcid)/iu;
const AGENTE = /(?<![\p{L}\p{N}_])(?:por|pel[oa]s?)(?![\p{L}\p{N}_])/iu;
const ANAFORA = /(?:^\s*|[.!?]\s+)(Ele|Ela|Eles|Elas|Isso|Isto|Aquilo|O mesmo|A mesma)(?![\p{L}\p{N}_])/gu;
const MARCADOR_TESTAVEL = new RegExp(
  `${B0}(?:sempre|nunca|deve|devem|não pode|não podem|no máximo|no mínimo|exatamente|igual a)${B1}|[=≤≥<>]`, 'iu');
const DEVE = /(?<![\p{L}\p{N}_])(?:não\s+)?(?:deve|devem)(?![\p{L}\p{N}_])/iu;
const ART = '(?:o|a|os|as)';
const MOLDE_UBIQUO = new RegExp(`^${ART}\\s+[^,]+?\\s+(?:não\\s+)?(?:deve|devem)\\s+\\S`, 'iu');
const MOLDE_CLAUSULAS = new RegExp(
  `^(?:(?:enquanto|quando|onde|se)\\s+.+?,\\s*)+(?:então\\s+)?${ART}\\s+.+?\\s+(?:não\\s+)?(?:deve|devem)\\s+\\S`, 'iu');

const SUG_VAGO: Array<[RegExp, string]> = [
  [/^(etc\.?|entre outros)$/i, 'enumere todos os itens'],
  [/^(quando possível|se necessário|às vezes|normalmente|geralmente)$/i, 'defina a condição exata em que se aplica'],
  [/^(vári|algun|muit|pouc)/i, 'informe a quantidade ou o limite (ex.: no máximo 5)'],
];

type Spans = Array<[number, number]>;

export function lintTexto(texto: string, opts: LintOpts = {}): DiagnosticoLn[] {
  const out: DiagnosticoLn[] = [];
  const linhas = texto.split(/\r?\n/);
  const ids = new Map<string, number>();
  let emCodigo = false;

  linhas.forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) { emCodigo = !emCodigo; return; }
    if (emCodigo || /^\s*>/.test(raw)) return;
    analisarLinha(raw, i + 1, opts, ids, out);
  });

  out.sort((a, b) => a.linha - b.linha || a.coluna - b.coluna || a.regra.localeCompare(b.regra));
  return out;
}

function analisarLinha(raw: string, linha: number, opts: LintOpts, ids: Map<string, number>, out: DiagnosticoLn[]): void {
  const add = (regra: string, severidade: Severidade, idx: number, trecho: string, mensagem: string, sugestao?: string): void => {
    const d: DiagnosticoLn = { regra, severidade, linha, coluna: idx + 1, trecho, mensagem };
    if (sugestao) d.sugestao = sugestao;
    if (opts.arquivo) d.arquivo = opts.arquivo;
    out.push(d);
  };

  const item = raw.match(/^(\s*[-*]\s+\*\*(INT|INV)-(\d+)\*\*)(.*)$/);
  let inicioTexto = 0; // onde começa a prosa (após marcador de id e [tipo])
  if (item) {
    inicioTexto = item[1].length;
    const id = `${item[2]}-${item[3]}`;
    const anterior = ids.get(id);
    if (anterior !== undefined) add('LN013', 'erro', item[1].indexOf('**'), id, `id duplicado: ${id} já aparece na linha ${anterior}`, 'use um id novo');
    else ids.set(id, linha);

    if (item[2] === 'INT') {
      lintIntencao(raw, inicioTexto, add);
    } else {
      inicioTexto = lintInvariante(raw, inicioTexto, add);
    }
  }

  // Máscara: [[Termo]] e prefixo viram espaços (mantém colunas)
  let mascarada = raw.replace(/\[\[[^\]]*\]\]/g, m => ' '.repeat(m.length));
  mascarada = ' '.repeat(inicioTexto) + mascarada.slice(inicioTexto);

  const ocupados: Spans = [];
  for (const m of mascarada.matchAll(TEMPO)) {
    ocupados.push([m.index!, m.index! + m[0].length]);
    add('LN005', 'aviso', m.index!, m[0], `tempo não mensurável: "${m[0]}"`, 'informe um prazo ou frequência concretos (ex.: em até 5 segundos, a cada 24 horas)');
  }
  for (const m of mascarada.matchAll(VAGOS)) {
    const ini = m.index!;
    if (ocupados.some(([a, b]) => ini >= a && ini < b)) continue;
    const sug = SUG_VAGO.find(([re]) => re.test(m[0]))?.[1] ?? 'troque por um critério mensurável (valor, limite ou condição verificável)';
    add('LN001', 'aviso', ini, m[0], `termo vago: "${m[0]}"`, sug);
  }
  for (const m of mascarada.matchAll(E_OU)) {
    add('LN002', 'erro', m.index!, m[0], '"e/ou" é ambíguo: significa um, outro ou ambos?', 'escolha "e" ou "ou", ou escreva as duas hipóteses');
  }
  for (const m of mascarada.matchAll(PASSIVA)) {
    if (NAO_PARTICIPIO.test(m[2])) continue;
    const resto = mascarada.slice(m.index! + m[0].length).split(/[.!?;]/)[0];
    if (AGENTE.test(resto)) continue;
    add('LN003', 'aviso', m.index!, m[0], `voz passiva sem agente: "${m[0]}" — quem executa a ação?`, 'escreva na voz ativa, com o sujeito explícito');
  }
  for (const m of mascarada.matchAll(ANAFORA)) {
    const palavraAnafora = m[1];
    add('LN004', 'aviso', m.index! + m[0].length - palavraAnafora.length, palavraAnafora,
      `anáfora ambígua: "${palavraAnafora}" pode ter mais de um referente`, 'repita o substantivo ou use o termo do dicionário');
  }

  if (opts.dicionario) lintDicionario(raw, mascarada, opts.dicionario, add);
}

type Add = (regra: string, sev: Severidade, idx: number, trecho: string, msg: string, sug?: string) => void;

function lintDicionario(raw: string, mascarada: string, dic: UbiquitousDictionary, add: Add): void {
  // LN006: [[X]] precisa existir no dicionário
  for (const m of raw.matchAll(/\[\[([^\]]*)\]\]/g)) {
    const nome = m[1].trim();
    if (nome && findTerm(dic, nome)) continue;
    const dono = dic.terms.find(t => t.forbidden.some(f => f.toLowerCase() === nome.toLowerCase()));
    if (dono) continue; // LN007 não vê dentro de [[ ]]: reporta aqui
    add('LN006', 'erro', m.index!, m[0], `termo "${nome}" não está no dicionário`, `defina "${nome}" em dicionario.json`);
  }
  for (const m of raw.matchAll(/\[\[([^\]]*)\]\]/g)) {
    const nome = m[1].trim();
    const dono = dic.terms.find(t => t.forbidden.some(f => f.toLowerCase() === nome.toLowerCase()));
    if (dono && !findTerm(dic, nome)) add('LN007', 'erro', m.index!, m[0], `"${nome}" é sinônimo proibido`, `use [[${dono.term}]]`);
  }
  // LN007: sinônimos proibidos em qualquer lugar (mesma lógica de forbidden de @idd/core)
  for (const t of dic.terms) {
    for (const f of t.forbidden) {
      const re = new RegExp(`${B0}${esc(f)}${B1}`, 'giu');
      for (const m of mascarada.matchAll(re)) {
        add('LN007', 'erro', m.index!, m[0], `"${m[0]}" é sinônimo ambíguo proibido`, `use o termo canônico [[${t.term}]]`);
      }
    }
  }
  // LN008: termo/alias do dicionário sem marcação
  for (const t of dic.terms) {
    for (const palavraTermo of [t.term, ...t.aliases]) {
      const re = new RegExp(`${B0}${esc(palavraTermo)}${B1}`, 'giu');
      for (const m of mascarada.matchAll(re)) {
        add('LN008', 'info', m.index!, m[0], `"${m[0]}" é termo do dicionário e deveria estar marcado`, `[[${t.term}]]`);
      }
    }
  }
}

function lintIntencao(raw: string, inicio: number, add: Add): void {
  const corpo = raw.slice(inicio);
  const frase = corpo.trim();
  const idx = inicio + (corpo.length - corpo.trimStart().length);
  const problemas: string[] = [];
  if (!frase) {
    add('LN010', 'erro', inicio, '', 'intenção vazia', 'escreva a frase no molde EARS-PT');
    return;
  }
  if (!DEVE.test(frase)) {
    problemas.push('falta o verbo de aceite "deve"/"devem" (ou "não deve"/"não devem")');
  } else if (!casaMolde(frase)) {
    problemas.push('a frase não segue um molde EARS-PT: "O/A <sujeito> deve ...", "Quando <gatilho>, o/a <sujeito> deve ...", '
      + '"Enquanto <estado>, ...", "Se <condição>, então o/a <sujeito> deve ...", "Onde <característica>, ..."');
  }
  if (!frase.endsWith('.')) problemas.push('a frase deve terminar em ponto');
  if (problemas.length) add('LN010', 'erro', idx, frase.length > 60 ? frase.slice(0, 57) + '...' : frase, problemas.join('; '));
}

export function casaMolde(frase: string): boolean {
  const f = frase.trim();
  if (MOLDE_UBIQUO.test(f)) return true;
  if (!MOLDE_CLAUSULAS.test(f)) return false;
  // indesejado: "Se <condição>, então o/a ..." exige o "então"
  if (/^se\s/i.test(f) && !new RegExp(`,\\s*então\\s+${ART}\\s`, 'iu').test(f)) return false;
  return true;
}

/** Retorna o índice onde começa o enunciado (após o [tipo]). */
function lintInvariante(raw: string, inicio: number, add: Add): number {
  const resto = raw.slice(inicio);
  const m = resto.match(/^(\s*)\[([^\]]*)\]\s*(.*)$/);
  if (!m) {
    add('LN011', 'erro', inicio, '', `tipo da invariante ausente; use [${TIPOS_INVARIANTE.join('|')}]`, '- **INV-001** [integridade] ...');
    verificarEnunciado(resto.trim(), inicio + (resto.length - resto.trimStart().length), add);
    return inicio;
  }
  const tipo = m[2].trim().toLowerCase();
  const colunaTipo = inicio + m[1].length + 1;
  if (!(TIPOS_INVARIANTE as readonly string[]).includes(tipo)) {
    add('LN011', 'erro', colunaTipo, `[${m[2]}]`, `tipo de invariante inválido: "${m[2].trim()}"; use um de: ${TIPOS_INVARIANTE.join(', ')}`);
  }
  const enunciadoIdx = raw.length - m[3].length;
  verificarEnunciado(m[3], enunciadoIdx, add);
  return Math.max(enunciadoIdx, inicio);
}

function verificarEnunciado(enunciado: string, idx: number, add: Add): void {
  if (!MARCADOR_TESTAVEL.test(enunciado)) {
    add('LN012', 'erro', idx, enunciado.length > 60 ? enunciado.slice(0, 57) + '...' : enunciado,
      'enunciado sem marcador testável (sempre, nunca, deve, não pode, no máximo, no mínimo, exatamente, igual a, =, ≤, ≥, <, >)',
      'reescreva como uma condição que um teste consiga verificar');
  }
}

// ── Extração de itens (usada pelo Gate 1 e pelo SHADA) ──────────────

export interface ItemLn { id: string; linha: number; texto: string }

/** Itens `- **INT-NNN** ...` ou `- **INV-NNN** ...`, ignorando código e citações. */
export function extrairItens(texto: string, prefixo: 'INT' | 'INV'): ItemLn[] {
  const itens: ItemLn[] = [];
  let emCodigo = false;
  texto.split(/\r?\n/).forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) { emCodigo = !emCodigo; return; }
    if (emCodigo || /^\s*>/.test(raw)) return;
    const m = raw.match(new RegExp(`^\\s*[-*]\\s+\\*\\*(${prefixo}-\\d+)\\*\\*\\s*(.*)$`));
    if (m) itens.push({ id: m[1], linha: i + 1, texto: m[2].trim() });
  });
  return itens;
}
