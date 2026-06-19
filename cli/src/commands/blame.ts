// src/commands/blame.ts — Issue #10: idd blame
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { Store, findProjectRoot } from '../lib/store.ts';
import { isGitRepo, getFileHistory, getFileCreator, getFileLastModifier } from '../lib/git.ts';
import {
  header, footer, row, table, info, warn, error,
  BOLD, RESET, GRAY, CYAN, GREEN, YELLOW, PURPLE,
} from '../lib/ui.ts';

// ── idd blame <modulo/sub> ────────────────────────────────────────

async function blameModule(target: string, root: string, store: Store): Promise<void> {
  const [mod, sub] = target.split('/');
  const intent = store.getIntent(mod, sub);

  if (!intent) {
    error(`Intenção "${target}" não encontrada no Intent Store.`);
    info('Execute "idd generate" para gerar e registrar esta intenção.');
    process.exit(1);
  }

  header(`blame — ${target}`);

  const versions = store.getVersions(intent.id);

  if (versions.length === 0) {
    warn('Nenhuma versão registrada para esta intenção.');
    footer('');
    return;
  }

  // ── Histórico via Intent Store (sempre disponível) ──────────────
  console.log(`\n  ${BOLD}Histórico no Intent Store${RESET}\n`);

  table(
    ['versão', 'autor', 'e-mail', 'data', 'modelo'],
    versions.map(v => [
      v.version,
      v.git_author ?? `${GRAY}desconhecido${RESET}`,
      v.git_email  ?? '—',
      new Date(v.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
      v.model_used?.slice(0, 24) ?? '—',
    ])
  );

  // ── Autoria via git log (se for repo git) ───────────────────────
  const yamlPath = findYamlFile(root, mod, sub);
  const isGit    = isGitRepo(root);

  if (isGit && yamlPath) {
    const relativePath = path.relative(root, yamlPath);
    const gitHistory    = getFileHistory(root, relativePath, 10);

    if (gitHistory.length > 0) {
      console.log(`\n  ${BOLD}Histórico Git — ${relativePath}${RESET}\n`);
      gitHistory.forEach((c, i) => {
        const tag = i === 0 ? ` ${GREEN}← HEAD${RESET}` : '';
        console.log(`  ${PURPLE}${c.hash}${RESET}  ${BOLD}${c.author}${RESET} <${GRAY}${c.email}${RESET}>${tag}`);
        console.log(`  ${GRAY}${new Date(c.date).toLocaleString('pt-BR')}${RESET}  ${c.message}`);
        if (i < gitHistory.length - 1) console.log('');
      });

      const creator = getFileCreator(root, relativePath);
      if (creator) {
        console.log('');
        row('criado por',    `${creator.author} <${creator.email}>`);
        row('criado em',     new Date(creator.date).toLocaleDateString('pt-BR'));
      }
    } else {
      console.log('');
      info(`Arquivo ${relativePath} ainda não commitado no git.`);
    }
  } else if (!isGit) {
    console.log('');
    info('Projeto não é um repositório git — exibindo apenas histórico do Intent Store.');
  }

  // ── Constraints com origem ──────────────────────────────────────
  const constraints = store.getConstraints(intent.id);
  if (constraints.length > 0) {
    console.log(`\n  ${BOLD}Constraints ativas (${constraints.length})${RESET}`);
    constraints.forEach((c: any) => {
      const sev = c.severity === 'critical' ? `${YELLOW}●${RESET}` : `${GRAY}●${RESET}`;
      console.log(`  ${sev}  ${c.text}`);
    });
  }

  footer('');
}

// ── idd blame --all ───────────────────────────────────────────────

async function blameAll(root: string, store: Store): Promise<void> {
  header('blame --all');

  const intents = store.listIntents();
  if (intents.length === 0) {
    info('Nenhuma intenção registrada.');
    footer('');
    return;
  }

  const rows = intents.map(intent => {
    const versions = store.getVersions(intent.id);
    const latest   = versions[0];
    return [
      `${intent.module}/${intent.sub}`,
      latest?.git_author ?? `${GRAY}desconhecido${RESET}`,
      latest ? new Date(latest.created_at).toLocaleDateString('pt-BR') : '—',
      `${versions.length}`,
    ];
  });

  table(['módulo', 'último autor', 'última atualização', 'versões'], rows);

  // Author summary
  const authorCounts = new Map<string, number>();
  for (const intent of intents) {
    const latest = store.getVersions(intent.id)[0];
    const author = latest?.git_author ?? 'desconhecido';
    authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
  }

  console.log(`\n  ${BOLD}Resumo por autor${RESET}`);
  for (const [author, count] of [...authorCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${CYAN}${author}${RESET}  ${count} intenção(ões)`);
  }

  footer('"idd blame <modulo/sub>" → detalhes de uma intenção específica');
}

// ── Comando principal ────────────────────────────────────────────

export async function cmdBlame(args: string[]): Promise<void> {
  const root  = findProjectRoot() ?? process.cwd();
  const store = new Store(root);
  store.open();

  try {
    if (args.includes('--all')) {
      await blameAll(root, store);
      return;
    }

    const target = args.find(a => !a.startsWith('--'));
    if (!target) {
      error('Uso: idd blame <modulo/sub>');
      error('     idd blame --all');
      process.exit(1);
    }

    await blameModule(target, root, store);
  } finally {
    store.close();
  }
}

// ── Helper ────────────────────────────────────────────────────────

function findYamlFile(root: string, mod: string, sub: string): string | null {
  const candidates = [
    path.join(root, 'src', mod, `${sub}.intent.yaml`),
    path.join(root, mod, `${sub}.intent.yaml`),
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
}
