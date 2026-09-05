// src/__tests__/dictionary.test.ts — Veredito §2 #2: Dicionário Ubíquo manual (DAV Layer 0)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import {
  parseDictionary, parseContract, checkContractTerms, checkTextTerms, findTerm, emptyDictionary,
  DICTIONARY_PATH, type UbiquitousDictionary,
} from '@idd/core';
import { loadDictionary, saveDictionary, checkIntentAgainstDictionary, dictionaryFile } from '../commands/dictionary.ts';

const DICT = {
  version: '1.0',
  terms: [
    { term: 'UserAccount', definition: 'Conta de acesso de um usuário ao sistema', kind: 'entity', context: 'auth', aliases: ['Conta'], forbidden: ['user', 'usuario', 'login account'] },
    { term: 'FailedLoginAttempt', definition: 'Registro de uma tentativa de autenticação recusada', kind: 'event' },
    { term: 'Publisher', definition: 'Papel de quem publica designações', kind: 'role', forbidden: ['publicador'] },
  ],
};

const CONTRACT = {
  intent: 'Registrar FailedLoginAttempt em UserAccount e bloquear após cinco tentativas',
  module: 'auth/lockout',
  target_class: 'Domain.Auth.UserAccount',
  target_method: 'registerFailedLoginAttempt',
  constraints: [{ id: 'C-01', type: 'invariant', severity: 'critical', description: 'A Conta só transita para LockedState após 5 falhas' }],
  acceptance: [{ given: 'um UserAccount com 4 falhas', when: 'o user erra a senha', then: 'o SecurityOfficer é notificado' }],
};

function dict(): UbiquitousDictionary {
  const r = parseDictionary(DICT);
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.dictionary;
}

function contract(raw: unknown = CONTRACT) {
  const r = parseContract(raw);
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.contract;
}

describe('parseDictionary', () => {
  it('aceita dicionário válido e normaliza defaults', () => {
    const d = dict();
    expect(d.terms).toHaveLength(3);
    expect(d.terms[1].kind).toBe('event');
    expect(d.terms[1].aliases).toEqual([]);
  });

  it('term deve ser PascalCase', () => {
    const r = parseDictionary({ terms: [{ term: 'userAccount', definition: 'Conta de acesso de usuário' }] });
    expect(r.ok).toBe(false);
    expect(r.issues[0].field).toBe('terms[0].term');
  });

  it('definição é obrigatória (termo sem definição = string mágica)', () => {
    const r = parseDictionary({ terms: [{ term: 'Foo', definition: 'curto' }] });
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toMatch(/string mágica/);
  });

  it('kind inválido é erro', () => {
    const r = parseDictionary({ terms: [{ term: 'Foo', definition: 'Definição suficiente', kind: 'thing' }] });
    expect(r.ok).toBe(false);
  });

  it('termo duplicado (case-insensitive) é erro', () => {
    const r = parseDictionary({ terms: [
      { term: 'Foo', definition: 'Definição suficiente' },
      { term: 'FOO', definition: 'Outra definição suficiente' },
    ] });
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.message.includes('duplicado'))).toBe(true);
  });

  it('palavra proibida em um termo não pode ser aceita em outro (ambiguidade)', () => {
    const r = parseDictionary({ terms: [
      { term: 'Publisher', definition: 'Papel de quem publica', forbidden: ['conta'] },
      { term: 'UserAccount', definition: 'Conta de acesso', aliases: ['Conta'] },
    ] });
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.message.includes('ambiguidade'))).toBe(true);
  });

  it('alias e forbidden no mesmo termo são incompatíveis', () => {
    const r = parseDictionary({ terms: [{ term: 'Foo', definition: 'Definição suficiente', aliases: ['bar'], forbidden: ['Bar'] }] });
    expect(r.ok).toBe(false);
  });

  it('campo desconhecido é erro', () => {
    const r = parseDictionary({ terms: [{ term: 'Foo', definition: 'Definição suficiente', synonyms: [] }] });
    expect(r.ok).toBe(false);
  });
});

describe('findTerm', () => {
  it('resolve por termo e por alias, case-insensitive', () => {
    const d = dict();
    expect(findTerm(d, 'useraccount')?.term).toBe('UserAccount');
    expect(findTerm(d, 'conta')?.term).toBe('UserAccount');
    expect(findTerm(d, 'Nope')).toBeUndefined();
  });
});

