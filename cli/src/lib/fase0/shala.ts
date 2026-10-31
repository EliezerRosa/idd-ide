// src/lib/fase0/shala.ts — SHALA: medida HEURÍSTICA de ambiguidade dos textos do loop 1 (consultiva, não prova nada).
// O que cada parte faz de fato (os nomes acadêmicos indicam a inspiração, não uma implementação):
// 1. Frames: catálogo próprio de gatilhos e "slots" por expressão regular, inspirado na Frame Semantics de
//    Fillmore. Não usa a base FrameNet nem extrai argumentos sintaticamente.
// 2. Ambiguidade estrutural: padrões regex para "A e B ou C", termos vagos e modificadores soltos.
//    Não há parser (Earley ou outro) nem gramática.
// 3. Sinônimos ocultos: coocorrência em janela de 3 tokens e divergência de Jensen-Shannon entre as
//    distribuições de contexto. Esta parte é cálculo real, sobre um corpus pequeno.
// 4. Guardas: regex para condições numéricas (x > N, x < N) e checagem de fronteira em 1 dimensão.
//    Não há solver SAT/DPLL.
// 5. "Entropia": log2 do número de modelos concorrentes, que é estimado por regras fixas (cada lacuna
//    detectada multiplica por 2 ou 4) com contraexemplos ilustrativos prontos. É um indicador, não H(Y|X) medida.

import type { DictionaryTerm } from '@idd/core';
import { lerTexto, lerDicionarioCaso, type CasoPaths } from './casos.ts';
import { extrairItens } from './lintLn.ts';

// ============================================================================
// Tipos & Interfaces Formais do Motor
// ============================================================================

export interface DiagnosticoFrame {
  linha: number;
  frame: string;
  slotFaltante: string;
  descricao: string;
  sugestao: string;
  severidade?: 'critica' | 'alerta';
}

export interface DiagnosticoEstrutural {
  linha: number;
  tipo:
    | 'escopo_logico'
    | 'preposicao_anfibia'
    | 'sujeito_implicito'
    | 'termo_vago_inadmissivel'
    | 'quantificador_ambiguo'
    | 'ordem_temporal_indefinida';
  trecho: string;
  descricao: string;
  leiturasPossiveis: string[];
}

export interface DiagnosticoSinonimoOculto {
  termoA: string;
  termoB: string;
  similaridadeJSD: number; // 0.0 a 1.0 (1 = perfis de contexto idênticos)
  contextosComuns: string[];
  recomendacao: string;
}

export interface DiagnosticoGuarda {
  linha: number;
  tipo: 'lacuna_completude' | 'sobreposicao_conflitante' | 'cobertura_enum_incompleta';
  variavel: string;
  detalhe: string;
  intervalosFaltantesOuSobrepostos: string[];
}

export interface ContraexemploShala {
  casoDeTeste: string;
  cenario: string;
  colunas: string[];
  linhas: Array<{
    participanteOuVariavel: string;
    valoresPorModelo: Record<string, string>;
  }>;
  resumoDivergencia: string;
}

export interface ResultadoShala {
  entropiaBits: number; // log2(modelos concorrentes estimados): indicador heurístico, não H(Y|X) medida
  grauAmbiguidade: 'NULA' | 'BAIXA' | 'MEDIA' | 'ALTA';
  modelosConcorrentes: number;
  contraexemplos: ContraexemploShala[];
  perguntaSocratica: string;
}

export interface RelatorioAmbiguidade {
  caso: string;
  entropiaGlobalBits: number;
  shala: ResultadoShala;
  frames: DiagnosticoFrame[];
  estrutural: DiagnosticoEstrutural[];
  sinonimosOcultos: DiagnosticoSinonimoOculto[];
  guardas: DiagnosticoGuarda[];
  resumoUbiquidade: {
    termosDicionario: number;
    sinonimosDetectados: number;
    lacunasSemanticas: number;
    ambiguidadesEstruturais: number;
    guardasIncompletas: number;
    prontoParaImplementacao: boolean;
  };
}

// ============================================================================
// PILAR 1: frames por regex (inspirado na Frame Semantics de Fillmore; sem FrameNet)
// Ontologia Extensível para Múltiplos Domínios de Software
// ============================================================================

export interface SlotFrame {
  id: string;
  nome: string;
  descricao: string;
  padroesPresentes: RegExp[];
  obrigatorio: boolean;
}

export interface FrameDef {
  nome: string;
  categoria: 'financeiro' | 'temporal' | 'estado' | 'seguranca' | 'dados' | 'comunicacao' | 'logistica';
  gatilhos: RegExp[];
  slots: SlotFrame[];
}

