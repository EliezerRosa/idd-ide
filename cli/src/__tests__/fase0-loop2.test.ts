import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { caminhosCaso, inicializarCaso, lerDecisoes, lerTexto } from '../lib/fase0/casos.ts';
import { avaliarGate1 } from '../lib/fase0/gate1.ts';
import { avaliarGate2 } from '../lib/fase0/gate2.ts';
import { exportarCaso } from '../lib/fase0/exportacao.ts';
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
    expect(g.criterios.filter(c => c.etapa === 'mer' || c.etapa === 'geral').map(c => c.ok)).toEqual([true, true, true, true]);
    expect(g.etapa).toBe('uc');
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
    const r3 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-27', semNovaRodada: true });
    expect(r3.aplicacao!.modelo).toBe('aprovado');
    expect(r3.gate!.criterios.filter(c => c.etapa === 'mer').every(c => c.ok)).toBe(true);
    expect(r3.etapa).toBe('uc');
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

// ── Etapa UC ────────────────────────────────────────────────────────

const CASOS_OK = [
  'atores:',
  '  - nome: Participante',
  '    tipo: humano',
  '    descricao: Quem consome e paga a própria cota.',
  'casos_de_uso:',
  '  - id: UC-01',
  '    nome: Consultar a própria cota',
  '    ator: Participante',
  '    intencoes: [INT-001]',
  '    transacoes:',
  '      - id: TN-01',
  '        nome: Entrar na mesa',
  '        pre: ["A [[Mesa]] existe."]',
  '        pos: ["O [[Participante]] pertence a exatamente uma [[Mesa]]."]',
  '        invariantes: [INV-001]',
  '        altera: [Participante]',
  '        le: [Mesa.chave_pix]',
].join('\n');

const respostaUc = (artefato: string) => ({ perguntas: [], artefato, suposicoes: [], contradicoes: [], observacoes: '' });

function casoComMer() {
  const p = caso();
  fs.mkdirSync(p.modelo, { recursive: true });
  fs.writeFileSync(p.dominio, MODELO_OK);
  return p;
}

describe('Gate 2 · casos de uso', () => {
  const uc = (g: ReturnType<typeof avaliarGate2>, id: string) => g.criterios.find(c => c.id === id)!;

  it('verde na etapa UC com casos de uso completos; avança para atividades', () => {
    const p = casoComMer();
    fs.writeFileSync(p.casos, CASOS_OK);
    const g = avaliarGate2(p);
    expect(g.criterios.filter(c => c.etapa === 'mer' || c.etapa === 'uc' || c.etapa === 'geral').map(c => [c.id, c.ok])).toEqual([
      ['a', true], ['b', true], ['c', true], ['e', true], ['f', true], ['g', true], ['h', true], ['i', true], ['d', true],
    ]);
    expect(g.etapa).toBe('atividades');
  });

  it('reprova transação sem pós, intenção descoberta, invariante órfã e referências inexistentes', () => {
    const p = casoComMer();
    fs.writeFileSync(p.casos, CASOS_OK
      .replace('    intencoes: [INT-001]', '    intencoes: [INT-009]')
      .replace('        pos: ["O [[Participante]] pertence a exatamente uma [[Mesa]]."]', '        pos: []')
      .replace('        invariantes: [INV-001]', '        invariantes: []')
      .replace('        le: [Mesa.chave_pix]', '        le: [Mesa.titulo, Conta]')
      .replace('    ator: Participante', '    ator: Garcom'));
    const g = avaliarGate2(p);
    expect(uc(g, 'f').detalhe).toMatch(/TN-01/);
    expect(uc(g, 'g').detalhe).toMatch(/INT-001/);
    expect(uc(g, 'h').detalhe).toMatch(/INV-001/);
    expect(uc(g, 'i').detalhe).toMatch(/Garcom/);
    expect(uc(g, 'i').detalhe).toMatch(/INT-009/);
    expect(uc(g, 'i').detalhe).toMatch(/Mesa\.titulo/);
    expect(uc(g, 'i').detalhe).toMatch(/classe "Conta"/);
  });

  it('(e) acusa YAML inválido, ids repetidos e fora do padrão', () => {
    const p = casoComMer();
    fs.writeFileSync(p.casos, 'casos_de_uso: [\n');
    expect(uc(avaliarGate2(p), 'e').detalhe).toMatch(/YAML inválido/);
    fs.writeFileSync(p.casos, CASOS_OK.replace('id: TN-01', 'id: UC-01'));
    expect(uc(avaliarGate2(p), 'e').detalhe).toMatch(/ids repetidos: UC-01/);
  });
});

