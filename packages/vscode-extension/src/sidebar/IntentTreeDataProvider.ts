import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

type Integrity = 'aligned' | 'advisory' | 'critical';

interface ProjectIntent {
  bounded_contexts?: Array<{
    name?: string;
    status?: Integrity;
    aggregates?: Array<{
      name?: string;
      status?: Integrity;
      entities?: Array<{
        name?: string;
        status?: Integrity;
        methods?: Array<{ name?: string; intent?: string; status?: Integrity }>;
      }>;
    }>;
  }>;
}

export class IntentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly integrity: Integrity,
    public readonly children: readonly IntentTreeItem[] = [],
    intentId?: string
  ) {
    super(label, children.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    const presentation = integrity === 'critical' ? ['error', 'Drift Critico'] : integrity === 'advisory' ? ['warning', 'Advisory'] : ['pass', 'Alinhado'];
    this.description = presentation[1];
    this.tooltip = `${label}: ${presentation[1]}`;
    this.iconPath = new vscode.ThemeIcon(presentation[0]);
    this.contextValue = `idd.integrity.${integrity}`;
    if (intentId) this.command = { command: 'iddUi.openContract', title: 'Open contract detail', arguments: [intentId] };
  }
}

export class IntentTreeDataProvider implements vscode.TreeDataProvider<IntentTreeItem>, vscode.Disposable {
  private readonly changed = new vscode.EventEmitter<IntentTreeItem | undefined>();
  readonly onDidChangeTreeData = this.changed.event;
  private readonly watcher = vscode.workspace.createFileSystemWatcher('**/project.intent.yaml');

  constructor() {
    this.watcher.onDidChange(() => this.refresh());
    this.watcher.onDidCreate(() => this.refresh());
    this.watcher.onDidDelete(() => this.refresh());
  }

  refresh(): void { this.changed.fire(undefined); }
  getTreeItem(element: IntentTreeItem): vscode.TreeItem { return element; }
  async getChildren(element?: IntentTreeItem): Promise<IntentTreeItem[]> {
    if (element) return [...element.children];
    const projectFile = (await vscode.workspace.findFiles('**/project.intent.yaml', '**/node_modules/**', 1))[0];
    if (!projectFile) return [];
    try {
      const document = await vscode.workspace.openTextDocument(projectFile);
      const project = yaml.load(document.getText()) as ProjectIntent;
      return (project.bounded_contexts ?? []).map(context => this.contextItem(context));
    } catch {
      return [];
    }
  }

  dispose(): void { this.watcher.dispose(); this.changed.dispose(); }

  private contextItem(context: NonNullable<ProjectIntent['bounded_contexts']>[number]): IntentTreeItem {
    return new IntentTreeItem(context.name ?? 'Unnamed Context', context.status ?? 'aligned', (context.aggregates ?? []).map(aggregate =>
      new IntentTreeItem(aggregate.name ?? 'Unnamed Aggregate', aggregate.status ?? context.status ?? 'aligned', (aggregate.entities ?? []).map(entity =>
        new IntentTreeItem(entity.name ?? 'Unnamed Entity', entity.status ?? aggregate.status ?? 'aligned', (entity.methods ?? []).map(method =>
          new IntentTreeItem(method.name ?? 'Unnamed Method', method.status ?? entity.status ?? 'aligned', [], method.intent)
        ))
      ))
    ));
  }
}