# Plano de Implementação — Upgrade RVM Designações

> Gerado em 2026-04-20 | Baseado no manifesto IDD, mapa de maturidade atual e auditoria técnica do codebase.

---

## Índice

1. [Diagnóstico Atual](#1-diagnóstico-atual)
2. [Fase 0 — Higienização Técnica](#2-fase-0--higienização-técnica)
3. [Fase 1 — Hardening de Domínio (Onda 3)](#3-fase-1--hardening-de-domínio-onda-3)
4. [Fase 2 — Micro-UIs Onda 2](#4-fase-2--micro-uis-onda-2)
5. [Fase 3 — Cobertura de Testes](#5-fase-3--cobertura-de-testes)
6. [Fase 4 — Arquitetura & DX](#6-fase-4--arquitetura--dx)
7. [Fase 5 — IDD Nível 3 (Antecipatório)](#7-fase-5--idd-nível-3-antecipatório)
8. [Fase 6 — Micro-UIs Onda 3 + Orquestração](#8-fase-6--micro-uis-onda-3--orquestração)
9. [Dependências entre Fases](#9-dependências-entre-fases)
10. [Checklist de Entrega por Fase](#10-checklist-de-entrega-por-fase)

---

## 1. Diagnóstico Atual

### Stack

| Componente | Versão | Status |
|---|---|---|
| React | 19.2.0 | ✅ Atual |
| Vite | 7.2.4 | ✅ Atual |
| TypeScript | 5.9.3 | ✅ Atual |
| Supabase JS | 2.91.1 | ✅ Atual |
| Node (CI) | 20 | ✅ LTS |
| ESLint | 9.39.1 | ✅ Flat config |

### Números

| Métrica | Valor |
|---|---|
| Serviços (services/) | 74 arquivos |
| Componentes (components/) | ~46 arquivos |
| Testes | 18 arquivos |
| Hooks | 5 |
| Migrations Supabase | 16 |
| Serverless Functions | 3 |
| Action Types (agente) | 29 |
| Intent Contracts (tipados) | 9 |
| Domain Services | 15+ |
| Seed Policies (RBAC) | 7 |
| Documentos de paradigma | 14+ |

### Maturidade IDD

| Nível | Descrição | Status |
|---|---|---|
| 1 — Reativo | Responde a comandos explícitos | ✅ Operacional |
| 2 — Contextual | Considera permissões, semana, perfil, tópico | ✅ Operacional |
| 3 — Antecipatório | Sugere ações baseado em padrões | 🔲 Planejado |
| 4 — Orquestrador | Decompõe macro-intenções | 🔲 Visão |
| 5 — Autônomo Supervisionado | Rotinas periódicas com validação | 🔲 Horizonte |

### Dívida Técnica Identificada

| Item | Severidade | Localização |
|---|---|---|
| `@types/react`, `dotenv`, `tsx`, `typescript`, `vite` em dependencies (devDependencies) | 🟡 Média | package.json |
| Diretórios vazios (`config/`, `data/`) | 🟢 Baixa | src/ |
| Types espalhados (root `types.ts` + por serviço) | 🟡 Média | src/ |
| Sem roteamento (tabs manuais, 1 page) | 🟡 Média | App.tsx |
| Sem CSS framework (CSS cru) | 🟢 Baixa | *.css |
| Sem router (SPA com tabs) | 🟡 Média | App.tsx |
| Sem state management formal | 🟢 Baixa | Context+hooks |
| Zero testes de hooks | 🔴 Alta | hooks/ |
| Zero testes de integração/E2E | 🔴 Alta | — |
| Agent/Chat services sem testes | 🔴 Alta | services/agent* |
| Slash commands sem navegação por teclado | 🟡 Média | SlashCommandMenu |
| TODO: WhatsApp Business API | 🟡 Média | AuthContext.tsx:276 |
| Bloqueios Onda 3 (rename, merge, reimport) | 🔴 Alta | endurecimento_dominio_onda3.md |

---

## 2. Fase 0 — Higienização Técnica

> **Objetivo:** Eliminar dívida técnica de baixo risco que atrapalha a manutenção.
> **Duração estimada:** 1 sessão de trabalho
> **Risco:** Nenhum (mudanças não afetam comportamento)

### 0.1 Mover dependências para devDependencies

```
dependencies → devDependencies:
  @types/react
  @types/react-dom
  dotenv
  tsx
  typescript
  vite
  @vitejs/plugin-react
  @testing-library/react
  @testing-library/dom
  jsdom
  gh-pages
  eslint
  typescript-eslint
  globals
```

**Critério:** `npm run build` e `npm test` continuam funcionando.

### 0.2 Limpar estrutura de diretórios

- [ ] Remover `src/config/` (vazio) ou mover `src/constants/config.ts` para lá
- [ ] Remover `src/data/` (vazio) ou documentar uso externo (atomic-writer)
- [ ] Consolidar decisão: 1 `types/` ou types co-locados por service

### 0.3 Type organization

Opção recomendada: **types co-locados** (cada serviço exporta seus tipos). O arquivo raiz `types.ts` passa a re-exportar apenas tipos compartilhados cross-boundary.

### 0.4 Validação

- [ ] `npm ci && npm run build` sem warnings
- [ ] `npm test` passa
- [ ] `git diff --stat` < 20 arquivos modificados

---

## 3. Fase 1 — Hardening de Domínio (Onda 3)

> **Objetivo:** Desbloquear os 3 fluxos identificados em `endurecimento_dominio_onda3.md`.
> **Pré-requisito:** Fase 0 completa
> **Risco:** Médio (altera serviços de domínio críticos)

### 1.1 Rename Publisher com Propagação Atômica

**Problema:** Renomear publicador não propaga para `workbook_parts.participant_name`, histórico, etc.

**Implementação:**
1. Criar `publisherRenameService.ts` com função `renamePublisherAtomically(oldName, newName)`
2. Utilizar transaction Supabase (ou RPC function) para:
   - UPDATE `publishers` SET name = newName WHERE name = oldName
   - UPDATE `workbook_parts` SET participant_name = newName WHERE participant_name = oldName
   - UPDATE qualquer tabela com referência por nome
3. Registrar no audit log
4. Criar migration: `XXX_rename_publisher_rpc.sql`

**Teste obrigatório:**
- Rename com partes atribuídas → nome propagado em todas as tabelas
- Rename de nome inexistente → erro controlado
- Rename para nome duplicado → erro controlado

### 1.2 Merge de Publicadores Duplicados

**Problema:** Sem mecanismo para unificar 2 registros do mesmo publicador.

**Implementação:**
1. Criar `publisherMergeService.ts` com função `mergePublishers(keepId, removeId)`
2. Lógica:
   - Transferir todas as referências de `removeId` para `keepId`
   - Preservar o histórico mais antigo
   - Soft-delete do registro `removeId`
3. Criar migration: `XXX_merge_publisher_rpc.sql`
4. Expor como action type no agente: `MERGE_PUBLISHERS`

**Teste obrigatório:**
- Merge com partes atribuídas → referências atualizadas
- Merge preserva histórico combinado
- Rollback em caso de falha parcial

### 1.3 Re-import com Diff Semântico

**Problema:** Re-importar workbook sobrescreve destrutivamente.

**Implementação:**
1. Criar `workbookDiffService.ts` com função `computeImportDiff(existing, incoming)`
2. Retornar estrutura `ImportDiff`:
   ```ts
   type ImportDiff = {
     added: WorkbookPart[];
     removed: WorkbookPart[];
     changed: { before: WorkbookPart; after: WorkbookPart; fields: string[] }[];
     unchanged: WorkbookPart[];
   };
   ```
3. Micro-UI de preview: mostrar diff antes de commit
4. Opção: aplicar parcialmente (aceitar/rejeitar por parte)

**Teste obrigatório:**
- Import idêntico → diff vazio
- Import com nova parte → diff mostra adição
- Import com parte removida → diff mostra remoção
- Import com participante alterado → diff mostra mudança exata

### 1.4 Validação da Fase

- [ ] 3 novos serviços com testes unitários
- [ ] 2-3 novas migrations Supabase
- [ ] Nenhum fluxo existente quebrado
- [ ] Ações expostas no agente (opcional nesta fase)

---

## 4. Fase 2 — Micro-UIs Onda 2

> **Objetivo:** Implementar micro-UIs que requerem preview obrigatório.
> **Pré-requisito:** Fase 1 completa (boundaries endurecidos)
> **Risco:** Médio

### 2.1 Identificar Micro-UIs Onda 2

Baseado em `matriz_implantacao_micro_uis_prioritarias.md`:

| Micro-UI | Fase de Transação | Serviço Backend | Status |
|---|---|---|---|
| Reatribuir participante | two-phase | assignmentService | 🔲 |
| Preview de geração | impact-preview | generationService | 🔲 |
| Comunicação por WhatsApp | staged-communication | communicationService | 🔲 |
| Edição de publicador (completa) | two-phase | publisherMutationService | Parcial |
| Configuração de cooldown | single-step | cooldownService | 🔲 |
| Diagnóstico do agente | single-step | agentDiagnosticService | 🔲 |

### 2.2 Padrão de Implementação por Micro-UI

Cada micro-UI segue o contrato `AgentIntentContract`:

```
1. Definir IntentContract em agentIntentCatalog.ts
2. Criar componente React em components/ui/MicroUI_{nome}.tsx
3. Implementar 4 filtros de segurança:
   a. Discovery gate → canAgentAction()
   b. Data visibility → dataAccessLevel check
   c. Execution gate → re-validate no commit
   d. Channel gate → (se comunicação)
4. Integrar post-response action no useTemporalChatSemanticControls
5. Teste de componente com @testing-library/react
```

### 2.3 Slash Commands — Navegação por Teclado

- [ ] `ArrowUp/ArrowDown` para navegar opções
- [ ] `Enter` para selecionar
- [ ] `Escape` para fechar
- [ ] Highlight visual da opção ativa
- [ ] Teste: simulação de teclado com fireEvent

### 2.4 Validação da Fase

- [ ] 4+ novas micro-UIs implementadas
- [ ] Todos os IntentContracts tipados
- [ ] Slash command com navegação por teclado
- [ ] Testes de componente para cada micro-UI

---

## 5. Fase 3 — Cobertura de Testes

> **Objetivo:** Elevar cobertura de testes de ~30% para ≥70%.
> **Pode rodar em paralelo com Fase 2.
> **Risco:** Nenhum

### 3.1 Prioridade de Testes (por risco de negócio)

| Prioridade | Alvo | Tipo | Arquivos |
|---|---|---|---|
| 🔴 P0 | agentService, agentActionService | Unit | 2 serviços críticos sem teste |
| 🔴 P0 | permissionService | Unit | Segurança — zero margem |
| 🔴 P0 | generationService + generationCommitService | Unit | Core do negócio |
| 🟡 P1 | 5 hooks | Unit | useAuthenticatedAppData, usePermissions, etc. |
| 🟡 P1 | TemporalChat (chat principal) | Component | 1486 linhas sem teste |
| 🟡 P2 | workbookLifecycleService | Unit | Fluxo de estado |
| 🟡 P2 | undoService | Unit | Operação destrutiva reversa |
| 🟢 P3 | Integração E2E | E2E | Pipeline crítico: login → gerar → aprovar → S-140 |

### 3.2 Infraestrutura de Testes

- [ ] Configurar cobertura no Node test runner (`--experimental-test-coverage`)
- [ ] Criar helper de mock para Supabase client (já existe parcial em factories.ts)
- [ ] Criar helper de mock para `speechSynthesis` API
- [ ] Script npm: `"test:coverage": "node --import tsx --test --experimental-test-coverage ..."`

### 3.3 E2E (opcional, alta ambição)

Se decidido:
- Playwright com cenário: login → navegar workbook → gerar designações → ver S-140
- CI: rodar contra preview deploy da Vercel

### 3.4 Validação da Fase

- [ ] ≥70% cobertura em services/
- [ ] 100% cobertura em permissionService.ts
- [ ] Hooks com testes básicos (mount + state)
- [ ] CI verde com testes

---

## 6. Fase 4 — Arquitetura & DX

> **Objetivo:** Melhorar experiência do desenvolvedor e preparar para escala.
> **Pré-requisito:** Fases 0-3 completas
> **Risco:** Médio (refactor estrutural)

### 4.1 Roteamento

**Opção recomendada:** `react-router-dom` v7 (ou TanStack Router)

Motivação:
- URLs compartilháveis (ex: `/workbook/2026-02-09`, `/publisher/carlos`)
- Deep linking para agente (ação do agente pode navegar para URL)
- Back/forward do navegador funcional
- Cada tab vira uma rota, preservando estado

**Implementação:**
1. Instalar router
2. Mapear tabs existentes para rotas:
   - `/` → Workbook
   - `/approvals` → Aprovações
   - `/publishers` → Publicadores
   - `/communication` → Comunicação
   - `/s140/:weekDate?` → S-140
   - `/agent` → Agente
   - `/admin` → Admin
3. Mover lógica de tab switching em `App.tsx` para router
4. Preservar: estado do chat, seleção de semana

### 4.2 CSS Architecture

**Opção recomendada:** CSS Modules (já suportado por Vite sem config)

Motivação:
- Scoping automático (sem colisão de nomes)
- Sem dependência adicional
- Migration gradual: renomear `.css` para `.module.css` arquivo por arquivo

Alternativa: Tailwind CSS v4 (se preferir utility-first)

### 4.3 State Management

**Opção recomendada:** Zustand (leve, TypeScript-first)

Motivação:
- Substituir o pattern Context+useState que escala mal (AuthContext tem lógica demais)
- Stores separados por domínio: `useWorkbookStore`, `usePublisherStore`, `useAgentStore`
- Devtools built-in
- Nenhum provider wrapper necessário

### 4.4 Validação da Fase

- [ ] Todas as tabs como rotas
- [ ] Deep linking funcional
- [ ] ≥50% dos componentes com CSS Modules
- [ ] Store zustand para pelo menos workbook e agent

---

## 7. Fase 5 — IDD Nível 3 (Antecipatório)

> **Objetivo:** O agente começa a sugerir ações antes do usuário pedir.
> **Pré-requisito:** Fases 1-4 completas (domínio sólido, testes, arquitetura)
> **Risco:** Alto (nova capacidade de IA)

### 5.1 useChatContext Hook

Criar hook que mantém estado conversacional entre mensagens:

```ts
type ChatContext = {
  currentTopic: Topic | null;          // 'workbook' | 'publisher' | 'approval' | ...
  mentionedPublishers: string[];        // extraídos por NLP
  mentionedWeeks: string[];             // datas extraídas
  recentActions: AgentActionType[];     // últimas 5 ações
  conversationStage: 'exploring' | 'deciding' | 'executing' | 'reviewing';
  suggestedNextActions: AgentActionType[];  // calculado a partir do contexto
};
```

### 5.2 Motor de Sugestões Proativas

Regras declarativas (não IA) para sugestões:

| Contexto | Sugestão |
|---|---|
| Semana sem designações + data próxima | "Gerar designações para semana X?" |
| Propostas pendentes > 3 | "Há N propostas aguardando aprovação" |
| Publisher com cooldown expirando | "Carlos ficará disponível para leitura na semana Y" |
| Workbook não importado há 2+ semanas | "Importar novo workbook do jw.org?" |
| Última geração com conflitos | "Resolver conflitos da geração anterior?" |

### 5.3 Notification Chips

Chips que aparecem proativamente na barra de contexto:

```tsx
<ChipProactive type="warning" onClick={handleAction}>
  ⚠️ 3 propostas pendentes
</ChipProactive>
```

### 5.4 Analytics de Uso

Rastrear quais sugestões são aceitas/rejeitadas para refinar regras:

```sql
CREATE TABLE agent_suggestion_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_type TEXT NOT NULL,
  accepted BOOLEAN,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.5 Validação da Fase

- [ ] useChatContext mantém estado entre mensagens
- [ ] ≥5 regras de sugestão proativa implementadas
- [ ] Chips proativos aparecem baseados em contexto real
- [ ] Analytics rastreando aceitação/rejeição
- [ ] Testes para cada regra de sugestão

---

## 8. Fase 6 — Micro-UIs Onda 3 + Orquestração

> **Objetivo:** Implementar fluxos complexos (agora desbloqueados pela Fase 1) e iniciar decomposição de macro-intenções.
> **Pré-requisito:** Todas as fases anteriores
> **Risco:** Alto

### 6.1 Micro-UIs Onda 3

| Micro-UI | Depende de | Serviço |
|---|---|---|
| Rename com propagação | Fase 1.1 | publisherRenameService |
| Merge duplicados | Fase 1.2 | publisherMergeService |
| Re-import com diff | Fase 1.3 | workbookDiffService |

### 6.2 Decomposição de Macro-Intenções (IDD Nível 4)

Exemplo: "Preparar tudo para a semana de 16/02"

O agente decompõe em sub-ações orquestradas:

```
1. Verificar se workbook está importado     → workbookQueryService
2. Se não, sugerir importação               → micro-UI import
3. Gerar designações                        → generationService
4. Apresentar preview                       → S140PreviewCarousel
5. Aguardar aprovação                       → approvalService
6. Enviar notificações                      → communicationService
```

Implementação:
- `agentOrchestrationService.ts` — decompõe macro-intenção em pipeline
- Cada passo tem checkpoint de aprovação humana
- Se qualquer passo falhar, rollback parcial com explicação

### 6.3 Validação da Fase

- [ ] 3 micro-UIs Onda 3 operacionais
- [ ] ≥1 macro-intenção decomposta e executada
- [ ] Pipeline com checkpoints de aprovação
- [ ] Testes de integração para fluxo orquestrado

---

## 9. Dependências entre Fases

```
Fase 0 (Higiene)
  ↓
Fase 1 (Hardening) ←────────────────────┐
  ↓                                      │
Fase 2 (Micro-UIs Onda 2)    Fase 3 (Testes) [paralela]
  ↓                              ↓
  └──────────┬───────────────────┘
             ↓
Fase 4 (Arquitetura & DX)
             ↓
Fase 5 (IDD Nível 3 — Antecipatório)
             ↓
Fase 6 (Onda 3 + Orquestração)
```

**Fases paralelizáveis:**
- Fase 2 e Fase 3 podem rodar simultaneamente
- Fase 0 é pré-requisito para todas

---

## 10. Checklist de Entrega por Fase

### Fase 0 — Higienização ✏️
- [ ] dependencies corrigido no package.json
- [ ] Diretórios vazios resolvidos
- [ ] `npm ci && npm run build && npm test` verde
- [ ] Commit: `chore: cleanup dependencies and project structure`

### Fase 1 — Hardening 🛡️
- [ ] publisherRenameService + migration + testes
- [ ] publisherMergeService + migration + testes
- [ ] workbookDiffService + testes
- [ ] Commit por serviço (3 commits atômicos)

### Fase 2 — Micro-UIs Onda 2 🎨
- [ ] ≥4 micro-UIs novas com IntentContract
- [ ] Slash commands com navegação por teclado
- [ ] Testes de componente para cada micro-UI
- [ ] Post-response actions integrados

### Fase 3 — Testes 🧪
- [ ] agentService.test.ts + agentActionService.test.ts
- [ ] permissionService.test.ts (100% cobertura)
- [ ] generationService.test.ts
- [ ] 5 hooks testados
- [ ] Script de cobertura no CI
- [ ] ≥70% cobertura global em services/

### Fase 4 — Arquitetura 🏗️
- [ ] react-router-dom integrado
- [ ] ≥50% CSS Modules
- [ ] Zustand stores (workbook, agent)
- [ ] Deep linking funcional

### Fase 5 — IDD Nível 3 🧠
- [ ] useChatContext hook operacional
- [ ] ≥5 regras de sugestão proativa
- [ ] Chips proativos
- [ ] Analytics de sugestões (migration + service)

### Fase 6 — Onda 3 + Orquestração ⚡
- [ ] 3 micro-UIs Onda 3
- [ ] agentOrchestrationService
- [ ] ≥1 macro-intenção decomposta
- [ ] Testes de integração do pipeline

---

## Métricas de Sucesso do Upgrade

| Métrica | Antes | Meta |
|---|---|---|
| Cobertura de testes (services/) | ~30% | ≥70% |
| Micro-UIs operacionais | ~4 | ≥12 |
| Intent Contracts tipados | 9 | ≥18 |
| Action Types | 29 | ≥35 |
| Nível IDD | 2 (Contextual) | 3 (Antecipatório) |
| Fluxos bloqueados | 3 | 0 |
| Deep links | 0 | Todos os tabs |
| Sugestões proativas | 0 | ≥5 regras |
| CSS com scoping | 0% | ≥50% |

---

*Este plano é vivo. Cada fase pode ser detalhada em issues/tasks quando iniciada.*
