# Catálogo de Micro-UIs do Chat-Agente

## Objetivo

Projetar o conjunto mais completo possível de micro-UIs coerentes com a proposta do RVM Designações para a aba Agente, incluindo variantes granulares, fluxos em duas fases e superfícies governadas por permissão e visibilidade.

Este documento não descreve apenas o que seria elegante. Ele descreve o que faz sentido para o domínio, para a segurança operacional e para a arquitetura já existente.

## Premissas Invariáveis

1. As micro-UIs novas vivem no chat-agente. Os modais manuais legados permanecem intactos.
2. A interface nunca deve pedir dados que o sistema já conhece.
3. A segurança nasce do cruzamento entre permissão de ação, escopo de dados visível e risco operacional.
4. Toda escrita deve delegar para serviços de domínio existentes ou para novos serviços equivalentes, nunca para writes ad-hoc disparados pelo componente visual.
5. Toda ação destrutiva, em lote ou com efeito cascata deve passar por prévia de impacto antes do commit.

## Modelo de Segurança Semântica

Cada micro-UI deve ser governada por quatro filtros.

### 1. Filtro de Descoberta

- Se o perfil não pode executar a ação, a micro-UI não aparece em chips, slash commands nem sugestões contextuais.
- O default deve ser ocultar, não apenas desabilitar.

### 2. Filtro de Visibilidade de Dados

- O conteúdo exibido respeita `dataAccessLevel`.
- Campos sensíveis só aparecem quando `canSeeSensitiveData` for verdadeiro.
- O escopo de entidades sugeridas deve respeitar filtros de publicadores já resolvidos pelo sistema de permissões.

### 3. Filtro de Execução

- A abertura da micro-UI não autoriza a execução.
- O commit final revalida `canAgentAction(...)` no instante da ação.

### 4. Filtro de Canal

- Superfícies de comunicação só aparecem se o perfil puder efetivamente operar o canal, por exemplo `canSendZap`.

## Tipos de Transação de Micro-UI

## Tipo A — Execução Direta Confirmada

Para mutações simples, de uma linha, baixo risco e reversão fácil.

Fases:

1. coletar só o campo faltante
2. confirmar em texto curto
3. executar

## Tipo B — Two-Phase Transaction

Para alterações com impacto relevante, mas ainda focalizadas.

Fases:

1. preparação: coletar parâmetros mínimos e montar prévia
2. commit: confirmar a prévia e delegar a operação ao serviço de domínio

## Tipo C — Two-Phase com Impact Preview

Para exclusões, reimportações, cancelamentos em lote e eventos com efeito em múltiplas partes.

Fases:

1. preparação: identificar escopo e calcular impacto
2. commit: exigir confirmação explícita com resumo do efeito

## Tipo D — Staged Communication Flow

Para comunicações que primeiro geram artefato, depois permitem revisão e só então envio.

Fases:

1. preparação do conteúdo
2. revisão/edição
3. despacho

## Estados de Prontidão

- `Pronta agora`: já existe serviço adequado e risco operacional controlável.
- `Quase pronta`: o serviço existe, mas falta intent estruturada no agente.
- `Precisa endurecimento`: existe lógica funcional, mas a operação ainda é multi-step demais para expor sem reforço transacional ou preview robusto.

## Catálogo Completo

## 1. Micro-UIs de Contexto e Navegação

Estas não são CRUD estrito, mas fazem sentido no paradigma do RVM porque reduzem atrito e orientam o usuário antes da mutação.

### 1.1 Contexto ativo da conversa

- Intenção: mostrar semana, entidade em foco, fluxo em andamento, risco da próxima ação.
- Tipo: A.
- Visibilidade: todos os perfis com acesso à aba Agente.
- Prontidão: pronta agora.

### 1.2 Seletor rápido de semana em foco

- Intenção: trocar a semana ativa sem abrir tela maior.
- Tipo: A.
- Gate: `NAVIGATE_WEEK`.
- Prontidão: pronta agora.

