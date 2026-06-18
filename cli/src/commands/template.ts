// src/commands/template.ts — idd template
import * as fs   from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import {
  listTemplates, getTemplate, applyVariables,
  templateToYaml, saveTemplate, BUILTIN_TEMPLATES,
  type IntentTemplate,
} from '../lib/templates/index.ts';
import { findProjectRoot } from '../lib/store.ts';
import { validateIntent }  from '../lib/security.ts';
import {
  header, footer, success, error, info, warn, row, table,
  BOLD, RESET, CYAN, GRAY, GREEN, YELLOW, PURPLE, WHITE,
} from '../lib/ui.ts';

// ── Category colours ─────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  crud:   CYAN,
  auth:   PURPLE,
  api:    GREEN,
  infra:  YELLOW,
  notify: `\x1b[35m`,
  custom: GRAY,
};

// ── idd template list ─────────────────────────────────────────────

async function templateList(args: string[]): Promise<void> {
  const filterCat = args.find(a => !a.startsWith('--'));
  const root      = findProjectRoot() ?? process.cwd();

  header('template list');

  const templates = listTemplates(root);
  const filtered  = filterCat
    ? templates.filter(t => t.category === filterCat || t.tags.includes(filterCat))
    : templates;

  if (filtered.length === 0) {
    warn(`Nenhum template encontrado${filterCat ? ` para "${filterCat}"` : ''}.`);
    footer('');
    return;
  }

  // Group by category
  const byCategory: Record<string, IntentTemplate[]> = {};
  for (const t of filtered) {
    const cat = t.category ?? 'custom';
    (byCategory[cat] ??= []).push(t);
  }

  for (const [cat, temps] of Object.entries(byCategory)) {
    const color = CAT_COLOR[cat] ?? GRAY;
    console.log(`\n  ${color}${BOLD}${cat.toUpperCase()}${RESET}`);
    for (const t of temps) {
      const src     = BUILTIN_TEMPLATES.some(b => b.name === t.name) ? `${GRAY}built-in${RESET}` : `${GREEN}local${RESET}`;
      const tagStr  = t.tags.map(tg => `${GRAY}#${tg}${RESET}`).join(' ');
      const varList = extractVariables(t);
      const vars    = varList.length ? `${YELLOW}{{${varList.join('}}, {{')}}}${RESET}` : '';
      console.log(`  ${BOLD}${t.name}${RESET}  ${src}`);
      console.log(`    ${t.description}`);
      if (tagStr)  console.log(`    ${tagStr}`);
      if (vars)    console.log(`    variáveis: ${vars}`);
    }
  }

  console.log('');
  row('total', `${filtered.length} template(s)`);
  row('local', path.join(findProjectRoot() ?? '.', '.idd', 'templates'));

  footer([
    '"idd template apply <nome> <mod/sub>"   → criar .intent.yaml',
    '"idd template new <nome>"               → criar template de uma intenção',
    '"idd template list auth"                → filtrar por categoria ou tag',
  ].join('\n  '));
}

// ── idd template apply ────────────────────────────────────────────

