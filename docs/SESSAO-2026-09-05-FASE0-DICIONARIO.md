# Registro de Sessão — Fase 0 e Dicionário Ubíquo (2026-09-05 → 06)

Execução dos itens **1** e **2** da sequência do [Veredito §2](VEREDITO-CONTRAPROPOSTAS-2026-09-04.md#2-sequência-de-implementação-revisada), sob *confirm-once* concedido em 2026-09-04. Este documento fixa o que foi decidido, o que foi entregue, o que o próprio gate revelou e onde a conversa parou — para que a retomada não dependa de memória volátil.

---

## 1. Decisões operacionais tomadas na sessão

| Decisão | Alternativa rejeitada | Motivo |
|---|---|---|
| `@idd/core` consumido como dependência `file:` (`cli` em `dependencies`, extensão em `devDependencies`) | `tsconfig.paths` + alias no `vitest.config` | O alias via `new URL().pathname` fica URL-encoded no Windows (`%20`) e `tsc` emite `TS6059` por `rootDir`; `file:` resolve em tsc, vitest, tsx e esbuild sem configuração especial |
| Extensão: `tsc` passa a `noEmit` (só typecheck); esbuild é o único dono de `dist/` | Manter `outDir: out` + `rootDir: src` | `rootDir` impede importar código fora de `src`; `out/` não é consumido em runtime |
| `packages/core/src/index.ts` importa `./x.js` | `./x.ts` | Idioma NodeNext; a extensão compila com `allowImportingTsExtensions: false` |
| `project.intent.yaml`: tetos de fase **não relaxáveis** (waiver 30/14/7 d; anemic model warn/critical/critical) | Valores livres por projeto | Ratificado em §5 do Veredito; um projeto pode ser mais restritivo, nunca menos |
| Dicionário: `definition` obrigatória (≥ 10 chars) | Termo só com nome | "Termo sem definição é string mágica" — Ep06 |
| Dicionário: `forbidden` de um termo não pode ser `term`/`alias` de outro | Permitir e resolver em runtime | Ambiguidade estrutural deve falhar no parse, não no uso |
| `verify` trata termo fora do dicionário como **warn**, nunca **drift** | Bloquear | Linguagem é soft gate até SHALA (item 7); `dictionary check --strict` é o hard gate explícito em CI |
| Push direto em `main` | PR + aprovação | Convenção já em vigor nas sessões anteriores; owner tem bypass |

## 2. Entregas

### Item 1 — Fase 0 (`811c9f9`, `d923f51`)

- **`packages/core/src/contract.ts`** — `parseContract` único para v1 (module-scoped) e v2 (`target_class.target_method`, `behavioral_contract`, constraints/acceptance estruturados, `ethics`); `circumscriptionId`, `matchesIntentId`.
- **`packages/core/src/project.ts`** — `parseProject` (lifecycle/phase_policies, governance roles/waiver_policy, `global_constraints`, `bounded_contexts[].path|package|allowed_dependencies`); `extractImports`, `contextForPath` (longest-prefix), `checkFileImports`.
- **`idd verify --project`** — varre os `path` de cada contexto; qualquer `import`/`require` que cruze para contexto não listado em `allowed_dependencies` é violação critical → exit 1.
- **`project.intent.yaml`** na raiz: o repo governa a si mesmo (`core`; `cli→core`; `extension→core`; `ui-extension`; `pwa`). Resultado: 88 arquivos, 0 violações.
- **`schemas/intent.schema.json`** v2 e **`schemas/project.intent.schema.json`** novo.
- **CI**: `verify --project` como hard gate.
- Prompt caching (`cache_control: ephemeral`) em todos os system prompts da CLI e da extensão.

### Item 2 — Dicionário Ubíquo, DAV Layer 0 (`0611645`)

- **`packages/core/src/dictionary.ts`** — `parseDictionary`, `findTerm`, `checkContractTerms`: tokens PascalCase ausentes → `unknown`; sinônimos proibidos → `forbidden` com sugestão do canônico. Sem LLM.
- **`idd dictionary init|list|show|add|remove|check [--strict]`**.
- `capture` avisa antes de gravar; `verify` acrescenta como warn; LSP publica `idd.dictionary.unknown|forbidden` (Warning, posicionado no termo; busca ascendente por `.intent/ubiquitous-dictionary.json`; cache por mtime).
- **`.intent/ubiquitous-dictionary.json`** — 18 termos da linguagem do IDD (BoundedContext, Circumscription, CognitiveTrack, Shadow, Waiver, EpistemicCommand, OperationalCommand, HardGate, SoftGate, IntentContract, IntentStore, LifecyclePhase, Drift, Constraint, AcceptanceCriterion, UbiquitousDictionary, FileChange, GraphIssue).
- **CI**: `dictionary check --strict` como hard gate.

## 3. O que os gates revelaram no próprio repositório

- `verify --project` **não** encontrou acoplamento ilegal — a separação `cli`/`extension`/`core` já era real.
- `dictionary check` encontrou **2 conceitos sem definição** nas intenções existentes: `FileChange` (em `review.intent.yaml`) e `GraphIssue` (em `suggest.intent.yaml`). Ambos foram definidos via `idd dictionary add`. É a primeira ocorrência do paradigma corrigindo a própria linguagem do projeto.

## 4. Validação final

| Verificação | Resultado |
|---|---|
| `cli`: `tsc --noEmit` | limpo |
| `cli`: `vitest run` | 26 suítes / 901 testes |
| `cli`: bundle esbuild (idêntico ao CI) | 456 KB, OK |
| `idd verify --project` | 88 arquivos, 0 violações |
| `idd dictionary check --strict` | 0 avisos |
| `extensions/idd-core`: `npm run build` | OK |
| `main` × `origin/main` | sincronizados em `0611645` |

## 5. Onde a conversa parou

Proposta de iniciar o **item 3 (Fase 1)** com uma decisão devolvida ao comando epistêmico: a *branch protection* remota de `shadow/main` (só CI/bot faz push) exige a API do GitHub — aplicar via `gh api` se houver `gh` autenticado, ou entregar o comando pronto para o owner executar. Eliezer pediu para salvar o estado; Fase 1 **não foi iniciada**.

Plano do item 3 (inalterado em relação ao Veredito):
1. `.intent.md` em `<ctx>/<Classe>.<metodo>.intent.md`; frontmatter só `authorization` + `lifecycle_min_phase`; corpo em LN + blocos ```gherkin.
2. `idd compile` → `.intent.yaml`; falha se o frontmatter duplicar chave do YAML.
3. Branch `shadow/main` (+ tags `shadow/v*`) protegida no remoto; `pre-push` em `gitHooks.ts`.
4. `idd rollback` → `idd refine <módulo>` → `idd recompile`.
5. Intent Store grava `intent_md_hash`, `intent_yaml_hash`, `shadow_commit`.

## 6. Lições registradas

- Monorepo TS sem workspaces: preferir `file:` a `paths`; ver nota transversal do agente.
- `npx vitest` na raiz do repo (sem config) trava — sempre executar dentro de `cli/`.
- Arquivos marcados `M` com `git diff --ignore-all-space` vazio são só normalização CRLF/LF do editor; não há conteúdo pendente.
