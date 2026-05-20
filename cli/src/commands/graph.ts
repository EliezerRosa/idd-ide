// src/commands/graph.ts
import { header, row, footer, table, statusBadge,
         BOLD, RESET, PURPLE, GREEN, RED, YELLOW, GRAY, CYAN, WHITE } from '../lib/ui.ts';
import { Store, findProjectRoot, Intent } from '../lib/store.ts';

interface Node {
  id:     string;
  module: string;
  sub:    string;
  status: string;
  deps:   string[];
  uses:   string[];
}

// ── Construção do grafo ─────────────────────────────────────────

function buildNodes(store: Store): Node[] {
  const intents = store.listIntents();
  const nodes: Node[] = [];

  for (const intent of intents) {
    const versions = store.getVersions(intent.id);
    const latest   = versions[0];
    let deps: string[] = [];

    if (latest?.yaml_snapshot) {
      try {
        const snap = JSON.parse(latest.yaml_snapshot) as { depends_on?: string[] };
        deps = snap.depends_on ?? [];
      } catch { /* skip */ }
    }

    nodes.push({
      id:     `${intent.module}/${intent.sub}`,
      module:  intent.module,
      sub:     intent.sub,
      status:  intent.status,
      deps,
      uses:   [],
    });
  }

  // Preencher used_by (inverso de deps)
  for (const n of nodes) {
    for (const dep of n.deps) {
      const target = nodes.find(x => x.id === dep);
      if (target) target.uses.push(n.id);
    }
  }

  return nodes;
}

// ── Renderização em árvore ASCII ────────────────────────────────

function statusIcon(status: string): string {
  switch (status) {
    case 'ok':    return `${GREEN}●${RESET}`;
    case 'drift': return `${RED}●${RESET}`;
    case 'warn':  return `${YELLOW}●${RESET}`;
    default:      return `${GRAY}○${RESET}`;
  }
}

function renderTree(nodes: Node[]): void {
  // Encontra raízes (sem dependências ou cujas deps não estão no grafo)
  const allIds = new Set(nodes.map(n => n.id));
  const roots  = nodes.filter(n =>
    n.deps.length === 0 || n.deps.every(d => !allIds.has(d))
  );

  if (roots.length === 0) {
    // Grafo cíclico ou todos têm deps: renderiza todos na ordem
    nodes.forEach((n, i) => printNode(n, '', i === nodes.length - 1));
    return;
  }

  const visited = new Set<string>();

  function printNode(node: Node, prefix: string, isLast: boolean): void {
    if (visited.has(node.id)) {
      console.log(`${prefix}${isLast ? '└─' : '├─'} ${statusIcon('orphan')} ${GRAY}${node.id} (→ já exibido)${RESET}`);
      return;
    }
    visited.add(node.id);

    const connector = isLast ? '└─' : '├─';
    const childPfx  = prefix + (isLast ? '   ' : '│  ');
    const drift     = node.status === 'drift' ? ` ${RED}← DRIFT${RESET}` : '';
    const warn      = node.status === 'warn'  ? ` ${YELLOW}← aviso${RESET}`  : '';

    console.log(`${prefix}${connector} ${statusIcon(node.status)} ${BOLD}${node.id}${RESET}${drift}${warn}`);

    // Mostra constraints resumidas
    if (node.deps.length > 0) {
      const depStr = node.deps.map(d => `${CYAN}${d}${RESET}`).join(', ');
      console.log(`${childPfx}   ${GRAY}deps: ${depStr}${RESET}`);
    }

    const children = nodes.filter(n => n.deps.includes(node.id));
    children.forEach((child, i) => {
      printNode(child, childPfx, i === children.length - 1);
    });
  }

  roots.forEach((root, i) => printNode(root, '  ', i === roots.length - 1));
}

// ── Análise de impacto ───────────────────────────────────────────

function impactAnalysis(nodes: Node[], targetId: string): string[] {
  const affected = new Set<string>();

  function traverse(id: string): void {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    for (const user of node.uses) {
      if (!affected.has(user)) {
        affected.add(user);
        traverse(user);
      }
    }
  }

  traverse(targetId);
  return [...affected];
}