describe('loop 2 · casos de uso', () => {
  it('depois do MER, gera a rodada UC; aprovar grava casos-de-uso.yaml e contexto.puml', async () => {
    const p = casoComMer();
    const prov = new RecordedProvider([respostaUc(CASOS_OK)]);
    const r1 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-27' });
    expect(r1.estado).toBe('nova-rodada');
    expect(r1.etapa).toBe('uc');
    expect(prov.pedidos[0].schemaName).toBe('rodada_casos_de_uso');
    expect(prov.pedidos[0].user).toMatch(/MER aprovado/);
    const md = arquivoEtapa(p, 'uc', 1, 'md');
    expect(lerTexto(md)).toMatch(/```yaml\natores:/);
    expect(lerTexto(md)).toMatch(/✓ \(h\) nenhuma invariante órfã/);

    marcar(md, '**Casos de uso:** [ ] aprovar', '**Casos de uso:** [x] aprovar');
    const r2 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-27', semNovaRodada: true });
    expect(r2.aplicacao!.modelo).toBe('aprovado');
    expect(r2.gate!.criterios.filter(c => c.etapa === 'uc').every(c => c.ok)).toBe(true);
    expect(r2.etapa).toBe('atividades');
    expect(lerTexto(p.casos)).toBe(CASOS_OK + '\n');
    const puml = lerTexto(p.contexto);
    expect(puml).toMatch(/actor "Participante" as Participante/);
    expect(puml).toMatch(/usecase "UC-01 Consultar a própria cota" as UC_01/);
    expect(puml).toMatch(/Participante --> UC_01/);
    expect(lerTexto(p.decisoes)).toMatch(/L2\/UC01\/artefato · casos de uso aprovado: modelo\/casos-de-uso\.yaml/);
  });

  it('não aprova YAML inválido', async () => {
    const p = casoComMer();
    await executarLoop2({ root, caso: 'c', provedor: new RecordedProvider([respostaUc(CASOS_OK)]) });
    const md = arquivoEtapa(p, 'uc', 1, 'md');
    marcar(md, 'casos_de_uso:', 'casos_de_uso: [');
    marcar(md, '**Casos de uso:** [ ] aprovar', '**Casos de uso:** [x] aprovar');
    await expect(executarLoop2({ root, caso: 'c', provedor: new RecordedProvider([]) })).rejects.toThrow(/YAML inválido/);
  });
});

// ── Etapa Atividades ────────────────────────────────────────────────

const ATIVIDADES_OK = [
  'atividades:',
  '  - uc: UC-01',
  '    resumo: Participante entra na mesa e consulta a própria cota.',
  '    passos:',
  '      - id: P-01',
  '        raia: Participante',
  '        acao: "Solicita entrada na [[Mesa]]."',
  '      - id: P-02',
  '        raia: Sistema',
  '        acao: "Registra o [[Participante]] na [[Mesa]]."',
  '        transacao: TN-01',
  '        guarda: "A [[Mesa]] existe."',
  '        senao: "Informa que a [[Mesa]] não foi encontrada."',
].join('\n');

const respostaAtiv = (artefato: string) => ({ perguntas: [], artefato, suposicoes: [], contradicoes: [], observacoes: '' });

function casoComUc() {
  const p = casoComMer();
  fs.writeFileSync(p.casos, CASOS_OK);
  return p;
}

describe('Gate 2 · atividades', () => {
  const ativ = (g: ReturnType<typeof avaliarGate2>, id: string) => g.criterios.find(c => c.id === id)!;

  it('verde na etapa atividades com fluxos completos; avança para estados', () => {
    const p = casoComUc();
    fs.writeFileSync(p.atividades, ATIVIDADES_OK);
    const g = avaliarGate2(p);
    expect(g.criterios.filter(c => c.etapa !== 'estados' && c.etapa !== 'metodos').map(c => [c.id, c.ok])).toEqual([
      ['a', true], ['b', true], ['c', true],
      ['e', true], ['f', true], ['g', true], ['h', true], ['i', true],
      ['j', true], ['k', true], ['l', true], ['m', true],
      ['d', true],
    ]);
    expect(g.etapa).toBe('estados');
  });

  it('reprova UC sem fluxo, transação fora da raia Sistema, transação sem guarda/senao e referências inválidas', () => {
    const p = casoComUc();
    fs.writeFileSync(p.atividades, [
      'atividades:',
      '  - uc: UC-99',
      '    resumo: Fluxo órfão.',
      '    passos:',
      '      - id: P-01',
      '        raia: Garcom',
      '        acao: "Tenta executar transação."',
      '        transacao: TN-99',
    ].join('\n'));
    const g = avaliarGate2(p);
    expect(ativ(g, 'j').detalhe).toMatch(/casos de uso sem fluxo: UC-01/);
    expect(ativ(g, 'k').detalhe).toMatch(/TN-01 \(UC-01\) não é executada/);
    expect(ativ(g, 'm').detalhe).toMatch(/caso de uso "UC-99" não existe/);
    expect(ativ(g, 'm').detalhe).toMatch(/raia "Garcom"/);
    expect(ativ(g, 'm').detalhe).toMatch(/transação "TN-99" não existe/);

    // TN-01 na raia do ator e sem guarda/senao
    fs.writeFileSync(p.atividades, [
      'atividades:',
      '  - uc: UC-01',
      '    resumo: Fluxo sem guarda.',
      '    passos:',
      '      - id: P-01',
      '        raia: Participante',
      '        acao: "Executa direto."',
      '        transacao: TN-01',
    ].join('\n'));
    const g2 = avaliarGate2(p);
    expect(ativ(g2, 'k').detalhe).toMatch(/deve ter raia Sistema/);
    expect(ativ(g2, 'l').detalhe).toMatch(/exige guarda e senao/);
  });
});

describe('loop 2 · atividades', () => {
  it('depois dos casos de uso, gera a rodada de atividades; aprovar grava atividades.yaml e atividades/UC-01.puml', async () => {
    const p = casoComUc();
    const prov = new RecordedProvider([respostaAtiv(ATIVIDADES_OK)]);
    const r1 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-28' });
    expect(r1.estado).toBe('nova-rodada');
    expect(r1.etapa).toBe('atividades');
    expect(prov.pedidos[0].schemaName).toBe('rodada_atividades');
    expect(prov.pedidos[0].user).toMatch(/casos de uso aprovados/);
    const md = arquivoEtapa(p, 'atividades', 1, 'md');
    expect(lerTexto(md)).toMatch(/```yaml\natividades:/);
    expect(lerTexto(md)).toMatch(/✓ \(k\) toda transação de negócio é executada pelo Sistema/);

    marcar(md, '**Atividades:** [ ] aprovar', '**Atividades:** [x] aprovar');
    const r2 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-28', semNovaRodada: true });
    expect(r2.aplicacao!.modelo).toBe('aprovado');
    expect(r2.gate!.criterios.filter(c => c.etapa === 'atividades').every(c => c.ok)).toBe(true);
    expect(r2.etapa).toBe('estados');
    expect(lerTexto(p.atividades)).toBe(ATIVIDADES_OK + '\n');
    const puml = lerTexto(path.join(p.atividadesDir, 'UC-01.puml'));
    expect(puml).toMatch(/title UC-01 Consultar a própria cota — c/);
    expect(puml).toMatch(/\|Participante\|/);
    expect(puml).toMatch(/\|Sistema\|/);
    expect(puml).toMatch(/if \(A \[\[Mesa\]\] existe\.\?\) then \(sim\)/);
    expect(puml).toMatch(/:P-02 \[TN-01\] Registra o \[\[Participante\]\] na \[\[Mesa\]\]\.;/);
    expect(lerTexto(p.decisoes)).toMatch(/L2\/ATIVIDADES01\/artefato · atividades aprovado: modelo\/atividades\.yaml/);
  });
});

