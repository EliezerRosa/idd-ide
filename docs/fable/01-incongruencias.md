# Relatório de Incongruências Técnicas — Fase 1 (Protocolo Fable / IDD)

**Data de auditoria:** 2026-10-31  
**Auditor técnico:** Engenheiro Sênior e Revisor Técnico Independente (Fable)  
**Escopo auditado:** Repositório `idd-ide`, branch `feat/fusao-v2-e-honestidade`  
**Base de evidências prévias:** `docs/fable/00-evidencias.md`

---

## 1. Sumário Executivo

A auditoria confrontou cada uma das 11 alegações da Seção 4 de `docs/PROMPT-FABLE5-VIABILIZACAO-IDD.md` diretamente contra o código-fonte, os arquivos de configuração, os contratos e os artefatos de testes.

**Resultado consolidado:**
- **Incongruências confirmadas:** 11 de 11 (100% de confirmação das alegações I1 a I11).
- **Incongruências adicionais identificadas:** 2 (I12 e I13).
- **Incongruências refutadas:** 0.

---

## 2. Avaliação Pormenorizada das Incongruências (I1 a I11)

### I1: A cadeia termina no contrato — Ausência de implementação do Racha de Conta conforme especificação decidida
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração / 🔭 proposta, não implementada
- **Evidências no código duro:**
  - `fase0/racha-conta/contratos/`: Contém 8 contratos v2 (`Mesa.calcularCotas`, `Mesa.criar`, `Mesa.fechar`, `Mesa.gerarCobrancaPix`, `Mesa.incluirParticipante`, `Mesa.registrarItemConsumido`, `Pagamento.confirmar`, `Pagamento.enviarComprovante`).
  - `fase0/racha-conta/`: Não contém diretório `src/`, nem implementação de domínio da especificação.
  - `packages/eslint-plugin-idd/example/Mesa.ts:11-72`: Único arquivo no repositório com `class Mesa`. Contém apenas 3 métodos (`adicionarItem`, `fechar`, `calcularCotas`).
- **Análise técnica:** O método `adicionarItem` (`Mesa.ts:27`) sequer existe nos 8 contratos (onde foi especificado como `Mesa.registrarItemConsumido`). O método `calcularCotas` (`Mesa.ts:57-71`) faz divisão ingênua igualitária de um total bruto com distribuição de resto nos primeiros índices, ignorando completamente o rateio proporcional de `taxa_servico_percentual`, o consumo individual de cada item (INV-002) e o rodízio alfabético contínuo dos centavos indivisíveis (D-022, D-032, D-036). A cadeia intenção → contrato → código está interrompida no contrato.

---

### I2: O único teste de execução do Racha ("Soma Zero" do Livro de Recusas) valida o código legado cuja regra de centavo foi rejeitada
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração
- **Evidências no código duro:**
  - `cli/src/__tests__/livro-de-recusas.test.ts:7`:
    ```ts
    import { MesaRachaDominio } from '../../../paradigma/40-evidencias/apps-exemplos/racha_conta_pix/domain_rules.ts';
    ```
  - `cli/src/__tests__/livro-de-recusas.test.ts:290-325`: Executa 50 iterações de `mesa.calcularRateioJusto()` sobre `MesaRachaDominio`.
  - `paradigma/40-evidencias/apps-exemplos/racha_conta_pix/domain_rules.ts:95-100`:
    ```ts
    cotas.sort((a, b) => b.resto - a.resto || a.p.id.localeCompare(b.p.id));
    for (const c of cotas) {
      c.p.valorAPagarCentavos = c.base + (sobra > 0 ? 1 : 0);
      if (sobra > 0) sobra--;
    }
    ```
  - `fase0/racha-conta/decisoes.md:9, 29, 39, 43`:
    - D-002: Centavo extra em rodízio ao longo de toda a mesa para o próximo participante que ainda não recebeu centavo extra.
    - D-022: Rodízio alfabético dos nomes e ordem de registro dos itens.
    - D-032 e D-036: Centavo da taxa segue o mesmo rodízio e continua de onde parou o rodízio dos itens.
- **Análise técnica:** O teste unitário no CLI importa o arquivo legado de `40-evidencias` que implementa o algoritmo de "maior resto" (desempate por ID lexicográfico). O autor rejeitou expressamente esse algoritmo nas decisões D-002 e D-022 em favor do rodízio alfabético contínuo. Portanto, a suíte de testes ativa valida uma regra expressamente repudiada pela especificação da Fase 0.

