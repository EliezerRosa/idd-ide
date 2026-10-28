// src/lib/fase0/modelo.ts — SHADA no Loop 2: etapa MER (modelo de domínio), etapa UC (casos de uso) e etapa atividades (fluxos por UC)
import type { LlmProvider } from '../llm/types.ts';
import { EXEMPLO_ATIVIDADES } from './atividades.ts';
import { lerDicionarioCaso, lerTexto, type CasoPaths } from './casos.ts';
import { EXEMPLO_CASOS } from './casosDeUso.ts';
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

// ════════════════════════════════════════════════════════════════
// Etapa UC: contexto e casos de uso até a transação de negócio
// ════════════════════════════════════════════════════════════════

export interface SaidaUc {
  perguntas: PerguntaShada[];
  /** YAML completo de modelo/casos-de-uso.yaml */
  artefato: string;
  suposicoes: string[];
  contradicoes: string[];
  observacoes: string;
}

export const SHADA_UC_SYSTEM = `Você é o SHADA, o agente socrático do Paradigma IDD (Intent-Driven Development), no Loop 2 (Modelo) da Fase 0, etapa de contexto e casos de uso.

Entrada: a especificação aprovada no Loop 1 (intenções, invariantes, dicionário, decisões) e o MER aprovado (modelo/dominio.mmd).
Saída: modelo/casos-de-uso.yaml com os atores e os casos de uso decompostos até a transação de negócio. O humano aprova ou rejeita o arquivo inteiro; o IDD gera dele o diagrama de contexto.

Regras:
- Ator é quem interage com o sistema, de fora dele. Atores humanos usam o nome de um termo do dicionário (role ou entity, ex.: ResponsavelMesa, Participante); sistemas externos (ex.: um provedor de pagamento) têm tipo "sistema" e só entram se uma intenção ou decisão exigir integração.
- Todo caso de uso (id UC-NN) tem um ator principal e lista as intenções (INT-NNN) que realiza. Toda intenção deve ser coberta por pelo menos um caso de uso.
- Transação de negócio (id TN-NN, numeração única no arquivo) é a unidade atômica de trabalho: leva o modelo de um estado consistente a outro, ou falha sem efeito. Decomponha cada caso de uso até esse nível.
- Toda transação tem pré-condições e pós-condições assertivas e testáveis, com os termos de domínio marcados como [[Termo]]. Escreva cada pré e pós-condição entre aspas duplas (sem aspas, o YAML lê "[[" como lista).
- Toda transação lista as invariantes (INV-NNN) que preserva ou verifica. Nenhuma invariante pode ficar órfã: se nenhuma transação a toca, falta transação ou a invariante está errada; pergunte.
- "altera" lista o que a transação escreve: "Classe" quando cria ou remove instâncias, "Classe.atributo" quando muda um valor. "le" lista o que ela só lê. Use somente classes e atributos que existem no MER aprovado.
- Invariantes que o MER não garante por chave (ex.: participante e item da mesma mesa) devem ser verificadas nas transações que as tocam; diga isso na pré ou pós-condição.
- NÃO invente regra de negócio. Ciclo de vida (quando a mesa fecha, se itens podem mudar depois de um pagamento) é decidido pelo humano: se uma transação depende disso, escreva a opção recomendada em "suposicoes" e pergunte (no máximo 3 perguntas; bloqueante só o que impede transações corretas).
- Não repita perguntas já respondidas ou em aberto em decisoes.md. Se houver versão anterior rejeitada, leia o comentário do humano em decisoes.md e corrija.

Formato do YAML (siga exatamente; "artefato" é o texto YAML, sem cerca):
\`\`\`yaml
${EXEMPLO_CASOS}\`\`\`
- Responda sempre em português do Brasil, somente com o JSON pedido.`;

export const SHADA_UC_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['perguntas', 'artefato', 'suposicoes', 'contradicoes', 'observacoes'],
  properties: {
    perguntas: (SHADA_MER_SCHEMA.properties as Record<string, unknown>).perguntas,
    artefato: STR,
    suposicoes: { type: 'array', items: STR },
    contradicoes: { type: 'array', items: STR },
    observacoes: STR,
  },
};

function perguntasDe(v: unknown): PerguntaShada[] {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (Array.isArray(v) ? v : []).map((q: any, i: number): PerguntaShada => ({
    id: `P${pad(i + 1)}`, texto: texto(q?.texto), porque: texto(q?.porque), opcoes: lista(q?.opcoes), bloqueante: q?.bloqueante === true,
  }));
}

