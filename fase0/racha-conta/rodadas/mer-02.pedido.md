# Pedido manual — rodada_mer

> Cole este texto (inteiro) em qualquer assistente de IA (Claude, ChatGPT, Gemini...).
> Salve a resposta, que deve ser **somente JSON**, em:
> `C:\IDE IDD Claude-VS Code\idd-ide\fase0\racha-conta\rodadas\mer-02.resposta.json`
> Depois rode o comando novamente.

## Instruções do sistema

Você é o SHADA, o agente socrático do Paradigma IDD (Intent-Driven Development), agora no Loop 2 (Modelo) da Fase 0, etapa MER.

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
```
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
```
- Um atributo por linha: "+<tipo> <nome_snake_case> [PK] [UK] [FK(Classe.atributo)] [?]". "?" marca atributo opcional (nullable); sem "?" é obrigatório.
- Tipos: uuid, string, text, integer, bigint, decimal, boolean, timestamp, date.
- Chave composta: marque PK em cada coluna dela.
- Relacionamentos: Classe "1" --> "N" Outra : rótulo (cardinalidades "1", "N", "M").
- Responda sempre em português do Brasil, somente com o JSON pedido.

## Pedido

# Caso: racha-conta — loop 2, etapa MER, rodada 02

## intencoes.md (aprovado no loop 1)

# Intenções — racha-conta

> Uma intenção por linha, no formato `- **INT-001** <frase>`, em EARS adaptado ao português.
> Termos de domínio entre colchetes duplos: [[Termo]] (devem existir em dicionario.json).
> Moldes: "O/A <sujeito> deve <resposta>." · "Quando <gatilho>, o/a <sujeito> deve ..." ·
> "Enquanto <estado>, ..." · "Se <condição>, então o/a <sujeito> deve ..." · "Onde <característica>, ..."
> Exemplo: `- **INT-001** Quando o cliente confirma o pedido, o [[Sistema]] deve registrar a venda.`
> Nada entra aqui sem decisão humana registrada em decisoes.md.
- **INT-001** O aplicativo deve dividir o preço de cada [[ItemConsumido]] somente entre os participantes que consumiram esse [[ItemConsumido]].
- **INT-003** O aplicativo deve exibir a cada [[Participante]] o valor exato da própria [[Cota]].
- **INT-004** O aplicativo deve permitir que cada [[Participante]] pague a própria [[Cota]] por Pix Copia e Cola ou QR Code para a [[ChavePix]] do [[ResponsavelMesa]].
- **INT-005** Quando o [[ResponsavelMesa]] cria a [[Mesa]], o aplicativo deve exigir a [[ChavePix]] do [[ResponsavelMesa]].


## invariantes.md (aprovado no loop 1)

# Invariantes — racha-conta

> Uma invariante por linha, no formato `- **INV-001** [tipo] <enunciado testável>`.
> Tipos: integridade, unicidade, temporal, autorização, cálculo, estado.
> O enunciado precisa de um marcador testável (sempre, nunca, deve, não pode, no máximo, no mínimo, exatamente, igual a, =, ≤, ≥, <, >).
> Exemplo: `- **INV-001** [integridade] Todo [[Pagamento]] sempre pertence a exatamente uma [[Conta]].`
- **INV-001** [cálculo] A soma das cotas de todos os participantes de uma [[Mesa]] deve ser exatamente igual à soma dos preços dos [[ItemConsumido]] mais a [[TaxaServico]], com diferença de zero centavos.
- **INV-003** [integridade] Todo [[ItemConsumido]] deve ter no mínimo um [[Participante]] entre os consumidores.
- **INV-004** [integridade] Todo [[Participante]] associado a um [[ItemConsumido]] deve pertencer à mesma [[Mesa]] do [[ItemConsumido]].
- **INV-005** [cálculo] Toda [[Cota]] deve ser um número inteiro de centavos, com valor ≥ 0.


## dicionario.json

