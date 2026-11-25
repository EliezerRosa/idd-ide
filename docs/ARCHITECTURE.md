# Arquitetura do IDD IDE

## Visão Geral

O protótipo funcional atual do IDD opera como um ecossistema modular composto pelo núcleo `@idd/core`, pela CLI `idd`, pelo plugin ESLint `@idd/eslint-plugin` e pela extensão VS Code + servidor LSP experimental (`extensions/idd-core/`). A **IDE dedicada sobre fork do Code - OSS** é um projeto futuro de longo prazo (🔭 — hoje existe apenas `product.json` de marca; ver [README](../README.md) e [ROADMAP](ROADMAP.md)).

```
Desenvolvedor
     │
     ▼ declara intenção
┌─────────────────────┐
│  Intent Capture UI  │  ← painel webview com 4 passos
└─────────────────────┘
     │ .intent.yaml
     ▼
┌─────────────────────┐
│   Intent Engine     │  ← Intent Parser + Context Manager + LLM Adapter + Formatter
└─────────────────────┘
     │ código + testes + docs + signature
     ▼
┌─────────────────────┐      ┌─────────────────┐
│  Code Workspace     │ ←──→ │  Intent Graph   │
│  (editor aumentado) │      │  (Cytoscape.js) │
└─────────────────────┘      └─────────────────┘
     │ código atual
     ▼
┌─────────────────────┐      ┌─────────────────┐
│  Intent Verifier    │ ──→  │  Intent Store   │
│  (drift detection)  │      │  (SQLite + Git) │
└─────────────────────┘      └─────────────────┘
     │ feedback loop
     └──────────────────────────────────────────→ Intent Capture UI
```

---

## Componente 1 — Intent Capture UI

**Localização:** `extensions/idd-core/src/capture/IntentCapturePanel.ts`

O painel de captura é um VS Code Webview Panel com 4 passos sequenciais:

### Passo 1 — Declaração da intenção
O desenvolvedor descreve em linguagem natural o comportamento esperado. Esta frase é a âncora semântica que o Verifier usa para medir alinhamento.

### Passo 2 — Constraints
Regras de negócio obrigatórias. Cada constraint:
- É armazenada com severidade (`critical` ou `warn`) no Intent Store
- É verificada continuamente pelo Verifier
- Bloqueia commit via pre-commit hook se violada criticamente

### Passo 3 — Critérios de aceite
Cada critério vira automaticamente um caso de teste via Output Formatter. O desenvolvedor define *o quê testar*; o LLM define *como testar*.

### Passo 4 — Dependências
Vínculos `depends_on` / `used_by` que alimentam:
- O **Context Manager** (injeta contratos das dependências no prompt)
- O **Intent Graph** (arestas entre nós)
- O **Verifier** (propagação de drift em cascata)

**Saída:** arquivo `.intent.yaml` estruturado, validado pelo JSON Schema em `schemas/intent.schema.json`.

---

## Componente 2 — Intent Engine

**Localização:** `extensions/idd-core/src/engine/IntentEngine.ts` / `cli/src/commands/generate.ts`

Pipeline de 4 estágios:

### Estágio 1 — Intent Parser
Transforma o `.intent.yaml` em dois prompts complementares:

```
system prompt → papel do LLM + instruções de formato JSON
user prompt   → intenção + constraints numeradas + critérios + linguagem
```

### Estágio 2 — Context Manager
Antes da chamada ao LLM, consulta o Intent Store para todas as intenções em `depends_on` e injeta seus contratos como contexto adicional. Isso garante que o código gerado seja **consistente com o restante do projeto**.

### Estágio 3 — LLM Adapter
Chama a Claude API (`claude-sonnet-5` por padrão, configurável via `IDD_MODEL`) com os prompts montados. A resposta é solicitada como JSON estruturado com campos `code`, `tests`, `docs` (🧪 protótipo sem *structured outputs* nativos nem retry automático).

### Estágio 4 — Output Formatter
- Parseia o JSON retornado pelo LLM
- Grava os artefatos no workspace (`{sub}.ts`, `{sub}.test.ts`, `{sub}.md`)
- Cria uma `intent_signature` no Intent Store:

```json
{
  "intent_hash":      "sha256 do .intent.yaml",
  "generated_at":     "2026-05-20T...",
  "model_used":       "claude-sonnet-5",
  "criteria_covered": 4,
  "criteria_total":   4
}
```

Esta assinatura é a **baseline** que o Intent Verifier usa para detectar drift.

---

## Componente 3 — Code Workspace (Extensão VS Code — 🧪 experimental)

