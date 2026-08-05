// src/lib/domain/compiler.ts — Issue #18: Domain Compiler
// Converte Domain Model AST em artefatos verificáveis:
//   domain.intent.yaml · JSON Schema (JSONB) · SQL migrations · Mermaid erDiagram
import { DomainModel, DomainEntity, DomainAttribute, DomainRelationship, CompileResult } from './types.ts';

// ── SQL type map ─────────────────────────────────────────────────

const SQL_TYPES: Record<string, string> = {
  uuid:      'UUID',
  string:    'VARCHAR(255)',
  text:      'TEXT',
  integer:   'INTEGER',
  bigint:    'BIGINT',
  decimal:   'NUMERIC(15,4)',
  float:     'DOUBLE PRECISION',
  boolean:   'BOOLEAN',
  timestamp: 'TIMESTAMPTZ',
  date:      'DATE',
  time:      'TIME',
  json:      'JSON',
  jsonb:     'JSONB',
  bytea:     'BYTEA',
  enum:      'TEXT',  // overridden with CHECK constraint
};

const JSON_SCHEMA_TYPES: Record<string, string | object> = {
  uuid:      { type:'string', format:'uuid' },
  string:    { type:'string' },
  text:      { type:'string' },
  integer:   { type:'integer' },
  bigint:    { type:'integer' },
  decimal:   { type:'number' },
  float:     { type:'number' },
  boolean:   { type:'boolean' },
  timestamp: { type:'string', format:'date-time' },
  date:      { type:'string', format:'date' },
  time:      { type:'string', format:'time' },
  json:      { type:'object' },
  jsonb:     { type:'object' },
  bytea:     { type:'string', contentEncoding:'base64' },
  enum:      { type:'string' },
};

// ════════════════════════════════════════════════════════════════
// 1. Compilador → domain.intent.yaml
// ════════════════════════════════════════════════════════════════