{
  "version": "1.0",
  "terms": [
    {
      "term": "ChavePix",
      "definition": "Chave Pix do responsável da mesa, para a qual os participantes pagam as próprias cotas.",
      "kind": "value-object",
      "aliases": [
        "Chave Pix"
      ],
      "forbidden": []
    },
    {
      "term": "Cota",
      "definition": "Valor em centavos inteiros que um participante deve pagar: a parte dos itens que consumiu mais a parte proporcional da taxa de serviço.",
      "kind": "value-object",
      "aliases": [
        "Cota justa"
      ],
      "forbidden": []
    },
    {
      "term": "ItemConsumido",
      "definition": "Produto ou serviço da nota (pizza, porção, bebida) com descrição, preço em centavos e o conjunto de participantes que o consumiram.",
      "kind": "entity",
      "aliases": [
        "Item"
      ],
      "forbidden": []
    },
    {
      "term": "Mesa",
      "definition": "Encontro de consumo (restaurante, bar, churrasco) que reúne os participantes, os itens consumidos e a taxa de serviço, e cuja nota é dividida entre os participantes.",
      "kind": "aggregate",
      "aliases": [
        "Evento de rateio"
      ],
      "forbidden": []
    },
    {
      "term": "Nota",
      "definition": "Documento de cobrança emitido pelo estabelecimento, com o valor total a pagar pela mesa.",
      "kind": "value-object",
      "aliases": [
        "Nota do estabelecimento"
      ],
      "forbidden": [
        "Notinha"
      ]
    },
    {
      "term": "Participante",
      "definition": "Pessoa que integra uma mesa, pode consumir itens e deve pagar a própria cota.",
      "kind": "entity",
      "aliases": [
        "Consumidor"
      ],
      "forbidden": []
    },
    {
      "term": "ResponsavelMesa",
      "definition": "Participante que recebe, na própria chave Pix, os pagamentos das cotas dos demais participantes da mesa.",
      "kind": "role",
      "aliases": [
        "Responsável da mesa"
      ],
      "forbidden": []
    },
    {
      "term": "TaxaServico",
      "definition": "Percentual cobrado pelo estabelecimento sobre o consumo (10% nas fontes), rateado entre os participantes em proporção ao que cada um consumiu.",
      "kind": "value-object",
      "aliases": [
        "Taxa de serviço",
        "Gorjeta"
      ],
      "forbidden": []
    }
  ]
}

## decisoes.md

# Decisões — racha-conta

