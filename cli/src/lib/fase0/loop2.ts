// src/lib/fase0/loop2.ts — Loop 2 (Modelo) por rodadas em arquivo, em etapas: MER → casos de uso → atividades → estados.
// Em cada etapa o SHADA propõe o artefato inteiro; o humano aprova ou rejeita (Confirm-Once da etapa),
// podendo editar o artefato no próprio arquivo da rodada antes de aprovar.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AguardandoRespostaManual, escolherProvedor, type LlmProvider } from '../llm/index.ts';
import { avaliarAtividades, gravarAtividadesPuml, lerAtividades } from './atividades.ts';
import {
  caminhosCaso, fmtDecisaoId, hoje, lerDicionarioCaso, lerTexto, proximoIdDecisao, rotuloRodada, type CasoPaths,
} from './casos.ts';
import { avaliarCasos, lerCasos, renderContexto } from './casosDeUso.ts';
import { avaliarEstados, gravarEstadosPuml, lerEstados } from './estados.ts';
import { avaliarGate1 } from './gate1.ts';
import { avaliarGate2, diagnosticarEntidade, ETAPAS, lerModelo, type EtapaLoop2, type Gate2Resultado } from './gate2.ts';
import { extrairItens } from './lintLn.ts';
import { avaliarMetodos, gravarContratosERastreabilidade, lerMetodos } from './metodos.ts';
import {
  consultarShadaAtividades, consultarShadaEstados, consultarShadaMer, consultarShadaMetodos, consultarShadaUc,
  montarContextoAtividades, montarContextoEstados, montarContextoMer, montarContextoMetodos, montarContextoUc,
  type SaidaAtividades, type SaidaEstados, type SaidaMer, type SaidaMetodos, type SaidaUc,
} from './modelo.ts';
import { lerRodadaRespondida } from './rodada.ts';
import { lerFontes, type FontesLidas, type PerguntaShada, type SaidaShada } from './shada.ts';

export type { EtapaLoop2 };

export function arquivoEtapa(p: CasoPaths, etapa: EtapaLoop2, n: number, ext: 'md' | 'json' | 'aplicada'): string {
  return path.join(p.rodadas, `${etapa}-${rotuloRodada(n)}.${ext}`);
}

export function listarRodadasEtapa(p: CasoPaths, etapa: EtapaLoop2): number[] {
  if (!fs.existsSync(p.rodadas)) return [];
  const nums = new Set<number>();
  const re = new RegExp(`^${etapa}-(\\d+)\\.(json|md)$`);
  for (const f of fs.readdirSync(p.rodadas)) {
    const m = f.match(re);
    if (m) nums.add(Number(m[1]));
  }
  return [...nums].sort((a, b) => a - b);
}

// ── Descritores de etapa ───────────────────────────────────────────

/** Campos comuns às saídas do SHADA em qualquer etapa. */
interface SaidaComum {
  perguntas: PerguntaShada[];
  suposicoes: string[];
  contradicoes: string[];
  observacoes: string;
}

interface Etapa<S extends SaidaComum> {
  id: EtapaLoop2;
  titulo: string;
  /** rótulo da linha de decisão: **<rotulo>:** [ ] aprovar  [ ] rejeitar */
  rotulo: string;
  secao: string;
  linguagem: 'mermaid' | 'yaml';
  destino: (p: CasoPaths) => string;
  artefato: (s: S) => string;
  consultar: (prov: LlmProvider, p: CasoPaths, caso: string, n: number, gate: Gate2Resultado, fontes: FontesLidas) => Promise<S>;
  /** diagnóstico calculado pelo IDD, não pela IA */
  previa: (p: CasoPaths, artefato: string) => string[];
  extras: (s: S) => string[];
  /** mensagem de erro se o artefato não pode ser aprovado como está */
  validar: (artefato: string) => string | undefined;
  aoAprovar?: (p: CasoPaths, caso: string, artefato: string) => void;
}

