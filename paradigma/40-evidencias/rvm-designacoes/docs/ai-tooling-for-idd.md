# AI Tooling for IDD

> **Rubrica de recursos de IA e mecanismos de compliance IDE-agnósticos para engenharia orientada por intenção (Intent-Driven Development).**  
> Autor: Eliezer + Claude, 2026-08-14 · Versão inicial.  
> Escopo: RVM Designações e, por extensão, qualquer projeto que adote IDD.

---

## §0 — Sumário executivo

O documento entrega três coisas:

1. **Taxonomia** dos recursos de IA úteis ao IDD, organizados em 6 camadas.
2. **Matriz de decisão**: qual recurso ativar para cada tipo de tarefa.
3. **Mecanismos de compliance IDE-agnósticos**: como *forçar* qualquer IDE
   com IA (VS Code+Copilot, Cursor, Windsurf, Antigravity, Cline, Zed, JetBrains
   AI, etc.) a se submeter à disciplina IDD, sem depender de features
   proprietárias.

Princípio guia: **determinismo estrutural + potência semântica**. Fixar o
esqueleto do trabalho (invariantes, artefatos, cheques) e liberar a
criatividade só no miolo.

---

## §1 — Recap IDD e vocabulário

- **Comando Epistêmico**: autoridade sobre *o quê* e *o porquê*. Permanece
  com o humano.
- **Comando Operacional**: autoridade sobre *o como* (ferramentas, sintaxe,
  sequência). Pode ser delegado à IA.
- **Intent Runbook** (`.intent.md`): declaração viva com WHY + WHAT +
  INVARIANTS + AUTH + ADAPTERS + POST-EXECUTION. Fonte de verdade.
- **Invariante**: propriedade que sobrevive a qualquer refactor. Codificada
  em teste, RLS, schema, RPC ou lint rule.
- **Adapter**: implementação local intercambiável de um contrato universal.
- **Checkpoint (CP-N)**: ponto explícito de reaprovação humana entre fases.

Referência canônica: `/memories/idd-comando-epistemico-vs-operacional.md`
e `/memories/idd-runbooks-pattern.md`.

---

## §2 — Taxonomia dos recursos (6 camadas)

Ordem crescente do concreto (bits gerados) para o abstrato (governança).

### Camada 1 — Restrição na saída do modelo

| Recurso | O que faz | Determinismo | Potência | Quando usar |
|---|---|---|---|---|
| **JSON Mode / Structured Output** | Força output a validar contra JSON Schema. | Alto | Média | Toda ação parseável (planos, tool calls). |
| **Function Calling / Tool Use** | Modelo escolhe entre ferramentas com assinatura tipada. | Alto | Alta | Orquestração com efeitos colaterais. |
| **Grammar-guided sampling** (Outlines, Guidance, LMQL, XGrammar) | Restringe a geração a uma gramática (regex/CFG). | Muito alto | Baixa/Média | Formatos específicos (DSLs, SQL restrito). |
| **`temperature=0` + `seed`** | Determinismo estatístico local. | Alto | Reduzida | Testes, execuções auditáveis. |
| **`max_tokens` + `stop` explícitos** | Impede prolixidade, força fechamento. | Médio | Neutra | Sempre — cinto de segurança. |

### Camada 2 — Grounding em fontes de verdade

| Recurso | O que faz | Quando usar |
|---|---|---|
| **RAG híbrido** (semântico + BM25) | Recupera trechos reais do repo/docs antes de responder. | Toda tarefa que menciona arquivos, funções, símbolos. |
| **Leitura obrigatória antes de escrita** (`read_file`, `grep`) | Impede editar sem ler. | Padrão universal de agentes de código. |
| **Compilador / typecheck no loop** (`tsc --noEmit`, `mypy`, `cargo check`) | Recebe erros do oráculo como fato. | Após cada bloco de código. |
| **Test runner no loop** (Vitest, pytest, deno test) | Executa testes existentes; regressões viram bloqueio. | Após cada mudança lógica. |
| **MCP servers** (Supabase, GitHub, Playwright, filesystem…) | Padroniza contexto vivo. | Consulta de dados/estado. |
| **Snapshot dumps** (schema, migrations, RLS policies) | Coloca estado real em contexto imutável. | Início de sessão longa. |

