import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { parseContract } from '@idd/core';
import { tsdocDoCaso, tsdocDoContrato } from '../lib/fase0/tsdoc.ts';
import { inspecionarCodigo, tsdocSugerido } from '../lib/inspect.ts';

const contrato = (extra: Record<string, unknown>) => {
  const r = parseContract({
    version: '2.0', module: 'c/m', intent: 'Registrar o [[ItemConsumido]] na [[Mesa]].',
    target_class: 'Mesa', target_method: 'registrar',
    behavioral_contract: { visibility: 'public', state_mutation: { allowed_fields: [], read_only_fields: [] } },
    constraints: [{ id: 'INV-003', type: 'invariant', severity: 'critical', description: 'Todo [[ItemConsumido]] tem consumidor.' }],
    acceptance: [{ id: 'A-01', given: 'g', when: 'w', then: 't' }],
    ...extra,
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.contract;
};

describe('ponte especificação → código (idd fase0 tsdoc)', () => {
  it('campos próprios viram @mutates/@readonly; invariantes viram @invariant; [[ ]] some', () => {
    const b = tsdocDoContrato(contrato({
      behavioral_contract: { visibility: 'public', state_mutation: { allowed_fields: ['Mesa.fechada_em'], read_only_fields: ['Mesa.chave_pix', 'Participante.nome'] } },
    }), 'x.intent.yaml')!;
    expect(b.texto).toContain(' * Registrar o ItemConsumido na Mesa.');
    expect(b.texto).toContain(' * @intent Mesa.registrar');
    expect(b.texto).toContain(' * @mutates fechada_em');
    expect(b.texto).toContain(' * @readonly chave_pix');
    expect(b.texto).not.toContain('Participante.nome');
    expect(b.texto).toContain(' * @invariant INV-003 Todo ItemConsumido tem consumidor.');
    expect(b.pendencias).toEqual([]);
  });

  it('outras entidades em allowed_fields viram pendência explícita, sem mapeamento inventado', () => {
    const b = tsdocDoContrato(contrato({
      behavioral_contract: { visibility: 'public', state_mutation: { allowed_fields: ['ItemConsumido', 'Consumo'], read_only_fields: [] } },
    }), 'x.intent.yaml')!;
    expect(b.texto).toContain(' * @mutates nenhum');
    expect(b.texto).toContain('TODO(IDD): o contrato também altera ItemConsumido, Consumo');
    expect(b.pendencias).toEqual(['ItemConsumido', 'Consumo']);
  });

  it('a própria classe em allowed_fields é criação de instância, não pendência', () => {
    const b = tsdocDoContrato(contrato({
      behavioral_contract: { visibility: 'public', state_mutation: { allowed_fields: ['Mesa', 'Participante'], read_only_fields: [] } },
    }), 'x.intent.yaml')!;
    expect(b.texto).toContain('Cria uma instância de Mesa');
    expect(b.pendencias).toEqual(['Participante']);
  });

  it('gera um bloco para cada contrato do Racha de Conta', () => {
    const { blocos, invalidos } = tsdocDoCaso(path.join(__dirname, '../../../fase0/racha-conta/contratos'));
    expect(invalidos).toEqual([]);
    expect(blocos.map(b => `${b.classe}.${b.metodo}`)).toContain('Mesa.fechar');
    expect(blocos.find(b => b.metodo === 'fechar')!.texto).toContain('@mutates fechada_em');
  });
});

describe('ponte código → contrato (idd inspect)', () => {
  it('sugere @mutates pelas mutações reais, "nenhum" para métodos puros e avisa mutação dinâmica', () => {
    const ms = inspecionarCodigo(`
    class Mesa {
      itens: string[] = []; total = 0; status = 'a';
      adicionar(x: string) { this.itens.push(x); this.total += 1; }
      contar() { return this.itens.length; }
      mexer(k: string) { (this as any)[k] = 1; }
    }`);
    expect(ms.map(m => [m.metodo, m.muta, m.dinamico])).toEqual([
      ['adicionar', ['itens', 'total'], false],
      ['contar', [], false],
      ['mexer', [], true],
    ]);
    expect(tsdocSugerido(ms[0])).toContain('@mutates itens, total');
    expect(tsdocSugerido(ms[1])).toContain('@mutates nenhum');
    expect(tsdocSugerido(ms[2])).toContain('mutação dinâmica');
  });
});
