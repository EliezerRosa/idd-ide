# Mapeamento do Código Atual ao Paradigma Semântico

## Objetivo

Cruzar o manifesto e os princípios com o estado real do código para identificar o que já sustenta o novo paradigma e o que ainda falta para completá-lo.

## O que já existe e sustenta o paradigma

### 1. Camada semântica já tem ponto de entrada real

Arquivos centrais:

- `src/components/TemporalChat.tsx`
- `src/components/PowerfulAgentTab.tsx`
- `src/components/ChatAgent.tsx`

Leitura:

- já existe uma entrada conversacional operacional
- o chat aceita texto e áudio
- a aba Agente já é mais que um painel passivo: ela coordena ação, preview e interação

### 2. Já existe executor de ações estruturadas

Arquivo central:

- `src/services/agentActionService.ts`

Leitura:

- o sistema já detecta blocos JSON de ação
- já existe taxonomia considerável de `AgentActionType`
- já há execução real de geração, limpeza, atualização, simulação, importação e visualização

Implicação:

- a base para intents tipadas já existe, mesmo que ainda não esteja formalizada sob esse nome

### 3. Já existe fronteira de segurança por permissão

Arquivos centrais:

- `src/services/permissionService.ts`
- `src/hooks/usePermissions.ts`
- `src/context/AuthContext.tsx`

Leitura:

- tabs e agent actions já são filtradas por perfil
- existe fallback seguro
- já há distinção de access level e visibilidade de dados

Implicação:

- a governança da camada semântica já tem fundamento concreto

### 4. Já existe resposta visual operacional relevante

Arquivos centrais:

- `src/components/S140PreviewCarousel.tsx`
- `src/services/s140GeneratorUnified.ts`

Leitura:

- o sistema já tem um bom exemplo do princípio “resposta visual como saída semântica”
- o preview de S-140 é um dos elementos mais maduros da visão do manifesto

### 5. Já existe ponte entre IA e modal operacional

Arquivo central:

- `src/components/AgentModalHost.tsx`

Leitura:

- a ideia de microfluxo já tem um embrião técnico
- porém ainda falta torná-lo mais minimalista e específico por lacuna de contexto

## O que existe, mas ainda está incompleto

### 1. Chat existe, mas ainda não é barra de intenção completa

Arquivo central:

- `src/components/TemporalChat.tsx`

Lacunas:

- não há slash commands
- não há chips contextuais
- não há contexto ativo visível
- não há detecção explícita de mudança de assunto

### 2. Ações existem, mas faltam superfícies de continuidade

Arquivos centrais:

- `src/components/ui/ChatMessageBubble.tsx`
- `src/services/agentActionService.ts`

Lacunas:

- não há ações pós-resposta
- o usuário ainda depende demais de nova digitação para continuar um fluxo

### 3. Modais existem, mas ainda não são micro-UIs maduras

Arquivo central:

- `src/components/AgentModalHost.tsx`

Lacunas:

- ainda há tendência a reutilizar componentes mais amplos
- falta design orientado a “pedir só o que falta”

## O que falta em relação direta ao manifesto

### Faltas mais claras

1. catálogo explícito de intenção para o usuário final
2. surface combinada de linguagem natural + slash + chips
3. contexto conversacional persistente e visível
4. ações pós-resposta como continuidade do raciocínio
5. micro-UIs por intenção mais curtas e focadas
6. taxonomia formal de intents com gradiente de risco

## Componentes Prioritários para Evolução

### `TemporalChat.tsx`

Deve evoluir para concentrar:

- barra de intenção
- slash command handler
- chips contextuais
- contexto ativo visível
- ações pós-resposta

### `agentActionService.ts`

Deve evoluir para concentrar:

- governança de intents tipadas
- metadados de risco
- suporte mais claro a preview before commit

### `permissionService.ts`

Deve evoluir para concentrar:

- filtragem de comandos visíveis
- filtragem de chips
- gating fino de superfícies semânticas além das actions

### `AgentModalHost.tsx`

Deve evoluir para concentrar:

- micro-UIs menores
- modais pré-preenchidos
- coleta mínima de dados faltantes

## Diagnóstico Final

O código atual já passou da fase de “chat experimental”.

Ele já possui os pilares técnicos para o novo paradigma:

- autenticação
- permissões
- executor estruturado
- respostas visuais
- host de modais

O principal déficit atual não é de backend nem de ação. É de ergonomia semântica.

Em termos práticos:

- a infraestrutura já suporta a visão
- a UX ainda não expressa plenamente a visão

Esse é precisamente o próximo ciclo de desenvolvimento.