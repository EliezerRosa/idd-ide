# Base de Conhecimento — Intent-Driven Development (IDD)

> **Paradigma cunhado por Eliezer Rosa**  
> Versão: 1.0 | Data: 2026-05-09  
> Repositório vivo — atualizar à medida que o paradigma evolui.

---

## Sumário

1. [O que é IDD](#1-o-que-é-idd)
2. [Distinções Centrais](#2-distinções-centrais)
   - [2.1 Comando Epistêmico vs. Operacional](#21-comando-epistêmico-vs-comando-operacional)
   - [2.2 Augmenting ≠ Automating](#22-augmenting--automating)
   - [2.3 Fé Bayesiana vs. Credulidade](#23-fé-bayesiana-vs-credulidade)
   - [2.4 Confirm-Once Pattern](#24-o-confirm-once-pattern)
   - [2.5 DAV — Deterministic Action Vocabulary](#25-dav--deterministic-action-vocabulary)
3. [Linhagem Intelectual](#3-linhagem-intelectual)
4. [Paradigmas Convergentes e Adjacentes](#4-paradigmas-convergentes-e-adjacentes)
5. [O que distingue o IDD de cada paradigma adjacente](#5-o-que-distingue-o-idd-de-cada-paradigma-adjacente)
6. [Ferramentas Contemporâneas — Materializações parciais do IDD](#6-ferramentas-contemporâneas--materializações-parciais-do-idd)
7. [Vozes Contemporâneas — YouTube, Podcasts, Blogs](#7-vozes-contemporâneas--youtube-podcasts-blogs)
8. [Textos-Chave — Artigos, Papers e Livros Fundacionais](#8-textos-chave--artigos-papers-e-livros-fundacionais)
9. [Sites e Comunidades](#9-sites-e-comunidades)
10. [AEON e RVM Designações — IDD em produção](#10-aeon-e-rvm-designações--idd-em-produção)
11. [Mapa Visual da Linhagem](#11-mapa-visual-da-linhagem)
12. [Glossário](#12-glossário)

---

## 1. O que é IDD

**Intent-Driven Development** (IDD) é um paradigma de engenharia de software onde a **linguagem natural estruturada** é a fonte primária de especificação *e* de governança — não apenas um artefato intermediário ou de documentação.

### Definição operacional

> "A intenção humana expressa em linguagem natural é o artefato de mais alta ordem do sistema. Todo código, toda configuração, todo agente de IA é derivado dela — e permanece auditável em relação a ela."

### Propriedades essenciais do IDD

| Propriedade | Descrição |
|---|---|
| **Linguagem natural como fonte primária** | NL não é documentação *sobre* o código — é a especificação *da qual* o código é derivado. |
| **Governança persistente** | Artefatos de intenção (`.intent.md`) não são descartados após a geração — são mantidos vivos como camada de governança. |
| **Comando Epistêmico humano** | O humano retém autoridade sobre *o quê* e *por quê*; o agente executa *o como*. |
| **Augmenting ≠ Automating** | A simbiose amplifica a capacidade humana sem substituir o julgamento humano. |
| **Auditabilidade** | Toda ação do agente é rastreável até a intenção que a originou. |
| **Invariantes de negócio** | Restrições não-negociáveis são codificadas na intenção e funcionam como salvaguardas. |

### O que IDD **não** é

- Não é "vibe coding" — vibe coding abdica de entender o que foi gerado; IDD mantém comando epistêmico.
- Não é apenas BDD — BDD usa NL para testes; IDD usa NL para governança de todo o sistema.
- Não é apenas DDD — DDD modela o domínio em OOP; IDD usa NL como artefato primário em si.
- Não é geração automática de código (NL → código de uma só vez); é governança contínua por linguagem natural.

---

## 2. Distinções Centrais

### 2.1 Comando Epistêmico vs. Comando Operacional

Distinção cunhada por Eliezer, alinhada com Engelbart (1962) e a tradição de "Augmenting Human Intellect":

| Tipo | Definição | Quem detém |
|---|---|---|
| **Epistêmico** | Autoridade sobre o *quê* e o *porquê*. Define intenção, restrições, invariantes, critérios de sucesso, limites éticos. | **Sempre o humano** |
| **Operacional** | Autoridade sobre o *como*. Escolhe ferramentas, sequência de passos, sintaxe, idiomas de execução. | Pode ser **delegado ao agente** |

> **Princípio fundamental**: Perder a fronteira entre os dois tipos de comando é **credulidade** (confiança sem conhecimento). Mantê-la é **fé bayesiana** (confiança escalada por evidência auditável).

### 2.2 Augmenting ≠ Automating

- **Augmenting** (ampliar): o humano permanece no loop epistêmico; o agente estende suas capacidades. O resultado final reflete a intencionalidade humana.
- **Automating** (automatizar): o humano é removido do loop. O resultado pode não refletir qualquer intenção humana específica.

IDD é **augmentation** — o agente é poderoso e autônomo operacionalmente, mas permanece fundamentado na intenção humana.

### 2.3 Fé Bayesiana vs. Credulidade

- **Credulidade**: confiar no output do agente sem base de evidências ou capacidade de auditoria.
- **Fé bayesiana**: confiar no agente proporcionalmente às evidências acumuladas, com capacidade de auditar e corrigir.

IDD exige fé bayesiana — por isso os invariantes, rastreabilidade e relatórios pós-execução são estruturais.

### 2.4 O Confirm-Once Pattern

No IDD, o modelo de aprovação preferencial é **confirm-once**:
1. O agente apresenta o plano (derivado da intenção).
2. O humano aprova com um único "go".
3. O agente executa até o fim, reportando tudo.

Isso preserva o comando epistêmico (o humano aprovou o plano) sem micro-gerenciar o operacional.

### 2.5 DAV — Deterministic Action Vocabulary

**DAV** é um princípio arquitetural do IDD que governa como agentes de IA devem interagir com dados e sistemas persistentes.

#### Invariante central

> "O LLM nunca é intérprete de dados — é intérprete de intenção. Dados do domínio existem exclusivamente no escopo do código determinístico."

#### O problema que DAV resolve

Em sistemas IDD com acesso a BD ou estado persistente, o LLM tende a:
- Inventar dados que não existem ("alucinação factual").
- Interpretar incorretamente contexto textual como dados estruturados.
- Produzir respostas inconsistentes para a mesma consulta.

Isso ocorre **mesmo com bons system prompts** — a compliance do LLM varia por provider e modelo. A solução não é refinar o prompt; é remover o LLM do caminho dos dados.

#### Definição

**Deterministic Action Vocabulary (DAV)** é um conjunto **fechado e tipado** de todas as interações possíveis entre o agente e o sistema de dados:

| Camada | Responsabilidade | Executor |
|---|---|---|
| **Fast-path pré-LLM** | Reconhecer intenções frequentes via regex/regras, sem chamar LLM | Código cliente |
| **Intent mapping** | Mapear NL do usuário → `{ actionType, params }` (JSON mínimo) | LLM |
| **Action handler** | Executar a ação deterministicamente, retornar resultado formatado | Código determinístico |
| **Dados brutos** | Nunca saem do escopo do handler | Código determinístico |

#### Arquitetura em camadas

```
Linguagem natural do usuário
         │
         ▼
[Camada 0] Fast-path pré-LLM  ──match──▶  handler direto  →  zero token
         │ sem match
         ▼
[Camada 1] LLM  →  produz apenas { actionType, params }
         │
         ▼
[Camada 2] Handler determinístico  →  executa, retorna resultado
         │
         ▼
Resposta ao usuário  (dados nunca passaram pelo LLM)
```

#### Por que economiza tokens

- **Fast-path** elimina a chamada ao LLM nas consultas mais frequentes — custo zero.
- **LLM responde com JSON mínimo** (ação + parâmetros), não com prosa interpretativa sobre dados.
- **Zero retry por alucinação** na camada determinística — elimina classe inteira de loops de correção.

#### Conexão com Comando Epistêmico / Operacional

O DAV é a materialização da distinção §2.1 aplicada ao dado:

- O LLM detém o **epistêmico**: entende que o usuário quer saber sobre elegibilidade de um publicador.
- O handler determinístico detém o **operacional**: executa `checkEligibility(pub, parte)` e retorna o resultado.

O dado nunca é cedido ao LLM porque **dados são fatos do domínio, não intenções** — e fatos pertencem ao código determinístico.

#### Relação com paradigmas existentes

DAV sintetiza e vai além de padrões estabelecidos:

| Padrão | Relação com DAV |
|---|---|
| **Function Calling** (OpenAI/Anthropic, 2023) | DAV acrescenta: fast-path pré-LLM + a invariante de não-interpretação como contrato de domínio |
| **Intent Classification + Slot Filling** (NLP clássico) | DAV é a versão moderna: vocabulário fechado como contrato, fast-path sem LLM para casos frequentes |
| **CQRS** (Command Query Responsibility Segregation) | DAV aplica CQRS entre LLM e código: LLM só declara intenção, código lê/escreve dados |
| **Neuro-Symbolic AI** | DAV instancia: simbólico/determinístico para fatos do domínio, neural para semântica da linguagem |
| **Cascaded Classifiers** | Fast-path é o classificador barato; LLM é escalado apenas quando necessário |

#### Quando aplicar DAV

- Qualquer agente IDD que acessa BD, estado em memória ou APIs de domínio.
- Toda interação cujo resultado correto seja determinado pelos dados, não pela interpretação do LLM.
- Sistemas com requisito de auditabilidade (cada resposta rastreável ao handler que a produziu).

#### Implementação de referência

Primeira implementação em produção: **RVM Designações** (2026-05-23), com 9 handlers `QUERY_*` e fast-path client-side com 7 famílias de regex PT-BR. Ver §10.2.

---

## 3. Linhagem Intelectual

O IDD não surgiu do vazio. É o ápice de uma tradição de 80 anos de pensamento sobre como a tecnologia pode ampliar a inteligência humana — não substituí-la.

### 3.1 Linha do Tempo

```
1945 ──── Vannevar Bush ────────────────────────────── "As We May Think"
              │  (Memex: associação, augmentação do conhecimento coletivo)
              │
1960 ──── J.C.R. Licklider ──────────────────────────── "Man-Computer Symbiosis"
              │  (Simbiose homem-máquina, parceria cognitiva)
              │
1962 ──── Douglas Engelbart ─────────────────────────── "Augmenting Human Intellect"
              │  (NLS, hypertext, mouse, Mother of All Demos 1968)
              │
1963 ──── Ivan Sutherland ───────────────────────────── Sketchpad
              │  (Primeira GUI, manipulação direta, interação visual)
              │
1965 ──── Ted Nelson ────────────────────────────────── Hypertext / Project Xanadu
              │  (Links não-lineares, intertextualidade, "literary machines")
              │
1970s ─── Alan Kay ──────────────────────────────────── Dynabook / Smalltalk / OOP
              │  (Computador pessoal, mensagens como paradigma, PARC)
              │
1975 ──── Fred Brooks ───────────────────────────────── "The Mythical Man-Month"
              │  (Integridade conceitual, complexidade essencial vs. acidental)
              │
1984 ──── Donald Knuth ──────────────────────────────── Literate Programming
              │  (NL como exposição primária; código como detalhe)
              │
1987 ──── Fred Brooks ───────────────────────────────── "No Silver Bullet"
              │  (Nenhuma técnica elimina complexidade — gestão é o trabalho)
              │
1989 ──── Tim Berners-Lee ───────────────────────────── World Wide Web
              │  (Hipertexto universal, web semântica, ontologias)
              │
2003 ──── Eric Evans ────────────────────────────────── Domain-Driven Design
              │  (Ubiquitous Language, Bounded Contexts)
              │
2006 ──── Dan North ─────────────────────────────────── Behavior-Driven Development
              │  (Given/When/Then, Gherkin, NL como especificação executável)
              │
2010s ─── Gruber / Web Semântica ───────────────────── Ontologias, linked data
              │
2021 ──── OpenAI Codex ──────────────────────────────── NL → Código (GPT-3 fine-tuned)
              │  (Primeira materialização industrial de NL como linguagem de programação)
              │
2023 ──── Andrej Karpathy ───────────────────────────── "The hottest programming language is English"
              │
2025 ──── Karpathy coins "Vibe Coding" ──────────────── NL sem governança (ponto de contraste)
              │
Hoje ───── Eliezer Rosa / IDD ───────────────────────── INTENT-DRIVEN DEVELOPMENT
                (NL como governança + Comando Epistêmico humano + AEON)
```

### 3.2 Perfis dos Precursores

#### Vannevar Bush (1890–1974)
- **Texto fundacional**: "As We May Think" (*The Atlantic*, julho 1945)
- **Visão**: O memex — uma "peça de mobília" que armazenaria todo o conhecimento de um indivíduo com indexação *associativa* (não hierárquica), permitindo criar trilhas de pensamento.
- **Problema que identificou**: O conhecimento científico crescia mais rápido do que nossa capacidade de acessá-lo e sintetizá-lo.
- **Frase-chave**: "Wholly new forms of encyclopedias will appear, ready-made with a mesh of associative trails running through them."
- **Influência direta**: Engelbart leu o ensaio pouco após a publicação e construiu toda sua carreira sobre essa visão.
- **O que antecipou**: hypertext, personal computers, Internet, Wikipedia, speech recognition, brain-computer interfaces.

#### J.C.R. Licklider (1915–1990)
- **Texto fundacional**: "Man-Computer Symbiosis" (*IRE Transactions*, 1960)
- **Visão**: Parceria cognitiva entre humanos e computadores — o computador como co-piloto intelectual, não ferramenta.
- **Frase-chave**: "Men will set the goals, formulate the hypotheses, determine the criteria, and perform the evaluations. Computing machines will do the routinizable work."
- **Relevância para IDD**: Define precisamente o que IDD chama de Comando Epistêmico (humano) vs. Operacional (máquina).

#### Douglas Engelbart (1925–2013)
- **Texto fundacional**: "Augmenting Human Intellect: A Conceptual Framework" (SRI, 1962)
- **Visão**: Ampliar a capacidade do intelecto humano coletivo para enfrentar os grandes problemas da humanidade. A sofisticação das ferramentas molda o que conseguimos *conceber*.
- **Sistema**: NLS (oN-Line System) / Augment — primeiro sistema com mouse, hyperlinks, videoconferência, edição colaborativa.
- **Mother of All Demos**: 9 de dezembro de 1968 — demonstração ao vivo que mostrou ao mundo o futuro da computação interativa.
- **Filosofia chave**: Inspirado pela hipótese Sapir-Whorf — a linguagem (e a sofisticação das ferramentas) molda o pensamento possível. Portanto, melhorar as ferramentas = ampliar o pensamento.
- **Bootstrapping strategy**: Usar as próprias ferramentas para melhorar as próprias ferramentas.
- **Turing Award**: 1997.
- **Relevância para IDD**: Engelbart é o arquiteto filosófico direto do IDD. "Augmenting ≠ Automating" vem diretamente dele.

#### Ivan Sutherland (n. 1938)
- **Texto fundacional**: Sketchpad (tese de doutorado, MIT, 1963)
- **Visão**: Interação direta e visual com o computador. Primeiro sistema gráfico interativo. Precursor de toda interface gráfica (GUI).
- **Frase-chave**: A manipulação direta como paradigma de interação.
- **Turing Award**: 1988.
- **Relevância para IDD**: A manipulação direta é o precursor da "intenção direta" — agir sobre o mundo computacional pela expressão direta da vontade, sem intermediários sintáticos opressivos.

#### Ted Nelson (n. 1937)
- **Contribuição**: Cunhou o termo **hypertext** (1965). Projeto Xanadu — visão de um sistema de hipertexto universal, bidimensional, com rastreamento de autoria.
- **Livro**: *Literary Machines* (1981).
- **Frase-chave**: "Everything is deeply intertwingled."
- **Relevância para IDD**: A ideia de documentos não-lineares interligados por intenção semântica é um precursor dos `.intent.md` como artefatos vivos com referências cruzadas.

#### Alan Kay (n. 1940)
- **Contribuição**: Dynabook (conceito, 1972) — computador pessoal para crianças como ferramenta de pensamento. Smalltalk / OOP no Xerox PARC. GUI Windows.
- **Frase-chave**: "The big idea is messaging." / "The computer revolution hasn't happened yet." (OOPSLA 1997).
- **Projeto STEPS**: Reinventar todo o software moderno em 20.000–200.000 linhas de código de alta expressividade.
- **Turing Award**: 2003.
- **Relevância para IDD**: Kay insiste que o paradigma atual de programação é *pré-revolucionário*. IDD representa a virada que ele anteviu: a linguagem natural como interface primária entre humano e computador.

#### Fred Brooks (1931–2022)
- **Textos fundacionais**:
  - *The Mythical Man-Month* (1975) — Lei de Brooks; complexidade; comunicação como gargalo.
  - *No Silver Bullet* (1987) — Distinção entre complexidade **essencial** (inerente ao problema) e **acidental** (inerente à implementação). Nenhuma técnica singular elimina a essencial.
  - *The Design of Design* (2010) — O design como atividade central da engenharia de software.
- **Cunhou**: "integridade conceitual" — a coerência de visão que só emerge de um pequeno número de mentes.
- **Turing Award**: 1999.
- **Relevância para IDD**: O IDD ataca a complexidade *acidental* (sintaxe, boilerplate, burocracia de ferramentas) com linguagem natural, preservando o espaço do humano para lidar com a complexidade *essencial*. A "integridade conceitual" no IDD vem do Comando Epistêmico do arquiteto.

#### Donald Knuth (n. 1938)
- **Contribuição**: **Literate Programming** (1984) — paradigma onde o programa é apresentado como exposição em linguagem natural, com snippets de código embutidos.
- **Sistema WEB**: "tangle" (gera código executável) + "weave" (gera documentação). O código segue a ordem da lógica humana, não a do compilador.
- **Frase-chave**: "A complex piece of software is, indeed, best regarded as a web that has been delicately pieced together from simple materials."
- **Livros**: *Literate Programming* (1992); *The Art of Computer Programming* (multi-volume).
- **Relevância para IDD**: Knuth demonstrou que o código pode ser *derivado* da explanação em NL — exatamente o que o IDD faz, mas em escala de sistema e com agentes de IA como executores.

#### Tim Berners-Lee (n. 1955)
- **Contribuição**: World Wide Web (proposta 1989, implementação 1991). Visão da **web semântica** — dados linkados por significado, não apenas por URL.
- **Relevância para IDD**: A web semântica é a tentativa de tornar o conhecimento humano *legível por máquinas* — precursor direto do conceito de intenção legível por agentes.

#### Tom Gruber (n. ~1958)
- **Contribuição**: Co-fundador do Siri; pesquisador de ontologias e engenharia do conhecimento. Definição clássica de ontologia em IA: "a specification of a conceptualization."
- **Relevância para IDD**: Ontologias são vocabulários formais de intenção — o IDD usa NL como ontologia informal mas operacionalmente vinculante.

#### Eric Evans
- **Texto fundacional**: *Domain-Driven Design: Tackling Complexity in the Heart of Software* ("The Blue Book", 2003).
- **Contribuições chave**:
  - **Ubiquitous Language**: linguagem compartilhada entre especialistas de domínio e desenvolvedores — mesmos termos no código e nas conversas.
  - **Bounded Contexts**: cada subdomínio tem seu próprio modelo e linguagem.
  - **Domain Events, Aggregates, Entities, Value Objects**.
- **Relevância para IDD**: A "Ubiquitous Language" do DDD é um precursor direto — mas o DDD a materializa em OOP; o IDD a mantém em NL como fonte primária. IDD é o DDD levado a seu limite lógico.

#### Dan North
- **Contribuição**: Behavior-Driven Development (~2006) — extensão do TDD com ênfase em comportamento observável descrito em NL.
- **Formato Gherkin (Cucumber)**: `Given [contexto] / When [evento] / Then [resultado esperado]` — especificações em inglês que se tornam testes executáveis.
- **Empresta de DDD**: ubiquitous language como base para os scenarios.
- **Relevância para IDD**: BDD demonstrou que NL estruturada pode ser *executável*. O IDD generaliza isso de especificações de teste para governança de sistema.

#### Andrej Karpathy (n. 1985)
- **Cargo**: Co-fundador da OpenAI; ex-diretor de IA da Tesla.
- **Contribuições ao paradigma**:
  - 2023: "The hottest new programming language is English." — LLMs estão tão avançados que NL passa a ser linguagem de programação funcional.
  - Fevereiro 2025: Cunhou **"vibe coding"** — coding onde você "fully give in to the vibes, embrace exponentials, and forget that the code even exists."
- **Vibe coding** foi eleito **Palavra do Ano 2025** pelo Collins English Dictionary.
- **Relevância para IDD**: Karpathy identificou o fenômeno (NL como linguagem de programação) mas sem a camada de governança. IDD é vibe coding *com* Comando Epistêmico preservado.

---

## 4. Paradigmas Convergentes e Adjacentes

### 4.1 Literate Programming (Donald Knuth, 1984)

**Definição**: Paradigma onde um programa é apresentado como explanação em linguagem natural (como um ensaio), com snippets de código e macros embutidos. A ordem segue a lógica humana, não a do compilador.

**Mecanismo**:
- **Weaving**: gera documentação legível por humanos.
- **Tangling**: gera código compilável.
- Macros são frases descritivas em NL que escondem chunks de código.

**Relação com IDD**: LP demonstrou que código pode ser *derivado* de NL estruturada. O IDD escala isso para sistemas inteiros com agentes de IA como executores.

**Ressurgimento**: Notebooks computacionais (Jupyter, Wolfram, Pluto.jl) — LP em data science.

### 4.2 Domain-Driven Design (Eric Evans, 2003)

**Definição**: Abordagem de design onde o modelo de software espelha o domínio do negócio através de uma linguagem compartilhada (Ubiquitous Language) entre especialistas de domínio e desenvolvedores.

**Conceitos-chave**:
- **Ubiquitous Language**: mesmo vocabulário no código e nas conversas.
- **Bounded Context**: fronteiras explícitas de cada subdomínio.
- **Domain Events**: eventos que representam algo significativo no domínio.
- **Aggregates, Entities, Value Objects**: padrões de modelagem.

**Relação com IDD**: DDD criou a linguagem ubíqua como ponte entre NL humana e código OOP. IDD elimina o passo de tradução — a NL *é* o artefato primário.

### 4.3 Behavior-Driven Development (Dan North, ~2006)

**Definição**: Método ágil que usa DSL em linguagem natural (Gherkin) como especificações executáveis.

**Formato Gherkin**:
```gherkin
Feature: Designação de publicadores

  Scenario: Atribuir designação a publicador disponível
    Given que o publicador "João" está disponível na semana de 2026-06-01
    When o sistema atribui uma designação de parte de discurso
    Then a designação deve aparecer no quadro da congregação
```

**Ferramentas**: Cucumber, RSpec, SpecFlow.

**Relação com IDD**: BDD usa NL como especificação que vira testes. IDD generaliza isso — NL como governança do sistema inteiro, não apenas dos testes.

### 4.4 Natural Language Programming (NLP-as-programming)

**Definição**: Uso de sentenças em inglês como comandos de programação, compilados para código executável via ontologias.

**Abordagem clássica** (top-down):
1. Definir ontologia do domínio.
2. Definir sentenças válidas.
3. Definir significado operacional de cada sentença.

**Crítica histórica**: Dijkstra (1979) — "On the foolishness of Natural Language Programming" — argumentou que a imprecisão da NL é um obstáculo fundamental.

**Era LLM** (2021+): OpenAI Codex demonstrou que LLMs treinados em código transformam NL em código funcional com alta fidelidade — respondendo parcialmente a Dijkstra.

**Relação com IDD**: NLP-as-programming foca em semântica de execução (NL → código de uma vez); IDD foca em governança contínua (NL como camada persistente sobre todo o ciclo de vida).

### 4.5 Vibe Coding (Andrej Karpathy, 2025)

**Definição**: Prática de desenvolvimento onde o desenvolvedor descreve o que quer em NL, o LLM gera código, e o desenvolvedor aceita sem revisão profunda — "forgetting that the code even exists."

**Características**:
- Colins Word of the Year 2025.
- Usado em projetos descartáveis e de fim de semana.
- 25% dos startups do YC Winter 2025 tinham codebases 95% AI-generated.
- Linus Torvalds usou para componente do AudioNoise (jan/2026).

**Críticas**:
- Security: código AI-generated tem 2.74x mais vulnerabilidades que código humano (Veracode, out/2025).
- Maintainability: code churn quase dobrou; duplicação quadruplicou (GitClear, 2025).
- Debugging: desenvolvedor não entende o código que usa.
- Open Source: "Vibe Coding Kills Open Source" (paper, jan/2026).

**Relação com IDD**: Vibe coding é o fenômeno que IDD *transcende*. Ambos usam NL como interface primária — mas vibe coding abdica do Comando Epistêmico; IDD o preserva estruturalmente.

### 4.6 Prompt Engineering como Disciplina

**Definição emergente**: A arte e ciência de formular prompts eficazes para LLMs — estrutura, contexto, exemplos, restrições.

**Técnicas-chave**:
- **Chain-of-Thought (CoT)**: "Pense passo a passo." — melhora raciocínio.
- **Few-Shot Prompting**: fornecer exemplos no prompt.
- **ReAct (Reason + Act)**: LLM raciocina e age em ciclos.
- **System prompts**: contexto persistente que molda o comportamento do agente.

**Relação com IDD**: Os `.intent.md` são a codificação formal de prompt engineering — não prompts ad-hoc, mas artefatos estruturados, versionados e auditáveis.

### 4.7 Model Context Protocol (MCP)

**Definição**: Protocolo aberto (Anthropic, 2024) para conectar LLMs a ferramentas, APIs e fontes de dados — padronizando como agentes acessam o mundo.

**Relevância para IDD**: MCP é a infraestrutura que permite ao agente IDD executar operacionalmente. Os MCPs são os "adapters pluggables" dos runbooks `.intent.md`.

---

## 5. O que distingue o IDD de cada paradigma adjacente

| Paradigma | O que tem em comum com IDD | Onde para | O que IDD adiciona |
|---|---|---|---|
| **Vibe Coding** | NL como interface primária; LLM como executor | Abdica de entender o código; sem governança | Comando Epistêmico preservado; invariantes; auditabilidade |
| **BDD** | NL estruturada como especificação executável | Limitado a cenários de teste | NL como governança de *todo o sistema*, não só testes |
| **DDD** | Linguagem ubíqua compartilhada; modelagem de domínio | Materializa em código OOP; NL é ponte, não fonte | NL *é* o artefato primário; agente deriva código dela |
| **Literate Programming** | NL como exposição primária; código como detalhe | Foco em legibilidade; humano ainda escreve o código | Agente de IA executa a partir da NL; escala para sistemas |
| **NLP-as-programming** | NL compilada para código executável | Compilação one-shot; sem camada de governança persistente | NL persiste como governança; não é descartada após compilar |
| **Prompt Engineering** | Linguagem natural como interface de controle | Ad-hoc; sem estrutura formal ou auditabilidade | Artefatos versionados, estruturados, com invariantes |

### A distinção fundamental

O que *todos* os paradigmas adjacentes têm em comum é que a NL é um **meio** (para chegar ao código, ao teste, à documentação). No IDD, a NL é um **fim em si mesma** — o artefato de mais alta ordem, que persiste e governa.

---

## 6. Ferramentas Contemporâneas — Materializações parciais do IDD

Estas ferramentas implementam *aspectos* do IDD sem necessariamente identificar-se com o paradigma.

### 6.1 GitHub Copilot (Microsoft/GitHub, 2021)
- **O que é**: Assistente de código AI (GPT-based) integrado ao IDE.
- **Modo IDD**: Autocompletar e geração de código a partir de comentários NL.
- **Limitação**: Reativo; sem camada de governança; sem memória de intenção.
- **URL**: github.com/features/copilot

### 6.2 Cursor (Anysphere, 2023)
- **O que é**: IDE AI-first com modo Composer — geração de código via NL com visão de múltiplos arquivos.
- **Modo IDD**: `.cursorrules` para governança persistente; modo Agent.
- **Limitação**: Governança ad-hoc; sem runbooks formais.
- **URL**: cursor.com

### 6.3 Cline (VS Code Extension)
- **O que é**: Agente autônomo no VS Code — pode criar/editar arquivos, executar comandos, chamar APIs.
- **Modo IDD**: O mais próximo de um executor IDD — segue instruções em NL, lê contexto, age sobre o sistema de arquivos.
- **Relevância para Eliezer**: Usado no workspace RVM Designações / Antigravity.
- **URL**: marketplace.visualstudio.com

### 6.4 Devin (Cognition AI, 2024)
- **O que é**: Primeiro "AI software engineer" — agente que recebe um task em NL e executa fim-a-fim (pesquisa, código, testa, deploya).
- **Modo IDD**: Alta autonomia operacional — mas sem explicitação formal de Comando Epistêmico.
- **URL**: cognition.ai

### 6.5 Claude (Anthropic)
- **O que é**: LLM de alta capacidade com forte seguimento de instruções e longa janela de contexto (200k tokens).
- **Modo IDD**: Ideal para processar `.intent.md` e executar planos multi-passo.
- **Modelos relevantes**: Claude Sonnet 4.5, Claude Opus 4.
- **URL**: anthropic.com/claude

### 6.6 Aider
- **O que é**: AI pair programming via CLI — conversa em NL, edita arquivos, faz commits git.
- **Modo IDD**: Próximo de executor IDD para projetos locais.
- **URL**: aider.chat

### 6.7 CrewAI
- **O que é**: Framework Python para orquestração de múltiplos agentes AI com papéis definidos.
- **Modo IDD**: Permite definir agentes com papéis e intenções específicos — próximo de AEON.
- **URL**: crewai.com

### 6.8 OpenAI Codex / GPT-4o
- **O que é**: O modelo foundational que provou que NL pode ser compilada para código funcional de alta qualidade.
- **Codex** (2021): Fine-tuned de GPT-3 em código — demo que NL é linguagem de programação.
- **URL**: openai.com

### 6.9 Supabase
- **O que é**: Backend-as-a-Service (PostgreSQL + Auth + Storage + Realtime).
- **Relevância IDD**: Infraestrutura de dados que os agentes IDD operam — MCP disponível para acesso direto.
- **URL**: supabase.com

### 6.10 Ferramentas MCP relevantes
- **supabase MCP**: acesso direto ao banco de dados via agente.
- **filesystem MCP**: agente lê/escreve sistema de arquivos local.
- **shell MCP**: agente executa comandos de terminal.
- **playwright MCP**: agente interage com browsers.
- **github MCP**: agente interage com repositórios GitHub.

---

## 7. Vozes Contemporâneas — YouTube, Podcasts, Blogs

### 7.1 YouTube

| Canal / Criador | Foco | Relevância IDD |
|---|---|---|
| **Andrej Karpathy** | Deep learning, LLMs, vibe coding | Alto — cunhou "vibe coding"; perspectiva de quem construiu os modelos |
| **Lex Fridman** | Entrevistas profundas com líderes de AI | Alto — entrevistou Karpathy, Altman, Musk, Hinton, LeCun, Bengio |
| **ThePrimeagen (ThePrimeTime)** | Engenharia de software, crítica de AI coding | Médio — voz crítica sobre vibe coding e qualidade de código |
| **Fireship** | Tutoriais rápidos de tech, AI tools | Médio — cobertura de Cursor, Copilot, Cline |
| **Matt Wolfe** | AI tools reviews | Baixo-médio — overview de ferramentas |
| **Sam Altman** | OpenAI (aparições em podcasts) | Alto — visão do futuro da AI e coding |
| **Simon Willison** | AI coding tools, SQLite, observabilidade | Alto — distinção entre vibe coding e uso responsável de LLMs |

### 7.2 Podcasts

| Podcast | Hosts | Foco | Relevância IDD |
|---|---|---|---|
| **Lex Fridman Podcast** | Lex Fridman | AI, ciência, filosofia | Alto — entrevistas fundacionais |
| **Latent Space** | swyx (Shawn Wang), Alessio Fanelli | AI Engineering, LLMs | Alto — comunidade AI Engineer; cunharam o termo |
| **The Pragmatic Engineer** | Gergely Orosz | Engenharia de software, carreira | Médio — cobertura de AI no trabalho |
| **Hard Fork (NYT)** | Kevin Roose, Casey Newton | Tech/AI para público amplo | Baixo-médio — primeiro artigo sobre vibe coding |
| **Changelog** | Adam Stacoviak, Jerod Santo | Open Source, software | Médio — entrevistas com criadores de ferramentas |
| **TWIML AI Podcast** | Sam Charrington | ML/AI técnico | Médio — pesquisa e aplicações |

### 7.3 Blogs e Newsletters

| Fonte | Autor | Foco | Relevância IDD |
|---|---|---|---|
| **simonwillison.net** | Simon Willison | AI tools, LLMs, segurança | **Muito alto** — melhor curadoria prática de AI coding |
| **karpathy.ai** | Andrej Karpathy | Deep learning, AI | **Muito alto** — perspectiva dos criadores |
| **The Pragmatic Engineer** | Gergely Orosz | Engenharia de software | Alto |
| **Lenny's Newsletter** | Lenny Rachitsky | Product/Growth | Baixo-médio |
| **Import AI** | Jack Clark | AI research weekly | Alto — cobertura de papers |
| **The Batch (DeepLearning.AI)** | Andrew Ng | AI semanal | Médio-alto |
| **Anthropic Blog** | Anthropic | Claude, AI safety | Alto |
| **OpenAI Blog** | OpenAI | GPT, Codex, research | Alto |
| **LessWrong** | Comunidade | AI alignment, raciocínio | Médio — background filosófico |

### 7.4 Figuras-chave a seguir

| Figura | Por quê |
|---|---|
| **Simon Willison** | Melhor voz sobre uso responsável de LLMs em código; distingue vibe coding de AI-assisted disciplined coding |
| **Andrej Karpathy** | Cunhou os conceitos-chave; perspectiva técnica fundacional |
| **Swyx / Shawn Wang** | Cunhou "AI Engineer"; cuida da comunidade AI Engineering |
| **Andrew Ng** | Voz crítica sobre o termo vibe coding; perspectiva de educação em AI |
| **Sam Altman** | Visão de AGI e como muda o desenvolvimento de software |
| **Demis Hassabis** | DeepMind / Google; perspectiva científica sobre AI |

---

## 8. Textos-Chave — Artigos, Papers e Livros Fundacionais

### 8.1 Artigos / Papers Históricos (leitura obrigatória)

| Título | Autor | Ano | Link / Fonte |
|---|---|---|---|
| "As We May Think" | Vannevar Bush | 1945 | [The Atlantic](https://www.theatlantic.com/magazine/archive/1945/07/as-we-may-think/303881/) |
| "Man-Computer Symbiosis" | J.C.R. Licklider | 1960 | IRE Transactions on Human Factors in Electronics |
| "Augmenting Human Intellect: A Conceptual Framework" | Douglas Engelbart | 1962 | [Stanford](https://www.dougengelbart.org/content/view/138) |
| "Literate Programming" | Donald Knuth | 1984 | [The Computer Journal, 27(2)](http://www.literateprogramming.com/knuthweb.pdf) |
| "No Silver Bullet" | Fred Brooks | 1987 | IEEE Computer, April 1987 |
| "Evaluating Large Language Models Trained on Code" (Codex) | Chen et al. (OpenAI) | 2021 | [arXiv:2107.03374](https://arxiv.org/abs/2107.03374) |
| "Chain-of-Thought Prompting Elicits Reasoning in LLMs" | Wei et al. | 2022 | [arXiv:2201.11903](https://arxiv.org/abs/2201.11903) |
| "Vibe Coding Kills Open Source" | Koren et al. | 2026 | [arXiv:2601.15494](https://arxiv.org/abs/2601.15494v1) |

### 8.2 Livros Fundacionais

| Livro | Autor | Ano | Por quê ler |
|---|---|---|---|
| *The Mythical Man-Month* | Fred Brooks | 1975 | Complexidade essencial vs. acidental; integridade conceitual |
| *Literate Programming* | Donald Knuth | 1992 | NL como exposição primária; código como detalhe |
| *Domain-Driven Design* | Eric Evans | 2003 | Ubiquitous Language; Bounded Contexts; modelagem de domínio |
| *The Art of Computer Programming* (4 vols.) | Donald Knuth | 1968+ | Rigor algorítmico que IDD libera o humano de fazer manualmente |
| *The Design of Design* | Fred Brooks | 2010 | Design como atividade central; integridade conceitual revisitada |
| *Paradigms of AI Programming* | Peter Norvig | 1992 | Fundações de AI simbólica; raciocínio explícito |
| *Artificial Intelligence: A Modern Approach* | Russell & Norvig | 1995+ | Referência universal em AI |
| *Clean Architecture* | Robert C. Martin | 2017 | Separação de concerns; interfaces estáveis — relevante para adapters IDD |

### 8.3 Papers Contemporâneos Relevantes

| Título | Foco | Link |
|---|---|---|
| "ReAct: Synergizing Reasoning and Acting in Language Models" | Agentes LLM que raciocinam e agem | [arXiv:2210.03629](https://arxiv.org/abs/2210.03629) |
| "Toolformer: Language Models Can Teach Themselves to Use Tools" | LLMs usando ferramentas externas | [arXiv:2302.04761](https://arxiv.org/abs/2302.04761) |
| "Self-Refine: Iterative Refinement with Self-Feedback" | LLMs refinando próprio output — ciclo de qualidade | [arXiv:2303.17651](https://arxiv.org/abs/2303.17651) |
| "Measuring Developer Productivity Impact of AI Coding Tools" | Impacto real em produtividade (METR, 2025) | [arXiv:2507.09089](https://arxiv.org/abs/2507.09089) |

---

## 9. Sites e Comunidades

### 9.1 Comunidades Técnicas

| Site | Foco | URL |
|---|---|---|
| **Hacker News** | Tech/startup discussions; forte cobertura de AI coding | news.ycombinator.com |
| **r/LocalLLaMA** | LLMs open source; execução local | reddit.com/r/LocalLLaMA |
| **r/MachineLearning** | Pesquisa em ML | reddit.com/r/MachineLearning |
| **AI Engineer Foundation** | Comunidade AI Engineering (swyx) | aiengineer.foundation |
| **LessWrong** | AI alignment, raciocínio formal | lesswrong.com |
| **Alignment Forum** | AI safety research | alignmentforum.org |

### 9.2 Ferramentas e Documentações

| Recurso | URL |
|---|---|
| Anthropic Claude Docs | docs.anthropic.com |
| OpenAI Platform Docs | platform.openai.com/docs |
| LangChain | langchain.com |
| CrewAI Docs | docs.crewai.com |
| Supabase Docs | supabase.com/docs |
| MCP Specification | modelcontextprotocol.io |
| Cursor Docs | cursor.com/docs |
| Cline (VS Code) | github.com/cline/cline |

### 9.3 Leitura de referência on-line

| Recurso | URL |
|---|---|
| Literate Programming site | literateprogramming.com |
| Doug Engelbart Institute | dougengelbart.org |
| "As We May Think" (original) | theatlantic.com/magazine/archive/1945/07/as-we-may-think/303881/ |
| Simon Willison's Weblog | simonwillison.net |
| Andrej Karpathy Blog | karpathy.ai |

---

## 10. AEON e RVM Designações — IDD em produção

### 10.1 Projeto AEON

**AEON** é a materialização conceitual do IDD de Eliezer — um orquestrador semântico que traduz intenções humanas em arquiteturas de sistema.

#### O Acróstico do AEON
* **A**rquitetura ditada puramente pela intenção humana.
* **E**volução contínua que dispensa a sintaxe do código tradicional.
* **O**rquestração fluida entre múltiplos agentes autônomos.
* **N**exus central traduzindo o pensamento direto para a malha digital.

**Stack**:
- Antigravity (workspace de desenvolvimento)
- Cline (executor de agente no VS Code)
- CrewAI (multi-agent orchestration)
- MCPs: supabase, filesystem, shell, playwright, github
- VS Code como IDE principal
- Supabase como backend de dados

**Princípio de design**:
1. Humano declara intenção em `.intent.md` (NL estruturada).
2. AEON/agente lê, planeja (fases genéricas + adapters específicos).
3. Human aprova com "go" (confirm-once).
4. Agente executa até o fim, rastreando cada ação até a intenção.
5. Relatório pós-execução + memória persistida.

### 10.2 RVM Designações como Living Implementation

**RVM Designações** é o projeto de produção onde IDD é praticado diariamente:

- **Domínio**: Gestão de designações de reuniões para congregação religiosa.
- **Repositório**: `rvm-designacoes-unified` (Supabase + Next.js + TypeScript).
- **Artefatos IDD presentes**:
  - `.agents/workflows/rotate-secrets.intent.md` — primeiro runbook de intenção criado.
  - `/memories/repo/*.md` — memória persistente de todas as decisões arquiteturais.
  - MCPs configurados em `.vscode/mcp.json`.
  - **DAV implementado** (2026-05-23): 9 handlers `QUERY_*` em `agentActionService.ts` + fast-path pré-LLM com 7 famílias de regex PT-BR em `TemporalChat.tsx`. Primeira implementação de referência do princípio §2.5 em produção.

**Bounded Contexts do RVM** (DDD aplicado):
- Publicadores (cadastro, disponibilidade, histórico).
- Designações (geração, atribuição, aprovação, substituição).
- Workbook (calendário congregacional).
- Notificações (portal de confirmação, links tokenizados).
- Privilégios e permissões.

**Evidência empírica do IDD**:
- Cada nova funcionalidade começa com declaração de intenção.
- Agente (GitHub Copilot / Claude) executa operacionalmente.
- Eliezer retém julgamento sobre requisitos, UX, regras de negócio.
- Resultado: sistema de produção em produção ativa, construído com velocidade inviável sem IDD.

---

## 11. Mapa Visual da Linhagem

```
TECNOLOGIA AUGMENTA O HUMANO
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA FILOSÓFICA (1945–1975)                                  │
│                                                                 │
│  Bush 1945          Licklider 1960         Engelbart 1962       │
│  "Memex"            "Man-Computer          "Augmenting Human    │
│  Associação         Symbiosis"             Intellect"           │
│  Augmentação        Parceria cognitiva     NLS + Mouse + Demo   │
│       │                   │                      │              │
│       └───────────────────┴──────────────────────┘              │
│                           │                                     │
│              Sutherland 1963 + Nelson 1965                      │
│              GUI / Hypertext                                    │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA DE PARADIGMAS (1970–2006)                               │
│                                                                 │
│  Kay 1970s          Brooks 1975/1987       Knuth 1984           │
│  OOP/Smalltalk      "No Silver Bullet"     Literate Programming  │
│  "Messaging"        Complexidade           NL como exposição    │
│  Dynabook           essencial vs.          primária             │
│                     acidental                                   │
│       │                   │                      │              │
│  Berners-Lee 1989   Evans 2003            North 2006            │
│  Web Semântica      DDD/Ubiquitous        BDD/Gherkin           │
│  Ontologias         Language              NL executável         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA IA (2021–2025)                                          │
│                                                                 │
│  OpenAI Codex 2021       Karpathy 2023           Karpathy 2025  │
│  NL → Código funcional   "English is the         Vibe Coding    │
│  (demonstração empírica)  hottest language"      (sem governança)│
│                                                                 │
│  Cursor / Copilot / Cline / Devin / Claude — ferramentas       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  IDD — INTENT-DRIVEN DEVELOPMENT (Eliezer Rosa)                 │
│                                                                 │
│  • NL como artefato primário E governança persistente           │
│  • Comando Epistêmico humano (o quê/porquê)                     │
│  • Comando Operacional delegado ao agente (o como)              │
│  • Augmenting ≠ Automating                                      │
│  • Artefatos: .intent.md (runbooks de intenção)                 │
│  • Invariantes de negócio como salvaguardas                     │
│  • Auditabilidade completa                                      │
│                                                                 │
│  Materializações: AEON (conceito) + RVM Designações (produção)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Glossário

| Termo | Definição |
|---|---|
| **IDD** | Intent-Driven Development — paradigma onde NL é a fonte primária de especificação e governança. |
| **Intenção** | Declaração em NL que define o *quê* e o *porquê* de uma ação ou sistema. |
| **Artefato de intenção** | Arquivo `.intent.md` que contém a intenção estruturada, fases, adapters e invariantes. |
| **Comando Epistêmico** | Autoridade sobre o quê e o porquê. Sempre humano. |
| **Comando Operacional** | Autoridade sobre o como. Pode ser delegado ao agente. |
| **Augmenting** | Ampliar capacidades humanas; o humano permanece no loop epistêmico. |
| **Automating** | Remover o humano do loop; sem garantia de alinhamento com intenção. |
| **Fé Bayesiana** | Confiança no agente proporcional às evidências; distinta de credulidade cega. |
| **Confirm-once** | Padrão de aprovação: humano aprova o plano uma vez; agente executa até o fim. |
| **Invariante** | Restrição não-negociável codificada na intenção; o agente não pode violá-la. |
| **Adapter** | Componente plugável que traduz intenção genérica para provider específico (Supabase, GitHub, etc.). |
| **AEON** | Orquestrador semântico que materializa IDD (**A**rquitetura, **E**volução, **O**rquestração, **N**exus). |
| **Vibe Coding** | Prática de aceitar código AI-generated sem revisão; sem Comando Epistêmico. |
| **Ubiquitous Language** | (DDD) Vocabulário compartilhado entre especialistas de domínio e desenvolvedores. |
| **Bounded Context** | (DDD) Fronteira explícita de um subdomínio com seu próprio modelo e linguagem. |
| **Literate Programming** | (Knuth) Paradigma onde NL é a exposição primária; código é detalhe. |
| **BDD** | Behavior-Driven Development — NL (Gherkin) como especificação executável de comportamentos. |
| **MCP** | Model Context Protocol — protocolo aberto para conectar LLMs a ferramentas. |

---

*Base de conhecimento compilada com base em pesquisa exaustiva de fontes primárias (Wikipedia, artigos originais) e síntese do paradigma IDD de Eliezer Rosa. Atualizar conforme o paradigma evolui.*

**Última atualização**: 2026-05-09  
**Compilado por**: GitHub Copilot (Claude Sonnet 4.6) em colaboração com Eliezer Rosa
