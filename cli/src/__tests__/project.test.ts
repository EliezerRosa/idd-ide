// src/__tests__/project.test.ts — Fase 0: project.intent.yaml + idd verify --project
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import yaml      from 'js-yaml';
import {
  parseProject, extractImports, contextForPath, checkFileImports,
  DEFAULT_PHASE_POLICIES, type ProjectIntent,
} from '@idd/core';
import { verifyProjectImports, findProjectFile } from '../commands/verify.ts';

const VALID = {
  version: '2.0',
  name: 'demo',
  lifecycle_status: { phase: 'exploratory' },
  governance: {
    roles: [{ name: 'architect', can_approve_waivers: true, can_change_phase: true }],
    waiver_policy: { requires_approval_from: ['architect'] },
  },
  global_constraints: [{ id: 'G-01', type: 'invariant', severity: 'critical', description: 'Regra global de exemplo' }],
  bounded_contexts: [
    { name: 'core', path: 'packages/core/src', package: '@demo/core', allowed_dependencies: [] },
    { name: 'cli',  path: 'cli/src', allowed_dependencies: ['core'] },
    { name: 'ui',   path: 'ui/src', allowed_dependencies: [] },
  ],
};

function project(overrides: Record<string, unknown> = {}): ProjectIntent {
  const r = parseProject({ ...VALID, ...overrides });
  if (!r.ok) throw new Error(r.issues.map(i => `${i.field}: ${i.message}`).join('\n'));
  return r.project;
}

describe('parseProject — estrutura', () => {
  it('aceita project completo', () => {
    const r = parseProject(VALID);
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it('retrocompatível: só bounded_contexts[].name/status (formato v1 da Webview)', () => {
    const r = parseProject({ bounded_contexts: [{ name: 'identity', status: 'aligned', aggregates: [{ name: 'Account' }] }] });
    expect(r.ok).toBe(true);
    expect(r.project!.boundedContexts[0].aggregates).toHaveLength(1);
    expect(r.project!.lifecycle.phase).toBe('exploratory');
  });

  it('bounded_contexts ausente é erro', () => {
    const r = parseProject({ name: 'x' });
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.field === 'bounded_contexts')).toBe(true);
  });

  it('campo desconhecido na raiz é erro', () => {
    const r = parseProject({ ...VALID, foo: 1 });
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.field === 'foo')).toBe(true);
  });

  it('allowed_dependencies referenciando contexto inexistente é erro', () => {
    const r = parseProject({ ...VALID, bounded_contexts: [{ name: 'a', allowed_dependencies: ['ghost'] }] });
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.message.includes('ghost'))).toBe(true);
  });

  it('contexto que depende de si mesmo é erro', () => {
    const r = parseProject({ ...VALID, bounded_contexts: [{ name: 'a', allowed_dependencies: ['a'] }] });
    expect(r.ok).toBe(false);
  });

  it('nomes duplicados são erro', () => {
    const r = parseProject({ ...VALID, bounded_contexts: [{ name: 'a' }, { name: 'a' }] });
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.message.includes('duplicado'))).toBe(true);
  });

  it('mesmo path em dois contextos é erro', () => {
    const r = parseProject({ ...VALID, bounded_contexts: [{ name: 'a', path: 'src/x' }, { name: 'b', path: './src/x/' }] });
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.message.includes('já pertence'))).toBe(true);
  });
});

describe('parseProject — lifecycle e governança (ratificado 2026-09-04)', () => {
  it('defaults 30/14/7 e warn/critical/critical', () => {
    const p = project();
    expect(p.lifecycle.policies.exploratory.maxWaiverDurationDays).toBe(30);
    expect(p.lifecycle.policies.consolidation.maxWaiverDurationDays).toBe(14);
    expect(p.lifecycle.policies.production.maxWaiverDurationDays).toBe(7);
    expect(p.lifecycle.policies.exploratory.anemicModelSeverity).toBe('warn');
    expect(p.lifecycle.policies.production.anemicModelSeverity).toBe('critical');
    expect(DEFAULT_PHASE_POLICIES.production.maxWaiverDurationDays).toBe(7);
  });

  it('waiver pode ser mais curto que o teto, nunca mais longo', () => {
    const ok = parseProject({ ...VALID, lifecycle_status: { phase: 'production', phase_policies: { production: { max_waiver_duration_days: 3 } } } });
    expect(ok.ok).toBe(true);
    expect(ok.project!.lifecycle.policies.production.maxWaiverDurationDays).toBe(3);
    const bad = parseProject({ ...VALID, lifecycle_status: { phase: 'production', phase_policies: { production: { max_waiver_duration_days: 30 } } } });
    expect(bad.ok).toBe(false);
    expect(bad.issues.some(i => i.message.includes('teto'))).toBe(true);
  });

  it('anemic model não pode ser relaxado fora de exploratory', () => {
    const r = parseProject({ ...VALID, lifecycle_status: { phase_policies: { consolidation: { anemic_model_severity: 'warn' } } } });
    expect(r.ok).toBe(false);
  });

  it('phase inválida é erro', () => {
    const r = parseProject({ ...VALID, lifecycle_status: { phase: 'yolo' } });
    expect(r.ok).toBe(false);
  });

  it('waiver_policy exige papel declarado com can_approve_waivers', () => {
    const undeclared = parseProject({ ...VALID, governance: { waiver_policy: { requires_approval_from: ['ceo'] } } });
    expect(undeclared.ok).toBe(false);
    const noPower = parseProject({ ...VALID, governance: { roles: [{ name: 'dev' }], waiver_policy: { requires_approval_from: ['dev'] } } });
    expect(noPower.ok).toBe(false);
  });

  it('global_constraints reutiliza o parser de constraints (string ou objeto)', () => {
    const p = project({ global_constraints: ['Regra em texto livre', { id: 'G-X', description: 'Regra estruturada' }] });
    expect(p.globalConstraints).toHaveLength(2);
    expect(p.globalConstraints[0].severity).toBe('critical');
    expect(p.globalConstraints[1].id).toBe('G-X');
  });
});

