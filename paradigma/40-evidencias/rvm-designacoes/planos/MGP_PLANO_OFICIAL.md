# MGP — Message Gateway Protocol
## Plano Oficial de Implementação (Walking Skeleton — 7 dias)

> **Status**: proposta aprovada · aguardando início do Dia 1
> **Repositório alvo**: `mgp-gateway` (novo, separado do `wgp-whatsapp-gateway` legado)
> **Data**: abril/2026

---

## 1. Visão

Transformar o WGP em um **gateway universal orientado à intenção**, reutilizável por qualquer aplicação, mantendo operação **free-first**.

O app consumidor não escolhe canal. Ele declara uma **intenção** (`verify_2fa`, `notify`, `reminder`, etc.). O MGP decide canal, faz fallback automático, garante idempotência e retorna resultado normalizado.

---

## 2. Premissas

- Node 20 + TypeScript + ESM
- Stack 100% free: Render free + Turso free + Telegram BotFather + Resend free
- Repositório novo (`mgp-gateway`); não tocar no `wgp-whatsapp-gateway` legado
- Walking skeleton vertical: ponta a ponta antes de aprofundar features
- 7 dias úteis · ~3-4h/dia

---

## 3. Arquitetura alvo

```
[App Consumidor]
       │  POST /messages (intent + audience + policy + idempotency_key)
       ▼
┌──────────────────────────────────────────────────────────┐
│  MGP CORE                                                 │
│  Validator (Zod) → Idempotency (Turso) → Identity Graph   │
│      → Template Renderer (Handlebars) → Router/Fallback   │
│      → Provider Pool (Telegram, Email, …)                 │
│      → Health Tracker → Audit Log                         │
└──────────────────────────────────────────────────────────┘
       │
       ▼
[Webhook out] [Painel admin] [Métricas]
```

---

## 4. Plano dia a dia

### DIA 1 — Fundação do repositório

**Backlog**
1. Criar repo `mgp-gateway` no GitHub (público, MIT)
2. Scaffold Node 20 + TypeScript + ESM + tsx + Zod + Fastify + dotenv
3. Estrutura: `src/{core,providers,storage,server}` · `tests/` · `docs/`
4. Lint (eslint flat) + prettier + tsconfig strict
5. `.env.example` com: `MGP_API_KEYS`, `TURSO_URL`, `TURSO_TOKEN`, `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`, `WEBHOOK_SIGNING_SECRET`, `PORT`
6. README inicial: visão de 1 parágrafo + status "alpha"
7. CI: GitHub Actions com `tsc --noEmit` + `vitest run`

**Aceite**
- `npm run dev` sobe Fastify em `/health` retornando `{ ok: true, version }`
- CI verde no primeiro push
- `.env.example` documenta 100% das envs

**Commits**
- `chore: scaffold mgp-gateway with fastify, ts, zod`
- `chore: add eslint, prettier, vitest, github actions ci`
- `docs: initial readme with vision and status alpha`

---

### DIA 2 — Contrato MGP v1 (envelope + Zod)

**Backlog**
1. `src/core/protocol.ts` com schemas Zod:
   - `MgpVersion = "1.0"`
   - `IntentSchema` (string enum extensível: `verify_2fa`, `notify`, `transactional`, `reminder`, `broadcast`)
   - `AudienceSchema` (`{ person_id }` ou `{ channel, value }` direto)
   - `ContentSchema` (record genérico de variáveis)
   - `PolicySchema` (`channels[]`, `deadline_seconds`, `max_attempts`)
   - `MessageRequestSchema` (envelope completo)
   - `MessageResultSchema` e `MessageErrorSchema`
2. `src/core/envelope.ts` com `successOutput()` e `errorOutput()` (latência, request_id, ts)
3. Tabela de erros: `VALIDATION_ERROR`, `IDENTITY_NOT_FOUND`, `NO_CHANNEL_AVAILABLE`, `ALL_PROVIDERS_FAILED`, `RATE_LIMITED`, `INTERNAL_ERROR`
4. Doc `docs/protocol-v1.md` com exemplos curl
5. Testes unitários cobrindo 100% dos schemas

**Aceite**
- Schemas rejeitam payloads inválidos com mensagens claras
- 100% cobertura nos schemas em `npm test`
- Doc do protocolo lê-se em < 5 min

**Commits**
- `feat(core): mgp v1 envelope and zod schemas`
- `docs: protocol v1 specification with curl examples`
- `test(core): full coverage on protocol schemas`

---