### Camada 3 — Orquestração / raciocínio estruturado

| Padrão | O que faz | Custo | Quando usar |
|---|---|---|---|
| **Plan → Approve → Execute** | Modelo produz plano; humano aprova; então executa. | Baixo | Toda mudança arquitetural. |
| **Checkpoints (CP-1/CP-2/CP-3)** | Pausa obrigatória entre fases. | Baixo | PRs multi-arquivo. |
| **ReAct** (Reason + Act) | Loop `pensar → agir → observar → pensar`. | Médio | Debug, exploração. |
| **Reflection / Self-critique** | Modelo revisa a própria saída contra invariantes. | Médio | Antes de finalizar entregável. |
| **Chain-of-Thought explícito** | "Reason step by step" antes da resposta. | Médio | Lógica, matemática, análise causal. |
| **Extended Thinking / Reasoning modes** | Tokens dedicados só à deliberação interna (Claude Opus/Sonnet 4.5, Gemini 3 Pro thinking, GPT-5-thinking, o3/o4). | Alto | Modelagem semântica, decisões arquiteturais. |
| **Tree of Thoughts / Multi-agent** | Hipóteses paralelas + agregação. | Muito alto | Quando 1 candidato não convence. |
| **Prompt caching** (Anthropic, Gemini) | Reutiliza contexto grande. | Reduz custo | Sessões longas com contexto fixo. |

### Camada 4 — Validação e portões (gates)

| Recurso | O que faz | Quando usar |
|---|---|---|
| **Schema validators** (Zod, Pydantic, JSON Schema, io-ts) | Rejeita output malformado. | Configuração, dados estruturados, tool responses. |
| **Linters** (ESLint, Ruff, Biome, Clippy) | Padrão de código como invariante mecânico. | Todo commit em CI. |
| **Type checkers** (`tsc`, MyPy, MyPyC) | Contrato tipado como invariante. | Toda edição. |
| **Property-based testing** (fast-check, Hypothesis) | Invariantes contra entradas geradas. | Parsers, motores de decisão, permissões. |
| **RLS / policy tests** | Auth como oráculo. | Cada mudança em RLS/RPC. |
| **Contract testing** (Pact, dredd) | Interfaces entre serviços não podem drift. | Backend distribuído. |

### Camada 5 — Memória e continuidade

| Recurso | O que faz | Quando usar |
|---|---|---|
| **Skills / `SKILL.md`** | Conhecimento de domínio invocável sob demanda. | Padrões repetíveis (dbt, migrations, portal-tokens). |
| **`.intent.md` runbooks** | WHY+WHAT+INVARIANTS+AUTH em frontmatter. | Operações recorrentes com risco. |
| **Estado persistente** (`/memories/`, `/memories/repo/`, `/memories/session/`) | Notas cross-session sobrevivem a crash. | Contexto vivo do projeto. |
| **Handoff documents** | Snapshot rico entre sessões/agentes. | Trocar de modelo (Sonnet ↔ Opus ↔ Gemini). |
| **AGENTS.md / README-first** | Convenção lida por todo agente decente. | Ponto de entrada padronizado. |

### Camada 6 — Ambientes de execução como oráculo

| Recurso | O que faz | Quando usar |
|---|---|---|
| **Code sandbox** (E2B, Modal, Piston, Deno Deploy) | Executa código gerado; devolve output real. | Cálculos, transformações, geração de artefatos. |
| **DB shadow / branch** (Supabase branches, Neon branches) | Aplica migration em ramo isolado. | Toda migration destrutiva. |
| **Preview deploys** (Vercel branch, Netlify preview) | Rodar UI antes de merge. | Frontend crítico. |
| **Ephemeral containers** (Docker Compose, devcontainer) | Ambiente reproduzível. | Onboarding, teste local. |

