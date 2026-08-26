// src/commands/playbook.ts — Issue #26: Team Playbooks
import * as fs   from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { findProjectRoot, Store } from '../lib/store.ts';
import { validateIntent }          from '../lib/security.ts';
import {
  header, footer, success, error, info, warn, row, table,
  BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW,
} from '../lib/ui.ts';

// ── Tipos ────────────────────────────────────────────────────────

export interface Playbook {
  name:        string;
  version:     string;
  description?: string;
  extends?:    string;   // herança de outro playbook
  mandatory_constraints: string[];   // constraints que TODA intenção deve ter
  forbidden_patterns:    string[];   // padrões proibidos nas constraints
  required_fields:       string[];   // campos extras obrigatórios
  templates?:            Record<string, object>;  // templates locais
  lint_rules?:           PlaybookRule[];
}

export interface PlaybookRule {
  id:       string;
  severity: 'error' | 'warn' | 'info';
  message:  string;
  check:    'min_constraints' | 'min_acceptance' | 'has_language' | 'intent_min_length' | 'custom';
  value?:   number | string;
}

export interface PlaybookViolation {
  module:   string;
  ruleId:   string;
  severity: PlaybookRule['severity'];
  message:  string;
}

// ── Templates pré-definidos de playbook ──────────────────────────

const PLAYBOOK_TEMPLATES: Record<string, Partial<Playbook>> = {
  startup: {
    name: 'startup',
    description: 'Playbook para startups: rápido, pragmático, foco em produto',
    mandatory_constraints: [],
    forbidden_patterns: [],
    required_fields: ['intent', 'module', 'constraints', 'acceptance'],
    lint_rules: [
      { id:'min-constraints', severity:'warn',  message:'Mínimo de 2 constraints por módulo', check:'min_constraints', value:2 },
      { id:'min-acceptance',  severity:'warn',  message:'Mínimo de 2 critérios de aceite',    check:'min_acceptance',  value:2 },
      { id:'intent-length',   severity:'error', message:'Intent deve ter ao menos 15 chars',  check:'intent_min_length', value:15 },
    ],
  },
  enterprise: {
    name: 'enterprise',
    description: 'Playbook para enterprise: seguro, rastreável, auditável',
    mandatory_constraints: [
      'Autenticar antes de processar',
      'Logar todas as operações para auditoria',
      'Validar entrada contra schema antes de processar',
    ],
    forbidden_patterns: ['TODO', 'FIXME', 'gambiarra', 'temporariamente'],
    required_fields: ['intent', 'module', 'constraints', 'acceptance', 'language'],
    lint_rules: [
      { id:'min-constraints', severity:'error', message:'Mínimo de 4 constraints por módulo', check:'min_constraints', value:4 },
      { id:'min-acceptance',  severity:'error', message:'Mínimo de 3 critérios de aceite',    check:'min_acceptance',  value:3 },
      { id:'has-language',    severity:'warn',  message:'Campo language deve ser declarado',   check:'has_language' },
      { id:'intent-length',   severity:'error', message:'Intent deve ter ao menos 20 chars',  check:'intent_min_length', value:20 },
    ],
  },
  microservices: {
    name: 'microservices',
    description: 'Playbook para microserviços: contratos claros, independência',
    mandatory_constraints: [
      'Retornar erro explícito em vez de exception genérica',
      'Idempotente quando relevante',
    ],
    forbidden_patterns: [],
    required_fields: ['intent', 'module', 'constraints', 'acceptance', 'language'],
    lint_rules: [
      { id:'min-constraints', severity:'error', message:'Mínimo de 3 constraints', check:'min_constraints', value:3 },
      { id:'min-acceptance',  severity:'error', message:'Mínimo de 3 critérios',   check:'min_acceptance',  value:3 },
      { id:'has-language',    severity:'error', message:'Language obrigatório',     check:'has_language' },
    ],
  },
};

// ── Linting ───────────────────────────────────────────────────────

export function lintIntent(
  intent: Record<string, any>,
  playbook: Playbook
): PlaybookViolation[] {
  const violations: PlaybookViolation[] = [];
  const mod = intent.module ?? '?';

  // Mandatory constraints
  for (const mandatoryC of playbook.mandatory_constraints) {
    const hasIt = (intent.constraints ?? []).some((c: string) =>
      c.toLowerCase().includes(mandatoryC.toLowerCase().slice(0, 20))
    );
    if (!hasIt) {
      violations.push({
        module:   mod, ruleId: 'mandatory-constraint', severity: 'error',
        message:  `Constraint obrigatória do playbook ausente: "${mandatoryC.slice(0, 60)}"`,
      });
    }
  }

  // Forbidden patterns
  const allText = JSON.stringify(intent).toLowerCase();
  for (const forbidden of playbook.forbidden_patterns) {
    if (allText.includes(forbidden.toLowerCase())) {
      violations.push({
        module: mod, ruleId: 'forbidden-pattern', severity: 'error',
        message: `Padrão proibido encontrado no playbook: "${forbidden}"`,
      });
    }
  }

  // Required fields
  for (const field of playbook.required_fields) {
    if (!intent[field]) {
      violations.push({
        module: mod, ruleId: 'required-field', severity: 'error',
        message: `Campo obrigatório no playbook: "${field}"`,
      });
    }
  }

  // Lint rules
  for (const rule of playbook.lint_rules ?? []) {
    let violated = false;
    switch (rule.check) {
      case 'min_constraints':
        violated = (intent.constraints ?? []).length < (rule.value as number);
        break;
      case 'min_acceptance':
        violated = (intent.acceptance ?? []).length < (rule.value as number);
        break;
      case 'has_language':
        violated = !intent.language;
        break;
      case 'intent_min_length':
        violated = (intent.intent ?? '').length < (rule.value as number);
        break;
    }
    if (violated) {
      violations.push({ module: mod, ruleId: rule.id, severity: rule.severity, message: rule.message });
    }
  }

  return violations;
}

