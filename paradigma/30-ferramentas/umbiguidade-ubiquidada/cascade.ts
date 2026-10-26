/**
 * packages/core/src/cascade.ts
 *
 * Pipeline recursivo de três camadas para resolução de ambiguidade e
 * formalização progressiva de especificações, do texto livre até o
 * modelo de dados normalizado.
 *
 * ---------------------------------------------------------------------
 * AS TRÊS CAMADAS
 * ---------------------------------------------------------------------
 *
 *   L1 — INTENÇÃO (texto livre)
 *        Objetivo, invariantes gerais, escopo, em prosa. É aqui que
 *        ambiguity.ts faz scan()/resolve() em busca de termo vago,
 *        quantificador solto, termo fora do Dicionário Ubíquo, etc.
 *        Produto: <nome>.l1.intent.yaml
 *
 *   L2 — CONCEITUAL (UML conceitual)
 *        Casos de uso, diagrama de atividade, classes, relacionamentos
 *        E MÉTODOS de cada classe — ainda sem normalização de banco.
 *        Derivado de L1 já resolvido, usando mer-notation.ts (entidades/
 *        relacionamentos) + plantuml-mirror.ts (casos de uso/atividade)
 *        + extensão de métodos (ver ClassMethod abaixo).
 *        Produto: <nome>.l2.conceptual.yaml + <nome>.l2.puml (espelho visual)
 *
 *   L3 — ESTRUTURAL (MER normalizado)
 *        Tabelas, atributos tipados, chaves, pensado como perfil de
 *        banco de dados conceitual.
 *        Produto: <nome>.l3.structural.yaml
 *
 * Cada camada só avança para a próxima quando TODAS as ambiguidades
 * daquela camada estiverem resolvidas (mesma regra de emit() em
 * ambiguity.ts: nunca emite com pendência aberta).
 *
 * ---------------------------------------------------------------------
 * RECURSIVIDADE — o ponto central deste módulo
 * ---------------------------------------------------------------------
 *
 * O mesmo ciclo L1→L2→L3 não roda só uma vez, da especificação raiz.
 * Qualquer elemento do L2 pode, por sua vez, abrir seu PRÓPRIO ciclo
 * localizado, com seu próprio L1/L2/L3 aninhado:
 *
 *   - decompor um MÉTODO de uma classe em passos de atividade
 *     (o método "vira" um L1 novo: "o que esse método faz", e desce
 *     para um L2 local de atividade, podendo até gerar um L3 local se
 *     o método manipular uma estrutura de dados própria)
 *
 *   - definir uma TRANSAÇÃO ATÔMICA dentro de um caso de uso (o caso
 *     de uso "vira" um L1 novo: "o que essa transação deve garantir",
 *     desce para um L2 de atividade transacional)
 *
 * Isso é modelado como uma árvore de CascadeNode: cada nó tem seu
 * próprio L1/L2/L3 e uma lista de nós-filho, identificados por um
 * "anchor" (de que elemento do L2 pai ele nasceu).
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
  type MerModel,
  type ParseError,
  type StructuralIssue,
} from "./mer-notation.js";
import { buildDiagramBundle, type DiagramBundle } from "./plantuml-mirror.js";
import type { UbiquitousDictionary } from "./dictionary.js";

// ---------------------------------------------------------------------------
// Tipos — L2 estendido com métodos de classe (não existia nos módulos anteriores)
// ---------------------------------------------------------------------------

export interface ClassMethod {
  className: string;
  name: string;
  /** descrição em linguagem natural, candidata a virar um L1 filho */
  description: string;
  /** preenchido só depois que o método é decomposto recursivamente */
  decomposedInto?: string; // id do CascadeNode filho
}

/** Camada 2 completa: UML conceitual (casos de uso + atividade + classes + métodos) */
export interface ConceptualLayer {
  model: MerModel; // entidades = classes; relacionamentos já cobertos por mer-notation.ts
  methods: ClassMethod[];
  diagrams?: DiagramBundle;
}

/** Camada 3: MER normalizado — perfil conceitual de banco de dados */
export interface Table {
  name: string;
  columns: {
    name: string;
    sqlType: string;
    primaryKey: boolean;
    foreignKey?: { table: string; column: string };
    nullable: boolean;
  }[];
}

export interface StructuralLayer {
  tables: Table[];
}

// ---------------------------------------------------------------------------
// Árvore de nós — cada nó é um ciclo L1→L2→L3 completo, podendo ter filhos
// ---------------------------------------------------------------------------

export type CascadeStage = "l1-pending" | "l2-pending" | "l3-pending" | "complete";

