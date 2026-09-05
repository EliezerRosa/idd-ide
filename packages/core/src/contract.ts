// Canonical IDD contract model. Single parser consumed by CLI, LSP and UI.
// Accepts v1 (module-scoped) and v2 (method-circumscribed) shapes and
// normalises both into one IntentContract.

export type ContractVersion = '1.0' | '2.0';
export type Severity = 'critical' | 'warn';
export type ConstraintType = 'invariant' | 'encapsulation' | 'security' | 'performance' | 'business';
export type Visibility = 'public' | 'protected' | 'private' | 'internal';
export type Language = 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java';

export const LANGUAGES: readonly Language[] = ['typescript', 'javascript', 'python', 'go', 'rust', 'java'];
export const CONSTRAINT_TYPES: readonly ConstraintType[] = ['invariant', 'encapsulation', 'security', 'performance', 'business'];
export const VISIBILITIES: readonly Visibility[] = ['public', 'protected', 'private', 'internal'];
export const MODULE_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+$/;
export const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
export const CLASS_PATTERN = /^[A-Z][A-Za-z0-9_]*(\.[A-Z][A-Za-z0-9_]*)*$/;
export const METHOD_PATTERN = /^[a-z_][A-Za-z0-9_]*$/;

export interface Constraint {
  id: string;
  type: ConstraintType;
  severity: Severity;
  description: string;
}

export interface Acceptance {
  id: string;
  given: string;
  when: string;
  then: string;
}

export interface StateMutation {
  allowedFields: string[];
  readOnlyFields: string[];
}

export interface BehavioralContract {
  visibility: Visibility;
  stateMutation: StateMutation;
}

export interface Ethics {
  impacted: string[];
  risks: string[];
}

export interface IntentContract {
  version: ContractVersion;
  intent: string;
  module: string;
  boundedContext: string;
  name: string;
  targetClass?: string;
  targetMethod?: string;
  behavioralContract: BehavioralContract;
  constraints: Constraint[];
  acceptance: Acceptance[];
  dependsOn: string[];
  usedBy: string[];
  language?: Language;
  framework?: string;
  tags: string[];
  semver?: string;
  ethics?: Ethics;
}

export interface ContractIssue {
  field: string;
  message: string;
  value?: unknown;
  example: string;
}

export type ParseResult =
  | { ok: true; contract: IntentContract; issues: ContractIssue[] }
  | { ok: false; contract: undefined; issues: ContractIssue[] };

const V1_FIELDS = new Set([
  'intent', 'module', 'constraints', 'acceptance',
  'depends_on', 'used_by', 'language', 'framework', 'tags', 'version', 'state_mutation',
]);

const V2_FIELDS = new Set([
  ...V1_FIELDS,
  'target_class', 'target_method', 'behavioral_contract', 'ethics',
]);

export function knownFields(version: ContractVersion): ReadonlySet<string> {
  return version === '2.0' ? V2_FIELDS : V1_FIELDS;
}

export function detectVersion(raw: Record<string, unknown>): ContractVersion {
  if (raw.version === '2.0') return '2.0';
  if ('target_class' in raw || 'target_method' in raw || 'behavioral_contract' in raw || 'ethics' in raw) return '2.0';
  if (Array.isArray(raw.constraints) && raw.constraints.some(c => typeof c === 'object' && c !== null)) return '2.0';
  if (Array.isArray(raw.acceptance) && raw.acceptance.some(a => typeof a === 'object' && a !== null)) return '2.0';
  return '1.0';
}

