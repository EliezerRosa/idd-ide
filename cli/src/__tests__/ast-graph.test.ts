// src/__tests__/ast-graph.test.ts — Testes unitários do Extrator AST de Mutações e Acessores (I11 / I12)
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  CAMPO_DINAMICO,
  extrairAstTypeScript,
  graphificarCodigo,
  type AstAnalysisResult,
} from '../lib/fase0/astGraph.ts';
import * as astMutationExtractorShim from '../lib/fase0/astMutationExtractor.ts';
import * as astGraphShim from '../lib/fase0/astGraph.ts';
import * as graphifyShim from '../lib/fase0/graphify.ts';
import { verificarCercaMutacao } from '../lib/mutationFence.ts';

describe('Entrega E02 — Extrator AST e Suporte a Getters/Setters (I11, I12)', () => {
  // ── Critério 1: Identificação dos 3 getters documentados no caso real ──
  describe('Identificação dos 3 getters reais (pedidoPath, respostaPath, port)', () => {
    it('extrai os getters pedidoPath e respostaPath da classe ManualProvider real', () => {
      const manualTsPath = path.resolve(__dirname, '../lib/llm/manual.ts');
      const codigoManual = fs.readFileSync(manualTsPath, 'utf8');

      const res: AstAnalysisResult = extrairAstTypeScript(codigoManual, 'manual.ts');

      // Verifica nós dos getters como membros válidos da classe
      const pedidoGetter = res.nodes.find(n => n.name === 'pedidoPath' && n.kind === 'method');
      const respostaGetter = res.nodes.find(n => n.name === 'respostaPath' && n.kind === 'method');

      expect(pedidoGetter).toBeDefined();
      expect(pedidoGetter?.id).toBe('method:ManualProvider.pedidoPath');
      expect(pedidoGetter?.details).toContain('Getter');

      expect(respostaGetter).toBeDefined();
      expect(respostaGetter?.id).toBe('method:ManualProvider.respostaPath');
      expect(respostaGetter?.details).toContain('Getter');

      // Arestas 'contains' entre ManualProvider e os getters
      expect(res.edges.some(e => e.source === 'class:ManualProvider' && e.target === 'method:ManualProvider.pedidoPath' && e.relation === 'contains')).toBe(true);
      expect(res.edges.some(e => e.source === 'class:ManualProvider' && e.target === 'method:ManualProvider.respostaPath' && e.relation === 'contains')).toBe(true);

      // Getters NÃO devem registrar mutações de estado
      const mutacoesGetters = res.mutations.filter(m => m.method === 'pedidoPath' || m.method === 'respostaPath');
      expect(mutacoesGetters).toHaveLength(0);
    });

    it('extrai o getter port da classe IddServer real', () => {
      const serverTsPath = path.resolve(__dirname, '../lib/server.ts');
      const codigoServer = fs.readFileSync(serverTsPath, 'utf8');

      const res: AstAnalysisResult = extrairAstTypeScript(codigoServer, 'server.ts');

      const portGetter = res.nodes.find(n => n.name === 'port' && n.kind === 'method');
      expect(portGetter).toBeDefined();
      expect(portGetter?.id).toBe('method:IddServer.port');
      expect(portGetter?.details).toContain('Getter');

      expect(res.edges.some(e => e.source === 'class:IddServer' && e.target === 'method:IddServer.port' && e.relation === 'contains')).toBe(true);

      const mutacoesPort = res.mutations.filter(m => m.method === 'port');
      expect(mutacoesPort).toHaveLength(0);
    });
  });

  // ── Critério 2: Semântica estrita de Getters (Leitura pura sem mutação) ──
  describe('Semântica de Getters (Leitura pura e dependências funcionais)', () => {
    it('classe com get acessando propriedades e chamando métodos NÃO gera acusação de mutação', () => {
      const codigo = `
      export class ContaBancaria {
        private _saldo: number = 100;
        private _taxa: number = 5;

        private calcularTaxaEfetiva(): number {
          return this._taxa * 1.1;
        }

        get saldoDisponivel(): number {
          const taxa = this.calcularTaxaEfetiva();
          return this._saldo - taxa;
        }
      }
      `;

      const res = extrairAstTypeScript(codigo, 'ContaBancaria.ts');

      // Getter reconhecido
      const getterNode = res.nodes.find(n => n.name === 'saldoDisponivel' && n.kind === 'method');
      expect(getterNode).toBeDefined();

      // Mutações atribuídas ao getter devem ser rigorosamente ZERO
      const mutacoesGetter = res.mutations.filter(m => m.method === 'saldoDisponivel');
      expect(mutacoesGetter).toHaveLength(0);

      // Auditoria na cerca de mutação (mesmo com allowed_fields vazio, deve passar limpo)
      const violacoes = verificarCercaMutacao(codigo, 'ContaBancaria.ts', {
        targetClass: 'ContaBancaria',
        targetMethod: 'saldoDisponivel',
        allowedFields: [],
        readOnlyFields: ['_saldo', '_taxa'],
      });
      expect(violacoes).toHaveLength(0);

      // Deve registrar arestas de leitura ('reads') e dependência funcional ('calls')
      expect(res.edges.some(e => e.source === 'method:ContaBancaria.saldoDisponivel' && e.relation === 'reads')).toBe(true);
      expect(res.edges.some(e => e.source === 'method:ContaBancaria.saldoDisponivel' && e.target.includes('calcularTaxaEfetiva') && e.relation === 'calls')).toBe(true);
    });
  });

  // ── Critério 3: Semântica de Setters e Cerca de Mutações (I12) ──
  describe('Semântica de Setters e Fiscalização de Cerca de Mutação', () => {
    const codigoComSetters = `
    export class MesaRestaurante {
      private _status: string = 'aberta';
      private _totalCentavos: number = 0;
      private _bloqueada: boolean = false;

      get status(): string {
        return this._status;
      }

      set status(novo: string) {
        this._status = novo;
      }

      set totalCentavos(valor: number) {
        this._totalCentavos = valor;
      }

      set tentarMutarBloqueada(b: boolean) {
        this._bloqueada = b;
      }
    }
    `;

    it('a) classe com set que altera propriedade declarada em allowed_fields deve passar (OK)', () => {
      const violacoes = verificarCercaMutacao(codigoComSetters, 'MesaRestaurante.ts', {
        targetClass: 'MesaRestaurante',
        targetMethod: 'status',
        allowedFields: ['_status'],
        readOnlyFields: [],
      });

      expect(violacoes).toHaveLength(0);

      // Também aceita target_method explícito com prefixo "set status"
      const violacoesComPrefixo = verificarCercaMutacao(codigoComSetters, 'MesaRestaurante.ts', {
        targetClass: 'MesaRestaurante',
        targetMethod: 'set status',
        allowedFields: ['_status'],
        readOnlyFields: [],
      });
      expect(violacoesComPrefixo).toHaveLength(0);
    });

    it('b) classe com set que altera propriedade NÃO autorizada deve falhar com INV-UI-04', () => {
      const violacoes = verificarCercaMutacao(codigoComSetters, 'MesaRestaurante.ts', {
        targetClass: 'MesaRestaurante',
        targetMethod: 'status',
        allowedFields: ['outroCampo'], // _status NÃO está autorizado
        readOnlyFields: [],
      });

      expect(violacoes.length).toBeGreaterThan(0);
      expect(violacoes[0].codigo).toBe('INV-UI-04');
      expect(violacoes[0].mensagem).toContain("[INV-UI-04] Campo '_status' fora de allowed_fields");
      expect(violacoes[0].mensagem).toContain('MesaRestaurante.status');
    });

    it('b2) classe com set que altera propriedade read-only deve falhar com INV-ENCAP-01', () => {
      const violacoes = verificarCercaMutacao(codigoComSetters, 'MesaRestaurante.ts', {
        targetClass: 'MesaRestaurante',
        targetMethod: 'tentarMutarBloqueada',
        allowedFields: ['_bloqueada'],
        readOnlyFields: ['_bloqueada'], // marcado como somente leitura
      });

      expect(violacoes.length).toBeGreaterThan(0);
      expect(violacoes[0].codigo).toBe('INV-ENCAP-01');
      expect(violacoes[0].mensagem).toContain("[INV-ENCAP-01] Campo '_bloqueada' é read-only no contrato");
      expect(violacoes[0].mensagem).toContain('MesaRestaurante.tentarMutarBloqueada');
    });

    it('suporta unários, mutadores e expressões complexas dentro de setters', () => {
      const codigoSetComplexo = `
      export class Contador {
        private _valor: number = 0;
        private _historico: number[] = [];

        set incremento(passo: number) {
          this._valor += passo;
          this._historico.push(this._valor);
        }
      }
      `;

      const res = extrairAstTypeScript(codigoSetComplexo, 'Contador.ts');
      const mutacoes = res.mutationsByMethod.get('Contador.incremento') ?? [];

      expect(mutacoes.some(m => m.field === '_valor' && m.operator === '+=')).toBe(true);
      expect(mutacoes.some(m => m.field === '_historico' && m.operator === '.push()')).toBe(true);
    });

    it('unifica nó de membro quando uma classe declara get e set para o mesmo identificador', () => {
      const res = extrairAstTypeScript(codigoComSetters, 'MesaRestaurante.ts');
      const statusNodes = res.nodes.filter(n => n.name === 'status' && n.kind === 'method');

      // Não duplica nó com o mesmo ID
      expect(statusNodes).toHaveLength(1);
      expect(statusNodes[0].details).toBe('Acessor (get/set) de MesaRestaurante');
    });
  });

  // ── Critério 4: Desambiguação Arquitetural e Retrocompatibilidade (I11) ──
  describe('Desambiguação Arquitetural e Shims de Compatibilidade (I11)', () => {
    it('o shim astGraph.ts reexporta todas as funções e tipos', () => {
      expect(typeof astGraphShim.extrairAstTypeScript).toBe('function');
      expect(typeof astGraphShim.graphificarCodigo).toBe('function');
      expect(astGraphShim.CAMPO_DINAMICO).toBe(CAMPO_DINAMICO);
    });

    it('o shim astMutationExtractor.ts reexporta todas as funções e tipos', () => {
      expect(typeof astMutationExtractorShim.extrairAstTypeScript).toBe('function');
      expect(typeof astMutationExtractorShim.graphificarCodigo).toBe('function');
      expect(astMutationExtractorShim.CAMPO_DINAMICO).toBe(CAMPO_DINAMICO);
    });

    it('o shim depreciado graphify.ts reexporta todas as funções e tipos', () => {
      expect(typeof graphifyShim.extrairAstTypeScript).toBe('function');
      expect(typeof graphifyShim.graphificarCodigo).toBe('function');
      expect(graphifyShim.CAMPO_DINAMICO).toBe(CAMPO_DINAMICO);
    });

    it('graphificarCodigo (extrairGrafoAst) inclui acessores get e set nas estatísticas', () => {
      const codigo = `
      export class Exemplo {
        private _ativo: boolean = false;
        get ativo(): boolean { return this._ativo; }
        set ativo(v: boolean) { this._ativo = v; }
        executar() {}
      }
      `;
      const res = graphificarCodigo(codigo, 'Exemplo.ts');
      // Deve computar 1 classe e 2 métodos (ativo [acessor] e executar)
      expect(res.grafo.stats.classes).toBe(1);
      expect(res.grafo.stats.methods).toBe(2);
      expect(res.mutacoesDetalhadas.some(m => m.method === 'ativo' && m.field === '_ativo')).toBe(true);
    });
  });
});
