// src/commands/generate.ts
import * as fs     from 'node:fs';
import * as path   from 'node:path';
import * as crypto from 'node:crypto';
import yaml        from 'js-yaml';
import { header, success, error, info, warn, row, spinner, footer, BOLD, RESET, PURPLE, GRAY } from '../lib/ui.ts';
import { Store, findProjectRoot } from '../lib/store.ts';
import { resolveContext, formatContextForPrompt } from '../lib/context.ts';
import { getLangConfig, autoDetectLanguage, buildLangPrompt, Language } from '../lib/lang.ts';

interface IntentYaml {
  intent:      string;
  module:      string;
  constraints: string[];
  acceptance:  string[];
  depends_on?: string[];
  used_by?:    string[];
  language?:   string;
  framework?:  string;
  version?:    string;
}

interface GenerationResult {
  code:   string;
  tests:  string;
  docs:   string;
  model:  string;
}

// ── Intent Parser ────────────────────────────────────────────────

function buildPrompt(intent: IntentYaml, depCtx: Record<string, any>) {
  const system = [
    `Você é um gerador de código preciso para o módulo ${intent.module}.`,
    `Gere código que satisfaça EXATAMENTE a intenção declarada.`,
    `Respeite TODAS as constraints sem exceção alguma.`,
    `Para cada acceptance criterion, gere um teste unitário correspondente.`,
    `Retorne APENAS um objeto JSON válido com os campos:`,
    `  "code"  — implementação completa e funcional`,
    `  "tests" — testes unitários (um por acceptance criterion)`,
    `  "docs"  — documentação em markdown`,
    `Nada fora do JSON. Sem blocos de código markdown ao redor.`,
  ].join('\n');

  const lang    = (intent.language ?? 'typescript') as Language;
  const langHints = buildLangPrompt(lang, intent.framework);
  const depSection = depCtx.__formatted__
    ? depCtx.__formatted__
    : Object.keys(depCtx).length > 0
    ? `\n\nCONTEXTO DAS DEPENDÊNCIAS:\n${JSON.stringify(depCtx, null, 2)}`
    : '';

  const user = [
    `INTENÇÃO: ${intent.intent}`,
    `MÓDULO: ${intent.module}`,
    `LINGUAGEM: ${lang}${intent.framework ? ` + ${intent.framework}` : ''}`,
    `CONVENÇÕES:\n${langHints}`,
    ``,
    `CONSTRAINTS (todas obrigatórias):`,
    ...intent.constraints.map((c, i) => `  ${i + 1}. ${c}`),
    ``,
    `CRITÉRIOS DE ACEITE (cada um exige um teste):`,
    ...intent.acceptance.map((a, i) => `  ${i + 1}. ${a}`),
    depSection,
  ].join('\n');

  return { system, user };
}

// ── LLM Adapter ─────────────────────────────────────────────────

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
      max_tokens: 4096,
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

// ── Output Formatter ─────────────────────────────────────────────

