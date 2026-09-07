# idd-ide — Snapshot Fase 0 + Item #2 (sessão 2026-09-05/06)

Registro do bloco executado sob confirm-once (§2 do veredito). Fonte de verdade
viva continua sendo `_ESTADO-ATUAL.md`; este arquivo é o detalhe técnico.

## Commits publicados em origin/main
| SHA | Conteúdo |
|---|---|
| `811c9f9` | perf(llm): `system: [{type:'text', text, cache_control:{type:'ephemeral'}}]` em capture/generate/migrate/review/suggest/diff e `IntentEngine.ts` |
| `d923f51` | feat(core): Fase 0 — `@idd/core` (contract v1+v2, project governance), `idd verify --project`, `project.intent.yaml` raiz, schema, CI hard gate |
| `0611645` | feat(dictionary): Dicionário Ubíquo (DAV Layer 0) — core + CLI + capture/verify + LSP + `.intent/ubiquitous-dictionary.json` + CI hard gate |

## Arquitetura entregue
- `packages/core` (`@idd/core`, fonte-only, `type: module`, `exports → ./src/index.ts`):
  - `contract.ts` — `parseContract` (v1 module-scoped / v2 target_class.target_method, behavioral_contract, constraints/acceptance estruturados, ethics), `circumscriptionId`, `matchesIntentId`, `parseContractConstraintList`.
  - `project.ts` — `parseProject` (lifecycle phase policies com tetos 30/14/7d e anemic warn/critical/critical NÃO relaxáveis; governance roles/waiver_policy; global_constraints; bounded_contexts path/package/allowed_dependencies), `extractImports`, `contextForPath` (longest-prefix), `contextForPackage`, `checkFileImports`.
  - `dictionary.ts` — `parseDictionary` (term PascalCase único, definition ≥10, kind, aliases, forbidden; rejeita ambiguidade cruzada), `findTerm`, `checkContractTerms` (unknown = PascalCase fora do dicionário; forbidden = sinônimo proibido → sugere canônico).
- Consumo: `cli` e `extensions/idd-core` declaram `"@idd/core": "file:..."` (cli em dependencies, extensão em devDependencies — esbuild bundla).
- CLI novo: `idd verify --project` (exit 1 em importação ilegal), `idd dictionary init|list|show|add|remove|check [--strict]`.
- LSP: diagnostics `idd.dictionary.unknown|forbidden` (Warning), dicionário localizado por busca ascendente a partir do documento, cache por mtime.
- Governança do próprio repo: `project.intent.yaml` (core; cli→core; extension→core; ui-extension; pwa) e `.intent/ubiquitous-dictionary.json` (18 termos: BoundedContext, Circumscription, CognitiveTrack, Shadow, Waiver, EpistemicCommand, OperationalCommand, HardGate, SoftGate, IntentContract, IntentStore, LifecyclePhase, Drift, Constraint, AcceptanceCriterion, UbiquitousDictionary, FileChange, GraphIssue).
- CI `idd-verify.yml`: após `npm test` → `verify --project` → `dictionary check --strict` (ambos hard gate, cwd=cli).

## Validação final
- `cli`: tsc limpo; vitest **26 suítes / 901 testes**; bundle esbuild OK; `verify --project` = 88 arquivos / 0 violações; `dictionary check --strict` = 0 avisos.
- `extensions/idd-core`: `npm run build` OK (tsc noEmit + esbuild).

## Erros encontrados + solução
- `Cannot find module '@idd/core'` (vitest) + `TS6059 rootDir` (tsc): causa = alias `paths` + `new URL().pathname` (URL-encoded no Windows). Solução = dependência `file:` + remover `rootDir`/`paths`; extensão passa a `noEmit`.
- `npx vitest` rodado na raiz do repo (sem config) trava — sempre `cd cli` antes.
- `npx tsx` pediu confirmação de instalação na 1ª vez (respondido `y`); agora está em cache.

## Estado do working tree ao salvar (2026-09-06)
- 5 arquivos aparecem `M` (capture.ts, index.ts, dictionary.ts ×2, dictionary.test.ts) mas `git diff --ignore-all-space` é vazio → apenas normalização CRLF/LF pelo editor. Sem conteúdo pendente. Pode `git checkout -- .` ou commitar como chore.

## Próximo bloco (veredito §2 #3 — Fase 1)
- Track Cognitivo `.intent.md`: caminho `<ctx>/<Classe>.<metodo>.intent.md` = circunscrição; frontmatter SÓ `authorization` + `lifecycle_min_phase`; corpo LN + blocos ```gherkin.
- `idd compile` → `.intent.yaml`; falha se frontmatter duplicar chave do YAML.
- Branch `shadow/main` (+ tags `shadow/v*`) com branch protection remota (só CI/bot push) — exige API GitHub (`gh api` se disponível, senão comando pronto p/ Eliezer).
- `pre-push` em `gitHooks.ts` (verificar se já existe antes), `idd rollback / refine / recompile`.
- Intent Store grava `intent_md_hash`, `intent_yaml_hash`, `shadow_commit`.
- Gate de saída: push humano em `shadow/*` rejeitado pelo remoto; compilador falha em chave duplicada.
