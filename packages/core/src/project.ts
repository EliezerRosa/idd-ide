// Canonical model for project.intent.yaml (Layer 1 of the IDD contract stack).
// Declares bounded contexts, their allowed dependencies, lifecycle phase
// policies, governance and global constraints. Consumed by CLI, LSP and UI.

import { parseContractConstraintList, type Constraint, type ContractIssue } from './contract.js';

export type LifecyclePhase = 'exploratory' | 'consolidation' | 'production';
export const LIFECYCLE_PHASES: readonly LifecyclePhase[] = ['exploratory', 'consolidation', 'production'];

export type AnemicSeverity = 'warn' | 'critical' | 'off';

export interface PhasePolicy {
  maxWaiverDurationDays: number;
  anemicModelSeverity: AnemicSeverity;
}

// Ratified 2026-09-04: waiver 30/14/7d, anemic model warn/critical/critical.
export const DEFAULT_PHASE_POLICIES: Readonly<Record<LifecyclePhase, PhasePolicy>> = {
  exploratory:   { maxWaiverDurationDays: 30, anemicModelSeverity: 'warn' },
  consolidation: { maxWaiverDurationDays: 14, anemicModelSeverity: 'critical' },
  production:    { maxWaiverDurationDays: 7,  anemicModelSeverity: 'critical' },
};

export interface Role {
  name: string;
  canApproveWaivers: boolean;
  canChangePhase: boolean;
}

export interface WaiverPolicy {
  requiresApprovalFrom: string[];
  maxDurationDays?: number;
}

export interface Governance {
  roles: Role[];
  waiverPolicy: WaiverPolicy;
}

export interface BoundedContext {
  name: string;
  status?: string;
  paths: string[];
  packages: string[];
  allowedDependencies: string[];
  aggregates: unknown[];
}

export interface ProjectIntent {
  version: string;
  name?: string;
  lifecycle: { phase: LifecyclePhase; policies: Record<LifecyclePhase, PhasePolicy> };
  governance: Governance;
  globalConstraints: Constraint[];
  boundedContexts: BoundedContext[];
}

export type ProjectParseResult =
  | { ok: true; project: ProjectIntent; issues: ContractIssue[] }
  | { ok: false; project: undefined; issues: ContractIssue[] };

const ROOT_FIELDS = new Set(['version', 'name', 'lifecycle_status', 'governance', 'global_constraints', 'bounded_contexts']);
const CONTEXT_FIELDS = new Set(['name', 'status', 'path', 'paths', 'package', 'packages', 'allowed_dependencies', 'aggregates']);
const CONTEXT_NAME = /^[a-z0-9][a-z0-9-]*$/;

export function parseProject(input: unknown): ProjectParseResult {
  const issues: ContractIssue[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    issues.push({ field: '(root)', message: 'project.intent.yaml deve ser um objeto YAML', example: 'bounded_contexts:\n  - name: auth' });
    return { ok: false, project: undefined, issues };
  }
  const raw = input as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!ROOT_FIELDS.has(key)) {
      issues.push({ field: key, message: `Campo desconhecido "${key}" em project.intent.yaml`, value: raw[key], example: `Campos válidos: ${[...ROOT_FIELDS].join(', ')}` });
    }
  }

  const version = typeof raw.version === 'string' ? raw.version : '1.0';
  const name = typeof raw.name === 'string' ? raw.name : undefined;
  if (raw.name !== undefined && typeof raw.name !== 'string') {
    issues.push({ field: 'name', message: '"name" deve ser uma string', value: raw.name, example: 'name: idd-ide' });
  }

  const lifecycle = parseLifecycle(raw.lifecycle_status, issues);
  const governance = parseGovernance(raw.governance, issues);
  const globalConstraints = raw.global_constraints === undefined
    ? []
    : parseContractConstraintList(raw.global_constraints, 'global_constraints', issues, false);
  const boundedContexts = parseContexts(raw.bounded_contexts, issues);

  if (issues.length > 0) return { ok: false, project: undefined, issues };
  return { ok: true, issues, project: { version, name, lifecycle, governance, globalConstraints, boundedContexts } };
}

