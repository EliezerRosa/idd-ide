import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Mesa } from '../Mesa.js';

describe('Mesa (IDD v2 Property-Based Testing com fast-check)', () => {
  it('garante conservação matemática exata de centavos para qualquer divisão (SHALA zero drift)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2000000 }), // R$ 0,01 a R$ 20.000,00
        fc.integer({ min: 1, max: 50 }),      // 1 a 50 amigos
        (totalCentavos, numAmigos) => {
          const amigos = Array.from({ length: numAmigos }, (_, i) => `Amigo_${i + 1}`);
          const mesa = new Mesa('mesa-test');
          mesa.totalCentavos = totalCentavos;

          const cotas = mesa.calcularCotas(amigos);
          const somaCotas = cotas.reduce((acc, c) => acc + c.valorCentavos, 0);

          // INVARIANTE MATEMÁTICA: soma das cotas === total da mesa
          expect(somaCotas).toBe(totalCentavos);

          // INVARIANTE DE DISPERSÃO: nenhuma cota difere de outra por mais de 1 centavo
          const valores = cotas.map(c => c.valorCentavos);
          const maxVal = Math.max(...valores);
          const minVal = Math.min(...valores);
          expect(maxVal - minVal).toBeLessThanOrEqual(1);

          // INVARIANTE DE LEITURA PURA: totalCentavos e itens da mesa não foram modificados
          expect(mesa.totalCentavos).toBe(totalCentavos);
          expect(mesa.status).toBe('aberta');
        }
      ),
      { numRuns: 200 }
    );
  });

  it('demonstra a quebra instantânea se a divisão fosse ingênua (sem tratamento de resto)', () => {
    // Função ingênua comum que programadores juniores ou LLMs sem contrato geram:
    function divisaoIngenuaComBug(totalCentavos: number, amigos: string[]) {
      const cota = Math.floor(totalCentavos / amigos.length);
      return amigos.map(amigo => ({ amigo, valorCentavos: cota }));
    }

    // fast-check encontra o contraexemplo mínimo em milissegundos:
    let falhaDetectada = false;
    let contraexemplo: { total: number; amigos: number } | null = null;

    try {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 2, max: 10 }),
          (total, n) => {
            const amigos = Array.from({ length: n }, (_, i) => `A${i}`);
            const cotas = divisaoIngenuaComBug(total, amigos);
            const soma = cotas.reduce((acc, c) => acc + c.valorCentavos, 0);
            if (soma !== total) {
              contraexemplo = { total, amigos: n };
              throw new Error(`Drift detectado! Soma ${soma} != Total ${total}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    } catch {
      falhaDetectada = true;
    }

    expect(falhaDetectada).toBe(true);
    expect(contraexemplo).not.toBeNull();
  });

  it('garante que fechar() preserva propriedades não autorizadas (@readonly)', () => {
    const mesa = new Mesa('mesa-01');
    mesa.adicionarItem('Chopp', 1500);

    const snapshotTotal = mesa.totalCentavos;
    const snapshotItensLength = mesa.itens.length;

    mesa.fechar();

    expect(mesa.status).toBe('fechada');
    expect(mesa.fechada_em).toBeTruthy();
    expect(mesa.totalCentavos).toBe(snapshotTotal);
    expect(mesa.itens.length).toBe(snapshotItensLength);
  });
});

