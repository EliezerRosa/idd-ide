# Princípios de Interface Semântica Ergonômica para o RVM

## Propósito

Este documento sintetiza princípios de desenho de produto e arquitetura de interface para orientar a evolução da aba Agente e das superfícies operacionais do RVM Designações.

Ele serve a três objetivos ao mesmo tempo:

1. transformar a visão do manifesto em critérios de implementação
2. organizar uma trilha de leitura e decisão para a equipe
3. oferecer base prática para um roadmap de UX orientado à intenção

## Base de Síntese

Esta síntese combina quatro fontes:

1. os documentos desta pasta, especialmente o manifesto técnico e a síntese sobre DDD, IA e IDD
2. o plano de melhorias do chat com slash commands, chips e ações pós-resposta
3. padrões estabelecidos de design para IA centrada no humano, especialmente o Google PAIR People + AI Guidebook
4. padrões modernos de navegação adaptativa e comandos contextuais, especialmente a orientação recente da Microsoft para NavigationView e CommandBarFlyout

## Leitura Estratégica do Tema

O ponto central não é adicionar um chat ao RVM.

O ponto central é redesenhar a linguagem de interação para que:

- a intenção vire entrada primária
- o domínio continue sendo a fronteira de verdade
- a interface diminua sem perder segurança
- a resposta visual seja mais operacional que textual

Em outras palavras, a ergonomia desejada não é apenas visual. Ela é semântica.

## Abordagens Modernas Relevantes

As abordagens mais úteis e recentes para este problema convergem em alguns padrões consistentes.

### 1. Mixed-Initiative Interfaces

Sistemas modernos de IA não devem operar nem como formulário rígido nem como chat totalmente solto. O melhor resultado costuma surgir em interação mista:

- o usuário expressa intenção
- o sistema propõe caminhos
- o usuário confirma, corrige ou completa lacunas
- a execução prossegue com visibilidade de impacto

Esse padrão é central para o RVM porque reduz atrito sem abrir mão de confirmação em tarefas sensíveis.

### 2. Progressive Disclosure de Comandos

Interfaces modernas expõem primeiro o mínimo necessário e revelam mais opções conforme contexto, permissão e foco da tarefa.

Isso aparece em:

- command palettes
- flyouts contextuais
- chips de ação
- menus secundários
- modais mínimos sob demanda

Para o RVM, isso significa evitar telas permanentes supercarregadas e preferir superfícies curtas, contextuais e descartáveis.

### 3. AI as Orchestrator, Not as Freeform Oracle

Boas interfaces com IA tratam o modelo como orquestrador restrito, não como fonte autônoma de verdade.

Na prática:

- a IA interpreta pedidos
- o domínio valida a ação
- serviços tipados executam
- a interface mostra resultado, justificativa e próximos passos

Esse padrão coincide diretamente com o manifesto: domínio antes da IA.

### 4. Contextual Commanding

Padrões atuais de UX valorizam ações próximas ao objeto de trabalho. Em vez de mandar o usuário procurar um comando num menu distante, o sistema traz os comandos mais úteis para perto do foco atual.

Exemplos:

- ao falar de uma semana, sugerir “Designar semana”, “Ver S-140”, “Exportar PDF”
- ao falar de um publicador, sugerir “Ver histórico”, “Ver disponibilidade”, “Abrir confirmação”
- ao detectar conflito, sugerir “Simular alternativa”, “Marcar pendência”, “Abrir microfluxo”

### 5. Adaptive Navigation

Interfaces recentes tratam navegação como estrutura adaptativa, não fixa.

O padrão mais robusto é:

- poucas categorias principais sempre visíveis
- profundidade pequena
- troca entre navegação expandida e compacta conforme espaço disponível
- preservação máxima da área de trabalho principal

Para o RVM, isso reforça a separação entre:

- navegação estrutural da camada 1
- comandos contextuais e semânticos da camada 2

### 6. Explainability in Action

Em produtos modernos com IA, a confiança não vem de longas explicações abstratas. Ela vem de explicações curtas, situadas e úteis.

Exemplo de padrão bom:

- “Sugeri estes nomes porque respeitam elegibilidade, equilíbrio recente e ausência de conflito.”

