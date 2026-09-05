// src/commands/migrate.ts — Issue #28: idd migrate
// Assiste a migração de codebases existentes para IDD inferindo intenções.
import * as fs   from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { findProjectRoot } from '../lib/store.ts';
import { getApiKey, checkRateLimit, recordCall } from '../lib/security.ts';
import { validateIntent }       from '../lib/security.ts';
import { expandedToYaml }       from './capture.ts';
import {
  header, footer, success, error, info, warn, row, table, spinner,
  BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW,
} from '../lib/ui.ts';

// ── Detector de módulos candidatos ───────────────────────────────

interface CandidateModule {
  module:    string;
  sub:       string;
  files:     string[];
  hasIntent: boolean;
  linesOfCode: number;
}

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'out', 'build', '.idd'];

/**
 * Descobre todos os diretórios chamados 'src' sob root, suportando monorepos
 * onde cada subpacote (ex: cli/src, extensions/idd-core/src) tem sua própria
 * raiz de código — em vez de assumir um único <root>/src fixo.
 * Issue #29.
 */
function findAllSrcRoots(root: string, maxDepth = 4): string[] {
  const found: string[] = [];
  function walk(dir: string, depth: number): void {
    if (depth > maxDepth || !fs.existsSync(dir)) return;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORED_DIRS.includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === 'src') {
        found.push(full);
        continue; // não desce dentro de src/ procurando outro src/ aninhado
      }
      walk(full, depth + 1);
    }
  }
  walk(root, 0);
  return found;
}

/**
 * Encontra a raiz 'src/' mais próxima (ancestral direto) de um arquivo dado,
 * em vez de assumir <projectRoot>/src. Usado para derivar corretamente o
 * nome do módulo em migrate infer. Issue #29.
 */
function findNearestSrcRoot(filePath: string): string | null {
  let dir = path.dirname(filePath);
  while (true) {
    if (path.basename(dir) === 'src') return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null; // chegou na raiz do filesystem
    dir = parent;
  }
}

function scanCandidatesInSrc(srcDir: string, root: string): CandidateModule[] {
  if (!fs.existsSync(srcDir)) return [];

  const candidates: CandidateModule[] = [];
  const CODE_EXTS = ['.ts','.js','.py','.go','.rs','.java','.kt'];

  for (const domainEntry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!domainEntry.isDirectory()) continue;
    const domainDir = path.join(srcDir, domainEntry.name);

    for (const subEntry of fs.readdirSync(domainDir, { withFileTypes: true })) {
      // Files directly in domain dir
      if (!subEntry.isDirectory()) {
        const ext  = path.extname(subEntry.name);
        const base = path.basename(subEntry.name, ext);
        if (!CODE_EXTS.includes(ext)) continue;
        if (base.includes('.test') || base.includes('.spec') || base.includes('_test')) continue;
        if (base === 'index' || base === 'mod') continue;

        const full    = path.join(domainDir, subEntry.name);
        const content = fs.readFileSync(full, 'utf8');
        const hasIntent = fs.existsSync(path.join(domainDir, `${base}.intent.yaml`));

        candidates.push({
          module: domainEntry.name,
          sub:    base,
          files:  [path.relative(root, full)],
          hasIntent,
          linesOfCode: content.split('\n').length,
        });
      }
    }
  }

  return candidates.sort((a, b) => b.linesOfCode - a.linesOfCode);
}

/**
 * Descobre e varre todas as raízes 'src/' do projeto (suporta monorepos
 * com múltiplos subpacotes, ex: cli/src + extensions/idd-core/src).
 * Substitui a suposição anterior de um único <root>/src fixo. Issue #29.
 */
function scanCandidates(root: string): CandidateModule[] {
  const srcRoots = findAllSrcRoots(root);
  if (srcRoots.length === 0) return [];

  const all = srcRoots.flatMap(srcDir => scanCandidatesInSrc(srcDir, root));
  return all.sort((a, b) => b.linesOfCode - a.linesOfCode);
}

// ── LLM inference ────────────────────────────────────────────────

