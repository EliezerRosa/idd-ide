import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

export interface IntentContract {
  readonly id: string;
  readonly boundedContext?: string;
  readonly allowedFields: readonly string[];
  readonly readOnlyFields: readonly string[];
  readonly uri: vscode.Uri;
}

type IntentDocument = {
  id?: unknown;
  name?: unknown;
  bounded_context?: unknown;
  state_mutation?: { allowed_fields?: unknown };
  read_only_fields?: unknown;
};

export class ContractIndex implements vscode.Disposable {
  private readonly contracts = new Map<string, IntentContract>();
  private readonly disposables: vscode.Disposable[];

  constructor() {
    this.disposables = [
      vscode.workspace.onDidSaveTextDocument(document => {
        if (document.uri.fsPath.endsWith('.intent.yaml')) this.upsert(document);
      }),
      vscode.workspace.onDidDeleteFiles(event => {
        for (const uri of event.files) this.contracts.delete(uri.fsPath);
      })
    ];
  }

  async initialize(): Promise<void> {
    const documents = await vscode.workspace.findFiles('**/*.intent.yaml', '**/node_modules/**');
    await Promise.all(documents.map(async uri => this.upsert(await vscode.workspace.openTextDocument(uri))));
  }

  find(intentId: string): IntentContract | undefined {
    return [...this.contracts.values()].find(contract => contract.id === intentId);
  }

  private upsert(document: vscode.TextDocument): void {
    try {
      const parsed = yaml.load(document.getText()) as IntentDocument | undefined;
      if (!parsed || typeof parsed !== 'object') return;
      const id = asString(parsed.id) ?? asString(parsed.name);
      if (!id) return;
      this.contracts.set(document.uri.fsPath, {
        id,
        boundedContext: asString(parsed.bounded_context),
        allowedFields: asStringArray(parsed.state_mutation?.allowed_fields),
        readOnlyFields: asStringArray(parsed.read_only_fields),
        uri: document.uri
      });
    } catch {
      // YAML schema diagnostics remain the YAML extension's responsibility.
    }
  }

  dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}