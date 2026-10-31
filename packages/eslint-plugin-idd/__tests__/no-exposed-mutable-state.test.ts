import { describe, it, afterAll } from 'vitest';
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { noExposedMutableStateRule } from '../src/rules/no-exposed-mutable-state.js';

(RuleTester as any).describe = describe;
(RuleTester as any).it = it;
(RuleTester as any).afterAll = afterAll;

const tester = new RuleTester({ languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module' } });

const classe = (membros: string): string => `
class Mesa {
  private itens: Item[] = [];
  private consumos = new Map<string, number>();
  private nome: string = 'm';
  private repo: Repositorio;
${membros}
}`;

tester.run('no-exposed-mutable-state', noExposedMutableStateRule as any, {
  valid: [
    { name: 'getter devolve cópia', code: classe('  get lista(): Item[] { return [...this.itens]; }') },
    { name: 'retorno declarado como ReadonlyArray', code: classe('  get lista(): ReadonlyArray<Item> { return this.itens; }') },
    { name: 'retorno declarado como readonly T[]', code: classe('  lista(): readonly Item[] { return this.itens; }') },
    { name: 'campo que não é coleção', code: classe('  get titulo() { return this.nome; }') },
    { name: 'membro privado pode devolver a referência', code: classe('  private interno() { return this.itens; }') },
    { name: 'retorno de função interna não é o retorno do membro', code: classe('  total() { const f = () => { return this.itens; }; return f().length; }') },
    { name: 'colaborador não é coleção', code: classe('  get repositorio() { return this.repo; }') },
  ],
  invalid: [
    {
      name: 'getter devolve o array interno',
      code: classe('  get lista() { return this.itens; }'),
      errors: [{ messageId: 'exposedMutable', data: { member: 'lista', field: 'itens' } }],
    },
    {
      name: 'método público devolve o Map interno, mesmo com conversão de tipo',
      code: classe('  todos() { return this.consumos as Map<string, number>; }'),
      errors: [{ messageId: 'exposedMutable', data: { member: 'todos', field: 'consumos' } }],
    },
    {
      name: 'retorno anotado como coleção mutável',
      code: classe('  lista(): Item[] { return this.itens; }'),
      errors: [{ messageId: 'exposedMutable' }],
    },
    {
      name: 'arrow em propriedade com corpo de expressão',
      code: classe('  lista = () => this.itens;'),
      errors: [{ messageId: 'exposedMutable', data: { member: 'lista', field: 'itens' } }],
    },
  ],
});
