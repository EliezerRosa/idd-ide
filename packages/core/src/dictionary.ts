// Ubiquitous Dictionary (DAV Layer 0). Curated by humans, consulted offline
// by capture, verify and the LSP. No LLM involved: a term is either declared
// here or it is flagged. SHALA (Phase 2) will only *propose* entries.

import type { IntentContract, ContractIssue } from './contract.js';

export const DICTIONARY_PATH = '.intent/ubiquitous-dictionary.json';

export type TermKind = 'entity' | 'aggregate' | 'value-object' | 'event' | 'role' | 'service' | 'concept';
export const TERM_KINDS: readonly TermKind[] = ['entity', 'aggregate', 'value-object', 'event', 'role', 'service', 'concept'];

export interface DictionaryTerm {
  term: string;
  definition: string;
  kind: TermKind;
  context?: string;
  aliases: string[];
  /** Ambiguous synonyms the team agreed NOT to use; each occurrence is flagged. */
  forbidden: string[];
}

export interface UbiquitousDictionary {
  version: string;
  terms: DictionaryTerm[];
}

export type DictionaryParseResult =
  | { ok: true; dictionary: UbiquitousDictionary; issues: ContractIssue[] }
  | { ok: false; dictionary: undefined; issues: ContractIssue[] };

const TERM_PATTERN = /^[A-Z][A-Za-z0-9]*$/;
const TERM_FIELDS = new Set(['term', 'definition', 'kind', 'context', 'aliases', 'forbidden']);

export function emptyDictionary(): UbiquitousDictionary {
  return { version: '1.0', terms: [] };
}

export function parseDictionary(input: unknown): DictionaryParseResult {
  const issues: ContractIssue[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    issues.push({ field: '(root)', message: 'O dicionário deve ser um objeto JSON', example: '{ "version": "1.0", "terms": [] }' });
    return { ok: false, dictionary: undefined, issues };
  }
  const raw = input as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (key !== 'version' && key !== 'terms') {
      issues.push({ field: key, message: `Campo desconhecido "${key}" no dicionário`, value: raw[key], example: 'Use version e terms' });
    }
  }
  const version = typeof raw.version === 'string' ? raw.version : '1.0';
  if (!Array.isArray(raw.terms)) {
    issues.push({ field: 'terms', message: '"terms" deve ser uma lista', value: raw.terms, example: '"terms": [{ "term": "UserAccount", "definition": "..." }]' });
    return { ok: false, dictionary: undefined, issues };
  }
  const terms: DictionaryTerm[] = [];
  raw.terms.forEach((item, i) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      issues.push({ field: `terms[${i}]`, message: 'termo deve ser um objeto', value: item, example: '{ "term": "UserAccount", "definition": "Conta de acesso de um usuário" }' });
      return;
    }
    const t = item as Record<string, unknown>;
    for (const key of Object.keys(t)) {
      if (!TERM_FIELDS.has(key)) {
        issues.push({ field: `terms[${i}].${key}`, message: `Campo desconhecido "${key}" em termo`, value: t[key], example: `Campos: ${[...TERM_FIELDS].join(', ')}` });
      }
    }
    if (typeof t.term !== 'string' || !TERM_PATTERN.test(t.term)) {
      issues.push({ field: `terms[${i}].term`, message: 'term deve ser PascalCase (ex: UserAccount)', value: t.term, example: '"term": "UserAccount"' });
      return;
    }
    if (typeof t.definition !== 'string' || t.definition.trim().length < 10) {
      issues.push({ field: `terms[${i}].definition`, message: 'definition é obrigatória (mínimo 10 caracteres) — um termo sem definição é uma string mágica', value: t.definition, example: '"definition": "Conta de acesso de um usuário ao sistema"' });
      return;
    }
    const kind = t.kind ?? 'concept';
    if (!TERM_KINDS.includes(kind as TermKind)) {
      issues.push({ field: `terms[${i}].kind`, message: `kind deve ser um de: ${TERM_KINDS.join(', ')}`, value: kind, example: '"kind": "entity"' });
      return;
    }
    const context = typeof t.context === 'string' ? t.context : undefined;
    if (t.context !== undefined && typeof t.context !== 'string') {
      issues.push({ field: `terms[${i}].context`, message: 'context deve ser string', value: t.context, example: '"context": "auth"' });
    }
    const aliases = strList(t.aliases, `terms[${i}].aliases`, issues);
    const forbidden = strList(t.forbidden, `terms[${i}].forbidden`, issues);
    const clash = aliases.filter(a => forbidden.some(f => f.toLowerCase() === a.toLowerCase()));
    if (clash.length) {
      issues.push({ field: `terms[${i}]`, message: `"${clash.join(', ')}" não pode ser alias e forbidden ao mesmo tempo`, value: clash, example: 'Um sinônimo é aceito OU proibido' });
    }
    terms.push({ term: t.term, definition: t.definition, kind: kind as TermKind, context, aliases, forbidden });
  });

  const seen = new Map<string, number>();
  terms.forEach((t, i) => {
    const key = t.term.toLowerCase();
    if (seen.has(key)) issues.push({ field: `terms[${i}].term`, message: `termo duplicado "${t.term}"`, value: t.term, example: 'Cada termo aparece uma vez' });
    seen.set(key, i);
  });
  // A forbidden word of one term cannot be the canonical name or alias of another.
  const accepted = new Set(terms.flatMap(t => [t.term, ...t.aliases]).map(s => s.toLowerCase()));
  terms.forEach((t, i) => {
    for (const f of t.forbidden) {
      if (accepted.has(f.toLowerCase())) {
        issues.push({ field: `terms[${i}].forbidden`, message: `"${f}" é proibido aqui mas aceito em outro termo — ambiguidade no dicionário`, value: f, example: 'Resolva o conflito entre os termos' });
      }
    }
  });

  if (issues.length > 0) return { ok: false, dictionary: undefined, issues };
  return { ok: true, dictionary: { version, terms }, issues };
}

