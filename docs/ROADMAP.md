# IDD IDE — Roadmap

> **Nota de reconciliação (2026-11-25):** As Fases 2 a 7 abaixo registram o histórico de entregas de MVP/protótipo. Para alinhamento estrito com o [README](../README.md) e o [Cânone §6](../paradigma/00-canone/IDD-CANONE.md), cada item traz seu **status real verificável em código**: ✅ **implementado** (com escopo indicado) · 🧪 **experimental / parcial / heurístico** · 🔭 **proposta futura**. Ver também a auditoria em código duro em [`PARECER-GENEALOGIA-E-CONVERGENCIAS-2026-11-25.md`](PARECER-GENEALOGIA-E-CONVERGENCIAS-2026-11-25.md).

## Paradigma
O IDD IDE parte de um princípio central: **a intenção humana formalizada em contrato é a fonte de autoridade**, não apenas o código isolado. Código, testes e documentação permanecem rastreáveis à intenção e sujeitos a verificação determinística.

---

## Histórico — Fase 2: MVP Inicial (entregue como protótipo)

| Issue | Feature | Status real | Observação verificável |
|---|---|---|---|
| #1 | Context Manager — resolução transitiva de dependências | ✅ | `cli/src/lib/context.ts` |
| #2 | Intent Verifier — análise estática + semântica (`--semantic`) | 🧪 | Regras `FORBIDDEN`/`CONSTRAINT_CHECKS` por regex sem acurácia medida; `--semantic` faz 1 chamada ao LLM (limite na Issue #30). Cerca AST de mutação para TS foi adicionada depois em `mutationFence.ts` (`✅` TS-only) |
| #3 | Intent Graph — painel VS Code com Cytoscape.js | 🧪 | Extensão não publicada; carrega Cytoscape via CDN |
| #4 | GitHub Actions CI/CD automático | ✅ | `.github/workflows/idd-verify.yml` |
| #5 | Testes de pipeline/integração no CLI | 🧪 | Testes unitários e de pipeline com SQLite simulado; sem E2E real com banco, LLM ou protocolo LSP |
| #6 | Multi-linguagem: TypeScript, Python, Go, JavaScript, Rust, Java | 🧪 | `cli/src/lib/lang.ts` fornece templates, *prompt hints* e regex estáticas; **AST, LSP e `--project` funcionam apenas em TS/JS** |
| #7 | `idd diff` com algoritmo LCS real | ✅ | `cli/src/commands/diff.ts` |
| #8 | Segurança: schema validation, dry-run, rate limit, .env | ✅ | `cli/src/lib/security.ts` |

**Release:** v0.1.0 · 544 testes

---

## Histórico — Fase 3: Produto (entregue como protótipo)

| Issue | Feature | Status real | Observação verificável |
|---|---|---|---|
| #9  | Intent Templates — marketplace local (crud, auth-jwt, webhook...) | ✅ | `cli/src/lib/templates/` |
| #10 | `idd blame` — histórico de autoria git integrado | ✅ | `cli/src/commands/blame.ts` |
| #11 | Branding: `product.json`, tema IDD Dark, scripts de build | ✅ / 🔭 | Apenas artefatos de marca; a IDE dedicada (fork do Code-OSS) é proposta futura (`🔭`) |
| #12 | `idd export` — md / json / mermaid / dot | ✅ | `cli/src/commands/export.ts` |

**Release:** v0.1.0 → v0.2.0 · 669 testes

---

## Histórico — Fase 4: Ecossistema (entregue como protótipo)

| Issue | Feature | Status real | Observação verificável |
|---|---|---|---|
| #13 | IDD Server HTTP — sincronização de Intent Store entre equipes | 🧪 | Padrão restrito a `127.0.0.1`; outro host exige `IDD_SERVER_TOKEN` |
| #14 | IDD Review — análise de PR via GitHub Actions | 🧪 | Fluxo com LLM sem saída estruturada garantida |
| #15 | LSP para `.intent.yaml` — diagnostics, hover, go-to-def, rename | 🧪 | Experimental (`extensions/idd-core/src/lsp/server.ts`); `state_mutation` só em TypeScript com `@Intent`, sem testes E2E do protocolo LSP |
| #16 | `idd capture` — expansão de intenção via LLM em uma linha | 🧪 | Chamada ao LLM sem retry nem saída estruturada garantida |

