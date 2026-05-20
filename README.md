# ⬡ IDD IDE

> **Intent Driven Development** — uma IDE onde você declara *o que* o código deve fazer, não *como* implementá-lo.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![Claude API](https://img.shields.io/badge/Claude-Sonnet%204-8B5CF6?logo=anthropic)](https://www.anthropic.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Em%20desenvolvimento-orange)](./docs/ROADMAP.md)

---

## O que é IDD?

**Intent Driven Development** é um paradigma onde o desenvolvedor expressa intenções, e o sistema cuida da implementação. Em vez de escrever código linha a linha, você declara:

- **O quê** o módulo deve fazer
- **Quais regras** ele deve respeitar (constraints)
- **Como saber** que funcionou (critérios de aceite)
- **De quem depende** (dependências declaradas)

O IDE traduz tudo isso em código, testes e documentação — e monitora continuamente se o código gerado ainda respeita a intenção original.

```yaml
# auth/login.intent.yaml
intent: "Autenticar usuário com e-mail e senha, retornando JWT válido por 24h"
module: auth/login

constraints:
  - "Senha deve ter mínimo 8 caracteres"
  - "Bloquear conta após 5 tentativas falhas por 15 minutos"
  - "Token JWT deve expirar em exatamente 24h"
  - "Nunca registrar a senha em logs"

acceptance:
  - "Login válido retorna status 200 e token JWT"
  - "Senha incorreta retorna 401 sem vazar informações"
  - "Quinta tentativa falha bloqueia a conta"
  - "Token decodificado contém userId e campo exp válido"

depends_on:
  - users/crud

language: typescript
framework: express
```

Rodando `idd generate auth/login`, o sistema chama a Claude API com o contexto completo e produz:

- `auth/login.ts` — implementação funcional
- `auth/login.test.ts` — 4 testes (um por critério de aceite)
- `auth/login.md` — documentação gerada

---

## Arquitetura

```
┌──────────────────────────────────────────────────────┐
│                    IDD IDE (Code-OSS)                 │
│                                                      │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Intent       │  │ Intent      │  │ Intent      │ │
│  │ Capture UI   │→ │ Engine      │→ │ Graph       │ │
│  │ (4 passos)   │  │ (LLM Core)  │  │ (Cytoscape) │ │
│  └──────────────┘  └─────────────┘  └─────────────┘ │
│         ↓                 ↓                ↓         │
│  ┌──────────────────────────────────────────────┐    │
│  │          Code Workspace (editor)              │    │
│  └──────────────────────────────────────────────┘    │
│         ↓                                            │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ Intent       │→ │ Intent Store (.idd/store.db) │  │
│  │ Verifier     │  │ SQLite + Git hooks           │  │
│  └──────────────┘  └─────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 5 Componentes Principais

| Componente | Responsabilidade |
|---|---|
| **Intent Capture UI** | Painel de 4 passos para declarar intenção, constraints, critérios e dependências |
| **Intent Engine** | Parser → Context Manager → Claude API → Output Formatter |
| **Code Workspace** | Editor Code-OSS com anotações de drift inline por linha |
| **Intent Graph** | Grafo visual (Cytoscape.js) de todas as intenções e dependências |
| **Intent Verifier + Store** | Detecção contínua de drift + SQLite versionado + Git hooks |

---

## Estrutura do Repositório

```
idd-ide/
├── extensions/
│   └── idd-core/               # Extensão principal do VS Code
│       ├── src/
│       │   ├── extension.ts    # Ponto de entrada, wiring de todos os componentes
│       │   ├── capture/
│       │   │   ├── IntentCapturePanel.ts   # Webview dos 4 passos
│       │   │   ├── IntentGraphPanel.ts     # Grafo com Cytoscape.js
│       │   │   └── IntentTreeProvider.ts  # Sidebar com status das intenções
│       │   ├── engine/
│       │   │   └── IntentEngine.ts        # Parser + Claude API + Formatter
│       │   ├── store/
│       │   │   └── IntentStore.ts         # SQLite, versões, drift events
│       │   ├── verifier/
│       │   │   └── IntentVerifier.ts      # Análise estática + diagnósticos inline
│       │   └── cli/
│       │       └── gitHooks.ts            # Instala pre-commit, post-merge, post-tag
│       ├── package.json
│       └── tsconfig.json
│
├── cli/                        # CLI standalone — comando `idd`
│   ├── src/
│   │   ├── index.ts            # Router + help screen
│   │   ├── commands/
│   │   │   ├── init.ts         # idd init
│   │   │   ├── new.ts          # idd new <modulo/sub>
│   │   │   ├── generate.ts     # idd generate [modulo/sub]
│   │   │   ├── verify.ts       # idd verify [flags]
│   │   │   ├── diff.ts         # idd diff [modulo/sub]
│   │   │   ├── graph.ts        # idd graph [flags]
│   │   │   └── store.ts        # idd store <subcomando>
│   │   └── lib/
│   │       ├── store.ts        # Acesso ao SQLite sem VS Code
│   │       ├── lang.ts         # Suporte multi-linguagem (TS, Python, Go, JS, Rust, Java)
│   │       └── ui.ts           # Output colorido, tabelas, spinner, badges
│   └── src/__tests__/          # Suite de testes com Vitest
│       ├── engine.test.ts
│       ├── verifier.test.ts
│       ├── store.test.ts
│       ├── lang.test.ts
│       ├── parser.test.ts
│       └── integration.test.ts
│
├── schemas/
│   └── intent.schema.json      # JSON Schema do .intent.yaml
│
└── docs/
    ├── ARCHITECTURE.md         # Arquitetura detalhada dos 5 componentes
    ├── ROADMAP.md              # Fases de implementação
    ├── INTENT_FORMAT.md        # Especificação do .intent.yaml
    ├── CLI.md                  # Referência completa do CLI
    └── CONTRIBUTING.md         # Guia de contribuição
```

---

## Início Rápido

### Pré-requisitos

- Node.js 20+
- Git 2.40+
- Chave de API Anthropic

### Instalação do CLI

```bash
git clone https://github.com/EliezerRosa/idd-ide.git
cd idd-ide/cli
npm install
npm run build
npm link   # disponibiliza o comando `idd` globalmente
```

### Primeiro uso

```bash
# 1. Configurar API key
export ANTHROPIC_API_KEY=sk-ant-...

# 2. Inicializar IDD num projeto existente
cd meu-projeto
idd init

# 3. Criar uma nova intenção interativamente
idd new auth/login

# 4. Gerar código a partir da intenção
idd generate auth/login

# 5. Verificar alinhamento
idd verify

# 6. Ver o grafo de intenções
idd graph
```

### Desenvolvimento do IDE (extensão VS Code)

```bash
cd idd-ide/extensions/idd-core
npm install
npm run compile

# Abrir no VS Code
code .
# Pressionar F5 para abrir Extension Development Host
```

---

## CLI — Referência Rápida

| Comando | Descrição |
|---|---|
| `idd init` | Inicializa IDD no projeto (`.idd/`, Git hooks, exemplo) |
| `idd new <mod/sub>` | Cria `.intent.yaml` interativamente |
| `idd generate [mod/sub]` | Gera código, testes e docs via Claude API |
| `idd verify [flags]` | Verifica drift entre código e intenções |
| `idd diff [mod/sub]` | Vista lado a lado: intenção vs código atual |
| `idd graph [flags]` | Grafo de intenções no terminal |
| `idd store list` | Lista todas as intenções registradas |
| `idd store history <mod/sub>` | Histórico de versões de uma intenção |
| `idd store snapshot --tag=v1.0` | Congela estado para release |

**Flags de `idd verify`:**

```bash
idd verify --fail-on=critical   # exit 1 se houver drift crítico (usado no CI)
idd verify --semantic           # inclui análise via LLM (mais lenta, mais precisa)
idd verify --staged             # verifica apenas arquivos staged (git)
```

**Flags de `idd graph`:**

```bash
idd graph --detailed               # tabela com todas as relações
idd graph --impact=users/crud      # quais intenções mudam se eu alterar este módulo?
idd graph --json                   # exporta como JSON para ferramentas externas
```

---

## Suporte a Linguagens

| Linguagem | Extensão | Testes | Verificações específicas |
|---|---|---|---|
| TypeScript | `.ts` | Vitest | Proíbe `any`, `require()` em ESM |
| Python | `.py` | pytest | `except Exception`, `eval()`, `pickle` |
| Go | `.go` | `go test` | `panic()` como erro, `interface{}` vago |
| JavaScript | `.js` | Vitest | `var`, `==` sem `===` |
| Rust | `.rs` | `cargo test` | `unwrap()` em produção, `unsafe` sem doc |
| Java | `.java` | JUnit 5 | `printStackTrace`, `System.out` |

---

## Intent Store — Schema

```sql
-- Intenções ativas
CREATE TABLE intents (
  id TEXT PRIMARY KEY, module TEXT, sub TEXT,
  statement TEXT, status TEXT,  -- ok|drift|warn|orphan|deprecated
  created_at TEXT, updated_at TEXT
);

-- Histórico versionado (semver automático)
CREATE TABLE intent_versions (
  id TEXT PRIMARY KEY, intent_id TEXT,
  version TEXT,           -- 0.0.1, 0.0.2, ...
  yaml_snapshot TEXT,     -- .intent.yaml completo no momento
  intent_hash TEXT,       -- sha256 do yaml
  model_used TEXT,        -- claude-sonnet-4-20250514
  git_commit TEXT,        -- sha do commit correspondente
  created_at TEXT
);

-- Eventos de drift detectados e resolvidos
CREATE TABLE drift_events (
  id TEXT PRIMARY KEY, intent_id TEXT,
  type TEXT,              -- semantic|static|cascade
  detected_at TEXT, resolved_at TEXT,
  resolution TEXT         -- fixed|updated_intent|ignored
);
```

---

## Git Hooks (instalados automaticamente por `idd init`)

```bash
# pre-commit — bloqueia se houver drift crítico
idd verify --fail-on=critical

# post-merge — sincroniza o Intent Store após merge
idd store sync

# post-tag — congela snapshot a cada release
idd store snapshot --tag=$TAG_NAME
```

---

## Testes

```bash
cd cli
npm test                    # roda todos os testes
npm run test -- --coverage  # com cobertura

# Arquivos de teste
src/__tests__/
  engine.test.ts    # Intent Parser e Output Formatter
  verifier.test.ts  # Análise estática de drift
  store.test.ts     # Intent Store (36 testes)
  lang.test.ts      # Suporte multi-linguagem (45 testes)
  parser.test.ts    # buildPrompt e parseOutput
  integration.test.ts  # Pipeline completo end-to-end
```

---

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `ANTHROPIC_API_KEY` | Chave de API Anthropic (obrigatória para `generate` e `verify --semantic`) | — |
| `IDD_MODEL` | Modelo Claude a usar | `claude-sonnet-4-20250514` |

---

## Roadmap

### ✅ Fase 1 — MVP (concluída)
- Fork do Code-OSS e estrutura base
- Formato `.intent.yaml` com JSON Schema
- Intent Capture UI (painel de 4 passos)
- Intent Engine com Claude API
- Intent Store com SQLite
- CLI com 8 comandos

### 🔄 Fase 2 — Core IDD (em andamento)
- Context Manager completo
- Intent Verifier com análise semântica
- Intent Graph interativo
- Git hooks automáticos

### 📋 Fase 3 — Produto
- `idd diff` com vista split
- Suporte completo multi-linguagem
- CI/CD integration
- Marketplace de intent templates
- Colaboração multi-dev em intenções

Veja o [ROADMAP completo](./docs/ROADMAP.md).

---

## Contribuindo

Veja [CONTRIBUTING.md](./docs/CONTRIBUTING.md) para guidelines de desenvolvimento.

---

## Licença

MIT — veja [LICENSE](./LICENSE).

---

<div align="center">
  <sub>Construído com ⬡ Intent Driven Development · Claude API · TypeScript · VS Code</sub>
</div>