function parseOutput(raw: string): { code: string; tests: string; docs: string } {
  try {
    const clean = raw.replace(/^```json\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    return JSON.parse(clean);
  } catch {
    // Fallback: extrai blocos manualmente
    const extractBlock = (lang: string) => {
      const m = raw.match(new RegExp('```' + lang + '\\n([\\s\\S]*?)```'));
      return m?.[1]?.trim() ?? '';
    };
    return {
      code:  extractBlock('typescript') || extractBlock('python') || extractBlock('js') || raw,
      tests: extractBlock('test') || extractBlock('spec') || '',
      docs:  extractBlock('markdown') || extractBlock('md') || '',
    };
  }
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdGenerate(args: string[]): Promise<void> {
  header('generate');

  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  const model  = process.env.IDD_MODEL ?? 'claude-sonnet-4-20250514';

  if (!apiKey) {
    error('ANTHROPIC_API_KEY não definida.');
    info('export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  // Encontrar .intent.yaml(s)
  const target    = args[0];
  const root      = findProjectRoot() ?? process.cwd();
  const yamlFiles = collectYamlFiles(root, target);

  if (yamlFiles.length === 0) {
    warn('Nenhum arquivo .intent.yaml encontrado.');
    info(target
      ? `Verifique se o módulo "${target}" existe.`
      : 'Crie um arquivo .intent.yaml ou execute "idd new <modulo/sub>".');
    process.exit(1);
  }

  info(`Encontrado(s): ${yamlFiles.length} arquivo(s) .intent.yaml`);
  info(`Modelo: ${model}\n`);

  const store = new Store(root);
  store.open();

  let generated = 0;
  let failed    = 0;

  for (const yamlPath of yamlFiles) {
    const intentRaw = fs.readFileSync(yamlPath, 'utf8');
    const intent    = yaml.load(intentRaw) as IntentYaml;

    console.log(`\n  ${BOLD}${PURPLE}${intent.module}${RESET}`);
    row('intenção', intent.intent);
    row('constraints', `${intent.constraints.length}`);
    row('critérios',   `${intent.acceptance.length}`);

    // Context Manager: dependências
    // Context Manager: resolução transitiva + cache + detecção de conflitos
    const ctxResult = await resolveContext(store, intent.depends_on ?? []);
    const depCtx: Record<string, any> = {
      ...ctxResult.deps,
      __formatted__: formatContextForPrompt(ctxResult)
    };

    // Exibe conflitos detectados
    if (ctxResult.conflicts.length > 0) {
      for (const c of ctxResult.conflicts) {
        warn(`Conflito de contrato: ${c.module_a} ↔ ${c.module_b} — ${c.reason}`);
      }
    }

    // Log de cache
    if (ctxResult.cached.length > 0) {
      info(`Cache: ${ctxResult.cached.join(', ')}`);
    }
    if (Object.keys(depCtx).length > 0) {
      row('contexto', Object.keys(depCtx).join(', '));
    }

    const spin = spinner('Chamando Claude API...');
    let result: GenerationResult;

    try {
      const { system, user } = buildPrompt(intent, depCtx);
      const raw = await callClaude(system, user, apiKey, model);
      const parsed = parseOutput(raw);
      result = { ...parsed, model };
      spin.stop(true);
    } catch (err: any) {
      spin.stop(false);
      error(`Falha na geração: ${err.message}`);
      failed++;
      continue;
    }

    // Gravar artefatos
    const dir    = path.dirname(yamlPath);
    const [, sub] = intent.module.split('/');
    // Auto-detecta linguagem se não declarada no .intent.yaml
    const resolvedLang = (intent.language
      ?? autoDetectLanguage(dir)
      ?? 'typescript') as Language;
    const langCfg = getLangConfig(resolvedLang);
    const ext     = langCfg.ext;
    const testSfx = resolvedLang === 'go' ? `_test.${ext}` :
                    resolvedLang === 'python' ? `_test.py` :
                    `.${langCfg.testExt}`;

    writeArtifact(path.join(dir, `${sub}.${ext}`),   result.code);
    writeArtifact(path.join(dir, `${sub}${testSfx}`), result.tests);
    writeArtifact(path.join(dir, `${sub}.md`),         result.docs);

    // Atualizar Intent Store
    const [module, subName] = intent.module.split('/');
    const stored = store.upsertIntent(module, subName, intent.intent);
    store.setConstraints(stored.id, intent.constraints);
    const hash = crypto.createHash('sha256').update(intentRaw).digest('hex');
    const ver  = store.addVersion(stored.id, JSON.stringify(intent), hash, model);

    success(`${sub}.${ext} gerado`);
    success(`${sub}${testSfx} gerado (${intent.acceptance.length} testes)`);
    success(`${sub}.md gerado`);
    row('versão', ver.version);
    generated++;
  }

  store.close();
  footer(`${generated} gerado(s)${failed > 0 ? ` · ${failed} com erro` : ''}`);

  if (failed > 0) process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────

function collectYamlFiles(root: string, target?: string): string[] {
  if (target) {
    // Busca por módulo/sub específico
    const [mod, sub] = target.split('/');
    const candidates = [
      path.join(root, 'src', mod, `${sub}.intent.yaml`),
      path.join(root, mod, `${sub}.intent.yaml`),
      path.join(process.cwd(), `${sub}.intent.yaml`),
    ];
    return candidates.filter(p => fs.existsSync(p));
  }

  // Sem argumento: busca recursiva a partir do diretório atual
  return findRecursive(process.cwd(), '.intent.yaml');
}

function findRecursive(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())               results.push(...findRecursive(full, ext));
    else if (entry.name.endsWith(ext))     results.push(full);
  }
  return results;
}

// buildDepContext migrado para src/lib/context.ts

function writeArtifact(filePath: string, content: string): void {
  if (!content?.trim()) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}
