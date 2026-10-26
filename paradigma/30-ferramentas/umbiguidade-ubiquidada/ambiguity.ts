/**
 * packages/core/src/ambiguity.ts
 *
 * Resolvedor de Ambiguidade — "compilador" de especificação em linguagem
 * natural para contrato .intent.yaml.
 *
 * Pipeline, em 3 estágios, deliberadamente análogo a um compilador clássico:
 *
 *   1. ANALISE LEXICA   (scan)     -> encontra tokens/trechos ambíguos
 *   2. RESOLUCAO        (resolve)  -> resolve automaticamente o que dá para
 *                                     resolver com o Dicionário Ubíquo;
 *                                     o que não dá, vira pergunta para o
 *                                     humano (confirm-once)
 *   3. EMISSAO          (emit)     -> só compila para .intent.yaml quando
 *                                     não sobrar nenhuma ambiguidade aberta
 *
 * Mantém o mesmo estilo dos demais módulos de packages/core/src
 * (contract.ts, dictionary.ts): funções puras, sem I/O, sem LLM aqui dentro
 * (LLM entra como um "resolver" plugável — ver AmbiguityResolver abaixo,
 * mesmo espírito do SHALA: a IA propõe, o humano decide).
 */

import type { UbiquitousDictionary } from "./dictionary.js";
import { findTerm } from "./dictionary.js";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Tipo de ambiguidade detectada na análise léxica. */
export type AmbiguityKind =
  | "vague-term"        // "rápido", "adequado", "robusto" — sem critério mensurável
  | "undefined-term"     // termo PascalCase fora do Dicionário Ubíquo
  | "dangling-pronoun"   // "ele"/"isso"/"aquilo" sem antecedente claro na frase
  | "missing-actor"      // frase no passivo sem sujeito ("deve ser validado")
  | "unbounded-quantity" // "alguns", "vários", "a maioria" sem número
  | "conflicting-term";  // termo com 2+ definições concorrentes no texto

export interface AmbiguitySpan {
  /** posição do trecho ambíguo no texto original, em caracteres */
  start: number;
  end: number;
  /** o texto literal que disparou a detecção */
  text: string;
}

export interface Ambiguity {
  id: string;
  kind: AmbiguityKind;
  span: AmbiguitySpan;
  /** explicação curta, para exibir ao humano */
  message: string;
  /** sugestões automáticas, quando existirem (ex.: termos do dicionário) */
  suggestions: string[];
  severity: "blocking" | "advisory";
}

export type ResolutionSource = "dictionary" | "human" | "llm-proposal";

export interface Resolution {
  ambiguityId: string;
  /** texto final que substitui o trecho ambíguo */
  resolvedText: string;
  source: ResolutionSource;
  /** só preenchido quando source === "human" ou "llm-proposal" aguardando confirm-once */
  confirmedByHuman: boolean;
}

/** Pergunta objetiva gerada quando a ambiguidade não pôde ser auto-resolvida. */
export interface ClarificationQuestion {
  ambiguityId: string;
  question: string;
  options: string[]; // sempre que possível, perguntas de múltipla escolha, não abertas
}

export interface ScanResult {
  sourceText: string;
  ambiguities: Ambiguity[];
}

export interface ResolveResult {
  resolutions: Resolution[];
  /** ambiguidades que ainda precisam de decisão humana */
  pendingQuestions: ClarificationQuestion[];
}

/** Resultado final: só existe quando pendingQuestions está vazio. */
export interface CompiledIntentDraft {
  /** texto já limpo, com todas as ambiguidades substituídas pelo termo resolvido */
  resolvedText: string;
  /** rascunho pronto para serializar como .intent.yaml (ainda não é YAML) */
  draft: {
    intent: string;
    language: string;
    constraints: string[];
    acceptance: string[];
  };
  /** trilha de auditoria: toda resolução aplicada, para reconstituir o "porquê" */
  resolutionTrail: Resolution[];
}

/**
 * Um resolvedor plugável. O Dicionário Ubíquo é um resolver determinístico
 * (sem LLM). Um resolver baseado em LLM (SHALA) pode ser plugado aqui
 * depois, desde que sempre devolva confirmedByHuman = false — forçando
 * o confirm-once antes de a proposta virar resolução definitiva.
 */
export type AmbiguityResolver = (
  ambiguity: Ambiguity,
  dictionary?: UbiquitousDictionary
) => Resolution | null;

// ---------------------------------------------------------------------------
// Estágio 1 — Análise léxica (scan)
// ---------------------------------------------------------------------------

const VAGUE_TERMS = [
  "rápido", "rápida", "lento", "lenta", "adequado", "adequada",
  "robusto", "robusta", "eficiente", "amigável", "intuitivo", "intuitiva",
  "escalável", "flexível", "simples", "complexo", "complexa",
];

const UNBOUNDED_QUANTIFIERS = [
  "alguns", "algumas", "vários", "várias", "a maioria", "muitos", "muitas",
  "poucos", "poucas", "diversos", "diversas",
];

const DANGLING_PRONOUNS = ["ele", "ela", "isso", "aquilo", "esse", "essa", "isto"];

