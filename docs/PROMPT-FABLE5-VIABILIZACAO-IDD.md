# Prompt para a Fable 5 — viabilizar o Paradigma IDD de verdade

> Cole tudo abaixo da linha numa sessão da Fable 5 com acesso ao repositório `EliezerRosa/idd-ide`
> (clone local ou ferramentas de leitura e execução). Preparado em 2026-10-30 a partir da branch
> `feat/fusao-v2-e-honestidade` (PR #75), que já junta a v1 (`idd-ide`) e a v2 (`idd-v2`).

---

Você vai trabalhar como engenheiro sênior e revisor técnico no projeto **IDD — Intent-Driven Development, na formulação de Eliézer Rosa**. O autor quer saber, com base só no código, o que falta para o paradigma funcionar de verdade, como transformá-lo num produto que alguém pague para usar e se ele tem chance com o mercado e com os profissionais.

## Axioma que vale acima de tudo

**Só afirme o que você verificou no código, nos testes ou numa execução feita por você.** Para cada afirmação, cite `arquivo:linha` ou o comando que rodou e a saída. Quando não souber, diga "não verificado". Não use nome de algoritmo, teorema ou métrica que o código não implementa. Este projeto já teve esse problema e está corrigindo:
- a SHALA citava Earley, SAT/DPLL e FrameNet, mas era regex;
- o graphify mostrava "96% de economia de tokens" com valor fixo no código;
- a UI tinha valores roteirizados apresentados como medição.

Ferramenta matemática só conta se **rodar e decidir alguma coisa** no fluxo, como um gate, um teste ou uma decisão de produto. Enfeite é proibido.

Rotule tudo com os selos do Cânone: ✅ implementado e verificado · 🧪 demonstração · 🔭 proposta, não implementada.

## O que ler primeiro

1. `paradigma/00-canone/IDD-CANONE.md`: definição, seis princípios e selos. É a proposta a ser validada ou refutada.
2. `paradigma/00-canone/AFIRMACOES.md`: o que já foi admitido como demonstração ou proposta.
3. `docs/PROPOSTA-FASE0-COMPILADOR-LU.md`: o método da Fase 0, os gates e as entregas 0 a 8.
4. O caso real `fase0/racha-conta/`:
   - `decisoes.md`, com 53 decisões do autor;
   - `intencoes.md` e `invariantes.md`;
   - `modelo/`, com MER, casos de uso, atividades, estados e métodos;
   - `contratos/`, com 8 contratos v2;
   - `rastreabilidade.md`.
5. O código:
   - `cli/src/lib/fase0/`: loops, gates, SHALA, graphify e `tsdoc.ts`;
   - `cli/src/lib/domain/fds.ts`: fecho de Armstrong;
   - `cli/src/commands/verify.ts` e `generate.ts`;
   - `cli/src/lib/mutationFence.ts`;
   - `packages/eslint-plugin-idd/`;
   - `packages/core/src/contract.ts`.

Rode antes de concluir qualquer coisa:

```bash
cd cli && npm ci && npm run build && npx vitest run         # esperado: 1059 testes
cd ../packages/eslint-plugin-idd && npm ci && npm test       # esperado: 45 testes
cd ../.. && node cli/dist/index.js fase0 gate1 racha-conta && node cli/dist/index.js fase0 gate2 racha-conta
node cli/dist/index.js fase0 tsdoc racha-conta
```

## Parte 1 — Confirme ou refute cada incongruência

Para cada item, responda **CONFIRMADA** ou **REFUTADA**, com a evidência que você mesmo levantou. Não aceite esta lista por confiança: ela foi feita por outro modelo e pode conter erros.

| # | Incongruência alegada | Onde olhar |
| --- | --- | --- |
| I1 | A cadeia termina no contrato: **não existe implementação do Racha conforme a especificação** decidida | busque `class Mesa` no repositório; compare com `fase0/racha-conta/contratos/` |
| I2 | O único teste de execução do Racha ("Soma Zero" do Livro de Recusas) valida o **código legado**, cuja regra de centavo o autor rejeitou (D-002, D-022) | `cli/src/__tests__/livro-de-recusas.test.ts:7`; `paradigma/40-evidencias/apps-exemplos/racha_conta_pix/domain_rules.ts` versus `fase0/racha-conta/fontes/legado-domain_rules.ts`; `decisoes.md` |
| I3 | O `idd verify` acha o código como `<pasta do contrato>/<submódulo>.ts`, um arquivo por contrato. A Fase 0 gera **um contrato por método** (8 para `Mesa`), então uma classe real num arquivo não é encontrada | `cli/src/commands/verify.ts:272` |
| I4 | O `idd generate` lê `constraints` e `acceptance` como texto. Nos contratos v2 eles são objetos, e o prompt ao modelo vira `[object Object]`. O comando também ignora `target_class`, `target_method` e `allowed_fields` | `cli/src/commands/generate.ts:13-17`, `:62`, `:65` |
| I5 | Nenhuma invariante é executada contra código. Os gates checam só a forma (id, tipo, palavra-marcador), e o `@invariant` lido pelo plugin não é usado por nenhuma regra | `cli/src/lib/fase0/gate1.ts`; `packages/eslint-plugin-idd/src/rules/` |
| I6 | Os comandos LLM antigos chamam a API por `fetch` direto, fora de `cli/src/lib/llm/`, com o modelo `claude-sonnet-5`, que não está entre os IDs atuais. Nenhuma chamada real a modelo foi feita no projeto: as rodadas do SHADA no Racha foram escritas por um assistente na sessão (provedor manual) | `cli/src/commands/generate.ts:75`, `:125`; `fase0/racha-conta/rodadas/*.resposta.json` |
| I7 | A SHALA estima "interpretações concorrentes" por multiplicadores fixos com contraexemplos prontos. A proposta pede **entropia semântica** de verdade: N leituras independentes do modelo, agrupadas por equivalência (Farquhar et al., *Nature*, 2024) | `cli/src/lib/fase0/shala.ts:680`, `:727`, `:756`; `docs/PROPOSTA-FASE0-COMPILADOR-LU.md:84` |
| I8 | O Cânone define que a intenção é compilada em "vocabulário de ações" (DAV), mas a Fase 0 não produz esse artefato. "Fé Bayesiana" (princípio 5) não tem nenhuma linha de código | `IDD-CANONE.md:13`, `:57`; busque no repositório |
| I9 | O CI não roda os gates da Fase 0 (`fase0 gate1/gate2`) nem lint do plugin sobre código de produto | `.github/workflows/*.yml` |
| I10 | A procedência das decisões é fraca: qualquer edição em `decisoes.md` conta como decisão humana. Algumas aprovações registradas como "editado pelo autor" foram aplicadas por um assistente seguindo respostas do autor no chat (D-029, D-034, D-038) | `fase0/racha-conta/decisoes.md`; `git log` |

Acrescente as incongruências que você encontrar e esta lista não tem.

**Pare aqui e peça confirmação ao autor** antes de mudar código: apresente a tabela com o seu veredito e pergunte quais itens ele quer atacar. Isso é o Comando Epistêmico do próprio paradigma: o humano decide o quê, você executa o como.

## Parte 2 — Plano para fechar a cadeia intenção → contrato → código verificado

Depois da confirmação, proponha e, com autorização, execute um plano em entregas pequenas. Cada entrega precisa de critério de aceite verificável, testes e um gate que reprove quando falhar.

O objetivo mínimo é o Racha de Conta implementado **conforme as 53 decisões**, passando por todo o ciclo:
- os contratos geram as anotações TSDoc (`idd fase0 tsdoc`, que já existe);
- o código é escrito por um agente via `idd generate` corrigido;
- o ESLint (`@idd/eslint-plugin`) fiscaliza as mutações por método;
- o `idd verify` acha o método certo;
- cada invariante tem um teste executável, citado pelo id, que passa;
- tudo roda no CI.

### Ferramentas matemáticas: use as que de fato decidem algo

Para cada uma, diga onde entra no fluxo, o que ela decide, quanto custa e como se testa.

1. **Testes de propriedade (fast-check, já instalado no plugin).** Cada invariante de cálculo vira uma propriedade com semente fixa e contraexemplo mínimo (*shrinking*):
   - INV-001: soma das cotas = itens + taxa;
   - INV-002: ninguém paga item que não consumiu;
   - INV-005: cotas inteiras e ≥ 0;
   - o rodízio alfabético do centavo, na forma da D-022, D-032 e D-036.
2. **SMT com Z3** (pacote `z3-solver`, WebAssembly, sem binário nativo). Use-o para provar as invariantes aritméticas sobre inteiros, nos fragmentos que o Z3 decide (aritmética linear inteira). Provar é mostrar que a **negação é UNSAT**. Por exemplo, que o algoritmo de rateio, modelado com somas e restos sobre inteiros limitados, nunca viola a INV-001. Explique o fragmento coberto e o que fica de fora. Não chame de "prova" o que for só teste.
3. **Verificação exaustiva das máquinas de estado** (`modelo/estados.yaml`). Faça uma busca em largura sobre os estados, para provar que:
   - todo estado é alcançável;
   - não há impasse;
   - as transições batem com as transações (TN-xx).

   Também pode ser uma checagem limitada no estilo Alloy, sobre o MER com cardinalidades pequenas.
4. **Teste de mutação** (por exemplo, Stryker). Mede se os testes das invariantes pegam erros de verdade. O número de mutantes mortos é a métrica honesta da força da verificação.
5. **Entropia semântica de verdade, para substituir ou calibrar a SHALA.** Para cada frase do loop 1:
   - colete N leituras do modelo com temperatura;
   - agrupe as equivalentes por implicação nos dois sentidos;
   - calcule a entropia dos grupos.

   Fica consultiva, como a proposta manda. Diga o custo em chamadas e como validá-la contra o julgamento humano.
6. **Concordância entre avaliadores (kappa de Cohen ou de Fleiss)** para medir se a SHALA e o lint concordam com especialistas humanos sobre o que é ambíguo.
7. **Fé Bayesiana como mecanismo real.** Um modelo Beta-Binomial por tipo de ação do agente: cada sucesso ou falha verificada pelo gate atualiza a posterior, e a autonomia (Confirm-Once sem revisão) só aumenta quando o limite inferior do intervalo de credibilidade passa de um limiar declarado. Se não valer a pena implementar, recomende rebaixar o princípio a ✅ CONCEITO no Cânone.
8. **O que já existe e deve ser mantido:** o fecho de atributos de Armstrong, a BCNF ou 3NF com preservação de dependências (`cli/src/lib/domain/fds.ts`) e a cerca de mutação por análise de AST. Confira se estão corretos.

Para a **Entrega 6** da proposta (avaliação em casos reais), desenhe o experimento:
- hipóteses;
- variáveis (defeitos encontrados depois, retrabalho, perguntas até a convergência, estabilidade entre execuções);
- grupo de comparação;
- tamanho de amostra;
- testes estatísticos com intervalos de confiança e tamanho de efeito.

Esse experimento é o que valida ou refuta o paradigma. Diga com clareza qual resultado contaria como refutação.

## Parte 3 — Plano de produto comercializável

Com base no que o código sustenta hoje e no que o plano da Parte 2 entrega, proponha:

1. **Recorte do produto.** O que é aberto (por exemplo, o plugin ESLint e o `idd inspect` como porta de entrada para devs) e o que é pago (por exemplo, a Fase 0 com rastreabilidade formal, os gates em CI e os relatórios para auditoria). Justifique com o atrito de adoção que se vê no código. A Fase 0 tem rodadas, decisões e gates; o plugin entra no fluxo existente.
2. **Público e problema que paga.** Seja específico: equipes que usam agentes de IA em TypeScript, setores regulados que precisam de rastreabilidade, consultoria de requisitos. Diga o que cada um compra e por quê.
3. **Concorrência real**, conferida por você, com data: GitHub Spec Kit, AWS Kiro, Tessl, ferramentas de design by contract, linters de imutabilidade. Diga o que o IDD faz que eles não fazem, só com base no código.
4. **Roteiro de 90 dias**, com entregas, critérios de aceite e a evidência que cada etapa produz.
5. **Riscos:** mantenedor único, lint só em português, dependência de LLM, custo por rodada e limites da análise estática (já documentados em `packages/eslint-plugin-idd/README.md`).

## Parte 4 — Parecer final

Termine com um parecer direto, sem diplomacia excessiva:

- **Viabilidade técnica:** o paradigma, como está no Cânone, é exequível? O que precisa ser cortado ou reescrito no Cânone para que cada afirmação tenha um mecanismo que a sustente?
- **Viabilidade de mercado:** há um negócio aqui? De que tamanho e para quem?
- **Aceitação pelos profissionais:** devs, arquitetos e analistas adotariam? O que os faria rejeitar?
- **Validação da proposta:** com o plano executado, quais afirmações do Cânone passam a ✅ e quais continuam 🔭?
- **O que mudaria o seu veredito:** que evidência, se aparecesse, mudaria a sua conclusão em cada um dos três eixos.

## Formato da resposta

1. Tabela de incongruências: veredito e evidência.
2. **Pergunta de confirmação ao autor** (pare e espere).
3. Depois da confirmação: plano técnico por entrega, com as ferramentas matemáticas e o que cada uma decide.
4. Plano de produto.
5. Parecer final.

Escreva em português do Brasil, frases diretas, sem jargão desnecessário. Não altere o Cânone, os contratos ou as decisões do Racha sem a confirmação explícita do autor.
