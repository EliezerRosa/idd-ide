// src/commands/suggest.ts — Issue #24: idd suggest
import * as fs    from 'node:fs';
import * as path  from 'node:path';
import { Store, findProjectRoot } from '../lib/store.ts';
import { getApiKey, checkRateLimit, recordCall } from '../lib/security.ts';
import {
  header, footer, success, error, info, warn, row, spinner,
  BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW, PURPLE,
} from '../lib/ui.ts';

// ── Análise estática do grafo (sem LLM) ─────────────────────────

export interface GraphIssue {
  type:       'circular' | 'orphan' | 'ghost' | 'overspecified' | 'no-acceptance' | 'stale';
  severity:   'critical' | 'warn' | 'info';
  module:     string;
  message:    string;
  suggestion: string;
}

export function analyzeGraph(store: Store): GraphIssue[] {
  const issues:  GraphIssue[] = [];
  const intents  = store.listIntents();
  const moduleKeys = new Set(intents.map(i => `${i.module}/${i.sub}`));

  // Build adjacency map for cycle detection
  const graph = new Map<string, string[]>();
  for (const intent of intents) {
    const key      = `${intent.module}/${intent.sub}`;
    const versions = store.getVersions(intent.id);
    let   deps: string[] = [];
    if (versions[0]?.yaml_snapshot) {
      try {
        const snap = JSON.parse(versions[0].yaml_snapshot) as { depends_on?: string[] };
        deps = snap.depends_on ?? [];
      } catch { /* skip */ }
    }
    graph.set(key, deps);
  }

  // ── Dependências circulares ───────────────────────────────────
  function hasCycle(start: string, current: string, visited: Set<string>): boolean {
    if (current === start && visited.size > 0) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    for (const dep of graph.get(current) ?? []) {
      if (hasCycle(start, dep, new Set(visited))) return true;
    }
    return false;
  }

  for (const key of moduleKeys) {
    if (hasCycle(key, key, new Set())) {
      issues.push({
        type: 'circular', severity: 'critical', module: key,
        message: `Dependência circular detectada em "${key}".`,
        suggestion: `Revise o grafo de dependências. Considere extrair um módulo intermediário sem dependências cíclicas.`,
      });
    }
  }

  // ── Módulos órfãos (nunca referenciados em depends_on) ────────
  const referencedBy = new Set<string>();
  for (const deps of graph.values()) deps.forEach(d => referencedBy.add(d));

  for (const intent of intents) {
    const key = `${intent.module}/${intent.sub}`;
    if (!referencedBy.has(key)) {
      const versions = store.getVersions(intent.id);
      const daysSinceUpdate = versions[0]?.created_at
        ? (Date.now() - new Date(versions[0].created_at).getTime()) / 86400000
        : 0;
      if (daysSinceUpdate > 30) {
        issues.push({
          type: 'orphan', severity: 'info', module: key,
          message: `"${key}" não é referenciado por nenhum módulo (órfão há ${Math.round(daysSinceUpdate)} dias).`,
          suggestion: `Verifique se este módulo ainda é necessário. Se for um endpoint de entrada (API route), isso é esperado.`,
        });
      }
    }
  }

  // ── Módulos fantasma (depends_on referencia módulo inexistente) ──
  for (const [key, deps] of graph) {
    for (const dep of deps) {
      if (!moduleKeys.has(dep)) {
        issues.push({
          type: 'ghost', severity: 'warn', module: key,
          message: `"${key}" depende de "${dep}" que não existe no Intent Store.`,
          suggestion: `Execute "idd new ${dep}" para criar a intenção faltante, ou remova a dependência.`,
        });
      }
    }
  }

  // ── Módulos sobre-especificados (> 8 constraints) ─────────────
  for (const intent of intents) {
    const key       = `${intent.module}/${intent.sub}`;
    const consts    = store.getConstraints(intent.id);
    const versions  = store.getVersions(intent.id);
    const snapAcc   = versions[0]?.yaml_snapshot
      ? (() => { try { return (JSON.parse(versions[0].yaml_snapshot) as any).acceptance?.length ?? 0; } catch { return 0; } })()
      : 0;

    if (consts.length > 8) {
      issues.push({
        type: 'overspecified', severity: 'warn', module: key,
        message: `"${key}" tem ${consts.length} constraints — pode estar sobre-especificado.`,
        suggestion: `Considere decompor em sub-módulos. Constraints similares podem ser agrupadas num módulo de política separado.`,
      });
    }

    // ── Sem critérios de aceite ────────────────────────────────
    if (snapAcc === 0) {
      issues.push({
        type: 'no-acceptance', severity: 'warn', module: key,
        message: `"${key}" não tem critérios de aceite declarados.`,
        suggestion: `Adicione ao menos 2-3 acceptance criteria. Exemplo: "login válido retorna JWT", "senha incorreta retorna 401".`,
      });
    }

    // ── Módulo estagnado (sem versão nova em > 90 dias) ────────
    const versions2 = store.getVersions(intent.id);
    if (versions2.length > 0) {
      const days = (Date.now() - new Date(versions2[0].created_at).getTime()) / 86400000;
      if (days > 90) {
        issues.push({
          type: 'stale', severity: 'info', module: key,
          message: `"${key}" não tem atualização há ${Math.round(days)} dias.`,
          suggestion: `Execute "idd diff ${key}" para verificar se a implementação ainda reflete a intenção declarada.`,
        });
      }
    }
  }

  return issues.sort((a, b) => {
    const order = { critical: 0, warn: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ── Análise semântica via LLM ────────────────────────────────────

async function semanticSuggest(
  store: Store, apiKey: string, model: string
): Promise<string[]> {
  const intents = store.listIntents();
  const summary = intents.map(i => {
    const versions = store.getVersions(i.id);
    let deps: string[] = [];
    if (versions[0]?.yaml_snapshot) {
      try { deps = (JSON.parse(versions[0].yaml_snapshot) as any).depends_on ?? []; } catch {}
    }
    return `${i.module}/${i.sub} (deps: ${deps.join(', ') || 'nenhuma'})`;
  }).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      system: [
        'Você é um arquiteto de software especializado em design de módulos e microserviços.',
        'Analise o grafo de intenções IDD e forneça sugestões de melhoria arquitetural.',
        'Seja conciso e prático. Foque em padrões de refatoração concretos.',
        'Retorne APENAS JSON: {"suggestions": ["string", ...]} (máximo 5 sugestões)',
      ].join('\n'),
      messages: [{
        role: 'user',
        content: `Grafo de intenções do projeto:\n\n${summary}\n\nForneça sugestões arquiteturais para melhorar coesão, reduzir acoplamento e identificar oportunidades de refatoração.`,
      }],
    }),
  });

  if (!res.ok) return [];
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const raw  = data.content.find(b => b.type === 'text')?.text ?? '{}';
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*/m, '').replace(/```$/m, '').trim());
    return parsed.suggestions ?? [];
  } catch { return []; }
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdSuggest(args: string[]): Promise<void> {
  const semanticFlag = args.includes('--semantic') || args.includes('-s');
  const outArg       = args.find(a => a.startsWith('--out='))?.split('=')[1];
  const root         = findProjectRoot() ?? process.cwd();

  header('suggest');

  const store = new Store(root);
  store.open();

  try {
    const intents = store.listIntents();
    if (intents.length === 0) {
      info('Nenhuma intenção registrada — execute "idd generate" para começar.');
      footer('');
      return;
    }

    // ── Análise estática ─────────────────────────────────────────
    const spin1 = spinner('Analisando grafo de intenções...');
    const staticIssues = analyzeGraph(store);
    spin1.stop(true);

    const critical = staticIssues.filter(i => i.severity === 'critical');
    const warnings = staticIssues.filter(i => i.severity === 'warn');
    const infos    = staticIssues.filter(i => i.severity === 'info');

    console.log('');
    row('módulos analisados', `${intents.length}`);
    row('críticos',           critical.length > 0 ? `${RED}${critical.length}${RESET}` : `${GREEN}0${RESET}`);
    row('avisos',             warnings.length > 0 ? `${YELLOW}${warnings.length}${RESET}` : `${GREEN}0${RESET}`);
    row('informativos',       `${GRAY}${infos.length}${RESET}`);

    if (staticIssues.length === 0) {
      console.log(`\n  ${GREEN}✓ Grafo de intenções sem problemas detectados.${RESET}\n`);
    } else {
      console.log('');
      for (const issue of staticIssues) {
        const icon  = issue.severity === 'critical' ? `${RED}✗${RESET}` :
                      issue.severity === 'warn'     ? `${YELLOW}⚠${RESET}` : `${CYAN}ℹ${RESET}`;
        const badge = `${GRAY}[${issue.type}]${RESET}`;
        console.log(`  ${icon} ${badge} ${BOLD}${issue.module}${RESET}`);
        console.log(`    ${issue.message}`);
        console.log(`    ${GRAY}💡 ${issue.suggestion}${RESET}`);
        console.log('');
      }
    }

    // ── Análise semântica via LLM (opcional) ────────────────────
    let llmSuggestions: string[] = [];
    if (semanticFlag) {
      const apiKey = getApiKey();
      if (!apiKey) {
        warn('ANTHROPIC_API_KEY não definida — análise semântica ignorada.');
      } else {
        const rl = checkRateLimit();
        if (!rl.allowed) {
          warn(`Rate limit atingido (${rl.callsUsed}/${rl.callsLimit}). Tente novamente em ${rl.resetInSecs}s.`);
        } else {
          const model = process.env.IDD_MODEL ?? 'claude-sonnet-4-20250514';
          const spin2 = spinner('Analisando arquitetura via LLM...');
          try {
            llmSuggestions = await semanticSuggest(store, apiKey, model);
            recordCall();
            spin2.stop(true);
          } catch {
            spin2.stop(false);
          }

          if (llmSuggestions.length > 0) {
            console.log(`\n  ${BOLD}${PURPLE}Sugestões arquiteturais (LLM):${RESET}\n`);
            llmSuggestions.forEach((s, i) => {
              console.log(`  ${PURPLE}${i + 1}.${RESET} ${s}`);
              console.log('');
            });
          }
        }
      }
    }

    // ── Exportar ─────────────────────────────────────────────────
    if (outArg) {
      const lines = [
        `# IDD Suggest — ${new Date().toLocaleDateString('pt-BR')}`,
        '',
        `## Problemas detectados (${staticIssues.length})`,
        '',
        ...staticIssues.map(i =>
          `### ${i.severity === 'critical' ? '🔴' : i.severity === 'warn' ? '🟡' : 'ℹ️'} ${i.type}: ${i.module}\n\n${i.message}\n\n💡 ${i.suggestion}\n`
        ),
        ...(llmSuggestions.length > 0 ? [
          `## Sugestões arquiteturais (LLM)`, '',
          ...llmSuggestions.map((s, i) => `${i + 1}. ${s}\n`),
        ] : []),
      ];
      const outPath = path.isAbsolute(outArg) ? outArg : path.join(process.cwd(), outArg);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
      success(`Relatório salvo em: ${outPath}`);
    }

    footer([
      '"idd suggest --semantic"        → inclui análise arquitetural via LLM',
      '"idd suggest --out=report.md"   → exportar relatório',
    ].join('\n  '));

  } finally {
    store.close();
  }
}
