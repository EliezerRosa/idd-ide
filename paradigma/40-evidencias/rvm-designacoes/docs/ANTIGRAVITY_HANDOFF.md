# RVM Designações — Handoff para Antigravity / Claude

> **Para o agente Claude / Antigravity:**
> Este documento é o ponto de retomada canônico consolidado em **2026-09-05**.
> Leia integralmente antes de agir. O usuário é **Eliezer Rosa** (dono epistêmico do projeto).
> Modelo IDD: Eliezer define O QUÊ e POR QUÊ; o agente executa O COMO.

---

## 1. Contexto do Projeto

- **Repositório**: `EliezerRosa/RVM-Designacoes-Antigravity` (GitHub)
- **Stack**: React + Vite + TypeScript + Supabase (PostgreSQL)
- **Deploy**: GitHub Pages (frontend) + Vercel (API serverless)
- **Supabase projeto**: `pevstuyzlewvjidjkmea`
- **URL produção**: `https://rvm-designacoes-antigravity.vercel.app`
- **Workflow de deploy**: `git add → git commit → git push origin main → npm run deploy`
  - cwd: `rvm-designacoes-unified/`
  - Commit sem `()`, `{}` ou `&&` na mensagem
  - `git push` escreve no stderr mas EXIT=0 = sucesso (procurar `x..y main → main`)
- **Fase Ativa**: Fase 9 Concluída — Blindagem Total de Tokens da Comissão de Serviço com Google Auth Restrito e First-Access Binding (2026-09-05)

---

## 1.1 Ecossistema de Inteligência: Agente Curador IA & Base de Conhecimento (Fase 7 — 2026-09-04)

### HEAD git base: `925b81b`

O sistema possui um ecossistema de curadoria semântica inteligente totalmente desacoplado do motor determinístico:

```
                  ┌────────────────────────────────────────────────────────┐
                  │              Importação de Apostilas (Excel)           │
                  └───────────────────────────┬────────────────────────────┘
                                              │ (Gatilho automático ou manual)
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │    Agente Especialista de Lote (Gemini Flash / Proxy)  │
                  │        (curatorBatchSpecialistAgent.ts)               │
                  └───────────────────────────┬────────────────────────────┘
                                              │ Analisa temas (ex: Jeremias)
                                              │ Infere perfis e insights
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │        Base de Conhecimento Permanente (Supabase)      │
                  │   - curator_profiles (16+ perfis canônicos)            │
                  │   - curator_batch_insights (meta-análises de lote)     │
                  └───────────────┬────────────────────────┬───────────────┘
                                  │                        │
         Popula dropdown tags     │                        │ Consulta regras e
         no cadastro              │                        │ perfis ideais
                                  ▼                        ▼
     ┌────────────────────────────────────┐    ┌──────────────────────────────────┐
     │      Cadastro de Publicadores      │    │         Agente Curador IA        │
     │        (PublisherForm.tsx)         │    │  (SemanticDraggableGenerator)    │
     │  - syntheticProfiles (+1 tags)     │    │  - Botão retrátil/flutuante      │
     │  - Salvo em publishers.data JSONB  │    │  - Dock rodapé esquerdo          │
     └─────────────────┬──────────────────┘    └─────────────────┬────────────────┘
                       │                                         │
                       │ Ponto de Partida Determinístico (+300)  │
                       └───────────────────┬─────────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │   Seleção Híbrida em Tempo de Tela    │
                       │   - Restrita aos Elegíveis Desbloq.   │
                       │   - Semana em Foco / Por Parte        │
                       │   - Flexibilidade Total do Usuário    │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼ (Zero impacto em:)
                       ┌───────────────────────────────────────┐
                       │ Motor "Gerar" Automático (Intocado)   │
                       │   (unifiedRotationService.ts)         │
                       └───────────────────────────────────────┘
```

### Principais Invariantes do Curador IA:
1. **Isolamento do Motor "Gerar"**: O motor rotacional determinístico (`unifiedRotationService.ts`, `generationService.ts`, `cooldownService.ts`) **NUNCA** é modificado pelas decisões do Curador. O Curador atua exclusivamente na camada de assistência visual e casting humano assistido.
2. **Restrição aos Elegíveis Desbloqueados**: O Curador opera estritamente sobre a lista de publicadores que são elegíveis para a semana em foco conforme retornado pelo motor (privilégios, gênero, cooldown, disponibilidade, restrições e exclusões). Ninguém inelegível pode ser sugerido ou selecionado pelo Curador.
3. **Seleção Semana a Semana / Parte a Parte**: A seleção de publicador via Curador é executada individualmente para cada parte dentro da semana em foco selecionada.
4. **Ponto de Partida Determinístico + Flexibilidade**: Publicadores que possuem tags em `syntheticProfiles` combinando com o perfil exigido da parte recebem +300 pontos de afinidade e o badge `💎 Perfil Atribuído no Cadastro`. Contudo, o Curador mantém visíveis e ranqueia todos os demais elegíveis da semana, preservando flexibilidade de escolha.

