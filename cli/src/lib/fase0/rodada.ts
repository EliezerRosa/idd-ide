// src/lib/fase0/rodada.ts — renderização e leitura do arquivo de rodada (editável no VS Code)
import type { PropostaShada, SaidaShada } from './shada.ts';

const ROTULO_TIPO: Record<PropostaShada['tipo'], string> = { intencao: 'intenção', invariante: 'invariante', termo: 'termo' };

export function renderRodada(caso: string, n: number, saida: SaidaShada): string {
  const nn = String(n).padStart(2, '0');
  const L: string[] = [];
  L.push(`# Rodada ${nn} — ${caso}`, '');
  L.push(`> Responda as perguntas e decida as propostas abaixo (basta editar este arquivo), depois rode \`idd fase0 loop1 ${caso}\`.`);
  L.push('> Resposta: número da opção ou texto livre (pode ocupar várias linhas). Decisão: marque `[x]` em aceitar ou rejeitar.');
  L.push('> Nada entra na especificação sem a sua decisão. Propostas sem decisão ficam pendentes.', '');

  L.push('## Perguntas', '');
  if (!saida.perguntas.length) L.push('_Nenhuma pergunta nesta rodada._', '');
  for (const q of saida.perguntas) {
    L.push(`### ${q.id} · ${q.bloqueante ? 'bloqueante' : 'não bloqueante'}`, '', q.texto, '');
    if (q.porque) L.push(`Por quê: ${q.porque}`, '');
    if (q.opcoes.length) { q.opcoes.forEach((o, i) => L.push(`${i + 1}. ${o}`)); L.push(''); }
    L.push('**Resposta:**', '');
  }

  L.push('## Propostas', '');
  if (!saida.propostas.length) L.push('_Nenhuma proposta nesta rodada._', '');
  for (const r of saida.propostas) {
    L.push(`### ${r.id} · ${ROTULO_TIPO[r.tipo]} · ${r.alvo || '(novo)'}`, '');
    if (r.tipo === 'termo') {
      L.push(`> **Definição:** ${r.termo.definicao}`);
      L.push(`> **Tipo:** ${r.termo.kind || 'concept'}`);
      L.push(`> **Aliases:** ${r.termo.aliases.join(', ') || '—'}`);
      L.push(`> **Proibidos:** ${r.termo.proibidos.join(', ') || '—'}`);
    } else {
      const prefixo = r.tipo === 'invariante' && r.tipoInvariante ? `[${r.tipoInvariante}] ` : '';
      L.push(`> ${prefixo}${r.texto}`);
    }
    L.push('');
    if (r.justificativa) L.push(`Justificativa: ${r.justificativa}`, '');
    L.push('**Decisão:** [ ] aceitar  [ ] rejeitar', '', '**Texto final (opcional):**', '');
  }

  L.push('## Contradições', '');
  if (saida.contradicoes.length) saida.contradicoes.forEach(c => L.push(`- ${c}`));
  else L.push('_Nenhuma contradição apontada._');
  L.push('', '## Observações', '', saida.observacoes.trim() || '_Sem observações._', '');
  return L.join('\n');
}

// ── Leitura ────────────────────────────────────────────────────────

export interface DecisaoProposta { decisao: 'aceitar' | 'rejeitar' | null; textoFinal: string }
export interface RespostasRodada {
  /** id da pergunta -> resposta (opção numérica já resolvida para o texto) */
  respostas: Record<string, string>;
  /** id da proposta -> decisão */
  propostas: Record<string, DecisaoProposta>;
}

function resolverResposta(bruta: string, opcoes: string[]): string {
  const t = bruta.trim();
  if (/^\d+(\s*(?:,|;|\be\b)\s*\d+)*[.)]?$/.test(t)) {
    const nums = t.match(/\d+/g)!.map(Number);
    if (nums.every(k => k >= 1 && k <= opcoes.length)) return nums.map(k => opcoes[k - 1]).join('; ');
  }
  return t;
}

function lerDecisaoLinha(resto: string): 'aceitar' | 'rejeitar' | null {
  const aceitar = /\[\s*[xX]\s*\]\s*aceitar/i.test(resto);
  const rejeitar = /\[\s*[xX]\s*\]\s*rejeitar/i.test(resto);
  if (aceitar === rejeitar) return null; // nenhuma ou ambas marcadas: ambíguo = pendente
  return aceitar ? 'aceitar' : 'rejeitar';
}

export function lerRodadaRespondida(md: string, saida: SaidaShada): RespostasRodada {
  const brutas: Record<string, string[]> = {};
  const decs: Record<string, DecisaoProposta> = {};
  const finais: Record<string, string[]> = {};

  let bloco: string | null = null;
  let captura: { alvo: string[] } | null = null;
  for (const linha of md.split(/\r?\n/)) {
    const h = linha.match(/^#{2,3}\s+(PR\d+|P\d+)\b/);
    if (h) { bloco = h[1]; captura = null; continue; }
    if (/^#{1,3}\s/.test(linha)) { bloco = null; captura = null; continue; }
    if (!bloco) continue;

    const r = linha.match(/^\s*\*\*Resposta:\*\*\s*(.*)$/);
    if (r && bloco.startsWith('P') && !bloco.startsWith('PR')) {
      captura = { alvo: (brutas[bloco] = [r[1]]) };
      continue;
    }
    const d = linha.match(/^\s*\*\*Decisão:\*\*\s*(.*)$/);
    if (d && bloco.startsWith('PR')) {
      decs[bloco] = { decisao: lerDecisaoLinha(d[1]), textoFinal: '' };
      captura = null;
      continue;
    }
    const tf = linha.match(/^\s*\*\*Texto final(?:\s*\(opcional\))?:\*\*\s*(.*)$/);
    if (tf && bloco.startsWith('PR')) {
      captura = { alvo: (finais[bloco] = [tf[1]]) };
      continue;
    }
    if (captura) captura.alvo.push(linha);
  }

  const respostas: Record<string, string> = {};
  for (const q of saida.perguntas) {
    const bruta = (brutas[q.id] ?? []).join('\n').trim();
    if (bruta) respostas[q.id] = resolverResposta(bruta, q.opcoes);
  }
  const propostas: Record<string, DecisaoProposta> = {};
  for (const r of saida.propostas) {
    const base = decs[r.id] ?? { decisao: null, textoFinal: '' };
    propostas[r.id] = { decisao: base.decisao, textoFinal: (finais[r.id] ?? []).join('\n').trim() };
  }
  return { respostas, propostas };
}

export function temAlgumaResposta(r: RespostasRodada): boolean {
  return Object.keys(r.respostas).length > 0 || Object.values(r.propostas).some(p => p.decisao !== null);
}
