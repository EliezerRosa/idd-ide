# CLI — Referência Completa

O `idd` é a interface de linha de comando do IDD IDE. Funciona de forma independente da extensão VS Code e pode ser usado em terminais, scripts de CI/CD e Git hooks.

## Instalação

```bash
cd idd-ide/cli
npm install
npx esbuild src/index.ts --bundle --platform=node --target=node20 \
  --format=esm --outfile=dist/index.js --external:better-sqlite3
npm link
```

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | Para `generate`, `verify --semantic`, `capture`, `review --semantic`, `migrate infer` | Chave de API Anthropic |
| `IDD_MODEL` | Não | Modelo Claude (padrão: `claude-sonnet-4-20250514`) |
| `IDD_SERVER_TOKEN` | Não | Bearer token para autenticação no IDD Server |

## Índice de Comandos

**Núcleo:** [`init`](#idd-init) · [`new`](#idd-new-modulosub) · [`generate`](#idd-generate-modulosub) · [`verify`](#idd-verify-modulosub-flags) · [`diff`](#idd-diff-modulosub-flags) · [`graph`](#idd-graph-flags) · [`store`](#idd-store)

**Produtividade:** [`capture`](#idd-capture-descrição-livre) · [`blame`](#idd-blame-modulosub) · [`export`](#idd-export-flags) · [`template`](#idd-template-sub) · [`stats`](#idd-stats-modulosub)

**Equipe:** [`review`](#idd-review-flags) · [`server` / `push` / `pull`](#idd-server--idd-push--idd-pull)

**Observabilidade:** [`drift watch`](#idd-drift-watch-flags) · [`analytics`](#idd-analytics-flags) · [`suggest`](#idd-suggest-flags)

**Modelo de negócio:** [`domain`](#idd-domain-subcomando) · [`api`](#idd-api-subcomando)

**Organização:** [`playbook`](#idd-playbook-subcomando) · [`registry`](#idd-registry-subcomando) · [`migrate`](#idd-migrate-subcomando)

---

## `idd init`

Inicializa o IDD num projeto existente.

```bash
idd init
```

**O que faz:**
- Cria o diretório `.idd/`
- Copia `intent.schema.json` para `.idd/`
- Cria `src/example/hello.intent.yaml` como exemplo
- Atualiza `.gitignore` com entradas do IDD
- Cria/atualiza `.vscode/settings.json`
- Instala Git hooks: `pre-commit`, `post-merge`, `post-tag`

---

## `idd new <modulo/sub>`

Cria um novo `.intent.yaml` interativamente.

```bash
idd new auth/login
idd new payments/checkout
idd new           # pergunta o módulo interativamente
```

**Fluxo interativo:**
1. Módulo (se não fornecido como argumento)
2. Declaração da intenção
3. Linguagem e framework
4. Constraints (uma por linha, linha vazia para finalizar)
5. Critérios de aceite (idem)
6. Dependências (idem)

**Saída:**
- `src/{modulo}/{sub}.intent.yaml`
- `src/{modulo}/{sub}.test.{ext}` (scaffold de testes)

---

## `idd generate [modulo/sub]`

Gera código, testes e documentação a partir do `.intent.yaml` via Claude API.

```bash
idd generate auth/login     # módulo específico
idd generate                # todos os .intent.yaml do diretório atual
```

**Pipeline:**
1. Lê e valida o `.intent.yaml`
2. Context Manager: busca dependências no Intent Store
3. Intent Parser: monta system prompt + user prompt
4. LLM Adapter: chama Claude API
5. Output Formatter: grava artefatos + registra versão no store

**Saída por módulo:**
- `{sub}.{ext}` — implementação
- `{sub}.test.{ext}` ou `{sub}_test.{ext}` — testes
- `{sub}.md` — documentação

---

## `idd verify [modulo/sub] [flags]`

Verifica alinhamento entre código atual e intenções.

```bash
idd verify                          # todos os módulos do diretório
idd verify auth/login               # módulo específico
idd verify --fail-on=critical       # exit 1 se houver drift crítico
idd verify --semantic               # inclui análise LLM (mais lenta)
idd verify --staged                 # apenas arquivos staged (para pre-commit)
```

**Análises realizadas:**
1. **Estática:** padrões proibidos (credenciais em log, `eval`, etc.)
2. **Constraints:** verifica se funções-chave das constraints estão no código
3. **Testes:** verifica se critérios de aceite têm testes correspondentes
4. **Semântica** (com `--semantic`): chama LLM para análise de alinhamento

**Saída exemplo:**
```
  ⬡ IDD  verify
  ────────────────────────────────────────────────────

  ┌─────────────────┬────────┬───────┬──────────────┬──────────────────┐
  │ módulo          │ status │ score │ violações    │ testes faltando  │
  ├─────────────────┼────────┼───────┼──────────────┼──────────────────┤
  │ auth/login      │ drift  │ 30%   │ 1 problema(s)│ 2 teste(s)       │
  │ auth/register   │ ok     │ 100%  │ —            │ —                │
  │ users/crud      │ ok     │ 100%  │ —            │ —                │
  └─────────────────┴────────┴───────┴──────────────┴──────────────────┘

  auth/login
    ✗  Credencial exposta em log (linha 6)
    ⚠  Teste faltando: "5ª tentativa bloqueia conta"
```

---

## `idd diff [modulo/sub] [flags]`

Mostra diferença visual entre a intenção e o código atual.

```bash
idd diff auth/login           # vista split (padrão)
idd diff auth/login --linear  # vista linear
idd diff auth/login --semantic  # inclui análise LLM
idd diff                      # todos os módulos do diretório
```

**Vista split (padrão):**
```
  INTENÇÃO — auth/login          │  CÓDIGO ATUAL
  ─────────────────────────────  │  ─────────────────────────────
  intent:                        │    1  export async function login(
    Autenticar usuário com        │    2    email: string, password: string
    e-mail e senha...             │    3  ) {
  constraints:                   │    4    // lockout desativado
  ▸ senha >= 8 chars             │    5    ← DRIFT: constraint requer lockout
  ▸ bloquear após 5 tentativas   │    6    console.log(`login: ${password}`)
  acceptance:                    │    7    ← DRIFT: credencial exposta em log
  ✓ login válido retorna JWT     │    8    return signJWT({}, "24h");
```

---

## `idd graph [flags]`

Exibe o grafo de intenções do projeto no terminal.

```bash
idd graph                          # árvore ASCII (padrão)
idd graph --detailed               # tabela com todas as relações
idd graph --impact=users/crud      # o que muda se eu alterar este módulo?
idd graph --json                   # exporta como JSON
```

**Saída padrão (árvore):**
```
  ⬡ IDD  graph
  ────────────────────────────────────────────────────

  ● alinhada  ● drift  ● aviso  ○ órfã

  └─ ● users/crud
     ├─ ● auth/login  ← deps: users/crud
     │     ├─ ● session/refresh
     │     └─ ● dashboard/access
     └─ ● auth/register
```

**Saída de impacto (`--impact=users/crud`):**
```
  Mudanças em users/crud afetam:
    ● auth/login
    ● auth/register
    ● dashboard/access  (transitivo)
```

---

## `idd store`

Gerencia o Intent Store diretamente.

### Subcomandos

```bash
idd store list                        # lista todas as intenções
idd store show auth/login             # detalhes de uma intenção
idd store history auth/login          # histórico de versões
idd store drift                       # eventos de drift ativos
idd store sync                        # sincroniza após merge
idd store snapshot --tag=v1.2.0       # congela estado para release
idd store reset [--force]             # apaga o store (cria backup)
```

### `idd store list`

```
  ┌──────────────┬────────────┬────────┬──────────┬──────────┬──────────────┐
  │ id (prefixo) │ módulo     │ sub    │ status   │ versões  │ atualizado   │
  ├──────────────┼────────────┼────────┼──────────┼──────────┼──────────────┤
  │ abc12345     │ auth       │ login  │ drift    │ 3        │ 20/05 14:32  │
  │ def67890     │ auth       │ register│ ok      │ 1        │ 19/05 09:14  │
  │ ghi11223     │ users      │ crud   │ ok       │ 2        │ 18/05 17:02  │
  └──────────────┴────────────┴────────┴──────────┴──────────┴──────────────┘
```

### `idd store history auth/login`

```
  v1.2.0   ← atual
  ├─ data:    20/05/2026 14:32
  ├─ modelo:  claude-sonnet-4-20250514
  ├─ hash:    a3f9b2c1d4e5...
  └─ commit:  abc12345

  v1.1.0
  ├─ data:    19/05/2026 09:14
  ...
```

---

## `idd capture "descrição livre"`

Expande uma frase solta em `.intent.yaml` completo via LLM — sem wizard interativo.

```bash
idd capture "autenticar usuário com email e senha, JWT 24h"
idd capture "listar pedidos paginados" --module=orders/list
idd capture "..." --dry-run    # mostra preview sem escrever nada
idd capture "..." --yes        # pula confirmação interativa
```

Sempre pede confirmação antes de escrever o arquivo, a menos que `--yes` seja passado.

---

## `idd blame <modulo/sub>` / `idd blame --all`

Histórico de autoria de uma intenção, combinando Intent Store e `git log`.

```bash
idd blame auth/login     # versões, autor, data, commits do arquivo
idd blame --all          # resumo de todas as intenções por autor
```

---

## `idd export [flags]`

Exporta o grafo de intenções como documentação de arquitetura.

```bash
idd export --format=md                      # Markdown (padrão)
idd export --format=json                    # JSON completo do grafo
idd export --format=mermaid                 # diagrama Mermaid (renderiza no GitHub)
idd export --format=dot                     # Graphviz DOT
idd export --format=mermaid --out=arch.md   # salva em arquivo
```

---

## `idd template <sub>`

Templates de intenção reutilizáveis (crud, auth-jwt, auth-oauth, webhook, email, health-check, pagination).

```bash
idd template list                        # lista built-ins + locais
idd template apply crud users/crud       # cria .intent.yaml do template
idd template new meu-padrao auth/login   # cria template a partir de intenção existente
idd template publish meu-padrao          # persiste em .idd/templates/
```

---

## `idd stats [modulo/sub]`

Histórico de alignment score com sparklines no terminal.

```bash
idd stats                # todos os módulos
idd stats auth/login     # módulo específico
```

---

## `idd review [flags]`

Analisa um PR verificando se o código respeita as intenções declaradas nos módulos afetados pelo diff.

```bash
idd review                                          # HEAD~1 vs HEAD (local)
idd review --base=main --head=feature/x --pr=42     # PR específico
idd review --semantic                               # inclui análise LLM
idd review --out=review.md --ci                     # gera comentário Markdown para CI
idd review --fail-on=warn                           # bloqueia também em avisos
```

Também disponível como GitHub Action reutilizável: `.github/workflows/idd-review.yml`.

---

## `idd server` / `idd push` / `idd pull`

IDD Server HTTP para sincronizar o Intent Store entre membros de uma equipe.

```bash
idd server start [--port=4999] [--daemon]   # inicia servidor local
idd server stop                              # para o servidor
idd server status                            # status, porta, contagem de intenções

idd push    # envia intenções locais para o servidor
idd pull    # recebe intenções do servidor (last-write-wins)
```

---

## `idd drift watch [flags]`

Daemon de monitoramento contínuo — detecta drift em tempo real sem depender do git hook.

```bash
idd drift watch                  # monitoramento contínuo
idd drift watch --once           # scan único (modo CI)
idd drift watch --verbose        # detalhes de cada violação
idd drift watch --interval=1000  # polling a cada 1s (sistemas sem inotify)
```

---

## `idd analytics [flags]`

Painel de saúde do projeto: evolução de scores, módulos instáveis, velocidade.

```bash
idd analytics                  # últimos 30 dias (padrão)
idd analytics --since=7d       # últimos 7 dias
idd analytics --top=5          # limita a 5 módulos exibidos
idd analytics --format=md      # exporta para .idd/analytics.md
```

---

## `idd suggest [flags]`

Análise proativa do grafo de intenções: dependências circulares, módulos órfãos/fantasma, sobre-especificação.

```bash
idd suggest                # análise estática (sem custo de API)
idd suggest --semantic     # inclui sugestões arquiteturais via LLM
idd suggest --out=report.md
```

---

## `idd domain <subcomando>`

Camada de intenções do modelo de negócio — UML de domínio verificável até o schema SQL.

```bash
idd domain init                             # cria domain.mmd de exemplo + CI workflow
idd domain parse domain.mmd                 # UML → Domain Model AST
idd domain normalize --target=3NF           # verifica formas normais (1NF→DKNF)
idd domain compile                          # gera YAML + JSONB Schema + SQL + erDiagram
idd domain verify                           # compara migrations reais vs domain model
idd domain evolve v1.mmd v2.mmd             # gera SQL de migração entre versões do model
```

Documentação completa: [`docs/DOMAIN.md`](./DOMAIN.md).

---

## `idd api <subcomando>`

Gera especificações OpenAPI 3.1 a partir de `.intent.yaml`.

```bash
idd api generate auth/login    # spec de um único endpoint
idd api build                  # agrega todos os .intent.yaml num openapi.yaml
idd api verify                 # detecta drift entre spec existente e intenções atuais
```

---

## `idd playbook <subcomando>`

Constraints e regras de lint obrigatórias por organização/equipe.

```bash
idd playbook init --template=startup        # ou enterprise, microservices
idd playbook check --fail-on=error          # verifica todas as intenções contra o playbook
```

---

## `idd registry <subcomando>`

Compartilha templates, domain models e playbooks entre projetos.

```bash
idd registry push meu-template --type=template
idd registry pull auth-jwt@2.0.0
idd registry search crud --type=template
```

---

## `idd migrate <subcomando>`

Assistente para adotar o IDD em um codebase já existente.

```bash
idd migrate scan                        # detecta módulos sem intenção declarada
idd migrate infer src/auth/login.ts     # LLM infere a intenção original do código
idd migrate report                      # cobertura IDD por domínio
```



```yaml
# .github/workflows/idd.yml
name: IDD Verify

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Build IDD CLI
        working-directory: ./cli
        run: |
          npm install
          npx esbuild src/index.ts --bundle --platform=node --target=node20 \
            --format=esm --outfile=dist/index.js --external:better-sqlite3
          npm link
      - run: idd verify --fail-on=critical
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## Códigos de Saída

| Código | Significado |
|---|---|
| `0` | Sucesso — nenhum drift crítico |
| `1` | Drift crítico detectado (com `--fail-on=critical`) |
| `1` | Erro de execução (API key não configurada, arquivo não encontrado, etc.) |
