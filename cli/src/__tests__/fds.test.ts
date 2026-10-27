import { describe, it, expect } from 'vitest';
import {
  analyzeRelation, candidateKeys, closure, decomposeBCNF, equivalent, implies, isLosslessJoin,
  lostDependencies, minimalCover, projectFds, synthesize3NF, type FD,
} from '../lib/domain/fds.ts';
import { normalizeModel } from '../lib/domain/normalizer.ts';
import { parseMermaid, parseYamlDomain } from '../lib/domain/parser.ts';
import type { DomainEntity, DomainModel } from '../lib/domain/types.ts';

/** "AB->C; C->D" → DFs (maiúsculas coladas = atributos de uma letra; senão, separados por espaço) */
function F(spec: string): FD[] {
  const lado = (s: string): string[] => {
    const t = s.trim();
    return /[\s,]/.test(t) ? t.split(/[\s,]+/) : /^[A-Z]+$/.test(t) ? t.split('') : [t];
  };
  return spec.split(';').map(p => {
    const [l, r] = p.split('->');
    return { determinant: lado(l), dependent: lado(r) };
  });
}
const R = (s: string): string[] => s.split('');
const ordenar = (xs: string[][]): string[] => xs.map(x => [...x].sort().join('')).sort();

describe('fecho de atributos (Silberschatz, 7ª ed., §7.4)', () => {
  // R(A,B,C,G,H,I), F = {A→B, A→C, CG→H, CG→I, B→H}
  const f = F('A->B; A->C; CG->H; CG->I; B->H');

  it('(AG)⁺ = ABCGHI', () => {
    expect([...closure(['A', 'G'], f)].sort().join('')).toBe('ABCGHI');
  });
  it('A⁺ = ABCH', () => {
    expect([...closure(['A'], f)].sort().join('')).toBe('ABCH');
  });
  it('implicação: F ⊨ A→H e F ⊨ AG→I, mas F ⊭ A→G', () => {
    expect(implies(f, F('A->H')[0])).toBe(true);
    expect(implies(f, F('AG->I')[0])).toBe(true);
    expect(implies(f, F('A->G')[0])).toBe(false);
  });
  it('AG é a única chave candidata', () => {
    expect(candidateKeys(R('ABCGHI'), f)).toEqual([['A', 'G']]);
  });
});

describe('cobertura mínima', () => {
  it('Silberschatz: {A→BC, B→C, A→B, AB→C} reduz a {A→B, B→C}', () => {
    const f = F('A->BC; B->C; A->B; AB->C');
    const c = minimalCover(f);
    expect(c).toEqual(F('A->B; B->C'));
    expect(equivalent(f, c)).toBe(true);
  });
  it('remove atributo estranho à esquerda: {AB→C, A→B} ⇒ {A→B, A→C}', () => {
    const c = minimalCover(F('AB->C; A->B'));
    expect(ordenar(c.map(fd => [...fd.determinant, '>', ...fd.dependent]))).toEqual(ordenar([['A', '>', 'B'], ['A', '>', 'C']]));
  });
});

describe('chaves candidatas', () => {
  it('Garcia-Molina/Ullman/Widom: R(ABCD), {AB→C, C→D, D→A} tem chaves AB, BC, BD', () => {
    expect(ordenar(candidateKeys(R('ABCD'), F('AB->C; C->D; D->A')))).toEqual(['AB', 'BC', 'BD']);
  });
  it('sem DFs, a única chave é R inteira', () => {
    expect(candidateKeys(R('ABC'), [])).toEqual([['A', 'B', 'C']]);
  });
  it('ciclo A→B→C→A: cada atributo é chave', () => {
    expect(ordenar(candidateKeys(R('ABC'), F('A->B; B->C; C->A')))).toEqual(['A', 'B', 'C']);
  });
});

