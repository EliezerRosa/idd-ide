# Evidências de Execução — IDD Fase 0 (Protocolo Fable)

Data de execução: 2026-10-31
Ambiente: Windows 10/11 | Node.js v22.21.1 | Vitest v5.0.5 | Graphify v0.9.99

---

## 1. CLI: Build e Suíte de Testes (Vitest)

- **Comando:**
  ```powershell
  cd "c:\IDE IDD Claude-VS Code\idd-ide\cli"; npm run build; npx vitest run
  ```
- **Código de saída (exit code):** `0`
- **Saída registrada:**
  ```
  > idd-cli@0.1.0 build
  > esbuild src/index.ts --bundle --platform=node --target=node22 --format=esm --outfile=dist/index.js --external:better-sqlite3 --external:typescript

    dist\index.js  1.8mb

  Done in 138ms

   RUN  v5.0.5 C:/IDE IDD Claude-VS Code/idd-ide/cli

   Test Files  37 passed (37)
        Tests  1059 passed (1059)
     Start at  15:51:44
     Duration  45.60s (tests 39%, transform 34%, import 26%, worker 1%)
  ```

---

## 2. ESLint Plugin IDD: Suíte de Testes

- **Comando:**
  ```powershell
  cd "c:\IDE IDD Claude-VS Code\idd-ide\packages\eslint-plugin-idd"; npm test
  ```
- **Código de saída (exit code):** `0`
- **Saída registrada:**
  ```
  > @idd/eslint-plugin@0.1.0 test
  > vitest run

   RUN  v5.0.5 C:/IDE IDD Claude-VS Code/idd-ide/packages/eslint-plugin-idd

   ✓ __tests__/state-mutation.test.ts (3 tests) 7ms
   ✓ example/test/Mesa.property.test.ts (3 tests) 49ms
   ✓ __tests__/no-exposed-mutable-state.test.ts (11 tests) 140ms
   ✓ __tests__/state-mutation.rule.test.ts (28 tests) 349ms

   Test Files  4 passed (4)
        Tests  45 passed (45)
     Start at  15:52:40
     Duration  5.02s (import 75%, tests 15%, transform 8%, worker 1%)
  ```

---

## 3. Fase 0: Gate 1 (racha-conta)

- **Comando:**
  ```powershell
  cd "c:\IDE IDD Claude-VS Code\idd-ide"; node cli/dist/index.js fase0 gate1 racha-conta
  ```
- **Código de saída (exit code):** `0`
- **Saída registrada:**
  ```
  ⬡ IDD  fase0 gate1
  ────────────────────────────────────────────────────

    Gate 1
    ✓  (a) intencoes.md e invariantes.md sem erros do lint  — nenhum erro
    ✓  (b) toda invariante tem id, tipo válido e enunciado testável  — 5 invariante(s) válida(s)
    ✓  (c) nenhuma decisão bloqueante em aberto em decisoes.md  — nenhuma
    ✓  (d) pelo menos 1 intenção e 1 invariante  — 7 intenção(ões), 5 invariante(s)
    ⚠  (e) (consultivo) SHALA não detecta interpretações concorrentes  — 8 interpretações estimadas (3 bits); pergunta sugerida: Quando a divisão não for exata em centavos inteiros, qual critério determinístico define a alocação do resto?

    Gate 1 verde
  ```

---

## 4. Fase 0: Gate 2 (racha-conta)

- **Comando:**
  ```powershell
  cd "c:\IDE IDD Claude-VS Code\idd-ide"; node cli/dist/index.js fase0 gate2 racha-conta
  ```
