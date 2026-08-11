// src/commands/watch.ts — Issue #21: idd drift watch
// Daemon de monitoramento contínuo: detecta drift em tempo real sem git hook.
import * as fs    from 'node:fs';
import * as path  from 'node:path';
import { findProjectRoot, Store } from '../lib/store.ts';
import { loadConfig }              from '../lib/config.ts';
import { runStaticChecks, detectLanguage } from '../lib/lang.ts';
import { validateIntent }          from '../lib/security.ts';
import * as yaml                   from 'js-yaml';
import {
  header, success, error, warn, info, row,
  BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW, PURPLE,
} from '../lib/ui.ts';

// ── Tipos ────────────────────────────────────────────────────────

interface WatchResult {
  file:       string;
  module?:    string;
  status:     'ok' | 'warn' | 'drift' | 'error';
  violations: string[];
  timestamp:  string;
}

// ── Pattern matching ─────────────────────────────────────────────

function shouldWatch(filePath: string, patterns: string[]): boolean {
  const rel = filePath.replace(/\\/g, '/');
  return patterns.some(pat => {
    const regex = new RegExp('^' + pat
      .replace(/\*\*/g, '(.+)')
      .replace(/\*/g, '([^/]+)')
      .replace(/\./g, '\\.') + '$');
    return regex.test(rel);
  });
}

function fileToModule(root: string, filePath: string): string | null {
  const rel   = path.relative(root, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  const srcIdx = parts.indexOf('src');
  const base  = srcIdx >= 0 ? parts.slice(srcIdx + 1) : parts;
  if (base.length < 2) return null;
  const [mod, subRaw] = base;
  const sub = subRaw
    .replace(/\.intent\.yaml$/, '')
    .replace(/\.(test|spec)\.[a-z]+$/, '')
    .replace(/_test\.go$/, '')
    .replace(/\.[a-z]+$/, '');
  return mod && sub ? `${mod}/${sub}` : null;
}

// ── Core analysis ─────────────────────────────────────────────────

function analyzeFile(filePath: string, root: string, store: Store): WatchResult {
  const ts        = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  const rel       = path.relative(root, filePath);
  const violations: string[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // .intent.yaml: validate schema
    if (filePath.endsWith('.intent.yaml')) {
      const parsed = yaml.load(content) as unknown;
      const result = validateIntent(parsed);
      if (!result.valid) {
        result.errors.forEach(e => violations.push(`[schema] ${e.field}: ${e.message}`));
        return { file: rel, status: 'error', violations, timestamp: ts };
      }
      // Check against Intent Store
      const intent  = parsed as Record<string, any>;
      const modKey  = intent.module as string ?? '';
      const [mod, sub] = modKey.split('/');
      if (mod && sub) {
        const stored = store.getIntent(mod, sub);
        if (stored && stored.statement !== intent.intent) {
          violations.push(`[drift] intent mudou mas Store não foi atualizado — execute idd generate`);
        }
      }
      const status = violations.length > 0 ? 'warn' : 'ok';
      return { file: rel, module: modKey, status, violations, timestamp: ts };
    }

    // Source files: static checks
    const lang   = detectLanguage(filePath) as any;
    const checks = runStaticChecks(content, lang);
    checks.forEach(c => violations.push(`[${c.severity}] ${c.message}`));

    // Check against Intent Store if module exists
    const modKey = fileToModule(root, filePath);
    if (modKey) {
      const [mod, sub] = modKey.split('/');
      const stored     = store.getIntent(mod, sub);
      if (!stored) {
        violations.push(`[info] Nenhuma intenção declarada para ${modKey} — execute idd new ${modKey}`);
      } else {
        const constraints = store.getConstraints(stored.id).map((c: any) => c.text);
        // Simple heuristic: check if content mentions key constraint concepts
        for (const constraint of constraints) {
          const keywords = constraint.toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 4 && !['deve', 'precisa', 'nunca', 'sempre', 'antes', 'depois'].includes(w));
          const missingKeyword = keywords.some((kw: string) => !content.toLowerCase().includes(kw.slice(0, 6)));
          if (missingKeyword) {
            violations.push(`[warn] Constraint "${constraint.slice(0, 60)}..." pode não estar implementada`);
            break; // one warning per file is enough
          }
        }
      }
    }

    const hasCritical = checks.some(c => c.severity === 'critical');
    const status: WatchResult['status'] = hasCritical ? 'drift' : violations.length > 1 ? 'warn' : 'ok';
    return { file: rel, module: modKey ?? undefined, status, violations, timestamp: ts };

  } catch (e: any) {
    return { file: rel, status: 'error', violations: [`Erro: ${e.message}`], timestamp: ts };
  }
}

// ── Display ───────────────────────────────────────────────────────

function printResult(result: WatchResult, verbose: boolean): void {
  const statusIcon: Record<WatchResult['status'], string> = {
    ok:    `${GREEN}✓ ok${RESET}`,
    warn:  `${YELLOW}⚠ aviso${RESET}`,
    drift: `${RED}✗ DRIFT${RESET}`,
    error: `${RED}✗ erro${RESET}`,
  };
  const icon   = statusIcon[result.status];
  const mod    = result.module ? ` ${GRAY}[${result.module}]${RESET}` : '';
  const ts     = `${GRAY}${result.timestamp}${RESET}`;

  process.stdout.write(`\r  ${ts}  ${icon}  ${result.file}${mod}          \n`);

  if (verbose && result.violations.length > 0) {
    result.violations.slice(0, 3).forEach(v => {
      const color = v.includes('[drift]') || v.includes('[critical]') ? RED
                  : v.includes('[warn]') ? YELLOW : GRAY;
      console.log(`         ${color}${v}${RESET}`);
    });
  }
}

