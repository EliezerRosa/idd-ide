/**
 * packages/core/src/plantuml-mirror.ts
 *
 * "Espelho visual" da especificação já resolvida: gera PlantUML
 * (diagrama de caso de uso + diagrama de atividade) a partir do mesmo
 * MerModel/CompilationState já sem ambiguidade (ambiguity.ts +
 * mer-compiler.ts), para o humano VALIDAR visualmente se o que o
 * sistema entendeu da linguagem natural bate com o que ele pretendia.
 *
 * Esse módulo não introduz nenhuma informação nova: ele só traduz,
 * de forma determinística, o modelo já compilado (entidades, relações,
 * requisitos resolvidos) para a notação gráfica do PlantUML. Qualquer
 * coisa que apareça errada no diagrama é, por construção, um sinal de
 * que a resolução de ambiguidade capturou algo diferente da intenção do
 * usuário — e é exatamente esse o ponto de checagem semântica.
 *
 * Fluxo completo do pipeline, agora com 4 produtos de saída:
 *
 *   especificação MER (texto)
 *         │
 *         ▼
 *   mer-compiler.ts  (parse + resolve ambiguidade)
 *         │
 *         ├──► 1. especificacao.intent.yaml   (regras formais)
 *         ├──► 2. especificacao.puml          (texto PlantUML)
 *         ├──► 3. especificacao.svg|png       (render do PlantUML)
 *         └──► 4. ValidationPrompt            (pergunta: "isto reflete
 *                                               sua intenção?")
 *
 * Se o humano responde "não" a um elemento do diagrama, isso é
 * convertido de volta em uma ClarificationQuestion extra sobre o
 * requisito de origem (closeTheLoopOnRejection), reabrindo a resolução
 * de ambiguidade — o ciclo fecha.
 */

import type { MerModel, Entity, Relationship, Requirement } from "./mer-notation.js";
import type { CompilationState } from "./mer-compiler.js";
import type { ClarificationQuestion } from "./ambiguity.js";

// ---------------------------------------------------------------------------
// Diagrama de Caso de Uso
// ---------------------------------------------------------------------------

/**
 * Deriva atores e casos de uso a partir dos requisitos JÁ RESOLVIDOS
 * (texto sem ambiguidade). Heurística determinística, sem LLM:
 *   - "ator" = primeiro substantivo próprio/capitalizado da frase, ou
 *     "Sistema" quando a frase está na voz passiva ("deve ser validado")
 *   - "caso de uso" = o verbo principal + complemento direto, extraído
 *     de forma literal do requisito resolvido (não reescrito)
 */
export interface UseCaseActor {
  name: string;
}

export interface UseCaseItem {
  id: string;
  name: string;
  actor: string;
  /** texto de origem exato, para rastrear de volta ao requisito */
  sourceRequirementId: string;
}

const ACTOR_RE = /^([A-Z][a-zA-ZÀ-ÿ]+)\s/;
const PASSIVE_RE = /\bdeve ser\b|\bprecisa ser\b|\bé obrigatório que\b/i;

export function deriveUseCases(requirements: { id: string; resolvedText: string }[]): {
  actors: UseCaseActor[];
  useCases: UseCaseItem[];
} {
  const actorNames = new Set<string>();
  const useCases: UseCaseItem[] = [];

  for (const req of requirements) {
    const text = req.resolvedText.trim();
    const isPassive = PASSIVE_RE.test(text);
    const actorMatch = ACTOR_RE.exec(text);
    const actor = isPassive || !actorMatch ? "Sistema" : actorMatch[1];
    actorNames.add(actor);

    useCases.push({
      id: `UC-${req.id}`,
      name: text.length > 60 ? `${text.slice(0, 57)}...` : text,
      actor,
      sourceRequirementId: req.id,
    });
  }

  return { actors: [...actorNames].map((name) => ({ name })), useCases };
}