export function compileToDomainYaml(model: DomainModel): string {
  const lines: string[] = [
    `# domain.intent.yaml — gerado por idd domain compile`,
    `# Modelo: ${model.name} · Versão: ${model.version}`,
    `# ESTE ARQUIVO É A FONTE DE VERDADE DO MODELO DE NEGÓCIO`,
    ``,
    `domain: ${model.name}`,
    `version: "${model.version}"`,
    `description: "${(model.description ?? '').replace(/"/g, '\\"')}"`,
    ``,
    `entities:`,
  ];

  for (const entity of model.entities) {
    lines.push(`  - name: ${entity.name}`);
    lines.push(`    table: ${entity.tableName}`);
    if (entity.description) lines.push(`    description: "${entity.description.replace(/"/g, '\\"')}"`);

    lines.push(`    primary_key: [${entity.primaryKey.join(', ')}]`);

    if (entity.candidateKeys.length > 1) {
      lines.push(`    candidate_keys:`);
      entity.candidateKeys.forEach(ck => lines.push(`      - [${ck.join(', ')}]`));
    }

    lines.push(`    attributes:`);
    for (const attr of entity.attributes) {
      lines.push(`      - name: ${attr.name}`);
      lines.push(`        type: ${attr.type}${attr.enumValues ? ` # enum(${attr.enumValues.join('|')})` : ''}`);
      lines.push(`        nullable: ${attr.nullable}`);
      if (attr.unique)      lines.push(`        unique: true`);
      if (attr.primaryKey)  lines.push(`        primary_key: true`);
      if (attr.foreignKey)  lines.push(`        foreign_key: { entity: ${attr.foreignKey.entity}, attribute: ${attr.foreignKey.attribute} }`);
      if (attr.defaultValue)lines.push(`        default: "${attr.defaultValue}"`);
      if (attr.description) lines.push(`        description: "${attr.description.replace(/"/g, '\\"')}"`);
      if (attr.constraints.length > 0) {
        lines.push(`        constraints:`);
        attr.constraints.forEach(c => lines.push(`          - "${c}"`));
      }
    }

    if (entity.relationships.length > 0) {
      lines.push(`    relationships:`);
      for (const rel of entity.relationships) {
        lines.push(`      - entity: ${rel.to}`);
        lines.push(`        cardinality: ${rel.cardinality}`);
        if (rel.cascade) lines.push(`        cascade: ${rel.cascade}`);
        if (rel.junctionTable) lines.push(`        junction_table: ${rel.junctionTable}`);
        if (rel.name) lines.push(`        name: "${rel.name}"`);
      }
    }

    if (entity.businessRules.length > 0) {
      lines.push(`    business_rules:`);
      entity.businessRules.forEach(r => lines.push(`      - "${r.replace(/"/g, '\\"')}"`));
    }

    // IDD constraints derivadas do modelo
    const iddConstraints: string[] = [];
    entity.attributes.forEach(a => {
      if (a.unique && !a.primaryKey) iddConstraints.push(`${a.name} deve ser único`);
      if (!a.nullable && !a.primaryKey) iddConstraints.push(`${a.name} não pode ser nulo`);
      if (a.foreignKey) iddConstraints.push(`${a.name} deve referenciar ${a.foreignKey.entity}.${a.foreignKey.attribute} existente`);
    });

    if (iddConstraints.length > 0) {
      lines.push(`    idd_constraints:`);
      iddConstraints.forEach(c => lines.push(`      - "${c}"`));
    }

    lines.push('');
  }

  if (Object.keys(model.enums).length > 0) {
    lines.push(`enums:`);
    for (const [enumName, values] of Object.entries(model.enums)) {
      lines.push(`  ${enumName}: [${values.join(', ')}]`);
    }
    lines.push('');
  }

  lines.push(`# Relacionamentos cross-entidade`);
  lines.push(`relationships:`);
  for (const rel of model.relationships) {
    lines.push(`  - from: ${rel.from}`);
    lines.push(`    to: ${rel.to}`);
    lines.push(`    cardinality: ${rel.cardinality}`);
    if (rel.name) lines.push(`    label: "${rel.name}"`);
  }

  return lines.join('\n') + '\n';
}

// ════════════════════════════════════════════════════════════════
// 2. Compilador → JSON Schema (JSONB validation)
// ════════════════════════════════════════════════════════════════

export function compileToJsonSchema(model: DomainModel): string {
  const schemas: Record<string, object> = {};

  for (const entity of model.entities) {
    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const attr of entity.attributes) {
      let typeDef: any = { ...(JSON_SCHEMA_TYPES[attr.type] as object ?? { type: 'string' }) };

      if (attr.type === 'enum' && attr.enumValues) {
        typeDef = { type: 'string', enum: attr.enumValues };
      }
      if (attr.type === 'string') {
        if (attr.name.includes('email'))   typeDef.format = 'email';
        if (attr.name.includes('url'))     typeDef.format = 'uri';
        if (attr.name.includes('phone'))   typeDef.pattern = '^\\+?[1-9]\\d{7,14}$';
        if (attr.name.includes('cpf'))     typeDef.pattern = '^\\d{11}$';
        if (attr.name.includes('cnpj'))    typeDef.pattern = '^\\d{14}$';
        if (attr.name.includes('cep'))     typeDef.pattern = '^\\d{8}$';
        if (attr.name.endsWith('_hash'))   typeDef.description = 'NUNCA expor em APIs públicas';
      }
      if (attr.description) typeDef.description = attr.description;
      if (attr.nullable)    typeDef = { anyOf: [typeDef, { type: 'null' }] };

      properties[attr.name] = typeDef;
      if (!attr.nullable) required.push(attr.name);
    }

    schemas[entity.name] = {
      $schema:     'http://json-schema.org/draft-07/schema#',
      $id:         `https://domain/${model.name}/${entity.name}`,
      title:       entity.name,
      description: entity.description ?? `Entidade ${entity.name} do domínio ${model.name}`,
      type:        'object',
      properties,
      required,
      additionalProperties: false,
    };
  }

  return JSON.stringify({ $defs: schemas, domain: model.name, version: model.version }, null, 2);
}

// ════════════════════════════════════════════════════════════════
// 3. Compilador → SQL (PostgreSQL)
// ════════════════════════════════════════════════════════════════

