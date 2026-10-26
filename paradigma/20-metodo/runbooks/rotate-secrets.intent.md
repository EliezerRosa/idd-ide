---
description: Runbook IDD — rotação universal de segredos (intenção → execução autônoma)
invocation: "rotacione segredos" | "rotate secrets" | "rotate-secrets"
authorization: requires-explicit-confirm
---

# Intent: Rotação de Segredos

> **Intenção (linguagem natural, fonte de verdade):**
> Detectar segredos comprometidos ou agendados para rotação, gerar substitutos,
> propagar para todos os ambientes onde são consumidos, validar o sistema em
> produção e revogar os antigos. Sem expor nenhum valor na conversa.

## 1. Escopo (universal)

Esta intenção opera sobre **qualquer segredo** modelado como tupla:

```
Secret := { provider, kind, scope, consumers[], rotation_policy }
```

- `provider`: emissor (Supabase, Google AI Studio, GitHub, Vercel, AWS, Azure, ...)
- `kind`: jwt-signing-key | api-key | service-role | oauth-client | webhook-secret | db-password | ssh-key
- `scope`: project / org / user
- `consumers[]`: onde a chave é lida (Vercel envs, .env.local, GitHub Actions secrets, k8s Secret, etc.)
- `rotation_policy`: imediata (comprometida) | agendada | preventiva

## 2. Fases (genéricas, todas auditadas)

1. **Inventário** — listar segredos do `provider` no `scope`.
2. **Diagnóstico** — checar exposição (git history, bundles `dist/`, logs, advisors do provider).
3. **Plano** — montar grafo `secret → consumers` e ordem segura de propagação.
4. **Geração** — criar substituto no provider (sem deletar o atual).
5. **Propagação** — escrever novo valor em todos os `consumers` (env vars, secret stores).
6. **Verificação** — smoke test em cada consumer (deploy/redeploy se necessário).
7. **Revogação** — apagar o segredo antigo no provider.
8. **Auditoria pós** — re-scan do repo + bundles para garantir zero leak residual.
9. **Relatório** — entregar resumo: nomes, IDs, contagens — **nunca** valores.

## 3. Adapters de provider (pluggable)

Cada provider implementa 4 verbos:

| Verbo | Supabase | Vercel | Google AI Studio | GitHub |
|---|---|---|---|---|
| `list` | Mgmt API `/api-keys` | `vercel env ls` | aistudio.google.com (manual) | `gh secret list` |
| `create` | Mgmt API rotate | `vercel env add` | manual UI / API | `gh secret set` |
| `propagate` | n/a (consumido em apps) | redeploy auto | n/a | rerun workflows |
| `revoke` | Mgmt API revoke | `vercel env rm` | delete key | `gh secret delete` |

> Adapters faltantes degradam a fase para **manual com checklist** — o agente para
> e pede ao operador para executar o passo no UI, depois retoma.

## 4. Consumers conhecidos (RVM hoje)

- `rvm-designacoes-unified/.env` — dev local (gitignored)
- `rvm-designacoes-unified/.env.local` — dev local + Vercel CLI (gitignored)
- Vercel envs: `production` | `preview` | `development`
- `rvm-designacoes-unified/api/chat.ts` — Edge Function (lê `GEMINI_API_KEY`)
- `rvm-designacoes-unified/scripts/**` — utilitários (process.env / os.getenv)

## 5. Invariantes de segurança (não-negociáveis)

- **Nunca** ecoar valor de segredo na conversa, em log, em commit, em PR.
- **Nunca** usar prefixo `VITE_*` para segredo server-side (vaza no bundle).
- Toda criação de segredo precede revogação (zero downtime).
- Sempre escanear `dist/` após build para presença de chave antiga.
- `.env*` sempre em `.gitignore` antes da primeira escrita.

## 6. Aprovação (autorização explícita)

O agente pode executar **list / diagnóstico / plano / scan** sem confirmação.
Para **create / revoke / push** o agente apresenta o plano e aguarda
**uma única aprovação global** (`"go"` / `"prosseguir"`). A partir daí executa
todas as fases sem novas perguntas, exceto bloqueio técnico.

## 7. Pós-execução

- Atualizar `/memories/repo/rotacao-<provider>-YYYY-MM-DD.md` com: o que foi rotacionado,
  IDs novos (não valores), tempo total, anomalias.
- Se foi rotação por exposição: registrar **causa raiz** e adicionar ao próximo
  PR uma regra de prevenção (lint, hook pre-commit, CI scan).

## 8. Universalidade

Esta intenção é **estrutural** (fases + invariantes), não acoplada a tecnologia.
Para um novo provider basta implementar os 4 verbos do §3. Para um novo
consumer basta adicioná-lo em §4. O fluxo §2 não muda.