---

## §3 — Matriz de decisão por tipo de tarefa

| Tipo de tarefa | Camada 1 | Camada 2 | Camada 3 | Camada 4 | Camada 5 | Camada 6 |
|---|---|---|---|---|---|---|
| **Bugfix pontual** | `temp=0` | read+grep | ReAct | typecheck + testes | atualizar `_ESTADO-ATUAL.md` | — |
| **Feature nova (invasiva)** | JSON output para plano | RAG completo | Plan+CP-1/2/3 + Extended Thinking | schema + testes + RLS | criar `.intent.md` | preview deploy |
| **Migration SQL** | template fixo `### ARQUIVO:` | dump do schema atual | Plan+CP-1 | idempotência + RLS test | atualizar `migrations-audit.md` | Supabase branch |
| **Refactor arquitetural** | JSON output | RAG + snapshot classes | Plan+CP + Reflection | testes de contrato | UML antes | branch preview |
| **Análise/diagnóstico** | markdown estruturado | read + queries reais | Extended Thinking | — | salvar em `/memories/repo/` | — |
| **Documentação** | markdown com frontmatter | read do código atual | Reflection contra código | linter markdown | commit em `docs/` | — |
| **Rotina operacional** (deploy, backup, rotate secrets) | tool calling | MCP servers | Plan+confirm-once | script idempotente | `.intent.md` runbook | — |

---

## §4 — Mecanismos de compliance IDE-agnósticos

O objetivo: garantir que **qualquer IDE com IA** (Copilot, Cursor, Windsurf,
Antigravity, Cline, Zed AI, JetBrains AI, ChatGPT desktop, Claude desktop,
Aider, Continue…) siga as regras IDD. Estratégia em três anéis
concêntricos.

### Anel 1 — Convenções universais no repositório

Estes arquivos são lidos por **quase todos os assistentes atuais** por
convenção. Colocá-los no root ou em `.github/`:

| Arquivo | Lido por | Papel no IDD |
|---|---|---|
| `AGENTS.md` (root) | Cursor, Windsurf, Cline, Aider, Copilot recente, Antigravity | **Ponto de entrada canônico.** Descreve invariantes globais, workflow, checkpoints, formato de entrega, comandos build/test/deploy. |
| `README.md` | Todo mundo | Menciona AGENTS.md, invariantes-chave, contratos de compliance. |
| `.editorconfig` | Todo editor | Formatação → determinismo trivial. |
| `.gitattributes` | Git + IDEs | EOL, encoding. |
| `LICENSE` | Detecção automática | Restrições de reprodução do código gerado. |
| `CONTRIBUTING.md` | GitHub e ferramentas | Regras de PR (checklist, formato de commit). |

**Regra dourada**: se um agente lê apenas UM arquivo antes de agir, deve ser
o `AGENTS.md`. Se ler dois, adicionar `README.md`. Tudo mais é bônus.

### Anel 2 — Instruções específicas por IDE (redundância intencional)

Cada IDE tem convenção própria. Mantenha o mesmo conteúdo em vários lugares
para cobrir todos:

| IDE / Ferramenta | Arquivo(s) que ele consome | Estratégia |
|---|---|---|
| VS Code + Copilot Chat | `.github/copilot-instructions.md` (auto), `**/*.instructions.md` com frontmatter `applyTo`, `**/*.prompt.md`, `.github/agents/*.agent.md` | Espelhar `AGENTS.md` em `copilot-instructions.md`. Criar `.instructions.md` scoped por pasta (`applyTo: 'src/**'`). |
| Cursor | `.cursorrules` (root, legado) OU `.cursor/rules/*.mdc` com frontmatter (novo) | Ambos apontam para `AGENTS.md`. |
| Windsurf | `.windsurfrules` (root) | Idem. |
| Antigravity | `.antigravity/rules.md` ou similar (varia por versão) | Alias para `AGENTS.md`. |
| Cline | Custom instructions no settings.json + `.clinerules` | Idem. |
| Aider | `CONVENTIONS.md` ou `.aider.conf.yml` | Idem. |
| Claude Desktop / Projects | Project Instructions no UI | Copiar `AGENTS.md`. |
| ChatGPT Desktop / Custom GPT | Instructions field | Idem. |
| JetBrains AI Assistant | Configuração da IDE (Settings > Tools > AI Assistant) | Idem. |
| Continue.dev | `.continue/config.json` + system message | Idem. |