function parseLifecycle(value: unknown, issues: ContractIssue[]): ProjectIntent['lifecycle'] {
  const policies: Record<LifecyclePhase, PhasePolicy> = {
    exploratory: { ...DEFAULT_PHASE_POLICIES.exploratory },
    consolidation: { ...DEFAULT_PHASE_POLICIES.consolidation },
    production: { ...DEFAULT_PHASE_POLICIES.production },
  };
  if (value === undefined || value === null) return { phase: 'exploratory', policies };
  if (typeof value !== 'object' || Array.isArray(value)) {
    issues.push({ field: 'lifecycle_status', message: '"lifecycle_status" deve ser um objeto', value, example: 'lifecycle_status:\n  phase: exploratory' });
    return { phase: 'exploratory', policies };
  }
  const ls = value as Record<string, unknown>;
  for (const key of Object.keys(ls)) {
    if (key !== 'phase' && key !== 'phase_policies') {
      issues.push({ field: `lifecycle_status.${key}`, message: `Campo desconhecido "${key}" em lifecycle_status`, value: ls[key], example: 'Use phase e phase_policies' });
    }
  }
  let phase: LifecyclePhase = 'exploratory';
  if (ls.phase !== undefined) {
    if (!LIFECYCLE_PHASES.includes(ls.phase as LifecyclePhase)) {
      issues.push({ field: 'lifecycle_status.phase', message: `phase deve ser um de: ${LIFECYCLE_PHASES.join(', ')}`, value: ls.phase, example: 'phase: exploratory' });
    } else {
      phase = ls.phase as LifecyclePhase;
    }
  }
  if (ls.phase_policies !== undefined) {
    if (typeof ls.phase_policies !== 'object' || ls.phase_policies === null || Array.isArray(ls.phase_policies)) {
      issues.push({ field: 'lifecycle_status.phase_policies', message: '"phase_policies" deve ser um objeto por fase', value: ls.phase_policies, example: 'phase_policies:\n  production:\n    max_waiver_duration_days: 7' });
    } else {
      const pp = ls.phase_policies as Record<string, unknown>;
      for (const [k, v] of Object.entries(pp)) {
        if (!LIFECYCLE_PHASES.includes(k as LifecyclePhase)) {
          issues.push({ field: `lifecycle_status.phase_policies.${k}`, message: `Fase desconhecida "${k}"`, value: v, example: `Fases: ${LIFECYCLE_PHASES.join(', ')}` });
          continue;
        }
        const target = policies[k as LifecyclePhase];
        if (typeof v !== 'object' || v === null || Array.isArray(v)) {
          issues.push({ field: `lifecycle_status.phase_policies.${k}`, message: 'política de fase deve ser um objeto', value: v, example: 'max_waiver_duration_days: 7\nanemic_model_severity: critical' });
          continue;
        }
        const p = v as Record<string, unknown>;
        for (const key of Object.keys(p)) {
          if (key !== 'max_waiver_duration_days' && key !== 'anemic_model_severity') {
            issues.push({ field: `lifecycle_status.phase_policies.${k}.${key}`, message: `Campo desconhecido "${key}"`, value: p[key], example: 'Use max_waiver_duration_days e anemic_model_severity' });
          }
        }
        if (p.max_waiver_duration_days !== undefined) {
          const d = p.max_waiver_duration_days;
          if (typeof d !== 'number' || !Number.isInteger(d) || d < 1) {
            issues.push({ field: `lifecycle_status.phase_policies.${k}.max_waiver_duration_days`, message: 'deve ser inteiro >= 1', value: d, example: 'max_waiver_duration_days: 7' });
          } else if (d > DEFAULT_PHASE_POLICIES[k as LifecyclePhase].maxWaiverDurationDays) {
            issues.push({ field: `lifecycle_status.phase_policies.${k}.max_waiver_duration_days`, message: `não pode exceder o teto da fase (${DEFAULT_PHASE_POLICIES[k as LifecyclePhase].maxWaiverDurationDays} dias)`, value: d, example: `max_waiver_duration_days: ${DEFAULT_PHASE_POLICIES[k as LifecyclePhase].maxWaiverDurationDays}` });
          } else {
            target.maxWaiverDurationDays = d;
          }
        }
        if (p.anemic_model_severity !== undefined) {
          const s = p.anemic_model_severity;
          if (s !== 'warn' && s !== 'critical' && s !== 'off') {
            issues.push({ field: `lifecycle_status.phase_policies.${k}.anemic_model_severity`, message: 'deve ser warn, critical ou off', value: s, example: 'anemic_model_severity: critical' });
          } else if (k !== 'exploratory' && s !== 'critical') {
            issues.push({ field: `lifecycle_status.phase_policies.${k}.anemic_model_severity`, message: `anemic model é critical obrigatório na fase ${k}`, value: s, example: 'anemic_model_severity: critical' });
          } else {
            target.anemicModelSeverity = s;
          }
        }
      }
    }
  }
  return { phase, policies };
}