/** De que elemento do nó PAI este nó nasceu, quando é um nó filho (recursão) */
export interface CascadeAnchor {
  kind: "method" | "use-case-transaction";
  parentNodeId: string;
  /** ex.: "Pedido.calcularTotal" para method, ou "UC-R1" para transação */
  elementRef: string;
}

export interface CascadeNode {
  id: string;
  anchor?: CascadeAnchor; // ausente só na raiz
  stage: CascadeStage;

  l1SourceText: string;
  l1PendingQuestions: ClarificationQuestion[];
  l1Resolutions: Resolution[];
  l1Compiled?: CompiledIntentDraft;

  l2?: ConceptualLayer;

  l3?: StructuralLayer;

  children: CascadeNode[];
}

let nodeCounter = 0;
function nextNodeId(): string {
  nodeCounter += 1;
  return `node-${nodeCounter}`;
}

// ---------------------------------------------------------------------------
// L1 — resolução de ambiguidade no texto livre (reaproveita ambiguity.ts)
// ---------------------------------------------------------------------------

/** Cria um nó novo a partir de texto livre (L1) e tenta resolver com os resolvers dados. */
export function createCascadeNode(
  sourceText: string,
  anchor: CascadeAnchor | undefined,
  dictionary?: UbiquitousDictionary,
  resolvers: AmbiguityResolver[] = [dictionaryResolver]
): CascadeNode {
  const scanResult = scan(sourceText, dictionary);
  const { resolutions, pendingQuestions } = resolve(scanResult, resolvers, dictionary);

  const node: CascadeNode = {
    id: nextNodeId(),
    anchor,
    stage: pendingQuestions.length > 0 ? "l1-pending" : "l2-pending",
    l1SourceText: sourceText,
    l1PendingQuestions: pendingQuestions,
    l1Resolutions: resolutions,
    children: [],
  };

  if (node.stage === "l2-pending") {
    node.l1Compiled = emit(scanResult, resolutions);
  }

  return node;
}

/** Aplica respostas humanas às perguntas pendentes do L1 de um nó. */
export function answerL1(
  node: CascadeNode,
  answers: Record<string, string>,
  dictionary?: UbiquitousDictionary
): CascadeNode {
  if (node.stage !== "l1-pending") return node;

  const { resolutions, stillPending } = applyHumanAnswers(node.l1PendingQuestions, answers);
  const allResolutions = [...node.l1Resolutions, ...resolutions];

  if (stillPending.length > 0) {
    return { ...node, l1Resolutions: allResolutions, l1PendingQuestions: stillPending };
  }

  const scanResult = scan(node.l1SourceText, dictionary);
  const compiled = emit(scanResult, allResolutions);

  return {
    ...node,
    stage: "l2-pending",
    l1Resolutions: allResolutions,
    l1PendingQuestions: [],
    l1Compiled: compiled,
  };
}

// ---------------------------------------------------------------------------
// L2 — camada conceitual (entra via notação MER + métodos declarados à parte)
// ---------------------------------------------------------------------------

/**
 * Anexa a camada conceitual (L2) a um nó cujo L1 já está resolvido.
 * `merSource` é texto na notação de mer-notation.ts (entidades/relações);
 * `methods` é a lista de métodos declarados para as classes desse nível.
 */
export function attachConceptualLayer(
  node: CascadeNode,
  merSource: string,
  methods: ClassMethod[],
  title: string
): { node: CascadeNode; parseErrors: ParseError[]; structuralIssues: StructuralIssue[] } {
  if (node.stage !== "l2-pending") {
    throw new Error(`Nó "${node.id}" não está pronto para L2 (stage atual: ${node.stage}).`);
  }

  const parseResult = parseMerNotation(merSource);
  const structuralIssues = validateStructure(parseResult.model);

  if (parseResult.errors.length > 0 || structuralIssues.length > 0) {
    return { node, parseErrors: parseResult.errors, structuralIssues };
  }

  const conceptual: ConceptualLayer = { model: parseResult.model, methods };

  const nextNode: CascadeNode = { ...node, stage: "l3-pending", l2: conceptual };

  // gera o espelho visual (PlantUML) assim que o L2 fecha, para o passo de
  // validação humana acontecer ANTES de avançar para L3
  const bundle = buildDiagramBundleForNode(nextNode, title);
  nextNode.l2 = { ...conceptual, diagrams: bundle };

  return { node: nextNode, parseErrors: [], structuralIssues: [] };
}

