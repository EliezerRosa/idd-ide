// src/lib/fase0/graphify.ts — grafo de classes, métodos e mutações de estado a partir de código TypeScript.
// Implementação própria do IDD sobre a TypeScript Compiler API (ts.createSourceFile). Apesar do nome, NÃO é o
// projeto open source "graphify" do GitHub nem usa Tree-sitter. Tabelas SQL ainda são extraídas por regex.
// Suporta:
// - Classes, herança, interfaces e decoradores
// - Métodos e transições de estado circunscritas
// - Mutações em propriedades encadeadas (this.cliente.endereco.cep = ...)
// - Operadores de atribuição composta (+=, -=, *=, ||=, ??=)
// - Incrementos/decrementos unários (this.contador++, --this.tentativas)
// - Desestruturação com this ({ status: this.status } = payload)
// - Mutadores de coleções (this.itens.push, splice, pop, set, delete)
// - Apelidos de this (const self = this; s = this), conversões ((this as any).x), this['x'], delete this.x
// - this[k] e Object.assign(this, ...) são registrados como mutação "[dinâmico]" (não verificável estaticamente)
// - Métodos em propriedade com arrow function (fechar = () => { ... })
// - Ignora comentários (//, /* */) e strings template sem falsos positivos

import ts from 'typescript';
import type { DictionaryTerm } from '@idd/core';
import { analisarFramesSemanticos, calcularShalaPragmatico, type ResultadoShala, type DiagnosticoFrame } from './shala.ts';

export type NodeKind = 'class' | 'method' | 'function' | 'table' | 'property' | 'endpoint';

export interface GraphNode {
  id: string;
  name: string;
  kind: NodeKind;
  file?: string;
  line?: number;
  details?: string;
  fields?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: 'calls' | 'mutates' | 'reads' | 'contains' | 'references';
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    classes: number;
    methods: number;
    tables: number;
    tokensBrutosEstimados: number;
    tokensGrafoEstimados: number;
    economiaTokensPercent: number;
  };
}

export interface MutationRecord {
  line: number;
  column: number;
  method: string;
  className: string;
  field: string;
  fullPath: string;
  operator: string;
}

export interface AstAnalysisResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  mutations: MutationRecord[];
  mutationsByMethod: Map<string, MutationRecord[]>;
}

export interface CodigoIngestionResult {
  grafo: KnowledgeGraph;
  dicionario: DictionaryTerm[];
  intencoesSugeridas: string[];
  invariantesSugeridas: string[];
  shala: ResultadoShala;
  frames: DiagnosticoFrame[];
  alertasCodigo: string[];
  mutacoesDetalhadas: MutationRecord[];
}

/**
 * Extrai o caminho canônico a partir de uma expressão referenciando `this`.
 * Ex: `this.status` -> "status"
 * Ex: `this.cliente.endereco.cep` -> "cliente.endereco.cep"
 */
export const CAMPO_DINAMICO = '[dinâmico]';

/** Remove invólucros que só mudam o tipo ou a forma: (x), x as T, <T>x, x!, x satisfies T. */
function desembrulhar(node: ts.Expression): ts.Expression {
  let n = node;
  while (
    ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)
    || ts.isNonNullExpression(n) || ts.isSatisfiesExpression(n)
  ) n = n.expression;
  return n;
}

/** `this` ou um apelido local dele (const self = this). */
export function ehThis(node: ts.Expression, apelidos: ReadonlySet<string> = new Set()): boolean {
  const n = desembrulhar(node);
  return n.kind === ts.SyntaxKind.ThisKeyword || (ts.isIdentifier(n) && apelidos.has(n.text));
}

export function extrairCaminhoThis(node: ts.Expression, apelidos: ReadonlySet<string> = new Set()): string | null {
  const n = desembrulhar(node);
  if (ts.isPropertyAccessExpression(n)) {
    if (ehThis(n.expression, apelidos)) return n.name.text;
    const caminhoPai = extrairCaminhoThis(n.expression, apelidos);
    return caminhoPai ? `${caminhoPai}.${n.name.text}` : null;
  }
  if (ts.isElementAccessExpression(n)) {
    const arg = n.argumentExpression;
    const literal = ts.isStringLiteralLike(arg) ? arg.text : null;
    if (ehThis(n.expression, apelidos)) return literal ?? CAMPO_DINAMICO;
    const caminhoPai = extrairCaminhoThis(n.expression, apelidos);
    return caminhoPai ? `${caminhoPai}.${literal ?? '[índice]'}` : null;
  }
  return null;
}