describe('extractImports', () => {
  it('captura import/export from, require e import()', () => {
    const src = [
      `import a from './a';`,
      `import { b } from "../b.js";`,
      `export * from './c';`,
      `const d = require('d');`,
      `const e = await import('./e');`,
      `// import x from './ignored';`,
      `import type { T } from '@demo/core';`,
    ].join('\n');
    const specs = extractImports(src).map(r => r.specifier);
    expect(specs).toEqual(['./a', '../b.js', './c', 'd', './e', '@demo/core']);
    expect(extractImports(src)[1].line).toBe(2);
  });
});

describe('checkFileImports — governança de contextos', () => {
  const p = project();
  const resolve = (from: string, spec: string) => path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));

  it('contextForPath usa prefixo mais longo', () => {
    expect(contextForPath(p, 'cli/src/commands/x.ts')?.name).toBe('cli');
    expect(contextForPath(p, 'docs/x.md')).toBeUndefined();
  });

  it('dependência declarada é permitida (cli → core via pacote)', () => {
    expect(checkFileImports(p, 'cli/src/a.ts', `import { x } from '@demo/core';`, resolve)).toHaveLength(0);
  });

  it('dependência declarada é permitida (cli → core via caminho relativo)', () => {
    expect(checkFileImports(p, 'cli/src/a.ts', `import { x } from '../../packages/core/src/index.js';`, resolve)).toHaveLength(0);
  });

  it('importação ilegal é bloqueada (ui → cli, relativo)', () => {
    const v = checkFileImports(p, 'ui/src/a.ts', `import { x } from '../../cli/src/lib/store.ts';`, resolve);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ fromContext: 'ui', toContext: 'cli', severity: 'critical', line: 1 });
  });

  it('importação ilegal é bloqueada (ui → core, pacote)', () => {
    const v = checkFileImports(p, 'ui/src/a.ts', `import '@demo/core/contract';`, resolve);
    expect(v).toHaveLength(1);
    expect(v[0].toContext).toBe('core');
  });

  it('core não pode importar de ninguém', () => {
    const v = checkFileImports(p, 'packages/core/src/x.ts', `import '../../../cli/src/index.ts';`, resolve);
    expect(v).toHaveLength(1);
  });

  it('imports dentro do próprio contexto e de terceiros são livres', () => {
    expect(checkFileImports(p, 'cli/src/a.ts', `import './b.ts';\nimport fs from 'node:fs';\nimport yaml from 'js-yaml';`, resolve)).toHaveLength(0);
  });
});

describe('verifyProjectImports — filesystem real', () => {
  let tmp: string;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-proj-')); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  function write(rel: string, content: string) {
    const full = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  it('resolve ./x.js para x.ts e bloqueia apenas cruzamentos ilegais', () => {
    write('project.intent.yaml', yaml.dump(VALID));
    write('packages/core/src/index.ts', `export * from './contract.js';`);
    write('packages/core/src/contract.ts', `export const x = 1;`);
    write('cli/src/a.ts', `import { x } from '../../packages/core/src/index.js';`);
    write('ui/src/b.ts', `import { x } from '../../cli/src/a.js';\nimport '@demo/core';`);
    write('ui/src/skip.md', `import '../../cli/src/a.js';`);
    write('ui/node_modules/dep/index.ts', `import '../../../cli/src/a.js';`);

    const p = project();
    const { files, violations } = verifyProjectImports(tmp, p);
    expect(files).toBe(4);
    expect(violations).toHaveLength(2);
    expect(violations.map(v => `${v.fromContext}->${v.toContext}`).sort()).toEqual(['ui->cli', 'ui->core']);
    expect(violations[0].file).toBe('ui/src/b.ts');
  });

  it('findProjectFile sobe diretórios até achar project.intent.yaml', () => {
    write('project.intent.yaml', yaml.dump(VALID));
    write('cli/src/deep/x.ts', '');
    expect(findProjectFile(path.join(tmp, 'cli/src/deep'))).toBe(path.join(tmp, 'project.intent.yaml'));
    expect(findProjectFile(os.tmpdir())).toBeNull();
  });

  it('o próprio repositório idd-ide passa em verify --project (dogfooding)', () => {
    const repoRoot = path.resolve(__dirname, '../../..');
    const doc = yaml.load(fs.readFileSync(path.join(repoRoot, 'project.intent.yaml'), 'utf8'));
    const r = parseProject(doc);
    expect(r.ok).toBe(true);
    const { files, violations } = verifyProjectImports(repoRoot, r.project!);
    expect(files).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });
});

describe('idd verify --project — CLI', () => {
  const src = fs.readFileSync(path.join(__dirname, '../commands/verify.ts'), 'utf8');
  it('despacha --project antes do fluxo por módulo', () => {
    expect(src).toMatch(/args\.includes\('--project'\)\)\s*return cmdVerifyProject/);
  });
  it('sai com código 1 em importação ilegal', () => {
    expect(src).toMatch(/if \(violations\.length > 0\) process\.exit\(1\)/);
  });
});
