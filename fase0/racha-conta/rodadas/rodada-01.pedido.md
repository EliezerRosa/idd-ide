# Pedido manual — rodada_shada

> Cole este texto (inteiro) em qualquer assistente de IA (Claude, ChatGPT, Gemini...).
> Salve a resposta, que deve ser **somente JSON**, em:
> `C:\IDE IDD Claude-VS Code\idd-ide\fase0\racha-conta\rodadas\rodada-01.resposta.json`
> Depois rode o comando novamente.

## Instruções do sistema

Você é o SHADA, o agente socrático do Paradigma IDD (Intent-Driven Development) na Fase 0: o estudo de requisitos que transforma material bruto do negócio em uma especificação em linguagem ubíqua, sem ambiguidades conhecidas.

Seu papel no Loop 1 (Intenção):
- Você é livre para perguntar, propor e contestar. Você NUNCA decide: nada entra na especificação sem decisão humana registrada. Tudo o que você escreve é proposta ou pergunta.
- Faça no máximo 3 perguntas por rodada. Priorize as lacunas bloqueantes: ciclo de vida das entidades, cardinalidades, exceções, regras temporais e quem executa cada ação. Marque como bloqueante apenas a pergunta sem a qual não se pode escrever uma intenção ou invariante correta. Para cada pergunta, explique por que ela importa e ofereça opções concretas quando fizer sentido.
- Proponha redação assertiva das intenções em EARS adaptado ao português, com os termos de domínio marcados como [[Termo]] (PascalCase, ex.: [[ContaBancaria]]). Moldes: "O/A <sujeito> deve <resposta>." · "Quando <gatilho>, o/a <sujeito> deve ..." · "Enquanto <estado>, o/a <sujeito> deve ..." · "Se <condição>, então o/a <sujeito> deve ..." · "Onde <característica>, o/a <sujeito> deve ...". Toda frase termina em ponto e usa "deve"/"devem" (ou "não deve"/"não devem"). Evite termos vagos, "e/ou", voz passiva sem agente, pronomes ambíguos e prazos não mensuráveis.
- Proponha invariantes tipadas e testáveis. Tipos permitidos: integridade, unicidade, temporal, autorização, cálculo, estado. Todo enunciado deve conter um marcador testável (sempre, nunca, deve, não pode, no máximo, no mínimo, exatamente, igual a, =, ≤, ≥, <, >).
- Proponha termos do dicionário ubíquo com definição clara (mínimo 10 caracteres), kind (um de: entity, aggregate, value-object, event, role, service, concept), aliases aceitos e sinônimos proibidos (ambíguos que a equipe não deve usar).
- Aponte contradições entre as fontes, as intenções, as invariantes e as decisões já registradas.
- NÃO invente regra de negócio. O que não estiver nas fontes, nas decisões ou no texto já aceito vira pergunta, não proposta.
- Não repita perguntas já respondidas ou em aberto em decisoes.md, nem proponha o que já está aceito. Use ids INT-NNN e INV-NNN novos (continuando a numeração existente) ao propor itens novos, ou o id existente para substituir uma redação.
- Para propostas de tipo "termo", o campo alvo é o nome PascalCase do termo. Para propostas que não são de termo, deixe definicao e kind como string vazia e aliases/proibidos como listas vazias. Para propostas que não são invariante, tipoInvariante é string vazia.
- Responda sempre em português do Brasil, somente com o JSON pedido.

## Pedido

# Caso: racha-conta — rodada 01

## Fontes

### fontes/legado-domain_rules.ts

/**
 * ==============================================================================
 * APP RACHA DE CONTA & PIX - REGRAS DE DOMÍNIO E SOMA ZERO (IDD)
 * Correspondência: Intenção -> Invariante -> UML -> Código
 * ==============================================================================
 */

export type StatusMesa = 'ABERTA' | 'EM_RATEIO' | 'AGUARDANDO_PAGAMENTO' | 'LIQUIDADA';

export interface ItemConsumido {
  id: string;
  descricao: string;
  precoCentavos: number;
  consumidoresIds: string[];
}

export interface Participante {
  id: string;
  nome: string;
  valorAPagarCentavos: number;
  pago: boolean;
}