### 1.3 Retomada de tópico anterior

- Intenção: recuperar a intenção anterior quando há mudança de assunto.
- Tipo: A.
- Visibilidade: todos os perfis.
- Prontidão: quase pronta.

### 1.4 Desfazer última operação

- Intenção: reverter a última mutação capturada no stack.
- Tipo: A.
- Gate: `UNDO_LAST`.
- Prontidão: pronta agora.

## 2. Micro-UIs de Publicadores

Entidade base: `Publisher`.

### 2.1 Criar publicador mínimo

- Intenção: cadastrar rapidamente um novo publicador com os campos mínimos obrigatórios.
- Dados mínimos: nome, gênero, condição, privilégios iniciais essenciais.
- Tipo: B.
- Gate: novo intent apoiado por `api.createPublisher(...)`.
- Visibilidade: somente perfis que hoje podem operar cadastro de publicadores.
- Prontidão: quase pronta.

### 2.2 Editar ficha principal do publicador

- Intenção: atualizar nome, condição, função congregacional, telefone e flags relevantes.
- Tipo: B.
- Gate: `UPDATE_PUBLISHER`.
- Prontidão: pronta agora.

### 2.3 Renomear publicador com prévia de propagação

- Intenção: alterar o nome e mostrar quantas partes históricas ou futuras serão afetadas.
- Tipo: C.
- Gate: `UPDATE_PUBLISHER` mais operação de propagação.
- Serviço atual: atualização em `api.updatePublisher(...)` e propagação separada no app.
- Prontidão: precisa endurecimento.

### 2.4 Marcar publicador como inapto

- Intenção: registrar indisponibilidade qualitativa para partes.
- Tipo: A.
- Gate: `UPDATE_PUBLISHER`.
- Prontidão: pronta agora.

### 2.5 Remover marca de inapto

- Intenção: restabelecer elegibilidade.
- Tipo: A.
- Gate: `UPDATE_PUBLISHER`.
- Prontidão: pronta agora.

### 2.6 Atualizar disponibilidade por exceções de data

- Intenção: bloquear ou liberar datas específicas.
- Tipo: B.
- Gate: `UPDATE_AVAILABILITY`.
- Prontidão: pronta agora.

### 2.7 Editor granular de disponibilidade

- Intenção: visualizar calendário compacto e adicionar/remover exceções individualmente.
- Tipo: B.
- Gate: `UPDATE_AVAILABILITY`.
- Prontidão: quase pronta.

### 2.8 Editar aliases do publicador

- Intenção: melhorar resolução semântica de nomes no agente.
- Tipo: B.
- Gate: `UPDATE_PUBLISHER`.
- Prontidão: pronta agora.

### 2.9 Ajustar privilégios por tipo de parte

- Intenção: alterar capacidades como oração, presidência, discursos, EBC.
- Tipo: B.
- Gate: `UPDATE_PUBLISHER`.
- Prontidão: pronta agora.

### 2.10 Ajustar filtros familiares e pareamento

- Intenção: atualizar `parentIds`, helper-only e pairing rules.
- Tipo: B.
- Gate: `UPDATE_PUBLISHER`.
- Prontidão: pronta agora.

### 2.11 Excluir publicador

- Intenção: remover registro de cadastro.
- Tipo: C.
- Gate: novo intent sobre `api.deletePublisher(...)`.
- Exigência: prévia de impactos em designações futuras e vínculos ativos.
- Prontidão: quase pronta.

### 2.12 Resolver duplicidade de cadastro

- Intenção: comparar dois publicadores quase idênticos e escolher destino.
- Tipo: C.
- Gate: operação nova de domínio.
- Prontidão: precisa endurecimento.

## 3. Micro-UIs de Partes da Apostila

Entidade base: `WorkbookPart`.

### 3.1 Inspecionar parte