export const CATALOGO_FRAMES_GERAL: FrameDef[] = [
  // 1. Rateio / Partilha Financeira
  {
    nome: 'RateioFinanceiro',
    categoria: 'financeiro',
    gatilhos: [/\b(dividir|divis[aã]o|ratear|rateio|rachar|partilhar|distribuir\s+custo|repartir|c[aá]lculo\s+d[ea]\s+cotas?|calcular\s+cotas?)\b/i],
    slots: [
      {
        id: 'total',
        nome: 'Montante Total',
        descricao: 'Valor financeiro global, total de centavos ou comanda consolidada',
        padroesPresentes: [/\b(pre[çc]o|valor|total|conta|consumo|montante|taxa|fatura|saldo)\b/i],
        obrigatorio: true,
      },
      {
        id: 'partes',
        nome: 'Participantes / Divisores',
        descricao: 'Quem participa do rateio ou fração de divisão',
        padroesPresentes: [/\b(participante|consumidor|cliente|pessoa|membro|amigo|usu[aá]rio|cada|entre)\b/i],
        obrigatorio: true,
      },
      {
        id: 'regra_resto',
        nome: 'Política de Resto / Centavos Indivisíveis',
        descricao: 'Regra determinística para sobra ou arredondamento de centavos em divisões não inteiras',
        padroesPresentes: [/\b(centavo|resto|sobra|arredond|diferen[çc]a|soma zero|exatamente igual|rod[íi]zio|alfab[ée]tic)\b/i],
        obrigatorio: true,
      },
    ],
  },

  // 2. Prazo Temporal / SLAs / Timeouts
  {
    nome: 'PrazoTemporal',
    categoria: 'temporal',
    gatilhos: [/\b(dentro de|prazo|ap[óo]s|limite de tempo|expira|expirar|at[eé] que|tempo limite|timeout|ap[óo]s decorrid[ao])\b/i],
    slots: [
      {
        id: 'duracao_mensuravel',
        nome: 'Duração Mensurável',
        descricao: 'Quantidade e unidade de tempo objetivas (segundos, minutos, horas, dias, etc.)',
        padroesPresentes: [/\b(\d+|um|dois|tr[êe]s|quatro|cinco|dez|quinze|vinte|trinta)\s+(segundo|minuto|hora|dia|semana|m[êe]s|meses|ano)s?\b/i],
        obrigatorio: true,
      },
      {
        id: 'marco_inicial',
        nome: 'Evento Marco Inicial',
        descricao: 'Gatilho ou transição precisa que inicia a contagem do cronômetro',
        padroesPresentes: [/\b(a partir de|ap[óo]s|quando|emiss[aã]o|cria[çc][aã]o|fechamento|envio|registro|solicita[çc][aã]o)\b/i],
        obrigatorio: true,
      },
    ],
  },

  // 3. Máquina de Estados e Ciclo de Vida
  {
    nome: 'TransicaoDeEstado',
    categoria: 'estado',
    gatilhos: [/\b(transiciona|muda para|passa a ser|torna-se|altera o status|marca como|avan[çc]a para|estado)\b/i],
    slots: [
      {
        id: 'estado_origem',
        nome: 'Estado de Origem',
        descricao: 'Pré-condição ou estado atual antes da transição',
        padroesPresentes: [/\b(enquanto|estiver|status|estado|abert[ao]|fechad[ao]|pendente|pago|cancelad[ao]|ativo|inativo)\b/i],
        obrigatorio: true,
      },
      {
        id: 'evento_gatilho',
        nome: 'Evento Gatilho',
        descricao: 'Ação deliberada ou evento do relógio que dispara a mutação',
        padroesPresentes: [/\b(quando|ao|solicitar|confirmar|pagar|cancelar|expirar|fechar|aprovar|rejeitar)\b/i],
        obrigatorio: true,
      },
    ],
  },

  // 4. Liquidação e Meios de Pagamento
  {
    nome: 'LiquidacaoPagamento',
    categoria: 'financeiro',
    gatilhos: [/\b(pagar|pagamento|liquidar|quita[çc][aã]o|estorno|estornar|debitar|creditar)\b/i],
    slots: [
      {
        id: 'meio_ou_chave',
        nome: 'Meio de Pagamento / Destino',
        descricao: 'Chave Pix, cartão, boleto, custódia ou identificador de liquidação',
        padroesPresentes: [/\b(pix|chave|cart[aã]o|dinheiro|transfer[êe]ncia|comprovante|qr code|boleto|escrow|conta)\b/i],
        obrigatorio: true,
      },
      {
        id: 'confirmacao',
        nome: 'Critério de Confirmação',
        descricao: 'Condição formal de ateste do pagamento no livro-razão/banco',
        padroesPresentes: [/\b(confirma|comprova|anexa|valida|aprova|status|baixa|registra|recibo)\b/i],
        obrigatorio: true,
      },
    ],
  },

  // 5. Controle de Acesso e Autorização (RBAC / ABAC)
  {
    nome: 'ControleDeAcesso',
    categoria: 'seguranca',
    gatilhos: [/\b(autenticar|autorizar|permiss[aã]o|somente|exclusivo|apenas|restringir|papel|role|privil[ée]gio)\b/i],
    slots: [
      {
        id: 'sujeito_autorizado',
        nome: 'Sujeito Autorizado',
        descricao: 'Perfil, papel ou identidade do usuário autorizado a executar o comando',
        padroesPresentes: [/\b(respons[aá]vel|administrador|admin|dono|propriet[aá]rio|gerente|operador|cliente|usu[aá]rio autenticado)\b/i],
        obrigatorio: true,
      },
      {
        id: 'recurso_protegido',
        nome: 'Recurso / Ação Protegida',
        descricao: 'Entidade ou operação delimitada sob a cerca de acesso',
        padroesPresentes: [/\b(criar|excluir|fechar|alterar|visualizar|estornar|configurar|acesso|painel)\b/i],
        obrigatorio: true,
      },
      {
        id: 'tratamento_recusa',
        nome: 'Tratamento de Recusa (403/Forbidden)',
        descricao: 'Ação determinística quando o sujeito não possui privilégio',
        padroesPresentes: [/\b(bloquear|negar|rejeitar|lan[çc]ar erro|proibir|recusar|impedir|acesso negado)\b/i],
        obrigatorio: false,
      },
    ],
  },

  // 6. Transferência e Custódia (Logística / E-commerce / Escrow)
  {
    nome: 'TransferenciaCustodia',
    categoria: 'logistica',
    gatilhos: [/\b(cust[óo]dia|escrow|entregar|envio|despachar|transportar|receber pedido|liberar fundo)\b/i],
    slots: [
      {
        id: 'origem_destino',
        nome: 'Origem e Destino',
        descricao: 'Pontos ou atores entre os quais a custódia/item transita',
        padroesPresentes: [/\b(de|para|lojista|vendedor|comprador|transportadora|estoque|armaz[eé]m|cliente)\b/i],
        obrigatorio: true,
      },
      {
        id: 'gatilho_liberacao',
        nome: 'Gatilho de Liberação / Baixa',
        descricao: 'Critério objetivo para liberação física ou liquidação de valores em custódia',
        padroesPresentes: [/\b(ap[óo]s entrega|confirma[çc][aã]o|c[óo]digo|rastreio|assinatura|avalia[çc][aã]o)\b/i],
        obrigatorio: true,
      },
    ],
  },

  // 7. Notificação e Comunicação Externa
  {
    nome: 'NotificacaoMensageria',
    categoria: 'comunicacao',
    gatilhos: [/\b(notificar|avisar|enviar mensagem|disparar|alertar|informar|comunicar)\b/i],
    slots: [
      {
        id: 'destinatario',
        nome: 'Destinatário da Notificação',
        descricao: 'Quem ou qual serviço recebe a notificação',
        padroesPresentes: [/\b(cliente|participante|respons[aá]vel|usu[aá]rio|sistema|webhook|administrador)\b/i],
        obrigatorio: true,
      },
      {
        id: 'canal_comunicacao',
        nome: 'Canal de Comunicação',
        descricao: 'Meio técnico utilizado (email, push, SMS, webhook, UI)',
        padroesPresentes: [/\b(email|e-mail|sms|push|whatsapp|webhook|notifica[çc][aã]o interna|painel|tela)\b/i],
        obrigatorio: true,
      },
    ],
  },
];