---

### I3: `idd verify` procura código em `<pasta>/<submódulo>.ts`, inviabilizando agregação em classe única
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração
- **Evidências no código duro:**
  - `cli/src/commands/verify.ts:268-275`:
    ```ts
    const [mod, sub] = intent.module.split('/');
    const ext        = intent.language === 'python' ? 'py' : 'ts';
    const testSfx    = intent.language === 'python' ? '_test.py' : '.test.ts';
    const dir        = path.dirname(yamlPath);
    const codeFile   = path.join(dir, `${sub}.${ext}`);
    const testFiles  = resolveTestFiles(yamlPath, sub, testSfx, root);

    if (!fs.existsSync(codeFile)) {
      warn(`${intent.module} — código não gerado ainda (execute "idd generate ${intent.module}")`);
    ...
    ```
- **Análise técnica:** O módulo do contrato `Mesa.calcularCotas.intent.yaml` é declarado como `racha-conta/mesa-calcular-cotas`. O comando `idd verify` decompõe `sub = mesa-calcular-cotas` e busca o arquivo `fase0/racha-conta/contratos/mesa-calcular-cotas.ts`. Como a Fase 0 gera um contrato por método circunscrito (6 contratos para `Mesa` e 2 para `Pagamento`), o verificador exige 8 arquivos separados na mesma pasta dos contratos. Uma classe coesa `Mesa.ts` reunindo os métodos do agregado não é localizada nem resolvida pelo comando.

---

### I4: `idd generate` lê `constraints` e `acceptance` como texto plano, gerando `[object Object]` e ignorando metadados de mutação
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração
- **Evidências no código duro:**
  - `cli/src/commands/generate.ts:13-17`:
    ```ts
    interface IntentYaml {
      intent:      string;
      module:      string;
      constraints: string[];
      acceptance:  string[];
      ...
    }
    ```
  - `cli/src/commands/generate.ts:61-65`:
    ```ts
    `CONSTRAINTS (todas obrigatórias):`,
    ...intent.constraints.map((c, i) => `  ${i + 1}. ${c}`),
    ``,
    `CRITÉRIOS DE ACEITE (cada um exige um teste):`,
    ...intent.acceptance.map((a, i) => `  ${i + 1}. ${a}`),
    ```
  - `cli/src/commands/generate.ts:158-168`:
    `yaml.load(intentRaw) as IntentYaml` lê os objetos estruturados v2. Embora valide via `validateIntent(intent)` (que invoca `@idd/core`), o objeto `intent` não estruturado é repassado ao `buildPrompt`.
- **Análise técnica:** Nos contratos v2 (`@idd/core`), `constraints` é uma lista de objetos `{ id, type, severity, description }` e `acceptance` é uma lista de objetos `{ id, given, when, then }`. Ao interpolar `${c}` e `${a}`, a string formatada enviada ao modelo LLM contém `[object Object]`. Adicionalmente, os campos `target_class`, `target_method`, `behavioral_contract.state_mutation.allowed_fields` e `read_only_fields` são omitidos na construção do prompt.

---

### I5: Invariantes não são executadas contra o código (verificação restrita a marcadores lexicais)
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração / 🔭 proposta, não implementada
- **Evidências no código duro:**
  - `cli/src/lib/fase0/gate1.ts:51-61`: Critério (b) confere apenas se a linha possui ID `INV-xxx`, tipo válido e marcadores de texto (`LN011` e `LN012` via lint).
  - `cli/src/lib/fase0/gate2.ts`: Critérios (h), (s), (t) e (u) conferem apenas integridade referencial cruzada (se as invariantes citadas existem e se foram associadas a transações e contratos).
  - `packages/eslint-plugin-idd/src/utils/tsdoc-parser.ts:68-73`: Faz o parse de `@invariant <descrição>` para o array `invariants: string[]`.
  - `packages/eslint-plugin-idd/src/rules/state-mutation.ts`: O campo `currentContract.invariants` **nunca é referenciado nem verificado** dentro da regra de ESLint.
  - `packages/eslint-plugin-idd/src/rules/no-exposed-mutable-state.ts`: Não faz referência a invariantes de negócio.
- **Análise técnica:** Não há execução de solucionador SMT (Z3), nem geração de testes de propriedade (fast-check), nem asserções em tempo de execução derivadas das invariantes. O sistema apenas afere conformidade sintática e rastreabilidade documental.

