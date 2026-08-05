// src/lib/domain/types.ts — Domain Model AST
// Representação intermediária entre UML e artefatos gerados (YAML, JSONB, SQL)

// ── Tipos primitivos suportados ─────────────────────────────────

export type DomainType =
  | 'uuid' | 'string' | 'text' | 'integer' | 'bigint'
  | 'decimal' | 'float' | 'boolean' | 'timestamp' | 'date'
  | 'time' | 'json' | 'jsonb' | 'enum' | 'array' | 'bytea';

export type Cardinality = '1:1' | '1:N' | 'N:1' | 'N:M';

// ── Functional Dependency ───────────────────────────────────────

export interface FunctionalDependency {
  determinant: string[];   // {A, B} → ...
  dependent:   string[];   // ... → {C, D}
  isPartial?:  boolean;    // partial FD (violates 2NF)
  isTransitive?: boolean;  // transitive FD (violates 3NF)
}

// ── Atributo ────────────────────────────────────────────────────

export interface DomainAttribute {
  name:         string;
  type:         DomainType;
  nullable:     boolean;
  unique:       boolean;
  primaryKey:   boolean;
  foreignKey?:  { entity: string; attribute: string };
  defaultValue?: string;
  enumValues?:  string[];   // for type = 'enum'
  constraints:  string[];   // business rule constraints
  description?: string;
}

// ── Relacionamento ──────────────────────────────────────────────

export interface DomainRelationship {
  name?:          string;
  from:           string;
  to:             string;
  cardinality:    Cardinality;
  cascade?:       'delete' | 'update' | 'none';
  junctionTable?: string;  // for N:M
  optional:       boolean;
  description?:   string;
}

// ── Entidade ────────────────────────────────────────────────────

export interface DomainEntity {
  name:               string;
  tableName:          string;   // snake_case
  description?:       string;
  attributes:         DomainAttribute[];
  relationships:      DomainRelationship[];
  candidateKeys:      string[][];   // [[email], [phone], [id]]
  primaryKey:         string[];
  indexes:            Array<{ columns: string[]; unique: boolean; name: string }>;
  businessRules:      string[];
  functionalDeps:     FunctionalDependency[];
  normalForm?:        NormalFormLevel;   // highest verified NF
  abstract?:          boolean;
}

// ── Formas Normais ──────────────────────────────────────────────

export type NormalFormLevel = '1NF' | '2NF' | '3NF' | 'BCNF' | '4NF' | '5NF' | 'DKNF';

export interface NormalizationViolation {
  form:        NormalFormLevel;
  entity:      string;
  attribute?:  string;
  dependency?: FunctionalDependency;
  message:     string;
  suggestion:  string;
}

// ── Domain Model (raiz do AST) ──────────────────────────────────

export interface DomainModel {
  name:          string;
  description?:  string;
  version:       string;
  source:        'mermaid' | 'plantuml' | 'yaml' | 'unknown';
  entities:      DomainEntity[];
  relationships: DomainRelationship[];   // cross-entity
  enums:         Record<string, string[]>;
  createdAt:     string;
}

// ── Resultado da compilação ─────────────────────────────────────

export interface CompileResult {
  domainYaml:   string;   // domain.intent.yaml
  jsonbSchema:  string;   // JSON Schema for each entity
  sql:          string;   // CREATE TABLE statements
  erDiagram:    string;   // Mermaid erDiagram
  migrations:   string[]; // ordered migration files
}

// ── Resultado da verificação ────────────────────────────────────

export interface SchemaColumn {
  name:       string;
  type:       string;
  nullable:   boolean;
  default?:   string;
  primaryKey: boolean;
  unique:     boolean;
}

export interface SchemaTable {
  name:    string;
  columns: SchemaColumn[];
  indexes: Array<{ columns: string[]; unique: boolean }>;
}

export interface ParsedDbSchema {
  tables: SchemaTable[];
}

export interface VerificationResult {
  entity:       string;
  tableFound:   boolean;
  score:        number;   // 0-100
  missingCols:  string[];
  extraCols:    string[];
  typeMismatch: Array<{ col: string; expected: string; actual: string }>;
  violations:   string[];
}
