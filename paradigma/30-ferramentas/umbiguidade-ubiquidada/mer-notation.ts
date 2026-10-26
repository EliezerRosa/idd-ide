/**
 * packages/core/src/mer-notation.ts
 *
 * Notação textual própria para Modelo de Entidade-Relacionamento (MER) +
 * requisitos, usada como ENTRADA do resolvedor de ambiguidade
 * (ambiguity.ts) antes da compilação final para .intent.yaml.
 *
 * Objetivo: dar ao usuário uma interface de especificação estruturada
 * (não só texto livre), parecida em espírito com a metodologia gráfica
 * UML-like / MER que o autor já desenvolvia antes da UML existir — mas
 * aqui reimplementada como uma notação textual nova, pensada para ser
 * digitada (CLI/editor), não copiada de nenhuma notação gráfica externa.
 *
 * ---------------------------------------------------------------------
 * SINTAXE (EBNF simplificado)
 * ---------------------------------------------------------------------
 *
 *   especificacao   := { bloco }
 *   bloco           := entidade | relacionamento | requisito
 *
 *   entidade        := "entidade" NOME "{" { atributo } "}"
 *   atributo        := NOME ":" TIPO [ "!" ] [ "(" restricao ")" ]
 *                       -- "!" marca atributo obrigatório
 *
 *   relacionamento  := NOME cardinalidade "--" cardinalidade NOME
 *                       [ ":" ROTULO ] [ "{" tipo_rel "}" ]
 *   cardinalidade   := "1" | "0..1" | "1..*" | "0..*" | "*"
 *   tipo_rel        := "associacao" | "composicao" | "agregacao" | "heranca"
 *
 *   requisito       := "requisito" ID ":" TEXTO_LIVRE
 *                       -- TEXTO_LIVRE passa pelo scan() de ambiguity.ts
 *
 * ---------------------------------------------------------------------
 * EXEMPLO
 * ---------------------------------------------------------------------
 *
 *   entidade Pedido {
 *     id: uuid !
 *     status: texto !
 *     total: decimal
 *   }
 *
 *   entidade Cliente {
 *     id: uuid !
 *     nome: texto !
 *   }
 *
 *   Cliente 1 -- 0..* Pedido : realiza { associacao }
 *
 *   requisito R1: O sistema deve calcular o total do Pedido rapidamente.
 *                 -- "rapidamente" é detectado como vague-term pelo scan()
 */

import { scan, type Ambiguity, type ScanResult } from "./ambiguity.js";
import type { UbiquitousDictionary } from "./dictionary.js";

// ---------------------------------------------------------------------------
// Tipos do modelo
// ---------------------------------------------------------------------------

export type Cardinality = "1" | "0..1" | "1..*" | "0..*" | "*";

export type RelationshipType = "associacao" | "composicao" | "agregacao" | "heranca";

export interface Attribute {
  name: string;
  type: string;
  required: boolean;
  constraint?: string;
}

export interface Entity {
  name: string;
  attributes: Attribute[];
  /** linha onde a entidade foi declarada, para mensagens de erro */
  line: number;
}

export interface Relationship {
  from: string;
  to: string;
  fromCardinality: Cardinality;
  toCardinality: Cardinality;
  label?: string;
  type: RelationshipType;
  line: number;
}

export interface Requirement {
  id: string;
  text: string;
  line: number;
}

export interface MerModel {
  entities: Entity[];
  relationships: Relationship[];
  requirements: Requirement[];
}

export interface ParseError {
  line: number;
  message: string;
  raw: string;
}

export interface ParseResult {
  model: MerModel;
  errors: ParseError[];
}

// ---------------------------------------------------------------------------
// Parser (estágio 0 — análise sintática, antes do scan de ambiguidade)
// ---------------------------------------------------------------------------

const ENTITY_START_RE = /^entidade\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/i;
const ATTRIBUTE_RE =
  /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)\s*(!)?\s*(?:\(([^)]*)\))?$/;
const RELATIONSHIP_RE =
  /^([A-Za-z_][A-Za-z0-9_]*)\s+(1|0\.\.1|1\.\.\*|0\.\.\*|\*)\s*--\s*(1|0\.\.1|1\.\.\*|0\.\.\*|\*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*([^\{]+))?\s*(?:\{\s*(associacao|composicao|agregacao|heranca)\s*\})?$/i;
const REQUIREMENT_RE = /^requisito\s+([A-Za-z0-9_]+)\s*:\s*(.+)$/i;

/**
 * Faz o parsing da notação textual para o modelo estruturado MerModel.
 * Erros de sintaxe (não de ambiguidade semântica — isso é outro estágio)
 * são coletados em `errors` em vez de lançar exceção, para a UI poder
 * sublinhar todos de uma vez.
 */
export function parseMerNotation(source: string): ParseResult {
  const lines = source.split("\n");
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];
  const requirements: Requirement[] = [];
  const errors: ParseError[] = [];

  let currentEntity: Entity | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const lineNo = i + 1;

    if (line === "" || line.startsWith("--")) continue; // vazio ou comentário

    if (currentEntity) {
      if (line === "}") {
        entities.push(currentEntity);
        currentEntity = null;
        continue;
      }
      const attrMatch = ATTRIBUTE_RE.exec(line);
      if (!attrMatch) {
        errors.push({ line: lineNo, message: "Atributo mal formado. Esperado: nome: tipo [!] [(restrição)]", raw: rawLine });
        continue;
      }
      const [, name, type, required, constraint] = attrMatch;
      currentEntity.attributes.push({ name, type, required: required === "!", constraint });
      continue;
    }

    const entityMatch = ENTITY_START_RE.exec(line);
    if (entityMatch) {
      currentEntity = { name: entityMatch[1], attributes: [], line: lineNo };
      continue;
    }

    const relMatch = RELATIONSHIP_RE.exec(line);
    if (relMatch) {
      const [, from, fromCard, toCard, to, label, type] = relMatch;
      relationships.push({
        from,
        to,
        fromCardinality: fromCard as Cardinality,
        toCardinality: toCard as Cardinality,
        label: label?.trim(),
        type: (type?.toLowerCase() as RelationshipType) ?? "associacao",
        line: lineNo,
      });
      continue;
    }

    const reqMatch = REQUIREMENT_RE.exec(line);
    if (reqMatch) {
      const [, id, text] = reqMatch;
      requirements.push({ id, text: text.trim(), line: lineNo });
      continue;
    }

    errors.push({ line: lineNo, message: `Linha não reconhecida pela notação MER.`, raw: rawLine });
  }

  if (currentEntity) {
    errors.push({ line: currentEntity.line, message: `Entidade "${currentEntity.name}" nunca foi fechada com "}".`, raw: "" });
  }

  return { model: { entities, relationships, requirements }, errors };
}

