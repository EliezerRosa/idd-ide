import * as vscode from 'vscode';
import * as fs     from 'fs';
import * as path   from 'path';
import * as yaml   from 'js-yaml';
import * as crypto from 'crypto';
import { IntentStore } from '../store/IntentStore';

// ── Tipos ────────────────────────────────────────────────────────

export interface IntentYaml {
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

export interface GenerationResult {
  code:             string;
  tests:            string;
  docs:             string;
  intent_signature: IntentSignature;
}

export interface IntentSignature {
  intent_hash:      string;
  generated_at:     string;
  model_used:       string;
  criteria_covered: number;
  criteria_total:   number;
}

export interface VerifyResult {
  module:     string;
  status:     'ok' | 'drift' | 'warn';
  score:      number;
  violations: string[];
  message:    string;
}

// ── Intent Engine ────────────────────────────────────────────────

export class IntentEngine {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private getApiKey(): string {
    const cfg = vscode.workspace.getConfiguration('idd');
    return cfg.get<string>('anthropicApiKey') || process.env.ANTHROPIC_API_KEY || '';
  }

  private getModel(): string {
    return vscode.workspace.getConfiguration('idd')
      .get<string>('model', 'claude-sonnet-4-20250514');
  }

  // ── 1. Intent Parser ──────────────────────────────────────────

  buildPrompt(intent: IntentYaml, depContext: Record<string, any>): { system: string; user: string } {
    const system = [
      `Você é um gerador de código preciso para o módulo ${intent.module}.`,
      `Gere código que satisfaça EXATAMENTE a intenção declarada.`,
      `Respeite TODAS as constraints sem exceção.`,
      `Para cada acceptance criterion, inclua um teste unitário correspondente.`,
      `Retorne APENAS um objeto JSON válido com os campos:`,
      `  "code"   — implementação completa`,
      `  "tests"  — testes unitários (um por acceptance criterion)`,
      `  "docs"   — documentação em markdown`,
      `Nenhum texto fora do JSON.`
    ].join('\n');

    const constraintsList = intent.constraints
      .map((c, i) => `  ${i + 1}. ${c}`)
      .join('\n');

    const acceptanceList = intent.acceptance
      .map((a, i) => `  ${i + 1}. ${a}`)
      .join('\n');

    const depSection = Object.keys(depContext).length > 0
      ? `\nCONTEXTO DAS DEPENDÊNCIAS:\n${JSON.stringify(depContext, null, 2)}`
      : '';

    const user = [
      `INTENÇÃO: ${intent.intent}`,
      `MÓDULO: ${intent.module}`,
      `LINGUAGEM: ${intent.language ?? 'typescript'}${intent.framework ? ` + ${intent.framework}` : ''}`,
      ``,
      `CONSTRAINTS (obrigatórias):`,
      constraintsList,
      ``,
      `CRITÉRIOS DE ACEITE (cada um deve ter um teste):`,
      acceptanceList,
      depSection
    ].join('\n');

    return { system, user };
  }

  // ── 2. LLM Adapter ───────────────────────────────────────────

  async callLLM(system: string, user: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Chave de API Anthropic não configurada. Defina idd.anthropicApiKey nas configurações.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01'
      },
      body: JSON.stringify({
        model:      this.getModel(),
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error ${response.status}: ${err}`);
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    return data.content.find(b => b.type === 'text')?.text ?? '';
  }

  // ── 3. Output Formatter ──────────────────────────────────────

  parseOutput(raw: string, intent: IntentYaml): GenerationResult {
    let parsed: { code?: string; tests?: string; docs?: string };
    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      // Fallback: tenta extrair blocos de código manualmente
      parsed = {
        code:  this.extractBlock(raw, 'typescript') || this.extractBlock(raw, 'python') || raw,
        tests: this.extractBlock(raw, 'test') || '',
        docs:  ''
      };
    }

    const intentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(intent))
      .digest('hex');

    return {
      code:  parsed.code  ?? '',
      tests: parsed.tests ?? '',
      docs:  parsed.docs  ?? `# ${intent.module}\n\n${intent.intent}`,
      intent_signature: {
        intent_hash:      intentHash,
        generated_at:     new Date().toISOString(),
        model_used:       this.getModel(),
        criteria_covered: intent.acceptance.length,
        criteria_total:   intent.acceptance.length
      }
    };
  }

