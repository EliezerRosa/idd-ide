# Prompt para a Fable 5 — viabilizar o Paradigma IDD de verdade

> Cole tudo abaixo da linha numa sessão da Fable 5 com acesso de leitura e execução ao repositório
> `EliezerRosa/idd-ide`. Preparado em 2026-10-31 a partir da branch `feat/fusao-v2-e-honestidade`
> (PR #75), que junta a v1 (`idd-ide`) e a v2 (`idd-v2`). Se o PR já tiver sido mergeado, use o `main`.

---

Você vai atuar como engenheiro sênior e revisor técnico independente do projeto **IDD — Intent-Driven Development, na formulação de Eliézer Rosa**. O autor quer quatro respostas, todas baseadas no código:

1. o que no código contradiz a proposta do paradigma;
2. o que precisa mudar para o paradigma funcionar de verdade;
3. como transformar isso num produto que alguém pague para usar;
4. se há mercado e se os profissionais aceitariam.

## 1. Axioma que vale acima de tudo

**Só afirme o que você verificou no código, nos testes, na documentação oficial ou numa execução feita por você.**
- Para cada afirmação, cite `arquivo:linha`, a URL consultada ou o comando que rodou e a saída.
- Quando não souber, escreva "não verificado".
- Não use nome de algoritmo, teorema ou métrica que o código não implementa.

O projeto já teve esse problema e o corrigiu no PR #75:
- a SHALA citava Earley, SAT/DPLL e FrameNet, mas era regex;
- o módulo `graphify` próprio exibia "96% de economia de tokens" com valor fixo no código e mapeava "repositórios Git" com nós inventados;
- a UI mostrava valores roteirizados como se fossem medições.

Uma ferramenta matemática só conta se **rodar e decidir alguma coisa** no fluxo, como um gate, um teste ou uma decisão de produto. Enfeite é proibido.

Rotule tudo com os selos do Cânone: ✅ implementado e verificado · 🧪 demonstração · 🔭 proposta, não implementada.

## 2. O que ler e rodar primeiro

1. `paradigma/00-canone/IDD-CANONE.md`: definição, seis princípios e selos. É a proposta a validar ou refutar.
2. `paradigma/00-canone/AFIRMACOES.md`: o que o próprio autor já admite como demonstração ou proposta.
3. `docs/PROPOSTA-FASE0-COMPILADOR-LU.md`: o método da Fase 0, os gates e as entregas 0 a 8.
4. O caso real `fase0/racha-conta/`:
   - `decisoes.md`, com 53 decisões do autor;
   - `intencoes.md` e `invariantes.md`;
   - `modelo/`: MER, casos de uso, atividades, estados e métodos;
   - `contratos/`, com 8 contratos v2;
   - `rastreabilidade.md`;
   - `exportacoes/`.
5. O código:

   | Caminho | O que é |
   | --- | --- |
   | `cli/src/lib/fase0/` | loops, gates, SHALA, extrator AST, `tsdoc.ts` |
   | `cli/src/lib/domain/fds.ts` | fecho de Armstrong |
   | `cli/src/commands/verify.ts` e `generate.ts` | verificação e geração de código |
   | `cli/src/lib/mutationFence.ts` | cerca de mutação |
   | `cli/src/lib/inspect.ts` | sugestão de contratos a partir do código |
   | `packages/eslint-plugin-idd/` | plugin ESLint |
   | `packages/core/src/contract.ts` | modelo de contrato |

Rode antes de concluir qualquer coisa:

```bash
cd cli && npm ci && npm run build && npx vitest run          # esperado: 1059 testes
cd ../packages/eslint-plugin-idd && npm ci && npm test        # esperado: 45 testes
cd ../.. && node cli/dist/index.js fase0 gate1 racha-conta
node cli/dist/index.js fase0 gate2 racha-conta
node cli/dist/index.js fase0 tsdoc racha-conta
```

## 3. Fatos já verificados sobre o graphify open source

Levantados em 2026-10-31 pela API do GitHub, pelo README, pelo `pyproject.toml` e por um `graph.json` de exemplo do próprio repositório. Confira antes de usar, porque o projeto muda rápido.

- **Repositório oficial:** `github.com/Graphify-Labs/graphify`. O endereço `safishamsi/graphify` redireciona para ele. Branch padrão `v8`. Existem cópias com o mesmo nome (por exemplo `Thizeidler/graphify` e `Sirhan1/graphify`): não use.
- **Licença:** Apache-2.0, segundo os metadados do GitHub e o `pyproject.toml`. O repositório também traz um `LICENSE-MIT`; confira o efeito disso.
- **Versão:** 0.9.99, publicada em 2026-10-30. Pacote PyPI `graphifyy` (com dois "y"); o comando é `graphify`. Exige Python 3.10 ou superior.
- **Suporte a TypeScript:** o `pyproject.toml` depende de `tree-sitter-typescript`.
- **Extração de código** com tree-sitter, local e sem LLM. O comando `graphify extract` roda offline num corpus só de código, e `--code-only` ignora documentos. Documentos, PDFs, imagens e vídeo passam por um passo semântico que usa LLM.
- **Saídas** em `graphify-out/`:
  - `graph.json`, no formato node-link do NetworkX, com as chaves `directed`, `multigraph`, `graph`, `nodes` e `links`;
  - `GRAPH_REPORT.md`;
  - `graph.html`.
- **Nós e arestas:**
  - nó: `id`, `label`, `file_type`, `source_file`, `source_location`, `community`;
  - aresta: `source`, `target`, `relation`, `confidence`, `source_file`, `source_location`, `weight`.
- **Relações vistas no exemplo `worked/httpx/graph.json`:** `contains`, `method`, `calls`, `uses`, `inherits`, `imports_from`.
  - `confidence` é `EXTRACTED` (explícito no código) ou `INFERRED` (resolvido pelo graphify).
  - No exemplo, 156 das 330 arestas (47%) são `INFERRED`.
  - **Não há relação de mutação de campo**: o graphify não diz qual atributo de `this` cada método altera.
- **Consultas:** `graphify query "<pergunta>"`, `graphify path A B` e `graphify explain X`. Há servidor MCP opcional (`graphifyy[mcp]`), hooks de git (`graphify hook install`) e `graphify watch`.
- **Benchmarks:** o README reporta recall@10 de 0,497 no LOCOMO e cobertura de fatos-chave de 82% contra 70,8% do grep, com juiz validado por kappa de Cohen 0,81. A reprodução está em `BENCHMARKS.md`. **São números do fornecedor**: só os use se você reproduzir.
- **Produto pago:** o README anuncia o "Graphify Cloud" com "80% menos gasto de tokens" e "verificação formal". **São alegações comerciais não verificadas.** O Graphify Cloud é concorrente ou parceiro potencial do IDD; trate como tal na Parte 6.

**Não foi possível rodar o graphify neste ambiente**, porque a política da sessão anterior bloqueou instalar pacotes externos. A primeira execução real fica com você.

## 4. Parte 1 — Confirme ou refute cada incongruência

Para cada item, responda **CONFIRMADA** ou **REFUTADA** com a evidência que você mesmo levantou. A lista foi feita por outro modelo e pode conter erros: não aceite por confiança.

| # | Incongruência alegada | Onde olhar |
| --- | --- | --- |
| I1 | A cadeia termina no contrato: **não existe implementação do Racha conforme a especificação decidida** | busque `class Mesa`; compare com `fase0/racha-conta/contratos/` |
| I2 | O único teste de execução do Racha (a "Soma Zero" do Livro de Recusas) valida o **código legado**, cuja regra de centavo o autor rejeitou (D-002, D-022) | `cli/src/__tests__/livro-de-recusas.test.ts:7`; compare `paradigma/40-evidencias/apps-exemplos/racha_conta_pix/domain_rules.ts` com `fase0/racha-conta/fontes/legado-domain_rules.ts`; `decisoes.md` |
| I3 | O `idd verify` procura o código em `<pasta do contrato>/<submódulo>.ts`, um arquivo por contrato. A Fase 0 gera **um contrato por método** (8 para `Mesa`), então uma classe real num arquivo só não é encontrada | `cli/src/commands/verify.ts:272` |
| I4 | O `idd generate` lê `constraints` e `acceptance` como texto. Nos contratos v2 eles são objetos, e o prompt ao modelo vira `[object Object]`. O comando também ignora `target_class`, `target_method` e `allowed_fields` | `cli/src/commands/generate.ts:13-17`, `:62`, `:65` |
| I5 | Nenhuma invariante é executada contra código. Os gates checam só a forma (id, tipo, palavra-marcador), e o `@invariant` lido pelo plugin não é usado por nenhuma regra | `cli/src/lib/fase0/gate1.ts`; `packages/eslint-plugin-idd/src/rules/` |
| I6 | Os comandos LLM antigos chamam a API por `fetch` direto, fora de `cli/src/lib/llm/`, com o modelo `claude-sonnet-5`, que não está entre os IDs atuais. Nenhuma chamada real a modelo foi feita: as rodadas do SHADA no Racha foram escritas por um assistente na sessão (provedor manual) | `cli/src/commands/generate.ts:75`, `:125`; `fase0/racha-conta/rodadas/*.resposta.json` |
| I7 | A SHALA estima "interpretações concorrentes" com multiplicadores fixos e contraexemplos prontos. A proposta pede **entropia semântica** real: N leituras independentes do modelo, agrupadas por equivalência (Farquhar et al., *Nature*, 2024) | `cli/src/lib/fase0/shala.ts:680`, `:727`, `:756`; `docs/PROPOSTA-FASE0-COMPILADOR-LU.md:84` |
| I8 | O Cânone diz que a intenção é compilada em "vocabulário de ações" (DAV), mas a Fase 0 não produz esse artefato. A "Fé Bayesiana" (princípio 5) não tem nenhuma linha de código | `IDD-CANONE.md:13`, `:57`; busque no repositório |
| I9 | O CI não roda os gates da Fase 0 nem o lint do plugin sobre código de produto | `.github/workflows/*.yml` |
| I10 | A procedência das decisões é fraca: qualquer edição em `decisoes.md` conta como decisão humana. Algumas aprovações registradas como "editado pelo autor" foram aplicadas por um assistente seguindo respostas do autor no chat (D-029, D-034, D-038) | `fase0/racha-conta/decisoes.md`; `git log` |
| I11 | O módulo `graphify` do IDD **não é** o graphify open source: é um extrator próprio sobre a TypeScript Compiler API, com o mesmo nome. O graphify open source não é usado em lugar nenhum do repositório | `cli/src/lib/fase0/graphify.ts:1-3`; busque `graphifyy` e `tree-sitter` |

Acrescente as incongruências que você encontrar e a lista não tem.

**Pare aqui e peça confirmação ao autor** antes de mudar qualquer coisa. Apresente a tabela com o seu veredito e pergunte quais itens ele quer atacar. Isso é o Comando Epistêmico do próprio paradigma: o humano decide o quê, você executa o como.

## 5. Parte 2 — Fechar a cadeia intenção → contrato → código verificado

Depois da confirmação, proponha e, com autorização, execute um plano em entregas pequenas. Cada entrega precisa de critério de aceite verificável, testes e um gate que reprove quando falhar.

**Objetivo mínimo:** o Racha de Conta implementado **conforme as 53 decisões**, passando pelo ciclo inteiro:
1. os contratos geram as anotações TSDoc (`idd fase0 tsdoc`, que já existe);
2. o código é escrito por um agente via `idd generate` corrigido (I4, I6);
3. o ESLint (`@idd/eslint-plugin`) fiscaliza as mutações por método;
4. o `idd verify` encontra o método de cada contrato (I3);
5. cada invariante tem um teste executável, citado pelo id, que passa (I5);
6. o grafo do graphify open source confirma que cada contrato tem o seu método no código, e o contrário também (item 8b);
7. tudo roda no CI (I9).

### Ferramentas matemáticas: só as que decidem algo

Para cada uma, diga onde entra no fluxo, o que decide, quanto custa e como se testa.

1. **Testes de propriedade** (fast-check, já instalado no plugin). Cada invariante de cálculo vira uma propriedade com semente fixa e contraexemplo mínimo (*shrinking*):
   - INV-001: a soma das cotas é igual aos itens mais a taxa;
   - INV-002: ninguém paga item que não consumiu;
   - INV-005: as cotas são inteiras e ≥ 0;
   - o rodízio alfabético do centavo (D-022, D-032, D-036).
2. **SMT com Z3** (pacote `z3-solver`, WebAssembly). Prova as invariantes aritméticas sobre inteiros no fragmento que o Z3 decide (aritmética linear inteira). Provar é mostrar que a **negação é UNSAT**. Por exemplo: o rateio, modelado com somas e restos sobre inteiros limitados, nunca viola a INV-001. Diga o fragmento coberto e o que fica de fora, e não chame teste de prova.
3. **Verificação exaustiva das máquinas de estado** (`modelo/estados.yaml`), por busca em largura:
   - todo estado é alcançável;
   - não há impasse;
   - cada transição corresponde a uma transação TN-xx.

   Opcionalmente, uma checagem limitada no estilo Alloy sobre o MER, com cardinalidades pequenas.
4. **Teste de mutação** (por exemplo, Stryker). Mostra se os testes das invariantes pegam erros de verdade. A proporção de mutantes mortos é a métrica honesta da força da verificação.
5. **Entropia semântica real**, para substituir ou calibrar a SHALA. Para cada frase do loop 1:
   - colete N leituras do modelo com temperatura;
   - agrupe as equivalentes por implicação nos dois sentidos;
   - calcule a entropia dos grupos.

   Continua consultiva, como a proposta manda. Informe o custo em chamadas.
6. **Concordância entre avaliadores** (kappa de Cohen ou de Fleiss). Mede se a SHALA e o lint concordam com especialistas humanos sobre o que é ambíguo.
7. **Fé Bayesiana como mecanismo.** Um modelo Beta-Binomial por tipo de ação do agente: cada sucesso ou falha verificado pelo gate atualiza a posterior, e a autonomia (Confirm-Once sem revisão) só aumenta quando o limite inferior do intervalo de credibilidade passa de um limiar declarado. Se não valer o custo, recomende rebaixar o princípio a ✅ CONCEITO no Cânone.
8. **Graphify open source, com uso efetivo.** Use os fatos da seção 3 e integre-o só onde ele decide algo, com teste e métrica medida por você:
   - **a. Ingestão L0 da Fase 0.** O grafo de `fase0/<caso>/fontes/` (código legado, SQL e documentos) vira contexto do SHADA no lugar do texto bruto. Meça os tokens reais dos dois contextos com a API de contagem de tokens da Anthropic e compare a qualidade das rodadas. Não publique economia que você não mediu.
   - **b. Gate de rastreabilidade sobre o código implementado.** Todo `target_class.target_method` dos contratos precisa existir como nó (relação `method`). Método público sem contrato e contrato sem método reprovam. As arestas `calls` precisam ser compatíveis com os fluxos de `modelo/atividades/`. Use só arestas `EXTRACTED` no gate e trate `INFERRED` como aviso, porque no exemplo oficial quase metade é inferida.
   - **c. Análise de impacto para drift.** Dado um diff, use `graphify path` e `graphify query`, ou o `graph.json` direto, para listar os contratos e as invariantes afetados e rodar só as verificações deles. É o "verificar drift continuamente" que o Cânone promete com base na lição do MDA.
   - **d. Divisão de papéis com o extrator próprio.** O graphify não tem relação de mutação de campo, então a cerca de mutação (`mutationFence.ts` e o plugin ESLint) continua com o extrator AST próprio. Rode os dois sobre o mesmo código, compare classes, métodos e chamadas, e recomende quem fica com cada função.
   - **e. Fim do conflito de nome.** Renomeie o módulo próprio, por exemplo para "extrator AST do IDD", e o comando `idd fase0 graphify`, para que "graphify" signifique só o projeto open source.
   - **f. Integração opcional.** Ele é um pacote Python numa cadeia Node. Proponha a integração por leitura do `graph.json` (sem acoplar código), com o graphify como passo opcional do CI. Diga o que acontece quando ele não está instalado.
9. **O que já existe e deve ser conferido e mantido:** o fecho de atributos de Armstrong e a BCNF ou 3NF com preservação de dependências (`cli/src/lib/domain/fds.ts`), e a cerca de mutação por AST.

**Entrega 6 da proposta (avaliação em casos reais).** Desenhe o experimento:
- hipóteses;
- variáveis: defeitos encontrados depois, retrabalho, perguntas até a convergência, estabilidade entre execuções;
- grupo de comparação e tamanho de amostra;
- testes estatísticos com intervalos de confiança e tamanho de efeito.

É esse experimento que valida ou refuta o paradigma. **Diga com clareza qual resultado contaria como refutação.**

## 6. Parte 3 — Plano de produto comercializável

Com base no que o código sustenta hoje e no que a Parte 2 entrega:

1. **Recorte do produto.** Diga o que é aberto e o que é pago, e justifique pelo atrito de adoção visível no código. Por exemplo:
   - aberto: o plugin ESLint e o `idd inspect`, como porta de entrada para devs;
   - pago: a Fase 0 com rastreabilidade formal, os gates em CI e os relatórios para auditoria.

   A Fase 0 tem rodadas, decisões e gates; o plugin entra no fluxo que já existe.
2. **Público e problema que paga.** Seja específico: equipes que usam agentes de IA em TypeScript, setores regulados que precisam de rastreabilidade, consultoria de requisitos. Diga o que cada um compra e por quê.
3. **Concorrência real, conferida por você e com data:** GitHub Spec Kit, AWS Kiro, Tessl, Graphify Cloud, ferramentas de design by contract, linters de imutabilidade. Diga o que o IDD faz que eles não fazem, só com base no código.
4. **Roteiro de 90 dias**, com entregas, critérios de aceite e a evidência que cada etapa produz.
5. **Riscos:**
   - mantenedor único;
   - lint só em português;
   - dependência de LLM e custo por rodada;
   - limites da análise estática (documentados em `packages/eslint-plugin-idd/README.md`);
   - dependência do graphify: projeto de terceiros que muda rápido, licença Apache-2.0 a respeitar, cópias com o mesmo nome.

## 7. Parte 4 — Parecer final

Termine com um parecer direto, sem diplomacia excessiva:

- **Viabilidade técnica:** o paradigma, como está no Cânone, é exequível? O que precisa ser cortado ou reescrito para que cada afirmação tenha um mecanismo que a sustente?
- **Viabilidade de mercado:** há um negócio aqui? De que tamanho e para quem?
- **Aceitação pelos profissionais:** devs, arquitetos e analistas adotariam? O que os faria rejeitar?
- **Validação da proposta:** com o plano executado, quais afirmações do Cânone passam a ✅ e quais continuam 🔭?
- **O que mudaria o seu veredito:** que evidência mudaria a sua conclusão em cada um dos três eixos.

## 8. Formato da resposta

1. Tabela de incongruências, com veredito e evidência.
2. **Pergunta de confirmação ao autor.** Pare e espere.
3. Depois da confirmação: plano técnico por entrega, com as ferramentas matemáticas e o que cada uma decide.
4. Plano de produto.
5. Parecer final.

Escreva em português do Brasil, com frases diretas e sem jargão desnecessário. Não altere o Cânone, os contratos nem as decisões do Racha sem a confirmação explícita do autor.
