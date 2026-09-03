import * as vscode from 'vscode';
import { IntentContract } from '../contracts/ContractIndex';

export class ContractDetailPanel {
  private static currentPanel: ContractDetailPanel | undefined;

  private constructor(private readonly panel: vscode.WebviewPanel, private readonly extensionUri: vscode.Uri) {
    this.panel.onDidDispose(() => { ContractDetailPanel.currentPanel = undefined; });
  }

  static show(extensionUri: vscode.Uri, contract?: IntentContract): void {
    if (ContractDetailPanel.currentPanel) {
      ContractDetailPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      ContractDetailPanel.currentPanel.render(contract);
      return;
    }
    const panel = vscode.window.createWebviewPanel('idd.contractDetail', 'IDD Contract Detail', vscode.ViewColumn.Beside, {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
    });
    const detailPanel = new ContractDetailPanel(panel, extensionUri);
    ContractDetailPanel.currentPanel = detailPanel;
    detailPanel.render(contract);
  }

  private render(contract?: IntentContract): void {
    const webview = this.panel.webview;
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'contract-detail.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'contract-detail.css'));
    const nonce = createNonce();
    const detail = {
      name: contract?.id ?? 'No intent selected',
      status: contract ? 'Conforme' : 'Nao Conforme',
      lcom: '--',
      cbo: '--',
      allowedFields: contract?.allowedFields ?? []
    };
    webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>IDD Contract Detail</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">window.__IDD_CONTRACT__ = ${JSON.stringify(detail).replace(/</g, '\\u003c')};</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function createNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}