// ── Comandos ──────────────────────────────────────────────────────

async function playbookInit(args: string[]): Promise<void> {
  const template = args.find(a => a.startsWith('--template='))?.split('=')[1] ?? 'startup';
  const root     = findProjectRoot() ?? process.cwd();

  header('playbook init');

  const tmpl    = PLAYBOOK_TEMPLATES[template];
  if (!tmpl) {
    error(`Template desconhecido: "${template}". Disponíveis: ${Object.keys(PLAYBOOK_TEMPLATES).join(', ')}`);
    process.exit(1);
  }

  const playbook: Playbook = {
    name:    `${path.basename(root)}-playbook`,
    version: '1.0.0',
    ...tmpl,
    mandatory_constraints: tmpl.mandatory_constraints ?? [],
    forbidden_patterns:    tmpl.forbidden_patterns    ?? [],
    required_fields:       tmpl.required_fields       ?? [],
  };

  const outPath = path.join(root, '.idd', 'playbook.yaml');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, yaml.dump(playbook, { lineWidth: -1 }), 'utf8');

  console.log('');
  success(`Playbook criado: ${outPath}`);
  row('template',               template);
  row('constraints obrigatórias', `${playbook.mandatory_constraints.length}`);
  row('padrões proibidos',      `${playbook.forbidden_patterns.length}`);
  row('regras de lint',         `${(playbook.lint_rules ?? []).length}`);

  footer('"idd playbook check" → verificar intenções contra o playbook');
}

async function playbookCheck(args: string[]): Promise<void> {
  const root     = findProjectRoot() ?? process.cwd();
  const pbPath   = path.join(root, '.idd', 'playbook.yaml');
  const failOn   = args.find(a => a.startsWith('--fail-on='))?.split('=')[1] ?? 'error';

  header('playbook check');

  if (!fs.existsSync(pbPath)) {
    error(`Playbook não encontrado: ${pbPath}`);
    info('Execute "idd playbook init" para criar um.');
    process.exit(1);
  }

  const playbook = yaml.load(fs.readFileSync(pbPath, 'utf8')) as Playbook;

  // Find all .intent.yaml
  const intentFiles: string[] = [];
  const seenFiles = new Set<string>();
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !['node_modules','.git','dist'].includes(entry.name)) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.intent.yaml')) {
        if (seenFiles.has(full)) continue; // evita duplicatas quando src/ é percorrido mais de uma vez
        seenFiles.add(full);
        intentFiles.push(full);
      }
    }
  }
  walk(path.join(root, 'src'));
  walk(root);

  if (intentFiles.length === 0) {
    info('Nenhum .intent.yaml encontrado.');
    footer(''); return;
  }

  const allViolations: PlaybookViolation[] = [];
  let   passed = 0;

  for (const file of intentFiles) {
    try {
      const intent = yaml.load(fs.readFileSync(file, 'utf8')) as Record<string, any>;
      const vs     = lintIntent(intent, playbook);
      if (vs.length === 0) { passed++; }
      else allViolations.push(...vs);
    } catch { /* skip parse errors */ }
  }

  console.log('');
  row('playbook',      playbook.name);
  row('verificadas',   `${intentFiles.length}`);
  row('ok',            `${GREEN}${passed}${RESET}`);
  row('violações',     allViolations.length > 0 ? `${RED}${allViolations.length}${RESET}` : `${GREEN}0${RESET}`);

  if (allViolations.length > 0) {
    console.log('');
    table(
      ['módulo', 'regra', 'severidade', 'mensagem'],
      allViolations.map(v => [
        v.module, v.ruleId,
        v.severity === 'error' ? `${RED}error${RESET}` : `${YELLOW}warn${RESET}`,
        v.message.slice(0, 60),
      ])
    );

    const hasErrors = allViolations.some(v => v.severity === 'error');
    const hasWarns  = allViolations.some(v => v.severity === 'warn');
    if (failOn === 'error'  && hasErrors) process.exit(1);
    if (failOn === 'warn'   && (hasErrors || hasWarns)) process.exit(1);
  } else {
    console.log(`\n  ${GREEN}✓ Todas as intenções conformes com o playbook "${playbook.name}".${RESET}\n`);
  }

  footer('"idd playbook init --template=enterprise|startup|microservices" → recriar playbook');
}

export async function cmdPlaybook(args: string[]): Promise<void> {
  switch (args[0]) {
    case 'init':  return playbookInit(args.slice(1));
    case 'check': return playbookCheck(args.slice(1));
    default:
      header('playbook — Team Playbooks');
      console.log(`\n  ${CYAN}idd playbook init [--template=startup|enterprise|microservices]${RESET}`);
      console.log(`    Cria .idd/playbook.yaml com constraints e regras da organização.`);
      console.log(`\n  ${CYAN}idd playbook check [--fail-on=error|warn]${RESET}`);
      console.log(`    Verifica todas as intenções contra o playbook ativo.`);
      footer('');
  }
}
