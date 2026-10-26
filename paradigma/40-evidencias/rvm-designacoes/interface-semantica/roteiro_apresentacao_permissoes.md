# 🎙️ Roteiro de Narração — Sistema de Permissões RVM Designações

> **Duração estimada:** ~5 minutos  
> **Slides:** 7 (Excalidraw)  
> **Tom:** Profissional, claro, com exemplos práticos

---

## 🎬 Slide 1 — Título e Visão Geral
**[0:00 – 0:40]**

"Bem-vindos à apresentação do novo Sistema de Permissões do RVM Designações.

Este sistema foi desenhado para resolver uma necessidade real: controlar quem pode ver o quê, e quem pode fazer o quê, dentro da aplicação.

Com 7 políticas predefinidas, 23 ações controladas e 3 níveis de acesso a dados, conseguimos garantir que cada utilizador — seja Ancião, Servo Ministerial ou Publicador — tenha acesso apenas ao que precisa.

A administração é feita 100% pela interface, em tempo real, sem necessidade de alterar código."

---

## 🏗️ Slide 2 — Arquitetura em 3 Camadas
**[0:40 – 1:30]**

"A arquitetura do sistema tem 3 camadas bem definidas.

Na base, temos o Supabase com duas tabelas: permission_policies para as políticas gerais, e user_permission_overrides para exceções individuais. Ambas protegidas por Row Level Security.

No meio, o permissionService.ts faz a ponte — carrega as permissões, aplica cache de 5 minutos, e resolve conflitos por prioridade. Se existe um override para o utilizador, esse vence. Senão, procura a política mais específica.

No topo, o hook usePermissions expõe tudo ao React: accessLevel, canPerformAction, e permissionGate. Este hook alimenta 4 consumidores: o App.tsx para controlar as abas, o agentService para injetar permissões no prompt, o agentActionService para bloquear ações, e o PermissionManager para a interface de administração."

---

## 📊 Slide 3 — Matriz de 7 Políticas Seed
**[1:30 – 2:30]**

"Vejamos as 7 políticas que vêm pré-configuradas.

No topo da hierarquia, com prioridade 10, temos três políticas de Anciãos: o Ancião geral com acesso total e dados sensíveis, o Ancião Supervisor de RVM com as mesmas permissões focadas na supervisão, e o Ancião Coordenador igualmente com acesso completo.

A seguir, com prioridade 8, temos o Servo Ministerial com privilégio de Ajudante do Supervisor de RVM — acesso a 17 ações, dados filtrados, sem acesso a dados sensíveis.

Depois, com prioridade 5, o Ancião com privilégio de Ajudante — mantendo acesso total mas numa configuração específica.

Com prioridade 3, o Servo Ministerial geral — acesso a 14 ações básicas de leitura.

E finalmente, com prioridade 1, o Publicador — apenas 7 ações de leitura, acesso restrito aos seus próprios dados.

A beleza do sistema é que estas 7 políticas cobrem todos os cenários reais de uma congregação, mas podem ser ajustadas a qualquer momento."

---

## 🚪 Slide 4 — Tab Gating
**[2:30 – 3:15]**

"O Tab Gating controla quais abas cada utilizador vê.

Vejam as 8 abas: Designações, Publicadores, Histórico, Agente IA, S-140, Apostila, PDF Pauta, e Admin.

O Ancião vê todas. O Servo Ministerial vê 6 — não tem acesso a Publicadores nem a Admin. O Publicador vê apenas 2 — o Agente IA com ações limitadas e a Apostila.

O fluxo é simples: quando o utilizador faz login, o usePermissions carrega o accessLevel do Supabase. O App.tsx verifica esse nível para cada aba e oculta as que não são permitidas. O resultado: uma interface limpa onde cada um vê apenas o que pode usar.

Note que a aba Admin só aparece para Anciãos — é ali que se gerem políticas e overrides."

---

## 🤖 Slide 5 — Agent Actions
**[3:15 – 4:00]**

"O controle do Agente IA é talvez a parte mais interessante, porque usa dupla verificação.

Primeiro: quando o utilizador abre o chat, o agentService injeta no system prompt a lista de ações permitidas. Ou seja, o próprio modelo de IA já sabe o que pode e não pode fazer.

Segundo: mesmo que o modelo tente executar uma ação não permitida, o executeAction no agentActionService verifica a whitelist antes de executar. Se a ação não está na lista, é bloqueada com uma mensagem clara.

Por exemplo: se um Publicador pedir 'criar designação para o João', o agente responde que não tem permissão. Mas se um Ancião fizer o mesmo pedido, a designação é criada.

São 23 ações controladas no total — desde criar designações até gerir permissões e fazer backup."

---

## ⚙️ Slide 6 — Admin UI
**[4:00 – 4:40]**

"A interface de administração tem dois painéis.

À esquerda, o painel de Políticas: CRUD completo para criar, editar e excluir políticas. Cada política define a função, o privilégio, as ações permitidas, o nível de acesso a dados e se pode ver dados sensíveis. Qualquer alteração surte efeito imediato.

À direita, o painel de Overrides: permite criar exceções individuais. Por exemplo, dar acesso a dados sensíveis a um SM específico, ou retirar o acesso ao agente a um Ancião temporariamente. O override sempre tem prioridade sobre a política base.

A ordem de resolução é: primeiro override do utilizador, depois política por função mais privilégio, depois política só por função, e por último nenhum acesso."

---

## 🎭 Slide 7 — Cenários Reais
**[4:40 – 5:20]**

"Para finalizar, três cenários reais.

O Irmão António, Ancião e Supervisor de RVM, faz login e vê todas as 8 abas, pode executar 22 ações, acessa dados sensíveis, e gere permissões na Admin. Controle total.

O Irmão Carlos, Servo Ministerial e Ajudante do Supervisor, vê 6 abas, executa 17 ações, sem acesso a dados sensíveis nem à Admin. Acesso operacional focado.

A Irmã Maria, Publicadora, vê apenas 2 abas, executa 7 ações de leitura, interface limpa e simples. Cada um vê o que pode.

O sistema está pronto para produção, no commit 631c41c, com toda a segurança a nível de base de dados via RLS, e configurável em tempo real pelo Ancião na aba Admin."

---

## 📝 Notas para Gravação

- **Velocidade:** Falar a ~150 palavras/minuto
- **Pausas:** 2 segundos entre slides para transição
- **Tom:** Confiante e explicativo, como numa demonstração para anciãos
- **Ferramenta de gravação sugerida:** OBS Studio, ou gravar directamente no PowerPoint
- **Para gerar voz por IA:** Usar ElevenLabs (pt-PT) ou Azure TTS (pt-PT)