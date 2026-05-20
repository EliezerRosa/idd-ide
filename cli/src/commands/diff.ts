// src/commands/diff.ts
import * as fs   from 'node:fs';
import * as path from 'node:path';
import yaml      from 'js-yaml';
import { header, footer, row, error, warn, info, spinner,
         BOLD, RESET, RED, GREEN, YELLOW, GRAY, CYAN, PURPLE, WHITE } from '../lib/ui.ts';
import { Store, findProjectRoot } from '../lib/store.ts';

interface IntentYaml {
  intent:      string;
  module:      string;
  constraints: string[];
  acceptance:  string[];
  depends_on?: string[];
  language?:   string;
}

interface DiffLine {
  lineNo:   number;
  content:  string;
  kind:     'ok' | 'drift' | 'warn' | 'added' | 'removed' | 'neutral';
  annotation?: string;
}

// ── Padrões que causam anotações inline ─────────────────────────

const INLINE_CHECKS: Array<{
  re:          RegExp;
  annotation:  string;
  kind:        'drift' | 'warn';
}> = [
  { re: /console\.log\s*\(.*(?:password|senha|secret|passwd)/i,
    annotation: '← DRIFT: credencial exposta em log',       kind: 'drift' },
  { re: /console\.log\s*\(.*token/i,
    annotation: '← aviso: token visível em log',            kind: 'warn'  },
  { re: /Math\.random\(\)/,
    annotation: '← aviso: não seguro para criptografia',    kind: 'warn'  },
  { re: /eval\s*\(/,
    annotation: '← DRIFT: eval() — risco de injeção',       kind: 'drift' },
  { re: /TODO|FIXME|HACK/,
    annotation: '← aviso: código incompleto',               kind: 'warn'  },
  { re: /SELECT\s+\*/i,
    annotation: '← aviso: SELECT * expõe colunas desnecessárias', kind: 'warn' },
];

// Mapeamento constraint keyword → função esperada
const CONSTRAINT_FN_MAP: Array<{
  keyword:    RegExp;
  fnPattern:  RegExp;
  label:      string;
}> = [
  { keyword: /bloquear|lockout|tentativa/i,  fnPattern: /getAttempts|lockout|attempt/i,
    label: 'lockout' },
  { keyword: /jwt|token.*expir/i,            fnPattern: /signJWT|jwt\.sign|createToken/i,
    label: 'JWT' },
  { keyword: /hash|bcrypt|argon/i,           fnPattern: /bcrypt|argon2|hash/i,
    label: 'hash de senha' },
  { keyword: /validar|validação/i,           fnPattern: /validate|isValid|throw/i,
    label: 'validação' },
];

// ── Geração do diff anotado ──────────────────────────────────────

function annotateLine(line: string, intent: IntentYaml): DiffLine['kind'] | null {
  for (const { re } of INLINE_CHECKS) {
    if (re.test(line)) return 'drift';
  }
  return null;
}

function getAnnotation(line: string): string {
  for (const { re, annotation } of INLINE_CHECKS) {
    if (re.test(line)) return annotation;
  }
  return '';
}

function buildDiff(
  intentCode: string | null,
  currentCode: string,
  intent: IntentYaml
): DiffLine[] {
  const currentLines = currentCode.split('\n');
  const result: DiffLine[] = [];

  // Se temos o código gerado originalmente, fazemos diff real
  // Caso contrário, apenas anotamos o código atual
  for (let i = 0; i < currentLines.length; i++) {
    const line       = currentLines[i];
    const annotation = getAnnotation(line);
    const hasDrift   = INLINE_CHECKS.some(c => c.re.test(line) && c.kind === 'drift');
    const hasWarn    = INLINE_CHECKS.some(c => c.re.test(line) && c.kind === 'warn');

    result.push({
      lineNo:     i + 1,
      content:    line,
      kind:       hasDrift ? 'drift' : hasWarn ? 'warn' : 'ok',
      annotation: annotation || undefined,
    });
  }

  return result;
}

// ── Detecção de constraints ausentes ────────────────────────────

function findMissingConstraints(
  code: string, intent: IntentYaml
): Array<{ constraint: string; missing: string }> {
  const missing = [];
  for (const { keyword, fnPattern, label } of CONSTRAINT_FN_MAP) {
    const hasConstraint = intent.constraints.some(c => keyword.test(c));
    if (hasConstraint && !fnPattern.test(code)) {
      const constraint = intent.constraints.find(c => keyword.test(c)) ?? '';
      missing.push({ constraint, missing: label });
    }
  }
  return missing;
}

// ── Renderização do diff no terminal ────────────────────────────

const TERM_WIDTH = process.stdout.columns ?? 100;
const HALF       = Math.floor((TERM_WIDTH - 4) / 2);

function pad(s: string, len: number): string {
  const plain = s.replace(/\x1b\[[0-9;]*m/g, '');
  return s + ' '.repeat(Math.max(0, len - plain.length));
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len - 1) + '…';
}

function renderSplitView(
  intent: IntentYaml,
  diff: DiffLine[],
  missingConstraints: Array<{ constraint: string; missing: string }>
): void {
  const divider = `${GRAY}│${RESET}`;

  // Header
  const lHead = pad(`  ${BOLD}${CYAN}INTENÇÃO — ${intent.module}${RESET}`, HALF);
  const rHead = `  ${BOLD}${WHITE}CÓDIGO ATUAL${RESET}`;
  console.log(`\n${lHead} ${divider} ${rHead}`);
  console.log(`  ${GRAY}${'─'.repeat(HALF - 2)}${RESET} ${divider} ${GRAY}${'─'.repeat(HALF - 2)}${RESET}`);

  // Painel esquerdo: intenção estruturada
  const intentLines = buildIntentPanel(intent);

  // Painel direito: código anotado
  const maxLines = Math.max(intentLines.length, diff.length);

  for (let i = 0; i < maxLines; i++) {
    const left  = intentLines[i] ?? '';
    const right = diff[i];

    const leftStr  = truncate(left, HALF - 2);
    const leftPad  = pad(`  ${leftStr}`, HALF);

    let rightStr = '';
    if (right) {
      const lineNum   = `${GRAY}${String(right.lineNo).padStart(3)} ${RESET}`;
      const lineColor =
        right.kind === 'drift' ? RED :
        right.kind === 'warn'  ? YELLOW : '';
      const annotColor =
        right.kind === 'drift' ? `${RED}${BOLD}` :
        right.kind === 'warn'  ? YELLOW : '';

      const annotation = right.annotation
        ? ` ${annotColor}${right.annotation}${RESET}`
        : '';
      const code = truncate(right.content, HALF - 10);
      rightStr = `${lineNum}${lineColor}${code}${RESET}${annotation}`;
    }

    console.log(`${leftPad} ${divider} ${rightStr}`);
  }

  console.log(`  ${GRAY}${'─'.repeat(HALF - 2)}${RESET} ${divider} ${GRAY}${'─'.repeat(HALF - 2)}${RESET}`);
}

function buildIntentPanel(intent: IntentYaml): string[] {
  const lines: string[] = [];
  lines.push(`${BOLD}intent:${RESET}`);

  // Quebra intenção em linhas de ~40 chars
  const words    = intent.intent.split(' ');
  let   currLine = '';
  for (const w of words) {
    if (currLine.length + w.length > 38) {
      lines.push(`  ${CYAN}${currLine.trim()}${RESET}`);
      currLine = w + ' ';
    } else {
      currLine += w + ' ';
    }
  }
  if (currLine.trim()) lines.push(`  ${CYAN}${currLine.trim()}${RESET}`);

  lines.push('');
  lines.push(`${BOLD}constraints:${RESET}`);
  for (const c of intent.constraints) {
    const words2 = c.split(' ');
    let   cur    = '';
    let   first  = true;
    for (const w of words2) {
      if (cur.length + w.length > 34) {
        const prefix = first ? `  ${YELLOW}▸ ` : '    ';
        lines.push(`${prefix}${cur.trim()}${RESET}`);
        cur   = w + ' ';
        first = false;
      } else {
        cur += w + ' ';
      }
    }
    const prefix = first ? `  ${YELLOW}▸ ` : '    ';
    if (cur.trim()) lines.push(`${prefix}${cur.trim()}${RESET}`);
  }

  lines.push('');
  lines.push(`${BOLD}acceptance:${RESET}`);
  for (const a of intent.acceptance) {
    lines.push(`  ${GREEN}✓ ${truncate(a, 34)}${RESET}`);
  }

  if (intent.depends_on?.length) {
    lines.push('');
    lines.push(`${BOLD}depends_on:${RESET}`);
    for (const d of intent.depends_on) {
      lines.push(`  ${PURPLE}→ ${d}${RESET}`);
    }
  }

  return lines;
}

// ── Análise LLM (opcional) ───────────────────────────────────────

async function llmDiff(intent: IntentYaml, code: string): Promise<{
  summary:    string;
  changes:    Array<{ line: number; issue: string; kind: 'drift' | 'warn' }>;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  const model  = process.env.IDD_MODEL ?? 'claude-sonnet-4-20250514';
  if (!apiKey) return { summary: '', changes: [] };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system: [
        'Analise desvios entre intenção e código.',
        'Retorne APENAS JSON: { "summary": string, "changes": [{line: number, issue: string, kind: "drift"|"warn"}] }',
        'Foque em desvios semânticos que análise estática não detecta.',
      ].join('\n'),
      messages: [{
        role: 'user',
        content: [
          `INTENÇÃO: ${intent.intent}`,
          `CONSTRAINTS: ${intent.constraints.join('; ')}`,
          `CÓDIGO:\n\`\`\`\n${code.slice(0, 2000)}\n\`\`\``,
        ].join('\n'),
      }],
    }),
  });

  if (!res.ok) return { summary: '', changes: [] };
  try {
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content.find(b => b.type === 'text')?.text ?? '{}';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { summary: '', changes: [] };
  }
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdDiff(args: string[]): Promise<void> {
  const target    = args.find(a => !a.startsWith('--'));
  const semantic  = args.includes('--semantic');
  const splitView = !args.includes('--linear');

  header('diff');

  const root  = findProjectRoot() ?? process.cwd();
  const store = new Store(root);
  store.open();

  // Coletar .intent.yaml(s)
  const yamlFiles = target
    ? findTarget(root, target)
    : findAll(process.cwd(), '.intent.yaml');

  if (yamlFiles.length === 0) {
    warn(target
      ? `Intenção "${target}" não encontrada.`
      : 'Nenhum .intent.yaml encontrado no diretório atual.');
    store.close();
    return;
  }

  for (const yamlPath of yamlFiles) {
    const intentRaw = fs.readFileSync(yamlPath, 'utf8');
    const intent    = yaml.load(intentRaw) as IntentYaml;

    const [, sub]   = intent.module.split('/');
    const ext       = intent.language === 'python' ? 'py' :
                      intent.language === 'go'     ? 'go' : 'ts';
    const codeFile  = path.join(path.dirname(yamlPath), `${sub}.${ext}`);

    if (!fs.existsSync(codeFile)) {
      warn(`${intent.module}: código não gerado ainda — execute "idd generate ${intent.module}"`);
      continue;
    }

    const code = fs.readFileSync(codeFile, 'utf8');

    // Análise estática
    const diff               = buildDiff(null, code, intent);
    const missingConstraints = findMissingConstraints(code, intent);

    // Análise semântica opcional
    let llmResult: { summary: string; changes: Array<{ line: number; issue: string; kind: 'drift' | 'warn' }> } | null = null;
    if (semantic) {
      const spin = spinner(`${intent.module} — análise semântica (LLM)...`);
      llmResult  = await llmDiff(intent, code);
      spin.stop(true);

      // Aplica anotações LLM ao diff
      for (const change of llmResult.changes ?? []) {
        const line = diff.find(l => l.lineNo === change.line);
        if (line) {
          line.kind       = change.kind;
          line.annotation = `← ${change.kind === 'drift' ? 'DRIFT' : 'aviso'}: ${change.issue}`;
        }
      }
    }

    const driftLines   = diff.filter(l => l.kind === 'drift');
    const warnLines    = diff.filter(l => l.kind === 'warn');
    const overallStatus =
      driftLines.length > 0 || missingConstraints.some(m => m) ? 'drift' :
      warnLines.length  > 0                                     ? 'warn'  : 'ok';

    // Renderização
    if (splitView) {
      renderSplitView(intent, diff, missingConstraints);
    } else {
      renderLinear(intent, diff);
    }

    // Resumo de problemas encontrados
    console.log('');

    if (missingConstraints.length > 0) {
      console.log(`  ${BOLD}${RED}Constraints sem implementação:${RESET}`);
      for (const { constraint, missing } of missingConstraints) {
        console.log(`  ${RED}✗  "${constraint}"${RESET}`);
        console.log(`     ${GRAY}→ esperava encontrar: ${missing}${RESET}`);
      }
      console.log('');
    }

    if (driftLines.length > 0) {
      console.log(`  ${BOLD}${RED}Linhas com drift (${driftLines.length}):${RESET}`);
      for (const l of driftLines) {
        console.log(`  ${RED}L${l.lineNo}${RESET}  ${l.annotation}`);
      }
      console.log('');
    }

    if (warnLines.length > 0) {
      console.log(`  ${BOLD}${YELLOW}Avisos (${warnLines.length}):${RESET}`);
      for (const l of warnLines) {
        console.log(`  ${YELLOW}L${l.lineNo}${RESET}  ${l.annotation}`);
      }
      console.log('');
    }

    if (llmResult?.summary) {
      console.log(`  ${BOLD}Análise semântica:${RESET}`);
      console.log(`  ${GRAY}${llmResult.summary}${RESET}\n`);
    }

    // Score final
    const score =
      driftLines.length > 0 || missingConstraints.length > 0 ? 30 :
      warnLines.length  > 0                                   ? 75 : 100;

    row('score de alinhamento',
      score >= 90 ? `${GREEN}${score}%${RESET}` :
      score >= 60 ? `${YELLOW}${score}%${RESET}` :
                    `${RED}${score}%${RESET}`
    );
    row('status',
      overallStatus === 'ok'    ? `${GREEN}alinhado${RESET}` :
      overallStatus === 'drift' ? `${RED}drift detectado${RESET}` :
                                  `${YELLOW}aviso${RESET}`
    );
  }

  store.close();
  footer([
    '"idd diff --semantic"  → inclui análise via LLM',
    '"idd diff --linear"    → vista linear em vez de split',
    '"idd verify"           → verificação completa de todos os módulos',
  ].join('\n  '));
}

