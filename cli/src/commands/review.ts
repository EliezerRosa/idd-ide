// src/commands/review.ts — Issue #14: IDD Review
//
// Analisa um diff de PR e verifica se as mudanças respeitam as intenções declaradas.
// Pode ser usado localmente (idd review) ou via GitHub Actions (modo --ci).
import * as fs    from 'node:fs';
import * as path  from 'node:path';
import { execSync } from 'node:child_process';
import { Store, findProjectRoot } from '../lib/store.ts';
import { runStaticChecks, autoDetectLanguage } from '../lib/lang.ts';
import { getApiKey, checkRateLimit, recordCall } from '../lib/security.ts';
import { computeLcsDiff, diffStats } from './diff.ts';
import {
  header, footer, success, error, info, warn, row, table, spinner,
  BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW,
} from '../lib/ui.ts';

// ── Tipos ─────────────────────────────────────────────────────────

export interface FileChange {
  path:      string;
  status:    'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  content?:  string;   // conteúdo atual do arquivo
}

export interface ModuleReview {
  module:        string;
  sub:           string;
  status:        'ok' | 'warn' | 'drift' | 'no-intent';
  score:         number;
  violations:    string[];
  missingTests:  string[];
  filesChanged:  string[];
  suggestedReviewers: string[];
}

export interface ReviewResult {
  pr:          string;
  base:        string;
  head:        string;
  totalFiles:  number;
  modules:     ModuleReview[];
  summary:     string;
  blockers:    number;
  warnings:    number;
}

// ── Git diff parser ───────────────────────────────────────────────

export function parseGitDiff(root: string, base: string, head: string): FileChange[] {
  try {
    const out = execSync(
      `git diff --name-status "${base}" "${head}"`,
      { cwd: root, stdio: ['pipe', 'pipe', 'ignore'] }
    ).toString();

    return out.split('\n').filter(Boolean).map(line => {
      const [status, ...parts] = line.split('\t');
      const filePath = parts[parts.length - 1] ?? '';
      const s: FileChange['status'] =
        status.startsWith('A') ? 'added'    :
        status.startsWith('D') ? 'deleted'  :
        status.startsWith('R') ? 'renamed'  : 'modified';

      let content: string | undefined;
      const abs = path.join(root, filePath);
      if (s !== 'deleted' && fs.existsSync(abs)) {
        try { content = fs.readFileSync(abs, 'utf8'); } catch { /* skip */ }
      }

      return { path: filePath, status: s, additions: 0, deletions: 0, content };
    });
  } catch {
    return [];
  }
}

// Detecta a qual módulo IDD pertence um arquivo alterado
export function fileToModule(filePath: string): { module: string; sub: string } | null {
  // Exemplos:
  //   src/auth/login.ts         → auth/login
  //   src/auth/login.test.ts    → auth/login
  //   src/auth/login.intent.yaml → auth/login
  //   src/users/crud/index.ts   → users/crud

  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');

  // Remove 'src' prefix if present
  const idx = parts.indexOf('src');
  const relevant = idx >= 0 ? parts.slice(idx + 1) : parts;

  if (relevant.length < 2) return null;

  const [mod, subRaw] = relevant;
  // Strip extension from file name
  const sub = subRaw
    .replace(/\.intent\.yaml$/, '')
    .replace(/\.(test|spec)\.[a-z]+$/, '')
    .replace(/_test\.go$/, '')         // Go test convention: login_test.go → login
    .replace(/\.[a-z]+$/, '');

  if (!mod || !sub) return null;
  return { module: mod, sub };
}

// ── Reviewer suggestion via idd blame ─────────────────────────────

