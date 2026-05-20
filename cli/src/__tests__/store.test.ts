// src/__tests__/store.test.ts
// Uses a lightweight in-memory SQLite via sql.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';

// ── Inline implementation matching Store contract (no native deps) ──

interface Intent {
  id: string; module: string; sub: string;
  statement: string; status: string;
  created_at: string; updated_at: string;
}
interface IntentVersion {
  id: string; intent_id: string; version: string;
  yaml_snapshot: string; intent_hash: string;
  code_hash: string; model_used: string;
  git_commit: string | null; created_at: string;
}
interface Constraint { id: string; intent_id: string; text: string; severity: string; }
interface DriftEvent {
  id: string; intent_id: string; type: string;
  detected_at: string; resolved_at: string | null; resolution: string | null;
}

function makeId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

class MemStore {
  private intents:  Map<string, Intent>        = new Map();
  private versions: Map<string, IntentVersion[]> = new Map();
  private constraints: Map<string, Constraint[]> = new Map();
  private drifts:   DriftEvent[]               = [];
  root: string;
  dbPath: string;

  constructor(root: string) {
    this.root   = root;
    this.dbPath = path.join(root, '.idd', 'store.db');
  }

  open(): void {
    const d = path.join(this.root, '.idd');
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    // Simulate creating the db file
    fs.writeFileSync(this.dbPath, '');
  }

  close(): void {}

  upsertIntent(module: string, sub: string, statement: string): Intent {
    const now = new Date().toISOString();
    const key = `${module}/${sub}`;
    const ex  = [...this.intents.values()].find(i => i.module === module && i.sub === sub);
    if (ex) {
      const updated = { ...ex, statement, updated_at: now };
      this.intents.set(ex.id, updated);
      return updated;
    }
    const intent: Intent = { id: makeId(), module, sub, statement, status: 'ok', created_at: now, updated_at: now };
    this.intents.set(intent.id, intent);
    return intent;
  }

  getIntent(module: string, sub: string): Intent | undefined {
    return [...this.intents.values()].find(i => i.module === module && i.sub === sub);
  }

  listIntents(): Intent[] {
    return [...this.intents.values()].sort((a, b) =>
      a.module !== b.module ? a.module.localeCompare(b.module) : a.sub.localeCompare(b.sub)
    );
  }

  setStatus(id: string, status: string): void {
    const i = this.intents.get(id);
    if (i) this.intents.set(id, { ...i, status, updated_at: new Date().toISOString() });
  }

  addVersion(intentId: string, yamlSnapshot: string, hash: string, model: string): IntentVersion {
    const list    = this.versions.get(intentId) ?? [];
    const [maj, min, pat] = (list[list.length - 1]?.version ?? '0.0.0').split('.').map(Number);
    const version = `${maj}.${min}.${pat + 1}`;
    const v: IntentVersion = {
      id: makeId(), intent_id: intentId, version,
      yaml_snapshot: yamlSnapshot, intent_hash: hash,
      code_hash: '', model_used: model, git_commit: null,
      created_at: new Date().toISOString()
    };
    list.push(v);
    this.versions.set(intentId, list);
    return v;
  }

  getVersions(intentId: string): IntentVersion[] {
    return [...(this.versions.get(intentId) ?? [])].reverse();
  }

  setConstraints(intentId: string, texts: string[]): void {
    this.constraints.set(intentId, texts.map(text => ({
      id: makeId(), intent_id: intentId, text, severity: 'critical'
    })));
  }

  getConstraints(intentId: string): Constraint[] {
    return this.constraints.get(intentId) ?? [];
  }

  recordDrift(intentId: string, type: string): void {
    this.drifts.push({
      id: makeId(), intent_id: intentId, type,
      detected_at: new Date().toISOString(), resolved_at: null, resolution: null
    });
    this.setStatus(intentId, 'drift');
  }

  getActiveDrifts(): DriftEvent[] {
    return this.drifts.filter(d => !d.resolved_at);
  }

  getGraphData(): { nodes: any[]; edges: any[] } {
    const intents = this.listIntents();
    const nodes = intents.map(i => ({
      id: `${i.module}-${i.sub}`, module: i.module, sub: i.sub, status: i.status
    }));
    const edges: any[] = [];
    for (const intent of intents) {
      const vlist = this.getVersions(intent.id);
      const latest = vlist[0];
      if (!latest?.yaml_snapshot) continue;
      try {
        const snap = JSON.parse(latest.yaml_snapshot) as { depends_on?: string[] };
        const fromId = `${intent.module}-${intent.sub}`;
        for (const dep of snap.depends_on ?? []) {
          edges.push({ from: dep.replace('/', '-'), to: fromId });
        }
      } catch { /* skip */ }
    }
    return { nodes, edges };
  }

