# Plano-Manifesto-Paradigma: O Desenvolvimento Orientado por Intenção no RVM Designações

> **"O gargalo já não é escrever código. É expressar intenção com clareza suficiente para que sistemas autônomos executem corretamente em escala."** — Vishal Mysore, 2026

> **"Agentes de IA não precisam de instruções mais precisas. Precisam de mais contexto e mais liberdade."** — Manuel Klein, SQUER, 2026

> **"A Linguagem Ubíqua não deve apenas documentar o software — deve conduzi-lo."** — Manifesto Técnico RVM Designações, 2026

---

## Índice

1. [Preâmbulo: Genealogia de uma Convergência](#1-preâmbulo-genealogia-de-uma-convergência)
2. [O Paradigma: Desenvolvimento Orientado por Intenção (IDD)](#2-o-paradigma-desenvolvimento-orientado-por-intenção-idd)
3. [Correntes Convergentes: Estado da Arte em 2026](#3-correntes-convergentes-estado-da-arte-em-2026)
4. [Fundamentos Filosóficos e Científicos](#4-fundamentos-filosóficos-e-científicos)
5. [A Tese do RVM Designações: Síntese Autoral](#5-a-tese-do-rvm-designações-síntese-autoral)
6. [O que Já Está Implementado](#6-o-que-já-está-implementado)
7. [O que Falta Implementar: Roadmap de Profundidade](#7-o-que-falta-implementar-roadmap-de-profundidade)
8. [Proposta de Implementação: Plano Executivo](#8-proposta-de-implementação-plano-executivo)
9. [Métricas de Sucesso e Critérios de Maturidade](#9-métricas-de-sucesso-e-critérios-de-maturidade)
10. [Referências Bibliográficas e Fontes](#10-referências-bibliográficas-e-fontes)

---

## 1. Preâmbulo: Genealogia de uma Convergência

### 1.1 — A Árvore Horizontal da Abstração

A história da computação é uma escalada contínua de abstração:

```
Nível 0 │ Microprogramação (hardware direto)
Nível 1 │ Código de Máquina (opcodes binários)
Nível 2 │ Assembly (mnemônicos simbólicos)
Nível 3 │ Linguagens Compiladas (Fortran, C, Cobol)
Nível 4 │ Linguagens de Alto Nível / OO (Java, C#, Python)
Nível 5 │ Frameworks / Cloud / Serverless
Nível 6 │ IA + Linguagem Natural (o topo atual)
```

Cada nível eliminou uma classe de esforço cognitivo. O Nível 6 — onde nos encontramos — elimina a necessidade de pensar na **sintaxe da execução** e eleva o operador ao nível da **semântica da intenção**.

### 1.2 — A Árvore Vertical de Classes (Classificação Taxonômica)

```
Raiz: Transformador de Informação
├── Controle Físico (hardware, sinais, microprogramação)
├── Representação Simbólica (assembly, compiladores, tipos)
├── Execução Automatizada (frameworks, orquestração, CI/CD)
└── Composição/Colaboração via IA/Linguagem Natural ← NÍVEL ATUAL
    ├── Vibe Coding (execução intuitiva sem compreensão)
    ├── AI-Assisted Development (copilots, autocompleção)
    ├── Spec-Driven Development (especificação formal → agentes)
    └── Intent-Driven Development (intenção → contexto → agentes)  ← PARADIGMA
```

### 1.3 — A Genealogia do Autor

O paradigma não emerge do vácuo. A trajetória do autor atravessa:

- **1976**: IBM, RPG II, Cobol — convivência com a distância brutal entre intenção e execução
- **Anos 80-90**: Administração de Dados, normalização, dicionários semânticos
- **SIM (Semantic Information Manager)**: Projeto Unisys (1983–1990s), com Hammer & McLeod (MIT), tentou incorporar semântica de negócio diretamente no schema do banco — a primeira tentativa séria de eliminar a impedância cognitiva
- **IA Simbólica**: Pesquisa com lógica de predicados implementada em Cobol — uma ponte improvável entre formalismo lógico e linguagem de negócio
- **Disseminação do Paradigma OO**: Experiência de traduzir conceitos abstratos (herança, polimorfismo, encapsulamento) para audiências empresariais
- **DDD (Domain-Driven Design)**: Evans, 2003 — a disciplina que formalizou a ponte entre domínio e código
- **2026**: RVM Designações — convergência de todas essas linhas em um sistema operacional real

---

## 2. O Paradigma: Desenvolvimento Orientado por Intenção (IDD)

### 2.1 — Definição Canônica

**Intent-Driven Development (IDD)** é uma metodologia de desenvolvimento de software na qual humanos definem **o que deve existir** e **por que importa**, enquanto sistemas autônomos de agentes determinam **como** e **quando** é construído.

Em metodologias anteriores — Waterfall, Agile, DevOps — humanos eram os executores primários. O processo existia para coordenar trabalho humano. O IDD assume que a **execução é delegada a agentes autônomos**. A coordenação muda de processo humano para orquestração de máquina. O que permanece exclusivamente humano é a **intenção**.

### 2.2 — Os Três Princípios Fundamentais

#### Princípio 1: A Intenção é o Artefato Primário Humano

Em vez de histórias de usuário, tarefas ou planos de sprint, humanos expressam:
- O **resultado desejado**
- A **razão** pela qual importa
- As **restrições** e **guardrails**

A intenção deve ser precisa o suficiente para que sistemas autônomos possam planejar e executar o trabalho.

#### Princípio 2: Documentação é Gerada, não Autorada

Agentes produzem o rastro de execução:
- Decisões de design
- Mudanças de código
- Testes
- Histórico de deployment

Humanos revisam esse registro assincronamente, em vez de produzir documentação antes do trabalho começar.

#### Princípio 3: Humanos Supervisionam em vez de Executar

O envolvimento humano concentra-se em dois pontos:
- **A montante (upstream)**: definir objetivos, restrições e prioridades
- **A jusante (downstream)**: validar que o resultado corresponde à intenção original

Tudo entre — planejamento, codificação, teste e deploy — é tratado por agentes.

### 2.3 — A Anatomia de uma Intenção

Conforme proposto por Exadra37 (IDD Guidelines):

| Seção | Conteúdo | Pergunta-Guia |
|-------|----------|---------------|
| **WHY** | Motivação, contexto de negócio, dor atual | *Por que isso precisa existir?* |
| **WHAT** | Requisitos em linguagem Gherkin (Given-When-Then) | *O que deve acontecer?* |
| **HOW** | Plano de tarefas passo a passo, numerado | *Quais são os passos concretos?* |

Conforme expandido pelo meta-modelo do RVM (Grok conversation):

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `what` | string | "Designar participantes para a semana 2026-02-09" |
| `why` | string | "Manter continuidade do programa sem falhas de cobertura" |
| `who` | entityRef | publisher UUID ou grupo |
| `when` | temporalRef | weekId "2026-02-09" |
| `where` | boundedContext | "workbook-management" |
| `successCriteria` | string[] | ["Todas as partes atribuídas", "Nenhuma repetição consecutiva"] |
| `constraints` | string[] | ["Respeitar cooldowns", "Não duplicar orador no mesmo dia"] |

### 2.4 — Mudança de Pergunta Fundamental

| Paradigma Anterior | IDD |
|--------------------|-----|
| "Como devemos construir isso?" | "Que resultado queremos, e que restrições devem valer?" |
| Humano planeja + executa + documenta | Humano expressa intenção + valida resultado |
| Especificação → Tarefa → Código → Teste | Intenção → Contexto → Agentes → Validação |

---

## 3. Correntes Convergentes: Estado da Arte em 2026

### 3.1 — Exadra37: AI Intent-Driven Development (Guidelines)

**Fonte**: github.com/Exadra37/ai-intent-driven-development

O projeto mais estruturado de guidelines para IDD. Propõe:

- **Intent Specification**: documento autocontido com WHY, WHAT (Gherkin), HOW (tarefas numeradas)
- **Domain-Resource-Action Architecture**: padrão que organiza lógica de negócio em Domínios → Recursos → Ações, cada Ação como módulo autocontido
- **Development Workflow**: ciclos de planning → intent creation → task execution, tudo mediado por AI agent
- **Inspiração**: Intent Steel Thread (Matthew Sinclair), Kevin Hoffman (Akka workflows), Phoenix Framework (code generators)

**Relevância para o RVM**: O `agentIntentCatalog.ts` do nosso código é uma implementação direta deste conceito — cada `AgentIntentContract` é uma Intent Specification tipada com `intentId`, `discoveryGate`, `prepare`, `preview`, `commit`, `recovery`.

### 3.2 — SQUER: O Intent Engineer

**Fonte**: squer.io/blog/why-we-created-the-intent-engineer

A contribuição mais organizacional ao paradigma. Definições-chave:

- **Intent Engineer**: novo papel que vive **no departamento de negócio**, não em TI. Fala a linguagem do domínio. Extrai a intenção por trás do que stakeholders querem.
- **Focused Impact Pair**: Intent Engineer + Systems Engineer + AI Agents = substitui equipes de entrega tradicionais
- **Documento de Intenção com 11 campos**: business context, current state, target state, success criteria, constraints, domain knowledge, stakeholders, dependencies, priority
- **5 métodos de descoberta**: intent interviews, process shadowing, domain mapping, data-driven discovery, reverse discovery
- **Insight central**: "AI agents don't need more precise instructions. They need more context and more freedom."
- **Pipeline**: Intent → Spec → Code (complementar ao GitHub spec-kit)

**Relevância para o RVM**: O `useTemporalChatSemanticContext.ts` implementa exatamente a descoberta de contexto automática — detecta publisher em foco, tópico da conversa, semana ativa, permissões, e injeta tudo isso no agente. A filosofia de "mais contexto, mais liberdade" é o princípio de design do nosso `agentService.ts`.

### 3.3 — Vishal Mysore: IDD Canônico

**Fonte**: medium.com/@visrow/what-is-intent-driven-development

Define os três princípios formais (seção 2.2 acima). Contribuições adicionais:

- **"A nova habilidade escassa"**: não é velocidade de codificação, é a capacidade de expressar intenção com clareza e restrições suficientes
- **Exemplo de fluxo**: Planning Agent → Build Agents → Test Agents → Validation Agent → Human Review
- **BMAD-METHOD**: Breakthrough Method of Agile AI-Driven Development — framework de 12+ agentes especializados (PM, Architect, Developer, UX, etc.) com workflows adaptativos à complexidade do projeto
- **Spec-Driven Development**: complementar ao IDD — specs formais como intermediário entre intenção e código

**Relevância para o RVM**: Nosso `agentActionService.ts` com 29 action types é o equivalente operacional dos "Build Agents" — agentes especializados que executam tarefas tipadas dentro de bounded contexts.

### 3.4 — BMAD-METHOD (BMad Code)

**Fonte**: github.com/bmad-code-org/BMAD-METHOD (45.2k stars, 135 contributors)

Framework completo para desenvolvimento AI-driven:

- **Build More Architect Dreams**: agentes como colaboradores especializados que guiam pensamento estruturado
- **Scale-Domain-Adaptive**: ajusta profundidade de planejamento automaticamente por complexidade
- **12+ agentes especializados**: PM, Architect, Developer, UX, Designer, QA...
- **Party Mode**: múltiplos agentes em uma sessão, colaborando e discutindo
- **Lifecycle completo**: brainstorming → planning → architecture → implementation → deployment
- **Módulos**: Core (34+ workflows), Builder (custom agents), Test Architect (risk-based), Game Dev, Creative Intelligence

**Relevância para o RVM**: Demonstra viabilidade de sistemas multi-agente coordenados. Nosso caminho futuro inclui conversação como orquestração de múltiplos domínios — o BMAD é prova de conceito em escala.

### 3.5 — Vibe Coding: O Antípoda Necessário

**Fonte**: arXiv:2510.00328 (Grey Literature Review, 101 fontes, 518 relatos)

Estudo acadêmico que documenta o **outro extremo do espectro**:

- **Definição**: prática onde usuários dependem de ferramentas de geração de código por intuição e tentativa-e-erro, sem necessariamente compreender o código subjacente
- **Paradoxo velocidade-qualidade**: motivados por velocidade e acessibilidade, "sucesso instantâneo e flow", mas código percebido como "rápido mas falho"
- **QA negligenciado**: muitos pulam testes, confiam na saída da IA sem modificação, ou delegam verificação de volta à IA
- **"Nova classe de desenvolvedores vulneráveis"**: conseguem construir mas não conseguem debugar

**Relevância para o RVM**: O Vibe Coding é o *aviso*. O IDD é a *resposta*. Onde o Vibe Coding diz "confie na IA e vá", o IDD diz "expresse a intenção com precisão, contextualize o domínio, valide o resultado". O RVM implementa exatamente essa distinção: o agente não é um oráculo livre — é um **intérprete de intenções dentro de um domínio restrito**, com permissões, contratos tipados, e visualização antes do commit.

---

## 4. Fundamentos Filosóficos e Científicos

### 4.1 — A Linhagem Intelectual

O paradigma de interface semântica repousa sobre ombros de gigantes:

| Pensador | Contribuição | Conexão com IDD |
|----------|-------------|-----------------|
| **Gottlob Frege** (1892) | Distinção entre *Sinn* (sentido) e *Bedeutung* (referência) | A interface trabalha com o sentido (intenção do usuário), não com a referência direta (ID no banco) |
| **Ludwig Wittgenstein** (1953) | "O significado de uma palavra é seu uso na linguagem" | A Linguagem Ubíqua ganha significado pelo uso no domínio — não por definição estática |
| **Eleanor Rosch** (1973) | Teoria dos Protótipos — categorias com membros mais/menos típicos | Chips e comandos são protótipos de ações no domínio — o mais frequente é o mais visível |
| **Marvin Minsky** (1975) | Frames — estruturas de conhecimento com slots e defaults | Contratos de intenção (`AgentIntentContract`) são frames com slots (`prepare`, `preview`, `commit`, `recovery`) |
| **Roger Schank** (1977) | Scripts — sequências estereotipadas de eventos | O fluxo de 7 passos do Documento-Mestre é um script cognitivo: intenção → ancoragem → restrição → resposta → complemento → execução → continuidade |

### 4.2 — A Impedância Cognitiva

Conceito central do PDF sobre SIM e Interfaces Inteligentes:

> A impedância cognitiva é a diferença entre o modelo mental do usuário e o modelo de dados do sistema. Quanto maior a impedância, maior o esforço mental para traduzir intenção em ação.

**Três camadas para eliminá-la**:
1. **Modelo Semântico de Domínio** — o próprio domínio, formalizado (ontologia, axiologia, deontologia, epistemologia)
2. **Modelo de Usuário/Contexto** — quem é o operador, o que sabe, o que pode
3. **Camada de Mediação Inteligente** — LLM como tradutor bidirecional entre linguagem natural e modelo formal

**Arquitetura resultante**:
```
Usuário + Perfil + Contexto
        │
        ▼
   LLM Intérprete ←→ Modelo Semântico de Domínio
        │
        ▼
   Geração Dinâmica de Interface
        │
        ▼
      Backend (Serviços de Domínio)
```

### 4.3 — O Modelo de Domínio como Teoria

O PDF sobre Camadas de Abstração propõe que um modelo de domínio é, na verdade, uma **teoria** com quatro dimensões:

| Dimensão | Pergunta | No RVM Designações |
|----------|----------|-------------------|
| **Ontologia** | O que existe? | Publishers, WorkbookParts, Weeks, Batches, LocalNeeds |
| **Axiologia** | O que tem valor? | Rotação justa, cobertura completa, respeito a preferências |
| **Deontologia** | O que é permitido/proibido? | Cooldowns, elegibilidade, permissões por papel, Onda 3 bloqueios |
| **Epistemologia** | Como sabemos? | Histórico de participações, scores de rotação, analytics, audit trail |

### 4.4 — O LLM como Compilador de Intenções

A tese central que unifica tudo:

> Em linguagens de programação convencionais, um compilador traduz de uma linguagem formal (código) para outra (binário). No IDD, o LLM traduz de uma linguagem informal (intenção humana) para uma linguagem formal (ações tipadas no domínio).

O `agentService.ts` do RVM é, literalmente, um **compilador de intenções**: recebe texto em linguagem natural, contextualiza com permissões e estado, e emite blocos JSON de ações tipadas (`GENERATE_WEEK`, `ASSIGN_PART`, `APPROVE_PROPOSAL`...) que o `agentActionService.ts` executa como uma máquina virtual de domínio.

---

## 5. A Tese do RVM Designações: Síntese Autoral

### 5.1 — Duas Camadas Complementares

O RVM Designações opera com um modelo de **duas camadas** que não se exclui, mas se complementa:

**Camada 1 — Interface Convencional (UI Direta)**
- Tabs, modais, formulários, tabelas
- Operação direta, fallback quando o agente falha
- Treinamento e familiarização
- Tabs: Workbook, Aprovações, Publicadores, Comunicação, S-140

**Camada 2 — Interface Intencional (Zero UI Progressiva)**
- Linguagem natural → ação mediada pelo domínio → resposta visual operacional
- O tab "Agente" como **portal semântico**
- Chips contextuais, slash commands, post-response actions
- S-140 como resposta visual (não texto)
- Micro-UIs como fluxos de duas fases (prepare → preview → commit)

**Regra de Ouro**: Se a IA falhar, o usuário pode completar a tarefa pela Camada 1.

### 5.2 — Ergonomia Semântica

Definição autoral:

> **Ergonomia Semântica** = reduzir o esforço mental necessário para transformar uma intenção válida em uma ação correta.

Implementada através de:
- **Chips contextuais**: aparecem apenas quando fazem sentido (permissão + contexto + tópico)
- **Slash commands filtrados**: `/` abre catálogo, mas cada comando verifica `canExecute()`
- **Post-response actions**: continuidade sem restart (copiar, refinar, desfazer, aplicar)
- **IntentContextBar**: mostra ao usuário *onde ele está* semanticamente (semana, perfil, tópico, fase)
- **Discovery filter**: se o perfil não pode executar, a ação **não aparece** (nunca desabilitada — invisível)

### 5.3 — O Fluxo de 7 Passos

Rotina de interação que implementa o paradigma:

```
1. FORMULAÇÃO DA INTENÇÃO
   └── Usuário fala/digita naturalmente ou usa chip/slash

2. ANCORAGEM CONTEXTUAL
   └── Sistema identifica: semana, entidades, perfil, permissões, bounded context

3. RESTRIÇÃO DE DOMÍNIO
   └── Elegibilidade, regras de negócio, histórico, governança de risco limitam ações possíveis

4. RESPOSTA INICIAL
   └── Consulta, simulação, preview, proposta de ação, ou pedido mínimo de dados

5. COMPLEMENTO HUMANO
   └── Sistema pede apenas o que falta, idealmente via micro-UI (não formulário genérico)

6. EXECUÇÃO E MATERIALIZAÇÃO
   └── Ação via serviços aprovados, resultado como S-140/lista/card/modal/confirmação

7. CONTINUIDADE
   └── Post-response actions, nova intenção no mesmo contexto, sem restart
```

### 5.4 — A Missão

> O RVM Designações é um **sistema semântico de coordenação congregacional**. Não é um CRUD com chat — é uma **interface intencional** onde o domínio da organização de reuniões e designações é operado por intenção, limitado por permissões, materializado como documentos visuais (S-140), e governado por regras de rotação e equidade.

---

## 6. O que Já Está Implementado

### 6.1 — Mapa de Maturidade

| Conceito do Paradigma | Documentação | Código | Status |
|----------------------|-------------|--------|--------|
| Arquitetura de duas camadas | Manifesto | Layer 1 tabs + Layer 2 Agent tab | ✅ **Operacional** |
| Intenção como input primário | Documento-Mestre, Princípios | agentService system prompt, chips, slash | ✅ **Operacional** |
| Descoberta gatilhada por permissão | Catálogo, Matriz | permissionService, 4-filter model | ✅ **Operacional** |
| Contratos tipados de intenção | Catálogo, Matriz | agentIntentCatalog.ts (9 contratos Wave 1) | ✅ **Operacional** |
| Chips contextuais | Plano Melhorias, Sprint 1 | useTemporalChatSemanticControls.ts | ✅ **Operacional** |
| Slash commands | Sprint 2 | useTemporalChatSemanticControls.ts | ✅ **Operacional** |
| Post-response actions | Sprint 0 | PostResponseActions.tsx | ✅ **Operacional** |
| Intent context bar | Roadmap Fase 1, Sprint 0 | IntentContextBar.tsx | ✅ **Operacional** |
| Detecção semântica de contexto | Princípios (Mixed-Initiative) | useTemporalChatSemanticContext.ts | ✅ **Operacional** |
| S-140 como resposta visual | Manifesto ("elemento mais maduro") | S140PreviewCarousel + s140GeneratorUnified | ✅ **Operacional** |
| Boundaries de serviço de domínio | Endurecimento Onda 3 | workbookManagement/LifecycleServiceCore (DI) | ✅ **Operacional** |
| Executor de 29 tipos de ação | — | agentActionService.ts | ✅ **Operacional** |
| Permissões com 7 seed policies | — | permissionService.ts + Supabase RLS | ✅ **Operacional** |
| Micro-UI two-phase flows | Catálogo Type B/C | Approval, Rejection, Availability | ⚠️ **Parcial** |
| Topic tracking conversacional | Roadmap Fase 5, Sprint 3 | activeTopic existe, useChatContext() pendente | 🔲 **Planejado** |
| Reimport com diff semântico | Onda 3 | Não implementado | 🔒 **Bloqueado** |
| Merge de publicadores | Onda 3 | Não implementado | 🔒 **Bloqueado** |
| Rename com propagação atômica | Onda 3 | Existe mas não atômico | ⚠️ **Precisa hardening** |

### 6.2 — Arquitetura Atual (Diagrama de Fluxo)

```
INTENÇÃO DO USUÁRIO (texto / slash / chip)
       │
       ▼
┌───────────────────────────────────────────┐
│  IntentContextBar.tsx                     │ ← Mostra: semana, perfil, tópico, fase
│  useTemporalChatSemanticContext.ts        │ ← Detecta: publisher em foco, triggers de micro-UI
│  useTemporalChatSemanticControls.ts       │ ← Produz: chips, slash commands, post-actions
└────────────────┬──────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────┐
│  agentService.ts                          │ ← System prompt com permissões + contexto + regras
│  (Gemini LLM + contextBuilder.ts)        │ ← Interpreta intenção → JSON actions
└────────────────┬──────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────┐
│  agentActionService.ts                    │ ← Detecta blocos JSON de ação
│  ┌──── Permission Gate ────┐              │ ← canAgentAction() antes de cada execução
│  │  permissionService.ts   │              │
│  │  usePermissions.ts      │              │
│  └─────────────────────────┘              │
│  agentIntentCatalog.ts                    │ ← 9 contratos tipados (Wave 1)
│  29 AgentActionTypes                      │ ← Taxonomia completa
└────────────────┬──────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────┐
│  SERVIÇOS DE DOMÍNIO (15+)               │
│  ┌─────────────────────────────────────┐  │
│  │ workbookLifecycleService            │  │ ← approve, reject, complete
│  │ workbookManagementService           │  │ ← clear, reset, reimport
│  │ generationService                   │  │ ← auto-designar semana
│  │ unifiedRotationService              │  │ ← ranking, scoring
│  │ eligibilityService                  │  │ ← validação de regras
│  │ communicationService                │  │ ← S-89, S-140 dispatch
│  │ publisherMutationService            │  │ ← CRUD de publicadores
│  │ publisherAvailabilityService        │  │ ← gestão de disponibilidade
│  │ undoService                         │  │ ← pilha de reversão
│  │ auditService                        │  │ ← rastreabilidade
│  │ engineConfigService                 │  │ ← regras de rotação
│  │ specialEventManagementService       │  │ ← eventos especiais
│  │ localNeedsService                   │  │ ← necessidades locais
│  │ participationAnalyticsService       │  │ ← estatísticas
│  │ dataDiscoveryService                │  │ ← queries dinâmicas
│  └─────────────────────────────────────┘  │
└────────────────┬──────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────┐
│  RESPOSTA VISUAL                          │
│  S140PreviewCarousel.tsx                  │ ← Documento de domínio como output visual
│  ChatMessageBubble.tsx                    │ ← Markdown tables, explicações
│  PostResponseActions.tsx                  │ ← Ações de continuidade
│  AgentModalHost.tsx                       │ ← Modais micro-UI
│  ApprovalMicroUi / AvailabilityMicroUi   │ ← Fluxos two-phase
└───────────────────────────────────────────┘
```

### 6.3 — Números Concretos

- **29** tipos de ação no executor (`AgentActionType`)
- **9** contratos tipados de intenção Wave 1 (`WAVE_ONE_INTENTS`)
- **15+** serviços de domínio orquestrados
- **7** seed policies de permissão
- **4** filtros de segurança por micro-UI (discovery, visibility, execution, channel)
- **4** tipos de transação (A: single-step, B: two-phase, C: impact-preview, D: staged-communication)
- **12** dimensões no checklist UX do agente
- **14** documentos de paradigma no `.docs/interface-semantica-ergonomica-intuitiva/`

---

## 7. O que Falta Implementar: Roadmap de Profundidade

### 7.1 — Fase Imediata (Sprints 3-4): Contexto Conversacional

**Objetivo**: O agente deve manter consciência do fluxo da conversa — não apenas do último prompt.

| Item | Descrição | Impacto |
|------|-----------|---------|
| `useChatContext()` hook | Rastreia tópico ativo, entidades mencionadas, ações executadas | Alto |
| Entity focus persistence | Manter publisher/week em foco ao longo da conversa | Alto |
| Topic transition detection | Detectar quando o usuário muda de assunto | Médio |
| Conversation summary injection | Resumo contextual no system prompt para conversas longas | Médio |

### 7.2 — Fase Intermediária (Sprints 5-8): Micro-UIs Wave 2+3

**Objetivo**: Expandir os 9 contratos Wave 1 para cobrir todo o catálogo.

| Wave | Micro-UIs | Pré-requisito |
|------|-----------|---------------|
| Wave 2 | Engine config preview, batch operations, import review, analytics dashboard | Serviços existentes com preview |
| Wave 3 | Publisher merge, rename+propagation, reimport com diff, comparative engine rules | Endurecimento de domínio (boundaries transacionais) |

### 7.3 — Fase Avançada: Inteligência Emergente

| Item | Descrição | Tipo |
|------|-----------|------|
| **Sugestões proativas** | Agente detecta padrões (ex: "3 semanas sem designação para X") e sugere | Emergente |
| **Cadeia de intenções** | Uma intenção gera sub-intenções (ex: "Preparar próximo mês" → importar + designar + aprovar) | Orquestração |
| **Modo multimodal** | Voz como input (Web Speech API → texto → intenção) | Acessibilidade |
| **Auditoria semântica** | "Por que Carlos foi escolhido?" → explicação com fatores de rotação | Transparência |
| **Simulação comparativa** | "E se eu mudar o cooldown de 3 para 5 semanas?" → before/after visual | Governança |

---

## 8. Proposta de Implementação: Plano Executivo

### 8.1 — Princípios de Execução

1. **Incremental, não revolucionário**: cada sprint entrega valor operacional
2. **Regra de Ouro preservada**: Camada 1 nunca degradada — sempre funcional como fallback
3. **Contrato antes do código**: cada micro-UI tem `AgentIntentContract` antes da implementação
4. **Permission-first**: nenhuma feature escapa do 4-filter model
5. **Teste de regressão semântica**: cada sprint valida que intenções anteriores ainda funcionam

### 8.2 — Cronograma de Ondas

```
ONDA 1 (✅ IMPLEMENTADA)
├── IntentContextBar
├── PostResponseActions
├── ChatActionChips (9 chips contextuais)
├── Slash Commands (/gerar, /aprovar, /s140, etc.)
├── 9 AgentIntentContracts Wave 1
└── 29 AgentActionTypes no executor

ONDA 2 (EM PROGRESSO → próximos sprints)
├── useChatContext() — contexto conversacional completo
├── Topic tracking com transição
├── Micro-UIs Wave 2 (engine config, batch, analytics)
├── Preview before commit para todos os Type C
└── Conversation summary injection

ONDA 3 (PLANEJADA → requer hardening)
├── Publisher merge service
├── Rename com propagação atômica
├── Reimport com diff semântico (before/after)
├── Comparative engine rules simulation
├── Batch resignation/inactivation com cascade preview

ONDA 4 (VISÃO)
├── Sugestões proativas baseadas em padrões
├── Cadeia de intenções (macro-intents)
├── Input multimodal (voz + texto)
├── Auditoria semântica interativa
├── Dashboard de saúde do paradigma (métricas de uso intent vs. direct)
```

---

## 9. Métricas de Sucesso e Critérios de Maturidade

### 9.1 — Métricas Operacionais

| Métrica | Definição | Meta |
|---------|-----------|------|
| **Taxa de Resolução por Intenção** | % de tarefas completadas via Camada 2 (agente) | > 70% |
| **Tempo Médio de Resolução** | Tempo desde a expressão da intenção até o resultado materializado | < 30s para ações simples |
| **Taxa de Fallback** | % de vezes que o usuário precisa ir para Camada 1 após tentar Camada 2 | < 20% |
| **Cobertura de Contratos** | % das ações do domínio com `AgentIntentContract` tipado | > 80% |
| **Zero Dead Ends** | % de interações que terminam com post-response action disponível | 100% |

### 9.2 — Modelo de Maturidade do Paradigma

```
Nível 1 — REATIVO
  O agente responde a comandos explícitos.
  ✅ Implementado (29 action types)

Nível 2 — CONTEXTUAL
  O agente considera permissões, semana, perfil, tópico.
  ✅ Implementado (IntentContextBar, SemanticContext)

Nível 3 — ANTECIPATÓRIO
  O agente sugere ações baseado em padrões observados.
  🔲 Planejado (Onda 4)

Nível 4 — ORQUESTRADOR
  O agente decompõe macro-intenções em cadeias de sub-ações.
  🔲 Visão (macro-intents)

Nível 5 — AUTÔNOMO SUPERVISIONADO
  O agente executa rotinas periódicas com validação humana assíncrona.
  🔲 Visão futura
```

---

## 10. Referências Bibliográficas e Fontes

### Fontes Primárias do Paradigma

1. **Exadra37**. *AI Intent Driven Development (IDD)*. GitHub, 2025-2026. https://github.com/Exadra37/ai-intent-driven-development
2. **Klein, Manuel**. "Why We Created the Intent Engineer". SQUER Blog, 2026. https://www.squer.io/blog/why-we-created-the-intent-engineer
3. **Mysore, Vishal**. "What is Intent Driven Development?". Medium, Mar 2026. https://medium.com/@visrow/what-is-intent-driven-development-ffacc3bcfe65
4. **BMad Code**. *BMAD-METHOD: Breakthrough Method for Agile AI Driven Development*. GitHub, 2025-2026. https://github.com/bmad-code-org/BMAD-METHOD
5. **Fawzy, A.; Tahir, A.; Blincoe, K.** "Vibe Coding in Practice: Motivations, Challenges, and a Future Outlook". arXiv:2510.00328, 2025.

### Fontes Filosóficas e Científicas

6. **Frege, Gottlob**. "Über Sinn und Bedeutung" (Sobre Sentido e Referência), 1892.
7. **Wittgenstein, Ludwig**. *Investigações Filosóficas*, 1953. §43: "O significado de uma palavra é seu uso na linguagem."
8. **Rosch, Eleanor**. "Natural Categories". *Cognitive Psychology*, 1973.
9. **Minsky, Marvin**. "A Framework for Representing Knowledge". MIT AI Lab, 1975.
10. **Schank, Roger; Abelson, Robert**. *Scripts, Plans, Goals and Understanding*. Erlbaum, 1977.
11. **Hammer, M.; McLeod, D.** "Database Description with SDM: A Semantic Database Model". *ACM TODS*, 1981.

### Fontes de Domínio (DDD, Zero UI, Semantic)

12. **Evans, Eric**. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley, 2003.
13. **Krishna, Golden**. *The Best Interface is No Interface*. New Riders, 2015.
14. **Sinclair, Matthew**. *Intent Steel Thread*. GitHub. https://github.com/matthewsinclair/intent

### Documentação Interna do RVM Designações

15. `manifesto_tecnico_rvm_designacoes.md` — Manifesto fundacional
16. `documento_mestre_paradigma_intencional.md` — Texto consolidado autoral
17. `principios_interface_semantica_ergonomica.md` — Princípios de UX/arquitetura
18. `catalogo_micro_uis_chat_agente.md` — Catálogo completo de micro-UIs
19. `matriz_implantacao_micro_uis_prioritarias.md` — Priorização em ondas
20. `ddd_ia_e_desenvolvimento_intencional.md` — Conexão DDD ↔ IDD
21. `mapeamento_codigo_paradigma_atual.md` — Cross-reference código ↔ paradigma
22. `roadmap_tecnico_interface_semantica.md` — 8 fases de implementação
23. `backlog_sprints_interface_semantica.md` — Plano sprint-a-sprint
24. `endurecimento_dominio_onda3.md` — O que ainda não pode ser micro-UI
25. `checklist_revisao_ux_agente.md` — 12 dimensões de qualidade

### PDFs Anexos (Análises do Autor)

26. *SIM e Interfaces Inteligentes* — Impedância cognitiva, SIM Unisys, arquitetura de mediação
27. *Camadas de Abstração* — Árvore horizontal e classificação taxonômica vertical

---

## Epílogo: O Futuro que Já Começou

O RVM Designações não é um projeto que *pretende* implementar o IDD. É um projeto que **já o implementa**, em grau mensurável, com 29 ações tipadas, 9 contratos de intenção, 15 serviços de domínio, 4 filtros de segurança por micro-UI, e uma interface que se adapta ao contexto semântico do usuário em tempo real.

O que resta é aprofundar. Expandir os contratos, hardening dos boundaries, evoluir de reativo/contextual para antecipatório/orquestrador. Mas a arquitetura já está lá. Os princípios já estão implementados. A genealogia de 50 anos de convergência — de Frege a Minsky a Evans a Gemini — está codificada em TypeScript e operacional em produção.

Este não é um manifesto de promessas. É um manifesto de fatos com uma agenda de profundidade.

---

*Documento gerado em abril de 2026. Parte integrante do corpus `.docs/interface-semantica-ergonomica-intuitiva/`.*
