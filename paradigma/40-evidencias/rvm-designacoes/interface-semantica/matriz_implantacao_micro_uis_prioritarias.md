# Matriz de Implantação — Micro-UIs Prioritárias do Chat-Agente

## Objetivo

Reduzir o catálogo amplo de micro-UIs a uma sequência executável de implantação, priorizando valor operacional, segurança semântica e aderência ao sistema atual de permissões e visibilidade.

Este documento responde à pergunta prática: quais micro-UIs devem entrar primeiro, em que ordem, com qual contrato técnico e sob quais gates.

## Critérios de Priorização

Uma micro-UI sobe de prioridade quando maximiza simultaneamente:

1. frequência de uso
2. redução de carga cognitiva
3. segurança operacional com serviço já existente
4. clareza de permissão e visibilidade
5. baixo custo de implementação incremental

## Regra de Rollout

### Onda 1 — Ganho rápido com baixo risco

Micro-UIs que usam serviços já maduros, têm escopo pequeno e baixa ambiguidade.

### Onda 2 — Operação relevante com preview obrigatório

Micro-UIs com impacto maior ou múltiplos efeitos, mas ainda apoiadas em serviços existentes.

### Onda 3 — Fluxos que pedem endurecimento prévio

Micro-UIs cujo valor é alto, mas que ainda pedem refinamento transacional, diff de impacto ou nova intent estruturada.

## Contrato Padrão de Implementação

Cada micro-UI prioritária deve ser implementada com estes blocos.

- `intentId`: identificador tipado da intenção
- `discoveryGate`: condição para aparecer em chips, slash ou sugestões
- `visibilityGate`: condição para revelar entidades e campos
- `prepare`: dados mínimos coletados e fonte de pré-preenchimento
- `preview`: o que o usuário vê antes do commit
- `commit`: serviço de domínio responsável pela escrita
- `recovery`: forma de correção, desfazer ou continuação

## Onda 1 — Top 8 para Implementar Primeiro

## 1. Aprovar proposta de designação

Status atual: primeira versão implementada no chat-agente em 2026-04-17.

- `intentId`: `approve-designation`
- Valor: altíssimo
- Tipo: A
- Discovery gate: perfil com ação de aprovação
- Visibility gate: pode ver a semana e a parte em foco
- Prepare:
  - parte em foco
  - elderId do usuário autenticado
- Preview:
  - parte
  - semana
  - designado atual
  - mudança de status `PROPOSTA -> APROVADA`
- Commit:
  - `workbookService.approveProposal(partId, elderId)`
- Recovery:
  - rejeitar/cancelar depois
- Observação:
  - ótima candidata para ação pós-resposta e chip contextual

## 2. Rejeitar proposta de designação

Status atual: primeira versão two-phase implementada no chat-agente em 2026-04-17.

- `intentId`: `reject-designation`
- Valor: altíssimo
- Tipo: B
- Discovery gate: perfil com ação de aprovação/rejeição
- Visibility gate: parte visível no escopo do usuário
- Prepare:
  - parte em foco
  - motivo curto obrigatório
- Preview:
  - parte
  - designado atual
  - motivo informado
  - retorno para `PENDENTE`
- Commit:
  - `workbookService.rejectProposal(partId, reason)`
- Recovery:
  - nova designação sugerida na sequência
- Observação:
  - deve acoplar bem com fluxo de substituição sugerida

## 3. Reatribuir publicador da parte

- `intentId`: `reassign-part`
- Valor: altíssimo
- Tipo: B
- Discovery gate: `ASSIGN_PART`
- Visibility gate:
  - pode ver a parte
  - lista de candidatos filtrada por access level e permissão
- Prepare:
  - parte em foco
  - publicador atual
  - candidatos elegíveis sugeridos
- Preview:
  - antes/depois da designação
  - observação de elegibilidade
- Commit:
  - `unifiedActionService.executeDesignation(...)` via `ASSIGN_PART`
