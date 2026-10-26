# Roadmap da Playlist: Base de Conhecimento IDD

Este documento centraliza o planejamento editorial macro da série "Base de Conhecimento IDD" para o YouTube. Ele unifica ideias que estavam espalhadas entre os metadados do canal, o backlog de pautas e as conversas recentes.

## Visão Geral da Série
A série tem o objetivo de registrar, de forma enciclopédica e didática, os fundamentos teóricos e práticos do paradigma **Intent-Driven Development (IDD)**. 

---

## 📚 Temporada 1: Fundamentos Filosóficos e Teóricos
O objetivo desta fase é assentar a fundação intelectual do IDD antes de ir para o código.

### Ep. 1 — O que é IDD? (Concluído ✅)
* **Foco:** Apresentar a definição operacional e as 6 propriedades essenciais.
* **Tópicos:** O Confirm-Once Pattern; Diferença para Vibe Coding, DDD e BDD; O humano como fonte primária em NL.
* **Status:** Uploaded.

### Ep. 2 — Comando Epistêmico vs. Comando Operacional (Próximo ⏳)
* **Foco:** A fronteira que separa o *augmenting* da *credulidade*.
* **Tópicos:** Fé bayesiana; O caso do SGBD UNISYS/DASL; A falácia da revisão cega de PRs; Invariantes de negócio.
* **Status:** Roteiro programado; Pipeline pronto para rodar.

### Ep. 3 — A Genealogia do IDD
* **Foco:** Mostrar que o IDD não nasceu do nada, mas é a continuação histórica do augmentation humano.
* **Tópicos:** Engelbart (1962), Sutherland (Sketchpad), Alan Kay (Dynabook), Fred Brooks (Conceptual Integrity).
* **Status:** Planejado.

### Ep. 4 — Desempacotando o AEON
* **Foco:** Apresentar o acróstico que governa o orquestrador do IDD.
* **Tópicos:** 
  * **A**rquitetura ditada puramente pela intenção humana.
  * **E**volução contínua que dispensa a sintaxe do código tradicional.
  * **O**rquestração fluida entre múltiplos agentes autônomos.
  * **N**exus central traduzindo o pensamento direto para a malha digital.
* **Status:** Planejado.

---

## 💻 Temporada 2: A Prática do IDD (Show me the Code)
O objetivo desta fase é mostrar o IDD materializado no projeto real **RVM Designações**.

### Ep. 5 — Runbooks de Intenção na Prática
* **Foco:** Como a intenção humana vira um artefato executável (`.intent.md`).
* **Tópicos:** Como escrever comandos epistêmicos que a IA não pode violar; A anatomia de um bom runbook.
* **Status:** Planejado.

### Ep. 6 — O Papel vs. O Ator (DDD + IDD na Prática)
* **Foco:** O dia em que apaguei o Presidente da agenda e o sistema sobreviveu.
* **Tópicos:** Foreign keys não são detalhes, são declarações de honestidade de domínio; Como o banco de dados preserva a intenção humana quando modelado corretamente.
* **Status:** Rascunho no backlog (`episodio-papel-vs-ator-ddd...`).

### Ep. 7 — IDD + Banco de Dados: O Esquema Guiado por Intenção
* **Foco:** Como o banco (PostgreSQL/Supabase) age como o guardião rigoroso das invariantes de negócio.
* **Tópicos:** RLS (Row Level Security); Check Constraints criadas pela IA, mas ditadas pelo humano.
* **Status:** Planejado.

### Ep. 8 — Testes com IDD: Do Intent ao Assert
* **Foco:** Como testar sem escrever código de teste imperativo.
* **Tópicos:** O agente autônomo validando se as invariantes do Epistêmico se mantêm intactas.
* **Status:** Planejado.

---

## Como Atualizar Este Plano
Sempre que uma nova ideia surgir (ex: novos refactors épicos no RVM), basta adicionar como um novo episódio na Temporada 2 ou criar uma Temporada 3 focada em "Estudos de Caso".
