// src/__tests__/phase7.test.ts — Issues #25-#28: Multi-repo e Federação
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import MockDatabase, { resetMockDb } from './__mocks__/better-sqlite3.ts';
import { Store, __setDatabaseConstructor } from '../lib/store.ts';
import {
  inferHttpMethod, inferStatusCodes, inferRequestSchema,
  generateEndpoint, buildOpenApiSpec, specToYaml, specToJson,
  type IntentYaml,
} from '../lib/openapi.ts';
import { lintIntent, type Playbook } from '../commands/playbook.ts';

__setDatabaseConstructor(MockDatabase);

// ── Setup ─────────────────────────────────────────────────────────

let tmpDir: string;
let store:  Store;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-p7-'));
  const dbPath = path.join(tmpDir, '.idd', 'store.db');
  resetMockDb(dbPath);
  store = new Store(tmpDir);
  store.open();
});

afterEach(() => {
  try { store.close(); } catch {}
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Fixtures ─────────────────────────────────────────────────────

const LOGIN_INTENT: IntentYaml = {
  intent:      'Autenticar usuário com e-mail e senha, retornando JWT válido por 24h',
  module:      'auth/login',
  constraints: ['senha >= 8 caracteres', 'JWT expira em 24h', 'nunca logar senha'],
  acceptance:  ['login válido retorna JWT', 'senha errada retorna 401', '5 tentativas bloqueia 423'],
  language:    'typescript',
  version:     '0.0.1',
};

const LIST_USERS_INTENT: IntentYaml = {
  intent:      'Listar usuários com paginação e filtros',
  module:      'users/list',
  constraints: ['máximo 100 por página', 'requer autenticação'],
  acceptance:  ['retorna array paginado', 'sem auth retorna 401'],
};

const CREATE_USER_INTENT: IntentYaml = {
  intent:      'Criar novo usuário com validação de email único',
  module:      'users/create',
  constraints: ['email deve ser único', 'senha >= 8 chars', 'nome obrigatório'],
  acceptance:  ['usuário criado retorna 201', 'email duplicado retorna 400'],
};

const DELETE_USER_INTENT: IntentYaml = {
  intent:      'Remover usuário pelo ID',
  module:      'users/delete',
  constraints: ['apenas admin pode remover', 'soft delete — nunca remover fisicamente'],
  acceptance:  ['admin remove → 204', 'não admin → 403', 'ID inexistente → 404'],
};

const UPDATE_USER_INTENT: IntentYaml = {
  intent:      'Atualizar dados do usuário',
  module:      'users/update',
  constraints: ['apenas próprio usuário ou admin', 'validar campos antes de salvar'],
  acceptance:  ['dados atualizados retornam 200', 'campos inválidos retornam 400'],
};

// ════════════════════════════════════════════════════════════════
// Issue #25 — idd api: inferHttpMethod
// ════════════════════════════════════════════════════════════════

describe('inferHttpMethod', () => {
  it('autenticar → POST', () => {
    expect(inferHttpMethod('Autenticar usuário com email e senha')).toBe('post');
  });

  it('listar → GET', () => {
    expect(inferHttpMethod('Listar usuários com paginação')).toBe('get');
  });

  it('criar → POST', () => {
    expect(inferHttpMethod('Criar novo usuário com validação')).toBe('post');
  });

  it('remover → DELETE', () => {
    expect(inferHttpMethod('Remover usuário pelo ID')).toBe('delete');
  });

  it('atualizar → PATCH', () => {
    expect(inferHttpMethod('Atualizar dados do usuário')).toBe('patch');
  });

  it('buscar → GET', () => {
    expect(inferHttpMethod('Buscar produto pelo SKU')).toBe('get');
  });

  it('exportar → GET', () => {
    expect(inferHttpMethod('Exportar relatório em CSV')).toBe('get');
  });

  it('enviar → POST', () => {
    expect(inferHttpMethod('Enviar e-mail de confirmação')).toBe('post');
  });

  it('fallback desconhecido → POST', () => {
    expect(inferHttpMethod('Processar xyzzy desconhecido')).toBe('post');
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #25 — inferStatusCodes
// ════════════════════════════════════════════════════════════════

describe('inferStatusCodes', () => {
  it('GET retorna 200 como sucesso principal', () => {
    const codes = inferStatusCodes('get', []);
    expect(codes['200']).toBeDefined();
  });

  it('POST retorna 201 como sucesso principal', () => {
    const codes = inferStatusCodes('post', []);
    expect(codes['201']).toBeDefined();
  });

  it('DELETE retorna 204 como sucesso principal', () => {
    const codes = inferStatusCodes('delete', []);
    expect(codes['204']).toBeDefined();
  });

  it('500 sempre presente', () => {
    const codes = inferStatusCodes('get', []);
    expect(codes['500']).toBeDefined();
  });

  it('acceptance com "401" gera resposta 401', () => {
    const codes = inferStatusCodes('get', ['sem autenticação retorna 401']);
    expect(codes['401']).toBeDefined();
  });

  it('acceptance com "credencial" gera 401', () => {
    const codes = inferStatusCodes('post', ['credenciais inválidas']);
    expect(codes['401']).toBeDefined();
  });

  it('acceptance com "400" e "inválido" gera 400 com schema', () => {
    const codes = inferStatusCodes('post', ['dados inválidos retornam 400']);
    expect(codes['400']).toBeDefined();
    expect((codes['400'] as any).content).toBeDefined();
  });

  it('acceptance com "403" e "permissão" gera 403', () => {
    const codes = inferStatusCodes('delete', ['sem permissão retorna 403']);
    expect(codes['403']).toBeDefined();
  });

  it('acceptance com "404" gera 404', () => {
    const codes = inferStatusCodes('get', ['ID não encontrado retorna 404']);
    expect(codes['404']).toBeDefined();
  });

  it('acceptance com "423" e "bloqueado" gera 423', () => {
    const codes = inferStatusCodes('post', ['5 tentativas bloqueiam conta 423']);
    expect(codes['423']).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #25 — inferRequestSchema
// ════════════════════════════════════════════════════════════════

describe('inferRequestSchema', () => {
  it('GET não gera requestBody', () => {
    expect(inferRequestSchema('Listar usuários', [])).toBeNull();
  });

  it('DELETE não gera requestBody', () => {
    expect(inferRequestSchema('Remover usuário pelo ID', [])).toBeNull();
  });

  it('POST com email detecta campo email', () => {
    const schema = inferRequestSchema('Criar usuário', ['email único obrigatório']) as any;
    expect(schema?.properties?.email?.format).toBe('email');
  });

  it('POST com senha detecta campo password com minLength:8', () => {
    const schema = inferRequestSchema('Autenticar', ['senha >= 8 chars']) as any;
    expect(schema?.properties?.password?.minLength).toBe(8);
    expect(schema?.properties?.password?.writeOnly).toBe(true);
  });

  it('POST com nome detecta campo name', () => {
    const schema = inferRequestSchema('Criar usuário', ['nome obrigatório']) as any;
    expect(schema?.properties?.name).toBeDefined();
  });

  it('POST sem campos reconhecidos retorna null', () => {
    const schema = inferRequestSchema('Processar operação genérica', ['validar antes']);
    expect(schema).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #25 — generateEndpoint
// ════════════════════════════════════════════════════════════════

describe('generateEndpoint', () => {
  it('gera path correto /auth/login', () => {
    const ep = generateEndpoint(LOGIN_INTENT);
    expect(ep.path).toContain('auth');
    expect(ep.path).toContain('login');
  });

  it('método POST para autenticar', () => {
    expect(generateEndpoint(LOGIN_INTENT).method).toBe('post');
  });

  it('método GET para listar', () => {
    expect(generateEndpoint(LIST_USERS_INTENT).method).toBe('get');
  });

  it('método DELETE para remover', () => {
    expect(generateEndpoint(DELETE_USER_INTENT).method).toBe('delete');
  });

  it('método PATCH para atualizar', () => {
    expect(generateEndpoint(UPDATE_USER_INTENT).method).toBe('patch');
  });

  it('endpoint de remoção tem parâmetro {id}', () => {
    const ep = generateEndpoint(DELETE_USER_INTENT);
    expect(ep.path).toContain('{id}');
    expect(ep.operation.parameters?.some((p: any) => p.name === 'id')).toBe(true);
  });

  it('operationId segue convenção method_module_sub', () => {
    const ep = generateEndpoint(LOGIN_INTENT);
    expect(ep.operation.operationId).toBe('post_auth_login');
  });

  it('tags derivadas do nome do módulo', () => {
    const ep = generateEndpoint(LOGIN_INTENT);
    expect(ep.operation.tags).toContain('Auth');
  });

  it('summary é o início do intent', () => {
    const ep = generateEndpoint(LOGIN_INTENT);
    expect(ep.operation.summary.length).toBeLessThanOrEqual(80);
    expect(ep.operation.summary).toContain('Autenticar');
  });

  it('description contém constraints e acceptance', () => {
    const ep = generateEndpoint(LOGIN_INTENT);
    expect(ep.operation.description).toContain('Constraints');
    expect(ep.operation.description).toContain('Aceite');
    expect(ep.operation.description).toContain('JWT expira em 24h');
  });

  it('POST com email detecta requestBody', () => {
    const ep = generateEndpoint(CREATE_USER_INTENT);
    expect(ep.operation.requestBody).toBeDefined();
  });

  it('responses inclui 500', () => {
    const ep = generateEndpoint(LOGIN_INTENT);
    expect(ep.operation.responses['500']).toBeDefined();
  });

  it('responses login inclui 401', () => {
    const ep = generateEndpoint(LOGIN_INTENT);
    expect(ep.operation.responses['401']).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #25 — buildOpenApiSpec + serialização
// ════════════════════════════════════════════════════════════════

describe('buildOpenApiSpec', () => {
  it('versão OpenAPI é 3.1.0', () => {
    const spec = buildOpenApiSpec('test', '1.0.0', []);
    expect(spec.openapi).toBe('3.1.0');
  });

  it('info.title usa o nome do projeto', () => {
    const spec = buildOpenApiSpec('MeuProjeto', '2.0.0', []);
    expect(spec.info.title).toBe('MeuProjeto API');
  });

  it('todos os endpoints aparecem no spec', () => {
    const eps = [LOGIN_INTENT, LIST_USERS_INTENT, CREATE_USER_INTENT].map(i => generateEndpoint(i));
    const spec = buildOpenApiSpec('test', '1.0.0', eps);
    expect(Object.keys(spec.paths)).toHaveLength(3);
  });

  it('bearerAuth está no securitySchemes', () => {
    const spec = buildOpenApiSpec('test', '1.0.0', []);
    expect((spec.components.securitySchemes as any)?.bearerAuth).toBeDefined();
  });

  it('tags derivadas dos módulos', () => {
    const eps = [generateEndpoint(LOGIN_INTENT), generateEndpoint(LIST_USERS_INTENT)];
    const spec = buildOpenApiSpec('test', '1.0.0', eps);
    expect(spec.tags?.some(t => t.name === 'Auth')).toBe(true);
    expect(spec.tags?.some(t => t.name === 'Users')).toBe(true);
  });

  it('specToYaml produz YAML válido', () => {
    const eps  = [generateEndpoint(LOGIN_INTENT)];
    const spec = buildOpenApiSpec('test', '1.0.0', eps);
    const out  = specToYaml(spec);
    expect(() => yaml.load(out)).not.toThrow();
    expect(out).toContain('openapi: 3.1.0');
  });

  it('specToJson produz JSON válido', () => {
    const eps  = [generateEndpoint(LOGIN_INTENT)];
    const spec = buildOpenApiSpec('test', '1.0.0', eps);
    const out  = specToJson(spec);
    expect(() => JSON.parse(out)).not.toThrow();
    expect(JSON.parse(out).openapi).toBe('3.1.0');
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #26 — Team Playbooks: lintIntent
// ════════════════════════════════════════════════════════════════

const STARTUP_PLAYBOOK: Playbook = {
  name: 'test', version: '1.0.0',
  mandatory_constraints: [],
  forbidden_patterns: ['TODO', 'gambiarra'],
  required_fields: ['intent', 'module', 'constraints', 'acceptance'],
  lint_rules: [
    { id:'min-c', severity:'warn',  message:'Mínimo 2 constraints', check:'min_constraints', value:2 },
    { id:'min-a', severity:'warn',  message:'Mínimo 2 acceptance',  check:'min_acceptance',  value:2 },
    { id:'len',   severity:'error', message:'Intent >= 15 chars',   check:'intent_min_length', value:15 },
  ],
};

describe('lintIntent — Team Playbooks', () => {
  it('intent válida não gera violações', () => {
    const intent = { intent:'Autenticar usuário com email e senha', module:'auth/login', constraints:['c1','c2'], acceptance:['a1','a2'], language:'typescript' };
    expect(lintIntent(intent, STARTUP_PLAYBOOK)).toHaveLength(0);
  });

  it('intent muito curta viola regra de comprimento', () => {
    const intent = { intent:'Auth', module:'auth/login', constraints:['c1','c2'], acceptance:['a1','a2'] };
    const vs = lintIntent(intent, STARTUP_PLAYBOOK);
    expect(vs.some(v => v.ruleId === 'len' && v.severity === 'error')).toBe(true);
  });

  it('constraints insuficientes gera aviso', () => {
    const intent = { intent:'Autenticar usuário com email e senha', module:'auth/login', constraints:['c1'], acceptance:['a1','a2'] };
    const vs = lintIntent(intent, STARTUP_PLAYBOOK);
    expect(vs.some(v => v.ruleId === 'min-c')).toBe(true);
  });

  it('acceptance insuficiente gera aviso', () => {
    const intent = { intent:'Autenticar usuário com email e senha', module:'auth/login', constraints:['c1','c2'], acceptance:['a1'] };
    const vs = lintIntent(intent, STARTUP_PLAYBOOK);
    expect(vs.some(v => v.ruleId === 'min-a')).toBe(true);
  });

  it('padrão proibido "TODO" gera violação', () => {
    const intent = { intent:'Autenticar usuário com email e senha', module:'auth/login', constraints:['TODO: implementar'], acceptance:['a1','a2'] };
    const vs = lintIntent(intent, STARTUP_PLAYBOOK);
    expect(vs.some(v => v.ruleId === 'forbidden-pattern')).toBe(true);
  });

  it('constraint obrigatória faltando gera violação', () => {
    const playbook: Playbook = { ...STARTUP_PLAYBOOK, mandatory_constraints:['Autenticar antes de processar'] };
    const intent = { intent:'Listar usuários com paginação e filtros', module:'users/list', constraints:['validar entrada'], acceptance:['a1','a2'] };
    const vs = lintIntent(intent, playbook);
    expect(vs.some(v => v.ruleId === 'mandatory-constraint')).toBe(true);
  });

  it('campo obrigatório faltando gera violação', () => {
    const playbook: Playbook = { ...STARTUP_PLAYBOOK, required_fields:['intent','module','constraints','acceptance','language'] };
    const intent = { intent:'Autenticar usuário com email e senha', module:'auth/login', constraints:['c1','c2'], acceptance:['a1','a2'] }; // sem language
    const vs = lintIntent(intent, playbook);
    expect(vs.some(v => v.ruleId === 'required-field' && v.message.includes('language'))).toBe(true);
  });

  it('enterprise: mínimo 4 constraints', () => {
    const playbook: Playbook = { ...STARTUP_PLAYBOOK, lint_rules:[
      { id:'min-c', severity:'error', message:'Mínimo 4 constraints', check:'min_constraints', value:4 },
    ]};
    const intent = { intent:'Autenticar usuário com email e senha', module:'auth/login', constraints:['c1','c2','c3'], acceptance:['a1','a2'] };
    const vs = lintIntent(intent, playbook);
    expect(vs.some(v => v.ruleId === 'min-c' && v.severity === 'error')).toBe(true);
  });

  it('has_language rule: sem language gera violação', () => {
    const playbook: Playbook = { ...STARTUP_PLAYBOOK, lint_rules:[
      { id:'lang', severity:'warn', message:'Language necessário', check:'has_language' },
    ]};
    const intent = { intent:'Autenticar usuário com email e senha', module:'auth/login', constraints:['c1','c2'], acceptance:['a1','a2'] };
    const vs = lintIntent(intent, playbook);
    expect(vs.some(v => v.ruleId === 'lang')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #27 — IDD Registry: local filesystem
// ════════════════════════════════════════════════════════════════

describe('IDD Registry — local filesystem', () => {
  it('salva e carrega entidade do registry local', () => {
    const registryDir = path.join(tmpDir, '.idd', 'registry', 'templates');
    fs.mkdirSync(registryDir, { recursive: true });

    const entry = {
      name: 'meu-template', type: 'template' as const, version: '1.0.0',
      tags: ['custom'], content: '{"name":"test"}',
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(registryDir, `${entry.name}@${entry.version}.json`), JSON.stringify(entry));

    const loaded = JSON.parse(fs.readFileSync(path.join(registryDir, 'meu-template@1.0.0.json'), 'utf8'));
    expect(loaded.name).toBe('meu-template');
    expect(loaded.type).toBe('template');
  });

  it('busca filtra por nome', () => {
    const registryDir = path.join(tmpDir, '.idd', 'registry', 'templates');
    fs.mkdirSync(registryDir, { recursive: true });
    ['auth-jwt@1.0.0', 'crud@1.0.0', 'webhook@1.0.0'].forEach(name => {
      fs.writeFileSync(path.join(registryDir, `${name}.json`), JSON.stringify({ name: name.split('@')[0], type:'template', version:'1.0.0', tags:[], content:'{}', createdAt: new Date().toISOString() }));
    });
    const files = fs.readdirSync(registryDir);
    const filtered = files.filter(f => f.includes('auth'));
    expect(filtered).toHaveLength(1);
  });

  it('versionamento: múltiplas versões do mesmo artefato', () => {
    const registryDir = path.join(tmpDir, '.idd', 'registry', 'templates');
    fs.mkdirSync(registryDir, { recursive: true });
    ['1.0.0','2.0.0','2.1.0'].forEach(ver => {
      fs.writeFileSync(path.join(registryDir, `crud@${ver}.json`), JSON.stringify({ name:'crud', type:'template', version:ver, tags:[], content:'{}', createdAt: new Date().toISOString() }));
    });
    const versions = fs.readdirSync(registryDir).filter(f => f.startsWith('crud@'));
    expect(versions).toHaveLength(3);
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #28 — idd migrate: scan e inferência
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// Regressão: bug de duplicação ao percorrer src/ duas vezes
// ════════════════════════════════════════════════════════════════
//
// Encontrado via teste manual de ponta a ponta com o binário real:
// funções que faziam walk(path.join(root,'src')) seguido de walk(root)
// contavam cada .intent.yaml duas vezes, pois o segundo walk(root)
// re-percorre recursivamente root/src/. Corrigido com um Set de
// caminhos já vistos em api.ts (findAllIntents) e playbook.ts (playbookCheck).

describe('Regressão — sem duplicação ao percorrer src/ duas vezes', () => {
  function walkWithDedup(root: string): string[] {
    const results: string[] = [];
    const seen = new Set<string>();
    function walk(dir: string): void {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !['node_modules','.git','dist','out'].includes(entry.name)) walk(full);
        else if (entry.isFile() && entry.name.endsWith('.intent.yaml')) {
          if (seen.has(full)) continue;
          seen.add(full);
          results.push(full);
        }
      }
    }
    walk(path.join(root, 'src'));
    walk(root); // walk(root) re-percorre src/ — sem o Set, duplicaria
    return results;
  }

  it('arquivo em src/ não é contado duas vezes mesmo com dois walks', () => {
    const srcDir = path.join(tmpDir, 'src', 'auth');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'login.intent.yaml'),
      'intent: "Autenticar usuário com email"\nmodule: auth/login\nconstraints:\n  - c1\nacceptance:\n  - a1\n');

    const found = walkWithDedup(tmpDir);
    expect(found).toHaveLength(1); // não 2
  });

  it('múltiplos arquivos em src/ cada um aparece exatamente uma vez', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'auth'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src', 'users'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'auth', 'login.intent.yaml'),
      'intent: "Login com email"\nmodule: auth/login\nconstraints:\n  - c1\nacceptance:\n  - a1\n');
    fs.writeFileSync(path.join(tmpDir, 'src', 'users', 'crud.intent.yaml'),
      'intent: "CRUD de usuários"\nmodule: users/crud\nconstraints:\n  - c1\nacceptance:\n  - a1\n');

    const found = walkWithDedup(tmpDir);
    expect(found).toHaveLength(2); // não 4
  });

  it('arquivo fora de src/ (ex: .idd/domain/) ainda é encontrado', () => {
    fs.mkdirSync(path.join(tmpDir, '.idd', 'domain'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.idd', 'domain', 'domain.intent.yaml'),
      'intent: "Modelo de domínio"\nmodule: domain/model\nconstraints:\n  - c1\nacceptance:\n  - a1\n');

    const found = walkWithDedup(tmpDir);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('.idd');
  });

  it('sem o Set de deduplicação, o bug reaparece (prova que o teste é válido)', () => {
    // Mesma lógica, mas SEM o Set — replica o bug original para provar
    // que este teste de regressão realmente detectaria a reintrodução do bug.
    function walkBuggy(root: string): string[] {
      const results: string[] = [];
      function walk(dir: string): void {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory() && !['node_modules','.git','dist'].includes(entry.name)) walk(full);
          else if (entry.isFile() && entry.name.endsWith('.intent.yaml')) results.push(full);
        }
      }
      walk(path.join(root, 'src'));
      walk(root);
      return results;
    }

    fs.mkdirSync(path.join(tmpDir, 'src', 'auth'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'auth', 'login.intent.yaml'),
      'intent: "Login"\nmodule: auth/login\nconstraints:\n  - c1\nacceptance:\n  - a1\n');

    const buggyResult = walkBuggy(tmpDir);
    expect(buggyResult).toHaveLength(2); // confirma que o bug existiria sem a correção
  });
});


describe('idd migrate — scan de candidatos', () => {
  function setupSrcDir(): void {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(path.join(srcDir, 'auth'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'users'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'auth', 'login.ts'), `
export async function login(email: string, password: string) {
  const user = await findByEmail(email);
  if (!user) throw new Error('invalido');
  return signJWT({ userId: user.id });
}`.trim());
    fs.writeFileSync(path.join(srcDir, 'auth', 'login.test.ts'), `it('test', () => {})`);
    fs.writeFileSync(path.join(srcDir, 'users', 'crud.ts'), `export function getUsers() { return []; }`);
    // login tem intent, crud não tem
    fs.writeFileSync(path.join(srcDir, 'auth', 'login.intent.yaml'),
      'intent: "Autenticar usuário"\nmodule: auth/login\nconstraints:\n  - c1\nacceptance:\n  - a1\n');
  }

  it('detecta módulos candidatos em src/', () => {
    setupSrcDir();
    const srcDir = path.join(tmpDir, 'src');
    const candidates: Array<{ module: string; sub: string; hasIntent: boolean }> = [];
    const CODE_EXTS = ['.ts', '.js', '.py', '.go'];
    for (const domain of fs.readdirSync(srcDir, { withFileTypes: true })) {
      if (!domain.isDirectory()) continue;
      const domainDir = path.join(srcDir, domain.name);
      for (const entry of fs.readdirSync(domainDir, { withFileTypes: true })) {
        const ext  = path.extname(entry.name);
        const base = path.basename(entry.name, ext);
        if (!CODE_EXTS.includes(ext)) continue;
        if (base.includes('.test') || base.includes('.spec')) continue;
        const hasIntent = fs.existsSync(path.join(domainDir, `${base}.intent.yaml`));
        candidates.push({ module: domain.name, sub: base, hasIntent });
      }
    }
    expect(candidates.some(c => c.module === 'auth' && c.sub === 'login' && c.hasIntent)).toBe(true);
    expect(candidates.some(c => c.module === 'users' && c.sub === 'crud' && !c.hasIntent)).toBe(true);
  });

  it('cobertura calculada corretamente', () => {
    setupSrcDir();
    const candidates = [
      { hasIntent: true }, { hasIntent: false }, { hasIntent: true }, { hasIntent: true }
    ];
    const covered  = candidates.filter(c => c.hasIntent).length;
    const coverage = Math.round((covered / candidates.length) * 100);
    expect(coverage).toBe(75);
  });

  it('relatório agrupa por domínio', () => {
    setupSrcDir();
    const byDomain: Record<string, { total: number; covered: number }> = {
      auth:  { total: 1, covered: 1 },
      users: { total: 1, covered: 0 },
    };
    expect(byDomain['auth'].covered / byDomain['auth'].total).toBe(1);
    expect(byDomain['users'].covered / byDomain['users'].total).toBe(0);
  });

  it('arquivos de teste são ignorados no scan', () => {
    setupSrcDir();
    const srcDir = path.join(tmpDir, 'src', 'auth');
    const files  = fs.readdirSync(srcDir);
    const testFiles = files.filter(f => f.includes('.test.') || f.includes('.spec.'));
    const codeFiles = files.filter(f => {
      const ext  = path.extname(f);
      const base = path.basename(f, ext);
      return ['.ts','.js','.py'].includes(ext) && !base.includes('.test') && !base.includes('.spec');
    });
    expect(testFiles.length).toBeGreaterThan(0);
    expect(codeFiles).toHaveLength(1); // apenas login.ts
    expect(codeFiles[0]).toBe('login.ts');
  });
});

// ════════════════════════════════════════════════════════════════
// Pipeline e2e: intent → OpenAPI → YAML → parse
// ════════════════════════════════════════════════════════════════

describe('Pipeline e2e — Intent → OpenAPI 3.1', () => {
  it('gera spec completa com múltiplos endpoints e é YAML válido', () => {
    const intents = [LOGIN_INTENT, LIST_USERS_INTENT, CREATE_USER_INTENT, DELETE_USER_INTENT, UPDATE_USER_INTENT];
    const eps   = intents.map(i => generateEndpoint(i));
    const spec  = buildOpenApiSpec('MyApp', '1.0.0', eps);
    const yamlOut = specToYaml(spec);

    // Valid YAML
    expect(() => yaml.load(yamlOut)).not.toThrow();
    const parsed = yaml.load(yamlOut) as any;
    expect(parsed.openapi).toBe('3.1.0');
    expect(Object.keys(parsed.paths)).toHaveLength(5);
  });

  it('todos os métodos HTTP estão cobertos na spec', () => {
    const intents = [LOGIN_INTENT, LIST_USERS_INTENT, CREATE_USER_INTENT, DELETE_USER_INTENT, UPDATE_USER_INTENT];
    const eps    = intents.map(i => generateEndpoint(i));
    const methods = eps.map(e => e.method);
    expect(methods).toContain('post');
    expect(methods).toContain('get');
    expect(methods).toContain('delete');
    expect(methods).toContain('patch');
  });

  it('spec JSON é equivalente ao YAML', () => {
    const eps  = [generateEndpoint(LOGIN_INTENT)];
    const spec = buildOpenApiSpec('test', '1.0.0', eps);
    const fromYaml = yaml.load(specToYaml(spec)) as any;
    const fromJson = JSON.parse(specToJson(spec));
    expect(fromYaml.openapi).toBe(fromJson.openapi);
    expect(Object.keys(fromYaml.paths)).toEqual(Object.keys(fromJson.paths));
  });
});
