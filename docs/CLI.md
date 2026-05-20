# CLI — Referência Completa

O `idd` é a interface de linha de comando do IDD IDE. Funciona de forma independente da extensão VS Code e pode ser usado em terminais, scripts de CI/CD e Git hooks.

## Instalação

```bash
cd idd-ide/cli
npm install
npm run build
npm link
```

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | Para `generate`, `verify --semantic` | Chave de API Anthropic |
| `IDD_MODEL` | Não | Modelo Claude (padrão: `claude-sonnet-4-20250514`) |

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

## Uso em CI/CD

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
      - run: npm install && npm run build
        working-directory: ./cli
      - run: npm link
        working-directory: ./cli
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