function parseGovernance(value: unknown, issues: ContractIssue[]): Governance {
  const empty: Governance = { roles: [], waiverPolicy: { requiresApprovalFrom: [] } };
  if (value === undefined || value === null) return empty;
  if (typeof value !== 'object' || Array.isArray(value)) {
    issues.push({ field: 'governance', message: '"governance" deve ser um objeto', value, example: 'governance:\n  roles:\n    - name: architect\n      can_approve_waivers: true' });
    return empty;
  }
  const g = value as Record<string, unknown>;
  for (const key of Object.keys(g)) {
    if (key !== 'roles' && key !== 'waiver_policy') {
      issues.push({ field: `governance.${key}`, message: `Campo desconhecido "${key}" em governance`, value: g[key], example: 'Use roles e waiver_policy' });
    }
  }
  const roles: Role[] = [];
  if (g.roles !== undefined) {
    if (!Array.isArray(g.roles)) {
      issues.push({ field: 'governance.roles', message: '"roles" deve ser uma lista', value: g.roles, example: 'roles:\n  - name: architect' });
    } else {
      g.roles.forEach((r, i) => {
        if (typeof r !== 'object' || r === null || typeof (r as Record<string, unknown>).name !== 'string') {
          issues.push({ field: `governance.roles[${i}]`, message: 'papel deve ter "name"', value: r, example: '- name: architect\n  can_approve_waivers: true' });
          return;
        }
        const ro = r as Record<string, unknown>;
        for (const key of Object.keys(ro)) {
          if (key !== 'name' && key !== 'can_approve_waivers' && key !== 'can_change_phase') {
            issues.push({ field: `governance.roles[${i}].${key}`, message: `Campo desconhecido "${key}" em role`, value: ro[key], example: 'Use name, can_approve_waivers, can_change_phase' });
          }
        }
        roles.push({ name: ro.name as string, canApproveWaivers: ro.can_approve_waivers === true, canChangePhase: ro.can_change_phase === true });
      });
    }
  }
  const waiverPolicy: WaiverPolicy = { requiresApprovalFrom: [] };
  if (g.waiver_policy !== undefined) {
    if (typeof g.waiver_policy !== 'object' || g.waiver_policy === null || Array.isArray(g.waiver_policy)) {
      issues.push({ field: 'governance.waiver_policy', message: '"waiver_policy" deve ser um objeto', value: g.waiver_policy, example: 'waiver_policy:\n  requires_approval_from: [architect]' });
    } else {
      const wp = g.waiver_policy as Record<string, unknown>;
      for (const key of Object.keys(wp)) {
        if (key !== 'requires_approval_from' && key !== 'max_duration_days') {
          issues.push({ field: `governance.waiver_policy.${key}`, message: `Campo desconhecido "${key}" em waiver_policy`, value: wp[key], example: 'Use requires_approval_from e max_duration_days' });
        }
      }
      if (wp.requires_approval_from !== undefined) {
        if (!Array.isArray(wp.requires_approval_from) || wp.requires_approval_from.some(x => typeof x !== 'string')) {
          issues.push({ field: 'governance.waiver_policy.requires_approval_from', message: 'deve ser lista de nomes de papéis', value: wp.requires_approval_from, example: 'requires_approval_from: [architect]' });
        } else {
          waiverPolicy.requiresApprovalFrom = wp.requires_approval_from as string[];
          const roleNames = new Set(roles.map(r => r.name));
          for (const rn of waiverPolicy.requiresApprovalFrom) {
            if (!roleNames.has(rn)) {
              issues.push({ field: 'governance.waiver_policy.requires_approval_from', message: `papel "${rn}" não está declarado em governance.roles`, value: rn, example: 'roles:\n  - name: architect\n    can_approve_waivers: true' });
            } else if (!roles.find(r => r.name === rn)!.canApproveWaivers) {
              issues.push({ field: 'governance.waiver_policy.requires_approval_from', message: `papel "${rn}" não tem can_approve_waivers: true`, value: rn, example: 'can_approve_waivers: true' });
            }
          }
        }
      }
      if (wp.max_duration_days !== undefined) {
        if (typeof wp.max_duration_days !== 'number' || !Number.isInteger(wp.max_duration_days) || wp.max_duration_days < 1) {
          issues.push({ field: 'governance.waiver_policy.max_duration_days', message: 'deve ser inteiro >= 1', value: wp.max_duration_days, example: 'max_duration_days: 7' });
        } else {
          waiverPolicy.maxDurationDays = wp.max_duration_days;
        }
      }
    }
  }
  return { roles, waiverPolicy };
}

