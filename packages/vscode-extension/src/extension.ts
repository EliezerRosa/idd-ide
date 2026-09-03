import * as vscode from 'vscode';
import { ContractIndex } from './contracts/ContractIndex';
import { LspDiagnosticProvider } from './diagnostics/LspDiagnosticProvider';
import { IntentTreeDataProvider } from './sidebar/IntentTreeDataProvider';
import { ContractDetailPanel } from './webview/ContractDetailPanel';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const contracts = new ContractIndex();
  await contracts.initialize();
  const intentTree = new IntentTreeDataProvider();
  const diagnostics = new LspDiagnosticProvider(contracts);
  const lifecycle = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  lifecycle.text = '$(shield) Lifecycle: STABILIZATION | Role: MODERATOR | Drift: --';
  lifecycle.tooltip = 'IDD governance status';
  lifecycle.show();

  context.subscriptions.push(
    contracts,
    diagnostics,
    intentTree,
    lifecycle,
    vscode.window.registerTreeDataProvider('idd.intentNavigator', intentTree),
    vscode.commands.registerCommand('iddUi.refreshIntentTree', () => intentTree.refresh()),
    vscode.commands.registerCommand('iddUi.openContract', (intentId?: string) => {
      ContractDetailPanel.show(context.extensionUri, intentId ? contracts.find(intentId) : undefined);
    })
  );
}

export function deactivate(): void {}