- Intenção: mostrar dados operacionais da parte em cartão compacto.
- Tipo: A.
- Gate: `MANAGE_WORKBOOK_PART` ou leitura equivalente.
- Prontidão: pronta agora.

### 3.2 Editar metadados da parte

- Intenção: atualizar tipo, título, descrição, duração, designado bruto e status.
- Tipo: B.
- Gate: `MANAGE_WORKBOOK_PART` com `UPDATE`.
- Prontidão: pronta agora.

### 3.3 Reatribuir publicador da parte

- Intenção: trocar o designado atual.
- Tipo: B.
- Gate: `ASSIGN_PART`.
- Prontidão: pronta agora.

### 3.4 Limpar designação da parte

- Intenção: remover publicador e devolver a parte a estado pendente.
- Tipo: A.
- Gate: `ASSIGN_PART` com reversão.
- Prontidão: pronta agora.

### 3.5 Aprovar proposta de designação

- Intenção: promover `PROPOSTA` para `APROVADA`.
- Tipo: A.
- Gate: novo intent sobre `workbookService.approveProposal(...)`.
- Visibilidade: somente perfis que hoje têm esse papel operacional.
- Prontidão: quase pronta.

### 3.6 Rejeitar proposta de designação

- Intenção: devolver a parte a `PENDENTE` com motivo.
- Tipo: B.
- Gate: novo intent sobre `workbookService.rejectProposal(...)`.
- Prontidão: quase pronta.

### 3.7 Cancelar designação já aprovada

- Intenção: retirar designação validada ou concluída por motivo operacional.
- Tipo: B.
- Gate: novo intent sobre `workbookService.rejectProposal(...)`.
- Prontidão: quase pronta.

### 3.8 Marcar parte como cancelada

- Intenção: registrar que a parte não ocorrerá.
- Tipo: B.
- Gate: `MANAGE_WORKBOOK_PART` com `CANCEL`.
- Prontidão: pronta agora.

### 3.9 Excluir parte isolada

- Intenção: remover uma parte específica da apostila.
- Tipo: C.
- Gate: `MANAGE_WORKBOOK_PART` com `DELETE`.
- Prontidão: pronta agora.

### 3.10 Marcar parte como concluída

- Intenção: registrar execução efetiva na reunião.
- Tipo: B.
- Gate: novo intent sobre `workbookService.markAsCompleted(...)`.
- Prontidão: quase pronta.

### 3.11 Desfazer conclusão

- Intenção: voltar `CONCLUIDA` para `APROVADA`.
- Tipo: A.
- Gate: novo intent sobre `workbookService.undoCompletion(...)`.
- Prontidão: quase pronta.

### 3.12 Notificar recusa da parte

- Intenção: acionar o superintendente e sugerir substituição.
- Tipo: D.
- Gate: `NOTIFY_REFUSAL`.
- Prontidão: pronta agora.

### 3.13 Sugerir substituto para parte recusada

- Intenção: depois da recusa, mostrar ranking curto de candidatos elegíveis.
- Tipo: B.
- Gate: `CHECK_SCORE` mais contexto da parte.
- Prontidão: quase pronta.

### 3.14 Ajuste rápido de duração

- Intenção: alterar duração com preview do recálculo da semana.
- Tipo: B.
- Gate: `MANAGE_WORKBOOK_PART` com `UPDATE`.
- Prontidão: pronta agora.

### 3.15 Corrigir publicador bruto extraído

- Intenção: tratar erro de importação ou OCR sem abrir edição completa.
- Tipo: A.
- Gate: `MANAGE_WORKBOOK_PART` com `UPDATE`.
- Prontidão: pronta agora.

## 4. Micro-UIs de Semana

Entidade base: `WorkbookWeek`.

### 4.1 Listar semana operacional

- Intenção: mostrar resumo da semana atual com pendências, designados e status.
- Tipo: A.
- Gate: `MANAGE_WORKBOOK_WEEK` com `LIST`.
- Prontidão: pronta agora.

