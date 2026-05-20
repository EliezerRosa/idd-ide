// src/commands/new.ts
import * as fs       from 'node:fs';
import * as path     from 'node:path';
import * as readline from 'node:readline';
import { header, footer, success, info, warn, row, BOLD, RESET, CYAN, GRAY, YELLOW } from '../lib/ui.ts';
import { findProjectRoot } from '../lib/store.ts';
import { getLangConfig, Language } from '../lib/lang.ts';

// ── Prompt interativo simples ────────────────────────────────────

async function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function askList(rl: readline.Interface, prompt: string): Promise<string[]> {
  console.log(`  ${GRAY}${prompt}${RESET}`);
  console.log(`  ${GRAY}(uma por linha, linha vazia para finalizar)${RESET}`);
  const items: string[] = [];
  while (true) {
    const line = await ask(rl, `  ${CYAN}›${RESET} `);
    if (!line.trim()) break;
    items.push(line.trim());
  }
  return items;
}

// ── Geração do .intent.yaml ──────────────────────────────────────

function buildYaml(fields: {
  module:      string;
  intent:      string;
  constraints: string[];
  acceptance:  string[];
  depends_on:  string[];
  language:    string;
  framework:   string;
}): string {
  const lines = [
    `intent: "${fields.intent}"`,
    `module: ${fields.module}`,
    ``,
    `constraints:`,
    ...fields.constraints.map(c => `  - "${c}"`),
    ``,
    `acceptance:`,
    ...fields.acceptance.map(a => `  - "${a}"`),
  ];

  if (fields.depends_on.length > 0) {
    lines.push(``, `depends_on:`);
    fields.depends_on.forEach(d => lines.push(`  - ${d}`));
  }

  if (fields.language) lines.push(``, `language: ${fields.language}`);
  if (fields.framework) lines.push(`framework: ${fields.framework}`);

  lines.push(`version: "0.0.0"`);
  return lines.join('\n') + '\n';
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdNew(args: string[]): Promise<void> {
  const moduleArg = args[0];
  const nonInteractive = args.includes('--yes') || args.includes('-y');

  header('new — criar intenção');

  const root = findProjectRoot() ?? process.cwd();
  const rl   = readline.createInterface({
    input:    process.stdin,
    output:   process.stdout,
    terminal: false,
  });

  try {
    // ── 1. Módulo ────────────────────────────────────────────────
    let module = moduleArg ?? '';
    if (!module) {
      module = await ask(rl, `\n  ${BOLD}Módulo${RESET} ${GRAY}(ex: auth/login)${RESET}\n  ${CYAN}›${RESET} `);
    }
    module = module.trim();
    if (!module.includes('/')) {
      warn('Formato inválido. Use "dominio/funcionalidade" (ex: auth/login).');
      rl.close();
      process.exit(1);
    }

    // Verifica se já existe
    const [mod, sub] = module.split('/');
    const destDir    = path.join(root, 'src', mod);
    const destFile   = path.join(destDir, `${sub}.intent.yaml`);
    if (fs.existsSync(destFile)) {
      warn(`Intenção "${module}" já existe em ${destFile}`);
      const overwrite = await ask(rl, `  Sobrescrever? (s/N) `);
      if (!overwrite.toLowerCase().startsWith('s')) {
        rl.close();
        return;
      }
    }

    // ── 2. Declaração da intenção ────────────────────────────────
    console.log(`\n  ${BOLD}Declaração da intenção${RESET}`);
    console.log(`  ${GRAY}Descreva o QUÊ, não o COMO${RESET}`);
    const intent = (await ask(rl, `  ${CYAN}›${RESET} `)).trim();
    if (!intent) {
      warn('Intenção não pode estar vazia.');
      rl.close();
      process.exit(1);
    }

    // ── 3. Linguagem ─────────────────────────────────────────────
    console.log(`\n  ${BOLD}Linguagem${RESET} ${GRAY}[typescript] python | go | javascript | rust | java${RESET}`);
    const langInput = (await ask(rl, `  ${CYAN}›${RESET} `)).trim() || 'typescript';
    const language  = langInput as Language;

    // ── 4. Framework (opcional) ──────────────────────────────────
    console.log(`\n  ${BOLD}Framework${RESET} ${GRAY}(opcional, ex: express / fastapi / gin)${RESET}`);
    const framework = (await ask(rl, `  ${CYAN}›${RESET} `)).trim();

    // ── 5. Constraints ───────────────────────────────────────────
    console.log(`\n  ${BOLD}Constraints${RESET} — regras de negócio obrigatórias`);
    const constraints = await askList(rl, 'Adicione restrições que o código deve respeitar:');
    if (constraints.length === 0) {
      warn('Adicione ao menos uma constraint.');
      rl.close();
      process.exit(1);
    }

    // ── 6. Critérios de aceite ───────────────────────────────────
    console.log(`\n  ${BOLD}Critérios de aceite${RESET} — cada item vira um teste`);
    const acceptance = await askList(rl, 'Como saber que a intenção foi satisfeita?');
    if (acceptance.length === 0) {
      warn('Adicione ao menos um critério de aceite.');
      rl.close();
      process.exit(1);
    }

    // ── 7. Dependências ──────────────────────────────────────────
    console.log(`\n  ${BOLD}Dependências${RESET} ${GRAY}(opcional, ex: users/crud)${RESET}`);
    const depends_on = await askList(rl, 'Módulos que esta intenção consome:');

    rl.close();

    // ── Gerar .intent.yaml ───────────────────────────────────────
    const yamlContent = buildYaml({
      module, intent, constraints, acceptance, depends_on, language, framework
    });

    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destFile, yamlContent, 'utf8');

    // ── Gerar scaffold de testes ─────────────────────────────────
    const cfg         = getLangConfig(language);
    const testFile    = path.join(destDir, `${sub}.${cfg.testExt}`);
    const testScaffold = cfg.testTemplate(module, acceptance);
    if (!fs.existsSync(testFile)) {
      fs.writeFileSync(testFile, testScaffold, 'utf8');
    }

    // ── Resultado ────────────────────────────────────────────────
    console.log('');
    success(`${destFile}`);
    success(`${testFile} (scaffold de testes)`);
    console.log('');
    row('módulo',       module);
    row('linguagem',    language + (framework ? ` + ${framework}` : ''));
    row('constraints',  `${constraints.length}`);
    row('critérios',    `${acceptance.length}`);
    if (depends_on.length > 0) row('dependências', depends_on.join(', '));

    footer(`Próximo passo: idd generate ${module}`);

  } catch (err: any) {
    rl.close();
    if (err.code === 'ERR_USE_AFTER_CLOSE') return; // Ctrl+C
    throw err;
  }
}
