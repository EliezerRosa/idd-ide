# Arquitetura do IDD IDE

## Visão Geral

O IDD IDE é construído sobre o **Code - OSS** (base open source do VS Code) e estendido por cinco componentes interligados que implementam o paradigma Intent Driven Development.

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
Chama a Claude API (`claude-sonnet-4-20250514`) com os prompts montados. A resposta é solicitada como JSON estruturado com campos `code`, `tests`, `docs`.

### Estágio 4 — Output Formatter
- Parseia o JSON retornado pelo LLM
- Grava os artefatos no workspace (`{sub}.ts`, `{sub}.test.ts`, `{sub}.md`)
- Cria uma `intent_signature` no Intent Store:

```json
{
  "intent_hash":      "sha256 do .intent.yaml",
  "generated_at":     "2026-05-20T...",
  "model_used":       "claude-sonnet-4-20250514",
  "criteria_covered": 4,
  "criteria_total":   4
}
```

Esta assinatura é a **baseline** que o Intent Verifier usa para detectar drift.

---

## Componente 3 — Code Workspace

**Localização:** `extensions/idd-core/src/extension.ts`

O editor Code-OSS aumentado com:

- **Anotações inline:** cada linha de código tem indicação visual da intenção que a gerou
- **Diagnósticos LSP:** o Verifier emite `vscode.Diagnostic` com severidade `Error` (drift crítico) ou `Warning` (aviso)
- **Auto-verificação:** `onDidSaveTextDocument` dispara verificação estática ao salvar qualquer `.ts` ou `.py`
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

**Localização:** `extensions/idd-core/src/verifier/IntentVerifier.ts` / `cli/src/commands/verify.ts`

Três análises executadas em paralelo a cada modificação:

### Análise 1 — Estática determinística
Padrões proibidos verificados imediatamente sem chamada ao LLM:

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

### Análise 2 — Semântica via LLM (opcional, `--semantic`)
O trecho modificado e a `intent_signature` são enviados à Claude API. O modelo retorna `score` (0–100) e lista de constraints violadas. Detecta desvios semânticos invisíveis à análise estática.

### Análise 3 — Propagação em cascata
Consulta o Intent Graph para todas as intenções em `used_by`. Se o contrato do módulo atual foi violado, emite alertas secundários nas dependentes.

### Níveis de alerta

| Nível | Condição | Ação |
|---|---|---|
| `drift` | Constraint crítica violada | Bloqueia commit via pre-commit hook |
| `warn` | Desvio não crítico | Alerta inline, ação sugerida |
| `ok` | Alinhamento ≥ 90% | Indicador verde |

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

## Git Hooks

Instalados automaticamente por `idd init` ou pela extensão VS Code:

```bash
# .git/hooks/pre-commit
idd verify --staged --fail-on=critical

# .git/hooks/post-merge
idd store sync --strategy=latest

# .git/hooks/post-tag
idd store snapshot --tag=$TAG_NAME
```

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Base do IDE | Code - OSS (microsoft/vscode) |
| Linguagem | TypeScript 5.3 (strict) |
| Intent Engine (LLM) | Claude API — `claude-sonnet-4-20250514` |
| Formato de intenção | YAML + JSON Schema |
| Persistência | SQLite (`better-sqlite3`) |
| Intent Graph | Cytoscape.js (webview) |
| Testes | Vitest |
| Multi-linguagem | TS, Python, Go, JavaScript, Rust, Java |
