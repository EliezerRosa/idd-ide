import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { avaliarGate1 } from '../lib/fase0/gate1.ts';
import { arquivoRodada, caminhosCaso, inicializarCaso, lerTexto, listarRodadas } from '../lib/fase0/casos.ts';
import { executarLoop1 } from '../lib/fase0/loop1.ts';
import { renderRodada } from '../lib/fase0/rodada.ts';
import { LIMITE_FONTES, lerFontes } from '../lib/fase0/shada.ts';
import { RecordedProvider } from '../lib/llm/index.ts';

let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-gate-')); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); delete process.env.IDD_LLM; });

const DIC = { version: '1.0', terms: [{ term: 'Sistema', definition: 'O sistema de racha de conta', kind: 'service', aliases: [], forbidden: ['app'] }] };
const INT_OK = '- **INT-001** Quando o dono fecha a conta, o [[Sistema]] deve bloquear novos itens.\n';
const INV_OK = '- **INV-001** [integridade] Todo pagamento sempre pertence a uma conta.\n';

function caso(over: { int?: string; inv?: string; dec?: string; dic?: unknown } = {}) {
  inicializarCaso(root, 'c');
  const p = caminhosCaso(root, 'c');
  fs.appendFileSync(p.intencoes, over.int ?? INT_OK);
  fs.appendFileSync(p.invariantes, over.inv ?? INV_OK);
  if (over.dec) fs.appendFileSync(p.decisoes, over.dec);
  fs.writeFileSync(p.dicionario, JSON.stringify(over.dic ?? DIC));
  return p;
}

const crit = (g: ReturnType<typeof avaliarGate1>, id: string) => g.criterios.find(c => c.id === id)!;

describe('Gate 1', () => {
  it('verde quando tudo está em ordem', () => {
    const g = avaliarGate1(caso());
    expect(g.criterios.map(c => c.ok)).toEqual([true, true, true, true, true]);
    expect(g.verde).toBe(true);
    expect(crit(g, 'e').ok).toBe(true);
    expect(crit(g, 'e').detalhe).toContain('nenhuma detectada');
  });

  it('(e) consultivo: interpretações concorrentes viram pergunta, sem reprovar o gate', () => {
    const g = avaliarGate1(caso({ int: '- **INT-001** O [[Sistema]] deve dividir a conta entre os participantes.\n' }));
    expect(crit(g, 'e').ok).toBe(false);
    expect(crit(g, 'e').consultivo).toBe(true);
    expect(crit(g, 'e').detalhe).toMatch(/interpretações estimadas.*pergunta sugerida/);
    expect(g.verde).toBe(true);
  });

  it('vermelho (a): erro de lint em intenções (LN006/LN010)', () => {
    const g = avaliarGate1(caso({ int: '- **INT-001** O [[Robo]] registra o pedido.\n' }));
    expect(crit(g, 'a').ok).toBe(false);
    expect(crit(g, 'a').detalhe).toMatch(/LN006/);
    expect(g.verde).toBe(false);
  });

  it('vermelho (a): LN007 e LN013', () => {
    const g = avaliarGate1(caso({ int: INT_OK + '- **INT-001** O app deve funcionar sempre.\n' }));
    expect(crit(g, 'a').detalhe).toMatch(/LN007/);
    expect(crit(g, 'a').detalhe).toMatch(/LN013/);
  });

  it('avisos e infos não derrubam o critério (a)', () => {
    const g = avaliarGate1(caso({ int: '- **INT-001** O [[Sistema]] deve responder de forma rápida.\n' }));
    expect(crit(g, 'a').ok).toBe(true);
  });

  it('vermelho (b): invariante com tipo inválido, sem marcador ou sem id', () => {
    expect(crit(avaliarGate1(caso({ inv: '- **INV-001** [bonito] sempre x\n' })), 'b').ok).toBe(false);
    expect(avaliarGate1(caso({ inv: '- **INV-001** [estado] algo vago\n' })).verde).toBe(false);
    fs.rmSync(path.join(root, 'fase0'), { recursive: true, force: true });
    expect(crit(avaliarGate1(caso({ inv: '- Invariante sem id, sempre.\n' })), 'b').ok).toBe(false);
  });

  it('vermelho (c): decisão bloqueante em aberto; não bloqueante não impede', () => {
    const g = avaliarGate1(caso({ dec: '- [ ] D-001 · R01/P01 · bloqueante · Quem fecha a conta?\n' }));
    expect(crit(g, 'c').ok).toBe(false);
    expect(crit(g, 'c').detalhe).toContain('D-001');
    fs.rmSync(path.join(root, 'fase0'), { recursive: true, force: true });
    const g2 = avaliarGate1(caso({ dec: '- [ ] D-001 · R01/P01 · não-bloqueante · Moeda?\n- [x] D-002 · R01/P02 · bloqueante · Q → R (2026-10-27)\n' }));
    expect(crit(g2, 'c').ok).toBe(true);
  });

  it('vermelho (d): sem intenções ou sem invariantes', () => {
    const p = caso({ int: '', inv: '' });
    const g = avaliarGate1(p);
    expect(crit(g, 'd').ok).toBe(false);
    expect(crit(g, 'd').detalhe).toBe('0 intenção(ões), 0 invariante(s)');
    expect(g.verde).toBe(false);
  });

  it('o caso recém-criado (init) está vermelho', () => {
    inicializarCaso(root, 'novo');
    expect(avaliarGate1(caminhosCaso(root, 'novo')).verde).toBe(false);
  });
});