> Registro das decisões humanas, uma por linha:
> respondida: `- [x] D-001 · R01/P01 · bloqueante · <pergunta> → <resposta> (AAAA-MM-DD)`
> em aberto:  `- [ ] D-002 · R01/P02 · bloqueante · <pergunta>`
> Você também pode responder uma pergunta em aberto editando a linha e marcando [x].
> O Gate 1 só fica verde sem decisões `[ ]` bloqueantes.
- [x] D-001 · R01/P01 · bloqueante · Qual é o total de referência que a soma das cotas deve igualar exatamente? → O total calculado pelo aplicativo (soma dos itens registrados mais a taxa de serviço); a nota impressa é só conferência. (2026-10-27)
- [x] D-002 · R01/P02 · bloqueante · Quando o preço de um item não se divide em centavos iguais entre os consumidores, qual critério decide quem paga o centavo a mais? → Em rodízio ao longo de toda a mesa: o centavo extra vai para o próximo participante que ainda não recebeu nenhum centavo extra. (2026-10-27)
- [x] D-003 · R01/P03 · bloqueante · Em que momento a chave Pix do responsável deve estar vinculada à mesa? → Obrigatória já na criação da mesa. (2026-10-27)
- [x] D-004 · R01/PR01 · proposta aceita: termo Mesa — Encontro de consumo (restaurante, bar, churrasco) que reúne os participantes, os itens consumidos e a taxa de serviço, e cuja nota é dividida entre os participantes. (2026-10-27)
- [x] D-005 · R01/PR02 · proposta aceita: termo Participante — Pessoa que integra uma mesa, pode consumir itens e deve pagar a própria cota. (2026-10-27)
- [x] D-006 · R01/PR03 · proposta aceita: termo ItemConsumido — Produto ou serviço da nota (pizza, porção, bebida) com descrição, preço em centavos e o conjunto de participantes que o consumiram. (2026-10-27)
- [x] D-007 · R01/PR04 · proposta aceita: termo TaxaServico — Percentual cobrado pelo estabelecimento sobre o consumo (10% nas fontes), rateado entre os participantes em proporção ao que cada um consumiu. (2026-10-27)
- [x] D-008 · R01/PR05 · proposta aceita: termo Cota — Valor em centavos inteiros que um participante deve pagar: a parte dos itens que consumiu mais a parte proporcional da taxa de serviço. (2026-10-27)
- [x] D-009 · R01/PR06 · proposta aceita: termo ResponsavelMesa — Participante que recebe, na própria chave Pix, os pagamentos das cotas dos demais participantes da mesa. (2026-10-27)
- [x] D-010 · R01/PR07 · proposta aceita: termo ChavePix — Chave Pix do responsável da mesa, para a qual os participantes pagam as próprias cotas. (2026-10-27)
- [x] D-011 · R01/PR08 · proposta aceita: termo Nota — Documento de cobrança emitido pelo estabelecimento, com o valor total a pagar pela mesa. (2026-10-27)
- [x] D-012 · R01/PR09 · proposta aceita: INT-001 — O aplicativo deve dividir o preço de cada [[ItemConsumido]] somente entre os participantes que consumiram esse [[ItemConsumido]]. (2026-10-27)
- [ ] D-013 · R01/PR10 · não-bloqueante · proposta pendente: INT-002
- [x] D-014 · R01/PR11 · proposta aceita: INT-003 — O aplicativo deve exibir a cada [[Participante]] o valor exato da própria [[Cota]]. (2026-10-27)
- [x] D-015 · R01/PR12 · proposta aceita: INT-004 — O aplicativo deve permitir que cada [[Participante]] pague a própria [[Cota]] por Pix Copia e Cola ou QR Code para a [[ChavePix]] do [[ResponsavelMesa]]. (2026-10-27)
- [x] D-016 · R01/PR13 · proposta aceita: INT-005 — Quando o [[ResponsavelMesa]] cria a [[Mesa]], o aplicativo deve exigir a [[ChavePix]] do [[ResponsavelMesa]]. (2026-10-27)
- [x] D-017 · R01/PR14 · proposta aceita: INV-001 — [cálculo] A soma das cotas de todos os participantes de uma [[Mesa]] deve ser exatamente igual à soma dos preços dos [[ItemConsumido]] mais a [[TaxaServico]], com diferença de zero centavos. (2026-10-27)
- [ ] D-018 · R01/PR15 · não-bloqueante · proposta pendente: INV-002
- [x] D-019 · R01/PR16 · proposta aceita: INV-003 — [integridade] Todo [[ItemConsumido]] deve ter no mínimo um [[Participante]] entre os consumidores. (2026-10-27)
- [x] D-020 · R01/PR17 · proposta aceita: INV-004 — [integridade] Todo [[Participante]] associado a um [[ItemConsumido]] deve pertencer à mesma [[Mesa]] do [[ItemConsumido]]. (2026-10-27)
- [x] D-021 · R01/PR18 · proposta aceita: INV-005 — [cálculo] Toda [[Cota]] deve ser um número inteiro de centavos, com valor ≥ 0. (2026-10-27)
- [x] D-022 · L2/MER01/P01 · bloqueante · Em que ordem o rodízio do centavo indivisível percorre os participantes e os itens da mesa? → Ordem alfabética dos nomes dos participantes e ordem de registro dos itens. (2026-10-27)
- [x] D-023 · L2/MER01/P02 · não-bloqueante · A taxa de serviço é sempre 10% ou pode ser ajustada em cada mesa? → Ajustável por mesa, com 10% como padrão (atributo da Mesa). (2026-10-27)
- [x] D-024 · L2/MER01/P03 · não-bloqueante · O aplicativo deve registrar que um participante pagou a própria cota? → Sim: o participante anexa o comprovante e o responsável confirma. (2026-10-27)
- [x] D-025 · L2/MER01/modelo · modelo rejeitado — refazer incorporando as respostas: rodízio em ordem alfabética dos participantes (P01) e pagamento com comprovante anexado pelo participante e confirmado pelo responsável (P03) (2026-10-27)


## modelo/dominio.mmd (atual)

(ainda não existe)

## Estado do Gate 2 (etapa MER)

vermelho
- (a) modelo/dominio.mmd aprovado e com ao menos 1 classe: FALHA — arquivo ausente
- (b) todo termo entity/aggregate do dicionário tem classe homônima: FALHA — sem classe: ItemConsumido, Mesa, Participante
- (c) toda classe em BCNF (ou 3NF quando a BCNF perderia dependência): FALHA — 0 classe(s) conforme(s)
- (d) nenhuma decisão bloqueante em aberto em decisoes.md: ok — nenhuma

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


Produza a próxima rodada da etapa MER: o modelo completo, o rastreio classe → termo, as suposições, até 3 perguntas e as contradições, no JSON do schema.

## JSON Schema esperado da resposta

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "perguntas",
    "modelo",
    "rastreio",
    "suposicoes",
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
    "modelo": {
      "type": "string"
    },
    "rastreio": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "classe",
          "termo",
          "justificativa"
        ],
        "properties": {
          "classe": {
            "type": "string"
          },
          "termo": {
            "type": "string"
          },
          "justificativa": {
            "type": "string"
          }
        }
      }
    },
    "suposicoes": {
      "type": "array",
      "items": {
        "type": "string"
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
