// src/lib/context.ts — Context Manager (Issue #1)
//
// Responsabilidades:
//   1. Resolução transitiva: resolve deps de deps até MAX_DEPTH níveis
//   2. Cache por intent_hash: evita rebuscar dependência não modificada
//   3. Detecção de conflitos: duas intenções com constraints contraditórias
//   4. Formatação final do contexto para injeção no prompt do LLM

import * as fs   from 'node:fs';
import * as path from 'node:path';
import { Store }  from './store.ts';

// ── Tipos ────────────────────────────────────────────────────────

export interface DepNode {
  module:       string;       // "users/crud"
  statement:    string;
  constraints:  string[];
  acceptance:   string[];
  version:      string;
  intent_hash:  string;
  depth:        number;       // nível de profundidade no grafo
  depends_on:   string[];     // deps diretas (para resolução transitiva)
}

export interface ContextResult {
  deps:      Record<string, DepNode>;   // mapa módulo → contrato
  conflicts: ConflictWarning[];
  cached:    string[];                  // módulos servidos do cache
  resolved:  string[];                  // módulos resolvidos via API
  depth_max: number;                    // profundidade máxima atingida
}

export interface ConflictWarning {
  module_a:     string;
  module_b:     string;
  constraint_a: string;
  constraint_b: string;
  reason:       string;
}

// ── Padrões de conflito ──────────────────────────────────────────
// Pares de keywords que, se presentes em constraints de módulos diferentes,
// indicam possível contradição de contrato.

const CONFLICT_PATTERNS: Array<{
  a: RegExp;
  b: RegExp;
  reason: string;
}> = [
  {
    a: /retornar?\s+senha|expor?\s+senha|incluir?\s+senha/i,
    b: /nunca.*logar?\s+senha|não.*retornar?\s+senha|ocultar?\s+senha/i,
    reason: 'Módulo A expõe senha; módulo B proíbe exposição',
  },
  {
    a: /jwt.*expir.*\b1h\b/i,
    b: /jwt.*expir.*\b24h\b/i,
    reason: 'Expiração de JWT inconsistente entre módulos (1h vs 24h)',
  },
  {
    a: /sem\s+autenticação|público|unauthenticated/i,
    b: /requer?\s+autenticação|autenticado|authenticated/i,
    reason: 'Módulo A declara acesso público; módulo B requer autenticação',
  },
  {
    a: /soft\s*delete|arquivar/i,
    b: /delete.*permanente|remover?\s+fisicamente/i,
    reason: 'Estratégia de deleção inconsistente (soft vs hard delete)',
  },
  {
    a: /snake_case/i,
    b: /camelCase/i,
    reason: 'Convenção de nomenclatura inconsistente entre módulos',
  },
];

// ── Cache em memória (vive durante a execução do processo) ───────