// ── Etapa Estados ───────────────────────────────────────────────────

const ESTADOS_OK = [
  'maquinas:',
  '  - classe: Participante',
  '    estados:',
  '      - nome: Ativo',
  '        descricao: "[[Participante]] integrado à [[Mesa]]."',
  '    transicoes:',
  '      - de: "[*]"',
  '        para: Ativo',
  '        transacao: TN-01',
  '        efeito: "Inclui o [[Participante]] na [[Mesa]]."',
].join('\n');

const respostaEst = (artefato: string) => ({ perguntas: [], artefato, suposicoes: [], contradicoes: [], observacoes: '' });

function casoComAtiv() {
  const p = casoComUc();
  fs.writeFileSync(p.atividades, ATIVIDADES_OK);
  return p;
}

describe('Gate 2 · estados', () => {
  const est = (g: ReturnType<typeof avaliarGate2>, id: string) => g.criterios.find(c => c.id === id)!;

  it('verde na etapa estados com máquinas completas; avança para métodos', () => {
    const p = casoComAtiv();
    fs.writeFileSync(p.estados, ESTADOS_OK);
    const g = avaliarGate2(p);
    expect(g.criterios.filter(c => c.etapa !== 'metodos').map(c => [c.id, c.ok])).toEqual([
      ['a', true], ['b', true], ['c', true],
      ['e', true], ['f', true], ['g', true], ['h', true], ['i', true],
      ['j', true], ['k', true], ['l', true], ['m', true],
      ['n', true], ['o', true], ['p', true], ['q', true],
      ['d', true],
    ]);
    expect(g.verde).toBe(false);
    expect(g.etapa).toBe('metodos');
  });

  it('reprova classe com atributo alterado sem máquina, estado inalcançável, TN que não altera a classe e referências inválidas', () => {
    const p = casoComAtiv();
    // TN-01 altera Mesa.chave_pix, logo Mesa precisa de máquina com >= 2 estados
    fs.writeFileSync(p.casos, CASOS_OK.replace('        altera: [Participante]', '        altera: [Mesa.chave_pix]'));
    fs.writeFileSync(p.estados, [
      'maquinas:',
      '  - classe: Participante',
      '    estados:',
      '      - nome: Ativo',
      '        descricao: "Ativo"',
      '      - nome: Isolado',
      '        descricao: "Nunca alcançado"',
      '    transicoes:',
      '      - de: "[*]"',
      '        para: Ativo',
      '        transacao: TN-01',
      '  - classe: Conta',
      '    estados:',
      '      - nome: Aberta',
      '        descricao: "Aberta"',
      '    transicoes:',
      '      - de: Aberta',
      '        para: Aberta',
      '        transacao: TN-99',
    ].join('\n'));
    const g = avaliarGate2(p);
    expect(est(g, 'n').detalhe).toMatch(/classes com atributo alterado sem máquina de estado: Mesa/);
    expect(est(g, 'o').detalhe).toMatch(/Participante: TN-01 não altera Participante/);
    expect(est(g, 'p').detalhe).toMatch(/Participante: estados inalcançáveis a partir de \[\*\]: Isolado/);
    expect(est(g, 'p').detalhe).toMatch(/Conta: sem transição inicial a partir de \[\*\]/);
    expect(est(g, 'q').detalhe).toMatch(/classe "Conta" não está no MER/);
    expect(est(g, 'q').detalhe).toMatch(/transação "TN-99" não existe/);
  });
});