Exemplo de padrão ruim:

- respostas longas, genéricas, que explicam o modelo mas não a decisão operacional

No RVM, explicabilidade deve acompanhar a ação, não anteceder tudo nem desaparecer.

### 7. Preview Before Commit

Uma prática cada vez mais comum em fluxos agentic é separar:

- consulta
- preparação
- preview
- confirmação
- persistência

Isso conversa diretamente com a governança do manifesto e deve ser regra para ações mais sensíveis.

### 8. Undo e Recovery como Parte da UX

Sistemas orientados à intenção precisam ser seguros não só por prevenção, mas por reversibilidade e recuperação clara.

Logo, uma boa experiência semântica inclui:

- desfazer quando possível
- trilha de auditoria
- histórico da intenção recebida
- possibilidade de correção rápida sem recomeçar tudo

## Os 12 Princípios do RVM

### 1. Intenção Primeiro, Estrutura Depois

O usuário deve começar pela linguagem do objetivo, não pela mecânica da tela.

Pergunta norteadora:

- o fluxo começa pelo que a pessoa quer realizar ou pelo que o sistema quer coletar?

### 2. Domínio Sempre Intermedeia

A interface semântica nunca fala direto com persistência sensível.

Toda mutação relevante precisa passar por:

- intent classificada
- contexto delimitado
- validação de regras
- serviço ou RPC aprovado

### 3. Menos UI Fixa, Mais Micro-UI Contextual

O objetivo não é remover interface, mas torná-la episódica, curta e específica.

Boa regra:

- se faltam só dois dados, abrir um microformulário de dois campos
- não redirecionar para uma tela inteira de cadastro ou edição

### 4. Comandos Devem Ser Descobertos Sem Poluir

O sistema precisa equilibrar duas coisas:

- discoverability para usuários comuns
- velocidade para usuários experientes

Daí a combinação ideal:

- chips contextuais para descoberta
- slash commands para power users
- ações pós-resposta para continuidade

### 5. O Contexto Ativo Deve Ficar Visível

Toda conversa semântica precisa deixar claro qual é o foco atual.

Exemplos de contexto visível:

- semana em foco
- publicador em foco
- tipo de ação em andamento
- estágio do fluxo: consulta, preparação, confirmação ou execução

### 6. O Sistema Deve Fazer Perguntas Boas, Não Perguntar Tudo

Uma interface semântica ruim terceiriza todo o raciocínio para o usuário em forma de perguntas vagas.

Uma interface semântica boa pergunta apenas o que falta para destravar a ação.

### 7. A Resposta Deve Ser Mais Operacional do que Conversacional

Texto continua útil, mas o desfecho preferencial deve ser:

- quadro
- preview
- cartão de decisão
- S-140 renderizado
- modal de confirmação
- lista priorizada

### 8. Explicação Curta, Local e Relevante

Explicabilidade deve responder:

- por que esta opção apareceu
- que regra influenciou a decisão
- o que falta para concluir
- qual o impacto de confirmar

### 9. Permissão Não É Só Segurança, É Ergonomia

Se o usuário não pode executar algo, isso não deve aparecer como caminho principal.

Permissão precisa moldar:

- abas
- comandos
- chips
- sugestões
- ações do agente

Uma interface com menos opções irrelevantes é mais ergonômica e mais segura.

### 10. Persistência Exige Gradiente de Consentimento

Nem toda ação pede o mesmo nível de explicitação.

Escala recomendada:

- consulta: direta
- simulação: direta com critérios visíveis
- preparação: direta com preview
- confirmação guiada: consentimento explícito
- execução persistente: confirmação mais auditoria

### 11. Recuperação de Erro Deve Preservar o Contexto

Quando houver ambiguidade, falha ou bloqueio, o sistema não deve “zerar” a conversa.

Ele deve:

- explicar o impasse
- preservar entidades já reconhecidas
- pedir apenas a desambiguação necessária
- continuar do ponto certo

### 12. A Linguagem da Interface Deve Ser a Linguagem do Domínio

Os elementos da experiência precisam usar a linguagem ubíqua real:

- designação
- parte
- ajudante
- confirmação
- recusa
- pendência
- elegibilidade