export function parseContract(input: unknown): ParseResult {
  const issues: ContractIssue[] = [];

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    issues.push({ field: '(root)', message: 'O arquivo .intent.yaml deve ser um objeto YAML, não uma lista ou valor primitivo', example: 'intent: "Minha intenção"\nmodule: auth/login' });
    return { ok: false, contract: undefined, issues };
  }

  const raw = input as Record<string, unknown>;
  const version = detectVersion(raw);
  const allowed = knownFields(version);

  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      issues.push({ field: key, message: `Campo desconhecido "${key}" — não permitido pelo schema v${version}`, value: raw[key], example: `Remova o campo "${key}" ou verifique o nome correto` });
    }
  }

  const intent = requireString(raw, 'intent', 10, issues, '"Autenticar usuário com e-mail e senha, retornando JWT válido por 24h"');
  const module = requireString(raw, 'module', 1, issues, '"auth/login"  (formato: dominio/funcionalidade)');
  if (module && !MODULE_PATTERN.test(module)) {
    issues.push({ field: 'module', message: '"module" tem formato inválido', value: module, example: 'module: auth/login' });
  }

  const targetClass = optionalString(raw, 'target_class', issues);
  if (targetClass && !CLASS_PATTERN.test(targetClass)) {
    issues.push({ field: 'target_class', message: '"target_class" deve ser um caminho de classe (ex: Domain.Auth.UserAccount)', value: targetClass, example: 'target_class: Domain.Auth.UserAccount' });
  }
  const targetMethod = optionalString(raw, 'target_method', issues);
  if (targetMethod && !METHOD_PATTERN.test(targetMethod)) {
    issues.push({ field: 'target_method', message: '"target_method" deve ser um identificador de método', value: targetMethod, example: 'target_method: registerFailedLoginAttempt' });
  }
  if ((targetClass && !targetMethod) || (!targetClass && targetMethod)) {
    issues.push({ field: 'target_class', message: 'target_class e target_method devem ser declarados juntos', example: 'target_class: Domain.Auth.UserAccount\ntarget_method: registerFailedLoginAttempt' });
  }

  const constraints = parseConstraints(raw.constraints, issues);
  const acceptance = parseAcceptance(raw.acceptance, issues);
  const dependsOn = parseModuleList(raw, 'depends_on', issues);
  const usedBy = parseModuleList(raw, 'used_by', issues);
  const tags = parseStringList(raw.tags, 'tags', issues);

  const language = optionalString(raw, 'language', issues) as Language | undefined;
  if (language && !LANGUAGES.includes(language)) {
    issues.push({ field: 'language', message: `"language" deve ser um de: ${LANGUAGES.join(', ')}`, value: language, example: 'language: typescript' });
  }
  const framework = optionalString(raw, 'framework', issues);

  const semver = optionalString(raw, 'version', issues);
  if (semver && semver !== '2.0' && !SEMVER_PATTERN.test(semver)) {
    issues.push({ field: 'version', message: '"version" deve ser semver ou "2.0"', value: semver, example: 'version: "1.0.0"' });
  }

  const behavioralContract = parseBehavioralContract(raw, issues);
  const ethics = parseEthics(raw.ethics, issues);

  if (issues.length > 0 || !intent || !module) {
    return { ok: false, contract: undefined, issues };
  }

  const [boundedContext, ...rest] = module.split('/');
  return {
    ok: true,
    issues,
    contract: {
      version,
      intent,
      module,
      boundedContext,
      name: rest.join('/'),
      targetClass,
      targetMethod,
      behavioralContract,
      constraints,
      acceptance,
      dependsOn,
      usedBy,
      language,
      framework,
      tags,
      semver: semver === '2.0' ? undefined : semver,
      ethics,
    },
  };
}

export function circumscriptionId(contract: IntentContract): string {
  return contract.targetClass && contract.targetMethod
    ? `${contract.targetClass}.${contract.targetMethod}`
    : contract.module;
}

export function matchesIntentId(contract: IntentContract, id: string, fileBasename?: string): boolean {
  return id === contract.module
    || id === contract.name
    || id === contract.targetMethod
    || id === circumscriptionId(contract)
    || (fileBasename !== undefined && id === fileBasename);
}

// ── helpers ──────────────────────────────────────────────────────

function requireString(raw: Record<string, unknown>, field: string, minLength: number, issues: ContractIssue[], example: string): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null) {
    issues.push({ field, message: `Campo obrigatório "${field}" está ausente`, example: `${field}: ${example}` });
    return undefined;
  }
  if (typeof value !== 'string') {
    issues.push({ field, message: `"${field}" deve ser uma string`, value, example: `${field}: ${example}` });
    return undefined;
  }
  if (value.length < minLength) {
    issues.push({ field, message: `"${field}" muito curto (mínimo ${minLength} caracteres, atual: ${value.length})`, value, example: `${field}: ${example}` });
  }
  return value;
}

function optionalString(raw: Record<string, unknown>, field: string, issues: ContractIssue[]): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    issues.push({ field, message: `"${field}" deve ser uma string`, value, example: `${field}: "..."` });
    return undefined;
  }
  return value;
}

function parseStringList(value: unknown, field: string, issues: ContractIssue[]): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    issues.push({ field, message: `"${field}" deve ser uma lista YAML`, value, example: `${field}:\n  - "item"` });
    return [];
  }
  const out: string[] = [];
  value.forEach((item, i) => {
    if (typeof item !== 'string') {
      issues.push({ field: `${field}[${i}]`, message: `Item ${i} de "${field}" deve ser uma string`, value: item, example: `${field}:\n  - "texto"` });
    } else if (item.trim().length === 0) {
      issues.push({ field: `${field}[${i}]`, message: `Item ${i} de "${field}" não pode ser vazio`, value: item, example: `${field}:\n  - "texto"` });
    } else {
      out.push(item);
    }
  });
  return out;
}

