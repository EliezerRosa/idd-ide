# Backlog por Sprint — Interface Semântica do RVM

## Objetivo

Transformar o roadmap técnico em backlog executável por sprint, com prioridade, dependências e critério de saída.

## Sprint 0 — Base já iniciada

### Status

Implementado em 2026-04-17 como primeira fatia funcional.

### Entregas

- contexto ativo visível no chat
- placeholder orientado à intenção
- ações pós-resposta iniciais: copiar, refinar, tentar de novo, desfazer, ver S-140, compartilhar S-140
- integração inicial de ações determinísticas com executor direto

### Arquivos já tocados

- `src/components/TemporalChat.tsx`
- `src/components/PowerfulAgentTab.tsx`
- `src/components/ui/IntentContextBar.tsx`
- `src/components/ui/PostResponseActions.tsx`

### Critério de saída

- build sem erros
- contexto e continuidade já perceptíveis na aba Agente

## Sprint 1 — Quick Action Chips

### Status

Primeira versão implementada em 2026-04-17.

### Meta

Introduzir discoverability semântica por contexto e perfil.

### Itens

- criar componente `ChatActionChips`
- exibir chips acima do input
- filtrar por permissão
- definir catálogo inicial de chips por semana, publicador e ação

### Implementado nesta etapa

- componente `ChatActionChips`
- chips contextuais para status da semana, S-140, geração da semana, ranking e desfazer
- filtragem baseada em permissões já carregadas no runtime

### Pendências

- sofisticar chips por entidade em foco
- acrescentar retomada de contexto e chips por mudança de assunto
- evoluir para heurísticas mais finas de contexto

### Dependências

- nenhuma estrutural pesada

### Critério de saída

- usuários comuns conseguem iniciar fluxos recorrentes sem depender apenas de digitação livre

## Sprint 2 — Slash Commands

### Status

Primeira versão implementada em 2026-04-17.

### Meta

Criar atalho de produtividade para usuários avançados.

### Itens

- detectar prefixo `/`
- dropdown com filtro incremental
- catálogo inicial de comandos
- filtragem por perfil e permissão

### Implementado nesta etapa

- detecção de prefixo `/` no input
- menu flutuante com comandos filtrados
- catálogo inicial com comandos de ajuda, status, designação, histórico, gerar semana, ver S-140, compartilhar S-140, limpar semana e desfazer
- ações híbridas: algumas populam prompt, outras executam diretamente

### Pendências

- navegação por teclado no menu de slash commands
- aliases e autocompletar mais rico
- maior alinhamento entre slash commands e intents tipadas futuras

### Dependências

- idealmente após Sprint 1, para alinhar taxonomia de comandos e chips

### Critério de saída

- o chat passa a aceitar um modo híbrido: linguagem natural + comandos rápidos

## Sprint 3 — Contexto de Conversa

### Meta

Preservar foco e continuidade entre interações.

### Itens

- criar `useChatContext()`
- extrair entidades em foco
- registrar tópico atual e tópico anterior
- detectar mudança de assunto
- permitir retomada contextual

### Critério de saída

- o usuário não precisa reiterar semana e entidade a cada nova mensagem

## Sprint 4 — Micro-UIs por Intenção

### Meta

Trocar fluxos genéricos por modais curtos e específicos.

### Itens

- catalogar intenções que exigem complemento mínimo
- reduzir modais atuais para versões mais focadas
- pré-preencher dados conhecidos
- mostrar preview antes de persistência quando necessário

### Casos prioritários

- recusa
- confirmação
- comunicação
- disponibilidade

### Progresso recente

- micro-UI de aprovação de propostas integrada ao chat
- micro-UI de rejeição de propostas integrada ao chat com motivo obrigatório
- micro-UI de atualização de disponibilidade integrada ao chat em duas fases
- slash commands e ações pós-resposta reforçados para propostas pendentes
- boundary inicial de rename com propagação criado na camada de domínio de publicadores

### Sequência sugerida de entrega

1. aprovar proposta de designação
2. rejeitar proposta de designação
3. reatribuir publicador da parte
4. atualizar disponibilidade do publicador
5. editar ficha principal do publicador
6. revisar mensagem preparada de S-140
7. adicionar e editar item da fila de necessidades locais
8. marcar parte como concluída

### Documento de apoio

- `matriz_implantacao_micro_uis_prioritarias.md`
	- detalha gates, contratos mínimos, preview e commit das primeiras micro-UIs a implantar

### Critério de saída

- tarefas curtas exigem menos navegação, menos campos e mais clareza

## Sprint 5 — Intents Tipadas e Governança

### Meta

Formalizar o motor semântico do agente.

### Itens

- taxonomia inicial de intents
- mapeamento intent → bounded context
- metadados de risco
- integração com auditoria
- explicabilidade curta por ação

### Critério de saída

- o comportamento do agente fica mais previsível, rastreável e explicável

## Sprint 6 — Resposta Visual Operacional

### Meta

Fazer o sistema responder cada vez menos com texto puro e cada vez mais com superfícies operacionais.

### Itens

- cartões de decisão
- previews reutilizáveis
- listas priorizadas de pendência
- quadros comparativos de sugestão

### Critério de saída

- a experiência final se aproxima do ideal do manifesto: visualização como saída semântica principal

## Critério de Priorização Contínua

Ao escolher o próximo item, privilegiar sempre o que maximize simultaneamente:

1. redução de carga cognitiva
2. aderência ao domínio
3. segurança operacional
4. continuidade entre intenção e execução