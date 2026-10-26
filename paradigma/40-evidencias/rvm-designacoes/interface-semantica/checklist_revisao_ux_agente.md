# Checklist de Revisão — UX da Aba Agente

## Como usar

Use este checklist antes de aprovar qualquer nova feature da aba Agente, fluxo semântico ou resposta visual orientada por intenção.

## 1. Intenção

- o fluxo começa pelo objetivo do usuário, não pela estrutura interna da tela
- a linguagem usada corresponde à linguagem ubíqua do domínio
- o sistema evita pedir dados que já conhece
- a intenção foi classificada de forma compreensível

## 2. Domínio

- a ação proposta respeita bounded context e regras do domínio
- a IA não contorna serviços, RPCs ou fluxos aprovados
- o comportamento evita “chatbot solto” e improviso operacional
- ambiguidades geram desambiguação e não execução precipitada

## 3. Permissões

- comandos e sugestões respeitam o perfil do usuário
- ações não permitidas não aparecem como caminho principal
- qualquer fallback de permissão falha para o mínimo seguro
- dados sensíveis não vazam em previews, chips ou respostas textuais

## 4. Contexto

- semana, publicador ou tarefa em foco estão visíveis
- o sistema mantém continuidade entre mensagens relacionadas
- mudança de assunto é detectável ou explicitada
- o usuário consegue retomar o fluxo anterior sem recomeçar tudo

## 5. Ergonomia de Comando

- há discoverability suficiente para usuários comuns
- há velocidade suficiente para usuários experientes
- chips, slash commands e ações pós-resposta não competem entre si
- comandos mostrados são realmente úteis no contexto atual

## 6. Micro-UI

- modais pedem apenas o que falta para concluir a tarefa
- campos já conhecidos vêm pré-preenchidos
- o fluxo é curto, específico e descartável
- a solução evita redirecionar para telas grandes sem necessidade

## 7. Resposta Visual

- a resposta final tende a preview, quadro, lista, cartão ou modal útil
- texto livre é usado como apoio, não como produto final predominante
- o usuário consegue entender o estado atual da tarefa olhando a interface
- quando houver S-140, confirmação ou conflito, há materialização visual adequada

## 8. Explicabilidade

- o sistema explica por que sugeriu algo
- a explicação é curta, local e operacional
- o impacto da confirmação está claro antes da persistência
- critérios principais aparecem sem excesso de teoria ou verbosidade

## 9. Persistência e Segurança

- o nível de consentimento é proporcional ao impacto da ação
- consultas não exigem fricção desnecessária
- execuções persistentes registram auditoria
- quando cabível, existe preview antes de commit

## 10. Recuperação

- o erro preserva contexto útil
- o sistema oferece correção em vez de reinício total
- quando possível, há undo ou reversão
- mensagens de bloqueio apontam próximo passo concreto

## 11. Qualidade de UX

- a interface parece uma superfície de trabalho e não um chatbot genérico
- o usuário sente aceleração cognitiva e não aumento de carga mental
- o fluxo evita poluição visual e excesso de comandos permanentes
- a camada semântica complementa a convencional em vez de desorganizá-la

## 12. Critério Final

Se a IA falhar, o usuário ainda consegue concluir a tarefa integralmente pela camada convencional.