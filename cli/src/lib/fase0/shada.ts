// src/lib/fase0/shada.ts — SHADA, o agente socrático do Loop 1 (Fase 0)
// (SHALA é a medida de ambiguidade — fora do escopo aqui.)
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TERM_KINDS } from '@idd/core';
import type { LlmProvider } from '../llm/types.ts';
import { lerDicionarioCaso, lerTexto, type CasoPaths } from './casos.ts';
import type { DiagnosticosCaso, Gate1Resultado } from './gate1.ts';

export const LIMITE_FONTES = 400_000;
const EXT_FONTES = new Set(['.md', '.txt', '.ts', '.js', '.sql', '.json', '.yaml', '.yml', '.html', '.htm']);

export interface PerguntaShada { id: string; texto: string; porque: string; opcoes: string[]; bloqueante: boolean }
export interface PropostaShada {
  id: string;
  tipo: 'intencao' | 'invariante' | 'termo';
  alvo: string;
  texto: string;
  tipoInvariante: string;
  termo: { definicao: string; kind: string; aliases: string[]; proibidos: string[] };
  justificativa: string;
}
export interface SaidaShada {
  perguntas: PerguntaShada[];
  propostas: PropostaShada[];
  contradicoes: string[];
  observacoes: string;
}

export const SHADA_SYSTEM = `Você é o SHADA, o agente socrático do Paradigma IDD (Intent-Driven Development) na Fase 0: o estudo de requisitos que transforma material bruto do negócio em uma especificação em linguagem ubíqua, sem ambiguidades conhecidas.

Seu papel no Loop 1 (Intenção):
- Você é livre para perguntar, propor e contestar. Você NUNCA decide: nada entra na especificação sem decisão humana registrada. Tudo o que você escreve é proposta ou pergunta.
- Faça no máximo 3 perguntas por rodada. Priorize as lacunas bloqueantes: ciclo de vida das entidades, cardinalidades, exceções, regras temporais e quem executa cada ação. Marque como bloqueante apenas a pergunta sem a qual não se pode escrever uma intenção ou invariante correta. Para cada pergunta, explique por que ela importa e ofereça opções concretas quando fizer sentido.
- Proponha redação assertiva das intenções em EARS adaptado ao português, com os termos de domínio marcados como [[Termo]] (PascalCase, ex.: [[ContaBancaria]]). Moldes: "O/A <sujeito> deve <resposta>." · "Quando <gatilho>, o/a <sujeito> deve ..." · "Enquanto <estado>, o/a <sujeito> deve ..." · "Se <condição>, então o/a <sujeito> deve ..." · "Onde <característica>, o/a <sujeito> deve ...". Toda frase termina em ponto e usa "deve"/"devem" (ou "não deve"/"não devem"). Evite termos vagos, "e/ou", voz passiva sem agente, pronomes ambíguos e prazos não mensuráveis.
- Proponha invariantes tipadas e testáveis. Tipos permitidos: integridade, unicidade, temporal, autorização, cálculo, estado. Todo enunciado deve conter um marcador testável (sempre, nunca, deve, não pode, no máximo, no mínimo, exatamente, igual a, =, ≤, ≥, <, >).
- Proponha termos do dicionário ubíquo com definição clara (mínimo 10 caracteres), kind (um de: ${TERM_KINDS.join(', ')}), aliases aceitos e sinônimos proibidos (ambíguos que a equipe não deve usar).
- Aponte contradições entre as fontes, as intenções, as invariantes e as decisões já registradas.
- NÃO invente regra de negócio. O que não estiver nas fontes, nas decisões ou no texto já aceito vira pergunta, não proposta.
- Não repita perguntas já respondidas ou em aberto em decisoes.md, nem proponha o que já está aceito. Use ids INT-NNN e INV-NNN novos (continuando a numeração existente) ao propor itens novos, ou o id existente para substituir uma redação.
- Para propostas de tipo "termo", o campo alvo é o nome PascalCase do termo. Para propostas que não são de termo, deixe definicao e kind como string vazia e aliases/proibidos como listas vazias. Para propostas que não são invariante, tipoInvariante é string vazia.
- Responda sempre em português do Brasil, somente com o JSON pedido.`;

const STR = { type: 'string' };
export const SHADA_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['perguntas', 'propostas', 'contradicoes', 'observacoes'],
  properties: {
    perguntas: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'texto', 'porque', 'opcoes', 'bloqueante'],
        properties: { id: STR, texto: STR, porque: STR, opcoes: { type: 'array', items: STR }, bloqueante: { type: 'boolean' } },
      },
    },
    propostas: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'tipo', 'alvo', 'texto', 'tipoInvariante', 'termo', 'justificativa'],
        properties: {
          id: STR,
          tipo: { type: 'string', enum: ['intencao', 'invariante', 'termo'] },
          alvo: STR,
          texto: STR,
          tipoInvariante: STR,
          termo: {
            type: 'object', additionalProperties: false,
            required: ['definicao', 'kind', 'aliases', 'proibidos'],
            properties: {
              definicao: STR,
              kind: { type: 'string', enum: [...TERM_KINDS, ''] },
              aliases: { type: 'array', items: STR },
              proibidos: { type: 'array', items: STR },
            },
          },
          justificativa: STR,
        },
      },
    },
    contradicoes: { type: 'array', items: STR },
    observacoes: STR,
  },
};

// ── Fontes ─────────────────────────────────────────────────────────

export interface Fonte { nome: string; conteudo: string }
export interface FontesLidas { arquivos: Fonte[]; ignorados: string[]; totalCaracteres: number }

function removerTagsHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
}

