# Veredito Epistêmico — Contra-propostas e Reforços ao Parecer 2026-09-04

**Documento-base:** [PARECER-E-PROPOSTA-2026-09-04.md](PARECER-E-PROPOSTA-2026-09-04.md) (commit `146ab29`)
**Data:** 2026-09-04
**Natureza:** revisão de decisões arquiteturais, não lista de aceite. Cada item recebe **ACEITAR**, **ACEITAR COM AJUSTE** ou **REJEITAR**, com evidência do repositório ou do corpus do paradigma.

---

## 0. Princípio de julgamento

Uma contra-proposta é aceita quando **reforça a fronteira epistêmica** (humano decide o quê/porquê; agente executa o como) **sem custar auditabilidade nem viabilidade de entrega**. É rejeitada quando troca uma narrativa mais pura por uma perda concreta de rastreabilidade, ou quando presume infraestrutura que o repo não tem e não justifica construir agora.

Fatos verificados no repo que condicionam o veredito:

| Fato | Evidência | Consequência |
|---|---|---|
| Não existe parser Gherkin executável | `grep Given\|When\|Then\|gherkin\|\.feature` em `cli/src/**` → zero ocorrências funcionais | Gherkin puro como fonte exige escrever um parser novo antes de qualquer outra coisa |
| Runbooks RVM já usam frontmatter YAML por convenção acordada (2026-04-30) | `/memories/idd-runbooks-pattern.md`; `rvm-designacoes-unified/.agents/workflows/rotate-secrets.intent.md` | Abandonar frontmatter quebra simetria "método RVM = produto RVM" (documento mestre §Symmetry) |
| Hooks git são instalados por `gitHooks.ts` e só protegem `pre-commit`/`post-merge`/`post-tag` | `extensions/idd-core/src/cli/gitHooks.ts` | Proteção de branch `shadow/*` exige `pre-push` + branch protection remota, não só hook local |
| `idd capture` já chama LLM sem entropia nem dicionário | `cli/src/commands/capture.ts` | Dicionário manual **pode** ser plugado hoje como filtro determinístico antes do LLM |
| `alignment_scores` já guarda histórico por `intent_id` com `source` static/semantic | `cli/src/lib/store.ts` `recordAlignmentScore`, `getAlignmentHistory` | Fidelity histórica na HUD é leitura de dado existente, custo baixo |
| LSP AST já percorre `MethodDeclaration` via TS Compiler API | `extensions/idd-core/src/lsp/server.ts` `validateTypeScriptDocument` | Detector de anemic model é extensão natural do visitor existente |

---

## 1. Matriz comparativa

### CP1 — Track Cognitivo: Gherkin puro vs `.intent.md` com frontmatter

| Dimensão | Proposta original | Contra-proposta | Veredito |
|---|---|---|---|
| Formato | `.intent.md` com frontmatter YAML mínimo (`module`, `target_class`, `target_method`, `authorization`) + corpo em LN livre com blocos Gherkin | Gherkin puro (`.feature`), sem frontmatter; compilador gera `.intent.yaml` | **ACEITAR COM AJUSTE** |
| Narrativa pública "LN é o código" | LN é o corpo; frontmatter é endereço | Mais pura: só LN estruturada em Given/When/Then | Ajuste preserva a pureza no **corpo** e move o endereçamento para **caminho/nome de arquivo** |
| Circunscrição (`target_class.target_method`) | No frontmatter | Precisa de tag Gherkin (`@class:UserAccount @method:register...`) ou convenção de `Feature:` | Tags Gherkin são metadados ad hoc — reintroduzem YAML disfarçado |
| Confirm-Once / autorização | `authorization: confirm-once` no frontmatter | Sem lugar natural em Gherkin | Perda concreta: o runbook deixa de declarar seu próprio modelo de aprovação |
| Custo de implementação | js-yaml já presente; markdown é passthrough | Parser Gherkin do zero (ou dependência `@cucumber/gherkin`) | Alto e prematuro |
| Simetria com RVM | Idêntico ao padrão `.agents/workflows/*.intent.md` já em uso | Quebra o padrão | Viola documento mestre §Symmetry |

