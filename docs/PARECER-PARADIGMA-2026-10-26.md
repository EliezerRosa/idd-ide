# Parecer sobre o Paradigma IDD (não sobre a ferramenta)

**Data:** 2026-10-26
**Autor do parecer:** Claude (agente), a pedido de Eliézer Rosa
**Escopo:** o paradigma como corpo de ideias e como é comunicado ao público. Os pareceres de
2026-09-04 ([PARECER-E-PROPOSTA](PARECER-E-PROPOSTA-2026-09-04.md),
[VEREDITO](VEREDITO-CONTRAPROPOSTAS-2026-09-04.md)) avaliaram o IDD-IDE e continuam válidos.
**Corpus:** todo o acervo em [`paradigma/`](../paradigma/README.md): knowledge base, documento
mestre, manifesto acadêmico, ciclo de vida/Fase 0, cerca de 15 apresentações HTML e roteiros,
narrações e legendas de cerca de 60 vídeos (Base Ep01–03, Manifesto, Refrigeração 1–5,
Metodologia 1B–4F, Teoria Ep04–10, Perspectiva Técnica, casos de uso, Melissa). Cada afirmação
técnica foi cruzada com o código do repo (`cli/`, `packages/`) e com os apps de exemplo.

---

## 1. Veredito em uma frase

O núcleo do IDD é **sólido, útil e original na combinação**. Mas o discurso público de
out/2026 **passou à frente da evidência**, e isso hoje é o maior risco do paradigma. O IDD
pede "fé bayesiana" (confiança proporcional à evidência auditável) e, em parte da comunicação,
pede credulidade.

## 2. O que é forte e merece ser preservado

| Contribuição | Por que é valiosa |
| --- | --- |
| **Comando Epistêmico vs. Operacional** | É a melhor ideia do corpus. É simples, ancorada em Licklider ("Men will set the goals…") e Engelbart, e operacionalizável: diz *quem decide o quê*. Resolve com clareza a diferença para o vibe coding. |
| **DAV (Deterministic Action Vocabulary)** | É a contribuição técnica mais original e verificável: o LLM interpreta *intenção*, nunca *dados*, e há um fast-path sem LLM. Está implementada no RVM (9 handlers + regex PT-BR), tem custo/benefício mensurável e é o contraponto concreto à alucinação. |
| **Confirm-Once + Fé Bayesiana** | Dão um modelo de autonomia graduada fácil de ensinar e de auditar. |
| **Invariantes de domínio como "constituição"** | Os exemplos de domínio são excelentes e tecnicamente sensatos: pressão de descarga > sucção, slot único da cadeira, invariante temporizada com Expand-and-Contract. |
| **Simetria produto/processo** | O RVM opera por intenção *e* é construído por intenção. Isso transforma o próprio trabalho em laboratório. |
| **Prática real** | Há RVM em produção, NexusLog CRM criado por uma leiga, CLI com ~900 testes, dicionário ubíquo funcionando como hard gate e dezenas de vídeos publicados. Poucos "paradigmas" têm isso. |
| **Momentos de honestidade** | A aula de mai/26 tem um slide de "Desafios e Críticas", e a tabela "Operacional / Parcial / Planejado" de *3 perspectivas* é exemplar. A *Perspectiva Técnica* apresenta os 5 pilares como "o que falta". **Esse tom é o ativo mais valioso do canal.** |

## 3. Problemas, em ordem de gravidade

### 3.1 Promessas apresentadas como fatos (grave: credibilidade)

| Afirmação pública | Onde | Evidência no acervo |
| --- | --- | --- |
| Invariantes "provadas matematicamente via SMT (Z3/Dafny)", "REJEIÇÃO FORMAL Z3" | Teoria Ep06, manifesto acadêmico | **Nenhuma.** Zero ocorrências de Z3/SMT/Dafny em `cli/`, `packages/` e nos apps |
| "Alucinações são impossíveis de passar" | manifesto §2.2 | Sem mecanismo que garanta isso |
| Intent IR / AST do domínio com gramática | Teoria Ep05 | O que existe é `.intent.yaml` com `constraints` em texto livre |
| Máquina de Diff de Intenções sobre grafo (Classes A/B/C) | Ep4C, manifesto §2.6 | `diff.ts` faz checagens por regex |
| "240 testes aprovados em 1,42 s", "deploy em 3,8 s", `migration_001… APLICADO` | Refrigeração Ep3/Ep4 | Não existe app de refrigeração, nem os testes, nem a migration |
| Offline-first (IndexedDB/CRDT) | Ep4F | Zero ocorrências nos apps |
| "99% de redução de ambiguidade", "99,99% de eficiência" | apresentações jun/26 | Números sem método |