---

## 2. Módulo RM (Relatórios Mensais) — Estado Atual

### HEAD git RM: `e6f3a1e` / `925b81b` (Consolidado)

### O que foi implementado (sessão 2026-07-09 / 2026-09-04)

| Item | Status | Commit |
|---|---|---|
| Schema `rm.*` + views + triggers | ✅ deployed | migrações em `supabase/migrations/` |
| Importador Glide (sync portal) | ✅ deployed | `rmSyncService.importGlideWorkbook()` |
| Dashboard com KPIs calibrados vs Glide | ✅ deployed | `RmDashboard.tsx` |
| I-0: dois eixos ortogonais (`is_congregated` vs `field_service_status`) | ✅ deployed + DB | `rm_status_rules_v3` migration |
| I-7 v3: ATIVO=6/6, IRREGULAR=1-5/6, INATIVO=0/6, RECÉM-CONGREGADO | ✅ deployed + DB | `rm_status_rules_v3` |
| `is_active` → `is_congregated` (rename coluna DB + TS) | ✅ deployed | `rm_publisher_is_congregated` |
| Pioneer status como snapshot histórico no relatório | ✅ deployed | `rm_report_pioneer_snapshot` |
| Import `Desativado` → `is_congregated` + `publisher_date` | ✅ code deployed | aguarda re-import |
| `is_congregated` + `publisher_date` populados via SQL direto | ✅ DB | via MCP migration |
| Upsert monthly_reports por chave civil `(publisher_id, year, month)` | ✅ deployed | `8baf5f9` |
| `VERCEL_TOKEN` configurado no ambiente de sistema Windows | ✅ permanente | `[Environment]::SetEnvironmentVariable` |
| Higienização de OAuth hash obsoleto em `src/lib/supabase.ts` (Resolução do Patrick) | ✅ deployed | `src/lib/supabase.ts` |

### Dados no banco (2026-07-09)
- 3 congregações · 7 grupos · **192 publicadores** (129 `is_congregated=true`, 63 `false`)
- **2.442+ relatórios** mensais (set/2023–jun/2026, 2 congregações)
- `publisher_date` populado para 15 congregados + 2 não-congregados
- `field_service_status`: 44 ATIVO · 63 IRREGULAR · 85 INATIVO (janela relativa a hoje)

---

## 3. KPIs do Painel — Junho 2026 (Calibrado vs Glide)