describe('formas normais por fecho', () => {
  it('Elmasri/Navathe EMP_PROJ: dependências parciais ⇒ só 1NF', () => {
    const r = ['Ssn', 'Pnumber', 'Hours', 'Ename', 'Pname', 'Plocation'];
    const a = analyzeRelation(r, F('Ssn Pnumber->Hours; Ssn->Ename; Pnumber->Pname Plocation'));
    expect(a.keys).toEqual([['Ssn', 'Pnumber']]);
    expect(a.normalForm).toBe('1NF');
    const parciais = a.violations.filter(v => v.form === '2NF').map(v => `${v.fd.determinant}>${v.fd.dependent}`);
    expect(parciais.sort()).toEqual(['Pnumber>Pname,Plocation', 'Ssn>Ename']);
  });

  it('Elmasri/Navathe EMP_DEPT: transitiva via Dnumber ⇒ 2NF, não 3NF', () => {
    const r = ['Ename', 'Ssn', 'Bdate', 'Address', 'Dnumber', 'Dname', 'Dmgr_ssn'];
    const a = analyzeRelation(r, F('Ssn->Ename Bdate Address Dnumber; Dnumber->Dname Dmgr_ssn'));
    expect(a.normalForm).toBe('2NF');
    expect(a.violations).toEqual([{ form: '3NF', fd: { determinant: ['Dnumber'], dependent: ['Dname', 'Dmgr_ssn'] } }]);
  });

  it('dependência parcial implícita no fecho também reprova a 2NF', () => {
    // chave AB; A→C não está declarada, mas segue de A→D e D→C
    const a = analyzeRelation(R('ABCDE'), F('AB->E; A->D; D->C'));
    expect(a.normalForm).toBe('1NF');
    expect(a.violations.find(v => v.form === '2NF')!.fd).toEqual({ determinant: ['A'], dependent: ['C', 'D'] });
  });

  it('Ullman/Widom: R(street, city, zip) está em 3NF mas não em BCNF', () => {
    const a = analyzeRelation(['street', 'city', 'zip'], F('street city->zip; zip->city'));
    expect(ordenar(a.keys.map(k => k.map(x => x[0])))).toEqual(['cs', 'sz']);
    expect(a.normalForm).toBe('3NF');
    expect(a.violations).toEqual([{ form: 'BCNF', fd: { determinant: ['zip'], dependent: ['city'] } }]);
  });

  it('R(ABCD), {AB→C, C→D, D→A}: 3NF (todos os dependentes são primos), não BCNF', () => {
    const a = analyzeRelation(R('ABCD'), F('AB->C; C->D; D->A'));
    expect(a.normalForm).toBe('3NF');
    expect(a.violations.every(v => v.form === 'BCNF')).toBe(true);
  });

  it('só chaves como determinantes ⇒ BCNF', () => {
    expect(analyzeRelation(R('ABC'), F('A->BC; B->AC')).normalForm).toBe('BCNF');
  });
});

describe('projeção e decomposição', () => {
  it('projeção de {A→B, B→C} sobre AC é {A→C}', () => {
    expect(projectFds(F('A->B; B->C'), R('AC'))).toEqual(F('A->C'));
  });

  it('chase: {AB, AC} sob A→B é sem perda; {AB, BC} sem DFs é com perda', () => {
    expect(isLosslessJoin(R('ABC'), [R('AB'), R('AC')], F('A->B'))).toBe(true);
    expect(isLosslessJoin(R('ABC'), [R('AB'), R('BC')], [])).toBe(false);
  });

  it('BCNF de R(street, city, zip): sem perda, mas perde street city → zip', () => {
    const r = ['street', 'city', 'zip'];
    const f = F('street city->zip; zip->city');
    const partes = decomposeBCNF(r, f);
    expect(ordenar(partes.map(p => p.attributes.map(x => x[0])))).toEqual(['cz', 'sz']);
    expect(isLosslessJoin(r, partes.map(p => p.attributes), f)).toBe(true);
    expect(lostDependencies(f, partes.map(p => p.attributes))).toEqual([f[0]]);
    for (const p of partes) expect(analyzeRelation(p.attributes, p.fds).normalForm).toBe('BCNF');
  });

  it('BCNF de Silberschatz R(ABCGHI) gera só relações em BCNF, sem perda', () => {
    const r = R('ABCGHI');
    const f = F('A->B; A->C; CG->H; CG->I; B->H');
    const partes = decomposeBCNF(r, f);
    expect(isLosslessJoin(r, partes.map(p => p.attributes), f)).toBe(true);
    for (const p of partes) expect(analyzeRelation(p.attributes, p.fds).normalForm).toBe('BCNF');
  });

  it('síntese 3NF de Silberschatz cust_banker_branch: 2 esquemas, sem perda e preservando DFs', () => {
    const r = ['customer_id', 'employee_id', 'branch_name', 'type'];
    const f = F('customer_id employee_id->type; employee_id->branch_name; customer_id branch_name->employee_id');
    const partes = synthesize3NF(r, f);
    expect(partes.map(p => p.attributes)).toEqual([
      ['customer_id', 'employee_id', 'type'],
      ['customer_id', 'employee_id', 'branch_name'],
    ]);
    const attrs = partes.map(p => p.attributes);
    expect(isLosslessJoin(r, attrs, f)).toBe(true);
    expect(lostDependencies(f, attrs)).toEqual([]);
    for (const p of partes) expect(['3NF', 'BCNF']).toContain(analyzeRelation(p.attributes, p.fds).normalForm);
  });

  it('síntese 3NF acrescenta uma chave quando nenhum esquema a contém', () => {
    const partes = synthesize3NF(R('ABC'), F('A->B'));
    expect(ordenar(partes.map(p => p.attributes))).toEqual(['AB', 'AC']);
  });
});

