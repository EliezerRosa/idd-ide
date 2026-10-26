/**
 * packages/core/src/mer-compiler.ts
 *
 * Orquestrador de ponta a ponta: pega uma especificação escrita na
 * notação MER (mer-notation.ts), resolve toda ambiguidade semântica
 * encontrada nos requisitos (ambiguity.ts) e, só então, emite o
 * .intent.yaml final com as seções "intent/constraints/acceptance"
 * (derivadas dos requisitos) + "model" (entidades/relacionamentos).
 *
 * Pensado para ser chamado por um comando novo de CLI, por exemplo:
 *
 *   idd ambiguity compile especificacao.mer --out meu-modulo.intent.yaml
 *
 * Fluxo (análogo a um compilador de 3 passes):
 *
 *   PASSE 1  parse          -> mer-notation.ts: parseMerNotation + validateStructure
 *   PASSE 2  scan + resolve -> ambiguity.ts: scan/resolve por requisito
 *   PASSE 3  emit           -> ambiguity.ts: emit (por requisito) + merModelToYamlBlock
 *
 * Se qualquer passe falhar (erro de sintaxe, referência inválida, ou
 * ambiguidade semântica sem resposta humana), a compilação é interrompida
 * e o estado é devolvido para a UI/CLI decidir o próximo passo — nunca
 * emite YAML parcial.
 */

import {
  scan,
  resolve,
  emit,
  applyHumanAnswers,
  dictionaryResolver,
  type Resolution,
  type ClarificationQuestion,
  type AmbiguityResolver,
  type CompiledIntentDraft,
} from "./ambiguity.js";
import {
  parseMerNotation,
  validateStructure,
  merModelToYamlBlock,
  type ParseError,
  type StructuralIssue,
  type MerModel,
} from "./mer-notation.js";
import type { UbiquitousDictionary } from "./dictionary.js";

// ---------------------------------------------------------------------------
// Estado da compilação — serializável, para a UI persistir entre idas e vindas
// ---------------------------------------------------------------------------

export type CompilationStage = "parse-error" | "awaiting-answers" | "compiled";

export interface CompilationState {
  stage: CompilationStage;
  sourceText: string;
  model: MerModel;
  parseErrors: ParseError[];
  structuralIssues: StructuralIssue[];
  /** perguntas ainda sem resposta, uma lista por requisito */
  pendingByRequirement: Record<string, ClarificationQuestion[]>;
  /** respostas/resoluções já aplicadas, por requisito */
  resolutionsByRequirement: Record<string, Resolution[]>;
  /** só preenchido quando stage === "compiled" */
  result?: {
    yaml: string;
  };
}

// ---------------------------------------------------------------------------
// PASSE 1 + 2 — inicia a compilação: parse, valida estrutura, faz o primeiro scan
// ---------------------------------------------------------------------------

/**
 * Começa (ou reinicia) a compilação de uma especificação MER.
 * Para no primeiro ponto que precisar de decisão humana.
 */
export function startCompilation(
  sourceText: string,
  dictionary?: UbiquitousDictionary,
  resolvers: AmbiguityResolver[] = [dictionaryResolver]
): CompilationState {
  const parseResult = parseMerNotation(sourceText);

  if (parseResult.errors.length > 0) {
    return {
      stage: "parse-error",
      sourceText,
      model: parseResult.model,
      parseErrors: parseResult.errors,
      structuralIssues: [],
      pendingByRequirement: {},
      resolutionsByRequirement: {},
    };
  }

  const structuralIssues = validateStructure(parseResult.model);
  if (structuralIssues.length > 0) {
    return {
      stage: "parse-error", // erro estrutural também bloqueia, mesmo passe de "não compila ainda"
      sourceText,
      model: parseResult.model,
      parseErrors: [],
      structuralIssues,
      pendingByRequirement: {},
      resolutionsByRequirement: {},
    };
  }

  const pendingByRequirement: Record<string, ClarificationQuestion[]> = {};
  const resolutionsByRequirement: Record<string, Resolution[]> = {};

  for (const req of parseResult.model.requirements) {
    const scanResult = scan(req.text, dictionary);
    const { resolutions, pendingQuestions } = resolve(scanResult, resolvers, dictionary);
    resolutionsByRequirement[req.id] = resolutions;
    if (pendingQuestions.length > 0) {
      pendingByRequirement[req.id] = pendingQuestions;
    }
  }

  const hasPending = Object.keys(pendingByRequirement).length > 0;

  const state: CompilationState = {
    stage: hasPending ? "awaiting-answers" : "compiled",
    sourceText,
    model: parseResult.model,
    parseErrors: [],
    structuralIssues: [],
    pendingByRequirement,
    resolutionsByRequirement,
  };

  return hasPending ? state : finalizeCompilation(state, dictionary);
}

