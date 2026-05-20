// src/commands/store.ts
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { header, success, error, info, warn, row, table, footer,
         statusBadge, BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW } from '../lib/ui.ts';
import { Store, findProjectRoot } from '../lib/store.ts';

export async function cmdStore(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'list':     return storeList(args.slice(1));
    case 'show':     return storeShow(args.slice(1));
    case 'history':  return storeHistory(args.slice(1));
    case 'drift':    return storeDrift(args.slice(1));
    case 'sync':     return storeSync(args.slice(1));
    case 'snapshot': return storeSnapshot(args.slice(1));
    case 'reset':    return storeReset(args.slice(1));
    default:         return storeHelp();
  }
}

// ── idd store list ──────────────────────────────────────────────

async function storeList(args: string[]): Promise<void> {
  header('store list');
  const store = openStore();

  const intents  = store.listIntents();
  const drifts   = store.getActiveDrifts();
  const driftIds = new Set(drifts.map(d => d.intent_id));

  if (intents.length === 0) {
    info('Nenhuma intenção registrada. Execute "idd generate" primeiro.');
    store.close();
    return;
  }

  table(
    ['id (prefixo)', 'módulo', 'sub', 'status', 'versões', 'atualizado'],
    intents.map(i => {
      const versions = store.getVersions(i.id);
      const updated  = new Date(i.updated_at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      return [
        `${GRAY}${i.id.slice(0, 8)}${RESET}`,
        i.module,
        i.sub,
        statusBadge(i.status),
        `${versions.length}`,
        updated,
      ];
    })
  );

  const ok    = intents.filter(i => i.status === 'ok').length;
  const drift = intents.filter(i => i.status === 'drift').length;

  console.log('');
  row('total',    `${intents.length}`);
  row('alinhadas', `${GREEN}${ok}${RESET}`);
  if (drift > 0) row('com drift', `${RED}${drift}${RESET}`);

  store.close();
  footer('');
}

// ── idd store show ──────────────────────────────────────────────

async function storeShow(args: string[]): Promise<void> {
  const target = args[0];
  if (!target) {
    error('Uso: idd store show <modulo/sub>');
    process.exit(1);
  }

  header(`store show — ${target}`);
  const [mod, sub] = target.split('/');
  const store  = openStore();
  const intent = store.getIntent(mod, sub);

  if (!intent) {
    warn(`Intenção "${target}" não encontrada no store.`);
    store.close();
    return;
  }

  row('id',         intent.id);
  row('módulo',     `${intent.module}/${intent.sub}`);
  row('status',     statusBadge(intent.status));
  row('intenção',   intent.statement);
  row('criado em',  new Date(intent.created_at).toLocaleString('pt-BR'));
  row('atualizado', new Date(intent.updated_at).toLocaleString('pt-BR'));

  const constraints = store.getConstraints(intent.id);
  if (constraints.length > 0) {
    console.log(`\n  ${BOLD}Constraints${RESET}`);
    constraints.forEach((c: any, i: number) => {
      const sev = c.severity === 'critical' ? `${RED}●${RESET}` : `${YELLOW}●${RESET}`;
      console.log(`  ${sev}  ${i + 1}. ${c.text}`);
    });
  }

  const versions = store.getVersions(intent.id);
  if (versions.length > 0) {
    console.log(`\n  ${BOLD}Versões (${versions.length})${RESET}`);
    versions.slice(0, 5).forEach(v => {
      const date = new Date(v.created_at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      console.log(`  ${GRAY}${v.version.padEnd(8)}${RESET}${CYAN}${v.model_used.padEnd(30)}${RESET}${GRAY}${date}${RESET}`);
    });
    if (versions.length > 5) info(`... e mais ${versions.length - 5} versão(ões)`);
  }

  store.close();
  footer('');
}

// ── idd store history ───────────────────────────────────────────

async function storeHistory(args: string[]): Promise<void> {
  const target = args[0];
  if (!target) {
    error('Uso: idd store history <modulo/sub>');
    process.exit(1);
  }

  header(`store history — ${target}`);
  const [mod, sub] = target.split('/');
  const store  = openStore();
  const intent = store.getIntent(mod, sub);

  if (!intent) {
    warn(`Intenção "${target}" não encontrada.`);
    store.close();
    return;
  }

  const versions = store.getVersions(intent.id);

  if (versions.length === 0) {
    info('Nenhuma versão registrada.');
    store.close();
    return;
  }

  console.log('');
  versions.forEach((v, i) => {
    const isLatest = i === 0;
    const date = new Date(v.created_at).toLocaleString('pt-BR');
    const tag  = isLatest ? ` ${GREEN}← atual${RESET}` : '';

    console.log(`  ${BOLD}v${v.version}${RESET}${tag}`);
    console.log(`  ${GRAY}├─ data:    ${RESET}${date}`);
    console.log(`  ${GRAY}├─ modelo:  ${RESET}${CYAN}${v.model_used}${RESET}`);
    console.log(`  ${GRAY}├─ hash:    ${RESET}${GRAY}${v.intent_hash.slice(0, 16)}...${RESET}`);
    if (v.git_commit) {
      console.log(`  ${GRAY}└─ commit:  ${RESET}${GRAY}${v.git_commit.slice(0, 8)}${RESET}`);
    }
    if (i < versions.length - 1) console.log(`  ${GRAY}│${RESET}`);
  });

  store.close();
  footer(`${versions.length} versão(ões) registrada(s)`);
}

// ── idd store drift ─────────────────────────────────────────────

async function storeDrift(args: string[]): Promise<void> {
  header('store drift — eventos ativos');
  const store  = openStore();
  const drifts = store.getActiveDrifts();

  if (drifts.length === 0) {
    success('Nenhum drift ativo. Todas as intenções estão alinhadas.');
    store.close();
    footer('');
    return;
  }

  const intents = store.listIntents();

  table(
    ['intenção', 'tipo', 'detectado em'],
    drifts.map(d => {
      const intent = intents.find(i => i.id === d.intent_id);
      const date   = new Date(d.detected_at).toLocaleString('pt-BR');
      return [
        intent ? `${intent.module}/${intent.sub}` : d.intent_id.slice(0, 8),
        d.type,
        date,
      ];
    })
  );

  store.close();
  footer(`${drifts.length} drift(s) ativo(s). Execute "idd verify" para detalhes.`);
}

// ── idd store sync ──────────────────────────────────────────────

async function storeSync(args: string[]): Promise<void> {
  header('store sync');
  const root = findProjectRoot() ?? process.cwd();

  // Busca stores de outros branches/merges em .idd/incoming/
  const incomingDir = path.join(root, '.idd', 'incoming');
  if (!fs.existsSync(incomingDir)) {
    info('Nenhum store remoto para sincronizar (.idd/incoming/ vazio).');
    footer('');
    return;
  }

  const files = fs.readdirSync(incomingDir).filter(f => f.endsWith('.db'));
  if (files.length === 0) {
    info('Nenhum store para sincronizar.');
    footer('');
    return;
  }

  // Estratégia: latest wins — mantém versões mais recentes
  info(`${files.length} store(s) encontrado(s) para sync.`);
  info('Estratégia: latest — versões mais recentes têm prioridade.');
  success('Sincronização concluída (simulada — implementar merge real na Fase 3).');

  footer('');
}

// ── idd store snapshot ──────────────────────────────────────────

async function storeSnapshot(args: string[]): Promise<void> {
  const tagArg = args.find(a => a.startsWith('--tag='));
  const tag    = tagArg?.split('=')[1] ?? `snapshot-${Date.now()}`;

  header(`store snapshot — ${tag}`);

  const root  = findProjectRoot() ?? process.cwd();
  const store = new Store(root);

  try {
    const dest = store.snapshot(tag);
    success(`Snapshot criado: ${dest}`);
    row('tag',  tag);
    row('path', dest);
  } catch (err: any) {
    error(`Falha ao criar snapshot: ${err.message}`);
    process.exit(1);
  }

  footer('Snapshot preserva o estado completo das intenções neste momento.');
}

// ── idd store reset ─────────────────────────────────────────────

async function storeReset(args: string[]): Promise<void> {
  header('store reset');

  const force = args.includes('--force');
  if (!force) {
    warn('Esta operação apaga TODOS os dados do Intent Store.');
    warn('Execute "idd store reset --force" para confirmar.');
    footer('');
    return;
  }

  const root   = findProjectRoot() ?? process.cwd();
  const dbPath = path.join(root, '.idd', 'store.db');

  if (fs.existsSync(dbPath)) {
    // Cria backup antes
    const backup = dbPath + '.bak';
    fs.copyFileSync(dbPath, backup);
    fs.unlinkSync(dbPath);
    success('Store resetado.');
    info(`Backup salvo em: ${backup}`);
  } else {
    info('Store não existia — nada a resetar.');
  }

  footer('');
}

// ── Help ─────────────────────────────────────────────────────────

async function storeHelp(): Promise<void> {
  header('store — subcomandos');
  console.log('');
  console.log(`  ${CYAN}idd store list${RESET}                      lista todas as intenções`);
  console.log(`  ${CYAN}idd store show <mod/sub>${RESET}             detalhes de uma intenção`);
  console.log(`  ${CYAN}idd store history <mod/sub>${RESET}          histórico de versões`);
  console.log(`  ${CYAN}idd store drift${RESET}                      eventos de drift ativos`);
  console.log(`  ${CYAN}idd store sync${RESET}                       sincroniza após merge`);
  console.log(`  ${CYAN}idd store snapshot --tag=<nome>${RESET}      congela estado atual`);
  console.log(`  ${CYAN}idd store reset [--force]${RESET}            apaga o store`);
  footer('');
}

// ── Helper ───────────────────────────────────────────────────────

function openStore(): Store {
  const root  = findProjectRoot() ?? process.cwd();
  const store = new Store(root);
  store.open();
  return store;
}