| KPI (nosso) | Valor | Glide | Status |
|---|---|---|---|
| Relatórios entregues | 77 | 76 | Δ+1 (ver §4) |
| **Congregados** | 129 | 127 (-2 PE's) | ✅ equivalente |
| Publicadores | 50 | 51 | Δ-1 (ver §4) |
| P. Auxiliares | 6 | 6 | ✅ |
| P. Regulares | 19 | 19 | ✅ |
| Estudos | 47 | 41 | Δ+6 (ver §4) |
| Horas pioneiros (reg+esp) | 692 | 657 (só reg) | Δ+35 (ver §4) |
| Atrasados | 0 | 0 | ✅ |

---

## 4. Decisões Recentes e Pendências

### P. Especiais (PE) no S-1 congregacional (RESOLVIDO: Opção A)

**Descoberta:** O Glide exclui P. Especiais do S-1 da congregação local (seus relatórios vão ao escritório da Filial).
**Decisão:** Eliezer aprovou a Opção A em 2026-07-10.
- A view `v_s1_consolidation` foi atualizada (`is_special_pioneer = false`).
- O painel exibe um badge de auditoria indicando que X PE(s) foram excluídos.

### Pendências descobertas
1. **1 relatório no Glide** que não está no nosso DB (jun/2026) → alguém entregou após nosso import → re-import do `Relatórios Glide.xlsx` resolverá.
2. ~~**1 publicador no CSV** sem match~~ (Resolvido: Registro órfão no Glide sem dados/nome `w9jNRtMzQiexj1OhJsM2CA`. Já marcado para desativação no Glide).
3. **`Relatórios Glide.xlsx`** (OneDrive + workspace) tem APENAS aba `Relatórios`, sem `PublicadorReal` → para importar dados de publicadores (Desativado, publisher_date) é preciso subir o arquivo `Publicador Real.csv` de outra forma (hoje foi feito via SQL direto)

---

## 5. Invariantes Canonicais (rm-invariants.intent.md)

Arquivo fonte: `rvm-designacoes-unified/.agents/workflows/rm-invariants.intent.md`

### I-0. Dois eixos ortogonais (NOVO 2026-07-09)
- **`is_congregated`** (Eixo A): membro da congregação (`false` = Não Congregado = excluído de tudo)
- **`field_service_status`** (Eixo B): atividade no ministério (ATIVO/IRREGULAR/INATIVO/RECÉM-CONGREGADO)
- São ORTOGONAIS: `INATIVO` ≠ `Não Congregado`

### I-7 v3 (atualizado 2026-07-09)
```
RECÉM-CONGREGADO → publisher_date < 1 mês (prioridade máxima)
INATIVO          → 0/6 meses pregados na janela
IRREGULAR        → 1-5/6 meses pregados
ATIVO            → 6/6 meses pregados
```
- Janela = últimos 6 meses completos relativos a HOJE (não ao último relatório)
- "Pregou" = `has_preached = true` em `monthly_reports`

### Modalidade de serviço (invariante, não criada formalmente ainda)
```
Publicador       → NOT is_auxiliary_pioneer AND NOT is_regular_pioneer AND NOT is_special_pioneer
Pioneiro Auxiliar → is_auxiliary_pioneer = true (flag por relatório mensal)
Pioneiro Regular  → is_regular_pioneer = true (snapshot histórico no relatório)
Pioneiro Especial → is_special_pioneer = true (relatórios vão ao circuito, não à congregação)
```
- `has_preached` NÃO é critério de modalidade (é critério de field_service_status)
- As flags pioneer são snapshots DO MOMENTO DO RELATÓRIO (dados históricos)

---

## 6. Arquitetura do Schema rm.*

```
rm.congregations     ← is_active (estado da congregação, NÃO renomeado)
rm.field_groups      ← is_active (estado do grupo, NÃO renomeado)
rm.publishers        ← is_congregated (renomeado de is_active em 09/07)
                        field_service_status (calculado por trigger)
                        publisher_date (Data Início Publicador)
rm.monthly_reports   ← is_auxiliary_pioneer, is_regular_pioneer, is_special_pioneer
                        (snapshots históricos da modalidade no momento do relatório)
rm.month_control     ← is_open por congregação/mês
rm.publisher_sync_map ← mapeamento rm.publishers ↔ public.publishers (RVM)
rm.settings          ← chave/valor por congregação (submission_window_end_day)
```

### View principal
```sql
rm.v_s1_consolidation → GROUP BY (reference_year, reference_month, congregation_id)
  total_reports, total_preached,
  publisher_count, auxiliary_pioneer_count, regular_pioneer_count, special_pioneer_count,
  total_studies, pioneer_hours, auxiliary_hours, late_count
```
- **Não usa JOIN a `rm.publishers`** — todo pioneer status vem de `monthly_reports`
- `publisher_count` = NOT aux AND NOT reg AND NOT esp (sem filtro `has_preached`)

---

## 7. Arquivos de Código Relevantes

### Módulo RM (Relatórios Mensais)
```
src/services/rm/rmService.ts         ← tipos TS + CRUD
src/services/rm/rmSyncService.ts     ← importador Glide workbook
src/components/rm/RmDashboard.tsx    ← painel KPIs + gráficos
src/components/rm/RmPublisherCrud.tsx ← CRUD publicadores
src/components/rm/RmSyncPortal.tsx   ← upload + auto-match
supabase/migrations/                 ← todas as migrations RM
.agents/workflows/rm-invariants.intent.md ← FONTE CANÔNICA
```

### Módulo Curador IA & Base de Conhecimento (Fase 7)
```
src/services/curatorKnowledgeBaseService.ts ← CRUD Supabase para curator_profiles e curator_batch_insights
src/services/curatorBatchSpecialistAgent.ts  ← Agente de meta-análise e especialização de lotes pós-importação
src/services/semanticRulesService.ts       ← Motor híbrido de pontuação (+300 pts determinístico + afinidade)
src/components/ui/SemanticDraggableGenerator.tsx ← Botão flutuante/retrátil, modal do Curador, casting por parte
src/components/PublisherForm.tsx           ← Seletor multi-select (+1) de perfis sintéticos no cadastro
src/components/WorkbookManager.tsx         ← Disparo automático da especialização ao importar novo lote
src/components/admin/CSClearanceModal.tsx   ← Modal de auditoria e liberação com regras do motor
```

### Tipos TS chave (RM + Curador)
```typescript
// RM
type FieldServiceStatus = 'ATIVO' | 'IRREGULAR' | 'INATIVO' | 'RECÉM-CONGREGADO';

interface RmPublisher {
  is_congregated: boolean;  // NÃO confundir com field_service_status = 'INATIVO'
  field_service_status: FieldServiceStatus | null;
  publisher_date: string | null;  // Data Início Publicador (RECÉM-CONGREGADO)
  is_regular_pioneer: boolean;
  is_special_pioneer: boolean;
}

interface RmMonthlyReport {
  is_auxiliary_pioneer: boolean;  // flag por mês
  is_regular_pioneer: boolean;    // snapshot histórico
  is_special_pioneer: boolean;    // snapshot histórico
}

// Curador IA & Base de Conhecimento
interface CuratorProfile {
  id: string; // chave canônica (ex: 'orador_eloquente', 'conselheiro_amoroso')
  name: string;
  description: string;
  ideal_traits: string[];
  avoid_traits: string[];
  applicable_roles: string[];
  keywords: string[];
  insights?: string;
  is_active: boolean;
}

interface CuratorBatchInsight {
  id: string;
  batch_key: string;
  book_focus?: string;
  thematic_summary?: string;
  analysis_timestamp: string;
}

// Publicador (campo sintético adicionado)
interface Publisher {
  // ... campos regulares
  syntheticProfiles?: string[]; // IDs correspondentes a curator_profiles.id
}
```

---

## 8. Dados de Referência (Glide)

- `Relatórios Glide.xlsx`: apenas aba `Relatórios` (67 cols, 2600+ linhas)
  - Localização workspace: `Glide Apps/Relatórios Glide.xlsx`
  - Localização OneDrive: `...\PIONEIROS ESPECIAIS\Estância\Sup Serviço\Relatórios Glide.xlsx`
  - **NÃO tem aba `PublicadorReal`**
- `Publicador Real.csv` (186 colunas, com `Desativado` + `Data Início Publicador`):
  - Localização: `docs/RM Desacoplado/Publicador Real.csv`
  - Para importar via UI: precisaria de XLSX com aba nomeada "PublicadorReal"
  - Hoje foi feito via SQL direto (migration)

### Colunas Glide relevantes para import
- `PioneiroAuxiliar` (BA) → `is_auxiliary_pioneer` por relatório
- `PioneiroRegular` (AV) → `is_regular_pioneer` snapshot por relatório
- `PioneiroEspecial` (AY) → `is_special_pioneer` snapshot por relatório
- `Desativado` (col 16 PublicadorReal) → `is_congregated = NOT Desativado`
- `Data Início Publicador` (col 174) → `publisher_date`

---

## 9. Backlog Priorizado

### Alta prioridade (próxima sessão)
1. **1 relatório faltante** no DB para jun/2026 → re-import `Relatórios Glide.xlsx` quando atualizado

### Média prioridade (Fase 2)
4. Trigger `is_late_report` automático (I-3 backlog P1)
5. Popular `rm.settings` (`submission_window_end_day = '20'`)
6. View `v_s4_annual` agrupando por `service_year`
7. RLS multi-role (secretary/group_leader)
8. KPI "Não relataram" = `Congregados − Relatórios entregues`

### Backlog aberto (não RM)
- `dispatchS89Receipt` migrar para Edge Function
- GAP UI: notificações de recusa na aba Agente

---

## 12. Acesso ao App Glide (referência de verdade)

### URLs

| Destino | URL |
|---|---|
| App principal (Início) | https://relatorio-mensal-v03-new.glide.page/dl/b33482 |
| App (link direto pós-login) | https://relatorio-mensal-v03-new.glide.page/dl/375e23 |
| Relatório Para Escritório | https://relatorio-mensal-v03-new.glide.page/dl/d8fc49 |

### Autenticação
- O Glide usa **email + PIN de congregação** (não senha convencional)
- O agente NÃO consegue autenticar automaticamente — a sessão ativa é do **Eliezer** no browser do sistema
- **Procedimento**: Eliezer abre o browser, faz login, depois **compartilha a aba** com o agente Antigravity
- Após login, o agente pode navegar via ferramentas de browser (Playwright / browser nativo)

### Ferramentas de Browser no Antigravity
O Antigravity tem acesso às ferramentas Playwright (ou equivalente). Use:

```
# Navegar para uma URL na aba compartilhada
navigate_page(pageId, url)

# Tirar screenshot
screenshot_page(pageId, element)

# Ler acessibilidade da página (melhor que screenshot para extrair dados)
read_page(pageId)   # retorna árvore de acessibilidade com refs

# Clicar em elemento
click_element(pageId, ref=e123)   # usar ref da árvore de acessibilidade

# Scroll para elemento
screenshot_page(pageId, ref=eXXX, scrollIntoViewIfNeeded=True)
```

### Navegação no Glide

```
Início → menu "More" (botão com aria-haspopup='menu') → abre menu lateral com:
  ├─ Publicadores Geral
  ├─ Relatório Para Escritório   ← S-1 mensal para comparação com nosso sistema
  ├─ Modalidades Pioneiro
  └─ ...outros

Aba "Visão Geral" (nav principal) → seções:
  ├─ Modalidades Congregação    (donut % por tipo de pregação)
  ├─ Pioneiros Regulares        (donut modalidades dos PEs)
  ├─ % Informam Modalidades     (linha % por mês)
  ├─ Campo Por Telefone         (barras: Total/Designados/Ligações/Revisitas)
  ├─ AUGES (Ano Atual)          ← GRÁFICO PRINCIPAL com Publicadores/Auxiliares/Regulares/Estudos/Inativos
  └─ AUGES (Anterior)           (mesmo gráfico, ano anterior)
```

### Extraindo dados do "Relatório Para Escritório"

Após navegar para `dl/d8fc49` e selecionar o mês:

1. `read_page(pageId)` → árvore de acessibilidade revela os valores sem precisar de screenshot
2. Procurar nos `listitem` refs os campos: "Número de relatórios", "Estudos bíblicos", "Horas"
3. Estrutura da página (ref names variam a cada carregamento mas a hierarquia é estável):

```
main
├─ "CONGREGADOS INATIVOS NO MÊS (N)"  ← congregados que NÃO entregaram naquele mês
├─ "NÃO CONGREGADOS (N)"              ← is_congregated = false
├─ listitem "Cartões de Congregados (-2 PE's): N"
├─ listitem "Publicadores ativos: N"  ← field_service_status calculado pelo Glide
├─ listitem "Numero de relatórios: N"
├─ iframe PUBLICADORES
│   └─ list: Número de relatórios / Estudos bíblicos / Atrasados
├─ iframe PIONEIROS AUXILIARES
│   └─ list: Número de relatórios / Horas / Estudos bíblicos / Atrasados
└─ iframe PIONEIROS REGULARES
    └─ list: Número de relatórios / Horas / Estudos bíblicos / Atrasados
```

> **Nota:** Os iframes do Glide têm conteúdo acessível via `read_page` mas os
> números estão em elementos `paragraph` dentro de `listitem`. Se o conteúdo
> estiver em iframes cross-origin, use `screenshot_page` com scroll para visualizar.

### Comparação de referência (Junho 2026)

| Campo Glide | Valor | Equivalente nosso |
|---|---|---|
| CONGREGADOS INATIVOS NO MÊS | 18 | `Congregados - total_reports` (jun) |
| NÃO CONGREGADOS | 62 | `COUNT(is_congregated=false)` |
| Cartões de Congregados (-2 PE's) | 127 | `129 - 2` |
| Publicadores ativos | 107 | Glide's próprio `field_service_status` ATIVO |
| Número de relatórios (total) | 76 | nosso 77 (-2 PE's + 1 que ainda não temos) |
| Publicadores não-pioneiros | 51 | nosso `publisher_count` = 50 |
| Auxiliares (relatórios) | 6 | nosso `auxiliary_pioneer_count` = 6 ✅ |
| Regulares (relatórios) | 19 | nosso `regular_pioneer_count` = 19 ✅ |
| Estudos total | 41 | nosso 47 (diferença = 6 estudos dos 2 PE's) |
| Horas Auxiliares | 160 | nosso `auxiliary_hours` = 160 ✅ |
| Horas Regulares | 657 | nosso `pioneer_hours` = 692 (diff = PE hours) |

> **Causa das diferenças**: P. Especiais (PE) são excluídos do S-1 congregacional no Glide
> (seus relatórios vão ao escritório da Filial). Opção A implementada: nossa view agora exclui PEs.

---

## 13. IDD Paradigma — Protocolo Formal de Interação

### Fundação Filosófica

IDD (Intent-Driven Development) é o paradigma de colaboração humano-agente adotado
por Eliezer Rosa. Linhagem: Engelbart (1962) → Kay → Brooks → Berners-Lee → Gruber → IDD.

> "Augmenting ≠ Automating."
> A simbiose preserva o humano no **comando epistêmico** mesmo quando delega o **operacional**.

### Os Dois Eixos de Autoridade

| Eixo | Quem detém | O que define |
|---|---|---|
| **Comando Epistêmico** | **Eliezer** (sempre) | O QUÊ e o POR QUÊ — intenção, invariantes, critérios de sucesso, limites éticos |
| **Comando Operacional** | **Agente** (delegado) | O COMO — ferramentas, sequência, sintaxe, execução |

- Perder essa fronteira = **credulidade** (confiança sem conhecimento)
- Mantê-la = **fé bayesiana** (confiança escalada por evidência auditável)
- O agente pode errar o caminho, mas NUNCA pode violar um invariante sem parar e reportar

### Vocabulário Canônico (usar consistentemente)

| ✅ Usar | ❌ Evitar |
|---|---|
| "comando epistêmico" | "o usuário quer" |
| "comando operacional" | "eu vou fazer" |
| "invariante" (não negociável) | "regra" (genérico) |
| "augmenting" | "automation" |
| "fé bayesiana" | "confia/não confia" |
| "intenção" | "requisito" |
| "Não Congregado" | "inativo" (para is_congregated=false) |
| "INATIVO" (field_service_status) | "inativo" quando se refere a is_congregated=false |

### Protocolo de Intenção (antes de agir)

Eliezer declara a intenção no formato IDD:

```
WHY   → motivo de negócio / contexto semântico
WHAT  → resultado esperado / critério de sucesso
INVARIANTS → o que NUNCA pode ser violado
AUTH  → confirm-once | per-step | just-do-it
```

O agente responde com:
1. **Plano explícito**: O COMO (ferramentas, passos, ordem, impacto)
2. Aguarda **"go"** do Eliezer (confirm-once) ou executa direto (just-do-it)
3. **Relatório final**: o que foi feito, o que não foi, o que mudou, pendências

### Modelo de Aprovação

| Modo | Quando usar | Comportamento |
|---|---|---|
| `confirm-once` | Sequência definida e reversível | Eliezer diz "go" → agente executa até o fim sem interrupção |
| `per-step` | Mudanças destrutivas ou irreversíveis | Aprovação explícita a cada fase |
| `just-do-it` | Operações rotineiras já estabelecidas | Agente age diretamente, reporta depois |

### Runbooks IDD (`.agents/workflows/`)

Operações recorrentes encapsuladas como runbooks em `.agents/workflows/*.intent.md`.
Estrutura canônica:

```yaml
---
description: "descrição curta"
authorization: confirm-once | per-step | just-do-it
invariants:
  - "invariante 1 (não-negociável)"
rollback: "comando de rollback"
---
## WHY / WHAT / PHASES / ADAPTERS / NOTES
```

**Runbooks existentes:**

| Arquivo | Propósito | Auth |
|---|---|---|
| `rm-invariants.intent.md` | Fonte canônica de invariantes RM | per-step |
| `rm-import-reports.intent.md` | Importar Relatórios Glide → DB | confirm-once |
| `rm-dashboard-visual.intent.md` | Atualizar gráficos do dashboard RM | confirm-once |
| `deploy-and-validate.intent.md` | Build + push + deploy + smoke test | just-do-it |
| `supabase-migration.intent.md` | Aplicar migration Supabase | per-step |
| `rotate-secrets.intent.md` | Rotação de segredos | per-step |

### Invariantes como Salvaguarda Epistêmica

Os invariantes (em `rm-invariants.intent.md` e nos frontmatters dos runbooks) são a
**intenção do Eliezer encarnada em restrições de código**. O agente:

- **NUNCA modifica** um invariante sem aprovação explícita do Eliezer
- **PARA e reporta** se uma ação violaria um invariante
- **Propõe alternativas** em vez de contornar

Invariantes ativos: `I-0` (dois eixos ortogonais) a `I-8` + pendências `P1–P6` em `rm-invariants.intent.md`.

### Memória Persistente (protocolo obrigatório)

```
/memories/repo/_ESTADO-ATUAL.md   ← LER PRIMEIRO. ATUALIZAR ao fim de cada bloco.
/memories/repo/<tema>-YYYY-MM-DD.md ← snapshots datados por tema
/memories/session/<assunto>.md    ← notas vivas da conversa em curso
/memories/<tema>.md               ← preferências transversais do Eliezer (auto-carregadas)
```

Regras:
- LER `_ESTADO-ATUAL.md` ANTES de qualquer ação
- ATUALIZAR ao fim de cada bloco lógico (antes de prosseguir)
- NUNCA esperar pedido explícito de "salvar" — o default é gravar
- Substituição de memória = CREATE then DELETE (zero janela de perda)

### IDD Aplicado a Este Projeto (síntese)

```
Eliezer define (epistêmico):
  ✓ Invariantes de negócio JW (Ano de Serviço, janela de entrega, status de campo...)
  ✓ Quais métricas o painel deve mostrar (e com qual semântica)
  ✓ Como calcular o S-1 (com ou sem PE's — decisão pendente §4)
  ✓ Limites de escopo (congregação vs circuito)
  ✓ Nomeação de conceitos (is_congregated, INATIVO, Não Congregado...)

Agente executa (operacional):
  → Migrations SQL (Supabase MCP)
  → Código TypeScript (views, tipos, componentes React)
  → Deploy (build + push + gh-pages)
  → Validação vs Glide (browser, read_page, comparação)
  → Documentação e memória persistente
```

---

## 14. IDD IDE (idd-ide) — Projeto AEON em Construção

### Repositório
**`EliezerRosa/idd-ide`** · https://github.com/EliezerRosa/idd-ide · público · MIT

> "Uma IDE onde você declara *o que* o código deve fazer, não *como* implementá-lo."

### O que é
Fork do **Code-OSS** (VS Code open source) com o paradigma IDD embutido como extensão
`idd-core` não-removível. O código é um **artefato derivado** da intenção — rastreável
e verificável continuamente.

### 5 Componentes Centrais

| Componente | Responsabilidade | Arquivo chave |
|---|---|---|
| **Intent Capture UI** | Painel de 4 passos: intenção → constraints → critérios → dependências | `IntentCapturePanel.ts` |
| **Intent Engine** | Parser + Context Manager + Claude API + Output Formatter | `IntentEngine.ts` |
| **Code Workspace** | Editor aumentado com drift inline por linha, diagnósticos LSP | `extension.ts` |
| **Intent Graph** | Grafo visual Cytoscape.js de todas as intenções e dependências | `IntentGraphPanel.ts` |
| **Intent Verifier + Store** | Drift detection (estático + semântico + cascata) + SQLite versionado | `IntentVerifier.ts` |

### Formato `.intent.yaml` (fonte de verdade)

```yaml
intent: "Autenticar usuário com e-mail e senha, retornando JWT válido por 24h"
module: auth/login

constraints:
  - "Senha deve ter mínimo 8 caracteres"
  - "Bloquear conta após 5 tentativas falhas por 15 minutos"
  - "Nunca registrar a senha em logs"

acceptance:
  - "Login válido retorna status 200 e token JWT"
  - "Senha incorreta retorna 401 sem vazar informações"
  - "Quinta tentativa falha bloqueia a conta"

depends_on:
  - users/crud

language: typescript
```

`idd generate auth/login` → gera `auth/login.ts` + `auth/login.test.ts` + `auth/login.md`

### CLI `idd` — Comandos

| Comando | Descrição |
|---|---|
| `idd init` | Inicializa IDD no projeto (`.idd/`, Git hooks, schema, exemplo) |
| `idd new <mod/sub>` | Cria `.intent.yaml` interativamente |
| `idd generate [mod/sub]` | Gera código, testes e docs via Claude API |
| `idd verify [flags]` | Verifica drift entre código e intenções |
| `idd diff [mod/sub]` | Vista split: intenção vs código atual |
| `idd graph [flags]` | Grafo de intenções (terminal ou VS Code panel) |
| `idd store list/history/snapshot` | Gerencia Intent Store SQLite |

### Intent Store (SQLite)

4 tabelas: `intents` / `intent_versions` (semver automático) / `constraints` / `drift_events`
API interna na porta 4999. Git hooks instalados por `idd init`:
- `pre-commit` → `idd verify --staged --fail-on=critical`
- `post-merge` → `idd store sync`
- `post-tag` → `idd store snapshot --tag=$TAG_NAME`

### Estado do Projeto

| Fase | Status | Destaques |
|---|---|---|
| Fase 1 — MVP | ✅ Concluída | 151 testes Vitest; 8 comandos CLI; 6 linguagens; Intent Store SQLite |
| Fase 2 — Core IDD | 🔄 Em andamento | Context Manager completo; Verifier semântico; Intent Graph interativo |
| Fase 3 — Produto | 📋 Planejada | `product.json`, branding, Open VSX Marketplace |
| Fase 4 — Ecossistema | 🔮 Visão | IDD Server, IDD Review, IDD Docs, LSP dedicado |

### Stack
`Code-OSS · TypeScript 5.3 (strict) · Claude API (claude-sonnet-4-20250514) · YAML + JSON Schema · SQLite (better-sqlite3) · Cytoscape.js · Vitest`

---

### Sincronia IDD IDE ↔ Projeto AEON ↔ RVM Designações

#### O que já converge

| Conceito | IDD IDE | RVM Designações (este repo) | Sincronia |
|---|---|---|---|
| Fonte de verdade | `.intent.yaml` | `.agents/workflows/*.intent.md` | Mesmo princípio, formato diferente |
| Constraints | `constraints:` no yaml | Seções `## I-N.` em `rm-invariants.intent.md` | Migrar para `.intent.yaml` quando AEON amadurecer |
| Critérios de aceite | `acceptance:` no yaml | Validações SQL em migrations + testes | Formalizar como acceptance criteria |
| Drift detection | `idd verify` + LLM | Manual (agente compara com Glide) | `idd verify --semantic` poderia automatizar |
| Dependências | `depends_on:` | Implícito no código | Declarar explicitamente no grafo |
| Geração de código | `idd generate` via Claude | Claude (Copilot / Antigravity) | IDD IDE é a plataforma; Antigravity é o ambiente atual |

#### Plano de Convergência (para discutir com Eliezer)

```
AGORA (Antigravity + VS Code Copilot):
  Eliezer declara intenção em chat → agente gera código → agente valida vs Glide
  Artefatos: .intent.md + migrations + código TS + deploy

PRÓXIMO PASSO (adicionar IDD CLI ao workflow):
  Eliezer declara em .intent.yaml → idd generate → idd verify
  Artefatos: código rastreável à intenção, drift detectado automaticamente

FUTURO (IDD IDE como plataforma):
  Intent Capture UI → Intent Engine → Code Workspace aumentado
  IDD Server compartilhado → revisão de PRs baseada em intenções
```

#### Recomendação Financeira Anthropic/Claude — Duas Fases Distintas

> ⚠️ **Distinção crítica**: a `ANTHROPIC_API_KEY` no IDD IDE é do **usuário do IDE**,
> não de Eliezer. O criador e o usuário têm custos separados.

**Fase A — Eliezer desenvolvendo o IDD IDE (agora)**

| Ferramenta | Custo | Papel |
|---|---|---|
| **Copilot Pro+** (já pago, ~$19/mês) | ✅ Já cobre | Arquitetura, código da extensão/CLI, sessões longas no Antigravity |
| **Anthropic API pay-as-you-go** | ~$0–5/mês | Testar `idd generate` + `idd verify --semantic` durante desenvolvimento |
| ~~Claude.ai Pro~~ | ❌ Redundante | Idem ao Copilot Pro+ — não adiciona valor |

→ **Custo incremental para Eliezer: apenas a API para testes** (pay-as-you-go, escala com uso)

**Fase B — Desenvolvedor usando o IDD IDE (produto distribuído)**

| Quem paga | O quê | Custo |
|---|---|---|
| **O usuário do IDE** | `export ANTHROPIC_API_KEY=sk-ant-...` (chave própria) | ~$0.01 por `idd generate` de um módulo |
| **Eliezer** | Nada | Zero — modelo BYOK (Bring Your Own Key) |

→ **Eliezer não assume custo de operação.** O IDD IDE escala infinitamente sem custo para o criador.

**Estratégia confirmada:**
```
Copilot Pro+ (já pago)        → desenvolvimento do IDD IDE (Fase A)
Anthropic API pay-as-you-go   → testes do CLI durante desenvolvimento (Fase A, uso mínimo)
Usuário traz a própria chave  → uso em produção (Fase B)
```

---

## 10. Âncora de Rollback

```bash
# Rollback código (pré-RM):
git reset --hard pre-rm-fase1  # tag local @ feed0c5

# Rollback DB:
DROP SCHEMA rm CASCADE;
DROP FUNCTION public.rm_open_month, public.rm_close_month;
```

---

## 11. Instruções Operacionais para o Agente

1. **NUNCA modificar invariantes sem aprovação do Eliezer** (comando epistêmico)
2. **Antes de qualquer migration**: verificar impacto em `v_s1_consolidation` e triggers
3. **Commit sempre antes do deploy**: `git commit → git push → npm run deploy`
4. **Rollback disponível**: tag `pre-rm-fase1` @ `feed0c5`
5. **Supabase MCP disponível**: `mcp_supabase_apply_migration` + `mcp_supabase_execute_sql`
6. **Não usar `has_preached` como critério de modalidade** — apenas para `field_service_status`
7. **PE's no S-1**: aguardar decisão do Eliezer (§4) antes de alterar
8. **Motor 'Gerar' 100% Intocado**: Nenhuma alteração no Curador IA, Base de Conhecimento ou Agente Especialista pode interferir na lógica determinística de `unifiedRotationService.ts` e `generationService.ts`.
9. **Elegibilidade Estrita no Curador**: Recomendações do Curador devem sempre consumir o conjunto retornado por `getRankedEligibleForPart()` (ou seja, publicadores que atendem às regras canônicas de gênero, cargo, disponibilidade e cooldown).
10. **Curador Híbrido**: Respeitar a precedência do ponto de partida determinístico (`syntheticProfiles` +300 pts) garantindo ao mesmo tempo flexibilidade para exibição e escolha de todos os demais elegíveis da semana.

