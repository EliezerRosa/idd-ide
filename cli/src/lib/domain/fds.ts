// src/lib/domain/fds.ts — Teoria de dependências funcionais (axiomas de Armstrong)
// Fecho de atributos, cobertura mínima, chaves candidatas, formas normais 2NF/3NF/BCNF,
// projeção de DFs, decomposição BCNF, síntese 3NF (Bernstein), junção sem perda (chase)
// e preservação de dependências. Algoritmos de Ullman/Widom, Silberschatz e Elmasri/Navathe.
import type { FunctionalDependency } from './types.ts';

export type FD = FunctionalDependency;

/** Limite de atributos para os algoritmos exponenciais (chaves, projeção). */
export const MAX_EXPONENTIAL_ATTRS = 20;

const fmt = (xs: Iterable<string>): string => `{${[...xs].join(', ')}}`;
export const fmtFd = (fd: FD): string => `${fmt(fd.determinant)} → ${fmt(fd.dependent)}`;

/** Ordena atributos pela ordem de R (estável e determinística). */
function inOrder(R: readonly string[], xs: Iterable<string>): string[] {
  const s = new Set(xs);
  return R.filter(a => s.has(a));
}

const subset = (xs: Iterable<string>, ys: Set<string>): boolean => [...xs].every(x => ys.has(x));

// ── Fecho e implicação ──────────────────────────────────────────

/** X⁺ sob F: todos os atributos determinados por X (reflexividade, aumento e transitividade). */
export function closure(X: Iterable<string>, F: readonly FD[]): Set<string> {
  const out = new Set(X);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const fd of F) {
      if (subset(fd.determinant, out)) {
        for (const a of fd.dependent) if (!out.has(a)) { out.add(a); mudou = true; }
      }
    }
  }
  return out;
}

/** F ⊨ X → Y ? */
export function implies(F: readonly FD[], fd: FD): boolean {
  return subset(fd.dependent, closure(fd.determinant, F));
}

/** F e G geram o mesmo fecho? */
export function equivalent(F: readonly FD[], G: readonly FD[]): boolean {
  return G.every(fd => implies(F, fd)) && F.every(fd => implies(G, fd));
}

export function isSuperkey(X: Iterable<string>, R: readonly string[], F: readonly FD[]): boolean {
  return subset(R, closure(X, F));
}

// ── Cobertura mínima ────────────────────────────────────────────

/** Atributos usados em F, na ordem de primeira aparição. */
function attrsOf(F: readonly FD[]): string[] {
  const s = new Set<string>();
  for (const fd of F) { fd.determinant.forEach(a => s.add(a)); fd.dependent.forEach(a => s.add(a)); }
  return [...s];
}

/**
 * Cobertura mínima (canônica com lado direito unitário):
 * 1) lado direito unitário e sem DFs triviais; 2) sem atributos estranhos à esquerda;
 * 3) sem DFs redundantes. O resultado é equivalente a F.
 */
export function minimalCover(F: readonly FD[], R: readonly string[] = attrsOf(F)): FD[] {
  const key = (fd: FD): string => `${fd.determinant.join(',')}→${fd.dependent.join(',')}`;
  let G: FD[] = [];
  const vistos = new Set<string>();
  for (const fd of F) {
    const lhs = inOrder(R, fd.determinant);
    for (const a of fd.dependent) {
      if (lhs.includes(a)) continue;
      const nova = { determinant: lhs, dependent: [a] };
      if (!vistos.has(key(nova))) { vistos.add(key(nova)); G.push(nova); }
    }
  }

  // atributos estranhos no lado esquerdo
  G = G.map(fd => {
    let lhs = fd.determinant;
    for (const b of fd.determinant) {
      if (lhs.length <= 1) break;
      const menor = lhs.filter(x => x !== b);
      if (closure(menor, G).has(fd.dependent[0])) lhs = menor;
    }
    return { determinant: lhs, dependent: fd.dependent };
  });
  const unicas = new Map(G.map(fd => [key(fd), fd]));
  G = [...unicas.values()];

  // DFs redundantes
  for (let i = 0; i < G.length; ) {
    const resto = G.filter((_, j) => j !== i);
    if (implies(resto, G[i])) G = resto; else i++;
  }
  return G;
}

/** Agrupa DFs com o mesmo lado esquerdo (X → A, X → B ⇒ X → AB). */
export function combineByDeterminant(F: readonly FD[], R: readonly string[] = attrsOf(F)): FD[] {
  const grupos = new Map<string, FD>();
  for (const fd of F) {
    const k = inOrder(R, fd.determinant).join(',');
    const g = grupos.get(k) ?? { determinant: inOrder(R, fd.determinant), dependent: [] };
    g.dependent = inOrder(R, new Set([...g.dependent, ...fd.dependent]));
    grupos.set(k, g);
  }
  return [...grupos.values()];
}

// ── Chaves candidatas ───────────────────────────────────────────