**Release:** v0.2.0 · 669 testes

---

## Histórico — Fase 5: Business Model Intent Layer (entregue; normalização formal até BCNF)

A camada de intenções do **modelo de negócio**: o domínio é modelado em UML,
compilado em artefatos verificáveis e o schema de banco é validado automaticamente.

| Issue | Feature | Status real | Observação verificável |
|---|---|---|---|
| #17 | Domain UML Parser — Mermaid/PlantUML/YAML → Domain AST | ✅ | `cli/src/lib/domain/parser.ts` |
| #18 | Domain Compiler — AST → YAML intent + JSONB Schema + SQL + erDiagram | ✅ | `cli/src/lib/domain/compiler.ts` |
| #19 | Normalization Engine — verificação 1NF → DKNF | ✅ / 🧪 | **2NF, 3NF e BCNF formais** via fecho de Armstrong, chaves candidatas e decomposição sem perda (`fds.ts`); **1NF, 4NF, 5NF e DKNF heurísticas** (`normalizer.ts`) |
| #20 | Schema Verifier — CI/CD de conformidade migrations vs domain model | ✅ | `cli/src/lib/domain/verifier.ts` |

**Release:** v0.3.0 · 730 testes

### Fluxo da Fase 5

```
classDiagram UML          domain.mmd / .puml / .yaml
      │
      │ idd domain parse
      ▼
Domain Model AST           Entidades · Atributos · FDs · Cardinalidades
      │
      │ idd domain normalize
      ▼
Normalização               2NF–BCNF formais (Armstrong/chase) · 1NF, 4NF–DKNF heurísticas
      │
      │ idd domain compile
      ▼
Artefatos verificáveis     domain.intent.yaml · schema.jsonb.json · schema.sql · er-diagram.md
      │
      │ idd domain verify
      ▼
CI/CD no PR                Score 0-100% por entidade · Comentário automático
```

---

## Histórico — Fase 6: Inteligência e Observabilidade (entregue como protótipo)

O projeto passa a se auto-monitorar e se auto-analisar continuamente.

| Issue | Feature | Status real | Observação verificável |
|---|---|---|---|
| #21 | `idd drift watch` — daemon de monitoramento contínuo (`fs.watch`, debounce) | ✅ | `cli/src/commands/watch.ts` |
| #22 | `idd analytics` — sparklines de alignment score, módulos instáveis, velocity | ✅ | `cli/src/commands/analytics.ts` |
| #23 | `idd domain evolve` — diff entre domain models, SQL de migração safe/warn/breaking | ✅ | `cli/src/lib/domain/evolver.ts` (ver Issue #30 sobre limite semântico ao auditar este arquivo) |
| #24 | `idd suggest` — análise estática do grafo (circular, ghost, orphan, overspecified) + LLM opcional | ✅ / 🧪 | Análise estática determinística (`✅`); sugestões `--semantic` via LLM sem saída estruturada garantida (`🧪`) |

**Release:** v0.4.0 · 766 testes

---

## Histórico — Fase 7: Multi-repo e Federação (entregue como protótipo)

| Issue | Feature | Status real | Observação verificável |
|---|---|---|---|
| #25 | `idd api` — geração de OpenAPI 3.1 a partir de `.intent.yaml`, com verificação de drift | ✅ | `cli/src/commands/api.ts` |
| #26 | Team Playbooks — constraints obrigatórias e lint rules por organização | ✅ | `cli/src/commands/playbook.ts` |
| #27 | IDD Registry — push/pull/search de templates, domain models e playbooks | ✅ | `cli/src/commands/registry.ts` |
| #28 | `idd migrate` — inferência de intenções a partir de codebase existente via LLM | 🧪 | Chamadas ao LLM sem saída estruturada garantida; assume único `src/` na raiz (Issue #29) |

**Release:** v0.5.0 · 830 testes

---

## 🔄 Fase 8 — Dogfooding e Maturidade (em andamento)