- Recovery:
  - `UNDO_LAST` ou reversão da designação
- Observação:
  - deve aproveitar ranking curto para reduzir digitação

## 4. Atualizar disponibilidade do publicador

Status atual: primeira micro-UI two-phase implementada no chat-agente em 2026-04-17.

- `intentId`: `update-availability`
- Valor: alto
- Tipo: B
- Discovery gate: `UPDATE_AVAILABILITY`
- Visibility gate: publicador e calendário permitidos ao perfil
- Prepare:
  - publicador em foco
  - datas sugeridas da conversa
  - calendário compacto quando necessário
- Preview:
  - datas a adicionar e total final de bloqueios
- Commit:
  - `UPDATE_AVAILABILITY` em `agentActionService`
- Recovery:
  - remover a data em micro-UI complementar
- Observação:
  - excelente caso para micro-UI pequena em duas fases

## 5. Editar ficha principal do publicador

Status atual: primeira micro-UI curta com preview de campos alterados implementada no chat-agente em 2026-04-17.

- `intentId`: `edit-publisher-core`
- Valor: alto
- Tipo: B
- Discovery gate: `UPDATE_PUBLISHER`
- Visibility gate:
  - publicador visível
  - campos sensíveis condicionados a `canSeeSensitiveData`
- Prepare:
  - ficha atual pré-preenchida
- Preview:
  - somente campos alterados
- Commit:
  - `api.updatePublisher(updatedPublisher)` via intent do agente
- Recovery:
  - nova edição
- Observação:
  - usar diff visual mínimo, não formulário longo completo
  - boundary de domínio agora também expõe preview determinístico de impacto para rename antes do commit

## 6. Revisar mensagem preparada de S-140

- `intentId`: `review-s140-message`
- Valor: alto
- Tipo: D
- Discovery gate: `SEND_S140`
- Visibility gate:
  - pode ver a semana
  - canal de envio só aparece se `canSendZap`
- Prepare:
  - conteúdo preparado
  - metadados da semana
- Preview:
  - mensagem completa editável
  - destino e canal
- Commit:
  - `communicationService.updateNotification(...)`
- Recovery:
  - reabrir draft
- Observação:
  - reduz dependência de modal grande para comunicação

## 7. Adicionar ou editar item da fila de necessidades locais

- `intentId`: `manage-local-needs-item`
- Valor: alto
- Tipo: B
- Discovery gate: `MANAGE_LOCAL_NEEDS`
- Visibility gate: lista de responsáveis elegíveis conforme perfil e domínio
- Prepare:
  - tema
  - responsável
  - semana alvo opcional
- Preview:
  - posição na fila ou atualização do item
- Commit:
  - `localNeedsService.addToQueue(...)`
  - `localNeedsService.update(...)`
- Recovery:
  - reorder ou remove
- Observação:
  - a versão `update` ainda pede nova intent estruturada

## 8. Marcar parte como concluída

Status atual: micro-UI de conclusão e desfazer conclusão implementada no chat-agente em 2026-04-17.

- `intentId`: `complete-part`
- Valor: alto
- Tipo: B
- Discovery gate: papel operacional de conclusão
- Visibility gate: parte aprovada/designada dentro do escopo visível
- Prepare:
  - parte em foco
  - confirmação curta
- Preview:
  - status atual e futuro
- Commit:
  - `workbookService.markAsCompleted([partId])`
- Recovery:
  - `workbookService.undoCompletion(partId)`
- Observação:
  - gera conexão forte entre chat e histórico real
  - a recuperação já está exposta como ação tipada própria no runtime

## Onda 2 — Próximas 8 com Preview Forte

## 9. Criar publicador mínimo

- `intentId`: `create-publisher-min`
- Valor: alto
- Tipo: B
- Commit:
  - `api.createPublisher(...)`
- Requisito adicional:
  - gate explícito de cadastro

## 10. Excluir publicador

- `intentId`: `delete-publisher`
- Valor: alto
- Tipo: C
- Commit:
  - `api.deletePublisher(...)`
