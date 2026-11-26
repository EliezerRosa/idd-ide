# IDD — Genealogia Intelectual, Limites Técnicos, Convergências Industriais e Auditoria em Código Duro (v2)

- **Referência:** *Intent-Driven Development* (IDD), na formulação de Eliézer Rosa
- **Base documental e de código:** Cânone IDD `v1.0-rc1` (`paradigma/00-canone/IDD-CANONE.md`); Matriz de Afirmações (`paradigma/00-canone/AFIRMACOES.md`); repositório `EliezerRosa/idd-ide` (auditoria direta em `cli/src/`, `packages/core/`, `packages/eslint-plugin-idd/`, `extensions/idd-core/`, `docs/`); literatura acadêmica e técnica referenciada na Seção 11.
- **Corte da pesquisa e da auditoria:** 25 de novembro de 2026.
- **Natureza desta revisão (v2):** Reescrita integral incorporando correções bibliográficas (notadamente a autoria de EARS), redução da inflação genealógica, inclusão das objeções estruturais (*spec rot* / lição do MDA, limites de regenerabilidade com LLMs, modelo de ameaça agêntico local vs. servidor e incompletude de análise AST em TypeScript), reequilíbrio da matriz comparativa por escala/maturidade, auditoria direta em código-fonte e agenda experimental com critérios explícitos de refutação.

---

## 1. O problema central e as quatro dimensões do IDD

Durante décadas, a engenharia de software procurou aproximar o que o ser humano deseja expressar daquilo que a máquina efetivamente executa, sem perder previsibilidade nem controle estrutural. Compiladores, linguagens de alto nível, programação declarativa, engenharia de requisitos, verificação formal, modelagem dirigida por modelos (MDA/MDE) e, mais recentemente, agentes baseados em grandes modelos de linguagem (LLMs) atacaram fatias distintas desse mesmo problema.

O **Cânone IDD `v1.0-rc1`** define o paradigma como uma disciplina de engenharia de software com IA em que a intenção humana — escrita inicialmente em linguagem natural — atua como **fonte de autoridade** do sistema; essa intenção é desambiguada e compilada em **contratos estruturados** (invariantes, vocabulário de ações, fronteiras de mutação e critérios de aceite) submetidos a **verificações determinísticas** contínuas.

Em uma frase:

> **O humano determina o quê e o porquê; a IA desenvolve o como; contratos e verificadores determinísticos fiscalizam a conformidade.**

Para evitar confundir teses conceituais com artefatos já entregues em software, o Cânone separa o termo "IDD" em quatro camadas:

| Camada | Pergunta fundamental | Elementos centrais |
| --- | --- | --- |
| **Filosofia** | Quem decide o quê? | Comando Epistêmico humano, autonomia graduada (Fé Bayesiana), *Augmenting ≠ Automating* |
| **Método** | Como desenvolver? | Fase 0 investigativa (intenção, invariantes, dicionário ubíquo, MER, UML, casos de uso, estados, métodos circunscritos) e governança contínua |
| **Arquitetura** | Como o sistema se comporta? | DAV (*Deterministic Action Vocabulary*), *fast-path* pré-LLM, contratos versionados e barreiras de mutação |
| **Ferramenta** | Onde executar? | CLI `idd`, núcleo `@idd/core`, plugin ESLint, LSP experimental, extensão VS Code e projeto futuro de IDE dedicada |

---

## 2. Genealogia direta: os antecedentes que realmente estruturam o IDD

Toda ferramenta contemporânea de software descende da história geral da lógica formal, da computabilidade e das linguagens de programação — de Leibniz, Boole, Frege, Church e Turing a John von Neumann, Backus e Grace Hopper. Dois alertas dessa base clássica, contudo, permanecem diretamente vinculantes para o IDD e não podem ser diluídos em retórica histórica:

1. **Limites de decidibilidade (Gödel, 1931; Turing, 1936; Rice, 1953):** propriedades semânticas arbitrárias de programas gerais são indecidíveis. Nenhum verificador estático geral pode prometer prova universal de correção sobre linguagens Turing-completas.
2. **A ilusão da linguagem natural (Hopper / FLOW-MATIC, 1955–1959; COBOL):** escrever instruções com aparência de inglês comercial nunca significou que a máquina "compreendeu" a intenção humana. A clareza aparente de um texto disfarça ambiguidade estrutural — ponto radicalizado por Dijkstra em 1979.

Fora esses dois limites fundacionais, a avaliação técnica séria do IDD depende não de listar dezenas de pioneiros genéricos da computação, mas de situá-lo frente aos **seis troncos diretos** que já enfrentaram problemas vizinhos ou concorrentes.

### 2.1. Engenharia de requisitos e intenção explícita

- **Pamela Zave e Michael Jackson (*Four Dark Corners of Requirements Engineering*, 1997):** estabeleceram a distinção formal mais útil para o IDD entre propriedades do domínio ($D$), requisitos do interessado ($R$), especificação da interface do sistema ($S$) e implementação ($P$). A condição central de adequação é:

$$D, S \vdash R$$

Ou seja: assumindo o que é verdadeiro no domínio do mundo real ($D$), a especificação do sistema ($S$) deve implicar logicamente os requisitos desejados ($R$). Jackson aprofundou essa separação em *Problem Frames* (2001).
- **Nancy G. Leveson (*Intent Specifications*, 2000):** um dos antecedentes acadêmicos mais próximos do uso técnico de "intenção" em especificações de sistemas críticos. Organiza a especificação em camadas explícitas conectando o *porquê* (metas e restrições de segurança), o *quê* (princípios e comportamento) e o *como* (projeto físico), com foco em compreensão e revisão humana.
- **Charles Simonyi (*Intentional Programming*, 1995):** propôs elevar a intenção de domínio à abstração primária em árvores sintáticas/semânticas editáveis, separando a representação da intenção de sua renderização textual em código.
- **Alistair Cockburn (2000):** estruturação de casos de uso voltados a objetivos e transações de negócio.
- **Alistair Mavin, Philip Wilkinson, Adrian Harwood e Mark Novak (EARS — *Easy Approach to Requirements Syntax*, 2009):** propuseram padrões sintáticos leves em linguagem natural controlada (*Ubiquitous*, *Event-driven*, *State-driven*, *Optional feature*, *Unwanted behaviour*) para reduzir ambiguidade sem exigir notação matemática pesada — linhagem diretamente adotada pela Fase 0 do IDD e por ferramentas recentes como o AWS Kiro. *(Nota editorial: não confundir EARS com o processo **Volere**, criado por **Suzanne Robertson e James Robertson**, que atua na mesma arena de qualidade de requisitos por outra via metodológica.)*

