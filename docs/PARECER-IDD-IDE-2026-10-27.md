# Parecer técnico sobre o idd-ide (ferramenta)

**Data:** 2026-10-27
**Autor do parecer:** Claude (agente), a pedido de Eliézer Rosa
**Escopo:** as ferramentas do repositório (CLI, `@idd/core`, LSP, extensão), sua viabilidade
técnica e o mercado. O paradigma em si foi avaliado em
[PARECER-PARADIGMA-2026-10-26](PARECER-PARADIGMA-2026-10-26.md). Este parecer atualiza os de
2026-09-04 ([PARECER-E-PROPOSTA](PARECER-E-PROPOSTA-2026-09-04.md),
[VEREDITO](VEREDITO-CONTRAPROPOSTAS-2026-09-04.md)).

**Método:**
- **Auditoria do código** no `main` (`90b16ed`), com os 902 testes executados.
- **Conferência na fonte** das afirmações críticas: o `|| true` no CI, o bind do servidor e a simulação do SQLite.
- **Pesquisa de mercado** de out/2026. As estrelas do GitHub e o artigo arXiv 2606.27045 foram conferidos na fonte; os demais números são de fontes secundárias.

---

## 1. Decisão do comando epistêmico (2026-10-27)

Eliézer Rosa fixou três pontos que orientam este parecer:

- **Fato:** o IDD é, rigorosamente, uma **tese de paradigma**. O repositório não é nem pode ser
  tratado como produto final.
- **Objetivo:** **começar pelo começo**, com a Fase 0 investigativa: um desambiguador e
  compilador de linguagem ubíqua no nível de estudo de requisitos, em dois loops (intenção e
  invariantes; depois MER, UML, casos de uso, atividades, estados e métodos). Ver
  [PROPOSTA-FASE0-COMPILADOR-LU](PROPOSTA-FASE0-COMPILADOR-LU.md).
- **Alcance:** CLI e extensão primeiro; uma IDE dedicada é longo prazo, **se a proposta for
  adotada**.

Com isso, a recomendação de reposicionar a ferramenta como "gate de drift" (§5, item 2) deixa de
ser o eixo principal e passa a ser uma aplicação a jusante da Fase 0.

## 2. Veredito

A ideia central é boa e tem espaço vago no mercado. Mas o software ainda é um **protótipo de
pesquisa**:
- a verificação principal é heurística e sem medição de acerto;
- não há usuários externos;
- o produto não evoluiu entre 06/09 e 26/10/2026.

Tratá-lo como tese, e não como produto, é a leitura correta.

## 3. O que existe de fato

| Componente | Status | Evidência e observação |
| --- | --- | --- |
| Contrato `.intent.yaml` e parser único (`@idd/core`) | ✅ | `packages/core/src/contract.ts` |
| Fronteiras entre contextos (`verify --project`) | ✅ | Gate de CI; imports lidos por regex |
| Dicionário ubíquo | ✅ | `packages/core/src/dictionary.ts`, offline, gate de CI |
| Intent Store (SQLite) | ✅ | Testado só com simulação do banco (`cli/vitest.config.ts`) |
| Domínio UML → YAML/SQL | ✅ | `cli/src/lib/domain/` |
| Normalização 1NF→DKNF | 🧪 | Heurística; sem fecho de atributos nem chaves candidatas |
| `verify` estático | 🧪 | Regex fixas; "acceptance" conferida por substring |
| `verify --semantic` | 🧪 | Uma amostra de LLM, só Anthropic, sem nova tentativa, código cortado em 16 mil caracteres |
| LSP | 🧪 | Só TypeScript e `state_mutation`; pacote de ~10 MB; sem testes |
| Extensão VS Code | 🧪 | Duas extensões concorrentes; barra de status com texto fixo |
| Servidor HTTP | 🧪 | Corrigido em 27/10: só `127.0.0.1` por padrão; outro host exige token |
| `.intent.md`, Sombra, waivers, Risk Dials | 🔭 | Fase 9, item 3 em diante, não iniciados |
| IDE (fork do Code-OSS) | 🔭 | Só `product.json` de marca |

Tamanho e testes:
- cerca de 12,5 mil linhas de código, fora os testes;
- 902 testes, nenhum exercitando banco real, LLM ou LSP.

**Tração:** 1 estrela, 0 visitas em 14 dias, nada publicado em npm nem Open VSX, nenhuma contribuição externa.

## 4. Avaliação científica

