// src/lib/fase0/loop2.ts — Loop 2 (Modelo) por rodadas em arquivo. Etapa atual: MER.
// O SHADA propõe o modelo inteiro; o humano aprova ou rejeita (Confirm-Once da etapa), podendo editar o Mermaid.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AguardandoRespostaManual, escolherProvedor, type LlmProvider } from '../llm/index.ts';
import {
  caminhosCaso, fmtDecisaoId, hoje, lerDicionarioCaso, lerTexto, proximoIdDecisao, rotuloRodada, type CasoPaths,
} from './casos.ts';
import { avaliarGate1 } from './gate1.ts';
import { avaliarGate2, diagnosticarEntidade, lerModelo, type Gate2Resultado } from './gate2.ts';
import { consultarShadaMer, montarContextoMer, type SaidaMer } from './modelo.ts';
import { lerRodadaRespondida } from './rodada.ts';
import { lerFontes, type SaidaShada } from './shada.ts';

export type EtapaLoop2 = 'mer';

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

// ── Rodada em Markdown ─────────────────────────────────────────────

/** Diagnóstico calculado (não pela IA) do modelo proposto, para o humano ver antes de aprovar. */
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

export function renderRodadaMer(p: CasoPaths, caso: string, n: number, s: SaidaMer): string {
  const L: string[] = [];
  L.push(`# Loop 2 · MER · rodada ${rotuloRodada(n)} — ${caso}`, '');
  L.push('> Revise o modelo. Você pode editar o bloco mermaid abaixo antes de aprovar.');
  L.push('> Responda as perguntas, marque `[x]` em aprovar ou rejeitar e rode `idd fase0 loop2 ' + caso + '`.');
  L.push('> Aprovar grava modelo/dominio.mmd (Confirm-Once da etapa). Ao rejeitar, diga o porquê no comentário.', '');
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
  L.push('## Modelo proposto', '', '```mermaid', s.modelo.trim(), '```', '');
  L.push('### Diagnóstico do normalizador (calculado pelo IDD, não pela IA)', '', ...previaModelo(p, s.modelo), '');
  if (s.rastreio.length) {
    L.push('### Rastreio classe → termo', '');
    for (const r of s.rastreio) L.push(`- **${r.classe}** ← ${r.termo || '(sem termo)'} — ${r.justificativa}`);
    L.push('');
  }
  if (s.suposicoes.length) L.push('### Suposições do SHADA (confirme pelas perguntas)', '', ...s.suposicoes.map(x => `- ${x}`), '');
  L.push('## Decisão', '', '**Modelo:** [ ] aprovar  [ ] rejeitar', '', '**Comentário (opcional):**', '');
  if (s.contradicoes.length) L.push('## Contradições', '', ...s.contradicoes.map(x => `- ${x}`), '');
  if (s.observacoes) L.push('## Observações', '', s.observacoes, '');
  return L.join('\n');
}

export interface RespostasMer {
  respostas: Record<string, string>;
  decisao: 'aprovar' | 'rejeitar' | null;
  modelo: string;
  comentario: string;
}

