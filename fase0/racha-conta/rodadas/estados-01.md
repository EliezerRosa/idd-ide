# Loop 2 · Estados · rodada 01 — racha-conta

> Revise a proposta. Você pode editar o bloco yaml abaixo antes de aprovar.
> Responda as perguntas, marque `[x]` em aprovar ou rejeitar e rode `idd fase0 loop2 racha-conta`.
> Aprovar grava modelo/estados.yaml (Confirm-Once da etapa). Ao rejeitar, diga o porquê no comentário.

## Perguntas

### P01 · não-bloqueante

No código legado (legado-domain_rules.ts e legado-schema.sql), Mesa tinha o status LIQUIDADA quando todos pagavam. Deseja manter apenas Aberta e Fechada em Mesa (com a quitação total derivada dos pagamentos confirmados)?

Por quê: Define se a quitação completa da mesa exige um terceiro estado persistido em Mesa ou se é uma propriedade derivada das cotas e pagamentos confirmados.

1. Manter apenas Aberta e Fechada (quitação total derivada dos pagamentos confirmados)
2. Incluir um terceiro estado Liquidada em Mesa quando todas as cotas maiores que zero forem confirmadas

**Resposta:** 1

### P02 · não-bloqueante

Depois que o responsável confirma o pagamento de um participante (TN-08, estado Confirmado), a confirmação é definitiva ou pode ser desfeita?

Por quê: Define se Confirmado é estado terminal na máquina de estados de Pagamento ou se existe transição de retorno para Pendente.

1. A confirmação do pagamento é definitiva (Confirmado é estado terminal)
2. O responsável pode desfazer a confirmação, retornando o pagamento para Pendente

**Resposta:** 1

## Estados propostos

```yaml
maquinas:
  - classe: Mesa
    estados:
      - nome: Aberta
        descricao: "[[Mesa]] criada com [[ChavePix]] e [[TaxaServico]] (fechada_em vazio); aceita inclusão de [[Participante]]s e registro de [[ItemConsumido]]s."
      - nome: Fechada
        descricao: "[[Mesa]] encerrada definitivamente para lançamentos (fechada_em preenchido); habilita a cobrança Pix e o envio de comprovantes das [[Cota]]s."
    transicoes:
      - de: "[*]"
        para: Aberta
        transacao: TN-01
        guarda: "O [[ResponsavelMesa]] informou a própria [[ChavePix]] e o próprio nome."
        efeito: "Cria a [[Mesa]] aberta (fechada_em vazio) e registra o [[ResponsavelMesa]] como [[Participante]]."
      - de: Aberta
        para: Fechada
        transacao: TN-05
        guarda: "A [[Mesa]] não está fechada."
        efeito: "Preenche Mesa.fechada_em e encerra definitivamente os lançamentos de consumo."
  - classe: Pagamento
    estados:
      - nome: Pendente
        descricao: "Comprovante enviado pelo [[Participante]] com o valor da [[Cota]] em centavos (confirmado_em vazio), aguardando conferência do [[ResponsavelMesa]]."
      - nome: Confirmado
        descricao: "Pagamento conferido e confirmado pelo [[ResponsavelMesa]] (confirmado_em preenchido)."
    transicoes:
      - de: "[*]"
        para: Pendente
        transacao: TN-07
        guarda: "A [[Mesa]] está fechada, o [[Participante]] não é o [[ResponsavelMesa]], a [[Cota]] do [[Participante]] é maior que zero e ainda não existe pagamento para o [[Participante]]."
        efeito: "Cria o Pagamento com comprovante_url, valor_centavos e enviado_em (confirmado_em vazio)."
      - de: Pendente
        para: Pendente
        transacao: TN-07
        guarda: "A [[Mesa]] está fechada, o [[Participante]] não é o [[ResponsavelMesa]], a [[Cota]] do [[Participante]] é maior que zero e o pagamento ainda não foi confirmado."
        efeito: "Substitui comprovante_url e enviado_em do pagamento pendente (D-027)."
      - de: Pendente
        para: Confirmado
        transacao: TN-08
        guarda: "O pagamento tem comprovante e ainda não foi confirmado."
        efeito: "Preenche Pagamento.confirmado_em."
```

### Diagnóstico (calculado pelo IDD, não pela IA)

- ✓ (n) modelo/estados.yaml aprovado, válido e cobrindo toda classe com atributo alterado — 2 máquina(s), 4 estado(s)
- ✓ (o) toda transição é disparada por transação que altera a classe, sem mutação sem transição — 5 transição(ões) coerente(s)
- ✓ (p) toda máquina parte de [*] e todos os seus estados são alcançáveis — todos os estados alcançáveis a partir de [*]
- ✓ (q) classes e transações citadas existem no MER e em modelo/casos-de-uso.yaml — todas existem

### Suposições do SHADA (confirme pelas perguntas)

- A quitação total da Mesa é uma consulta derivada (todos os participantes exceto o responsável com cota > 0 possuem Pagamento em estado Confirmado), não exigindo novo atributo nem nova transação em Mesa.
- O estado Confirmado de Pagamento é terminal, simétrico ao fechamento definitivo da Mesa (D-037).

## Decisão

**Estados:** [x] aprovar  [ ] rejeitar

**Comentário (opcional):**

## Observações

Mesa e Pagamento são as únicas classes de modelo/dominio.mmd com atributos alterados após a criação (Mesa.fechada_em em TN-05 e Pagamento.confirmado_em em TN-08).