### 4.2 Gerar designações da semana

- Intenção: disparar geração automática sobre semana focal.
- Tipo: B.
- Gate: `GENERATE_WEEK`.
- Prontidão: pronta agora.

### 4.3 Limpar designações da semana

- Intenção: remover apenas designações, mantendo a estrutura da apostila.
- Tipo: C.
- Gate: `CLEAR_WEEK`.
- Prontidão: pronta agora.

### 4.4 Cancelar semana inteira

- Intenção: marcar todas as partes como canceladas.
- Tipo: C.
- Gate: `MANAGE_WORKBOOK_WEEK` com `CANCEL_WEEK`.
- Prontidão: pronta agora.

### 4.5 Resetar semana para pendente

- Intenção: devolver a semana ao estado operacional neutro.
- Tipo: C.
- Gate: `MANAGE_WORKBOOK_WEEK` com `RESET_WEEK`.
- Prontidão: pronta agora.

### 4.6 Excluir semana inteira

- Intenção: remover todas as partes da semana do banco.
- Tipo: C.
- Gate: `MANAGE_WORKBOOK_WEEK` com `DELETE_WEEK`.
- Prontidão: pronta agora, mas com alto risco.

### 4.7 Reimportar semana

- Intenção: excluir o que existe e importar novamente do jw.org.
- Tipo: C.
- Gate: `MANAGE_WORKBOOK_WEEK` com `REIMPORT`.
- Prontidão: pronta agora, mas precisa preview robusto.

### 4.8 Reset por intervalo de datas

- Intenção: resetar múltiplas semanas por período.
- Tipo: C.
- Gate: novo intent sobre `workbookService.resetDateRange(...)`.
- Prontidão: quase pronta.

### 4.9 Marcar semana concluída

- Intenção: concluir em lote as partes designadas/aprovadas da semana.
- Tipo: C.
- Gate: novo intent sobre `workbookService.markAsCompleted(...)`.
- Prontidão: quase pronta.

### 4.10 Resumo de risco da semana

- Intenção: mostrar quantidade de partes pendentes, canceladas, recusadas e com evento especial.
- Tipo: A.
- Gate: leitura permitida da semana.
- Prontidão: quase pronta.

## 5. Micro-UIs de Importação e Apostila

Entidades base: `WorkbookBatch`, `WorkbookWeek`, `WorkbookPart`.

### 5.1 Prévia de importação de uma semana

- Intenção: buscar no jw.org e mostrar resumo sem salvar.
- Tipo: B.
- Gate: `IMPORT_WORKBOOK` com `PREVIEW`.
- Prontidão: pronta agora.

### 5.2 Importar uma semana

- Intenção: persistir a apostila de uma semana.
- Tipo: B.
- Gate: `IMPORT_WORKBOOK`.
- Prontidão: pronta agora.

### 5.3 Importar múltiplas semanas

- Intenção: importar período curto de semanas em lote.
- Tipo: C.
- Gate: `IMPORT_WORKBOOK`.
- Prontidão: pronta agora.

### 5.4 Gerenciar batch de importação

- Intenção: listar, inspecionar e remover batches de apostila.
- Tipo: C.
- Gate: novo conjunto de intents sobre `workbookService.getBatches()` e `deleteBatch(...)`.
- Prontidão: quase pronta.

### 5.5 Reconciliar importação com partes existentes

- Intenção: antes de reimportar, mostrar diferenças entre versão atual e nova versão.
- Tipo: C.
- Gate: operação nova de comparação.
- Prontidão: precisa endurecimento.

## 6. Micro-UIs de Eventos Especiais

Entidade base: `SpecialEvent`.

### 6.1 Criar evento informativo

- Intenção: registrar anúncio ou notificação sem impacto nas partes.
- Tipo: B.
- Gate: `MANAGE_SPECIAL_EVENT` ou intent equivalente.
- Prontidão: pronta agora.

