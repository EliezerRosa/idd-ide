// src/lib/store.ts — acesso ao Intent Store a partir do CLI
import * as path from 'node:path';
import * as fs   from 'node:fs';
import { createHash } from 'node:crypto';

let Database: any;
try { const m = require('better-sqlite3'); Database = m.default ?? m; } catch { Database = null; }

// Injectable for testing
export function __setDatabaseConstructor(ctor: any): void { Database = ctor; }

export interface Intent {
  id: string; module: string; sub: string;
  statement: string; status: string;
  created_at: string; updated_at: string;
}
export interface IntentVersion {
  id: string; intent_id: string; version: string;
  yaml_snapshot: string; intent_hash: string;
  code_hash: string; model_used: string;
  git_commit: string | null; created_at: string;
}
export interface DriftEvent {
  id: string; intent_id: string; type: string;
  detected_at: string; resolved_at: string | null;
  resolution: string | null;
}

export function findProjectRoot(startDir = process.cwd()): string | null {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, '.idd'))) return dir;
    if (fs.existsSync(path.join(dir, '.git')))  return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export class Store {
  private db: any;
  readonly root: string;
  readonly dbPath: string;

  constructor(root: string) {
    this.root   = root;
    this.dbPath = path.join(root, '.idd', 'store.db');
  }

  open(): void {
    if (!Database) throw new Error('better-sqlite3 não está disponível. Instale as dependências nativas.');
    const iddDir = path.join(this.root, '.idd');
    if (!fs.existsSync(iddDir)) fs.mkdirSync(iddDir, { recursive: true });
    this.db = new Database(this.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS intents (
        id TEXT PRIMARY KEY, module TEXT NOT NULL, sub TEXT NOT NULL,
        statement TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ok',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS intent_versions (
        id TEXT PRIMARY KEY, intent_id TEXT, version TEXT NOT NULL,
        yaml_snapshot TEXT NOT NULL, intent_hash TEXT NOT NULL,
        code_hash TEXT NOT NULL DEFAULT '', model_used TEXT NOT NULL DEFAULT '',
        git_commit TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS constraints (
        id TEXT PRIMARY KEY, intent_id TEXT, text TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'critical', active INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS drift_events (
        id TEXT PRIMARY KEY, intent_id TEXT, constraint_id TEXT,
        type TEXT NOT NULL, detected_at TEXT NOT NULL,
        resolved_at TEXT, resolution TEXT
      );
    `);
  }

  close(): void { this.db?.close(); }

  listIntents(): Intent[] {
    return this.db.prepare('SELECT * FROM intents ORDER BY module, sub').all() as Intent[];
  }

  getIntent(module: string, sub: string): Intent | undefined {
    return this.db.prepare('SELECT * FROM intents WHERE module=? AND sub=?').get(module, sub) as Intent | undefined;
  }

  upsertIntent(module: string, sub: string, statement: string): Intent {
    const now = new Date().toISOString();
    const existing = this.getIntent(module, sub);
    if (existing) {
      this.db.prepare('UPDATE intents SET statement=?, updated_at=? WHERE id=?').run(statement, now, existing.id);
      return { ...existing, statement, updated_at: now };
    }
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const intent: Intent = { id, module, sub, statement, status: 'ok', created_at: now, updated_at: now };
    this.db.prepare('INSERT INTO intents VALUES (?,?,?,?,?,?,?)').run(
      intent.id, intent.module, intent.sub, intent.statement,
      intent.status, intent.created_at, intent.updated_at
    );
    return intent;
  }

  setStatus(id: string, status: string): void {
    this.db.prepare('UPDATE intents SET status=?, updated_at=? WHERE id=?')
      .run(status, new Date().toISOString(), id);
  }

  getVersions(intentId: string): IntentVersion[] {
    return this.db.prepare(
      'SELECT * FROM intent_versions WHERE intent_id=? ORDER BY created_at DESC'
    ).all(intentId) as IntentVersion[];
  }

  addVersion(intentId: string, yamlSnapshot: string, hash: string, model: string): IntentVersion {
    const latest = this.getVersions(intentId)[0];
    const [maj, min, pat] = (latest?.version ?? '0.0.0').split('.').map(Number);
    const version = `${maj}.${min}.${pat + 1}`;
    const now = new Date().toISOString();
    const id = createHash('sha256').update(intentId + now).digest('hex').slice(0, 16);
    this.db.prepare(
      'INSERT INTO intent_versions (id,intent_id,version,yaml_snapshot,intent_hash,model_used,created_at) VALUES (?,?,?,?,?,?,?)'
    ).run(id, intentId, version, yamlSnapshot, hash, model, now);
    return { id, intent_id: intentId, version, yaml_snapshot: yamlSnapshot,
             intent_hash: hash, code_hash: '', model_used: model, git_commit: null, created_at: now };
  }

  setConstraints(intentId: string, texts: string[]): void {
    this.db.prepare('DELETE FROM constraints WHERE intent_id=?').run(intentId);
    for (const text of texts) {
      const id = createHash('sha256').update(intentId + text).digest('hex').slice(0, 16);
      this.db.prepare('INSERT INTO constraints (id,intent_id,text) VALUES (?,?,?)').run(id, intentId, text);
    }
  }

  getConstraints(intentId: string): Array<{ id: string; text: string; severity: string }> {
    return this.db.prepare('SELECT id, text, severity FROM constraints WHERE intent_id=? AND active=1').all(intentId);
  }

  recordDrift(intentId: string, type: string): void {
    const id = createHash('sha256').update(intentId + Date.now()).digest('hex').slice(0, 16);
    this.db.prepare('INSERT INTO drift_events (id,intent_id,type,detected_at) VALUES (?,?,?,?)').run(
      id, intentId, type, new Date().toISOString()
    );
    this.setStatus(intentId, 'drift');
  }

  getActiveDrifts(): DriftEvent[] {
    return this.db.prepare('SELECT * FROM drift_events WHERE resolved_at IS NULL').all() as DriftEvent[];
  }

  getGraphData(): { nodes: any[]; edges: any[] } {
    const intents = this.listIntents();
    const nodes = intents.map(i => ({ id: `${i.module}-${i.sub}`, module: i.module, sub: i.sub, status: i.status }));
    const edges: any[] = [];
    for (const intent of intents) {
      const v = this.getVersions(intent.id)[0];
      if (!v) continue;
      try {
        const snap = JSON.parse(v.yaml_snapshot) as { depends_on?: string[] };
        const fromId = `${intent.module}-${intent.sub}`;
        for (const dep of snap.depends_on ?? []) {
          edges.push({ from: dep.replace('/', '-'), to: fromId });
        }
      } catch { /* skip */ }
    }
    return { nodes, edges };
  }

  snapshot(tag: string): string {
    const snapshotDir = path.join(this.root, '.idd', 'snapshots');
    if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });
    const dest = path.join(snapshotDir, `${tag}.db`);
    // Support mock DB that has _copyTo method
    if (typeof (this.db as any)?._copyTo === 'function') {
      (this.db as any)._copyTo(dest);
    } else if (fs.existsSync(this.dbPath)) {
      fs.copyFileSync(this.dbPath, dest);
    } else {
      fs.writeFileSync(dest, JSON.stringify({ snapshot: tag, created_at: new Date().toISOString() }));
    }
    return dest;
  }

  getDependencyContext(dependsOn: string[]): Record<string, any> {
    const ctx: Record<string, any> = {};
    for (const dep of dependsOn) {
      const [mod, sub] = dep.split('/');
      const intent = this.getIntent(mod, sub);
      if (!intent) continue;
      const versions    = this.getVersions(intent.id);
      const constraints = this.getConstraints(intent.id);
      ctx[dep] = {
        statement:   intent.statement,
        constraints: (constraints as any[]).map(c => c.text),
        version:     versions[0]?.version ?? 'n/a',
      };
    }
    return ctx;
  }
}