export function suggestReviewers(store: Store, mod: string, sub: string): string[] {
  const intent = store.getIntent(mod, sub);
  if (!intent) return [];

  const versions = store.getVersions(intent.id);
  const authors  = new Map<string, number>();
  for (const v of versions) {
    if (v.git_author) authors.set(v.git_author, (authors.get(v.git_author) ?? 0) + 1);
  }
  return [...authors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
}

// ── Análise semântica via LLM ─────────────────────────────────────

async function semanticCheck(
  intent: { statement: string; constraints: string[] },
  code: string, apiKey: string, model: string
): Promise<{ score: number; violations: string[] }> {
  const body = JSON.stringify({
    model,
    max_tokens: 512,
    system: [
      'Você é um revisor de código especializado em Intent Driven Development.',
      'Analise se o código respeita a intenção e todas as constraints declaradas.',
      'Retorne APENAS JSON: {"score":0-100,"violations":["string"]}',
      'score 100 = totalmente alinhado, 0 = completamente desalinhado.',
    ].join('\n'),
    messages: [{
      role: 'user',
      content: `INTENÇÃO: ${intent.statement}\n\nCONSTRAINTS:\n${intent.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nCÓDIGO MODIFICADO:\n\`\`\`\n${code.slice(0, 3000)}\n\`\`\``,
    }],
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body,
  });
  if (!res.ok) return { score: 100, violations: [] };
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const raw = data.content.find(b => b.type === 'text')?.text ?? '{}';
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*/m, '').replace(/```$/m, '').trim());
    return { score: parsed.score ?? 100, violations: parsed.violations ?? [] };
  } catch { return { score: 100, violations: [] }; }
}

// ── Core: analisa módulos afetados ────────────────────────────────

export async function analyzeModules(
  changes: FileChange[],
  store: Store,
  root: string,
  semantic: boolean,
  apiKey: string,
  model: string,
): Promise<ModuleReview[]> {
  // Group files by module
  const moduleMap = new Map<string, FileChange[]>();
  for (const change of changes) {
    const m = fileToModule(change.path);
    if (!m) continue;
    const key = `${m.module}/${m.sub}`;
    const list = moduleMap.get(key) ?? [];
    list.push(change);
    moduleMap.set(key, list);
  }

  const results: ModuleReview[] = [];

  for (const [key, files] of moduleMap) {
    const [mod, sub] = key.split('/');
    const intent      = store.getIntent(mod, sub);

    if (!intent) {
      // File changed but no intent declared
      results.push({
        module: mod, sub, status: 'no-intent',
        score: -1, violations: [], missingTests: [],
        filesChanged: files.map(f => f.path),
        suggestedReviewers: [],
      });
      continue;
    }

    const constraints = store.getConstraints(intent.id).map((c: any) => c.text);
    const allViolations: string[] = [];
    let minScore = 100;

    // Static analysis on changed files
    for (const f of files) {
      if (!f.content || f.status === 'deleted') continue;
      const lang    = autoDetectLanguage(path.dirname(path.join(root, f.path))) ?? 'typescript';
      const checks  = runStaticChecks(f.content, lang as any);
      allViolations.push(...checks.map(c => `${f.path}: ${c.message}`));
      if (checks.some(c => c.severity === 'critical')) minScore = Math.min(minScore, 30);
      else if (checks.length > 0)                       minScore = Math.min(minScore, 70);
    }

    // Missing tests check: look for .test. or _test. files
    const codeFiles = files.filter(f => !f.path.includes('.test.') && !f.path.includes('_test.') && !f.path.includes('.intent.yaml'));
    const testFiles = files.filter(f => f.path.includes('.test.') || f.path.includes('_test.'));
    const missingTests: string[] = [];
    if (codeFiles.length > 0 && testFiles.length === 0) {
      const versions = store.getVersions(intent.id);
      const snap = versions[0]?.yaml_snapshot;
      if (snap) {
        try {
          const yaml = JSON.parse(snap) as { acceptance?: string[] };
          (yaml.acceptance ?? []).forEach(a => {
            missingTests.push(a);
          });
        } catch { /* skip */ }
      }
    }

    // Semantic check
    if (semantic && apiKey && codeFiles.length > 0) {
      const rl = checkRateLimit();
      if (rl.allowed) {
        const combined = codeFiles
          .filter(f => f.content)
          .map(f => f.content!)
          .join('\n\n');
        const { score: semScore, violations: semV } = await semanticCheck(
          { statement: intent.statement, constraints }, combined, apiKey, model
        );
        recordCall();
        allViolations.push(...semV.map(v => `[LLM] ${v}`));
        minScore = Math.min(minScore, semScore);
      }
    }

    const status: ModuleReview['status'] =
      allViolations.some(v => v.includes('critical') || v.includes('DRIFT'))
        ? 'drift'
        : allViolations.length > 0 || missingTests.length > 0
        ? 'warn'
        : 'ok';

    results.push({
      module: mod, sub, status,
      score: minScore,
      violations: allViolations,
      missingTests,
      filesChanged: files.map(f => f.path),
      suggestedReviewers: suggestReviewers(store, mod, sub),
    });
  }

  return results;
}

// ── Formata comentário markdown para PR ───────────────────────────

export function formatPrComment(result: ReviewResult): string {
  const badge = (s: string) =>
    s === 'ok'       ? '🟢' :
    s === 'warn'     ? '🟡' :
    s === 'drift'    ? '🔴' :
    s === 'no-intent'? '⚪' : '⚪';

  const lines = [
    '## ⬡ IDD Review',
    '',
    `**PR:** ${result.pr}  ·  **Base:** \`${result.base}\` → **Head:** \`${result.head}\``,
    '',
    `| Status | Módulo | Score | Violações | Testes faltando |`,
    `|---|---|---|---|---|`,
  ];

  for (const m of result.modules) {
    const scoreStr = m.score >= 0 ? `${m.score}%` : '—';
    lines.push(`| ${badge(m.status)} | \`${m.module}/${m.sub}\` | ${scoreStr} | ${m.violations.length} | ${m.missingTests.length} |`);
  }

  lines.push('');

  // Detalhes por módulo com problemas
  const withIssues = result.modules.filter(m => m.status !== 'ok');
  if (withIssues.length > 0) {
    lines.push('### Detalhes');
    for (const m of withIssues) {
      lines.push(`\n**${badge(m.status)} ${m.module}/${m.sub}**`);
      if (m.status === 'no-intent') {
        lines.push('> ⚠ Arquivo modificado sem intenção IDD declarada. Execute `idd new ' + m.module + '/' + m.sub + '` para criar.');
      }
      m.violations.slice(0, 5).forEach(v => lines.push(`- ❌ ${v}`));
      m.missingTests.slice(0, 3).forEach(t => lines.push(`- ⚠ Teste faltando: "${t}"`));
      if (m.suggestedReviewers.length > 0) {
        lines.push(`- 👤 Revisores sugeridos: ${m.suggestedReviewers.map(r => `@${r}`).join(', ')}`);
      }
    }
  }

  lines.push('');
  lines.push(`---`);
  lines.push(`**${result.blockers > 0 ? '❌ Bloqueado' : result.warnings > 0 ? '⚠ Avisos' : '✅ Aprovado'}** — ${result.blockers} bloqueio(s), ${result.warnings} aviso(s)`);
  lines.push('');
  lines.push('<sub>Gerado por [IDD Review](https://github.com/EliezerRosa/idd-ide) — `idd review`</sub>');

  return lines.join('\n');
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdReview(args: string[]): Promise<void> {
  const base      = args.find(a => a.startsWith('--base='))?.split('=')[1]   ?? 'HEAD~1';
  const head      = args.find(a => a.startsWith('--head='))?.split('=')[1]   ?? 'HEAD';
  const prId      = args.find(a => a.startsWith('--pr='))?.split('=')[1]     ?? 'local';
  const outFile   = args.find(a => a.startsWith('--out='))?.split('=')[1];
  const failOn    = args.find(a => a.startsWith('--fail-on='))?.split('=')[1] ?? 'drift';
  const semantic  = args.includes('--semantic');
  const ciMode    = args.includes('--ci');

  if (!ciMode) header('review');

  const root   = findProjectRoot() ?? process.cwd();
  const store  = new Store(root);
  const apiKey = getApiKey();
  const model  = process.env.IDD_MODEL ?? 'claude-sonnet-5';
  store.open();

  // Parse changes
  const spin = spinner('Analisando diff...');
  const changes = parseGitDiff(root, base, head);
  spin.stop(true);

  if (changes.length === 0) {
    info('Nenhum arquivo alterado encontrado.');
    store.close(); footer(''); return;
  }

  // Analyze modules
  const modules = await analyzeModules(changes, store, root, semantic, apiKey, model);

  const blockers = modules.filter(m => m.status === 'drift').length;
  const warnings = modules.filter(m => m.status === 'warn' || m.status === 'no-intent').length;

  const result: ReviewResult = {
    pr: prId, base, head,
    totalFiles: changes.length,
    modules, blockers, warnings,
    summary: blockers > 0
      ? `❌ ${blockers} módulo(s) com drift crítico`
      : warnings > 0
      ? `⚠ ${warnings} módulo(s) com avisos`
      : `✅ Todos os módulos alinhados`,
  };

  // Output
  if (ciMode || outFile) {
    const comment = formatPrComment(result);
    if (outFile) {
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, comment, 'utf8');
      if (!ciMode) success(`Comentário salvo em: ${outFile}`);
    } else {
      console.log(comment);
    }
  } else {
    // Terminal output
    console.log('');
    row('arquivos alterados', `${changes.length}`);
    row('módulos afetados',   `${modules.length}`);
    console.log('');

    table(
      ['status', 'módulo', 'score', 'violações', 'testes faltando'],
      modules.map(m => [
        m.status === 'ok'        ? `${GREEN}ok${RESET}`        :
        m.status === 'drift'     ? `${RED}drift${RESET}`       :
        m.status === 'warn'      ? `${YELLOW}warn${RESET}`     : `${GRAY}sem intent${RESET}`,
        `${m.module}/${m.sub}`,
        m.score >= 0 ? `${m.score}%` : '—',
        `${m.violations.length}`,
        `${m.missingTests.length}`,
      ])
    );

    if (blockers > 0 || warnings > 0) {
      console.log('');
      for (const m of modules.filter(m => m.status !== 'ok')) {
        console.log(`  ${BOLD}${m.module}/${m.sub}${RESET}`);
        m.violations.slice(0, 3).forEach(v => console.log(`    ${RED}✗${RESET}  ${v}`));
        m.missingTests.slice(0, 2).forEach(t => console.log(`    ${YELLOW}⚠${RESET}  Teste: "${t}"`));
      }
    }

    console.log('');
    row('resultado', result.summary);

    footer([
      '"idd review --semantic"          → inclui análise LLM',
      '"idd review --out=review.md"     → salva comentário Markdown',
      '"idd review --fail-on=warn"      → bloqueia em avisos também',
    ].join('\n  '));
  }

  store.close();

  // Exit code for CI
  if (failOn === 'drift' && blockers > 0) process.exit(1);
  if (failOn === 'warn'  && (blockers > 0 || warnings > 0)) process.exit(1);
}
