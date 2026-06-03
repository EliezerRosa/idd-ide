// src/lib/config.ts — configurações por projeto (.idd/config.yaml)
import * as fs   from 'node:fs';
import * as path from 'node:path';
import yaml      from 'js-yaml';
import { findProjectRoot } from './store.ts';

export interface IddConfig {
  drift_threshold:        number;
  auto_semantic_verify:   boolean;
  semantic_debounce_ms:   number;
  fail_on:                'critical' | 'warn' | 'none';
  context_max_depth:      number;
  context_cache_ttl_min:  number;
  model:                  string;
  max_tokens:             number;
  stats_history_limit:    number;
}

const DEFAULTS: IddConfig = {
  drift_threshold:        80,
  auto_semantic_verify:   false,
  semantic_debounce_ms:   30_000,
  fail_on:                'critical',
  context_max_depth:      3,
  context_cache_ttl_min:  5,
  model:                  'claude-sonnet-4-20250514',
  max_tokens:             4096,
  stats_history_limit:    30,
};

let _cache:     IddConfig | null = null;
let _cacheRoot: string   | null = null;

export function loadConfig(projectRoot?: string): IddConfig {
  const root = projectRoot ?? findProjectRoot() ?? process.cwd();
  if (_cache && _cacheRoot === root) return _cache;

  const configPath = path.join(root, '.idd', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    _cache = { ...DEFAULTS }; _cacheRoot = root; return _cache;
  }
  try {
    const raw    = fs.readFileSync(configPath, 'utf8');
    const loaded = yaml.load(raw) as Partial<IddConfig>;
    _cache = { ...DEFAULTS, ...(loaded ?? {}) };
    _cacheRoot = root;
    return _cache;
  } catch {
    _cache = { ...DEFAULTS }; _cacheRoot = root; return _cache;
  }
}

export function clearConfigCache(): void { _cache = null; _cacheRoot = null; }

export function getDefaultConfig(): IddConfig { return { ...DEFAULTS }; }

export function writeDefaultConfig(projectRoot: string): void {
  const iddDir     = path.join(projectRoot, '.idd');
  const configPath = path.join(iddDir, 'config.yaml');
  if (fs.existsSync(configPath)) return;
  if (!fs.existsSync(iddDir)) fs.mkdirSync(iddDir, { recursive: true });

  const content = [
    '# IDD IDE — configurações do projeto',
    '# Documentação: https://github.com/EliezerRosa/idd-ide/docs/CLI.md',
    '',
    '# Verifier',
    'drift_threshold: 80          # score mínimo para considerar alinhado (0–100)',
    'auto_semantic_verify: false  # análise semântica automática ao salvar',
    'semantic_debounce_ms: 30000  # intervalo mínimo entre análises semânticas (ms)',
    'fail_on: critical            # nível que bloqueia commit: critical | warn | none',
    '',
    '# Context Manager',
    'context_max_depth: 3         # profundidade máxima de resolução de dependências',
    'context_cache_ttl_min: 5     # tempo de vida do cache em minutos',
    '',
    '# Intent Engine',
    'model: claude-sonnet-4-20250514',
    'max_tokens: 4096',
    '',
    '# Stats',
    'stats_history_limit: 30      # quantos scores históricos manter por módulo',
  ].join('\n');

  fs.writeFileSync(configPath, content + '\n', 'utf8');
}