// ── Exportação JSON ─────────────────────────────────────────────

function exportJson(nodes: Node[]): void {
  const data = {
    generated_at: new Date().toISOString(),
    nodes: nodes.map(n => ({
      id: n.id, module: n.module, sub: n.sub,
      status: n.status, deps: n.deps, uses: n.uses
    })),
    edges: nodes.flatMap(n => n.deps.map(dep => ({ from: dep, to: n.id })))
  };
  console.log(JSON.stringify(data, null, 2));
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdGraph(args: string[]): Promise<void> {
  const asJson   = args.includes('--json');
  const impact   = args.find(a => a.startsWith('--impact='))?.split('=')[1];
  const detailed = args.includes('--detailed');

  const root  = findProjectRoot() ?? process.cwd();
  const store = new Store(root);
  store.open();

  const nodes = buildNodes(store);
  store.close();

  if (nodes.length === 0) {
    header('graph');
    console.log(`\n  ${GRAY}Nenhuma intenção registrada. Execute "idd generate" primeiro.${RESET}\n`);
    return;
  }

  // ── Modo JSON ────────────────────────────────────────────────
  if (asJson) {
    exportJson(nodes);
    return;
  }

  // ── Modo análise de impacto ──────────────────────────────────
  if (impact) {
    header('graph — análise de impacto');
    const affected = impactAnalysis(nodes, impact);
    if (affected.length === 0) {
      console.log(`\n  ${GREEN}Nenhuma intenção afetada por mudanças em "${impact}".${RESET}\n`);
    } else {
      console.log(`\n  ${YELLOW}Mudanças em ${BOLD}${impact}${RESET}${YELLOW} afetam:${RESET}\n`);
      affected.forEach(id => {
        const n = nodes.find(x => x.id === id);
        console.log(`    ${statusIcon(n?.status ?? 'orphan')} ${id}`);
      });
      console.log('');
      footer(`${affected.length} intenção(ões) potencialmente afetada(s).`);
    }
    return;
  }

  // ── Modo tabela detalhada ────────────────────────────────────
  if (detailed) {
    header('graph — detalhado');
    table(
      ['módulo', 'status', 'deps', 'usado por'],
      nodes.map(n => [
        n.id,
        statusBadge(n.status),
        n.deps.length > 0 ? n.deps.join(', ') : '—',
        n.uses.length > 0 ? n.uses.join(', ') : '—',
      ])
    );
    footer('');
    return;
  }

  // ── Modo padrão: árvore ──────────────────────────────────────
  header('graph');

  // Estatísticas
  const ok     = nodes.filter(n => n.status === 'ok').length;
  const drift  = nodes.filter(n => n.status === 'drift').length;
  const warn   = nodes.filter(n => n.status === 'warn').length;
  const orphan = nodes.filter(n => n.status === 'orphan' || (n.deps.length === 0 && n.uses.length === 0)).length;

  row('total',    `${nodes.length} intenções`);
  row('vínculos', `${nodes.flatMap(n => n.deps).length} arestas`);
  console.log('');

  // Legenda
  console.log(`  ${statusIcon('ok')} alinhada  ${statusIcon('drift')} drift  ${statusIcon('warn')} aviso  ${statusIcon('orphan')} órfã\n`);

  // Árvore
  renderTree(nodes);

  console.log('');

  // Sumário de status
  if (drift > 0 || warn > 0) {
    console.log(`  ${GRAY}─────────────────────────────────────${RESET}`);
    if (drift  > 0) console.log(`  ${RED}${drift} com drift${RESET}   — execute "idd verify" para detalhes`);
    if (warn   > 0) console.log(`  ${YELLOW}${warn} com aviso${RESET}  — revise as constraints`);
    if (orphan > 0) console.log(`  ${GRAY}${orphan} órfã(s)${RESET}    — sem vínculos declarados`);
  }

  footer([
    '"idd graph --detailed"  → tabela com todas as relações',
    '"idd graph --impact=<módulo/sub>"  → impacto de uma mudança',
    '"idd graph --json"  → exportar como JSON',
  ].join('\n  '));
}
