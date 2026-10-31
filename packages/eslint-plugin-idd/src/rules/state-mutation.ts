import { parseTsDocContract, type IdcContract } from '../utils/tsdoc-parser.js';
import { camposDaClasse, type TipoCampo } from '../utils/class-fields.js';

const MUTATOR_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);

/** Funções globais que escrevem em propriedades arbitrárias do primeiro argumento. */
const REFLECTIVE_WRITERS: Record<string, Set<string>> = {
  Object: new Set(['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf']),
  Reflect: new Set(['set', 'defineProperty', 'deleteProperty', 'setPrototypeOf']),
};

/** Invólucros que só mudam o tipo ou a forma da expressão: (this as any), this!, <any>this, this satisfies T, a?.b. */
const WRAPPERS = new Set(['TSAsExpression', 'TSNonNullExpression', 'TSTypeAssertion', 'TSSatisfiesExpression', 'ChainExpression']);

function unwrap(node: any): any {
  while (node && WRAPPERS.has(node.type)) node = node.expression;
  return node;
}

type Alvo = { field: string; node: any } | { dynamic: true; node: any };

export const stateMutationRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Fiscaliza mutações de estado em métodos TypeScript baseando-se em contratos in-tree TSDoc (@intent, @mutates, @readonly)',
      category: 'Domain-Driven Design / State Integrity',
      recommended: true,
    },
    messages: {
      readOnlyViolation: "[INV-ENCAP-01] O campo '{{field}}' é estritamente somente-leitura neste contrato ({{readOnlyList}}).",
      unauthorizedMutation: "[INV-UI-04] Mutação não autorizada no campo '{{field}}' dentro de @intent '{{intent}}'. Adicione @mutates {{field}} para autorizar expressamente.",
      dynamicMutation: "[INV-UI-05] Mutação de this que a análise estática não consegue verificar dentro de @intent '{{intent}}' (acesso computado ou escrita reflexiva). Use um nome de campo literal.",
    },
    schema: [],
  },

  create(context: any) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    let currentContract: IdcContract | null = null;
    /** identificadores locais que apontam para this (const self = this) */
    let thisAliases = new Set<string>();
    /** pilha de métodos (o contrato do método externo volta a valer ao sair de um interno) */
    const pilha: Array<{ contrato: IdcContract | null; apelidos: Set<string> }> = [];
    /** pilha de classes: tipo de cada campo declarado */
    const classes: Array<Map<string, TipoCampo>> = [];

    function entrarMetodo(node: any): void {
      pilha.push({ contrato: currentContract, apelidos: thisAliases });
      const parsed = parseTsDocContract(getCommentsBefore(node));
      const temContrato = parsed.intent || parsed.mutates.length > 0 || parsed.readOnly.length > 0 || parsed.mutatesNothing;
      currentContract = temContrato ? parsed : null;
      thisAliases = new Set();
    }

    function sairMetodo(): void {
      const anterior = pilha.pop();
      currentContract = anterior?.contrato ?? null;
      thisAliases = anterior?.apelidos ?? new Set();
    }

    /** Método em propriedade: fechar = () => { ... } */
    function ehMetodoEmPropriedade(node: any): boolean {
      return node.value?.type === 'ArrowFunctionExpression' || node.value?.type === 'FunctionExpression';
    }

    function getCommentsBefore(node: any): string {
      const comments = sourceCode.getCommentsBefore ? sourceCode.getCommentsBefore(node) : [];
      if (comments && comments.length > 0) {
        return comments.map((c: any) => c.value).join('\n');
      }
      return '';
    }

    function isThis(node: any): boolean {
      const n = unwrap(node);
      return n?.type === 'ThisExpression' || (n?.type === 'Identifier' && thisAliases.has(n.name));
    }

    /**
     * Campo de this na raiz de uma expressão-alvo de mutação:
     * this.a = 1 → a; this.a.b.c = 1 → a; this['a'] = 1 → a; this[k] = 1 → dinâmico.
     */
    function rootField(target: any): Alvo | null {
      let m = unwrap(target);
      while (m && m.type === 'MemberExpression') {
        if (isThis(m.object)) {
          if (!m.computed && m.property.type === 'Identifier') return { field: m.property.name, node: m.property };
          if (m.property.type === 'Literal' && typeof m.property.value === 'string') return { field: m.property.value, node: m.property };
          return { dynamic: true, node: m };
        }
        m = unwrap(m.object);
      }
      return null;
    }

    function report(alvo: Alvo | null): void {
      if (!currentContract || !alvo) return;
      const intent = currentContract.intent || 'anônimo';
      if ('dynamic' in alvo) {
        context.report({ node: alvo.node, messageId: 'dynamicMutation', data: { intent } });
        return;
      }
      const { field, node } = alvo;
      if (currentContract.readOnly.includes(field)) {
        context.report({ node, messageId: 'readOnlyViolation', data: { field, readOnlyList: currentContract.readOnly.join(', ') } });
      } else if (!currentContract.mutates.includes(field)) {
        context.report({ node, messageId: 'unauthorizedMutation', data: { field, intent } });
      }
    }

    return {
      ClassBody(node: any) { classes.push(camposDaClasse(node)); },
      'ClassBody:exit'() { classes.pop(); },

      MethodDefinition: entrarMetodo,
      'MethodDefinition:exit': sairMetodo,
      PropertyDefinition(node: any) { if (ehMetodoEmPropriedade(node)) entrarMetodo(node); },
      'PropertyDefinition:exit'(node: any) { if (ehMetodoEmPropriedade(node)) sairMetodo(); },

      // Apelido: const self = this; (também const self = this as any)
      VariableDeclarator(node: any) {
        if (!currentContract) return;
        if (node.id.type === 'Identifier' && node.init && isThis(node.init)) thisAliases.add(node.id.name);
      },

      // Atribuições: this.campo = v, self.campo += v, this.a.b = v, this['campo'] = v
      AssignmentExpression(node: any) {
        if (!currentContract) return;
        if (node.left.type === 'Identifier' && isThis(node.right)) {
          thisAliases.add(node.left.name); // let s; s = this;
          return;
        }
        report(rootField(node.left));
      },

      // this.contador++, --self.tentativas
      UpdateExpression(node: any) {
        if (!currentContract) return;
        report(rootField(node.argument));
      },

      // delete this.cache
      UnaryExpression(node: any) {
        if (!currentContract || node.operator !== 'delete') return;
        report(rootField(node.argument));
      },

      CallExpression(node: any) {
        if (!currentContract) return;
        const callee = unwrap(node.callee);
        if (callee?.type !== 'MemberExpression') return;
        const metodo = callee.computed ? undefined : callee.property.name;

        // Object.assign(this, ...), Reflect.set(this, ...)
        const global = unwrap(callee.object);
        if (global?.type === 'Identifier' && metodo && REFLECTIVE_WRITERS[global.name]?.has(metodo)) {
          if (node.arguments[0] && isThis(node.arguments[0])) report({ dynamic: true, node });
          else report(rootField(node.arguments[0]));
          return;
        }

        // this.itens.push(x), this.config.lista.push(x)
        if (metodo && MUTATOR_METHODS.has(metodo)) {
          // this.repo.delete(id) num campo declarado com tipo que não é coleção (ex.: repositório injetado)
          // é chamada a um colaborador, não mutação de estado próprio
          const receptor = unwrap(callee.object);
          if (receptor?.type === 'MemberExpression' && isThis(receptor.object) && !receptor.computed) {
            const tipo = classes.at(-1)?.get(receptor.property.name);
            if (tipo === 'outro') return;
          }
          report(rootField(callee.object));
        }
      },
    };
  },
};