function parseModuleList(raw: Record<string, unknown>, field: string, issues: ContractIssue[]): string[] {
  const list = parseStringList(raw[field], field, issues);
  list.forEach((item, i) => {
    if (!MODULE_PATTERN.test(item)) {
      issues.push({ field: `${field}[${i}]`, message: `"${item}" tem formato inválido (esperado: modulo/sub)`, value: item, example: `${field}:\n  - users/crud` });
    }
  });
  return list;
}

function parseConstraints(value: unknown, issues: ContractIssue[]): Constraint[] {
  return parseContractConstraintList(value, 'constraints', issues, true);
}

export function parseContractConstraintList(value: unknown, field: string, issues: ContractIssue[], required: boolean): Constraint[] {
  if (value === undefined || value === null) {
    if (required) issues.push({ field, message: `Campo obrigatório "${field}" está ausente`, example: `${field}:\n  - "senha >= 8 caracteres"` });
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push({ field, message: `"${field}" deve ser uma lista YAML`, value, example: `${field}:\n  - "regra"` });
    return [];
  }
  if (value.length === 0 && required) {
    issues.push({ field, message: `"${field}" precisa de ao menos 1 item (atual: 0)`, value, example: `${field}:\n  - "regra"` });
  }
  return value.flatMap((item, i) => {
    if (typeof item === 'string') {
      if (item.trim().length < 5) {
        issues.push({ field: `${field}[${i}]`, message: `Constraint ${i} muito curta (mínimo 5 caracteres)`, value: item, example: `${field}:\n  - "senha >= 8 caracteres"` });
        return [];
      }
      return [{ id: `C-${String(i + 1).padStart(2, '0')}`, type: 'business' as ConstraintType, severity: 'critical' as Severity, description: item }];
    }
    if (typeof item !== 'object' || item === null) {
      issues.push({ field: `${field}[${i}]`, message: `Constraint ${i} deve ser string ou objeto`, value: item, example: `${field}:\n  - id: C-01\n    type: invariant\n    severity: critical\n    description: "..."` });
      return [];
    }
    const c = item as Record<string, unknown>;
    const id = typeof c.id === 'string' && c.id ? c.id : `C-${String(i + 1).padStart(2, '0')}`;
    const type = c.type ?? 'business';
    const severity = c.severity ?? 'critical';
    const description = c.description;
    if (!CONSTRAINT_TYPES.includes(type as ConstraintType)) {
      issues.push({ field: `${field}[${i}].type`, message: `type deve ser um de: ${CONSTRAINT_TYPES.join(', ')}`, value: type, example: 'type: invariant' });
    }
    if (severity !== 'critical' && severity !== 'warn') {
      issues.push({ field: `${field}[${i}].severity`, message: 'severity deve ser critical ou warn', value: severity, example: 'severity: critical' });
    }
    if (typeof description !== 'string' || description.trim().length < 5) {
      issues.push({ field: `${field}[${i}].description`, message: 'description é obrigatória (mínimo 5 caracteres)', value: description, example: 'description: "A transição só ocorre se count >= 5"' });
      return [];
    }
    return [{ id, type: type as ConstraintType, severity: severity as Severity, description }];
  });
}

function parseAcceptance(value: unknown, issues: ContractIssue[]): Acceptance[] {
  if (value === undefined || value === null) {
    issues.push({ field: 'acceptance', message: 'Campo obrigatório "acceptance" está ausente', example: 'acceptance:\n  - "login válido retorna JWT"' });
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push({ field: 'acceptance', message: '"acceptance" deve ser uma lista YAML', value, example: 'acceptance:\n  - "critério"' });
    return [];
  }
  if (value.length === 0) {
    issues.push({ field: 'acceptance', message: '"acceptance" precisa de ao menos 1 item (atual: 0)', value, example: 'acceptance:\n  - "critério"' });
  }
  return value.flatMap((item, i) => {
    const id = `A-${String(i + 1).padStart(2, '0')}`;
    if (typeof item === 'string') {
      if (item.trim().length < 5) {
        issues.push({ field: `acceptance[${i}]`, message: `Critério ${i} muito curto (mínimo 5 caracteres)`, value: item, example: 'acceptance:\n  - "login válido retorna 200 + JWT"' });
        return [];
      }
      return [{ id, given: '', when: '', then: item }];
    }
    if (typeof item !== 'object' || item === null) {
      issues.push({ field: `acceptance[${i}]`, message: `Critério ${i} deve ser string ou objeto Given/When/Then`, value: item, example: 'acceptance:\n  - given: "..."\n    when: "..."\n    then: "..."' });
      return [];
    }
    const a = item as Record<string, unknown>;
    const given = typeof a.given === 'string' ? a.given : '';
    const when = typeof a.when === 'string' ? a.when : '';
    const then = a.then;
    if (typeof then !== 'string' || then.trim().length === 0) {
      issues.push({ field: `acceptance[${i}].then`, message: 'then é obrigatório em critério estruturado', value: then, example: 'then: "failedAttemptsCount passa para 5"' });
      return [];
    }
    return [{ id: typeof a.id === 'string' && a.id ? a.id : id, given, when, then }];
  });
}

