// src/lib/fase0/aplicar.ts — aplicação determinística de uma rodada respondida (sem LLM)
import * as fs from 'node:fs';
import { TERM_KINDS, parseDictionary, type DictionaryTerm, type TermKind } from '@idd/core';
import {
  arquivoRodada, fmtDecisaoId, hoje, lerDicionarioCaso, lerTexto, proximoIdDecisao, rotuloRodada,
  salvarDicionarioCaso, type CasoPaths,
} from './casos.ts';
import { lerRodadaRespondida, type RespostasRodada } from './rodada.ts';
import type { PropostaShada, SaidaShada } from './shada.ts';

export interface ResultadoAplicacao {
  jaAplicada: boolean;
  respondidas: number;
  abertas: number;
  aceitas: number;
  rejeitadas: number;
  pendentes: number;
  invalidas: number;
}

const achatar = (s: string): string => s.replace(/\s+/g, ' ').trim();

function proximoId(texto: string, prefixo: 'INT' | 'INV'): string {
  const nums = [...texto.matchAll(new RegExp(`\\*\\*${prefixo}-(\\d+)\\*\\*`, 'g'))].map(m => Number(m[1]));
  return `${prefixo}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

/** Substitui a linha do id (se existir) ou acrescenta ao fim do arquivo. */
export function upsertItem(file: string, id: string, linha: string): 'substituida' | 'adicionada' {
  const texto = lerTexto(file);
  const linhas = texto.split('\n');
  const re = new RegExp(`^\\s*[-*]\\s+\\*\\*${id}\\*\\*`);
  const i = linhas.findIndex(l => re.test(l));
  if (i >= 0) {
    linhas[i] = linha;
    fs.writeFileSync(file, linhas.join('\n'), 'utf8');
    return 'substituida';
  }
  fs.writeFileSync(file, texto.replace(/\s*$/, '') + '\n' + linha + '\n', 'utf8');
  return 'adicionada';
}

function textoItem(r: PropostaShada, textoFinal: string, prefixo: 'INT' | 'INV'): string {
  let t = achatar(textoFinal || r.texto).replace(/^>\s*/, '');
  t = t.replace(new RegExp(`^[-*]?\\s*\\*\\*${prefixo}-\\d+\\*\\*\\s*`), '');
  if (prefixo === 'INV' && !t.startsWith('[') && r.tipoInvariante) t = `[${r.tipoInvariante}] ${t}`;
  return t;
}

export function aplicarRodada(p: CasoPaths, n: number, data: string = hoje()): ResultadoAplicacao {
  const res: ResultadoAplicacao = { jaAplicada: false, respondidas: 0, abertas: 0, aceitas: 0, rejeitadas: 0, pendentes: 0, invalidas: 0 };
  const marcador = arquivoRodada(p, n, 'aplicada');
  if (fs.existsSync(marcador)) { res.jaAplicada = true; return res; }

  const saida = JSON.parse(fs.readFileSync(arquivoRodada(p, n, 'json'), 'utf8')) as SaidaShada;
  const md = lerTexto(arquivoRodada(p, n, 'md'));
  const resp: RespostasRodada = lerRodadaRespondida(md, saida);
  const R = `R${rotuloRodada(n)}`;

  let contador = proximoIdDecisao(lerTexto(p.decisoes));
  const novas: string[] = [];
  const registrar = (marcada: boolean, ref: string, campos: string): void => {
    novas.push(`- [${marcada ? 'x' : ' '}] ${fmtDecisaoId(contador++)} · ${R}/${ref} · ${campos}`);
  };

  // Perguntas -> decisoes.md
  for (const q of saida.perguntas) {
    const rotulo = q.bloqueante ? 'bloqueante' : 'não-bloqueante';
    const r = resp.respostas[q.id];
    if (r) { registrar(true, q.id, `${rotulo} · ${achatar(q.texto)} → ${achatar(r)} (${data})`); res.respondidas++; }
    else { registrar(false, q.id, `${rotulo} · ${achatar(q.texto)}`); res.abertas++; }
  }

  // Propostas
  for (const r of saida.propostas) {
    const d = resp.propostas[r.id] ?? { decisao: null, textoFinal: '' };
    if (d.decisao === 'rejeitar') {
      registrar(true, r.id, `proposta rejeitada: ${r.alvo || r.tipo} (${data})`);
      res.rejeitadas++;
    } else if (d.decisao === null) {
      registrar(false, r.id, `não-bloqueante · proposta pendente: ${r.alvo || r.tipo}`);
      res.pendentes++;
    } else if (r.tipo === 'termo') {
      const erro = aplicarTermo(p, r, d.textoFinal);
      if (erro) { registrar(false, r.id, `bloqueante · proposta aceita mas não aplicada (termo ${r.alvo}): ${erro}`); res.invalidas++; }
      else { registrar(true, r.id, `proposta aceita: termo ${r.alvo} — ${achatar(d.textoFinal || r.termo.definicao)} (${data})`); res.aceitas++; }
    } else {
      const prefixo = r.tipo === 'intencao' ? 'INT' : 'INV';
      const arquivo = r.tipo === 'intencao' ? p.intencoes : p.invariantes;
      const id = new RegExp(`^${prefixo}-\\d+$`, 'i').test(r.alvo) ? r.alvo.toUpperCase() : proximoId(lerTexto(arquivo), prefixo);
      const corpo = textoItem(r, d.textoFinal, prefixo);
      upsertItem(arquivo, id, `- **${id}** ${corpo}`);
      registrar(true, r.id, `proposta aceita: ${id} — ${corpo} (${data})`);
      res.aceitas++;
    }
  }

  if (novas.length) {
    fs.writeFileSync(p.decisoes, lerTexto(p.decisoes).replace(/\s*$/, '') + '\n' + novas.join('\n') + '\n', 'utf8');
  }
  fs.writeFileSync(marcador, `${data}\n`, 'utf8');
  return res;
}

/** Adiciona/atualiza o termo no dicionário; devolve mensagem de erro se o dicionário ficar inválido. */
function aplicarTermo(p: CasoPaths, r: PropostaShada, textoFinal: string): string | undefined {
  const dic = lerDicionarioCaso(p.dicionario);
  const kind = (TERM_KINDS as readonly string[]).includes(r.termo.kind) ? (r.termo.kind as TermKind) : 'concept';
  const entrada: DictionaryTerm = {
    term: r.alvo,
    definition: achatar(textoFinal || r.termo.definicao),
    kind,
    aliases: r.termo.aliases.map(achatar).filter(Boolean),
    forbidden: r.termo.proibidos.map(achatar).filter(Boolean),
  };
  const existente = dic.terms.find(t => t.term.toLowerCase() === r.alvo.toLowerCase());
  if (existente?.context) entrada.context = existente.context;
  const proximo = { version: dic.version, terms: [...dic.terms.filter(t => t !== existente), entrada] };
  const v = parseDictionary(proximo);
  if (!v.ok) return v.issues.map(i => `${i.field}: ${i.message}`).join('; ');
  salvarDicionarioCaso(p.dicionario, v.dictionary);
  return undefined;
}
