import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

export type IntentStatus = 'aligned' | 'advisory' | 'critical';

export interface WorkspaceIntent {
  id: string;
  boundedContext: string;
  module: string;
  name: string;
  statement: string;
  constraints: string[];
  acceptance: string[];
  language: string;
  status: IntentStatus;
  fsPath: string;
  implementationPath?: string;
  implementationLine?: number;
}

interface ContractDocument {
  intent?: unknown;
  module?: unknown;
  constraints?: unknown;
  acceptance?: unknown;
  language?: unknown;
}

interface ProjectDocument {
  bounded_contexts?: Array<{ name?: unknown; status?: unknown }>;
}

const EXCLUDE_GLOB = '**/{node_modules,out,dist,.git,.idd}/**';
const PROJECT_FILE = 'project.intent.yaml';

export async function scanWorkspaceIntents(): Promise<WorkspaceIntent[]> {
  if (!vscode.workspace.workspaceFolders?.length) return [];

  const [contractUris, projectUris] = await Promise.all([
    vscode.workspace.findFiles('**/*.intent.yaml', EXCLUDE_GLOB),
    vscode.workspace.findFiles(`**/${PROJECT_FILE}`, EXCLUDE_GLOB)
  ]);

  const declaredStatus = await readDeclaredStatuses(projectUris);
  const parsed = await Promise.all(
    contractUris
      .filter(uri => path.basename(uri.fsPath) !== PROJECT_FILE)
      .map(uri => readContract(uri, declaredStatus))
  );

  return parsed
    .filter((intent): intent is WorkspaceIntent => intent !== undefined)
    .sort((a, b) => a.module.localeCompare(b.module));
}

async function readDeclaredStatuses(uris: readonly vscode.Uri[]): Promise<Map<string, IntentStatus>> {
  const statuses = new Map<string, IntentStatus>();
  for (const uri of uris) {
    const project = await parseYaml<ProjectDocument>(uri);
    for (const context of project?.bounded_contexts ?? []) {
      const name = asString(context.name);
      if (name) statuses.set(name.toLowerCase(), asStatus(context.status));
    }
  }
  return statuses;
}

async function readContract(
  uri: vscode.Uri,
  declaredStatus: Map<string, IntentStatus>
): Promise<WorkspaceIntent | undefined> {
  const contract = await parseYaml<ContractDocument>(uri);
  if (!contract) return undefined;

  const module = asString(contract.module) ?? deriveModule(uri);
  const [boundedContext, name] = splitModule(module);
  const implementationPath = findImplementation(uri.fsPath, name, contract.language);

  return {
    id: uri.fsPath,
    boundedContext,
    module,
    name,
    statement: asString(contract.intent) ?? 'Intenção não declarada neste contrato.',
    constraints: asStringArray(contract.constraints),
    acceptance: asStringArray(contract.acceptance),
    language: asString(contract.language) ?? 'typescript',
    status: declaredStatus.get(boundedContext.toLowerCase()) ?? 'aligned',
    fsPath: uri.fsPath,
    implementationPath,
    implementationLine: implementationPath ? findIntentLine(implementationPath, name) : undefined
  };
}

function findImplementation(contractPath: string, name: string, language: unknown): string | undefined {
  const extension = language === 'python' ? '.py' : '.ts';
  const candidate = path.join(path.dirname(contractPath), `${name}${extension}`);
  return fs.existsSync(candidate) ? candidate : undefined;
}

function findIntentLine(filePath: string, name: string): number {
  try {
    const line = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).findIndex(value => value.includes(`@intent('${name}')`) || value.includes(`@intent("${name}")`));
    return line >= 0 ? line : 0;
  } catch {
    return 0;
  }
}

async function parseYaml<T>(uri: vscode.Uri): Promise<T | undefined> {
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const parsed = yaml.load(document.getText());
    return parsed && typeof parsed === 'object' ? (parsed as T) : undefined;
  } catch {
    // Erros de schema YAML permanecem responsabilidade dos diagnostics do LSP.
    return undefined;
  }
}

function deriveModule(uri: vscode.Uri): string {
  const name = path.basename(uri.fsPath).replace(/\.intent\.yaml$/, '');
  return `${path.basename(path.dirname(uri.fsPath))}/${name}`;
}

function splitModule(module: string): [string, string] {
  const segments = module.split('/').filter(Boolean);
  if (segments.length >= 2) return [segments[0], segments.slice(1).join('/')];
  return ['workspace', segments[0] ?? module];
}

function asStatus(value: unknown): IntentStatus {
  return value === 'critical' || value === 'advisory' ? value : 'aligned';
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