### 2.2. Verificação formal, contratos e testes baseados em propriedades

- **Robert W. Floyd (1967), C. A. R. Hoare (1969) e Edsger W. Dijkstra (1975):** fundamentaram o raciocínio axiomático sobre programas. Na tripla de Hoare:

$$\{P\}\ S\ \{Q\}$$

se a pré-condição $P$ vale antes de $S$ e $S$ termina, então a pós-condição $Q$ deve valer após a execução.
- **Bertrand Meyer (*Design by Contract*, Eiffel 1986; *Object-Oriented Software Construction*, 1988; IEEE Computer, 1992):** trouxe pré-condições, pós-condições e invariantes de classe para o centro da engenharia orientada a objetos.
- **Métodos formais industriais e verificação estática avançada:** Jean-Raymond Abrial (B e Event-B), Leslie Lamport (TLA+), Clarke & Emerson (*model checking*), Patrick e Radhia Cousot (interpretação abstrata), John Reynolds & Peter O'Hearn (lógica de separação) e K. Rustan M. Leino (Dafny).
- **Testes baseados em propriedades (*Property-Based Testing*):** iniciados por Claessen & Hughes (QuickCheck, 2000) e popularizados em ecossistemas modernos (`Hypothesis`, `fast-check`). Constituem a ponte pragmática mais barata entre uma invariante declarada em contrato e sua falsificação automatizada em execução — caminho mais próximo do cotidiano industrial do que provas completas em SMT/Lean.

### 2.3. Teoria relacional, modelagem conceitual e linguagem do domínio

- **Edgar F. Codd (1970), William W. Armstrong (1974), Peter Chen (1976) e Ronald Fagin (1977–1981):** estabeleceram a modelagem independente da navegação física, os axiomas de inferência sobre dependências funcionais, o modelo Entidade-Relacionamento e a teoria de normalização.
- **G. M. Nijssen (NIAM) e Terry Halpin (ORM — *Object-Role Modeling*):** mostraram que esquemas conceituais podem ser verbalizados em sentenças controladas e validados com especialistas de negócio. Michael Hammer e Dennis McLeod (SDM, 1981) ampliaram a modelagem semântica de dados.
- **Eric Evans (*Domain-Driven Design*, 2003) e Dan North (BDD, 2006):** forneceram os conceitos de *Ubiquitous Language*, *Bounded Contexts* e critérios executáveis (`Given/When/Then`). O IDD apropria-se de ambos tentando converter a Linguagem Ubíqua de convenção cultural em gate determinístico de CI.

### 2.4. Engenharia de software, complexidade essencial e a lição histórica do MDA/CASE

- **Fred Brooks (*No Silver Bullet*, 1987):** separou **complexidade essencial** (entender o problema, decidir regras, conciliar restrições) de **complexidade acidental** (sintaxe, boilerplate, atrito de ferramentas). Gerar código mais rápido com LLMs ataca majoritariamente a complexidade acidental; a complexidade essencial migra integralmente para especificação, verificação e manutenção.
- **David Parnas (1972), Donald Knuth (*Literate Programming*, 1984) e Manny Lehman (leis de evolução de software):** reforçaram encapsulamento, primazia da exposição humana e inevitabilidade da mudança contínua em sistemas reais.
- **OMG MDA/MDE (2001) e ferramentas CASE dos anos 1990:** o ancestral cujo fracasso parcial oferece a advertência mais severa ao IDD (detalhada na Seção 3.2).

### 2.5. Cognição, semântica pragmática e ironias da automação

- **J. C. R. Licklider (1960), Douglas Engelbart (1962) e Peter Naur (*Programming as Theory Building*, 1985):** defenderam a ampliação do intelecto humano e lembraram que o ativo central de um software vivo não é apenas o texto do código, mas a **teoria mental** que a equipe mantém sobre como o programa se relaciona com o mundo.
- **Lisanne Bainbridge (*Ironies of Automation*, 1983):** demonstrou que automatizar as partes rotineiras de um processo frequentemente torna a supervisão humana *mais difícil*, não mais fácil — degradando a proficiência do operador exatamente para os casos de exceção em que a intervenção humana é crítica. Em engenharia assistida por agentes, revisar grandes diffs gerados por IA sem compreensão profunda reproduz exatamente essa ironia.
- **Semântica e pragmática (Wittgenstein, Austin, Searle, Grice, Fillmore):** o significado de uma frase depende de contexto, implícitos e convenções de uso. Linguagem natural nunca é autossuficiente como especificação executável.

### 2.6. IA generativa e engenharia de agentes (2024–2026)

Modelos baseados na arquitetura Transformer (Vaswani et al., 2017) viabilizaram a interpretação estatística de linguagem natural e a síntese de código plausível. Contudo, **plausibilidade estatística não implica correção lógica**. Entre 2025 e 2026, a indústria deslocou-se rapidamente da empolgação inicial com *vibe coding* (Karpathy, 2025) para disciplinas centradas em especificação, controle de ambiente e verificação mecânica (*Spec-Driven Development* e *Harness Engineering*).

---

## 3. As três objeções estruturais que o IDD precisa enfrentar

Um parecer rigoroso não pode limitar-se a mostrar parentesco intelectual; precisa explicitar onde o paradigma pode quebrar na prática.

### 3.1. Verificação versus Validação (o corte de Zave & Jackson e Dijkstra)

Em *On the Foolishness of "Natural Language Programming"* (EWD667, 1979), Edsger Dijkstra argumentou que a linguagem natural permite enunciados aparentemente razoáveis que ocultam contradições e omissões graves — e que a formalização não é burocracia, mas o instrumento que força precisão de pensamento.

