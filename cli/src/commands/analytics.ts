// src/commands/analytics.ts — Issue #22: idd analytics
import * as path from 'node:path';
import * as fs   from 'node:fs';
import { Store, findProjectRoot } from '../lib/store.ts';
import {
  header, footer, row, table, info,
  BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW, PURPLE,
} from '../lib/ui.ts';

// ── Sparkline ────────────────────────────────────────────────────

const BLOCKS = ' ▁▂▃▄▅▆▇█';

function sparkline(values: number[], width = 10): string {
  if (values.length === 0) return GRAY + '—'.repeat(width) + RESET;
  const max  = Math.max(...values);
  const min  = Math.min(...values);
  const range = max - min || 1;
  const normalized = values.map(v => Math.round(((v - min) / range) * (BLOCKS.length - 1)));
  const padded = normalized.slice(-width).join('').padStart(width);
  const last = values[values.length - 1];
  const color = last >= 90 ? GREEN : last >= 70 ? YELLOW : RED;
  return color + padded.split('').map(c => BLOCKS[parseInt(c)] ?? c).join('') + RESET;
}

function trend(values: number[]): string {
  if (values.length < 2) return `${GRAY}→ estável${RESET}`;
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const diff = last - prev;
  if (diff > 5)  return `${GREEN}↑ melhora${RESET}`;
  if (diff < -5) return `${RED}↓ piora${RESET}`;
  return `${GRAY}→ estável${RESET}`;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function scoreColor(s: number): string {
  if (s >= 90) return GREEN;
  if (s >= 70) return YELLOW;
  return RED;
}

// ── Tempo relativo ───────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const d   = new Date(isoDate).getTime();
  const now = Date.now();
  const s   = Math.floor((now - d) / 1000);
  if (s < 60)        return `${s}s atrás`;
  if (s < 3600)      return `${Math.floor(s/60)}min atrás`;
  if (s < 86400)     return `${Math.floor(s/3600)}h atrás`;
  if (s < 2592000)   return `${Math.floor(s/86400)}d atrás`;
  return `${Math.floor(s/2592000)}m atrás`;
}

// ── Velocity (intenções por período) ────────────────────────────

function periodLabel(sinceMs: number): string {
  const days = Math.round(sinceMs / 86400000);
  if (days <= 1)  return 'hoje';
  if (days <= 7)  return 'últimos 7 dias';
  if (days <= 30) return 'últimos 30 dias';
  return `últimos ${days} dias`;
}

// ════════════════════════════════════════════════════════════════
// Comando principal
// ════════════════════════════════════════════════════════════════