async function templateApply(args: string[]): Promise<void> {
  const name   = args[0];
  const module = args[1];

  header('template apply');

  if (!name) {
    error('Uso: idd template apply <nome> <modulo/sub>');
    error('     idd template list   (para ver templates disponíveis)');
    process.exit(1);
  }

  const root     = findProjectRoot() ?? process.cwd();
  const template = getTemplate(name, root);

  if (!template) {
    error(`Template "${name}" não encontrado.`);
    info('Execute "idd template list" para ver os disponíveis.');
    process.exit(1);
  }

  // Determine module
  let targetModule = module;
  if (!targetModule) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    targetModule = await new Promise<string>(resolve => {
      rl.question(`  ${CYAN}Módulo${RESET} ${GRAY}(ex: users/crud)${RESET}\n  ${CYAN}›${RESET} `, answer => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  if (!targetModule || !targetModule.includes('/')) {
    error('Módulo inválido — use o formato "dominio/funcionalidade" (ex: users/crud).');
    process.exit(1);
  }

  // Extract and fill variables interactively
  const varNames = extractVariables(template);
  const vars: Record<string, string> = { module: targetModule };

  if (varNames.length > 0) {
    console.log(`\n  ${BOLD}Variáveis do template "${name}":${RESET}`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    for (const v of varNames) {
      if (v === 'module') continue;
      const [, sub]   = targetModule.split('/');
      const defaultVal = v === 'entity' ? sub : '';
      const answer = await new Promise<string>(resolve => {
        rl.question(
          `  ${CYAN}${v}${RESET} ${defaultVal ? `${GRAY}(default: ${defaultVal})${RESET}` : ''}\n  ${CYAN}›${RESET} `,
          ans => resolve(ans.trim() || defaultVal)
        );
      });
      vars[v] = answer;
    }
    rl.close();
  }

  // Apply variables and generate YAML
  const language = args.find(a => a.startsWith('--language='))?.split('=')[1];
  const applied  = applyVariables(template, vars);
  const yamlContent = templateToYaml(applied, targetModule, language);

  // Validate before writing
  const yaml = await import('js-yaml');
  const parsed = yaml.load(yamlContent) as unknown;
  const validation = validateIntent(parsed);

  if (!validation.valid) {
    error('Template gerou .intent.yaml inválido:');
    validation.errors.forEach(e => console.log(`  ${e.field}: ${e.message}`));
    process.exit(1);
  }

  // Write file
  const [mod, sub] = targetModule.split('/');
  const destDir    = path.join(root, 'src', mod);
  const destFile   = path.join(destDir, `${sub}.intent.yaml`);

  if (fs.existsSync(destFile)) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const overwrite = await new Promise<string>(resolve => {
      rl.question(`\n  Arquivo "${destFile}" já existe. Sobrescrever? (s/N) `, ans => {
        rl.close(); resolve(ans.trim().toLowerCase());
      });
    });
    if (overwrite !== 's') { info('Operação cancelada.'); return; }
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(destFile, yamlContent, 'utf8');

  console.log('');
  success(`${destFile}`);
  row('template',   name);
  row('módulo',     targetModule);
  row('constraints', `${applied.body.constraints.length}`);
  row('critérios',   `${applied.body.acceptance.length}`);

  footer(`Próximo passo: idd generate ${targetModule}`);
}

// ── idd template new ──────────────────────────────────────────────

async function templateNew(args: string[]): Promise<void> {
  const name = args[0];
  header('template new');

  if (!name) {
    error('Uso: idd template new <nome-do-template>');
    process.exit(1);
  }

  const root = findProjectRoot() ?? process.cwd();

  // Find existing .intent.yaml to base on
  const sourceModule = args[1];
  let sourceFile: string | null = null;

  if (sourceModule) {
    const [mod, sub] = sourceModule.split('/');
    sourceFile = path.join(root, 'src', mod, `${sub}.intent.yaml`);
    if (!fs.existsSync(sourceFile)) {
      error(`Intenção "${sourceModule}" não encontrada.`);
      process.exit(1);
    }
  }

  const yaml = await import('js-yaml');
  let body: IntentTemplate['body'] = {
    intent:      'Descrição da intenção com variável {{entity}}',
    constraints: ['Constraint 1', 'Constraint 2'],
    acceptance:  ['Critério de aceite 1', 'Critério 2'],
  };

  if (sourceFile) {
    const raw    = fs.readFileSync(sourceFile, 'utf8');
    const parsed = yaml.load(raw) as Record<string, any>;
    body = {
      intent:      parsed.intent ?? body.intent,
      constraints: parsed.constraints ?? body.constraints,
      acceptance:  parsed.acceptance  ?? body.acceptance,
      depends_on:  parsed.depends_on,
    };
    info(`Baseado em: ${sourceFile}`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const description = await new Promise<string>(resolve => {
    rl.question(`\n  ${CYAN}Descrição do template:${RESET}\n  ${CYAN}›${RESET} `, ans => {
      rl.close(); resolve(ans.trim() || `Template ${name}`);
    });
  });

  const template: IntentTemplate = {
    name,
    category:    'custom',
    description,
    tags:        [name],
    body,
  };

  const savedPath = saveTemplate(template, root);
  console.log('');
  success(`Template criado: ${savedPath}`);
  row('nome',      name);
  row('categoria', 'custom');
  row('variáveis', extractVariables(template).join(', ') || '(nenhuma)');

  footer([
    `"idd template apply ${name} <mod/sub>"  → usar este template`,
    '"idd template list"                      → ver todos os templates',
  ].join('\n  '));
}

// ── idd template publish ──────────────────────────────────────────

async function templatePublish(args: string[]): Promise<void> {
  const name = args[0];
  header('template publish');

  if (!name) {
    error('Uso: idd template publish <nome>');
    process.exit(1);
  }

  const root     = findProjectRoot() ?? process.cwd();
  const template = getTemplate(name, root);

  if (!template) {
    error(`Template "${name}" não encontrado.`);
    process.exit(1);
  }

  if (BUILTIN_TEMPLATES.some(b => b.name === name)) {
    info(`"${name}" é um template built-in — já disponível globalmente.`);
    footer('');
    return;
  }

  const savedPath = saveTemplate(template, root);
  success(`Template publicado localmente: ${savedPath}`);
  row('nome',        name);
  row('descrição',   template.description);
  row('constraints', `${template.body.constraints.length}`);
  row('critérios',   `${template.body.acceptance.length}`);

  footer([
    'Para compartilhar: commite .idd/templates/ no git',
    '"idd template list" → confirmar que aparece na lista',
  ].join('\n  '));
}

// ── idd template help ─────────────────────────────────────────────

function templateHelp(): void {
  header('template — subcomandos');
  console.log('');
  console.log(`  ${CYAN}idd template list [categoria]${RESET}`);
  console.log(`    Lista templates disponíveis (built-in + locais).`);
  console.log(`    Filtra por categoria: crud, auth, api, infra, notify, custom`);
  console.log('');
  console.log(`  ${CYAN}idd template apply <nome> [modulo/sub] [--language=<lang>]${RESET}`);
  console.log(`    Cria .intent.yaml a partir de um template.`);
  console.log(`    Preenche variáveis {{entity}}, {{provider}}, etc. interativamente.`);
  console.log('');
  console.log(`  ${CYAN}idd template new <nome> [modulo/sub]${RESET}`);
  console.log(`    Cria um novo template custom (opcionalmente baseado em intenção existente).`);
  console.log(`    Salvo em .idd/templates/<nome>.template.json`);
  console.log('');
  console.log(`  ${CYAN}idd template publish <nome>${RESET}`);
  console.log(`    Garante que o template está em .idd/templates/ para controle de versão.`);
  console.log('');
  console.log(`  ${BOLD}Templates built-in:${RESET}`);
  BUILTIN_TEMPLATES.forEach(t => {
    const color = CAT_COLOR[t.category] ?? GRAY;
    const vars  = extractVariables(t);
    const v     = vars.length ? ` ${YELLOW}[${vars.join(', ')}]${RESET}` : '';
    console.log(`    ${color}${t.name}${RESET}${v} — ${t.description}`);
  });
  footer('');
}

// ── Router ────────────────────────────────────────────────────────

export async function cmdTemplate(args: string[]): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'list':    return templateList(args.slice(1));
    case 'apply':   return templateApply(args.slice(1));
    case 'new':     return templateNew(args.slice(1));
    case 'publish': return templatePublish(args.slice(1));
    default:        return templateHelp();
  }
}

// ── Helper ────────────────────────────────────────────────────────

function extractVariables(template: IntentTemplate): string[] {
  const all = [
    template.body.intent,
    ...template.body.constraints,
    ...template.body.acceptance,
    ...(template.body.depends_on ?? []),
  ].join(' ');
  const matches = all.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map(m => m.slice(2, -2)))];
}
