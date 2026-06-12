// src/lib/security.ts — Issue #8: validação, .env, rate limiting
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { findProjectRoot } from './store.ts';

// ── JSON Schema validator (sem dependência externa) ──────────────

export interface ValidationError {
  field:   string;
  message: string;
  value?:  unknown;
  example: string;
}

export interface ValidationResult {
  valid:  boolean;
  errors: ValidationError[];
}

// Regras inline derivadas do JSON Schema em schemas/intent.schema.json
const REQUIRED_FIELDS = ['intent', 'module', 'constraints', 'acceptance'] as const;

const FIELD_RULES: Record<string, {
  type:       string;
  minLength?: number;
  minItems?:  number;
  pattern?:   RegExp;
  itemType?:  string;
  example:    string;
}> = {
  intent: {
    type: 'string', minLength: 10,
    example: '"Autenticar usuário com e-mail e senha, retornando JWT válido por 24h"',
  },
  module: {
    type: 'string', pattern: /^[a-z0-9-]+\/[a-z0-9-]+$/,
    example: '"auth/login"  (formato: dominio/funcionalidade)',
  },
  constraints: {
    type: 'array', minItems: 1, itemType: 'string',
    example: '["senha >= 8 caracteres", "bloquear após 5 tentativas"]',
  },
  acceptance: {
    type: 'array', minItems: 1, itemType: 'string',
    example: '["login válido retorna JWT", "senha errada retorna 401"]',
  },
  language: {
    type: 'string',
    example: '"typescript"  (opções: typescript, python, go, javascript, rust, java)',
  },
  framework: {
    type: 'string',
    example: '"express"',
  },
  depends_on: {
    type: 'array', itemType: 'string',
    example: '["users/crud", "db/connection"]',
  },
  used_by: {
    type: 'array', itemType: 'string',
    example: '["dashboard/access"]',
  },
  version: {
    type: 'string', pattern: /^\d+\.\d+\.\d+$/,
    example: '"1.0.0"',
  },
};

const VALID_LANGUAGES = ['typescript','javascript','python','go','rust','java'];
const VALID_FIELD_NAMES = new Set(Object.keys(FIELD_RULES).concat(REQUIRED_FIELDS as unknown as string[]));

export function validateIntent(obj: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    errors.push({
      field:   '(root)',
      message: 'O arquivo .intent.yaml deve ser um objeto YAML, não uma lista ou valor primitivo',
      example: 'intent: "Minha intenção"\nmodule: auth/login',
    });
    return { valid: false, errors };
  }

  const data = obj as Record<string, unknown>;

  // 1. Campos obrigatórios
  for (const field of REQUIRED_FIELDS) {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      errors.push({
        field,
        message: `Campo obrigatório "${field}" está ausente`,
        example: `${field}: ${FIELD_RULES[field]?.example ?? '...'}`,
      });
    }
  }

  // 2. Campos extras não permitidos
  for (const key of Object.keys(data)) {
    if (!VALID_FIELD_NAMES.has(key)) {
      errors.push({
        field:   key,
        message: `Campo desconhecido "${key}" — não permitido pelo schema`,
        value:   data[key],
        example: `Remova o campo "${key}" ou verifique o nome correto`,
      });
    }
  }

  // 3. Validação de tipo e regras de cada campo
  for (const [field, rules] of Object.entries(FIELD_RULES)) {
    if (!(field in data)) continue;
    const val = data[field];

    if (rules.type === 'string') {
      if (typeof val !== 'string') {
        errors.push({ field, message: `"${field}" deve ser uma string`, value: val, example: `${field}: ${rules.example}` });
        continue;
      }
      if (rules.minLength && val.length < rules.minLength) {
        errors.push({
          field,
          message: `"${field}" muito curto (mínimo ${rules.minLength} caracteres, atual: ${val.length})`,
          value: val,
          example: `${field}: ${rules.example}`,
        });
      }
      if (rules.pattern && !rules.pattern.test(val)) {
        errors.push({
          field,
          message: `"${field}" tem formato inválido`,
          value: val,
          example: `${field}: ${rules.example}`,
        });
      }
      // language validation
      if (field === 'language' && !VALID_LANGUAGES.includes(val)) {
        errors.push({
          field,
          message: `"language" deve ser um de: ${VALID_LANGUAGES.join(', ')}`,
          value: val,
          example: `language: ${rules.example}`,
        });
      }
    }

    if (rules.type === 'array') {
      if (!Array.isArray(val)) {
        errors.push({ field, message: `"${field}" deve ser uma lista YAML`, value: val, example: `${field}:\n  - ${rules.example?.replace(/[\[\]"]/g, '').split(',')[0].trim()}` });
        continue;
      }
      if (rules.minItems && val.length < rules.minItems) {
        errors.push({
          field,
          message: `"${field}" precisa de ao menos ${rules.minItems} item(ns) (atual: ${val.length})`,
          value: val,
          example: `${field}:\n  ${rules.example}`,
        });
      }
      if (rules.itemType === 'string') {
        val.forEach((item, i) => {
          if (typeof item !== 'string') {
            errors.push({
              field: `${field}[${i}]`,
              message: `Item ${i} de "${field}" deve ser uma string`,
              value: item,
              example: `${field}:\n  - "texto descritivo"`,
            });
          } else if (item.trim().length === 0) {
            errors.push({
              field: `${field}[${i}]`,
              message: `Item ${i} de "${field}" não pode ser vazio`,
              value: item,
              example: `${field}:\n  - "descrição clara"`,
            });
          }
        });
        // module pattern check for depends_on / used_by
        if (field === 'depends_on' || field === 'used_by') {
          (val as string[]).forEach((item, i) => {
            if (typeof item === 'string' && !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(item)) {
              errors.push({
                field: `${field}[${i}]`,
                message: `"${item}" tem formato inválido (esperado: modulo/sub)`,
                value: item,
                example: `${field}:\n  - users/crud`,
              });
            }
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
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
