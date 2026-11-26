# Log de Execução — IDD Fase 2b (Protocolo Fable)

Este documento registra faticamente cada comando executado, alteração de arquivo e validação durante a implementação das entregas da Fase 2b.

---

## Entrega E01: Integridade Criptográfica e Procedência de Decisões Humanas (I10)

- **Início:** 2026-11-01T16:35:00Z
- **Conclusão:** 2026-11-01T16:58:00Z
- **Status:** Concluído com sucesso (Aprovado no Gate E01)

### 1. Arquivos Modificados e Criados:
- `cli/src/lib/fase0/casos.ts`:
  - Implementada função de hash canônico `calcularHashDecisao({ id, texto, escolha, autor, data })` com SHA-256 (`node:crypto`).
  - Implementada extração canônica de componentes semânticos e criptográficos `extrairComponentesDecisao`.
  - Atualizada interface `Decisao` com campos canônicos (`autor`, `data`, `hash`, `hashCalculado`, `hashValido`).
  - Implementadas funções de carimbo idempotente `carimbarDecisaoLinha` e `carimbarDecisoesTexto`.
  - Atualizado template `CAB_DECISOES` para exigir procedência e SHA-256 canônico.
- `cli/src/lib/fase0/gate1.ts`:
  - Critério `(c)` atualizado para exigir determinismo criptográfico: reprova com exit code != 0 e indicação exata de linha e ID caso qualquer decisão `[x]` não possua hash, não declare autoria ou apresente divergência de hash (adulteração).
- `cli/src/commands/fase0.ts`:
  - Adicionado subcomando `idd fase0 carimbar <caso> [--autor=...]` para carimbar decisões em lote.
  - Integrado status de integridade das decisões em `idd fase0 status`.
- `cli/src/lib/fase0/aplicar.ts` e `cli/src/lib/fase0/loop2.ts`:
  - Registro automático de decisões respondidas/aprovadas com carimbo SHA-256 e autor ("Eliézer Rosa").
- `fase0/racha-conta/decisoes.md`:
  - Carimbadas todas as 53 decisões aprovadas com autor `Eliézer Rosa` e respectivos hashes SHA-256 canônicos.
- `cli/src/__tests__/decisoes-crypto.test.ts`:
  - Criada suíte de testes com 16 asserções cobrindo cálculo determinístico, efeito avalanche de 1 bit em todos os campos, validação das 53 decisões reais, prova de reprovação do Gate 1 por mutação de 1 bit em D-001 e D-022, e rejeição de hashes forjados ou decisões sem hash.
- `cli/src/__tests__/fase0-gate.test.ts`:
  - Atualizada asserção pontual de decisão marcada para incluir autor e hash canônico correspondente.
- `cli/package.json`:
  - Configurado `--testTimeout=15000` no script de teste para estabilidade sob concorrência de 38 workers no Windows.

### 2. Comandos Executados e Resultados:
1. **Build do CLI:**
   - Comando: `npm run build` em `cli/`
   - Saída: `dist/index.js 1.8mb` (concluído em ~200ms, exit code 0).
2. **Carimbo em Lote das Decisões:**
   - Comando: `node cli/dist/index.js fase0 carimbar racha-conta`
   - Saída: `✓ 53 decisão(ões) carimbada(s) com SHA-256 canônico e autor "Eliézer Rosa" em fase0\racha-conta\decisoes.md` (exit code 0).
3. **Teste Criptográfico Dedicado:**
   - Comando: `npx vitest run src/__tests__/decisoes-crypto.test.ts`
   - Saída: 1 test file passed, 16 passed de 16 testes (exit code 0).
4. **Comando de Gate E01 Canônico (`02-plano.md`):**
   - Comando: `cd "c:\IDE IDD Claude-VS Code\idd-ide\cli"; npm run build; npx vitest run src/__tests__/decisoes-crypto.test.ts; node dist/index.js fase0 gate1 racha-conta`
   - Saída:
     - Build: 0 erros
     - Vitest: 16 passed de 16
     - Gate 1:
       ```
       Gate 1
       ✓ (a) intencoes.md e invariantes.md sem erros do lint — nenhum erro
       ✓ (b) toda invariante tem id, tipo válido e enunciado testável — 5 invariante(s) válida(s)
       ✓ (c) decisões íntegras (SHA-256), com autoria declarada e nenhuma bloqueante em aberto — 53 decisão(ões) com SHA-256 íntegro; nenhuma bloqueante em aberto
       ✓ (d) pelo menos 1 intenção e 1 invariante — 7 intenção(ões), 5 invariante(s)
       ⚠ (e) (consultivo) SHALA não detecta interpretações concorrentes — 8 interpretações estimadas (3 bits)
       Gate 1 verde
       ```
     - Exit code: 0.
