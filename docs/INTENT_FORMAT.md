# Formato .intent.yaml

O arquivo `.intent.yaml` é a **fonte de verdade** de cada módulo no paradigma IDD. Código, testes e documentação são artefatos derivados desta declaração.

## Schema Completo

```yaml
# ── Campos obrigatórios ──────────────────────────────────────────

intent: string
  # Declaração da intenção em linguagem natural.
  # Descreva o QUÊ, não o COMO.
  # Mínimo: 10 caracteres.

module: string
  # Formato: "dominio/funcionalidade"
  # Exemplos: auth/login, users/crud, payments/checkout
  # Padrão: ^[a-z0-9-]+/[a-z0-9-]+$

constraints: string[]
  # Regras de negócio e limites obrigatórios.
  # Cada item é verificado continuamente pelo Intent Verifier.
  # Mínimo: 1 item.

acceptance: string[]
  # Critérios de aceite — como saber que a intenção foi satisfeita.
  # Cada item vira um caso de teste automaticamente.
  # Mínimo: 1 item.

# ── Campos opcionais ─────────────────────────────────────────────

depends_on: string[]
  # Intenções que este módulo consome.
  # Alimenta o Context Manager: contratos das dependências são
  # injetados no prompt do LLM antes da geração.
  # Formato: ["dominio/sub", ...]

used_by: string[]
  # Intenções que dependem deste módulo.
  # Usado pelo Verifier para propagação de drift em cascata.
  # Normalmente gerenciado automaticamente pelo IDE.

language: typescript | python | go | javascript | rust | java
  # Linguagem alvo do código gerado.
  # Auto-detectada a partir dos arquivos existentes se omitida.

framework: string
  # Framework alvo. Exemplos: express, fastapi, gin, nestjs
  # Injetado no prompt para influenciar o estilo do código gerado.

tags: string[]
  # Tags para organização e filtros no Intent Graph.
  # Exemplos: ["auth", "security", "core"]

version: semver
  # Versão semântica — gerenciada automaticamente pelo Intent Store.
  # Não edite manualmente: o store incrementa o patch a cada geração.
```

## Exemplo Completo

```yaml
intent: "Autenticar usuário com e-mail e senha, retornando JWT válido por 24h"
module: auth/login

constraints:
  - "Senha deve ter mínimo 8 caracteres"
  - "Bloquear conta após 5 tentativas falhas por 15 minutos"
  - "Token JWT deve expirar em exatamente 24h"
  - "Nunca registrar a senha em logs, mesmo em modo debug"

acceptance:
  - "Login válido com credenciais corretas retorna status 200 e token JWT"
  - "Login com senha incorreta retorna 401 sem vazar informações"
  - "Quinta tentativa falha consecutiva bloqueia a conta por 15 min"
  - "Token decodificado contém userId e campo exp válido"

depends_on:
  - users/crud

used_by:
  - dashboard/access
  - auth/refresh-token

language: typescript
framework: express
tags: ["auth", "security"]
version: "1.1.0"
```

## Regras de Negócio das Constraints

As constraints são classificadas em dois níveis de severidade:

| Severidade | Comportamento |
|---|---|
| `critical` (padrão) | Viola → drift detectado → commit bloqueado pelo pre-commit hook |
| `warn` | Viola → aviso inline → dev decide se atualiza intenção ou código |

O Intent Verifier mapeia automaticamente palavras-chave de constraints para padrões esperados no código:

| Palavra-chave na constraint | Padrão esperado no código |
|---|---|
| `bloquear`, `lockout`, `tentativa` | `getAttempts`, `lockout`, `attempt` |
| `jwt`, `token.*expir` | `signJWT`, `jwt.sign`, `createToken` |
| `hash`, `bcrypt`, `argon` | `bcrypt`, `argon2`, `hash` |
| `validar`, `validação` | `validate`, `isValid`, `throw` |

## Critérios de Aceite → Testes

Cada item em `acceptance` é transformado pelo Output Formatter em um caso de teste:

**TypeScript/Vitest:**
```typescript
describe('auth/login', () => {
  it('Login válido retorna JWT', async () => { /* gerado */ });
  it('Senha incorreta retorna 401', async () => { /* gerado */ });
  it('5ª tentativa bloqueia conta', async () => { /* gerado */ });
  it('Token contém userId e exp', async () => { /* gerado */ });
});
```

**Python/pytest:**
```python
def test_login_valido_retorna_jwt(): ...
def test_senha_incorreta_retorna_401(): ...
def test_quinta_tentativa_bloqueia(): ...
def test_token_contem_userid_e_exp(): ...
```

**Go/testing:**
```go
func TestLogin_Case1(t *testing.T) { ... }
func TestLogin_Case2(t *testing.T) { ... }
```

## Versionamento Automático

O Intent Store gerencia versões automaticamente:

```
v0      → intenção declarada, sem código
v0.0.1  → primeira geração de código
v0.0.2  → segunda geração (após drift corrigido)
v1.0.0  → bump manual via `idd store bump --major`
```

Cada versão preserva:
- O `.intent.yaml` completo no momento (`yaml_snapshot`)
- O hash SHA-256 do yaml (`intent_hash`)
- O modelo LLM usado (`model_used`)
- O commit Git correspondente (`git_commit`)

## Localização dos Arquivos

```
src/
└── auth/
    ├── login.intent.yaml    ← fonte de verdade
    ├── login.ts             ← gerado pelo Intent Engine
    ├── login.test.ts        ← gerado pelo Intent Engine
    └── login.md             ← gerado pelo Intent Engine
```

Os artefatos gerados **nunca** devem ser editados diretamente sem atualizar a intenção — o Verifier detectará o drift.