const COLECOES = new Set(['Array', 'Map', 'Set', 'WeakMap', 'WeakSet']);

/**
 * Campos da classe declarados com tipo que NÃO é coleção (ex.: repositório injetado). Chamar delete/set/add
 * neles é falar com um colaborador, não mutar estado próprio. Campos sem tipo conhecido ficam de fora (cautela).
 */
export function camposNaoColecao(cls: ts.ClassDeclaration): Set<string> {
  const out = new Set<string>();
  const ehColecao = (t: ts.TypeNode): boolean => {
    if (ts.isArrayTypeNode(t)) return true;
    if (ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName)) return COLECOES.has(t.typeName.text);
    if (ts.isUnionTypeNode(t)) return t.types.some(ehColecao);
    return false;
  };
  for (const m of cls.members) {
    if (ts.isPropertyDeclaration(m) && ts.isIdentifier(m.name) && m.type && !ehColecao(m.type)) out.add(m.name.text);
    if (ts.isConstructorDeclaration(m)) {
      for (const prm of m.parameters) {
        const ehPropriedade = prm.modifiers?.some(md =>
          [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(md.kind));
        if (ehPropriedade && ts.isIdentifier(prm.name) && prm.type && !ehColecao(prm.type)) out.add(prm.name.text);
      }
    }
  }
  return out;
}

const ESCRITORES_REFLEXIVOS: Record<string, Set<string>> = {
  Object: new Set(['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf']),
  Reflect: new Set(['set', 'defineProperty', 'deleteProperty', 'setPrototypeOf']),
};

/**
 * Varredor determinístico da AST do TypeScript usando a Compiler API oficial.
 */
