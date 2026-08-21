// src/commands/registry.ts — Issue #27: IDD Registry
// Estende o IDD Server para funcionar como repositório de templates e domain models.
import * as fs   from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import * as yaml from 'js-yaml';
import { findProjectRoot } from '../lib/store.ts';
import { listTemplates, getTemplate, saveTemplate, type IntentTemplate } from '../lib/templates/index.ts';
import {
  header, footer, success, error, info, warn, row, table, spinner,
  BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW,
} from '../lib/ui.ts';

// ── Tipos ────────────────────────────────────────────────────────

export interface RegistryConfig {
  url:    string;
  token?: string;
}

export interface RegistryEntry {
  name:      string;
  type:      'template' | 'domain' | 'playbook';
  version:   string;
  author?:   string;
  tags:      string[];
  content:   string;   // YAML/JSON serializado
  createdAt: string;
}

// ── Registry local (baseado no IDD Server) ────────────────────────

function loadRegistryConfig(root: string): RegistryConfig | null {
  const cfgPath = path.join(root, '.idd', 'config.yaml');
  if (!fs.existsSync(cfgPath)) return null;
  try {
    const cfg = yaml.load(fs.readFileSync(cfgPath, 'utf8')) as Record<string, any>;
    if (!cfg.registry_url) return null;
    return { url: cfg.registry_url, token: cfg.registry_token };
  } catch { return null; }
}

async function registryRequest(
  cfg: RegistryConfig, method: string, pathname: string, body?: unknown
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url  = new URL(pathname, cfg.url);
    const bs   = body ? JSON.stringify(body) : undefined;
    const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.token) hdrs['Authorization'] = `Bearer ${cfg.token}`;
    if (bs) hdrs['Content-Length'] = Buffer.byteLength(bs).toString();

    const proto = url.protocol === 'https:' ? require('node:https') : http;
    const req   = proto.request({ hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, method, headers: hdrs },
      (res: any) => {
        let data = '';
        res.on('data', (c: any) => { data += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, data }); }
        });
      });
    req.on('error', reject);
    if (bs) req.write(bs);
    req.end();
  });
}

// ── Registry local (filesystem) como fallback ────────────────────

function localRegistryPath(root: string): string {
  return path.join(root, '.idd', 'registry');
}

