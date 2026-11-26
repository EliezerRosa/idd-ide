import { camposDaClasse, tipoDaAnotacao, type TipoCampo } from '../utils/class-fields.js';

/**
 * Um getter ou método público que devolve a própria coleção interna (return this.itens) deixa quem chama
 * alterá-la por fora (mesa.itens.push(...)), contornando qualquer contrato @mutates da classe.
 * Aceito: devolver uma cópia ([...this.itens], this.itens.slice()) ou declarar retorno somente-leitura
 * (ReadonlyArray<T>, readonly T[], ReadonlyMap, ReadonlySet).
 */
export const noExposedMutableStateRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Proíbe getters e métodos públicos de devolverem a coleção interna mutável da classe',
      recommended: true,
    },
    messages: {
      exposedMutable: "[INV-ENCAP-02] '{{member}}' devolve a coleção interna mutável '{{field}}': quem chama pode alterá-la sem passar pelo contrato. Devolva uma cópia ([...this.{{field}}]) ou declare o retorno como somente-leitura (ReadonlyArray).",
    },
    schema: [],
  },

  create(context: any) {
    const classes: Array<Map<string, TipoCampo>> = [];
    const membros: Array<{ nome: string; ativo: boolean }> = [];

    function publico(node: any): boolean {
      return node.key?.type !== 'PrivateIdentifier' && node.accessibility !== 'private' && node.accessibility !== 'protected';
    }

    function retornoSomenteLeitura(fn: any): boolean {
      const tipo = fn?.returnType?.typeAnnotation;
      return Boolean(tipo) && tipoDaAnotacao(tipo) !== 'colecao';
    }

    function entrar(node: any, fn: any): void {
      const nome = node.key?.type === 'Identifier' ? node.key.name : '(membro)';
      const ativo = node.kind !== 'constructor' && node.kind !== 'set' && publico(node) && !node.static && !retornoSomenteLeitura(fn);
      membros.push({ nome, ativo });
    }

    function campoDevolvido(arg: any): string | undefined {
      let n = arg;
      while (n && ['TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression', 'TSTypeAssertion'].includes(n.type)) n = n.expression;
      if (n?.type === 'MemberExpression' && n.object.type === 'ThisExpression' && !n.computed && n.property.type === 'Identifier') {
        return n.property.name;
      }
      return undefined;
    }

    function verificar(arg: any, noReport: any): void {
      const membro = membros.at(-1);
      if (!membro?.ativo || !arg) return;
      const campo = campoDevolvido(arg);
      if (campo && classes.at(-1)?.get(campo) === 'colecao') {
        context.report({ node: noReport, messageId: 'exposedMutable', data: { member: membro.nome, field: campo } });
      }
    }

    const ehFuncao = (v: any): boolean => v?.type === 'ArrowFunctionExpression' || v?.type === 'FunctionExpression';
    const corpoDeMembro = (node: any): boolean => node.parent?.type === 'MethodDefinition' || node.parent?.type === 'PropertyDefinition';
    function entrarInterna(node: any): void {
      if (!corpoDeMembro(node)) membros.push({ nome: '(função interna)', ativo: false });
    }
    function sairInterna(node: any): void {
      if (!corpoDeMembro(node)) membros.pop();
    }

    return {
      ClassBody(node: any) { classes.push(camposDaClasse(node)); },
      'ClassBody:exit'() { classes.pop(); },
      MethodDefinition(node: any) { entrar(node, node.value); },
      'MethodDefinition:exit'() { membros.pop(); },
      PropertyDefinition(node: any) {
        if (!ehFuncao(node.value)) return;
        entrar(node, node.value);
        // arrow com corpo de expressão: itens = () => this.itens
        if (node.value.type === 'ArrowFunctionExpression' && node.value.expression) verificar(node.value.body, node.value.body);
      },
      'PropertyDefinition:exit'(node: any) { if (ehFuncao(node.value)) membros.pop(); },
      // funções aninhadas não são o retorno do membro
      FunctionDeclaration: entrarInterna,
      FunctionExpression: entrarInterna,
      ArrowFunctionExpression: entrarInterna,
      'FunctionDeclaration:exit': sairInterna,
      'FunctionExpression:exit': sairInterna,
      'ArrowFunctionExpression:exit': sairInterna,
      ReturnStatement(node: any) { verificar(node.argument, node); },
    };
  },
};
