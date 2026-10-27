// src/commands/fase0.ts — Fase 0: estudo de requisitos em linguagem ubíqua (Loop 1 por rodadas)
import * as path from 'node:path';
import { header, success, error, info, warn, row, subHeader, BOLD, RESET, GRAY, GREEN, RED, YELLOW, CYAN } from '../lib/ui.ts';
import { findProjectRoot } from '../lib/store.ts';
import { caminhosCaso, inicializarCaso, lerDecisoes, lerTexto, listarRodadas, rodadaAplicada, lerDicionarioCaso } from '../lib/fase0/casos.ts';
import { avaliarGate1, lintCaso, type Gate1Resultado } from '../lib/fase0/gate1.ts';
import { extrairItens } from '../lib/fase0/lintLn.ts';
import { executarLoop1 } from '../lib/fase0/loop1.ts';
import { LlmRefusalError, LlmTruncatedError } from '../lib/llm/index.ts';

function ajuda(): void {
  console.log(`
  ${CYAN}idd fase0 init <caso>${RESET}                       cria fase0/<caso>/ (fontes, rodadas, decisões, intenções, invariantes, dicionário)
  ${CYAN}idd fase0 loop1 <caso> [--sem-nova-rodada]${RESET}  aplica a rodada respondida, roda lint + Gate 1 e, se preciso, gera a próxima rodada
  ${CYAN}idd fase0 gate1 <caso>${RESET}                      checklist do Gate 1 (exit 1 se não estiver verde)
  ${CYAN}idd fase0 status <caso>${RESET}                     rodadas, decisões abertas, contagens e Gate 1

  ${GRAY}Rodadas são arquivos (rodadas/rodada-NN.md): responda no editor e rode loop1 de novo.${RESET}
  ${GRAY}IDD_LLM=anthropic|manual · ANTHROPIC_API_KEY · IDD_FASE0_MODEL (padrão claude-opus-5-5)${RESET}
`);
}

function imprimirGate(g: Gate1Resultado): void {
  subHeader('Gate 1');
  for (const c of g.criterios) {
    const marca = c.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    console.log(`  ${marca}  (${c.id}) ${c.descricao}  ${GRAY}— ${c.detalhe}${RESET}`);
  }
  console.log('');
  console.log(g.verde ? `  ${GREEN}${BOLD}Gate 1 verde${RESET}` : `  ${RED}${BOLD}Gate 1 vermelho${RESET}`);
}

function nomeCaso(args: string[], sub: string): string {
  const caso = args.find(a => !a.startsWith('--'));
  if (!caso) { error(`Uso: idd fase0 ${sub} <caso>`); process.exit(1); }
  return caso;
}

async function faseInit(root: string, args: string[]): Promise<void> {
  const caso = nomeCaso(args, 'init');
  const r = inicializarCaso(root, caso);
  for (const f of r.criados) success(`criado ${f}`);
  for (const f of r.existentes) info(`já existe ${f} (mantido)`);
  console.log('');
  info(`Coloque o material bruto em fase0/${caso}/fontes/ e rode: idd fase0 loop1 ${caso}`);
}

