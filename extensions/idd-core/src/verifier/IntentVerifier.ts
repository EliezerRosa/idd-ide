import * as vscode from 'vscode';
import * as fs     from 'fs';
import * as path   from 'path';
import * as yaml   from 'js-yaml';
import { IntentStore }  from '../store/IntentStore';
import { IntentEngine, IntentYaml, VerifyResult } from '../engine/IntentEngine';

// Padrões proibidos por constraint implícita
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; message: string; severity: 'critical' | 'warn' }> = [
  { pattern: /console\.log\s*\(.*password/i,   message: 'Senha exposta em console.log',       severity: 'critical' },
  { pattern: /console\.log\s*\(.*senha/i,       message: 'Senha exposta em console.log',       severity: 'critical' },
  { pattern: /console\.log\s*\(.*secret/i,      message: 'Secret exposto em console.log',      severity: 'critical' },
  { pattern: /console\.log\s*\(.*token/i,       message: 'Token exposto em console.log',       severity: 'warn'     },
  { pattern: /Math\.random\(\)/,                message: 'Math.random() não é criptograficamente seguro', severity: 'warn' },
  { pattern: /SELECT \*/i,                      message: 'SELECT * pode expor dados desnecessários',      severity: 'warn' },
];

export interface FileVerifyResult extends VerifyResult {
  filePath:        string;
  staticViolations: string[];
  missingTests:    string[];
}

export class IntentVerifier {
  private store:      IntentStore;
  private engine:     IntentEngine;
  private context:    vscode.ExtensionContext;
  private diagnostics: vscode.DiagnosticCollection;

  constructor(store: IntentStore, engine: IntentEngine, context: vscode.ExtensionContext) {
    this.store      = store;
    this.engine     = engine;
    this.context    = context;
    this.diagnostics = vscode.languages.createDiagnosticCollection('idd-verifier');
    context.subscriptions.push(this.diagnostics);
  }

  // ── Verificação estática (sem LLM) ────────────────────────────

  static analyzeStatic(code: string, intent: IntentYaml): { violations: string[]; missingTests: string[] } {
    const violations: string[] = [];

    // 1. Padrões proibidos
    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
      if (pattern.test(code)) violations.push(message);
    }

    // 2. Constraints com palavras-chave mapeáveis
    for (const constraint of intent.constraints) {
      if (/bloquear|lockout|max.*tentativas/i.test(constraint)) {
        if (!/getAttempts|lockout|attempt/i.test(code)) {
          violations.push(`Constraint "${constraint}" não parece implementada`);
        }
      }
      if (/jwt|token.*expir/i.test(constraint)) {
        if (!/signJWT|jwt\.sign|create.*token/i.test(code)) {
          violations.push(`Constraint JWT não parece implementada`);
        }
      }
    }

    // 3. Critérios de aceite sem testes correspondentes
    const missingTests: string[] = [];
    // (verificado no arquivo .test.ts — passado separadamente)

    return { violations, missingTests };
  }

  // ── Verificação de arquivo individual ────────────────────────

  async verifyFile(filePath: string): Promise<FileVerifyResult | null> {
    // Encontra o .intent.yaml correspondente
    const dir       = path.dirname(filePath);
    const yamlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.intent.yaml'));
    if (yamlFiles.length === 0) return null;

    const yamlPath = path.join(dir, yamlFiles[0]);
    const intent   = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as IntentYaml;
    const code     = fs.readFileSync(filePath, 'utf8');

    // Análise estática imediata
    const { violations: staticViolations } = IntentVerifier.analyzeStatic(code, intent);

    // Verificação de testes
    const testFile  = filePath.replace(/\.(ts|js|py)$/, '.test.$1');
    const missingTests: string[] = [];
    if (fs.existsSync(testFile)) {
      const testCode = fs.readFileSync(testFile, 'utf8');
      for (const criterion of intent.acceptance) {
        const keywords = criterion.split(' ').filter(w => w.length > 4).slice(0, 3);
        const covered  = keywords.some(kw => testCode.toLowerCase().includes(kw.toLowerCase()));
        if (!covered) missingTests.push(criterion);
      }
    } else {
      missingTests.push(...intent.acceptance);
    }

    // Emite diagnósticos inline no editor
    await this.emitDiagnostics(filePath, staticViolations);

    // Status baseado em análise estática
    const hasStaticCritical = staticViolations.some(v =>
      FORBIDDEN_PATTERNS.find(p => p.message === v)?.severity === 'critical'
    );
    const result: FileVerifyResult = {
      module:           intent.module,
      filePath,
      status:           hasStaticCritical ? 'drift' : staticViolations.length > 0 ? 'warn' : 'ok',
      score:            hasStaticCritical ? 30 : staticViolations.length > 0 ? 70 : 100,
      violations:       staticViolations,
      staticViolations,
      missingTests,
      message:          staticViolations.length > 0
        ? `${staticViolations.length} problema(s) detectado(s)`
        : 'Alinhado com a intenção'
    };

    // Atualiza status no store
    const stored = this.store.getIntent(
      intent.module.split('/')[0],
      intent.module.split('/')[1]
    );
    if (stored) {
      this.store.setIntentStatus(stored.id, result.status);
      if (result.status === 'drift') {
        this.store.recordDrift(stored.id, 'static');
      }
    }

    return result;
  }

  // ── Verificação de todas as intenções ────────────────────────

  async verifyAll(): Promise<FileVerifyResult[]> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return [];

    const results: FileVerifyResult[] = [];
    const yamlFiles = await vscode.workspace.findFiles('**/*.intent.yaml', '**/node_modules/**');

    for (const yamlUri of yamlFiles) {
      const dir      = path.dirname(yamlUri.fsPath);
      const intent   = yaml.load(fs.readFileSync(yamlUri.fsPath, 'utf8')) as IntentYaml;
      const [, sub]  = intent.module.split('/');
      const ext      = intent.language === 'python' ? 'py' : 'ts';
      const codeFile = path.join(dir, `${sub}.${ext}`);

      if (fs.existsSync(codeFile)) {
        const result = await this.verifyFile(codeFile);
        if (result) results.push(result);
      }
    }

    return results;
  }

  // ── Diagnósticos inline no VS Code ───────────────────────────

  private async emitDiagnostics(filePath: string, violations: string[]): Promise<void> {
    const uri  = vscode.Uri.file(filePath);
    const diags: vscode.Diagnostic[] = [];

    if (violations.length === 0) {
      this.diagnostics.set(uri, []);
      return;
    }

    // Para simplificar, aponta para linha 1 — melhorar com localização futura
    const range = new vscode.Range(0, 0, 0, 100);
    for (const v of violations) {
      const severity = FORBIDDEN_PATTERNS.find(p => p.message === v)?.severity === 'critical'
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning;

      const diag = new vscode.Diagnostic(range, `[IDD Drift] ${v}`, severity);
      diag.source = 'IDD Verifier';
      diags.push(diag);
    }

    this.diagnostics.set(uri, diags);
  }

  dispose(): void {
    this.diagnostics.dispose();
  }
}