### DIA 3 — Storage (Turso) + idempotência

**Backlog**
1. `src/storage/Storage.ts` interface:
   - `getIdempotent(key) / putIdempotent(key, result, ttl)`
   - `saveIdentity(id, channels[]) / getIdentity(id)`
   - `saveTemplate(intent, body) / getTemplate(intent)`
   - `recordRequest(req) / recordAttempt(reqId, attempt)`
2. `src/storage/turso.ts` via libSQL
3. Migrations em `src/storage/migrations/0001_init.sql`:
   - `identities (id, data jsonb, updated_at)`
   - `templates (intent pk, body jsonb)`
   - `idempotency (key pk, result jsonb, expires_at)`
   - `requests (id pk, intent, audience, status, channel_used, created_at)`
   - `attempts (id pk, request_id fk, provider, status, latency_ms, error, created_at)`
4. `src/storage/memory.ts` para testes
5. Script `scripts/migrate.ts`

**Aceite**
- `MGP_STORAGE=memory|turso` troca driver sem alterar código
- Idempotência: mesma chave em janela TTL retorna mesmo resultado
- Migrations idempotentes (rodar 2× não erra)

**Commits**
- `feat(storage): pluggable storage interface with memory and turso`
- `feat(storage): initial migrations`
- `test(storage): contract tests for both backends`

---

### DIA 4 — Provider interface + Telegram

**Backlog**
1. `src/providers/Provider.ts`:
   - `id`, `capabilities`
   - `connect(config)`, `disconnect()`, `getHealth()`
   - `sendText({ to, text })` retornando `{ message_id, latency_ms }`
2. `src/providers/registry.ts`
3. `src/providers/telegram/bot.ts`:
   - `fetch` direto na Bot API (`/sendMessage`)
   - `to` aceita `chat_id` numérico ou `@username`
   - timeout configurável (default 5s)
   - erros padronizados: `RECOVERABLE` (5xx/timeout) / `PERMANENT` (400/403)
4. Health tracker em memória (últimas 20 chamadas, % sucesso)
5. Testes com mock fetch

**Aceite**
- Enviar texto real para chat de teste do Telegram funciona
- Health degrada após 3 erros seguidos
- Smoke: `npm run send:telegram -- --to @x --text oi`

**Commits**
- `feat(providers): provider interface with capabilities and health`
- `feat(providers): telegram bot driver via official api`
- `test(providers): telegram driver with mocked fetch`

---

### DIA 5 — Email (Resend) + Router fallback + Templates

**Backlog**
1. `src/providers/email/resend.ts`:
   - chama `https://api.resend.com/emails` com `from`, `to`, `subject`, `html`
   - mesma interface do Telegram
2. `src/core/router.ts`:
   - resolve `audience.person_id` → `Identity` → channels
   - filtra por `policy.channels` mantendo ordem
   - itera providers respeitando `deadline_seconds` (AbortController)
   - registra `attempt` no storage
   - sucesso → `requests.status='delivered'`, `channel_used`, retorna
   - falha permanente ou recuperável → próximo canal
   - todos falharam → `ALL_PROVIDERS_FAILED` com lista de tentativas
3. `src/core/render.ts` com Handlebars
   - render por canal: `template.channels[channel]` com `content` como contexto
4. `from` do email vem de env

**Aceite**
- E2E: identidade `[telegram, email]`, telegram fora → email entrega
- `attempts` mostra 2 linhas (telegram failed, email delivered)
- Deadline 3s aborta corretamente

**Commits**
- `feat(providers): email provider via resend`
- `feat(core): router with fallback chain and deadline`
- `feat(core): handlebars template rendering per channel`

---

### DIA 6 — API HTTP + admin mínimo + rate limit

**Backlog**
1. `src/server/routes/messages.ts`:
   - `POST /messages` com auth `apikey`
   - `Idempotency-Key` header obrigatório
   - chave já existente → 200 com `replayed: true`
   - validação Zod → router → resposta envelope
2. `POST /identities`
3. `PUT /templates/:intent`
4. `GET /requests/:id`
5. `GET /providers/health`
6. Rate limit por apikey (token bucket em memória, 60 req/min default)
7. Painel HTML estático em `public/index.html`:
   - últimos 50 requests com status + canal usado
   - stats por intent (24h)
   - formulário de teste rápido

**Aceite**
- `curl POST /messages` com idempotency duplicada retorna mesmo resultado
- Painel renderiza sem framework
- Rate limit responde 429 quando excedido

