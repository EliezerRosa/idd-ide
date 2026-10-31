// src/__tests__/graphify.test.ts — Testes unitários do Graphify / AST Ingestion do IDD
import { describe, it, expect } from 'vitest';
import { CAMPO_DINAMICO, extrairAstTypeScript, graphificarCodigo } from '../lib/fase0/graphify.ts';

describe('Graphify / AST & Code Ingestion', () => {
  it('extrai nós de classes, métodos e mutações de estado de código TypeScript', () => {
    const codigo = `
    export class Mesa {
      public status: string = 'aberta';
      public fechada_em: Date | null = null;

      fechar() {
        this.status = 'fechada';
        this.fechada_em = new Date();
      }

      calcularCotas(total: number, amigos: string[]) {
        const cota = total / amigos.length;
        return cota;
      }
    }
    `;

    const res = graphificarCodigo(codigo, 'Mesa.ts');

    expect(res.grafo.nodes.some(n => n.name === 'Mesa' && n.kind === 'class')).toBe(true);
    expect(res.grafo.nodes.some(n => n.name === 'fechar' && n.kind === 'method')).toBe(true);
    expect(res.grafo.nodes.some(n => n.name === 'calcularCotas' && n.kind === 'method')).toBe(true);
    expect(res.grafo.nodes.some(n => n.name === 'status' && n.kind === 'property')).toBe(true);

    // Deve detectar aresta de mutação em 'status'
    expect(res.grafo.edges.some(e => e.relation === 'mutates' && e.target.includes('status'))).toBe(true);

    // A estimativa é honesta: num arquivo pequeno o grafo pode ser maior que o código (valor negativo)
    expect(Number.isFinite(res.grafo.stats.economiaTokensPercent)).toBe(true);
  });

  it('detecta tabelas em scripts SQL legados', () => {
    const sql = `
    CREATE TABLE mesa (
      id VARCHAR(36) PRIMARY KEY,
      taxa_servico INT NOT NULL,
      fechada_em TIMESTAMP
    );

    CREATE TABLE item_consumido (
      id VARCHAR(36) PRIMARY KEY,
      mesa_id VARCHAR(36) REFERENCES mesa(id),
      preco_centavos INT NOT NULL
    );
    `;

    const res = graphificarCodigo(sql, 'schema.sql');
    expect(res.grafo.nodes.some(n => n.name === 'mesa' && n.kind === 'table')).toBe(true);
    expect(res.grafo.nodes.some(n => n.name === 'item_consumido' && n.kind === 'table')).toBe(true);
    expect(res.dicionario.some(d => d.term === 'mesa')).toBe(true);
  });

  it('detecta operações financeiras sem soma zero e alimenta o SHALA', () => {
    const codigoComDivisaoSimples = `
    class Rateador {
      dividir(total: number, pessoas: string[]) {
        return Math.floor(total / pessoas.length);
      }
    }
    `;

    const res = graphificarCodigo(codigoComDivisaoSimples);
    expect(res.alertasCodigo.length).toBeGreaterThan(0);
    expect(res.alertasCodigo[0]).toContain('Soma Zero');
    expect(res.invariantesSugeridas.some(i => i.includes('zero centavos'))).toBe(true);
  });

  it('fecha desvios: apelido de this, conversão de tipo, this[\'x\'], delete, aninhado e arrow em propriedade', () => {
    const codigo = `
    class Mesa {
      status = 'a'; saldo = 0; cache = new Map(); config = { limite: 1 };
      fechar() { const self = this; self.status = 'f'; }
      zerar() { (this as any).saldo = 0; }
      limpar() { let s: any; s = this; delete s.cache; }
      ajustar() { this['config'].limite = 5; }
      reabrir = () => { this.status = 'a'; };
    }`;
    const muts = extrairAstTypeScript(codigo).mutations.map(m => `${m.method}:${m.field}`);
    expect(muts).toEqual(expect.arrayContaining(['fechar:status', 'zerar:saldo', 'limpar:cache', 'ajustar:config', 'reabrir:status']));
  });

  it('registra this[k] e Object.assign(this, ...) como mutação dinâmica (não verificável)', () => {
    const codigo = `
    class Mesa {
      a(k: string) { (this as any)[k] = 1; }
      b() { Object.assign(this, { x: 1 }); }
      c() { const copia = Object.assign({}, this); }
    }`;
    const muts = extrairAstTypeScript(codigo).mutations.map(m => `${m.method}:${m.field}`);
    expect(muts).toEqual([`a:${CAMPO_DINAMICO}`, `b:${CAMPO_DINAMICO}`]);
  });

  it('captura mutações complexas na AST (encadeamento, compostas, unárias, arrays) e ignora comentários', () => {
    const codigoComplexo = `
    class Pedido {
      private status: string = 'aberto';
      private cliente = { endereco: { cep: '' } };
      private contador = 0;
      private tentativas = 5;
      private itens: string[] = [];

      atualizar() {
        // this.status = 'ignorado_por_ser_comentario';
        /*
          this.saldo = 999;
        */
        const texto = "this.status = 'ignorado_por_ser_string'";

        // 1. Acesso encadeado
        this.cliente.endereco.cep = '01310-100';

        // 2. Operador composto
        this.contador += 1;

        // 3. Operador unário
        this.tentativas--;

        // 4. Mutador de coleção
        this.itens.push('item-1');
      }
    }
    `;

    const res = graphificarCodigo(codigoComplexo, 'Pedido.ts');

    // Mutações esperadas
    expect(res.mutacoesDetalhadas.some(m => m.fullPath === 'cliente.endereco.cep')).toBe(true);
    expect(res.mutacoesDetalhadas.some(m => m.field === 'contador' && m.operator === '+=')).toBe(true);
    expect(res.mutacoesDetalhadas.some(m => m.field === 'tentativas' && m.operator === '--')).toBe(true);
    expect(res.mutacoesDetalhadas.some(m => m.fullPath.includes('itens.push'))).toBe(true);

    // Comentários e strings NÃO devem ser mutações
    expect(res.mutacoesDetalhadas.some(m => m.field === 'saldo')).toBe(false);
    expect(res.mutacoesDetalhadas.some(m => m.field === 'status')).toBe(false);
  });
});