/** Diagnóstico do MER proposto, para o humano ver antes de aprovar. */
export function previaModelo(p: CasoPaths, mermaid: string): string[] {
  const L: string[] = [];
  let classes;
  try { classes = lerModelo(mermaid).entities.filter(e => !e.abstract); } catch (e) {
    return [`- ✗ o modelo não pôde ser lido: ${e instanceof Error ? e.message : e}`];
  }
  if (!classes.length) return ['- ✗ nenhuma classe reconhecida pelo parser'];
  for (const e of classes) {
    try {
      const d = diagnosticarEntidade(e);
      L.push(`- ${d.ok ? '✓' : '✗'} **${e.name}** · chaves ${d.chaves.map(k => `{${k.join(', ')}}`).join(' ')} · ${d.motivo}`);
    } catch (err) {
      L.push(`- ✗ **${e.name}** · ${err instanceof Error ? err.message : err}`);
    }
  }
  const dic = lerDicionarioCaso(p.dicionario);
  const nomes = new Set(classes.map(e => e.name.toLowerCase()));
  const faltando = dic.terms.filter(t => (t.kind === 'entity' || t.kind === 'aggregate') && !nomes.has(t.term.toLowerCase()));
  if (faltando.length) L.push(`- ✗ termos entity/aggregate sem classe: ${faltando.map(t => t.term).join(', ')}`);
  const conhecidos = new Set(dic.terms.flatMap(t => [t.term, ...t.aliases]).map(x => x.toLowerCase()));
  const fora = classes.filter(e => !conhecidos.has(e.name.toLowerCase()));
  if (fora.length) L.push(`- ⚠ classes fora do dicionário: ${fora.map(e => e.name).join(', ')}`);
  return L;
}

/** Critérios da etapa UC aplicados aos casos de uso propostos. */
export function previaCasos(p: CasoPaths, texto: string): string[] {
  const dic = lerDicionarioCaso(p.dicionario);
  const r = avaliarCasos(lerCasos(texto), {
    intencoes: extrairItens(lerTexto(p.intencoes), 'INT').map(x => x.id),
    invariantes: extrairItens(lerTexto(p.invariantes), 'INV').map(x => x.id),
    modelo: fs.existsSync(p.dominio) ? lerModelo(lerTexto(p.dominio)) : undefined,
    termos: dic.terms.flatMap(t => [t.term, ...t.aliases]),
  });
  return [
    ...r.criterios.map(c => `- ${c.ok ? '✓' : '✗'} (${c.id}) ${c.descricao} — ${c.detalhe}`),
    ...r.avisos.map(a => `- ⚠ ${a}`),
  ];
}

/** Critérios da etapa de atividades aplicados aos fluxos propostos. */
export function previaAtividades(p: CasoPaths, texto: string): string[] {
  const ucs = fs.existsSync(p.casos) ? lerCasos(lerTexto(p.casos)) : undefined;
  const r = avaliarAtividades(lerAtividades(texto), {
    casos: ucs && ucs.ok ? ucs.casos : undefined,
  });
  return [
    ...r.criterios.map(c => `- ${c.ok ? '✓' : '✗'} (${c.id}) ${c.descricao} — ${c.detalhe}`),
    ...r.avisos.map(a => `- ⚠ ${a}`),
  ];
}

/** Critérios da etapa de estados aplicados às máquinas de estado propostas. */
export function previaEstados(p: CasoPaths, texto: string): string[] {
  const ucs = fs.existsSync(p.casos) ? lerCasos(lerTexto(p.casos)) : undefined;
  const r = avaliarEstados(lerEstados(texto), {
    modelo: fs.existsSync(p.dominio) ? lerModelo(lerTexto(p.dominio)) : undefined,
    casos: ucs && ucs.ok ? ucs.casos : undefined,
  });
  return [
    ...r.criterios.map(c => `- ${c.ok ? '✓' : '✗'} (${c.id}) ${c.descricao} — ${c.detalhe}`),
    ...r.avisos.map(a => `- ⚠ ${a}`),
  ];
}

/** Critérios da etapa de métodos aplicados aos métodos circunscritos propostos. */
export function previaMetodos(p: CasoPaths, texto: string): string[] {
  const ucs = fs.existsSync(p.casos) ? lerCasos(lerTexto(p.casos)) : undefined;
  const r = avaliarMetodos(lerMetodos(texto), {
    caso: path.basename(p.dir),
    modelo: fs.existsSync(p.dominio) ? lerModelo(lerTexto(p.dominio)) : undefined,
    casos: ucs && ucs.ok ? ucs.casos : undefined,
    invariantesTexto: lerTexto(p.invariantes),
  });
  return [
    ...r.criterios.map(c => `- ${c.ok ? '✓' : '✗'} (${c.id}) ${c.descricao} — ${c.detalhe}`),
    ...r.avisos.map(a => `- ⚠ ${a}`),
  ];
}

