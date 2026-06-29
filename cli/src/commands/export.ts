// src/commands/export.ts — Issue #12: idd export
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { Store, findProjectRoot } from '../lib/store.ts';
import { header, footer, success, error, info, row, BOLD, RESET, GRAY } from '../lib/ui.ts';

// ── Tipos ────────────────────────────────────────────────────────

interface ExportNode {
  id:          string;
  module:      string;
  sub:         string;
  status:      string;
  statement:   string;
  constraints: number;
  criteria:    number;
  versions:    number;
  depends_on:  string[];
  used_by:     string[];
  avg_score:   number;
  trend:       string;
}

interface ExportEdge {
  from:  string;
  to:    string;
  drift: boolean;
}

interface ExportData {
  generated_at: string;
  project:      string;
  nodes:        ExportNode[];
  edges:        ExportEdge[];
}

// ── Status helpers ────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  ok:         '🟢',
  drift:      '🔴',
  warn:       '🟡',
  orphan:     '⚪',
  deprecated: '⚫',
};

const STATUS_LABEL: Record<string, string> = {
  ok:         'Alinhada',
  drift:      'Drift detectado',
  warn:       'Aviso',
  orphan:     'Órfã',
  deprecated: 'Depreciada',
};

// ── Coleta de dados ───────────────────────────────────────────────

function collectExportData(store: Store, projectName: string): ExportData {
  const graph = store.getGraphData();
  return {
    generated_at: new Date().toISOString(),
    project:      projectName,
    nodes:        graph.nodes as ExportNode[],
    edges:        graph.edges as ExportEdge[],
  };
}

// ── Formato: JSON ──────────────────────────────────────────────────

function exportJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

// ── Formato: Markdown ─────────────────────────────────────────────