- Requisito adicional:
  - preview de impactos em designações futuras e referências ativas

## 11. Limpar semana

- `intentId`: `clear-week-assignments`
- Valor: alto
- Tipo: C
- Commit:
  - `CLEAR_WEEK`
- Requisito adicional:
  - prévia com contagem de designações removidas

## 12. Cancelar semana inteira

- `intentId`: `cancel-week`
- Valor: alto
- Tipo: C
- Commit:
  - `MANAGE_WORKBOOK_WEEK/CANCEL_WEEK`
- Requisito adicional:
  - resumo de partes impactadas

## 13. Criar evento pendente

- `intentId`: `create-pending-special-event`
- Valor: alto
- Tipo: C
- Commit:
  - `createEvent(...)` + `markPendingImpact(...)`
- Requisito adicional:
  - preview visual das partes marcadas

## 14. Editar evento existente

- `intentId`: `edit-special-event`
- Valor: alto
- Tipo: C
- Commit:
  - `specialEventService.updateEvent(...)`
- Requisito adicional:
  - diff entre estado atual e novo impacto

## 15. Aplicar evento pendente

- `intentId`: `apply-special-event`
- Valor: médio-alto
- Tipo: C
- Commit:
  - `specialEventService.applyEventImpact(...)`
- Requisito adicional:
  - impacto resumido por categoria: cancelar, reduzir, criar, marcar

## 16. Reimportar semana

- `intentId`: `reimport-week`
- Valor: alto
- Tipo: C
- Commit:
  - `MANAGE_WORKBOOK_WEEK/REIMPORT`
- Requisito adicional:
  - preview obrigatória do que será descartado

## Onda 3 — Dependem de Endurecimento Prévio

## 17. Renomear publicador com propagação transacional

Status atual: boundary inicial criado em 2026-04-17 via `publisherMutationService.savePublisherWithPropagation(...)`, mas ainda sem preview determinístico e sem atomicidade composta forte.

- Gap:
  - hoje a atualização do cadastro e a propagação para partes são separadas
- Antes de expor:
  - consolidar operação em um boundary mais atômico

## 18. Resolver duplicidade de publicadores

- Gap:
  - ainda falta serviço de domínio que compare, consolide e preserve referências

## 19. Diff entre apostila atual e reimportação

- Gap:
  - ainda falta comparação semântica entre estado atual e fonte jw.org

## 20. Preview comparativo de engine config

- Gap:
  - ainda falta simulação local que compare ranking antes/depois da mudança

## Mapa de Gates por Perfil

## Todos com acesso à aba Agente

- contexto ativo
- navegação de semana
- retomada de tópico
- consultas e analytics compatíveis com o escopo visível

## Perfis com mutação operacional de apostila

- reatribuir parte
- limpar designação
- concluir parte
- editar parte
- gerir semana

## Perfis com aprovação

- aprovar proposta
- rejeitar proposta
- cancelar designação validada

## Perfis com gestão de cadastro

- criar publicador
- editar ficha principal
- alterar disponibilidade
- excluir publicador

## Perfis com comunicação

- preparar S-140
- preparar S-89
- revisar drafts
- notificar recusa

## Perfis com controle avançado

- eventos especiais
- regras do motor
- importação e reimportação

## Sequência Recomendada de Implementação

1. aprovar proposta
2. rejeitar proposta
3. reatribuir parte
4. atualizar disponibilidade
5. editar ficha principal do publicador
6. revisar mensagem preparada de S-140
7. adicionar/editar item da fila de necessidades locais
8. marcar parte como concluída
9. criar publicador mínimo
10. limpar semana

## Resultado Esperado

Se esta matriz for seguida, a Sprint 4 deixa de ser uma ideia genérica de “micro-UIs por intenção” e vira um pipeline claro de implantação, começando por fluxos em que o chat-agente já consegue oferecer ganho real de ergonomia sem comprometer a segurança operacional.