# Loop 2 · Atividades · rodada 01 — racha-conta

> Revise a proposta. Você pode editar o bloco yaml abaixo antes de aprovar.
> Responda as perguntas, marque `[x]` em aprovar ou rejeitar e rode `idd fase0 loop2 racha-conta`.
> Aprovar grava modelo/atividades.yaml (Confirm-Once da etapa). Ao rejeitar, diga o porquê no comentário.

## Perguntas

### P01 · não-bloqueante

O participante pode consultar a própria cota enquanto a mesa ainda está aberta ou somente após o fechamento da mesa?

Por quê: Em modelo/casos-de-uso.yaml, TN-04 exige apenas que a Mesa tenha ao menos um ItemConsumido, enquanto TN-06 e TN-07 exigem Mesa fechada. Se a consulta ocorrer com a Mesa aberta, o valor exibido ainda pode mudar caso novos itens ou participantes sejam incluídos antes de TN-05.

1. Pode consultar tanto com a mesa aberta (parcial) quanto após o fechamento (definitiva).
2. Só pode consultar após o responsável fechar a mesa.

**Resposta:** 1

### P02 · não-bloqueante

Para fechar a mesa (TN-05), o sistema deve exigir que exista ao menos um item consumido registrado?

Por quê: Na pré-condição atual de TN-05 consta apenas que a Mesa não esteja fechada, mas TN-04 (calcular cotas) exige ao menos um ItemConsumido. Fechar uma mesa sem itens deixaria a mesa fechada sem cotas calculáveis.

1. Sim: a mesa só pode ser fechada se tiver ao menos um item consumido registrado.
2. Não: o responsável pode fechar a mesa mesmo sem itens.

**Resposta:** 2

### P03 · não-bloqueante

Se um participante da mesa tiver cota igual a zero centavos (não consumiu nenhum item), como o fluxo de pagamento (UC-05) se comporta para ele?

Por quê: A INV-005 permite Cota ≥ 0 centavos, mas não existe cobrança Pix de zero centavos. Isso define a guarda de TN-06/TN-07 e os estados de pagamento na próxima etapa.

1. Não gera cobrança Pix nem exige comprovante: cota zero é considerada quitada no fechamento.
2. Todo participante da mesa deve consumir ao menos um item antes do fechamento.

**Resposta:** 1

## Atividades propostas

