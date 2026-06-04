import * as path   from 'path';
import * as fs     from 'fs';
import { v4 as uuid } from 'uuid';

// Importação dinâmica para evitar falha em ambiente sem binários nativos
let Database: any;
try { Database = require('better-sqlite3'); } catch { Database = null; }

export interface Intent {
  id:         string;
  module:     string;
  sub:        string;
  statement:  string;
  status:     'ok' | 'drift' | 'warn' | 'orphan' | 'deprecated';
  created_at: string;
  updated_at: string;
}

export interface IntentVersion {
  id:            string;
  intent_id:     string;
  version:       string;
  yaml_snapshot: string;
  intent_hash:   string;
  code_hash:     string;
  model_used:    string;
  git_commit:    string | null;
  created_at:    string;
}

export interface DriftEvent {
  id:            string;
  intent_id:     string;
  constraint_id: string | null;
  type:          'semantic' | 'static' | 'cascade';
  detected_at:   string;
  resolved_at:   string | null;
  resolution:    'fixed' | 'updated_intent' | 'ignored' | null;
}

export interface GraphNode {
  id:           string;
  module:       string;
  sub:          string;
  status:       string;
  statement:    string;
  constraints:  number;
  criteria:     number;
  versions:     number;
  depends_on:   string[];
  used_by:      string[];
  avg_score:    number;
  trend:        string;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: Array<{ from: string; to: string; drift: boolean }>;
}

type ChangeListener = () => void;

export class IntentStore {
  private db:        any = null;
  private dbPath:    string;
  private listeners: ChangeListener[] = [];

  constructor(workspaceRoot: string) {
    const iddDir = path.join(workspaceRoot, '.idd');
    if (!fs.existsSync(iddDir)) fs.mkdirSync(iddDir, { recursive: true });
    this.dbPath = path.join(iddDir, 'store.db');
  }

