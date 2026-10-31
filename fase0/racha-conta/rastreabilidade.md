# Matriz de Rastreabilidade — racha-conta

> Gerada automaticamente pelo IDD a partir dos artefatos aprovados da Fase 0 (Loops 1 e 2).

## 1. Intenções → Casos de Uso → Transações → Métodos → Contratos

| Intenção | Caso(s) de Uso | Transação(ões) | Método(s) Circunscrito(s) | Contrato(s) v2 |
| --- | --- | --- | --- | --- |
| **INT-001** | UC-02 (Registrar participantes e consumo), UC-03 (Consultar a própria cota) | TN-02, TN-03, TN-04 | `Mesa.incluirParticipante`, `Mesa.registrarItemConsumido`, `Mesa.calcularCotas` | `contratos/Mesa.incluirParticipante.intent.yaml`, `contratos/Mesa.registrarItemConsumido.intent.yaml`, `contratos/Mesa.calcularCotas.intent.yaml` |
| **INT-002** | UC-03 (Consultar a própria cota) | TN-04 | `Mesa.calcularCotas` | `contratos/Mesa.calcularCotas.intent.yaml` |
| **INT-003** | UC-03 (Consultar a própria cota) | TN-04 | `Mesa.calcularCotas` | `contratos/Mesa.calcularCotas.intent.yaml` |
| **INT-004** | UC-05 (Pagar a própria cota) | TN-06, TN-07 | `Mesa.gerarCobrancaPix`, `Pagamento.enviarComprovante` | `contratos/Mesa.gerarCobrancaPix.intent.yaml`, `contratos/Pagamento.enviarComprovante.intent.yaml` |
| **INT-005** | UC-01 (Criar mesa) | TN-01 | `Mesa.criar` | `contratos/Mesa.criar.intent.yaml` |
| **INT-006** | UC-04 (Fechar mesa) | TN-05 | `Mesa.fechar` | `contratos/Mesa.fechar.intent.yaml` |
| **INT-007** | UC-06 (Confirmar pagamento) | TN-08 | `Pagamento.confirmar` | `contratos/Pagamento.confirmar.intent.yaml` |

## 2. Invariantes → Transações → Métodos → Contratos

| Invariante | Transação(ões) | Método(s) Circunscrito(s) | Contrato(s) v2 |
| --- | --- | --- | --- |
| **INV-001** | TN-04 | `Mesa.calcularCotas` | `contratos/Mesa.calcularCotas.intent.yaml` |
| **INV-002** | TN-04 | `Mesa.calcularCotas` | `contratos/Mesa.calcularCotas.intent.yaml` |
| **INV-003** | TN-03 | `Mesa.registrarItemConsumido` | `contratos/Mesa.registrarItemConsumido.intent.yaml` |
| **INV-004** | TN-03 | `Mesa.registrarItemConsumido` | `contratos/Mesa.registrarItemConsumido.intent.yaml` |
| **INV-005** | TN-04, TN-06 | `Mesa.calcularCotas`, `Mesa.gerarCobrancaPix` | `contratos/Mesa.calcularCotas.intent.yaml`, `contratos/Mesa.gerarCobrancaPix.intent.yaml` |

## 3. Transações de Negócio → Estados → Métodos → Mutação de Estado

| Transação | Caso de Uso | Transições de Estado | Método(s) | `allowed_fields` | `read_only_fields` |
| --- | --- | --- | --- | --- | --- |
| **TN-01** (Criar mesa com chave Pix) | UC-01 | Mesa: [*] → Aberta | `Mesa.criar` | `Mesa`, `Participante` | — |
| **TN-02** (Incluir participante) | UC-02 | — (sem mudança de estado) | `Mesa.incluirParticipante` | `Participante` | `Mesa.fechada_em`, `Participante.nome` |
| **TN-03** (Registrar item com os consumidores) | UC-02 | — (sem mudança de estado) | `Mesa.registrarItemConsumido` | `ItemConsumido`, `Consumo` | `Mesa.fechada_em`, `Participante.mesa_id`, `ItemConsumido.ordem` |
| **TN-04** (Calcular as cotas da mesa) | UC-03 | — (sem mudança de estado) | `Mesa.calcularCotas` | — | `ItemConsumido.preco_centavos`, `ItemConsumido.ordem`, `Consumo`, `Participante.nome`, `Mesa.taxa_servico_percentual` |
| **TN-05** (Fechar a mesa para pagamento) | UC-04 | Mesa: Aberta → Fechada | `Mesa.fechar` | `Mesa.fechada_em` | — |
| **TN-06** (Gerar a cobrança Pix da cota) | UC-05 | — (sem mudança de estado) | `Mesa.gerarCobrancaPix` | — | `Mesa.fechada_em`, `Mesa.chave_pix` |
| **TN-07** (Enviar comprovante) | UC-05 | Pagamento: [*] → Pendente; Pagamento: Pendente → Pendente | `Pagamento.enviarComprovante` | `Pagamento` | `Mesa.fechada_em` |
| **TN-08** (Confirmar o pagamento de um participante) | UC-06 | Pagamento: Pendente → Confirmado | `Pagamento.confirmar` | `Pagamento.confirmado_em` | `Pagamento.comprovante_url` |
