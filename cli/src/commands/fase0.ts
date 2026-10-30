// src/commands/fase0.ts — Fase 0: estudo de requisitos em linguagem ubíqua (Loop 1 e Loop 2 por rodadas)
import * as fs from 'node:fs';
import * as path from 'node:path';
import { header, success, error, info, warn, row, subHeader, BOLD, RESET, GRAY, GREEN, RED, YELLOW, CYAN } from '../lib/ui.ts';
import { findProjectRoot } from '../lib/store.ts';
import { caminhosCaso, inicializarCaso, lerDecisoes, lerTexto, listarRodadas, rodadaAplicada, lerDicionarioCaso } from '../lib/fase0/casos.ts';
import { avaliarGate1, lintCaso, type Gate1Resultado } from '../lib/fase0/gate1.ts';
import { extrairItens } from '../lib/fase0/lintLn.ts';
import { executarLoop1 } from '../lib/fase0/loop1.ts';
import { avaliarGate2, type Gate2Resultado } from '../lib/fase0/gate2.ts';
import { executarLoop2 } from '../lib/fase0/loop2.ts';
import { exportarCaso } from '../lib/fase0/exportacao.ts';
import { avaliarAmbiguidadeCaso, type RelatorioAmbiguidade } from '../lib/fase0/shala.ts';
import { graphificarCodigo } from '../lib/fase0/graphify.ts';
import { tsdocDoCaso } from '../lib/fase0/tsdoc.ts';
import { LlmRefusalError, LlmTruncatedError } from '../lib/llm/index.ts';

function ajuda(): void {
  console.log(`
  ${CYAN}idd fase0 init <caso>${RESET}                       cria fase0/<caso>/ (fontes, rodadas, decisões, intenções, invariantes, dicionário)
  ${CYAN}idd fase0 loop1 <caso> [--sem-nova-rodada]${RESET}  aplica a rodada respondida, roda lint + Gate 1 e, se preciso, gera a próxima rodada
  ${CYAN}idd fase0 gate1 <caso>${RESET}                      checklist do Gate 1 (exit 1 se não estiver verde)
  ${CYAN}idd fase0 loop2 <caso> [--sem-nova-rodada]${RESET}  loop 2 (MER → casos de uso → atividades → estados): aplica a rodada respondida, roda o Gate 2 e, se preciso, gera a próxima
  ${CYAN}idd fase0 gate2 <caso>${RESET}                      checklist do Gate 2 (exit 1 se não estiver verde)
  ${CYAN}idd fase0 tsdoc <caso>${RESET}                      gera as anotações TSDoc dos contratos (para o @idd/eslint-plugin fiscalizar)
  ${CYAN}idd fase0 export <caso> [--forcar]${RESET}          exporta DBML, PlantUML, SQL e spec.md (Visual Paradigm / Aider / Spec Kit)
  ${CYAN}idd fase0 status <caso>${RESET}                     rodadas, decisões abertas, contagens e Gate 1
  ${CYAN}idd fase0 shala <caso>${RESET}                      indicador heurístico de ambiguidade (SHALA; consultivo)
  ${CYAN}idd fase0 graphify <arquivo.ts|schema.sql>${RESET}  extrai grafo de classes, métodos e mutações (AST) e termos candidatos

  ${GRAY}Rodadas são arquivos (rodadas/rodada-NN.md): responda no editor e rode loop1 de novo.${RESET}
  ${GRAY}IDD_LLM=anthropic|manual · ANTHROPIC_API_KEY · IDD_FASE0_MODEL (padrão claude-opus-5-5)${RESET}
`);
}

function imprimirGate(g: Gate1Resultado): void {
  subHeader('Gate 1');
  for (const c of g.criterios) {
    const marca = c.ok ? `${GREEN}✓${RESET}` : c.consultivo ? `${YELLOW}⚠${RESET}` : `${RED}✗${RESET}`;
    console.log(`  ${marca}  (${c.id}) ${c.descricao}  ${GRAY}— ${c.detalhe}${RESET}`);
  }
  console.log('');
  console.log(g.verde ? `  ${GREEN}${BOLD}Gate 1 verde${RESET}` : `  ${RED}${BOLD}Gate 1 vermelho${RESET}`);
}