```yaml
atividades:
  - uc: UC-01
    resumo: O responsável informa o próprio nome, a chave Pix e a taxa de serviço opcional, e o sistema cria a mesa aberta.
    passos:
      - id: P-01
        raia: ResponsavelMesa
        acao: "Informa o próprio nome, a [[ChavePix]] e, opcionalmente, o percentual da [[TaxaServico]]."
      - id: P-02
        raia: Sistema
        acao: "Cria a [[Mesa]] aberta com a [[ChavePix]] e a [[TaxaServico]] (ou 10% por padrão) e registra o [[ResponsavelMesa]] como [[Participante]]."
        transacao: TN-01
        guarda: "O [[ResponsavelMesa]] informou a própria [[ChavePix]] e o próprio nome."
        senao: "Recusa a criação da [[Mesa]] e solicita o dado obrigatório ausente."
  - uc: UC-02
    resumo: Enquanto a mesa está aberta, o responsável inclui participantes com nomes únicos e registra os itens consumidos.
    passos:
      - id: P-01
        raia: ResponsavelMesa
        acao: "Informa o nome do novo [[Participante]] da [[Mesa]]."
      - id: P-02
        raia: Sistema
        acao: "Inclui o [[Participante]] na [[Mesa]]."
        transacao: TN-02
        guarda: "A [[Mesa]] não está fechada e nenhum [[Participante]] da [[Mesa]] tem o mesmo nome."
        senao: "Recusa a inclusão do [[Participante]] e informa o motivo."
      - id: P-03
        raia: ResponsavelMesa
        acao: "Informa a descrição, o preço inteiro em centavos e os [[Participante]]s consumidores do [[ItemConsumido]]."
      - id: P-04
        raia: Sistema
        acao: "Registra o [[ItemConsumido]] na próxima ordem da [[Mesa]] e associa cada [[Participante]] consumidor."
        transacao: TN-03
        guarda: "A [[Mesa]] não está fechada, o [[ItemConsumido]] tem ao menos um consumidor da mesma [[Mesa]] e o preço é um número inteiro de centavos."
        senao: "Recusa o registro do [[ItemConsumido]] e informa a regra violada."
  - uc: UC-03
    resumo: O participante solicita a consulta e o sistema calcula e exibe as cotas da mesa com centavos indivisíveis em rodízio alfabético.
    passos:
      - id: P-01
        raia: Participante
        acao: "Solicita a consulta da própria [[Cota]] na [[Mesa]]."
      - id: P-02
        raia: Sistema
        acao: "Calcula as [[Cota]]s da [[Mesa]] (itens e [[TaxaServico]] com arredondamento comercial e rodízio alfabético contínuo) e exibe o valor exato da [[Cota]] ao [[Participante]]."
        transacao: TN-04
        guarda: "A [[Mesa]] tem ao menos um [[ItemConsumido]]."
        senao: "Informa que a [[Mesa]] ainda não possui [[ItemConsumido]] registrado para cálculo."
  - uc: UC-04
    resumo: O responsável encerra os lançamentos e fecha definitivamente a mesa para pagamento.
    passos:
      - id: P-01
        raia: ResponsavelMesa
        acao: "Solicita o fechamento da [[Mesa]] para pagamento."
      - id: P-02
        raia: Sistema
        acao: "Registra a data de fechamento da [[Mesa]] e bloqueia novas inclusões ou alterações de consumo."
        transacao: TN-05
        guarda: "A [[Mesa]] não está fechada."
        senao: "Informa que a [[Mesa]] já se encontra fechada."
  - uc: UC-05
    resumo: Com a mesa fechada, o participante gera a cobrança Pix da própria cota e envia o comprovante de pagamento.
    passos:
      - id: P-01
        raia: Participante
        acao: "Solicita a cobrança Pix para pagamento da própria [[Cota]]."
      - id: P-02
        raia: Sistema
        acao: "Exibe o código Pix Copia e Cola e o QR Code para a [[ChavePix]] da [[Mesa]] com o valor da [[Cota]] do [[Participante]]."
        transacao: TN-06
        guarda: "A [[Mesa]] está fechada, o [[Participante]] não é o [[ResponsavelMesa]] e a [[Cota]] do [[Participante]] é maior que zero."
        senao: "Recusa a geração da cobrança Pix e informa o motivo."
      - id: P-03
        raia: Participante
        acao: "Envia o comprovante de pagamento da própria [[Cota]]."
      - id: P-04
        raia: Sistema
        acao: "Registra o pagamento do [[Participante]] com o comprovante e o valor da [[Cota]] em centavos, substituindo comprovante anterior não confirmado."
        transacao: TN-07
        guarda: "A [[Mesa]] está fechada, o [[Participante]] não é o [[ResponsavelMesa]], a [[Cota]] do [[Participante]] é maior que zero e nenhum pagamento do [[Participante]] está confirmado."
        senao: "Recusa o envio do comprovante e informa o motivo."
  - uc: UC-06
    resumo: O responsável confere o comprovante enviado pelo participante e confirma o pagamento da cota.
    passos:
      - id: P-01
        raia: ResponsavelMesa
        acao: "Seleciona o pagamento pendente de um [[Participante]] e confirma o recebimento."
      - id: P-02
        raia: Sistema
        acao: "Registra a data de confirmação no pagamento do [[Participante]]."
        transacao: TN-08
        guarda: "O pagamento tem comprovante e ainda não foi confirmado."
        senao: "Recusa a confirmação e informa que não há pagamento pendente com comprovante."
```

### Diagnóstico (calculado pelo IDD, não pela IA)

- ✓ (j) modelo/atividades.yaml aprovado, válido e com um fluxo por caso de uso — 6 fluxo(s), 16 passo(s)
- ✓ (k) toda transação de negócio é executada pelo Sistema no fluxo do seu caso de uso — 8 transação(ões) executada(s)
- ✓ (l) toda transação com pré-condição tem guarda e recusa (senao) no passo que a executa — 8 passo(s) com guarda/senao
- ✓ (m) casos de uso, transações e raias citados existem em modelo/casos-de-uso.yaml — todas existem

### Suposições do SHADA (confirme pelas perguntas)

- Em UC-02, a inclusão de participante (TN-02) e o registro de item (TN-03) aparecem em sequência no mesmo fluxo, podendo ser repetidos enquanto a mesa estiver aberta.
- Em UC-03, a consulta da cota (TN-04) pode ser feita tanto com a mesa aberta quanto fechada, desde que exista ao menos um item consumido.
- Em UC-05, o participante primeiro solicita a geração da cobrança Pix (TN-06) e em seguida envia o comprovante (TN-07); reenviar comprovante antes da confirmação executa novamente o passo P-03/P-04.

## Decisão

**Atividades:** [x] aprovar  [ ] rejeitar

**Comentário (opcional):** guardas de UC-05 (TN-06 e TN-07) detalhadas com P03 (cota maior que zero; cota zero fica dispensada de pagamento e comprovante)

## Observações

Rodada 01 de atividades gerada a partir de modelo/casos-de-uso.yaml aprovado na D-038.