/**
 * Analisa frames semânticos através de ontologia universal com verificação de papéis temáticos.
 */
export function analisarFramesSemanticos(texto: string, framesPersonalizados?: FrameDef[]): DiagnosticoFrame[] {
  const diags: DiagnosticoFrame[] = [];
  const linhas = texto.split(/\r?\n/);
  const catalogo = framesPersonalizados ? [...CATALOGO_FRAMES_GERAL, ...framesPersonalizados] : CATALOGO_FRAMES_GERAL;

  linhas.forEach((linhaStr, idx) => {
    const numLinha = idx + 1;
    if (/^\s*(#|>|```)/.test(linhaStr)) return;

    for (const frame of catalogo) {
      const ativa = frame.gatilhos.some(g => g.test(linhaStr));
      if (!ativa) continue;

      for (const slot of frame.slots.filter(s => s.obrigatorio)) {
        const preenchido = slot.padroesPresentes.some(p => p.test(linhaStr));
        if (!preenchido) {
          diags.push({
            linha: numLinha,
            frame: frame.nome,
            slotFaltante: slot.nome,
            descricao: `O enunciado ativou o Frame Semântico "${frame.nome}", mas o elemento obrigatório "${slot.nome}" não está especificado no texto.`,
            sugestao: `Especifique claramente: ${slot.descricao}.`,
            severidade: slot.id.includes('resto') || slot.id.includes('mensuravel') ? 'critica' : 'alerta',
          });
        }
      }
    }

    // Inferência Sintático-Semântica Dinâmica (Fillmore Theme & Goal check):
    // Detecta verbos transitivos imperativos/deontológicos desprovidos de argumentos
    const matchVerboSolto = linhaStr.match(/\b(deve|tem que|precisa)\s+(cobrar|bloquear|deletar|transferir|calcular)\s*(\.|\;|$)/i);
    if (matchVerboSolto) {
      diags.push({
        linha: numLinha,
        frame: 'AcaoTransitivaSemArgumento',
        slotFaltante: 'Alvo/Paciente da Ação',
        descricao: `O verbo de ação "${matchVerboSolto[2]}" foi invocado sem declarar o objeto ou alvo sobre o qual incide.`,
        sugestao: `Indique expressamente qual entidade é afetada por "${matchVerboSolto[2]}".`,
        severidade: 'critica',
      });
    }
  });

  return diags;
}

// ============================================================================
// PILAR 2: ambiguidade estrutural por padrões regex (sem parser Earley)
// ============================================================================

// Vocabulário de termos vagos inadmissíveis em engenharia formal de requisitos
const TERMOS_VAGOS_INADMISSIVEIS = [
  { termo: 'r[aá]pido|rapidamente', sugestao: 'Especifique o tempo limite em milissegundos ou segundos (ex: SLA < 200ms).' },
  { termo: 'f[aá]cil|intuitivo', sugestao: 'Substitua por número máximo de cliques ou critérios objetivos de usabilidade.' },
  { termo: 'adequado|adequadamente', sugestao: 'Defina a regra exata ou norma técnica de conformidade.' },
  { termo: 'em tempo h[aá]bil|em tempo oportuno', sugestao: 'Declare o prazo limite explícito com marco inicial.' },
  { termo: 'conforme necess[aá]rio', sugestao: 'Descreva a condição booleana exata que determina a necessidade.' },
  { termo: 'otimizad[ao]', sugestao: 'Defina a métrica de otimização (memória, CPU ou tempo de resposta).' },
  { termo: 'etc|e outros|e assim por diante', sugestao: 'Enumere exaustivamente todos os itens ou declare fechamento de conjunto.' },
];

export function analisarAmbiguidadeEstrutural(texto: string): DiagnosticoEstrutural[] {
  const diags: DiagnosticoEstrutural[] = [];
  const linhas = texto.split(/\r?\n/);

  linhas.forEach((linhaStr, idx) => {
    const numLinha = idx + 1;
    if (/^\s*(#|>|```)/.test(linhaStr)) return;

    // 1. Ambiguidade de Escopo Lógico Conjunção vs Disjunção: "A e B ou C" / "A ou B e C" sem parênteses/pontuação
    const matchEscopo = linhaStr.match(/(\b[a-zA-ZÀ-ÿ\s\[\]]+\b)\s+e\s+(\b[a-zA-ZÀ-ÿ\s\[\]]+\b)\s+ou\s+(\b[a-zA-ZÀ-ÿ\s\[\]]+\b)/i);
    if (matchEscopo) {
      diags.push({
        linha: numLinha,
        tipo: 'escopo_logico',
        trecho: matchEscopo[0].trim(),
        descricao: 'Ambiguidade de precedência lógica entre conjunção ("e") e disjunção ("ou") sem agrupamento claro.',
        leiturasPossiveis: [
          `Leitura A: ([${matchEscopo[1].trim()}] E [${matchEscopo[2].trim()}]) OU [${matchEscopo[3].trim()}]`,
          `Leitura B: [${matchEscopo[1].trim()}] E ([${matchEscopo[2].trim()}] OU [${matchEscopo[3].trim()}])`,
        ],
      });
    }

    // 2. Preposição Anfíbia (PP-attachment): [verbo] + [alvo A] + [com/de] + [alvo B] + [por/via/em] + [instrumento C]
    const matchPrep = linhaStr.match(/\b(notificar|exibir|enviar|bloquear|cobrar|registrar|atualizar)\s+([a-zA-ZÀ-ÿ\s\[\]]+)\s+(com|de)\s+([a-zA-ZÀ-ÿ\s\[\]]+)\s+(por|via|em)\s+([a-zA-ZÀ-ÿ\s\[\]]+)\b/i);
    if (matchPrep) {
      diags.push({
        linha: numLinha,
        tipo: 'preposicao_anfibia',
        trecho: matchPrep[0].trim(),
        descricao: 'Ambiguidade de apego preposicional (PP-attachment): a cláusula instrumental qualifica o sujeito/ação ou o objeto direto?',
        leiturasPossiveis: [
          `Ação é realizada via ${matchPrep[5]} ${matchPrep[6].trim()} para o alvo que possui ${matchPrep[4].trim()}`,
          `O alvo já possui vínculo no canal ${matchPrep[6].trim()}`,
        ],
      });
    }

    // 3. Detecção de Termos Vagos e Subjetivos (Incompatíveis com AST Determinística)
    for (const vago of TERMOS_VAGOS_INADMISSIVEIS) {
      const reg = new RegExp(`\\b(${vago.termo})\\b`, 'i');
      const matchVago = linhaStr.match(reg);
      if (matchVago) {
        diags.push({
          linha: numLinha,
          tipo: 'termo_vago_inadmissivel',
          trecho: matchVago[0],
          descricao: `Uso do termo vago e não-quantificável "${matchVago[0]}". O compilador determinístico não pode inferir limites estritos.`,
          leiturasPossiveis: [vago.sugestao],
        });
      }
    }

    // 4. Quantificador Universal vs Existencial Ambíguo ("Todo X tem um Y" -> Todos compartilham o mesmo Y ou cada um tem o seu?)
    const matchQuant = linhaStr.match(/\b(todo|toda|cada)\s+([a-zA-ZÀ-ÿ]+)\s+(deve\s+possuir|deve\s+ter|tem|possui)\s+(um|uma)\s+([a-zA-ZÀ-ÿ]+)\b/i);
    if (matchQuant) {
      diags.push({
        linha: numLinha,
        tipo: 'quantificador_ambiguo',
        trecho: matchQuant[0],
        descricao: `Ambiguidade de escopo do quantificador entre "${matchQuant[1]} ${matchQuant[2]}" e "${matchQuant[4]} ${matchQuant[5]}".`,
        leiturasPossiveis: [
          `Distributivo (1:N): Cada ${matchQuant[2]} possui sua própria instância individual de ${matchQuant[5]}.`,
          `Coletivo/Compartilhado (N:1): Todos os ${matchQuant[2]} compartilham uma única e mesma instância global de ${matchQuant[5]}.`,
        ],
      });
    }
  });

  return diags;
}

// ============================================================================
// PILAR 3: PMI + Jensen-Shannon Divergence (Descoberta de Sinônimos Ocultos)
// ============================================================================

const STOPWORDS_PT = new Set([
  'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'nao', 'não',
  'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'ao',
  'ele', 'das', 'seu', 'sua', 'ou', 'quando', 'onde', 'enquanto', 'deve', 'devem',
  'todo', 'toda', 'todos', 'todas', 'cada', 'pelo', 'pela', 'pelos', 'pelas', 'sao', 'são',
]);

function tokenizarTexto(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/[^\wáàâãéêíóôõúçü\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOPWORDS_PT.has(t));
}

// ============================================================================
// Utilitários Matemáticos de Teoria da Informação (Shannon & Jensen-Shannon)
// ============================================================================

/**
 * Limite de Shannon quando p -> 0+: lim_{p -> 0+} p * log2(p) = 0.
 * Evita NaN e -Infinity em distribuições esparsas.
 */
export const safeLog2 = (p: number): number => (p > 0 ? p * Math.log2(p) : 0);

/**
 * Termo de Divergência KL: p * log2(p / q) com tratamento do caso limite para p = 0 ou q = 0.
 */
export const safePLog2 = (p: number, q: number): number =>
  p > 0 && q > 0 ? p * Math.log2(p / q) : 0;

export function calcularJSDivergence(
  distP: Record<string, number>,
  distQ: Record<string, number>
): number {
  const vocab = new Set([...Object.keys(distP), ...Object.keys(distQ)]);
  if (vocab.size === 0) return 0;

  let klPM = 0;
  let klQM = 0;

  for (const w of vocab) {
    const p = distP[w] || 0;
    const q = distQ[w] || 0;
    const m = 0.5 * (p + q);

    klPM += safePLog2(p, m);
    klQM += safePLog2(q, m);
  }

  const jsd = 0.5 * (klPM + klQM);
  return Math.max(0, Math.min(1, jsd));
}

export function analisarSinonimosOcultos(
  textos: string[],
  dicionario: DictionaryTerm[]
): DiagnosticoSinonimoOculto[] {
  const diags: DiagnosticoSinonimoOculto[] = [];
  const tokens = textos.flatMap(tokenizarTexto);

  const termosUnificados = new Map<string, string>();
  for (const t of dicionario) {
    const nomeCanon = t.term.toLowerCase();
    termosUnificados.set(nomeCanon, nomeCanon);
    for (const a of t.aliases || []) {
      termosUnificados.set(a.toLowerCase(), nomeCanon);
    }
  }

  // Janela móvel de coocorrência W = 3
  const W = 3;
  const coocorrencias: Record<string, Record<string, number>> = {};
  const frequencias: Record<string, number> = {};

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    frequencias[w] = (frequencias[w] || 0) + 1;
    if (!coocorrencias[w]) coocorrencias[w] = {};

    const inicio = Math.max(0, i - W);
    const fim = Math.min(tokens.length - 1, i + W);

    for (let j = inicio; j <= fim; j++) {
      if (i === j) continue;
      const ctx = tokens[j];
      coocorrencias[w][ctx] = (coocorrencias[w][ctx] || 0) + 1;
    }
  }

  const palavrasCandidatas = Object.keys(frequencias).filter(p => frequencias[p] >= 2);

  const dists: Record<string, Record<string, number>> = {};
  for (const p of palavrasCandidatas) {
    const total = Object.values(coocorrencias[p] || {}).reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    dists[p] = {};
    for (const [ctx, c] of Object.entries(coocorrencias[p])) {
      dists[p][ctx] = c / total;
    }
  }

  for (let i = 0; i < palavrasCandidatas.length; i++) {
    for (let j = i + 1; j < palavrasCandidatas.length; j++) {
      const p1 = palavrasCandidatas[i];
      const p2 = palavrasCandidatas[j];

      const canon1 = termosUnificados.get(p1);
      const canon2 = termosUnificados.get(p2);
      if (canon1 && canon2 && canon1 === canon2) continue;

      const jsd = calcularJSDivergence(dists[p1] || {}, dists[p2] || {});
      const similaridade = 1 - jsd;

      const ctx1 = Object.keys(coocorrencias[p1] || {});
      const comuns = ctx1.filter(c => (coocorrencias[p2]?.[c] || 0) > 0);

      if (similaridade >= 0.70 && comuns.length >= 2) {
        diags.push({
          termoA: p1,
          termoB: p2,
          similaridadeJSD: Number(similaridade.toFixed(3)),
          contextosComuns: comuns.slice(0, 4),
          recomendacao: `As palavras "${p1}" e "${p2}" aparecem em contextos quase idênticos (${comuns.join(', ')}). Se representam o mesmo conceito, unifique em dicionario.json como termo e alias.`,
        });
      }
    }
  }

  return diags;
}

// ============================================================================
// PILAR 4: guardas numéricas por regex e checagem de fronteira 1D (sem solver SAT/DPLL)
// ============================================================================

export interface CondicaoNumerica {
  linha: number;
  op: '>' | '<' | '>=' | '<=' | '==' | '=';
  val: number;
}

export function analisarConsistenciaGuardas(texto: string): DiagnosticoGuarda[] {
  const diags: DiagnosticoGuarda[] = [];
  const linhas = texto.split(/\r?\n/);

  // Extrair condições numéricas: ex: "se valor > 100", "quando taxa <= 15"
  const regexNum = /(?:se|quando|enquanto|caso)\s+([a-zA-ZÀ-ÿ\[\]_]+)\s*(>|<|>=|<=|==|=)\s*(\d+)/gi;
  const condicoesPorVar: Record<string, CondicaoNumerica[]> = {};

  linhas.forEach((linhaStr, idx) => {
    let match;
    regexNum.lastIndex = 0;
    while ((match = regexNum.exec(linhaStr)) !== null) {
      const v = match[1].trim();
      const op = match[2] as CondicaoNumerica['op'];
      const val = parseInt(match[3], 10);
      if (!condicoesPorVar[v]) condicoesPorVar[v] = [];
      condicoesPorVar[v].push({ linha: idx + 1, op, val });
    }
  });

  for (const [variavel, conds] of Object.entries(condicoesPorVar)) {
    if (conds.length >= 2) {
      // 1. Lacuna de Borda: > N e < N sem cobrir == N
      const temMaiorEstrito = conds.some(c => c.op === '>');
      const temMenorEstrito = conds.some(c => c.op === '<');
      const temIgual = conds.some(c => c.op === '==' || c.op === '=' || c.op === '>=' || c.op === '<=');

      if (temMaiorEstrito && temMenorEstrito && !temIgual) {
        diags.push({
          linha: conds[0].linha,
          tipo: 'lacuna_completude',
          variavel,
          detalhe: `A variável "${variavel}" possui regras para ">" e "<", mas o ponto de fronteira exato não está coberto.`,
          intervalosFaltantesOuSobrepostos: [`${variavel} == valor exato`],
        });
      }

      // 2. Sobreposição Conflitante: >= N e <= N com o mesmo valor N
      const temMaiorIgual = conds.filter(c => c.op === '>=');
      const temMenorIgual = conds.filter(c => c.op === '<=');
      for (const mi of temMaiorIgual) {
        for (const me of temMenorIgual) {
          if (mi.val === me.val) {
            diags.push({
              linha: mi.linha,
              tipo: 'sobreposicao_conflitante',
              variavel,
              detalhe: `Sobreposição de fronteira detectada: ${variavel} >= ${mi.val} e ${variavel} <= ${me.val} podem ser verdadeiras simultaneamente para o valor exato ${mi.val}.`,
              intervalosFaltantesOuSobrepostos: [`${variavel} == ${mi.val}`],
            });
          }
        }
      }
    }
  }

  // 3. Verificação de Completude em Variáveis Categóricas/Enums
  // Ex: Trata "se status for aberto" e "se status for fechado", mas esquece "cancelado"
  const regexEnumCheck = /(?:se|quando)\s+status\s+(?:for|estiver)\s+(abert[ao]|fechad[ao]|pendente|aprovad[ao])/gi;
  const statusMencionados = new Set<string>();
  linhas.forEach(linhaStr => {
    let m;
    while ((m = regexEnumCheck.exec(linhaStr)) !== null) {
      statusMencionados.add(m[1].toLowerCase());
    }
  });

  if (statusMencionados.size === 1 && statusMencionados.has('abert')) {
    diags.push({
      linha: 1,
      tipo: 'cobertura_enum_incompleta',
      variavel: 'status',
      detalhe: 'A especificação condiciona ações ao status aberto, mas não define a política para o estado fechado ou terminal.',
      intervalosFaltantesOuSobrepostos: ['status == fechado/cancelado'],
    });
  }

  return diags;
}

// ============================================================================
// PILAR 5: SHALA Pragmático & Gerador Dinâmico de Contraexemplos Multidomínio
// ============================================================================

export function calcularShalaPragmatico(
  textoIntencoes: string,
  textoInvariantes: string,
  frames: DiagnosticoFrame[],
  estrutural: DiagnosticoEstrutural[] = [],
  guardas: DiagnosticoGuarda[] = []
): ResultadoShala {
  const contraexemplos: ContraexemploShala[] = [];
  const perguntas: string[] = [];
  let numModelos = 1;

  // 1. Caso: Rateio Financeiro com Lacuna de Resto
  const rateioComLacunaResto = frames.some(
    f => f.frame === 'RateioFinanceiro' && f.slotFaltante.includes('Resto')
  );
  const temInvarianteSomaZero = /soma.*cotas.*exatamente.*igual|diferen[çc]a de zero centavos/i.test(textoInvariantes);
  const temRegraRodizio = /rod[íi]zio|ordem alfab[ée]tica|alfab[ée]tic/i.test(textoIntencoes + textoInvariantes);

  if (rateioComLacunaResto || (!temInvarianteSomaZero && /dividir|ratear/i.test(textoIntencoes))) {
    numModelos *= 4;
    contraexemplos.push({
      casoDeTeste: 'Mesa com 3 participantes (Ana, Bruno, Carla) dividindo R$ 100,00',
      cenario: 'Conta de R$ 100,00 dividida por 3 resulta em 33,333... centavos.',
      colunas: ['Participante', 'Modelo A (Truncamento)', 'Modelo B (Primeiro)', 'Modelo C (Último)', 'Modelo D (Aleatório)'],
      linhas: [
        {
          participanteOuVariavel: 'Ana',
          valoresPorModelo: {
            'Modelo A (Truncamento)': 'R$ 33,33',
            'Modelo B (Primeiro)': 'R$ 33,34 (+1c)',
            'Modelo C (Último)': 'R$ 33,33',
            'Modelo D (Aleatório)': 'R$ 33,33',
          },
        },
        {
          participanteOuVariavel: 'Bruno',
          valoresPorModelo: {
            'Modelo A (Truncamento)': 'R$ 33,33',
            'Modelo B (Primeiro)': 'R$ 33,33',
            'Modelo C (Último)': 'R$ 33,33',
            'Modelo D (Aleatório)': 'R$ 33,34 (+1c)',
          },
        },
        {
          participanteOuVariavel: 'Carla',
          valoresPorModelo: {
            'Modelo A (Truncamento)': 'R$ 33,33',
            'Modelo B (Primeiro)': 'R$ 33,33',
            'Modelo C (Último)': 'R$ 33,34 (+1c)',
            'Modelo D (Aleatório)': 'R$ 33,33',
          },
        },
        {
          participanteOuVariavel: 'Total Arrecadado',
          valoresPorModelo: {
            'Modelo A (Truncamento)': 'R$ 99,99 (Falta 1c)',
            'Modelo B (Primeiro)': 'R$ 100,00 (Soma Zero)',
            'Modelo C (Último)': 'R$ 100,00 (Soma Zero)',
            'Modelo D (Aleatório)': 'R$ 100,00 (Soma Zero)',
          },
        },
      ],
      resumoDivergencia: 'Existem 4 distribuições financeiras distintas mutuamente exclusivas que satisfazem o texto atual.',
    });
    perguntas.push('Quando a divisão não for exata em centavos inteiros, qual critério determinístico define a alocação do resto?');
  } else if (temInvarianteSomaZero && !temRegraRodizio) {
    numModelos *= 2;
    contraexemplos.push({
      casoDeTeste: 'Mesa de R$ 100,00 entre Ana e Bruno',
      cenario: 'A soma zero é exigida, mas a ordem de atribuição do centavo extra não foi definida.',
      colunas: ['Participante', 'Modelo A (Ordem Alfabética)', 'Modelo B (Ordem de Entrada)'],
      linhas: [
        {
          participanteOuVariavel: 'Ana',
          valoresPorModelo: {
            'Modelo A (Ordem Alfabética)': 'R$ 50,01',
            'Modelo B (Ordem de Entrada)': 'R$ 50,00',
          },
        },
        {
          participanteOuVariavel: 'Bruno',
          valoresPorModelo: {
            'Modelo A (Ordem Alfabética)': 'R$ 50,00',
            'Modelo B (Ordem de Entrada)': 'R$ 50,01',
          },
        },
      ],
      resumoDivergencia: '2 modelos determinísticos concorrentes para ordem de desempate.',
    });
    perguntas.push('Qual é o critério de ordenação para distribuição dos centavos indivisíveis (alfabético, cadastro ou consumo)?');
  }

  // 2. Lacuna de fronteira entre guardas (ex: x > N e x < N)
  const lacunaGuarda = guardas.find(g => g.tipo === 'lacuna_completude');
  if (lacunaGuarda) {
    numModelos *= 2;
    contraexemplos.push({
      casoDeTeste: `Fronteira Crítica da Variável ${lacunaGuarda.variavel}`,
      cenario: `O valor atinge exatamente o ponto de fronteira não documentado.`,
      colunas: ['Variável', 'Modelo 1 (Ação A)', 'Modelo 2 (Ação B / Exceção)'],
      linhas: [
        {
          participanteOuVariavel: `${lacunaGuarda.variavel} no ponto exato`,
          valoresPorModelo: {
            'Modelo 1 (Ação A)': 'Executa ramo condicional A',
            'Modelo 2 (Ação B / Exceção)': 'Lança exceção ou ignora evento',
          },
        },
      ],
      resumoDivergencia: `Indefinição de comportamento quando ${lacunaGuarda.variavel} atinge a fronteira exata.`,
    });
    perguntas.push(`Qual regra deve ser aplicada quando ${lacunaGuarda.variavel} for exatamente igual ao valor de fronteira?`);
  }

  // 3. Caso Multidomínio: Ambiguidade de Escopo Lógico (A e B ou C)
  const ambEscopo = estrutural.find(e => e.tipo === 'escopo_logico');
  if (ambEscopo) {
    numModelos *= 2;
    perguntas.push(`Na frase "${ambEscopo.trecho}", qual agrupamento de parênteses reflete a intenção de negócio?`);
  }

  // Indicador em bits: log2 do número de modelos estimado acima (equiprováveis por suposição).
  // Se há M modelos concorrentes equiprováveis: p = 1 / M
  // H(Y | X) = - sum_{i=1}^M p * log2(p) com limite estrito safeLog2 para p -> 0
  let entropia = 0.0;
  if (numModelos > 1) {
    const p = 1.0 / numModelos;
    entropia = Number((-numModelos * safeLog2(p)).toFixed(2));
    if (isNaN(entropia) || !isFinite(entropia)) entropia = 0.0;
  }

  const grauAmbiguidade: ResultadoShala['grauAmbiguidade'] =
    entropia === 0 ? 'NULA' : entropia <= 1.0 ? 'BAIXA' : entropia < 2.0 ? 'MEDIA' : 'ALTA';

  return {
    entropiaBits: entropia,
    grauAmbiguidade,
    modelosConcorrentes: numModelos,
    contraexemplos,
    perguntaSocratica: perguntas[0] || 'Nenhuma ambiguidade detectada pelas heurísticas da SHALA (o que não prova que a especificação seja unívoca).',
  };
}

// ============================================================================
// AVALIAÇÃO CONSOLIDADA DO CASO
// ============================================================================

export function avaliarAmbiguidadeCaso(p: CasoPaths, casoNome: string): RelatorioAmbiguidade {
  const txtInt = lerTexto(p.intencoes);
  const txtInv = lerTexto(p.invariantes);
  const dicionario = lerDicionarioCaso(p.dicionario);

  const textoConsolidado = `${txtInt}\n\n${txtInv}`;

  // 1. Frames Semânticos Universais
  const frames = analisarFramesSemanticos(textoConsolidado);

  // 2. Ambiguidade Estrutural & Sintaxe EARS
  const estrutural = analisarAmbiguidadeEstrutural(textoConsolidado);

  // 3. PMI + Jensen-Shannon
  const fontesTextos = [txtInt, txtInv];
  const sinonimos = analisarSinonimosOcultos(fontesTextos, dicionario.terms);

  // 4. Guardas numéricas (regex)
  const guardas = analisarConsistenciaGuardas(textoConsolidado);

  // 5. SHALA Entropia Pragmática Multidomínio
  const shala = calcularShalaPragmatico(txtInt, txtInv, frames, estrutural, guardas);

  // Entropia global consolidada
  let entropiaGlobal = shala.entropiaBits;
  if (estrutural.length > 0) entropiaGlobal += 0.5 * estrutural.length;
  if (guardas.length > 0) entropiaGlobal += 0.3 * guardas.length;

  const pronto =
    shala.entropiaBits === 0 &&
    frames.length === 0 &&
    estrutural.length === 0 &&
    guardas.length === 0;

  return {
    caso: casoNome,
    entropiaGlobalBits: Number(entropiaGlobal.toFixed(2)),
    shala,
    frames,
    estrutural,
    sinonimosOcultos: sinonimos,
    guardas,
    resumoUbiquidade: {
      termosDicionario: dicionario.terms.length,
      sinonimosDetectados: sinonimos.length,
      lacunasSemanticas: frames.length,
      ambiguidadesEstruturais: estrutural.length,
      guardasIncompletas: guardas.length,
      prontoParaImplementacao: pronto,
    },
  };
}