export function normalizarSaidaUc(raw: unknown): SaidaUc {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Saída do SHADA (casos de uso) inválida: esperado um objeto JSON.');
  const o = raw as Record<string, unknown>;
  const artefato = limparMermaid(texto(o.artefato));
  if (!/casos_de_uso\s*:/.test(artefato)) throw new Error('Saída do SHADA (casos de uso) inválida: "artefato" não tem casos_de_uso.');
  return {
    perguntas: perguntasDe(o.perguntas), artefato,
    suposicoes: lista(o.suposicoes), contradicoes: lista(o.contradicoes), observacoes: texto(o.observacoes),
  };
}

export function montarContextoUc(p: CasoPaths, caso: string, rodada: number, gate: Gate2Resultado, fontes: FontesLidas): string {
  const secoes: string[] = [`# Caso: ${caso} — loop 2, etapa de casos de uso, rodada ${String(rodada).padStart(2, '0')}`];
  secoes.push('## intencoes.md (aprovado no loop 1)\n\n' + lerTexto(p.intencoes));
  secoes.push('## invariantes.md (aprovado no loop 1)\n\n' + lerTexto(p.invariantes));
  secoes.push('## dicionario.json\n\n' + JSON.stringify(lerDicionarioCaso(p.dicionario), null, 2));
  secoes.push('## modelo/dominio.mmd (MER aprovado)\n\n```mermaid\n' + lerTexto(p.dominio).trim() + '\n```');
  secoes.push('## decisoes.md\n\n' + (lerTexto(p.decisoes) || '(vazio)'));
  const atual = lerTexto(p.casos);
  secoes.push('## modelo/casos-de-uso.yaml (atual)\n\n' + (atual ? '```yaml\n' + atual.trim() + '\n```' : '(ainda não existe)'));
  secoes.push('## Estado do Gate 2\n\n' + (gate.verde ? 'verde' : 'vermelho') + '\n'
    + gate.criterios.map(c => `- (${c.id}) ${c.descricao}: ${c.ok ? 'ok' : 'FALHA'} — ${c.detalhe}`).join('\n')
    + (gate.avisos.length ? '\n' + gate.avisos.map(a => `- aviso: ${a}`).join('\n') : ''));
  secoes.push('## Fontes\n\n' + (fontes.arquivos.length
    ? fontes.arquivos.map(f => `### fontes/${f.nome}\n\n${f.conteudo}`).join('\n\n')
    : '(nenhuma)'));
  secoes.push('Produza a próxima rodada da etapa de casos de uso: o YAML completo em "artefato", as suposições, até 3 perguntas e as contradições, no JSON do schema.');
  return secoes.join('\n\n');
}

export async function consultarShadaUc(provedor: LlmProvider, contexto: string): Promise<SaidaUc> {
  const bruto = await provedor.completeJson({
    system: SHADA_UC_SYSTEM,
    user: contexto,
    schemaName: 'rodada_casos_de_uso',
    schema: SHADA_UC_SCHEMA,
    effort: 'high',
  });
  return normalizarSaidaUc(bruto);
}

// ════════════════════════════════════════════════════════════════
// Etapa atividades: fluxos por caso de uso (raias, transações, guardas)
// ════════════════════════════════════════════════════════════════

export interface SaidaAtividades {
  perguntas: PerguntaShada[];
  /** YAML completo de modelo/atividades.yaml */
  artefato: string;
  suposicoes: string[];
  contradicoes: string[];
  observacoes: string;
}

