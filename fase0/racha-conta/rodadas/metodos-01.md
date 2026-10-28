# Loop 2 · Métodos · rodada 01 — racha-conta

> Revise a proposta. Você pode editar o bloco yaml abaixo antes de aprovar.
> Responda as perguntas, marque `[x]` em aprovar ou rejeitar e rode `idd fase0 loop2 racha-conta`.
> Aprovar grava modelo/metodos.yaml (Confirm-Once da etapa). Ao rejeitar, diga o porquê no comentário.

## Perguntas

### P01 · não-bloqueante

As transações TN-02 (incluir participante) e TN-03 (registrar item consumido) foram circunscritas ao agregado Mesa (Mesa.incluirParticipante e Mesa.registrarItemConsumido), pois exigem verificar Mesa.fechada_em, a unicidade de nome na mesa e a próxima ordem de item. Deseja manter esses métodos circunscritos a Mesa?

Por quê: Define se a criação de Participante e ItemConsumido é responsabilidade do agregado raiz Mesa ou de métodos nas próprias classes filhas.

1. Manter em Mesa (agregado raiz garante as invariantes e pré-condições da mesa)
2. Mover para métodos em Participante e ItemConsumido

**Resposta:** 1

### P02 · não-bloqueante

As transações TN-07 (enviar comprovante) e TN-08 (confirmar pagamento) foram circunscritas à classe Pagamento (Pagamento.enviarComprovante e Pagamento.confirmar), acompanhando a máquina de estados de Pagamento. Deseja manter esses dois métodos em Pagamento?

Por quê: Define a classe-alvo (target_class) dos contratos .intent.yaml v2 do ciclo de pagamento.

1. Manter em Pagamento (Pagamento.enviarComprovante e Pagamento.confirmar)
2. Mover para o agregado Mesa (Mesa.enviarComprovante e Mesa.confirmarPagamento)

**Resposta:** 1

## Métodos propostos