### 6.2 Criar evento com impacto e aplicar imediatamente

- Intenção: cadastrar e aplicar o evento na semana.
- Tipo: C.
- Gate: `MANAGE_SPECIAL_EVENT` com `CREATE_AND_APPLY`.
- Prontidão: pronta agora.

### 6.3 Criar evento pendente de aplicação

- Intenção: cadastrar agora, marcar impacto visual e decidir depois o commit.
- Tipo: C.
- Gate: novo intent sobre `createEvent(...)` + `markPendingImpact(...)`.
- Prontidão: quase pronta.

### 6.4 Editar evento existente

- Intenção: ajustar tema, responsável, impactos e vínculos.
- Tipo: C.
- Gate: novo intent sobre `specialEventService.updateEvent(...)`.
- Prontidão: quase pronta.

### 6.5 Aplicar evento pendente

- Intenção: transformar impacto pendente em impacto efetivo.
- Tipo: C.
- Gate: novo intent sobre `applyEventImpact(...)`.
- Prontidão: quase pronta.

### 6.6 Reverter impacto de evento

- Intenção: remover efeito aplicado sem necessariamente excluir o registro do evento.
- Tipo: C.
- Gate: novo intent sobre `revertEventImpact(...)`.
- Prontidão: quase pronta.

### 6.7 Excluir evento

- Intenção: deletar evento, revertendo antes o impacto se necessário.
- Tipo: C.
- Gate: `MANAGE_SPECIAL_EVENT` com `DELETE`.
- Prontidão: pronta agora.

### 6.8 Limpar marcações pendentes de evento

- Intenção: retirar destaque amarelo pulsante sem excluir o evento.
- Tipo: B.
- Gate: novo intent sobre `clearPendingMarks(...)`.
- Prontidão: quase pronta.

### 6.9 Seleção granular de partes impactadas

- Intenção: marcar visualmente quais partes serão afetadas e como.
- Tipo: B.
- Gate: mesmo gate do evento.
- Prontidão: quase pronta.

### 6.10 Preview de impacto do evento

- Intenção: mostrar quais partes serão canceladas, reduzidas, criadas ou apenas marcadas.
- Tipo: C.
- Gate: mesmo gate do evento.
- Prontidão: precisa endurecimento.

## 7. Micro-UIs de Necessidades Locais

Entidade base: `LocalNeedsPreassignment`.

### 7.1 Listar fila pendente

- Intenção: mostrar próximos itens da fila e histórico recente.
- Tipo: A.
- Gate: `MANAGE_LOCAL_NEEDS` com `LIST`.
- Prontidão: pronta agora.

### 7.2 Adicionar item à fila

- Intenção: cadastrar tema, responsável e opcionalmente semana alvo.
- Tipo: B.
- Gate: `MANAGE_LOCAL_NEEDS` com `ADD`.
- Prontidão: pronta agora.

### 7.3 Editar item da fila

- Intenção: corrigir tema, responsável ou semana alvo.
- Tipo: B.
- Gate: novo intent sobre `localNeedsService.update(...)`.
- Prontidão: quase pronta.

### 7.4 Remover item da fila

- Intenção: excluir pré-designação pendente.
- Tipo: C.
- Gate: `MANAGE_LOCAL_NEEDS` com `REMOVE`.
- Prontidão: pronta agora.

### 7.5 Reordenar fila

- Intenção: mover item para cima, para baixo ou para posição específica.
- Tipo: B.
- Gate: `MANAGE_LOCAL_NEEDS` com `REORDER`.
- Prontidão: pronta agora.

### 7.6 Atribuir item de fila a uma parte

- Intenção: vincular explicitamente a pré-designação à parte de necessidades locais da semana.
- Tipo: B.
- Gate: novo intent sobre `assignToPart(...)`.
- Prontidão: quase pronta.