O IDD responde propondo uma ponte em cinco etapas: intenção em linguagem natural → detecção de ambiguidades → fixação de vocabulário ubíquo → compilação em contrato estruturado → verificação determinística do código. Essa resposta enfrenta diretamente o problema operacional, mas **não elimina a fronteira entre verificação e validação**:

- **Verificação ($P \models S$):** o código produzido satisfaz o contrato `.intent.yaml`?
- **Validação ($D, S \vdash R$):** o contrato `.intent.yaml` formalizou corretamente a intenção humana e as premissas críticas do domínio?

**Exemplo concreto:** um usuário pede "um mecanismo de transferência bancária". O agente interpreta que a operação pode ocorrer sem autenticação reforçada; o contrato é redigido sem essa restrição, aprovado superficialmente pelo humano e verificado com 100% de aderência pelo Hard Gate e pela suíte de testes. O sistema passa em todas as verificações e **ainda assim está errado em produção**, porque o contrato formalizou uma interpretação falha.

Consequência direta: Hard Gates detectam violações *ao contrato*; eles não detectam um contrato mal concebido. A validação semântica precisa ocorrer na Fase 0 (diálogo estruturado, revisão humana ativa, testes de contraexemplos) — sob pena de o IDD apenas produzir sistemas *determinísticamente fiéis a especificações erradas*.

### 3.2. *Spec Rot*, dupla manutenção e o limite da tese de "código regenerável"

Duas lições históricas do MDA/CASE e da engenharia de sistemas em produção atingem diretamente a formulação canônica do IDD:

