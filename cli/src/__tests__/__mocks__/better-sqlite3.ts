// Mock sincrono de better-sqlite3 — tabelas em Map, sem SQL parser frágil
// Cada tabela é um Map<primaryKey, Row>

type Row = Record<string, any>;

// Schema das tabelas conhecidas do IDD Store
const TABLE_SCHEMAS: Record<string, string[]> = {
  intents: ['id','module','sub','statement','status','created_at','updated_at'],
  intent_versions: ['id','intent_id','version','yaml_snapshot','intent_hash','code_hash','model_used','git_commit','created_at'],
  constraints: ['id','intent_id','text','severity','active'],
  drift_events: ['id','intent_id','constraint_id','type','detected_at','resolved_at','resolution'],
};

class InMemoryDB {
  private data: Record<string, Row[]> = {};

  private getTable(name: string): Row[] {
    if (!this.data[name]) this.data[name] = [];
    return this.data[name];
  }

  exec(sql: string): void {
    // Apenas inicializa tabelas
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      const m = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (m) this.getTable(m[1]);
    }
  }

  // INSERT INTO table (col1, col2, ...) VALUES (?, ?, ...)
  insert(sql: string, params: any[]): void {
    const m = sql.match(/INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES/i);
    if (!m) return;
    const [, tableName, colsStr] = m;
    const cols = colsStr.split(',').map(c => c.trim());
    const row: Row = {};
    cols.forEach((c, i) => row[c] = params[i] ?? null);
    this.getTable(tableName).push(row);
  }

  // UPDATE table SET col1=?, col2=? WHERE id=?
  update(sql: string, params: any[]): void {
    const m = sql.match(/UPDATE (\w+) SET (.+?) WHERE (.+)/i);
    if (!m) return;
    const [, tableName, setStr, whereStr] = m;
    let p = [...params];

    const sets = setStr.split(',').map(part => {
      const [k] = part.split('=').map(x => x.trim());
      return [k, p.shift()] as [string, any];
    });

    const [wk] = whereStr.split('=').map(x => x.trim());
    const wVal = p.shift();

    this.getTable(tableName).forEach(row => {
      if (row[wk] === wVal || String(row[wk]) === String(wVal)) {
        sets.forEach(([k, v]) => row[k] = v);
      }
    });
  }

  // DELETE FROM table WHERE col=?
  delete(sql: string, params: any[]): void {
    const m = sql.match(/DELETE FROM (\w+)(?: WHERE (.+))?/i);
    if (!m) return;
    const [, tableName, whereStr] = m;
    if (!whereStr) { this.data[tableName] = []; return; }
    const [wk] = whereStr.split('=').map(x => x.trim());
    const wVal = params[0];
    this.data[tableName] = (this.data[tableName] ?? []).filter(
      row => row[wk] !== wVal && String(row[wk]) !== String(wVal)
    );
  }

  // SELECT * FROM table [WHERE ...] [ORDER BY ...] [LIMIT n]
  select(sql: string, params: any[]): Row[] {
    const tableMatch = sql.match(/FROM (\w+)/i);
    if (!tableMatch) return [];
    const tableName = tableMatch[1];
    let rows = [...this.getTable(tableName)];

    const whereMatch = sql.match(/WHERE (.+?)(?:\s+ORDER BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      const conditions = whereMatch[1].split(/ AND /i);
      let p = [...params];
      for (const cond of conditions) {
        if (/ IS NULL$/i.test(cond)) {
          const k = cond.replace(/ IS NULL$/i, '').trim();
          rows = rows.filter(r => r[k] == null);
        } else if (/ IS NOT NULL$/i.test(cond)) {
          const k = cond.replace(/ IS NOT NULL$/i, '').trim();
          rows = rows.filter(r => r[k] != null);
        } else {
          const [k] = cond.split(/[=<>]/).map(x => x.trim());
          const val = p.shift();
          rows = rows.filter(r => r[k] === val || String(r[k]) === String(val));
        }
      }
    }

    const orderMatch = sql.match(/ORDER BY (.+?)(?:\s+LIMIT|$)/i);
    if (orderMatch) {
      const parts = orderMatch[1].split(',').map(p => p.trim());
      // Preserve original indices for stable sort (tiebreaker = insertion order)
      const indexed = rows.map((r, i) => ({ r, i }));
      indexed.sort((a, b) => {
        for (const part of parts) {
          const [col, dir] = part.split(' ');
          const av = a.r[col], bv = b.r[col];
          const cmp = String(av ?? '') < String(bv ?? '') ? -1 :
                      String(av ?? '') > String(bv ?? '') ? 1 : 0;
          if (cmp !== 0) return dir?.toUpperCase() === 'DESC' ? -cmp : cmp;
        }
        // Tiebreaker: DESC = last inserted first; ASC = first inserted first
        const hasDesc = parts.some(p => p.toUpperCase().endsWith('DESC'));
        return hasDesc ? b.i - a.i : a.i - b.i;
      });
      rows = indexed.map(x => x.r);
    }

    // LIMIT: can be literal or ? (any remaining params after WHERE are consumed)
    const limitLiteral = sql.match(/LIMIT (\d+)/i);
    const limitParam   = sql.match(/LIMIT \?/i);
    if (limitParam) {
      // Find remaining unconsumed params
      const whereParamCount = (sql.match(/\?/g) || []).length - 1; // subtract LIMIT ?
      const consumed = Math.min(whereParamCount, params.length);
      const limitVal  = params[consumed];
      if (limitVal !== undefined) rows = rows.slice(0, parseInt(String(limitVal)));
    } else if (limitLiteral) {
      rows = rows.slice(0, parseInt(limitLiteral[1]));
    }

    // HAVING MAX(created_at) GROUP BY — simplificado: retorna último por intent_id
    if (/GROUP BY intent_id HAVING MAX/i.test(sql)) {
      const grouped: Record<string, Row> = {};
      rows.forEach(r => {
        const k = r['intent_id'];
        if (!grouped[k] || r['created_at'] > grouped[k]['created_at']) {
          grouped[k] = r;
        }
      });
      return Object.values(grouped);
    }

    return rows;
  }

  copyTo(dest: string): void {
    // Para snapshot: serializa para um arquivo JSON simulado
    const fs = require('node:fs');
    const path = require('node:path');
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(this.data, null, 2));
  }
}

