// src/lib/domain/normalizer.ts — Issue #19: Normalization Engine 1NF→DKNF
import {
  DomainEntity, DomainModel, NormalizationViolation,
  NormalFormLevel, FunctionalDependency,
} from './types.ts';
import { analyzeRelation, decomposeBCNF, fmtFd, lostDependencies, type RelationAnalysis } from './fds.ts';

// ── Ordem das formas normais ─────────────────────────────────────

const NF_ORDER: NormalFormLevel[] = ['1NF','2NF','3NF','BCNF','4NF','5NF','DKNF'];
const NF_CHAIN: NormalFormLevel[] = ['2NF','3NF','BCNF'];

// ════════════════════════════════════════════════════════════════
// 1NF — Atributos atômicos, sem grupos repetitivos
// ════════════════════════════════════════════════════════════════

function check1NF(entity: DomainEntity): NormalizationViolation[] {
  const violations: NormalizationViolation[] = [];

  for (const attr of entity.attributes) {
    // Array types violam 1NF em modelo relacional
    if (attr.type === 'array') {
      violations.push({
        form:      '1NF',
        entity:    entity.name,
        attribute: attr.name,
        message:   `Atributo "${attr.name}" é do tipo array — viola atomicidade (1NF).`,
        suggestion:`Crie uma tabela separada "${entity.tableName}_${attr.name}" com FK para "${entity.tableName}".`,
      });
    }
    // JSON/JSONB sem schema definido pode esconder grupos repetitivos
    if (attr.type === 'json' || attr.type === 'jsonb') {
      if (!attr.description?.includes('schema') && attr.constraints.length === 0) {
        violations.push({
          form:      '1NF',
          entity:    entity.name,
          attribute: attr.name,
          message:   `Atributo "${attr.name}" (JSONB) sem schema declarado — pode esconder grupos repetitivos.`,
          suggestion:`Documente a estrutura esperada do JSONB com um JSON Schema ou decomponha em colunas se os campos forem acessados individualmente.`,
        });
      }
    }
    // Nome pluralizado em atributo único sugere lista embutida
    if (/[a-z]s$/.test(attr.name) && attr.type === 'string' && !attr.name.endsWith('status')) {
      violations.push({
        form:      '1NF',
        entity:    entity.name,
        attribute: attr.name,
        message:   `Atributo "${attr.name}" parece conter múltiplos valores numa string (nome plural + tipo string).`,
        suggestion:`Se "${attr.name}" contém uma lista, crie tabela associativa. Se for um único valor, renomeie no singular.`,
      });
    }
  }

  return violations;
}

// ════════════════════════════════════════════════════════════════
// 2NF · 3NF · BCNF — fecho de atributos e chaves candidatas (Armstrong; ver fds.ts)
// ════════════════════════════════════════════════════════════════

/** Esquema relacional da entidade: atributos e DFs (declaradas + PK, chaves candidatas e UNIQUE NOT NULL). */
export function entityRelation(entity: DomainEntity): { attributes: string[]; fds: FunctionalDependency[] } {
  const R  = entity.attributes.map(a => a.name);
  const Rs = new Set(R);
  const fds: FunctionalDependency[] = [];
  const chave = (k: string[]): void => {
    if (k.length && k.every(a => Rs.has(a))) fds.push({ determinant: k, dependent: R.filter(a => !k.includes(a)) });
  };
  chave(entity.primaryKey);
  entity.candidateKeys.forEach(chave);
  // UNIQUE NOT NULL fora da PK (os parsers marcam unique em cada coluna da PK, mesmo composta)
  entity.attributes.filter(a => a.unique && !a.nullable && !a.primaryKey).forEach(a => chave([a.name]));
  for (const fd of entity.functionalDeps) {
    // DFs que citam atributos de outras entidades (ex.: "Order.*") ficam fora do esquema
    if (!fd.determinant.length || !fd.determinant.every(a => Rs.has(a))) continue;
    const dependent = fd.dependent.filter(a => Rs.has(a));
    if (dependent.length) fds.push({ determinant: fd.determinant, dependent });
  }
  return { attributes: R, fds };
}

const analises = new WeakMap<DomainEntity, RelationAnalysis>();

export function analyzeEntity(entity: DomainEntity): RelationAnalysis {
  let a = analises.get(entity);
  if (!a) {
    const { attributes, fds } = entityRelation(entity);
    a = analyzeRelation(attributes, fds);
    analises.set(entity, a);
  }
  return a;
}

const conj = (xs: string[]): string => `{${xs.join(', ')}}`;

function check2NF(entity: DomainEntity): NormalizationViolation[] {
  return analyzeEntity(entity).violations.filter(v => v.form === '2NF').map(v => ({
    form:       '2NF',
    entity:     entity.name,
    dependency: { ...v.fd, isPartial: true },
    message:    `Dependência parcial: ${conj(v.fd.determinant)} → ${conj(v.fd.dependent)} — subconjunto próprio da chave candidata ${conj(v.key!)} determina atributos não primos.`,
    suggestion: `Extraia ${conj(v.fd.dependent)} para uma tabela separada com PK ${conj(v.fd.determinant)}.`,
  }));
}