function listarArquivos(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listarArquivos(full));
    else out.push(full);
  }
  return out.sort();
}

/** Lê as fontes; NÃO trunca: se passar de LIMITE_FONTES caracteres, aborta com mensagem clara. */
export function lerFontes(p: CasoPaths, limite = LIMITE_FONTES): FontesLidas {
  const arquivos: Fonte[] = [];
  const ignorados: string[] = [];
  let total = 0;
  for (const file of listarArquivos(p.fontes)) {
    const rel = path.relative(p.fontes, file).split(path.sep).join('/');
    const ext = path.extname(file).toLowerCase();
    if (!EXT_FONTES.has(ext)) { ignorados.push(rel); continue; }
    let conteudo = fs.readFileSync(file, 'utf8');
    if (ext === '.html' || ext === '.htm') conteudo = removerTagsHtml(conteudo);
    total += conteudo.length;
    arquivos.push({ nome: rel, conteudo });
  }
  if (total > limite) {
    throw new Error(
      `As fontes somam ${total.toLocaleString('pt-BR')} caracteres, acima do limite de ${limite.toLocaleString('pt-BR')}. `
      + 'O IDD não trunca fontes em silêncio: divida o material em casos menores ou resuma/normalize os arquivos em fontes/ antes de continuar.');
  }
  return { arquivos, ignorados, totalCaracteres: total };
}

// ── Contexto e chamada ─────────────────────────────────────────────

function fmtDiag(diag: DiagnosticosCaso): string {
  const linhas: string[] = [];
  for (const [arq, ds] of [['intencoes.md', diag.intencoes], ['invariantes.md', diag.invariantes]] as const) {
    for (const d of ds) if (d.severidade !== 'info') linhas.push(`- ${arq}:${d.linha}:${d.coluna} ${d.regra} (${d.severidade}) ${d.mensagem}`);
  }
  return linhas.length ? linhas.join('\n') : '(nenhum)';
}

export function montarContexto(p: CasoPaths, caso: string, rodada: number, diag: DiagnosticosCaso, gate: Gate1Resultado, fontes: FontesLidas): string {
  const dic = lerDicionarioCaso(p.dicionario);
  const secoes: string[] = [`# Caso: ${caso} — rodada ${String(rodada).padStart(2, '0')}`];
  secoes.push('## Fontes');
  secoes.push(fontes.arquivos.length
    ? fontes.arquivos.map(f => `### fontes/${f.nome}\n\n${f.conteudo}`).join('\n\n')
    : '(nenhuma fonte em fontes/ — pergunte ao humano sobre o domínio, sem inventar regras)');
  secoes.push('## intencoes.md (atual)\n\n' + (lerTexto(p.intencoes) || '(vazio)'));
  secoes.push('## invariantes.md (atual)\n\n' + (lerTexto(p.invariantes) || '(vazio)'));
  secoes.push('## dicionario.json (atual)\n\n' + JSON.stringify(dic, null, 2));
  secoes.push('## decisoes.md (atual)\n\n' + (lerTexto(p.decisoes) || '(vazio)'));
  secoes.push('## Diagnósticos atuais do lint\n\n' + fmtDiag(diag));
  secoes.push('## Estado do Gate 1\n\n' + (gate.verde ? 'verde' : 'vermelho') + '\n'
    + gate.criterios.map(c => `- (${c.id}) ${c.descricao}: ${c.ok ? 'ok' : 'FALHA'} — ${c.detalhe}`).join('\n'));
  secoes.push('Produza a próxima rodada: até 3 perguntas, propostas e contradições, no JSON do schema.');
  return secoes.join('\n\n');
}

function texto(v: unknown): string { return typeof v === 'string' ? v : ''; }
function lista(v: unknown): string[] { return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; }

/** Valida o formato e normaliza ids (P01.., PR01..) para garantir unicidade. */
export function normalizarSaida(raw: unknown): SaidaShada {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Saída do SHADA inválida: esperado um objeto JSON.');
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.perguntas) || !Array.isArray(o.propostas)) throw new Error('Saída do SHADA inválida: faltam "perguntas" e/ou "propostas".');
  const pad = (n: number): string => String(n).padStart(2, '0');

  const perguntas = o.perguntas.map((q: any, i: number): PerguntaShada => ({
    id: `P${pad(i + 1)}`, texto: texto(q?.texto), porque: texto(q?.porque), opcoes: lista(q?.opcoes), bloqueante: q?.bloqueante === true,
  }));
  const propostas = o.propostas.map((r: any, i: number): PropostaShada => {
    const tipo = r?.tipo === 'invariante' || r?.tipo === 'termo' ? r.tipo : 'intencao';
    return {
      id: `PR${pad(i + 1)}`, tipo, alvo: texto(r?.alvo).trim(), texto: texto(r?.texto), tipoInvariante: texto(r?.tipoInvariante),
      termo: { definicao: texto(r?.termo?.definicao), kind: texto(r?.termo?.kind), aliases: lista(r?.termo?.aliases), proibidos: lista(r?.termo?.proibidos) },
      justificativa: texto(r?.justificativa),
    };
  });
  return { perguntas, propostas, contradicoes: lista(o.contradicoes), observacoes: texto(o.observacoes) };
}

export async function consultarShada(provedor: LlmProvider, contexto: string): Promise<SaidaShada> {
  const bruto = await provedor.completeJson({
    system: SHADA_SYSTEM,
    user: contexto,
    schemaName: 'rodada_shada',
    schema: SHADA_SCHEMA,
    effort: 'high',
  });
  return normalizarSaida(bruto);
}