const MER: Etapa<SaidaMer> = {
  id: 'mer', titulo: 'MER', rotulo: 'Modelo', secao: 'Modelo proposto', linguagem: 'mermaid',
  destino: p => p.dominio,
  artefato: s => s.modelo,
  consultar: (prov, p, caso, n, gate, fontes) => consultarShadaMer(prov, montarContextoMer(p, caso, n, gate, fontes)),
  previa: previaModelo,
  extras: s => (s.rastreio.length
    ? ['### Rastreio classe → termo', '', ...s.rastreio.map(r => `- **${r.classe}** ← ${r.termo || '(sem termo)'} — ${r.justificativa}`), '']
    : []),
  validar: a => (lerModelo(a).entities.length ? undefined : 'não tem classes reconhecíveis; corrija o bloco mermaid'),
};

const UC: Etapa<SaidaUc> = {
  id: 'uc', titulo: 'Casos de uso', rotulo: 'Casos de uso', secao: 'Casos de uso propostos', linguagem: 'yaml',
  destino: p => p.casos,
  artefato: s => s.artefato,
  consultar: (prov, p, caso, n, gate, fontes) => consultarShadaUc(prov, montarContextoUc(p, caso, n, gate, fontes)),
  previa: previaCasos,
  extras: () => [],
  validar: a => {
    const r = lerCasos(a);
    if (!r.ok) return `${r.erro}; corrija o bloco yaml`;
    return r.casos.casos_de_uso.length ? undefined : 'não tem casos de uso; corrija o bloco yaml';
  },
  aoAprovar: (p, caso, a) => {
    const r = lerCasos(a);
    if (r.ok) fs.writeFileSync(p.contexto, renderContexto(caso, r.casos), 'utf8');
  },
};

const ATIVIDADES: Etapa<SaidaAtividades> = {
  id: 'atividades', titulo: 'Atividades', rotulo: 'Atividades', secao: 'Atividades propostas', linguagem: 'yaml',
  destino: p => p.atividades,
  artefato: s => s.artefato,
  consultar: (prov, p, caso, n, gate, fontes) => consultarShadaAtividades(prov, montarContextoAtividades(p, caso, n, gate, fontes)),
  previa: previaAtividades,
  extras: () => [],
  validar: a => {
    const r = lerAtividades(a);
    if (!r.ok) return `${r.erro}; corrija o bloco yaml`;
    return r.atividades.atividades.length ? undefined : 'não tem fluxos de atividade; corrija o bloco yaml';
  },
  aoAprovar: (p, caso, a) => {
    const r = lerAtividades(a);
    const ucs = fs.existsSync(p.casos) ? lerCasos(lerTexto(p.casos)) : undefined;
    if (r.ok) gravarAtividadesPuml(p.atividadesDir, caso, r.atividades, ucs && ucs.ok ? ucs.casos : undefined);
  },
};

const ESTADOS: Etapa<SaidaEstados> = {
  id: 'estados', titulo: 'Estados', rotulo: 'Estados', secao: 'Estados propostos', linguagem: 'yaml',
  destino: p => p.estados,
  artefato: s => s.artefato,
  consultar: (prov, p, caso, n, gate, fontes) => consultarShadaEstados(prov, montarContextoEstados(p, caso, n, gate, fontes)),
  previa: previaEstados,
  extras: () => [],
  validar: a => {
    const r = lerEstados(a);
    if (!r.ok) return `${r.erro}; corrija o bloco yaml`;
    return r.estados.maquinas.length ? undefined : 'não tem máquinas de estado; corrija o bloco yaml';
  },
  aoAprovar: (p, caso, a) => {
    const r = lerEstados(a);
    const ucs = fs.existsSync(p.casos) ? lerCasos(lerTexto(p.casos)) : undefined;
    if (r.ok) gravarEstadosPuml(p.estadosDir, caso, r.estados, ucs && ucs.ok ? ucs.casos : undefined);
  },
};