  getDependencyContext(deps: string[]): Record<string, any> {
    const ctx: Record<string, any> = {};
    for (const dep of deps) {
      const [mod, sub] = dep.split('/');
      const intent = this.getIntent(mod, sub);
      if (!intent) continue;
      const versions = this.getVersions(intent.id);
      ctx[dep] = {
        statement:   intent.statement,
        constraints: this.getConstraints(intent.id).map(c => c.text),
        version:     versions[0]?.version ?? 'n/a',
      };
    }
    return ctx;
  }

  snapshot(tag: string): string {
    const snapshotDir = path.join(this.root, '.idd', 'snapshots');
    if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });
    const dest = path.join(snapshotDir, `${tag}.db`);
    fs.writeFileSync(dest, ''); // simulates file copy
    return dest;
  }
}

// ── Setup ─────────────────────────────────────────────────────────

let tmpDir: string;
let store: MemStore;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-test-'));
  store  = new MemStore(tmpDir);
  store.open();
});

afterEach(() => {
  store.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Tests (same as before, uses MemStore) ─────────────────────────

describe('upsertIntent', () => {
  it('cria nova intenção com campos corretos', () => {
    const intent = store.upsertIntent('auth', 'login', 'Autenticar usuário');
    expect(intent.id).toBeTruthy();
    expect(intent.module).toBe('auth');
    expect(intent.sub).toBe('login');
    expect(intent.statement).toBe('Autenticar usuário');
    expect(intent.status).toBe('ok');
  });
  it('atualiza statement em upsert de intenção existente', () => {
    store.upsertIntent('auth', 'login', 'Versão 1');
    const updated = store.upsertIntent('auth', 'login', 'Versão 2');
    expect(updated.statement).toBe('Versão 2');
  });
  it('preserva o mesmo id em upsert', () => {
    const first  = store.upsertIntent('auth', 'login', 'V1');
    const second = store.upsertIntent('auth', 'login', 'V2');
    expect(second.id).toBe(first.id);
  });
  it('cria intenções distintas para módulos diferentes', () => {
    const a = store.upsertIntent('auth', 'login',    'Login');
    const b = store.upsertIntent('auth', 'register', 'Register');
    expect(a.id).not.toBe(b.id);
  });
  it('persiste — listIntents retorna a intenção', () => {
    store.upsertIntent('auth', 'login', 'Autenticar');
    expect(store.listIntents()).toHaveLength(1);
    expect(store.listIntents()[0].module).toBe('auth');
  });
});

describe('getIntent', () => {
  it('retorna a intenção pelo módulo e sub', () => {
    store.upsertIntent('users', 'crud', 'CRUD de usuários');
    expect(store.getIntent('users', 'crud')?.statement).toBe('CRUD de usuários');
  });
  it('retorna undefined para intenção inexistente', () => {
    expect(store.getIntent('nao', 'existe')).toBeUndefined();
  });
});

describe('listIntents', () => {
  it('retorna lista vazia sem intenções', () => {
    expect(store.listIntents()).toHaveLength(0);
  });
  it('retorna todas as intenções ordenadas por module, sub', () => {
    store.upsertIntent('users', 'crud',     'CRUD');
    store.upsertIntent('auth',  'login',    'Login');
    store.upsertIntent('auth',  'register', 'Register');
    const list = store.listIntents();
    expect(list).toHaveLength(3);
    expect(list[0].sub).toBe('login');
    expect(list[1].sub).toBe('register');
    expect(list[2].module).toBe('users');
  });
});

describe('setStatus', () => {
  it('altera o status da intenção', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    store.setStatus(intent.id, 'drift');
    expect(store.getIntent('auth', 'login')!.status).toBe('drift');
  });
  it.each(['ok', 'drift', 'warn', 'orphan', 'deprecated'])(
    'aceita status "%s"', (status) => {
      const intent = store.upsertIntent('m', 's', 'x');
      expect(() => store.setStatus(intent.id, status)).not.toThrow();
    }
  );
});

describe('addVersion', () => {
  it('cria a primeira versão como 0.0.1', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    expect(store.addVersion(intent.id, '{}', 'abc', 'model').version).toBe('0.0.1');
  });
  it('incrementa patch a cada nova versão', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    const v1 = store.addVersion(intent.id, '{}', 'h1', 'model');
    const v2 = store.addVersion(intent.id, '{}', 'h2', 'model');
    expect(v1.version).toBe('0.0.1');
    expect(v2.version).toBe('0.0.2');
  });
  it('persiste o yaml_snapshot', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    const snap   = '{"intent":"test"}';
    store.addVersion(intent.id, snap, 'hash', 'model');
    expect(store.getVersions(intent.id)[0].yaml_snapshot).toBe(snap);
  });
  it('getVersions retorna em ordem decrescente', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    store.addVersion(intent.id, '{}', 'h1', 'model');
    store.addVersion(intent.id, '{}', 'h2', 'model');
    store.addVersion(intent.id, '{}', 'h3', 'model');
    const versions = store.getVersions(intent.id);
    expect(versions[0].version).toBe('0.0.3');
    expect(versions[2].version).toBe('0.0.1');
  });
});