function strList(value: unknown, field: string, issues: ContractIssue[]): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some(x => typeof x !== 'string' || !x.trim())) {
    issues.push({ field, message: 'deve ser lista de strings não vazias', value, example: `"${field.split('.').pop()}": ["..."]` });
    return [];
  }
  return value as string[];
}

// ── Lookup ─────────────────────────────────────────────────────────

export function findTerm(dict: UbiquitousDictionary, word: string): DictionaryTerm | undefined {
  const w = word.toLowerCase();
  return dict.terms.find(t => t.term.toLowerCase() === w || t.aliases.some(a => a.toLowerCase() === w));
}

export function isKnownTerm(dict: UbiquitousDictionary, word: string): boolean {
  return findTerm(dict, word) !== undefined;
}

// ── Checking ───────────────────────────────────────────────────────

export interface TermWarning {
  kind: 'unknown' | 'forbidden';
  term: string;
  field: string;
  /** Canonical term to use instead (forbidden) */
  suggestion?: string;
  message: string;
}

export interface TextField { field: string; text: string }

/** PascalCase tokens are treated as domain concepts (entities, aggregates, roles). */
const CONCEPT_TOKEN = /\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b/g;
// Common English/PT-BR technical nouns that look like concepts but are not domain terms.
const IGNORED_TOKENS = new Set(['JavaScript', 'TypeScript', 'GitHub', 'PostgreSQL', 'MongoDB', 'GraphQL', 'OpenAPI', 'JsonWebToken', 'OAuth']);

export function contractTextFields(contract: IntentContract): TextField[] {
  const fields: TextField[] = [{ field: 'intent', text: contract.intent }];
  contract.constraints.forEach((c, i) => fields.push({ field: `constraints[${i}]`, text: c.description }));
  contract.acceptance.forEach((a, i) => fields.push({ field: `acceptance[${i}]`, text: [a.given, a.when, a.then].filter(Boolean).join(' ') }));
  if (contract.targetClass) fields.push({ field: 'target_class', text: contract.targetClass.split('.').join(' ') });
  return fields;
}

export function checkTextTerms(dict: UbiquitousDictionary, fields: TextField[]): TermWarning[] {
  const warnings: TermWarning[] = [];
  const reported = new Set<string>();
  for (const { field, text } of fields) {
    for (const m of text.matchAll(CONCEPT_TOKEN)) {
      const token = m[0];
      if (IGNORED_TOKENS.has(token)) continue;
      const key = `${field}:${token.toLowerCase()}`;
      if (reported.has(key)) continue;
      if (!isKnownTerm(dict, token)) {
        reported.add(key);
        warnings.push({ kind: 'unknown', term: token, field, message: `"${token}" não está no Dicionário Ubíquo — defina-o com idd dictionary add ${token} "definição"` });
      }
    }
    for (const t of dict.terms) {
      for (const f of t.forbidden) {
        const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(f)}(?![\\p{L}\\p{N}_])`, 'iu');
        if (re.test(text)) {
          const key = `${field}:forbidden:${f.toLowerCase()}`;
          if (reported.has(key)) continue;
          reported.add(key);
          warnings.push({ kind: 'forbidden', term: f, field, suggestion: t.term, message: `"${f}" é sinônimo ambíguo — use o termo canônico "${t.term}"` });
        }
      }
    }
  }
  return warnings;
}

export function checkContractTerms(dict: UbiquitousDictionary, contract: IntentContract): TermWarning[] {
  return checkTextTerms(dict, contractTextFields(contract));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