- **Código de saída (exit code):** `0`
- **Saída registrada:**
  ```
  ⬡ IDD  fase0 gate2
  ────────────────────────────────────────────────────

    Gate 2
    ✓  (a) [MER] modelo/dominio.mmd aprovado e com ao menos 1 classe  — 5 classe(s)
    ✓  (b) [MER] todo termo entity/aggregate do dicionário tem classe homônima  — todos presentes
    ✓  (c) [MER] toda classe em BCNF (ou 3NF quando a BCNF perderia dependência)  — 5 classe(s) conforme(s)
    ✓  (e) [casos de uso] modelo/casos-de-uso.yaml aprovado, válido e com ids únicos  — 6 caso(s) de uso, 8 transação(ões)
    ✓  (f) [casos de uso] toda transação tem ao menos 1 pré-condição e 1 pós-condição  — 8 transação(ões) completas
    ✓  (g) [casos de uso] toda intenção é coberta por algum caso de uso  — 7 intenção(ões) cobertas
    ✓  (h) [casos de uso] nenhuma invariante órfã (toda INV é tocada por alguma transação)  — 5 invariante(s) tocadas
    ✓  (i) [casos de uso] atores, intenções, invariantes, classes e atributos citados existem  — todas existem
    ✓  (j) [atividades] modelo/atividades.yaml aprovado, válido e com um fluxo por caso de uso  — 6 fluxo(s), 16 passo(s)
    ✓  (k) [atividades] toda transação de negócio é executada pelo Sistema no fluxo do seu caso de uso  — 8 transação(ões) executada(s)
    ✓  (l) [atividades] toda transação com pré-condição tem guarda e recusa (senao) no passo que a executa  — 8 passo(s) com guarda/senao
    ✓  (m) [atividades] casos de uso, transações e raias citados existem em modelo/casos-de-uso.yaml  — todas existem
    ✓  (n) [estados] modelo/estados.yaml aprovado, válido e cobrindo toda classe com atributo alterado  — 2 máquina(s), 4 estado(s)
    ✓  (o) [estados] toda transição é disparada por transação que altera a classe, sem mutação sem transição  — 5 transição(ões) coerente(s)
    ✓  (p) [estados] toda máquina parte de [*] e todos os seus estados são alcançáveis  — todos os estados alcançáveis a partir de [*]
    ✓  (q) [estados] classes e transações citadas existem no MER e em modelo/casos-de-uso.yaml  — todas existem
    ✓  (r) [métodos] modelo/metodos.yaml aprovado, válido e com métodos circunscritos únicos (Classe.metodo)  — 8 método(s) circunscrito(s)
    ✓  (s) [métodos] toda transação de negócio mapeia para ao menos 1 método e toda invariante da transação está no método  — 8 transação(ões) coberta(s)
    ✓  (t) [métodos] coerência contrato × modelo: todo atributo alterado/lido pela transação está em allowed_fields/read_only_fields dos seus métodos (sem sobreposição)  — allowed_fields e read_only_fields coerentes com as transações
    ✓  (u) [métodos] classes, atributos, transações e invariantes citados existem e todo método gera um contrato .intent.yaml v2 válido em @idd/core  — 8 contrato(s) .intent.yaml v2 válido(s)
    ✓  (d) [geral] nenhuma decisão bloqueante em aberto em decisoes.md  — nenhuma
    ⚠  transações que não alteram nada (consulta?): TN-04, TN-06

    Gate 2 verde
  ```

---

## 5. Fase 0: TSDoc (racha-conta)

- **Comando:**
  ```powershell
  cd "c:\IDE IDD Claude-VS Code\idd-ide"; node cli/dist/index.js fase0 tsdoc racha-conta
  ```
