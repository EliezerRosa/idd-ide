// src/lib/server.ts — Issue #13: IDD Server
// Servidor HTTP mínimo que expõe o Intent Store para sincronização entre devs.
// Sem dependências externas além do Node.js built-in.

import * as http  from 'node:http';
import * as url   from 'node:url';
import { Store }  from './store.ts';

export interface ServerConfig {
  port:    number;
  token?:  string;   // Bearer token simples para autenticação
  store:   Store;
}

type Handler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>,
  body: unknown
) => void;

interface Route { method: string; pattern: RegExp; keys: string[]; handler: Handler }

// ── Router ────────────────────────────────────────────────────────

export class IddServer {
  private server: http.Server;
  private routes: Route[] = [];
  private cfg:    ServerConfig;

  constructor(cfg: ServerConfig) {
    this.cfg    = cfg;
    this.server = http.createServer((req, res) => this.handle(req, res));
    this.registerRoutes();
  }

  /** Allow hot-swapping the store (used in tests) */
  setStore(store: Store): void {
    this.cfg.store = store;
    this.routes = [];
    this.registerRoutes();
  }

  private route(method: string, path: string, handler: Handler): void {
    const keys:    string[] = [];
    const pattern = new RegExp(
      '^' + path.replace(/:([a-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$'
    );
    this.routes.push({ method, pattern, keys, handler });
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Auth
    if (this.cfg.token) {
      const auth = req.headers.authorization ?? '';
      if (auth !== `Bearer ${this.cfg.token}`) {
        this.json(res, 401, { error: 'Unauthorized' }); return;
      }
    }

    // Body parsing
    const body = await this.readBody(req);

    // Route matching
    const pathname = url.parse(req.url ?? '').pathname ?? '/';
    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const m = pathname.match(route.pattern);
      if (!m) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((k, i) => { params[k] = m[i + 1]; });
      try {
        route.handler(req, res, params, body);
      } catch (e: any) {
        this.json(res, 500, { error: e.message });
      }
      return;
    }
    this.json(res, 404, { error: 'Not found' });
  }

  private readBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise(resolve => {
      const chunks: Buffer[] = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) { resolve({}); return; }
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      });
    });
  }

  json(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  // ── Rotas ──────────────────────────────────────────────────────

  private registerRoutes(): void {
    const store = this.cfg.store;

    // GET /health
    this.route('GET', '/health', (_, res) => {
      this.json(res, 200, {
        status: 'ok',
        version: '0.1.0',
        intents: store.listIntents().length,
        timestamp: new Date().toISOString(),
      });
    });

    // GET /intents — listar todas
    this.route('GET', '/intents', (_, res) => {
      this.json(res, 200, store.listIntents());
    });

    // GET /intents/:module/:sub
    this.route('GET', '/intents/:module/:sub', (_, res, p) => {
      const intent = store.getIntent(p.module, p.sub);
      if (!intent) { this.json(res, 404, { error: 'Intent not found' }); return; }
      this.json(res, 200, intent);
    });

    // POST /intents/:module/:sub — upsert
    this.route('POST', '/intents/:module/:sub', (_, res, p, body: any) => {
      if (!body?.statement) { this.json(res, 400, { error: 'statement required' }); return; }
      const intent = store.upsertIntent(p.module, p.sub, body.statement);
      if (body.constraints) store.setConstraints(intent.id, body.constraints);
      this.json(res, 200, intent);
    });

    // GET /intents/:module/:sub/versions
    this.route('GET', '/intents/:module/:sub/versions', (_, res, p) => {
      const intent = store.getIntent(p.module, p.sub);
      if (!intent) { this.json(res, 404, { error: 'Intent not found' }); return; }
      this.json(res, 200, store.getVersions(intent.id));
    });

    // POST /intents/:module/:sub/versions — push de nova versão
    this.route('POST', '/intents/:module/:sub/versions', (_, res, p, body: any) => {
      const intent = store.getIntent(p.module, p.sub);
      if (!intent) { this.json(res, 404, { error: 'Intent not found' }); return; }
      if (!body?.yaml_snapshot || !body?.intent_hash) {
        this.json(res, 400, { error: 'yaml_snapshot and intent_hash required' }); return;
      }
      const version = store.addVersion(
        intent.id, body.yaml_snapshot, body.intent_hash, body.model_used ?? 'unknown',
        { author: body.git_author, email: body.git_email, commit: body.git_commit }
      );
      this.json(res, 201, version);
    });

    // GET /intents/:module/:sub/context — Context Manager
    this.route('GET', '/intents/:module/:sub/context', (_, res, p) => {
      const intent = store.getIntent(p.module, p.sub);
      if (!intent) { this.json(res, 404, { error: 'Intent not found' }); return; }
      const versions = store.getVersions(intent.id);
      let depends_on: string[] = [];
      if (versions[0]?.yaml_snapshot) {
        try {
          const snap = JSON.parse(versions[0].yaml_snapshot) as { depends_on?: string[] };
          depends_on = snap.depends_on ?? [];
        } catch { /* skip */ }
      }
      this.json(res, 200, store.getDependencyContext(depends_on));
    });

    // GET /graph
    this.route('GET', '/graph', (_, res) => {
      this.json(res, 200, store.getGraphData());
    });

    // POST /drift — registrar evento de drift
    this.route('POST', '/drift', (_req, res, _params, body: any) => {
      const intent = store.getIntent(body?.module, body?.sub);
      if (!intent) { this.json(res, 404, { error: 'Intent not found' }); return; }
      store.recordDrift(intent.id, body?.type ?? 'static');
      this.json(res, 201, { ok: true });
    });

    // GET /drift — eventos ativos
    this.route('GET', '/drift', (_, res) => {
      this.json(res, 200, store.getActiveDrifts());
    });

    // GET /stats/:module/:sub
    this.route('GET', '/stats/:module/:sub', (_, res, p) => {
      const intent = store.getIntent(p.module, p.sub);
      if (!intent) { this.json(res, 404, { error: 'Intent not found' }); return; }
      const stats   = store.getAlignmentStats(intent.id);
      const history = store.getAlignmentHistory(intent.id, 10);
      this.json(res, 200, { ...stats, history });
    });

    // POST /sync — push completo de múltiplas intenções
    this.route('POST', '/sync', (_req, res, _params, body: any) => {
      const intents = body?.intents as Array<{ module: string; sub: string; statement: string; constraints?: string[] }>;
      if (!Array.isArray(intents)) { this.json(res, 400, { error: 'intents array required' }); return; }
      const results: Array<{ module: string; sub: string; id: string }> = [];
      for (const item of intents) {
        const intent = store.upsertIntent(item.module, item.sub, item.statement);
        if (item.constraints) store.setConstraints(intent.id, item.constraints);
        results.push({ module: item.module, sub: item.sub, id: intent.id });
      }
      this.json(res, 200, { synced: results.length, results });
    });
  }

  listen(): Promise<void> {
    return new Promise(resolve => {
      this.server.listen(this.cfg.port, () => resolve());
    });
  }

  close(): Promise<void> {
    return new Promise(resolve => this.server.close(() => resolve()));
  }

  get port(): number {
    return this.cfg.port;
  }
}