describe('checkContractTerms — determinístico, offline', () => {
  it('aponta conceitos PascalCase fora do dicionário e sinônimos proibidos', () => {
    const w = checkContractTerms(dict(), contract());
    const unknown = w.filter(x => x.kind === 'unknown').map(x => x.term).sort();
    const forbidden = w.filter(x => x.kind === 'forbidden');
    expect(unknown).toEqual(['LockedState', 'SecurityOfficer']);
    expect(forbidden).toHaveLength(1);
    expect(forbidden[0]).toMatchObject({ term: 'user', suggestion: 'UserAccount', field: 'acceptance[0]' });
  });

  it('termos conhecidos e aliases não geram aviso', () => {
    const w = checkContractTerms(dict(), contract({
      ...CONTRACT,
      constraints: ['A Conta transita para bloqueada após 5 FailedLoginAttempt'],
      acceptance: ['UserAccount bloqueada não autentica'],
    }));
    expect(w).toEqual([]);
  });

  it('target_class é analisado por segmento', () => {
    const w = checkContractTerms(dict(), contract({ ...CONTRACT, target_class: 'Domain.Billing.InvoiceLine', target_method: 'close', acceptance: ['fecha a linha'] }));
    expect(w.some(x => x.term === 'InvoiceLine' && x.field === 'target_class')).toBe(true);
  });

  it('palavra proibida respeita fronteira de palavra e é case-insensitive', () => {
    const w = checkTextTerms(dict(), [{ field: 'intent', text: 'O Publicador envia; o publicadores não conta' }]);
    expect(w.map(x => x.term)).toEqual(['publicador']);
  });

  it('não repete o mesmo aviso no mesmo campo', () => {
    const w = checkTextTerms(dict(), [{ field: 'intent', text: 'FooBar e FooBar e foobar' }]);
    expect(w).toHaveLength(1);
  });

  it('dicionário vazio: só conceitos PascalCase são apontados', () => {
    const w = checkTextTerms(emptyDictionary(), [{ field: 'intent', text: 'Autenticar usuário com senha' }]);
    expect(w).toEqual([]);
  });
});

describe('dictionary IO (cli)', () => {
  let tmp: string;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-dict-')); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  it('sem dicionário: loadDictionary → undefined e check é silencioso', () => {
    expect(loadDictionary(tmp)).toBeUndefined();
    expect(checkIntentAgainstDictionary(tmp, CONTRACT)).toEqual([]);
  });

  it('save ordena termos e load valida', () => {
    const file = saveDictionary(tmp, { version: '1.0', terms: [...dict().terms].reverse() });
    expect(file).toBe(dictionaryFile(tmp));
    expect(path.relative(tmp, file).replace(/\\/g, '/')).toBe(DICTIONARY_PATH);
    const loaded = loadDictionary(tmp)!;
    expect(loaded.terms.map(t => t.term)).toEqual(['FailedLoginAttempt', 'Publisher', 'UserAccount']);
  });

  it('dicionário inválido em disco lança erro descritivo', () => {
    fs.mkdirSync(path.join(tmp, '.intent'), { recursive: true });
    fs.writeFileSync(path.join(tmp, DICTIONARY_PATH), JSON.stringify({ terms: [{ term: 'bad' }] }));
    expect(() => loadDictionary(tmp)).toThrow(/Dicionário inválido/);
  });

  it('checkIntentAgainstDictionary com dicionário presente reporta avisos', () => {
    saveDictionary(tmp, dict());
    const w = checkIntentAgainstDictionary(tmp, CONTRACT);
    expect(w.length).toBeGreaterThan(0);
  });

  it('o próprio repositório tem dicionário válido (dogfooding)', () => {
    const repoRoot = path.resolve(__dirname, '../../..');
    const d = loadDictionary(repoRoot);
    expect(d).toBeDefined();
    expect(d!.terms.length).toBeGreaterThan(5);
    expect(findTerm(d!, 'BoundedContext')).toBeDefined();
  });
});

describe('integração em capture / verify / LSP', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
  it('capture consulta o dicionário após validar o schema', () => {
    expect(read('../commands/capture.ts')).toMatch(/checkIntentAgainstDictionary\(root, parsed\)/);
  });
  it('verify trata termo fora do dicionário como warn, sem afetar drift', () => {
    const src = read('../commands/verify.ts');
    expect(src).toMatch(/termViol = checkIntentAgainstDictionary/);
    expect(src).toMatch(/\[\.\.\.staticViol, \.\.\.termViol, \.\.\.semanticViol\]/);
  });
  it('LSP publica diagnostics idd.dictionary.* como Warning', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../../extensions/idd-core/src/lsp/server.ts'), 'utf8');
    expect(src).toMatch(/checkContractTerms\(dict, result\.contract\)/);
    expect(src).toMatch(/idd\.dictionary\.forbidden/);
    expect(src).toMatch(/idd\.dictionary\.unknown/);
  });
  it('index registra idd dictionary', () => {
    expect(read('../index.ts')).toMatch(/case 'dictionary':/);
  });
});
