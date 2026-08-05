// src/lib/domain/verifier.ts — Issue #20: Schema Verifier
// Compara migrations SQL reais contra o Domain Model Intent.
import * as fs   from 'node:fs';
import * as path from 'node:path';
import {
  DomainModel, DomainEntity, ParsedDbSchema, SchemaTable,
  SchemaColumn, VerificationResult,
} from './types.ts';

// ════════════════════════════════════════════════════════════════
// Parser de SQL migrations
// ════════════════════════════════════════════════════════════════

const SQL_TYPE_ALIASES: Record<string, string> = {
  'varchar':             'string',
  'character varying':   'string',
  'char':                'string',
  'text':                'text',
  'int':                 'integer',
  'int4':                'integer',
  'integer':             'integer',
  'int8':                'bigint',
  'bigint':              'bigint',
  'int2':                'integer',
  'smallint':            'integer',
  'numeric':             'decimal',
  'decimal':             'decimal',
  'float4':              'float',
  'float8':              'float',
  'double precision':    'float',
  'real':                'float',
  'bool':                'boolean',
  'boolean':             'boolean',
  'timestamptz':         'timestamp',
  'timestamp with time zone': 'timestamp',
  'timestamp without time zone': 'timestamp',
  'timestamp':           'timestamp',
  'date':                'date',
  'time':                'time',
  'uuid':                'uuid',
  'json':                'json',
  'jsonb':               'jsonb',
  'bytea':               'bytea',
};

function normalizeSqlType(raw: string): string {
  const lower = raw.toLowerCase()
    .replace(/\(\d+(?:,\s*\d+)?\)/g, '')  // remove precision (255), (15,4)
    .trim();
  return SQL_TYPE_ALIASES[lower] ?? lower;
}

