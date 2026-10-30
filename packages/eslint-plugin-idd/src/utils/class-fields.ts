/**
 * Tipo de cada campo declarado numa classe, inferido sem type-checker (só pela anotação ou pelo inicializador):
 * - colecao: Array, T[], Map, Set, WeakMap, WeakSet, [] ou new Map()/new Set()/new Array();
 * - imutavel: ReadonlyArray, ReadonlyMap, ReadonlySet, readonly T[];
 * - outro: qualquer outro tipo declarado (ex.: um repositório ou serviço injetado).
 * Campo ausente do mapa = tipo desconhecido (a regra trata como possível coleção, por cautela).
 */
export type TipoCampo = 'colecao' | 'imutavel' | 'outro';

const COLECOES = new Set(['Array', 'Map', 'Set', 'WeakMap', 'WeakSet']);
const IMUTAVEIS = new Set(['ReadonlyArray', 'ReadonlyMap', 'ReadonlySet']);

export function tipoDaAnotacao(tipo: any): TipoCampo {
  if (!tipo) return 'outro';
  if (tipo.type === 'TSArrayType') return 'colecao';
  if (tipo.type === 'TSTypeOperator' && tipo.operator === 'readonly') return 'imutavel';
  if (tipo.type === 'TSTypeReference' && tipo.typeName?.type === 'Identifier') {
    if (COLECOES.has(tipo.typeName.name)) return 'colecao';
    if (IMUTAVEIS.has(tipo.typeName.name)) return 'imutavel';
  }
  if (tipo.type === 'TSUnionType') {
    // T[] | null: vale o tipo não nulo mais "forte"
    const tipos = tipo.types.filter((t: any) => t.type !== 'TSNullKeyword' && t.type !== 'TSUndefinedKeyword').map(tipoDaAnotacao);
    if (tipos.includes('colecao')) return 'colecao';
    if (tipos.length && tipos.every((t: TipoCampo) => t === 'imutavel')) return 'imutavel';
  }
  return 'outro';
}

function tipoDoInicializador(init: any): TipoCampo | undefined {
  if (!init) return undefined;
  if (init.type === 'ArrayExpression') return 'colecao';
  if (init.type === 'NewExpression' && init.callee?.type === 'Identifier' && COLECOES.has(init.callee.name)) return 'colecao';
  return undefined;
}

/** Campos de uma ClassBody: propriedades declaradas e propriedades de parâmetro do construtor. */
export function camposDaClasse(classBody: any): Map<string, TipoCampo> {
  const campos = new Map<string, TipoCampo>();
  for (const m of classBody.body) {
    if (m.type === 'PropertyDefinition' && m.key?.type === 'Identifier') {
      const anotacao = m.typeAnnotation?.typeAnnotation;
      const tipo = anotacao ? tipoDaAnotacao(anotacao) : tipoDoInicializador(m.value);
      if (tipo) campos.set(m.key.name, tipo);
    }
    if (m.type === 'MethodDefinition' && m.kind === 'constructor') {
      for (const p of m.value.params) {
        if (p.type === 'TSParameterProperty' && p.parameter?.type === 'Identifier') {
          campos.set(p.parameter.name, tipoDaAnotacao(p.parameter.typeAnnotation?.typeAnnotation));
        }
      }
    }
  }
  return campos;
}