function check3NF(entity: DomainEntity): NormalizationViolation[] {
  return analyzeEntity(entity).violations.filter(v => v.form === '3NF').map(v => ({
    form:       '3NF',
    entity:     entity.name,
    dependency: { ...v.fd, isTransitive: true },
    message:    `Dependência transitiva: ${conj(v.fd.determinant)} → ${conj(v.fd.dependent)} — determinante não é superchave e os dependentes não são primos.`,
    suggestion: `Crie tabela "${entity.name}_${v.fd.determinant[0]}" com PK ${conj(v.fd.determinant)} e mova ${conj(v.fd.dependent)} para ela. Mantenha apenas a FK em "${entity.tableName}".`,
  }));
}

function checkBCNF(entity: DomainEntity): NormalizationViolation[] {
  const vs = analyzeEntity(entity).violations.filter(v => v.form === 'BCNF');
  if (vs.length === 0) return [];
  const { attributes, fds } = entityRelation(entity);
  const partes = decomposeBCNF(attributes, fds);
  const perdidas = lostDependencies(analyzeEntity(entity).cover, partes.map(p => p.attributes));
  const decomposicao = partes.map((p, i) => `R${i + 1}${conj(p.attributes)}`).join(', ');
  const aviso = perdidas.length
    ? ` Atenção: não preserva ${perdidas.map(fmtFd).join('; ')} — se isso importar, fique na 3NF (síntese de Bernstein).`
    : '';
  return vs.map(v => ({
    form:       'BCNF',
    entity:     entity.name,
    dependency: v.fd,
    message:    `BCNF violada: ${conj(v.fd.determinant)} → ${conj(v.fd.dependent)} — determinante não é superchave (dependentes primos: a relação está em 3NF).`,
    suggestion: `Decomposição sem perda na junção: ${decomposicao}.${aviso}`,
  }));
}

// ════════════════════════════════════════════════════════════════
// 4NF — Sem dependências multivaloradas não-triviais
// ════════════════════════════════════════════════════════════════

function check4NF(entity: DomainEntity): NormalizationViolation[] {
  const violations: NormalizationViolation[] = [];

  // Heurística: tabelas de junção N:M com 3+ atributos além das FKs
  // geralmente escondem MVDs implícitas
  const fkAttrs = entity.attributes.filter(a => a.foreignKey);
  const nonFkNonPkAttrs = entity.attributes.filter(
    a => !a.foreignKey && !a.primaryKey && !['created_at','updated_at','deleted_at'].includes(a.name)
  );

  if (fkAttrs.length >= 2 && nonFkNonPkAttrs.length >= 2) {
    violations.push({
      form:    '4NF',
      entity:  entity.name,
      message: `Possível dependência multivalorada (MVD): tabela "${entity.tableName}" tem ${fkAttrs.length} FKs e ${nonFkNonPkAttrs.length} atributos extras — pode existir independência entre os relacionamentos.`,
      suggestion: `Verifique se "${fkAttrs.map(f=>f.name).join('" e "')}" são independentes. Se sim, decomponha em tabelas separadas por relacionamento.`,
    });
  }

  // Relacionamentos N:M múltiplos na mesma entidade
  const nmRels = entity.relationships.filter(r => r.cardinality === 'N:M');
  if (nmRels.length > 1) {
    violations.push({
      form:    '4NF',
      entity:  entity.name,
      message: `Entidade "${entity.name}" participa de ${nmRels.length} relacionamentos N:M — combinação pode criar MVDs.`,
      suggestion: `Decomponha cada relacionamento N:M em sua própria tabela de junção. MVDs: ${nmRels.map(r=>`${entity.name} ↠↠ ${r.to}`).join(', ')}.`,
    });
  }

  return violations;
}

// ════════════════════════════════════════════════════════════════
// 5NF — Sem join dependencies não-triviais
// ════════════════════════════════════════════════════════════════

function check5NF(entity: DomainEntity): NormalizationViolation[] {
  const violations: NormalizationViolation[] = [];

  // Heurística: tabela de junção ternária (3 FKs) é candidata a JD
  const fkCount = entity.attributes.filter(a => a.foreignKey).length;
  if (fkCount >= 3) {
    violations.push({
      form:    '5NF',
      entity:  entity.name,
      message: `Relação ternária detectada em "${entity.tableName}" (${fkCount} FKs) — pode conter join dependency não-trivial.`,
      suggestion: `Verifique se JOIN de pares binários reconstrói a relação original. Se não, a relação já está em 5NF. Se sim, decomponha nas relações binárias: ${
        entity.attributes.filter(a=>a.foreignKey)
          .map(a=>`${entity.name}_${a.foreignKey!.entity}`)
          .join(', ')
      }.`,
    });
  }

  return violations;
}

// ════════════════════════════════════════════════════════════════
// DKNF — Toda constraint é consequência de domain + key constraints
// ════════════════════════════════════════════════════════════════