**Localização:** `extensions/idd-core/src/extension.ts`

A extensão para VS Code (não publicada no Open VSX) fornece:

- **Anotações de drift inline no editor (🔭 proposta não implementada):** planejada para exibir a intenção vinculada por trecho de código; ainda não existe no código atual.
- **Diagnósticos LSP (🧪 experimental):** o servidor em `extensions/idd-core/src/lsp/server.ts` valida `.intent.yaml`, dicionário ubíquo e `state_mutation` via AST apenas em TypeScript com decorator `@Intent`.
- **Auto-verificação:** `onDidSaveTextDocument` dispara `verifier.verifyFile` ao salvar `.ts` ou `.py` quando `idd.autoVerify` está ativo.
- **Comandos contribuídos:**
  - `IDD: Nova Intenção`
  - `IDD: Gerar Código`
  - `IDD: Verificar Alinhamento`
  - `IDD: Abrir Intent Graph`

---

## Componente 4 — Intent Graph

**Localização:** `extensions/idd-core/src/capture/IntentGraphPanel.ts`

Painel lateral implementado como VS Code Webview usando **Cytoscape.js**.

### Estrutura do grafo
- **Nós:** uma intenção por nó, cor = status atual
- **Arestas:** `depends_on` → arestas direcionadas
- **Arestas tracejadas vermelhas:** módulo de origem tem drift

### Codificação visual

| Status | Cor do nó | Significado |
|---|---|---|
| `ok` | Verde `#1D9E75` | Alinhado com a intenção |
| `drift` | Vermelho `#E24B4A` | Constraint violada |
| `warn` | Âmbar `#EF9F27` | Desvio não crítico |
| `orphan` | Cinza `#888780` | Sem dependências declaradas |

### Análise de impacto
O grafo permite responder: "se eu mudar `users/crud`, o que pode quebrar?" — atravessando o grafo pelo inverso das arestas (`used_by`).

---

## Componente 5 — Intent Verifier

**Localização:** `cli/src/commands/verify.ts` · `cli/src/lib/mutationFence.ts` · `cli/src/lib/fase0/astGraph.ts` · `extensions/idd-core/src/verifier/IntentVerifier.ts`

Quatro camadas de verificação com níveis distintos de maturidade:

### Camada 1 — Cerca de Mutação AST (✅ TypeScript-only, análise local)
Usa a TypeScript Compiler API (`ts.createSourceFile`) em `mutationFence.ts` + `astGraph.ts` para verificar mutações de `this`, acessores `get`/`set`, campos `allowed_fields` (`INV-UI-04`), `read_only_fields` (`INV-ENCAP-01`) e mutações dinâmicas em `this[expr]` (`INV-UI-05`), além das regras do `@idd/eslint-plugin`. **Limite conhecido:** análise intraprocedural em arquivo único; não bloqueia contornos via aliasing passado a funções externas, `Object.assign`/`Reflect.set` indiretos ou `any`.

### Camada 2 — Dicionário Ubíquo e Fronteiras de Contexto (✅ offline / CI)
Valida termos do contrato contra `.intent/ubiquitous-dictionary.json` e checa importações ilegais entre bounded contexts (`idd verify --project`, por regex em arquivos TS/JS).

