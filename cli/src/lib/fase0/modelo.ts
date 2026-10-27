// src/lib/fase0/modelo.ts — SHADA no Loop 2, etapa MER: propõe o modelo de domínio a partir do loop 1
import type { LlmProvider } from '../llm/types.ts';
import { lerDicionarioCaso, lerTexto, type CasoPaths } from './casos.ts';
import type { Gate2Resultado } from './gate2.ts';
import type { FontesLidas, PerguntaShada } from './shada.ts';

export interface RastreioClasse { classe: string; termo: string; justificativa: string }

export interface SaidaMer {
  perguntas: PerguntaShada[];
  /** Mermaid classDiagram completo, no dialeto do parser do IDD */
  modelo: string;
  rastreio: RastreioClasse[];
  suposicoes: string[];
  contradicoes: string[];
  observacoes: string;
}

export const SHADA_MER_SYSTEM = `Você é o SHADA, o agente socrático do Paradigma IDD (Intent-Driven Development), agora no Loop 2 (Modelo) da Fase 0, etapa MER.

Entrada: a especificação aprovada no Loop 1 (intenções e invariantes em linguagem ubíqua, dicionário, decisões humanas) e as fontes brutas.
Saída: um modelo entidade-relacionamento normalizado, como Mermaid classDiagram, que o humano aprova ou rejeita como um todo.

Regras do modelo:
- Toda classe com identidade própria vem de um termo do dicionário de kind entity ou aggregate, com o MESMO nome PascalCase. Todo termo entity/aggregate deve virar classe.
- Termos value-object viram atributos (ex.: um valor em centavos, uma chave Pix), não classes. Termos role viram associação ou FK (ex.: responsavel_id), não classes.
- Classes associativas (N:M) são permitidas quando necessárias; use um nome PascalCase e explique no rastreio que ainda não há termo no dicionário.
- Não armazene valores deriváveis (somas, cotas calculadas) a menos que uma intenção, invariante ou decisão exija registrá-los; se houver dúvida, pergunte.
- Declare com "%% DF Classe: a, b -> c" toda dependência funcional não trivial que as regras implicam além das chaves. O IDD calcula as formas normais a partir dessas DFs (fecho de Armstrong).
- Forma normal alvo: BCNF; 3NF só é aceita quando a decomposição BCNF perderia uma dependência.
- NÃO invente regra de negócio. Se uma cardinalidade, obrigatoriedade ou atributo depender de algo que não está decidido, modele a opção que você recomenda, registre-a em "suposicoes" e faça a pergunta correspondente (no máximo 3 perguntas; marque bloqueante só o que impede um modelo correto).
- Não repita perguntas já respondidas ou em aberto em decisoes.md. Se houver modelo anterior rejeitado, leia o comentário do humano em decisoes.md e corrija.

Dialeto Mermaid aceito pelo parser do IDD (siga exatamente):
\`\`\`
classDiagram
  class Mesa {
    +uuid id PK
    +string chave_pix
    +integer taxa_servico_percentual
    +timestamp fechada_em ?
  }
  class ItemConsumido {
    +uuid id PK
    +uuid mesa_id FK(Mesa.id)
    +integer preco_centavos
  }
  Mesa "1" --> "N" ItemConsumido : contém
  %% DF ItemConsumido: mesa_id, descricao -> preco_centavos
\`\`\`
- Um atributo por linha: "+<tipo> <nome_snake_case> [PK] [UK] [FK(Classe.atributo)] [?]". "?" marca atributo opcional (nullable); sem "?" é obrigatório.
- Tipos: uuid, string, text, integer, bigint, decimal, boolean, timestamp, date.
- Chave composta: marque PK em cada coluna dela.
- Relacionamentos: Classe "1" --> "N" Outra : rótulo (cardinalidades "1", "N", "M").
- Responda sempre em português do Brasil, somente com o JSON pedido.`;

const STR = { type: 'string' };
export const SHADA_MER_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['perguntas', 'modelo', 'rastreio', 'suposicoes', 'contradicoes', 'observacoes'],
  properties: {
    perguntas: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'texto', 'porque', 'opcoes', 'bloqueante'],
        properties: { id: STR, texto: STR, porque: STR, opcoes: { type: 'array', items: STR }, bloqueante: { type: 'boolean' } },
      },
    },
    modelo: STR,
    rastreio: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['classe', 'termo', 'justificativa'],
        properties: { classe: STR, termo: STR, justificativa: STR },
      },
    },
    suposicoes: { type: 'array', items: STR },
    contradicoes: { type: 'array', items: STR },
    observacoes: STR,
  },
};

