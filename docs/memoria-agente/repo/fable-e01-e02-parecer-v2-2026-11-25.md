# Snapshot Técnico — Fable E01/E02, Parecer v2 e Reconciliação Documental (2026-11-25)

**Branch:** `feat/fusao-v2-e-honestidade` (PR #75)  
**Data:** 2026-11-25  
**Base de validação:** `cli` (`40 suítes / 1.103 testes`), `packages/eslint-plugin-idd` (`4 suítes / 45 testes`), `dictionary check --strict` (0 avisos), `verify --project` (137 arquivos, 0 violações), `fase0 gate1/gate2 racha-conta` (verdes).

## 1. Entregas Fable concluídas e aprovadas
- **E01 (I10 — SHA-256 em decisões humanas):**
  - `cli/src/lib/fase0/casos.ts`: `calcularHashDecisao`, `extrairComponentesDecisao`, `carimbarDecisaoLinha`, `carimbarDecisoesTexto`.
  - `cli/src/lib/fase0/gate1.ts`: critério `(c)` falha com exit code 1 se faltar autoria, faltar hash ou houver adulteração de 1 bit.
  - `cli/src/commands/fase0.ts`: `idd fase0 carimbar <caso> [--autor=...]`.
  - `fase0/racha-conta/decisoes.md`: 53 decisões carimbadas com SHA-256 e autor `Eliézer Rosa`.
  - `cli/src/__tests__/decisoes-crypto.test.ts`: 16 asserções criptográficas.
- **E02 (I11/I12 — `astGraph.ts`, `get`/`set`, Blast Radius, Ego Graph):**
  - `cli/src/lib/fase0/astGraph.ts`: esquema formal `GraphNode` (`Class | Method | Accessor | Property`) e `GraphEdge` (`CALLS | READS | WRITES | EXTENDS`) via TypeScript Compiler API; suporte a `ts.isGetAccessorDeclaration` (`READS`) e `ts.isSetAccessorDeclaration` (`WRITES`); `computeBlastRadius(nodeId, graph)` (BFS determinística) e `extractSubGraph(targetId, graph, k = 1)` (Ego Graph k-hop) em `< 50ms` síncrono sem IA.
  - `cli/src/lib/fase0/graphify.ts` e `astMutationExtractor.ts`: shims `@deprecated` de retrocompatibilidade.
  - `cli/src/lib/mutationFence.ts`: audita arestas `WRITES` contra `allowed_fields` (`INV-UI-04`), `read_only_fields` (`INV-ENCAP-01`) e mutação dinâmica (`INV-UI-05`).
  - `cli/src/__tests__/ast-graph.test.ts` + `ast-graph-accessors.test.ts`: 28 testes dedicados.
- **Consolidação:** veredito formal de E02 e log de execução consolidados em `docs/fable/02-plano.md` e `docs/fable/log-execucao.md`.

## 2. Parecer v2 e reconciliação contra o código duro
- **Criado:** `docs/PARECER-GENEALOGIA-E-CONVERGENCIAS-2026-11-25.md` (v2 completa com autoria correta de EARS = Mavin et al., 2009; Volere = S. & J. Robertson; inclusão de AWS TLA+/Cedar e *Property-Based Testing*; análises de *spec rot*/MDA, limites de regenerabilidade, bypass agêntico local vs. servidor, incompletude de AST local em TypeScript; matriz comparativa calibrada por escala/maturidade; auditoria em código duro; agenda experimental falsificável; Seção 11 de referências).
- **Reconciliados:** `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DOMAIN.md`, `docs/CLI.md`, `paradigma/00-canone/AFIRMACOES.md` (`A5`).
- **Regra respeitada:** `paradigma/00-canone/IDD-CANONE.md` (ratificado em 2026-10-26) preservado intacto.

## 3. Próxima entrega pendente
- **E03 (`docs/fable/02-plano.md`):** Correção do gerador LLM (`cli/src/commands/generate.ts`) e resolução coesa + substituição de regex por AST em `cli/src/commands/verify.ts` (incongruências I3, I4, I6, I13). Aguardando autorização de Eliézer.