// ---------------------------------------------------------------------------
// Validação estrutural (referências entre entidades, antes da ambiguidade semântica)
// ---------------------------------------------------------------------------

export interface StructuralIssue {
  message: string;
  line: number;
}

/**
 * Checa integridade referencial do modelo: relacionamento apontando para
 * entidade inexistente, entidade duplicada, atributo duplicado — erros
 * estruturais, distintos dos erros de ambiguidade semântica tratados por
 * ambiguity.ts.
 */
export function validateStructure(model: MerModel): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  const entityNames = new Set(model.entities.map((e) => e.name));

  const seenEntities = new Set<string>();
  for (const e of model.entities) {
    if (seenEntities.has(e.name)) {
      issues.push({ message: `Entidade "${e.name}" declarada mais de uma vez.`, line: e.line });
    }
    seenEntities.add(e.name);

    const seenAttrs = new Set<string>();
    for (const a of e.attributes) {
      if (seenAttrs.has(a.name)) {
        issues.push({ message: `Atributo "${a.name}" duplicado em "${e.name}".`, line: e.line });
      }
      seenAttrs.add(a.name);
    }
  }

  for (const rel of model.relationships) {
    if (!entityNames.has(rel.from)) {
      issues.push({ message: `Relacionamento referencia entidade inexistente "${rel.from}".`, line: rel.line });
    }
    if (!entityNames.has(rel.to)) {
      issues.push({ message: `Relacionamento referencia entidade inexistente "${rel.to}".`, line: rel.line });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Integração com o resolvedor de ambiguidade (ambiguity.ts)
// ---------------------------------------------------------------------------

export interface MerScanResult {
  parseErrors: ParseError[];
  structuralIssues: StructuralIssue[];
  /** ambiguidades semânticas encontradas no texto de cada requisito */
  requirementAmbiguities: { requirementId: string; scan: ScanResult }[];
}

/**
 * Roda o pipeline completo de análise sobre a especificação MER:
 *   1. parse da sintaxe (parseMerNotation)
 *   2. validação estrutural (validateStructure)
 *   3. scan() de ambiguity.ts sobre o texto de CADA requisito
 *
 * As entidades/relacionamentos (a parte "ER" do modelo) são estruturados
 * por natureza — não têm ambiguidade de linguagem natural. Quem passa
 * pelo resolvedor de ambiguidade é o texto livre dos requisitos.
 */
export function scanMerSpecification(
  source: string,
  dictionary?: UbiquitousDictionary
): { parseResult: ParseResult; merScan: MerScanResult } {
  const parseResult = parseMerNotation(source);
  const structuralIssues = validateStructure(parseResult.model);

  const requirementAmbiguities = parseResult.model.requirements.map((req) => ({
    requirementId: req.id,
    scan: scan(req.text, dictionary),
  }));

  return {
    parseResult,
    merScan: {
      parseErrors: parseResult.errors,
      structuralIssues,
      requirementAmbiguities,
    },
  };
}

// ---------------------------------------------------------------------------
// Emissão — modelo MER estruturado também vira parte do .intent.yaml
// ---------------------------------------------------------------------------

/**
 * Serializa o MerModel (já sem ambiguidades pendentes) como bloco YAML,
 * para ser concatenado ao draft gerado por emit()/toYamlDraft() de
 * ambiguity.ts, formando o .intent.yaml final com seção "model:".
 */
export function merModelToYamlBlock(model: MerModel): string {
  const esc = (s: string) => `"${s.replace(/"/g, '\\"')}"`;

  const entityBlocks = model.entities.map((e) => {
    const attrLines = e.attributes
      .map((a) => `      - name: ${esc(a.name)}\n        type: ${esc(a.type)}\n        required: ${a.required}`)
      .join("\n");
    return `  - name: ${esc(e.name)}\n    attributes:\n${attrLines || "      []"}`;
  });

  const relBlocks = model.relationships.map((r) => {
    return [
      `  - from: ${esc(r.from)}`,
      `    to: ${esc(r.to)}`,
      `    from_cardinality: ${esc(r.fromCardinality)}`,
      `    to_cardinality: ${esc(r.toCardinality)}`,
      `    type: ${esc(r.type)}`,
      r.label ? `    label: ${esc(r.label)}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "model:",
    "  entities:",
    entityBlocks.length ? entityBlocks.join("\n") : "    []",
    "  relationships:",
    relBlocks.length ? relBlocks.join("\n") : "    []",
  ].join("\n");
}