**Script de sincronização** (opcional mas recomendado): um `sync-ai-rules.sh`
que copia `AGENTS.md` para todos os arquivos secundários. Um único source of
truth.

Exemplo:

```bash
#!/usr/bin/env bash
# sync-ai-rules.sh
set -e
SOURCE="AGENTS.md"
cp "$SOURCE" ".github/copilot-instructions.md"
cp "$SOURCE" ".cursorrules"
cp "$SOURCE" ".windsurfrules"
# etc.
git add -A
echo "AI rules synced from $SOURCE"
```

### Anel 3 — Gates fora do editor (compliance forçado)

Nenhuma regra em arquivo markdown é *obrigatória* para a IA — o modelo pode
escolher ignorar. Para compliance **forçado**, precisamos de gates que
existem fora do editor:

#### 3.1 Pre-commit hooks (via `pre-commit` ou `husky`)

Roda ANTES do commit; se algo violar, commit é rejeitado. Independe de IDE.

Exemplos:

- `check-invariants.sh` — grep por padrões proibidos (ex.: `signInWithPassword`,
  `disable RLS`, `TODO` sem issue).
- `typecheck.sh` — `tsc --noEmit`.
- `lint.sh` — ESLint/Biome/Ruff com `--max-warnings 0`.
- `test-affected.sh` — Vitest/Jest só nos arquivos tocados.

#### 3.2 CI / GitHub Actions

Espelha os pre-commits e adiciona checks pesados que rodam em servidor:

- Build inteiro.
- Migração aplicada em Supabase branch.
- Testes E2E (Playwright) no preview deploy.
- Análise estática (CodeQL, Semgrep).
- Verificação de sincronia AGENTS.md ↔ arquivos secundários.

#### 3.3 Testes como oráculo

Cada invariante DEVE ter pelo menos um teste correspondente:

- I-1 "auth JWT válido" → teste que faz login e valida `session.access_token`.
- I-2 "credenciais persistidas em SQL" → teste que insere + SELECT com RLS.
- I-5 "biometria não finge sucesso" → teste que force
  `isWebAuthnAvailable=false` e verifica que sign-in não retorna sucesso
  falso.

Sem teste, a invariante é retórica. Um invariante sem teste é um bug futuro.

#### 3.4 Schema validators em runtime

Zod/Pydantic em bordas críticas (requests, responses, config). O código
recusa entrada malformada. Se a IA gerar chamada malformada, quebra na hora,
não em produção 3 dias depois.

#### 3.5 Custom lint rules

ESLint plugin próprio ou Semgrep rules com padrões proibidos:

```yaml
# .semgrep.yml
rules:
  - id: no-supabase-signInWithIdToken-with-custom-jwt
    pattern: supabase.auth.signInWithIdToken({ token: $X })
    message: "signInWithIdToken só aceita ID token OAuth; use verifyOtp para magic link"
    severity: ERROR
```

#### 3.6 Runbook `.intent.md` com frontmatter estruturado

Frontmatter YAML força IDEs a parsear (não apenas ler prosa):

```yaml
---
title: Rotate Secrets
description: Rotação atômica de tokens/keys por adapter
invocation:
  - "rotacione segredos"
  - "rotate secrets"
authorization: confirm-once
invariants:
  - "nunca escrever segredo em log"
  - "sempre ter fallback rollback"
adapters:
  - name: supabase
    file: adapters/supabase-rotate.ts
  - name: vercel
    file: adapters/vercel-rotate.ts
checkpoints:
  - id: CP-1
    after: plano
    require_human: true
  - id: CP-2
    after: aplicado_em_staging
    require_human: true
---
```