---

### I6: Comandos LLM legados realizam `fetch` desprotegido fora de `lib/llm` com modelo inexistente `claude-sonnet-5`
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração
- **Evidências no código duro:**
  - `cli/src/commands/generate.ts:74-97`:
    ```ts
    async function callClaude(system: string, user: string, apiKey: string, model: string): Promise<string> {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
        ...
    ```
  - `cli/src/commands/generate.ts:125`:
    ```ts
    const model = process.env.IDD_MODEL ?? 'claude-sonnet-5';
    ```
  - `cli/src/lib/llm/anthropic.ts:5`: O provedor oficial da Fase 0 utiliza `export const MODELO_PADRAO = 'claude-opus-5-5'`.
  - `fase0/racha-conta/rodadas/rodada-01.pedido.md:1-7`:
    Arquivo gerado pelo `ManualProvider` (`cli/src/lib/llm/manual.ts:31`), instruindo o operador a colar o pedido manualmente em um assistente web.
- **Análise técnica:** `generate.ts` ignora a arquitetura unificada de provedores LLM (`cli/src/lib/llm/`), usa uma chamada direta de `fetch` sem suporte a fallbacks e define como padrão o identificador `claude-sonnet-5`, inexistente na API da Anthropic. No caso real da Fase 0 (`racha-conta`), nenhuma chamada direta via API foi executada por esse comando; todas as rodadas foram geradas via `ManualProvider` mediadas por assistente na sessão interativa.

---

### I7: SHALA estima interpretações concorrentes via multiplicadores heurísticos em vez de entropia semântica empírica
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração
- **Evidências no código duro:**
  - `cli/src/lib/fase0/shala.ts:680`: `numModelos *= 4;`
  - `cli/src/lib/fase0/shala.ts:681-724`: Adiciona contraexemplo com tabela estática pré-programada:
    `casoDeTeste: 'Mesa com 3 participantes (Ana, Bruno, Carla) dividindo R$ 100,00'`
  - `cli/src/lib/fase0/shala.ts:727`: `numModelos *= 2;` com tabela estática:
    `casoDeTeste: 'Mesa de R$ 100,00 entre Ana e Bruno'`
  - `cli/src/lib/fase0/shala.ts:756`: `numModelos *= 2;`
  - `cli/src/lib/fase0/shala.ts:803`: `const entropiaBits = Math.round(Math.log2(numModelos));`
- **Análise técnica:** O cálculo de "entropia semântica" não realiza amostragem estocástica de N leituras independentes agrupadas por implicação bidirecional (conforme Farquhar et al., *Nature*, 2024). Trata-se de uma árvore de decisão determinística baseada em expressões regulares que multiplica números inteiros fixos (2 ou 4) e injeta cenários predefinidos no código.

---

### I8: DAV e Fé Bayesiana ausentes na Fase 0 e no código executável
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🔭 proposta, não implementada (Fé Bayesiana) / 🧪 demonstração (DAV fora do acervo)
- **Evidências no código duro:**
  - `paradigma/00-canone/IDD-CANONE.md:13-14, 54-59`: Define o Princípio 4 (DAV) e o Princípio 5 (Confirm-Once com Fé Bayesiana).
  - `paradigma/00-canone/AFIRMACOES.md:10`: Admite que o código de DAV está no repositório do RVM, não no acervo do IDD.
  - `cli/src/lib/fase0/casos.ts:6-31`: Os artefatos do ciclo da Fase 0 limitam-se a MER, casos de uso, atividades, estados, métodos, contratos, TSDoc e exportações (SQL/DBML/PlantUML). Nenhum catálogo ou schema DAV de `{ação, parâmetros}` é compilado.
  - Repositório completo (`cli/`, `packages/`): Zero ocorrências de atualização Beta-Binomial, cálculo de credibilidade bayesiana ou ajuste dinâmico de limiar de autonomia.
- **Análise técnica:** Embora o conceito exista na camada filosófica e conceitual do Cânone, não há suporte executável no ferramental IDD nem geração de artefatos DAV pelo compilador de Fase 0.

---

### I9: Ausência de automação de CI para gates da Fase 0 e regras de lint sobre código de produto
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração
- **Evidências no código duro:**
  - Diretório `.github/workflows/`: Não existe no repositório `idd-ide` nem na raiz do workspace.
  - `cli/package.json:9-15`:
    ```json
    "scripts": {
      "build": "esbuild src/index.ts ...",
      "watch": "tsc -w -p tsconfig.json",
      "start": "node dist/index.js",
      "test": "vitest run",
      "typecheck": "tsc -p tsconfig.json"
    }
    ```
  - `packages/eslint-plugin-idd/package.json:11-15`:
    ```json
    "scripts": {
      "build": "tsc",
      "test": "vitest run"
    }
    ```
