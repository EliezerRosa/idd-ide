# IDD Runbooks — padrão de intenção executável (2026-04-30)

Padrão acordado com Eliezer para ocultar mecânica operacional repetitiva.

## Local
- Por repo: `<repo>/.agents/workflows/<nome>.intent.md` (convenção já existente em rvm-designacoes-unified)
- Frontmatter: `description`, `invocation` (gatilhos NL), `authorization` (none | confirm-once | per-step)

## Estrutura canônica
1. Intenção em linguagem natural (fonte de verdade)
2. Escopo universal (modelo de dados da entidade)
3. Fases genéricas auditadas
4. Adapters pluggable por provider/tecnologia
5. Consumers conhecidos (mapeados ao repo atual)
6. Invariantes de segurança/negócio (não-negociáveis)
7. Modelo de aprovação (preferência: confirm-once "go" e segue até o fim)
8. Pós-execução (memória + prevenção causa-raiz)
9. Nota de universalidade (o que muda quando se troca de stack)

## Princípio
- Intenção é universal, adapters são locais. Trocar provider = trocar adapter, fluxo não muda.
- "Confirm-once" é o sweet spot do Eliezer: um único "go", agente executa até o fim, reporta.
- Nunca ecoar segredos/valores sensíveis na conversa nem em memória.

## Primeiro runbook criado
- `rvm-designacoes-unified/.agents/workflows/rotate-secrets.intent.md` — rotação universal de segredos.
