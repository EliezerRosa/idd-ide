import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const requireFromCli = createRequire(new URL('../../cli/package.json', import.meta.url));
const yaml = requireFromCli('js-yaml') as { load: (s: string) => any };

interface UiContractItem {
  id: string;
  boundedContext: string;
  aggregate: string;
  entity: string;
  name: string;
  status: 'aligned' | 'advisory' | 'critical';
  statement: string;
  outcome: string;
  invariants: string[];
  acceptance: string[];
  allowedFields: string[];
  readOnlyFields: string[];
  tags: string[];
  yamlPath: string;
  yamlRaw: string;
  codePath: string;
  code: string;
}

function loadRepoContracts(): UiContractItem[] {
  const repoRoot = path.resolve(__dirname, '../..');
  const items: UiContractItem[] = [];

  // 1. Fase 0 — racha-conta (8 contratos v2 circunscritos por método)
  const fase0Dir = path.join(repoRoot, 'fase0', 'racha-conta', 'contratos');
  const legacyDomainRulesPath = path.join(
    repoRoot,
    'paradigma',
    '40-evidencias',
    'apps-exemplos',
    'racha_conta_pix',
    'domain_rules.ts',
  );
  const legacyDomainRules = fs.existsSync(legacyDomainRulesPath)
    ? fs.readFileSync(legacyDomainRulesPath, 'utf8')
    : '';

  if (fs.existsSync(fase0Dir)) {
    const files = fs.readdirSync(fase0Dir).filter(f => f.endsWith('.intent.yaml')).sort();
    for (const file of files) {
      const full = path.join(fase0Dir, file);
      const rawText = fs.readFileSync(full, 'utf8');
      const doc = yaml.load(rawText) ?? {};
      const cls = String(doc.target_class ?? 'Dominio');
      const method = String(doc.target_method ?? file.replace(/\.intent\.yaml$/, ''));
      const allowedFields: string[] = doc.behavioral_contract?.state_mutation?.allowed_fields ?? [];
      const readOnlyFields: string[] = doc.behavioral_contract?.state_mutation?.read_only_fields ?? [];
      const constraints: string[] = Array.isArray(doc.constraints)
        ? doc.constraints.map((c: any) => (typeof c === 'string' ? c : `[${c.id}] ${c.description}`))
        : [];
      const acceptance: string[] = Array.isArray(doc.acceptance)
        ? doc.acceptance.map((a: any) =>
            typeof a === 'string'
              ? a
              : `[${a.id ?? 'A-01'}] Dado: ${a.given} | Quando: ${a.when} | Então: ${a.then}`,
          )
        : [];
      const tags: string[] = Array.isArray(doc.tags) ? doc.tags.map(String) : [];

      const methodStub = [
        `// Contrato v2 circunscrito (Fase 0 · racha-conta): ${cls}.${method}`,
        `// Experimente editar este código para testar a cerca AST de state_mutation:`,
        `// - Campos permitidos p/ escrita: ${allowedFields.length ? allowedFields.join(', ') : '(nenhum — somente leitura)'}`,
        `// - Campos somente leitura: ${readOnlyFields.length ? readOnlyFields.join(', ') : '(nenhum)'}`,
        `@Intent('${cls}.${method}')`,
        `${method}(): void {`,
        ...(allowedFields.length
          ? allowedFields.map(f => {
              const shortField = f.includes('.') ? f.split('.').pop()! : f;
              return `  this.${shortField} = this.${shortField}; // escrita autorizada (${f})`;
            })
          : [`  // Método de consulta pura (allowed_fields vazio)`]),
        `}`,
      ].join('\n');

      items.push({
        id: `fase0/${cls}.${method}`,
        boundedContext: 'racha-conta (Fase 0)',
        aggregate: cls === 'Pagamento' ? 'Mesa' : cls,
        entity: cls,
        name: `${cls}.${method}`,
        status: 'aligned',
        statement: String(doc.intent ?? ''),
        outcome: acceptance[0] ?? 'Critério de aceite definido no contrato v2.',
        invariants: constraints,
        acceptance,
        allowedFields,
        readOnlyFields,
        tags,
        yamlPath: `fase0/racha-conta/contratos/${file}`,
        yamlRaw: rawText.trim(),
        codePath: `racha_conta_pix/domain_rules.ts (${cls}.${method})`,
        code: method === 'calcularCotas' && legacyDomainRules ? methodStub + '\n\n' + legacyDomainRules.slice(0, 1400) : methodStub,
      });
    }
  }

  // 2. Contratos de módulos do CLI (cli/src/**/*.intent.yaml)
  const cliDirs = [
    path.join(repoRoot, 'cli', 'src', 'lib', 'domain'),
    path.join(repoRoot, 'cli', 'src', 'commands'),
  ];
  for (const dir of cliDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.intent.yaml')).sort();
    for (const file of files) {
      const full = path.join(dir, file);
      const rawText = fs.readFileSync(full, 'utf8');
      const doc = yaml.load(rawText) ?? {};
      const mod = String(doc.module ?? file.replace(/\.intent\.yaml$/, ''));
      const [bc, sub] = mod.split('/');
      const tsFile = path.join(dir, `${sub}.ts`);
      const codeSnippet = fs.existsSync(tsFile)
        ? fs.readFileSync(tsFile, 'utf8').split(/\r?\n/).slice(0, 38).join('\n')
        : '// Arquivo de implementação não encontrado';
      const constraints: string[] = Array.isArray(doc.constraints)
        ? doc.constraints.map((c: any, idx: number) => (typeof c === 'string' ? `[C-0${idx + 1}] ${c}` : `[${c.id}] ${c.description}`))
        : [];
      const acceptance: string[] = Array.isArray(doc.acceptance)
        ? doc.acceptance.map((a: any, idx: number) => (typeof a === 'string' ? `[A-0${idx + 1}] ${a}` : `[${a.id}] ${a.then}`))
        : [];

      items.push({
        id: mod,
        boundedContext: `cli/${bc}`,
        aggregate: bc,
        entity: sub,
        name: mod,
        status: mod === 'domain/fds' ? 'aligned' : 'advisory',
        statement: String(doc.intent ?? ''),
        outcome: acceptance[0] ?? '',
        invariants: constraints,
        acceptance,
        allowedFields: doc.state_mutation?.allowed_fields ?? [],
        readOnlyFields: doc.state_mutation?.read_only_fields ?? [],
        tags: [bc, sub],
        yamlPath: path.relative(repoRoot, full).replace(/\\/g, '/'),
        yamlRaw: rawText.trim(),
        codePath: path.relative(repoRoot, tsFile).replace(/\\/g, '/'),
        code: codeSnippet,
      });
    }
  }

  // 3. Lab de Demonstração de Drift AST (Identity / UserAccount)
  items.push(
    {
      id: 'demo/registerFailedLoginAttempt',
      boundedContext: 'Identity (Demo Drift)',
      aggregate: 'Account',
      entity: 'UserAccount',
      name: 'UserAccount.registerFailedLoginAttempt',
      status: 'critical',
      statement: 'Registrar uma tentativa de login malsucedida sem alterar a identidade ou os dados de contato da conta.',
      outcome: 'Incrementar a contagem de falhas e registrar o instante da tentativa para que a política de bloqueio decida o próximo passo.',
      invariants: [
        '[INV-ENCAP-01] email permanece somente leitura',
        '[INV-UI-04] a mutação fica restrita a failedLoginCount e lastFailedLoginAt',
      ],
      acceptance: [
        '[A-01] Dado: UserAccount com 4 falhas | Quando: tentativa falha | Então: failedLoginCount = 5',
      ],
      allowedFields: ['failedLoginCount', 'lastFailedLoginAt'],
      readOnlyFields: ['email'],
      tags: ['demo', 'AST-drift'],
      yamlPath: 'identity/registerFailedLoginAttempt.intent.yaml',
      yamlRaw: [
        'version: "2.0"',
        'module: identity/register-failed-login',
        'target_class: UserAccount',
        'target_method: registerFailedLoginAttempt',
        'intent: "Registrar tentativa de login malsucedida sem alterar dados de contato"',
        'behavioral_contract:',
        '  visibility: public',
        '  state_mutation:',
        '    allowed_fields:',
        '      - failedLoginCount',
        '      - lastFailedLoginAt',
        '    read_only_fields:',
        '      - email',
      ].join('\n'),
      codePath: 'UserAccount.ts',
      code: "@Intent('registerFailedLoginAttempt')\nregisterFailedLoginAttempt(): void {\n  this.failedLoginCount += 1;\n  this.lastFailedLoginAt = new Date();\n  this.email = 'locked@example.com';\n}",
    },
    {
      id: 'demo/unlockAccount',
      boundedContext: 'Identity (Demo Drift)',
      aggregate: 'Account',
      entity: 'UserAccount',
      name: 'UserAccount.unlockAccount',
      status: 'aligned',
      statement: 'Restaurar o acesso de uma conta bloqueada quando uma decisão de governança autorizar o desbloqueio.',
      outcome: 'Zerar o contador de falhas, limpar os marcos temporais de bloqueio e preservar todos os atributos de identidade.',
      invariants: [
        '[INV-ENCAP-01] email permanece somente leitura',
        '[INV-UI-04] a mutação fica restrita ao agregado Account',
      ],
      acceptance: [
        '[A-01] Dado: UserAccount bloqueada | Quando: unlockAccount() | Então: failedLoginCount = 0',
      ],
      allowedFields: ['failedLoginCount', 'lastFailedLoginAt', 'lockedAt'],
      readOnlyFields: ['email'],
      tags: ['demo', 'aligned'],
      yamlPath: 'identity/unlockAccount.intent.yaml',
      yamlRaw: [
        'version: "2.0"',
        'module: identity/unlock-account',
        'target_class: UserAccount',
        'target_method: unlockAccount',
        'intent: "Restaurar acesso de conta bloqueada sob autorização"',
        'behavioral_contract:',
        '  visibility: public',
        '  state_mutation:',
        '    allowed_fields:',
        '      - failedLoginCount',
        '      - lastFailedLoginAt',
        '      - lockedAt',
        '    read_only_fields:',
        '      - email',
      ].join('\n'),
      codePath: 'UserAccount.ts',
      code: "@Intent('unlockAccount')\nunlockAccount(): void {\n  this.failedLoginCount = 0;\n  this.lastFailedLoginAt = undefined;\n  this.lockedAt = undefined;\n}",
    },
  );

  return items;
}

export default defineConfig({
  define: {
    __IDD_WORKSPACE_CONTRACTS__: JSON.stringify(loadRepoContracts()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'IDD IDE UI Lab',
        short_name: 'IDD UI',
        description: 'Intent Driven Development UI preview',
        theme_color: '#10231f',
        background_color: '#f4f1e8',
        display: 'standalone',
        icons: [{ src: '/idd-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
});