describe('init e fontes', () => {
  it('init cria a estrutura sem sobrescrever o que existe', () => {
    const r1 = inicializarCaso(root, 'c');
    expect(r1.criados.length).toBeGreaterThanOrEqual(7);
    const p = caminhosCaso(root, 'c');
    fs.writeFileSync(p.intencoes, 'MEU TEXTO');
    const r2 = inicializarCaso(root, 'c');
    expect(r2.criados).toEqual([]);
    expect(lerTexto(p.intencoes)).toBe('MEU TEXTO');
    expect(lerTexto(p.decisoes)).toContain('D-001');
    expect(JSON.parse(lerTexto(p.dicionario))).toEqual({ version: '1.0', terms: [] });
    expect(() => inicializarCaso(root, '../fora')).toThrow(/inválido/);
  });

  it('fontes: lê texto, remove tags de html, ignora binários e não trunca', () => {
    inicializarCaso(root, 'c');
    const p = caminhosCaso(root, 'c');
    fs.writeFileSync(path.join(p.fontes, 'a.md'), 'Texto A');
    fs.writeFileSync(path.join(p.fontes, 'b.html'), '<html><style>x{}</style><body><h1>Título</h1><p>Corpo &amp; mais</p><script>alert(1)</script></body></html>');
    fs.writeFileSync(path.join(p.fontes, 'c.png'), 'bin');
    const f = lerFontes(p);
    expect(f.arquivos.map(a => a.nome)).toEqual(['a.md', 'b.html']);
    expect(f.arquivos[1].conteudo).toBe('Título Corpo & mais');
    expect(f.ignorados).toEqual(['c.png']);
    expect(() => lerFontes(p, 10)).toThrow(/não trunca/);
    expect(LIMITE_FONTES).toBe(400_000);
  });
});

// ── Fluxo ponta a ponta com provedor gravado ─────────────────────────

const vazio = { definicao: '', kind: '', aliases: [], proibidos: [] };
const respostaRodada1 = {
  perguntas: [
    { id: 'P01', texto: 'Quem pode fechar a conta?', porque: 'Autorização.', opcoes: ['Só o dono', 'Qualquer participante'], bloqueante: true },
    { id: 'P02', texto: 'Há gorjeta?', porque: 'Cálculo.', opcoes: [], bloqueante: true },
  ],
  propostas: [
    { id: 'PR01', tipo: 'intencao', alvo: 'INT-001', texto: 'Quando o dono fecha a conta, o [[Sistema]] deve bloquear novos itens.', tipoInvariante: '', termo: vazio, justificativa: 'Ciclo de vida.' },
    { id: 'PR02', tipo: 'invariante', alvo: 'INV-001', texto: 'Todo pagamento sempre pertence a uma conta.', tipoInvariante: 'integridade', termo: vazio, justificativa: 'Integridade.' },
    { id: 'PR03', tipo: 'termo', alvo: 'Sistema', texto: '', tipoInvariante: '', termo: { definicao: 'O sistema de racha de conta', kind: 'service', aliases: [], proibidos: ['app'] }, justificativa: 'Termo central.' },
  ],
  contradicoes: [],
  observacoes: 'ok',
};

