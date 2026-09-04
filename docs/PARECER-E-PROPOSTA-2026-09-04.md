# Parecer Arquitetural e Proposta de Evolução — IDD IDE

**Repositório:** `EliezerRosa/idd-ide` · commit `c4677c4`
**Data:** 2026-09-04
**Autor do parecer:** GitHub Copilot (agente), sob comando epistêmico de Eliezer Rosa
**Fontes cruzadas:**
- Repositório `idd-ide` (código, testes, docs, extensão, LSP, PWA)
- `C:\IDE IDD Claude\` — Especificação Arquitetural IDD-IDE v1.0, Master Blueprint v2.0 (Gemini), Intent Spec de Validação Visual, Pacotes de Ajustes, prompt "Compilar LN sem ambiguidade"
- `C:\Antigravity - RVM Designações\IDD Paradigma\` — documento mestre, manifesto, IDD-knowledge-base, roteiros e vídeos Ep01–Ep03, backlog editorial
- Richard Stockley, *Intent-Driven Development* v0.2 (13 abr 2026)

---

## Sumário Executivo

O `idd-ide` já possui um **núcleo executável real** do paradigma: contrato `.intent.yaml`, Intent Store versionado, verificador estático, LSP com AST para `state_mutation`, Webview nativa conectada ao workspace, CI e **843 testes passando**. A maturidade qualitativa está em torno de **62%**.

Existem, porém, três lacunas que separam o produto atual do paradigma como Eliezer o formula — e uma quarta que separa o produto do que ele **declara ser**:

1. **A fonte primária ainda é YAML, não linguagem natural.** O paradigma diz que LN é o código-fonte; o repo trata LN como um campo `intent:` dentro de um YAML. A Camada 1 (Compilador L1/SHALA — LN ambígua → LN ubíqua) não existe.
2. **Não há circunscrição comportamental.** O `.intent.yaml` aponta para `module`, não para `target_class.target_method`. Sem isso, o AST verifier não pode impor DbC/LCOM/CBO/Demeter/LSP.
3. **O Git bimodal (Track Cognitivo + Sombra Determinística) não existe.** Não há separação entre intenção versionada e código gerado congelado; logo, a "Diretriz Absoluta" (nunca editar a Sombra) não é imponível.
4. **O "fork do Code-OSS" é declarativo, não real.** `product.json`, README e `ARCHITECTURE.md` afirmam que o IDE é Code-OSS. O repo não contém o código do Code-OSS, nem seu pipeline de build (gulp/electron). O que existe é uma extensão VS Code + branding.

A proposta abaixo trata os quatro pontos e oferece **dois alvos de entrega** sobre o **mesmo núcleo**: extensão para VS Code (curto prazo, alcance) e IDE dedicado como fork legítimo do Code-OSS (médio prazo, controle total do paradigma).

---

## Parte I — Cruzamento: Paradigma × Repositório

### 1.1 Os três formuladores e o que cada um exige

| Fonte | Núcleo conceitual | Exigência para a ferramenta |
|---|---|---|
| **Stockley (ebook v0.2)** | Seis elementos (intent, domain context, success criteria, validation, constraints, ethics); Risk Dials Red/Amber/Green; Intent Fidelity (completeness, correctness, alignment, consistency); Intent Hierarchy (Org → Domain → Project); Maturity Model L1–L4 | Especificação estruturada, gates com autonomia graduada, métrica de fidelidade, herança de intenção |
| **Eliezer (knowledge-base, vídeos, manifesto)** | **Comando epistêmico vs. operacional** (Engelbart 1962); LN como artefato de mais alta ordem e **governança persistente**; **DAV** (LLM interpreta intenção, nunca dados); **Confirm-Once**; invariantes como salvaguardas; **Ergonomia Semântica**; simetria "Eliezer pensa, IA constrói"; genealogia Bush→Karpathy | Ferramenta que preserve a fronteira epistêmica em runtime: humano aprova intenção/invariantes/waivers; agente executa mecânica; tudo auditável à intenção de origem |
| **Especificação IDD-IDE v1.0 / Blueprint v2.0 (Claude/Gemini)** | Pirâmide de abstração (código = novo Assembly); Ciclo espiral de 5 fases (UML-S → classes → MER 3FN → UX intent → máquinas de estado); **Gherkin-YAML como bytecode**; Agente Curador (micro/macro); **Git bimodal**; Traceback Semântico Visual; **3 camadas** (project/domain/module); **Hard × Soft gates**; SHALA-LLM (entropia $\tilde H$); circunscrição a método; AST verifier (LCOM/CBO/Demeter/LSP); validação visual VLM; herança Unisys SIM/SDM | Compilador de LN com desambiguação; contrato de método com `state_mutation`; verificador AST estrutural; normalizador formal por Armstrong; governança por lifecycle/roles/waivers; UI HUD-first com 4 regiões |

### 1.2 Matriz de aderência por conceito

| Conceito do paradigma | Estado no repo | Evidência | Gap |
|---|---|---|---|
| LN como fonte primária | **Parcial** | `intent:` é campo obrigatório; Webview exibe LN como bloco de 1ª ordem | LN é um campo, não o artefato. Sem `.intent.md` / Track Cognitivo separado |
| Compilador L1 / SHALA (LN ambígua → ubíqua) | **Ausente** | `idd capture` expande LN via LLM, mas sem entropia, distribuições verbalizadas ou dicionário ubíquo | Fase 1 inteira |
| Dicionário Ubíquo (`.intent/ubiquitous-dictionary.json`) | **Ausente** | — | — |
| 3 camadas (project / domain / module) | **Parcial** | `project.intent.yaml` só tem `bounded_contexts[].status`; `domain.intent.yaml` é gerado por `idd domain compile`; `.intent.yaml` existe | `project.intent.yaml` sem `lifecycle_status`, `governance`, `global_constraints`, `allowed_dependencies`; sem verificador de importação entre contextos |
| Circunscrição a método (`target_class.target_method`) | **Ausente** | schema exige `module: ctx/nome`; LSP casa `@intent('id')` por nome | Sem DbC formal; anemic model não é detectável |
| `state_mutation.allowed_fields` | **Presente** (commit `c4677c4`) | schema, validador CLI, LSP AST | Falta `read_only_fields`, `visibility`, `behavioral_contract` como bloco |
| Hard Gates: AST (visibilidade, LCOM, CBO, Demeter, LSP) | **Parcial** | Só mutação não autorizada via TS Compiler API | LCOM/CBO/Demeter/LSP/visibilidade ausentes |
| Hard Gates: normalização 1NF→DKNF por Armstrong | **Parcial** | `normalizer.ts` implementa 1NF–3NF/BCNF por FDs declaradas; 4NF/5NF/DKNF são heurísticas de nomenclatura | Sem fechamento $X^+$ formal; sem decomposição lossless-join |
| Hard Gates: acoplamento entre Bounded Contexts | **Ausente** | — | `idd verify --project` não existe |
| Soft Gates: VLM visual (Excalidraw) | **Ausente** | `idd domain compile` gera `er-diagram.md` Mermaid | Sem render Excalidraw, sem inspetor VLM, sem `visualScore` |
| Verificação semântica fail-closed | **Presente** (commit `c4677c4`) | `unknown` + `--semantic-required` | — |
| Risk Dials / lifecycle / roles / waivers | **Ausente** | — | Governança inteira |
| Intent Fidelity (4 dimensões) | **Parcial** | `alignment_scores` (0–100, static/semantic) | Não decompõe em completeness/correctness/alignment/consistency |
| Git bimodal (Track Cognitivo + Sombra) | **Ausente** | Intent Store guarda `yaml_snapshot` e `git_commit` por versão | Sem repositório/branch de sombra, sem proibição de edição, sem rollback→refinar→recompilar |
| DAV (LLM nunca vê dados de domínio) | **Ausente no tooling** | Padrão existe no RVM Designações (produto), não no IDE | `IntentEngine` envia código inteiro ao LLM; não separa `{actionType, params}` |
| Traceback Semântico Visual | **Ausente** | — | — |
| Confirm-Once | **Parcial** | Runbooks `.intent.md` em RVM; não no IDE | Sem comando "go" que execute plano completo com trace |
| Intent Store (SQLite versionado) | **Forte** | `store.ts`, 36 testes | — |
| CLI (24 comandos) | **Forte** | 843 testes | — |
| LSP para `.intent.yaml` | **Forte** | diagnostics, hover, goto, rename, completion | — |
| Extensão VS Code embarcada | **Operacional** | `idd-core` com Webview real, scanner, CodeLens, navegação | Painel ainda não executa generate/verify/waiver |
| **Fork do Code-OSS** | **Declarativo** | `product.json`, README, ARCHITECTURE.md afirmam Code-OSS | **Nenhum código do Code-OSS no repo; `build.sh` só compila CLI+VSIX** |

### 1.3 O que os vídeos exigem que a ferramenta demonstre

Os três episódios publicados/produzidos estabelecem promessas públicas que a ferramenta precisa honrar:

| Episódio | Promessa pública | Feature necessária na IDE |
|---|---|---|
| **Ep01 — O que é IDD** | "O sistema apita se o código violar a intenção; sobrevive a refactoring" | Drift detection em tempo de digitação (LSP) ✔ parcial; sobrevivência a rename exige contrato por `target_class.target_method`, não por nome de arquivo ✘ |
| **Ep01** | "Intenção versionada, validada, mantida viva" | Intent Store ✔; falta Track Cognitivo como repositório de 1ª classe ✘ |
| **Ep02 — Comando Epistêmico** | "Humano aprova o plano; agente executa a mecânica; confirm-once" | Comando `go` com plano+trace+relatório ✘; papéis (legislator/moderator/executor) ✘ |
| **Ep02** | "Fé bayesiana: confiança escalada por evidência auditável" | Intent Fidelity histórico por módulo ✔ parcial; Risk Dials que só relaxam com evidência ✘ |
| **Ep03 — Genealogia** | Literate Programming (Knuth): código derivado de LN | Sombra Determinística como saída de compilação, não fonte ✘ |
| **Ep06 (planejado) — Papel vs Ator** | "FK é juramento de honestidade; string mágica é conceito chorando para nascer" | `idd domain verify` contra migrations ✔; detector de "string mágica em campo id" ✘ |

**Conclusão da Parte I:** o repo entrega bem a **camada de artefatos** (contrato, store, CLI, LSP) e a **camada de sistemas** (CI, hooks) de Stockley. Falta a **camada de pensamento** do Eliezer: o pipeline LN → LN ubíqua → circunscrição → sombra, com fronteira epistêmica imposta pela ferramenta.

---

## Parte II — Proposta

### 2.1 Princípio arquitetural: um núcleo, dois alvos

```
                    ┌───────────────────────────────────────┐
                    │        @idd/core  (TypeScript)        │
                    │  contratos · L1 compiler · AST engine │
                    │  normalizer · store · governance      │
                    │  DAV runtime · bimodal git            │
                    └──────────────┬────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
     │  @idd/lsp       │  │  @idd/cli       │  │ @idd/webview-ui │
     │  (server)       │  │  (idd ...)      │  │ (React, HUD)    │
     └────────┬────────┘  └─────────────────┘  └────────┬────────┘
              │                                         │
   ┌──────────┴──────────┐                   ┌──────────┴──────────┐
   ▼                     ▼                   ▼                     ▼
