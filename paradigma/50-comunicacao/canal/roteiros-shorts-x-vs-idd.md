# Roteiros de Shorts — série "X vs IDD"

Roteiros para Eliézer Rosa gravar com a **própria voz e rosto** (celular), ~60 s cada. Antes de gravar: confira as frases "eu uso" (Claude Code, prompt engineering) e troque "o link do episódio completo" pelo link real na descrição. Base: Cânone v1.0-rc1, AFIRMACOES.md e GUIA-REDACAO.md. Linhas "Tela" são sugestões de texto na tela e não entram na contagem de palavras.

---

## 1. Claude Code vs IDD

**Título:** Claude Code vs IDD: quem decide o quê?

**Roteiro**

Você já deixou o Claude Code rodar solto e depois não entendeu o que ele fez? [pausa]
*Tela: Rápido não é entendido*

Eu gosto do Claude Code. Ele lê o projeto, edita arquivos, roda comandos e testes. Faz o como muito bem. Eu uso.
*Tela: Claude Code faz o como*

Mas quem decide o quê e o porquê? Isso é o Comando Epistêmico, e fica comigo. No IDD, na minha formulação, eu escrevo a intenção e as invariantes: regras de negócio inegociáveis, como contrato verificável. Um mecanismo determinístico confere. Não é a IA dizendo que está tudo certo. [pausa]
*Tela: Invariante = contrato verificável*

Aí eu aprovo o plano uma vez, o Confirm-Once, e o agente executa até o fim, reportando tudo. E o dicionário ubíquo avisa quando aparece um termo fora do vocabulário do domínio. Isso já existe na ferramenta idd-ide.
*Tela: Confirm-Once + dicionário*

Então não é um contra o outro. Eu pratico IDD usando o Claude Code. [pausa] O link do episódio completo está na descrição.
*Tela: Complementares*

**Descrição**

```text
✅ CONCEITO — Claude Code faz o como; o IDD fixa o quê e o porquê.
IDD — Intent-Driven Development, na formulação de Eliézer Rosa.
Selos: ✅ implementado · 🧪 demonstração · 🔭 proposta — Cânone v1.0-rc1
Repositório: https://github.com/EliezerRosa/idd-ide
#IDD #ClaudeCode #Shorts
```

Contagem de palavras do roteiro: 148

---

## 2. Cursor vs IDD

**Título:** Cursor vs IDD: o que o editor não decide por você

**Roteiro**

Seu editor completa o código antes de você terminar de pensar. Isso é bom? [pausa]
*Tela: Completou. Mas estava certo?*

O Cursor é um editor com IA muito bom. Tem autocomplete, chat e um agente que mexe em vários arquivos de uma vez. Acelera demais o trabalho.
*Tela: Cursor acelera o como*

Só que velocidade não define o que está certo. No IDD, na minha formulação, as regras inegociáveis do negócio viram invariantes, um contrato verificável fora do chat. Se o código viola uma invariante declarada, o gate detecta. [pausa]
*Tela: Regra declarada, violação detectada*

E quando o seu produto usa IA, entra o DAV. O modelo só interpreta a intenção e devolve uma ação com parâmetros, de um vocabulário fechado. Os dados nunca passam pelo modelo. Isso roda em produção no RVM Designações.
*Tela: DAV: o modelo não toca nos dados*

Dá para usar o Cursor e praticar IDD ao mesmo tempo. O link do episódio completo está na descrição.
*Tela: Mesma ferramenta, outro comando*

**Descrição**

```text
✅ CONCEITO — Cursor acelera o como; o IDD verifica o contrato.
IDD — Intent-Driven Development, na formulação de Eliézer Rosa.
Selos: ✅ implementado · 🧪 demonstração · 🔭 proposta — Cânone v1.0-rc1
Repositório: https://github.com/EliezerRosa/idd-ide
#IDD #Cursor #Shorts
```

Contagem de palavras do roteiro: 138

---

## 3. GitHub Spec Kit (Spec-Driven Development) vs IDD

**Título:** GitHub Spec Kit vs IDD: spec antes do código basta?

**Roteiro**

Escrever a especificação antes do código resolve o problema? Em parte. [pausa]
*Tela: Spec primeiro. E depois?*

O Spec-Driven Development, como no GitHub Spec Kit, tem uma ideia ótima. Primeiro a especificação, depois o plano, depois as tarefas, e só então os agentes geram código. Isso já é muito melhor do que sair pedindo no improviso.
*Tela: Spec-Driven: especificar primeiro*