// ── Vista linear (alternativa ao split) ─────────────────────────

function renderLinear(intent: IntentYaml, diff: DiffLine[]): void {
  console.log(`\n  ${BOLD}${CYAN}━━ INTENÇÃO ━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  ${intent.intent}`);
  console.log(`\n  ${BOLD}constraints:${RESET}`);
  intent.constraints.forEach(c => console.log(`  ${YELLOW}▸ ${c}${RESET}`));
  console.log(`\n  ${BOLD}${WHITE}━━ CÓDIGO ATUAL ━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

  for (const line of diff) {
    const num   = `${GRAY}${String(line.lineNo).padStart(4)} ${RESET}`;
    const color = line.kind === 'drift' ? RED : line.kind === 'warn' ? YELLOW : '';
    const ann   = line.annotation ? `  ${color}${line.annotation}${RESET}` : '';
    console.log(`  ${num}${color}${line.content}${RESET}${ann}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function findTarget(root: string, target: string): string[] {
  const [mod, sub] = target.split('/');
  const candidates = [
    path.join(root, 'src', mod, `${sub}.intent.yaml`),
    path.join(root, mod, `${sub}.intent.yaml`),
    path.join(process.cwd(), `${sub}.intent.yaml`),
    path.join(process.cwd(), `${mod}/${sub}.intent.yaml`),
  ];
  return candidates.filter(p => fs.existsSync(p));
}

function findAll(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())           results.push(...findAll(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}