**Hipótese implícita:** intenção declarada + verificação determinística reduz o drift e os
defeitos no desenvolvimento com IA. **Ainda não testada.**

- **Validade:** a precisão e a cobertura do `verify` são desconhecidas. A issue #30 registra um
  drift real que passou despercebido.
- **Confiabilidade:** a nota semântica vem de uma única resposta do LLM, e duas execuções podem divergir.
- **Decidível × não decidível:**
  - **Decidível, com espaço para rigor:** fronteiras, vocabulário, mutação de estado via AST e schema contra migrations.
  - **Não decidível:** "o código faz o que a intenção diz". O LLM só pode dar um parecer, com a incerteza declarada.
- **Lacuna na literatura:** Grabowski (arXiv 2606.27045, v2 em 09/10/2026) propõe um "drift gate"
  que bloqueia o merge, **sem avaliação empírica**. Um benchmark com drifts injetados seria uma
  contribuição original.

## 5. Mercado (out/2026)

| Categoria | Situação | Consequência |
| --- | --- | --- |
| Especificar antes de gerar (Spec Kit ~143 mil estrelas; OpenSpec ~73 mil; Kiro US$ 20–200/mês; Tessl US$ 125 mi) | Padrão | Ter "intenção em arquivo" não diferencia |
| Esclarecimento de requisitos com IA (`/clarify` do Spec Kit; requisitos EARS no Kiro) | Existe, raso | **A Fase 0 precisa ir além:** dicionário como gate, MER normalizado, casos de uso até a transação, métodos circunscritos e rastreabilidade |
| Regras e hooks de agentes (AGENTS.md, CLAUDE.md, hooks) | Padrão | Guardrails genéricos já são gratuitos |
| Revisão de PR com IA (CodeRabbit US$ 1,5 bi; Qodo; Sonar) | Capitalizado | Não competir em revisão genérica |
| Verificação contínua intenção × código | **Vago** (só o artigo, sem avaliação) | Aplicação a jusante da Fase 0 |
| Linguagem ubíqua e fronteiras ligadas à intenção | **Vago** | Diferencial real |
| IDE própria (fork do VS Code) | Equipes grandes (Cursor, Windsurf, Kiro, Antigravity) | Longo prazo, condicionado à adoção |

## 6. Recomendações

1. **Fase 0 primeiro**, conforme a decisão do §1, com critérios de convergência **mensuráveis**
   (ver a proposta). Não usar "certeza ≥ 95%" informada pelo próprio LLM.
2. **Rigor onde é decidível:** dicionário, lint de ambiguidade, normalização com fecho de
   atributos e matriz de rastreabilidade viram gates. O LLM propõe e pergunta; o humano decide.
3. **Provar com dados:** usar os casos reais (RVM, Refrigeração, Racha) como corpus de
   avaliação da Fase 0, e publicar o método e os resultados.
4. **Honestidade do repositório:** README com selos (feito em 27/10). A IDE e o fork só como 🔭.
5. **Higiene técnica antes de crescer:**
   - uma camada de LLM única (vários provedores, saída estruturada, novas tentativas);
   - remover a dependência nativa;
   - unificar as duas extensões;
   - testes de ponta a ponta reais.
6. **Distribuição** só quando a Fase 0 tiver um caso demonstrável: npm, Open VSX e vídeo.
7. **Critério de corte bayesiano:** após o MVP da Fase 0, definir metas de adoção (por exemplo,
   repositórios externos usando-a) antes de investir na extensão completa e, depois, na IDE.

## 7. Correções aplicadas em 27/10/2026

- CI: removido o `|| true` que anulava o gate estático (`verify --fail-on=critical` passa hoje).
- `idd server`:
  - escuta só em `127.0.0.1` por padrão;
  - outro host exige `IDD_SERVER_TOKEN`;
  - token comparado em tempo constante;
  - sem CORS, salvo origem explícita (`--cors=`);
  - 2 testes novos.
- `idd registry`: `require('node:https')` em módulo ESM trocado por `import`.
- Modelo padrão unificado em `claude-sonnet-5`. A extensão, o `product.json` e a documentação ainda apontavam para `claude-sonnet-4-20250514`, que não consta mais da lista de modelos atuais.
- README reescrito com selos ✅/🧪/🔭 e a direção da Fase 0.

Pendentes:
- duas extensões duplicadas;
- `verify` quebra quando executado fora de `cli/` (variação da [#29](https://github.com/EliezerRosa/idd-ide/issues/29));
- camada de LLM;
- dependência nativa.