Também há **erros conceituais** que um público acadêmico (exatamente o público-alvo das
hashtags `#PLDI` e `#POPL`) percebe na hora:

- "provado **satisfatível** e inviolável": para provar uma invariante, mostra-se que a *negação*
  é **UNSAT**.
- "prova por indução" atribuída ao SMT.
- Ep3D adota 2PC, enquanto Ep08 e a Perspectiva dizem que o 2PC "não escala".

Terminais encenados e um laudo assinado como engenheiro (CREA/CFT) também precisam de marcação
explícita de "simulação" se não forem reais.

**Por que é grave:** é a única coisa capaz de destruir o resto. O DAV e o Comando Epistêmico
resistem a qualquer escrutínio. O "Z3 verified" encenado não resiste, e contamina a confiança
no que é verdadeiro.

### 3.2 O paradigma viola a própria Linguagem Ubíqua

O corpus foi escrito com vários coautores de IA (Copilot, Gemini, Claude), e cada um trouxe
vocabulário próprio:

- **Nome:** Intent-Driven *e* Intention-Driven (Melissa, Fase 0); em português, "orientado
  a / por / dirigido / guiado por".
- **Sigla:** SHALA (specs) *vs.* SHADA (ciclo de vida, Fase 0).
- **Contagens que não batem:** 6 propriedades · 5 princípios · 5 pilares · 7 perspectivas ·
  ciclo de 8 / 5 / 4 etapas · 5 níveis de maturidade *vs.* "Nível 6" · 2 *vs.* 3 camadas.
- **Biografia divergente** entre episódios: início da carreira em 1976 vs. 1982; 2PC nos anos
  80 vs. 90.
- **AEON** era o centro em mai/26 e desaparece em out/26. O "Ep04 — Runbooks" anunciado virou
  "Neuro-Simbólico".

Um paradigma cuja tese é "termo fora do dicionário é ambiguidade" precisa de **um dicionário
ubíquo do próprio paradigma**. O `idd dictionary` já existe e pode ser usado no próprio canon.

### 3.3 A tese central, como formulada, é mais fraca do que a prática

"A linguagem natural é o código-fonte; o código é epifenômeno descartável" convida a objeção
de Dijkstra (*On the foolishness of natural language programming*) e não descreve o que
realmente funciona no IDD. O que funciona é:

> **intenção em LN** (o *porquê*, autoridade humana) → **contrato estruturado** (invariantes,
> vocabulário DAV, `.intent.yaml`, dicionário) → **verificação determinística** (gates,
> testes, AST) → código regenerável.

A LN não é a fonte *executável*: é a fonte de **autoridade e rastreabilidade**. A força do IDD
está na camada do meio, que é exatamente onde ele parece com Design by Contract e com BDD.

Além disso, "Sombra Determinística" e "o código pode ser regenerado cem vezes" exigem tratar o
**não-determinismo do LLM** (fixar modelo/versão, cache de saídas, regeneração reprodutível).
O corpus não aborda isso.

### 3.4 Linhagem com lacunas e reivindicação de autoria arriscada

- **Faltam os precursores mais próximos:**
  - **Design by Contract** (Meyer/Eiffel, 1986): invariantes, pré e pós-condições.
  - **MDA/MDE** (OMG, 2001): "o modelo é o ativo, o código é derivado". O fracasso do MDA
    (round-trip, drift entre modelo e código) é a lição mais importante para a "Sombra".
  - **Spec-Driven Development** (GitHub Spec Kit, AWS Kiro, 2025): é o concorrente direto e
    atual. O Ep10 toca nisso, mas a knowledge base não.