- **Análise técnica:** Não há esteira de integração contínua (CI) configurada para executar `idd fase0 gate1`, `idd fase0 gate2` ou o linter `@idd/eslint-plugin` sobre bases de código geradas ou de exemplo. Os testes automatizados limitam-se a testes unitários isolados dos componentes do compilador e do plugin.

---

### I10: Procedência fraca de decisões humanas em `decisoes.md`
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração
- **Evidências no código duro:**
  - `cli/src/lib/fase0/casos.ts:126-137`:
    ```ts
    const m = raw.match(/^\s*[-*]\s+\[( |x|X)\]\s+(D-\d+)\s*(?:·\s*(.*))?$/);
    if (!m) return;
    const campos = (m[3] ?? '').split('·').map(s => s.trim());
    out.push({ id: m[2], marcada: m[1] !== ' ', bloqueante: campos.some(c => c.toLowerCase() === 'bloqueante'), campos, linha: i + 1 });
    ```
  - `cli/src/lib/fase0/gate1.ts:63-69`:
    O Gate 1 considera uma decisão aprovada simplesmente se o caractere dentro dos colchetes for diferente de espaço (`m[1] !== ' '`).
  - `fase0/racha-conta/decisoes.md:36, 41, 45`: Decisões D-029, D-034 e D-038 contêm anotações como "modelo aprovado (editado pelo autor)", aplicadas via assistente no arquivo de texto a partir de transcrições de chat.
- **Análise técnica:** Não existe cadeia criptográfica, conferência de assinatura de commit (GPG/SSH) ou verificação de autoria no Git para as decisões. Qualquer agente ou script com acesso de escrita ao arquivo pode marcar `- [x]` e desbloquear o gate determinístico.

---

### I11: Conflito de nomenclatura no módulo `graphify` (extrator TS AST interno vs. open source)
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração (módulo próprio) / 🔭 proposta, não implementada (uso integrado do open source)
- **Evidências no código duro:**
  - `cli/src/lib/fase0/graphify.ts:1-3`:
    ```ts
    // src/lib/fase0/graphify.ts — grafo de classes, métodos e mutações de estado a partir de código TypeScript.
    // Implementação própria do IDD sobre a TypeScript Compiler API (ts.createSourceFile). Apesar do nome, NÃO é o
    // projeto open source "graphify" do GitHub nem usa Tree-sitter. Tabelas SQL ainda são extraídas por regex.
    ```
  - `cli/package.json:16-35`: Não possui dependência para `tree-sitter` nem integração com o pacote PyPI `graphifyy`.
- **Análise técnica:** O módulo interno `graphify.ts` é um analisador baseado exclusivamente na TypeScript Compiler API voltado a mapear mutações de `this`. O projeto open source `graphify` (`github.com/Graphify-Labs/graphify`, v0.9.99), embora instalado no ambiente local (`%TEMP%\gfy-venv`), não está integrado a nenhuma rotina, script ou comando do repositório.

---

## 3. Incongruências Técnicas Adicionais Detectadas

### I12: Extrator AST de mutações ignora assessores `get` (getters de classe)
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração
- **Evidências no código duro:**
  - `cli/src/lib/fase0/graphify.ts:366-369`:
    ```ts
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
        const methodName = ts.isConstructorDeclaration(member) ? 'constructor' : member.name.getText(sourceFile);
    ```
- **Análise técnica:** O extrator AST interno filtra estritamente `isMethodDeclaration` e `isConstructorDeclaration`. Métodos acessores declarados como `get prop()` ou `set prop()` são completamente ignorados durante a montagem dos nós de métodos e verificação de cercas de mutação, criando pontos cegos na análise estática.

---

