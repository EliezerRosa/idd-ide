// src/commands/init.ts
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { header, success, info, warn, footer, row, BOLD, RESET, PURPLE } from '../lib/ui.ts';

const GITIGNORE_APPEND = `
# IDD IDE
.idd/store.db
.idd/snapshots/
`;

const VSCODE_SETTINGS = {
  "idd.autoVerify":         true,
  "idd.blockCommitOnDrift": true,
  "yaml.schemas": {
    "./.idd/intent.schema.json": "**/*.intent.yaml"
  }
};

export async function cmdInit(args: string[]): Promise<void> {
  const cwd = process.cwd();
  header('init');

  // 1. Diretório .idd
  const iddDir = path.join(cwd, '.idd');
  if (!fs.existsSync(iddDir)) {
    fs.mkdirSync(iddDir, { recursive: true });
    success('Diretório .idd/ criado');
  } else {
    info('.idd/ já existe — pulando');
  }

  // 2. Copiar schema para .idd/
  const schemaSrc  = path.resolve(import.meta.dirname, '../../../schemas/intent.schema.json');
  const schemaDest = path.join(iddDir, 'intent.schema.json');
  if (fs.existsSync(schemaSrc)) {
    fs.copyFileSync(schemaSrc, schemaDest);
    success('Schema .idd/intent.schema.json copiado');
  }

  // 3. Arquivo de exemplo .intent.yaml
  const exampleDir  = path.join(cwd, 'src', 'example');
  const exampleYaml = path.join(exampleDir, 'hello.intent.yaml');
  if (!fs.existsSync(exampleYaml)) {
    fs.mkdirSync(exampleDir, { recursive: true });
    fs.writeFileSync(exampleYaml, [
      'intent: "Retornar uma saudação personalizada com o nome do usuário"',
      'module: example/hello',
      '',
      'constraints:',
      '  - "O nome deve ter entre 1 e 100 caracteres"',
      '  - "Nunca retornar string vazia"',
      '',
      'acceptance:',
      '  - "hello(\'Alice\') retorna \'Olá, Alice!\'"',
      '  - "nome vazio lança erro de validação"',
      '',
      'language: typescript',
    ].join('\n'), 'utf8');
    success('Exemplo criado em src/example/hello.intent.yaml');
  }

  // 4. .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  const hasGitignore  = fs.existsSync(gitignorePath);
  if (hasGitignore) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('IDD IDE')) {
      fs.appendFileSync(gitignorePath, GITIGNORE_APPEND);
      success('.gitignore atualizado');
    } else {
      info('.gitignore já contém entradas IDD — pulando');
    }
  } else {
    fs.writeFileSync(gitignorePath, GITIGNORE_APPEND.trim() + '\n');
    success('.gitignore criado');
  }

  // 5. VS Code settings
  const vscodeDir      = path.join(cwd, '.vscode');
  const settingsPath   = path.join(vscodeDir, 'settings.json');
  if (!fs.existsSync(vscodeDir)) fs.mkdirSync(vscodeDir);
  if (fs.existsSync(settingsPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const merged   = { ...existing, ...VSCODE_SETTINGS };
      fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2));
      success('.vscode/settings.json atualizado com configurações IDD');
    } catch {
      warn('.vscode/settings.json inválido — pulando');
    }
  } else {
    fs.writeFileSync(settingsPath, JSON.stringify(VSCODE_SETTINGS, null, 2));
    success('.vscode/settings.json criado');
  }

  // 6. Git hooks
  const hooksDir     = path.join(cwd, '.git', 'hooks');
  const isGitRepo    = fs.existsSync(path.join(cwd, '.git'));
  if (isGitRepo) {
    fs.mkdirSync(hooksDir, { recursive: true });
    writeHook(path.join(hooksDir, 'pre-commit'), [
      '#!/bin/sh',
      '# IDD IDE — pre-commit hook',
      'if command -v idd > /dev/null 2>&1; then',
      '  idd verify --fail-on=critical',
      '  [ $? -ne 0 ] && echo "[IDD] Commit bloqueado — drift crítico detectado." && exit 1',
      'fi',
      'exit 0',
    ]);
    writeHook(path.join(hooksDir, 'post-merge'), [
      '#!/bin/sh',
      '# IDD IDE — post-merge hook',
      'command -v idd > /dev/null 2>&1 && idd store sync 2>/dev/null || true',
    ]);
    writeHook(path.join(hooksDir, 'post-tag'), [
      '#!/bin/sh',
      '# IDD IDE — post-tag hook',
      'TAG=$(git describe --tags --abbrev=0 2>/dev/null)',
      '[ -n "$TAG" ] && command -v idd > /dev/null 2>&1 && idd store snapshot --tag="$TAG" 2>/dev/null || true',
    ]);
    success('Git hooks instalados (pre-commit, post-merge, post-tag)');
  } else {
    warn('Repositório git não encontrado — hooks não instalados');
    info('Execute "git init" e depois "idd init" novamente');
  }

  console.log('');
  row('Projeto inicializado em', cwd);

  footer('Próximo passo: edite src/example/hello.intent.yaml e execute "idd generate"');
}

function writeHook(hookPath: string, lines: string[]): void {
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes('IDD IDE')) return;
    fs.writeFileSync(hookPath, existing + '\n' + lines.join('\n'), 'utf8');
  } else {
    fs.writeFileSync(hookPath, lines.join('\n') + '\n', { mode: 0o755 });
  }
  fs.chmodSync(hookPath, 0o755);
}
