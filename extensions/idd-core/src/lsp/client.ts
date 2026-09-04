// extensions/idd-core/src/lsp/client.ts
// Inicializa e conecta o Language Client VS Code ao servidor LSP do IDD.

import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | null = null;

export function startLanguageClient(context: vscode.ExtensionContext): void {
  const serverModule = context.asAbsolutePath(
    path.join('dist', 'lsp', 'server.js')
  );

  // Opções do servidor: roda em um processo filho via Node.js
  const serverOptions: ServerOptions = {
    run:   { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module:    serverModule,
      transport: TransportKind.ipc,
      options:   { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  // Opções do cliente: ativa apenas para arquivos .intent.yaml
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'yaml', pattern: '**/*.intent.yaml' },
      { scheme: 'file', pattern: '**/*.intent.yaml' },
      { scheme: 'file', language: 'typescript', pattern: '**/*.ts' },
    ],
    synchronize: {
      // Notifica o servidor quando arquivos .intent.yaml mudam no workspace
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.intent.yaml'),
    },
    outputChannelName: 'IDD Language Server',
  };

  client = new LanguageClient(
    'idd-language-server',
    'IDD Language Server',
    serverOptions,
    clientOptions
  );

  // Inicia o cliente (e o servidor filho)
  client.start();
  context.subscriptions.push({ dispose: () => stopLanguageClient() });

  // Log de status
  client.onDidChangeState(event => {
    const states = ['stopped', 'starting', 'running'];
    const msg    = `IDD LSP: ${states[event.newState] ?? 'unknown'}`;
    vscode.window.setStatusBarMessage(msg, 3000);
  });
}

export async function stopLanguageClient(): Promise<void> {
  if (client) {
    await client.stop();
    client = null;
  }
}

export function getLanguageClient(): LanguageClient | null {
  return client;
}
