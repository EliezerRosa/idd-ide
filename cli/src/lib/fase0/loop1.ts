// src/lib/fase0/loop1.ts — orquestração do Loop 1 por rodadas (baseado em arquivos)
import * as fs from 'node:fs';
import { aplicarRodada, type ResultadoAplicacao } from './aplicar.ts';
import {
  arquivoRodada, caminhosCaso, hoje, listarRodadas, lerTexto, rodadaAplicada, rotuloRodada, type CasoPaths,
} from './casos.ts';
import { avaliarGate1, lintCaso, type DiagnosticosCaso, type Gate1Resultado } from './gate1.ts';
import { lerRodadaRespondida, renderRodada, temAlgumaResposta } from './rodada.ts';
import { consultarShada, lerFontes, montarContexto, type SaidaShada } from './shada.ts';
import { AguardandoRespostaManual, escolherProvedor, type LlmProvider } from '../llm/index.ts';

export interface Loop1Opts {
  root: string;
  caso: string;
  semNovaRodada?: boolean;
  /** injeção para teste; padrão: escolherProvedor() */
  provedor?: LlmProvider;
  hoje?: string;
}

export type EstadoLoop1 =
  | 'aguardando-respostas'
  | 'gate-verde'
  | 'sem-nova-rodada'
  | 'nova-rodada'
  | 'aguardando-manual';

export interface Loop1Resultado {
  estado: EstadoLoop1;
  aplicacao?: ResultadoAplicacao;
  rodadaAplicada?: number;
  novaRodada?: number;
  arquivo?: string;
  gate?: Gate1Resultado;
  diagnosticos?: DiagnosticosCaso;
  /** provedor manual: onde está o pedido e onde salvar a resposta */
  pedidoPath?: string;
  respostaPath?: string;
  fontesIgnoradas?: string[];
}

export function casoExiste(p: CasoPaths): boolean {
  return fs.existsSync(p.dir);
}

export async function executarLoop1(opts: Loop1Opts): Promise<Loop1Resultado> {
  const p = caminhosCaso(opts.root, opts.caso);
  if (!casoExiste(p)) throw new Error(`Caso "${opts.caso}" não existe. Crie com: idd fase0 init ${opts.caso}`);
  const data = opts.hoje ?? hoje();
  const out: Loop1Resultado = { estado: 'nova-rodada' };

  // 1. aplicar a última rodada, se respondida
  const rodadas = listarRodadas(p);
  const ultima = rodadas.length ? rodadas[rodadas.length - 1] : undefined;
  if (ultima !== undefined && !rodadaAplicada(p, ultima)) {
    const arquivo = arquivoRodada(p, ultima, 'md');
    const saida = JSON.parse(fs.readFileSync(arquivoRodada(p, ultima, 'json'), 'utf8')) as SaidaShada;
    const atual = lerRodadaRespondida(lerTexto(arquivo), saida);
    if (!temAlgumaResposta(atual)) {
      out.estado = 'aguardando-respostas';
      out.arquivo = arquivo;
      return out;
    }
    out.aplicacao = aplicarRodada(p, ultima, data);
    out.rodadaAplicada = ultima;
  }

  // 2. lint + Gate 1
  const diag = lintCaso(p);
  const gate = avaliarGate1(p, diag);
  out.diagnosticos = diag;
  out.gate = gate;
  if (gate.verde) { out.estado = 'gate-verde'; return out; }
  if (opts.semNovaRodada) { out.estado = 'sem-nova-rodada'; return out; }

  // 3. nova rodada via SHADA
  const n = (rodadas.length ? rodadas[rodadas.length - 1] : 0) + 1;
  const base = `rodadas/rodada-${rotuloRodada(n)}`;
  const fontes = lerFontes(p);
  out.fontesIgnoradas = fontes.ignorados;
  const provedor = opts.provedor ?? escolherProvedor({ dir: p.dir, baseName: base });
  try {
    const contexto = montarContexto(p, opts.caso, n, diag, gate, fontes);
    const saida = await consultarShada(provedor, contexto);
    fs.mkdirSync(p.rodadas, { recursive: true });
    fs.writeFileSync(arquivoRodada(p, n, 'json'), JSON.stringify(saida, null, 2) + '\n', 'utf8');
    fs.writeFileSync(arquivoRodada(p, n, 'md'), renderRodada(opts.caso, n, saida), 'utf8');
    out.estado = 'nova-rodada';
    out.novaRodada = n;
    out.arquivo = arquivoRodada(p, n, 'md');
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