Quanto menos tradução mental o usuário fizer, melhor a ergonomia.

## Tradução dos Princípios em Superfícies de Interface

### A. Input principal do Agente

Deve combinar:

- linguagem natural livre
- slash commands opcionais
- sugestões contextuais clicáveis

O input ideal não é só um campo de chat. Ele é uma barra de intenção.

### B. Chips acima do input

Devem operar como atalho semântico.

Função:

- ensinar o sistema ao usuário
- reduzir digitação
- sugerir próximos passos válidos
- refletir contexto e permissão

### C. Ações pós-resposta

Devem ser tratadas como continuidade do raciocínio, não como adereço visual.

Exemplos:

- aplicar
- editar
- simular outra opção
- exportar
- abrir comunicação
- desfazer

### D. Micro-UIs

Devem ser temporárias, focadas e orientadas à conclusão.

Boa prática:

- abrir modais curtos
- pré-preencher tudo que o sistema já sabe
- mostrar impacto antes de persistir

### E. Navegação geral

Precisa manter a camada 1 estável e previsível.

Logo:

- a interface convencional continua como fallback integral
- a camada semântica não deve romper navegação base
- o ganho da camada 2 está em reduzir navegação desnecessária, não em proibir a navegação existente

## Heurísticas de Qualidade para o RVM

Uma interface semântica do RVM está boa quando:

- o usuário entende rapidamente o que pode pedir
- o sistema responde com ações possíveis de verdade
- a conversa quase nunca pede dados já conhecidos
- as sugestões respeitam permissão e domínio
- o resultado final tende a preview, quadro ou ação concreta
- erros preservam contexto
- o usuário sente aceleração, não confusão

Uma interface semântica do RVM está ruim quando:

- a conversa parece um chatbot genérico
- a IA oferece caminhos impossíveis
- há excesso de texto e pouca materialização visual
- comandos úteis ficam escondidos demais
- o usuário precisa reexplicar tudo com frequência
- ações sensíveis persistem sem clareza suficiente

## Implicações Diretas para o Roadmap

### Curto Prazo

- consolidar a barra de intenção na aba Agente
- implementar ações pós-resposta
- introduzir chips contextuais guiados por permissão e contexto
- definir catálogo inicial de intents tipadas

### Médio Prazo

- adicionar slash commands com filtro por perfil
- introduzir contexto ativo visível na conversa
- abrir micro-UIs por intenção para confirmação, recusa e comunicação
- padronizar previews operacionais antes de persistência

### Longo Prazo

- reduzir dependência de navegação manual em tarefas recorrentes
- transformar respostas textuais em superfícies visuais reutilizáveis
- evoluir de chat assistido para coordenação semântica operacional

## Sequência Recomendada de Leitura e Implementação

1. Ler o manifesto para fixar as fronteiras e a tese central.
2. Ler a síntese DDD + IA + IDD para consolidar o enquadramento conceitual.
3. Usar este documento como filtro de implementação.
4. Cruzar com o roteiro de permissões para saber o que a interface pode expor a cada perfil.
5. Cruzar com o plano do chat para selecionar os primeiros componentes a construir.

## Referências de Apoio

As ideias deste documento dialogam especialmente com:

- Google PAIR, People + AI Guidebook: design patterns para produtos com IA, explicabilidade, expectativas, feedback e intervenção humana.
- Microsoft NavigationView guidance: navegação adaptativa, hierarquia rasa, preservação de área útil e visibilidade contextual.
- Microsoft CommandBarFlyout guidance: comandos contextuais primários e secundários, invocação proativa e reativa, progressive disclosure.
- Padrões recentes de produtos com IA entre 2024 e 2026: agentic workflows, mixed-initiative interaction, preview before commit, contextual actions, guardrails por permissão e superfícies multimodais.

## Afirmação de Fechamento

No RVM, ergonomia não é deixar a tela mais bonita. Ergonomia é reduzir a carga cognitiva necessária para transformar intenção legítima em operação correta.

Se a linguagem do pedido, as regras do domínio, as permissões e a resposta visual trabalharem como um só sistema, a interface deixa de ser um obstáculo e passa a ser uma extensão operacional da própria intenção.