**Commits**
- `feat(server): /messages endpoint with idempotency and api key auth`
- `feat(server): identities, templates, requests, providers/health endpoints`
- `feat(server): vanilla admin panel`
- `feat(server): in-memory rate limiter per api key`

---

### DIA 7 — Deploy + integração no RVM (modo sombra)

**Parte A — Deploy MGP**
1. `Dockerfile` (node:20-alpine, multi-stage)
2. `render.yaml` com env placeholders
3. Deploy Render free
4. Bot real no @BotFather → token configurado
5. Cadastrar identity de teste do Felipe
6. Cadastrar template `verify_2fa` (Telegram + Email)
7. Smoke test em produção via curl

**Parte B — RVM em modo sombra**
1. Vercel envs: `VITE_MGP_URL`, `VITE_MGP_API_KEY`
2. Criar `rvm-designacoes-unified/src/services/mgpClient.ts` minimal:
   ```ts
   export async function mgpSendVerify2FA(opts: {
     personId: string;
     code: string;
     name?: string;
     idempotencyKey: string;
   }): Promise<{ ok: boolean; channel?: string; error?: string }>;
   ```
3. Em `requestWhatsAppCode` ([src/context/AuthContext.tsx](rvm-designacoes-unified/src/context/AuthContext.tsx)):
   - **MANTER** todo fluxo atual intacto
   - **ADICIONAR** chamada paralela `mgpSendVerify2FA(...)` (fire-and-forget)
   - `idempotencyKey = profileId + ':' + code`
   - Logar resultado em `auth_logs` como `mgp_shadow_send`
4. Nova aba "🚀 MGP Shadow" em [AuthLogsPanel.tsx](rvm-designacoes-unified/src/components/admin/AuthLogsPanel.tsx)
5. Migration Supabase: adicionar `mgp_shadow_send` no constraint do `auth_logs.event_type`
6. Build/deploy RVM

**Aceite**
- MGP responde em produção (`https://mgp-gateway.onrender.com/health`)
- Felipe loga no RVM → admin vê código no painel velho **e** entrega real no Telegram (sombra)
- Painel MGP mostra request com `channel_used: telegram, delivered`
- Zero regressão no fluxo atual

**Commits MGP**
- `chore(deploy): dockerfile and render.yaml`
- `docs: deployment guide for render free + turso + telegram`

**Commits RVM**
- `feat(auth): mgp shadow integration for 2fa delivery`
- `feat(admin): mgp shadow tab in auth panel`

---

## 5. Tutorial de adoção (qualquer app)

### Passo 1 — credenciais
Admin do MGP gera `API_KEY` para o tenant.

### Passo 2 — cadastrar identidades
```bash
curl -X POST https://mgp.example.com/identities \
  -H "apikey: $KEY" -H "content-type: application/json" \
  -d '{
    "id": "[e-mail removido]",
    "channels": [
      { "type":"telegram", "value":"123456789", "verified":true, "preferred":true },
      { "type":"email",    "value":"[e-mail removido]", "verified":true }
    ],
    "preferences": { "timezone":"America/Sao_Paulo" }
  }'
```

### Passo 3 — cadastrar template da intenção
```bash
curl -X PUT https://mgp.example.com/templates/verify_2fa \
  -H "apikey: $KEY" -H "content-type: application/json" \
  -d '{
    "channels": {
      "telegram": "🔐 *{{code}}*\n\nCódigo RVM válido por {{minutes}} min.",
      "email": { "subject":"Seu código RVM", "html":"<h1>{{code}}</h1><p>Olá {{name}}, expira em {{minutes}} minutos.</p>" }
    }
  }'
```

### Passo 4 — enviar por intenção
```bash
curl -X POST https://mgp.example.com/messages \
  -H "apikey: $KEY" -H "content-type: application/json" \
  -H "Idempotency-Key: rvm-2fa-felipe-20260425-001" \
  -d '{
    "mgp_version":"1.0",
    "intent":"verify_2fa",
    "audience":{ "person_id":"[e-mail removido]" },
    "content":{ "name":"Felipe", "code":"849859", "minutes":10 },
    "policy":{ "channels":["telegram","email"], "deadline_seconds":30, "max_attempts":2 }
  }'
```

Resposta:
```json
{
  "mgp_version": "1.0",
  "status": "success",
  "request_id": "req_abc123",
  "channel_used": "telegram",
  "provider_used": "telegram_bot",
  "attempts": [{ "channel":"telegram", "status":"delivered", "latency_ms":312 }],
  "timestamp": "2026-04-25T18:42:11Z"
}
```