Onde o IDD, na minha formulação, acrescenta? Primeiro, o Comando Epistêmico explícito: o humano detém o quê e o porquê, o agente detém o como. Segundo, as invariantes viram gate permanente, não só na hora de gerar. [pausa]
*Tela: Gate permanente, não só na geração*

Isso responde a uma lição do MDA: o modelo apodrece quando o código se afasta dele. Por isso o IDD pede verificação contínua. E o dicionário ubíquo já checa o vocabulário do domínio no CI do idd-ide.
*Tela: Verificar sempre, não só gerar*

Dá para usar o Spec Kit e praticar IDD por cima. O link do episódio completo está na descrição.
*Tela: Spec Kit + IDD*

**Descrição**

```text
✅ CONCEITO — Spec-Driven especifica antes; o IDD verifica sempre.
IDD — Intent-Driven Development, na formulação de Eliézer Rosa.
Selos: ✅ implementado · 🧪 demonstração · 🔭 proposta — Cânone v1.0-rc1
Repositório: https://github.com/EliezerRosa/idd-ide
#IDD #SpecKit #Shorts
```

Contagem de palavras do roteiro: 146

---

## 4. AWS Kiro vs IDD

**Título:** AWS Kiro vs IDD: spec no editor e o comando humano

**Roteiro**

E se o seu editor já te obriga a escrever a especificação antes? É o que o Kiro, da AWS, propõe. [pausa]
*Tela: Kiro: spec antes do código*

Eu acho a ideia certa. O Kiro organiza o trabalho em requisitos, design e tarefas, e os agentes seguem esse caminho. Isso dá ordem para o desenvolvimento com IA.
*Tela: Requisitos, design, tarefas*

O que o IDD, na minha formulação, acrescenta? Perguntas de autoridade. Quem decide o quê e o porquê? O Comando Epistêmico responde: o humano. E as regras inegociáveis viram invariantes, como contrato verificável, conferido de forma determinística. [pausa]
*Tela: Quem tem a autoridade?*

Eu aprovo o plano uma vez, o Confirm-Once, e o agente vai até o fim reportando tudo. A autonomia cresce com a evidência acumulada, não com a fé. E termo fora do dicionário ubíquo é ambiguidade para resolver antes de gerar código.
*Tela: Autonomia cresce com evidência*

Dá para praticar IDD usando o Kiro. O link do episódio completo está na descrição.
*Tela: Kiro + IDD*

**Descrição**

```text
✅ CONCEITO — Kiro organiza a spec; o IDD define quem tem a autoridade.
IDD — Intent-Driven Development, na formulação de Eliézer Rosa.
Selos: ✅ implementado · 🧪 demonstração · 🔭 proposta — Cânone v1.0-rc1
Repositório: https://github.com/EliezerRosa/idd-ide
#IDD #Kiro #Shorts
```

Contagem de palavras do roteiro: 146

---

## 5. Prompt engineering vs IDD

**Título:** Prompt engineering vs IDD: o prompt é a fonte de verdade?

**Roteiro**

Seu melhor prompt está salvo onde? No histórico de um chat? [pausa]
*Tela: Seu prompt está versionado?*

Prompt engineering é uma habilidade real. Saber pedir bem, dar contexto, mostrar exemplos. Isso melhora muito o resultado, e eu uso.
*Tela: Prompt bom ajuda*

Mas um prompt é uma conversa, não um contrato. No IDD, na minha formulação, a intenção vira artefato versionado, estruturado e auditável. As invariantes ficam declaradas e um mecanismo determinístico confere. Se o prompt some, a intenção continua. [pausa]
*Tela: Intenção versionada e auditável*

Eu comecei em 1976, com RPG II na IBM. A linguagem mudou muito. O que não mudou é a necessidade de um contrato claro com o negócio. E o dicionário ubíquo, que já existe no idd-ide, cuida do vocabulário desse contrato.
*Tela: Desde 1976: contrato claro*

Prompt engineering é um ótimo começo. IDD é o que vem depois. O link do episódio completo está na descrição. Comenta: onde mora o seu prompt?
*Tela: Onde mora o seu prompt?*

**Descrição**

```text
✅ CONCEITO — Prompt é conversa; a intenção versionada é contrato.
IDD — Intent-Driven Development, na formulação de Eliézer Rosa.
Selos: ✅ implementado · 🧪 demonstração · 🔭 proposta — Cânone v1.0-rc1
Repositório: https://github.com/EliezerRosa/idd-ide
#IDD #PromptEngineering #Shorts
```

Contagem de palavras do roteiro: 139
