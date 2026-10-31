# @idd/eslint-plugin

Regras ESLint do IDD. Cada método declara no próprio TSDoc o que pode alterar, e o ESLint acusa no editor e no CI qualquer mutação fora do contrato. Isso vale inclusive para código escrito por agentes de IA.

```ts
/**
 * @intent Mesa.fechar
 * @mutates fechada_em
 * @readonly itens
 */
fechar(): void {
  this.fechada_em = new Date().toISOString();
  this.chave_pix = 'outra'; // ✗ [INV-UI-04] mutação não autorizada no campo 'chave_pix'
}
```

## Regras

| Regra | Código | O que acusa |
| --- | --- | --- |
| `idd/state-mutation` | INV-UI-04 | Campo alterado sem estar em `@mutates` (`@mutates nenhum` = método puro) |
| | INV-ENCAP-01 | Campo listado em `@readonly` alterado |
| | INV-UI-05 | Mutação que a análise estática não consegue identificar: `this[k] = …`, `Object.assign(this, …)` |
| `idd/no-exposed-mutable-state` | INV-ENCAP-02 | Getter ou método público que devolve a coleção interna (`return this.itens`), permitindo alteração por fora do contrato |

A regra `state-mutation` reconhece:
- atribuição, `+=`, `++` e `delete`;
- mutadores de coleção (`push`, `splice`, `sort`, `set`, `add`, `delete`…);
- campos aninhados (`this.a.b = …`);
- apelidos de `this` (`const self = this`);
- conversões de tipo (`(this as any).x`);
- métodos em propriedade com arrow function.

Chamadas como `this.repo.delete(id)` não são acusadas quando `repo` foi declarado com um tipo que não é coleção, porque ali o método fala com um colaborador e não muta estado próprio.

## Uso (ESLint 9, config flat)

```js
// eslint.config.js
import tsParser from '@typescript-eslint/parser';
import idd from '@idd/eslint-plugin';

export default [
  { files: ['src/**/*.ts'], languageOptions: { parser: tsParser }, ...idd.configs.recommended },
];
```

## De onde vêm as anotações

- **De uma especificação da Fase 0:** `idd fase0 tsdoc <caso>` gera os blocos a partir dos contratos `.intent.yaml`.
- **De código existente:** `idd inspect <arquivo|diretório>` sugere `@intent`/`@mutates` a partir das mutações que o código já faz.

## Limites (análise estática, sem type-checker)

- Não acompanha a referência quando ela sai do método: `const xs = this.itens; xs.push(…)`, ou a passagem de `this.itens` para outra função que o altera.
- Campos sem tipo declarado nem inicializador reconhecível são tratados como possíveis coleções, por cautela.
- `// eslint-disable` e anotações erradas degradam a garantia. A fiscalização vale o que vale o contrato.