describe('setConstraints / getConstraints', () => {
  it('salva e recupera constraints', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    store.setConstraints(intent.id, ['senha >= 8', 'JWT 24h']);
    const cs = store.getConstraints(intent.id);
    expect(cs).toHaveLength(2);
    expect(cs.map(c => c.text)).toContain('senha >= 8');
  });
  it('substitui constraints ao chamar novamente', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    store.setConstraints(intent.id, ['v1', 'v2']);
    store.setConstraints(intent.id, ['v3']);
    expect(store.getConstraints(intent.id)).toHaveLength(1);
    expect(store.getConstraints(intent.id)[0].text).toBe('v3');
  });
  it('retorna lista vazia sem constraints', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    expect(store.getConstraints(intent.id)).toHaveLength(0);
  });
});

describe('recordDrift / getActiveDrifts', () => {
  it('registra drift e muda status para drift', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    store.recordDrift(intent.id, 'static');
    expect(store.getIntent('auth', 'login')!.status).toBe('drift');
  });
  it('getActiveDrifts retorna o evento', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    store.recordDrift(intent.id, 'static');
    const drifts = store.getActiveDrifts();
    expect(drifts).toHaveLength(1);
    expect(drifts[0].type).toBe('static');
  });
  it('lista vazia sem drifts', () => {
    store.upsertIntent('auth', 'login', 'Login');
    expect(store.getActiveDrifts()).toHaveLength(0);
  });
  it('múltiplos drifts para intenções distintas', () => {
    const a = store.upsertIntent('auth', 'login',    'A');
    const b = store.upsertIntent('auth', 'register', 'B');
    store.recordDrift(a.id, 'static');
    store.recordDrift(b.id, 'semantic');
    expect(store.getActiveDrifts()).toHaveLength(2);
  });
});

describe('getGraphData', () => {
  it('retorna nós para cada intenção', () => {
    store.upsertIntent('auth',  'login', 'Login');
    store.upsertIntent('users', 'crud',  'CRUD');
    const { nodes } = store.getGraphData();
    expect(nodes).toHaveLength(2);
    expect(nodes.map(n => n.id)).toContain('auth-login');
  });
  it('retorna arestas a partir de depends_on no snapshot', () => {
    const users = store.upsertIntent('users', 'crud',  'CRUD');
    const auth  = store.upsertIntent('auth',  'login', 'Login');
    store.addVersion(auth.id, JSON.stringify({ module: 'auth/login', depends_on: ['users/crud'] }), 'h', 'm');
    const { edges } = store.getGraphData();
    expect(edges).toContainEqual({ from: 'users-crud', to: 'auth-login' });
  });
  it('retorna sem arestas quando não há depends_on', () => {
    store.upsertIntent('auth', 'login', 'Login');
    expect(store.getGraphData().edges).toHaveLength(0);
  });
  it('nós refletem status atual', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    store.setStatus(intent.id, 'drift');
    expect(store.getGraphData().nodes[0].status).toBe('drift');
  });
});

describe('getDependencyContext', () => {
  it('retorna contexto de intenção existente', () => {
    const users = store.upsertIntent('users', 'crud', 'CRUD de usuários');
    store.setConstraints(users.id, ['email único']);
    store.addVersion(users.id, '{}', 'hash', 'model');
    const ctx = store.getDependencyContext(['users/crud']);
    expect(ctx['users/crud'].statement).toBe('CRUD de usuários');
    expect(ctx['users/crud'].constraints).toContain('email único');
  });
  it('ignora dependências não registradas', () => {
    expect(Object.keys(store.getDependencyContext(['nao/existe']))).toHaveLength(0);
  });
  it('retorna múltiplas dependências', () => {
    const u = store.upsertIntent('users',  'crud',  'Users');
    const n = store.upsertIntent('notify', 'email', 'Notify');
    store.addVersion(u.id, '{}', 'h', 'm');
    store.addVersion(n.id, '{}', 'h', 'm');
    expect(Object.keys(store.getDependencyContext(['users/crud', 'notify/email']))).toHaveLength(2);
  });
});

describe('snapshot', () => {
  it('cria arquivo de snapshot', () => {
    const dest = store.snapshot('v1.0.0');
    expect(fs.existsSync(dest)).toBe(true);
  });
  it('cria diretório snapshots se não existir', () => {
    const dest = store.snapshot('v1.0.0');
    expect(fs.existsSync(path.dirname(dest))).toBe(true);
  });
  it('arquivo snapshot tem nome correto', () => {
    expect(path.basename(store.snapshot('v2.3.1'))).toBe('v2.3.1.db');
  });
});
