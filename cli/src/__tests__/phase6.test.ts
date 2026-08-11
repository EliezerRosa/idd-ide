// src/__tests__/phase6.test.ts — Issues #21-#24: Inteligência e Observabilidade
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import MockDatabase, { resetMockDb } from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';
import { parseMermaid, parseYamlDomain } from '../lib/domain/parser.ts';
import { diffDomainModels } from '../lib/domain/evolver.ts';
import { analyzeGraph } from '../commands/suggest.ts';

__setDatabaseConstructor(MockDatabase);

// ── Setup ─────────────────────────────────────────────────────────

let tmpDir: string;
let store:  Store;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-p6-'));
  const dbPath = path.join(tmpDir, '.idd', 'store.db');
  resetMockDb(dbPath);
  store = new Store(tmpDir);
  store.open();
});

afterEach(() => {
  try { store.close(); } catch {}
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ════════════════════════════════════════════════════════════════
// Issue #21 — idd drift watch (lógica interna)
// ════════════════════════════════════════════════════════════════

describe('idd drift watch — lógica interna', () => {
  it('shouldWatch: padrão .ts reconhecido', () => {
    function shouldWatch(filePath: string, patterns: string[]): boolean {
      const rel = filePath.replace(/\\/g, '/');
      return patterns.some(pat => {
        const regex = new RegExp('^' + pat
          .replace(/\./g, '\\.').replace(/\*\*/g, '(.+)').replace(/\*/g, '([^/]+)') + '$');
        return regex.test(rel);
      });
    }
    const pats = ['src/**/*.ts', 'src/**/*.intent.yaml'];
    expect(shouldWatch('src/auth/login.ts', pats)).toBe(true);
    expect(shouldWatch('src/auth/login.intent.yaml', pats)).toBe(true);
    expect(shouldWatch('node_modules/foo/bar.ts', pats)).toBe(false);
  });

  it('fileToModule: extrai módulo de arquivo TypeScript', () => {
    function fileToModule(root: string, filePath: string): string | null {
      const rel   = path.relative(root, filePath).replace(/\\/g, '/');
      const parts = rel.split('/');
      const srcIdx = parts.indexOf('src');
      const base  = srcIdx >= 0 ? parts.slice(srcIdx + 1) : parts;
      if (base.length < 2) return null;
      const [mod, subRaw] = base;
      const sub = subRaw.replace(/\.intent\.yaml$/, '').replace(/\.(test|spec)\.[a-z]+$/, '').replace(/\.[a-z]+$/, '');
      return mod && sub ? `${mod}/${sub}` : null;
    }
    expect(fileToModule('/root', '/root/src/auth/login.ts')).toBe('auth/login');
    expect(fileToModule('/root', '/root/src/auth/login.test.ts')).toBe('auth/login');
    expect(fileToModule('/root', '/root/src/auth/login.intent.yaml')).toBe('auth/login');
    expect(fileToModule('/root', '/root/package.json')).toBeNull();
  });

  it('debounce de 300ms evita análise duplicada', async () => {
    let callCount = 0;
    const debounce = new Map<string, ReturnType<typeof setTimeout>>();
    const analyze  = (file: string) => {
      clearTimeout(debounce.get(file));
      debounce.set(file, setTimeout(() => { callCount++; }, 300));
    };
    // 3 mudanças rápidas no mesmo arquivo
    analyze('src/auth/login.ts');
    analyze('src/auth/login.ts');
    analyze('src/auth/login.ts');
    await new Promise(r => setTimeout(r, 400));
    expect(callCount).toBe(1); // debounce garante apenas 1 chamada
    debounce.forEach(t => clearTimeout(t));
  });

  it('scan inicial encontra todos os arquivos src/**/*.ts', () => {
    const srcDir = path.join(tmpDir, 'src', 'auth');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'login.ts'), 'export function login() {}');
    fs.writeFileSync(path.join(srcDir, 'utils.ts'), 'export const helper = 1;');

    const PATS = ['src/**/*.ts'];
    function collectFiles(root: string): string[] {
      const result: string[] = [];
      function walk(dir: string): void {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.isFile()) {
            const rel = path.relative(root, full).replace(/\\/g, '/');
            const ok = PATS.some(p => {
              const re = new RegExp('^' + p.replace(/\./g,'\\.').replace(/\*\*/g,'(.+)').replace(/\*/g,'([^/]+)') + '$');
              return re.test(rel);
            });
            if (ok) result.push(full);
          }
        }
      }
      walk(path.join(root, 'src'));
      return result;
    }
    const files = collectFiles(tmpDir);
    expect(files).toHaveLength(2);
    expect(files.some(f => f.includes('login.ts'))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #22 — idd analytics (sparklines e métricas)
// ════════════════════════════════════════════════════════════════

describe('idd analytics — sparklines e métricas', () => {
  const BLOCKS = ' ▁▂▃▄▅▆▇█';

  function sparkline(values: number[], width = 10): string {
    if (values.length === 0) return '—'.repeat(width);
    const max   = Math.max(...values);
    const min   = Math.min(...values);
    const range = max - min || 1;
    const norm  = values.map(v => Math.round(((v - min) / range) * (BLOCKS.length - 1)));
    return norm.slice(-width).map(n => BLOCKS[n]).join('');
  }

  function trend(values: number[]): string {
    if (values.length < 2) return 'estável';
    const diff = values[values.length - 1] - values[values.length - 2];
    if (diff > 5)  return 'melhora';
    if (diff < -5) return 'piora';
    return 'estável';
  }

  it('sparkline de scores crescentes usa blocos maiores no final', () => {
    const sl = sparkline([20, 40, 60, 80, 100]);
    const chars = sl.split('');
    // Deve ser crescente (último caractere tem index maior)
    const indices = chars.map(c => BLOCKS.indexOf(c));
    expect(indices[indices.length - 1]).toBeGreaterThan(indices[0]);
  });

  it('sparkline de array vazio retorna dashes', () => {
    expect(sparkline([])).toBe('—'.repeat(10));
  });

  it('sparkline respeita o width especificado', () => {
    expect(sparkline([1,2,3,4,5,6,7,8,9,10,11,12], 8)).toHaveLength(8);
  });

  it('trend: série crescente retorna melhora', () => {
    expect(trend([70, 80, 90, 100])).toBe('melhora');
  });

  it('trend: série decrescente retorna piora', () => {
    expect(trend([100, 90, 80, 60])).toBe('piora');
  });

  it('trend: série estável retorna estável', () => {
    expect(trend([85, 86, 85, 87])).toBe('estável');
  });

  it('trend: série com 1 elemento retorna estável', () => {
    expect(trend([90])).toBe('estável');
  });

  it('avg calcula média corretamente', () => {
    const avg = (vs: number[]) => Math.round(vs.reduce((s,v)=>s+v,0)/vs.length);
    expect(avg([80, 90, 100])).toBe(90);
    expect(avg([0, 100])).toBe(50);
    expect(avg([75])).toBe(75);
  });

  it('tempo relativo: dias', () => {
    function relativeTime(isoDate: string): string {
      const s = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
      if (s < 60) return `${s}s atrás`;
      if (s < 3600) return `${Math.floor(s/60)}min atrás`;
      if (s < 86400) return `${Math.floor(s/3600)}h atrás`;
      return `${Math.floor(s/86400)}d atrás`;
    }
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(relativeTime(threeDaysAgo)).toContain('d atrás');
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #23 — idd domain evolve (diffDomainModels)
// ════════════════════════════════════════════════════════════════

const V1_MERMAID = `
classDiagram
  %% title: Shop
  class User {
    +uuid id PK
    +string email UK
    +string name
    +timestamp created_at
  }
  class Product {
    +uuid id PK
    +string name
    +decimal price
  }
`;

const V2_MERMAID = `
classDiagram
  %% title: Shop
  class User {
    +uuid id PK
    +string email UK
    +string name
    +string phone
    +boolean active
    +timestamp created_at
  }
  class Order {
    +uuid id PK
    +uuid user_id FK(User.id)
    +decimal total
  }
`;

describe('diffDomainModels — #23', () => {
  it('detecta entidade adicionada (Order)', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    expect(evo.diffs.some(d => d.type === 'added' && d.entity === 'Order')).toBe(true);
  });

  it('detecta entidade removida (Product)', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    expect(evo.diffs.some(d => d.type === 'removed' && d.entity === 'Product')).toBe(true);
  });

  it('entidade removida é classificada como breaking', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    const removed = evo.diffs.find(d => d.type === 'removed')!;
    expect(removed.severity).toBe('breaking');
  });

  it('entidade adicionada é classificada como safe', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    const added = evo.diffs.find(d => d.type === 'added')!;
    expect(added.severity).toBe('safe');
  });

  it('detecta atributo adicionado (phone, active)', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    const userDiff = evo.diffs.find(d => d.entity === 'User' && d.type === 'modified');
    expect(userDiff).toBeDefined();
    const addedAttrs = userDiff!.changes.filter(c => c.type === 'added');
    expect(addedAttrs.some(c => c.attribute === 'phone' || c.attribute === 'active')).toBe(true);
  });

  it('gera SQL com BEGIN e COMMIT', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    expect(evo.sql).toContain('BEGIN;');
    expect(evo.sql).toContain('COMMIT;');
  });

  it('gera ADD COLUMN para atributos novos', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    expect(evo.sql).toContain('ADD COLUMN');
  });

  it('gera CREATE TABLE para entidade nova', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    expect(evo.sql).toContain('CREATE TABLE IF NOT EXISTS orders');
  });

  it('gera DROP TABLE para entidade removida com aviso', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    expect(evo.sql).toContain('DROP TABLE');
    expect(evo.sql.toLowerCase()).toContain('irreversí');
  });

  it('modelos idênticos não geram diffs', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V1_MERMAID);
    const evo = diffDomainModels(v1, v2);
    expect(evo.diffs).toHaveLength(0);
    expect(evo.safeCount + evo.warnCount + evo.breakCount).toBe(0);
  });

  it('mudança de tipo gera ALTER COLUMN TYPE', () => {
    const v1  = parseMermaid(`classDiagram\nclass X {\n  +uuid id PK\n  +string email\n}`);
    const v2  = parseMermaid(`classDiagram\nclass X {\n  +uuid id PK\n  +text email\n}`);
    const evo = diffDomainModels(v1, v2);
    expect(evo.sql).toContain('ALTER TABLE');
    expect(evo.sql).toContain('TYPE');
  });

  it('mudança nullable→NOT NULL é classificada como warn', () => {
    const v1 = parseYamlDomain(`
domain: test
entities:
  - name: User
    attributes:
      - name: id
        type: uuid
        constraints: [primary_key]
      - name: bio
        type: string
        nullable: true
`);
    const v2 = parseYamlDomain(`
domain: test
entities:
  - name: User
    attributes:
      - name: id
        type: uuid
        constraints: [primary_key]
      - name: bio
        type: string
        nullable: false
`);
    const evo = diffDomainModels(v1, v2);
    const bioChange = evo.diffs.flatMap(d => d.changes).find(c => c.attribute === 'bio');
    expect(bioChange?.type).toBe('nullable_changed');
    expect(bioChange?.severity).toBe('warn');
  });

  it('ADD UNIQUE usa CREATE UNIQUE INDEX CONCURRENTLY', () => {
    const v1 = parseYamlDomain(`
domain: test
entities:
  - name: User
    attributes:
      - name: id
        type: uuid
        constraints: [primary_key]
      - name: email
        type: string
        nullable: false
        unique: false
`);
    const v2 = parseYamlDomain(`
domain: test
entities:
  - name: User
    attributes:
      - name: id
        type: uuid
        constraints: [primary_key]
      - name: email
        type: string
        nullable: false
        unique: true
`);
    const evo = diffDomainModels(v1, v2);
    expect(evo.sql).toContain('CREATE UNIQUE INDEX CONCURRENTLY');
  });

  it('requiresDowntime=true quando há breaking changes', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    // Product foi removido = breaking
    expect(evo.requiresDowntime).toBe(true);
  });

  it('contadores safe/warn/break somam o total de diffs', () => {
    const v1  = parseMermaid(V1_MERMAID);
    const v2  = parseMermaid(V2_MERMAID);
    const evo = diffDomainModels(v1, v2);
    const total = evo.safeCount + evo.warnCount + evo.breakCount;
    expect(total).toBe(evo.diffs.length);
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #24 — idd suggest (analyzeGraph)
// ════════════════════════════════════════════════════════════════

describe('analyzeGraph — #24', () => {
  it('grafo vazio retorna sem issues', () => {
    const issues = analyzeGraph(store);
    expect(issues).toHaveLength(0);
  });

  it('detecta módulo fantasma (depends_on referência inexistente)', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    store.addVersion(intent.id, JSON.stringify({
      intent: 'Login', module: 'auth/login',
      constraints: ['c'], acceptance: ['a'],
      depends_on: ['users/crud'], // não existe!
    }), 'h1', 'model');

    const issues = analyzeGraph(store);
    expect(issues.some(i => i.type === 'ghost' && i.module === 'auth/login')).toBe(true);
  });

  it('detecta módulo com mais de 8 constraints como over-specified', () => {
    const intent = store.upsertIntent('auth', 'login', 'Login');
    const constraints = Array.from({length: 9}, (_, i) => `Constraint ${i+1}`);
    store.setConstraints(intent.id, constraints);
    store.addVersion(intent.id, JSON.stringify({
      intent: 'Login', module: 'auth/login', constraints, acceptance: ['a'], depends_on: [],
    }), 'h1', 'model');

    const issues = analyzeGraph(store);
    expect(issues.some(i => i.type === 'overspecified')).toBe(true);
  });

  it('detecta dependência circular', () => {
    // A → B → A
    const a = store.upsertIntent('mod', 'a', 'A');
    const b = store.upsertIntent('mod', 'b', 'B');
    store.addVersion(a.id, JSON.stringify({ intent:'A', module:'mod/a', constraints:['c'], acceptance:['acc'], depends_on:['mod/b'] }), 'h1','m');
    store.addVersion(b.id, JSON.stringify({ intent:'B', module:'mod/b', constraints:['c'], acceptance:['acc'], depends_on:['mod/a'] }), 'h2','m');

    const issues = analyzeGraph(store);
    expect(issues.some(i => i.type === 'circular')).toBe(true);
  });

  it('circular issue é severity critical', () => {
    const a = store.upsertIntent('svc', 'a', 'A');
    const b = store.upsertIntent('svc', 'b', 'B');
    store.addVersion(a.id, JSON.stringify({ intent:'A', module:'svc/a', constraints:['c'], acceptance:['acc'], depends_on:['svc/b'] }), 'h1','m');
    store.addVersion(b.id, JSON.stringify({ intent:'B', module:'svc/b', constraints:['c'], acceptance:['acc'], depends_on:['svc/a'] }), 'h2','m');

    const issues = analyzeGraph(store);
    const circular = issues.filter(i => i.type === 'circular');
    expect(circular.every(i => i.severity === 'critical')).toBe(true);
  });

  it('issues são ordenadas: critical primeiro', () => {
    const a = store.upsertIntent('svc', 'a', 'A');
    const b = store.upsertIntent('svc', 'b', 'B');
    // circular (critical)
    store.addVersion(a.id, JSON.stringify({ intent:'A', module:'svc/a', constraints:['c'], acceptance:['acc'], depends_on:['svc/b'] }), 'h1','m');
    store.addVersion(b.id, JSON.stringify({ intent:'B', module:'svc/b', constraints:['c'], acceptance:['acc'], depends_on:['svc/a'] }), 'h2','m');
    // over-specified (warn)
    const c = store.upsertIntent('svc', 'c', 'C');
    store.setConstraints(c.id, Array.from({length:9},(_,i)=>`C${i}`));
    store.addVersion(c.id, JSON.stringify({ intent:'C', module:'svc/c', constraints:Array.from({length:9},(_,i)=>`C${i}`), acceptance:['acc'], depends_on:[] }), 'h3','m');

    const issues = analyzeGraph(store);
    if (issues.length >= 2) {
      const order = { critical:0, warn:1, info:2 };
      for (let i = 1; i < issues.length; i++) {
        expect(order[issues[i].severity]).toBeGreaterThanOrEqual(order[issues[i-1].severity]);
      }
    }
  });

  it('cada issue tem suggestion preenchida', () => {
    const a = store.upsertIntent('x', 'a', 'A');
    store.addVersion(a.id, JSON.stringify({ intent:'A', module:'x/a', constraints:['c'], acceptance:['acc'], depends_on:['y/missing'] }), 'h1','m');

    const issues = analyzeGraph(store);
    expect(issues.every(i => i.suggestion.length > 10)).toBe(true);
  });

  it('grafo sem problemas retorna lista vazia', () => {
    const a = store.upsertIntent('auth', 'login', 'Login');
    const b = store.upsertIntent('users', 'crud', 'CRUD');
    store.addVersion(a.id, JSON.stringify({ intent:'Login', module:'auth/login', constraints:['c'], acceptance:['acc'], depends_on:['users/crud'] }), 'h1','m');
    store.addVersion(b.id, JSON.stringify({ intent:'CRUD', module:'users/crud', constraints:['c'], acceptance:['acc'], depends_on:[] }), 'h2','m');

    const issues = analyzeGraph(store);
    // Sem circular, sem ghost, sem over-specified
    const problematic = issues.filter(i => ['circular','ghost','overspecified'].includes(i.type));
    expect(problematic).toHaveLength(0);
  });
});