function saveToLocalRegistry(root: string, entry: RegistryEntry): void {
  const dir = path.join(localRegistryPath(root), entry.type + 's');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${entry.name}@${entry.version}.json`),
    JSON.stringify(entry, null, 2), 'utf8'
  );
}

function listLocalRegistry(root: string, type?: string): RegistryEntry[] {
  const registryDir = localRegistryPath(root);
  const entries: RegistryEntry[] = [];
  const types = type ? [`${type}s`] : ['templates', 'domains', 'playbooks'];
  for (const t of types) {
    const dir = path.join(registryDir, t);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      try {
        entries.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
      } catch { /* skip */ }
    }
  }
  return entries;
}

// ── idd registry push ─────────────────────────────────────────────

async function registryPush(args: string[]): Promise<void> {
  const name    = args.find(a => !a.startsWith('--'));
  const type    = (args.find(a => a.startsWith('--type='))?.split('=')[1] ?? 'template') as RegistryEntry['type'];
  const root    = findProjectRoot() ?? process.cwd();

  header('registry push');

  if (!name) {
    error('Uso: idd registry push <nome> [--type=template|domain|playbook]');
    process.exit(1);
  }

  let content = '';

  if (type === 'template') {
    const tmpl = getTemplate(name, root);
    if (!tmpl) { error(`Template "${name}" não encontrado.`); process.exit(1); }
    content = JSON.stringify(tmpl, null, 2);
  } else if (type === 'domain') {
    const domainPath = path.join(root, '.idd', 'domain', 'domain.intent.yaml');
    if (!fs.existsSync(domainPath)) { error(`Domain model não encontrado: ${domainPath}`); process.exit(1); }
    content = fs.readFileSync(domainPath, 'utf8');
  } else if (type === 'playbook') {
    const pbPath = path.join(root, '.idd', 'playbook.yaml');
    if (!fs.existsSync(pbPath)) { error(`Playbook não encontrado: ${pbPath}`); process.exit(1); }
    content = fs.readFileSync(pbPath, 'utf8');
  }

  const entry: RegistryEntry = {
    name, type, version: '1.0.0',
    tags: [type, name], content,
    createdAt: new Date().toISOString(),
  };

  // Try remote registry first
  const cfg = loadRegistryConfig(root);
  if (cfg) {
    const spin = spinner(`Publicando no registry ${cfg.url}...`);
    try {
      const r = await registryRequest(cfg, 'POST', '/registry', entry);
      spin.stop(r.status < 300);
      if (r.status < 300) {
        success(`"${name}" publicado no registry remoto.`);
        footer(`"idd registry pull ${name}" → restaurar em outro projeto`);
        return;
      }
    } catch { spin.stop(false); }
  }

  // Fallback: local registry
  saveToLocalRegistry(root, entry);
  console.log('');
  success(`"${name}" publicado no registry local (.idd/registry/${type}s/)`);
  row('tipo',    type);
  row('versão',  entry.version);

  footer([
    `"idd registry pull ${name}" → instalar em outro projeto`,
    '"idd registry search"       → listar todos os artefatos',
  ].join('\n  '));
}

// ── idd registry pull ─────────────────────────────────────────────

async function registryPull(args: string[]): Promise<void> {
  const nameVer = args.find(a => !a.startsWith('--')) ?? '';
  const [name, version] = nameVer.split('@');
  const root  = findProjectRoot() ?? process.cwd();

  header('registry pull');

  if (!name) {
    error('Uso: idd registry pull <nome>[@versão]');
    process.exit(1);
  }

  // Try remote
  const cfg = loadRegistryConfig(root);
  let entry: RegistryEntry | null = null;

  if (cfg) {
    const spin = spinner(`Buscando "${name}" no registry remoto...`);
    try {
      const r = await registryRequest(cfg, 'GET', `/registry/${name}${version ? `?version=${version}` : ''}`);
      spin.stop(r.status < 300);
      if (r.status < 300) entry = r.data as RegistryEntry;
    } catch { spin.stop(false); }
  }

  // Fallback: local
  if (!entry) {
    const local = listLocalRegistry(root).filter(e => e.name === name);
    if (local.length > 0) {
      entry = version ? local.find(e => e.version === version) ?? local[0] : local[0];
    }
  }

  if (!entry) {
    error(`"${name}" não encontrado no registry.`);
    info(`Execute "idd registry search" para ver o que está disponível.`);
    process.exit(1);
  }

  // Install
  if (entry.type === 'template') {
    const tmpl = JSON.parse(entry.content) as IntentTemplate;
    saveTemplate(tmpl, root);
    success(`Template "${name}" instalado.`);
    row('tipo',   'template');
    row('versão', entry.version);
    footer(`"idd template apply ${name} <mod/sub>" → usar o template`);
  } else if (entry.type === 'domain') {
    const outPath = path.join(root, '.idd', 'domain', 'domain.intent.yaml');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, entry.content, 'utf8');
    success(`Domain model "${name}" instalado: ${outPath}`);
  } else if (entry.type === 'playbook') {
    const outPath = path.join(root, '.idd', 'playbook.yaml');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, entry.content, 'utf8');
    success(`Playbook "${name}" instalado: ${outPath}`);
    footer('"idd playbook check" → verificar intenções contra o playbook');
  }
}

// ── idd registry search ───────────────────────────────────────────

async function registrySearch(args: string[]): Promise<void> {
  const query = args.find(a => !a.startsWith('--')) ?? '';
  const type  = args.find(a => a.startsWith('--type='))?.split('=')[1];
  const root  = findProjectRoot() ?? process.cwd();

  header('registry search');

  let entries: RegistryEntry[] = [];

  // Try remote
  const cfg = loadRegistryConfig(root);
  if (cfg) {
    try {
      const r = await registryRequest(cfg, 'GET', `/registry?q=${query}${type ? `&type=${type}` : ''}`);
      if (r.status < 300) entries = r.data as RegistryEntry[];
    } catch { /* fallback to local */ }
  }

  // Merge with local
  const local = listLocalRegistry(root, type);
  for (const l of local) {
    if (!entries.find(e => e.name === l.name && e.type === l.type)) entries.push(l);
  }

  if (query) {
    entries = entries.filter(e =>
      e.name.includes(query) || e.tags.some(t => t.includes(query))
    );
  }

  if (entries.length === 0) {
    info(query ? `Nenhum resultado para "${query}".` : 'Registry vazio.');
    info('"idd registry push <nome>" → publicar um artefato');
    footer(''); return;
  }

  console.log('');
  table(
    ['nome', 'tipo', 'versão', 'criado'],
    entries.map(e => [
      `${CYAN}${e.name}${RESET}`, e.type, e.version,
      new Date(e.createdAt).toLocaleDateString('pt-BR'),
    ])
  );

  footer([
    `"idd registry pull <nome>"      → instalar artefato`,
    `"idd registry push <nome>"      → publicar artefato`,
    `"idd registry search --type=template" → filtrar por tipo`,
  ].join('\n  '));
}

export async function cmdRegistry(args: string[]): Promise<void> {
  switch (args[0]) {
    case 'push':   return registryPush(args.slice(1));
    case 'pull':   return registryPull(args.slice(1));
    case 'search': return registrySearch(args.slice(1));
    default:
      header('registry — IDD Registry');
      console.log(`\n  ${CYAN}idd registry push <nome> [--type=template|domain|playbook]${RESET}`);
      console.log(`    Publica um artefato no registry local ou remoto.`);
      console.log(`\n  ${CYAN}idd registry pull <nome>[@versão]${RESET}`);
      console.log(`    Instala um artefato do registry.`);
      console.log(`\n  ${CYAN}idd registry search [query] [--type=template]${RESET}`);
      console.log(`    Lista artefatos disponíveis.`);
      footer('');
  }
}