function parseContexts(value: unknown, issues: ContractIssue[]): BoundedContext[] {
  if (value === undefined || value === null) {
    issues.push({ field: 'bounded_contexts', message: 'Campo obrigatório "bounded_contexts" está ausente', example: 'bounded_contexts:\n  - name: auth\n    path: src/auth' });
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push({ field: 'bounded_contexts', message: '"bounded_contexts" deve ser uma lista', value, example: 'bounded_contexts:\n  - name: auth' });
    return [];
  }
  const contexts: BoundedContext[] = [];
  value.forEach((item, i) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      issues.push({ field: `bounded_contexts[${i}]`, message: 'contexto deve ser um objeto', value: item, example: '- name: auth\n  path: src/auth' });
      return;
    }
    const c = item as Record<string, unknown>;
    for (const key of Object.keys(c)) {
      if (!CONTEXT_FIELDS.has(key)) {
        issues.push({ field: `bounded_contexts[${i}].${key}`, message: `Campo desconhecido "${key}" em bounded_context`, value: c[key], example: `Campos válidos: ${[...CONTEXT_FIELDS].join(', ')}` });
      }
    }
    if (typeof c.name !== 'string' || !CONTEXT_NAME.test(c.name)) {
      issues.push({ field: `bounded_contexts[${i}].name`, message: 'name é obrigatório, minúsculo, [a-z0-9-]', value: c.name, example: 'name: auth' });
      return;
    }
    const status = typeof c.status === 'string' ? c.status : undefined;
    const paths = [...strList(c.path, `bounded_contexts[${i}].path`, issues), ...strList(c.paths, `bounded_contexts[${i}].paths`, issues)]
      .map(normalizeRel);
    const packages = [...strList(c.package, `bounded_contexts[${i}].package`, issues), ...strList(c.packages, `bounded_contexts[${i}].packages`, issues)];
    const allowedDependencies = strList(c.allowed_dependencies, `bounded_contexts[${i}].allowed_dependencies`, issues);
    if (allowedDependencies.includes(c.name)) {
      issues.push({ field: `bounded_contexts[${i}].allowed_dependencies`, message: 'contexto não deve listar a si mesmo', value: c.name, example: 'allowed_dependencies: [core]' });
    }
    const aggregates = Array.isArray(c.aggregates) ? c.aggregates : [];
    contexts.push({ name: c.name, status, paths, packages, allowedDependencies, aggregates });
  });

  const names = new Set<string>();
  contexts.forEach((ctx, i) => {
    if (names.has(ctx.name)) {
      issues.push({ field: `bounded_contexts[${i}].name`, message: `contexto duplicado "${ctx.name}"`, value: ctx.name, example: 'Cada contexto deve ter nome único' });
    }
    names.add(ctx.name);
  });
  contexts.forEach((ctx, i) => {
    for (const dep of ctx.allowedDependencies) {
      if (!names.has(dep)) {
        issues.push({ field: `bounded_contexts[${i}].allowed_dependencies`, message: `dependência "${dep}" não é um contexto declarado`, value: dep, example: `Contextos: ${[...names].join(', ')}` });
      }
    }
  });
  // A path owned by two contexts makes ownership ambiguous.
  const owners = new Map<string, string>();
  contexts.forEach((ctx, i) => {
    for (const p of ctx.paths) {
      const prev = owners.get(p);
      if (prev && prev !== ctx.name) {
        issues.push({ field: `bounded_contexts[${i}].path`, message: `path "${p}" já pertence ao contexto "${prev}"`, value: p, example: 'Cada path pertence a um único contexto' });
      }
      owners.set(p, ctx.name);
    }
  });
  return contexts;
}