function parseBehavioralContract(raw: Record<string, unknown>, issues: ContractIssue[]): BehavioralContract {
  const empty: BehavioralContract = { visibility: 'public', stateMutation: { allowedFields: [], readOnlyFields: [] } };

  const legacy = raw.state_mutation;
  const modern = raw.behavioral_contract;
  if (legacy !== undefined && modern !== undefined) {
    issues.push({ field: 'behavioral_contract', message: 'Use state_mutation (v1) OU behavioral_contract (v2), não ambos', example: 'behavioral_contract:\n  state_mutation:\n    allowed_fields: [...]' });
  }

  const source = modern ?? (legacy !== undefined ? { state_mutation: legacy } : undefined);
  if (source === undefined) return empty;
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    issues.push({ field: modern !== undefined ? 'behavioral_contract' : 'state_mutation', message: 'deve ser um objeto', value: source, example: 'behavioral_contract:\n  visibility: public\n  state_mutation:\n    allowed_fields: [...]' });
    return empty;
  }

  const bc = source as Record<string, unknown>;
  for (const key of Object.keys(bc)) {
    if (key !== 'visibility' && key !== 'state_mutation') {
      issues.push({ field: `behavioral_contract.${key}`, message: `Campo desconhecido "${key}" em behavioral_contract`, value: bc[key], example: 'Use visibility e state_mutation' });
    }
  }

  let visibility: Visibility = 'public';
  if (bc.visibility !== undefined) {
    if (!VISIBILITIES.includes(bc.visibility as Visibility)) {
      issues.push({ field: 'behavioral_contract.visibility', message: `visibility deve ser um de: ${VISIBILITIES.join(', ')}`, value: bc.visibility, example: 'visibility: public' });
    } else {
      visibility = bc.visibility as Visibility;
    }
  }

  const sm = bc.state_mutation;
  const prefix = modern !== undefined ? 'behavioral_contract.state_mutation' : 'state_mutation';
  if (sm === undefined) return { visibility, stateMutation: { allowedFields: [], readOnlyFields: [] } };
  if (typeof sm !== 'object' || sm === null || Array.isArray(sm)) {
    issues.push({ field: prefix, message: '"state_mutation" deve ser um objeto', value: sm, example: `${prefix}:\n  allowed_fields: ["fieldName"]` });
    return { visibility, stateMutation: { allowedFields: [], readOnlyFields: [] } };
  }
  const smo = sm as Record<string, unknown>;
  for (const key of Object.keys(smo)) {
    if (key !== 'allowed_fields' && key !== 'read_only_fields') {
      issues.push({ field: `${prefix}.${key}`, message: `Campo desconhecido "${key}" em state_mutation`, value: smo[key], example: 'Use allowed_fields e read_only_fields' });
    }
  }
  const allowedFields = parseFieldList(smo.allowed_fields, `${prefix}.allowed_fields`, issues);
  const readOnlyFields = parseFieldList(smo.read_only_fields, `${prefix}.read_only_fields`, issues);
  const overlap = allowedFields.filter(f => readOnlyFields.includes(f));
  if (overlap.length > 0) {
    issues.push({ field: prefix, message: `Campos em allowed_fields e read_only_fields simultaneamente: ${overlap.join(', ')}`, value: overlap, example: 'Um campo é mutável OU somente leitura, nunca ambos' });
  }
  return { visibility, stateMutation: { allowedFields, readOnlyFields } };
}

function parseFieldList(value: unknown, field: string, issues: ContractIssue[]): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(f => typeof f !== 'string' || f.trim().length === 0)) {
    issues.push({ field, message: `"${field.split('.').pop()}" deve ser uma lista de strings não vazias`, value, example: `${field}:\n  - failedLoginCount` });
    return [];
  }
  return value as string[];
}

function parseEthics(value: unknown, issues: ContractIssue[]): Ethics | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    issues.push({ field: 'ethics', message: '"ethics" deve ser um objeto', value, example: 'ethics:\n  impacted: ["usuários finais"]\n  risks: ["bloqueio indevido"]' });
    return undefined;
  }
  const e = value as Record<string, unknown>;
  for (const key of Object.keys(e)) {
    if (key !== 'impacted' && key !== 'risks') {
      issues.push({ field: `ethics.${key}`, message: `Campo desconhecido "${key}" em ethics`, value: e[key], example: 'Use impacted e risks' });
    }
  }
  return {
    impacted: parseStringList(e.impacted, 'ethics.impacted', issues),
    risks: parseStringList(e.risks, 'ethics.risks', issues),
  };
}