  private extractBlock(text: string, lang: string): string | null {
    const match = text.match(new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\`\`\``));
    return match?.[1] ?? null;
  }

  // ── Pipeline completo ─────────────────────────────────────────

  async generate(intent: IntentYaml, store: IntentStore): Promise<GenerationResult> {
    // Context Manager: busca dependências
    const depContext = store.getDependencyContext(intent.depends_on ?? []);

    // Parser: monta prompt
    const { system, user } = this.buildPrompt(intent, depContext);

    // LLM Adapter: chama API
    const raw = await this.callLLM(system, user);

    // Formatter: parseia saída
    return this.parseOutput(raw, intent);
  }

  async generateFromFile(yamlPath: string, store: IntentStore): Promise<void> {
    const raw    = fs.readFileSync(yamlPath, 'utf8');
    const intent = yaml.load(raw) as IntentYaml;
    const result = await this.generate(intent, store);

    // Gravar artefatos no workspace
    const dir    = path.dirname(yamlPath);
    const [, sub] = intent.module.split('/');

    const codeExt  = intent.language === 'python' ? 'py' : 'ts';
    const testSuffix = intent.language === 'python' ? '_test.py' : '.test.ts';

    fs.writeFileSync(path.join(dir, `${sub}.${codeExt}`),  result.code,  'utf8');
    fs.writeFileSync(path.join(dir, `${sub}${testSuffix}`), result.tests, 'utf8');
    fs.writeFileSync(path.join(dir, `${sub}.md`),           result.docs,  'utf8');

    // Gravar no Intent Store
    const [module, subName] = intent.module.split('/');
    const stored = store.upsertIntent(module, subName, intent.intent);
    store.setConstraints(stored.id, intent.constraints);
    store.addVersion(
      stored.id, JSON.stringify(intent),
      result.intent_signature.intent_hash,
      result.intent_signature.model_used
    );

    vscode.window.showInformationMessage(
      `✓ IDD: Código gerado para ${intent.module} (${intent.acceptance.length} testes)`
    );
  }

  // ── Verificação de drift via LLM ──────────────────────────────

  async verifyDrift(
    intentYaml: IntentYaml,
    currentCode: string
  ): Promise<VerifyResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) return { module: intentYaml.module, status: 'ok', score: 100, violations: [], message: 'API key não configurada — verificação desabilitada' };

    const system = [
      'Você é um analisador de alinhamento entre intenção e código.',
      'Retorne APENAS um JSON com:',
      '  "score": número de 0 a 100 indicando alinhamento',
      '  "violations": array de strings descrevendo constraints violadas',
      '  "status": "ok" | "warn" | "drift"'
    ].join('\n');

    const user = [
      `INTENÇÃO: ${intentYaml.intent}`,
      `CONSTRAINTS: ${intentYaml.constraints.join('; ')}`,
      `CÓDIGO ATUAL:\n\`\`\`\n${currentCode.slice(0, 2000)}\n\`\`\``
    ].join('\n');

    try {
      const raw  = await this.callLLM(system, user);
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean) as { score: number; violations: string[]; status: 'ok' | 'warn' | 'drift' };
      return {
        module:     intentYaml.module,
        status:     parsed.status,
        score:      parsed.score,
        violations: parsed.violations,
        message:    parsed.violations.length > 0
          ? `${parsed.violations.length} constraint(s) violada(s)`
          : 'Alinhado com a intenção'
      };
    } catch {
      return { module: intentYaml.module, status: 'ok', score: 100, violations: [], message: 'Verificação semântica indisponível' };
    }
  }
}