function strList(value: unknown, field: string, issues: ContractIssue[]): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') return value.trim() ? [value] : [];
  if (!Array.isArray(value) || value.some(x => typeof x !== 'string' || !x.trim())) {
    issues.push({ field, message: 'deve ser string ou lista de strings não vazias', value, example: `${field.split('.').pop()}: [valor]` });
    return [];
  }
  return value as string[];
}

export function normalizeRel(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

// ── Import governance ─────────────────────────────────────────────

export interface ImportViolation {
  file: string;
  line: number;
  specifier: string;
  fromContext: string;
  toContext: string;
  severity: 'critical';
  message: string;
}

export interface ImportRef {
  specifier: string;
  line: number;
}

const IMPORT_RE = /(?:^|[^\w$])(?:import|export)\s*(?:[\w*{}\s,$]*?\s*from\s*)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;

export function extractImports(source: string): ImportRef[] {
  const refs: ImportRef[] = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((text, i) => {
    const trimmed = text.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    IMPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMPORT_RE.exec(text)) !== null) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (spec) refs.push({ specifier: spec, line: i + 1 });
    }
  });
  return refs;
}

/** Longest-prefix match of a repo-relative path to a declared context. */
export function contextForPath(project: ProjectIntent, relPath: string): BoundedContext | undefined {
  const norm = normalizeRel(relPath);
  let best: BoundedContext | undefined;
  let bestLen = -1;
  for (const ctx of project.boundedContexts) {
    for (const p of ctx.paths) {
      if ((norm === p || norm.startsWith(p + '/')) && p.length > bestLen) {
        best = ctx;
        bestLen = p.length;
      }
    }
  }
  return best;
}

export function contextForPackage(project: ProjectIntent, specifier: string): BoundedContext | undefined {
  return project.boundedContexts.find(ctx => ctx.packages.some(pkg => specifier === pkg || specifier.startsWith(pkg + '/')));
}

export function isDependencyAllowed(from: BoundedContext, to: BoundedContext): boolean {
  return from.name === to.name || from.allowedDependencies.includes(to.name);
}

/**
 * Resolves a specifier against the declared contexts. `resolveRelative` maps a
 * relative specifier to a repo-relative path (filesystem access lives in the caller).
 */
export function checkFileImports(
  project: ProjectIntent,
  relFile: string,
  source: string,
  resolveRelative: (fromFile: string, specifier: string) => string | undefined,
): ImportViolation[] {
  const from = contextForPath(project, relFile);
  if (!from) return [];
  const violations: ImportViolation[] = [];
  for (const ref of extractImports(source)) {
    let to: BoundedContext | undefined;
    if (ref.specifier.startsWith('.') || ref.specifier.startsWith('/')) {
      const target = resolveRelative(relFile, ref.specifier);
      to = target ? contextForPath(project, target) : undefined;
    } else {
      to = contextForPackage(project, ref.specifier);
    }
    if (to && !isDependencyAllowed(from, to)) {
      violations.push({
        file: relFile,
        line: ref.line,
        specifier: ref.specifier,
        fromContext: from.name,
        toContext: to.name,
        severity: 'critical',
        message: `Importação ilegal: contexto "${from.name}" não declara dependência de "${to.name}" (allowed_dependencies)`,
      });
    }
  }
  return violations;
}
