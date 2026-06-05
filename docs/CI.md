# CI/CD com IDD IDE

O `idd init` gera automaticamente um workflow GitHub Actions que verifica o alinhamento entre código e intenções em cada push e pull request.

## Workflow gerado

**`.github/workflows/idd-verify.yml`**

```yaml
name: IDD Verify

on:
  push:
    branches: ["main", "develop", "feature/**"]
  pull_request:
    branches: ["main", "develop"]

jobs:
  verify:
    name: Verificar alinhamento de intenções
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: "cli/package-lock.json"

      - name: Instalar IDD CLI
        run: |
          cd cli && npm ci --ignore-scripts
          npm run build && npm link

      - name: Verificar alinhamento (estático)
        run: idd verify --fail-on=critical

      - name: Verificar alinhamento (semântico)
        if: ${{ secrets.ANTHROPIC_API_KEY != '' }}
        run: idd verify --semantic --fail-on=critical
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Exibir estatísticas
        if: always()
        run: idd stats
```

## Configuração da API key

Para habilitar a verificação semântica (análise via LLM), adicione o secret:

1. Acesse **Settings → Secrets and variables → Actions**
2. Clique em **New repository secret**
3. Nome: `ANTHROPIC_API_KEY`
4. Valor: sua chave `sk-ant-...`

Sem o secret, apenas a análise estática roda — sem chamadas ao LLM, sem custo.

## Badge de status

O `idd init` insere automaticamente um badge no `README.md`:

```markdown
[![IDD Verify](https://github.com/EliezerRosa/idd-ide/actions/workflows/idd-verify.yml/badge.svg)](...)
```

| Estado | Badge |
|---|---|
| Todas alinhadas | ![passing](https://img.shields.io/badge/IDD-passing-1D9E75) |
| Drift crítico   | ![failing](https://img.shields.io/badge/IDD-failing-E24B4A) |

## Como o CI bloqueia PRs

O step `idd verify --fail-on=critical` sai com código `1` se qualquer intenção tiver drift crítico (constraint violada). O GitHub Actions marca o check como **failed** e bloqueia o merge se a branch protection estiver configurada.

Para configurar proteção de branch:
1. **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. ✓ **Require status checks to pass before merging**
4. Adicione: `Verificar alinhamento de intenções`

## Níveis de verificação

| Modo | Quando usar | Custo |
|---|---|---|
| `idd verify` | pre-commit local (rápido) | Zero — análise estática |
| `idd verify --fail-on=critical` | CI em push/PR | Zero — análise estática |
| `idd verify --semantic` | CI em PRs para main | Tokens da API Claude |
| `idd verify --semantic --fail-on=warn` | Strictest — bloqueia avisos | Tokens da API Claude |

## Customização via `.idd/config.yaml`

```yaml
# Threshold: score mínimo para não bloquear
drift_threshold: 85

# Bloquear também em avisos (não só drift crítico)
fail_on: warn
```

## Integração com pre-commit local

O `idd init` também instala um Git hook `pre-commit` que roda `idd verify --fail-on=critical` antes de cada commit local, criando uma barreira dupla: local + CI.

```
dev commita → pre-commit hook → idd verify (local)
                                     ↓
                              drift? → bloqueia commit

PR aberto → GitHub Actions → idd verify --semantic
                                     ↓
                              drift? → check failed → merge bloqueado
```

## `idd stats` no CI

O step `idd stats` (com `if: always()`) roda mesmo quando o verify falha, exibindo no log do CI um sumário de scores por módulo — útil para rastrear degradação ao longo do tempo.

Exemplo de saída no log do CI:

```
  ⬡ IDD  stats
  ────────────────────────────────────────────────────

  ┌─────────────────┬─────┬─────┬──────┬───────────┬────────────────┬─────────┐
  │ módulo          │ avg │ min │ max  │ tendência │ histórico (10) │ versões │
  ├─────────────────┼─────┼─────┼──────┼───────────┼────────────────┼─────────┤
  │ auth/login      │ 95% │ 85% │ 100% │ ↑ melhora │ ▅▆▇▇█▇▇▇▆█     │ 4v      │
  │ users/crud      │ 100%│ 100%│ 100% │ → estável │ ████████████   │ 2v      │
  │ db/connection   │ 100%│ 100%│ 100% │ → estável │ ████████████   │ 1v      │
  └─────────────────┴─────┴─────┴──────┴───────────┴────────────────┴─────────┘
```