function responder(md: string, id: string, texto: string): string {
  return md.replace(new RegExp(`(### ${id} ·[\\s\\S]*?\\*\\*Resposta:\\*\\*)`), `$1 ${texto}`);
}
function aceitarTodas(md: string): string {
  return md.replace(/\*\*Decisão:\*\* \[ \] aceitar/g, '**Decisão:** [x] aceitar');
}

describe('idd fase0 loop1 — ponta a ponta', () => {
  it('init → rodada-01 → aguardando → responde → aplica → gate verde (sem nova rodada)', async () => {
    inicializarCaso(root, 'racha');
    const p = caminhosCaso(root, 'racha');
    fs.writeFileSync(path.join(p.fontes, 'texto.md'), 'Racha de conta entre amigos.');
    const prov = new RecordedProvider([respostaRodada1]);

    const r1 = await executarLoop1({ root, caso: 'racha', provedor: prov, hoje: '2026-10-27' });
    expect(r1.estado).toBe('nova-rodada');
    expect(r1.novaRodada).toBe(1);
    expect(fs.existsSync(arquivoRodada(p, 1, 'md'))).toBe(true);
    expect(fs.existsSync(arquivoRodada(p, 1, 'json'))).toBe(true);
    expect(prov.pedidos).toHaveLength(1);
    expect(prov.pedidos[0].user).toContain('Racha de conta entre amigos.');
    expect(prov.pedidos[0].user).toContain('Estado do Gate 1');
    expect(prov.pedidos[0].system).toContain('SHADA');
    expect(prov.pedidos[0].schemaName).toBe('rodada_shada');

    // sem respostas: aguarda
    const r2 = await executarLoop1({ root, caso: 'racha', provedor: prov });
    expect(r2.estado).toBe('aguardando-respostas');
    expect(prov.pedidos).toHaveLength(1);
    expect(lerTexto(p.decisoes)).not.toMatch(/^- \[.\] D-001/m);

    // o humano responde no arquivo
    let md = lerTexto(arquivoRodada(p, 1, 'md'));
    md = responder(md, 'P01', '1');
    md = responder(md, 'P02', 'Não há gorjeta.');
    fs.writeFileSync(arquivoRodada(p, 1, 'md'), aceitarTodas(md));

    const r3 = await executarLoop1({ root, caso: 'racha', provedor: prov, hoje: '2026-10-27' });
    expect(r3.rodadaAplicada).toBe(1);
    expect(r3.aplicacao).toMatchObject({ respondidas: 2, aceitas: 3, abertas: 0 });
    expect(r3.estado).toBe('gate-verde');
    expect(r3.gate?.verde).toBe(true);
    expect(prov.pedidos).toHaveLength(1); // não gerou nova rodada
    expect(listarRodadas(p)).toEqual([1]);
    expect(lerTexto(p.decisoes)).toContain('→ Só o dono (2026-10-27)');

    // reexecutar é estável
    const r4 = await executarLoop1({ root, caso: 'racha', provedor: prov });
    expect(r4.estado).toBe('gate-verde');
    expect(r4.aplicacao).toBeUndefined();
  });

  it('gate vermelho após aplicar → gera rodada-02', async () => {
    inicializarCaso(root, 'racha');
    const p = caminhosCaso(root, 'racha');
    const rodada2 = { perguntas: [{ id: 'x', texto: 'Há gorjeta?', porque: 'p', opcoes: [], bloqueante: true }], propostas: [], contradicoes: ['c1'], observacoes: '' };
    const prov = new RecordedProvider([respostaRodada1, rodada2]);
    await executarLoop1({ root, caso: 'racha', provedor: prov });

    let md = lerTexto(arquivoRodada(p, 1, 'md'));
    md = responder(md, 'P01', '2'); // P02 fica em aberto e bloqueante
    fs.writeFileSync(arquivoRodada(p, 1, 'md'), aceitarTodas(md));
    const r = await executarLoop1({ root, caso: 'racha', provedor: prov });
    expect(r.aplicacao).toMatchObject({ respondidas: 1, abertas: 1 });
    expect(r.gate?.verde).toBe(false);
    expect(r.estado).toBe('nova-rodada');
    expect(r.novaRodada).toBe(2);
    expect(prov.pedidos[1].user).toContain('D-002');
    expect(lerTexto(arquivoRodada(p, 2, 'md'))).toContain('# Rodada 02 — racha');
    expect(lerTexto(arquivoRodada(p, 2, 'md'))).toContain('- c1');
  });

  it('--sem-nova-rodada não chama o provedor', async () => {
    inicializarCaso(root, 'racha');
    const prov = new RecordedProvider([]);
    const r = await executarLoop1({ root, caso: 'racha', provedor: prov, semNovaRodada: true });
    expect(r.estado).toBe('sem-nova-rodada');
    expect(prov.pedidos).toHaveLength(0);
  });

  it('caso inexistente gera erro orientando o init', async () => {
    await expect(executarLoop1({ root, caso: 'nada', provedor: new RecordedProvider([]) })).rejects.toThrow(/fase0 init nada/);
  });

  it('provedor manual: grava o pedido, depois lê a resposta (com cerca) e gera a rodada', async () => {
    process.env.IDD_LLM = 'manual';
    inicializarCaso(root, 'racha');
    const p = caminhosCaso(root, 'racha');
    const r1 = await executarLoop1({ root, caso: 'racha' });
    expect(r1.estado).toBe('aguardando-manual');
    expect(r1.pedidoPath).toBe(path.join(p.rodadas, 'rodada-01.pedido.md'));
    expect(fs.existsSync(r1.pedidoPath!)).toBe(true);
    fs.writeFileSync(r1.respostaPath!, '```json\n' + JSON.stringify(respostaRodada1) + '\n```');
    const r2 = await executarLoop1({ root, caso: 'racha' });
    expect(r2.estado).toBe('nova-rodada');
    expect(lerTexto(arquivoRodada(p, 1, 'md'))).toBe(renderRodada('racha', 1, JSON.parse(lerTexto(arquivoRodada(p, 1, 'json')))));
  });
});