**Ajuste adotado:**
```
src/auth/UserAccount.registerFailedLoginAttempt.intent.md
```
- **Endereço no caminho**: `<contexto>/<Classe>.<metodo>.intent.md`. Circunscrição vira convenção de arquivo — visível no Explorer, sem YAML.
- **Frontmatter reduzido ao não-derivável**: apenas `authorization` e `lifecycle_min_phase`. Tudo que o compilador consegue inferir do caminho **não** entra no frontmatter.
- **Corpo**: LN livre + blocos ```` ```gherkin ```` para `acceptance`. O compilador extrai Given/When/Then desses blocos; o restante do corpo vira `intent:` e `constraints:` por seção `##`.
- **Regra de pureza**: o compilador **falha** se o frontmatter contiver qualquer chave que exista no `.intent.yaml` gerado (ex.: `constraints`). Isso impede o YAML de voltar a ser fonte pela porta dos fundos.

**Justificativa epistêmica:** a fronteira não está em "YAML vs Markdown", está em **quem escreve o quê**. O humano escreve LN e a decisão de autorização; a máquina escreve o endereço estrutural (`.intent.yaml`) a partir de convenção + LN. Gherkin puro sacrifica o único metadado genuinamente epistêmico (autorização) para ganhar uma pureza sintática que a convenção de nome de arquivo já entrega.

---

### CP2 — Sombra Determinística: branch `shadow/*` vs diretório `shadow/`

| Dimensão | Proposta original | Contra-proposta | Veredito |
|---|---|---|---|
| Local | Diretório `shadow/` no mesmo branch | Branch `shadow/<modulo>` ou `shadow/main`; merge só via `idd recompile` | **ACEITAR** |
| Auditabilidade | Um PR mostra intenção + código juntos | Dois tracks realmente separados; histórico da Sombra é só commits de compilador | Superior: cada commit em `shadow/*` tem autor `idd-compiler`, nunca humano |
| Rollback | `git revert` de arquivos em `shadow/` | `git checkout shadow/main@{N}` — rollback atômico de toda a Sombra | Superior: alinha com Spec v1.0 §5 "recuo para snapshot estável" |
| Proibição de edição manual | Hook `pre-commit` (local, contornável com `--no-verify`) | Branch protection remota em `shadow/*`: só o bot/CI pode push; humano não tem permissão de escrita | **Único mecanismo realmente imponível** — `gitHooks.ts` mostra que hooks locais são cooperação, não enforcement |
| Custo | Zero | Configurar branch protection (já feita para `main` via `gh api`) + `pre-push` no `gitHooks.ts` | Baixo; padrão já dominado |
| Dogfooding | O próprio repo `idd-ide` tem `cli/src/**/*.ts` que **é** Sombra e vive em `main` | Migração gradual: módulos com `.intent.md` migram para `shadow/main` | Exige migração, mas é a migração certa |

**Ajuste de detalhe:** um único branch `shadow/main` (não um por módulo) — a Sombra é um artefato de compilação **coerente**; módulos gerados separadamente podem divergir em dependências compartilhadas. Tags `shadow/v<semver>` congelam snapshots por release.

**Justificativa epistêmica:** a Diretriz Absoluta (Spec v1.0 §5) diz que "é terminantemente proibido" editar a Sombra. Uma proibição que depende de o humano não passar `--no-verify` não é proibição, é pedido. Branch protection remota transforma a diretriz em **propriedade do sistema**, não em disciplina do usuário. Isso é exatamente a diferença entre credulidade e fé bayesiana aplicada à própria ferramenta.

---

### CP3 — Compilador L1: dicionário manual primeiro, LLM depois

