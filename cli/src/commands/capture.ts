// src/commands/capture.ts — Issue #16: idd capture
import * as fs   from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { findProjectRoot } from '../lib/store.ts';
import { getApiKey, checkRateLimit, recordCall, validateIntent } from '../lib/security.ts';
import { autoDetectLanguage } from '../lib/lang.ts';
import {
  header, footer, success, error, info, warn, row, spinner,
  BOLD, RESET, CYAN, GRAY, GREEN, YELLOW,
} from '../lib/ui.ts';

// ── Tipos ────────────────────────────────────────────────────────

interface ExpandedIntent {
  intent:      string;
  module:      string;
  constraints: string[];
  acceptance:  string[];
  depends_on?: string[];
  language?:   string;
}

// ── LLM Expansion ──────────────────────────────────────────────────

function buildExpansionPrompt(description: string, moduleHint?: string, language?: string): { system: string; user: string } {
  const system = [
    'Você expande uma descrição solta em linguagem natural para uma intenção',
    'estruturada no formato Intent Driven Development (IDD).',
    '',
    'Regras:',
    '- "module" deve seguir o formato "dominio/funcionalidade" em minúsculas com hífen',
    '- "constraints" são regras de negócio objetivas e verificáveis (3 a 6 itens)',
    '- "acceptance" são critérios de aceite testáveis (3 a 6 itens, um vira um teste)',
    '- Nunca invente requisitos não sugeridos pela descrição original',
    '- Se a descrição já sugerir dependências de outros módulos, inclua em "depends_on"',
    '',
    'Retorne APENAS um objeto JSON válido com os campos:',
    '  "intent"      — frase única reescrevendo a descrição de forma clara',
    '  "module"      — sugestão de módulo (ou use o fornecido pelo usuário)',
    '  "constraints" — array de strings',
    '  "acceptance"  — array de strings',
    '  "depends_on"  — array de strings (opcional, vazio se não aplicável)',
    'Nada fora do JSON.',
  ].join('\n');

  const user = [
    `DESCRIÇÃO: ${description}`,
    moduleHint ? `MÓDULO SUGERIDO PELO USUÁRIO: ${moduleHint}` : '',
    language   ? `LINGUAGEM DO PROJETO: ${language}` : '',
  ].filter(Boolean).join('\n');

  return { system, user };
}

async function callClaude(system: string, user: string, apiKey: string, model: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find(b => b.type === 'text')?.text ?? '';
}

export function parseExpansion(raw: string): ExpandedIntent {
  const clean = raw.replace(/^```json\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  return JSON.parse(clean) as ExpandedIntent;
}

// ── YAML serialization ───────────────────────────────────────────

export function expandedToYaml(expanded: ExpandedIntent, language?: string): string {
  const lines = [
    `intent: "${expanded.intent.replace(/"/g, '\\"')}"`,
    `module: ${expanded.module}`,
    '',
    'constraints:',
    ...expanded.constraints.map(c => `  - "${c.replace(/"/g, '\\"')}"`),
    '',
    'acceptance:',
    ...expanded.acceptance.map(a => `  - "${a.replace(/"/g, '\\"')}"`),
  ];

  if (expanded.depends_on?.length) {
    lines.push('', 'depends_on:');
    expanded.depends_on.forEach(d => lines.push(`  - ${d}`));
  }

  const lang = language ?? expanded.language;
  if (lang) lines.push('', `language: ${lang}`);
  lines.push(`version: "0.0.0"`);

  return lines.join('\n') + '\n';
}

// ── Preview no terminal ───────────────────────────────────────────

