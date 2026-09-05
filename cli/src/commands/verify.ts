// src/commands/verify.ts
import * as fs   from 'node:fs';
import * as path from 'node:path';
import yaml      from 'js-yaml';
import { header, success, error, info, warn, row, table, footer, spinner,
         statusBadge, BOLD, RESET, RED, YELLOW, GRAY, GREEN } from '../lib/ui.ts';
import { Store, findProjectRoot } from '../lib/store.ts';
import { loadConfig } from '../lib/config.ts';
import { runStaticChecks, detectLanguage, autoDetectLanguage, Language } from '../lib/lang.ts';
import { parseProject, checkFileImports, normalizeRel, type ImportViolation, type ProjectIntent } from '@idd/core';
import { checkIntentAgainstDictionary } from './dictionary.ts';

interface IntentYaml {
  intent:      string;
  module:      string;
  constraints: string[];
  acceptance:  string[];
  depends_on?: string[];
  language?:   string;
  state_mutation?: { allowed_fields?: string[] };
}

interface VerifyResult {
  module:      string;
  status:      'ok' | 'warn' | 'drift' | 'unknown';
  score:       number;
  violations:  string[];
  missingTests: string[];
  filePath:    string;
}

// Padrões proibidos — análise estática
const FORBIDDEN = [
  { re: /console\.log\s*\(.*(?:password|senha|secret|passwd)/i,
    msg: 'Credencial exposta em log',       sev: 'critical' as const },
  { re: /console\.log\s*\(.*token/i,
    msg: 'Token exposto em log',            sev: 'warn'     as const },
  { re: /Math\.random\(\)/,
    msg: 'Math.random() não é seguro para criptografia', sev: 'warn' as const },
  { re: /eval\s*\(/,
    msg: 'eval() pode causar injeção de código',         sev: 'critical' as const },
  { re: /SELECT\s+\*/i,
    msg: 'SELECT * pode expor dados desnecessários',     sev: 'warn' as const },
  { re: /TODO|FIXME|HACK/,
    msg: 'Marcador de código incompleto presente',       sev: 'warn' as const },
];

// Mapeamento de palavras-chave de constraint → padrão esperado no código
const CONSTRAINT_CHECKS = [
  { keywords: /bloquear|lockout|tentativa/i, codePattern: /getAttempts|lockout|attempt|failedLogin/i,
    label: 'mecanismo de lockout' },
  { keywords: /jwt|token.*expir/i,           codePattern: /signJWT|jwt\.sign|createToken|expiresIn/i,
    label: 'geração de JWT' },
  { keywords: /hash|bcrypt|argon/i,          codePattern: /bcrypt|argon2|hash/i,
    label: 'hash de senha' },
  { keywords: /validar|validação/i,          codePattern: /validate|isValid|throw|Error/i,
    label: 'validação de entrada' },
  { keywords: /transação|transaction/i,      codePattern: /transaction|BEGIN|COMMIT/i,
    label: 'transação de banco' },
];

// ── Análise estática ─────────────────────────────────────────────

function analyzeStatic(code: string, intent: IntentYaml): {
  violations: string[];
  critical: boolean;
} {
  const violations: string[] = [];
  let critical = false;

  for (const { re, msg, sev } of FORBIDDEN) {
    if (re.test(code)) {
      violations.push(msg);
      if (sev === 'critical') critical = true;
    }
  }

  for (const { keywords, codePattern, label } of CONSTRAINT_CHECKS) {
    const hasConstraint = intent.constraints.some(c => keywords.test(c));
    if (hasConstraint && !codePattern.test(code)) {
      violations.push(`Constraint requer ${label}, mas não foi encontrado no código`);
      critical = true;
    }
  }

  return { violations, critical };
}

// ── Verificação de testes ────────────────────────────────────────

function checkTests(testFilePath: string, acceptance: string[]): string[] {
  if (!fs.existsSync(testFilePath)) return acceptance;

  const testCode = fs.readFileSync(testFilePath, 'utf8').toLowerCase();
  return acceptance.filter(criterion => {
    const keywords = criterion
      .split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 4);
    return !keywords.some(kw => testCode.includes(kw.toLowerCase()));
  });
}

// ── Verificação semântica via LLM (opcional) ─────────────────────

async function verifySemantic(
  intent: IntentYaml, code: string, apiKey: string, model: string
): Promise<{ score: number; violations: string[]; status: 'ok' | 'warn' | 'drift' | 'unknown'; error?: string }> {
  if (!apiKey) return { score: 0, violations: ['Análise semântica indisponível: ANTHROPIC_API_KEY não configurada.'], status: 'unknown' };

  try {
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
        system: [{
          type: 'text',
          text: [
            'Analise o alinhamento entre intenção e código.',
            'Retorne APENAS JSON: { "score": 0-100, "violations": string[], "status": "ok"|"warn"|"drift" }',
          ].join('\n'),
          cache_control: { type: 'ephemeral' },
        }],
        messages: [{
          role: 'user',
          content: [
            `INTENÇÃO: ${intent.intent}`,
            `CONSTRAINTS: ${intent.constraints.join('; ')}`,
            `ACCEPTANCE: ${intent.acceptance.join('; ')}`,
            `CÓDIGO (até 16000 chars — arquivos maiores são truncados):\n\`\`\`\n${code.slice(0, 16000)}\n\`\`\``,
          ].join('\n'),
        }],
      }),
    });

    if (!res.ok) return { score: 0, violations: [`Análise semântica indisponível: Claude API retornou HTTP ${res.status}.`], status: 'unknown' };

    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content.find(b => b.type === 'text')?.text ?? '{}';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    const score = typeof parsed.score === 'number' ? parsed.score : 0;
    const status = parsed.status === 'drift' || parsed.status === 'warn' || parsed.status === 'ok' ? parsed.status : score < 50 ? 'drift' : score < 80 ? 'warn' : 'ok';
    return { score, violations: Array.isArray(parsed.violations) ? parsed.violations : [], status };
  } catch (error) {
    return { score: 0, violations: [`Análise semântica indisponível: ${error instanceof Error ? error.message : 'erro desconhecido'}.`], status: 'unknown' };
  }
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdVerify(args: string[]): Promise<void> {
  if (args.includes('--project')) return cmdVerifyProject(args);

  const cfg            = loadConfig();
  const failOnCritical = args.includes('--fail-on=critical') || cfg.fail_on === 'critical';
  const threshold      = Number(args.find(a => a.startsWith('--threshold='))?.split('=')[1] ?? cfg.drift_threshold);
  const semantic       = args.includes('--semantic');
  const semanticRequired = args.includes('--semantic-required');
  const stagedOnly     = args.includes('--staged');
  const target         = args.find(a => !a.startsWith('--'));

  header('verify');

  const root   = findProjectRoot() ?? process.cwd();
  const store  = new Store(root);
  store.open();

  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  const model  = process.env.IDD_MODEL ?? 'claude-sonnet-5';

  // Coletar arquivos .intent.yaml
  const yamlFiles = collectYamlFiles(root, target);

  if (yamlFiles.length === 0) {
    warn('Nenhum .intent.yaml encontrado.');
    store.close();
    return;
  }

  info(`Verificando ${yamlFiles.length} intenção(ões)...\n`);

  const results: VerifyResult[] = [];

  for (const yamlPath of yamlFiles) {
    const intentRaw = fs.readFileSync(yamlPath, 'utf8');
    const intent    = yaml.load(intentRaw) as IntentYaml;

    const [mod, sub] = intent.module.split('/');
    const ext        = intent.language === 'python' ? 'py' : 'ts';
    const testSfx    = intent.language === 'python' ? '_test.py' : '.test.ts';
    const dir        = path.dirname(yamlPath);
    const codeFile   = path.join(dir, `${sub}.${ext}`);
    const testFile   = path.join(dir, `${sub}${testSfx}`);

    if (!fs.existsSync(codeFile)) {
      warn(`${intent.module} — código não gerado ainda (execute "idd generate ${intent.module}")`);
      results.push({
        module: intent.module, status: 'warn', score: 0,
        violations: ['Código ainda não gerado'],
        missingTests: intent.acceptance, filePath: codeFile
      });
      continue;
    }

    const code = fs.readFileSync(codeFile, 'utf8');

    // Análise estática
    const { violations: staticViol, critical } = analyzeStatic(code, intent);

    // Dicionário Ubíquo (warn, nunca drift): linguagem fora do dicionário é ambiguidade latente
    let termViol: string[] = [];
    try {
      termViol = checkIntentAgainstDictionary(root, intent).map(w => `Dicionário: ${w.message}`);
    } catch { /* dicionário inválido é reportado por idd dictionary check */ }

    // Verificação de testes
    const missingTests = checkTests(testFile, intent.acceptance);

    // Análise semântica (opcional, mais lenta)
    let semanticScore  = 100;
    let semanticViol:  string[] = [];
    let semanticStatus: 'ok' | 'warn' | 'drift' | 'unknown' = 'ok';

    if (semantic) {
      const spin = spinner(`${intent.module} — análise semântica...`);
      ({ score: semanticScore, violations: semanticViol, status: semanticStatus } = await verifySemantic(intent, code, apiKey, model));
      spin.stop(semanticStatus !== 'unknown' && semanticScore >= 80);
    }

    const allViolations = [...staticViol, ...termViol, ...semanticViol];
    const score = semantic
      ? Math.min(semanticScore, critical ? 30 : staticViol.length > 0 ? 70 : 100)
      : critical ? 30 : staticViol.length > 0 ? 70 : 100;

    const status: 'ok' | 'warn' | 'drift' | 'unknown' =
      semantic && semanticStatus === 'unknown' ? 'unknown' :
      critical || (semantic && semanticScore < threshold / 2) ? 'drift' :
      allViolations.length > 0 || missingTests.length > 0 || (semantic && semanticScore < threshold) ? 'warn' : 'ok';

    results.push({
      module: intent.module, status, score,
      violations: allViolations, missingTests, filePath: codeFile
    });

    // Atualiza store e grava score histórico
    const stored = store.getIntent(mod, sub);
    if (stored) {
      store.setStatus(stored.id, status);
      if (status === 'drift') store.recordDrift(stored.id, 'static');
      const source = semantic ? 'semantic' : 'static';
      store.recordAlignmentScore(stored.id, score, source);
    }
  }

  // Exibir resultados
  const tableRows = results.map(r => [
    r.module,
    statusBadge(r.status),
    `${r.score}%`,
    r.violations.length > 0 ? `${r.violations.length} problema(s)` : '—',
    r.missingTests.length  > 0 ? `${r.missingTests.length} teste(s)` : '—',
  ]);

  table(
    ['módulo', 'status', 'score', 'violações', 'testes faltando'],
    tableRows
  );

  // Detalhes de drift e avisos
  const withIssues = results.filter(r => r.status !== 'ok');
  if (withIssues.length > 0) {
    console.log('');
    for (const r of withIssues) {
      console.log(`  ${BOLD}${r.module}${RESET}`);
      for (const v of r.violations) {
        const isCrit = FORBIDDEN.find(f => f.msg === v)?.sev === 'critical';
        console.log(`    ${isCrit ? `${RED}✗` : `${YELLOW}⚠`}  ${v}${RESET}`);
      }
      for (const t of r.missingTests) {
        console.log(`    ${YELLOW}⚠  Teste faltando: "${t}"${RESET}`);
      }
    }
  }

  // Sumário
  const ok    = results.filter(r => r.status === 'ok').length;
  const drifts = results.filter(r => r.status === 'drift').length;
  const warns  = results.filter(r => r.status === 'warn').length;
  const unknowns = results.filter(r => r.status === 'unknown').length;

  console.log('');
  row('alinhadas',   `${GREEN}${ok}${RESET}`);
  if (warns)  row('avisos',   `${YELLOW}${warns}${RESET}`);
  if (drifts) row('drift',    `${RED}${drifts}${RESET}`);
  if (unknowns) row('inconclusivos', `${YELLOW}${unknowns}${RESET}`);

  store.close();

  const hasCritical = results.some(r => r.status === 'drift');
  const hasUnknown = results.some(r => r.status === 'unknown');
  footer(hasUnknown
    ? 'Análise semântica inconclusiva — nenhuma conclusão de alinhamento foi emitida.'
    : hasCritical
    ? 'Corrija os drifts críticos antes de fazer commit.'
    : warns > 0
    ? 'Revise os avisos — podem virar drift em breve.'
    : 'Todas as intenções estão alinhadas. ✓'
  );

  if ((failOnCritical && hasCritical) || (semanticRequired && hasUnknown)) process.exit(1);
}
// ── idd verify --project ── governança de contextos (Camada 1) ──────