| Dimensão | Proposta original | Contra-proposta | Veredito |
|---|---|---|---|
| Ordem | SHALA (LLM gera $C$ interpretações, calcula $\tilde H$) → dicionário como saída | Dicionário curado por humanos → validação determinística → LLM só para termos **fora** do dicionário | **ACEITAR** |
| DAV | LLM retorna `{interpretations, entropy}` | Igual, mas só é chamado quando o termo não está no dicionário (fast-path pré-LLM) | Aplicação literal da Layer 0 do DAV: regex/lookup antes de qualquer token |
| Demonstrabilidade Ep. "Compilar LN sem ambiguidade" | Exige LLM funcionando | Demonstrável **offline**: `idd capture` sublinha termo ausente do dicionário e pede definição | Antecipa a Fase 2 para a Fase 0/1 sem custo de rede |
| Risco | LLM inventa interpretações para termos já definidos | Zero: termo no dicionário = ambiguidade zero por definição | Reduz superfície estocástica |

**Sequência adotada:**
1. `.intent/ubiquitous-dictionary.json` criado manualmente; `idd dictionary add|define|list`.
2. `idd capture` (e LSP micro-curadoria) marca termo capitalizado/entidade não presente no dicionário como **warning determinístico**.
3. Só então SHALA: para termos ausentes, LLM propõe $C$ interpretações; humano escolhe; termo entra no dicionário.

**Justificativa epistêmica:** o dicionário ubíquo é a **Linguagem Ubíqua de Evans** materializada. Ela é produto de conversa humana no domínio, não de amostragem de LLM. O LLM entra para acelerar a descoberta de ambiguidade, não para definir termos — isso seria delegar comando epistêmico.

---

### R1 — Waivers com expiração automática

| Aspecto | Original | Reforço | Veredito |
|---|---|---|---|
| Expiração | Campo `expira_em` obrigatório | Default 30 dias, renovação exige nova aprovação de `moderator` | **ACEITAR COM AJUSTE** |
| Ajuste | — | Default **por fase**: `exploratory` 30d · `stabilization` 14d · `production` 7d (alinhado a `waiver_policy.max_waiver_duration_days: 7` do Blueprint v2.0) | Blueprint já fixa 7d para produção; um único default de 30d relaxaria a governança onde ela mais importa |
| Enforcement | `idd verify` ignora waiver expirado | Igual + `idd waiver audit` lista os que expiram em ≤3 dias; CI posta no PR | — |

**Justificativa epistêmica:** waiver é **exceção temporária ao comando epistêmico**, concedida por papel. Se não expira, vira regra tácita que ninguém decidiu — o "porquê" evapora (Ep01). Expiração escalonada por fase é o Risk Dial aplicado à própria exceção.

---

### R2 — Detector de *anemic model* no AST Verifier

**ACEITAR.** Definição operacional para o verificador:

> Classe circunscrita (aparece como `target_class` em algum `.intent.yaml`) cujos métodos públicos são **todos** getters/setters triviais (corpo = `return this.x` ou `this.x = v`) **e** que é mutada externamente por algum `*Service`/`*Helper`/`*Manager`.

Severidade: `warn` em `exploratory`, `critical` em `stabilization+`. Complementa a regra 2.3.2 do Pacote de Ajustes ("Eliminação de Serviços Anêmicos").

**Justificativa epistêmica:** anemic model é o sintoma de que a intenção foi alocada em lugar errado — o comportamento está fora da entidade que detém o estado. É a versão estrutural da "string mágica" do Ep06: um conceito de domínio que não conseguiu nascer no lugar certo.

---

### R3 — README por patch do fork Code-OSS

**ACEITAR.** Cada `ide/patches/NNNN-*.patch` acompanhado de `NNNN-*.md` com:

- **Promessa pública cumprida** (episódio + timestamp ou documento + seção)
- **Princípio do paradigma** que impõe (ex.: Spec v1.0 §5 Diretriz Absoluta)
- **Por que não é possível como extensão** (API interna do workbench)
- **Superfície tocada** no Code-OSS (arquivos)
- **Risco de rebase** (baixo/médio/alto) e última tag testada