```yaml
metodos:
  - classe: Mesa
    metodo: criar
    visibilidade: public
    intencao: "Criar uma [[Mesa]] aberta com a [[ChavePix]] e a [[TaxaServico]] do [[ResponsavelMesa]], registrando-o como [[Participante]]."
    transacoes: [TN-01]
    invariantes: []
    allowed_fields: [Mesa, Participante]
    read_only_fields: []
    restricoes:
      - "O [[ResponsavelMesa]] informou a própria [[ChavePix]] e o próprio nome."
    aceitacao:
      - dado: "O [[ResponsavelMesa]] informou o próprio nome e a [[ChavePix]]."
        quando: "Mesa.criar é executado."
        entao: "A [[Mesa]] aberta é criada com a [[TaxaServico]] informada (ou 10% por padrão) e o [[ResponsavelMesa]] é registrado como [[Participante]]."
  - classe: Mesa
    metodo: incluirParticipante
    visibilidade: public
    intencao: "Incluir um novo [[Participante]] com nome único em uma [[Mesa]] aberta."
    transacoes: [TN-02]
    invariantes: []
    allowed_fields: [Participante]
    read_only_fields: [Mesa.fechada_em, Participante.nome]
    restricoes:
      - "A [[Mesa]] não está fechada."
      - "Nenhum [[Participante]] da [[Mesa]] tem o mesmo nome (D-026)."
    aceitacao:
      - dado: "A [[Mesa]] está aberta e o nome informado ainda não pertence a outro [[Participante]] da [[Mesa]]."
        quando: "Mesa.incluirParticipante é executado pelo [[ResponsavelMesa]]."
        entao: "O novo [[Participante]] passa a pertencer exatamente à [[Mesa]]."
  - classe: Mesa
    metodo: registrarItemConsumido
    visibilidade: public
    intencao: "Registrar um [[ItemConsumido]] na próxima ordem da [[Mesa]] aberta e associar os [[Participante]]s que o consumiram."
    transacoes: [TN-03]
    invariantes: [INV-003, INV-004]
    allowed_fields: [ItemConsumido, Consumo]
    read_only_fields: [Mesa.fechada_em, Participante.mesa_id, ItemConsumido.ordem]
    restricoes:
      - "A [[Mesa]] não está fechada."
      - "O preço do [[ItemConsumido]] é um número inteiro de centavos."
    aceitacao:
      - dado: "A [[Mesa]] está aberta e há ao menos um [[Participante]] da mesma [[Mesa]] entre os consumidores informados."
        quando: "Mesa.registrarItemConsumido é executado pelo [[ResponsavelMesa]]."
        entao: "O [[ItemConsumido]] recebe a próxima ordem da [[Mesa]] e é criado um registro em Consumo para cada consumidor."
  - classe: Mesa
    metodo: calcularCotas
    visibilidade: public
    intencao: "Calcular a [[Cota]] em centavos inteiros de cada [[Participante]] da [[Mesa]] com rateio proporcional da [[TaxaServico]] e rodízio alfabético contínuo dos centavos indivisíveis."
    transacoes: [TN-04]
    invariantes: [INV-001, INV-005]
    allowed_fields: []
    read_only_fields: [ItemConsumido.preco_centavos, ItemConsumido.ordem, Consumo, Participante.nome, Mesa.taxa_servico_percentual]
    restricoes:
      - "A [[Mesa]] tem ao menos um [[ItemConsumido]]."
      - "O total da [[TaxaServico]] usa arredondamento comercial e o rodízio alfabético da taxa continua de onde o rodízio dos itens parou (D-035, D-036)."
    aceitacao:
      - dado: "A [[Mesa]] possui [[ItemConsumido]]s registrados e [[Participante]]s associados."
        quando: "Mesa.calcularCotas é executado."
        entao: "Retorna a [[Cota]] inteira >= 0 de cada [[Participante]] cuja soma iguala exatamente a soma dos [[ItemConsumido]]s mais a [[TaxaServico]]."
  - classe: Mesa
    metodo: fechar
    visibilidade: public
    intencao: "Encerrar definitivamente os lançamentos da [[Mesa]], registrando a data de fechamento e habilitando o pagamento das [[Cota]]s."
    transacoes: [TN-05]
    invariantes: []
    allowed_fields: [Mesa.fechada_em]
    read_only_fields: []
    restricoes:
      - "A [[Mesa]] não está fechada (o fechamento é definitivo conforme D-037)."
    aceitacao:
      - dado: "A [[Mesa]] está aberta (fechada_em vazio)."
        quando: "Mesa.fechar é executado pelo [[ResponsavelMesa]]."
        entao: "Mesa.fechada_em é preenchido e a [[Mesa]] passa definitivamente para o estado Fechada."
  - classe: Mesa
    metodo: gerarCobrancaPix
    visibilidade: public
    intencao: "Gerar o código Pix Copia e Cola e o QR Code da [[Cota]] de um [[Participante]] para a [[ChavePix]] da [[Mesa]] fechada."
    transacoes: [TN-06]
    invariantes: [INV-005]
    allowed_fields: []
    read_only_fields: [Mesa.fechada_em, Mesa.chave_pix]
    restricoes:
      - "A [[Mesa]] está fechada."
      - "O [[Participante]] não é o [[ResponsavelMesa]]."
      - "A [[Cota]] do [[Participante]] é maior que zero (D-041)."
    aceitacao:
      - dado: "A [[Mesa]] está fechada e o [[Participante]] (distinto do [[ResponsavelMesa]]) possui [[Cota]] maior que zero."
        quando: "Mesa.gerarCobrancaPix é executado."
        entao: "Retorna o Pix Copia e Cola e o QR Code para a [[ChavePix]] da [[Mesa]] com o valor da [[Cota]] do [[Participante]]."
  - classe: Pagamento
    metodo: enviarComprovante
    visibilidade: public
    intencao: "Registrar ou substituir o comprovante de pagamento da [[Cota]] de um [[Participante]] antes da confirmação pelo [[ResponsavelMesa]]."
    transacoes: [TN-07]
    invariantes: []
    allowed_fields: [Pagamento]
    read_only_fields: [Mesa.fechada_em]
    restricoes:
      - "A [[Mesa]] está fechada, o [[Participante]] não é o [[ResponsavelMesa]], a [[Cota]] é maior que zero e nenhum pagamento do [[Participante]] está confirmado (D-027, D-041)."
    aceitacao:
      - dado: "A [[Mesa]] está fechada, o [[Participante]] possui [[Cota]] > 0 e não tem pagamento confirmado."
        quando: "Pagamento.enviarComprovante é executado pelo [[Participante]]."
        entao: "O Pagamento do [[Participante]] fica em estado Pendente com comprovante_url, valor_centavos e enviado_em registrados."
  - classe: Pagamento
    metodo: confirmar
    visibilidade: public
    intencao: "Confirmar definitivamente o recebimento do pagamento da [[Cota]] de um [[Participante]] a partir do comprovante enviado."
    transacoes: [TN-08]
    invariantes: []
    allowed_fields: [Pagamento.confirmado_em]
    read_only_fields: [Pagamento.comprovante_url]
    restricoes:
      - "O pagamento tem comprovante e ainda não foi confirmado."
    aceitacao:
      - dado: "O Pagamento está em estado Pendente com comprovante_url preenchido."
        quando: "Pagamento.confirmar é executado pelo [[ResponsavelMesa]]."
        entao: "Pagamento.confirmado_em é preenchido e o Pagamento passa definitivamente para o estado Confirmado."
```

### Diagnóstico (calculado pelo IDD, não pela IA)

- ✓ (r) modelo/metodos.yaml aprovado, válido e com métodos circunscritos únicos (Classe.metodo) — 8 método(s) circunscrito(s)
- ✓ (s) toda transação de negócio mapeia para ao menos 1 método e toda invariante da transação está no método — 8 transação(ões) coberta(s)
- ✓ (t) coerência contrato × modelo: todo atributo alterado/lido pela transação está em allowed_fields/read_only_fields dos seus métodos (sem sobreposição) — allowed_fields e read_only_fields coerentes com as transações
- ✓ (u) classes, atributos, transações e invariantes citados existem e todo método gera um contrato .intent.yaml v2 válido em @idd/core — 8 contrato(s) .intent.yaml v2 válido(s)

### Suposições do SHADA (confirme pelas perguntas)

- O agregado raiz Mesa circunscreve as operações de ciclo da mesa, inclusão de participantes/itens, cálculo das cotas e geração da cobrança Pix (TN-01 a TN-06).
- A entidade Pagamento circunscreve o envio/substituição de comprovante e a confirmação pelo responsável (TN-07 e TN-08).

## Decisão

**Métodos:** [x] aprovar  [ ] rejeitar

**Comentário (opcional):**

## Observações

Cada uma das 8 transações de negócio (TN-01 a TN-08) mapeia 1:1 para um método circunscrito validado pelo parser de contratos v2 de @idd/core.
