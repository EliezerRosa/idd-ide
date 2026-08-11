// src/lib/domain/evolver.ts — Issue #23: Domain Model Evolution
// Compara dois snapshots do Domain Model e gera SQL de migração.
import { DomainModel, DomainEntity, DomainAttribute } from './types.ts';

// ── Tipos de diff ─────────────────────────────────────────────────

export type DiffSeverity = 'safe' | 'warn' | 'breaking';

export interface EntityDiff {
  type:     'added' | 'removed' | 'modified';
  entity:   string;
  table:    string;
  severity: DiffSeverity;
  changes:  AttributeDiff[];
  sql:      string[];
  warnings: string[];
}

export interface AttributeDiff {
  type:      'added' | 'removed' | 'type_changed' | 'nullable_changed' | 'unique_changed';
  attribute: string;
  before?:   Partial<DomainAttribute>;
  after?:    Partial<DomainAttribute>;
  severity:  DiffSeverity;
  sql:       string;
  warning?:  string;
}

export interface DomainEvolution {
  from:       string;   // version
  to:         string;
  diffs:      EntityDiff[];
  sql:        string;
  safeCount:  number;
  warnCount:  number;
  breakCount: number;
  requiresDowntime: boolean;
}

// ── Mapeamento de tipos para SQL ─────────────────────────────────

const SQL_TYPES: Record<string, string> = {
  uuid: 'UUID', string: 'VARCHAR(255)', text: 'TEXT',
  integer: 'INTEGER', bigint: 'BIGINT', decimal: 'NUMERIC(15,4)',
  float: 'DOUBLE PRECISION', boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMPTZ', date: 'DATE', time: 'TIME',
  json: 'JSON', jsonb: 'JSONB', bytea: 'BYTEA',
};

// ── Cast hints para mudanças de tipo ─────────────────────────────

function castHint(from: string, to: string): string {
  const safe = [
    ['integer', 'bigint'], ['string', 'text'],
    ['float', 'decimal'], ['integer', 'decimal'],
  ];
  if (safe.some(([f, t]) => f === from && t === to)) {
    return `USING ${from === 'string' ? 'column_name' : 'column_name'}::${SQL_TYPES[to] ?? to}`;
  }
  return `USING NULL -- cast manual necessário de ${from} para ${to}`;
}

// ════════════════════════════════════════════════════════════════
// Core diff engine
// ════════════════════════════════════════════════════════════════