Uma sessão real de dogfooding — rodando o binário compilado com uma chave de
API real contra o próprio código do IDD IDE — já aconteceu e encontrou (e
corrigiu) 4 bugs reais de infraestrutura, além de gerar 5 `.intent.yaml`
retroativos para módulos centrais do CLI.

### Concluído via dogfooding real

| Item | Resultado |
|---|---|
| Testes de integração com binário real (não só lógica mockada) | ✅ Feito — expôs bugs que 834 testes mockados nunca pegariam |
| Corrigir `require('better-sqlite3')` incompatível com builds ESM | ✅ Corrigido (`createRequire`) — Store nunca funcionava em nenhum build documentado até este fix |
| Atualizar `better-sqlite3` para versão com prebuild em Node 22 | ✅ Corrigido — 9.6.0 → 13.0.3 |
| Corrigir modelo default inexistente (`claude-sonnet-4-20250514`) | ✅ Corrigido em 11 arquivos → `claude-sonnet-5` |
| Dogfooding do CLI — `.intent.yaml` para módulos reais | 🔶 Parcial — 5 módulos centrais feitos (`review`, `evolver`, `generate`, `suggest`, `normalizer`), faltam ~25 |

### Aberto

| Issue | Descrição |
|---|---|
| [#29](https://github.com/EliezerRosa/idd-ide/issues/29) | `idd migrate scan/report` e 2 manifestações adicionais (module derivation em `infer`, targeting em `verify --semantic`) não suportam monorepos |
| [#30](https://github.com/EliezerRosa/idd-ide/issues/30) | `idd verify --semantic` tem limite de profundidade de raciocínio, não só de contexto — confirmado com caso real (`evolver.ts`) que não foi pego mesmo com arquivo inteiro visível |
| — | Publicação real no Open VSX — `vsce package && npx ovsx publish`, hoje documentado mas nunca executado |
| — | Prebuilds de `better-sqlite3` empacotados no release, evitando depender de build-from-source ou de rede externa na instalação |
| — | Auditoria de segurança — `npm audit fix` nas 8 vulnerabilidades conhecidas (análise já feita em `docs/CI.md`: nenhuma explorável no código atual) |
| — | Completar dogfooding — `.intent.yaml` para os ~25 módulos restantes do CLI |

---

## 🧭 Direção a partir de 2026-10-27 — Fase 0 primeiro

Decisão do comando epistêmico ([PARECER-IDD-IDE-2026-10-27](PARECER-IDD-IDE-2026-10-27.md) §1):
o IDD é uma **tese de paradigma**, e o repositório é um protótipo de pesquisa. A prioridade passou
a ser a **Fase 0 investigativa**: um compilador de linguagem ubíqua no estudo de requisitos, em
dois loops (intenção e invariantes → MER, UML, casos de uso até a transação, atividades,
estados e métodos circunscritos).

- **Status em 2026-11-25:** MVP da Fase 0 **implementado (`✅`)** em `cli/src/lib/fase0/` (`idd fase0`, `idd lint-ln`, Loop 1, Loop 2, Gate 1, Gate 2 e geração de TSDoc; ver especificação em [PROPOSTA-FASE0-COMPILADOR-LU](PROPOSTA-FASE0-COMPILADOR-LU.md) e evidências em [docs/fable/00-evidencias.md](fable/00-evidencias.md)).
- **Evolução ativa no branch `feat/fusao-v2-e-honestidade`:** Entregas E01 (carimbo SHA-256 e procedência obrigatória nas decisões humanas em `decisoes.md` + Gate 1c) e E02 (`astGraph.ts` com nós/arestas tipados, suporte a acessores `get`/`set`, raio de impacto e extração de subgrafo k-hop integrados a `mutationFence.ts` e `idd verify`).
- **Auditoria conceitual e de código:** [PARECER-GENEALOGIA-E-CONVERGENCIAS-2026-11-25.md](PARECER-GENEALOGIA-E-CONVERGENCIAS-2026-11-25.md).

Os itens 3 a 9 da Fase 9 abaixo permanecem em espera até consolidação da Fase 0. A IDE dedicada (item 8) é
longo prazo, condicionada à validação empírica da proposta.

---

## ⏸ Fase 9 — Paradigma IDD-IDE: núcleo único e governança (itens 1–2 concluídos; demais em espera)

Sequência ratificada em [`VEREDITO-CONTRAPROPOSTAS-2026-09-04.md`](VEREDITO-CONTRAPROPOSTAS-2026-09-04.md) §2,
derivada do [`PARECER-E-PROPOSTA-2026-09-04.md`](PARECER-E-PROPOSTA-2026-09-04.md). Cada item tem
**gate de saída** determinístico; o agente executa sob *confirm-once*, o comando epistêmico
permanece com o arquiteto.

| # | Entrega | Gate de saída | Status | Commit |
|---|---|---|---|---|
| 1 | **Fase 0** — Contrato v2 em `@idd/core` (`target_class/method`, `behavioral_contract`, constraints/acceptance estruturados, `ethics`) + `project.intent.yaml` completo + `idd verify --project` | 1 parser consumido por CLI e LSP; v1 válido; importação ilegal entre contextos bloqueada (exit 1) | ✅ | `d923f51` |
| 2 | **Dicionário Ubíquo manual** (DAV Layer 0) — `.intent/ubiquitous-dictionary.json`, `idd dictionary`, aviso em `capture`/`verify`/LSP | Termo fora do dicionário gera warning offline, sem LLM | ✅ | `0611645` |
| 3 | **Fase 1** — Track Cognitivo `.intent.md` (`<ctx>/<Classe>.<metodo>.intent.md`; frontmatter só `authorization` + `lifecycle_min_phase`; corpo LN + gherkin) + `idd compile` + branch `shadow/main` protegida + `pre-push` + `idd rollback/refine/recompile` | Push humano em `shadow/*` rejeitado pelo remoto; compilador falha se frontmatter duplicar chave do YAML | ⏳ próximo | — |
| 4 | **Fase 3** — AST verifier (visibilidade, LCOM4, CBO/Demeter, Liskov, string mágica, anemic model) | Hard gate < 100 ms | ⬜ | — |
| 5 | **Fase 4** — waivers por fase (30/14/7 d), `idd waiver audit`, Risk Dials evidence-gated, Intent Fidelity | Dial só relaxa com ≥ 95 % em 50 verificações | ⬜ | — |
| 6 | **Fase 6** — HUD 4 regiões + sparkline de fidelity + elegibilidade de dial | Ciclo completo na UI | ⬜ | — |
| 7 | **Fase 2** — SHALA para termos ausentes do dicionário (LLM propõe, humano decide) | Ep. "Compilar LN sem ambiguidade" gravável | ⬜ | — |
| 8 | **Alvo B** — submodule Code-OSS + 6 patches com README | Instalador 3 plataformas | ⬜ | — |
| 9 | **Fase 5** — Armstrong closure, Excalidraw + VLM, Traceback Visual | Soft gate | ⬜ | — |

### Estado em 2026-09-06

- `packages/core` (`@idd/core`) é a única fonte de parsing: `contract.ts`, `project.ts`, `dictionary.ts`. CLI e extensão consomem via dependência `file:`.
- O repositório governa a si mesmo: [`project.intent.yaml`](../project.intent.yaml) declara 5 bounded contexts (`core`, `cli→core`, `extension→core`, `ui-extension`, `pwa`) — 88 arquivos, 0 importações ilegais; [`.intent/ubiquitous-dictionary.json`](../.intent/ubiquitous-dictionary.json) fixa 18 termos da linguagem do IDD — 0 termos fora do dicionário.
- CI ([`idd-verify.yml`](../.github/workflows/idd-verify.yml)) executa `verify --project` e `dictionary check --strict` como hard gates.
- Testes: **26 suítes / 901** (CLI). Build da extensão (`tsc` + esbuild) verde.
- Decisão pendente para o item 3: branch protection remota de `shadow/main` (via `gh api` ou manual pelo owner).

---

## Números cumulativos

| Métrica | v0.1.0 | v0.2.0 | v0.3.0 | v0.4.0 | v0.5.0 | main (2026-09-06) | 2026-11-25 (branch atual) |
|---|---|---|---|---|---|---|---|
| Fases / frentes | 2, 3 | 4 | 5 | 6 | 7 | 7 + Fase 9 itens 1–2 | + Fase 0 ✅, `@idd/eslint-plugin` ✅, Fable E01/E02 ✅ |
| Issues fechadas | 12 | 16 | 20 | 24 | **28** | 28 | 28 (+ #29, #30 abertas) |
| Testes passando (CLI) | 544 | 669 | 730 | 766 | **830** | **901** | **1.103** (40 suítes; + 45 testes em 4 suítes no `@idd/eslint-plugin`) |
| Suítes de teste (CLI) | 17 | 21 | 22 | 23 | **24** | **26** | **40** (+ 4 no `@idd/eslint-plugin`) |
| Comandos CLI | 11 | 15 | 16 | 20 | **24** | **25** (`dictionary`) | **28** (`+ fase0`, `inspect`, `lint-ln`, fora `help`/`version`) |

---

## Princípios de design

1. **Intenção antes do código** — declare o quê, deixe o agente decidir o como sob contrato verificável
2. **Drift detection é cidadão de primeira classe** — feedback rápido local e barreira real no servidor (CI)
3. **Zero lock-in** — tudo é texto/YAML/SQL, sem banco proprietário ou serviço obrigatório
4. **Offline-first** — os verificadores determinísticos do CLI rodam 100% sem API key
5. **Composable** — cada componente é independente e testável isoladamente

## Limitações conhecidas

- **Limites da análise AST local (`mutationFence.ts` e `@idd/eslint-plugin`):** a cerca de mutação opera em análise intraprocedural/arquivo único sobre a TypeScript Compiler API e ESLint. Embora bloqueie mutações diretas em `this`, acessores `get`/`set`, aliases locais conhecidos e mutações dinâmicas em `this[expr]` (`INV-UI-05`), continua vulnerável a aliasing passado a funções auxiliares externas, reflexão/mutação indireta (`Object.assign`, `Reflect.set`) e supressões via `any`.
- **Enforcement local vs. servidor (modelo de ameaça agêntico):** hooks locais (`.git/hooks/pre-commit`) servem apenas como feedback rápido; um agente com acesso ao shell pode ignorá-los (`--no-verify`) ou editar `.intent.yaml` junto com o código. Garantia efetiva requer CI obrigatório, *branch protection* e `CODEOWNERS` protegendo contratos, dicionário e `decisoes.md` no servidor.
- **Normalização 4NF/5NF/DKNF heurística:** apenas 2NF, 3NF e BCNF usam algoritmos formais (fecho de Armstrong e decomposição sem perda em `fds.ts`); 1NF, 4NF, 5NF e DKNF em `normalizer.ts` são verificações heurísticas.
- `better-sqlite3` requer compilação nativa (node-gyp) em versões antigas;
  a partir da v13.0.3 (usada desde a correção de dogfooding) há prebuilds
  para Node 18-22, reduzindo bastante o problema. Ambientes sem rede
  externa na instalação ainda dependem de build-from-source. Empacotar
  prebuilds no próprio release do IDD IDE está listado na Fase 8.
- O IDD IDE começou a praticar seu próprio paradigma: 5 módulos centrais
  do CLI têm `.intent.yaml` retroativo (`review`, `evolver`, `generate`,
  `suggest`, `normalizer`), gerados via `idd migrate infer` e verificados
  com `idd verify --semantic` contra código real. Faltam ~25 módulos —
  ver Fase 8.
- A extensão VS Code nunca foi publicada no Open VSX Registry — apenas
  documentada e testada localmente via `tsc -p ./`.
- `idd verify --semantic` tem limite de profundidade de raciocínio real,
  confirmado empiricamente: não detectou uma divergência lógica genuína
  em `evolver.ts` mesmo com o arquivo inteiro visível ao LLM. Ver issue
  [#30](https://github.com/EliezerRosa/idd-ide/issues/30).
- Comandos que resolvem caminhos relativos à raiz do projeto
  (`migrate scan/report/infer`, `verify --semantic <módulo>`) assumem
  um único `src/` na raiz do git — quebram em monorepos como o próprio
  idd-ide. Ver issue [#29](https://github.com/EliezerRosa/idd-ide/issues/29).
