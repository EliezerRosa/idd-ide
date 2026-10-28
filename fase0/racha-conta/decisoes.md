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
- [x] D-026 · L2/MER02/P01 · bloqueante · Se dois participantes da mesma mesa tiverem o mesmo nome, como fica a ordem alfabética do rodízio do centavo? → O nome é único na mesa: o aplicativo não aceita dois participantes com o mesmo nome. (2026-10-27)
- [x] D-027 · L2/MER02/P02 · bloqueante · Um participante pode enviar mais de um comprovante para a mesma cota? → Não: um único pagamento por participante; um comprovante novo substitui o anterior até a confirmação. (2026-10-27)
- [x] D-028 · L2/MER02/P03 · não-bloqueante · O pagamento deve guardar o valor pago ou vale sempre a cota calculada no momento da confirmação? → Guardar o valor pago em centavos no pagamento. (2026-10-27)
- [x] D-029 · L2/MER02/modelo · modelo aprovado (editado pelo autor): modelo/dominio.mmd — acrescentado valor_centavos ao Pagamento conforme a P03 (2026-10-27)
- [x] D-030 · L2/UC01/P01 · bloqueante · Quem inclui os participantes e registra os itens consumidos na mesa? → Só o responsável da mesa inclui participantes e registra itens. (2026-10-27)
- [x] D-031 · L2/UC01/P02 · bloqueante · Depois que um participante envia o comprovante de pagamento, a mesa ainda aceita itens novos ou alterações nos consumos? → Não: o responsável fecha a mesa antes dos pagamentos, e a mesa fechada não aceita mudanças. (2026-10-27)
- [x] D-032 · L2/UC01/P03 · bloqueante · Como a taxa de serviço é dividida entre os participantes, e quem recebe o centavo quando a divisão não é exata? → Proporcional ao consumo de cada um; o centavo da taxa segue o mesmo rodízio alfabético dos itens. (2026-10-27)
- [x] D-033 · L2/UC01/artefato · casos de uso rejeitado — refazer incorporando as respostas: fechamento da mesa pelo responsável antes dos pagamentos (P02) e regra da taxa proporcional com centavo em rodízio nas pós-condições do cálculo (P03) (2026-10-27)
- [x] D-034 · L2/MER/modelo · modelo alterado em consequência da D-031: Mesa.fechada_em (timestamp opcional, vazio enquanto a mesa está aberta) acrescentado a modelo/dominio.mmd (2026-10-27)