async function faseLoop1(root: string, args: string[]): Promise<void> {
  const caso = nomeCaso(args, 'loop1');
  const r = await executarLoop1({ root, caso, semNovaRodada: args.includes('--sem-nova-rodada') });
  const rel = (f: string): string => path.relative(process.cwd(), f) || f;

  if (r.estado === 'aguardando-respostas') {
    warn(`Aguardando respostas em ${rel(r.arquivo!)}`);
    info(`Responda as perguntas, decida as propostas e rode de novo: idd fase0 loop1 ${caso}`);
    return;
  }
  if (r.aplicacao) {
    const a = r.aplicacao;
    success(`Rodada ${String(r.rodadaAplicada).padStart(2, '0')} aplicada: ${a.respondidas} respondida(s), ${a.abertas} em aberto, `
      + `${a.aceitas} proposta(s) aceita(s), ${a.rejeitadas} rejeitada(s), ${a.pendentes} pendente(s)${a.invalidas ? `, ${a.invalidas} inválida(s)` : ''}`);
  }
  const d = r.diagnosticos!;
  const todos = [...d.intencoes, ...d.invariantes];
  row('lint', `${todos.filter(x => x.severidade === 'erro').length} erro(s), ${todos.filter(x => x.severidade === 'aviso').length} aviso(s)`);
  imprimirGate(r.gate!);

  switch (r.estado) {
    case 'gate-verde':
      console.log('');
      success('Gate 1 verde — o loop 1 convergiu; revise e siga para o loop 2');
      return;
    case 'sem-nova-rodada':
      info('--sem-nova-rodada: nenhuma rodada nova foi gerada.');
      return;
    case 'aguardando-manual':
      console.log('');
      warn('Provedor manual: falta a resposta da IA.');
      info(`Pedido gravado em: ${rel(r.pedidoPath!)}`);
      info(`Cole o pedido em qualquer assistente de IA e salve a resposta JSON em: ${rel(r.respostaPath!)}`);
      info(`Depois rode de novo: idd fase0 loop1 ${caso}`);
      return;
    case 'nova-rodada':
      console.log('');
      if (r.fontesIgnoradas?.length) info(`Fontes ignoradas (extensão não suportada): ${r.fontesIgnoradas.join(', ')}`);
      success(`Nova rodada gerada: ${rel(r.arquivo!)}`);
      info(`Responda no arquivo e rode: idd fase0 loop1 ${caso}`);
      return;
  }
}

async function faseGate1(root: string, args: string[]): Promise<void> {
  const caso = nomeCaso(args, 'gate1');
  const p = caminhosCaso(root, caso);
  const g = avaliarGate1(p);
  imprimirGate(g);
  if (!g.verde) process.exit(1);
}

async function faseStatus(root: string, args: string[]): Promise<void> {
  const caso = nomeCaso(args, 'status');
  const p = caminhosCaso(root, caso);
  const rodadas = listarRodadas(p);
  row('caso', caso);
  row('rodadas', rodadas.length ? rodadas.map(n => `${String(n).padStart(2, '0')}${rodadaAplicada(p, n) ? '' : `${YELLOW}*${RESET}`}`).join(' ') : '—');
  if (rodadas.length) info('* = rodada ainda não aplicada');
  const decisoes = lerDecisoes(lerTexto(p.decisoes));
  const abertas = decisoes.filter(x => !x.marcada);
  row('decisões', `${decisoes.length - abertas.length} registrada(s), ${abertas.length} em aberto (${abertas.filter(x => x.bloqueante).length} bloqueante(s))`);
  for (const a of abertas) console.log(`    ${GRAY}${a.id} · ${a.campos.join(' · ')}${RESET}`);
  row('intenções', String(extrairItens(lerTexto(p.intencoes), 'INT').length));
  row('invariantes', String(extrairItens(lerTexto(p.invariantes), 'INV').length));
  row('termos', String(lerDicionarioCaso(p.dicionario).terms.length));
  const d = lintCaso(p);
  const todos = [...d.intencoes, ...d.invariantes];
  row('lint', `${todos.filter(x => x.severidade === 'erro').length} erro(s), ${todos.filter(x => x.severidade === 'aviso').length} aviso(s)`);
  imprimirGate(avaliarGate1(p, d));
}

export async function cmdFase0(args: string[]): Promise<void> {
  const sub = args[0];
  if (!sub || sub === '--help' || sub === '-h' || sub === 'help') { header('fase0'); ajuda(); return; }
  header(`fase0 ${sub}`);
  const root = findProjectRoot() ?? process.cwd();
  const rest = args.slice(1);
  try {
    switch (sub) {
      case 'init':   return await faseInit(root, rest);
      case 'loop1':  return await faseLoop1(root, rest);
      case 'gate1':  return await faseGate1(root, rest);
      case 'status': return await faseStatus(root, rest);
      default:
        error(`Subcomando desconhecido: "${sub}"`);
        ajuda();
        process.exit(1);
    }
  } catch (e) {
    if (e instanceof LlmRefusalError) error(`${e.message} Reformule as fontes ou use IDD_LLM=manual.`);
    else if (e instanceof LlmTruncatedError) error(e.message);
    else error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