export function extrairAstTypeScript(codigoFonte: string, nomeArquivo = 'fonte.ts'): AstAnalysisResult {
  const sourceFile = ts.createSourceFile(
    nomeArquivo,
    codigoFonte,
    ts.ScriptTarget.Latest,
    true, // setParentNodes
    ts.ScriptKind.TS
  );

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const mutations: MutationRecord[] = [];
  const mutationsByMethod = new Map<string, MutationRecord[]>();

  const ARRAY_MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);
  /** apelidos de this no método em inspeção */
  let apelidos = new Set<string>();
  /** campos da classe atual que são colaboradores (não coleções) */
  let colaboradores = new Set<string>();

  function registrarMutacao(
    fullPath: string,
    op: string,
    posNode: ts.Node,
    className: string,
    methodName: string
  ) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(posNode.getStart(sourceFile));
    const baseField = fullPath.split('.')[0];
    const rec: MutationRecord = {
      line: line + 1,
      column: character + 1,
      method: methodName,
      className,
      field: baseField,
      fullPath,
      operator: op,
    };

    mutations.push(rec);

    const methodKey = className ? `${className}.${methodName}` : methodName;
    if (!mutationsByMethod.has(methodKey)) {
      mutationsByMethod.set(methodKey, []);
    }
    mutationsByMethod.get(methodKey)!.push(rec);

    // Registra nós de propriedade e arestas de mutação no Grafo
    const propId = className ? `prop:${className}.${baseField}` : `prop:${baseField}`;
    if (!nodes.some(n => n.id === propId)) {
      nodes.push({
        id: propId,
        name: baseField,
        kind: 'property',
        details: className ? `Atributo de ${className}` : 'Atributo',
      });
    }

    const sourceId = className ? `class:${className}` : `method:${methodKey}`;
    if (!edges.some(e => e.source === sourceId && e.target === propId && e.relation === 'mutates')) {
      edges.push({
        source: sourceId,
        target: propId,
        relation: 'mutates',
      });
    }
  }

  function inspecionarNoDeExpressao(
    exprNode: ts.Node,
    className: string,
    methodName: string
  ) {
    // 1. Atribuições binárias: this.campo = valor, this.campo += 1, this.a ||= b, etc.
    if (ts.isBinaryExpression(exprNode)) {
      const isAssignOp =
        exprNode.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
        exprNode.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken ||
        exprNode.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken ||
        exprNode.operatorToken.kind === ts.SyntaxKind.AsteriskEqualsToken ||
        exprNode.operatorToken.kind === ts.SyntaxKind.SlashEqualsToken ||
        exprNode.operatorToken.kind === ts.SyntaxKind.BarBarEqualsToken ||
        exprNode.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
        exprNode.operatorToken.kind === ts.SyntaxKind.QuestionQuestionEqualsToken;

      // Apelido tardio: s = this
      if (exprNode.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(exprNode.left) && ehThis(exprNode.right, apelidos)) {
        apelidos.add(exprNode.left.text);
      } else if (isAssignOp) {
        // Atribuição direta ou encadeada: this.status = ... ou this.a.b = ...
        const caminho = extrairCaminhoThis(exprNode.left, apelidos);
        if (caminho) {
          registrarMutacao(caminho, exprNode.operatorToken.getText(sourceFile), exprNode, className, methodName);
        } else if (ts.isObjectLiteralExpression(exprNode.left)) {
          // Desestruturação em objeto: ({ status: this.status } = payload)
          for (const prop of exprNode.left.properties) {
            if (ts.isPropertyAssignment(prop)) {
              const destCaminho = extrairCaminhoThis(prop.initializer, apelidos);
              if (destCaminho) {
                registrarMutacao(destCaminho, '=', prop, className, methodName);
              }
            } else if (ts.isShorthandPropertyAssignment(prop)) {
              // Not this direct
            }
          }
        } else if (ts.isArrayLiteralExpression(exprNode.left)) {
          // Desestruturação em array: [this.itemA, this.itemB] = array
          for (const el of exprNode.left.elements) {
            const destCaminho = extrairCaminhoThis(el, apelidos);
            if (destCaminho) {
              registrarMutacao(destCaminho, '=', el, className, methodName);
            }
          }
        }
      }
    }

    // Apelido: const self = this
    if (ts.isVariableDeclaration(exprNode) && ts.isIdentifier(exprNode.name) && exprNode.initializer && ehThis(exprNode.initializer, apelidos)) {
      apelidos.add(exprNode.name.text);
    }

    // delete this.cache
    if (ts.isDeleteExpression(exprNode)) {
      const caminho = extrairCaminhoThis(exprNode.expression, apelidos);
      if (caminho) registrarMutacao(caminho, 'delete', exprNode, className, methodName);
    }

    // 2. Incremento / Decremento Unário: this.contador++ ou --this.contador
    if (ts.isPrefixUnaryExpression(exprNode) || ts.isPostfixUnaryExpression(exprNode)) {
      const op = exprNode.operator === ts.SyntaxKind.PlusPlusToken ? '++' : exprNode.operator === ts.SyntaxKind.MinusMinusToken ? '--' : '';
      if (op) {
        const caminho = extrairCaminhoThis(exprNode.operand, apelidos);
        if (caminho) {
          registrarMutacao(caminho, op, exprNode, className, methodName);
        }
      }
    }

    // 3. Chamadas mutadoras em coleções: this.itens.push(...), this.itens.splice(...)
    if (ts.isCallExpression(exprNode)) {
      const alvoReflexivo = exprNode.arguments[0];
      if (
        ts.isPropertyAccessExpression(exprNode.expression) && ts.isIdentifier(exprNode.expression.expression)
        && ESCRITORES_REFLEXIVOS[exprNode.expression.expression.text]?.has(exprNode.expression.name.text) && alvoReflexivo
      ) {
        // Object.assign(this, ...) escreve campos que a análise estática não conhece
        const caminho = ehThis(alvoReflexivo, apelidos) ? CAMPO_DINAMICO : extrairCaminhoThis(alvoReflexivo, apelidos);
        if (caminho) registrarMutacao(caminho, exprNode.expression.getText(sourceFile), exprNode, className, methodName);
      } else if (ts.isPropertyAccessExpression(exprNode.expression)) {
        const metodoNome = exprNode.expression.name.text;
        const receptor = exprNode.expression.expression;
        const ehColaborador = ts.isPropertyAccessExpression(receptor) && ehThis(receptor.expression, apelidos)
          && colaboradores.has(receptor.name.text);
        if (ARRAY_MUTATORS.has(metodoNome) && !ehColaborador) {
          const caminho = extrairCaminhoThis(exprNode.expression.expression, apelidos);
          if (caminho) {
            registrarMutacao(`${caminho}.${metodoNome}()`, `.${metodoNome}()`, exprNode, className, methodName);
          }
        } else {
          // Detectar chamadas entre métodos: this.outroMetodo()
          if (exprNode.expression.expression.kind === ts.SyntaxKind.ThisKeyword && className) {
            const targetMethod = exprNode.expression.name.text;
            edges.push({
              source: `class:${className}`,
              target: `method:${className}.${targetMethod}`,
              relation: 'calls',
            });
          }
        }
      }
    }

    ts.forEachChild(exprNode, child => inspecionarNoDeExpressao(child, className, methodName));
  }

  function visitarNo(node: ts.Node, currentClass = '') {
    if (ts.isClassDeclaration(node)) {
      const className = node.name?.text || 'AnonymousClass';
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

      let baseClass = '';
      if (node.heritageClauses) {
        for (const hc of node.heritageClauses) {
          if (hc.token === ts.SyntaxKind.ExtendsKeyword && hc.types.length > 0) {
            baseClass = hc.types[0].expression.getText(sourceFile);
          }
        }
      }

      nodes.push({
        id: `class:${className}`,
        name: className,
        kind: 'class',
        file: nomeArquivo,
        line: line + 1,
        details: baseClass ? `Herda de ${baseClass}` : 'Entidade de domínio',
      });

      if (baseClass) {
        edges.push({
          source: `class:${className}`,
          target: `class:${baseClass}`,
          relation: 'references',
        });
      }

      // Visita membros da classe
      colaboradores = camposNaoColecao(node);
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
          const methodName = ts.isConstructorDeclaration(member) ? 'constructor' : member.name.getText(sourceFile);
          const methodId = `${className}.${methodName}`;
          const { line: mLine } = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));

          nodes.push({
            id: `method:${methodId}`,
            name: methodName,
            kind: 'method',
            file: nomeArquivo,
            line: mLine + 1,
            details: `Método de ${className}`,
          });

          edges.push({
            source: `class:${className}`,
            target: `method:${methodId}`,
            relation: 'contains',
          });

          // Inspeciona corpo do método para mutações
          if (member.body) {
            apelidos = new Set();
            inspecionarNoDeExpressao(member.body, className, methodName);
          }
        } else if (
          ts.isPropertyDeclaration(member) && member.initializer
          && (ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer))
        ) {
          // Método em propriedade: fechar = () => { ... }
          const methodName = member.name.getText(sourceFile);
          const { line: mLine } = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));
          nodes.push({ id: `method:${className}.${methodName}`, name: methodName, kind: 'method', file: nomeArquivo, line: mLine + 1, details: `Método de ${className}` });
          edges.push({ source: `class:${className}`, target: `method:${className}.${methodName}`, relation: 'contains' });
          apelidos = new Set();
          inspecionarNoDeExpressao(member.initializer.body, className, methodName);
        } else if (ts.isPropertyDeclaration(member)) {
          const propName = member.name.getText(sourceFile);
          const propId = `prop:${className}.${propName}`;
          if (!nodes.some(n => n.id === propId)) {
            nodes.push({
              id: propId,
              name: propName,
              kind: 'property',
              details: `Atributo de ${className}`,
            });
          }
        }
      }
      return;
    }

    // Funções livres fora de classe
    if (ts.isFunctionDeclaration(node) && node.name) {
      const funcName = node.name.text;
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      nodes.push({
        id: `method:${funcName}`,
        name: funcName,
        kind: 'function',
        file: nomeArquivo,
        line: line + 1,
        details: 'Função solta',
      });
      if (node.body) {
        inspecionarNoDeExpressao(node.body, '', funcName);
      }
      return;
    }

    ts.forEachChild(node, child => visitarNo(child, currentClass));
  }

  visitarNo(sourceFile);

  return {
    nodes,
    edges,
    mutations,
    mutationsByMethod,
  };
}

