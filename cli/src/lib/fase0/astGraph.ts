// src/lib/fase0/astGraph.ts — Extrator AST de classes, métodos, acessores e grafo determinístico via TypeScript Compiler API.
//
// NOTA ARQUITETURAL E FONTE CONCEITUAL (I11 / I12):
// O repositório open source externo "graphify" (https://github.com/vsrc/safishamsi-graphify.git / Graphify-Labs)
// define extração de Code Knowledge Graphs para indexação topológica macro via Tree-sitter.
// Este módulo interno do IDD atua exclusivamente como micro-auditor estático determinístico de mutações
// de estado sobre a TypeScript Compiler API oficial (ts.createSourceFile), sem uso de Tree-sitter ou chamadas de IA.
// A renomeação de 'graphify.ts' para 'astGraph.ts' elimina a homonímia e desambigua categoricamente
// as duas ferramentas, adotando modelo formal de nós e arestas com ordenação determinística e custo zero de IA.

import ts from 'typescript';
import type { DictionaryTerm } from '@idd/core';
import { analisarFramesSemanticos, calcularShalaPragmatico, type ResultadoShala, type DiagnosticoFrame } from './shala.ts';

// ── Tipos Formais do Grafo (I11) ──────────────────────────────────

export type GraphNodeTipo = 'Class' | 'Method' | 'Accessor' | 'Property';
export type NodeKind = 'class' | 'method' | 'function' | 'table' | 'property' | 'endpoint';

export interface GraphNode {
  id: string;
  tipo: GraphNodeTipo;
  nome: string;
  arquivo: string;
  linha: number;
  // Campos para retrocompatibilidade e contexto adicional
  name?: string;
  kind?: NodeKind;
  file?: string;
  line?: number;
  details?: string;
  fields?: string[];
}

export type GraphEdgeTipo = 'CALLS' | 'READS' | 'WRITES' | 'EXTENDS';

export interface GraphEdge {
  origem: string;
  destino: string;
  tipo: GraphEdgeTipo;
  // Campos para retrocompatibilidade
  source?: string;
  target?: string;
  relation?: 'calls' | 'mutates' | 'reads' | 'contains' | 'references';
}

export interface AstGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
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
  astGraph: AstGraph;
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
 * Identificador de mutações cujo campo não pode ser inferido estaticamente em tempo de compilação.
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

/** Verifica se a expressão representa `this` ou um apelido local conhecido. */
export function ehThis(node: ts.Expression, apelidos: ReadonlySet<string> = new Set()): boolean {
  const n = desembrulhar(node);
  return n.kind === ts.SyntaxKind.ThisKeyword || (ts.isIdentifier(n) && apelidos.has(n.text));
}

