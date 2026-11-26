import { describe, it, expect } from 'vitest';
import { verificarCercaMutacao } from '../lib/mutationFence.ts';

const MESA = `
export class Mesa {
  fechada_em: string | null = null;
  itens: string[] = [];
  ordem = 0;
  adicionarItem(nome: string) { this.itens.push(nome); }
  fechar() { this.fechada_em = 'agora'; }
  calcularCotas() { return this.itens.length; }
}`;

const codigos = (code: string, c: Parameters<typeof verificarCercaMutacao>[2]) =>
  verificarCercaMutacao(code, 'Mesa.ts', c).map(v => `${v.codigo}:${v.mutacao.method}:${v.mutacao.field}`);

describe('cerca de mutação', () => {
  it('contrato com método-alvo só fiscaliza o próprio método (adicionarItem não é acusado no contrato de fechar)', () => {
    expect(codigos(MESA, { targetClass: 'Mesa', targetMethod: 'fechar', allowedFields: ['Mesa.fechada_em'], readOnlyFields: [] })).toEqual([]);
  });

  it('allowed_fields vazio com método-alvo significa que o método não muta nada', () => {
    const impuro = MESA.replace('calcularCotas() { return', 'calcularCotas() { this.ordem = 1; return');
    expect(codigos(impuro, { targetClass: 'Mesa', targetMethod: 'calcularCotas', allowedFields: [], readOnlyFields: ['ItemConsumido.ordem'] }))
      .toEqual(['INV-UI-04:calcularCotas:ordem']);
  });

  it('campo qualificado de outra classe não autoriza nem proíbe campo de this', () => {
    const r = codigos(MESA.replace("this.fechada_em = 'agora';", "this.fechada_em = 'agora'; this.ordem = 2;"),
      { targetClass: 'Mesa', targetMethod: 'fechar', allowedFields: ['Mesa.fechada_em', 'ItemConsumido.ordem'], readOnlyFields: [] });
    expect(r).toEqual(['INV-UI-04:fechar:ordem']);
  });

  it('read-only da própria classe e mutação dinâmica', () => {
    const r = codigos(MESA.replace("this.fechada_em = 'agora';", "this.itens = []; Object.assign(this, {});"),
      { targetClass: 'Mesa', targetMethod: 'fechar', allowedFields: ['fechada_em'], readOnlyFields: ['Mesa.itens'] });
    expect(r).toEqual(['INV-ENCAP-01:fechar:itens', 'INV-UI-05:fechar:[dinâmico]']);
  });

  it('chamada a colaborador declarado (this.repo.delete) não é mutação; coleção própria continua sendo', () => {
    const servico = `
    class Servico {
      constructor(private repo: Repositorio) {}
      pendentes: Map<string, number> = new Map();
      remover(id: string) { this.repo.delete(id); this.pendentes.delete(id); }
    }`;
    expect(codigos(servico, { targetClass: 'Servico', targetMethod: 'remover', allowedFields: [], readOnlyFields: [] }))
      .toEqual(['INV-UI-04:remover:pendentes']);
  });

  it('contrato legado sem método-alvo e sem listas não fiscaliza nada', () => {
    expect(codigos(MESA, { allowedFields: [], readOnlyFields: [] })).toEqual([]);
  });
});
