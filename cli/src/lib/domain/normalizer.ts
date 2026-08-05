// src/lib/domain/normalizer.ts — Issue #19: Normalization Engine 1NF→DKNF
import {
  DomainEntity, DomainModel, NormalizationViolation,
  NormalFormLevel, FunctionalDependency,
} from './types.ts';

// ── Ordem das formas normais ─────────────────────────────────────

const NF_ORDER: NormalFormLevel[] = ['1NF','2NF','3NF','BCNF','4NF','5NF','DKNF'];

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
// 2NF — Sem dependências parciais em chaves compostas
// ════════════════════════════════════════════════════════════════

function check2NF(entity: DomainEntity): NormalizationViolation[] {
  const violations: NormalizationViolation[] = [];
  const pk = entity.primaryKey;

  // 2NF só é relevante com PK composta
  if (pk.length <= 1) return violations;

  const nonKeyAttrs = entity.attributes
    .filter(a => !pk.includes(a.name))
    .map(a => a.name);

  // Verifica cada FD declarada
  for (const fd of entity.functionalDeps) {
    // Uma FD parcial tem determinante ⊂ PK (próprio subconjunto)
    const isSubsetOfPK = fd.determinant.length < pk.length &&
      fd.determinant.every(d => pk.includes(d));

    if (isSubsetOfPK) {
      const partialDeps = fd.dependent.filter(d => nonKeyAttrs.includes(d));
      if (partialDeps.length > 0) {
        violations.push({
          form:       '2NF',
          entity:     entity.name,
          dependency: fd,
          message:    `Dependência parcial: {${fd.determinant.join(', ')}} → {${partialDeps.join(', ')}} — subconjunto da PK {${pk.join(', ')}} determina atributos não-chave.`,
          suggestion: `Extraia os atributos {${partialDeps.join(', ')}} para uma tabela separada com PK {${fd.determinant.join(', ')}}.`,
        });
      }
    }
  }

  return violations;
}

// ════════════════════════════════════════════════════════════════
// 3NF — Sem dependências transitivas
// ════════════════════════════════════════════════════════════════

function check3NF(entity: DomainEntity): NormalizationViolation[] {
  const violations: NormalizationViolation[] = [];
  const pk  = new Set(entity.primaryKey);
  const cks = entity.candidateKeys.map(ck => new Set(ck));

  const isSuperkey = (cols: string[]): boolean =>
    cks.some(ck => [...ck].every(k => cols.includes(k)));

  const nonKeyAttrs = entity.attributes
    .filter(a => !pk.has(a.name))
    .map(a => a.name);

  // A → B → C onde B não é superchave → violação 3NF
  for (let i = 0; i < entity.functionalDeps.length; i++) {
    const fd1 = entity.functionalDeps[i];
    if (isSuperkey(fd1.determinant)) continue; // determinante é chave → ok

    // fd1: X → Y onde X ⊄ qualquer superchave
    const nonKeyDets = fd1.determinant.filter(d => !pk.has(d));
    if (nonKeyDets.length === 0) continue;

    const transitiveDeps = fd1.dependent.filter(d => nonKeyAttrs.includes(d));
    if (transitiveDeps.length > 0) {
      violations.push({
        form:       '3NF',
        entity:     entity.name,
        dependency: fd1,
        message:    `Dependência transitiva: {${fd1.determinant.join(', ')}} → {${transitiveDeps.join(', ')}} — determinante não é superchave.`,
        suggestion: `Crie tabela "${entity.name}_${fd1.determinant[0]}" com PK {${fd1.determinant.join(', ')}} e mova {${transitiveDeps.join(', ')}} para ela. Mantenha apenas a FK no "${entity.tableName}".`,
      });
    }
  }

  return violations;
}

// ════════════════════════════════════════════════════════════════
// BCNF — Todo determinante é superchave
// ════════════════════════════════════════════════════════════════

function checkBCNF(entity: DomainEntity): NormalizationViolation[] {
  const violations: NormalizationViolation[] = [];
  const cks = entity.candidateKeys.map(ck => new Set(ck));

  const isSuperkey = (cols: string[]): boolean =>
    cks.some(ck => [...ck].every(k => cols.includes(k)));

  for (const fd of entity.functionalDeps) {
    // FDs triviais (Y ⊆ X) são sempre ok
    const trivial = fd.dependent.every(d => fd.determinant.includes(d));
    if (trivial) continue;

    if (!isSuperkey(fd.determinant)) {
      violations.push({
        form:       'BCNF',
        entity:     entity.name,
        dependency: fd,
        message:    `BCNF violada: {${fd.determinant.join(', ')}} → {${fd.dependent.join(', ')}} — determinante não é superchave.`,
        suggestion: `Decompor em: R1({${fd.determinant.join(', ')}, ${fd.dependent.join(', ')}}) e R2({${entity.primaryKey.join(', ')}, ${fd.determinant[0]}}).`,
      });
    }
  }

  return violations;
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
      if (vs.length === 0) {
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
    reports.push({ entity: entity.name, highestNF, violations: entityViolations, passed, failed });
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
