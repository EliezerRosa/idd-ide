import * as vscode from 'vscode';
import { IntentCapturePanel } from './capture/IntentCapturePanel';
import { IntentGraphPanel }   from './capture/IntentGraphPanel';
import { IntentEngine }       from './engine/IntentEngine';
import { IntentStore }        from './store/IntentStore';
import { IntentVerifier }     from './verifier/IntentVerifier';
import { IntentTreeProvider } from './capture/IntentTreeProvider';
import { installGitHooks }    from './cli/gitHooks';

export async function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  // ── Serviços core ──────────────────────────────────────────────
  const store    = new IntentStore(workspaceRoot);
  const engine   = new IntentEngine(context);
  const verifier = new IntentVerifier(store, engine, context);

  await store.initialize();

  // ── Sidebar: árvore de intenções ───────────────────────────────
  const treeProvider = new IntentTreeProvider(store);
  vscode.window.registerTreeDataProvider('idd.intentTree', treeProvider);
  store.onDidChange(() => treeProvider.refresh());

  // ── Comandos ───────────────────────────────────────────────────
  context.subscriptions.push(

    vscode.commands.registerCommand('idd.newIntent', async () => {
      const module = await vscode.window.showInputBox({
        prompt: 'Caminho do módulo (ex: auth/login)',
        placeHolder: 'modulo/sub'
      });
      if (!module) return;
      await IntentCapturePanel.create(context, store, engine, module);
    }),

    vscode.commands.registerCommand('idd.openCapture', () => {
      IntentCapturePanel.create(context, store, engine);
    }),

    vscode.commands.registerCommand('idd.generateCode', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor?.document.fileName.endsWith('.intent.yaml')) {
        vscode.window.showWarningMessage('Abra um arquivo .intent.yaml para gerar código.');
        return;
      }
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'IDD: Gerando código...', cancellable: false },
        () => engine.generateFromFile(editor.document.uri.fsPath, store)
      );
    }),

    vscode.commands.registerCommand('idd.verify', async () => {
      const results = await verifier.verifyAll();
      const drifts  = results.filter(r => r.status !== 'ok');
      if (drifts.length === 0) {
        vscode.window.showInformationMessage('✓ IDD: Todas as intenções estão alinhadas.');
      } else {
        vscode.window.showWarningMessage(
          `IDD: ${drifts.length} intenção(ões) com drift detectado.`,
          'Ver detalhes'
        ).then(sel => sel && vscode.commands.executeCommand('idd.openGraph'));
      }
    }),

    vscode.commands.registerCommand('idd.openGraph', () => {
      IntentGraphPanel.create(context, store);
    })
  );

  // ── Auto-verificação ao salvar ─────────────────────────────────
  const cfg = vscode.workspace.getConfiguration('idd');
  if (cfg.get('autoVerify')) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async doc => {
        if (doc.fileName.endsWith('.ts') || doc.fileName.endsWith('.py')) {
          await verifier.verifyFile(doc.uri.fsPath);
        }
      })
    );
  }

  // ── Instalar Git hooks ─────────────────────────────────────────
  if (cfg.get('blockCommitOnDrift')) {
    await installGitHooks(workspaceRoot);
  }

  vscode.window.setStatusBarMessage('$(check) IDD IDE ativo', 3000);
}

export function deactivate() {}
