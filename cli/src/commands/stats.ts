// src/commands/stats.ts — idd stats
import { header, footer, table, row, info, warn,
         BOLD, RESET, GREEN, YELLOW, RED, GRAY, CYAN, WHITE } from '../lib/ui.ts';
import { Store, findProjectRoot } from '../lib/store.ts';
import { loadConfig } from '../lib/config.ts';

function trendIcon(trend: 'up' | 'down' | 'stable'): string {
  return trend === 'up'   ? `${GREEN}↑ melhorando${RESET}` :
         trend === 'down' ? `${RED}↓ piorando${RESET}`    :
                            `${GRAY}→ estável${RESET}`;
}

function scoreColor(score: number, threshold: number): string {
  return score >= threshold  ? `${GREEN}${score}%${RESET}` :
         score >= threshold * 0.75 ? `${YELLOW}${score}%${RESET}` :
                                     `${RED}${score}%${RESET}`;
}

function sparkline(scores: number[]): string {
  if (scores.length === 0) return GRAY + '—' + RESET;
  const chars = ['▁','▂','▃','▄','▅','▆','▇','█'];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  return scores.slice(0, 10).reverse().map(s => {
    const idx   = Math.round(((s - min) / range) * (chars.length - 1));
    const color = s >= 80 ? GREEN : s >= 60 ? YELLOW : RED;
    return color + chars[idx] + RESET;
  }).join('');
}

export async function cmdStats(args: string[]): Promise<void> {
  const target  = args.find(a => !a.startsWith('--'));
  const verbose = args.includes('--verbose') || args.includes('-v');
  const root    = findProjectRoot() ?? process.cwd();
  const cfg     = loadConfig(root);
  const store   = new Store(root);
  store.open();

  const intents = store.listIntents();

  if (intents.length === 0) {
    header('stats');
    info('Nenhuma intenção registrada. Execute "idd generate" primeiro.');
    store.close();
    footer('');
    return;
  }

  // Filtrar por módulo se especificado
  const filtered = target
    ? intents.filter(i => `${i.module}/${i.sub}`.includes(target))
    : intents;

  header('stats');
  row('threshold configurado', `${cfg.drift_threshold}%`);
  row('intenções analisadas',  `${filtered.length}`);
  console.log('');

  // ── Tabela principal ────────────────────────────────────────

  const tableRows = filtered.map(intent => {
    const stats   = store.getAlignmentStats(intent.id);
    const history = store.getAlignmentHistory(intent.id, 10);
    const spark   = sparkline(history.map(h => h.score));
    const versions = store.getVersions(intent.id);

    return [
      `${intent.module}/${intent.sub}`,
      scoreColor(stats.avg, cfg.drift_threshold),
      scoreColor(stats.min, cfg.drift_threshold),
      scoreColor(stats.max, cfg.drift_threshold),
      trendIcon(stats.trend),
      spark || `${GRAY}sem dados${RESET}`,
      `${GRAY}${versions.length}v${RESET}`,
    ];
  });

  table(
    ['módulo', 'avg', 'min', 'max', 'tendência', 'histórico (10)', 'versões'],
    tableRows
  );

  // ── Sumário geral ────────────────────────────────────────────

  const allStats = filtered.map(i => store.getAlignmentStats(i.id));
  const withData = allStats.filter(s => s.avg < 100 || s.min < 100);

  if (withData.length > 0) {
    const avgGlobal = Math.round(
      allStats.reduce((sum, s) => sum + s.avg, 0) / allStats.length
    );
    console.log('');
    row('score médio global', scoreColor(avgGlobal, cfg.drift_threshold));

    const improving = allStats.filter(s => s.trend === 'up').length;
    const worsening = allStats.filter(s => s.trend === 'down').length;
    if (improving > 0) row('melhorando', `${GREEN}${improving} módulo(s)${RESET}`);
    if (worsening > 0) row('piorando',   `${RED}${worsening} módulo(s)${RESET}`);
  }

  // ── Detalhes verbose ─────────────────────────────────────────

  if (verbose) {
    console.log('');
    console.log(`  ${BOLD}Histórico detalhado${RESET}`);
    for (const intent of filtered) {
      const history = store.getAlignmentHistory(intent.id, 5);
      if (history.length === 0) continue;
      console.log(`\n  ${BOLD}${intent.module}/${intent.sub}${RESET}`);
      history.forEach(h => {
        const date = new Date(h.recorded_at).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        const src = h.source === 'semantic' ? `${CYAN}LLM${RESET}` : `${GRAY}static${RESET}`;
        console.log(`    ${scoreColor(h.score, cfg.drift_threshold).padEnd(20)} ${src}  ${GRAY}${date}${RESET}`);
      });
    }
  }

  // ── Drifts ativos ────────────────────────────────────────────

  const drifts = store.getActiveDrifts();
  if (drifts.length > 0) {
    console.log('');
    warn(`${drifts.length} drift(s) ativo(s) — execute "idd verify" para detalhes`);
  }

  store.close();
  footer([
    '"idd stats --verbose"           → histórico linha a linha',
    '"idd stats auth/login"          → filtrar por módulo',
    '"idd verify --semantic"         → alimentar o histórico de scores',
  ].join('\n  '));
}