const METODOS: Etapa<SaidaMetodos> = {
  id: 'metodos', titulo: 'Métodos', rotulo: 'Métodos', secao: 'Métodos propostos', linguagem: 'yaml',
  destino: p => p.metodos,
  artefato: s => s.artefato,
  consultar: (prov, p, caso, n, gate, fontes) => consultarShadaMetodos(prov, montarContextoMetodos(p, caso, n, gate, fontes)),
  previa: previaMetodos,
  extras: () => [],
  validar: a => {
    const r = lerMetodos(a);
    if (!r.ok) return `${r.erro}; corrija o bloco yaml`;
    return r.metodos.metodos.length ? undefined : 'não tem métodos circunscritos; corrija o bloco yaml';
  },
  aoAprovar: (p, caso, a) => {
    const r = lerMetodos(a);
    const ucs = fs.existsSync(p.casos) ? lerCasos(lerTexto(p.casos)) : undefined;
    if (r.ok) gravarContratosERastreabilidade(p, caso, r.metodos, ucs && ucs.ok ? ucs.casos : undefined);
  },
};

const DESCRITORES: Record<EtapaLoop2, Etapa<any>> = {
  mer: MER, uc: UC, atividades: ATIVIDADES, estados: ESTADOS, metodos: METODOS,
};

// ── Rodada em Markdown ─────────────────────────────────────────────

export function renderRodadaEtapa<S extends SaidaComum>(p: CasoPaths, caso: string, et: Etapa<S>, n: number, s: S): string {
  const L: string[] = [];
  const destino = path.relative(p.dir, et.destino(p)).split(path.sep).join('/');
  L.push(`# Loop 2 · ${et.titulo} · rodada ${rotuloRodada(n)} — ${caso}`, '');
  L.push(`> Revise a proposta. Você pode editar o bloco ${et.linguagem} abaixo antes de aprovar.`);
  L.push('> Responda as perguntas, marque `[x]` em aprovar ou rejeitar e rode `idd fase0 loop2 ' + caso + '`.');
  L.push(`> Aprovar grava ${destino} (Confirm-Once da etapa). Ao rejeitar, diga o porquê no comentário.`, '');
  if (s.perguntas.length) {
    L.push('## Perguntas', '');
    for (const q of s.perguntas) {
      L.push(`### ${q.id} · ${q.bloqueante ? 'bloqueante' : 'não-bloqueante'}`, '', q.texto, '');
      if (q.porque) L.push(`Por quê: ${q.porque}`, '');
      q.opcoes.forEach((o, i) => L.push(`${i + 1}. ${o}`));
      if (q.opcoes.length) L.push('');
      L.push('**Resposta:**', '');
    }
  }
  L.push(`## ${et.secao}`, '', '```' + et.linguagem, et.artefato(s).trim(), '```', '');
  L.push('### Diagnóstico (calculado pelo IDD, não pela IA)', '', ...et.previa(p, et.artefato(s)), '');
  L.push(...et.extras(s));
  if (s.suposicoes.length) L.push('### Suposições do SHADA (confirme pelas perguntas)', '', ...s.suposicoes.map(x => `- ${x}`), '');
  L.push('## Decisão', '', `**${et.rotulo}:** [ ] aprovar  [ ] rejeitar`, '', '**Comentário (opcional):**', '');
  if (s.contradicoes.length) L.push('## Contradições', '', ...s.contradicoes.map(x => `- ${x}`), '');
  if (s.observacoes) L.push('## Observações', '', s.observacoes, '');
  return L.join('\n');
}

/** Compatibilidade: a rodada MER usa o descritor MER. */
export function renderRodadaMer(p: CasoPaths, caso: string, n: number, s: SaidaMer): string {
  return renderRodadaEtapa(p, caso, MER, n, s);
}

export interface RespostasEtapa {
  respostas: Record<string, string>;
  decisao: 'aprovar' | 'rejeitar' | null;
  /** artefato como está no arquivo (talvez editado pelo autor) */
  artefato: string;
  comentario: string;
}