### Passo 5 — consultar status
```bash
curl https://mgp.example.com/requests/req_abc123 -H "apikey: $KEY"
```

### Passo 6 — receber callback (opcional)
Webhook recebe deliveries e replies normalizados no envelope MGP `webhook_receive`.

---

## 6. Aplicação detalhada ao RVM Designações

### Estado atual
[AuthContext.tsx — requestWhatsAppCode](rvm-designacoes-unified/src/context/AuthContext.tsx#L256):
- gera código aleatório
- chama RPC `create_whatsapp_auth_request` (Postgres)
- `console.log(código)`
- admin vê no painel e envia manualmente pelo WhatsApp

### Após integração modo sombra (Dia 7)
- igual ao atual **+** dispara `mgpSendVerify2FA()` em paralelo (fire-and-forget; não bloqueia, não falha login se erro)
- evento `mgp_shadow_send` em `auth_logs` com `channel_used`, `latency_ms`, `error`
- admin compara: entregou? canal? latência?

### Após validação (~14 dias em sombra)
- promover MGP a primário
- remover `console.log` e instrução manual
- aba "📱 Solicitações 2FA" vira **fallback humano** apenas se `ALL_PROVIDERS_FAILED`

### Arquivos do RVM a tocar

| Arquivo | Mudança |
|---|---|
| [src/services/mgpClient.ts](rvm-designacoes-unified/src/services/mgpClient.ts) | **NOVO** — cliente HTTP fino |
| [src/context/AuthContext.tsx](rvm-designacoes-unified/src/context/AuthContext.tsx) | shadow send em `requestWhatsAppCode` |
| [src/components/admin/AuthLogsPanel.tsx](rvm-designacoes-unified/src/components/admin/AuthLogsPanel.tsx) | nova aba "🚀 MGP Shadow" |
| `.env` / Vercel envs | `VITE_MGP_URL`, `VITE_MGP_API_KEY` |
| nova migration Supabase | adicionar `mgp_shadow_send` no constraint do `auth_logs.event_type` |

### Onboarding dos publicadores no Telegram
1. Mensagem inicial: *"Para receber códigos instantâneos, mande /start para @RvmBot"*
2. Bot captura `chat_id` no primeiro contato e chama `POST /identities` automaticamente, vinculando ao email do publicador via deep link `t.me/RvmBot?start=<token>` gerado pelo RVM
3. Sem opt-in → recebe só por e-mail

### Critérios para promover MGP a primário
- ≥ 95% taxa de entrega Telegram em 14 dias de sombra
- Latência mediana < 2s
- Zero duplicidade (idempotência cumprida)
- ≥ 70% dos publicadores ativos com Telegram cadastrado

---

## 7. Rollback

Feature flag `VITE_MGP_ENABLED=false` no Vercel desliga o cliente em segundos. Painel velho continua operacional. Sem migrations a reverter.

---

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Quotas free esgotam | Alertas em 80%; segundo provider por categoria (Brevo backup do Resend) |
| Render dorme em 15min | UptimeRobot pingando `/health`; migrar para Oracle Always Free se necessário |
| Bot Telegram banido | Política proibitiva de spam; só envios opt-in; rate limit por destinatário |
| Over-engineering | Walking skeleton primeiro; identity graph completo só depois de uso real |
| Vendor lock-in | Interface `Storage`/`Provider`/`Queue` plugável; trocar driver = trocar env |

---

## 9. Próximos passos (pós-walking-skeleton)

| Fase | Quando | Entrega |
|---|---|---|
| V2 | Após 14 dias de sombra | Identity graph completo + onboarding self-service |
| V3 | Após adoção | Health scoring + circuit breaker + quota-aware routing |
| V4 | Após múltiplos apps consumindo | Multi-tenancy completo + SDK TS + plugin n8n |
| V5 | Visão | Federação P2P entre instâncias MGP (após V4 estável) |

---

## 10. Resumo executável

| Dia | Entrega |
|---|---|
| 1 | Repo + scaffold |
| 2 | Schemas Zod + doc do protocolo |
| 3 | Storage Turso + idempotência |
| 4 | Provider interface + Telegram |
| 5 | Email + Router fallback + Templates |
| 6 | API HTTP + admin mínimo + rate limit |
| 7 | Deploy + RVM modo sombra |

**Início**: a definir
**Conclusão estimada**: D+7 dias úteis
**Custo previsto**: R$ 0,00/mês
