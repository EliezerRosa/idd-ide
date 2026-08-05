// src/lib/domain/parser.ts — Issue #17: Domain UML Parser
// Converte Mermaid classDiagram, PlantUML e YAML nativo em Domain Model AST.
import * as fs   from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import {
  DomainModel, DomainEntity, DomainAttribute, DomainRelationship,
  DomainType, Cardinality, FunctionalDependency,
} from './types.ts';

// ── Mapeamento de tipos ──────────────────────────────────────────

const TYPE_MAP: Record<string, DomainType> = {
  string:    'string', str:       'string', varchar:   'string', char:      'string',
  text:      'text',
  int:       'integer', integer:  'integer', number:    'integer',
  bigint:    'bigint', long:      'bigint',
  float:     'float', double:    'float', real:      'float',
  decimal:   'decimal', numeric:  'decimal', money:     'decimal',
  bool:      'boolean', boolean:  'boolean',
  date:      'date', datetime:   'timestamp', timestamp: 'timestamp',
  time:      'time',
  uuid:      'uuid', guid:      'uuid',
  json:      'json', jsonb:     'jsonb', object:    'jsonb',
  bytes:     'bytea', bytea:    'bytea',
};

function mapType(raw: string): DomainType {
  const lower = raw.toLowerCase().replace(/\s+/g, '');
  return TYPE_MAP[lower] ?? 'string';
}

function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[^a-z0-9_]/g, '_');
}

// ── Inferência de Functional Dependencies ───────────────────────

export function inferFunctionalDeps(entity: DomainEntity): FunctionalDependency[] {
  const fds: FunctionalDependency[] = [];
  const pk  = entity.primaryKey;
  const all  = entity.attributes.map(a => a.name);

  // PK → todos os atributos não-chave (FD principal)
  if (pk.length > 0) {
    fds.push({ determinant: pk, dependent: all.filter(a => !pk.includes(a)) });
  }

  // Chaves candidatas alternativas → todos os não-chave
  for (const ck of entity.candidateKeys) {
    if (JSON.stringify(ck.sort()) !== JSON.stringify([...pk].sort())) {
      fds.push({ determinant: ck, dependent: all.filter(a => !ck.includes(a)) });
    }
  }

  // FK → entidade referenciada (FD derivada de relacionamento)
  entity.attributes
    .filter(a => a.foreignKey)
    .forEach(a => {
      fds.push({ determinant: [a.name], dependent: [`${a.foreignKey!.entity}.*`] });
    });

  return fds;
}

// ════════════════════════════════════════════════════════════════
// Parser Mermaid classDiagram
// ════════════════════════════════════════════════════════════════