- **A sigla não é exclusiva, mas a formulação é própria.** O ebook *Intent-Driven Development*
  v0.2 (Richard Stockley, 13/04/2026) e o intent-driven.dev usam a mesma sigla para uma
  **metodologia documental** de especificação, não para um paradigma nem para uma ferramenta.
  As datas dos arquivos locais confirmam que E. Rosa só conheceu os dois em jul/2026, depois da
  série publicada; ele adotou a sigla do uso que circulava na rede. "Paradigma cunhado por" é
  contestável quanto à sigla. **"IDD na formulação de Eliézer Rosa"** é exato e reivindica o
  que é seu: Comando Epistêmico como critério operacional, DAV, Confirm-Once, simetria
  produto/processo e IDD-IDE (linha do tempo no Cânone §8).
- A autoinserção na linha do tempo ao lado de Bush, Engelbart e Kay e o *name-dropping*
  (DeepMind, Stanford DSPy, LLVM, Pat Helland) sem integração mostrada soam como **apelo à
  autoridade**. A linhagem convence mais quando diz o que o IDD *toma* de cada um e *onde
  diverge*, e isso a knowledge base já faz bem na tabela §5.

### 3.5 Falta evidência empírica sistemática

Não há métricas comparativas. A tese "validar pela experiência, sem ler o código" (Melissa,
Ep4) colide com a tese de rigor formal e precisa de dados. Há caminhos baratos, com dados que
já existem:

- **Custo:** tokens e latência do DAV *vs.* LLM com dados (RVM).
- **Drift:** violações detectadas pelo `verify`/LSP por semana (Intent Store já guarda).
- **Qualidade:** defeitos escapados por módulo com e sem `.intent`.
- **Motor vs. Agente:** o teste de jul/26 é exatamente o tipo de experimento certo. Falta
  publicá-lo com o método.

### 3.6 Escopo difuso

O mesmo termo "IDD" cobre quatro coisas diferentes:

1. uma **filosofia** (augmenting, comando epistêmico);
2. um **método** (ciclo, Fase 0, runbooks, ação atômica);
3. uma **arquitetura de produto** (DAV, Zero UI, ergonomia semântica no RVM);
4. uma **ferramenta** (IDD-IDE).

Isso torna difícil dizer o que é "fazer IDD". Recomendo nomear e versionar as camadas
separadamente.

## 4. Recomendações

1. **Escrever o Cânone v1.0**: um documento versionado com definição, princípios (número
   único), glossário e uma **matriz Afirmação → Evidência → Status** (implementado / parcial /
   hipótese / visão). Todo vídeo e apresentação cita a versão do cânone.
2. **Rotular o futuro como futuro.** Episódios de visão (SMT, Intent IR, Diff semântico) ganham
   um selo "Visão / em pesquisa". Terminais e laudos encenados ganham "simulação". Corrigir o
   erro SAT/UNSAT. Isso custa pouco e protege tudo.
3. **Reformular a tese central** como em §3.3 ("LN é a fonte de autoridade; o contrato é a fonte
   executável; a verificação é determinística").
4. **Completar a linhagem** com DbC, MDA (e a lição do fracasso dele) e Spec-Driven Development,
   e posicionar o nome como "IDD na formulação de…".
5. **Fazer do DAV o carro-chefe técnico.** É original, implementado e mensurável. Um artigo curto
   com os dados do RVM vale mais que sete perspectivas teóricas.
6. **Publicar um experimento** (Motor vs. Agente, com método e números).
7. **Dogfooding do dicionário**: `idd dictionary check --strict` sobre o próprio cânone e os
   roteiros.

## 5. Reorganização do acervo

A estrutura atual (`00-precursores` … `07-duvidas`) foi feita para consolidar *de onde as coisas
vieram*. Para o paradigma, faz mais sentido organizar pelo **papel epistêmico** de cada artefato.
A proposta está em [`paradigma/PROPOSTA-REORGANIZACAO.md`](../paradigma/PROPOSTA-REORGANIZACAO.md)
e ainda não foi aplicada.