### Camada 3 — Regras Estáticas Heurísticas (🧪 experimental)
Padrões proibidos (`FORBIDDEN`) e palavras-chave (`CONSTRAINT_CHECKS`) em `cli/src/commands/verify.ts`, sem medição empírica de *precision*/*recall*:

```typescript
const FORBIDDEN = [
  { re: /console\.log.*password/i,  severity: 'critical' },
  { re: /console\.log.*token/i,     severity: 'warn' },
  { re: /Math\.random\(\)/,         severity: 'warn' },
  { re: /eval\s*\(/,                severity: 'critical' },
  // ...
];
```

Constraints mapeadas para funções esperadas no código:

```typescript
// Se constraint menciona "lockout", código deve ter getAttempts/lockout
{ keyword: /bloquear|lockout/i, codePattern: /getAttempts|lockout/i }
```

### Camada 4 — Semântica via LLM (🧪 opcional, `--semantic`)
Envia intenção, constraints, aceite e até `16.000` caracteres do código à Claude API numa chamada única, retornando `score` (0–100) e lista de violações. Não trata o não-determinismo do LLM e possui limite documentado de profundidade de raciocínio (Issue [#30](https://github.com/EliezerRosa/idd-ide/issues/30)); atua apenas como segunda opinião, nunca como barreira única.

### Propagação em cascata (Intent Graph)
Consulta o Intent Graph para intenções dependentes (`used_by`) para sinalizar impacto em cascata.

### Níveis de alerta

| Nível | Condição | Ação |
|---|---|---|
| `drift` | Violação crítica (cerca AST, padrão proibido, critério ausente em v2/`--strict-tests` ou score semântico abaixo da metade do limiar) | Falha no CI e bloqueia commit local se hook ativo |
| `warn` | Desvio não crítico / termo fora do dicionário | Alerta no terminal/editor |
| `ok` | Sem violações críticas e dentro do limiar configurado | Indicador verde |

---

## Intent Store — Esquema Completo

**Localização:** `cli/src/lib/store.ts` / `extensions/idd-core/src/store/IntentStore.ts`

```sql
CREATE TABLE intents (
  id         TEXT PRIMARY KEY,
  module     TEXT NOT NULL,
  sub        TEXT NOT NULL,
  statement  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'ok',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE intent_versions (
  id            TEXT PRIMARY KEY,
  intent_id     TEXT REFERENCES intents(id),
  version       TEXT NOT NULL,     -- semver automático: 0.0.1, 0.0.2, ...
  yaml_snapshot TEXT NOT NULL,     -- .intent.yaml completo no momento
  intent_hash   TEXT NOT NULL,     -- sha256 do yaml
  code_hash     TEXT NOT NULL,
  model_used    TEXT NOT NULL,
  git_commit    TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE constraints (
  id        TEXT PRIMARY KEY,
  intent_id TEXT REFERENCES intents(id),
  text      TEXT NOT NULL,
  severity  TEXT NOT NULL DEFAULT 'critical',
  active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE drift_events (
  id            TEXT PRIMARY KEY,
  intent_id     TEXT REFERENCES intents(id),
  constraint_id TEXT,
  type          TEXT NOT NULL,  -- semantic | static | cascade
  detected_at   TEXT NOT NULL,
  resolved_at   TEXT,
  resolution    TEXT            -- fixed | updated_intent | ignored
);
```

### API interna (porta 4999)

| Método | Rota | Uso |
|---|---|---|
| GET | `/intents` | Listar todas |
| GET | `/intents/:id/context` | Context Manager — dependências resolvidas |
| GET | `/intents/:id/versions` | Histórico |
| POST | `/intents/:id/versions` | Gravar nova versão |
| POST | `/drift` | Registrar evento |
| GET | `/graph` | Dados para o Intent Graph |
| DELETE | `/intents/:id` | Deprecar (preserva histórico) |

---

## Git Hooks e Fronteira de Confiança (Local vs. Servidor)

Instalados por `idd init` ou pela extensão VS Code como **feedback rápido local**:

```bash
# .git/hooks/pre-commit
idd verify --staged --fail-on=critical

# .git/hooks/post-merge
idd store sync --strategy=latest

# .git/hooks/post-tag
idd store snapshot --tag=$TAG_NAME
```

> **Modelo de ameaça agêntico:** hooks locais **não são barreira de segurança** contra agentes autônomos com acesso a shell, que podem contorná-los com `git commit --no-verify` ou editar `.intent.yaml` junto com o código. A garantia efetiva exige execução obrigatória no servidor (GitHub Actions CI), *branch protection* e `CODEOWNERS` exigindo revisão humana para alterações em `*.intent.yaml`, dicionário ubíquo e `decisoes.md`.

---

## Stack Tecnológica

| Camada | Tecnologia | Status |
|---|---|---|
| CLI e núcleo | Node.js 22+ · TypeScript 5.x · `@idd/core` | ✅ |
| Análise estática AST | TypeScript Compiler API (`astGraph.ts`, `mutationFence.ts`) + `@idd/eslint-plugin` | ✅ (TS-only, análise local) |
| Extensão e LSP | VS Code API + `vscode-languageserver` (`extensions/idd-core/`) | 🧪 experimental |
| IDE dedicada | Fork do Code - OSS (`product.json` de marca apenas) | 🔭 projeto futuro |
| Intent Engine (LLM) | Claude API — `claude-sonnet-5` (via `IDD_MODEL`) | 🧪 opcional |
| Formato de intenção | YAML + JSON Schema | ✅ |
| Persistência | SQLite (`better-sqlite3`, simulado nos testes unitários do CLI) | ✅ |
| Intent Graph | Cytoscape.js (webview, CDN) | 🧪 |
| Testes | Vitest | ✅ unitários / 🧪 sem E2E real |
| Multi-linguagem | TS/JS (AST, LSP e fronteiras); Python, Go, Rust, Java (templates/hints/regex em `lang.ts`) | 🧪 assimétrico |