Agentes decentes leem YAML e respeitam. Agentes ruins ignoram, mas então
não passam nos gates dos anéis 1-3.

---

## §5 — Padrões de ativação (templates prontos)

### 5.1 Prompt canônico para tarefa multi-arquivo (bloco reutilizável)

```
# INTENÇÃO
<uma frase clara do WHY + WHAT>

# INVARIANTES (I-1..I-N)
1. <invariante>
2. <invariante>
...

# ESTADO ATUAL
<snapshot dos arquivos relevantes ou link para eles>

# MODELO SEMÂNTICO
```mermaid
<diagrama TO-BE>
```

# ESCOPO
DEVE preservar: <arquivos/fluxos que não pode tocar>
DEVE modificar: <arquivos que precisa refatorar>
DEVE criar: <arquivos novos>

# CHECKPOINTS OBRIGATÓRIOS
CP-1: depois do plano, antes do código.
CP-2: depois do backend, antes do frontend.
CP-3: depois do frontend, antes de testes.

# FORMATO DE ENTREGA
### ARQUIVO: <caminho relativo>
### AÇÃO: CREATE | UPDATE | DELETE
<conteúdo integral>

# QUALIDADE MÍNIMA
- TS strict, zero any implícito.
- Zero secret hardcoded.
- Migration idempotente.
- Log estruturado sem dados sensíveis.

Comece pelo plano. Não escreva código antes de CP-1.
```

### 5.2 Prompt para bugfix rápido

```
# BUG
<sintoma + reprodução>

# HIPÓTESE ATUAL
<seu palpite ou "sem hipótese">

# INVARIANTE VIOLADA
<qual>

# ONDE OLHAR PRIMEIRO
<arquivo/função>

Faça: 1) leia o(s) arquivo(s); 2) confirme a hipótese ou proponha
outra; 3) SÓ ENTÃO proponha diff mínimo. Não altere nada além do bug.
```

### 5.3 Prompt para análise/diagnóstico (zero código)

```
# QUESTÃO
<pergunta>

# RESTRIÇÃO
NÃO altere código. Só leia, analise, relate.

# ENTREGA
- Diagnóstico em prosa.
- Tabela com evidências (arquivo:linha + trecho).
- Riscos ordenados por severidade.
- Recomendações rankeadas por esforço vs impacto.
```

---

## §6 — Anti-padrões (o que evitar)

| Anti-padrão | Por que ruim | Substituir por |
|---|---|---|
| `temperature > 0.5` em código de produção | Perde reprodutibilidade. | `temperature=0.1` (ou 0). |
| Tools sem JSON Schema | Modelo aluciana parâmetros. | Toda tool com schema tipado. |
| Confiar em RAG só semântico | Falsos positivos frequentes. | RAG híbrido (semântico + BM25 + AST-aware). |
| Multi-agent parallelism sem evaluator | Custo alto, não converge. | Só se houver oráculo forte de agregação. |
| "Deixa o modelo decidir o que fazer agora" | É o oposto do IDD. | Plan → Approve → Execute. |
| Vibe-coding contra prazo | Débito técnico exponencial. | Recusar. Preferir menos código + mais invariante. |
| Regras só em markdown, sem gate | Modelo pode ignorar. | Duplicar em teste/lint/CI. |
| Runbook sem checkpoint | Modelo executa até o fim sem parar. | Sempre CP-N obrigatórios. |
| `.intent.md` sem invariantes | Vira só descrição. | Invariante = seção obrigatória. |
| Prompt gigante com tudo | Contexto explode + perde ancoragem. | Skills sob demanda + RAG. |

---

## §7 — Playbook aplicado ao RVM Designações

Estado hoje (para calibrar):

