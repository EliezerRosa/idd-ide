# Rodada 01 — racha-conta

> Responda as perguntas e decida as propostas abaixo (basta editar este arquivo), depois rode `idd fase0 loop1 racha-conta`.
> Resposta: número da opção ou texto livre (pode ocupar várias linhas). Decisão: marque `[x]` em aceitar ou rejeitar.
> Nada entra na especificação sem a sua decisão. Propostas sem decisão ficam pendentes.

## Perguntas

### P01 · bloqueante

Qual é o total de referência que a soma das cotas deve igualar exatamente?

Por quê: A Soma Zero precisa de um único total de referência. O legado-schema.sql compara a soma das cotas com valor_total_nota (valor informado da nota), enquanto o legado-domain_rules.ts calcula o total a partir dos itens mais a taxa de serviço. Se a nota do estabelecimento trouxer algo fora dos itens registrados (couvert, desconto, item esquecido), os dois totais divergem e a invariante fica indefinida.

1. O valor impresso na nota do estabelecimento, informado na mesa; o aplicativo bloqueia o fechamento se a soma dos itens com a taxa não bater com ele.
2. O total calculado pelo aplicativo (soma dos itens registrados mais a taxa de serviço); a nota impressa é só conferência.
3. Os dois: o fechamento exige que o total calculado seja igual ao valor da nota informada.

**Resposta:**

### P02 · bloqueante

Quando o preço de um item não se divide em centavos iguais entre os consumidores, qual critério decide quem paga o centavo a mais?

Por quê: As fontes divergem: o Ep. 1 diz que o resto é distribuído 'sequencialmente', o Ep. 1B diz 'ciclicamente', e o código legado reinicia a contagem em cada item a partir do primeiro consumidor da lista, de modo que o mesmo participante pode pagar o centavo extra em todos os itens. Sem um critério fixado, a invariante de distribuição de centavos não é testável.

1. Por item, na ordem de registro dos consumidores (comportamento do código legado).
2. Em rodízio ao longo de toda a mesa: o centavo extra vai para o próximo participante que ainda não recebeu nenhum centavo extra.
3. Por item, para o consumidor com menor valor acumulado na mesa até aquele momento.

**Resposta:**

### P03 · bloqueante

Em que momento a chave Pix do responsável deve estar vinculada à mesa?

Por quê: O Ep. 1B exige a chave Pix 'antes de qualquer fechamento'; o legado-schema.sql a exige já na criação da mesa (NOT NULL); o legado-domain_rules.ts não tem chave Pix. A resposta decide se uma mesa pode existir sem destino de pagamento.

1. Obrigatória já na criação da mesa.
2. Obrigatória somente antes do fechamento da mesa.

**Resposta:**

## Propostas

### PR01 · termo · Mesa

> **Definição:** Encontro de consumo (restaurante, bar, churrasco) que reúne os participantes, os itens consumidos e a taxa de serviço, e cuja nota é dividida entre os participantes.
> **Tipo:** aggregate
> **Aliases:** Evento de rateio
> **Proibidos:** —

Justificativa: Termo central das duas transcrições ('itens consumidos na mesa', 'responsável da mesa') e do legado (MesaRachaDominio, tabela mesas).

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR02 · termo · Participante

> **Definição:** Pessoa que integra uma mesa, pode consumir itens e deve pagar a própria cota.
> **Tipo:** entity
> **Aliases:** Consumidor
> **Proibidos:** —

Justificativa: Usado nas fontes ('cada participante vê a sua cota') e no legado (Participante, tabela participantes). 'Consumidor' aparece como o participante associado a um item.

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR03 · termo · ItemConsumido

> **Definição:** Produto ou serviço da nota (pizza, porção, bebida) com descrição, preço em centavos e o conjunto de participantes que o consumiram.
> **Tipo:** entity
> **Aliases:** Item
> **Proibidos:** —

Justificativa: Ep. 1 ('cada item consumido na mesa'), Ep. 1B ('cada item possui conjunto estrito de consumidores') e legado (ItemConsumido, tabela itens_conta).

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR04 · termo · TaxaServico

> **Definição:** Percentual cobrado pelo estabelecimento sobre o consumo (10% nas fontes), rateado entre os participantes em proporção ao que cada um consumiu.
> **Tipo:** value-object
> **Aliases:** Taxa de serviço, Gorjeta
> **Proibidos:** —

Justificativa: Ep. 1 ('taxa de serviço de dez por cento'), Ep. 1B e legado (taxaServicoPercentual).

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR05 · termo · Cota

> **Definição:** Valor em centavos inteiros que um participante deve pagar: a parte dos itens que consumiu mais a parte proporcional da taxa de serviço.
> **Tipo:** value-object
> **Aliases:** Cota justa
> **Proibidos:** —

Justificativa: Ep. 1 ('a sua cota justa'), Ep. 1B ('o total das cotas') e legado (valorAPagarCentavos).

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR06 · termo · ResponsavelMesa

> **Definição:** Participante que recebe, na própria chave Pix, os pagamentos das cotas dos demais participantes da mesa.
> **Tipo:** role
> **Aliases:** Responsável da mesa
> **Proibidos:** —

Justificativa: Ep. 1: 'paga na hora via Pix ... direto para o responsável da mesa'. Quem assume esse papel ainda não está definido nas fontes (ver observações).

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR07 · termo · ChavePix

> **Definição:** Chave Pix do responsável da mesa, para a qual os participantes pagam as próprias cotas.
> **Tipo:** value-object
> **Aliases:** Chave Pix
> **Proibidos:** —

Justificativa: Ep. 1B ('toda mesa possui chave Pix vinculada') e legado-schema.sql (chave_pix_destinatario).

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR08 · termo · Nota