function buildDiagramBundleForNode(node: CascadeNode, title: string): DiagramBundle {
  // adapta o CascadeNode para o formato que buildDiagramBundle espera
  // (reaproveita plantuml-mirror.ts sem duplicar lógica de geração)
  const fakeCompilationState = {
    stage: "compiled" as const,
    sourceText: node.l1SourceText,
    model: node.l2!.model,
    parseErrors: [],
    structuralIssues: [],
    pendingByRequirement: {},
    resolutionsByRequirement: {},
  };
  return buildDiagramBundle(fakeCompilationState, title);
}

// ---------------------------------------------------------------------------
// L3 — normalização para MER estrutural (perfil de banco de dados)
// ---------------------------------------------------------------------------

const SQL_TYPE_MAP: Record<string, string> = {
  uuid: "UUID",
  texto: "VARCHAR(255)",
  numero: "NUMERIC",
  decimal: "DECIMAL(18,2)",
  inteiro: "INTEGER",
  booleano: "BOOLEAN",
  data: "DATE",
  datahora: "TIMESTAMP",
};

/**
 * Normaliza o L2 (classes/atributos conceituais) para L3 (tabelas SQL
 * conceituais), aplicando regras simples de normalização: 1 entidade =
 * 1 tabela; relacionamento N:N vira tabela associativa; relacionamento
 * 1:N vira chave estrangeira na tabela do lado "muitos".
 */
export function deriveStructuralLayer(node: CascadeNode): CascadeNode {
  if (node.stage !== "l3-pending" || !node.l2) {
    throw new Error(`Nó "${node.id}" não está pronto para L3 (stage atual: ${node.stage}).`);
  }

  const { model } = node.l2;
  const tables: Table[] = model.entities.map((entity) => ({
    name: toSnakeCase(entity.name),
    columns: entity.attributes.map((attr) => ({
      name: toSnakeCase(attr.name),
      sqlType: SQL_TYPE_MAP[attr.type.toLowerCase()] ?? attr.type.toUpperCase(),
      primaryKey: attr.name.toLowerCase() === "id",
      nullable: !attr.required,
    })),
  }));

  const tableByEntity = new Map(model.entities.map((e, i) => [e.name, tables[i]]));

  for (const rel of model.relationships) {
    const isManyToMany = rel.fromCardinality.includes("*") && rel.toCardinality.includes("*");
    if (isManyToMany) {
      tables.push({
        name: `${toSnakeCase(rel.from)}_${toSnakeCase(rel.to)}`,
        columns: [
          { name: `${toSnakeCase(rel.from)}_id`, sqlType: "UUID", primaryKey: true, nullable: false, foreignKey: { table: toSnakeCase(rel.from), column: "id" } },
          { name: `${toSnakeCase(rel.to)}_id`, sqlType: "UUID", primaryKey: true, nullable: false, foreignKey: { table: toSnakeCase(rel.to), column: "id" } },
        ],
      });
    } else if (rel.toCardinality.includes("*")) {
      // 1:N -> FK na tabela "to" (lado muitos)
      const toTable = tableByEntity.get(rel.to);
      toTable?.columns.push({
        name: `${toSnakeCase(rel.from)}_id`,
        sqlType: "UUID",
        primaryKey: false,
        nullable: rel.fromCardinality.startsWith("0"),
        foreignKey: { table: toSnakeCase(rel.from), column: "id" },
      });
    } else {
      // N:1 ou 1:1 -> FK na tabela "from"
      const fromTable = tableByEntity.get(rel.from);
      fromTable?.columns.push({
        name: `${toSnakeCase(rel.to)}_id`,
        sqlType: "UUID",
        primaryKey: false,
        nullable: rel.toCardinality.startsWith("0"),
        foreignKey: { table: toSnakeCase(rel.to), column: "id" },
      });
    }
  }

  return { ...node, stage: "complete", l3: { tables } };
}

// ---------------------------------------------------------------------------
// RECURSÃO — decompor um método ou uma transação de caso de uso em um nó filho
// ---------------------------------------------------------------------------

/**
 * Abre um ciclo L1→L2→L3 NOVO, aninhado, a partir de um método de classe
 * já declarado no L2 do nó pai. O texto livre de entrada desse ciclo
 * filho é a `description` do método — ou seja, "decompor o método" É
 * simplesmente tratar sua descrição como um novo L1.
 */