export const SHADA_ATIVIDADES_SYSTEM = `Você é o SHADA, o agente socrático do Paradigma IDD (Intent-Driven Development), no Loop 2 (Modelo) da Fase 0, etapa de atividades.

Entrada: a especificação aprovada no Loop 1 (intenções, invariantes, dicionário, decisões), o MER aprovado (modelo/dominio.mmd) e os casos de uso aprovados (modelo/casos-de-uso.yaml).
Saída: modelo/atividades.yaml com o fluxo de atividades de cada caso de uso (UC-NN). O humano aprova ou rejeita o arquivo inteiro; ao aprovar, o IDD gera os diagramas PlantUML em modelo/atividades/UC-NN.puml.

Regras:
- Todo caso de uso (UC-NN) de modelo/casos-de-uso.yaml deve ter exatamente um fluxo em "atividades".
- Cada fluxo tem um "resumo" curto e uma lista ordenada de "passos" (id P-01, P-02, ... único dentro do UC).
- "raia" é quem executa o passo: o nome de um ator declarado em modelo/casos-de-uso.yaml (ex.: ResponsavelMesa, Participante) ou "Sistema". Todo fluxo deve começar ou passar pela raia do ator principal do caso de uso.
- Toda transação de negócio (TN-NN) do caso de uso deve ser executada em ao menos um passo daquele UC com raia "Sistema" e campo "transacao: TN-NN".
- Se a transação TN-NN possui pré-condições em modelo/casos-de-uso.yaml, o passo que a executa DEVE declarar "guarda" (síntese assertiva das pré-condições verificadas) e "senao" (ação de recusa que encerra o fluxo sem efeito, preservando a atomicidade da transação).
- Escreva "acao", "guarda" e "senao" entre aspas duplas sempre que contiverem "[[Termo]]".
- NÃO invente regra de negócio. Se a ordem entre transações de um mesmo UC, uma condição de bloqueio ou o comportamento diante de erro depender de decisão ainda não tomada, modele a opção recomendada, registre-a em "suposicoes" e pergunte (no máximo 3 perguntas; bloqueante só o que altera o fluxo).
- Não repita perguntas já respondidas ou em aberto em decisoes.md. Se houver versão anterior rejeitada, leia o comentário do humano em decisoes.md e corrija.

Formato do YAML (siga exatamente; "artefato" é o texto YAML, sem cerca):
\`\`\`yaml
${EXEMPLO_ATIVIDADES}\`\`\`
- Responda sempre em português do Brasil, somente com o JSON pedido.`;

export const SHADA_ATIVIDADES_SCHEMA: Record<string, unknown> = SHADA_UC_SCHEMA;

export function normalizarSaidaAtividades(raw: unknown): SaidaAtividades {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Saída do SHADA (atividades) inválida: esperado um objeto JSON.');
  const o = raw as Record<string, unknown>;
  const artefato = limparMermaid(texto(o.artefato));
  if (!/atividades\s*:/.test(artefato)) throw new Error('Saída do SHADA (atividades) inválida: "artefato" não tem atividades.');
  return {
    perguntas: perguntasDe(o.perguntas), artefato,
    suposicoes: lista(o.suposicoes), contradicoes: lista(o.contradicoes), observacoes: texto(o.observacoes),
  };
}

export function montarContextoAtividades(p: CasoPaths, caso: string, rodada: number, gate: Gate2Resultado, fontes: FontesLidas): string {
  const secoes: string[] = [`# Caso: ${caso} — loop 2, etapa de atividades, rodada ${String(rodada).padStart(2, '0')}`];
  secoes.push('## intencoes.md (aprovado no loop 1)\n\n' + lerTexto(p.intencoes));
  secoes.push('## invariantes.md (aprovado no loop 1)\n\n' + lerTexto(p.invariantes));
  secoes.push('## dicionario.json\n\n' + JSON.stringify(lerDicionarioCaso(p.dicionario), null, 2));
  secoes.push('## modelo/dominio.mmd (MER aprovado)\n\n```mermaid\n' + lerTexto(p.dominio).trim() + '\n```');
  secoes.push('## modelo/casos-de-uso.yaml (casos de uso aprovados)\n\n```yaml\n' + lerTexto(p.casos).trim() + '\n```');
  secoes.push('## decisoes.md\n\n' + (lerTexto(p.decisoes) || '(vazio)'));
  const atual = lerTexto(p.atividades);
  secoes.push('## modelo/atividades.yaml (atual)\n\n' + (atual ? '```yaml\n' + atual.trim() + '\n```' : '(ainda não existe)'));
  secoes.push('## Estado do Gate 2\n\n' + (gate.verde ? 'verde' : 'vermelho') + '\n'
    + gate.criterios.map(c => `- (${c.id}) ${c.descricao}: ${c.ok ? 'ok' : 'FALHA'} — ${c.detalhe}`).join('\n')
    + (gate.avisos.length ? '\n' + gate.avisos.map(a => `- aviso: ${a}`).join('\n') : ''));
  secoes.push('## Fontes\n\n' + (fontes.arquivos.length
    ? fontes.arquivos.map(f => `### fontes/${f.nome}\n\n${f.conteudo}`).join('\n\n')
    : '(nenhuma)'));
  secoes.push('Produza a próxima rodada da etapa de atividades: o YAML completo em "artefato", as suposições, até 3 perguntas e as contradições, no JSON do schema.');
  return secoes.join('\n\n');
}

export async function consultarShadaAtividades(provedor: LlmProvider, contexto: string): Promise<SaidaAtividades> {
  const bruto = await provedor.completeJson({
    system: SHADA_ATIVIDADES_SYSTEM,
    user: contexto,
    schemaName: 'rodada_atividades',
    schema: SHADA_ATIVIDADES_SCHEMA,
    effort: 'high',
  });
  return normalizarSaidaAtividades(bruto);
}
