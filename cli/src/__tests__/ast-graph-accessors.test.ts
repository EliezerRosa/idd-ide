// src/__tests__/ast-graph-accessors.test.ts — Testes formais da Entrega E02:
// Desambiguação do Extrator AST, Getters/Setters, Blast Radius e Ego Graph (I11 / I12)
import { describe, it, expect } from 'vitest';
import {
  extrairAstTypeScript,
  extrairAstGraph,
  computeBlastRadius,
  extractSubGraph,
  type AstGraph,
  type GraphNode,
  type GraphEdge,
} from '../lib/fase0/astGraph.ts';
import { verificarCercaMutacao } from '../lib/mutationFence.ts';

describe('Entrega E02 — Extrator AST, Acessores e Algoritmos de Grafos (I11 / I12)', () => {
  // ── a) Acessores 'get' gerando arestas 'READS' e não gerando mutação de estado ──
  describe('a) Acessores get: Arestas READS e ausência estrita de mutação de estado', () => {
    const codigoPedido = `
    export class PedidoVenda {
      private _valorTotal: number = 250;
      private _percentualDesconto: number = 10;
      private _taxaEntrega: number = 15;
      private _itens: string[] = ['livro', 'caderno'];

      private calcularBaseCalculo(): number {
        return this._valorTotal;
      }

      get valorLiquido(): number {
        const base = this.calcularBaseCalculo();
        const desconto = (base * this._percentualDesconto) / 100;
        return (base - desconto) + this._taxaEntrega;
      }

      get quantidadeItens(): number {
        return this._itens.length;
      }
    }
    `;

    it('identifica nós de get com tipo Accessor e metadados formais', () => {
      const res = extrairAstTypeScript(codigoPedido, 'PedidoVenda.ts');
      const nodes = res.nodes;

      const getValorLiquido = nodes.find(n => n.id === 'method:PedidoVenda.valorLiquido');
      expect(getValorLiquido).toBeDefined();
      expect(getValorLiquido?.tipo).toBe('Accessor');
      expect(getValorLiquido?.nome).toBe('valorLiquido');
      expect(getValorLiquido?.arquivo).toBe('PedidoVenda.ts');
      expect(getValorLiquido?.linha).toBeGreaterThan(0);

      const getQuantidade = nodes.find(n => n.id === 'method:PedidoVenda.quantidadeItens');
      expect(getQuantidade).toBeDefined();
      expect(getQuantidade?.tipo).toBe('Accessor');
      expect(getQuantidade?.nome).toBe('quantidadeItens');
    });

    it('gera arestas tipadas READS para todos os campos de this lidos no getter', () => {
      const res = extrairAstTypeScript(codigoPedido, 'PedidoVenda.ts');
      const edges = res.edges;

      // valorLiquido lê _percentualDesconto e _taxaEntrega
      const readsDesconto = edges.find(
        e => e.origem === 'method:PedidoVenda.valorLiquido'
          && e.destino === 'prop:PedidoVenda._percentualDesconto'
          && e.tipo === 'READS'
      );
      expect(readsDesconto).toBeDefined();
      expect(readsDesconto?.relation).toBe('reads');

      const readsTaxa = edges.find(
        e => e.origem === 'method:PedidoVenda.valorLiquido'
          && e.destino === 'prop:PedidoVenda._taxaEntrega'
          && e.tipo === 'READS'
      );
      expect(readsTaxa).toBeDefined();

      // valorLiquido chama método auxiliar calcularBaseCalculo (aresta CALLS)
      const callsBase = edges.find(
        e => e.origem === 'method:PedidoVenda.valorLiquido'
          && e.destino === 'method:PedidoVenda.calcularBaseCalculo'
          && e.tipo === 'CALLS'
      );
      expect(callsBase).toBeDefined();

      // quantidadeItens lê _itens
      const readsItens = edges.find(
        e => e.origem === 'method:PedidoVenda.quantidadeItens'
          && e.destino === 'prop:PedidoVenda._itens'
          && e.tipo === 'READS'
      );
      expect(readsItens).toBeDefined();
    });

    it('getters NUNCA geram mutação de estado e NUNCA geram arestas WRITES', () => {
      const res = extrairAstTypeScript(codigoPedido, 'PedidoVenda.ts');

      const mutacoesLiquido = res.mutations.filter(m => m.method === 'valorLiquido');
      expect(mutacoesLiquido).toHaveLength(0);

      const mutacoesQtd = res.mutations.filter(m => m.method === 'quantidadeItens');
      expect(mutacoesQtd).toHaveLength(0);

      const arestasWrites = res.edges.filter(
        e => (e.origem === 'method:PedidoVenda.valorLiquido' || e.origem === 'method:PedidoVenda.quantidadeItens')
          && e.tipo === 'WRITES'
      );
      expect(arestasWrites).toHaveLength(0);
    });
  });

  // ── b) Acessores 'set' gerando arestas 'WRITES' e fiscalização na cerca de mutação ──
  describe('b) Acessores set: Arestas WRITES e disparo de erro determinístico na cerca de mutação', () => {
    const codigoMesa = `
    export class MesaAtendimento {
      private _status: string = 'aberta';
      private _totalCentavos: number = 0;
      private _tokenSeguranca: string = 'hash-secreto';

      get status(): string {
        return this._status;
      }

      set status(novoStatus: string) {
        this._status = novoStatus;
      }

      set totalCentavos(valor: number) {
        this._totalCentavos = valor;
      }

      set tokenSeguranca(novoToken: string) {
        this._tokenSeguranca = novoToken;
      }

      set mutacaoDinamica(k: string) {
        (this as any)[k] = 'perigo';
      }
    }
    `;

    it('identifica nós de set com tipo Accessor e arestas WRITES apontando para campos afetados', () => {
      const res = extrairAstTypeScript(codigoMesa, 'MesaAtendimento.ts');

      const setStatusNode = res.nodes.find(n => n.id === 'method:MesaAtendimento.status');
      expect(setStatusNode).toBeDefined();
      expect(setStatusNode?.tipo).toBe('Accessor');

      // Aresta WRITES de MesaAtendimento.status para prop:MesaAtendimento._status
      const edgeStatusWrite = res.edges.find(
        e => e.origem === 'method:MesaAtendimento.status'
          && e.destino === 'prop:MesaAtendimento._status'
          && e.tipo === 'WRITES'
      );
      expect(edgeStatusWrite).toBeDefined();
      expect(edgeStatusWrite?.relation).toBe('mutates');

      // Aresta WRITES de totalCentavos para prop:MesaAtendimento._totalCentavos
      const edgeTotalWrite = res.edges.find(
        e => e.origem === 'method:MesaAtendimento.totalCentavos'
          && e.destino === 'prop:MesaAtendimento._totalCentavos'
          && e.tipo === 'WRITES'
      );
      expect(edgeTotalWrite).toBeDefined();
    });

    it('b1) autoriza setter que altera campo listado em allowed_fields (OK)', () => {
      const violacoes = verificarCercaMutacao(codigoMesa, 'MesaAtendimento.ts', {
        targetClass: 'MesaAtendimento',
        targetMethod: 'status',
        allowedFields: ['_status'],
        readOnlyFields: [],
      });

      expect(violacoes).toHaveLength(0);
    });

    it('b2) dispara erro determinístico INV-UI-04 quando setter altera campo fora de allowed_fields', () => {
      const violacoes = verificarCercaMutacao(codigoMesa, 'MesaAtendimento.ts', {
        targetClass: 'MesaAtendimento',
        targetMethod: 'status',
        allowedFields: ['_totalCentavos'], // _status NÃO permitido
        readOnlyFields: [],
      });

      expect(violacoes.length).toBeGreaterThan(0);
      expect(violacoes[0].codigo).toBe('INV-UI-04');
      expect(violacoes[0].mensagem).toContain("[INV-UI-04] Campo '_status' fora de allowed_fields");
      expect(violacoes[0].mensagem).toContain('MesaAtendimento.status');
      expect(violacoes[0].aresta?.tipo).toBe('WRITES');
    });

    it('b3) dispara erro determinístico INV-ENCAP-01 quando setter altera campo declarado como read-only', () => {
      const violacoes = verificarCercaMutacao(codigoMesa, 'MesaAtendimento.ts', {
        targetClass: 'MesaAtendimento',
        targetMethod: 'tokenSeguranca',
        allowedFields: ['_tokenSeguranca'],
        readOnlyFields: ['_tokenSeguranca'], // protegido contra escrita
      });

      expect(violacoes.length).toBeGreaterThan(0);
      expect(violacoes[0].codigo).toBe('INV-ENCAP-01');
      expect(violacoes[0].mensagem).toContain("[INV-ENCAP-01] Campo '_tokenSeguranca' é read-only no contrato");
      expect(violacoes[0].mensagem).toContain('MesaAtendimento.tokenSeguranca');
      expect(violacoes[0].aresta?.tipo).toBe('WRITES');
    });

    it('b4) dispara erro determinístico INV-UI-05 em mutação dinâmica no setter', () => {
      const violacoes = verificarCercaMutacao(codigoMesa, 'MesaAtendimento.ts', {
        targetClass: 'MesaAtendimento',
        targetMethod: 'mutacaoDinamica',
        allowedFields: ['*'],
        readOnlyFields: [],
      });

      expect(violacoes.length).toBeGreaterThan(0);
      expect(violacoes[0].codigo).toBe('INV-UI-05');
      expect(violacoes[0].mensagem).toContain('[INV-UI-05] Mutação de this não verificável estaticamente');
    });
  });

  // ── c) Execução do algoritmo de Raio de Impacto (computeBlastRadius) ──
  describe('c) Algoritmo de Raio de Impacto (computeBlastRadius)', () => {
    const codigoConta = `
    export class ContaCorrente {
      private _saldo: number = 0;
      private _limiteChequeEspecial: number = 500;
      private _bloqueada: boolean = false;
      private _historico: string[] = [];

      get saldoDisponivel(): number {
        return this._saldo + this._limiteChequeEspecial;
      }

      verificarDisponibilidade(valor: number): boolean {
        return this.saldoDisponivel >= valor;
      }

      transferir(valor: number): void {
        if (!this.verificarDisponibilidade(valor)) throw new Error('Saldo insuficiente');
        this._saldo -= valor;
        this._historico.push('transferencia: ' + valor);
      }

      imprimirExtrato(): string {
        return 'Saldo: ' + this.saldoDisponivel;
      }

      bloquearConta(): void {
        this._bloqueada = true;
      }

      get estaBloqueada(): boolean {
        return this._bloqueada;
      }
    }
    `;

    it('calcula o blast radius de um campo incluindo todos os leitores e chamadores transitivos', () => {
      const grafo = extrairAstGraph(codigoConta, 'ContaCorrente.ts');

      // Raio de impacto do campo _saldo
      const impactadosSaldo = computeBlastRadius('prop:ContaCorrente._saldo', grafo);

      // Deve incluir quem lê _saldo diretamente (saldoDisponivel)
      expect(impactadosSaldo).toContain('method:ContaCorrente.saldoDisponivel');

      // Deve incluir quem chama saldoDisponivel (verificarDisponibilidade e imprimirExtrato)
      expect(impactadosSaldo).toContain('method:ContaCorrente.verificarDisponibilidade');
      expect(impactadosSaldo).toContain('method:ContaCorrente.imprimirExtrato');

      // Deve incluir quem chama verificarDisponibilidade e escreve em _saldo (transferir)
      expect(impactadosSaldo).toContain('method:ContaCorrente.transferir');

      // NÃO deve incluir elementos isolados do domínio de bloqueio
      expect(impactadosSaldo).not.toContain('method:ContaCorrente.bloquearConta');
      expect(impactadosSaldo).not.toContain('method:ContaCorrente.estaBloqueada');
      expect(impactadosSaldo).not.toContain('prop:ContaCorrente._bloqueada');
    });

    it('calcula o blast radius de um campo isolado sem impactar ramos independentes', () => {
      const grafo = extrairAstGraph(codigoConta, 'ContaCorrente.ts');

      // Raio de impacto de _bloqueada
      const impactadosBloqueio = computeBlastRadius('_bloqueada', grafo);

      expect(impactadosBloqueio).toContain('method:ContaCorrente.estaBloqueada');
      expect(impactadosBloqueio).toContain('method:ContaCorrente.bloquearConta');

      // Ramos de cálculo de saldo não devem ser tocados
      expect(impactadosBloqueio).not.toContain('method:ContaCorrente.saldoDisponivel');
      expect(impactadosBloqueio).not.toContain('method:ContaCorrente.imprimirExtrato');
    });

    it('garante ordenação estável determinística na lista de saída do blast radius', () => {
      const grafo = extrairAstGraph(codigoConta, 'ContaCorrente.ts');
      const res1 = computeBlastRadius('_saldo', grafo);
      const res2 = computeBlastRadius('_saldo', grafo);

      expect(res1).toEqual(res2);
      // Verifica se está ordenado alfabeticamente
      const ordenado = [...res1].sort((a, b) => a.localeCompare(b));
      expect(res1).toEqual(ordenado);
    });
  });

  // ── d) Extração do subgrafo de vizinhança k=1 (extractSubGraph) ──
  describe('d) Extração de Subgrafo Podado (extractSubGraph / Ego Graph)', () => {
    const codigoServico = `
    export class PagamentoService {
      private _chavePix: string = 'empresa@pix.com';
      private _tentativas: number = 0;

      consultarChave(): string {
        return this._chavePix;
      }

      registrarTentativa(): void {
        this._tentativas++;
      }

      executarPagamento(): void {
        const chave = this.consultarChave();
        this.registrarTentativa();
      }
    }
    `;

    it('extrai subgrafo de vizinhança k=1 centrado em consultarChave contendo apenas vizinhos imediatos', () => {
      const grafo = extrairAstGraph(codigoServico, 'PagamentoService.ts');
      const sub = extractSubGraph('method:PagamentoService.consultarChave', grafo, 1);

      // Nós presentes em k=1 de consultarChave:
      // - o próprio nó do método
      // - a propriedade lida _chavePix
      // - a classe PagamentoService que o contém
      // - o chamador imediato executarPagamento
      const idsNos = sub.nodes.map(n => n.id);
      expect(idsNos).toContain('method:PagamentoService.consultarChave');
      expect(idsNos).toContain('prop:PagamentoService._chavePix');
      expect(idsNos).toContain('class:PagamentoService');
      expect(idsNos).toContain('method:PagamentoService.executarPagamento');

      // Nós a distância >= 2 NÃO devem estar presentes em k=1
      expect(idsNos).not.toContain('method:PagamentoService.registrarTentativa');
      expect(idsNos).not.toContain('prop:PagamentoService._tentativas');

      // Arestas induzidas no subgrafo:
      // Devem conectar apenas nós presentes em sub.nodes
      for (const edge of sub.edges) {
        expect(idsNos).toContain(edge.origem);
        expect(idsNos).toContain(edge.destino);
      }
    });

    it('com k=2 expande para registrarTentativa e _tentativas a partir de consultarChave', () => {
      const grafo = extrairAstGraph(codigoServico, 'PagamentoService.ts');
      const sub = extractSubGraph('method:PagamentoService.consultarChave', grafo, 2);

      const idsNos = sub.nodes.map(n => n.id);
      // Em k=2, através de executarPagamento, alcança registrarTentativa e _tentativas
      expect(idsNos).toContain('method:PagamentoService.registrarTentativa');
      expect(idsNos).toContain('prop:PagamentoService._tentativas');
    });

    it('retorna subgrafo vazio de forma segura quando o nó não existe', () => {
      const grafo = extrairAstGraph(codigoServico, 'PagamentoService.ts');
      const sub = extractSubGraph('noInexistente', grafo, 1);
      expect(sub.nodes).toHaveLength(0);
      expect(sub.edges).toHaveLength(0);
    });

    it('garante ordenação determinística nos nós e arestas do subgrafo', () => {
      const grafo = extrairAstGraph(codigoServico, 'PagamentoService.ts');
      const sub = extractSubGraph('method:PagamentoService.executarPagamento', grafo, 1);

      // Nós devem estar ordenados por id
      const ids = sub.nodes.map(n => n.id);
      const idsOrdenados = [...ids].sort((a, b) => a.localeCompare(b));
      expect(ids).toEqual(idsOrdenados);
    });
  });

  // ── e) Serialização, Desempenho e Custo Zero de IA ──
  describe('e) Serialização determinística, desempenho e ausência de dependências de IA', () => {
    it('executa extração completa de AST e grafo em menos de 50ms de forma 100% síncrona', () => {
      const codigo = `
      export class DemoBenchmark {
        private _val: number = 0;
        get val(): number { return this._val; }
        set val(v: number) { this._val = v; }
        metodoA() { this.val = 10; }
        metodoB() { return this.val * 2; }
      }
      `;

      const t0 = performance.now();
      const grafo = extrairAstGraph(codigo, 'Demo.ts');
      const blast = computeBlastRadius('_val', grafo);
      const sub = extractSubGraph('method:DemoBenchmark.val', grafo, 1);
      const elapsed = performance.now() - t0;

      expect(elapsed).toBeLessThan(50); // < 50ms
      expect(grafo.nodes.length).toBeGreaterThan(0);
      expect(blast.length).toBeGreaterThan(0);
      expect(sub.nodes.length).toBeGreaterThan(0);
    });
  });
});