┌──────────────────┐ ┌────────────────────────────────────────────────┐
│ ALVO A           │ │ ALVO B                                          │
│ Extensão VS Code │ │ IDD IDE — fork real do Code-OSS                 │
│ (VSIX / OpenVSX) │ │ (idd-ide/vscode como submodule + patches)       │
│ paradigma dentro │ │ paradigma como shell: Activity Bar intencional, │
│ de um host       │ │ Explorer por Bounded Context, Welcome = intent, │
│ genérico         │ │ Sombra read-only, Git bimodal nativo            │
└──────────────────┘ └────────────────────────────────────────────────┘
```

**Regra:** nada de lógica IDD vive no Alvo A ou B. Os alvos são **adaptadores de apresentação**. Isso é a aplicação direta da Separation Principle de Stockley (camada humana estável / camada de ferramenta fluida) e do padrão "intenção universal, adapters locais" dos runbooks do Eliezer.

### 2.2 Reestruturação do repositório

```
idd-ide/
├── packages/
│   ├── core/            # contratos, parsers, store, governance, DAV, bimodal
│   ├── l1-compiler/     # SHALA: entropia, distribuições, dicionário ubíquo
│   ├── verifier-ast/    # visibilidade, LCOM, CBO, Demeter, LSP, state_mutation
│   ├── domain/          # parser UML/Mermaid, Armstrong closure, normalizer, compiler
│   ├── visual/          # Excalidraw synthesizer, VLM inspector (soft gate)
│   ├── lsp/             # servidor LSP (consome core + verifier-ast)
│   ├── cli/             # comando idd (hoje cli/)
│   ├── webview-ui/      # React HUD (hoje packages/idd-ui-pwa + vscode-extension)
│   └── vscode-extension/# ALVO A (hoje extensions/idd-core)
├── ide/                 # ALVO B
│   ├── vscode/          # git submodule → microsoft/vscode @ tag estável
│   ├── patches/         # patches mínimos sobre o Code-OSS
│   ├── product.json     # hoje na raiz — move para cá
│   └── build/           # scripts gulp/electron do fork
├── schemas/
├── docs/
└── project.intent.yaml  # Camada 1 do próprio repo (dogfooding)
```

O `project.intent.yaml` do repo passa a declarar os `bounded_contexts` acima com `allowed_dependencies`, e `idd verify --project` bloqueia importações ilegais. O repo governa a si mesmo.

### 2.3 Fases de implementação

#### Fase 0 — Contrato canônico v2 (P0, fundação de tudo)

Estender `schemas/intent.schema.json` para o schema de circunscrição do Blueprint v2.0, mantendo retrocompatibilidade com `module`:

```yaml
version: "2.0"
target_class: "Domain.Auth.UserAccount"        # novo (opcional em v1, obrigatório em v2)
target_method: "registerFailedLoginAttempt"    # novo
intent: >                                       # LN — permanece obrigatório
  Registrar tentativa incorreta de senha...