export function parseSqlMigration(sql: string): ParsedDbSchema {
  const tables: SchemaTable[] = [];
  const normalized = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // Match CREATE TABLE blocks
  const tableMatches = normalized.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([^;]+)\)/gis
  );

  for (const m of tableMatches) {
    const tableName = m[1].toLowerCase();
    const body      = m[2];
    const columns: SchemaColumn[] = [];
    const indexes:  SchemaTable['indexes'] = [];

    // Parse column definitions (skip CONSTRAINT lines for now)
    const colLines = body.split(',').map(l => l.trim()).filter(l =>
      l.length > 0 &&
      !l.toUpperCase().startsWith('PRIMARY KEY') &&
      !l.toUpperCase().startsWith('CONSTRAINT') &&
      !l.toUpperCase().startsWith('FOREIGN KEY') &&
      !l.toUpperCase().startsWith('UNIQUE') &&
      !l.toUpperCase().startsWith('CHECK') &&
      !l.toUpperCase().startsWith('EXCLUDE')
    );

    for (const line of colLines) {
      // column_name TYPE [NOT NULL] [DEFAULT ...] [PRIMARY KEY] [UNIQUE]
      const colMatch = line.match(/^["']?(\w+)["']?\s+([\w\s]+?)(?:\s+(NOT\s+NULL|NULL|DEFAULT|PRIMARY|UNIQUE|CHECK|REFERENCES|ON).*)?\s*$/i);
      if (!colMatch) continue;
      const [, colName, rawType] = colMatch;
      const upper      = line.toUpperCase();
      const isPK       = upper.includes('PRIMARY KEY');
      const isUnique   = upper.includes('UNIQUE') || isPK;
      const isNotNull  = upper.includes('NOT NULL') || isPK;
      const defaultM   = line.match(/DEFAULT\s+(.+?)(?:\s+(?:NOT\s+NULL|NULL|UNIQUE|PRIMARY|REFERENCES)|$)/i);
      columns.push({
        name:       colName.toLowerCase(),
        type:       normalizeSqlType(rawType.trim()),
        nullable:   !isNotNull,
        primaryKey: isPK,
        unique:     isUnique,
        default:    defaultM?.[1]?.trim(),
      });
    }

    // Parse UNIQUE constraints and indexes from CREATE UNIQUE INDEX
    const uniqueMatches = body.matchAll(/UNIQUE\s*\(([^)]+)\)/gi);
    for (const um of uniqueMatches) {
      const cols = um[1].split(',').map(c => c.trim().replace(/["']/g, '').toLowerCase());
      indexes.push({ columns: cols, unique: true });
      if (cols.length === 1) {
        const col = columns.find(c => c.name === cols[0]);
        if (col) col.unique = true;
      }
    }

    tables.push({ name: tableName, columns, indexes });
  }

  // Separate CREATE INDEX statements
  const idxMatches = normalized.matchAll(
    /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?\w+["']?\s+ON\s+["']?(\w+)["']?\s*\(([^)]+)\)/gi
  );
  for (const m of idxMatches) {
    const isUnique  = !!m[1];
    const tableName = m[2].toLowerCase();
    const cols      = m[3].split(',').map(c => c.trim().toLowerCase());
    const table     = tables.find(t => t.name === tableName);
    if (table) table.indexes.push({ columns: cols, unique: isUnique });
  }

  // ALTER TABLE ADD COLUMN
  const alterMatches = normalized.matchAll(
    /ALTER\s+TABLE\s+["']?(\w+)["']?\s+ADD\s+(?:COLUMN\s+)?["']?(\w+)["']?\s+([\w\s(,)]+?)(?:\s+DEFAULT|\s+NOT\s+NULL|\s+NULL|\s+UNIQUE|\s+REFERENCES|;|$)/gi
  );
  for (const m of alterMatches) {
    const tableName = m[1].toLowerCase();
    const colName   = m[2].toLowerCase();
    const rawType   = m[3].trim();
    const table     = tables.find(t => t.name === tableName);
    if (table && !table.columns.find(c => c.name === colName)) {
      table.columns.push({
        name: colName, type: normalizeSqlType(rawType),
        nullable: true, primaryKey: false, unique: false,
      });
    }
  }

  return { tables };
}

// ════════════════════════════════════════════════════════════════
// Comparação: domain model vs schema real
// ════════════════════════════════════════════════════════════════

export function verifySchema(
  model: DomainModel,
  dbSchema: ParsedDbSchema
): VerificationResult[] {
  const results: VerificationResult[] = [];

  for (const entity of model.entities) {
    if (entity.abstract) continue;

    const table = dbSchema.tables.find(
      t => t.name === entity.tableName.toLowerCase() ||
           t.name === entity.name.toLowerCase() ||
           t.name === entity.name.toLowerCase() + 's'
    );

    if (!table) {
      results.push({
        entity:      entity.name,
        tableFound:  false,
        score:       0,
        missingCols: entity.attributes.map(a => a.name),
        extraCols:   [],
        typeMismatch:[],
        violations:  [`Tabela "${entity.tableName}" não encontrada no schema. Execute idd domain compile para gerar o SQL.`],
      });
      continue;
    }

    const domainCols = entity.attributes.map(a => a.name.toLowerCase());
    const dbCols     = table.columns.map(c => c.name.toLowerCase());

    const missingCols   = domainCols.filter(c => !dbCols.includes(c));
    const extraCols     = dbCols.filter(c => !domainCols.includes(c));
    const typeMismatch: VerificationResult['typeMismatch'] = [];
    const violations:   string[] = [];

    // Verifica tipos
    for (const domainAttr of entity.attributes) {
      const dbCol = table.columns.find(c => c.name === domainAttr.name.toLowerCase());
      if (!dbCol) continue;

      // Normaliza tipos para comparação
      const expectedType = domainAttr.type;
      const actualType   = dbCol.type;

      if (!typesCompatible(expectedType, actualType)) {
        typeMismatch.push({
          col:      domainAttr.name,
          expected: expectedType,
          actual:   actualType,
        });
      }

      // Verifica NOT NULL
      if (!domainAttr.nullable && dbCol.nullable) {
        violations.push(`Coluna "${domainAttr.name}" deve ser NOT NULL no domain model mas está nullable no schema.`);
      }

      // Verifica UNIQUE
      if (domainAttr.unique && !dbCol.unique && !dbCol.primaryKey) {
        const hasUniqueIdx = table.indexes.some(
          idx => idx.unique && idx.columns.length === 1 && idx.columns[0] === domainAttr.name.toLowerCase()
        );
        if (!hasUniqueIdx) {
          violations.push(`Coluna "${domainAttr.name}" deve ser UNIQUE no domain model mas não tem constraint UNIQUE no schema.`);
        }
      }
    }

    // Colunas extras não declaradas no model
    if (extraCols.length > 0) {
      const filtered = extraCols.filter(c => !['created_at','updated_at','deleted_at'].includes(c));
      filtered.forEach(c =>
        violations.push(`Coluna "${c}" existe no schema mas não está declarada no domain model. Adicione ao entity "${entity.name}" ou remova do schema.`)
      );
    }

    // PKs
    const domainPKs = entity.primaryKey.map(p => p.toLowerCase());
    const dbPKs     = table.columns.filter(c => c.primaryKey).map(c => c.name);
    if (JSON.stringify(domainPKs.sort()) !== JSON.stringify(dbPKs.sort())) {
      violations.push(`Primary key difere: domain=[${domainPKs.join(',')}] vs schema=[${dbPKs.join(',')}].`);
    }

    // Score: 100% - penalidades por violações
    const totalChecks = entity.attributes.length + 1; // +1 para existência
    const penaltyItems = missingCols.length + typeMismatch.length + violations.length;
    const score = Math.max(0, Math.round((1 - penaltyItems / (totalChecks + penaltyItems)) * 100));

    results.push({
      entity:     entity.name,
      tableFound: true,
      score,
      missingCols,
      extraCols,
      typeMismatch,
      violations,
    });
  }

  return results;
}

function typesCompatible(domainType: string, dbType: string): boolean {
  const compatible: Record<string, string[]> = {
    uuid:      ['uuid'],
    string:    ['string','text','varchar','char'],
    text:      ['text','string'],
    integer:   ['integer','int','int4','int2','smallint'],
    bigint:    ['bigint','int8'],
    decimal:   ['decimal','numeric'],
    float:     ['float','float4','float8','double precision','real'],
    boolean:   ['boolean','bool'],
    timestamp: ['timestamp','timestamptz'],
    date:      ['date'],
    time:      ['time'],
    json:      ['json','jsonb'],
    jsonb:     ['jsonb','json'],
    bytea:     ['bytea'],
    enum:      ['string','text'],
  };
  return compatible[domainType]?.includes(dbType) ?? domainType === dbType;
}

// ════════════════════════════════════════════════════════════════
// Formata comentário de PR para schema verification
// ════════════════════════════════════════════════════════════════

export function formatVerificationComment(
  model: DomainModel,
  results: VerificationResult[]
): string {
  const badge = (score: number) =>
    score === 100 ? '🟢' : score >= 80 ? '🟡' : score >= 50 ? '🟠' : '🔴';

  const lines = [
    `## ⬡ IDD Domain Verify — ${model.name}`,
    '',
    `| Status | Entidade | Tabela | Score | Colunas faltando | Tipo divergente |`,
    `|---|---|---|---|---|---|`,
  ];

  for (const r of results) {
    const entity = model.entities.find(e => e.name === r.entity);
    lines.push(
      `| ${badge(r.score)} | ${r.entity} | \`${entity?.tableName ?? '?'}\` | ${r.tableFound ? r.score+'%' : 'N/A'} | ${r.missingCols.length} | ${r.typeMismatch.length} |`
    );
  }

  const withIssues = results.filter(r => r.score < 100);
  if (withIssues.length > 0) {
    lines.push('', '### Detalhes');
    for (const r of withIssues) {
      lines.push(`\n**${badge(r.score)} ${r.entity}**`);
      if (!r.tableFound) { lines.push(`- ❌ Tabela não encontrada. Execute \`idd domain compile --sql\``); continue; }
      r.missingCols.slice(0,5).forEach(c => lines.push(`- ❌ Coluna \`${c}\` ausente no schema`));
      r.typeMismatch.slice(0,5).forEach(t => lines.push(`- ⚠ \`${t.col}\`: esperado \`${t.expected}\`, encontrado \`${t.actual}\``));
      r.violations.slice(0,5).forEach(v => lines.push(`- ⚠ ${v}`));
    }
  }

  const totalScore = Math.round(results.reduce((s,r) => s + r.score, 0) / (results.length || 1));
  const allOk      = results.every(r => r.score === 100);

  lines.push('', '---');
  lines.push(
    allOk
      ? `**✅ Schema 100% conforme com o Domain Model Intent**`
      : `**${totalScore >= 80 ? '⚠' : '❌'} Score médio: ${totalScore}% — ${results.filter(r=>r.score<100).length} entidade(s) com divergências**`
  );
  lines.push('', '<sub>Gerado por [IDD Domain Verify](https://github.com/EliezerRosa/idd-ide) — `idd domain verify`</sub>');

  return lines.join('\n');
}

// ── Scanner de migration files ───────────────────────────────────

export function loadMigrationFiles(dir: string): string {
  if (!fs.existsSync(dir)) return '';
  const sqlFiles = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8'));
  return sqlFiles.join('\n\n');
}