- ✅ Skills globais no VS Code Copilot (bigquery, supabase, python, etc.).
- ✅ MCP servers configurados (supabase, github, playwright, filesystem).
- ✅ Padrão `.intent.md` estabelecido (rotate-secrets, rm-invariants).
- ✅ Memória persistente (`/memories/`).
- ⚠️ Não tem `AGENTS.md` no root do RVM.
- ⚠️ Não tem pre-commit hooks nem CI.
- ⚠️ Testes existem, mas não são gate de merge (não bloqueiam).
- ⚠️ Semgrep/custom-lint não configurado.
- ⚠️ Nenhum `.intent.md` cobre auth ou portal.

### Ordem de adoção sugerida (esforço crescente, valor decrescente)

**Onda 1 — quick wins (dias):**

1. Criar `AGENTS.md` no root do repo com invariantes globais + regras de
   entrega. Link para `_ESTADO-ATUAL.md` e para skills.
2. Criar `.github/copilot-instructions.md` como espelho.
3. Adicionar `sync-ai-rules.sh` para propagar para `.cursorrules`,
   `.windsurfrules`, etc.
4. Adicionar `.editorconfig` explícito (EOL LF, encoding UTF-8, indent 4/2
   conforme padrão).
5. Escrever runbook `.intent.md` para "publicar-semana" (o botão Publicar
   que ainda quebra silencioso).

**Onda 2 — gates leves (1-2 semanas):**

6. Adicionar Husky + lint-staged: `tsc --noEmit`, ESLint, prettier check.
7. GitHub Action que roda build + typecheck em toda PR.
8. Adicionar ao AGENTS.md: "todo output multi-arquivo deve seguir formato
   `### ARQUIVO: ... ### AÇÃO: ...`".
9. Runbooks `.intent.md` para: publicar-semana, portal-token-only,
   rotate-secrets (já feito).

**Onda 3 — gates fortes (2-4 semanas):**

10. Testes E2E Playwright para os 3 portais principais.
11. Semgrep com 10-20 regras contra armadilhas específicas do Supabase
    (signInWithIdToken abuse, RLS disabled, etc.).
12. Migração para Supabase branches em PRs.
13. Preview deploy Vercel em cada PR + smoke tests automáticos.

**Onda 4 — engenharia de precisão (contínuo):**

14. Property-based testing no motor de escala.
15. Contract tests entre Edge Functions e frontend.
16. Auditoria periódica: quantos PRs bloquearam via gate x quantos
    passaram? Ajustar rigor.

---

## §8 — Rubrica compacta (checklist antes de invocar IA)

Antes de mandar prompt para qualquer IDE/IA:

- [ ] O `AGENTS.md` está atualizado?
- [ ] A tarefa tem intenção clara escrita em português?
- [ ] Invariantes estão listadas e numeradas?
- [ ] Escopo (preservar / modificar / criar) está explícito?
- [ ] Formato de entrega está no prompt?
- [ ] Checkpoints estão declarados?
- [ ] Extended Thinking está ligado (se disponível)?
- [ ] Modelo escolhido tem thinking mode + tool use tipado?
- [ ] `temperature=0` ou próximo?
- [ ] Contexto grande está em prompt cache (se aplicável)?
- [ ] Tem RAG do repo ativo?
- [ ] Sabe onde parar e me perguntar?

Se qualquer resposta for "não", pare e ajuste antes de gastar tokens.

---

## §9 — Escolhendo modelo por tarefa

Recomendação prática (2026-08, ajustar quando modelos mudarem):

| Tarefa | Modelo primário | Modelo secundário (alternativo) | Por quê |
|---|---|---|---|
| Modelagem semântica / arquitetura | Claude Opus 4.7 (thinking) OR Gemini 3 Pro (thinking) | GPT-5 (reasoning) | Melhor para raciocínio conceitual longo. |
| Refactor de código grande | Claude Sonnet 4.5 (thinking) OR Gemini 3 Pro | Claude Opus 4.7 | Sonnet 4.5 tem excelente custo/qualidade em código. |
| Bugfix rápido | Claude Sonnet 4.5 (regular) OR GPT-5 | Gemini 3 Pro | Rapidez. Contexto menor. |
| Análise / diagnóstico | Claude Opus 4.7 (thinking) OR GPT-5-thinking | Gemini 3 Pro | Qualidade de análise. |
| Scaffolding / boilerplate | Sonnet 4.5 OR Gemini 3 Pro | Copilot autocomplete | Barato + rápido. |
| Revisão de PR / crítica | Claude Opus 4.7 (thinking) | GPT-5 | Cético, meticuloso. |
| Rotina operacional (deploy, migration) | Claude Sonnet 4.5 (com tools) | Gemini 3 Pro | Rapidez + tool use robusto. |
| Prompt engineering | Claude Opus 4.7 | GPT-5 | Meta-linguística. |