function printPreview(expanded: ExpandedIntent): void {
  console.log(`\n  ${BOLD}Preview da intenção expandida${RESET}\n`);
  row('módulo', expanded.module);
  console.log(`  ${GRAY}intent:${RESET}      ${expanded.intent}`);
  console.log(`  ${GRAY}constraints:${RESET}`);
  expanded.constraints.forEach(c => console.log(`    ${YELLOW}▸${RESET} ${c}`));
  console.log(`  ${GRAY}acceptance:${RESET}`);
  expanded.acceptance.forEach(a => console.log(`    ${GREEN}✓${RESET} ${a}`));
  if (expanded.depends_on?.length) {
    console.log(`  ${GRAY}depends_on:${RESET}  ${expanded.depends_on.join(', ')}`);
  }
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdCapture(args: string[]): Promise<void> {
  const description = args.find(a => !a.startsWith('--'));
  const moduleArg    = args.find(a => a.startsWith('--module='))?.split('=')[1];
  const autoYes      = args.includes('--yes') || args.includes('-y');
  const dryRun       = args.includes('--dry-run') || args.includes('--dry');

  header('capture');

  if (!description) {
    error('Uso: idd capture "descrição da intenção em linguagem natural"');
    info('Exemplo: idd capture "autenticar usuário com email e senha, JWT 24h"');
    process.exit(1);
  }

  const apiKey = getApiKey();
  const model  = process.env.IDD_MODEL ?? 'claude-sonnet-4-20250514';

  if (!apiKey) {
    error('ANTHROPIC_API_KEY não definida.');
    info('export ANTHROPIC_API_KEY=sk-ant-...  (ou crie .idd/.env)');
    process.exit(1);
  }

  const root = findProjectRoot() ?? process.cwd();
  const detectedLang = autoDetectLanguage(path.join(root, 'src')) ?? undefined;

  // Rate limit check (mesma política de generate)
  const rl = checkRateLimit();
  if (!rl.allowed) {
    error(`Rate limit atingido (${rl.callsUsed}/${rl.callsLimit} chamadas/min). Aguarde ${rl.resetInSecs}s.`);
    process.exit(1);
  }

  // ── Expansão via LLM ─────────────────────────────────────────
  const spin = spinner('Expandindo descrição via LLM...');
  let expanded: ExpandedIntent;
  try {
    const { system, user } = buildExpansionPrompt(description, moduleArg, detectedLang);
    const raw = await callClaude(system, user, apiKey, model);
    recordCall();
    expanded = parseExpansion(raw);
    if (moduleArg) expanded.module = moduleArg; // usuário tem prioridade
    spin.stop(true);
  } catch (err: any) {
    spin.stop(false);
    error(`Falha na expansão: ${err.message}`);
    process.exit(1);
  }

  // ── Validação contra o schema ─────────────────────────────────
  const yamlContent = expandedToYaml(expanded, detectedLang);
  const yaml         = await import('js-yaml');
  const parsed       = yaml.load(yamlContent) as unknown;
  const validation   = validateIntent(parsed);

  printPreview(expanded);

  if (!validation.valid) {
    console.log('');
    warn('A intenção expandida não passou em todas as validações do schema:');
    validation.errors.forEach(e => console.log(`    ${e.field}: ${e.message}`));
    console.log('');
    info('Ajuste manualmente após salvar, ou refine a descrição e tente novamente.');
  }

  // ── Dry-run: para por aqui ──────────────────────────────────────
  if (dryRun) {
    console.log(`\n  ${GRAY}(dry-run: nenhum arquivo foi escrito)${RESET}\n`);
    footer('Remova --dry-run para confirmar a escrita do arquivo.');
    return;
  }

  // ── Confirmação (a menos que --yes) ─────────────────────────────
  if (!autoYes) {
    const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>(resolve => {
      rl2.question(`\n  Criar ${CYAN}${expanded.module}${RESET}.intent.yaml? (s/N) `, ans => {
        rl2.close();
        resolve(ans.trim().toLowerCase());
      });
    });
    if (answer !== 's') {
      info('Operação cancelada — nenhum arquivo foi criado.');
      return;
    }
  }

  // ── Escrita do arquivo ───────────────────────────────────────────
  const [mod, sub] = expanded.module.split('/');
  if (!mod || !sub) {
    error(`Módulo inválido: "${expanded.module}". Use --module=dominio/funcionalidade.`);
    process.exit(1);
  }

  const destDir  = path.join(root, 'src', mod);
  const destFile = path.join(destDir, `${sub}.intent.yaml`);

  if (fs.existsSync(destFile) && !autoYes) {
    const rl3 = readline.createInterface({ input: process.stdin, output: process.stdout });
    const overwrite = await new Promise<string>(resolve => {
      rl3.question(`  Arquivo já existe em ${destFile}. Sobrescrever? (s/N) `, ans => {
        rl3.close(); resolve(ans.trim().toLowerCase());
      });
    });
    if (overwrite !== 's') { info('Cancelado.'); return; }
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(destFile, yamlContent, 'utf8');

  console.log('');
  success(`${destFile}`);
  footer(`Próximo passo: idd generate ${expanded.module}`);
}
