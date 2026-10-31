import { describe, it, expect } from 'vitest';
import { parseTsDocContract } from '../src/utils/tsdoc-parser.js';
import { stateMutationRule } from '../src/rules/state-mutation.js';

describe('TSDoc Parser In-Tree', () => {
  it('extrai corretamente @intent, @mutates, @readonly e @invariant', () => {
    const comment = `/**
     * @intent Mesa.fechar
     * @mutates status, fechada_em
     * @readonly id, totalCentavos
     * @invariant sum(cotas) === totalCentavos
     */`;

    const parsed = parseTsDocContract(comment);
    expect(parsed.intent).toBe('Mesa.fechar');
    expect(parsed.mutates).toEqual(['status', 'fechada_em']);
    expect(parsed.readOnly).toEqual(['id', 'totalCentavos']);
    expect(parsed.invariants).toEqual(['sum(cotas) === totalCentavos']);
  });

  it('retorna arrays vazios se tags não existirem', () => {
    const comment = `/** Método auxiliar sem contrato */`;
    const parsed = parseTsDocContract(comment);
    expect(parsed.intent).toBeUndefined();
    expect(parsed.mutates).toEqual([]);
    expect(parsed.readOnly).toEqual([]);
  });
});

describe('ESLint Rule: state-mutation metadata', () => {
  it('possui metadata válida de regra ESLint com mensagens corretas', () => {
    expect(stateMutationRule.meta.type).toBe('problem');
    expect(stateMutationRule.meta.messages.readOnlyViolation).toContain('[INV-ENCAP-01]');
    expect(stateMutationRule.meta.messages.unauthorizedMutation).toContain('[INV-UI-04]');
  });
});

