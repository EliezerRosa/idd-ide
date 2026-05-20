import * as vscode from 'vscode';
import { IntentStore, Intent } from '../store/IntentStore';

const STATUS_ICON: Record<string, string> = {
  ok:         '$(check)',
  drift:      '$(error)',
  warn:       '$(warning)',
  orphan:     '$(circle-slash)',
  deprecated: '$(circle-slash)'
};

export class IntentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly intent: Intent,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(`${intent.module}/${intent.sub}`, collapsibleState);
    this.description  = intent.status;
    this.tooltip      = intent.statement;
    this.iconPath     = new vscode.ThemeIcon(
      intent.status === 'ok'    ? 'check'         :
      intent.status === 'drift' ? 'error'          :
      intent.status === 'warn'  ? 'warning'        : 'circle-slash'
    );
    this.contextValue = `intent.${intent.status}`;
    this.command = {
      command:   'idd.openCapture',
      title:     'Abrir intenção',
      arguments: [`${intent.module}/${intent.sub}`]
    };
  }
}

export class IntentTreeProvider implements vscode.TreeDataProvider<IntentTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<IntentTreeItem | undefined | void>();
  readonly onDidChangeTreeData  = this._onDidChangeTreeData.event;

  constructor(private store: IntentStore) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: IntentTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): IntentTreeItem[] {
    const intents = this.store.listIntents();
    return intents.map(i => new IntentTreeItem(i, vscode.TreeItemCollapsibleState.None));
  }
}