// ── Watch stats ───────────────────────────────────────────────────

interface WatchStats {
  filesChecked:  number;
  driftCount:    number;
  warnCount:     number;
  okCount:       number;
  lastDrift?:    string;
}

function printStats(stats: WatchStats): void {
  process.stdout.write(
    `\r  ${GRAY}verificados: ${stats.filesChecked}${RESET}  ` +
    `${GREEN}ok: ${stats.okCount}${RESET}  ` +
    `${YELLOW}avisos: ${stats.warnCount}${RESET}  ` +
    `${RED}drift: ${stats.driftCount}${RESET}  ` +
    `${GRAY}Ctrl+C para sair${RESET}    `
  );
}

// ── Main ─────────────────────────────────────────────────────────

export async function cmdWatch(args: string[]): Promise<void> {
  const intervalArg = parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1] ?? '0');
  const verboseFlag = args.includes('--verbose') || args.includes('-v');
  const onceFlag    = args.includes('--once');
  const root        = findProjectRoot() ?? process.cwd();
  const cfg         = loadConfig(root);
  const store       = new Store(root);
  store.open();

  const WATCH_PATTERNS = [
    'src/**/*.ts', 'src/**/*.js', 'src/**/*.py', 'src/**/*.go',
    'src/**/*.rs', 'src/**/*.java', 'src/**/*.intent.yaml',
  ];

  header('drift watch');
  console.log('');
  row('raiz',     root);
  row('padrões',  `src/**/*.{ts,js,py,go,rs,java,intent.yaml}`);
  row('modo',     onceFlag ? 'único (--once)' : 'contínuo');
  if (intervalArg) row('polling', `${intervalArg}ms`);
  console.log('');

  const stats: WatchStats = { filesChecked: 0, driftCount: 0, warnCount: 0, okCount: 0 };

  // ── Scan inicial ─────────────────────────────────────────────
  info('Scan inicial...');
  const allFiles = collectFiles(root, WATCH_PATTERNS);
  let changed = false;

  for (const file of allFiles) {
    const result = analyzeFile(file, root, store);
    stats.filesChecked++;
    if (result.status === 'drift') { stats.driftCount++; stats.lastDrift = result.file; }
    else if (result.status === 'warn') stats.warnCount++;
    else if (result.status === 'ok')   stats.okCount++;

    if (result.status !== 'ok' || verboseFlag) {
      printResult(result, verboseFlag);
      changed = true;
    }
  }

  if (!changed) console.log(`  ${GREEN}✓ Todos os ${allFiles.length} arquivo(s) alinhados.${RESET}`);

  if (onceFlag) {
    console.log('');
    printStats(stats);
    console.log('');
    store.close();
    if (stats.driftCount > 0) process.exit(1);
    return;
  }

  // ── Modo watch ───────────────────────────────────────────────
  console.log('');
  info('Assistindo mudanças... (Ctrl+C para parar)');
  console.log('');

  const debounce  = new Map<string, ReturnType<typeof setTimeout>>();
  const watchers: fs.FSWatcher[] = [];

  function watchDir(dir: string): void {
    if (!fs.existsSync(dir)) return;
    try {
      const w = fs.watch(dir, { recursive: true }, (event, filename) => {
        if (!filename) return;
        const fullPath = path.join(dir, filename);
        if (!shouldWatch(fullPath.replace(/\\/g, '/'), WATCH_PATTERNS)) return;

        clearTimeout(debounce.get(fullPath));
        debounce.set(fullPath, setTimeout(() => {
          if (!fs.existsSync(fullPath)) return;
          const result = analyzeFile(fullPath, root, store);
          stats.filesChecked++;
          if (result.status === 'drift') { stats.driftCount++; stats.lastDrift = result.file; }
          else if (result.status === 'warn') stats.warnCount++;
          else if (result.status === 'ok')   stats.okCount++;
          printResult(result, verboseFlag);
        }, intervalArg > 0 ? intervalArg : 300));
      });
      watchers.push(w);
    } catch { /* dir may not support watch */ }
  }

  watchDir(path.join(root, 'src'));
  watchDir(root);

  // Status line updater
  const statusInterval = setInterval(() => printStats(stats), 3000);

  // Graceful shutdown
  const shutdown = () => {
    clearInterval(statusInterval);
    watchers.forEach(w => w.close());
    debounce.forEach(t => clearTimeout(t));
    store.close();
    console.log('\n\n  Monitoramento encerrado.');
    process.exit(stats.driftCount > 0 ? 1 : 0);
  };

  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);

  // Keep alive
  await new Promise(() => {});
}

// ── Recursive file collector ─────────────────────────────────────

function collectFiles(root: string, patterns: string[]): string[] {
  const result: string[] = [];
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !['node_modules','.git','dist','out'].includes(entry.name)) {
          walk(full);
        } else if (entry.isFile()) {
          const rel = path.relative(root, full).replace(/\\/g, '/');
          if (shouldWatch(rel, patterns)) result.push(full);
        }
      }
    } catch { /* skip */ }
  }
  walk(path.join(root, 'src'));
  return result;
}
