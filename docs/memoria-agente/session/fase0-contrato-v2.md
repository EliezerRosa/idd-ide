# Sessão 2026-09-05 — Fase 0 (Contrato v2 / @idd/core)

## Objetivo
Fechar Fase 0 do veredito §2 #1: parser único em `@idd/core`, v1 válido, importação ilegal bloqueada, `project.intent.yaml` completo + `idd verify --project`.

## Estado encontrado (uncommitted)
- `packages/core/src/contract.ts` — parser canônico v1+v2 já escrito (target_class/method, behavioral_contract, constraints/acceptance estruturados, ethics).
- `cli/src/lib/security.ts` e `extensions/idd-core/src/lsp/server.ts` já delegam ao `parseContract`.
- Wiring quebrado: `paths` + alias vitest com `new URL().pathname` (espaço URL-encoded no Windows) → `Cannot find module '@idd/core'`; tsc TS6059 rootDir.

## Decisão / fix aplicado
- `@idd/core` virou dependência `file:` (cli: `dependencies`; extensão: `devDependencies`, pois esbuild bundla). `npm install --ignore-scripts` cria junction em node_modules.
- Removidos `rootDir`/`baseUrl`/`paths` do cli tsconfig; alias removido do vitest.config.
- Extensão tsconfig: `noEmit: true` (compile = só typecheck; runtime é `dist/` do esbuild), removidos outDir/rootDir/paths/include extra.
- `packages/core/src/index.ts` usa `./contract.js` (idioma NodeNext; vite/esbuild/tsc resolvem .js→.ts).

## Validação
- CLI: `npx tsc --noEmit` limpo; vitest 25 suítes / 877 testes OK (project.test.ts: 27 novos).
- Extensão: `npm run build` OK (tsc + esbuild).
- `node dist/index.js verify --project` no repo: 88 arquivos, 0 importações ilegais.

## Entregas adicionais neste bloco
- `packages/core/src/project.ts` (parseProject + import governance), `parseContractConstraintList` exportado de contract.ts.
- `cli/src/commands/verify.ts`: `cmdVerifyProject`, `verifyProjectImports`, `findProjectFile` (exportados p/ teste).
- `project.intent.yaml` raiz, `schemas/project.intent.schema.json`, `docs/CLI.md` (--project), CI hard gate.
- Commits locais: `811c9f9` (perf caching), `d923f51` (Fase 0).

## Próximos passos
- ~~Push~~ feito (`d923f51`, `0611645` em origin/main).
- ~~#2 Dicionário Ubíquo~~ feito (ver _ESTADO-ATUAL).
- #3 Fase 1: `.intent.md` + `idd compile` + `shadow/main` + hooks + rollback/refine/recompile. Pontos de atenção: `gitHooks.ts` já existe? (grep antes); branch protection remota exige API GitHub (owner faz ou via gh CLI).

## Encerramento 2026-09-06
- Eliezer pediu "salve o estado atual" — feito: `_ESTADO-ATUAL.md` (seção ONDE ESTAMOS) + `/memories/repo/fase0-e-dicionario-ubiquo-2026-09-05.md` (snapshot técnico) + `/memories/ts-monorepo-file-deps.md` (lição transversal).
- Fase 1 não iniciada; aguarda "prossiga" e decisão sobre branch protection de `shadow/main` (gh api vs manual).