export function compileToSql(model: DomainModel): string {
  const lines: string[] = [
    `-- Gerado por idd domain compile`,
    `-- Domínio: ${model.name}  |  Versão: ${model.version}`,
    `-- Data: ${new Date().toISOString()}`,
    `-- Formas normais alvo: até 3NF/BCNF`,
    ``,
    `BEGIN;`,
    ``,
    `-- Extensões`,
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
    `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
    ``,
  ];

  // Cria enums primeiro
  for (const [enumName, values] of Object.entries(model.enums)) {
    const sqlName = enumName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/,'');
    lines.push(`CREATE TYPE ${sqlName}_enum AS ENUM (${values.map(v=>`'${v}'`).join(', ')});`);
  }
  if (Object.keys(model.enums).length > 0) lines.push('');

  // Cria tabelas em ordem topológica (entidades sem FK primeiro)
  const sorted = topologicalSort(model);
  const createdTables = new Set<string>();

  for (const entity of sorted) {
    if (entity.abstract) continue;
    lines.push(`-- ── ${entity.name} ` + '─'.repeat(40));
    lines.push(`CREATE TABLE IF NOT EXISTS ${entity.tableName} (`);

    const colLines: string[] = [];

    for (const attr of entity.attributes) {
      let sqlType = SQL_TYPES[attr.type] ?? 'TEXT';

      // UUID PK com auto-geração
      if (attr.type === 'uuid') {
        sqlType = 'UUID';
      }

      // Enum
      if (attr.type === 'enum' && attr.enumValues) {
        const enumTypeName = attr.name.replace(/([A-Z])/g, '_$1').toLowerCase();
        sqlType = `TEXT CHECK (${attr.name} IN (${attr.enumValues.map(v=>`'${v}'`).join(', ')}))`;
      }

      let colDef = `  ${attr.name} ${sqlType}`;

      // PK com default UUID
      if (attr.primaryKey) {
        if (attr.type === 'uuid') {
          colDef += ` DEFAULT gen_random_uuid() PRIMARY KEY`;
        } else {
          colDef += ` PRIMARY KEY`;
        }
      } else {
        if (!attr.nullable) colDef += ` NOT NULL`;
        if (attr.unique)    colDef += ` UNIQUE`;
        if (attr.defaultValue) {
          const dv = attr.defaultValue === 'now()' ? 'NOW()' : `'${attr.defaultValue}'`;
          colDef += ` DEFAULT ${dv}`;
        }
      }

      // Timestamps automáticos
      if (attr.name === 'created_at' && attr.type === 'timestamp') {
        colDef = `  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
      }
      if (attr.name === 'updated_at' && attr.type === 'timestamp') {
        colDef = `  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
      }

      if (attr.description) colDef += ` -- ${attr.description}`;

      colLines.push(colDef);
    }

    // FK constraints
    for (const attr of entity.attributes.filter(a => a.foreignKey)) {
      const fk = attr.foreignKey!;
      const refTable = model.entities.find(e => e.name === fk.entity)?.tableName ?? fk.entity.toLowerCase() + 's';
      colLines.push(
        `  CONSTRAINT fk_${entity.tableName}_${attr.name}\n` +
        `    FOREIGN KEY (${attr.name}) REFERENCES ${refTable}(${fk.attribute})\n` +
        `    ON DELETE RESTRICT ON UPDATE CASCADE`
      );
    }

    lines.push(colLines.join(',\n'));
    lines.push(`);`);
    lines.push('');

    // Índices
    for (const idx of entity.indexes) {
      const idxType = idx.unique ? 'UNIQUE INDEX' : 'INDEX';
      lines.push(`CREATE ${idxType} IF NOT EXISTS ${idx.name} ON ${entity.tableName} (${idx.columns.join(', ')});`);
    }

    // Índices automáticos em FKs
    for (const attr of entity.attributes.filter(a => a.foreignKey && !a.primaryKey)) {
      lines.push(`CREATE INDEX IF NOT EXISTS idx_${entity.tableName}_${attr.name} ON ${entity.tableName} (${attr.name});`);
    }

    // Trigger updated_at
    const hasUpdatedAt = entity.attributes.some(a => a.name === 'updated_at');
    if (hasUpdatedAt) {
      lines.push('');
      lines.push(`CREATE OR REPLACE FUNCTION update_${entity.tableName}_updated_at()`);
      lines.push(`RETURNS TRIGGER AS $$`);
      lines.push(`BEGIN NEW.updated_at = NOW(); RETURN NEW; END;`);
      lines.push(`$$ LANGUAGE plpgsql;`);
      lines.push('');
      lines.push(`CREATE TRIGGER trg_${entity.tableName}_updated_at`);
      lines.push(`  BEFORE UPDATE ON ${entity.tableName}`);
      lines.push(`  FOR EACH ROW EXECUTE FUNCTION update_${entity.tableName}_updated_at();`);
    }

    // Tabelas de junção N:M
    for (const rel of entity.relationships.filter(r => r.cardinality === 'N:M' && r.junctionTable)) {
      const jt      = rel.junctionTable!;
      const refB    = model.entities.find(e => e.name === rel.to);
      const pkA     = entity.primaryKey[0] ?? 'id';
      const pkB     = refB?.primaryKey[0] ?? 'id';
      const typeA   = entity.attributes.find(a => a.name === pkA)?.type === 'uuid' ? 'UUID' : 'INTEGER';
      const typeB   = refB?.attributes.find(a => a.name === pkB)?.type === 'uuid' ? 'UUID' : 'INTEGER';
      const tableB  = refB?.tableName ?? rel.to.toLowerCase() + 's';

      if (!createdTables.has(jt)) {
        lines.push('');
        lines.push(`-- Junction table: ${entity.name} N:M ${rel.to}`);
        lines.push(`CREATE TABLE IF NOT EXISTS ${jt} (`);
        lines.push(`  ${entity.tableName.replace(/s$/,'')}_id ${typeA} NOT NULL,`);
        lines.push(`  ${tableB.replace(/s$/,'')}_id ${typeB} NOT NULL,`);
        lines.push(`  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),`);
        lines.push(`  PRIMARY KEY (${entity.tableName.replace(/s$/,'')}_id, ${tableB.replace(/s$/,'')}_id),`);
        lines.push(`  FOREIGN KEY (${entity.tableName.replace(/s$/,'')}_id) REFERENCES ${entity.tableName}(${pkA}) ON DELETE CASCADE,`);
        lines.push(`  FOREIGN KEY (${tableB.replace(/s$/,'')}_id) REFERENCES ${tableB}(${pkB}) ON DELETE CASCADE`);
        lines.push(`);`);
        createdTables.add(jt);
      }
    }

    createdTables.add(entity.tableName);
    lines.push('');
  }

  lines.push(`COMMIT;`);
  lines.push('');
  lines.push(`-- Rollback:`);
  lines.push(`-- DROP TABLE IF EXISTS ${[...sorted].reverse().map(e=>e.tableName).join(', ')} CASCADE;`);

  return lines.join('\n');
}

// ════════════════════════════════════════════════════════════════
// 4. Compilador → Mermaid erDiagram
// ════════════════════════════════════════════════════════════════

export function compileToErDiagram(model: DomainModel): string {
  const lines: string[] = [
    `\`\`\`mermaid`,
    `erDiagram`,
    ``,
    `  %% Domínio: ${model.name}`,
    ``,
  ];

  const CARD_ER: Record<string, string> = {
    '1:1': '||--||', '1:N': '||--o{',
    'N:1': '}o--||', 'N:M': '}o--o{',
  };

  // Entidades
  for (const entity of model.entities) {
    lines.push(`  ${entity.name} {`);
    for (const attr of entity.attributes) {
      const sqlType   = SQL_TYPES[attr.type]?.split('(')[0] ?? 'TEXT';
      const pkMarker  = attr.primaryKey ? ' PK' : attr.foreignKey ? ' FK' : attr.unique ? ' UK' : '';
      const nullMark  = attr.nullable ? ' "nullable"' : '';
      lines.push(`    ${sqlType} ${attr.name}${pkMarker}${nullMark}`);
    }
    lines.push(`  }`);
    lines.push('');
  }

  // Relacionamentos
  const seen = new Set<string>();
  for (const rel of model.relationships) {
    const key = [rel.from, rel.to].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const arrow = CARD_ER[rel.cardinality] ?? '||--o{';
    const label = rel.name ? `"${rel.name}"` : `"${rel.from.toLowerCase()}_${rel.to.toLowerCase()}"`;
    lines.push(`  ${rel.from} ${arrow} ${rel.to} : ${label}`);
  }

  lines.push(`\`\`\``);
  return lines.join('\n');
}

// ════════════════════════════════════════════════════════════════
// Compilador master
// ════════════════════════════════════════════════════════════════

export function compile(model: DomainModel): CompileResult {
  return {
    domainYaml:  compileToDomainYaml(model),
    jsonbSchema: compileToJsonSchema(model),
    sql:         compileToSql(model),
    erDiagram:   compileToErDiagram(model),
    migrations:  [compileToSql(model)],
  };
}

// ── Ordenação topológica (respeita FKs) ──────────────────────────

function topologicalSort(model: DomainModel): DomainEntity[] {
  const visited  = new Set<string>();
  const result:   DomainEntity[] = [];

  const visit = (entity: DomainEntity) => {
    if (visited.has(entity.name)) return;
    visited.add(entity.name);
    // Visita dependências primeiro
    for (const attr of entity.attributes.filter(a => a.foreignKey)) {
      const dep = model.entities.find(e => e.name === attr.foreignKey!.entity);
      if (dep) visit(dep);
    }
    result.push(entity);
  };

  model.entities.forEach(e => visit(e));
  return result;
}