export function diffDomainModels(v1: DomainModel, v2: DomainModel): DomainEvolution {
  const diffs: EntityDiff[] = [];

  const v1Map = new Map(v1.entities.map(e => [e.name, e]));
  const v2Map = new Map(v2.entities.map(e => [e.name, e]));

  // ── Entidades removidas ──────────────────────────────────────
  for (const [name, entity] of v1Map) {
    if (!v2Map.has(name)) {
      diffs.push({
        type:     'removed',
        entity:   name,
        table:    entity.tableName,
        severity: 'breaking',
        changes:  [],
        warnings: [`ATENÇÃO: DROP TABLE ${entity.tableName} destrói dados permanentemente!`],
        sql: [
          `-- BREAKING: Entidade "${name}" removida do domain model`,
          `-- CONFIRME antes de executar:`,
          `DROP TABLE IF EXISTS ${entity.tableName} CASCADE; -- ⚠ IRREVERSÍVEL`,
        ],
      });
    }
  }

  // ── Entidades adicionadas ────────────────────────────────────
  for (const [name, entity] of v2Map) {
    if (!v1Map.has(name)) {
      const colDefs = entity.attributes.map(a => {
        const sqlType = SQL_TYPES[a.type] ?? 'TEXT';
        let def = `  ${a.name} ${sqlType}`;
        if (a.primaryKey) {
          def += a.type === 'uuid' ? ` DEFAULT gen_random_uuid() PRIMARY KEY` : ` PRIMARY KEY`;
        } else {
          if (!a.nullable) def += ` NOT NULL`;
          if (a.unique)    def += ` UNIQUE`;
        }
        return def;
      });

      diffs.push({
        type:     'added',
        entity:   name,
        table:    entity.tableName,
        severity: 'safe',
        changes:  [],
        warnings: [],
        sql: [
          `-- Nova entidade: ${name}`,
          `CREATE TABLE IF NOT EXISTS ${entity.tableName} (`,
          colDefs.join(',\n'),
          `);`,
        ],
      });
    }
  }

  // ── Entidades modificadas ────────────────────────────────────
  for (const [name, v1Entity] of v1Map) {
    const v2Entity = v2Map.get(name);
    if (!v2Entity) continue;

    const entityChanges: AttributeDiff[] = [];
    const entitySql:     string[]        = [];
    const entityWarns:   string[]        = [];
    let   entitySeverity: DiffSeverity   = 'safe';

    const v1Attrs = new Map(v1Entity.attributes.map(a => [a.name, a]));
    const v2Attrs = new Map(v2Entity.attributes.map(a => [a.name, a]));

    // Atributos removidos
    for (const [attrName, attr] of v1Attrs) {
      if (!v2Attrs.has(attrName)) {
        const severity: DiffSeverity = 'breaking';
        if (severity > entitySeverity) entitySeverity = severity;
        const diff: AttributeDiff = {
          type: 'removed', attribute: attrName, before: attr, severity,
          sql: `ALTER TABLE ${v1Entity.tableName} DROP COLUMN IF EXISTS ${attrName}; -- ⚠ BREAKING`,
          warning: `Coluna "${attrName}" removida — dados serão perdidos permanentemente.`,
        };
        entityChanges.push(diff);
        entitySql.push(diff.sql);
        entityWarns.push(diff.warning!);
      }
    }

    // Atributos adicionados
    for (const [attrName, attr] of v2Attrs) {
      if (!v1Attrs.has(attrName)) {
        const sqlType  = SQL_TYPES[attr.type] ?? 'TEXT';
        const notNull  = !attr.nullable;
        const severity: DiffSeverity = notNull ? 'warn' : 'safe';
        if (severity > entitySeverity) entitySeverity = severity;

        let sql = `ALTER TABLE ${v2Entity.tableName} ADD COLUMN IF NOT EXISTS ${attrName} ${sqlType}`;
        if (!attr.nullable) {
          // NOT NULL needs DEFAULT for existing rows
          const defVal = attr.defaultValue ??
            (attr.type === 'boolean' ? 'false' :
             attr.type === 'integer' ? '0'     :
             attr.type === 'uuid'    ? 'gen_random_uuid()' : "''");
          sql += ` NOT NULL DEFAULT ${defVal}`;
        }
        if (attr.unique)   sql += ` UNIQUE`;
        sql += ';';

        const diff: AttributeDiff = {
          type: 'added', attribute: attrName, after: attr, severity, sql,
          warning: notNull ? `Coluna NOT NULL sem DEFAULT explícito — use valor padrão seguro.` : undefined,
        };
        entityChanges.push(diff);
        entitySql.push(sql);
        if (diff.warning) entityWarns.push(diff.warning);
      }
    }

    // Atributos modificados
    for (const [attrName, v1Attr] of v1Attrs) {
      const v2Attr = v2Attrs.get(attrName);
      if (!v2Attr) continue;

      // Mudança de tipo
      if (v1Attr.type !== v2Attr.type) {
        const severity: DiffSeverity = 'breaking';
        if (severity > entitySeverity) entitySeverity = severity;
        const cast = castHint(v1Attr.type, v2Attr.type);
        const sql  = `ALTER TABLE ${v1Entity.tableName} ALTER COLUMN ${attrName} TYPE ${SQL_TYPES[v2Attr.type] ?? v2Attr.type} ${cast};`;
        entityChanges.push({
          type: 'type_changed', attribute: attrName,
          before: { type: v1Attr.type }, after: { type: v2Attr.type },
          severity, sql,
          warning: `Mudança de tipo ${v1Attr.type}→${v2Attr.type} pode perder dados.`,
        });
        entitySql.push(sql);
        entityWarns.push(`Tipo de "${attrName}" mudou: ${v1Attr.type} → ${v2Attr.type}`);
      }

      // nullable → NOT NULL (breaking)
      if (v1Attr.nullable && !v2Attr.nullable) {
        const sql = `ALTER TABLE ${v1Entity.tableName} ALTER COLUMN ${attrName} SET NOT NULL;`;
        entityChanges.push({
          type: 'nullable_changed', attribute: attrName,
          before: { nullable: true }, after: { nullable: false },
          severity: 'warn', sql,
          warning: `"${attrName}" passa a ser NOT NULL — verifique dados existentes antes de executar.`,
        });
        entitySql.push(sql);
        entityWarns.push(`"${attrName}" agora é NOT NULL — pode falhar se existirem NULLs.`);
        if ('warn' > entitySeverity) entitySeverity = 'warn';
      }

      // NOT NULL → nullable (safe)
      if (!v1Attr.nullable && v2Attr.nullable) {
        const sql = `ALTER TABLE ${v1Entity.tableName} ALTER COLUMN ${attrName} DROP NOT NULL;`;
        entityChanges.push({
          type: 'nullable_changed', attribute: attrName,
          before: { nullable: false }, after: { nullable: true },
          severity: 'safe', sql,
        });
        entitySql.push(sql);
      }

      // unique adicionado
      if (!v1Attr.unique && v2Attr.unique) {
        const idxName = `uq_${v1Entity.tableName}_${attrName}`;
        const sql = `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ${idxName} ON ${v1Entity.tableName} (${attrName});`;
        entityChanges.push({
          type: 'unique_changed', attribute: attrName,
          after: { unique: true }, severity: 'warn', sql,
          warning: `UNIQUE CONCURRENTLY não bloqueia tabela mas pode falhar se existirem duplicatas.`,
        });
        entitySql.push(sql);
        entityWarns.push(`"${attrName}" passa a ser UNIQUE — elimine duplicatas primeiro.`);
        if ('warn' > entitySeverity) entitySeverity = 'warn';
      }
    }

    // Mudança de tableName
    if (v1Entity.tableName !== v2Entity.tableName) {
      entitySql.push(
        `ALTER TABLE ${v1Entity.tableName} RENAME TO ${v2Entity.tableName}; -- ⚠ atualizar FK referências`
      );
      entityWarns.push(`Tabela renomeada: ${v1Entity.tableName} → ${v2Entity.tableName} — atualize todas as referências.`);
      entitySeverity = 'breaking';
    }

    if (entityChanges.length > 0) {
      diffs.push({
        type: 'modified', entity: name, table: v2Entity.tableName,
        severity: entitySeverity, changes: entityChanges,
        sql: entitySql, warnings: entityWarns,
      });
    }
  }

  // ── Gera SQL de migração final ────────────────────────────────
  const lines: string[] = [
    `-- IDD Domain Evolution Migration`,
    `-- From: domain v${v1.version}  →  To: domain v${v2.version}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Classificação: ${diffs.some(d=>d.severity==='breaking') ? '⚠ BREAKING' : diffs.some(d=>d.severity==='warn') ? '⚠ WARN' : '✓ SAFE'}`,
    ``,
    `BEGIN;`,
    ``,
  ];

  // Safe first, then warnings, then breaking
  for (const severity of ['safe', 'warn', 'breaking'] as DiffSeverity[]) {
    const group = diffs.filter(d => d.severity === severity);
    if (group.length === 0) continue;
    lines.push(`-- ── ${severity.toUpperCase()} ` + '─'.repeat(50));
    for (const d of group) {
      lines.push('');
      lines.push(`-- ${d.type.toUpperCase()}: ${d.entity}`);
      d.warnings.forEach(w => lines.push(`-- ⚠ ${w}`));
      d.sql.forEach(s => lines.push(s));
    }
    lines.push('');
  }

  lines.push(`COMMIT;`);

  const safeCount  = diffs.filter(d => d.severity === 'safe').length;
  const warnCount  = diffs.filter(d => d.severity === 'warn').length;
  const breakCount = diffs.filter(d => d.severity === 'breaking').length;

  return {
    from: v1.version, to: v2.version,
    diffs, sql: lines.join('\n'),
    safeCount, warnCount, breakCount,
    requiresDowntime: breakCount > 0 || diffs.some(d =>
      d.changes.some(c => c.type === 'type_changed' && !c.sql.includes('CONCURRENTLY'))
    ),
  };
}