function checkDKNF(entity: DomainEntity): NormalizationViolation[] {
  const violations: NormalizationViolation[] = [];

  // Verifica business rules que não são deriváveis de chaves ou domínios
  for (const rule of entity.businessRules) {
    // Regras que envolvem lógica de aplicação (não puramente estruturais)
    if (/deve|precisa|garantir|verificar|calcular/i.test(rule) &&
        !/único|nulo|chave|formato/i.test(rule)) {
      violations.push({
        form:    'DKNF',
        entity:  entity.name,
        message: `Regra de negócio "${rule}" não é puramente derivável de domain/key constraints.`,
        suggestion: `Avalie se esta regra pode ser expressa como CHECK constraint no banco ou deve ser tratada na camada de aplicação (não há forma de representá-la em DKNF puro).`,
      });
    }
  }

  // Atributos calculados/derivados
  const derivedAttrs = entity.attributes.filter(a =>
    a.constraints.some(c => /calcul|deriv|comput/i.test(c))
  );
  for (const attr of derivedAttrs) {
    violations.push({
      form:      'DKNF',
      entity:    entity.name,
      attribute: attr.name,
      message:   `Atributo calculado "${attr.name}" — atributos derivados violam DKNF se não são domain constraints.`,
      suggestion: `Remova "${attr.name}" da tabela e calcule em runtime (VIEW, função ou na aplicação).`,
    });
  }

  return violations;
}

// ════════════════════════════════════════════════════════════════
// Engine principal
// ════════════════════════════════════════════════════════════════

export interface NormalizationReport {
  entity:      string;
  highestNF:   NormalFormLevel;
  /** chaves candidatas calculadas pelo fecho de atributos */
  keys:        string[][];
  violations:  NormalizationViolation[];
  passed:      NormalFormLevel[];
  failed:      NormalFormLevel[];
}

export interface DomainNormalizationResult {
  model:        string;
  targetNF:     NormalFormLevel;
  reports:      NormalizationReport[];
  allViolations: NormalizationViolation[];
  conforming:   boolean;
  summary:      string;
}

export function normalizeModel(
  model: DomainModel,
  targetNF: NormalFormLevel = '3NF'
): DomainNormalizationResult {

  const targetIdx = NF_ORDER.indexOf(targetNF);
  const reports: NormalizationReport[] = [];
  const allViolations: NormalizationViolation[] = [];

  for (const entity of model.entities) {
    if (entity.abstract) continue;

    const entityViolations: NormalizationViolation[] = [];
    const passed: NormalFormLevel[]  = [];
    const failed: NormalFormLevel[]  = [];

    const checks: Array<[NormalFormLevel, (e: DomainEntity) => NormalizationViolation[]]> = [
      ['1NF',  check1NF],
      ['2NF',  check2NF],
      ['3NF',  check3NF],
      ['BCNF', checkBCNF],
      ['4NF',  check4NF],
      ['5NF',  check5NF],
      ['DKNF', checkDKNF],
    ];

    for (const [nf, checkFn] of checks) {
      const nfIdx = NF_ORDER.indexOf(nf);
      if (nfIdx > targetIdx) break; // don't check beyond target

      const vs = checkFn(entity);
      // 2NF ⊂ 3NF ⊂ BCNF: cada violação é reportada só na forma mais baixa, mas reprova as acima
      const herdada = NF_CHAIN.includes(nf) &&
        failed.some(f => NF_CHAIN.includes(f) && NF_ORDER.indexOf(f) < nfIdx);
      if (vs.length === 0 && !herdada) {
        passed.push(nf);
      } else {
        failed.push(nf);
        entityViolations.push(...vs);
      }
    }

    // Determine highest NF achieved (last passed before first failure)
    let highestNF: NormalFormLevel = '1NF';
    for (const nf of NF_ORDER) {
      if (failed.includes(nf)) break;
      if (passed.includes(nf)) highestNF = nf;
    }

    entityViolations.forEach(v => allViolations.push(v));
    reports.push({ entity: entity.name, highestNF, keys: analyzeEntity(entity).keys, violations: entityViolations, passed, failed });
  }

  const conforming = allViolations.filter(v =>
    NF_ORDER.indexOf(v.form) <= targetIdx
  ).length === 0;

  const summary = conforming
    ? `✓ Modelo "${model.name}" está em conformidade com ${targetNF}`
    : `✗ ${allViolations.length} violação(ões) encontrada(s) — modelo abaixo de ${targetNF}`;

  return { model: model.name, targetNF, reports, allViolations, conforming, summary };
}

// ── Sugestão de decomposição automática ─────────────────────────

export function suggestDecomposition(
  entity: DomainEntity,
  violations: NormalizationViolation[]
): string[] {
  const suggestions: string[] = [];

  const fnViolations = violations.filter(v => v.dependency);
  for (const v of fnViolations) {
    if (!v.dependency) continue;
    const newTableName = `${entity.tableName}_${v.dependency.determinant.join('_')}`;
    const cols = [...v.dependency.determinant, ...v.dependency.dependent].join(', ');
    suggestions.push(`CREATE TABLE ${newTableName} (${cols}) -- decomposição de ${v.form}`);
  }

  return suggestions;
}