/**
 * Extrai o caminho canônico a partir de uma expressão referenciando `this`.
 * Ex: `this.status` -> "status"
 * Ex: `this.cliente.endereco.cep` -> "cliente.endereco.cep"
 */
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
 * Extrai classes, métodos, acessores (get/set), propriedades, chamadas e mutações de estado.
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
  /** getters da classe atual */
  let gettersDaClasseAtual = new Set<string>();

  function adicionarOuAtualizarNo(no: GraphNode) {
    const idx = nodes.findIndex(n => n.id === no.id);
    if (idx >= 0) {
      nodes[idx] = { ...nodes[idx], ...no };
    } else {
      nodes.push(no);
    }
  }

  function adicionarAresta(aresta: GraphEdge) {
    const existe = edges.some(
      e => e.origem === aresta.origem && e.destino === aresta.destino && e.tipo === aresta.tipo
    );
    if (!existe) {
      edges.push(aresta);
    }
  }

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

    // Registra nós de propriedade e arestas de mutação (WRITES) no Grafo
    const propId = className ? `prop:${className}.${baseField}` : `prop:${baseField}`;
    adicionarOuAtualizarNo({
      id: propId,
      tipo: 'Property',
      nome: baseField,
      arquivo: nomeArquivo,
      linha: line + 1,
      name: baseField,
      kind: 'property',
      file: nomeArquivo,
      line: line + 1,
      details: className ? `Atributo de ${className}` : 'Atributo',
    });

    // Aresta tipada formal: WRITES a partir do método/acessor que originou a mutação
    const methodNodeId = `method:${methodKey}`;
    adicionarAresta({
      origem: methodNodeId,
      destino: propId,
      tipo: 'WRITES',
      source: methodNodeId,
      target: propId,
      relation: 'mutates',
    });

    // Aresta legada de classe para propriedade (para compatibilidade com KnowledgeGraph)
    if (className) {
      const classNodeId = `class:${className}`;
      if (!edges.some(e => e.source === classNodeId && e.target === propId)) {
        edges.push({
          origem: classNodeId,
          destino: propId,
          tipo: 'WRITES',
          source: classNodeId,
          target: propId,
          relation: 'contains',
        });
      }
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
          if (ehThis(exprNode.expression.expression, apelidos) && className) {
            const targetMethod = exprNode.expression.name.text;
            const sourceId = `method:${className}.${methodName}`;
            const targetId = `method:${className}.${targetMethod}`;
            adicionarAresta({
              origem: sourceId,
              destino: targetId,
              tipo: 'CALLS',
              source: `class:${className}`,
              target: targetId,
              relation: 'calls',
            });
          }
        }
      }
    }

    // 4. Leituras de propriedades dentro de métodos normais (READS)
    if (ts.isPropertyAccessExpression(exprNode) || ts.isElementAccessExpression(exprNode)) {
      const parent = exprNode.parent;
      const isCallTarget = ts.isCallExpression(parent) && parent.expression === exprNode;
      const isAssignTarget = ts.isBinaryExpression(parent) && parent.left === exprNode && (
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
        parent.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken ||
        parent.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken ||
        parent.operatorToken.kind === ts.SyntaxKind.AsteriskEqualsToken ||
        parent.operatorToken.kind === ts.SyntaxKind.SlashEqualsToken ||
        parent.operatorToken.kind === ts.SyntaxKind.BarBarEqualsToken ||
        parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
        parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionEqualsToken
      );
      if (!isCallTarget && !isAssignTarget) {
        const caminho = extrairCaminhoThis(exprNode, apelidos);
        if (caminho && caminho !== CAMPO_DINAMICO) {
          const baseField = caminho.split('.')[0];
          const sourceId = className ? `method:${className}.${methodName}` : `method:${methodName}`;

          if (className && gettersDaClasseAtual.has(baseField)) {
            // Acesso a getter da classe: invocação funcional
            const getterId = `method:${className}.${baseField}`;
            adicionarAresta({
              origem: sourceId,
              destino: getterId,
              tipo: 'CALLS',
              source: sourceId,
              target: getterId,
              relation: 'calls',
            });
          } else {
            const propId = className ? `prop:${className}.${baseField}` : `prop:${baseField}`;
            adicionarOuAtualizarNo({
              id: propId,
              tipo: 'Property',
              nome: baseField,
              arquivo: nomeArquivo,
              linha: 0,
              name: baseField,
              kind: 'property',
              details: className ? `Atributo de ${className}` : 'Atributo',
            });
            adicionarAresta({
              origem: sourceId,
              destino: propId,
              tipo: 'READS',
              source: sourceId,
              target: propId,
              relation: 'reads',
            });
          }
        }
      }
    }

    ts.forEachChild(exprNode, child => inspecionarNoDeExpressao(child, className, methodName));
  }

  /**
   * Inspeciona o corpo de um acessor get: mapeia operações de leitura ('READS') e dependências
   * de chamadas funcionais ('CALLS'), sem registrar nenhuma mutação de estado.
   */
  function inspecionarLeiturasEChamadas(
    exprNode: ts.Node,
    className: string,
    methodName: string
  ) {
    const methodId = `${className}.${methodName}`;
    const sourceId = `method:${methodId}`;

    // Apelidos locais de this dentro do getter
    if (ts.isVariableDeclaration(exprNode) && ts.isIdentifier(exprNode.name) && exprNode.initializer && ehThis(exprNode.initializer, apelidos)) {
      apelidos.add(exprNode.name.text);
    }
    if (ts.isBinaryExpression(exprNode) && exprNode.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(exprNode.left) && ehThis(exprNode.right, apelidos)) {
      apelidos.add(exprNode.left.text);
    }

    // Leitura de propriedade de this: this.campo ou this.campo.subcampo
    if (ts.isPropertyAccessExpression(exprNode) || ts.isElementAccessExpression(exprNode)) {
      const parent = exprNode.parent;
      const isCallTarget = ts.isCallExpression(parent) && parent.expression === exprNode;
      if (!isCallTarget) {
        const caminho = extrairCaminhoThis(exprNode, apelidos);
        if (caminho && caminho !== CAMPO_DINAMICO) {
          const baseField = caminho.split('.')[0];
          if (className && gettersDaClasseAtual.has(baseField) && baseField !== methodName) {
            const getterId = `method:${className}.${baseField}`;
            adicionarAresta({
              origem: sourceId,
              destino: getterId,
              tipo: 'CALLS',
              source: sourceId,
              target: getterId,
              relation: 'calls',
            });
          } else {
            const propId = className ? `prop:${className}.${baseField}` : `prop:${baseField}`;
            adicionarOuAtualizarNo({
              id: propId,
              tipo: 'Property',
              nome: baseField,
              arquivo: nomeArquivo,
              linha: 0,
              name: baseField,
              kind: 'property',
              details: className ? `Atributo de ${className}` : 'Atributo',
            });
            adicionarAresta({
              origem: sourceId,
              destino: propId,
              tipo: 'READS',
              source: sourceId,
              target: propId,
              relation: 'reads',
            });
          }
        }
      }
    }

    // Chamadas de método: this.outroMetodo()
    if (ts.isCallExpression(exprNode) && ts.isPropertyAccessExpression(exprNode.expression)) {
      if (ehThis(exprNode.expression.expression, apelidos) && className) {
        const targetMethod = exprNode.expression.name.text;
        const callTargetId = `method:${className}.${targetMethod}`;
        adicionarAresta({
          origem: sourceId,
          destino: callTargetId,
          tipo: 'CALLS',
          source: sourceId,
          target: callTargetId,
          relation: 'calls',
        });
      }
    }

    ts.forEachChild(exprNode, child => inspecionarLeiturasEChamadas(child, className, methodName));
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

      const classNodeId = `class:${className}`;
      adicionarOuAtualizarNo({
        id: classNodeId,
        tipo: 'Class',
        nome: className,
        arquivo: nomeArquivo,
        linha: line + 1,
        name: className,
        kind: 'class',
        file: nomeArquivo,
        line: line + 1,
        details: baseClass ? `Herda de ${baseClass}` : 'Entidade de domínio',
      });

      if (baseClass) {
        adicionarAresta({
          origem: classNodeId,
          destino: `class:${baseClass}`,
          tipo: 'EXTENDS',
          source: classNodeId,
          target: `class:${baseClass}`,
          relation: 'references',
        });
      }

      // Visita membros da classe
      colaboradores = camposNaoColecao(node);
      gettersDaClasseAtual = new Set<string>();
      for (const member of node.members) {
        if (ts.isGetAccessorDeclaration(member)) {
          gettersDaClasseAtual.add(member.name.getText(sourceFile));
        }
      }
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
          const methodName = ts.isConstructorDeclaration(member) ? 'constructor' : member.name.getText(sourceFile);
          const methodId = `${className}.${methodName}`;
          const { line: mLine } = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));
          const methodNodeId = `method:${methodId}`;

          adicionarOuAtualizarNo({
            id: methodNodeId,
            tipo: 'Method',
            nome: methodName,
            arquivo: nomeArquivo,
            linha: mLine + 1,
            name: methodName,
            kind: 'method',
            file: nomeArquivo,
            line: mLine + 1,
            details: `Método de ${className}`,
          });

          // Aresta de contenção legada
          edges.push({
            origem: classNodeId,
            destino: methodNodeId,
            tipo: 'CALLS',
            source: classNodeId,
            target: methodNodeId,
            relation: 'contains',
          });

          // Inspeciona corpo do método para mutações e leituras
          if (member.body) {
            apelidos = new Set();
            inspecionarNoDeExpressao(member.body, className, methodName);
          }
        } else if (ts.isGetAccessorDeclaration(member)) {
          // Acessor get: leitura pura ('READS'), sem acusar mutação de estado
          const getterName = member.name.getText(sourceFile);
          const methodId = `${className}.${getterName}`;
          const { line: mLine } = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));
          const accessorNodeId = `method:${methodId}`;

          const existingNode = nodes.find(n => n.id === accessorNodeId);
          if (existingNode) {
            existingNode.tipo = 'Accessor';
            existingNode.details = `Acessor (get/set) de ${className}`;
          } else {
            adicionarOuAtualizarNo({
              id: accessorNodeId,
              tipo: 'Accessor',
              nome: getterName,
              arquivo: nomeArquivo,
              linha: mLine + 1,
              name: getterName,
              kind: 'method',
              file: nomeArquivo,
              line: mLine + 1,
              details: `Getter de ${className}`,
            });
          }

          if (!edges.some(e => e.source === classNodeId && e.target === accessorNodeId && e.relation === 'contains')) {
            edges.push({
              origem: classNodeId,
              destino: accessorNodeId,
              tipo: 'CALLS',
              source: classNodeId,
              target: accessorNodeId,
              relation: 'contains',
            });
          }

          if (member.body) {
            apelidos = new Set();
            inspecionarLeiturasEChamadas(member.body, className, getterName);
          }
        } else if (ts.isSetAccessorDeclaration(member)) {
          // Acessor set: registra mutações internas ('WRITES') para fiscalização via allowed_fields
          const setterName = member.name.getText(sourceFile);
          const methodId = `${className}.${setterName}`;
          const { line: mLine } = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));
          const accessorNodeId = `method:${methodId}`;

          const existingNode = nodes.find(n => n.id === accessorNodeId);
          if (existingNode) {
            existingNode.tipo = 'Accessor';
            existingNode.details = `Acessor (get/set) de ${className}`;
          } else {
            adicionarOuAtualizarNo({
              id: accessorNodeId,
              tipo: 'Accessor',
              nome: setterName,
              arquivo: nomeArquivo,
              linha: mLine + 1,
              name: setterName,
              kind: 'method',
              file: nomeArquivo,
              line: mLine + 1,
              details: `Setter de ${className}`,
            });
          }

          if (!edges.some(e => e.source === classNodeId && e.target === accessorNodeId && e.relation === 'contains')) {
            edges.push({
              origem: classNodeId,
              destino: accessorNodeId,
              tipo: 'CALLS',
              source: classNodeId,
              target: accessorNodeId,
              relation: 'contains',
            });
          }

          if (member.body) {
            apelidos = new Set();
            inspecionarNoDeExpressao(member.body, className, setterName);
          }
        } else if (
          ts.isPropertyDeclaration(member) && member.initializer
          && (ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer))
        ) {
          // Método em propriedade: fechar = () => { ... }
          const methodName = member.name.getText(sourceFile);
          const { line: mLine } = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));
          const methodNodeId = `method:${className}.${methodName}`;
          adicionarOuAtualizarNo({
            id: methodNodeId,
            tipo: 'Method',
            nome: methodName,
            arquivo: nomeArquivo,
            linha: mLine + 1,
            name: methodName,
            kind: 'method',
            file: nomeArquivo,
            line: mLine + 1,
            details: `Método de ${className}`,
          });
          edges.push({
            origem: classNodeId,
            destino: methodNodeId,
            tipo: 'CALLS',
            source: classNodeId,
            target: methodNodeId,
            relation: 'contains',
          });
          apelidos = new Set();
          inspecionarNoDeExpressao(member.initializer.body, className, methodName);
        } else if (ts.isPropertyDeclaration(member)) {
          const propName = member.name.getText(sourceFile);
          const propId = `prop:${className}.${propName}`;
          const { line: pLine } = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));
          adicionarOuAtualizarNo({
            id: propId,
            tipo: 'Property',
            nome: propName,
            arquivo: nomeArquivo,
            linha: pLine + 1,
            name: propName,
            kind: 'property',
            file: nomeArquivo,
            line: pLine + 1,
            details: `Atributo de ${className}`,
          });
        }
      }
      return;
    }

    // Funções livres fora de classe
    if (ts.isFunctionDeclaration(node) && node.name) {
      const funcName = node.name.text;
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const funcNodeId = `method:${funcName}`;
      adicionarOuAtualizarNo({
        id: funcNodeId,
        tipo: 'Method',
        nome: funcName,
        arquivo: nomeArquivo,
        linha: line + 1,
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

  // Ordenação determinística de nós e arestas (I11)
  ordenarGrafo(nodes, edges);

  const astGraph: AstGraph = {
    nodes,
    edges,
  };

  return {
    nodes,
    edges,
    mutations,
    mutationsByMethod,
    astGraph,
  };
}

/**
 * Ordena deterministicamente nós e arestas para reprodutibilidade estrita.
 */
function ordenarGrafo(nodes: GraphNode[], edges: GraphEdge[]) {
  nodes.sort((a, b) => {
    const cmpId = a.id.localeCompare(b.id);
    if (cmpId !== 0) return cmpId;
    return a.linha - b.linha;
  });

  edges.sort((a, b) => {
    const keyA = `${a.origem}|${a.tipo}|${a.destino}`;
    const keyB = `${b.origem}|${b.tipo}|${b.destino}`;
    return keyA.localeCompare(keyB);
  });
}

/**
 * Constrói o AstGraph ordenado deterministicamente a partir de código-fonte.
 */
export function extrairAstGraph(codigoFonte: string, nomeArquivo = 'fonte.ts'): AstGraph {
  const res = extrairAstTypeScript(codigoFonte, nomeArquivo);
  return res.astGraph;
}

/**
 * Localiza um nó no grafo por ID exato, nome ou sufixo.
 */
function localizarNo(identificador: string, graph: AstGraph): GraphNode | undefined {
  return graph.nodes.find(
    n => n.id === identificador
      || n.nome === identificador
      || n.name === identificador
      || n.id === `prop:${identificador}`
      || n.id === `method:${identificador}`
      || n.id === `class:${identificador}`
      || n.id.endsWith(`.${identificador}`)
  );
}

/**
 * Calcula o Raio de Impacto (Blast Radius) de um campo, método ou classe no grafo.
 * Percorre recursivamente via BFS todas as dependências funcionais (leituras, escritas, chamadas e herança)
 * para identificar todos os nós do sistema que são afetados caso o alvo seja alterado.
 * Retorna lista de IDs únicos com ordenação determinística.
 */
export function computeBlastRadius(nodeId: string, graph: AstGraph): string[] {
  const alvo = localizarNo(nodeId, graph);
  if (!alvo) return [];

  const visitados = new Set<string>();
  const fila: string[] = [alvo.id];
  visitados.add(alvo.id);

  while (fila.length > 0) {
    const atualId = fila.shift()!;

    for (const aresta of graph.edges) {
      // Ignora arestas estruturais de mera contenção de classe para não contaminar ramos ortogonais
      if (aresta.relation === 'contains') continue;

      // 1. Quem LÊ ou ESCREVE no nó atual é impactado por ele (ex.: método que lê campo que mudou)
      if (aresta.destino === atualId && (aresta.tipo === 'READS' || aresta.tipo === 'WRITES')) {
        if (!visitados.has(aresta.origem)) {
          visitados.add(aresta.origem);
          fila.push(aresta.origem);
        }
      }

      // 2. Se o nó atual é um método que ESCREVE em um campo, leitores desse campo são impactados
      if (aresta.origem === atualId && aresta.tipo === 'WRITES') {
        const campoAfetado = aresta.destino;
        if (!visitados.has(campoAfetado)) {
          visitados.add(campoAfetado);
          fila.push(campoAfetado);
        }
      }

      // 3. Quem CHAMA o método atual é impactado por ele (dependência direta de chamada)
      if (aresta.destino === atualId && aresta.tipo === 'CALLS') {
        if (!visitados.has(aresta.origem)) {
          visitados.add(aresta.origem);
          fila.push(aresta.origem);
        }
      }

      // 4. Se uma classe HERDA da classe atual, a subclasse é impactada
      if (aresta.destino === atualId && aresta.tipo === 'EXTENDS') {
        if (!visitados.has(aresta.origem)) {
          visitados.add(aresta.origem);
          fila.push(aresta.origem);
        }
      }
    }
  }

  // Remove o próprio nó pesquisado da lista de impactados
  visitados.delete(alvo.id);

  return Array.from(visitados).sort((a, b) => a.localeCompare(b));
}

/**
 * Extrai o subgrafo podado de vizinhança k-hop (Ego Graph) em torno de um nó alvo.
 * Coleta nós atingíveis a distância <= k por qualquer aresta incidente e todas as
 * arestas induzidas entre eles, retornando estrutura com ordenação determinística.
 */
export function extractSubGraph(targetId: string, graph: AstGraph, k = 1): AstGraph {
  const alvo = localizarNo(targetId, graph);
  if (!alvo) {
    return { nodes: [], edges: [] };
  }

  const visitados = new Set<string>([alvo.id]);
  let fronteira = new Set<string>([alvo.id]);

  for (let hop = 0; hop < k; hop++) {
    const proximaFronteira = new Set<string>();

    for (const noId of fronteira) {
      for (const aresta of graph.edges) {
        if (aresta.origem === noId && !visitados.has(aresta.destino)) {
          visitados.add(aresta.destino);
          proximaFronteira.add(aresta.destino);
        }
        if (aresta.destino === noId && !visitados.has(aresta.origem)) {
          visitados.add(aresta.origem);
          proximaFronteira.add(aresta.origem);
        }
      }
    }

    fronteira = proximaFronteira;
    if (fronteira.size === 0) break;
  }

  // Coleta os nós correspondentes aos visitados
  const subNodes = graph.nodes.filter(n => visitados.has(n.id));

  // Coleta as arestas induzidas (arestas cujos dois extremos estão nos nós visitados)
  const subEdges = graph.edges.filter(
    e => visitados.has(e.origem) && visitados.has(e.destino)
  );

  ordenarGrafo(subNodes, subEdges);

  return {
    nodes: subNodes,
    edges: subEdges,
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
      tipo: 'Class',
      nome: tableName,
      arquivo: nomeArquivo,
      linha: 1,
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
      term: node.name || node.nome,
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
    intencoesSugeridas.push(`- O sistema deve executar [[${node.name || node.nome}]] conforme as regras de negócio circunscritas.`);
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

/** Aliases canônicos para desambiguação arquitetural */
export const extrairGrafoAst = graphificarCodigo;
export const extrairMutacoesAst = extrairAstTypeScript;