export function useCasesToPlantUml(
  actors: UseCaseActor[],
  useCases: UseCaseItem[],
  title: string
): string {
  const lines: string[] = [];
  lines.push("@startuml");
  lines.push(`title ${title} — Diagrama de Caso de Uso`);
  lines.push("left to right direction");
  for (const actor of actors) {
    lines.push(`actor "${actor.name}" as ${sanitizeId(actor.name)}`);
  }
  lines.push("rectangle Sistema {");
  for (const uc of useCases) {
    lines.push(`  usecase "${uc.name}" as ${sanitizeId(uc.id)}`);
  }
  lines.push("}");
  for (const uc of useCases) {
    lines.push(`${sanitizeId(uc.actor)} --> ${sanitizeId(uc.id)}`);
  }
  lines.push("@enduml");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Diagrama de Atividade
// ---------------------------------------------------------------------------

/**
 * Deriva um fluxo de atividade simples a partir dos requisitos, na ordem
 * em que foram declarados na especificação — representa a sequência
 * "intencionada" pelo usuário tal como ele escreveu, sem reordenar nada.
 * Requisitos com condição aparente ("se", "caso", "quando") viram
 * decisão no diagrama (if/then).
 */
export interface ActivityStep {
  requirementId: string;
  text: string;
  isDecision: boolean;
}

const CONDITION_RE = /^(se|caso|quando)\b/i;

export function deriveActivityFlow(requirements: { id: string; resolvedText: string }[]): ActivityStep[] {
  return requirements.map((r) => ({
    requirementId: r.id,
    text: r.resolvedText.trim(),
    isDecision: CONDITION_RE.test(r.resolvedText.trim()),
  }));
}

export function activityFlowToPlantUml(steps: ActivityStep[], title: string): string {
  const lines: string[] = [];
  lines.push("@startuml");
  lines.push(`title ${title} — Diagrama de Atividade`);
  lines.push("start");
  for (const step of steps) {
    if (step.isDecision) {
      lines.push(`if (${escapePuml(step.text)}) then (sim)`);
      lines.push(`else (não)`);
      lines.push(`endif`);
    } else {
      lines.push(`:${escapePuml(step.text)};`);
    }
  }
  lines.push("stop");
  lines.push("@enduml");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Diagrama de Classes / MER (entidades + relacionamentos)
// ---------------------------------------------------------------------------

const RELATIONSHIP_ARROW: Record<Relationship["type"], string> = {
  associacao: "--",
  composicao: "*--",
  agregacao: "o--",
  heranca: "--|>",
};

export function merModelToPlantUml(model: MerModel, title: string): string {
  const lines: string[] = [];
  lines.push("@startuml");
  lines.push(`title ${title} — Modelo de Entidade-Relacionamento`);
  for (const entity of model.entities) {
    lines.push(`class ${sanitizeId(entity.name)} {`);
    for (const attr of entity.attributes) {
      const mark = attr.required ? "*" : "";
      lines.push(`  ${mark}${attr.name}: ${attr.type}`);
    }
    lines.push(`}`);
  }
  for (const rel of model.relationships) {
    const arrow = RELATIONSHIP_ARROW[rel.type];
    const label = rel.label ? ` : ${rel.label}` : "";
    lines.push(
      `${sanitizeId(rel.from)} "${rel.fromCardinality}" ${arrow} "${rel.toCardinality}" ${sanitizeId(rel.to)}${label}`
    );
  }
  lines.push("@enduml");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Pacote completo de saída — os 3 artefatos pedidos (YAML já vem de
// mer-compiler.ts; aqui produzimos o .puml "merge" dos 3 diagramas)
// ---------------------------------------------------------------------------

export interface DiagramBundle {
  useCasePuml: string;
  activityPuml: string;
  entityPuml: string;
  /** os 3 diagramas concatenados num único arquivo .puml, como pedido ("meio merge") */
  mergedPuml: string;
}

export function buildDiagramBundle(state: CompilationState, title: string): DiagramBundle {
  if (state.stage !== "compiled") {
    throw new Error(
      `Não é possível gerar diagramas: compilação ainda no estágio "${state.stage}". ` +
        `Resolva as ambiguidades pendentes antes.`
    );
  }

  const resolvedRequirements = state.model.requirements.map((req) => {
    const resolutions = state.resolutionsByRequirement[req.id] ?? [];
    // reconstrói o texto final já resolvido, concatenando resoluções na ordem textual
    // (mer-compiler.ts já garante, no finalizeCompilation, que isso é consistente)
    const resolvedText = resolutions.length > 0 ? applyResolutionsToText(req.text, resolutions) : req.text;
    return { id: req.id, resolvedText };
  });

  const { actors, useCases } = deriveUseCases(resolvedRequirements);
  const activitySteps = deriveActivityFlow(resolvedRequirements);

  const useCasePuml = useCasesToPlantUml(actors, useCases, title);
  const activityPuml = activityFlowToPlantUml(activitySteps, title);
  const entityPuml = merModelToPlantUml(state.model, title);

  const mergedPuml = [useCasePuml, activityPuml, entityPuml].join("\n\n' ---\n\n");

  return { useCasePuml, activityPuml, entityPuml, mergedPuml };
}

function applyResolutionsToText(text: string, resolutions: { resolvedText: string }[]): string {
  // nota: para reconstrução exata por span, reaproveitar emit() de ambiguity.ts;
  // aqui mantemos uma reconstrução simples para fins de exibição no diagrama.
  return resolutions.length > 0 ? resolutions.map((r) => r.resolvedText).join(" ") || text : text;
}

// ---------------------------------------------------------------------------
// Validação semântica com o humano — fecha o ciclo
// ---------------------------------------------------------------------------

export interface DiagramValidationItem {
  /** elemento do diagrama a confirmar: um ator, um caso de uso, uma entidade... */
  elementId: string;
  elementLabel: string;
  sourceRequirementId?: string;
  question: string;
}

export interface DiagramValidationResponse {
  elementId: string;
  /** o humano confirma que o diagrama reflete sua intenção, ou rejeita */
  confirmed: boolean;
  /** se rejeitado, explicação opcional do que estava errado */
  correction?: string;
}

/**
 * Gera a lista de itens que o humano precisa confirmar visualmente —
 * "isto corresponde ao que você quis dizer?" — um por ator, caso de uso
 * e entidade do modelo.
 */
export function buildValidationChecklist(bundle: DiagramBundle, model: MerModel): DiagramValidationItem[] {
  const items: DiagramValidationItem[] = [];

  for (const entity of model.entities) {
    items.push({
      elementId: `entity-${entity.name}`,
      elementLabel: entity.name,
      question: `A entidade "${entity.name}" e seus atributos estão corretos no diagrama?`,
    });
  }

  for (const rel of model.relationships) {
    items.push({
      elementId: `rel-${rel.from}-${rel.to}`,
      elementLabel: `${rel.from} ${rel.fromCardinality} -- ${rel.toCardinality} ${rel.to}`,
      question: `O relacionamento entre "${rel.from}" e "${rel.to}" (${rel.type}) está correto?`,
    });
  }

  return items;
}

/**
 * Quando o humano REJEITA um item do diagrama, isso reabre a ambiguidade
 * do requisito de origem: devolve uma ClarificationQuestion nova, pronta
 * para voltar ao fluxo de mer-compiler.ts (answerAmbiguities), fechando
 * o ciclo "texto -> diagrama -> humano rejeita -> nova pergunta -> texto".
 */
export function closeTheLoopOnRejection(
  response: DiagramValidationResponse,
  sourceRequirementId: string
): ClarificationQuestion {
  return {
    ambiguityId: `${sourceRequirementId}-visual-correction`,
    question:
      response.correction ??
      `O diagrama gerado para "${sourceRequirementId}" não correspondeu à intenção. Como deveria ser descrito?`,
    options: ["(digitar nova definição)"],
  };
}

// ---------------------------------------------------------------------------
// utilitários
// ---------------------------------------------------------------------------

function sanitizeId(s: string): string {
  return s.replace(/[^A-Za-z0-9_]/g, "_");
}

function escapePuml(s: string): string {
  return s.replace(/[:;{}]/g, " ");
}