function* subsetsBySize<T>(xs: readonly T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) { yield acc.slice(); return; }
  for (let i = start; i <= xs.length - (k - acc.length); i++) {
    acc.push(xs[i]);
    yield* subsetsBySize(xs, k, i + 1, acc);
    acc.pop();
  }
}

/**
 * Todas as chaves candidatas (superchaves mínimas) de R sob F.
 * Atributos que nunca aparecem à direita pertencem a toda chave; os que só aparecem
 * à direita não pertencem a nenhuma; os demais são testados por tamanho crescente.
 */
export function candidateKeys(R: readonly string[], F: readonly FD[]): string[][] {
  const Rs = new Set(R);
  const Fr = F.map(fd => ({
    determinant: fd.determinant.filter(a => Rs.has(a)),
    dependent: fd.dependent.filter(a => Rs.has(a)),
  })).filter((fd, i) => F[i].determinant.every(a => Rs.has(a)));
  const naDireita = new Set(Fr.flatMap(fd => fd.dependent.filter(a => !fd.determinant.includes(a))));
  const naEsquerda = new Set(Fr.flatMap(fd => fd.determinant));
  const nucleo = R.filter(a => !naDireita.has(a));
  if (isSuperkey(nucleo, R, Fr)) return [nucleo];

  const meio = R.filter(a => naDireita.has(a) && naEsquerda.has(a));
  if (meio.length > MAX_EXPONENTIAL_ATTRS) {
    throw new Error(`candidateKeys: ${meio.length} atributos ambíguos (limite ${MAX_EXPONENTIAL_ATTRS})`);
  }
  const chaves: string[][] = [];
  for (let k = 1; k <= meio.length; k++) {
    for (const extra of subsetsBySize(meio, k)) {
      if (chaves.some(c => c.every(a => nucleo.includes(a) || extra.includes(a)))) continue;
      const X = [...nucleo, ...extra];
      if (isSuperkey(X, R, Fr)) chaves.push(inOrder(R, X));
    }
  }
  return chaves;
}

export function primeAttributes(keys: readonly string[][]): Set<string> {
  return new Set(keys.flat());
}

// ── Formas normais ──────────────────────────────────────────────

export type FdNormalForm = '1NF' | '2NF' | '3NF' | 'BCNF';

export interface FdViolation {
  /** forma normal mais baixa que a dependência viola */
  form: '2NF' | '3NF' | 'BCNF';
  fd: FD;
  /** chave candidata da qual o determinante é subconjunto próprio (só 2NF) */
  key?: string[];
}

export interface RelationAnalysis {
  attributes: string[];
  keys: string[][];
  prime: string[];
  cover: FD[];
  normalForm: FdNormalForm;
  violations: FdViolation[];
}

/**
 * Analisa R sob F. Cada violação é reportada uma única vez, na forma mais baixa que viola:
 * 2NF — atributo não primo depende de subconjunto próprio de uma chave candidata;
 * 3NF — X → A com X não superchave e A não primo (sem ser parcial);
 * BCNF — X → A com X não superchave e A primo.
 */
export function analyzeRelation(R: readonly string[], F: readonly FD[]): RelationAnalysis {
  const Rs = new Set(R);
  const Fr = F.filter(fd => fd.determinant.every(a => Rs.has(a)))
    .map(fd => ({ determinant: fd.determinant, dependent: fd.dependent.filter(a => Rs.has(a)) }));
  const cover = minimalCover(Fr, R);
  const keys = candidateKeys(R, cover);
  const prime = primeAttributes(keys);
  const violations: FdViolation[] = [];

  // 2NF: dependências parciais (inclusive as implícitas no fecho)
  const parciais = new Set<string>();
  for (const key of keys) {
    for (let k = 1; k < key.length; k++) {
      for (const S of subsetsBySize(key, k)) {
        const dep = inOrder(R, [...closure(S, cover)].filter(a => !S.includes(a) && !prime.has(a) && !parciais.has(a)));
        if (dep.length === 0) continue;
        dep.forEach(a => parciais.add(a));
        violations.push({ form: '2NF', fd: { determinant: S, dependent: dep }, key });
      }
    }
  }

  // 3NF e BCNF: basta testar uma cobertura de F
  const naoSuper = cover.filter(fd => !isSuperkey(fd.determinant, R, cover));
  const n3 = naoSuper.filter(fd => !prime.has(fd.dependent[0]) && !parciais.has(fd.dependent[0]));
  const bc = naoSuper.filter(fd => prime.has(fd.dependent[0]));
  for (const fd of combineByDeterminant(n3, R)) violations.push({ form: '3NF', fd });
  for (const fd of combineByDeterminant(bc, R)) violations.push({ form: 'BCNF', fd });

  const formas = new Set(violations.map(v => v.form));
  const normalForm: FdNormalForm = formas.has('2NF') ? '1NF'
    : formas.has('3NF') ? '2NF'
    : formas.has('BCNF') ? '3NF'
    : 'BCNF';
  return { attributes: [...R], keys, prime: inOrder(R, prime), cover, normalForm, violations };
}