export function decomposeMethod(
  parentNode: CascadeNode,
  method: ClassMethod,
  dictionary?: UbiquitousDictionary,
  resolvers?: AmbiguityResolver[]
): { parentNode: CascadeNode; childNode: CascadeNode } {
  if (!parentNode.l2) {
    throw new Error(`Nó "${parentNode.id}" ainda não tem L2 — não há método para decompor.`);
  }

  const anchor: CascadeAnchor = {
    kind: "method",
    parentNodeId: parentNode.id,
    elementRef: `${method.className}.${method.name}`,
  };

  const childNode = createCascadeNode(method.description, anchor, dictionary, resolvers);

  const updatedMethods = parentNode.l2.methods.map((m) =>
    m.className === method.className && m.name === method.name ? { ...m, decomposedInto: childNode.id } : m
  );

  const updatedParent: CascadeNode = {
    ...parentNode,
    l2: { ...parentNode.l2, methods: updatedMethods },
    children: [...parentNode.children, childNode],
  };

  return { parentNode: updatedParent, childNode };
}

/**
 * Abre um ciclo L1→L2→L3 novo para definir os limites de uma TRANSAÇÃO
 * ATÔMICA associada a um caso de uso específico do L2 do nó pai — mesma
 * mecânica de decomposeMethod, mas ancorada num caso de uso em vez de
 * num método.
 */
export function decomposeUseCaseTransaction(
  parentNode: CascadeNode,
  useCaseId: string,
  transactionDescription: string,
  dictionary?: UbiquitousDictionary,
  resolvers?: AmbiguityResolver[]
): { parentNode: CascadeNode; childNode: CascadeNode } {
  const anchor: CascadeAnchor = {
    kind: "use-case-transaction",
    parentNodeId: parentNode.id,
    elementRef: useCaseId,
  };

  const childNode = createCascadeNode(transactionDescription, anchor, dictionary, resolvers);

  return {
    parentNode: { ...parentNode, children: [...parentNode.children, childNode] },
    childNode,
  };
}

// ---------------------------------------------------------------------------
// Serialização — 3 arquivos YAML por nó (L1/L2/L3), nomeados pelo anchor
// ---------------------------------------------------------------------------

export interface CascadeYamlFiles {
  l1: string; // <nome>.l1.intent.yaml
  l2?: string; // <nome>.l2.conceptual.yaml
  l2puml?: string; // <nome>.l2.puml
  l3?: string; // <nome>.l3.structural.yaml
}

export function serializeCascadeNode(node: CascadeNode): CascadeYamlFiles {
  const esc = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
  const files: CascadeYamlFiles = { l1: "" };

  if (node.l1Compiled) {
    files.l1 = [
      `intent: ${esc(node.l1Compiled.draft.intent)}`,
      `language: ${node.l1Compiled.draft.language}`,
      `constraints:`,
      node.l1Compiled.draft.constraints.map((c) => `  - ${esc(c)}`).join("\n") || "  []",
      `acceptance:`,
      node.l1Compiled.draft.acceptance.map((c) => `  - ${esc(c)}`).join("\n") || "  []",
    ].join("\n");
  }

  if (node.l2) {
    const methodsYaml = node.l2.methods
      .map((m) =>
        [
          `  - class: ${esc(m.className)}`,
          `    name: ${esc(m.name)}`,
          `    description: ${esc(m.description)}`,
          m.decomposedInto ? `    decomposed_into: ${esc(m.decomposedInto)}` : undefined,
        ]
          .filter(Boolean)
          .join("\n")
      )
      .join("\n");

    files.l2 = [merModelToYamlBlock(node.l2.model), `methods:`, methodsYaml || "  []"].join("\n");
    files.l2puml = node.l2.diagrams?.mergedPuml;
  }

  if (node.l3) {
    const tablesYaml = node.l3.tables
      .map((t) => {
        const cols = t.columns
          .map((c) =>
            [
              `      - name: ${esc(c.name)}`,
              `        type: ${esc(c.sqlType)}`,
              `        primary_key: ${c.primaryKey}`,
              `        nullable: ${c.nullable}`,
              c.foreignKey ? `        foreign_key: { table: ${esc(c.foreignKey.table)}, column: ${esc(c.foreignKey.column)} }` : undefined,
            ]
              .filter(Boolean)
              .join("\n")
          )
          .join("\n");
        return `  - name: ${esc(t.name)}\n    columns:\n${cols}`;
      })
      .join("\n");

    files.l3 = [`tables:`, tablesYaml || "  []"].join("\n");
  }

  return files;
}

/** Serializa recursivamente a árvore inteira, nó a nó, para um mapa id -> arquivos. */
export function serializeCascadeTree(root: CascadeNode): Record<string, CascadeYamlFiles> {
  const result: Record<string, CascadeYamlFiles> = { [root.id]: serializeCascadeNode(root) };
  for (const child of root.children) {
    Object.assign(result, serializeCascadeTree(child));
  }
  return result;
}

// ---------------------------------------------------------------------------
// utilitário
// ---------------------------------------------------------------------------

function toSnakeCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}