const SOURCE_EXT = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const RESOLVE_EXT = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs', '.cjs'];

export function findProjectFile(startDir = process.cwd()): string | null {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, 'project.intent.yaml');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function verifyProjectImports(root: string, project: ProjectIntent): { files: number; violations: ImportViolation[] } {
  const violations: ImportViolation[] = [];
  let files = 0;
  const resolveRelative = (fromFile: string, spec: string): string | undefined => {
    const base = path.posix.join(path.posix.dirname(fromFile), spec);
    const abs = path.join(root, base);
    const candidates = [abs, ...RESOLVE_EXT.map(e => abs + e), ...RESOLVE_EXT.map(e => path.join(abs, 'index' + e))];
    // NodeNext idiom: ./x.js may point to ./x.ts on disk.
    if (/\.[cm]?js$/.test(abs)) candidates.push(abs.replace(/\.[cm]?js$/, '.ts'), abs.replace(/\.js$/, '.tsx'));
    const hit = candidates.find(c => fs.existsSync(c) && fs.statSync(c).isFile());
    return hit ? normalizeRel(path.relative(root, hit)) : normalizeRel(base);
  };
  for (const ctx of project.boundedContexts) {
    for (const rel of ctx.paths) {
      const dir = path.join(root, rel);
      if (!fs.existsSync(dir)) continue;
      for (const file of walkSources(dir)) {
        files++;
        const relFile = normalizeRel(path.relative(root, file));
        violations.push(...checkFileImports(project, relFile, fs.readFileSync(file, 'utf8'), resolveRelative));
      }
    }
  }
  return { files, violations };
}

function walkSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'out') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSources(full));
    else if (SOURCE_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

async function cmdVerifyProject(args: string[]): Promise<void> {
  header('verify --project');
  const explicit = args.find(a => !a.startsWith('--'));
  const projectFile = explicit ? path.resolve(explicit) : findProjectFile();
  if (!projectFile || !fs.existsSync(projectFile)) {
    error('project.intent.yaml não encontrado. Crie-o na raiz do repositório com bounded_contexts[].path e allowed_dependencies.');
    process.exit(1);
  }
  const root = path.dirname(projectFile);

  let rawDoc: unknown;
  try {
    rawDoc = yaml.load(fs.readFileSync(projectFile, 'utf8'));
  } catch (e) {
    error(`YAML inválido em ${projectFile}: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
  const parsed = parseProject(rawDoc);
  if (!parsed.ok) {
    error(`project.intent.yaml inválido (${parsed.issues.length} problema(s)):`);
    for (const issue of parsed.issues) console.log(`    ${RED}✗${RESET}  ${BOLD}${issue.field}${RESET}: ${issue.message}`);
    footer('Corrija o project.intent.yaml antes de verificar as importações.');
    process.exit(1);
  }
  const project = parsed.project;
  info(`Fase: ${project.lifecycle.phase} — ${project.boundedContexts.length} contexto(s) declarado(s)\n`);

  const { files, violations } = verifyProjectImports(root, project);

  table(
    ['contexto', 'paths', 'allowed_dependencies', 'violações'],
    project.boundedContexts.map(ctx => [
      ctx.name,
      ctx.paths.join(', ') || `${GRAY}—${RESET}`,
      ctx.allowedDependencies.join(', ') || `${GRAY}—${RESET}`,
      String(violations.filter(v => v.fromContext === ctx.name).length),
    ]),
  );

  if (violations.length > 0) {
    console.log('');
    for (const v of violations) {
      console.log(`  ${RED}✗${RESET}  ${v.file}:${v.line}  ${BOLD}${v.fromContext}${RESET} → ${BOLD}${v.toContext}${RESET}  (${GRAY}${v.specifier}${RESET})`);
    }
  }

  console.log('');
  row('arquivos analisados', String(files));
  row('importações ilegais', violations.length ? `${RED}${violations.length}${RESET}` : `${GREEN}0${RESET}`);
  footer(violations.length
    ? 'Importações ilegais entre contextos bloqueiam o merge. Declare a dependência em allowed_dependencies ou remova o acoplamento.'
    : 'Todos os contextos respeitam as dependências declaradas. ✓');
  if (violations.length > 0) process.exit(1);
}
// ── Helpers ──────────────────────────────────────────────────────

function collectYamlFiles(root: string, target?: string): string[] {
  if (target) {
    const [mod, sub] = target.split('/');
    const candidates = [
      path.join(root, 'src', mod, `${sub}.intent.yaml`),
      path.join(root, mod, `${sub}.intent.yaml`),
      path.join(process.cwd(), `${sub}.intent.yaml`),
    ];
    return candidates.filter(p => fs.existsSync(p));
  }
  return findRecursive(process.cwd(), '.intent.yaml');
}

function findRecursive(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())           results.push(...findRecursive(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}
