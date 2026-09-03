import * as vscode from 'vscode';
import { ContractIndex, IntentContract } from '../contracts/ContractIndex';

const INTENT_DECORATOR = /@intent\(\s*['"]([^'"]+)['"]\s*\)/g;
const MUTATION = /(?:this\.)?([A-Za-z_$][\w$]*)\s*(?:\+\+|--|[+\-*/]?=)(?!=)/g;

export class LspDiagnosticProvider implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('idd-drift');
  private readonly disposables: vscode.Disposable[];

  constructor(private readonly contracts: ContractIndex) {
    this.disposables = [
      this.collection,
      vscode.workspace.onDidChangeTextDocument(event => this.validate(event.document)),
      vscode.workspace.onDidOpenTextDocument(document => this.validate(document)),
      vscode.languages.registerCodeActionsProvider([{ language: 'typescript' }, { language: 'python' }], new MutationCodeActions(), { providedCodeActionKinds: MutationCodeActions.providedCodeActionKinds })
    ];
  }

  validate(document: vscode.TextDocument): void {
    if (!['typescript', 'python', 'javascript'].includes(document.languageId)) return;
    const diagnostics: vscode.Diagnostic[] = [];
    const lines = document.getText().split(/\r?\n/);
    let activeContract: IntentContract | undefined;

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
      const line = lines[lineNumber];
      INTENT_DECORATOR.lastIndex = 0;
      const decorator = INTENT_DECORATOR.exec(line);
      if (decorator) activeContract = this.contracts.find(decorator[1]);
      if (!activeContract) continue;
      MUTATION.lastIndex = 0;
      for (let match = MUTATION.exec(line); match; match = MUTATION.exec(line)) {
        const field = match[1];
        if (activeContract.allowedFields.includes(field)) continue;
        const range = new vscode.Range(lineNumber, match.index + match[0].indexOf(field), lineNumber, match.index + match[0].indexOf(field) + field.length);
        const diagnostic = new vscode.Diagnostic(range, `Field '${field}' is not authorized by '${activeContract.id}' (INV-UI-04).`, vscode.DiagnosticSeverity.Error);
        diagnostic.code = 'idd.unauthorized-state-mutation';
        diagnostic.source = 'IDD Drift';
        diagnostic.relatedInformation = [new vscode.DiagnosticRelatedInformation(new vscode.Location(activeContract.uri, new vscode.Position(0, 0)), 'Contract source')];
        diagnostics.push(diagnostic);
      }
    }
    this.collection.set(document.uri, diagnostics);
  }

  dispose(): void { this.disposables.forEach(disposable => disposable.dispose()); }
}

class MutationCodeActions implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
    return context.diagnostics
      .filter(diagnostic => diagnostic.code === 'idd.unauthorized-state-mutation')
      .map(diagnostic => {
        const action = new vscode.CodeAction('Open contract to authorize field', vscode.CodeActionKind.QuickFix);
        action.command = { command: 'iddUi.openContract', title: 'Open contract detail' };
        action.diagnostics = [diagnostic];
        return action;
      });
  }
}