class Statement {
  constructor(private db: InMemoryDB, private sql: string) {}

  run(...params: any[]): void {
    const s = this.sql.trim().toUpperCase();
    if (s.startsWith('INSERT')) this.db.insert(this.sql, params);
    else if (s.startsWith('UPDATE')) this.db.update(this.sql, params);
    else if (s.startsWith('DELETE')) this.db.delete(this.sql, params);
    else this.db.exec(this.sql);
  }

  get(...params: any[]): Row | undefined {
    return this.db.select(this.sql, params)[0];
  }

  all(...params: any[]): Row[] {
    return this.db.select(this.sql, params);
  }
}

class MockDatabase {
  private db: InMemoryDB;
  private _path: string;

  constructor(path: string) {
    this._path = path;
    this.db = new InMemoryDB();
  }

  exec(sql: string): void { this.db.exec(sql); }
  prepare(sql: string): Statement { return new Statement(this.db, sql); }

  close(): void {
    // No-op for in-memory
  }

  // Usado pelo snapshot()
  _getDbPath(): string { return this._path; }
  _copyTo(dest: string): void { this.db.copyTo(dest); }
}


// ── Singleton per path (simula arquivo físico) ──────────────────
const DB_INSTANCES = new Map<string, InMemoryDB>();

function getOrCreate(dbPath: string): InMemoryDB {
  if (!DB_INSTANCES.has(dbPath)) DB_INSTANCES.set(dbPath, new InMemoryDB());
  return DB_INSTANCES.get(dbPath)!;
}

export function resetMockDb(dbPath?: string): void {
  if (dbPath) DB_INSTANCES.delete(dbPath);
  else DB_INSTANCES.clear();
}

class SingletonMockDatabase {
  private db: InMemoryDB;
  private _path: string;

  constructor(dbPath: string) {
    this._path = dbPath;
    this.db    = getOrCreate(dbPath);
  }

  exec(sql: string): void                    { this.db.exec(sql); }
  prepare(sql: string): Statement            { return new Statement(this.db, sql); }
  close(): void                              { /* keep data alive for other handles */ }
  _getDbPath(): string                       { return this._path; }
  _copyTo(dest: string): void               { this.db.copyTo(dest); }
}

export default SingletonMockDatabase as unknown as typeof MockDatabase;

// Register alignment_scores table schema
TABLE_SCHEMAS['alignment_scores'] = ['id','intent_id','score','source','recorded_at'];