### 7.7 Desvincular item de uma parte

- Intenção: devolver a pré-designação à fila.
- Tipo: B.
- Gate: novo intent sobre `unassign(...)` ou `unassignByPartId(...)`.
- Prontidão: quase pronta.

### 7.8 Mostrar fila disponível para a semana atual

- Intenção: explicar qual item a automação puxará para a semana.
- Tipo: A.
- Gate: leitura de necessidades locais.
- Prontidão: quase pronta.

### 7.9 Mostrar vínculo atual entre parte e item da fila

- Intenção: tornar explícito se a parte de necessidade local está ligada a uma pré-designação.
- Tipo: A.
- Gate: leitura permitida.
- Prontidão: quase pronta.

## 8. Micro-UIs de Comunicação

Entidades base: `NotificationRecord`, `ActivityLogEntry`.

### 8.1 Preparar S-140 da semana

- Intenção: gerar conteúdo e abrir fluxo de revisão/envio.
- Tipo: D.
- Gate: `SEND_S140`.
- Visibilidade adicional: canal conforme `canSendZap`.
- Prontidão: pronta agora.

### 8.2 Revisar e editar S-140 preparado

- Intenção: ajustar o texto antes do envio.
- Tipo: D.
- Gate: mesmo gate da comunicação.
- Serviço base: `communicationService.updateNotification(...)`.
- Prontidão: quase pronta.

### 8.3 Preparar S-89 em lote

- Intenção: gerar cartões e mensagens dos designados da semana.
- Tipo: D.
- Gate: `SEND_S89`.
- Prontidão: pronta agora.

### 8.4 Revisar mensagem individual de S-89

- Intenção: editar mensagem de um destinatário sem reabrir fluxo completo.
- Tipo: D.
- Gate: mesmo gate da comunicação.
- Prontidão: quase pronta.

### 8.5 Reenviar ou reabrir notificação preparada

- Intenção: retomar uma comunicação já registrada.
- Tipo: D.
- Gate: leitura + update da notificação.
- Prontidão: quase pronta.

### 8.6 Gerar link do portal de confirmação

- Intenção: criar e copiar link de confirmação para parte designada.
- Tipo: B.
- Gate: comunicação permitida.
- Serviço base: `createConfirmationPortalLink(...)`.
- Prontidão: quase pronta.

### 8.7 Notificar recusa com preview

- Intenção: antes de avisar o superintendente, mostrar parte, motivo e possíveis substitutos.
- Tipo: D.
- Gate: `NOTIFY_REFUSAL`.
- Prontidão: quase pronta.

### 8.8 Histórico de notificações

- Intenção: consultar comunicações preparadas, enviadas e falhadas.
- Tipo: A.
- Gate: leitura permitida da comunicação.
- Prontidão: quase pronta.

### 8.9 Feed de atividades de comunicação

- Intenção: mostrar confirmações, recusas e disparos recentes.
- Tipo: A.
- Gate: leitura permitida.
- Prontidão: quase pronta.

## 9. Micro-UIs de Configuração do Motor

Entidade base: `EngineConfig` e `app_settings`.

### 9.1 Inspecionar regras do motor

- Intenção: mostrar pesos, cooldowns e bônus ativos.
- Tipo: A.
- Gate: `UPDATE_ENGINE_RULES` ou leitura administrativa equivalente.
- Prontidão: quase pronta.

### 9.2 Atualizar pesos do motor

- Intenção: ajustar fairness, teaching weight, helper weight e bônus.
- Tipo: C.
- Gate: `UPDATE_ENGINE_RULES`.
- Prontidão: pronta agora.

### 9.3 Restaurar preset seguro do motor

- Intenção: voltar a uma configuração-base conhecida.
- Tipo: C.
- Gate: `UPDATE_ENGINE_RULES`.
- Prontidão: quase pronta.

### 9.4 Preview de impacto das regras