export class MesaRachaDominio {
  public id: string;
  public titulo: string;
  public taxaServicoPercentual: number;
  public status: StatusMesa;
  public participantes: Map<string, Participante>;
  public itens: ItemConsumido[];

  constructor(id: string, titulo: string, taxaServicoPercentual: number = 10.0) {
    this.id = id;
    this.titulo = titulo;
    this.taxaServicoPercentual = taxaServicoPercentual;
    this.status = 'ABERTA';
    this.participantes = new Map();
    this.itens = [];
  }

  public adicionarParticipante(id: string, nome: string): void {
    if (this.status !== 'ABERTA') throw new Error("INVARIANTE: Novos participantes só na mesa ABERTA.");
    this.participantes.set(id, { id, nome, valorAPagarCentavos: 0, pago: false });
  }

  public adicionarItem(id: string, descricao: string, precoCentavos: number, consumidoresIds: string[]): void {
    if (consumidoresIds.length === 0) {
      throw new Error("INVARIANTE VIOLADA: Todo item deve ter ao menos 1 consumidor associado.");
    }
    for (const cId of consumidoresIds) {
      if (!this.participantes.has(cId)) {
        throw new Error(`INVARIANTE VIOLADA: Consumidor ${cId} não pertence a esta mesa.`);
      }
    }
    this.itens.push({ id, descricao, precoCentavos, consumidoresIds });
  }

  /**
   * CÁLCULO DA INVARIANTE DA SOMA ZERO COM DISTRIBUIÇÃO JUSTA DE CENTAVOS
   */
  public calcularRateioJusto(): void {
    // 1. Zerar saldos
    for (const part of this.participantes.values()) {
      part.valorAPagarCentavos = 0;
    }

    // 2. Distribuir itens
    for (const item of this.itens) {
      const n = item.consumidoresIds.length;
      const cotaBase = Math.floor(item.precoCentavos / n);
      let restoCentavos = item.precoCentavos % n;

      for (const cId of item.consumidoresIds) {
        const p = this.participantes.get(cId)!;
        p.valorAPagarCentavos += cotaBase;
        // Distribuir resto de centavos para garantir soma zero
        if (restoCentavos > 0) {
          p.valorAPagarCentavos += 1;
          restoCentavos--;
        }
      }
    }

    // 3. Aplicar taxa de serviço proporcional sem quebrar a soma zero:
    //    arredonda o TOTAL uma única vez e reparte os centavos pelo maior resto
    //    (arredondar pessoa a pessoa fazia a soma divergir do total — ex.: R$ 10,00 / 3 com 10%).
    const partes = Array.from(this.participantes.values());
    const subtotal = partes.reduce((acc, p) => acc + p.valorAPagarCentavos, 0);
    if (subtotal === 0) return;
    const totalComTaxa = this.totalComTaxaCentavos();
    const cotas = partes.map(p => {
      const exata = (p.valorAPagarCentavos * totalComTaxa) / subtotal;
      return { p, base: Math.floor(exata), resto: exata - Math.floor(exata) };
    });
    let sobra = totalComTaxa - cotas.reduce((acc, c) => acc + c.base, 0);
    cotas.sort((a, b) => b.resto - a.resto || a.p.id.localeCompare(b.p.id));
    for (const c of cotas) {
      c.p.valorAPagarCentavos = c.base + (sobra > 0 ? 1 : 0);
      if (sobra > 0) sobra--;
    }
  }

  /** Total da mesa com taxa de serviço, arredondado uma única vez. */
  public totalComTaxaCentavos(): number {
    const subtotal = this.itens.reduce((acc, i) => acc + i.precoCentavos, 0);
    return Math.round((subtotal * (100 + this.taxaServicoPercentual)) / 100);
  }

  /**
   * CHECAGEM EM TEMPO DE EXECUÇÃO DA INVARIANTE DA SOMA ZERO
   */
  public validarInvarianteSomaZero(totalEsperadoCentavos: number): boolean {
    const somaCalculada = Array.from(this.participantes.values())
      .reduce((acc, p) => acc + p.valorAPagarCentavos, 0);

    // Margem de erro permitida: ZERO centavos
    if (somaCalculada !== totalEsperadoCentavos) {
      throw new Error(`INVARIANTE DA SOMA ZERO VIOLADA: Total esperado ${totalEsperadoCentavos} != Soma calculada ${somaCalculada}`);
    }
    return true;
  }
}


