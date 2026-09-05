// src/lib/security.ts — Issue #8: validação, .env, rate limiting
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { findProjectRoot } from './store.ts';
import { parseContract, type ContractIssue, type IntentContract } from '@idd/core';

// ── Validação de contrato (delegada ao parser canônico @idd/core) ──

export type ValidationError = ContractIssue;

export interface ValidationResult {
  valid:     boolean;
  errors:    ValidationError[];
  contract?: IntentContract;
}

export function validateIntent(obj: unknown): ValidationResult {
  const result = parseContract(obj);
  return result.ok
    ? { valid: true, errors: [], contract: result.contract }
    : { valid: false, errors: result.issues };
}

// ── .idd/.env loader ─────────────────────────────────────────────

export function loadDotEnv(projectRoot?: string): void {
  const root     = projectRoot ?? findProjectRoot() ?? process.cwd();
  const envPaths = [
    path.join(root, '.idd', '.env'),
    path.join(root, '.env'),
  ];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
    break; // only first found
  }
}

export function checkEnvInGitignore(projectRoot: string): boolean {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return false;
  const content = fs.readFileSync(gitignorePath, 'utf8');
  return content.includes('.env') || content.includes('.idd/.env');
}

export function getApiKey(projectRoot?: string): string {
  loadDotEnv(projectRoot);
  return process.env.ANTHROPIC_API_KEY ?? '';
}

// ── Rate Limiter ─────────────────────────────────────────────────

interface RateLimiterState {
  calls:      number[];   // timestamps of calls in current window
  windowMs:   number;
  maxCalls:   number;
}

const _rateLimiter: RateLimiterState = {
  calls:    [],
  windowMs: 60_000,  // 1 minute
  maxCalls: 10,
};

export interface RateLimitResult {
  allowed:      boolean;
  callsUsed:    number;
  callsLimit:   number;
  resetInMs:    number;
  resetInSecs:  number;
}

export function checkRateLimit(maxCallsOverride?: number): RateLimitResult {
  const now        = Date.now();
  const maxCalls   = maxCallsOverride ?? _rateLimiter.maxCalls;
  const windowMs   = _rateLimiter.windowMs;

  // Remove calls outside current window
  _rateLimiter.calls = _rateLimiter.calls.filter(ts => now - ts < windowMs);

  const callsUsed = _rateLimiter.calls.length;
  const allowed   = callsUsed < maxCalls;
  const oldest    = _rateLimiter.calls[0] ?? now;
  const resetInMs = allowed ? 0 : windowMs - (now - oldest);

  return {
    allowed,
    callsUsed,
    callsLimit: maxCalls,
    resetInMs,
    resetInSecs: Math.ceil(resetInMs / 1000),
  };
}

export function recordCall(): void {
  _rateLimiter.calls.push(Date.now());
}

export function resetRateLimiter(): void {
  _rateLimiter.calls = [];
}

export function getRateLimiterState() {
  const now = Date.now();
  _rateLimiter.calls = _rateLimiter.calls.filter(ts => now - ts < _rateLimiter.windowMs);
  return {
    callsUsed:   _rateLimiter.calls.length,
    callsLimit:  _rateLimiter.maxCalls,
    windowMs:    _rateLimiter.windowMs,
  };
}