export function parseMermaid(content: string): DomainModel {
  const lines    = content.split('\n').map(l => l.trim()).filter(Boolean);
  const entities: Record<string, DomainEntity>        = {};
  const relationships: DomainRelationship[]            = [];
  const enums: Record<string, string[]>               = {};
  let   name     = 'domain';

  // Skip ` ```mermaid ` fences
  const body = lines
    .filter(l => !l.startsWith('```') && l !== 'classDiagram')
    .join('\n');

  // Title: %% title: MyDomain
  const titleMatch = body.match(/%%\s*title:\s*(.+)/i);
  if (titleMatch) name = titleMatch[1].trim();

  // Class definitions: class ClassName { ... }
  const classBlocks = body.matchAll(/class\s+(\w+)\s*(?:<<(\w+)>>)?\s*\{([^}]*)\}/gs);
  for (const m of classBlocks) {
    const eName    = m[1];
    const stereo   = m[2]?.toLowerCase() ?? '';  // <<entity>>, <<abstract>>, <<enum>>
    const body2    = m[3];

    if (stereo === 'enum') {
      enums[eName] = body2.split('\n')
        .map(l => l.trim()).filter(l => l && !l.startsWith('%'));
      continue;
    }

    const attrs: DomainAttribute[] = [];
    const pkCols:  string[]        = [];
    const ukCols:  string[]        = [];

    for (const line of body2.split('\n')) {
      const l = line.trim();
      if (!l || l.startsWith('%')) continue;

      // Type Name [constraints...]
      // +uuid id PK
      // +string email UK "Unique email"
      const attrMatch = l.match(/^([+\-#~]?)(\w+)\s+(\w+)(.*)/);
      if (!attrMatch) continue;
      const [, vis, rawType, attrName, rest] = attrMatch;
      const type       = mapType(rawType);
      const isPK       = /\bPK\b/.test(rest);
      const isUK       = /\bUK\b/i.test(rest);
      const isNotNull  = !rest.includes('?');
      const isFK       = /\bFK\b/.test(rest);
      const descMatch  = rest.match(/"([^"]+)"/);
      const desc       = descMatch?.[1];
      const defaultM   = rest.match(/DEFAULT\s+(\S+)/i);
      const enumRef    = rest.match(/ENUM\((\w+)\)/i);

      const attr: DomainAttribute = {
        name:        attrName,
        type:        enumRef ? 'enum' : type,
        nullable:    !isPK && !isNotNull,
        unique:      isUK || isPK,
        primaryKey:  isPK,
        constraints: [],
        description: desc,
        defaultValue: defaultM?.[1],
        enumValues:  enumRef ? enums[enumRef[1]] ?? [] : undefined,
      };
      if (isFK) {
        const fkMatch = rest.match(/FK\((\w+)\.(\w+)\)/i);
        if (fkMatch) attr.foreignKey = { entity: fkMatch[1], attribute: fkMatch[2] };
      }
      if (isPK) pkCols.push(attrName);
      if (isUK) ukCols.push(attrName);
      attrs.push(attr);
    }

    // Auto-generate id if no PK
    if (pkCols.length === 0) {
      attrs.unshift({
        name: 'id', type: 'uuid', nullable: false, unique: true,
        primaryKey: true, constraints: ['auto_generate'],
      });
      pkCols.push('id');
    }

    const entity: DomainEntity = {
      name:         eName,
      tableName:    toSnakeCase(eName) + 's',
      attributes:   attrs,
      relationships:[],
      candidateKeys: pkCols.length > 0 ? [pkCols] : [],
      primaryKey:   pkCols,
      indexes:      ukCols.map(c => ({ columns: [c], unique: true, name: `uq_${toSnakeCase(eName)}_${c}` })),
      businessRules:[],
      functionalDeps:[],
      abstract:     stereo === 'abstract',
    };
    entities[eName] = entity;
  }

  // Relationships: ClassA "1" --> "N" ClassB : label
  //                ClassA --|> ClassB (inheritance)
  //                ClassA "N" --o "M" ClassB
  const relPatterns = [
    /(\w+)\s+"([0-9*NnMm]+)"\s*(?:--|\.\.)[>\|o*]+\s*"([0-9*NnMm]+)"\s+(\w+)(?:\s*:\s*(.+))?/g,
    /(\w+)\s+(?:--|\.\.)[>\|o*]+\s*(\w+)(?:\s*:\s*(.+))?/g,
    /(\w+)\s*<\|--\s*(\w+)/g,   // inheritance
  ];

  const relBlock = body.matchAll(/(\w+)\s+("[\d*NnMm]+"[ \t]*)?(?:--|\.\.)[>\|o<*]+(?:[ \t]*"[\d*NnMm]+"[ \t]*)?(\w+)(?:[ \t]*:[ \t]*(.+))?/g);
  for (const m of relBlock) {
    const fromE = m[1]; const toE = m[3];
    const label = m[4]?.trim();
    if (!entities[fromE] || !entities[toE]) continue;
    // Parse cardinality from label or pattern
    const card = inferCardinality(m[0]);
    const rel: DomainRelationship = {
      from: fromE, to: toE, cardinality: card,
      optional: true, name: label,
      junctionTable: card === 'N:M' ? `${toSnakeCase(fromE)}_${toSnakeCase(toE)}` : undefined,
    };
    relationships.push(rel);
    entities[fromE].relationships.push(rel);
  }

  // Infer FDs for each entity
  const entityList = Object.values(entities);
  entityList.forEach(e => { e.functionalDeps = inferFunctionalDeps(e); });

  return {
    name, description: `Domain model parsed from Mermaid classDiagram`,
    version: '0.0.1', source: 'mermaid',
    entities: entityList, relationships, enums,
    createdAt: new Date().toISOString(),
  };
}

function inferCardinality(relStr: string): Cardinality {
  const s = relStr.toLowerCase();
  if (s.includes('"n"') && s.includes('"m"')) return 'N:M';
  if (s.includes('"1"') && (s.includes('"n"') || s.includes('"*"'))) return '1:N';
  if ((s.includes('"n"') || s.includes('"*"')) && s.includes('"1"')) return 'N:1';
  if (s.includes('--|>') || s.includes('<|--')) return '1:1';
  return '1:N'; // default
}

// ════════════════════════════════════════════════════════════════
// Parser PlantUML
// ════════════════════════════════════════════════════════════════

export function parsePlantUML(content: string): DomainModel {
  const lines  = content.split('\n').map(l => l.trim());
  const entities: Record<string, DomainEntity> = {};
  const relationships: DomainRelationship[]    = [];
  const enums: Record<string, string[]>        = {};
  let   name   = 'domain';

  const titleMatch = content.match(/title\s+(.+)/i);
  if (titleMatch) name = titleMatch[1].trim();

  // entity/class blocks
  const classRegex  = /(?:class|entity)\s+(\w+)\s*(?:as\s+"[^"]*")?\s*\{([^}]*)\}/gs;
  for (const m of content.matchAll(classRegex)) {
    const eName = m[1];
    const body  = m[2];
    const attrs: DomainAttribute[] = [];
    const pkCols: string[] = [];

    for (const line of body.split('\n')) {
      const l = line.trim().replace(/^[+\-#~]/, '');
      if (!l || l.startsWith("'")) continue;
      // {field} type [PK] [UK] [NOT NULL]
      const attrMatch = l.match(/(\w+)\s*:\s*(\w+)(.*)/);
      if (!attrMatch) continue;
      const [, attrName, rawType, rest] = attrMatch;
      const isPK = /<<PK>>|<<pk>>/.test(rest) || rest.includes('*');
      const isUK = /<<UK>>|<<uk>>/.test(rest);
      const attr: DomainAttribute = {
        name: attrName, type: mapType(rawType),
        nullable: !isPK, unique: isPK || isUK, primaryKey: isPK,
        constraints: [],
      };
      attrs.push(attr);
      if (isPK) pkCols.push(attrName);
    }

    if (pkCols.length === 0) {
      attrs.unshift({ name:'id', type:'uuid', nullable:false, unique:true, primaryKey:true, constraints:['auto_generate'] });
      pkCols.push('id');
    }

    entities[eName] = {
      name: eName, tableName: toSnakeCase(eName) + 's',
      attributes: attrs, relationships: [],
      candidateKeys: [pkCols], primaryKey: pkCols,
      indexes: [], businessRules: [], functionalDeps: [],
    };
  }

  // Relationships: A "1" -- "N" B
  for (const m of content.matchAll(/(\w+)\s+"([0-9*Nn]+)"\s*--\s*"([0-9*Nn]+)"\s+(\w+)(?:\s*:\s*(.+))?/g)) {
    const [,from,,, to, label] = m;
    if (!entities[from] || !entities[to]) continue;
    const card = inferCardinality(`"${m[2]}" -- "${m[3]}"`);
    const rel: DomainRelationship = { from, to, cardinality: card, optional: true, name: label?.trim() };
    relationships.push(rel);
    entities[from].relationships.push(rel);
  }

  const entityList = Object.values(entities);
  entityList.forEach(e => { e.functionalDeps = inferFunctionalDeps(e); });

  return {
    name, description: `Domain model parsed from PlantUML`,
    version: '0.0.1', source: 'plantuml',
    entities: entityList, relationships, enums,
    createdAt: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════
// Parser YAML nativo IDD
// ════════════════════════════════════════════════════════════════

export function parseYamlDomain(content: string): DomainModel {
  const raw = yaml.load(content) as Record<string, any>;
  const entities: DomainEntity[] = [];
  const enums: Record<string, string[]> = raw.enums ?? {};
  const rels: DomainRelationship[] = [];

  for (const eDef of (raw.entities ?? [])) {
    const pkCols: string[] = [];
    const attrs: DomainAttribute[] = (eDef.attributes ?? []).map((a: any) => {
      const isPK = a.constraints?.includes('primary_key') || a.primary_key;
      if (isPK) pkCols.push(a.name);
      return {
        name:        a.name,
        type:        mapType(a.type ?? 'string'),
        nullable:    !isPK && (a.nullable !== false),
        unique:      a.unique ?? isPK,
        primaryKey:  isPK ?? false,
        constraints: a.constraints ?? [],
        description: a.description,
        foreignKey:  a.foreign_key ? { entity: a.foreign_key.entity, attribute: a.foreign_key.attribute ?? 'id' } : undefined,
        enumValues:  a.enum_values,
        defaultValue: a.default,
      } satisfies DomainAttribute;
    });

    if (pkCols.length === 0) {
      attrs.unshift({ name:'id', type:'uuid', nullable:false, unique:true, primaryKey:true, constraints:['auto_generate'] });
      pkCols.push('id');
    }

    const entityRels: DomainRelationship[] = (eDef.relationships ?? []).map((r: any) => ({
      from: eDef.name, to: r.entity,
      cardinality: r.cardinality ?? '1:N',
      optional: r.optional ?? true,
      cascade: r.cascade,
      name: r.name,
      junctionTable: r.cardinality === 'N:M' ? r.junction_table : undefined,
    }));
    entityRels.forEach(r => rels.push(r));

    const entity: DomainEntity = {
      name:          eDef.name,
      tableName:     eDef.table_name ?? toSnakeCase(eDef.name) + 's',
      description:   eDef.description,
      attributes:    attrs,
      relationships: entityRels,
      candidateKeys: eDef.candidate_keys ?? [pkCols],
      primaryKey:    pkCols,
      indexes:       (eDef.indexes ?? []).map((idx: any) => ({
        columns: Array.isArray(idx) ? idx : [idx],
        unique: true,
        name: `idx_${toSnakeCase(eDef.name)}_${(Array.isArray(idx)?idx:[idx]).join('_')}`,
      })),
      businessRules: eDef.business_rules ?? [],
      functionalDeps: [],
    };
    entity.functionalDeps = inferFunctionalDeps(entity);
    entities.push(entity);
  }

  return {
    name:        raw.domain ?? raw.name ?? 'domain',
    description: raw.description,
    version:     raw.version ?? '0.0.1',
    source:      'yaml',
    entities, relationships: rels, enums,
    createdAt: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════
// Auto-detect e parse
// ════════════════════════════════════════════════════════════════

export function parseDomainFile(filePath: string): DomainModel {
  const content = fs.readFileSync(filePath, 'utf8');
  const ext     = path.extname(filePath).toLowerCase();
  const lower   = content.trimStart().toLowerCase();

  if (ext === '.puml' || ext === '.plantuml' || lower.startsWith('@startuml')) {
    return parsePlantUML(content);
  }
  if (ext === '.yaml' || ext === '.yml') {
    // Check if it's a YAML domain file or Mermaid embedded
    if (lower.includes('classDiagram') || lower.includes('classdiagram')) {
      return parseMermaid(content);
    }
    return parseYamlDomain(content);
  }
  if (ext === '.mmd' || ext === '.mermaid' || lower.includes('classdiagram')) {
    return parseMermaid(content);
  }

  // Fallback: try YAML
  try { return parseYamlDomain(content); } catch { return parseMermaid(content); }
}