/**
 * Analisador estático determinístico que extrai nós, arestas, mutações e invariantes
 * combinando a TypeScript Compiler API nativa e suporte a esquemas SQL.
 */
export function graphificarCodigo(codigoFonte: string, nomeArquivo = 'legado.ts'): CodigoIngestionResult {
  const alertas: string[] = [];

  // 1. Extração determinística de AST via TypeScript Compiler API
  const astResult = extrairAstTypeScript(codigoFonte, nomeArquivo);
  const nodes = [...astResult.nodes];
  const edges = [...astResult.edges];

  // 2. Extração de tabelas SQL (se houver scripts SQL ou DDL embutidos)
  const sqlTableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+)\s*\(([^)]+)\)/gi;
  let match;
  while ((match = sqlTableRe.exec(codigoFonte)) !== null) {
    const tableName = match[1];
    nodes.push({
      id: `table:${tableName}`,
      name: tableName,
      kind: 'table',
      file: nomeArquivo,
      details: 'Tabela relacional persistida',
    });
  }

  // 3. Métricas de economia de tokens
  const tokensBrutos = Math.max(1, Math.ceil(codigoFonte.length / 4));
  const jsonGrafo = JSON.stringify({ nodes, edges });
  const tokensGrafo = Math.ceil(jsonGrafo.length / 4);
  // Estimativa grosseira por caracteres; pode ser negativa (grafo maior que o código). Sem piso nem teto.
  const economia = Math.round(((tokensBrutos - tokensGrafo) / tokensBrutos) * 100);

  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    classes: nodes.filter(n => n.kind === 'class').length,
    methods: nodes.filter(n => n.kind === 'method' || n.kind === 'function').length,
    tables: nodes.filter(n => n.kind === 'table').length,
    tokensBrutosEstimados: tokensBrutos,
    tokensGrafoEstimados: tokensGrafo,
    economiaTokensPercent: economia,
  };

  const grafo: KnowledgeGraph = { nodes, edges, stats };

  // 4. Mapeamento para Dicionário Ubíquo (DDD) a partir das classes e tabelas
  const dicionario: DictionaryTerm[] = [];
  for (const node of nodes.filter(n => n.kind === 'class' || n.kind === 'table')) {
    dicionario.push({
      term: node.name,
      definition: `Entidade de domínio descoberta a partir de ${node.kind} no código ${node.file || ''}`,
      kind: 'entity',
      aliases: [],
      forbidden: [],
    });
  }

  // 5. Sugestão de Intenções em EARS a partir dos métodos
  const intencoesSugeridas: string[] = [];
  const invariantesSugeridas: string[] = [];

  for (const node of nodes.filter(n => n.kind === 'method')) {
    intencoesSugeridas.push(`- O sistema deve executar [[${node.name}]] conforme as regras de negócio circunscritas.`);
  }

  // Detectar se há divisões matemáticas de rateio no código
  const temDivisao = /\/\s*([a-zA-Z0-9_]+(\.length)?)/.test(codigoFonte);
  const temSomaZero = /soma.*===.*total|diferenca.*===.*0/.test(codigoFonte);

  if (temDivisao && !temSomaZero) {
    alertas.push(
      '⚠️ Operação de divisão financeira detectada no código sem garantia de Soma Zero: centavos residuais podem ser descartados silenciosamente!'
    );
    invariantesSugeridas.push(
      '- **INV-001** [cálculo] A soma de todas as partes calculadas deve ser exatamente igual ao total original, com diferença de zero centavos.'
    );
  }

  // 6. Submeter ao motor SHALA
  const textoParaShala = `${codigoFonte}\n\n${intencoesSugeridas.join('\n')}\n\n${invariantesSugeridas.join('\n')}`;
  const frames = analisarFramesSemanticos(textoParaShala);
  const shala = calcularShalaPragmatico(
    intencoesSugeridas.join('\n'),
    invariantesSugeridas.join('\n'),
    frames
  );

  return {
    grafo,
    dicionario,
    intencoesSugeridas,
    invariantesSugeridas,
    shala,
    frames,
    alertasCodigo: alertas,
    mutacoesDetalhadas: astResult.mutations,
  };
}
