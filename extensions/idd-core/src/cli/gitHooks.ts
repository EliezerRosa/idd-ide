import * as fs   from 'fs';
import * as path  from 'path';

const PRE_COMMIT = `#!/bin/sh
# IDD IDE — pre-commit hook (instalado automaticamente)
# Bloqueia commit se houver drift crítico detectado pelo Verifier

if command -v idd > /dev/null 2>&1; then
  idd verify --staged --fail-on=critical
  if [ $? -ne 0 ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  IDD: Commit bloqueado — drift crítico detectado ║"
    echo "║  Execute 'idd verify' para ver os detalhes.      ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""
    exit 1
  fi
fi
exit 0
`;

const POST_MERGE = `#!/bin/sh
# IDD IDE — post-merge hook
# Sincroniza o Intent Store após merge

if command -v idd > /dev/null 2>&1; then
  idd store sync --strategy=latest 2>/dev/null || true
fi
exit 0
`;

const POST_TAG = `#!/bin/sh
# IDD IDE — post-tag hook
# Congela snapshot do Intent Store a cada release tag

if command -v idd > /dev/null 2>&1; then
  TAG=$(git describe --tags --abbrev=0 2>/dev/null)
  if [ -n "$TAG" ]; then
    idd store snapshot --tag="$TAG" 2>/dev/null || true
  fi
fi
exit 0
`;

export async function installGitHooks(workspaceRoot: string): Promise<void> {
  const hooksDir = path.join(workspaceRoot, '.git', 'hooks');
  if (!fs.existsSync(hooksDir)) return; // não é um repositório git

  const hooks: Record<string, string> = {
    'pre-commit':  PRE_COMMIT,
    'post-merge':  POST_MERGE,
    'post-tag':    POST_TAG,
  };

  for (const [name, content] of Object.entries(hooks)) {
    const hookPath = path.join(hooksDir, name);
    // Não sobrescrever hooks existentes que não foram criados pelo IDD
    if (fs.existsSync(hookPath)) {
      const existing = fs.readFileSync(hookPath, 'utf8');
      if (!existing.includes('IDD IDE')) {
        // Adiciona chamada IDD ao hook existente
        fs.writeFileSync(hookPath, existing + '\n' + content, 'utf8');
        continue;
      }
    }
    fs.writeFileSync(hookPath, content, { encoding: 'utf8', mode: 0o755 });
  }
}

export async function uninstallGitHooks(workspaceRoot: string): Promise<void> {
  const hooksDir = path.join(workspaceRoot, '.git', 'hooks');
  for (const name of ['pre-commit', 'post-merge', 'post-tag']) {
    const hookPath = path.join(hooksDir, name);
    if (!fs.existsSync(hookPath)) continue;
    const content = fs.readFileSync(hookPath, 'utf8');
    if (content.includes('IDD IDE') && content.trim() === content) {
      fs.unlinkSync(hookPath); // era hook exclusivo do IDD
    }
  }
}