1. **O dilema da precisão vs. dupla manutenção (*Spec Rot*):** a experiência do OMG MDA/MDE e das ferramentas CASE mostrou que, se uma especificação busca eliminar toda ambiguidade para gerar código de produção, sua densidade semântica aproxima-se da própria linguagem de programação (apenas trocando sintaxe de código por sintaxe de diagramas/YAML). Se permanece mais abstrata, decisões críticas de implementação vivem no código, e sob pressão de entrega o código evolui mais rápido que o contrato — gerando **dupla manutenção** e deterioração (*spec rot*). A única saída viável é provar empiricamente que o custo de manter `intenção + contrato` em ciclos de mudança reais é menor que o custo de manter `código + testes` em um *harness* convencional.
2. **Escrutínio sobre a tese de "código derivado e regenerável":** o Cânone descreve o código como *"derivado e regenerável"*. Na prática com LLMs, essa afirmação exige qualificação severa:
   - A geração via LLM é **não determinística** mesmo com o mesmo contrato e modelo fixado.
   - Sistemas reais em produção acumulam decisões implícitas de performance, concorrência, tratamento de *hotfixes*, migrações de estado persistido em banco e comportamentos observáveis dos quais clientes externos passam a depender (*Hyrum's Law*).
   - Regenerar módulos descartando esse histórico invisível no contrato tende a introduzir regressões silenciosas (*Chesterton's Fence*).

Portanto, **regenerabilidade não deve ser vendida como propriedade geral do paradigma**, mas como hipótese restrita a componentes isolados sem estado legado ou protegidos por suítes fortes de regressão e testes de propriedade.

### 3.3. Modelo de ameaça agêntico: enforcement local versus fronteira de confiança no servidor

Uma lacuna recorrente em propostas de governança para agentes de código — incluindo hooks locais no estilo AWS Kiro ou pre-commit hooks tradicionais — é tratar restrições locais como barreiras de segurança.

Quando um agente autônomo opera na máquina local com acesso a shell e sistema de arquivos, ele pode:
- ignorar hooks locais (`git commit --no-verify`);
- editar o arquivo `.intent.yaml` simultaneamente ao código-fonte para "ajustar" o contrato ao erro cometido;
- alterar regras locais de linter ou suprimir alertas com diretivas inline.

Logo, o IDD precisa separar explicitamente duas camadas:
1. **Feedback rápido local (CLI, LSP, ESLint, Git hooks):** reduz ciclos de erro durante a sessão de desenvolvimento, mas **não constitui garantia de contenção** contra agentes autônomos.
2. **Fronteira de confiança no servidor:** *branch protection*, CI obrigatório rodando verificações determinísticas em ambiente isolado, `CODEOWNERS` exigindo aprovação humana explícita para alterações em `*.intent.yaml`, dicionário ubíquo e `decisoes.md`, além de verificação de integridade criptográfica das decisões humanas aprovadas.

Sem a camada de servidor, o "Comando Epistêmico humano" permanece uma convenção de boas práticas, não um controle técnico resistente a bypass.

---

## 4. Arquitetura conceitual do IDD: Soft Gates, Hard Gates e limites de AST

A arquitetura proposta no IDD organiza o fluxo de decisão em duas categorias de controle ligadas pelo contrato declarativo:

```
Intenção humana (LN) → Soft Gates (interpretação assistida + desambiguação)
                     → Contrato estruturado (.intent.yaml + dicionário + decisões)
                     → Implementação (agente / humano)
                     → Hard Gates locais (feedback rápido) + CI/Servidor (barreira de confiança)
```

### 4.1. Soft Gates e o status científico da SHALA

Nos Soft Gates, o LLM auxilia a elicitar intenções, apontar lacunas, propor termos para o dicionário e redigir minutas de contrato. A proposta **SHALA** sugere usar entropia de Shannon sobre interpretações concorrentes como métrica de ambiguidade.

**Limitação científica:** entropia sobre distribuição de tokens ou sobre amostras de respostas de um LLM mede dispersão estocástica do modelo, não necessariamente incerteza semântica real sobre a intenção humana — modelos podem exibir baixíssima entropia (alta confiança) em interpretações consensualmente erradas (*overconfident hallucination*). Enquanto não houver calibração empírica comparando o escore SHALA contra taxas reais de divergência humana, a SHALA deve ser tratada estritamente como **indicador consultivo heurístico**, não como métrica calibrada de ambiguidade.

### 4.2. Hard Gates e limites estruturais de análise AST em TypeScript/JavaScript

Os Hard Gates buscam retirar do LLM o papel de juiz final da própria implementação, usando mecanismos determinísticos: schema validation, dicionário ubíquo, checagem de fronteiras de importação, normalização relacional e cercas de mutação de estado (`allowed_fields`, `read_only_fields`, `@mutates`, `@readonly`).

Entretanto, é tecnicamente indispensável explicitar o **limite de completude (*soundness*)** das cercas baseadas em AST sobre TypeScript/JavaScript (seja via TypeScript Compiler API ou ESLint):
- **Análise intraprocedural e em arquivo único não fecha todos os vetores de mutação.** Um método pode contornar a verificação de `this.campo = ...` por meio de:
  - *aliasing* passado a funções auxiliares externas (`mutar(this)` ou `const ref = this.objeto; helper(ref)`);
  - reflexão e mutação dinâmica (`Object.assign(alvo, patch)`, `Reflect.set`, `Object.defineProperty`, acesso indexado dinâmico `obj[chave] = valor`);
  - supressões de tipo (`as any`, `@ts-ignore`) e fechamentos (*closures*) assíncronos armazenados fora do método.
- No repositório atual, a cerca (`mutationFence.ts` + `astGraph.ts`) mitiga parte dos casos triviais — incluindo aliases diretos locais de `this`, acessores `get`/`set` e rejeição determinística (`INV-UI-05`) para mutações dinâmicas diretas em `this[expr]` —, mas **não realiza análise interprocedural *whole-program* nem prova *sound* de imutabilidade**. Deve ser comunicada como **cerca de defesa em profundidade de alto custo-benefício**, não como barreira matematicamente intransponível.

---

## 5. Convergências industriais nas Big Techs (2024–2026)

As grandes empresas de tecnologia não estão construindo "o IDD", mas convergem em problemas idênticos: restringir o espaço de ação de agentes, formalizar especificações antes do código e substituir julgamento probabilístico por verificadores determinísticos onde o risco exige rigor.

### 5.1. Palantir AIP — Ontologia operacional e ações tipadas
O núcleo do Palantir AIP é a **Ontology**, que modela conjuntamente substantivos (objetos, propriedades, relações) e verbos (**Actions** com regras, efeitos colaterais e permissões). A proximidade com o princípio DAV do IDD (vocabulário fechado de ações) é clara; a diferença está no modelo de entrega (plataforma corporativa centralizada vs. artefatos abertos em repositório Git).

### 5.2. Microsoft TypeChat e TypeSpec
O **TypeChat** usa definições de tipos TypeScript para restringir e validar a saída estruturada de LLMs, com reparo iterativo quando a tipagem falha. É uma aproximação prática da separação entre interpretação probabilística e validação estrutural, mas validar conformidade de schema JSON não garante invariantes comportamentais de negócio. Já o **TypeSpec** consolida especificação declarativa compilável para contratos de API, com foco técnico em interfaces e não na elicitação de intenção de negócio.

### 5.3. AWS Automated Reasoning — TLA+, Zelkova e Cedar
A AWS consolidou a aplicação industrial mais madura de métodos formais em software comercial, em três camadas complementares:
- **TLA+ em sistemas distribuídos (Newcombe et al., CACM 2015):** uso prático de especificação formal e *model checking* para detectar bugs sutis de concorrência em serviços como S3 e DynamoDB antes da implementação.
- **Zelkova (Backes et al., FMCAD 2018):** tradução de políticas AWS IAM para fórmulas SMT, decidindo propriedades de segurança sem depender de heurística ou LLM.
- **Cedar (Cutler et al., OOPSLA 2024):** linguagem de autorização desenhada desde a origem para ser expressiva, rápida (microssegundos) e formalmente analisável (*sound* e *complete* sobre seu fragmento), com núcleo especificado e verificado no assistente de provas **Lean**.

O conjunto demonstra viabilidade industrial de Hard Gates matemáticos — mas em **domínios deliberadamente circunscritos** (protocolos distribuídos e autorização), não sobre a totalidade arbitrária de aplicações de negócio.

### 5.4. GitHub Spec Kit e AWS Kiro — *Spec-Driven Development*
Tanto o **GitHub Spec Kit** quanto o **AWS Kiro** invertem o fluxo informal de chat ao estruturar o trabalho em artefatos persistentes (especificações — no caso do Kiro, com suporte explícito ao padrão EARS —, planejamento, tarefas e hooks de automação). São os parentes contemporâneos mais próximos do IDD no nível de fluxo de trabalho. O que o IDD reivindica de distinto nessa comparação é: (a) a formalização explícita da fronteira de Comando Epistêmico, (b) o DAV como arquitetura de *runtime* (separando interpretação de dados), e (c) invariantes de domínio e mutação verificadas continuamente além da fase de geração inicial.

### 5.5. OpenAI Codex (*Harness Engineering*) e Anthropic (Harnesses Multiagentes)
Em fevereiro de 2026, a OpenAI publicou seu relato de engenharia sobre o desenvolvimento assistido pelo **Codex** (*Harness engineering: leveraging Codex in an agent-first world*), descrevendo um experimento interno de 5 meses em que o papel humano deslocou-se da escrita manual de código para o projeto do ambiente legível por agentes: documentação estruturada como sistema de registro (`AGENTS.md`, planos, mapas), *linters*, *type-checkers*, testes e verificações mecânicas com feedback em `stderr`. A própria OpenAI ressaltou que resultados obtidos em repositório desenhado sob medida não se generalizam automaticamente para bases legadas. Em paralelo, a **Anthropic** publicou práticas de engenharia de *harnesses* para agentes de horizonte longo (decomposição, critérios de avaliação e recuperação de estado). Ambas as linhas convergem fortemente com a camada operacional e de governança do IDD, sem pretender equivalência à verificação formal matemática.

### 5.6. Google DeepMind — *AlphaProof Code* (novembro de 2026)
Em novembro de 2026, a Google DeepMind divulgou o **AlphaProof Code**, uma arquitetura multiagente aplicada à verificação formal de propriedades de segurança (*forward secrecy*, autenticação, *post-compromise security*) sobre código de máquina compilado real do protocolo Signal (`libsignal`), gerando mais de 6 milhões de linhas de prova checadas pelo núcleo confiável do **Lean**. O detalhe decisivo para o IDD é que especialistas humanos colaboraram na definição e revisão das **especificações em Lean** antes que os agentes construíssem as provas. Isso ilustra empiricamente a separação da Seção 3.1: agentes podem automatizar enormemente a prova de $P \models S$ sob um núcleo confiável, mas a autoria e a validação de $S$ perante a intenção humana ($R$) permanecem responsabilidade epistêmica humana.

### 5.7. Matriz comparativa estrutural (calibrada por escala e maturidade)

Para evitar falsa simetria entre sistemas industriais em produção e propostas de pesquisa, a tabela abaixo explicita o estágio real e a evidência empírica de cada abordagem:

| Projeto / Empresa | Mecanismo principal | Problema que enfrenta | Estágio / Escala | Evidência empírica publicada | Relação com o IDD |
| --- | --- | --- | --- | --- | --- |
| **Palantir AIP** | Ontologia, ações e permissões | Controle operacional de IA sobre dados corporativos | Produção industrial (escala enterprise) | Implantações comerciais públicas | Convergência com DAV (ações fechadas) |
| **Microsoft TypeChat / TypeSpec** | Tipagem validada / DSL declarativa de APIs | Ambiguidade de saídas de LLM e contratos de interface | Open source maduro / adoção industrial | Código aberto, specs e uso em ecossistema MS | Interpretação tipada e geração a partir de spec |
| **AWS TLA+ / Zelkova / Cedar** | Model checking, SMT e linguagem verificada em Lean | Correção de protocolos distribuídos e políticas de acesso | Produção industrial (escala nuvem) | Papers peer-reviewed (CACM 2015, FMCAD 2018, OOPSLA 2024) | Referência real de Hard Gates formais em domínios restritos |
| **GitHub Spec Kit / AWS Kiro** | *Spec-Driven Development*, EARS, tarefas e hooks | Organização e controle de agentes antes do código | Produto comercial / open source em adoção | Releases públicos e documentação de uso | Ancestral/concorrente direto no fluxo de especificação |
| **OpenAI Codex / Anthropic Harnesses** | Engenharia de ambiente, testes e *harnesses* multiagentes | Confiabilidade de agentes em tarefas longas | Produção e pesquisa aplicada em big tech | Relatos técnicos de engenharia (2025–2026) | Governança mecânica do ambiente do agente |
| **DeepMind AlphaProof Code** | Agentes provadores + núcleo formal Lean | Segurança verificada de código crítico compilado | Pesquisa de fronteira com validação em código real (`libsignal`) | Relatório técnico DeepMind (nov/2026) | Evidência da divisão: humano valida spec, máquina prova código |
| **IDD (`idd-ide`)** | Fase 0 + `.intent.yaml` + dicionário + AST/ESLint + proposta DAV | Preservar intenção humana e invariantes ao longo do ciclo | **Protótipo de pesquisa (autor único)** | **Sem benchmark independente publicado**; suítes unitárias locais + Livro de Recusas (`#30`) | Tenta integrar peças dessas linhagens sob um cânone unificado |

---

## 6. O que a pesquisa empírica realmente mostra sobre IA no desenvolvimento

A literatura empírica de 2025–2026 rejeita a equação simplista "mais IA = mais produtividade":

- **Relatório DORA 2025 (*State of AI-assisted Software Development*):** baseado em quase 5.000 profissionais e mais de 100 horas de dados qualitativos, caracteriza a IA como um **amplificador**: potencializa equipes com boas práticas, arquitetura limpa e feedback rápido, mas amplifica instabilidade e desordem onde os sistemas de controle são fracos.
- **Estudo controlado da METR (2025):** em um ensaio randomizado (RCT) com 16 desenvolvedores experientes realizando 246 tarefas reais em repositórios maduros de código aberto com ferramentas do início de 2025 (predominantemente Cursor Pro com Claude 3.5/3.7 Sonnet), o uso de IA resultou em **aumento médio de 19% no tempo de conclusão** — apesar de os próprios desenvolvedores estimarem, após o experimento, que haviam ficado 20% mais rápidos. Embora o resultado dependa do recorte temporal, da senioridade e dos modelos da época, ele comprova que **percepção subjetiva de ganho e produtividade medida podem divergir drasticamente**.

Consequência para a avaliação do IDD: o paradigma não deve ser avaliado por velocidade de geração de linhas de código, mas por métricas auditáveis de **fidelidade à intenção**, **ambiguidades resolvidas antes do código**, **violações de invariantes bloqueadas**, **taxa de falsos bloqueios**, **custo longitudinal de manutenção de contratos** e **rastreabilidade ponta a ponta**.

---

## 7. O que é distintivo na formulação de Eliézer Rosa

O Cânone `v1.0-rc1` consolida seis princípios:

1. Intenção como fonte de autoridade.
2. Comando Epistêmico humano versus Comando Operacional do agente.
3. Invariantes como contrato verificável.
4. DAV (*Deterministic Action Vocabulary*) — LLM interpreta intenção, nunca dados crus, com *fast-path* determinístico.
5. *Confirm-Once* com Fé Bayesiana (autonomia cresce com evidência acumulada).
6. Linguagem Ubíqua governada como gate verificável.

Nenhum desses blocos é totalmente inédito isoladamente. A contribuição reivindicada é a **composição** desses seis princípios em um ciclo coerente que conecta elicitação de domínio (Fase 0), contratos versionados, execução com agentes e arquitetura de *runtime* (DAV).

A disciplina de autoria já fixada no Cânone (§7–§8) é correta e deve ser mantida rigorosamente: a sigla "IDD" circulava de forma independente em outros contextos (como o ebook de Richard Stockley de abril de 2026 e o portal `intent-driven.dev`, voltados a metodologia documental). Portanto, a fórmula precisa e defensável é sempre **"IDD na formulação de Eliézer Rosa"**, nunca a reivindicação da invenção isolada da sigla ou da programação orientada à intenção.

---

## 8. Auditoria de maturidade em código duro (`EliezerRosa/idd-ide`)

Diferentemente de uma leitura restrita a documentos conceituais, a auditoria direta do código-fonte do repositório `idd-ide` (corte `2026-11-25`, cruzando `main` e o branch ativo `feat/fusao-v2-e-honestidade`) estabelece com precisão o que existe, o que é parcial e o que permanece proposta.

### 8.1. Estado verificável por componente

| Componente | Status real | Evidência direta em código-fonte e limitações verificadas |
| --- | --- | --- |
| Contrato `.intent.yaml` (v1/v2) e parser único `@idd/core` | ✅ Implementado | `packages/core/src/contract.ts`, `project.ts`, `dictionary.ts` consumidos por CLI e LSP. |
| Dicionário Ubíquo offline e gate de CI | ✅ Implementado | `idd dictionary check --strict` em `cli/src/commands/dictionary.ts` e workflow `.github/workflows/idd-verify.yml`. |
| Fronteiras entre *bounded contexts* (`idd verify --project`) | ✅ Implementado (escopo TS/JS) | Verifica imports por regex sobre arquivos TS/JS (`packages/core` + `cli/src/commands/verify.ts`). |
| Normalização relacional **2NF, 3NF e BCNF** (`idd domain`) | ✅ Implementado | Algoritmos formais de fecho de atributos (Armstrong), chaves candidatas, decomposição BCNF sem perda e verificação de preservação de dependências em `cli/src/lib/domain/fds.ts` e `normalizer.ts`. |
| Fase 0 — Compilador de Linguagem Ubíqua (`idd fase0`, `idd lint-ln`) | ✅ Implementado | Loop 1 (intenção/invariantes/dicionário), Loop 2 (MER/UCs/atividades/estados/métodos), Gate 1 e Gate 2 verdes no caso `racha-conta`, mais geração de TSDoc (`cli/src/lib/fase0/`). No branch atual (`feat/fusao-v2-e-honestidade`), inclui **SHA-256 canônico e autoria obrigatória** nas decisões humanas (`casos.ts`, `gate1.ts`, `decisoes-crypto.test.ts`). |
| Cerca de Mutação AST em TypeScript (`idd verify` + `@idd/eslint-plugin`) | ✅ Implementado (TS-only, *unsound* interprocedural) | `cli/src/lib/mutationFence.ts` + `cli/src/lib/fase0/astGraph.ts` usam a TypeScript Compiler API (`ts.createSourceFile`) para checar `allowed_fields` (`INV-UI-04`), `read_only_fields` (`INV-ENCAP-01`), mutações dinâmicas em `this[expr]` (`INV-UI-05`), acessores `get`/`set`, raio de impacto e subgrafo k-hop (branch atual). Complementado por `packages/eslint-plugin-idd` (`state-mutation` e `no-exposed-mutable-state`, 4 suítes / 45 testes passando). Limite: análise local em TypeScript, vulnerável a aliasing interprocedural, `Object.assign`/`Reflect.set` indiretos e `any`. |
| Normalização **1NF, 4NF, 5NF e DKNF** (`idd domain normalize`) | 🧪 Heurístico | Em `cli/src/lib/domain/normalizer.ts`: `check1NF` usa padrões de tipo/nome plural; `check4NF` conta FKs e relacionamentos N:M; `check5NF` conta `fkCount >= 3`; `checkDKNF` aplica regex sobre texto de `businessRules` e atributos derivados. **Não** são provas formais de MVD, JD ou DKNF. |
| Verificação estática de drift (`idd verify` regras `FORBIDDEN` e `CONSTRAINT_CHECKS`) | 🧪 Experimental | Regras por regex/palavras-chave em `cli/src/commands/verify.ts` (linhas 37–91), sem medição empírica de *precision*/*recall*. |
| Verificação semântica via LLM (`idd verify --semantic`) | 🧪 Experimental | Chamada única à API Anthropic (`verify.ts:153-201`), código truncado em `16.000` caracteres, sem tratamento de não-determinismo. Limite real documentado no Livro de Recusas (Issue `#30`: falhou em detectar divergência genuína em `evolver.ts`). |
| Suporte "multi-linguagem" (TS, Python, Go, JS, Rust, Java) | 🧪 Parcial / assimétrico | `cli/src/lib/lang.ts` fornece templates, *prompt hints* e regex estáticas por linguagem; porém **AST mutation fence, LSP e `--project` funcionam apenas em TypeScript/JavaScript**. |
| LSP e Extensão VS Code | 🧪 Experimental | `extensions/idd-core/src/lsp/server.ts` valida `.intent.yaml`, dicionário e `state_mutation` apenas em TS com decorator `@Intent`; extensão não publicada no Open VSX; grafo carrega Cytoscape de CDN. |
| Suíte de testes (`cli` e `@idd/eslint-plugin`) | ✅ Unitários / 🧪 Sem E2E real | `cli`: 40 suítes / `1.103` testes passando no branch atual (`1.059` em `main`), porém com SQLite simulado e sem testes E2E com banco real, LLM real ou protocolo LSP. `@idd/eslint-plugin`: 4 suítes / 45 testes passando. |
| Intent IR, prova SMT (Z3)/Dafny, diff semântico sobre grafo, SHALA calibrada, Sombra Determinística, anotações inline de drift, IDE dedicada (Code-OSS) | 🔭 Proposta | Não implementados. Do fork Code-OSS existe apenas branding (`product.json`). |

### 8.2. Inconsistências documentais identificadas e reconciliadas nesta revisão (2026-11-25)

A auditoria em código expôs quatro divergências entre a documentação interna do repositório e o código executável (além da contradição `README` × `ROADMAP` já apontada na v1), todas reconciliadas nos respectivos documentos em `2026-11-25`:

1. **`docs/ROADMAP.md` × `README.md`:** as Fases 2 a 7 foram reconciliadas com os selos reais (`✅`/`🧪`/`🔭`) para `#2`, `#5`, `#6`, `#11`, `#13–#16`, `#19`, `#24` e `#28`; a Fase 0 foi atualizada de `🔭 aguardando aprovação` para `✅ implementada` (com registro de E01/E02), a contagem de comandos/testes foi atualizada (`28 comandos`, `40 suítes` no CLI + `4 suítes / 45 testes` no `@idd/eslint-plugin`) e as limitações de AST local e enforcement local vs. servidor foram explicitadas.
2. **`docs/ARCHITECTURE.md`:** removidas as afirmações desatualizadas de que o protótipo atual roda sobre fork Code-OSS, de que há anotações inline implementadas e de que o modelo padrão é `claude-sonnet-4-20250514` (atualizado para `claude-sonnet-5`); adicionadas a camada real de cerca AST (`mutationFence.ts` + `astGraph.ts`) e a seção de fronteira de confiança Local vs. Servidor nos Git hooks.
3. **`docs/DOMAIN.md` e `docs/CLI.md`:** explicitada a separação entre normalização formal (`2NF–BCNF` via Armstrong em `fds.ts`) e heurística (`1NF`, `4NF`, `5NF`, `DKNF` em `normalizer.ts`), além de atualização do comando de build e do índice de comandos da CLI.
4. **`paradigma/00-canone/AFIRMACOES.md` (`A5`):** atualizada para refletir a cerca de mutação por método já existente em TypeScript (`mutationFence.ts` + `@idd/eslint-plugin`) com exposição explícita dos limites de AST local e de bypass agêntico.

---

## 9. Agenda de pesquisa falsificável

Para sustentar o IDD como proposta científica — e não apenas como manifesto de engenharia —, cada linha experimental precisa definir **métrica operacional, *baseline* e critério explícito de refutação**:

### A. Fidelidade semântica na formalização ($D, S \vdash R$)
- **Desenho:** Conjunto de requisitos em linguagem natural contendo ambiguidades e omissões propositalmente semeadas (*seeded ambiguity benchmark*). Comparar elicitação livre com LLM vs. Fase 0 do IDD.
- **Avaliação:** Revisão humana independente e cega quanto ao método (nunca LLM julgando LLM isoladamente), com concordância entre avaliadores medida por $\kappa$ de Cohen/Fleiss.
- **Critério de refutação:** Se a taxa de omissões críticas nos contratos produzidos pela Fase 0 não for estatisticamente menor que a de um *checklist* estruturado convencional (ex.: EARS + revisão humana), o overhead da Fase 0 não se justifica.

### B. Eficácia e limites dos Hard Gates (AST, dicionário, fronteiras)
- **Desenho:** Benchmark adversarial com mutações semeadas em TypeScript/JavaScript cobrindo violações diretas, acessores `get`/`set`, aliasing local, aliasing interprocedural, `Object.assign`, `Reflect.set` e chaves dinâmicas.
- **Métricas:** *Precision*, *recall* por classe de contorno, taxa de falsos bloqueios e latência de execução.
- **Critério de refutação:** Taxa de falsos bloqueios que leve equipes a desabilitar a cerca na prática, ou *recall* insuficiente frente a erros reais produzidos por agentes de fronteira.

### C. Calibração empírica da SHALA
- **Desenho:** Correlacionar o escore SHALA calculado sobre enunciados reais de requisitos com a taxa de divergência observada entre engenheiros humanos interpretando independentemente os mesmos enunciados.
- **Métricas:** Correlação de Spearman ($\rho$), curva de calibração (ECE) e área sob a curva ROC na detecção de requisitos realmente ambíguos.
- **Critério de refutação:** Se o escore SHALA não superar baselines triviais (comprimento da frase, contagem de termos vagos ou *lint* sintático determinístico), a formulação baseada em entropia de LLM deve ser descartada.

### D. Contenção de bypass agêntico (Local vs. Servidor)
- **Desenho:** Testes *red-team* com agentes autônomos instruídos a cumprir uma tarefa sob pressão ou restrição conflitante com uma invariante declarada.
- **Métricas:** Taxa de tentativas de contorno (edição silenciosa de `.intent.yaml`, `--no-verify`, bypass de AST) bloqueadas exclusivamente na camada local versus na camada de servidor (CI + `CODEOWNERS` + SHA-256 de decisões).
- **Critério de refutação:** Se agentes conseguirem passar alterações violadoras pelo pipeline completo (local + CI), o modelo de governança precisa ser redesenhado.

### E. Evolução longitudinal e risco de *Spec Rot* ($t_0 \to t_1 \to t_2$)
- **Desenho:** Estudo longitudinal em 3 rodadas sucessivas de mudança de requisitos sobre o mesmo sistema (não apenas tarefas *greenfield* de rodada única), comparando: (1) desenvolvimento convencional, (2) LLM direto, (3) *Spec-Driven Development* / *Harness Engineering* (Codex/Kiro/Spec Kit) e (4) IDD.
- **Métricas:** Tempo total até estabilidade, custo de tokens, custo de manutenção dos artefatos de especificação, taxa de regressão de invariantes e divergência acumulada entre spec e código em $t_2$.
- **Critério de refutação:** Se em $t_2$ o custo de manter contratos IDD superar o ganho em redução de defeitos frente a um *harness* convencional (testes + tipos + CI), a tese econômica do paradigma falha nesse domínio.

### F. Teste real de regenerabilidade controlada
- **Desenho:** Dado um módulo com contrato `.intent.yaml` v2 e suíte de testes de propriedade, regenerar o código com diferentes versões de modelos e medir compatibilidade comportamental e de contratos implícitos de borda.
- **Critério de refutação:** Taxa de quebra silenciosa em casos de borda ou regressões de performance/estado que exijam retrabalho manual equivalente a manter o código diretamente.

---

## 10. Conclusão

O IDD, na formulação de Eliézer Rosa, não nasce no vácuo nem substitui as leis fundamentais da engenharia de software. Sua linhagem direta conecta a distinção formal de Zave & Jackson ($D, S \vdash R$), as *Intent Specifications* de Leveson, a precisão sintática de EARS (Mavin et al.), os contratos de Hoare e Meyer, a teoria relacional de Codd/Armstrong, a Linguagem Ubíqua de Evans, as lições duras do MDA e a engenharia de *harnesses* da era de agentes.

Sua tese central é clara e merece investigação séria:

> **O código deixa de ser a única autoridade operacional; a intenção humana formalizada em contrato passa a governar o ciclo, e agentes de IA atuam subordinados a verificações determinísticas locais e no servidor.**

Ao mesmo tempo, a honestidade técnica impõe reconhecer que, em novembro de 2026, o IDD é um **protótipo de pesquisa de autor único** com peças determinísticas concretas (parser `@idd/core`, dicionário ubíquo, normalizador 2NF–BCNF, Fase 0, cerca AST em TypeScript e plugin ESLint), cercado de componentes experimentais e hipóteses ainda não testadas independentemente. Seu mérito não será medido pela extensão de sua árvore genealógica, mas pela capacidade de demonstrar empiricamente — sob contraditório e benchmark longitudinal — que reduz divergências entre intenção e implementação a um custo de manutenção economicamente sustentável.

---

## 11. Referências bibliográficas e documentais

### Fundamentos clássicos e engenharia de requisitos
- **Armstrong, W. W.** (1974). *Dependency Structures of Data Base Relationships*. Proc. IFIP Congress, pp. 580–583.
- **Bainbridge, L.** (1983). *Ironies of Automation*. Automatica, 19(6), pp. 775–779.
- **Brooks, F. P.** (1987). *No Silver Bullet — Essence and Accidents of Software Engineering*. IEEE Computer, 20(4), pp. 10–19.
- **Chen, P. P.** (1976). *The Entity-Relationship Model — Toward a Unified View of Data*. ACM Transactions on Database Systems, 1(1), pp. 9–36.
- **Codd, E. F.** (1970). *A Relational Model of Data for Large Shared Data Banks*. Communications of the ACM, 13(6), pp. 377–387.
- **Dijkstra, E. W.** (1979). *On the Foolishness of "Natural Language Programming"*. EWD667, in *Program Construction*, LNCS 69, Springer.
- **Engelbart, D. C.** (1962). *Augmenting Human Intellect: A Conceptual Framework*. SRI Summary Report AFOSR-3223.
- **Evans, E.** (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley.
- **Hoare, C. A. R.** (1969). *An Axiomatic Basis for Computer Programming*. Communications of the ACM, 12(10), pp. 576–580.
- **Jackson, M.** (2001). *Problem Frames: Analysing and Structuring Software Development Problems*. Addison-Wesley.
- **Knuth, D. E.** (1984). *Literate Programming*. The Computer Journal, 27(2), pp. 97–111.
- **Leveson, N. G.** (2000). *Intent Specifications: An Approach to Building Human-Centered Specifications*. IEEE Transactions on Software Engineering, 26(1), pp. 15–35.
- **Licklider, J. C. R.** (1960). *Man-Computer Symbiosis*. IRE Transactions on Human Factors in Electronics, HFE-1, pp. 4–11.
- **Mavin, A., Wilkinson, P., Harwood, A., & Novak, M.** (2009). *Easy Approach to Requirements Syntax (EARS)*. Proc. 17th IEEE International Requirements Engineering Conference (RE'09), pp. 317–322.
- **Meyer, B.** (1988). *Object-Oriented Software Construction*. Prentice Hall; e **Meyer, B.** (1992). *Applying "Design by Contract"*. IEEE Computer, 25(10), pp. 40–51.
- **Naur, P.** (1985). *Programming as Theory Building*. Microprocessing and Microprogramming, 15(5), pp. 253–261.
- **North, D.** (2006). *Introducing BDD*. Better Software Magazine.
- **Robertson, S., & Robertson, J.** (1999/2012). *Mastering the Requirements Process* (Volere). Addison-Wesley.
- **Simonyi, C.** (1995). *The Death of Computer Languages, The Birth of Intentional Programming*. Microsoft Research Technical Report MSR-TR-95-52.
- **Zave, P., & Jackson, M.** (1997). *Four Dark Corners of Requirements Engineering*. ACM Transactions on Software Engineering and Methodology (TOSEM), 6(1), pp. 1–30.

### Métodos formais industriais, IA e engenharia com agentes
- **Backes, J., Bolignano, P., Cook, B., Dodge, C., Gacek, A., Luckow, K., Rungta, N., Tkachuk, O., & Varming, C.** (2018). *Semantic-based Automated Reasoning for AWS Access Policies using SMT* (Zelkova). Proc. FMCAD 2018.
- **Cutler, J., Disselkoen, C., Eline, A., He, S., Headley, K., Hicks, M., Hietala, K., Ioannidis, E., Kastner, J., Mamat, A., McAdams, D., McCutchen, M., Rungta, N., Torlak, E., & Wells, A. M.** (2024). *Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization*. Proc. ACM Program. Lang. (OOPSLA 2024).
- **DORA / Google Cloud** (2025). *State of AI-assisted Software Development* (DORA Report 2025).
- **Google DeepMind** (novembro de 2026). *AlphaProof Code* — formal verification of compiled `libsignal` security properties with multi-agent provers and Lean.
- **METR** (2025). *Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity* (RCT: 16 desenvolvedores, 246 tarefas).
- **Newcombe, C., Rath, T., Zhang, F., Munteanu, B., Brooker, M., & Deardeuff, M.** (2015). *How Amazon Web Services Uses Formal Methods* (TLA+). Communications of the ACM, 58(4), pp. 66–74.
- **OpenAI Engineering** (fevereiro de 2026). *Harness engineering: leveraging Codex in an agent-first world* (Ryan Lopopolo) e *Unlocking the Codex harness: how we built the App Server* (Celia Chen).
- **Vaswani, A., et al.** (2017). *Attention Is All You Need*. NeurIPS 2017.

### Fontes primárias do repositório IDD (`EliezerRosa/idd-ide`)
- Cânone IDD `v1.0-rc1`: `paradigma/00-canone/IDD-CANONE.md`
- Matriz de Afirmações: `paradigma/00-canone/AFIRMACOES.md`
- Evidências e execução do Protocolo Fable: `docs/fable/00-evidencias.md`, `docs/fable/log-execucao.md`
- Código auditado: `cli/src/commands/verify.ts`, `cli/src/lib/mutationFence.ts`, `cli/src/lib/fase0/astGraph.ts`, `cli/src/lib/domain/normalizer.ts`, `cli/src/lib/domain/fds.ts`, `cli/src/lib/lang.ts`, `extensions/idd-core/src/lsp/server.ts`, `packages/eslint-plugin-idd/`.