const PASCAL_CASE_RE = /\b[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*\b|\b[A-Z][a-z]{2,}\b/g;

let ambiguityCounter = 0;
function nextId(prefix: string): string {
  ambiguityCounter += 1;
  return `${prefix}-${ambiguityCounter}`;
}

function findAllOccurrences(text: string, needle: string): AmbiguitySpan[] {
  const spans: AmbiguitySpan[] = [];
  const lower = text.toLowerCase();
  const needleLower = needle.toLowerCase();
  let idx = lower.indexOf(needleLower);
  while (idx !== -1) {
    // garante que é palavra inteira, não substring de outra palavra
    const before = idx === 0 ? " " : lower[idx - 1];
    const after = lower[idx + needleLower.length] ?? " ";
    const isWordBoundary = /\W/.test(before) && /\W/.test(after);
    if (isWordBoundary) {
      spans.push({ start: idx, end: idx + needle.length, text: text.slice(idx, idx + needle.length) });
    }
    idx = lower.indexOf(needleLower, idx + 1);
  }
  return spans;
}

/**
 * Estágio 1: varre o texto da especificação e devolve todas as ambiguidades
 * encontradas. Não resolve nada aqui — só diagnostica, como a fase léxica
 * de um compilador.
 */
export function scan(sourceText: string, dictionary?: UbiquitousDictionary): ScanResult {
  const ambiguities: Ambiguity[] = [];

  // 1a. termos vagos, sem critério mensurável
  for (const term of VAGUE_TERMS) {
    for (const span of findAllOccurrences(sourceText, term)) {
      ambiguities.push({
        id: nextId("amb"),
        kind: "vague-term",
        span,
        message: `"${span.text}" não é mensurável. Qual critério objetivo define isso?`,
        suggestions: [],
        severity: "blocking",
      });
    }
  }

  // 1b. quantificadores não delimitados
  for (const term of UNBOUNDED_QUANTIFIERS) {
    for (const span of findAllOccurrences(sourceText, term)) {
      ambiguities.push({
        id: nextId("amb"),
        kind: "unbounded-quantity",
        span,
        message: `"${span.text}" não define uma quantidade exata.`,
        suggestions: [],
        severity: "advisory",
      });
    }
  }

  // 1c. pronomes soltos
  for (const term of DANGLING_PRONOUNS) {
    for (const span of findAllOccurrences(sourceText, term)) {
      ambiguities.push({
        id: nextId("amb"),
        kind: "dangling-pronoun",
        span,
        message: `Referência "${span.text}" sem antecedente claro no texto.`,
        suggestions: [],
        severity: "advisory",
      });
    }
  }

  // 1d. termos PascalCase fora do Dicionário Ubíquo (mesma heurística do
  // módulo dictionary.ts já existente no repo)
  if (dictionary) {
    const seen = new Set<string>();
    const matches = sourceText.matchAll(PASCAL_CASE_RE);
    for (const m of matches) {
      const token = m[0];
      if (seen.has(token)) continue;
      seen.add(token);
      const found = findTerm(dictionary, token);
      if (!found) {
        const start = m.index ?? 0;
        ambiguities.push({
          id: nextId("amb"),
          kind: "undefined-term",
          span: { start, end: start + token.length, text: token },
          message: `"${token}" não está no Dicionário Ubíquo.`,
          suggestions: [],
          severity: "blocking",
        });
      } else if (found.forbiddenSynonyms?.includes(token)) {
        const start = m.index ?? 0;
        ambiguities.push({
          id: nextId("amb"),
          kind: "conflicting-term",
          span: { start, end: start + token.length, text: token },
          message: `"${token}" é sinônimo proibido de "${found.term}".`,
          suggestions: [found.term],
          severity: "blocking",
        });
      }
    }
  }

  ambiguities.sort((a, b) => a.span.start - b.span.start);
  return { sourceText, ambiguities };
}

// ---------------------------------------------------------------------------
// Estágio 2 — Resolução (resolve)
// ---------------------------------------------------------------------------

/** Resolver determinístico: usa só o Dicionário Ubíquo, sem LLM. */
export const dictionaryResolver: AmbiguityResolver = (ambiguity, dictionary) => {
  if (!dictionary) return null;
  if (ambiguity.kind === "conflicting-term" && ambiguity.suggestions.length === 1) {
    return {
      ambiguityId: ambiguity.id,
      resolvedText: ambiguity.suggestions[0],
      source: "dictionary",
      confirmedByHuman: true, // regra determinística, não precisa de confirm-once
    };
  }
  return null;
};

/**
 * Estágio 2: tenta resolver cada ambiguidade com os resolvers informados,
 * na ordem dada. O que nenhum resolver conseguir resolver automaticamente
 * vira uma ClarificationQuestion — pergunta objetiva para o humano decidir
 * (padrão confirm-once: a IA propõe estrutura, o humano decide o conteúdo).
 */
export function resolve(
  scanResult: ScanResult,
  resolvers: AmbiguityResolver[] = [dictionaryResolver],
  dictionary?: UbiquitousDictionary
): ResolveResult {
  const resolutions: Resolution[] = [];
  const pendingQuestions: ClarificationQuestion[] = [];

  for (const ambiguity of scanResult.ambiguities) {
    let resolution: Resolution | null = null;
    for (const resolver of resolvers) {
      resolution = resolver(ambiguity, dictionary);
      if (resolution) break;
    }

    if (resolution && resolution.confirmedByHuman) {
      resolutions.push(resolution);
      continue;
    }

    if (resolution && !resolution.confirmedByHuman) {
      // proposta não confirmada (ex.: viria de um resolver LLM/SHALA) —
      // ainda assim vira pergunta, usando a proposta como opção sugerida
      pendingQuestions.push({
        ambiguityId: ambiguity.id,
        question: ambiguity.message,
        options: [resolution.resolvedText, "(digitar outra definição)"],
      });
      continue;
    }

    // nenhum resolver deu conta -> pergunta objetiva ao humano
    pendingQuestions.push({
      ambiguityId: ambiguity.id,
      question: ambiguity.message,
      options:
        ambiguity.suggestions.length > 0
          ? [...ambiguity.suggestions, "(digitar outra definição)"]
          : ["(digitar a definição exata)"],
    });
  }

  return { resolutions, pendingQuestions };
}

/**
 * Aplica respostas humanas (vindas da UI/CLI) às perguntas pendentes,
 * produzindo as resoluções finais que faltavam. Uso típico:
 *   idd ambiguity resolve --answer amb-3="tempo de resposta < 200ms"
 */
export function applyHumanAnswers(
  pendingQuestions: ClarificationQuestion[],
  answers: Record<string, string>
): { resolutions: Resolution[]; stillPending: ClarificationQuestion[] } {
  const resolutions: Resolution[] = [];
  const stillPending: ClarificationQuestion[] = [];

  for (const q of pendingQuestions) {
    const answer = answers[q.ambiguityId];
    if (answer && answer.trim().length > 0) {
      resolutions.push({
        ambiguityId: q.ambiguityId,
        resolvedText: answer.trim(),
        source: "human",
        confirmedByHuman: true,
      });
    } else {
      stillPending.push(q);
    }
  }

  return { resolutions, stillPending };
}

// ---------------------------------------------------------------------------
// Estágio 3 — Emissão (emit) — compila para rascunho de .intent.yaml
// ---------------------------------------------------------------------------

/**
 * Estágio 3: só compila quando TODAS as ambiguidades detectadas no scan()
 * têm uma resolução correspondente. Caso contrário, falha — igual a um
 * compilador que recusa gerar binário com erro léxico pendente.
 */
export function emit(
  scanResult: ScanResult,
  allResolutions: Resolution[]
): CompiledIntentDraft {
  const byId = new Map(allResolutions.map((r) => [r.ambiguityId, r]));

  const unresolved = scanResult.ambiguities.filter((a) => !byId.has(a.id));
  if (unresolved.length > 0) {
    throw new Error(
      `Não é possível compilar: ${unresolved.length} ambiguidade(s) sem resolução ` +
        `(${unresolved.map((a) => a.id).join(", ")}). Resolva antes de emitir.`
    );
  }

  // substitui da direita para a esquerda, para não invalidar os offsets
  // dos spans ainda não processados
  const ordered = [...scanResult.ambiguities].sort((a, b) => b.span.start - a.span.start);
  let text = scanResult.sourceText;
  for (const ambiguity of ordered) {
    const resolution = byId.get(ambiguity.id)!;
    text = text.slice(0, ambiguity.span.start) + resolution.resolvedText + text.slice(ambiguity.span.end);
  }

  // extração simples de constraints/acceptance: heurística inicial —
  // frases iniciadas por "deve"/"não pode"/"precisa" viram constraints;
  // frases no formato Given/When/Then (ou equivalente) viram acceptance.
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const constraints = sentences.filter((s) => /^(deve|não pode|precisa|é obrigatório)/i.test(s));
  const acceptance = sentences.filter((s) => /^(dado|quando|então|given|when|then)/i.test(s));

  return {
    resolvedText: text,
    draft: {
      intent: sentences[0] ?? text,
      language: "pt-BR",
      constraints,
      acceptance,
    },
    resolutionTrail: scanResult.ambiguities.map((a) => byId.get(a.id)!),
  };
}

/**
 * Serializa o draft em texto YAML, no mesmo formato de contrato que o
 * restante do repo usa (intent / module / constraints / acceptance /
 * language). Não depende de js-yaml aqui para manter o módulo sem I/O e
 * sem dependências pesadas — o CLI (cli/src/commands/*) é quem grava o
 * arquivo e pode trocar por um serializer YAML de verdade se preferir.
 */
export function toYamlDraft(compiled: CompiledIntentDraft): string {
  const esc = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
  const list = (items: string[]) =>
    items.length === 0 ? "  []" : items.map((i) => `  - ${esc(i)}`).join("\n");

  return [
    `intent: ${esc(compiled.draft.intent)}`,
    `language: ${compiled.draft.language}`,
    `constraints:`,
    list(compiled.draft.constraints),
    `acceptance:`,
    list(compiled.draft.acceptance),
  ].join("\n");
}
