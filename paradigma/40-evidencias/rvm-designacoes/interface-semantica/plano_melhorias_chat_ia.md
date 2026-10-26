# Plano de Melhorias do Chat-IA — 3 Padrões Modernos

## Status: PLANEJADO (para implementação futura)

## 1. Slash Commands `/`

- Digitar `/` no input do chat abre lista filtrada de comandos
- Comandos: `/designar`, `/gerar-s140`, `/historico`, `/status`, `/ajuda`
- Filtro em tempo real conforme o usuário digita
- Lista visível como dropdown acima do input
- Permissão: comandos filtrados por accessLevel do usuário
- Exemplo: `/gerar-s140` só aparece para elder/admin

## 2. Quick Action Chips (Contextuais)

- Chips horizontais scrolláveis acima do input
- Visibilidade por perfil + permissões + contexto da conversa
- Publicador: chips básicos (consultar designação, histórico pessoal)
- SM Ajudante SRVM: chips de gestão (designar, gerar relatório)
- Ancião SRVM: chips avançados (gerar S-140, enviar Zap, aprovar)
- Admin: todos os chips
- Contexto da conversa muda os chips:
- Se conversa é sobre semana X: chip "Designar semana X", "Ver S-140 semana X"
- Se conversa é sobre publicador Y: chip "Histórico de Y", "Disponibilidade de Y"
- Se IA detecta mudança de assunto: exibe chip "Voltar ao tema anterior?"
- Responsivo: scroll horizontal no mobile, wrap no desktop

## 3. Post-Response Actions

- Botões de ação aparecem após cada resposta da IA
- Quiz/boas-vindas para novos usuários: mover os buttons atuais de quiz/onboarding para post-response format
- Ações padrão: [Copiar] [Refinar] [Errado]
- Ações contextuais (após gerar S-140): [Aplicar] [Exportar PDF] [Enviar Zap]
- Ações contextuais (após designação): [Confirmar] [Editar] [Desfazer]

## 4. Detecção de Mudança de Contexto

- IA monitora tópico da conversa (semana, publicador, ação)
- Se detecta mudança brusca:
- Exibe mensagem: "Percebi que mudamos de assunto. Deseja continuar com [novo tema] ou voltar a [tema anterior]?"
- Ou chip especial: [Voltar: designação semana 12-18 maio]
- Implementar via análise do último contexto vs mensagem atual no prompt do agente

## Arquitetura Técnica (Proposta)

- Novo componente: `ChatActionChips.tsx` — renderiza chips baseado em permissions + conversationContext
- Novo componente: `PostResponseActions.tsx` — renderiza botões contextuais após cada mensagem da IA
- Modificar: `AgentChat.tsx` — adicionar slash command handler no input
- Novo hook: `useChatContext()` — rastreia tópico atual, semana, publicador em foco
- Novo tipo: `ChatAction { id, label, icon, command, requiredPermission, contextMatch }`
- Integrar com `permissionService.ts` para filtragem por perfil

## Prioridade de Implementação

1. Post-Response Actions (menor impacto, maior valor visual)
2. Quick Action Chips (maior impacto UX)
3. Slash Commands (power users)
4. Detecção de Contexto (mais complexo, requer tuning do prompt)