**Regras universais:**

- Nunca use modelos abaixo do tier "flagship" (Sonnet, GPT-5, Gemini Pro)
  para código de produção. Modelos menores (Haiku, Nano, Flash) só como
  auxiliares em pré-processamento/sumarização.
- Sempre ligue thinking/reasoning quando disponível para tarefas
  arquiteturais.
- Prompt caching é diferencial competitivo enorme para sessões longas.

---

## §10 — Migração progressiva (roadmap)

Fase 0 (hoje):
- Skills globais + MCP + memórias + alguns `.intent.md` isolados.

Fase 1 (semana 1):
- `AGENTS.md` root + espelhos IDE-específicos + `.editorconfig`.
- Sync script.
- Runbook publicar-semana.

Fase 2 (semana 2-3):
- Husky + lint-staged + GitHub Action de typecheck/lint.
- Formato de entrega imposto no AGENTS.md.
- Extended Thinking obrigatório para tarefas arquiteturais (regra em
  AGENTS.md).

Fase 3 (mês 2):
- Testes E2E dos 3 portais.
- Semgrep com regras contra armadilhas Supabase.
- Supabase branches em PRs.

Fase 4 (contínuo):
- Property tests no motor.
- Contract tests.
- Auditoria de compliance quinzenal.
- Atualização deste documento a cada mudança de modelo/tooling.

---

## §11 — Métricas de sucesso

Mensurar mensalmente:

| Métrica | Meta | Instrumento |
|---|---|---|
| % PRs que passam CI de 1ª tentativa | > 70% | GitHub Actions logs |
| Tempo médio entre "IA sugere" e "aprovo merge" | < 2h em bugfix; < 1 dia em feature | Manual |
| Nº de rollbacks / mês | ≤ 1 | Git log |
| Cobertura de invariantes por teste | ≥ 80% | Cobertura customizada |
| Nº de bugs latentes detectados por Semgrep | Crescente até estabilizar | Semgrep report |
| Nº de sessões com "contexto perdido" (agente esquece invariante mid-task) | Decrescente | Retrospectiva manual |

---

## §12 — Considerações finais

**IDD não é sobre restringir a IA. É sobre restringir o CAOS.**

A IA melhora quando o contexto é preciso, a intenção é declarada e os
checkpoints são respeitados. Modelos flagship em 2026 são poderosos demais
para serem usados sem essa disciplina — o problema não é potência insuficiente,
é ausência de estrutura.

Este documento é vivo. Atualizar quando:

- Um novo modelo flagship sair.
- Um novo padrão de tool use for consolidado.
- Uma nova IDE adotar convenção diferente.
- Um invariante do RVM for reformulado.

**Regra de manutenção**: revisar 1x por mês; atualizar mesmo que só para
confirmar "sem mudanças". Assim ele nunca fica obsoleto silenciosamente.

---

## Apêndice A — Exemplo de `AGENTS.md` para RVM (esqueleto)

