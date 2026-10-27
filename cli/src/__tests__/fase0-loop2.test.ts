import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { caminhosCaso, inicializarCaso, lerDecisoes, lerTexto } from '../lib/fase0/casos.ts';
import { avaliarGate2 } from '../lib/fase0/gate2.ts';
import { arquivoEtapa, executarLoop2, lerRodadaMer } from '../lib/fase0/loop2.ts';
import { normalizarSaidaMer } from '../lib/fase0/modelo.ts';
import { RecordedProvider } from '../lib/llm/index.ts';

let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-loop2-')); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

const termo = (term: string, kind: string) => ({ term, definition: `Definição de ${term} no domínio`, kind, aliases: [], forbidden: [] });
const DIC = { version: '1.0', terms: [termo('Mesa', 'aggregate'), termo('Participante', 'entity'), termo('Cota', 'value-object')] };

/** Caso com Gate 1 verde. */
function caso() {
  inicializarCaso(root, 'c');
  const p = caminhosCaso(root, 'c');
  fs.appendFileSync(p.intencoes, '- **INT-001** O aplicativo deve exibir a cada [[Participante]] a própria [[Cota]].\n');
  fs.appendFileSync(p.invariantes, '- **INV-001** [integridade] Todo [[Participante]] sempre pertence a exatamente uma [[Mesa]].\n');
  fs.writeFileSync(p.dicionario, JSON.stringify(DIC));
  return p;
}

const MODELO_OK = [
  'classDiagram',
  '  class Mesa {',
  '    +uuid id PK',
  '    +string chave_pix',
  '  }',
  '  class Participante {',
  '    +uuid id PK',
  '    +uuid mesa_id FK(Mesa.id)',
  '    +string nome',
  '  }',
  '  Mesa "1" --> "N" Participante : reúne',
].join('\n');

/** Participante com cep → cidade: viola 3NF. */
const MODELO_RUIM = MODELO_OK.replace('    +string nome', '    +string nome\n    +string cep\n    +string cidade')
  + '\n  %% DF Participante: cep -> cidade';

const resposta = (modelo: string, perguntas: unknown[] = []) => ({
  perguntas, modelo, rastreio: [{ classe: 'Mesa', termo: 'Mesa', justificativa: 'agregado' }],
  suposicoes: ['Participante pertence a uma única mesa'], contradicoes: [], observacoes: '',
});

function marcar(file: string, de: string, para: string): void {
  fs.writeFileSync(file, lerTexto(file).replace(de, para));
}

describe('Gate 2 · MER', () => {
  it('vermelho sem modelo', () => {
    const g = avaliarGate2(caso());
    expect(g.verde).toBe(false);
    expect(g.criterios.find(c => c.id === 'a')!.detalhe).toBe('arquivo ausente');
  });

  it('verde com modelo em BCNF que cobre os termos entity/aggregate', () => {
    const p = caso();
    fs.mkdirSync(p.modelo, { recursive: true });
    fs.writeFileSync(p.dominio, MODELO_OK);
    const g = avaliarGate2(p);
    expect(g.criterios.map(c => c.ok)).toEqual([true, true, true, true]);
  });

  it('(b) termo entity sem classe e (c) classe fora da forma normal reprovam; classe fora do dicionário é só aviso', () => {
    const p = caso();
    fs.mkdirSync(p.modelo, { recursive: true });
    fs.writeFileSync(p.dominio, MODELO_RUIM.replace(/Participante/g, 'Pessoa'));
    const g = avaliarGate2(p);
    expect(g.criterios.find(c => c.id === 'b')!.detalhe).toMatch(/Participante/);
    expect(g.criterios.find(c => c.id === 'c')!.detalhe).toMatch(/Pessoa: 2NF: viola 3NF/);
    expect(g.avisos.join()).toMatch(/Pessoa/);
  });

  it('(c) aceita 3NF quando a decomposição BCNF perderia dependência', () => {
    const p = caso();
    fs.mkdirSync(p.modelo, { recursive: true });
    fs.writeFileSync(p.dominio, MODELO_OK + [
      '',
      '  class Endereco {',
      '    +string rua PK',
      '    +string cidade PK',
      '    +string cep',
      '  }',
      '  %% DF Endereco: cep -> cidade',
    ].join('\n'));
    const c = avaliarGate2(p).criterios.find(x => x.id === 'c')!;
    expect(c.ok).toBe(true);
  });
});

