# Roadmap Técnico — Interface Semântica do RVM

## Objetivo

Traduzir o manifesto e os princípios da interface semântica em um plano incremental de implementação ancorado no estado real do código.

## Estado Atual Resumido

O projeto já possui uma base forte para a camada semântica:

- autenticação e permissões por perfil
- aba Agente operacional
- chat multimodal com histórico
- executor de ações estruturadas
- visualização de S-140
- modais orquestrados pela IA

O que falta não é infraestrutura básica. O que falta é a camada de ergonomia semântica que liga intenção, contexto, comando, confirmação e resposta visual com mais inteligência de UX.

## Fase 1 — Consolidação da Barra de Intenção

### Objetivo

Transformar o chat atual em uma superfície mais claramente orientada à intenção.

### Entregas

1. padronizar o input principal como barra de intenção
2. adicionar placeholder e hinting mais explícitos por contexto
3. exibir contexto ativo: semana, publicador, fluxo em andamento
4. normalizar ações do usuário em intents locais preliminares antes do envio ao modelo

### Componentes envolvidos

- `TemporalChat.tsx`
- `agentService.ts`
- `contextBuilder.ts`

### Critérios de pronto

- o usuário entende melhor o que pode pedir
- o contexto atual fica visível sem precisar reler o histórico
- o input deixa de parecer um chat genérico

## Fase 2 — Ações Pós-Resposta

### Objetivo

Dar continuidade operacional imediata às respostas da IA.

### Entregas

1. componente `PostResponseActions`
2. ações base: copiar, refinar, tentar de novo, desfazer
3. ações contextuais: aplicar, abrir preview, exportar, comunicar, confirmar
4. integração com `agentActionService.executeAction`

### Componentes envolvidos

- `TemporalChat.tsx`
- `ChatMessageBubble.tsx`
- `agentActionService.ts`
- `undoService.ts`

### Critérios de pronto

- toda resposta relevante da IA oferece um próximo passo útil
- ações persistentes não dependem de nova digitação para prosseguir

## Fase 3 — Quick Action Chips Contextuais

### Objetivo

Introduzir discoverability semântica sem poluir a interface.

### Entregas

1. componente `ChatActionChips`
2. chips filtrados por permissão
3. chips guiados por contexto de conversa
4. chips de retomada de fluxo e continuidade

### Componentes envolvidos

- `TemporalChat.tsx`
- `permissionService.ts`
- novo hook `useChatContext()`

### Critérios de pronto

- usuários comuns encontram comandos úteis sem decorar sintaxe
- chips variam conforme semana, publicador e ação em foco

## Fase 4 — Slash Commands

### Objetivo

Adicionar uma superfície de produtividade para usuários avançados.

### Entregas

1. parser de prefixo `/`
2. dropdown de comandos com filtro incremental
3. visibilidade por perfil e permissão
4. mapeamento de cada comando para intent tipada ou prompt assistido

### Exemplos iniciais

- `/designar`
- `/gerar-s140`
- `/historico`
- `/status`
- `/ajuda`

### Componentes envolvidos

- `TemporalChat.tsx`
- `permissionService.ts`
- `agentService.ts`

### Critérios de pronto

- o dropdown aparece com baixa latência
- o comando selecionado vira ação compreensível ao usuário
- comandos indisponíveis nem aparecem para perfis sem permissão

## Fase 5 — Contexto de Conversa e Mudança de Assunto

### Objetivo

Fazer o sistema manter foco sem se tornar rígido.

### Entregas

1. hook `useChatContext()`
2. extração local de entidades em foco: semana, publicador, ação
3. detecção de mudança brusca de assunto
4. UI de retomada: “continuar no novo tema” ou “voltar ao anterior”

### Componentes envolvidos

- `TemporalChat.tsx`
- `agentService.ts`
- `chatHistoryService.ts`

### Critérios de pronto

- o sistema preserva contexto entre mensagens
- a mudança de tópico fica explícita e recuperável

## Fase 6 — Micro-UIs por Intenção

### Objetivo

Trocar modais genéricos por superfícies mínimas orientadas à lacuna real da tarefa.

### Entregas

1. catálogo de microfluxos por intenção
2. pré-preenchimento com tudo que o sistema já sabe
3. solicitação apenas do que falta
4. preview antes de persistência

### Casos prioritários

- confirmação de designação
- recusa de designação
- comunicação S-89 / S-140
- ajuste de disponibilidade

### Componentes envolvidos

- `AgentModalHost.tsx`
- `agentActionService.ts`
- componentes de modal existentes

### Critérios de pronto

- modais ficam menores e mais contextuais
- o usuário não precisa navegar para telas inteiras para concluir tarefas curtas

## Fase 7 — Catálogo de Intents Tipadas

### Objetivo

Reduzir dependência de prompts livres como mecanismo único de coordenação.

### Entregas

1. taxonomia inicial de intents
2. mapeamento intent → bounded context
3. metadata de risco: consulta, simulação, preparação, confirmação, execução
4. integração com rastreabilidade e auditoria

### Componentes envolvidos

- `agentService.ts`
- `agentActionService.ts`
- `auditService.ts`

### Critérios de pronto

- as ações ficam mais previsíveis
- o sistema explica melhor o que está fazendo
- o manifesto passa a ter tradução direta no runtime

## Ordem Recomendada de Execução

1. ações pós-resposta
2. quick action chips
3. slash commands
4. contexto visível e mudança de assunto
5. micro-UIs por intenção
6. intents tipadas e governança refinada

## Riscos a Controlar

- transformar chips e slash commands em atalhos sem semântica real
- adicionar UX nova sem integrar permission gate
- manter respostas longas demais sem materialização visual
- abrir modais grandes demais em vez de microfluxos mínimos

## Resultado Esperado

Ao fim dessas fases, a aba Agente deixa de ser apenas um canal conversacional com executor embutido e passa a operar como uma superfície semântica de coordenação, em que intenção, contexto, permissão, decisão e resposta visual ficam coerentes entre si.