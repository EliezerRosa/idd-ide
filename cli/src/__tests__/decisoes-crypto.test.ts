// src/__tests__/decisoes-crypto.test.ts — Validação criptográfica SHA-256 e integridade de decisões humanas (I10 / E01)
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  calcularHashDecisao,
  carimbarDecisaoLinha,
  carimbarDecisoesTexto,
  extrairComponentesDecisao,
  lerDecisoes,
  caminhosCaso,
  lerTexto,
} from '../lib/fase0/casos.ts';
import { avaliarGate1 } from '../lib/fase0/gate1.ts';

describe('Integridade Criptográfica de Decisões (I10 / E01)', () => {
  const root = path.resolve(__dirname, '../../..');
  const caminhosRacha = caminhosCaso(root, 'racha-conta');

  describe('1. Função Hash Canônica e Efeito Avalanche', () => {
    const base = {
      id: 'D-001',
      texto: 'Qual é o total de referência que a soma das cotas deve igualar exatamente?',
      escolha: 'O total calculado pelo aplicativo (soma dos itens registrados mais a taxa de serviço); a nota impressa é só conferência.',
      autor: 'Eliézer Rosa',
      data: '2026-10-27',
    };

    it('calcula o digest SHA-256 canônico determinístico em lowercase hexadecimal (64 chars)', () => {
      const h1 = calcularHashDecisao(base);
      const h2 = calcularHashDecisao(base);
      expect(h1).toHaveLength(64);
      expect(h1).toMatch(/^[a-f0-9]{64}$/);
      expect(h1).toBe(h2);
      expect(h1).toBe('1c4a9fe87ef74ec522fc9ce99aac33ebe3033401d4ef2112ea81b6e7bf6cedc1');
    });

    it('efeito avalanche: mutação de 1 bit no ID altera completamente o digest', () => {
      const hBase = calcularHashDecisao(base);
      const hMutado = calcularHashDecisao({ ...base, id: 'D-002' });
      expect(hMutado).not.toBe(hBase);
    });

    it('efeito avalanche: mutação de 1 caractere no texto altera completamente o digest', () => {
      const hBase = calcularHashDecisao(base);
      const hMutado = calcularHashDecisao({ ...base, texto: base.texto.replace('Qual é', 'Qual e') });
      expect(hMutado).not.toBe(hBase);
    });

    it('efeito avalanche: mutação de 1 caractere na escolha altera completamente o digest', () => {
      const hBase = calcularHashDecisao(base);
      const hMutado = calcularHashDecisao({ ...base, escolha: base.escolha.replace('aplicativo', 'Aplicativo') });
      expect(hMutado).not.toBe(hBase);
    });

    it('efeito avalanche: mutação de 1 caractere no autor altera completamente o digest', () => {
      const hBase = calcularHashDecisao(base);
      const hMutado = calcularHashDecisao({ ...base, autor: 'Eliezer Rosa' }); // sem acento
      expect(hMutado).not.toBe(hBase);
    });

    it('efeito avalanche: mutação de 1 caractere na data altera completamente o digest', () => {
      const hBase = calcularHashDecisao(base);
      const hMutado = calcularHashDecisao({ ...base, data: '2026-10-28' });
      expect(hMutado).not.toBe(hBase);
    });
  });

  describe('2. Parser, Carimbo e Idempotência', () => {
    const rawLinha = '- [x] D-001 · R01/P01 · bloqueante · Qual é o total de referência que a soma das cotas deve igualar exatamente? → O total calculado pelo aplicativo (soma dos itens registrados mais a taxa de serviço); a nota impressa é só conferência. (2026-10-27)';

    it('carimba linha não carimbada gerando campos autor e sha256', () => {
      const carimbada = carimbarDecisaoLinha(rawLinha, 'Eliézer Rosa');
      expect(carimbada).toContain('autor: Eliézer Rosa');
      expect(carimbada).toContain('sha256: 1c4a9fe87ef74ec522fc9ce99aac33ebe3033401d4ef2112ea81b6e7bf6cedc1');
    });

    it('carimbo é 100% idempotente ao reexecutar sobre linha já carimbada', () => {
      const c1 = carimbarDecisaoLinha(rawLinha, 'Eliézer Rosa');
      const c2 = carimbarDecisaoLinha(c1, 'Eliézer Rosa');
      expect(c2).toBe(c1);
    });

    it('extrai componentes e valida digest com sucesso', () => {
      const carimbada = carimbarDecisaoLinha(rawLinha, 'Eliézer Rosa');
      const decisoes = lerDecisoes(carimbada);
      expect(decisoes).toHaveLength(1);
      const d = decisoes[0];
      expect(d.id).toBe('D-001');
      expect(d.autor).toBe('Eliézer Rosa');
      expect(d.data).toBe('2026-10-27');
      expect(d.hashValido).toBe(true);
      expect(d.hashCalculado).toBe(d.hash);
    });
  });

  describe('3. Validação das 53 Decisões Reais do Racha de Conta', () => {
    it('todas as 53 decisões de fase0/racha-conta/decisoes.md possuem hashes íntegros e autor Eliézer Rosa', () => {
      const conteudo = lerTexto(caminhosRacha.decisoes);
      const decisoes = lerDecisoes(conteudo);

      expect(decisoes).toHaveLength(53);

      for (const d of decisoes) {
        expect(d.marcada, `Decisão ${d.id} deveria estar marcada [x]`).toBe(true);
        expect(d.autor, `Decisão ${d.id} deve conter autor`).toBe('Eliézer Rosa');
        expect(d.data, `Decisão ${d.id} deve conter data válida`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(d.hash, `Decisão ${d.id} deve conter hash SHA-256`).toMatch(/^[a-f0-9]{64}$/);
        expect(d.hashValido, `Hash da decisão ${d.id} (linha ${d.linha}) é inválido! Esperado: ${d.hashCalculado}, gravado: ${d.hash}`).toBe(true);
      }
    });

    it('Gate 1 real em racha-conta avalia critério (c) como verde e íntegro', () => {
      const g = avaliarGate1(caminhosRacha);
      const c = g.criterios.find(cr => cr.id === 'c')!;
      expect(c.ok).toBe(true);
      expect(c.detalhe).toContain('53 decisão(ões) com SHA-256 íntegro');
      expect(c.detalhe).toContain('nenhuma bloqueante em aberto');
      expect(g.verde).toBe(true);
    });
  });

  describe('4. Disjuntor: Mutação de 1 bit reprova determinística e pontualmente o Gate 1', () => {
    it('mutação de 1 caractere no texto da decisão D-001 reprova o Gate 1 e aponta a linha exata', () => {
      const conteudoOriginal = lerTexto(caminhosRacha.decisoes);
      // Mutação cirúrgica de 1 caractere: "aplicativo" -> "Aplicativo"
      const conteudoMutado = conteudoOriginal.replace(
        'O total calculado pelo aplicativo',
        'O total calculado pelo Aplicativo'
      );
      expect(conteudoMutado).not.toBe(conteudoOriginal);

      // Simula avaliação do Gate 1 com o conteúdo mutado
      const decsMutadas = lerDecisoes(conteudoMutado);
      const d1 = decsMutadas.find(d => d.id === 'D-001')!;
      expect(d1.hashValido).toBe(false);

      // Avaliação em caso temporário
      const tempP = { ...caminhosRacha, decisoes: path.join(caminhosRacha.dir, 'decisoes.temp.test.md') };
      fs.writeFileSync(tempP.decisoes, conteudoMutado, 'utf8');
      try {
        const g = avaliarGate1(tempP);
        const c = g.criterios.find(cr => cr.id === 'c')!;
        expect(c.ok).toBe(false);
        expect(g.verde).toBe(false);
        expect(c.detalhe).toContain('decisão D-001 corrompida na linha 8');
        expect(c.detalhe).toMatch(/hash gravado.*!= esperado/);
      } finally {
        fs.unlinkSync(tempP.decisoes);
      }
    });

    it('mutação de 1 caractere no texto da decisão D-022 reprova o Gate 1 e aponta a linha exata', () => {
      const conteudoOriginal = lerTexto(caminhosRacha.decisoes);
      // Mutação de 1 caractere na D-022: "rodízio" -> "rodizio"
      const conteudoMutado = conteudoOriginal.replace(
        'ordem o rodízio do centavo',
        'ordem o rodizio do centavo'
      );
      expect(conteudoMutado).not.toBe(conteudoOriginal);

      const tempP = { ...caminhosRacha, decisoes: path.join(caminhosRacha.dir, 'decisoes.temp2.test.md') };
      fs.writeFileSync(tempP.decisoes, conteudoMutado, 'utf8');
      try {
        const g = avaliarGate1(tempP);
        const c = g.criterios.find(cr => cr.id === 'c')!;
        expect(c.ok).toBe(false);
        expect(g.verde).toBe(false);
        expect(c.detalhe).toContain('decisão D-022 corrompida');
        expect(c.detalhe).toContain('linha 29');
      } finally {
        fs.unlinkSync(tempP.decisoes);
      }
    });

    it('decisão marcada [x] sem hash SHA-256 é sumariamente rejeitada como não autorizada', () => {
      const conteudoSemHash = '- [x] D-001 · R01/P01 · bloqueante · Qual é o total? → O aplicativo (2026-10-27) · autor: Eliézer Rosa\n';
      const tempP = { ...caminhosRacha, decisoes: path.join(caminhosRacha.dir, 'decisoes.temp3.test.md') };
      fs.writeFileSync(tempP.decisoes, conteudoSemHash, 'utf8');
      try {
        const g = avaliarGate1(tempP);
        const c = g.criterios.find(cr => cr.id === 'c')!;
        expect(c.ok).toBe(false);
        expect(g.verde).toBe(false);
        expect(c.detalhe).toContain('sem hash SHA-256');
        expect(c.detalhe).toContain('D-001:L1');
      } finally {
        fs.unlinkSync(tempP.decisoes);
      }
    });

    it('decisão marcada [x] sem autor é reprovada no Gate 1', () => {
      const conteudoSemAutor = '- [x] D-001 · R01/P01 · bloqueante · Qual é o total? → O aplicativo (2026-10-27) · sha256: 1c4a9fe87ef74ec522fc9ce99aac33ebe3033401d4ef2112ea81b6e7bf6cedc1\n';
      const tempP = { ...caminhosRacha, decisoes: path.join(caminhosRacha.dir, 'decisoes.temp4.test.md') };
      fs.writeFileSync(tempP.decisoes, conteudoSemAutor, 'utf8');
      try {
        const g = avaliarGate1(tempP);
        const c = g.criterios.find(cr => cr.id === 'c')!;
        expect(c.ok).toBe(false);
        expect(g.verde).toBe(false);
        expect(c.detalhe).toContain('sem autoria declarada');
      } finally {
        fs.unlinkSync(tempP.decisoes);
      }
    });

    it('decisão com hash fraudulento (gravado diferente do calculado) é reprovada no Gate 1', () => {
      const conteudoFraudulento = '- [x] D-001 · R01/P01 · bloqueante · Qual é o total? → O aplicativo (2026-10-27) · autor: Eliézer Rosa · sha256: 0000000000000000000000000000000000000000000000000000000000000000\n';
      const tempP = { ...caminhosRacha, decisoes: path.join(caminhosRacha.dir, 'decisoes.temp5.test.md') };
      fs.writeFileSync(tempP.decisoes, conteudoFraudulento, 'utf8');
      try {
        const g = avaliarGate1(tempP);
        const c = g.criterios.find(cr => cr.id === 'c')!;
        expect(c.ok).toBe(false);
        expect(g.verde).toBe(false);
        expect(c.detalhe).toContain('decisão D-001 corrompida');
      } finally {
        fs.unlinkSync(tempP.decisoes);
      }
    });
  });
});
