# Manifesto de Indexação Acadêmica & Engenharia de SEO do Paradigma IDD
**Autor:** Eliézer Rosa | **Canal Oficial:** [@eliezerjprosa](https://www.youtube.com/@eliezerjprosa)  
**Versão:** 2.0 (Edição Canônica — Base de Conhecimento Universal)

---

## 1. Visão Geral: A Problemática Contemporânea e o Posicionamento do IDD

O surgimento da programação assistida por grandes modelos de linguagem (LLMs) introduziu na indústria o fenômeno conhecido popularmente como **"Vibe Coding"** (codificação baseada em intuição estatística e prompts em linguagem natural solta). Embora tenha acelerado protótipos de brinquedo, a prática gerou uma crise sem precedentes na engenharia de software corporativa:

1. **Alucinação Relacional e Sintática:** Modelos probabilísticos não possuem garantias lógicas sobre esquemas relacionais, cardinalidades ou tipos.
2. **Dívida Técnica Exponencial e Invisível:** Código gerado sem formalização ontológica acumula regras implícitas, duplicação e vulnerabilidades não auditáveis.
3. **Quebra Catastrófica de Mutações:** Modificações ad-hoc via agentes quebram bancos de produção por ausência de análise semântica de diff e transações atômicas estruturadas.

O **Paradigma IDD (Intent-Driven Development)** posiciona-se não como uma ferramenta a mais de prompt, mas como uma **disciplina formal de Engenharia de Software 3.0 pós-sintaxe**, fundamentando a IA em alicerces consolidados da Ciência da Computação teórica e nas mais recentes pesquisas de ponta das Big Techs e universidades globais.

---

## 2. As 7 Perspectivas Teóricas & Acadêmicas do IDD

### 2.1 A Ontologia da Intenção vs. O Epifenômeno Sintático
* **Linhagem Histórica:** Vannevar Bush (*Memex*, 1945), J.C.R. Licklider (*Man-Computer Symbiosis*, 1960), Douglas Engelbart (*Augmenting Human Intellect*, 1962).
* **Fundamentação:** O código-fonte em linguagens como TypeScript, Python ou SQL é um epifenômeno transitório e descartável. O verdadeiro patrimônio imutável e perpétuo da corporação é a **Intenção de Domínio Formalizada**.
* **Comando Epistêmico vs. Operacional:** O ser humano retém a soberania ontológica (o *porquê* e o *quê*); os compiladores e agentes executam o trabalho operacional (o *como*).

### 2.2 IA Neuro-Simbólica & Raciocínio Híbrido
* **Referências:** Google DeepMind (FunSearch, AlphaProof), MIT CSAIL, Gary Marcus, Yann LeCun.
* **Fundamentação:** A superação da dicotomia Conexionismo vs. Simbolismo. O IDD utiliza a rede neural (LLM) na camada probabilística de intuição semântica e síntese, submetendo todo artefato gerado a um **Tribunal Simbólico Determinístico** (Modelo Entidade-Relacionamento e Invariantes Formais) onde alucinações são impossíveis de passar.

### 2.3 Compiladores Declarativos & Program Synthesis
* **Referências:** Stanford University (DSPy — Omar Khattab & Matei Zaharia), Tradição LLVM/MLIR (Chris Lattner).
* **Fundamentação:** A morte do *Prompt Engineering* como técnica empírica de tentativa e erro. No IDD, a intenção humana é compilada para uma **Intent IR (Intermediate Representation)** — uma Árvore Sintática Abstrata (AST) do domínio. Da Intent IR, emitem-se artefatos verificáveis para qualquer plataforma de destino.

### 2.4 Métodos Formais & Raciocínio Automatizado (Automated Reasoning)
* **Referências:** Microsoft Research (Leonardo de Moura & Nikolaj Bjørner — Z3 SMT Solver; Rustan Leino — Dafny), AWS Automated Reasoning Group (Byron Cook), Leslie Lamport (TLA+).
* **Fundamentação:** A insuficiência ontológica dos testes unitários baseados em `assert_equal` (testes por amostragem finita). O IDD traduz as regras de negócio em **Invariantes Formais de Domínio** comprovadas matematicamente via SMT Solvers antes de qualquer deploy em produção.

### 2.5 Engenharia de Software Constitucional & Alinhamento de Sistemas
* **Referências:** Anthropic (Constitutional AI), Filosofia do Direito & Teoria Geral dos Sistemas.
* **Fundamentação:** Expansão da tese de Constitutional AI: enquanto a Anthropic utiliza princípios constitucionais para alinhar respostas éticas de modelos conversacionais, o IDD estabelece as regras e invariantes de negócio como a **Constituição Inegociável da Empresa**. Nenhum agente de IA e nenhum desenvolvedor tem autoridade para realizar mutações que violem a constituição.

### 2.6 Evolução Semântica de Esquema vs. Diff Cego de Texto
* **Referências:** E.F. Codd (Modelo Relacional), Martin Fowler & Pramod Sadalage (Refactoring Databases), Martin Kleppmann (Designing Data-Intensive Applications).
* **Fundamentação:** O Git é cego para IA porque opera como um grafo de hashes SHA-1 sobre linhas de caracteres ASCII, incapaz de perceber quebras de cardinalidade ou integridade relacional. A **Máquina de Diff de Intenções** do IDD compara grafos ontológicos, categorizando mutações na **Classificação Tripartida** (Classe A: Aditiva; Classe B: Restritiva com cálculo de raio; Classe C: Ruptura com padrão *Expand and Contract* e aprovação humana soberana).

### 2.7 A Teoria da Ação Atômica, Sagas de Domínio & Consistência Eventual
* **Referências:** Hector Garcia-Molina & Kenneth Salem (Princeton — *Sagas*, 1987), Pat Helland (Amazon/Salesforce — *Life beyond Distributed Transactions: an Apostate's Opinion*), Eric Evans (Domain-Driven Design).
* **Fundamentação:** O perigo do código de mutação ad-hoc com IA, causador de meias-transações e estados órfãos. O IDD institucionaliza o **Protocolo Canônico da Ação Atômica em 4 Fases**:
  1. **Guarda:** Validação formal de precondições e invariantes com fail-fast.
  2. **Mutação:** Execução idempotente em escopo estritamente isolado.
  3. **Selagem:** Pós-condições, integridade referencial e emissão do Domain Event append-only.
  4. **Compensação:** Ação compensatória simétrica pré-declarada para reversão sem deadlocks distribuídos.

---

## 3. Matriz de Hashtags (#) Oficiais para Máxima Visibilidade

### Bloco Primário: O Núcleo do Paradigma
```text
#IDD #IntentDrivenDevelopment #SoftwareEngineering #EngenhariaDeSoftware #EliezerRosa #EliezerJPRosa #Software3_0
```

### Bloco Acadêmico & Pesquisa Científica (Conferências & Teóricos)
```text
#FormalMethods #AutomatedReasoning #NeuroSymbolicAI #SMTSolvers #Z3Solver #Dafny #StanfordDSPy #ConstitutionalAI #DeepMind #ComputerScience #ICSE #FSE #ASE #PLDI #POPL
```

### Bloco Arquitetura, Bancos de Dados & Sistemas Distribuídos
```text
#DomainDrivenDesign #DDD #EventSourcing #DistributedSagas #PatHelland #SchemaEvolution #ExpandAndContract #DatabaseEvolution #AtomicActions #Idempotence #CleanArchitecture
```

### Bloco Problemática Contemporânea (O Contraponto Crítico)
```text
#VibeCoding #CriseDoSoftware #IAConfiável #ReliableAI #AgenticAI #ProgramSynthesis #LLMInProduction #AIHallucination
```

---

## 4. Palavras-Chave do Canal (YouTube Studio — Channel Keywords)

> **Instrução:** Copie o bloco delimitado abaixo e cole diretamente no campo **Configurações > Canal > Informações Básicas > Palavras-chave** no [YouTube Studio](https://studio.youtube.com):

```text
IDD, "Intent-Driven Development", "Desenvolvimento Orientado a Intenção", "Eliézer Rosa", "Eliezer JP Rosa", "Software Engineering 3.0", "Post-Syntax Programming", "Ontologia de Software", "Vibe Coding", "Crise do Software", "Alucinação de IA", "Dívida Técnica com IA", "IA Confiável", "Reliable AI", "Neuro-Symbolic AI", "IA Neuro-Simbólica", "Stanford DSPy", "Intent IR", "Compilador de Intenções", "Program Synthesis", "Constitutional AI", "Google DeepMind", "Anthropic", "Formal Methods", "Métodos Formais", "Automated Reasoning", "Raciocínio Automatizado", "SMT Solvers", "Z3 Solver", "Microsoft Z3", "Dafny", "AWS Automated Reasoning", "Domain Invariants", "Verificação Formal", "TLA+", "Domain-Driven Design", "DDD", "Event Sourcing", "CQRS", "Distributed Sagas", "Pat Helland", "Atomic Actions", "Schema Evolution", "Expand and Contract", "Idempotência", "Computer Science", "Ciência da Computação", "Engenharia de Software", "ICSE", "FSE", "ASE", "PLDI", "POPL"
```

---

## 5. Índice da Série Completa na Playlist "IDD — Base de Conhecimento"
**Playlist ID:** `PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7`

1. **Ep. 01:** O que é o Paradigma IDD? (Ontologia da Intenção vs Vibe Coding)
2. **Ep. 02:** Comando Epistêmico vs Operacional (Teoria do Controle Humano-IA)
3. **Ep. 03:** A Genealogia do IDD (De Bush a LLMs: 79 Anos de Linhagem)
4. **Ep. 04:** O Paradigma Neuro-Simbólico (Por que LLMs Sozinhos Falham)
5. **Ep. 05:** O Compilador de Intenções & Intent IR (A Morte do Prompt)
6. **Ep. 06:** Invariantes Formais & SMT Solvers (Z3 & Dafny)
7. **Ep. 07:** Engenharia Constitucional & Diff Semântico de Esquema
8. **Ep. 08:** A Teoria da Ação Atômica (Sagas de Domínio em 4 Fases)
9. **Ep. 09:** IDD vs. MCP & Antigravity (Encanamento de Ferramentas vs. Engenharia de Sistemas)
10. **Ep. 10:** IDD vs. GitHub Copilot Workspace & Aider (A Ilusão da Spec em Markdown e o Fim do Patch-and-Pray)