```markdown
# AGENTS.md — RVM Designações

## Você está trabalhando neste repositório

Sistema interno de gestão de designações de reunião. Stack: React 18 + Vite
+ TypeScript strict, Supabase (Auth + Postgres + Edge Functions Deno).

## Ler ANTES de agir

1. `docs/ai-tooling-for-idd.md` — regras metodológicas.
2. `/memories/repo/_ESTADO-ATUAL.md` — estado vivo do projeto.
3. `.agents/workflows/*.intent.md` — runbooks de operações recorrentes.

## Invariantes globais (I-G-1..I-G-N)

I-G-1 RLS Fase 4 é lei: SELECT em `publishers` e `workbook_parts` restrito
      a `is_editor()`. Não afrouxar.
I-G-2 Portal token-only Fase 1: `?portal=confirm|availability|publisher-form`
      NÃO exige Google login. Não reintroduzir guard.
I-G-3 Migrations em `supabase/migrations/` são append-only. Nunca editar
      histórico. Adicionar migration nova para corrigir anterior.
I-G-4 Zero secret em cliente. Usar `Deno.env.get()` em Edge Functions.
I-G-5 Encoding UTF-8; EOL LF; TypeScript strict.

## Workflow

1. Ler estado atual.
2. Produzir plano em português.
3. Esperar aprovação (CP-1).
4. Implementar em blocos `### ARQUIVO: ... ### AÇÃO: ...`.
5. Reflection: cheque invariantes item-a-item.
6. Esperar aprovação de merge (CP-final).

## Comandos

- Build: `npm run build`
- Typecheck: `npm run typecheck` OR `npx tsc --noEmit`
- Test: `npm test`
- Deploy: `git push origin main && npm run deploy`
- Migration: adicionar arquivo em `supabase/migrations/` com timestamp
  YYYYMMDDhhmmss e usar MCP para aplicar.

## Formato de entrega

Sempre:

### ARQUIVO: <caminho>
### AÇÃO: CREATE | UPDATE | DELETE
<conteúdo integral>

Nunca diff/patch.

## Checkpoints

Toda tarefa multi-arquivo tem CP-1 (plano), CP-2 (backend pronto),
CP-3 (frontend pronto). Pare e pergunte a cada CP.

## Escalar dúvidas

Se qualquer regra acima entrar em conflito com o que o usuário pede: PARE
e pergunte. Não decida sozinho.
```

## Apêndice B — Exemplo de `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 4

[*.{ts,tsx,js,jsx,json}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

## Apêndice C — Exemplo de pre-commit hook (`.husky/pre-commit`)

```bash
#!/usr/bin/env sh
set -e

npx lint-staged
npx tsc --noEmit
npm run test -- --run --changed
```

E `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --max-warnings 0", "prettier --check"],
    "*.{md,json}": ["prettier --check"]
  }
}
```

## Apêndice D — Exemplo de GitHub Action

```yaml
name: quality-gate
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint . --max-warnings 0
      - run: npm test -- --run
      - run: npm run build
```

## Apêndice E — Exemplo de Semgrep rule contra armadilha Supabase

```yaml
rules:
  - id: no-signInWithIdToken-custom
    languages: [typescript]
    message: >
      signInWithIdToken só aceita ID token OAuth (Google/Apple/etc). Para
      login custom (WebAuthn/passkey), use admin.generateLink → verifyOtp.
    severity: ERROR
    pattern-either:
      - pattern: supabase.auth.signInWithIdToken({ token: $X, provider: "custom" })
      - pattern: supabase.auth.signInWithIdToken({ token: $X, provider: "webauthn" })

  - id: no-rls-disable
    languages: [sql]
    message: RLS não pode ser desabilitado. Use policy correta.
    severity: ERROR
    pattern: ALTER TABLE $T DISABLE ROW LEVEL SECURITY

  - id: no-hardcoded-supabase-key
    languages: [typescript]
    message: Chave Supabase hardcoded. Use env var.
    severity: ERROR
    pattern-regex: 'sb_(publishable|secret)_[A-Za-z0-9\-_]{20,}'
```

---

**Fim do documento.**  
Contribuições e revisões: abrir issue com label `ai-tooling`.  
Referências cruzadas: `/memories/idd-runbooks-pattern.md`,
`/memories/idd-comando-epistemico-vs-operacional.md`,
`docs/manifesto_tecnico_rvm_designacoes.md`.