describe('loop 2 · estados', () => {
  it('depois das atividades, gera a rodada de estados; aprovar grava estados.yaml e estados/Participante.puml', async () => {
    const p = casoComAtiv();
    const prov = new RecordedProvider([respostaEst(ESTADOS_OK)]);
    const r1 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-28' });
    expect(r1.estado).toBe('nova-rodada');
    expect(r1.etapa).toBe('estados');
    expect(prov.pedidos[0].schemaName).toBe('rodada_estados');
    expect(prov.pedidos[0].user).toMatch(/atividades aprovadas/);
    const md = arquivoEtapa(p, 'estados', 1, 'md');
    expect(lerTexto(md)).toMatch(/```yaml\nmaquinas:/);
    expect(lerTexto(md)).toMatch(/✓ \(p\) toda máquina parte de \[\*\]/);

    marcar(md, '**Estados:** [ ] aprovar', '**Estados:** [x] aprovar');
    const r2 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-28', semNovaRodada: true });
    expect(r2.aplicacao!.modelo).toBe('aprovado');
    expect(r2.gate!.criterios.filter(c => c.etapa === 'estados').every(c => c.ok)).toBe(true);
    expect(r2.etapa).toBe('metodos');
    expect(lerTexto(p.estados)).toBe(ESTADOS_OK + '\n');
    const puml = lerTexto(path.join(p.estadosDir, 'Participante.puml'));
    expect(puml).toMatch(/title Estados de Participante — c/);
    expect(puml).toMatch(/state "Ativo" as Ativo/);
    expect(puml).toMatch(/\[\*\] --> Ativo : TN-01 Entrar na mesa/);
    expect(lerTexto(p.decisoes)).toMatch(/L2\/ESTADOS01\/artefato · estados aprovado: modelo\/estados\.yaml/);
  });
});

// ── Etapa Métodos ───────────────────────────────────────────────────

const METODOS_OK = [
  'metodos:',
  '  - classe: Mesa',
  '    metodo: entrarNaMesa',
  '    visibilidade: public',
  '    intencao: "Incluir um [[Participante]] na [[Mesa]] e exibir a sua [[Cota]]."',
  '    transacoes: [TN-01]',
  '    invariantes: [INV-001]',
  '    allowed_fields: [Participante]',
  '    read_only_fields: [Mesa.chave_pix]',
  '    restricoes:',
  '      - "A [[Mesa]] deve existir antes da inclusão do [[Participante]]."',
  '    aceitacao:',
  '      - dado: "A [[Mesa]] existe com [[ChavePix]] válida."',
  '        quando: "Mesa.entrarNaMesa é executado pelo [[Participante]]."',
  '        entao: "O [[Participante]] passa a pertencer à [[Mesa]] com [[Cota]] >= 0."',
].join('\n');

const respostaMet = (artefato: string) => ({ perguntas: [], artefato, suposicoes: [], contradicoes: [], observacoes: '' });

function casoComEst() {
  const p = casoComAtiv();
  fs.writeFileSync(p.estados, ESTADOS_OK);
  return p;
}

describe('Gate 2 · métodos', () => {
  const met = (g: ReturnType<typeof avaliarGate2>, id: string) => g.criterios.find(c => c.id === id)!;

  it('verde com métodos circunscritos completos; fecha o Gate 2', () => {
    const p = casoComEst();
    fs.writeFileSync(p.metodos, METODOS_OK);
    const g = avaliarGate2(p);
    expect(g.criterios.map(c => [c.id, c.ok])).toEqual([
      ['a', true], ['b', true], ['c', true],
      ['e', true], ['f', true], ['g', true], ['h', true], ['i', true],
      ['j', true], ['k', true], ['l', true], ['m', true],
      ['n', true], ['o', true], ['p', true], ['q', true],
      ['r', true], ['s', true], ['t', true], ['u', true],
      ['d', true],
    ]);
    expect(g.verde).toBe(true);
    expect(g.etapa).toBe('concluido');
  });

  it('reprova TN sem método, invariante ausente, sobreposição allowed/read_only e referências inválidas', () => {
    const p = casoComEst();
    fs.writeFileSync(p.metodos, [
      'metodos:',
      '  - classe: Conta',
      '    metodo: executar',
      '    visibilidade: public',
      '    intencao: "Método com referências inválidas para teste."',
      '    transacoes: [TN-99]',
      '    invariantes: [INV-999]',
      '    allowed_fields: [Mesa.chave_pix]',
      '    read_only_fields: [Mesa.chave_pix, Mesa.inexistente]',
      '    restricoes: []',
      '    aceitacao:',
      '      - dado: "Dado"',
      '        quando: "Quando"',
      '        entao: "Então executa"',
    ].join('\n'));
    const g = avaliarGate2(p);
    expect(met(g, 's').detalhe).toMatch(/TN-01 sem método/);
    expect(met(g, 't').detalhe).toMatch(/sobreposição allowed\/read_only \(Mesa\.chave_pix\)/);
    expect(met(g, 'u').detalhe).toMatch(/classe "Conta" fora do MER/);
    expect(met(g, 'u').detalhe).toMatch(/transação "TN-99" inexistente/);
    expect(met(g, 'u').detalhe).toMatch(/invariante "INV-999" inexistente/);
    expect(met(g, 'u').detalhe).toMatch(/atributo inexistente no MER "Mesa\.inexistente"/);
  });
});

describe('loop 2 · métodos', () => {
  it('depois dos estados, gera a rodada de métodos; aprovar grava metodos.yaml, contratos v2 e rastreabilidade.md e fecha o Gate 2', async () => {
    const p = casoComEst();
    const prov = new RecordedProvider([respostaMet(METODOS_OK)]);
    const r1 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-28' });
    expect(r1.estado).toBe('nova-rodada');
    expect(r1.etapa).toBe('metodos');
    expect(prov.pedidos[0].schemaName).toBe('rodada_metodos');
    expect(prov.pedidos[0].user).toMatch(/estados aprovados/);
    const md = arquivoEtapa(p, 'metodos', 1, 'md');
    expect(lerTexto(md)).toMatch(/```yaml\nmetodos:/);
    expect(lerTexto(md)).toMatch(/✓ \(u\) classes, atributos, transações e invariantes citados existem/);

    marcar(md, '**Métodos:** [ ] aprovar', '**Métodos:** [x] aprovar');
    const r2 = await executarLoop2({ root, caso: 'c', provedor: prov, hoje: '2026-10-28' });
    expect(r2.aplicacao!.modelo).toBe('aprovado');
    expect(r2.estado).toBe('gate-verde');
    expect(lerTexto(p.metodos)).toBe(METODOS_OK + '\n');
    const contrato = lerTexto(path.join(p.contratosDir, 'Mesa.entrarNaMesa.intent.yaml'));
    expect(contrato).toMatch(/version: '2\.0'/);
    expect(contrato).toMatch(/target_class: Mesa/);
    expect(contrato).toMatch(/target_method: entrarNaMesa/);
    const rastreio = lerTexto(p.rastreabilidade);
    expect(rastreio).toMatch(/# Matriz de Rastreabilidade — c/);
    expect(rastreio).toMatch(/\| \*\*INT-001\*\* \| UC-01 \(Consultar a própria cota\) \| TN-01 \| `Mesa\.entrarNaMesa` \| `contratos\/Mesa\.entrarNaMesa\.intent\.yaml` \|/);
    expect(rastreio).toMatch(/\| \*\*INV-001\*\* \| TN-01 \| `Mesa\.entrarNaMesa` \| `contratos\/Mesa\.entrarNaMesa\.intent\.yaml` \|/);
    expect(lerTexto(p.decisoes)).toMatch(/L2\/METODOS01\/artefato · métodos aprovado: modelo\/metodos\.yaml/);
  });
});

// ── Entrega 5 · Exportações ──────────────────────────────────────────

describe('fase0 · export', () => {
  it('exige Gate 2 verde sem --forcar e gera DBML, PlantUML, SQL e spec.md quando verde', () => {
    const p = casoComEst();
    expect(() => exportarCaso(root, 'c', p)).toThrow(/Gate 2 de "c" não está verde/);

    fs.writeFileSync(p.metodos, METODOS_OK);
    const r = exportarCaso(root, 'c', p);
    expect(r.arquivos.length).toBe(5);
    expect(lerTexto(p.dbml)).toMatch(/Table Mesa \{/);
    expect(lerTexto(p.dbml)).toMatch(/ref: > Mesa\.id/);
    expect(lerTexto(p.dominioPuml)).toMatch(/\+entrarNaMesa\(\) : \[TN-01\]/);
    expect(lerTexto(p.schemaSql)).toMatch(/CREATE TABLE IF NOT EXISTS/);
    expect(lerTexto(p.specMd)).toMatch(/# Especificação Compilada \(IDD Fase 0\) — c/);
    expect(lerTexto(p.specMd)).toMatch(/## 8\. Métodos Circunscritos e Contratos Comportamentais \(v2\)/);
  });
});
