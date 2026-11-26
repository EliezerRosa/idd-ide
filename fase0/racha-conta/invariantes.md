# Invariantes — racha-conta

> Uma invariante por linha, no formato `- **INV-001** [tipo] <enunciado testável>`.
> Tipos: integridade, unicidade, temporal, autorização, cálculo, estado.
> O enunciado precisa de um marcador testável (sempre, nunca, deve, não pode, no máximo, no mínimo, exatamente, igual a, =, ≤, ≥, <, >).
> Exemplo: `- **INV-001** [integridade] Todo [[Pagamento]] sempre pertence a exatamente uma [[Conta]].`
- **INV-001** [cálculo] A soma das cotas de todos os participantes de uma [[Mesa]] deve ser exatamente igual à soma dos preços dos [[ItemConsumido]] mais a [[TaxaServico]], com diferença de zero centavos.
- **INV-002** [integridade] A [[Cota]] de um [[Participante]] nunca inclui valor de um [[ItemConsumido]] que esse [[Participante]] não consumiu.
- **INV-003** [integridade] Todo [[ItemConsumido]] deve ter no mínimo um [[Participante]] entre os consumidores.
- **INV-004** [integridade] Todo [[Participante]] associado a um [[ItemConsumido]] deve pertencer à mesma [[Mesa]] do [[ItemConsumido]].
- **INV-005** [cálculo] Toda [[Cota]] deve ser um número inteiro de centavos, com valor ≥ 0.