async function inferIntentFromCode(
  code: string, filePath: string, apiKey: string, model: string
): Promise<{ intent: string; constraints: string[]; acceptance: string[] } | null> {
  const module = filePath.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system: [{
        type: 'text',
        text: [
          'Você é um engenheiro de software especializado em Intent Driven Development (IDD).',
          'Analise o código fornecido e infira a intenção original — o QUÊ ele faz, não o COMO.',
          'Extraia constraints (regras de negócio verificáveis) e acceptance criteria (casos de teste).',
          'Retorne APENAS JSON: {"intent":"string","constraints":["string"],"acceptance":["string"]}',
          'intent: descrição clara em português do que o código faz (15-100 chars)',
          'constraints: 2-5 regras de negócio verificáveis (não detalhes de implementação)',
          'acceptance: 2-5 critérios testáveis derivados do comportamento do código',
        ].join('\n'),
        cache_control: { type: 'ephemeral' },
      }],
      messages: [{
        role: 'user',
        content: `Arquivo: ${filePath}\n\n\`\`\`\n${code.slice(0, 2000)}\n\`\`\``,
      }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const raw  = data.content.find(b => b.type === 'text')?.text ?? '{}';
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*/m,'').replace(/```$/m,'').trim());
    return parsed;
  } catch { return null; }
}

// ── idd migrate scan ──────────────────────────────────────────────

async function migrateScan(args: string[]): Promise<void> {
  const root = findProjectRoot() ?? process.cwd();
  header('migrate scan');

  const candidates = scanCandidates(root);
  if (candidates.length === 0) {
    info('Nenhum módulo candidato encontrado em src/. Certifique-se de ter arquivos .ts/.py/.go.');
    footer(''); return;
  }

  const withIntent    = candidates.filter(c => c.hasIntent);
  const withoutIntent = candidates.filter(c => !c.hasIntent);
  const coverage      = Math.round((withIntent.length / candidates.length) * 100);

  console.log('');
  row('módulos encontrados',  `${candidates.length}`);
  row('com intenção',         `${GREEN}${withIntent.length}${RESET}`);
  row('sem intenção',         withoutIntent.length > 0 ? `${RED}${withoutIntent.length}${RESET}` : `${GREEN}0${RESET}`);
  row('cobertura IDD',        coverage >= 80 ? `${GREEN}${coverage}%${RESET}` :
                              coverage >= 50 ? `${YELLOW}${coverage}%${RESET}` : `${RED}${coverage}%${RESET}`);

  if (withoutIntent.length > 0) {
    console.log(`\n  ${BOLD}Módulos sem intenção declarada (${withoutIntent.length}):${RESET}\n`);
    table(
      ['módulo', 'linhas', 'arquivo'],
      withoutIntent.slice(0, 10).map(c => [
        `${YELLOW}${c.module}/${c.sub}${RESET}`,
        `${c.linesOfCode}`,
        `${GRAY}${c.files[0]}${RESET}`,
      ])
    );
    if (withoutIntent.length > 10) {
      info(`... e mais ${withoutIntent.length - 10} módulos.`);
    }
  }

  footer([
    '"idd migrate infer <arquivo>"   → inferir intenção de um arquivo',
    '"idd migrate batch [--yes]"     → processar todos os módulos sem intent',
    '"idd migrate report"            → relatório de cobertura por domínio',
  ].join('\n  '));
}

// ── idd migrate infer ─────────────────────────────────────────────

async function migrateInfer(args: string[]): Promise<void> {
  const target = args.find(a => !a.startsWith('--'));
  const autoYes= args.includes('--yes') || args.includes('-y');
  const dryRun = args.includes('--dry-run');
  const root   = findProjectRoot() ?? process.cwd();

  header('migrate infer');

  if (!target) {
    error('Uso: idd migrate infer <arquivo.ts|.py|.go> [--yes] [--dry-run]');
    process.exit(1);
  }

  // Resolve relativo ao diretório atual primeiro (mais intuitivo — é de onde
  // o usuário digitou o comando), com fallback para relativo à raiz do
  // projeto por compatibilidade. Issue #29.
  const filePath = path.isAbsolute(target)
    ? target
    : fs.existsSync(path.join(process.cwd(), target))
      ? path.join(process.cwd(), target)
      : path.join(root, target);
  if (!fs.existsSync(filePath)) {
    error(`Arquivo não encontrado: ${filePath}`); process.exit(1);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    error('ANTHROPIC_API_KEY não definida — necessária para inferência de intenções.');
    process.exit(1);
  }

  const rl = checkRateLimit();
  if (!rl.allowed) {
    error(`Rate limit atingido. Aguarde ${rl.resetInSecs}s.`); process.exit(1);
  }

  const code  = fs.readFileSync(filePath, 'utf8');
  const model = process.env.IDD_MODEL ?? 'claude-sonnet-5';
  const spin  = spinner('Inferindo intenção via LLM...');

  const inferred = await inferIntentFromCode(code, path.relative(root, filePath), apiKey, model);
  recordCall();
  spin.stop(!!inferred);

  if (!inferred) {
    error('Não foi possível inferir a intenção. Tente com --dry-run para debug.');
    process.exit(1);
  }

  // Determine module from file path — usa a raiz 'src/' mais próxima do
  // arquivo, não uma assumida fixa em <root>/src (Issue #29). Funciona
  // corretamente em monorepos: para cli/src/commands/review.ts, a raiz
  // mais próxima é cli/src/, então module = commands/review.
  const nearestSrc = findNearestSrcRoot(filePath);
  const parts    = nearestSrc
    ? path.relative(nearestSrc, filePath).split(path.sep)
    : path.relative(root, filePath).split(path.sep); // fallback se não achar src/ ancestral
  const modName  = parts[0] ?? 'unknown';
  const subName  = path.basename(parts[1] ?? parts[0], path.extname(parts[1] ?? parts[0]));
  const module   = `${modName}/${subName}`;

  const expanded = { intent: inferred.intent, module, constraints: inferred.constraints, acceptance: inferred.acceptance };
  const yamlContent = expandedToYaml(expanded);

  console.log('');
  row('arquivo', path.relative(root, filePath));
  row('módulo',  module);
  console.log(`  ${GRAY}intent:${RESET}      ${inferred.intent}`);
  console.log(`  ${GRAY}constraints:${RESET}  ${inferred.constraints.length} encontradas`);
  console.log(`  ${GRAY}acceptance:${RESET}   ${inferred.acceptance.length} critérios`);

  if (dryRun) {
    console.log(`\n${GRAY}--- YAML gerado ---${RESET}`);
    console.log(yamlContent.split('\n').map(l => `  ${l}`).join('\n'));
    footer('Remova --dry-run para salvar o arquivo.');
    return;
  }

  // Validate
  const yaml2 = await import('js-yaml');
  const parsed = yaml2.load(yamlContent) as unknown;
  const result = validateIntent(parsed);
  if (!result.valid) {
    warn('Intenção inferida tem problemas de schema — revise manualmente:');
    result.errors.forEach(e => console.log(`    ${e.field}: ${e.message}`));
  }

  // Confirm
  if (!autoYes) {
    const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = await new Promise<string>(resolve => {
      rl2.question(`\n  Criar ${CYAN}${module}${RESET}.intent.yaml? (s/N) `, a => { rl2.close(); resolve(a.trim().toLowerCase()); });
    });
    if (ans !== 's') { info('Cancelado.'); return; }
  }

  // Write
  const destDir  = path.join(root, 'src', modName);
  const destFile = path.join(destDir, `${subName}.intent.yaml`);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(destFile, yamlContent, 'utf8');
  success(`${destFile}`);
  footer(`"idd generate ${module}" → gerar código a partir da intenção inferida`);
}

// ── idd migrate report ────────────────────────────────────────────

async function migrateReport(args: string[]): Promise<void> {
  const root = findProjectRoot() ?? process.cwd();
  header('migrate report');

  const candidates = scanCandidates(root);
  if (candidates.length === 0) { info('Nenhum módulo encontrado.'); footer(''); return; }

  const byDomain: Record<string, { total: number; covered: number }> = {};
  for (const c of candidates) {
    if (!byDomain[c.module]) byDomain[c.module] = { total: 0, covered: 0 };
    byDomain[c.module].total++;
    if (c.hasIntent) byDomain[c.module].covered++;
  }

  const total   = candidates.length;
  const covered = candidates.filter(c => c.hasIntent).length;
  const overall = Math.round((covered / total) * 100);

  console.log('');
  row('total de módulos', `${total}`);
  row('cobertos pelo IDD', `${GREEN}${covered}${RESET}`);
  row('cobertura geral',  `${overall >= 80 ? GREEN : overall >= 50 ? YELLOW : RED}${overall}%${RESET}`);

  console.log(`\n  ${BOLD}Cobertura por domínio:${RESET}\n`);
  table(
    ['domínio', 'cobertos', 'total', 'cobertura'],
    Object.entries(byDomain).map(([domain, { covered, total }]) => {
      const pct   = Math.round((covered / total) * 100);
      const color = pct === 100 ? GREEN : pct >= 50 ? YELLOW : RED;
      return [domain, `${GREEN}${covered}${RESET}`, `${total}`, `${color}${pct}%${RESET}`];
    })
  );

  footer([
    '"idd migrate infer <arquivo>"  → inferir intenção de arquivo específico',
    '"idd migrate batch --yes"      → processar todos sem confirmação',
  ].join('\n  '));
}

// ── Router ────────────────────────────────────────────────────────

export async function cmdMigrate(args: string[]): Promise<void> {
  switch (args[0]) {
    case 'scan':   return migrateScan(args.slice(1));
    case 'infer':  return migrateInfer(args.slice(1));
    case 'report': return migrateReport(args.slice(1));
    default:
      header('migrate — Migração de Codebases para IDD');
      console.log(`\n  ${CYAN}idd migrate scan${RESET}`);
      console.log(`    Detecta módulos sem intenção declarada em src/.`);
      console.log(`\n  ${CYAN}idd migrate infer <arquivo> [--yes] [--dry-run]${RESET}`);
      console.log(`    LLM analisa o código e infere a intenção retroativamente.`);
      console.log(`\n  ${CYAN}idd migrate report${RESET}`);
      console.log(`    Relatório de cobertura IDD por domínio.`);
      footer('');
  }
}