function exportMarkdown(data: ExportData): string {
  const lines: string[] = [
    `# Arquitetura de Intenções — ${data.project}`,
    '',
    `> Gerado automaticamente por \`idd export\` em ${new Date(data.generated_at).toLocaleString('pt-BR')}`,
    '',
    `## Visão Geral`,
    '',
    `- **Total de intenções:** ${data.nodes.length}`,
    `- **Total de dependências:** ${data.edges.length}`,
    `- **Alinhadas:** ${data.nodes.filter(n => n.status === 'ok').length}`,
    `- **Com drift:** ${data.nodes.filter(n => n.status === 'drift').length}`,
    `- **Com aviso:** ${data.nodes.filter(n => n.status === 'warn').length}`,
    '',
    `## Módulos`,
    '',
    '| Status | Módulo | Intenção | Constraints | Critérios | Score | Versões |',
    '|---|---|---|---|---|---|---|',
  ];

  for (const node of data.nodes) {
    const badge = STATUS_BADGE[node.status] ?? '⚪';
    const intentTruncated = node.statement.length > 60
      ? node.statement.slice(0, 57) + '...'
      : node.statement;
    lines.push(
      `| ${badge} | \`${node.module}/${node.sub}\` | ${intentTruncated} | ${node.constraints} | ${node.criteria} | ${node.avg_score}% | ${node.versions} |`
    );
  }

  lines.push('', `## Dependências`, '');

  const nodesWithDeps = data.nodes.filter(n => n.depends_on.length > 0);
  if (nodesWithDeps.length === 0) {
    lines.push('_Nenhuma dependência declarada entre módulos._');
  } else {
    for (const node of nodesWithDeps) {
      lines.push(`- **${node.module}/${node.sub}** depende de:`);
      for (const dep of node.depends_on) {
        lines.push(`  - \`${dep}\``);
      }
    }
  }

  lines.push('', `## Detalhes por Módulo`, '');

  for (const node of data.nodes) {
    const badge = STATUS_BADGE[node.status] ?? '⚪';
    lines.push(`### ${badge} ${node.module}/${node.sub}`, '');
    lines.push(`**Status:** ${STATUS_LABEL[node.status] ?? node.status}  `);
    lines.push(`**Intenção:** ${node.statement}  `);
    lines.push(`**Alinhamento:** ${node.avg_score}% (tendência: ${node.trend})  `);
    lines.push(`**Constraints:** ${node.constraints} · **Critérios:** ${node.criteria} · **Versões:** ${node.versions}  `);

    if (node.depends_on.length > 0) {
      lines.push(`**Depende de:** ${node.depends_on.map(d => `\`${d}\``).join(', ')}  `);
    }
    if (node.used_by.length > 0) {
      lines.push(`**Usado por:** ${node.used_by.map(d => `\`${d}\``).join(', ')}  `);
    }
    lines.push('');
  }

  lines.push('---', '', `<sub>Gerado por [IDD IDE](https://github.com/EliezerRosa/idd-ide) — \`idd export --format=md\`</sub>`);

  return lines.join('\n');
}

// ── Formato: Mermaid ──────────────────────────────────────────────

function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function exportMermaid(data: ExportData): string {
  const lines: string[] = [
    '```mermaid',
    'graph TD',
  ];

  // Class definitions for status colors
  lines.push(
    '  classDef ok fill:#EAF3DE,stroke:#1D9E75,color:#27500A;',
    '  classDef drift fill:#FCEBEB,stroke:#E24B4A,color:#791F1F,stroke-width:3px;',
    '  classDef warn fill:#FAEEDA,stroke:#EF9F27,color:#633806;',
    '  classDef orphan fill:#F1EFE8,stroke:#888780,color:#5F5E5A;',
    ''
  );

  // Nodes
  for (const node of data.nodes) {
    const id    = sanitizeMermaidId(node.id);
    const label = `${node.module}/${node.sub}`;
    lines.push(`  ${id}["${label}"]`);
  }

  lines.push('');

  // Edges
  for (const edge of data.edges) {
    const from = sanitizeMermaidId(edge.from);
    const to   = sanitizeMermaidId(edge.to);
    const arrow = edge.drift ? '-.->' : '-->';
    lines.push(`  ${from} ${arrow} ${to}`);
  }

  lines.push('');

  // Apply classes
  for (const node of data.nodes) {
    const id  = sanitizeMermaidId(node.id);
    const cls = node.status === 'ok'    ? 'ok'    :
                node.status === 'drift' ? 'drift' :
                node.status === 'warn'  ? 'warn'  : 'orphan';
    lines.push(`  class ${id} ${cls};`);
  }

  lines.push('```');

  return lines.join('\n');
}

// ── Formato: DOT (Graphviz) ───────────────────────────────────────

function exportDot(data: ExportData): string {
  const lines: string[] = [
    `digraph "${data.project}" {`,
    '  rankdir=TB;',
    '  node [shape=box, style="rounded,filled", fontname="Helvetica"];',
    '  edge [color="#888780"];',
    '',
  ];

  const colorFor = (status: string): { fill: string; stroke: string } => {
    switch (status) {
      case 'ok':    return { fill: '#EAF3DE', stroke: '#1D9E75' };
      case 'drift': return { fill: '#FCEBEB', stroke: '#E24B4A' };
      case 'warn':  return { fill: '#FAEEDA', stroke: '#EF9F27' };
      default:      return { fill: '#F1EFE8', stroke: '#888780' };
    }
  };

  for (const node of data.nodes) {
    const id = `"${node.id}"`;
    const { fill, stroke } = colorFor(node.status);
    const label = `${node.module}/${node.sub}\\n${node.avg_score}%`;
    lines.push(`  ${id} [label="${label}", fillcolor="${fill}", color="${stroke}"];`);
  }

  lines.push('');

  for (const edge of data.edges) {
    const style = edge.drift ? ' [style=dashed, color="#E24B4A"]' : '';
    lines.push(`  "${edge.from}" -> "${edge.to}"${style};`);
  }

  lines.push('}');

  return lines.join('\n');
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdExport(args: string[]): Promise<void> {
  const format = args.find(a => a.startsWith('--format='))?.split('=')[1] ?? 'md';
  const outArg = args.find(a => a.startsWith('--out='))?.split('=')[1];

  const root  = findProjectRoot() ?? process.cwd();
  const store = new Store(root);
  store.open();

  try {
    const projectName = path.basename(root);
    const data = collectExportData(store, projectName);

    if (data.nodes.length === 0) {
      header('export');
      info('Nenhuma intenção registrada ainda. Execute "idd generate" primeiro.');
      footer('');
      return;
    }

    let output: string;
    let defaultExt: string;

    switch (format) {
      case 'json':
        output     = exportJson(data);
        defaultExt = 'json';
        break;
      case 'mermaid':
        output     = exportMermaid(data);
        defaultExt = 'md';
        break;
      case 'dot':
        output     = exportDot(data);
        defaultExt = 'dot';
        break;
      case 'md':
      case 'markdown':
        output     = exportMarkdown(data);
        defaultExt = 'md';
        break;
      default:
        error(`Formato desconhecido: "${format}"`);
        info('Formatos disponíveis: md, json, mermaid, dot');
        process.exit(1);
    }

    if (outArg) {
      const outPath = path.isAbsolute(outArg) ? outArg : path.join(process.cwd(), outArg);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, output, 'utf8');

      header('export');
      success(`Exportado: ${outPath}`);
      row('formato',    format);
      row('módulos',    `${data.nodes.length}`);
      row('dependências', `${data.edges.length}`);
      footer('');
    } else {
      // stdout — sem headers decorativos, para permitir pipe/redirect
      console.log(output);
    }
  } finally {
    store.close();
  }
}