> **Definição:** Documento de cobrança emitido pelo estabelecimento, com o valor total a pagar pela mesa.
> **Tipo:** value-object
> **Aliases:** Nota do estabelecimento
> **Proibidos:** Notinha

Justificativa: Ep. 1 ('aquela notinha de papel', 'bater no centavo exato com a nota do restaurante') e legado-schema.sql (valor_total_nota). O papel da nota na Soma Zero depende da pergunta P01.

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR09 · intenção · INT-001

> O aplicativo deve dividir o preço de cada [[ItemConsumido]] somente entre os participantes que consumiram esse [[ItemConsumido]].

Justificativa: Ep. 1 ('atribuído com precisão a quem realmente consumiu') e Ep. 1B ('ninguém paga por item que não consumiu').

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR10 · intenção · INT-002

> O aplicativo deve ratear a [[TaxaServico]] entre os participantes em proporção ao valor dos itens que cada [[Participante]] consumiu.

Justificativa: Ep. 1 ('rateada de forma estritamente proporcional ao consumo de cada um') e Ep. 1B ('taxa calculada sobre a soma pessoal de itens').

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR11 · intenção · INT-003

> O aplicativo deve exibir a cada [[Participante]] o valor exato da própria [[Cota]].

Justificativa: Ep. 1: 'cada participante vê exatamente a sua cota justa na tela do celular'.

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR12 · intenção · INT-004

> O aplicativo deve permitir que cada [[Participante]] pague a própria [[Cota]] por Pix Copia e Cola ou QR Code para a [[ChavePix]] do [[ResponsavelMesa]].

Justificativa: Ep. 1: 'paga na hora via Pix Copia e Cola ou QR Code direto para o responsável da mesa'.

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR13 · intenção · INT-005

> Se a [[Mesa]] não tem [[ChavePix]] vinculada, então o aplicativo não deve permitir o fechamento da [[Mesa]].

Justificativa: Ep. 1B: 'toda mesa possui chave Pix vinculada antes de qualquer fechamento'. Se P03 for respondida com 'na criação', esta intenção deve ser reescrita.

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR14 · invariante · INV-001

> [cálculo] A soma das cotas de todos os participantes de uma [[Mesa]] deve ser exatamente igual ao total da [[Nota]], com diferença de zero centavos.

Justificativa: Soma Zero: Ep. 1 ('tem que bater no centavo exato com a nota do restaurante') e Ep. 1B ('o total das cotas é igual ao total da nota'). A referência exata depende de P01.

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR15 · invariante · INV-002

> [integridade] A [[Cota]] de um [[Participante]] nunca inclui valor de um [[ItemConsumido]] que esse [[Participante]] não consumiu.

Justificativa: Não-Cobrança Indevida, citada no Ep. 1B.

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR16 · invariante · INV-003

> [integridade] Todo [[ItemConsumido]] deve ter no mínimo um [[Participante]] entre os consumidores.

Justificativa: Ep. 1B ('cada item possui conjunto estrito de consumidores') e legado-domain_rules.ts ('Todo item deve ter ao menos 1 consumidor').

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR17 · invariante · INV-004

> [integridade] Todo [[Participante]] associado a um [[ItemConsumido]] deve pertencer à mesma [[Mesa]] do [[ItemConsumido]].

Justificativa: Legado-domain_rules.ts ('Consumidor não pertence a esta mesa') e legado-schema.sql (item_consumidores ligado a participantes e itens da mesa).

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

### PR18 · invariante · INV-005

> [cálculo] Toda [[Cota]] deve ser um número inteiro de centavos, com valor ≥ 0.

Justificativa: Ep. 1 ('o resto da divisão em centavos inteiros') e legado-schema.sql (CHECK valor_a_pagar >= 0).

**Decisão:** [ ] aceitar  [ ] rejeitar

**Texto final (opcional):**

## Contradições

- Distribuição do centavo indivisível: o Ep. 1 diz 'sequencialmente', o Ep. 1B diz 'ciclicamente' e o legado-domain_rules.ts reinicia em cada item a partir do primeiro consumidor, o que pode fazer o mesmo participante pagar todos os centavos extras (ver P02).
- Momento da chave Pix: o Ep. 1B a exige 'antes de qualquer fechamento'; o legado-schema.sql a exige na criação da mesa (NOT NULL); o legado-domain_rules.ts não a modela (ver P03).
- Total de referência da Soma Zero: o legado-schema.sql compara a soma das cotas com valor_total_nota (informado), e o legado-domain_rules.ts com o total calculado a partir dos itens e da taxa (ver P01).
- Arredondamento da taxa de serviço: o legado-domain_rules.ts arredonda o total com taxa uma vez e reparte os centavos pelo maior resto, critério diferente do usado para os itens; as transcrições não tratam desse arredondamento.

## Observações

Rodada gerada pelo provedor manual: a resposta foi produzida pelo Claude Opus 5.5 na sessão do Claude Code em 2026-10-27, seguindo este pedido sem alterações. Temas para as próximas rodadas: (1) ciclo de vida da mesa — os estados ABERTA, EM_RATEIO, AGUARDANDO_PAGAMENTO e LIQUIDADA só existem no código legado, sem gatilhos definidos nas fontes; (2) quem assume o papel de responsável da mesa e quem registra itens e participantes; (3) como um pagamento é confirmado (o legado tem os campos pago e comprovante_pix_url, sem regra associada); (4) se a taxa de serviço de 10% é fixa ou ajustável por mesa; (5) a palavra 'conta' é ambígua (nota do estabelecimento × conta bancária) e pode virar sinônimo proibido. As afirmações das transcrições sobre 'rigor matemático absoluto', 'incapaz de cometer erros' e 'cem por cento de rigor formal' são retórica de apresentação, não requisitos, e não foram transformadas em propostas.