**Justificativa epistêmica:** o fork é a única parte do sistema onde o IDD **toma decisões pelo usuário** (Sombra read-only, Explorer substituído). Cada uma dessas imposições precisa de justificativa rastreável a uma promessa que o humano fez publicamente — senão é o IDE exercendo comando epistêmico, invertendo o paradigma.

---

### R4 — Intent Fidelity histórico na HUD

**ACEITAR.** Dados já existem (`alignment_scores` com `recorded_at`, `source`). Implementação:

- Sparkline por módulo no rail esquerdo (últimos 30 scores).
- Painel direito: 4 dimensões (completeness/correctness/alignment/consistency) quando disponíveis; agregado quando não.
- **Indicador de Risk Dial elegível**: "Este módulo sustenta ≥95% em 50 verificações — elegível para `monitoring`". O botão de mudar o dial só habilita quando a evidência existe.

**Justificativa epistêmica:** "fé bayesiana" (Ep02) só é fé bayesiana se a evidência for **visível** no momento da decisão. Mostrar histórico no ponto onde o humano decide relaxar um gate é o que transforma intuição em posterior.

---

## 2. Sequência de implementação revisada

Alterações em relação ao Parecer §III marcadas com ►.

| # | Entrega | Gate de saída | Justificativa da posição |
|---|---|---|---|
| 1 | **Fase 0** — Contrato v2 (`target_class/method`, `behavioral_contract`, constraints/acceptance estruturados, `ethics`) + `project.intent.yaml` completo + `idd verify --project` | 1 parser em `@idd/core`; v1 válido; importação ilegal bloqueada | Inalterado — tudo depende do contrato |
| 2 ► | **Dicionário Ubíquo manual** — `.intent/ubiquitous-dictionary.json`, `idd dictionary`, warning determinístico em `capture` + LSP | Termo fora do dicionário gera warning offline, sem LLM | Antecipado de Fase 2: demonstra "LN sem ambiguidade" já aqui, sem rede (CP3) |
| 3 ► | **Fase 1** — Track Cognitivo `.intent.md` (caminho = circunscrição, frontmatter mínimo, corpo LN + gherkin) + `idd compile` → `.intent.yaml` + **branch `shadow/main`** com branch protection remota (só CI/bot push) + `pre-push` em `gitHooks.ts` + `idd rollback/refine/recompile` | Push humano em `shadow/*` rejeitado pelo remoto; compilador falha se frontmatter duplicar chave do YAML | CP1 + CP2 |
| 4 | **Fase 3** — AST verifier: visibilidade, LCOM4, CBO/Demeter, Liskov, string mágica, ► **anemic model** | Hard gate <100 ms; Ep01 "apita ao violar" demonstrável | R2 |
| 5 ► | **Fase 4** — waivers com expiração **por fase** (30/14/7d), `idd waiver audit`, lifecycle/roles, Risk Dials evidence-gated, Intent Fidelity em 4 dimensões | Nenhum dial relaxa sem fidelity histórica; waiver expirado é ignorado pelo verify | R1 |
| 6 ► | **Fase 6** — HUD 4 regiões + **sparkline de fidelity por módulo** + **indicador de elegibilidade de dial** | Ciclo intenção→compile→generate→verify→drift→waiver na UI; botão de dial só habilita com evidência | R4 |
| 7 | **Fase 2** — SHALA para termos **ausentes** do dicionário (LLM propõe, humano decide, termo entra) | Ep. "Compilar LN sem ambiguidade" gravável com LLM como acelerador, não como oráculo | CP3, ordem invertida |
| 8 ► | **Alvo B** — submodule Code-OSS + 6 patches **cada um com README** + build/release | Instalador 3 plataformas; Sombra read-only; cada patch rastreia promessa pública | R3 |
| 9 | **Fase 5** — Armstrong closure, Excalidraw+VLM, Traceback Visual | Soft gate posta laudo sem bloquear | Inalterado |