behavioral_contract:                            # novo
  visibility: public
  state_mutation:
    allowed_fields: [...]
    read_only_fields: [...]
constraints:                                    # evolui de string[] para objetos com id/type/severity
  - id: C-METH-01
    type: invariant | encapsulation | security | performance
    severity: critical | warn
    description: "..."
acceptance:                                     # evolui para Given/When/Then estruturado
  - id: A-01
    given: "..."
    when: "..."
    then: "..."
ethics:                                         # novo — elemento 6 de Stockley
  impacted: [...]
  risks: [...]
```

`project.intent.yaml` ganha `lifecycle_status.phase_policies`, `governance.roles`, `governance.waiver_policy`, `global_constraints`, `bounded_contexts[].allowed_dependencies`.

**Gate de saída:** um único parser em `@idd/core` é consumido por CLI, LSP e Webview. Testes de contrato garantem que v1 continua válido.

#### Fase 1 — Track Cognitivo e Sombra Determinística (P0)

- Introduzir `.intent.md` como artefato de LN livre por módulo (Track Cognitivo). O `.intent.yaml` passa a ser **compilado** dele por `idd compile` (Gherkin-YAML = bytecode, como na Especificação v1.0).
- Diretório `shadow/` (ou branch `shadow/*`) recebe código gerado. Hook `pre-commit` recusa edição manual em `shadow/` quando `lifecycle_status != exploratory`.
- Protocolo de emergência como comando: `idd rollback` → `idd refine <módulo>` (abre `.intent.md`) → `idd recompile`.
- Intent Store grava `intent_md_hash`, `intent_yaml_hash`, `shadow_commit`.

**Gate de saída:** é impossível fazer merge de alteração em `shadow/` sem alteração correspondente no Track Cognitivo.

#### Fase 2 — Compilador L1 / SHALA (P1)

- `idd capture --ubiquitous`: LLM gera $C$ interpretações verbalizadas; calcula $\tilde H(p_q)$; se $> \epsilon$ (por fase de lifecycle), abre diálogo de convergência; grava termos em `.intent/ubiquitous-dictionary.json`.
- LSP: micro-curadoria — sublinha termo do `.intent.md` ausente do dicionário (soft gate).
- **DAV aplicado ao próprio compilador:** o LLM só retorna `{interpretations[], entropy}`; a decisão é humana; nada de dados de domínio vai ao modelo.

**Gate de saída:** Ep. "Compilar LN sem ambiguidade" pode ser gravado com a ferramenta.

#### Fase 3 — Verificador AST completo (P1)

Em `@idd/verifier-ast`, sobre TypeScript Compiler API (já em uso no LSP):
- Visibilidade / encapsulation leak (setters públicos em `read_only_fields`).
- LCOM4 (rotulado como tal — evita a confusão apontada na crítica ao UI Lab).
- CBO + Lei de Demeter (encadeamentos além de `this`, parâmetros, instâncias locais).
- LSP (Liskov): subclasse que enfraquece constraint do pai.
- Detector de **string mágica em campo id** (Ep06).

Todos são **hard gates locais**, <100 ms, sem rede. Expostos via LSP diagnostics + CodeLens + `idd diff --structural`.

#### Fase 4 — Governança operacional (P1)

- Store: tabelas `waivers` (autor, papel, justificativa, escopo, expiração, assinatura) e `lifecycle_transitions`.
- CLI: `idd waiver grant|list|revoke`, `idd lifecycle set <phase>` (exige `legislator`).
- Risk Dials de Stockley mapeados para `phase_policies` (Red = `imperative`, Amber = `strict`/`advisory`, Green = `off`) e **só relaxam com evidência**: `idd lifecycle set production` falha se Intent Fidelity média < 95% em N verificações.
- Intent Fidelity decomposta em 4 dimensões no `alignment_scores`.

#### Fase 5 — Domínio formal e validação visual (P2)

- `normalizer.ts`: fechamento $X^+$ por Armstrong; 4NF/5NF por MVD/JD declaradas; decomposição lossless-join.
- `idd domain render-excalidraw` + `idd domain inspect-visual` (VLM, soft gate, laudo no PR).
- Traceback Semântico Visual: falha de teste → heatmap sobre `.intent.md`/YAML.

#### Fase 6 — UI HUD-first (P1, paralela às fases 2–5)

`@idd/webview-ui` implementa as 4 regiões do Blueprint (HUD header com lifecycle/role/score; rail por Bounded Context; editor dual `.intent.md` | `.intent.yaml` | código; painel Hard/Soft gates). A Webview atual em `idd-core` é substituída por este pacote. Ações executam `@idd/core` diretamente: generate, verify, diff, waiver, rollback/refine/recompile.

---

### 2.4 Alvo A — Extensão para VS Code

**Papel:** distribuição ampla e adoção incremental; funciona em VS Code, VSCodium, Cursor, Windsurf e no próprio IDD IDE.

- Pacote `packages/vscode-extension` (evolução do `idd-core` atual).
- Contribui: Activity Bar IDD, Webview HUD, LSP client, CodeLens, comandos, StatusBar HUD.
- **Limites intrínsecos do host** (o que a extensão *não* consegue impor):
  - não pode tornar `shadow/` read-only no Explorer nativo;
  - não pode substituir o Explorer por navegação por Bounded Context;
  - não pode bloquear `git commit` feito fora do VS Code (só via hook);
  - não pode remover a tela de boas-vindas "genérica" nem forçar `IDD Dark`.
- Publicação: Open VSX + VS Marketplace (VSIX já gerado e instalado localmente).

### 2.5 Alvo B — IDD IDE como fork legítimo do Code-OSS

**Papel:** materializar o paradigma como ambiente, não como plugin. Onde a extensão sugere, o IDE impõe.

#### 2.5.1 Estrutura do fork

```
ide/
├── vscode/                 # submodule: https://github.com/microsoft/vscode @ 1.9x.x (tag)
├── patches/
│   ├── 0001-product-branding.patch         # product.json IDD, ícones, nome
│   ├── 0002-builtin-idd-core.patch         # extensão IDD como built-in não removível
│   ├── 0003-intent-explorer-default.patch  # Explorer padrão = Bounded Contexts
│   ├── 0004-shadow-readonly.patch          # arquivos em shadow/ abrem read-only por padrão
│   ├── 0005-welcome-intent.patch           # Welcome page = "Declare uma intenção"
│   └── 0006-bimodal-scm.patch              # SCM view mostra Track Cognitivo | Sombra
├── product.json
└── build/
    ├── apply-patches.sh
    ├── build-linux.sh · build-darwin.sh · build-win32.sh
    └── release.yml (GitHub Actions)
```

**Decisão: submodule + patches, não fork direto do histórico.** Justificativa:
- rebase mensal sobre tags upstream do Code-OSS é operacional; fork com 300k commits não é;
- cada patch é um artefato auditável de **onde o IDE diverge do host** — princípio de transparência epistêmica;
- licença MIT do Code-OSS permite; marca "Visual Studio Code" e marketplace da Microsoft **não** podem ser usados (já previsto em `DISTRIBUTION.md` com Open VSX).

#### 2.5.2 Patches mínimos e o que cada um impõe

| Patch | Impõe no paradigma | Por que só é possível no fork |
|---|---|---|
| built-in `idd-core` | Camadas 1–3 sempre ativas | extensões built-in não são desinstaláveis |
| Intent Explorer default | "Navegar por Bounded Contexts, não por pastas" (Blueprint §Left Rail) | substituir o Explorer é API interna |
| Sombra read-only | "Diretriz Absoluta: proibido editar a Sombra" (Spec v1.0 §5) | `files.readonlyInclude` é contornável pelo usuário; no fork é enforcement |
| Welcome intent-first | INV-UI-01 (sem interface mágica); a primeira ação é declarar intenção | Welcome page é parte do workbench |
| SCM bimodal | Git bimodal visível: dois tracks lado a lado | SCM view é core |
| Branding | `product.json` real, `idd-ide://`, `.idd-ide/` | já existe na raiz; só falta o build que o consome |

#### 2.5.3 Pipeline de build do fork

`scripts/build.sh` atual empacota CLI + VSIX em `.tar.gz` e **não** produz um IDE. O `build.sh` do Alvo B:

1. `git submodule update --init ide/vscode`
2. `cd ide/vscode && git checkout <tag>`
3. `../build/apply-patches.sh`
4. `cp ../product.json product.json`
5. `npm ci && npm run gulp vscode-<platform>-min` (ou `vscode-<platform>-min-ci`)
6. Copiar `packages/vscode-extension` compilada para `ide/vscode/extensions/idd-core` (built-in).
7. Empacotar instaladores (`.deb/.rpm/.dmg/.exe`) via os targets gulp do próprio Code-OSS.

CI: workflow separado `idd-ide-release.yml`, disparado por tag, matriz linux/darwin/win32, artefatos no GitHub Release (canal de update já previsto em `DISTRIBUTION.md`).

#### 2.5.4 Relação entre A e B

- **A é subconjunto estrito de B.** O IDE embarca a mesma extensão publicada. Tudo que o usuário aprende em A vale em B.
- **B adiciona apenas enforcement de shell.** Nenhuma regra de negócio nova.
- Roadmap: A entrega valor em semanas; B é a materialização completa e exige ~1 sprint de setup do submodule/patches + CI, depois manutenção mensal de rebase.

---

## Parte III — Sequência recomendada e critérios de conclusão

| Ordem | Entrega | Alvo | Gate de saída |
|---|---|---|---|
| 1 | Fase 0 — Contrato v2 + `project.intent.yaml` completo + `idd verify --project` | core/CLI/LSP | 1 parser, v1 retrocompatível, importações ilegais bloqueadas |
| 2 | Fase 1 — Track Cognitivo + Sombra + rollback/refine/recompile | core/CLI | merge em `shadow/` sem `.intent.md` correspondente é impossível |
| 3 | Fase 3 — AST verifier (LCOM4/CBO/Demeter/LSP/visibilidade) | verifier-ast/LSP | hard gate <100 ms sem rede; Ep01 "apita ao violar" demonstrável |
| 4 | Fase 4 — waivers/lifecycle/roles + Risk Dials evidence-gated | core/CLI | nenhum relaxamento de dial sem fidelity histórica |
| 5 | Fase 6 — Webview HUD 4 regiões substitui painel atual | webview-ui / **Alvo A** | ciclo intenção→generate→verify→drift→waiver na UI |
| 6 | Fase 2 — L1/SHALA + dicionário ubíquo | l1-compiler/LSP | Ep. "Compilar LN sem ambiguidade" gravável |
| 7 | **Alvo B** — submodule Code-OSS + 6 patches + build/release | ide/ | instalador funcional em 3 plataformas; Sombra read-only; Explorer intencional |
| 8 | Fase 5 — Armstrong closure, Excalidraw+VLM, Traceback Visual | domain/visual | soft gate posta laudo no PR sem bloquear |

**Critério global de "aderência ao paradigma":** um módulo do próprio `idd-ide` percorre, dentro do IDD IDE, o ciclo completo — `.intent.md` → L1 → `.intent.yaml` circunscrito → geração para `shadow/` → LSP detecta drift ao digitar → waiver assinado por moderator → CI hard gate verde + soft gate com laudo — e o vídeo dessa demonstração pode ser publicado no canal como Ep. "Show me the Code".

---

## Parte IV — Riscos e decisões que permanecem com o comando epistêmico

| Decisão | Opções | Recomendação | Quem decide |
|---|---|---|---|
| Formato do Track Cognitivo | `.intent.md` livre · Gherkin puro · `.intent.md` com frontmatter YAML | `.intent.md` com frontmatter (compatível com runbooks RVM) | Eliezer |
| Obrigatoriedade de `target_class` em v2 | obrigatório · opcional com warning | opcional em `exploratory`, obrigatório em `stabilization+` | Eliezer |
| Tag do Code-OSS para o fork | última stable · LTS-like (N-1) | N-1 stable, rebase mensal | Eliezer |
| Onde vive a Sombra | diretório `shadow/` · branch `shadow/*` · repo separado | diretório no mesmo repo (auditável em um PR); reavaliar se crescer | Eliezer |
| Threshold $\epsilon$ de entropia por fase | 0.35 fixo · por `phase_policies` | por fase (0.5 exploratory / 0.35 stabilization / 0.2 production) | Eliezer |
| Marca do IDE dedicado | "IDD IDE" · "AEON IDE" | manter "IDD IDE" no produto; "AEON" para o orquestrador/agente (Ep04) | Eliezer |

O agente pode executar qualquer uma das fases acima sob confirm-once. Nenhuma delas relaxa um gate existente; todas adicionam enforcement.

---

## Anexo — Estado verificado do repositório em 2026-09-04

- Commits recentes: `c4677c4` (state_mutation canônico + fail-closed), `4d126b1`, `5df7f70` (LSP AST + CodeLens), `b58d835` (Webview lê workspace), `8673233` (bundle autocontido), `c26f54f`, `55855b5`, `e99c5a2`.
- Testes CLI: 24 suítes, **843 passando**. Build CLI: verde. Build extensão + LSP bundle: verde. VSIX 9 arquivos instalado localmente.
- Branch protection em `main`: PR obrigatório, 1 aprovação, checks `IDD Verify`/`IDD Review`, histórico linear, sem force-push.
- Alterações locais não commitadas (preservadas, fora deste parecer): `cli/src/commands/{capture,diff,generate,migrate,review,suggest}.ts`, `extensions/idd-core/src/engine/IntentEngine.ts`.