export function lerRodadaMer(md: string, saida: SaidaMer): RespostasMer {
  const comoShada: SaidaShada = { perguntas: saida.perguntas, propostas: [], contradicoes: [], observacoes: '' };
  const { respostas } = lerRodadaRespondida(md, comoShada);

  const secaoModelo = md.split(/^## Modelo proposto\s*$/m)[1] ?? '';
  const bloco = secaoModelo.match(/```mermaid\s*\r?\n([\s\S]*?)\r?\n```/);
  const modelo = bloco ? bloco[1].trim() + '\n' : saida.modelo;

  const linha = md.match(/^\s*\*\*Modelo:\*\*\s*(.*)$/m)?.[1] ?? '';
  const aprovar = /\[\s*[xX]\s*\]\s*aprovar/i.test(linha);
  const rejeitar = /\[\s*[xX]\s*\]\s*rejeitar/i.test(linha);
  const decisao = aprovar === rejeitar ? null : aprovar ? 'aprovar' : 'rejeitar';

  const depois = md.split(/^\s*\*\*Comentário(?:\s*\(opcional\))?:\*\*/m)[1] ?? '';
  const comentario = depois.split(/^#{1,3}\s/m)[0].replace(/\s+/g, ' ').trim();
  return { respostas, decisao, modelo, comentario };
}

// ── Aplicação ──────────────────────────────────────────────────────

export interface ResultadoMer {
  respondidas: number;
  abertas: number;
  modelo: 'aprovado' | 'rejeitado' | 'pendente';
}

export function aplicarRodadaMer(p: CasoPaths, n: number, r: RespostasMer, saida: SaidaMer, data: string): ResultadoMer {
  if (r.decisao === 'aprovar') {
    const classes = lerModelo(r.modelo).entities;
    if (!classes.length) throw new Error(`O modelo aprovado em ${arquivoEtapa(p, 'mer', n, 'md')} não tem classes reconhecíveis; corrija o bloco mermaid e rode de novo.`);
  }
  const res: ResultadoMer = { respondidas: 0, abertas: 0, modelo: r.decisao === 'aprovar' ? 'aprovado' : r.decisao === 'rejeitar' ? 'rejeitado' : 'pendente' };
  const ref = `L2/MER${rotuloRodada(n)}`;
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
  if (r.decisao === 'aprovar') {
    fs.mkdirSync(p.modelo, { recursive: true });
    fs.writeFileSync(p.dominio, r.modelo, 'utf8');
    const editado = r.modelo.trim() !== saida.modelo.trim() ? ' (editado pelo autor)' : '';
    registrar(true, 'modelo', `modelo aprovado${editado}: modelo/dominio.mmd${coment} (${data})`);
  } else if (r.decisao === 'rejeitar') {
    registrar(true, 'modelo', `modelo rejeitado${coment} (${data})`);
  }

  if (novas.length) fs.writeFileSync(p.decisoes, lerTexto(p.decisoes).replace(/\s*$/, '') + '\n' + novas.join('\n') + '\n', 'utf8');
  fs.writeFileSync(arquivoEtapa(p, 'mer', n, 'aplicada'), `${data}\n`, 'utf8');
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
  etapa: EtapaLoop2;
  aplicacao?: ResultadoMer;
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
  const etapa: EtapaLoop2 = 'mer';
  const out: Loop2Resultado = { estado: 'nova-rodada', etapa };
  if (!avaliarGate1(p).verde) { out.estado = 'gate1-vermelho'; return out; }
  const data = opts.hoje ?? hoje();

  // 1. aplicar a última rodada, se respondida
  const rodadas = listarRodadasEtapa(p, etapa);
  const ultima = rodadas.at(-1);
  if (ultima !== undefined && !fs.existsSync(arquivoEtapa(p, etapa, ultima, 'aplicada'))) {
    const arquivo = arquivoEtapa(p, etapa, ultima, 'md');
    const saida = JSON.parse(fs.readFileSync(arquivoEtapa(p, etapa, ultima, 'json'), 'utf8')) as SaidaMer;
    const r = lerRodadaMer(lerTexto(arquivo), saida);
    if (r.decisao === null && Object.keys(r.respostas).length === 0) {
      out.estado = 'aguardando-respostas';
      out.arquivo = arquivo;
      return out;
    }
    out.aplicacao = aplicarRodadaMer(p, ultima, r, saida, data);
    out.rodadaAplicada = ultima;
  }

  // 2. Gate 2
  const gate = avaliarGate2(p);
  out.gate = gate;
  if (gate.verde) { out.estado = 'gate-verde'; return out; }
  if (opts.semNovaRodada) { out.estado = 'sem-nova-rodada'; return out; }

  // 3. nova rodada
  const n = (ultima ?? 0) + 1;
  const provedor = opts.provedor ?? escolherProvedor({ dir: p.dir, baseName: `rodadas/${etapa}-${rotuloRodada(n)}` });
  try {
    const saida = await consultarShadaMer(provedor, montarContextoMer(p, opts.caso, n, gate, lerFontes(p)));
    fs.mkdirSync(p.rodadas, { recursive: true });
    fs.writeFileSync(arquivoEtapa(p, etapa, n, 'json'), JSON.stringify(saida, null, 2) + '\n', 'utf8');
    fs.writeFileSync(arquivoEtapa(p, etapa, n, 'md'), renderRodadaMer(p, opts.caso, n, saida), 'utf8');
    out.estado = 'nova-rodada';
    out.novaRodada = n;
    out.arquivo = arquivoEtapa(p, etapa, n, 'md');
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