// ── Comandos (ajuda, lint-ln, gate1) ─────────────────────────────────

import { vi } from 'vitest';
import { cmdFase0 } from '../commands/fase0.ts';
import { cmdLintLn } from '../commands/lintLn.ts';

describe('comandos', () => {
  const cwd = process.cwd();
  afterEach(() => { process.chdir(cwd); vi.restoreAllMocks(); });

  function capturar() {
    const linhas: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a) => { linhas.push(a.join(' ')); });
    vi.spyOn(console, 'error').mockImplementation((...a) => { linhas.push(a.join(' ')); });
    const exit = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit:${c}`); }) as never);
    return { linhas, exit };
  }

  it('fase0 sem argumentos e lint-ln --help mostram a ajuda', async () => {
    const c = capturar();
    await cmdFase0([]);
    await cmdLintLn(['--help']);
    const saida = c.linhas.join('\n');
    expect(saida).toContain('idd fase0 loop1');
    expect(saida).toContain('idd lint-ln <arquivos...>');
  });

  it('lint-ln: exit 1 com erro, 0 só com aviso (1 com --strict)', async () => {
    fs.mkdirSync(path.join(root, '.git'));
    process.chdir(root);
    fs.writeFileSync('erro.md', '- **INT-001** O [[Sistema]] deve pagar e/ou receber.\n');
    fs.writeFileSync('aviso.md', 'O resultado é rápido.\n');
    const c = capturar();
    await expect(cmdLintLn(['erro.md'])).rejects.toThrow('exit:1');
    expect(c.linhas.join('\n')).toMatch(/erro\.md:1:\d+ LN002/);
    c.exit.mockClear();
    await cmdLintLn(['aviso.md']);
    expect(c.exit).not.toHaveBeenCalled();
    await expect(cmdLintLn(['aviso.md', '--strict'])).rejects.toThrow('exit:1');
  });

  it('fase0 init + gate1 (exit 1 quando vermelho)', async () => {
    fs.mkdirSync(path.join(root, '.git'));
    process.chdir(root);
    const c = capturar();
    await cmdFase0(['init', 'demo']);
    expect(fs.existsSync(path.join(root, 'fase0', 'demo', 'decisoes.md'))).toBe(true);
    await expect(cmdFase0(['gate1', 'demo'])).rejects.toThrow('exit:1');
    expect(c.linhas.join('\n')).toContain('Gate 1 vermelho');
    await cmdFase0(['status', 'demo']);
  });
});