// ── Projeção, decomposição e propriedades ───────────────────────

/** Projeção de F sobre S (fecho de cada subconjunto de S), reduzida a cobertura mínima. */
export function projectFds(F: readonly FD[], S: readonly string[]): FD[] {
  if (S.length > MAX_EXPONENTIAL_ATTRS) {
    throw new Error(`projectFds: ${S.length} atributos (limite ${MAX_EXPONENTIAL_ATTRS})`);
  }
  const Ss = new Set(S);
  const out: FD[] = [];
  for (let k = 1; k < S.length; k++) {
    for (const X of subsetsBySize(S, k)) {
      const dep = [...closure(X, F)].filter(a => Ss.has(a) && !X.includes(a));
      if (dep.length) out.push({ determinant: X, dependent: inOrder(S, dep) });
    }
  }
  return minimalCover(out, S);
}

export interface Relation {
  attributes: string[];
  fds: FD[];
  keys: string[][];
}

function relacao(attributes: string[], F: readonly FD[]): Relation {
  const fds = projectFds(F, attributes);
  return { attributes, fds: combineByDeterminant(fds, attributes), keys: candidateKeys(attributes, fds) };
}

/**
 * Decomposição BCNF (sempre sem perda na junção; pode não preservar dependências).
 * Divide Ri por uma DF violadora X → Y em (X⁺ ∩ Ri) e Ri − (X⁺ − X).
 */
export function decomposeBCNF(R: readonly string[], F: readonly FD[]): Relation[] {
  const pronto: Relation[] = [];
  const fila: string[][] = [[...R]];
  while (fila.length) {
    const Ri = fila.shift()!;
    const Fi = projectFds(F, Ri);
    const viol = Fi.find(fd => !isSuperkey(fd.determinant, Ri, Fi));
    if (!viol) { pronto.push(relacao(Ri, F)); continue; }
    const Xp = closure(viol.determinant, Fi);
    fila.unshift(Ri.filter(a => Xp.has(a)), Ri.filter(a => !Xp.has(a) || viol.determinant.includes(a)));
  }
  return pronto;
}

/**
 * Síntese 3NF de Bernstein: uma relação por lado esquerdo da cobertura mínima, mais uma
 * chave candidata se nenhuma relação a contiver; remove relações contidas em outras.
 * Garante junção sem perda e preservação de dependências.
 */
export function synthesize3NF(R: readonly string[], F: readonly FD[]): Relation[] {
  const cover = minimalCover(F, R);
  const esquemas = combineByDeterminant(cover, R).map(fd => inOrder(R, [...fd.determinant, ...fd.dependent]));
  const keys = candidateKeys(R, cover);
  if (!esquemas.some(s => keys.some(k => k.every(a => s.includes(a))))) esquemas.push(keys[0]);
  const finais = esquemas.filter((s, i) =>
    !esquemas.some((t, j) => j !== i && s.every(a => t.includes(a)) && (t.length > s.length || j < i)));
  return finais.map(s => relacao(s, cover));
}

/** Teste de junção sem perda pelo algoritmo do chase (tableau). */
export function isLosslessJoin(R: readonly string[], parts: readonly string[][], F: readonly FD[]): boolean {
  const col = new Map(R.map((a, i) => [a, i]));
  const T: string[][] = parts.map((P, i) => R.map(a => (P.includes(a) ? 'a' : `b${i}`)));
  const fds = minimalCover(F, R);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const fd of fds) {
      const xs = fd.determinant.map(a => col.get(a)!);
      const y = col.get(fd.dependent[0])!;
      for (let i = 0; i < T.length; i++) {
        for (let j = i + 1; j < T.length; j++) {
          if (!xs.every(c => T[i][c] === T[j][c]) || T[i][y] === T[j][y]) continue;
          const [de, para] = T[i][y] === 'a' || (T[j][y] !== 'a' && T[i][y] < T[j][y])
            ? [T[j][y], T[i][y]] : [T[i][y], T[j][y]];
          for (const row of T) if (row[y] === de) row[y] = para;
          mudou = true;
        }
      }
    }
    if (T.some(row => row.every(v => v === 'a'))) return true;
  }
  return T.some(row => row.every(v => v === 'a'));
}

/** DFs de F que não são preservadas pela decomposição (teste polinomial de Ullman). */
export function lostDependencies(F: readonly FD[], parts: readonly string[][]): FD[] {
  return F.filter(fd => {
    let Z = new Set(fd.determinant);
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const P of parts) {
        const Ps = new Set(P);
        for (const a of closure([...Z].filter(x => Ps.has(x)), F)) {
          if (Ps.has(a) && !Z.has(a)) { Z.add(a); mudou = true; }
        }
      }
    }
    return !subset(fd.dependent, Z);
  });
}