describe('loop 2 · MER', () => {
  it('exige Gate 1 verde', async () => {
    inicializarCaso(root, 'c');
    const r = await executarLoop2({ root, caso: 'c', provedor: new RecordedProvider([]) });
    expect(r.estado).toBe('gate1-vermelho');
  });

  it('gera rodada com o diagnóstico do normalizador e espera a decisão', async () => {
    const p = caso();
    const prov = new RecordedProvider([resposta(MODELO_RUIM)]);
    const r1 = await executarLoop2({ root, caso: 'c', provedor: prov });
    expect(r1.estado).toBe('nova-rodada');
    const md = lerTexto(arquivoEtapa(p, 'mer', 1, 'md'));
    expect(md).toMatch(/```mermaid\nclassDiagram/);
    expect(md).toMatch(/✗ \*\*Participante\*\* · chaves \{id\} · 2NF: viola 3NF/);
    expect(md).toMatch(/\*\*Modelo:\*\* \[ \] aprovar/);
    expect(prov.pedidos[0].user).toMatch(/invariantes\.md/);

    const r2 = await executarLoop2({ root, caso: 'c', provedor: prov });
    expect(r2.estado).toBe('aguardando-respostas');
  });

  it('rejeitar registra o comentário e gera nova rodada; aprovar (com edição) grava dominio.mmd e fecha o Gate 2', async () => {
    const p = caso();
    const prov = new RecordedProvider([
      resposta(MODELO_RUIM, [{ id: 'x', texto: 'Participante pode estar em várias mesas?', porque: 'cardinalidade', opcoes: ['Não', 'Sim'], bloqueante: true }]),
      resposta(MODELO_RUIM),
    ]);
    await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-27' });
    const md1 = arquivoEtapa(p, 'mer', 1, 'md');
    marcar(md1, '**Resposta:**', '**Resposta:** 1');
    marcar(md1, '**Modelo:** [ ] aprovar  [ ] rejeitar', '**Modelo:** [ ] aprovar  [x] rejeitar');
    marcar(md1, '**Comentário (opcional):**', '**Comentário (opcional):** cep não é atributo de participante');

    const r2 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-27' });
    expect(r2.aplicacao).toEqual({ respondidas: 1, abertas: 0, modelo: 'rejeitado' });
    expect(r2.novaRodada).toBe(2);
    const dec = lerDecisoes(lerTexto(p.decisoes));
    expect(dec.map(d => d.campos.join(' · '))).toEqual([
      'L2/MER01/P01 · bloqueante · Participante pode estar em várias mesas? → Não (2026-10-27)',
      'L2/MER01/modelo · modelo rejeitado — cep não é atributo de participante (2026-10-27)',
    ]);
    expect(prov.pedidos[1].user).toMatch(/cep não é atributo de participante/);

    // o autor corrige o modelo no próprio arquivo e aprova
    const md2 = arquivoEtapa(p, 'mer', 2, 'md');
    marcar(md2, '    +string cep\n    +string cidade\n', '');
    marcar(md2, '  %% DF Participante: cep -> cidade\n', '');
    marcar(md2, '**Modelo:** [ ] aprovar', '**Modelo:** [x] aprovar');
    const r3 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-27' });
    expect(r3.aplicacao!.modelo).toBe('aprovado');
    expect(r3.estado).toBe('gate-verde');
    expect(lerTexto(p.dominio)).not.toMatch(/cep/);
    expect(lerTexto(p.decisoes)).toMatch(/modelo aprovado \(editado pelo autor\): modelo\/dominio\.mmd/);
  });

  it('não aplica aprovação de modelo sem classes', async () => {
    const p = caso();
    await executarLoop2({ root, caso: 'c', provedor: new RecordedProvider([resposta('classDiagram\n')]) });
    const md = arquivoEtapa(p, 'mer', 1, 'md');
    marcar(md, '**Modelo:** [ ] aprovar', '**Modelo:** [x] aprovar');
    await expect(executarLoop2({ root, caso: 'c', provedor: new RecordedProvider([]) })).rejects.toThrow(/não tem classes/);
    expect(fs.existsSync(arquivoEtapa(p, 'mer', 1, 'aplicada'))).toBe(false);
  });

  it('lerRodadaMer: ambas marcadas = pendente; Mermaid cercado é aceito na saída do SHADA', () => {
    const s = normalizarSaidaMer(resposta('```mermaid\n' + MODELO_OK + '\n```'));
    expect(s.modelo.startsWith('classDiagram')).toBe(true);
    const r = lerRodadaMer('**Modelo:** [x] aprovar  [x] rejeitar\n', s);
    expect(r.decisao).toBeNull();
    expect(r.modelo).toBe(s.modelo);
  });
});