export async function cmdAnalytics(args: string[]): Promise<void> {
  const sinceArg  = args.find(a => a.startsWith('--since='))?.split('=')[1];
  const formatArg = args.find(a => a.startsWith('--format='))?.split('=')[1] ?? 'terminal';
  const topN      = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] ?? '10');
  const root      = findProjectRoot() ?? process.cwd();

  const store = new Store(root);
  store.open();

  try {
    // ── Parse --since ────────────────────────────────────────────
    let sinceMs = 30 * 86400000; // default: 30 days
    if (sinceArg) {
      const n = parseInt(sinceArg);
      const unit = sinceArg.slice(-1);
      if (unit === 'd') sinceMs = n * 86400000;
      else if (unit === 'w') sinceMs = n * 7 * 86400000;
      else if (unit === 'h') sinceMs = n * 3600000;
    }
    const sinceDate = new Date(Date.now() - sinceMs).toISOString();

    header('analytics');
    console.log('');

    const intents = store.listIntents();
    if (intents.length === 0) {
      info('Nenhuma intenção registrada ainda. Execute "idd generate" para começar.');
      footer('');
      return;
    }

    // ── Métricas globais ─────────────────────────────────────────
    let totalVersions    = 0;
    let totalDrifts      = 0;
    let totalConstraints = 0;
    const allScores:     number[] = [];
    const moduleData: Array<{
      key: string; versions: number; avgScore: number;
      lastScore: number; history: number[]; lastUpdate: string;
      drifts: number; trend: string; spark: string;
    }> = [];

    for (const intent of intents) {
      const key      = `${intent.module}/${intent.sub}`;
      const versions = store.getVersions(intent.id);
      const stats    = store.getAlignmentStats(intent.id);
      const history  = store.getAlignmentHistory(intent.id, 20);
      const drifts   = store.getActiveDrifts().filter((d: any) => d.intent_id === intent.id).length;
      const consts   = store.getConstraints(intent.id);

      totalVersions    += versions.length;
      totalDrifts      += drifts;
      totalConstraints += consts.length;

      const scores    = history.map((h: any) => h.score as number);
      const avgScore  = avg(scores) || (stats as any)?.avg_score || 100;
      const lastScore = scores[0] ?? (stats as any)?.last_score ?? 100;
      const lastUpdate = versions[0]?.created_at ?? intent.created_at ?? new Date().toISOString();

      allScores.push(lastScore);

      moduleData.push({
        key, versions: versions.length, avgScore,
        lastScore, history: scores, lastUpdate,
        drifts, trend: trend(scores), spark: sparkline(scores.reverse()),
      });
    }

    const globalAvg = avg(allScores);
    const okCount   = allScores.filter(s => s >= 90).length;
    const warnCount = allScores.filter(s => s >= 70 && s < 90).length;
    const driftCount= allScores.filter(s => s < 70).length;

    // ── Overview ─────────────────────────────────────────────────
    console.log(`  ${BOLD}Visão Geral${RESET}  ${GRAY}${periodLabel(sinceMs)}${RESET}\n`);
    const gc = scoreColor(globalAvg);
    row('score global',  `${gc}${BOLD}${globalAvg}%${RESET}`);
    row('módulos',       `${GREEN}${okCount} ok${RESET}  ${YELLOW}${warnCount} aviso${RESET}  ${RED}${driftCount} drift${RESET}`);
    row('versões',       `${totalVersions}`);
    row('drift events',  totalDrifts > 0 ? `${RED}${totalDrifts}${RESET}` : `${GREEN}0${RESET}`);
    row('constraints',   `${totalConstraints}`);

    // ── Velocity ─────────────────────────────────────────────────
    const recentIntents = intents.filter(i =>
      new Date((i as any).created_at ?? 0).getTime() > Date.now() - sinceMs
    );
    const recentVersions = totalVersions; // approximation

    console.log(`\n  ${BOLD}Velocidade${RESET}\n`);
    row('intenções criadas', `${recentIntents.length} (${periodLabel(sinceMs)})`);
    row('cadência',
      recentIntents.length === 0 ? `${GRAY}nenhuma${RESET}` :
      recentIntents.length > 5   ? `${GREEN}alta${RESET}` :
      recentIntents.length > 2   ? `${YELLOW}média${RESET}` : `${GRAY}baixa${RESET}`
    );

    // ── Por módulo (ordenado por score) ──────────────────────────
    const sorted = moduleData.sort((a, b) => a.lastScore - b.lastScore).slice(0, topN);

    console.log(`\n  ${BOLD}Módulos (pior → melhor)${RESET}\n`);
    table(
      ['módulo', 'score', 'tendência', 'histórico (20)', 'versões', 'atualização'],
      sorted.map(m => {
        const sc = scoreColor(m.lastScore);
        return [
          m.key,
          `${sc}${m.lastScore}%${RESET}`,
          m.trend,
          m.spark,
          `${m.versions}`,
          relativeTime(m.lastUpdate),
        ];
      })
    );

    // ── Módulos drift-prone ───────────────────────────────────────
    const driftProne = moduleData
      .filter(m => m.avgScore < 80)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 5);

    if (driftProne.length > 0) {
      console.log(`\n  ${BOLD}${RED}Módulos instáveis (avg < 80%)${RESET}\n`);
      driftProne.forEach(m => {
        console.log(`  ${RED}●${RESET}  ${BOLD}${m.key}${RESET}  avg ${m.avgScore}%  ${m.spark}`);
        console.log(`     ${GRAY}${m.versions} versão(ões) · ${m.drifts} drift(s) ativos${RESET}`);
      });
    }

    // ── Markdown export ───────────────────────────────────────────
    if (formatArg === 'md') {
      const outPath = path.join(root, '.idd', 'analytics.md');
      const lines = [
        `# IDD Analytics — ${new Date().toLocaleDateString('pt-BR')}`,
        '',
        `## Visão Geral`,
        '',
        `| Score Global | Módulos OK | Avisos | Drift |`,
        `|---|---|---|---|`,
        `| ${globalAvg}% | ${okCount} | ${warnCount} | ${driftCount} |`,
        '',
        `## Por Módulo`,
        '',
        `| Módulo | Score | Tendência | Versões |`,
        `|---|---|---|---|`,
        ...sorted.map(m => `| ${m.key} | ${m.lastScore}% | ${m.trend.replace(/\x1b\[[0-9;]*m/g,'')} | ${m.versions} |`),
      ];
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
      console.log(`\n  ${GREEN}✓${RESET} Exportado: ${outPath}`);
    }

    footer([
      '"idd analytics --since=7d"         → últimos 7 dias',
      '"idd analytics --top=5"            → top 5 módulos',
      '"idd analytics --format=md"        → exportar Markdown',
    ].join('\n  '));

  } finally {
    store.close();
  }
}