function texto(v: unknown): string { return typeof v === 'string' ? v : ''; }
function lista(v: unknown): string[] { return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; }

/** Remove a cerca ```mermaid ... ``` se o modelo vier cercado. */
export function limparMermaid(m: string): string {
  const t = m.trim();
  const cerca = t.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
  return (cerca ? cerca[1] : t).trim() + '\n';
}

export function normalizarSaidaMer(raw: unknown): SaidaMer {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Saída do SHADA (MER) inválida: esperado um objeto JSON.');
  const o = raw as Record<string, unknown>;
  const modelo = texto(o.modelo);
  if (!/classDiagram/.test(modelo)) throw new Error('Saída do SHADA (MER) inválida: "modelo" não é um Mermaid classDiagram.');
  const pad = (n: number): string => String(n).padStart(2, '0');
  const perguntas = (Array.isArray(o.perguntas) ? o.perguntas : []).map((q: any, i: number): PerguntaShada => ({
    id: `P${pad(i + 1)}`, texto: texto(q?.texto), porque: texto(q?.porque), opcoes: lista(q?.opcoes), bloqueante: q?.bloqueante === true,
  }));
  const rastreio = (Array.isArray(o.rastreio) ? o.rastreio : []).map((r: any): RastreioClasse => ({
    classe: texto(r?.classe), termo: texto(r?.termo), justificativa: texto(r?.justificativa),
  }));
  return {
    perguntas, modelo: limparMermaid(modelo), rastreio,
    suposicoes: lista(o.suposicoes), contradicoes: lista(o.contradicoes), observacoes: texto(o.observacoes),
  };
}

export function montarContextoMer(p: CasoPaths, caso: string, rodada: number, gate: Gate2Resultado, fontes: FontesLidas): string {
  const dic = lerDicionarioCaso(p.dicionario);
  const secoes: string[] = [`# Caso: ${caso} — loop 2, etapa MER, rodada ${String(rodada).padStart(2, '0')}`];
  secoes.push('## intencoes.md (aprovado no loop 1)\n\n' + lerTexto(p.intencoes));
  secoes.push('## invariantes.md (aprovado no loop 1)\n\n' + lerTexto(p.invariantes));
  secoes.push('## dicionario.json\n\n' + JSON.stringify(dic, null, 2));
  secoes.push('## decisoes.md\n\n' + (lerTexto(p.decisoes) || '(vazio)'));
  const atual = lerTexto(p.dominio);
  secoes.push('## modelo/dominio.mmd (atual)\n\n' + (atual ? '```mermaid\n' + atual.trim() + '\n```' : '(ainda não existe)'));
  secoes.push('## Estado do Gate 2 (etapa MER)\n\n' + (gate.verde ? 'verde' : 'vermelho') + '\n'
    + gate.criterios.map(c => `- (${c.id}) ${c.descricao}: ${c.ok ? 'ok' : 'FALHA'} — ${c.detalhe}`).join('\n')
    + (gate.avisos.length ? '\n' + gate.avisos.map(a => `- aviso: ${a}`).join('\n') : ''));
  secoes.push('## Fontes\n\n' + (fontes.arquivos.length
    ? fontes.arquivos.map(f => `### fontes/${f.nome}\n\n${f.conteudo}`).join('\n\n')
    : '(nenhuma)'));
  secoes.push('Produza a próxima rodada da etapa MER: o modelo completo, o rastreio classe → termo, as suposições, até 3 perguntas e as contradições, no JSON do schema.');
  return secoes.join('\n\n');
}

export async function consultarShadaMer(provedor: LlmProvider, contexto: string): Promise<SaidaMer> {
  const bruto = await provedor.completeJson({
    system: SHADA_MER_SYSTEM,
    user: contexto,
    schemaName: 'rodada_mer',
    schema: SHADA_MER_SCHEMA,
    effort: 'high',
  });
  return normalizarSaidaMer(bruto);
}