  async initialize(): Promise<void> {
    if (!Database) {
      console.warn('[IDD Store] better-sqlite3 não disponível — usando modo in-memory');
      return;
    }
    this.db = new Database(this.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS intents (
        id         TEXT PRIMARY KEY,
        module     TEXT NOT NULL,
        sub        TEXT NOT NULL,
        statement  TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'ok',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS intent_versions (
        id            TEXT PRIMARY KEY,
        intent_id     TEXT REFERENCES intents(id),
        version       TEXT NOT NULL,
        yaml_snapshot TEXT NOT NULL,
        intent_hash   TEXT NOT NULL,
        code_hash     TEXT NOT NULL DEFAULT '',
        model_used    TEXT NOT NULL DEFAULT '',
        git_commit    TEXT,
        created_at    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS constraints (
        id        TEXT PRIMARY KEY,
        intent_id TEXT REFERENCES intents(id),
        text      TEXT NOT NULL,
        severity  TEXT NOT NULL DEFAULT 'critical',
        active    INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS drift_events (
        id            TEXT PRIMARY KEY,
        intent_id     TEXT REFERENCES intents(id),
        constraint_id TEXT,
        type          TEXT NOT NULL,
        detected_at   TEXT NOT NULL,
        resolved_at   TEXT,
        resolution    TEXT
      );
      CREATE TABLE IF NOT EXISTS alignment_scores (
        id          TEXT PRIMARY KEY,
        intent_id   TEXT REFERENCES intents(id),
        score       INTEGER NOT NULL,
        source      TEXT NOT NULL DEFAULT 'static',
        recorded_at TEXT NOT NULL
      );
    `);
  }

  // ── Intenções ────────────────────────────────────────────────

  upsertIntent(module: string, sub: string, statement: string): Intent {
    const now  = new Date().toISOString();
    const existing = this.db?.prepare(
      'SELECT * FROM intents WHERE module = ? AND sub = ?'
    ).get(module, sub) as Intent | undefined;

    if (existing) {
      this.db.prepare(
        'UPDATE intents SET statement = ?, updated_at = ? WHERE id = ?'
      ).run(statement, now, existing.id);
      this.emit();
      return { ...existing, statement, updated_at: now };
    }

    const intent: Intent = {
      id: uuid(), module, sub, statement,
      status: 'ok', created_at: now, updated_at: now
    };
    this.db?.prepare(
      'INSERT INTO intents (id,module,sub,statement,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)'
    ).run(intent.id, intent.module, intent.sub, intent.statement,
          intent.status, intent.created_at, intent.updated_at);
    this.emit();
    return intent;
  }

  getIntent(module: string, sub: string): Intent | undefined {
    return this.db?.prepare(
      'SELECT * FROM intents WHERE module = ? AND sub = ?'
    ).get(module, sub) as Intent | undefined;
  }

  listIntents(): Intent[] {
    return this.db?.prepare('SELECT * FROM intents ORDER BY module, sub').all() as Intent[] ?? [];
  }

  setIntentStatus(id: string, status: Intent['status']): void {
    this.db?.prepare('UPDATE intents SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);
    this.emit();
  }

  // ── Versões ──────────────────────────────────────────────────

  addVersion(intentId: string, yamlSnapshot: string, intentHash: string,
             modelUsed: string, gitCommit?: string): IntentVersion {
    const existing = this.db?.prepare(
      "SELECT version FROM intent_versions WHERE intent_id = ? ORDER BY created_at DESC LIMIT 1"
    ).get(intentId) as { version: string } | undefined;

    const [maj, min, pat] = (existing?.version ?? '0.0.0').split('.').map(Number);
    const version = `${maj}.${min}.${pat + 1}`;

    const v: IntentVersion = {
      id: uuid(), intent_id: intentId, version,
      yaml_snapshot: yamlSnapshot, intent_hash: intentHash,
      code_hash: '', model_used: modelUsed,
      git_commit: gitCommit ?? null,
      created_at: new Date().toISOString()
    };
    this.db?.prepare(`
      INSERT INTO intent_versions
        (id,intent_id,version,yaml_snapshot,intent_hash,code_hash,model_used,git_commit,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(v.id, v.intent_id, v.version, v.yaml_snapshot, v.intent_hash,
           v.code_hash, v.model_used, v.git_commit, v.created_at);
    return v;
  }

  getVersions(intentId: string): IntentVersion[] {
    return this.db?.prepare(
      'SELECT * FROM intent_versions WHERE intent_id = ? ORDER BY created_at DESC'
    ).all(intentId) as IntentVersion[] ?? [];
  }

  // ── Constraints ──────────────────────────────────────────────

  setConstraints(intentId: string, texts: string[], severity: 'critical' | 'warn' = 'critical'): void {
    this.db?.prepare('DELETE FROM constraints WHERE intent_id = ?').run(intentId);
    for (const text of texts) {
      this.db?.prepare(
        'INSERT INTO constraints (id,intent_id,text,severity,active) VALUES (?,?,?,?,1)'
      ).run(uuid(), intentId, text, severity);
    }
  }

  getConstraints(intentId: string): Array<{ id: string; text: string; severity: string }> {
    return this.db?.prepare(
      'SELECT id, text, severity FROM constraints WHERE intent_id = ? AND active = 1'
    ).all(intentId) ?? [];
  }

  // ── Drift events ─────────────────────────────────────────────

  recordDrift(intentId: string, type: DriftEvent['type'], constraintId?: string): DriftEvent {
    const event: DriftEvent = {
      id: uuid(), intent_id: intentId, constraint_id: constraintId ?? null,
      type, detected_at: new Date().toISOString(),
      resolved_at: null, resolution: null
    };
    this.db?.prepare(`
      INSERT INTO drift_events (id,intent_id,constraint_id,type,detected_at)
      VALUES (?,?,?,?,?)
    `).run(event.id, event.intent_id, event.constraint_id, event.type, event.detected_at);
    this.setIntentStatus(intentId, 'drift');
    return event;
  }

  resolveDrift(eventId: string, resolution: DriftEvent['resolution']): void {
    this.db?.prepare(
      'UPDATE drift_events SET resolved_at = ?, resolution = ? WHERE id = ?'
    ).run(new Date().toISOString(), resolution, eventId);
  }

  getActiveDrifts(): DriftEvent[] {
    return this.db?.prepare(
      'SELECT * FROM drift_events WHERE resolved_at IS NULL ORDER BY detected_at DESC'
    ).all() as DriftEvent[] ?? [];
  }

  // ── Graph data ───────────────────────────────────────────────

  getGraphData(): GraphData {
    const intents  = this.listIntents();
    const drifts   = new Set((this.getActiveDrifts() ?? []).map((d: any) => d.intent_id));
    const nodes:   GraphNode[] = [];
    const edges:   Array<{ from: string; to: string; drift: boolean }> = [];

    for (const intent of intents) {
      const versions     = this.getVersions(intent.id);
      const constraints  = this.getConstraints(intent.id);
      let depends_on:    string[] = [];
      let criteria:      number   = 0;

      if (versions[0]?.yaml_snapshot) {
        try {
          const snap = JSON.parse(versions[0].yaml_snapshot) as {
            depends_on?: string[]; acceptance?: string[];
          };
          depends_on = snap.depends_on ?? [];
          criteria    = snap.acceptance?.length ?? 0;
        } catch { /* skip */ }
      }

      // Alignment stats
      let avg_score = 100;
      let trend     = 'stable';
      if (this.db) {
        const scores = this.db.prepare(
          'SELECT score FROM alignment_scores WHERE intent_id=? ORDER BY recorded_at DESC LIMIT 5'
        ).all(intent.id) as Array<{ score: number }>;
        if (scores.length > 0) {
          avg_score = Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length);
          trend     = scores.length >= 2
            ? scores[0].score > scores[scores.length - 1].score ? 'up'
            : scores[0].score < scores[scores.length - 1].score ? 'down' : 'stable'
            : 'stable';
        }
      }

      nodes.push({
        id:          `${intent.module}-${intent.sub}`,
        module:       intent.module,
        sub:          intent.sub,
        status:       intent.status,
        statement:    intent.statement,
        constraints:  constraints.length,
        criteria,
        versions:     versions.length,
        depends_on,
        used_by:      [],
        avg_score,
        trend,
      });

      // Build edges
      const fromKey = `${intent.module}-${intent.sub}`;
      for (const dep of depends_on) {
        const toKey = dep.replace('/', '-');
        edges.push({ from: toKey, to: fromKey, drift: drifts.has(intent.id) });
      }
    }

    // Fill used_by
    for (const node of nodes) {
      for (const dep of node.depends_on) {
        const depKey  = dep.replace('/', '-');
        const depNode = nodes.find(n => n.id === depKey);
        if (depNode) depNode.used_by.push(`${node.module}/${node.sub}`);
      }
    }

    return { nodes, edges };
  }

  // ── Contexto para o LLM ──────────────────────────────────────

  getDependencyContext(dependsOn: string[]): Record<string, any> {
    const ctx: Record<string, any> = {};
    for (const dep of dependsOn) {
      const [mod, sub] = dep.split('/');
      const intent = this.getIntent(mod, sub);
      if (!intent) continue;
      const versions = this.getVersions(intent.id);
      const latest   = versions[0];
      ctx[dep] = {
        statement:   intent.statement,
        constraints: this.getConstraints(intent.id).map(c => c.text),
        version:     latest?.version,
        snapshot:    latest ? JSON.parse(latest.yaml_snapshot) : null
      };
    }
    return ctx;
  }

  // ── Eventos de mudança ───────────────────────────────────────

  onDidChange(listener: ChangeListener): void {
    this.listeners.push(listener);
  }

  private emit(): void {
    this.listeners.forEach(l => l());
  }
}