### I13: Análise estática de conformidade e segurança em `verify.ts` baseada em expressões regulares frágeis
- **Veredito:** **CONFIRMADA**
- **Selo canônico:** 🧪 demonstração
- **Evidências no código duro:**
  - `cli/src/commands/verify.ts:36-64`:
    ```ts
    const FORBIDDEN = [
      { re: /console\.log\s*\(.*(?:password|senha|secret|passwd)/i, msg: 'Credencial exposta em log', sev: 'critical' as const },
      { re: /SELECT\s+\*/i, msg: 'SELECT * pode expor dados desnecessários', sev: 'warn' as const },
      ...
    ];
    const CONSTRAINT_CHECKS = [
      { keywords: /validar|validação/i, codePattern: /validate|isValid|throw|Error/i, label: 'validação de entrada' },
      ...
    ];
    ```
- **Análise técnica:** Em vez de inspecionar a AST do código gerado, `analyzeStatic` executa casamento de padrões textuais por regex. Um simples comentário contendo `// TODO` ou `// SELECT *` dispara violações, enquanto uma instrução `throw new Error()` em qualquer contexto é considerada prova de atendimento de constraint de validação.

---

## 4. Tabela Consolidada de Incongruências

| ID | Descrição Sucinta | Veredito | Selo Canônico | Referência Primária |
| :--- | :--- | :---: | :---: | :--- |
| **I1** | Racha sem implementação conforme especificação decidida | **CONFIRMADA** | 🧪 / 🔭 | `packages/eslint-plugin-idd/example/Mesa.ts:11` |
| **I2** | Teste de Soma Zero valida algoritmo legado com regra rejeitada | **CONFIRMADA** | 🧪 | `cli/src/__tests__/livro-de-recusas.test.ts:7` |
| **I3** | `idd verify` busca um arquivo por contrato, quebrando classes | **CONFIRMADA** | 🧪 | `cli/src/commands/verify.ts:272` |
| **I4** | `idd generate` interpola objetos v2 como `[object Object]` | **CONFIRMADA** | 🧪 | `cli/src/commands/generate.ts:62, 65` |
| **I5** | Invariantes não executam contra código (apenas checagem léxica) | **CONFIRMADA** | 🧪 / 🔭 | `cli/src/lib/fase0/gate1.ts:51`, plugin ESLint |
| **I6** | LLM legado com `fetch` cru e modelo inexistente `claude-sonnet-5` | **CONFIRMADA** | 🧪 | `cli/src/commands/generate.ts:75, 125` |
| **I7** | SHALA usa multiplicadores heurísticos em vez de entropia real | **CONFIRMADA** | 🧪 | `cli/src/lib/fase0/shala.ts:680, 727, 756` |
| **I8** | Ausência de geração de DAV e código de Fé Bayesiana | **CONFIRMADA** | 🔭 | `IDD-CANONE.md:13, 57` |
| **I9** | Inexistência de pipeline de CI para gates da Fase 0 e lint | **CONFIRMADA** | 🧪 | Ausência de `.github/workflows/` |
| **I10** | Procedência de decisões em `decisoes.md` vulnerável a edições | **CONFIRMADA** | 🧪 | `cli/src/lib/fase0/casos.ts:132` |
| **I11** | Homonímia entre módulo AST interno e graphify open source | **CONFIRMADA** | 🧪 | `cli/src/lib/fase0/graphify.ts:1-3` |
| **I12** | Extrator AST próprio ignora assessores `get` / `set` | **CONFIRMADA** | 🧪 | `cli/src/lib/fase0/graphify.ts:367` |
| **I13** | `analyzeStatic` valida segurança/constraints por regex | **CONFIRMADA** | 🧪 | `cli/src/commands/verify.ts:37-85` |

---

## 5. Parada Formal — Pergunta de Confirmação ao Autor

Em estrita obediência ao **Princípio do Comando Epistêmico** do IDD (o humano decide o quê; o agente executa o como) e às regras da Seção 4 do protocolo:

> **Prezado Eliézer Rosa,**
> 
> As 11 incongruências alegadas (I1 a I11), além das duas lacunas adicionais identificadas na análise estática (I12 e I13), foram rigorosamente confirmadas no código duro.
> 
> Antes de prosseguirmos para o planejamento detalhado e estruturação das entregas atômicas da **Fase 2a**:
> 
> **Quais dessas incongruências você autoriza e prioriza para atacarmos na Fase 2a?**
> 
> 1. Deseja atacar o pacote completo para fechar a cadeia de ponta a ponta (I1 a I7, I9, I11, I12)?
> 2. Como deseja posicionar os itens de pesquisa/método de longo prazo (I8 - DAV/Fé Bayesiana e I10 - procedência criptográfica de decisões)?
> 
> Aguardo sua determinação para gerar o plano técnico formal em `docs/fable/02-plano.md`.
