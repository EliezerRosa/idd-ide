import { describe, it, afterAll } from 'vitest';
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { stateMutationRule } from '../src/rules/state-mutation.js';

// O RuleTester do ESLint 9 usa describe/it do framework de testes em uso.
(RuleTester as any).describe = describe;
(RuleTester as any).it = it;
(RuleTester as any).afterAll = afterAll;

const tester = new RuleTester({
  languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module' },
});

/** Classe TypeScript com um método anotado; `corpo` é o corpo do método. */
const classe = (contrato: string, corpo: string, extra = ''): string => `
export class Mesa {
  readonly id: string = 'm1';
  status: 'aberta' | 'fechada' = 'aberta';
  fechada_em: string | null = null;
  itens: Array<{ nome: string }> = [];
  config: { limite: number } = { limite: 1 };
  contador: number = 0;
  cache: Map<string, number> = new Map();

  /**
${contrato.split('\n').map(l => `   * ${l}`).join('\n')}
   */
  metodo(k: string): void {
    ${corpo}
  }
${extra}
}`;

const FECHAR = '@intent Mesa.fechar\n@mutates status, fechada_em\n@readonly id, itens';

tester.run('state-mutation', stateMutationRule as any, {
  valid: [
    { name: 'mutação autorizada em código TypeScript tipado', code: classe(FECHAR, "this.status = 'fechada'; this.fechada_em = new Date().toISOString();") },
    { name: 'método sem contrato não é fiscalizado', code: classe('Método auxiliar.', "this.status = 'fechada';") },
    { name: 'push em campo autorizado', code: classe('@intent Mesa.add\n@mutates itens', "this.itens.push({ nome: 'x' });") },
    { name: 'arrow function interna herda o this e respeita o contrato', code: classe(FECHAR, "const f = () => { this.status = 'fechada'; }; f();") },
    { name: 'variável local que não é this', code: classe(FECHAR, 'const x = { a: 1 }; x.a = 2;') },
    { name: 'ordenar uma cópia não muta o campo', code: classe(FECHAR, 'const ordenados = this.itens.slice().sort();') },
    { name: 'Object.assign sobre um objeto novo não muta this', code: classe(FECHAR, 'const copia = Object.assign({}, this);') },
    {
      name: 'contrato vale só para o próprio método',
      code: classe(FECHAR, "this.status = 'fechada';", "  outro(): void { this.contador = 9; }"),
    },
    {
      name: 'chamada a colaborador declarado (repo.delete) não é mutação de estado próprio',
      code: `class Servico {
  constructor(private repo: Repositorio, private log: Logger) {}
  cache: Cache = criarCache();
  /**
   * @intent Servico.remover
   * @mutates nenhum
   */
  remover(id: string): void { this.repo.delete(id); this.log.add(id); this.cache.set(id, 1); }
}`,
    },
    { name: '@mutates nenhum em método puro', code: classe('@intent Mesa.total\n@mutates nenhum', 'const n = this.itens.length;') },
    {
      name: 'contrato externo volta a valer depois de uma classe interna',
      code: classe(FECHAR, "class Interna { x = 0; outro(): void { this.x = 1; } } this.status = 'fechada';"),
    },
  ],
  invalid: [
    {
      name: 'método em propriedade com arrow function também é fiscalizado',
      code: `class Mesa {
  status = 'aberta';
  contador = 0;
  /**
   * @intent Mesa.fechar
   * @mutates status
   */
  fechar = (): void => { this.status = 'fechada'; this.contador = 1; };
}`,
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'contador', intent: 'Mesa.fechar' } }],
    },
    {
      name: '@mutates nenhum acusa qualquer mutação',
      code: classe('@intent Mesa.total\n@mutates nenhum', 'this.contador = 1;'),
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'contador', intent: 'Mesa.total' } }],
    },
    {
      name: 'mutador em campo coleção continua acusado, mesmo com colaboradores na classe',
      code: `class Servico {
  constructor(private repo: Repositorio) {}
  pendentes: Map<string, number> = new Map();
  /**
   * @intent Servico.remover
   * @mutates nenhum
   */
  remover(id: string): void { this.repo.delete(id); this.pendentes.delete(id); }
}`,
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'pendentes', intent: 'Servico.remover' } }],
    },
    {
      name: 'contrato externo continua valendo depois de uma classe interna',
      code: classe(FECHAR, "class Interna { x = 0; outro(): void { this.x = 1; } } this.contador = 2;"),
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'contador', intent: 'Mesa.fechar' } }],
    },
    {
      name: 'mutação não autorizada em código TypeScript tipado',
      code: classe(FECHAR, 'this.contador = 1;'),
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'contador', intent: 'Mesa.fechar' } }],
    },
    {
      name: 'campo @readonly',
      code: classe(FECHAR, "this.itens = [];"),
      errors: [{ messageId: 'readOnlyViolation' }],
    },
    {
      name: 'apelido de this: const self = this',
      code: classe(FECHAR, 'const self = this; self.contador = 1;'),
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'contador', intent: 'Mesa.fechar' } }],
    },
    {
      name: 'desvio por conversão de tipo: (this as any).campo',
      code: classe(FECHAR, '(this as any).contador = 1;'),
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'contador', intent: 'Mesa.fechar' } }],
    },
    {
      name: 'apelido com conversão e atribuição tardia: let s; s = this as any',
      code: classe(FECHAR, 'let s: any; s = this as any; s.contador = 1;'),
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'contador', intent: 'Mesa.fechar' } }],
    },
    {
      name: 'método mutador em campo @readonly',
      code: classe(FECHAR, "this.itens.push({ nome: 'x' });"),
      errors: [{ messageId: 'readOnlyViolation' }],
    },
    {
      name: 'incremento',
      code: classe(FECHAR, 'this.contador++;'),
      errors: [{ messageId: 'unauthorizedMutation' }],
    },
    {
      name: 'mutação aninhada: this.config.limite',
      code: classe(FECHAR, 'this.config.limite = 5;'),
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'config', intent: 'Mesa.fechar' } }],
    },
    {
      name: 'mutador em campo aninhado: this.config.lista.push',
      code: classe(FECHAR, '(this.config as any).lista.push(1);'),
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'config', intent: 'Mesa.fechar' } }],
    },
    {
      name: 'delete this.campo',
      code: classe(FECHAR, 'delete (this as any).cache;'),
      errors: [{ messageId: 'unauthorizedMutation', data: { field: 'cache', intent: 'Mesa.fechar' } }],
    },
    {
      name: 'acesso computado literal: this["itens"]',
      code: classe(FECHAR, "this['itens'] = [];"),
      errors: [{ messageId: 'readOnlyViolation' }],
    },
    {
      name: 'acesso computado dinâmico: this[k] não é verificável',
      code: classe(FECHAR, '(this as any)[k] = 1;'),
      errors: [{ messageId: 'dynamicMutation' }],
    },
    {
      name: 'Object.assign(this, ...) não é verificável',
      code: classe(FECHAR, 'Object.assign(this, { contador: 1 });'),
      errors: [{ messageId: 'dynamicMutation' }],
    },
  ],
});