### fontes/legado-schema.sql

-- ==============================================================================
-- APP RACHA DE CONTA & PIX - SCHEMA DE BANCO & INVARIANTES DE DOMÍNIO
-- Paradigma IDD: Invariante da Soma Zero e rateio justo no centavo
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MESAS / EVENTOS DE RATEIO
CREATE TYPE status_mesa AS ENUM ('ABERTA', 'EM_RATEIO', 'AGUARDANDO_PAGAMENTO', 'LIQUIDADA');

CREATE TABLE mesas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(100) NOT NULL, -- Ex: "Churrasco de Domingo" ou "Outback Amigos"
    taxa_servico_percentual DECIMAL(5,2) DEFAULT 10.0 CHECK (taxa_servico_percentual >= 0),
    status status_mesa DEFAULT 'ABERTA',
    valor_total_nota DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (valor_total_nota >= 0),
    chave_pix_destinatario VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PARTICIPANTES DA MESA
CREATE TABLE participantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mesa_id UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
    nome VARCHAR(80) NOT NULL,
    telefone_whatsapp VARCHAR(20),
    valor_a_pagar DECIMAL(10,2) DEFAULT 0 CHECK (valor_a_pagar >= 0),
    pago BOOLEAN DEFAULT FALSE,
    comprovante_pix_url TEXT
);

-- 3. ITENS DA CONTA
CREATE TABLE itens_conta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mesa_id UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
    descricao VARCHAR(100) NOT NULL,
    preco_total DECIMAL(10,2) NOT NULL CHECK (preco_total > 0)
);

-- 4. CONSUMO PARTICIPANTE X ITEM (N:N)
-- Quem consumiu qual item para divisão exata
CREATE TABLE item_consumidores (
    item_id UUID REFERENCES itens_conta(id) ON DELETE CASCADE,
    participante_id UUID REFERENCES participantes(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, participante_id)
);

