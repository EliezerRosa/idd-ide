// src/commands/server.ts — Issue #13: IDD Server CLI
import * as fs    from 'node:fs';
import * as path  from 'node:path';
import * as http  from 'node:http';
import { Store, findProjectRoot } from '../lib/store.ts';
import { loadConfig }              from '../lib/config.ts';
import { IddServer }               from '../lib/server.ts';
import {
  header, footer, success, error, info, warn, row, spinner,
  BOLD, RESET, CYAN, GRAY, GREEN, RED,
} from '../lib/ui.ts';

// ── Helpers ───────────────────────────────────────────────────────

const PID_FILE  = (root: string) => path.join(root, '.idd', 'server.pid');
const PORT_FILE = (root: string) => path.join(root, '.idd', 'server.port');

function readServerInfo(root: string): { pid: number; port: number } | null {
  const pidPath  = PID_FILE(root);
  const portPath = PORT_FILE(root);
  if (!fs.existsSync(pidPath) || !fs.existsSync(portPath)) return null;
  const pid  = parseInt(fs.readFileSync(pidPath,  'utf8').trim());
  const port = parseInt(fs.readFileSync(portPath, 'utf8').trim());
  if (isNaN(pid) || isNaN(port)) return null;
  return { pid, port };
}

function isProcessRunning(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function apiRequest(
  port: number, method: string, pathname: string,
  body?: unknown, token?: string
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();

    const req = http.request(
      { hostname: '127.0.0.1', port, path: pathname, method, headers },
      res => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode ?? 0, data: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode ?? 0, data }); }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── idd server start ─────────────────────────────────────────────

async function serverStart(args: string[]): Promise<void> {
  const root   = findProjectRoot() ?? process.cwd();
  const cfg    = loadConfig(root);
  const port   = parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] ?? '4999');
  const token  = process.env.IDD_SERVER_TOKEN ?? undefined;
  const daemon = args.includes('--daemon') || args.includes('-d');

  header('server start');

  // Verifica se já existe um servidor rodando
  const existing = readServerInfo(root);
  if (existing && isProcessRunning(existing.pid)) {
    info(`Servidor já está rodando na porta ${existing.port} (PID ${existing.pid}).`);
    footer(`Use "idd server stop" para parar.`);
    return;
  }

  const store = new Store(root);
  store.open();

  const server = new IddServer({ port, token, store });
  await server.listen();

  // Salva PID e porta
  fs.mkdirSync(path.join(root, '.idd'), { recursive: true });
  fs.writeFileSync(PID_FILE(root),  String(process.pid), 'utf8');
  fs.writeFileSync(PORT_FILE(root), String(port), 'utf8');

  console.log('');
  success(`IDD Server iniciado na porta ${port}`);
  row('PID',   `${process.pid}`);
  row('token', token ? `${token.slice(0, 8)}...` : `${GRAY}nenhum (acesso livre)${RESET}`);
  row('store', path.join(root, '.idd', 'store.db'));
  console.log('');
  console.log(`  ${GRAY}Endpoints disponíveis:${RESET}`);
  console.log(`  ${CYAN}GET${RESET}  http://localhost:${port}/health`);
  console.log(`  ${CYAN}GET${RESET}  http://localhost:${port}/intents`);
  console.log(`  ${CYAN}GET${RESET}  http://localhost:${port}/graph`);
  console.log(`  ${CYAN}GET${RESET}  http://localhost:${port}/drift`);
  console.log(`  ${CYAN}POST${RESET} http://localhost:${port}/sync`);

  if (!daemon) {
    console.log(`\n  ${GRAY}Pressione Ctrl+C para parar.${RESET}\n`);
    process.on('SIGINT',  () => shutdown(root, store, server));
    process.on('SIGTERM', () => shutdown(root, store, server));
    // Keep alive
    await new Promise(() => {});
  } else {
    footer(`Rodando em background. Use "idd server stop" para parar.`);
  }
}

async function shutdown(root: string, store: Store, server: IddServer): Promise<void> {
  console.log('\n  Parando servidor...');
  await server.close();
  store.close();
  try { fs.unlinkSync(PID_FILE(root));  } catch {}
  try { fs.unlinkSync(PORT_FILE(root)); } catch {}
  console.log('  Servidor parado.\n');
  process.exit(0);
}

// ── idd server stop ───────────────────────────────────────────────

async function serverStop(): Promise<void> {
  const root = findProjectRoot() ?? process.cwd();
  header('server stop');

  const info2 = readServerInfo(root);
  if (!info2) { warn('Nenhum servidor encontrado.'); footer(''); return; }

  if (!isProcessRunning(info2.pid)) {
    info('Processo do servidor não está mais ativo — limpando arquivos.');
  } else {
    process.kill(info2.pid, 'SIGTERM');
    await new Promise(r => setTimeout(r, 500));
    if (isProcessRunning(info2.pid)) {
      process.kill(info2.pid, 'SIGKILL');
    }
  }
  try { fs.unlinkSync(PID_FILE(root));  } catch {}
  try { fs.unlinkSync(PORT_FILE(root)); } catch {}
  success('Servidor parado.');
  footer('');
}

// ── idd server status ─────────────────────────────────────────────

