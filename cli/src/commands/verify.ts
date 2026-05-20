// src/commands/verify.ts
import * as fs   from 'node:fs';
import * as path from 'node:path';
import yaml      from 'js-yaml';
import { header, success, error, info, warn, row, table, footer, spinner,
         statusBadge, BOLD, RESET, RED, YELLOW, GRAY, GREEN } from '../lib/ui.ts';
import { Store, findProjectRoot } from '../lib/store.ts';

interface IntentYaml {
  intent:      string;
  module:      string;
  constraints: string[];
  acceptance:  string[];
  depends_on?: string[];
  language?:   string;
}

interface VerifyResult {
  module:      string;
  status:      'ok' | 'warn' | 'drift';
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
): Promise<{ score: number; violations: string[] }> {
  if (!apiKey) return { score: 100, violations: [] };

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
        system: [
          'Analise o alinhamento entre intenção e código.',
          'Retorne APENAS JSON: { "score": 0-100, "violations": string[], "status": "ok"|"warn"|"drift" }',
        ].join('\n'),
        messages: [{
          role: 'user',
          content: [
            `INTENÇÃO: ${intent.intent}`,
            `CONSTRAINTS: ${intent.constraints.join('; ')}`,
            `CÓDIGO (primeiros 1500 chars):\n\`\`\`\n${code.slice(0, 1500)}\n\`\`\``,
          ].join('\n'),
        }],
      }),
    });

    if (!res.ok) return { score: 100, violations: [] };

    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content.find(b => b.type === 'text')?.text ?? '{}';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    return { score: parsed.score ?? 100, violations: parsed.violations ?? [] };
  } catch {
    return { score: 100, violations: [] };
  }
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdVerify(args: string[]): Promise<void> {
  const failOnCritical = args.includes('--fail-on=critical');
  const semantic       = args.includes('--semantic');
  const stagedOnly     = args.includes('--staged');
  const target         = args.find(a => !a.startsWith('--'));

  header('verify');

  const root   = findProjectRoot() ?? process.cwd();
  const store  = new Store(root);
  store.open();

  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  const model  = process.env.IDD_MODEL ?? 'claude-sonnet-4-20250514';

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

    // Verificação de testes
    const missingTests = checkTests(testFile, intent.acceptance);

    // Análise semântica (opcional, mais lenta)
    let semanticScore  = 100;
    let semanticViol:  string[] = [];

    if (semantic && apiKey) {
      const spin = spinner(`${intent.module} — análise semântica...`);
      ({ score: semanticScore, violations: semanticViol } = await verifySemantic(intent, code, apiKey, model));
      spin.stop(semanticScore >= 80);
    }

    const allViolations = [...staticViol, ...semanticViol];
    const score = semantic
      ? Math.min(semanticScore, critical ? 30 : staticViol.length > 0 ? 70 : 100)
      : critical ? 30 : staticViol.length > 0 ? 70 : 100;

    const status: 'ok' | 'warn' | 'drift' =
      critical || (semantic && semanticScore < 50) ? 'drift' :
      allViolations.length > 0 || missingTests.length > 0 ? 'warn' : 'ok';

    results.push({
      module: intent.module, status, score,
      violations: allViolations, missingTests, filePath: codeFile
    });

    // Atualiza store
    const stored = store.getIntent(mod, sub);
    if (stored) {
      store.setStatus(stored.id, status);
      if (status === 'drift') store.recordDrift(stored.id, 'static');
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

  console.log('');
  row('alinhadas',   `${GREEN}${ok}${RESET}`);
  if (warns)  row('avisos',   `${YELLOW}${warns}${RESET}`);
  if (drifts) row('drift',    `${RED}${drifts}${RESET}`);

  store.close();

  const hasCritical = results.some(r => r.status === 'drift');
  footer(hasCritical
    ? 'Corrija os drifts críticos antes de fazer commit.'
    : warns > 0
    ? 'Revise os avisos — podem virar drift em breve.'
    : 'Todas as intenções estão alinhadas. ✓'
  );

  if (failOnCritical && hasCritical) process.exit(1);
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
