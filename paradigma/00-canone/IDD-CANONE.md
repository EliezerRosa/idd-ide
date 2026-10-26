# Cânone do Paradigma IDD — v1.0-rc1

> **Status: RASCUNHO para ratificação de Eliézer Rosa.** Proposto em 2026-10-26 a partir do
> [parecer](../../docs/PARECER-PARADIGMA-2026-10-26.md). Vale como referência quando ratificado.
> Todo vídeo, apresentação e documento deve citar a versão do cânone em que se baseia.

## 1. Definição

**IDD — Intent-Driven Development, na formulação de Eliézer Rosa** — é uma disciplina de
engenharia de software com IA em que:

> a **intenção humana**, escrita em linguagem natural, é a **fonte de autoridade** do sistema;
> ela é compilada em **contratos estruturados** (invariantes, vocabulário de ações, critérios de
> aceite) que uma **verificação determinística** confere continuamente; o código, produzido em
> boa parte por agentes de IA, é **derivado e regenerável**, e permanece **rastreável** até a
> intenção que o originou.

Em uma linha: **o humano decide o quê e o porquê; a IA executa o como; o contrato e a
verificação garantem que um não traia o outro.**

### O que o IDD não é

- **Não é vibe coding**, que aceita código sem entendê-lo. O IDD mantém o comando epistêmico.
- **Não é só prompt engineering**: os artefatos de intenção são versionados, estruturados e
  auditáveis.
- **Não é programação em linguagem natural pura**: a linguagem natural é fonte de *autoridade*;
  a fonte *executável* é o contrato verificado.
- **Não elimina o código nem a engenharia**: muda onde está a autoria humana e como ela é
  verificada.

## 2. As quatro camadas

O termo "IDD" cobre quatro coisas. Cada afirmação pública deve dizer de qual camada fala.

| Camada | Pergunta | Exemplos |
| --- | --- | --- |
| **Filosofia** | Quem decide o quê? | Comando Epistêmico, Augmenting ≠ Automating, Fé Bayesiana |
| **Método** | Como se pratica? | Ciclo intenção → requisitos/invariantes → MER → UML → implementação → governança; Fase 0 investigativa; runbooks `.intent.md`; ação atômica em 4 fases |
| **Arquitetura** | Como o produto se comporta? | DAV, fast-path pré-LLM, fallback para UI convencional, ergonomia semântica |
| **Ferramenta** | Com o quê? | IDD-IDE (CLI, LSP, extensão), dicionário ubíquo, Intent Store |

## 3. Os seis princípios

Este é o número canônico. As "7 perspectivas" e os "5 pilares" são **agendas de pesquisa**
(§5), não princípios.

1. **Intenção como fonte de autoridade.** Toda mudança relevante nasce de uma intenção escrita,
   e o código é rastreável a ela.
2. **Comando Epistêmico humano.** O humano detém o *quê* e o *porquê* (intenção, invariantes,
   critérios, limites éticos). O agente detém o *como*. Perder essa fronteira é credulidade.
3. **Invariantes como contrato verificável.** As regras de negócio inegociáveis são declaradas
   explicitamente e checadas por mecanismo determinístico (schema, testes, análise estática,
   constraints de banco). Futuramente também por prova formal (§5).
4. **DAV — Deterministic Action Vocabulary.** O LLM interpreta *intenção*, nunca *dados*. Ele
   produz `{ação, parâmetros}` de um vocabulário fechado, e os dados só circulam em código
   determinístico. Casos frequentes não chegam ao LLM (fast-path).
5. **Confirm-Once com Fé Bayesiana.** O humano aprova o plano uma vez, e o agente executa até o
   fim reportando tudo. A autonomia concedida cresce com a evidência acumulada, nunca com a
   fé.
6. **Linguagem Ubíqua governada.** Os termos do domínio têm um dicionário. Termo fora do
   dicionário é ambiguidade a resolver antes de gerar código.

## 4. Linhagem

A tabela diz o que o IDD toma de cada fonte e onde diverge.

| Fonte | O IDD toma | O IDD diverge |
| --- | --- | --- |
| Licklider (1960), Engelbart (1962) | Humano define metas, máquina faz o rotinizável; ampliar, não substituir | Aplica a distinção a agentes de IA como regra operacional |
| Knuth, Literate Programming (1984) | Exposição em LN como forma primária | O humano não escreve o código derivado |
| Meyer, Design by Contract (1986) | Invariantes, pré e pós-condições | Contratos escritos a partir da LN e checados no ciclo de agentes |
| OMG MDA/MDE (2001) | O modelo é o ativo; o código é derivado | **Lição do fracasso do MDA:** sem round-trip e com drift, o modelo apodrece. O IDD exige verificação contínua de drift |
| Evans, DDD (2003) | Linguagem Ubíqua, Bounded Contexts | Dicionário ubíquo como gate verificável |
| North, BDD (2006) | Given/When/Then como especificação executável | Usado para critérios de aceite, não como único formato |
| Spec-Driven Development (GitHub Spec Kit, AWS Kiro, 2025) | Especificação antes do código, com agentes | O IDD acrescenta o Comando Epistêmico explícito, o DAV no runtime e invariantes como gate permanente, não só na geração |
| Stockley, *Intent-Driven Development* (ebook v0.2, 2026) | Mesmo nome; seis elementos da intenção; risk dials | Formulação independente. Contribuições próprias de E. Rosa: Comando Epistêmico como critério operacional, DAV, Confirm-Once, simetria produto/processo |
| Karpathy, "vibe coding" (2025) | LN como interface | Contraponto: o IDD preserva o entendimento e a verificação |

## 5. Agenda de pesquisa (🔭 PROPOSTA — não implementado)

Estas direções aparecem em vídeos e apresentações. **São propostas**, e devem ser sempre
comunicadas com o selo 🔭:

- **Intent IR**: representação intermediária formal da intenção, com gramática.
- **Prova formal de invariantes com SMT (Z3) ou Dafny.** Nota técnica: provar uma invariante
  equivale a mostrar que sua **negação é insatisfatível (UNSAT)**.
- **Diff semântico de intenções** sobre grafo, com classificação A/B/C e Expand-and-Contract.
- **SHALA**: medida de ambiguidade da LN por entropia sobre interpretações.
- **Git bimodal / Sombra Determinística**: exige tratar o não-determinismo do LLM (modelo
  fixado, cache, regeneração reprodutível).
- **Sagas com compensação declarada** como protocolo padrão de mutação.

## 6. Selos de status

| Selo | Uso |
| --- | --- |
| ✅ **IMPLEMENTADO** | Existe, funciona e tem evidência verificável (código, testes, produção) |
| 🧪 **DEMONSTRAÇÃO** | Protótipo didático. Terminais, contagens de testes, tempos de deploy e laudos são **ilustrativos** |
| 🔭 **PROPOSTA** | Projeto ou pesquisa; ainda não implementado |

A matriz de cada afirmação está em [AFIRMACOES.md](AFIRMACOES.md) e o vocabulário em
[glossario.json](glossario.json).

## 7. Nomenclatura

- **Nome:** *Intent-Driven Development (IDD)*. Em português: *Desenvolvimento Orientado à
  Intenção*. Não usar "Intention-Driven", "Dirigido por" nem "Guiado por".
- **Autoria:** "IDD na formulação de Eliézer Rosa". Não usar "criador do paradigma" nem
  "paradigma cunhado por": o nome tem uso anterior e paralelo.
- **Datas biográficas:** a fixar pelo autor e usar de forma idêntica em todas as peças
  (pendência: início da carreira em 1976 vs. 1982; 2PC nos anos 80 vs. 90).