async function serverStatus(): Promise<void> {
  const root = findProjectRoot() ?? process.cwd();
  header('server status');

  const info2 = readServerInfo(root);
  if (!info2 || !isProcessRunning(info2.pid)) {
    warn('Servidor não está rodando.');
    info('"idd server start" para iniciar.');
    footer('');
    return;
  }

  try {
    const { data } = await apiRequest(info2.port, 'GET', '/health');
    const health = data as { status: string; intents: number; version: string };
    console.log('');
    row('status',   `${GREEN}● ativo${RESET}`);
    row('porta',    `${info2.port}`);
    row('PID',      `${info2.pid}`);
    row('intenções', `${health.intents}`);
    row('versão',   health.version ?? '?');
    footer(`"idd pull" para sincronizar do servidor  ·  "idd push" para enviar`);
  } catch {
    row('status', `${RED}● erro (processo vivo mas porta não responde)${RESET}`);
    footer('');
  }
}

// ── idd push ─────────────────────────────────────────────────────

async function push(args: string[]): Promise<void> {
  const root    = findProjectRoot() ?? process.cwd();
  const cfg     = loadConfig(root);
  const target  = args.find(a => a.startsWith('--server='))?.split('=')[1];
  const token   = process.env.IDD_SERVER_TOKEN ?? undefined;
  const info2   = readServerInfo(root);
  const port    = target ? parseInt(target.split(':').pop()!) : (info2?.port ?? 4999);
  const store   = new Store(root);
  store.open();

  header('push');

  const intents = store.listIntents().map(i => ({
    module:      i.module,
    sub:         i.sub,
    statement:   i.statement,
    constraints: store.getConstraints(i.id).map((c: any) => c.text),
  }));

  if (intents.length === 0) {
    info('Nenhuma intenção para enviar.');
    store.close(); footer(''); return;
  }

  const spin = spinner(`Enviando ${intents.length} intenção(ões) para localhost:${port}...`);
  try {
    const { status, data } = await apiRequest(port, 'POST', '/sync', { intents }, token);
    spin.stop(status === 200);
    if (status === 200) {
      const r = data as { synced: number };
      success(`${r.synced} intenção(ões) sincronizadas com sucesso.`);
    } else {
      error(`Servidor retornou ${status}: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    spin.stop(false);
    error(`Falha ao conectar ao servidor: ${e.message}`);
    info('Verifique se o servidor está rodando: "idd server status"');
  }

  store.close();
  footer('');
}

// ── idd pull ─────────────────────────────────────────────────────

async function pull(args: string[]): Promise<void> {
  const root  = findProjectRoot() ?? process.cwd();
  const token = process.env.IDD_SERVER_TOKEN ?? undefined;
  const info2 = readServerInfo(root);
  const port  = info2?.port ?? 4999;
  const store = new Store(root);
  store.open();

  header('pull');

  const spin = spinner(`Buscando intenções de localhost:${port}...`);
  try {
    const { status, data } = await apiRequest(port, 'GET', '/intents', undefined, token);
    if (status !== 200) {
      spin.stop(false);
      error(`Servidor retornou ${status}.`);
      store.close(); footer(''); return;
    }
    spin.stop(true);

    const remoteIntents = data as Array<{ module: string; sub: string; statement: string }>;
    let created = 0, updated = 0;
    for (const ri of remoteIntents) {
      const existing = store.getIntent(ri.module, ri.sub);
      if (!existing) {
        store.upsertIntent(ri.module, ri.sub, ri.statement);
        created++;
      } else if (existing.statement !== ri.statement) {
        store.upsertIntent(ri.module, ri.sub, ri.statement);
        updated++;
      }
    }
    console.log('');
    row('recebidas', `${remoteIntents.length}`);
    if (created > 0) row('criadas',      `${GREEN}${created}${RESET}`);
    if (updated > 0) row('atualizadas',  `${CYAN}${updated}${RESET}`);
    if (created === 0 && updated === 0) row('resultado', 'já sincronizado');
  } catch (e: any) {
    spin.stop(false);
    error(`Falha ao conectar ao servidor: ${e.message}`);
    info('Verifique se o servidor está rodando: "idd server status"');
  }

  store.close();
  footer('');
}

// ── Router ────────────────────────────────────────────────────────

export async function cmdServer(args: string[]): Promise<void> {
  switch (args[0]) {
    case 'start':  return serverStart(args.slice(1));
    case 'stop':   return serverStop();
    case 'status': return serverStatus();
    default:
      header('server — subcomandos');
      console.log('');
      console.log(`  ${CYAN}idd server start [--port=4999] [--daemon]${RESET}`);
      console.log('    Inicia o IDD Server localmente.');
      console.log(`  ${CYAN}idd server stop${RESET}`);
      console.log('    Para o servidor em execução.');
      console.log(`  ${CYAN}idd server status${RESET}`);
      console.log('    Exibe status, porta, PID e contagem de intenções.\n');
      console.log(`  ${CYAN}idd push [--server=host:porta]${RESET}`);
      console.log('    Envia todas as intenções locais para o servidor.');
      console.log(`  ${CYAN}idd pull [--server=host:porta]${RESET}`);
      console.log('    Puxa intenções do servidor e atualiza o store local.');
      footer('');
  }
}

export async function cmdPush(args: string[]): Promise<void> { return push(args); }
export async function cmdPull(args: string[]): Promise<void> { return pull(args); }