- Intenção: antes de salvar, comparar ranking atual e ranking estimado com nova configuração.
- Tipo: C.
- Gate: `UPDATE_ENGINE_RULES`.
- Prontidão: precisa endurecimento.

## 10. Micro-UIs Analíticas e de Simulação

Estas não fazem escrita, mas fazem sentido no paradigma porque preparam decisão segura.

### 10.1 Consulta de elegibilidade de candidatos

- Intenção: ver ranking e explicação para uma parte.
- Tipo: A.
- Gate: `CHECK_SCORE`.
- Prontidão: pronta agora.

### 10.2 Simulação de designação

- Intenção: testar combinação parte-publicador sem gravar.
- Tipo: A.
- Gate: `SIMULATE_ASSIGNMENT`.
- Prontidão: pronta agora.

### 10.3 Estatísticas de publicador

- Intenção: ver distribuição, últimas participações e tipos de parte.
- Tipo: A.
- Gate: `GET_ANALYTICS`.
- Prontidão: pronta agora.

### 10.4 Comparação entre publicadores

- Intenção: apoiar decisão de designação ou substituição.
- Tipo: A.
- Gate: `GET_ANALYTICS`.
- Prontidão: pronta agora.

### 10.5 Diagnóstico da semana antes do commit

- Intenção: destacar lacunas, conflitos, partes sem designado e riscos.
- Tipo: B.
- Gate: leitura da semana + analytics.
- Prontidão: quase pronta.

## Matriz de Priorização por Valor

## Prioridade 1 — Alto valor e baixo atrito

- criar publicador mínimo
- editar publicador
- atualizar disponibilidade
- aprovar proposta
- rejeitar proposta
- reatribuir parte
- concluir parte
- editar item da fila de necessidades locais
- revisar mensagem preparada

## Prioridade 2 — Alto valor com preview obrigatório

- excluir publicador
- limpar semana
- cancelar semana
- reimportar semana
- criar evento pendente
- editar evento
- reverter evento

## Prioridade 3 — Requer reforço de domínio antes de expor

- renomear publicador com propagação transacional
- resolver duplicidade de cadastro
- diff entre versões da apostila antes de reimportar
- preview comparativo de engine config

## Regras de Visibilidade Recomendadas

1. O usuário só vê micro-UIs coerentes com seu perfil, não uma lista universal de possibilidades.
2. Sugestões contextuais devem respeitar a semana em foco, o tipo de entidade em foco e o risco aceitável para o perfil.
3. Micro-UIs de comunicação aparecem apenas se o perfil puder ver os dados do destinatário e operar o canal.
4. Micro-UIs de lote ou exclusão exigem escopo visível e confirmação forte.
5. Se o usuário pode consultar mas não executar, a superfície deve virar cartão de leitura, não CTA de ação.

## Tradução Arquitetural

Para a proposta do RVM Designações, a micro-UI correta não é um modal menor. Ela é uma interrogação mínima guiada por contexto, permissão e risco.

Em termos concretos, cada micro-UI do chat-agente deve seguir este pipeline:

1. detectar a intenção
2. cruzar intenção com permissão e visibilidade
3. reunir automaticamente o contexto permitido
4. pedir apenas a lacuna que falta
5. mostrar prévia quando houver risco ou impacto relevante
6. delegar o commit ao serviço de domínio
7. devolver resultado visual e próxima ação útil

## Conclusão

O RVM Designações já tem base suficiente para um catálogo amplo de micro-UIs na aba Agente. A fronteira de segurança correta não está apenas em perguntar “pode executar?”. Ela está em perguntar ao mesmo tempo:

- pode descobrir esta ação?
- pode ver os dados necessários para executá-la?
- pode confirmar um efeito desse risco?
- existe serviço de domínio suficientemente sólido para sustentar o commit?

Esse cruzamento entre intenção, permissão, visibilidade e risco é o núcleo do projeto semântico do chat-agente.