const escapar = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function lerRodadaEtapa<S extends SaidaComum>(md: string, et: Etapa<S>, saida: S): RespostasEtapa {
  const comoShada: SaidaShada = { perguntas: saida.perguntas, propostas: [], contradicoes: [], observacoes: '' };
  const { respostas } = lerRodadaRespondida(md, comoShada);

  const secao = md.split(new RegExp(`^## ${escapar(et.secao)}\\s*$`, 'm'))[1] ?? '';
  const bloco = secao.match(new RegExp('```' + et.linguagem + '\\s*\\r?\\n([\\s\\S]*?)\\r?\\n```'));
  const artefato = bloco ? bloco[1].trim() + '\n' : et.artefato(saida);

  const linha = md.match(new RegExp(`^\\s*\\*\\*${escapar(et.rotulo)}:\\*\\*\\s*(.*)$`, 'm'))?.[1] ?? '';
  const aprovar = /\[\s*[xX]\s*\]\s*aprovar/i.test(linha);
  const rejeitar = /\[\s*[xX]\s*\]\s*rejeitar/i.test(linha);
  const decisao = aprovar === rejeitar ? null : aprovar ? 'aprovar' : 'rejeitar';

  const depois = md.split(/^\s*\*\*Comentário(?:\s*\(opcional\))?:\*\*/m)[1] ?? '';
  const comentario = depois.split(/^#{1,3}\s/m)[0].replace(/\s+/g, ' ').trim();
  return { respostas, decisao, artefato, comentario };
}

/** Compatibilidade com a etapa MER. */
export function lerRodadaMer(md: string, saida: SaidaMer): RespostasEtapa & { modelo: string } {
  const r = lerRodadaEtapa(md, MER, saida);
  return { ...r, modelo: r.artefato };
}

// ── Aplicação ──────────────────────────────────────────────────────

export interface ResultadoEtapa {
  respondidas: number;
  abertas: number;
  modelo: 'aprovado' | 'rejeitado' | 'pendente';
}

export function aplicarRodadaEtapa<S extends SaidaComum>(
  p: CasoPaths, caso: string, et: Etapa<S>, n: number, r: RespostasEtapa, saida: S, data: string,
): ResultadoEtapa {
  if (r.decisao === 'aprovar') {
    const erro = et.validar(r.artefato);
    if (erro) throw new Error(`O artefato aprovado em ${arquivoEtapa(p, et.id, n, 'md')} ${erro} e rode de novo.`);
  }
  const res: ResultadoEtapa = { respondidas: 0, abertas: 0, modelo: r.decisao === 'aprovar' ? 'aprovado' : r.decisao === 'rejeitar' ? 'rejeitado' : 'pendente' };
  const ref = `L2/${et.id.toUpperCase()}${rotuloRodada(n)}`;
  const achatar = (s: string): string => s.replace(/\s+/g, ' ').trim();
  let contador = proximoIdDecisao(lerTexto(p.decisoes));
  const novas: string[] = [];
  const registrar = (marcada: boolean, alvo: string, campos: string): void => {
    novas.push(`- [${marcada ? 'x' : ' '}] ${fmtDecisaoId(contador++)} · ${ref}/${alvo} · ${campos}`);
  };

  for (const q of saida.perguntas) {
    const rotulo = q.bloqueante ? 'bloqueante' : 'não-bloqueante';
    const resp = r.respostas[q.id];
    if (resp) { registrar(true, q.id, `${rotulo} · ${achatar(q.texto)} → ${achatar(resp)} (${data})`); res.respondidas++; }
    else { registrar(false, q.id, `${rotulo} · ${achatar(q.texto)}`); res.abertas++; }
  }
  const coment = r.comentario ? ` — ${r.comentario}` : '';
  const alvo = et.id === 'mer' ? 'modelo' : 'artefato';
  if (r.decisao === 'aprovar') {
    fs.mkdirSync(p.modelo, { recursive: true });
    fs.writeFileSync(et.destino(p), r.artefato, 'utf8');
    et.aoAprovar?.(p, caso, r.artefato);
    const editado = r.artefato.trim() !== et.artefato(saida).trim() ? ' (editado pelo autor)' : '';
    const destino = path.relative(p.dir, et.destino(p)).split(path.sep).join('/');
    registrar(true, alvo, `${et.id === 'mer' ? 'modelo' : et.titulo.toLowerCase()} aprovado${editado}: ${destino}${coment} (${data})`);
  } else if (r.decisao === 'rejeitar') {
    registrar(true, alvo, `${et.id === 'mer' ? 'modelo' : et.titulo.toLowerCase()} rejeitado${coment} (${data})`);
  }

  if (novas.length) fs.writeFileSync(p.decisoes, lerTexto(p.decisoes).replace(/\s*$/, '') + '\n' + novas.join('\n') + '\n', 'utf8');
  fs.writeFileSync(arquivoEtapa(p, et.id, n, 'aplicada'), `${data}\n`, 'utf8');
  return res;
}

// ── Orquestração ───────────────────────────────────────────────────

export type EstadoLoop2 = 'gate1-vermelho' | 'aguardando-respostas' | 'gate-verde' | 'sem-nova-rodada' | 'nova-rodada' | 'aguardando-manual';

export interface Loop2Opts {
  root: string;
  caso: string;
  semNovaRodada?: boolean;
  provedor?: LlmProvider;
  hoje?: string;
}

export interface Loop2Resultado {
  estado: EstadoLoop2;
  /** etapa da rodada aplicada ou gerada (ou a etapa em que o caso está) */
  etapa: EtapaLoop2 | 'concluido';
  etapaAplicada?: EtapaLoop2;
  aplicacao?: ResultadoEtapa;
  rodadaAplicada?: number;
  novaRodada?: number;
  arquivo?: string;
  gate?: Gate2Resultado;
  pedidoPath?: string;
  respostaPath?: string;
}

export async function executarLoop2(opts: Loop2Opts): Promise<Loop2Resultado> {
  const p = caminhosCaso(opts.root, opts.caso);
  if (!fs.existsSync(p.dir)) throw new Error(`Caso "${opts.caso}" não existe. Crie com: idd fase0 init ${opts.caso}`);
  const out: Loop2Resultado = { estado: 'nova-rodada', etapa: 'mer' };
  if (!avaliarGate1(p).verde) { out.estado = 'gate1-vermelho'; return out; }
  const data = opts.hoje ?? hoje();

  // 1. aplicar a rodada pendente (no máximo uma por etapa fica sem aplicar)
  for (const id of ETAPAS) {
    const et = DESCRITORES[id];
    const ultima = listarRodadasEtapa(p, id).at(-1);
    if (ultima === undefined || fs.existsSync(arquivoEtapa(p, id, ultima, 'aplicada'))) continue;
    const arquivo = arquivoEtapa(p, id, ultima, 'md');
    const saida = JSON.parse(fs.readFileSync(arquivoEtapa(p, id, ultima, 'json'), 'utf8'));
    const r = lerRodadaEtapa(lerTexto(arquivo), et, saida);
    if (r.decisao === null && Object.keys(r.respostas).length === 0) {
      out.estado = 'aguardando-respostas';
      out.etapa = id;
      out.arquivo = arquivo;
      return out;
    }
    out.aplicacao = aplicarRodadaEtapa(p, opts.caso, et, ultima, r, saida, data);
    out.etapaAplicada = id;
    out.rodadaAplicada = ultima;
  }

  // 2. Gate 2
  const gate = avaliarGate2(p);
  out.gate = gate;
  out.etapa = gate.etapa;
  if (gate.verde) { out.estado = 'gate-verde'; return out; }
  if (opts.semNovaRodada || gate.etapa === 'concluido') { out.estado = 'sem-nova-rodada'; return out; }

  // 3. nova rodada da etapa em que o caso está
  const et = DESCRITORES[gate.etapa];
  const n = (listarRodadasEtapa(p, et.id).at(-1) ?? 0) + 1;
  const provedor = opts.provedor ?? escolherProvedor({ dir: p.dir, baseName: `rodadas/${et.id}-${rotuloRodada(n)}` });
  try {
    const saida = await et.consultar(provedor, p, opts.caso, n, gate, lerFontes(p));
    fs.mkdirSync(p.rodadas, { recursive: true });
    fs.writeFileSync(arquivoEtapa(p, et.id, n, 'json'), JSON.stringify(saida, null, 2) + '\n', 'utf8');
    fs.writeFileSync(arquivoEtapa(p, et.id, n, 'md'), renderRodadaEtapa(p, opts.caso, et, n, saida), 'utf8');
    out.estado = 'nova-rodada';
    out.novaRodada = n;
    out.arquivo = arquivoEtapa(p, et.id, n, 'md');
    return out;
  } catch (e) {
    if (e instanceof AguardandoRespostaManual) {
      out.estado = 'aguardando-manual';
      out.pedidoPath = e.promptPath;
      out.respostaPath = e.respostaPath;
      return out;
    }
    throw e;
  }
}