describe('normalizeModel usa o fecho', () => {
  const attr = (name: string, primaryKey = false) =>
    ({ name, type: 'string' as const, nullable: false, unique: false, primaryKey, constraints: [] });
  const modelo = (e: Partial<DomainEntity>): DomainModel => ({
    name: 't', version: '1', source: 'yaml', relationships: [], enums: {}, createdAt: '',
    entities: [{
      name: 'E', tableName: 'e', relationships: [], indexes: [], businessRules: [], candidateKeys: [],
      primaryKey: [], attributes: [], functionalDeps: [], ...e,
    }],
  });

  it('acha chaves candidatas não declaradas e reporta BCNF com decomposição', () => {
    const m = modelo({
      primaryKey: ['street', 'city'],
      attributes: [attr('street', true), attr('city', true), attr('zip')],
      functionalDeps: [{ determinant: ['zip'], dependent: ['city'] }],
    });
    const r = normalizeModel(m, 'BCNF');
    expect(ordenar(r.reports[0].keys.map(k => k.map(x => x[0])))).toEqual(['cs', 'sz']);
    expect(r.reports[0].highestNF).toBe('3NF');
    const v = r.allViolations.find(x => x.form === 'BCNF')!;
    expect(v.suggestion).toMatch(/sem perda/);
    expect(v.suggestion).toMatch(/não preserva/);
  });

  it('falha em 2NF reprova também 3NF e BCNF sem duplicar a violação', () => {
    const m = modelo({
      primaryKey: ['a', 'b'],
      attributes: [attr('a', true), attr('b', true), attr('c')],
      functionalDeps: [{ determinant: ['a'], dependent: ['c'] }],
    });
    const r = normalizeModel(m, 'BCNF');
    expect(r.reports[0].failed).toEqual(['2NF', '3NF', 'BCNF']);
    expect(r.allViolations).toHaveLength(1);
    expect(r.reports[0].highestNF).toBe('1NF');
  });
});

describe('DFs declaradas nos arquivos de domínio', () => {
  it('Mermaid: "%% DF Entidade: a, b -> c" entra no modelo e o normalizador acha a transitiva', () => {
    const m = parseMermaid([
      'classDiagram',
      '  class Endereco {',
      '    +uuid id PK',
      '    +string cep',
      '    +string cidade',
      '    +string uf',
      '  }',
      '  %% DF Endereco: cep -> cidade, uf',
    ].join('\n'));
    expect(m.entities[0].functionalDeps).toContainEqual({ determinant: ['cep'], dependent: ['cidade', 'uf'] });
    const v = normalizeModel(m, '3NF').allViolations.filter(x => x.form === '3NF');
    expect(v.map(x => x.dependency)).toEqual([{ determinant: ['cep'], dependent: ['cidade', 'uf'], isTransitive: true }]);
  });

  it('YAML: functional_dependencies aceita "→" e espaços', () => {
    const m = parseYamlDomain([
      'domain: t',
      'entities:',
      '  - name: Item',
      '    attributes:',
      '      - { name: pedido, primary_key: true }',
      '      - { name: produto, primary_key: true }',
      '      - { name: nome_produto }',
      '    candidate_keys: [[pedido, produto]]',
      '    functional_dependencies: ["produto → nome_produto"]',
    ].join('\n'));
    expect(normalizeModel(m, '2NF').allViolations.map(v => v.form)).toEqual(['2NF']);
  });
});