**Critério global inalterado:** um módulo do `idd-ide` percorre o ciclo inteiro dentro do IDD IDE e o vídeo é publicável como Ep. "Show me the Code".

---

## 3. Rastreabilidade às promessas dos episódios

| Episódio | Promessa | Entrega que a cumpre | Item |
|---|---|---|---|
| Ep01 | "LN é o artefato de mais alta ordem" | `.intent.md` é a única coisa que o humano escreve; `.intent.yaml` e código são compilados | #3 |
| Ep01 | "O sistema apita se o código violar a intenção" | AST verifier hard gate no LSP | #4 |
| Ep01 | "Sobrevive a refactoring" | Circunscrição por `Classe.metodo` no caminho, não por nome de arquivo de código | #1, #3 |
| Ep01 | "Intenção versionada, validada, mantida viva" | Track Cognitivo em `main`; Sombra em `shadow/main`; Intent Store liga os dois por hash | #3 |
| Ep02 | "Humano aprova o plano, agente executa" | `authorization: confirm-once` no frontmatter; `idd recompile` executa até o fim e reporta | #3 |
| Ep02 | "Fé bayesiana, não credulidade" | Sparkline de fidelity + dial só relaxa com evidência | #5, #6 |
| Ep02 | "Invariantes como salvaguarda" | `constraints` estruturados com `severity: critical` bloqueiam merge; waiver expira | #1, #5 |
| Ep03 | "Literate Programming: código derivado de LN" | Sombra é saída de `idd compile` + `idd generate`; humano não escreve nela | #3 |
| Ep04 (planejado) AEON | "Nexus traduzindo pensamento" | Dicionário Ubíquo + SHALA como Camada 1 | #2, #7 |
| Ep05 (planejado) Runbooks | "Comandos epistêmicos que a IA não viola" | Mesmo formato `.intent.md` em `.agents/workflows/` e em `src/` | #3 |
| Ep06 (planejado) Papel vs Ator | "String mágica é conceito chorando para nascer" | Detector de string mágica + anemic model | #4 |
| Ep08 (planejado) Testes | "Agente valida que invariantes se mantêm" | `acceptance` em Gherkin no `.intent.md` → testes gerados na Sombra | #3, #4 |

---

## 4. O que **não** foi aceito e por quê

| Sugestão implícita | Motivo da rejeição |
|---|---|
| Gherkin **puro** sem frontmatter | Perde `authorization` (único metadado epistêmico); exige parser novo; quebra simetria com runbooks RVM. Aceito apenas como **corpo** do `.intent.md` |
| Expiração única de **30 dias** para todo waiver | Contradiz `max_waiver_duration_days: 7` do Blueprint v2.0 para produção; relaxaria onde importa. Aceito **por fase** |
| Um branch `shadow/<modulo>` por módulo | Sombra é artefato de compilação coerente; módulos compilados em isolamento divergem. Aceito como `shadow/main` + tags por release |

---

## 5. Decisões que retornam ao comando epistêmico

| Decisão | Recomendação deste veredito | Aguarda |
|---|---|---|
| Convenção de nome do `.intent.md` | `<contexto>/<Classe>.<metodo>.intent.md` | Eliezer |
| Chaves permitidas no frontmatter | `authorization`, `lifecycle_min_phase` — nada mais | Eliezer |
| Nome do branch de Sombra | `shadow/main` + `shadow/v*` | Eliezer |
| Defaults de expiração por fase | 30 / 14 / 7 dias | Eliezer |
| Severidade de anemic model por fase | warn / critical / critical | Eliezer |
| Threshold de elegibilidade de dial | ≥95% em 50 verificações (Stockley Cap. 6) | Eliezer |

Nenhuma decisão acima relaxa gate existente. Todas adicionam enforcement ou tornam evidência visível no ponto de decisão. O agente executa qualquer item de §2 sob confirm-once.