5. **Suíte Completa de Regressão do CLI:**
   - Comando: `npm --prefix cli test`
   - Saída: `Test Files 38 passed (38), Tests 1075 passed (1075)` (exit code 0). Zero regressões.

---

## Entrega E02: Desambiguação do Extrator AST e Suporte a Getters/Setters (I11, I12)

- **Execução:** 2026-11-01T20:16:00Z até 2026-11-01T20:26:00Z (auditoria Fase 2c aprovada em 2026-11-01T20:30:00Z; consolidado em `idd-ide/docs/fable/` em 2026-11-25)
- **Status:** Concluído e Aprovado (`[x] APROVADA`)

### 1. Arquivos Modificados e Criados:
- `cli/src/lib/fase0/astGraph.ts`: Módulo canônico via TypeScript Compiler API com `GraphNode` (`Class | Method | Accessor | Property`), `GraphEdge` (`CALLS | READS | WRITES | EXTENDS`), captura de `ts.isGetAccessorDeclaration` (`READS`, zero mutações) e `ts.isSetAccessorDeclaration` (`WRITES`), travessia pura de raio de impacto `computeBlastRadius(nodeId, graph)` e extração de subgrafo podado `extractSubGraph(targetId, graph, k = 1)`.
- `cli/src/lib/fase0/graphify.ts` e `cli/src/lib/fase0/astMutationExtractor.ts`: Shims de retrocompatibilidade com `@deprecated` reexportando `astGraph.ts`.
- `cli/src/lib/mutationFence.ts`: Conexão direta das arestas `'WRITES'` do `astGraph` à contenção por `allowed_fields` (`INV-UI-04`), `read_only_fields` (`INV-ENCAP-01`) e mutação dinâmica (`INV-UI-05`).
- `cli/src/commands/fase0.ts` e `cli/src/lib/inspect.ts`: Atualização das importações e subcomando `ast-graph` (mantendo alias depreciado `graphify`).
- `cli/src/__tests__/ast-graph.test.ts`, `cli/src/__tests__/ast-graph-accessors.test.ts` e `cli/src/__tests__/graphify.test.ts`: 28 novos testes E02 cobrindo os 3 getters reais (`pedidoPath`, `respostaPath`, `port`), `READS` vs `WRITES`, contenção na cerca, `computeBlastRadius`, `extractSubGraph` e benchmark síncrono `< 50ms`.

### 2. Resultados Validados:
- `npx tsc --noEmit` (em `cli/`): exit 0, 0 erros.
- `npm run build` (em `cli/`): exit 0, `dist/index.js` gerado.
- `npx vitest run src/__tests__/ast-graph.test.ts src/__tests__/ast-graph-accessors.test.ts`: 28/28 testes passando.
- Suíte completa do CLI: **40 arquivos / 1.103 testes passando**, 0 falhas.

---

## Reconciliação Documental e Parecer v2 (2026-11-25)

- **Parecer reescrito:** criado `docs/PARECER-GENEALOGIA-E-CONVERGENCIAS-2026-11-25.md` com correções bibliográficas (EARS atribuído a Mavin et al., 2009; Volere a S. & J. Robertson; referências formais), enxugamento genealógico, análise de *spec rot*/MDA, limites da tese de código regenerável, modelo de ameaça agêntico local vs. servidor, limites de AST em TypeScript, matriz comparativa calibrada por maturidade e agenda experimental falsificável.
- **Reconciliação contra o código duro:** atualizados `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DOMAIN.md`, `docs/CLI.md` e `paradigma/00-canone/AFIRMACOES.md` (`A5`).
- **Gates de autogovernança:** `dictionary check --strict` (0 avisos, exit 0) e `verify --project` (137 arquivos, 0 importações ilegais, exit 0).