interface CacheEntry {
  node:         DepNode;
  intent_hash:  string;
  cached_at:    number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function getCached(moduleKey: string, currentHash: string): DepNode | null {
  const entry = CACHE.get(moduleKey);
  if (!entry) return null;
  if (entry.intent_hash !== currentHash) return null;           // hash mudou
  if (Date.now() - entry.cached_at > CACHE_TTL_MS) return null; // expirou
  return entry.node;
}

function setCached(moduleKey: string, node: DepNode): void {
  CACHE.set(moduleKey, {
    node,
    intent_hash: node.intent_hash,
    cached_at:   Date.now(),
  });
}

export function clearCache(): void {
  CACHE.clear();
}

// ── Resolução transitiva ─────────────────────────────────────────

const DEFAULT_MAX_DEPTH = 3;

async function resolveNode(
  store:    Store,
  moduleKey: string,
  depth:    number,
  maxDepth: number,
  visited:  Set<string>,
  result:   ContextResult
): Promise<void> {
  if (depth > maxDepth) return;
  if (visited.has(moduleKey)) return;   // evita ciclos
  visited.add(moduleKey);

  const [mod, sub] = moduleKey.split('/');
  const intent = store.getIntent(mod, sub);
  if (!intent) return;

  const versions    = store.getVersions(intent.id);
  const latest      = versions[0];
  const intent_hash = latest?.intent_hash ?? '';

  // Tenta cache
  const cached = getCached(moduleKey, intent_hash);
  if (cached) {
    result.deps[moduleKey] = { ...cached, depth };
    result.cached.push(moduleKey);
    // Ainda resolve os filhos do cache para profundidade total
    for (const dep of cached.depends_on) {
      await resolveNode(store, dep, depth + 1, maxDepth, visited, result);
    }
    return;
  }

  // Resolve ao vivo — combina constraints do store + snapshot
  const storeConstraints = store.getConstraints(intent.id).map((c: any) => c.text);

  let depends_on:       string[] = [];
  let acceptance:       string[] = [];
  let snapConstraints:  string[] = [];

  if (latest?.yaml_snapshot) {
    try {
      const snap = JSON.parse(latest.yaml_snapshot) as {
        depends_on?:  string[];
        acceptance?:  string[];
        constraints?: string[];
      };
      depends_on    = snap.depends_on  ?? [];
      acceptance     = snap.acceptance  ?? [];
      snapConstraints = snap.constraints ?? [];
    } catch { /* snapshot corrompido — ignora */ }
  }

  // Snapshot é fonte de verdade quando tem mais dados
  const constraints = snapConstraints.length >= storeConstraints.length
    ? snapConstraints
    : storeConstraints;

  const node: DepNode = {
    module:      moduleKey,
    statement:   intent.statement,
    constraints,
    acceptance,
    version:     latest?.version     ?? 'n/a',
    intent_hash: latest?.intent_hash ?? '',
    depth,
    depends_on,
  };

  result.deps[moduleKey] = node;
  result.resolved.push(moduleKey);
  result.depth_max = Math.max(result.depth_max, depth);

  setCached(moduleKey, node);

  // Resolve deps transitivas
  for (const dep of depends_on) {
    await resolveNode(store, dep, depth + 1, maxDepth, visited, result);
  }
}

// ── Detecção de conflitos ────────────────────────────────────────

function detectConflicts(deps: Record<string, DepNode>): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];
  const entries = Object.entries(deps);

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [keyA, nodeA] = entries[i];
      const [keyB, nodeB] = entries[j];

      for (const { a, b, reason } of CONFLICT_PATTERNS) {
        const aInA = nodeA.constraints.some(c => a.test(c));
        const bInB = nodeB.constraints.some(c => b.test(c));
        const bInA = nodeA.constraints.some(c => b.test(c));
        const aInB = nodeB.constraints.some(c => a.test(c));

        if (aInA && bInB) {
          const ca = nodeA.constraints.find(c => a.test(c))!;
          const cb = nodeB.constraints.find(c => b.test(c))!;
          warnings.push({ module_a: keyA, module_b: keyB, constraint_a: ca, constraint_b: cb, reason });
        } else if (bInA && aInB) {
          const ca = nodeA.constraints.find(c => b.test(c))!;
          const cb = nodeB.constraints.find(c => a.test(c))!;
          warnings.push({ module_a: keyA, module_b: keyB, constraint_a: ca, constraint_b: cb, reason });
        }
      }
    }
  }

  return warnings;
}

// ── API pública ──────────────────────────────────────────────────

export interface ContextManagerOptions {
  maxDepth?: number;    // padrão: 3
  noCache?:  boolean;   // ignorar cache
}

export async function resolveContext(
  store:      Store,
  dependsOn:  string[],
  options:    ContextManagerOptions = {}
): Promise<ContextResult> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (options.noCache) clearCache();

  const result: ContextResult = {
    deps:      {},
    conflicts: [],
    cached:    [],
    resolved:  [],
    depth_max: 0,
  };

  const visited = new Set<string>();

  for (const dep of dependsOn) {
    await resolveNode(store, dep, 1, maxDepth, visited, result);
  }

  result.conflicts = detectConflicts(result.deps);

  return result;
}

// ── Formatação para o prompt ─────────────────────────────────────

export function formatContextForPrompt(ctx: ContextResult): string {
  if (Object.keys(ctx.deps).length === 0) return '';

  const lines: string[] = [
    'CONTEXTO DAS DEPENDÊNCIAS (use estes contratos ao gerar o código):',
    '',
  ];

  // Ordena por profundidade (deps diretas primeiro)
  const sorted = Object.entries(ctx.deps).sort(([, a], [, b]) => a.depth - b.depth);

  for (const [key, node] of sorted) {
    const depth_marker = '  '.repeat(node.depth - 1);
    lines.push(`${depth_marker}[${key}] v${node.version} (profundidade ${node.depth})`);
    lines.push(`${depth_marker}  Intenção: ${node.statement}`);
    if (node.constraints.length > 0) {
      lines.push(`${depth_marker}  Constraints: ${node.constraints.join(' · ')}`);
    }
    if (node.acceptance.length > 0) {
      lines.push(`${depth_marker}  Aceite: ${node.acceptance.slice(0, 2).join(' · ')}${node.acceptance.length > 2 ? ` (+${node.acceptance.length - 2})` : ''}`);
    }
    lines.push('');
  }

  if (ctx.conflicts.length > 0) {
    lines.push('⚠ CONFLITOS DE CONTRATO DETECTADOS:');
    for (const c of ctx.conflicts) {
      lines.push(`  • ${c.module_a} ↔ ${c.module_b}: ${c.reason}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Relatório de cache ───────────────────────────────────────────

export function getCacheStats(): { size: number; entries: Array<{ key: string; hash: string; age_s: number }> } {
  const now = Date.now();
  return {
    size: CACHE.size,
    entries: [...CACHE.entries()].map(([k, v]) => ({
      key:   k,
      hash:  v.intent_hash.slice(0, 8),
      age_s: Math.round((now - v.cached_at) / 1000),
    })),
  };
}