function imprimirGate2(g: Gate2Resultado): void {
  subHeader('Gate 2');
  const nomes = { mer: 'MER', uc: 'casos de uso', atividades: 'atividades', estados: 'estados', metodos: 'métodos', geral: 'geral' } as const;
  for (const c of g.criterios) {
    const marca = c.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    console.log(`  ${marca}  (${c.id}) ${GRAY}[${nomes[c.etapa]}]${RESET} ${c.descricao}  ${GRAY}— ${c.detalhe}${RESET}`);
  }
  for (const a of g.avisos) console.log(`  ${YELLOW}⚠${RESET}  ${a}`);
  console.log('');
  console.log(g.verde ? `  ${GREEN}${BOLD}Gate 2 verde${RESET}`
    : `  ${RED}${BOLD}Gate 2 vermelho${RESET}  ${GRAY}— etapa atual: ${g.etapa === 'concluido' ? 'decisões em aberto' : nomes[g.etapa]}${RESET}`);
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

async function faseLoop2(root: string, args: string[]): Promise<void> {
  const caso = nomeCaso(args, 'loop2');
  const r = await executarLoop2({ root, caso, semNovaRodada: args.includes('--sem-nova-rodada') });
  const rel = (f: string): string => path.relative(process.cwd(), f) || f;

  if (r.estado === 'gate1-vermelho') {
    error(`O loop 2 exige o Gate 1 verde. Rode: idd fase0 gate1 ${caso}`);
    process.exit(1);
  }
  if (r.estado === 'aguardando-respostas') {
    warn(`Aguardando respostas em ${rel(r.arquivo!)}`);
    info(`Responda as perguntas, aprove ou rejeite a proposta e rode de novo: idd fase0 loop2 ${caso}`);
    return;
  }
  if (r.aplicacao) {
    const a = r.aplicacao;
    success(`Rodada ${r.etapaAplicada!.toUpperCase()} ${String(r.rodadaAplicada).padStart(2, '0')} aplicada: ${a.respondidas} respondida(s), ${a.abertas} em aberto, artefato ${a.modelo}`);
  }
  imprimirGate2(r.gate!);

  switch (r.estado) {
    case 'gate-verde':
      console.log('');
      success('Gate 2 verde — o loop 2 convergiu (MER, casos de uso, atividades, estados, métodos, contratos v2 e rastreabilidade)');
      return;
    case 'sem-nova-rodada':
      info('--sem-nova-rodada: nenhuma rodada nova foi gerada.');
      return;
    case 'aguardando-manual':
      console.log('');
      warn('Provedor manual: falta a resposta da IA.');
      info(`Pedido gravado em: ${rel(r.pedidoPath!)}`);
      info(`Cole o pedido em qualquer assistente de IA e salve a resposta JSON em: ${rel(r.respostaPath!)}`);
      info(`Depois rode de novo: idd fase0 loop2 ${caso}`);
      return;
    case 'nova-rodada':
      console.log('');
      success(`Nova rodada gerada: ${rel(r.arquivo!)}`);
      info(`Revise a proposta no arquivo e rode: idd fase0 loop2 ${caso}`);
      return;
  }
}

async function faseExport(root: string, args: string[]): Promise<void> {
  const caso = nomeCaso(args, 'export');
  const p = caminhosCaso(root, caso);
  const r = exportarCaso(root, caso, p, { forcar: args.includes('--forcar') });
  for (const f of r.arquivos) success(`exportado ${f}`);
}

async function faseGate2(root: string, args: string[]): Promise<void> {
  const caso = nomeCaso(args, 'gate2');
  const g = avaliarGate2(caminhosCaso(root, caso));
  imprimirGate2(g);
  if (!g.verde) process.exit(1);
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
  const relShala = avaliarAmbiguidadeCaso(p, caso);
  const corShala = relShala.shala.entropiaBits === 0 ? GREEN : relShala.shala.entropiaBits <= 1.0 ? YELLOW : RED;
  row('SHALA (heurística)', `${corShala}${relShala.shala.modelosConcorrentes} interpretação(ões) estimada(s), ${relShala.shala.entropiaBits.toFixed(2)} bits${RESET}`);
  const g1 = avaliarGate1(p, d);
  imprimirGate(g1);
  if (g1.verde) imprimirGate2(avaliarGate2(p));
}

function imprimirRelatorioShala(rel: RelatorioAmbiguidade): void {
  subHeader(`SHALA — indicador heurístico de ambiguidade (consultivo) [${rel.caso}]`);

  const corEntropia = rel.shala.entropiaBits === 0 ? GREEN : rel.shala.entropiaBits <= 1.0 ? YELLOW : RED;
  row('interpretações estimadas', `${corEntropia}${BOLD}${rel.shala.modelosConcorrentes}${RESET} ${GRAY}(log2 = ${rel.shala.entropiaBits.toFixed(2)} bits; estimativa por regras fixas)${RESET}`);
  row('dicionário ubíquo', `${rel.resumoUbiquidade.termosDicionario} termo(s) cadastrado(s)`);

  if (rel.shala.contraexemplos.length > 0) {
    console.log('');
    console.log(`  ${YELLOW}${BOLD}Tabela de Contraexemplos Concretos:${RESET}`);
    for (const ce of rel.shala.contraexemplos) {
      console.log(`  ${CYAN}Caso de Teste:${RESET} ${ce.casoDeTeste}`);
      console.log(`  ${GRAY}${ce.cenario}${RESET}`);
      console.log(`  ${ce.colunas.map(c => c.padEnd(25)).join(' | ')}`);
      console.log(`  ${'-'.repeat(25 * ce.colunas.length)}`);
      for (const lin of ce.linhas) {
        const valores = ce.colunas.slice(1).map(col => (lin.valoresPorModelo[col] || '—').padEnd(25)).join(' | ');
        console.log(`  ${lin.participanteOuVariavel.padEnd(25)} | ${valores}`);
      }
      console.log(`  ${GRAY}Divergência: ${ce.resumoDivergencia}${RESET}`);
    }
  }

  if (rel.frames.length > 0) {
    console.log('');
    console.log(`  ${YELLOW}${BOLD}Pilar 1 — Lacunas em Frames Semânticos (${rel.frames.length}):${RESET}`);
    for (const f of rel.frames) {
      console.log(`  ${RED}✗${RESET} Linha ${f.linha} [${f.frame}]: ${f.descricao}`);
      console.log(`    ${GRAY}↳ Sugestão: ${f.sugestao}${RESET}`);
    }
  }

  if (rel.estrutural.length > 0) {
    console.log('');
    console.log(`  ${YELLOW}${BOLD}Pilar 2 — Ambiguidade Estrutural & Sintaxe (${rel.estrutural.length}):${RESET}`);
    for (const est of rel.estrutural) {
      console.log(`  ${RED}✗${RESET} Linha ${est.linha} [${est.tipo}]: "${est.trecho}"`);
      for (const l of est.leiturasPossiveis) {
        console.log(`    ${GRAY}↳ ${l}${RESET}`);
      }
    }
  }

  if (rel.sinonimosOcultos.length > 0) {
    console.log('');
    console.log(`  ${YELLOW}${BOLD}Pilar 3 — Sinônimos Ocultos Detectados (JSD) (${rel.sinonimosOcultos.length}):${RESET}`);
    for (const s of rel.sinonimosOcultos) {
      console.log(`  ${YELLOW}⚠${RESET} "${s.termoA}" ↔ "${s.termoB}" (similaridade contexto JSD: ${(s.similaridadeJSD * 100).toFixed(1)}%)`);
      console.log(`    ${GRAY}↳ Contextos: ${s.contextosComuns.join(', ')}${RESET}`);
      console.log(`    ${GRAY}↳ ${s.recomendacao}${RESET}`);
    }
  }

  if (rel.guardas.length > 0) {
    console.log('');
    console.log(`  ${YELLOW}${BOLD}Pilar 4 — Consistência de Guardas Condicionais (${rel.guardas.length}):${RESET}`);
    for (const g of rel.guardas) {
      console.log(`  ${RED}✗${RESET} Linha ${g.linha} [${g.tipo}]: ${g.detalhe}`);
      console.log(`    ${GRAY}↳ Intervalos: ${g.intervalosFaltantesOuSobrepostos.join(', ')}${RESET}`);
    }
  }

  console.log('');
  if (rel.shala.perguntaSocratica) {
    console.log(`  ${CYAN}${BOLD}Pergunta Socrática para decisoes.md:${RESET}`);
    console.log(`  ${rel.shala.perguntaSocratica}`);
    console.log('');
  }

  if (rel.resumoUbiquidade.prontoParaImplementacao) {
    success('As heurísticas da SHALA não detectaram ambiguidade (isso não prova que a especificação seja unívoca).');
  } else {
    warn(`As heurísticas da SHALA estimam interpretações concorrentes (${rel.entropiaGlobalBits.toFixed(2)} bits). Considere as perguntas acima na próxima rodada.`);
  }
}

async function faseTsdoc(root: string, args: string[]): Promise<void> {
  const caso = nomeCaso(args, 'tsdoc');
  const p = caminhosCaso(root, caso);
  const { blocos, invalidos } = tsdocDoCaso(path.join(p.dir, 'contratos'));
  if (!blocos.length) {
    error(`Nenhum contrato v2 com target_class/target_method em fase0/${caso}/contratos/. Rode antes: idd fase0 loop2 ${caso}`);
    process.exit(1);
  }
  for (const b of blocos) {
    console.log(`  ${GRAY}// ${b.classe}.${b.metodo} — contratos/${b.arquivo}${RESET}`);
    console.log(b.texto.split('\n').map(l => `  ${l}`).join('\n'));
    console.log('');
  }
  const comPendencia = blocos.filter(b => b.pendencias.length);
  if (comPendencia.length) {
    warn(`${comPendencia.length} método(s) alteram outras entidades (TODO acima): o autor decide quais campos do agregado as guardam.`);
  }
  if (invalidos.length) warn(`Contratos inválidos ignorados: ${invalidos.join(', ')}`);
  info('Cole cada bloco acima do método correspondente e ative o @idd/eslint-plugin (packages/eslint-plugin-idd).');
}

async function faseShala(root: string, args: string[]): Promise<void> {
  const caso = nomeCaso(args, 'shala');
  const p = caminhosCaso(root, caso);
  const rel = avaliarAmbiguidadeCaso(p, caso);
  imprimirRelatorioShala(rel);
}

async function faseGraphify(root: string, args: string[]): Promise<void> {
  const target = args[0];
  if (!target) {
    error('Uso: idd fase0 graphify <arquivo.ts|schema.sql|repo-url>');
    process.exit(1);
  }

  if (target.startsWith('http://') || target.startsWith('https://') || target.endsWith('.git')) {
    error('Repositório remoto ainda não é suportado: clone o repositório e rode o graphify sobre os arquivos .ts ou .sql.');
    process.exit(1);
  }

  const filePath = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
  if (!fs.existsSync(filePath)) {
    error(`Arquivo não encontrado: "${target}"`);
    process.exit(1);
  }

  const codigo = fs.readFileSync(filePath, 'utf8');
  const res = graphificarCodigo(codigo, path.basename(filePath));

  subHeader(`graphify (AST do TypeScript Compiler API) [${path.basename(filePath)}]`);
  row('classes / entidades', String(res.grafo.stats.classes));
  row('métodos / transações', String(res.grafo.stats.methods));
  row('tabelas SQL', String(res.grafo.stats.tables));
  row('mutações de estado', String(res.grafo.edges.filter(e => e.relation === 'mutates').length));
  row('grafo × código', `${res.grafo.stats.economiaTokensPercent}% menor ${GRAY}(estimativa por caracteres; negativo = grafo maior que o código)${RESET}`);

  console.log('');
  console.log(`  ${YELLOW}${BOLD}Dicionário Ubíquo Proposto a partir do Código:${RESET}`);
  for (const t of res.dicionario) {
    console.log(`  ${GREEN}✓${RESET} [[${t.term}]]  ${GRAY}— ${t.definition}${RESET}`);
  }

  if (res.alertasCodigo.length > 0) {
    console.log('');
    console.log(`  ${YELLOW}${BOLD}Alertas Semânticos de Código:${RESET}`);
    for (const a of res.alertasCodigo) console.log(`  ${a}`);
  }

  console.log('');
  row('SHALA (heurística)', `${res.shala.entropiaBits > 0 ? YELLOW : GREEN}${res.shala.modelosConcorrentes} interpretação(ões) estimada(s)${RESET}`);
  if (res.shala.contraexemplos.length > 0) {
    info(`Contraexemplo concreto: ${res.shala.contraexemplos[0].resumoDivergencia}`);
  }
}

export async function cmdFase0(args: string[]): Promise<void> {
  const sub = args[0];
  if (!sub || sub === '--help' || sub === '-h' || sub === 'help') { header('fase0'); ajuda(); return; }
  header(`fase0 ${sub}`);
  const root = findProjectRoot() ?? process.cwd();
  const rest = args.slice(1);
  try {
    switch (sub) {
      case 'init':     return await faseInit(root, rest);
      case 'loop1':    return await faseLoop1(root, rest);
      case 'gate1':    return await faseGate1(root, rest);
      case 'loop2':    return await faseLoop2(root, rest);
      case 'gate2':    return await faseGate2(root, rest);
      case 'export':   return await faseExport(root, rest);
      case 'tsdoc':    return await faseTsdoc(root, rest);
      case 'status':   return await faseStatus(root, rest);
      case 'shala':    return await faseShala(root, rest);
      case 'graphify': return await faseGraphify(root, rest);
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