-- 5. FUNCTION DE VALIDAÇÃO DA INVARIANTE DA SOMA ZERO
-- A soma do valor_a_pagar de todos os participantes DEVE bater exatamente com o valor_total_nota
CREATE OR REPLACE FUNCTION validar_invariante_soma_zero(p_mesa_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_total_nota DECIMAL(10,2);
    v_soma_participantes DECIMAL(10,2);
BEGIN
    SELECT valor_total_nota INTO v_total_nota FROM mesas WHERE id = p_mesa_id;
    SELECT COALESCE(SUM(valor_a_pagar), 0) INTO v_soma_participantes FROM participantes WHERE mesa_id = p_mesa_id;

    IF v_total_nota <> v_soma_participantes THEN
        RAISE EXCEPTION 'VIOLAÇÃO DA INVARIANTE DA SOMA ZERO: O total da nota (%) difere da soma dos participantes (%)!',
            v_total_nota, v_soma_participantes;
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


### fontes/transcricao-ep1.md

# Transcrição — Episódio 1 — O problema e a soma zero

> Fonte: roteiro do canal (série IDD na Prática, Racha de Conta & Pix). Conversa entre o analista
> (Eliézer) e a usuária leiga sobre o problema de dividir a conta. Material bruto: pode conter
> exageros de apresentação; não é especificação.

**Usuária Leiga:** Quem nunca passou pelo constrangimento na hora de fechar a conta no restaurante ou no barzinho? O garçom traz aquela notinha de papel, alguém abre a calculadora do celular, um bebeu chope artesanal, outro só tomou água, a conta não fecha e sobra sempre para o mesmo pagar o prejuízo!

**Eliézer Rosa:** Esse é um dos problemas mais universais e estressantes do convívio social! Bem-vindos à nossa terceira playlist oficial da Série IDD na Prática: Quem Paga o Quê: o Aplicativo de Racha de Conta e Divisão de Pix! Vamos mostrar como o Paradigma IDD resolve essa dor de ponta a ponta com rigor matemático absoluto.

**Usuária Leiga:** Vejam no Slide 2 qual é o grande segredo: a Invariante Sagrada da Soma Zero! Cada item consumido na mesa, seja uma pizza compartilhada ou uma porção individual, é atribuído com precisão a quem realmente consumiu.

**Eliézer Rosa:** Exatamente! A taxa de serviço de dez por cento é rateada de forma estritamente proporcional ao consumo de cada um. E a soma do que todos pagam tem que bater no centavo exato com a nota do restaurante. Margem de erro permitida: zero centavos!

**Usuária Leiga:** E no Slide 3 a inteligência artificial já compila o modelo do problema no terminal e expõe o dilema clássico da divisão de centavos!

**IA Compilador:** Compilando domínio do Racha de Conta: quando dividimos um item de dez reais entre três pessoas, a divisão fracionária resulta em três reais e trinta e três centavos periódicos, totalizando nove reais e noventa e nove centavos. Como resolver o centavo indivisível sem violar a Invariante da Soma Zero?

**Eliézer Rosa:** Diretriz de domínio IDD: o resto da divisão em centavos inteiros é distribuído sequencialmente entre os consumidores participantes! Dois pagam três e trinta e três e um paga três e trinta e quatro. A soma dá exatamente dez reais e a integridade financeira é preservada sem perdas!

**Usuária Leiga:** Que elegância! Cada participante vê exatamente a sua cota justa na tela do celular e paga na hora via Pix Copia e Cola ou QR Code direto para o responsável da mesa!

**Eliézer Rosa:** No próximo episódio, o Um B Metodológico, vamos mostrar como extrair e formalizar as intenções e as invariantes sagradas de rateio com a inteligência artificial antes de escrever qualquer código. Acompanhe a nossa esteira e venha para o próximo vídeo!


### fontes/transcricao-ep1b.md

# Transcrição — Episódio 1B — Intenções e invariantes

> Fonte: roteiro do canal (série IDD na Prática, Racha de Conta & Pix). Conversa entre o analista
> (Eliézer) e a usuária leiga sobre o problema de dividir a conta. Material bruto: pode conter
> exageros de apresentação; não é especificação.

**Usuária Leiga:** Eliézer, no episódio um nós vimos como é doloroso dividir a conta no papel. Mas como uma pessoa leiga, que não entende de programação, consegue sentar com a inteligência artificial e definir essas regras de rateio de forma infalível?

**Eliézer Rosa:** Esse é o Primeiro Passo Sagrado da Metodologia IDD: a Extração de Intenções e Invariantes de Negócio! Você não pede para a IA gerar código nem desenhar telas logo de cara. Primeiro, você ensina para a IA quais são as leis sagradas do seu problema que nunca podem ser violadas sob nenhuma hipótese.

**Usuária Leiga:** Vejam no Slide 2 as três invariantes fundamentais do Racha de Conta: primeiro, a Soma Zero, onde o total das cotas é igual ao total da nota; segundo, a Não-Cobrança Indevida, onde ninguém paga por item que não consumiu; e terceiro, a Distribuição Atômica de Centavos!

**Eliézer Rosa:** Perfeito! Quando essas três leis estão blindadas na mente da IA, ela é incapaz de cometer erros clássicos de arredondamento ou de criar brechas onde um amigo sai no prejuízo. A matemática governa o sistema.

**Usuária Leiga:** E no Slide 3 a inteligência artificial valida o contrato de intenções do rateio no terminal. Vamos acompanhar a compilação das regras!

**IA Compilador:** Compilador IDD processando o Contrato de Intenções do Racha de Pix. Detectei três regras invariantes: cada item possui conjunto estrito de consumidores; taxa de serviço calculada sobre a soma pessoal de itens; e resto de centavos indivisíveis distribuído ciclicamente. Posso gerar a especificação formal de requisitos?

**Eliézer Rosa:** Especificação autorizada! Adicione como invariante adicional que toda mesa possui chave Pix vinculada antes de qualquer fechamento. A governança do dinheiro exige destino certo e auditado!

**IA Compilador:** Invariante de chave Pix registrada. Contrato de intenções aprovado com cem por cento de rigor formal.

**Usuária Leiga:** Incrível! Com as regras declaradas e validadas, nós temos as fundações perfeitas para a construção das telas e do banco de dados!

**Eliézer Rosa:** No Episódio 2, vamos desenhar a interface do app de Racha de Conta, com a seleção visual de quem consumiu o quê e o cálculo dinâmico da conta! Nos vemos no próximo vídeo!


## intencoes.md (atual)

# Intenções — racha-conta

> Uma intenção por linha, no formato `- **INT-001** <frase>`, em EARS adaptado ao português.
> Termos de domínio entre colchetes duplos: [[Termo]] (devem existir em dicionario.json).
> Moldes: "O/A <sujeito> deve <resposta>." · "Quando <gatilho>, o/a <sujeito> deve ..." ·
> "Enquanto <estado>, ..." · "Se <condição>, então o/a <sujeito> deve ..." · "Onde <característica>, ..."
> Exemplo: `- **INT-001** Quando o cliente confirma o pedido, o [[Sistema]] deve registrar a venda.`
> Nada entra aqui sem decisão humana registrada em decisoes.md.



## invariantes.md (atual)

# Invariantes — racha-conta

> Uma invariante por linha, no formato `- **INV-001** [tipo] <enunciado testável>`.
> Tipos: integridade, unicidade, temporal, autorização, cálculo, estado.
> O enunciado precisa de um marcador testável (sempre, nunca, deve, não pode, no máximo, no mínimo, exatamente, igual a, =, ≤, ≥, <, >).
> Exemplo: `- **INV-001** [integridade] Todo [[Pagamento]] sempre pertence a exatamente uma [[Conta]].`



## dicionario.json (atual)

{
  "version": "1.0",
  "terms": []
}

## decisoes.md (atual)

# Decisões — racha-conta

> Registro das decisões humanas, uma por linha:
> respondida: `- [x] D-001 · R01/P01 · bloqueante · <pergunta> → <resposta> (AAAA-MM-DD)`
> em aberto:  `- [ ] D-002 · R01/P02 · bloqueante · <pergunta>`
> Você também pode responder uma pergunta em aberto editando a linha e marcando [x].
> O Gate 1 só fica verde sem decisões `[ ]` bloqueantes.



## Diagnósticos atuais do lint

(nenhum)

## Estado do Gate 1

vermelho
- (a) intencoes.md e invariantes.md sem erros do lint: ok — nenhum erro
- (b) toda invariante tem id, tipo válido e enunciado testável: ok — 0 invariante(s) válida(s)
- (c) nenhuma decisão bloqueante em aberto em decisoes.md: ok — nenhuma
- (d) pelo menos 1 intenção e 1 invariante: FALHA — 0 intenção(ões), 0 invariante(s)

Produza a próxima rodada: até 3 perguntas, propostas e contradições, no JSON do schema.

## JSON Schema esperado da resposta

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "perguntas",
    "propostas",
    "contradicoes",
    "observacoes"
  ],
  "properties": {
    "perguntas": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "texto",
          "porque",
          "opcoes",
          "bloqueante"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "texto": {
            "type": "string"
          },
          "porque": {
            "type": "string"
          },
          "opcoes": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "bloqueante": {
            "type": "boolean"
          }
        }
      }
    },
    "propostas": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "tipo",
          "alvo",
          "texto",
          "tipoInvariante",
          "termo",
          "justificativa"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "tipo": {
            "type": "string",
            "enum": [
              "intencao",
              "invariante",
              "termo"
            ]
          },
          "alvo": {
            "type": "string"
          },
          "texto": {
            "type": "string"
          },
          "tipoInvariante": {
            "type": "string"
          },
          "termo": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "definicao",
              "kind",
              "aliases",
              "proibidos"
            ],
            "properties": {
              "definicao": {
                "type": "string"
              },
              "kind": {
                "type": "string",
                "enum": [
                  "entity",
                  "aggregate",
                  "value-object",
                  "event",
                  "role",
                  "service",
                  "concept",
                  ""
                ]
              },
              "aliases": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "proibidos": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            }
          },
          "justificativa": {
            "type": "string"
          }
        }
      }
    },
    "contradicoes": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "observacoes": {
      "type": "string"
    }
  }
}
```

Responda apenas com um objeto JSON que obedeça ao schema acima, sem texto adicional.