// ---------------------------------------------------------------------------
// PASSE 2 (continuação) — aplica respostas humanas e tenta de novo
// ---------------------------------------------------------------------------

/**
 * Aplica respostas do humano às perguntas pendentes de um requisito
 * específico e tenta avançar a compilação. Pode ser chamado várias vezes,
 * uma por requisito respondido, até pendingByRequirement esvaziar.
 */
export function answerAmbiguities(
  state: CompilationState,
  requirementId: string,
  answers: Record<string, string>,
  dictionary?: UbiquitousDictionary
): CompilationState {
  if (state.stage !== "awaiting-answers") return state;

  const pending = state.pendingByRequirement[requirementId] ?? [];
  const { resolutions, stillPending } = applyHumanAnswers(pending, answers);

  const newResolutionsByRequirement = {
    ...state.resolutionsByRequirement,
    [requirementId]: [...(state.resolutionsByRequirement[requirementId] ?? []), ...resolutions],
  };

  const newPendingByRequirement = { ...state.pendingByRequirement };
  if (stillPending.length > 0) {
    newPendingByRequirement[requirementId] = stillPending;
  } else {
    delete newPendingByRequirement[requirementId];
  }

  const nextState: CompilationState = {
    ...state,
    pendingByRequirement: newPendingByRequirement,
    resolutionsByRequirement: newResolutionsByRequirement,
  };

  const stillHasPending = Object.keys(newPendingByRequirement).length > 0;
  if (stillHasPending) {
    return nextState;
  }

  return finalizeCompilation(nextState, dictionary);
}

// ---------------------------------------------------------------------------
// PASSE 3 — emissão final do .intent.yaml
// ---------------------------------------------------------------------------

function finalizeCompilation(
  state: CompilationState,
  dictionary?: UbiquitousDictionary
): CompilationState {
  const compiledRequirements: CompiledIntentDraft[] = [];

  for (const req of state.model.requirements) {
    const scanResult = scan(req.text, dictionary);
    const resolutions = state.resolutionsByRequirement[req.id] ?? [];
    const compiled = emit(scanResult, resolutions); // lança se algo ainda estiver sem resolução
    compiledRequirements.push(compiled);
  }

  const allConstraints = compiledRequirements.flatMap((c) => c.draft.constraints);
  const allAcceptance = compiledRequirements.flatMap((c) => c.draft.acceptance);
  const intentSummary =
    compiledRequirements.map((c) => c.draft.intent).join(" ") ||
    `Modelo com ${state.model.entities.length} entidade(s) e ${state.model.relationships.length} relacionamento(s).`;

  const headerYaml = [
    `intent: "${intentSummary.replace(/"/g, '\\"')}"`,
    `language: pt-BR`,
    `constraints:`,
    allConstraints.length ? allConstraints.map((c) => `  - "${c.replace(/"/g, '\\"')}"`).join("\n") : "  []",
    `acceptance:`,
    allAcceptance.length ? allAcceptance.map((c) => `  - "${c.replace(/"/g, '\\"')}"`).join("\n") : "  []",
  ].join("\n");

  const modelYaml = merModelToYamlBlock(state.model);
  const yaml = `${headerYaml}\n${modelYaml}\n`;

  return {
    ...state,
    stage: "compiled",
    result: { yaml },
  };
}

// ---------------------------------------------------------------------------
// Atalho conveniente: compilação síncrona sem interação (usa só o dicionário)
// ---------------------------------------------------------------------------

/**
 * Para pipelines automáticos (ex.: CI) onde não há humano disponível para
 * responder perguntas: compila só o que o Dicionário Ubíquo resolver
 * sozinho e devolve o estado — útil para checar "quanto ainda falta
 * resolver" sem travar o processo esperando input.
 */
export function compileAutomaticOnly(
  sourceText: string,
  dictionary?: UbiquitousDictionary
): CompilationState {
  return startCompilation(sourceText, dictionary, [dictionaryResolver]);
}