- **Código de saída (exit code):** `0`
- **Saída registrada:**
  ```
  ⬡ IDD  fase0 tsdoc
  ────────────────────────────────────────────────────
    // Mesa.calcularCotas — contratos/Mesa.calcularCotas.intent.yaml
    /**
     * Calcular a Cota em centavos inteiros de cada Participante da Mesa com rateio proporcional da TaxaServico e rodízio alfabético contínuo dos centavos indivisíveis.
     *
     * @intent Mesa.calcularCotas
     * @mutates nenhum
     * @readonly taxa_servico_percentual
     * @invariant INV-001 [cálculo] A soma das cotas de todos os participantes de uma Mesa deve ser exatamente igual à soma dos preços dos ItemConsumido mais a TaxaServico, com diferença de zero centavos.
     * @invariant INV-002 [integridade] A Cota de um Participante nunca inclui valor de um ItemConsumido que esse Participante não consumiu.
     * @invariant INV-005 [cálculo] Toda Cota deve ser um número inteiro de centavos, com valor ≥ 0.
     */

    // Mesa.criar — contratos/Mesa.criar.intent.yaml
    /**
     * Criar uma Mesa aberta com a ChavePix e a TaxaServico do ResponsavelMesa, registrando-o como Participante.
     *
     * @intent Mesa.criar
     * @mutates nenhum
     * Cria uma instância de Mesa (construtor ou fábrica).
     * TODO(IDD): o contrato também altera Participante. Liste em @mutates os campos de Mesa
     *   que guardam essas entidades (ex.: uma coleção do agregado); sem isso a regra acusará as mutações.
     */

    // Mesa.fechar — contratos/Mesa.fechar.intent.yaml
    /**
     * Encerrar definitivamente os lançamentos da Mesa, registrando a data de fechamento e habilitando o pagamento das Cotas.
     *
     * @intent Mesa.fechar
     * @mutates fechada_em
     */

    // Mesa.gerarCobrancaPix — contratos/Mesa.gerarCobrancaPix.intent.yaml
    /**
     * Gerar o código Pix Copia e Cola e o QR Code da Cota de um Participante para a ChavePix da Mesa fechada.
     *
     * @intent Mesa.gerarCobrancaPix
     * @mutates nenhum
     * @readonly fechada_em, chave_pix
     * @invariant INV-005 [cálculo] Toda Cota deve ser um número inteiro de centavos, com valor ≥ 0.
     */

    // Mesa.incluirParticipante — contratos/Mesa.incluirParticipante.intent.yaml
    /**
     * Incluir um novo Participante com nome único em uma Mesa aberta.
     *
     * @intent Mesa.incluirParticipante
     * @mutates nenhum
     * @readonly fechada_em
     * TODO(IDD): o contrato também altera Participante. Liste em @mutates os campos de Mesa
     *   que guardam essas entidades (ex.: uma coleção do agregado); sem isso a regra acusará as mutações.
     */

    // Mesa.registrarItemConsumido — contratos/Mesa.registrarItemConsumido.intent.yaml
    /**
     * Registrar um ItemConsumido na próxima ordem da Mesa aberta e associar os Participantes que o consumiram.
     *
     * @intent Mesa.registrarItemConsumido
     * @mutates nenhum
     * @readonly fechada_em
     * @invariant INV-003 [integridade] Todo ItemConsumido deve ter no mínimo um Participante entre os consumidores.
     * @invariant INV-004 [integridade] Todo Participante associado a um ItemConsumido deve pertencer à mesma Mesa do ItemConsumido.
     * TODO(IDD): o contrato também altera ItemConsumido, Consumo. Liste em @mutates os campos de Mesa
     *   que guardam essas entidades (ex.: uma coleção do agregado); sem isso a regra acusará as mutações.
     */

    // Pagamento.confirmar — contratos/Pagamento.confirmar.intent.yaml
    /**
     * Confirmar definitivamente o recebimento do pagamento da Cota de um Participante a partir do comprovante enviado.
     *
     * @intent Pagamento.confirmar
     * @mutates confirmado_em
     * @readonly comprovante_url
     */

    // Pagamento.enviarComprovante — contratos/Pagamento.enviarComprovante.intent.yaml
    /**
     * Registrar ou substituir o comprovante de pagamento da Cota de um Participante antes da confirmação pelo ResponsavelMesa.
     *
     * @intent Pagamento.enviarComprovante
     * @mutates nenhum
     * Cria uma instância de Pagamento (construtor ou fábrica).
     */

    ⚠  3 método(s) alteram outras entidades (TODO acima): o autor decide quais campos do agregado as guardam.
    ℹ  Cole cada bloco acima do método correspondente e ative o @idd/eslint-plugin (packages/eslint-plugin-idd).
  ```

---

## 6. Graphify: Análise Estrutural de `cli/src/lib`

- **Cópia temporária isolada:** `%TEMP%\gfy-target\lib`
- **Binário executado:** `C:\Users\Eliez\AppData\Local\Temp\gfy-venv\Scripts\graphify.exe`
- **Comando:**
  ```powershell
  & "C:\Users\Eliez\AppData\Local\Temp\gfy-venv\Scripts\graphify.exe" update "$env:TEMP\gfy-target\lib"
  ```
- **Código de saída (exit code):** `0`
- **Saída registrada:**
  ```
  Re-extracting code files in C:\Users\Eliez\AppData\Local\Temp\gfy-target\lib (no LLM needed)...
    AST cache: 0/45 files served from cache (0%); 45 to extract
  [graphify watch] Rebuilt: 623 nodes, 1403 edges, 17 communities
  [graphify watch] graph.json, graph.html and GRAPH_REPORT.md updated in C:\Users\Eliez\AppData\Local\Temp\gfy-target\lib\graphify-out
  Code graph updated. For doc/paper/image changes run /graphify --update in your AI assistant.
  ```

### Métricas Extraídas (`graph.json` / `GRAPH_REPORT.md`)
- **Nós:** 623
- **Arestas / Links:** 1403
- **Comunidades detectadas:** 17
- **Distribuição de relações (`links.relation`):**
  - `contains`: 521
  - `calls`: 405
  - `imports`: 227
  - `imports_from`: 146
  - `method`: 41
  - `references`: 39
  - `indirect_call`: 15
  - `re_exports`: 6
  - `implements`: 3
- **Resumo de confiança e extração:**
  - 97% EXTRACTED
  - 3% INFERRED (36 arestas, confiança média: 0.85)
  - 0% AMBIGUOUS
