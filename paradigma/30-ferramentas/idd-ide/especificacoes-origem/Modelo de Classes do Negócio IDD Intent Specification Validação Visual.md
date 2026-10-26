# IDD Intent Specification: Validação Visual Multimodal de Domínio

> **Nota para o Agente (Claude):** As referências acadêmicas e terminologias formais incluídas nesta especificação servem estritamente como **âncoras de precisão conceitual** para fundamentar a semântica das intenções. Elas não devem ser tratadas como exigências de implementação rígida ou dependências de bibliotecas específicas, mas sim como o arcabouço teórico para guiar a síntese neuro-simbólica.

---

## Contexto & Fundamentação Teórica

Atue como co-arquiteto do IDD IDE. O objetivo deste módulo é adicionar uma camada de **Verificação Dual-Modal (Texto + Espaço/Topologia)** ao modelo de dados do sistema.

Esta verificação se fundamenta em três pilares da Engenharia de Software e Ciência Cognitiva:

1. **Raciocínio Diagramático (*Diagrammatic Reasoning* - Larkin & Simon, 1987):** Aproveitamento da indexação espacial de informações para inferências lógicas topológicas que seriam computacionalmente custosas ou opacas na análise textual pura.
2. **Dimensões Cognitivas de Notações (*Cognitive Dimensions of Notations* - Green & Petre, 1996):** Avaliação de carga cognitiva, viscosidade e poluição visual (*visual clutter*) da representação do domínio.
3. **Prevenção de Erosão Arquitetural (*Architectural Erosion* - Perry & Wolf, 1992):** Garantia de que modificações no código não degradem a topologia de *Bounded Contexts* (Evans, 2003) definida no contrato conceitual.

---

## Declaração de Intenção (`intent`)

> Prover um mecanismo de **Verificação Visual Multimodal (Neuro-Simbólica)** para diagramas de domínio (estilo Excalidraw), correlacionando o grafo estruturado à percepção visual de um VLM (Vision-Language Model), para garantir que a topologia, a ergonomia cognitiva e os limites de contexto respeitem rigorosamente os contratos de intenção semântica.

---

## Restrições Invariantes (`constraints`)

1. **Abstração Tecnológica e Independência Notacional:**
* A validação visual deve focar nas propriedades topológicas e semânticas do grafo (conectividade, encapsulamento, centralidade), mantendo total desacoplamento de mecanismos específicos de renderização ou motores gráficos de baixo nível.


2. **Mitigação de *Cognitive Clutter* e *God Entities*:**
* O sistema deve monitorar a densidade de conexões e a centralidade de grau (*degree centrality*) das entidades. Modelos que apresentem alta viscosidade visual ou elementos visualmente dominantes que acumulem múltiplos papéis semânticos devem ser apontados como anomalias de ergonomia cognitiva.


3. **Preservação de Fronteiras de *Bounded Context*:**
* A representação gráfica dos *Bounded Contexts* deve funcionar como uma barreira topológica estrita. Relacionamentos que cruzem fronteiras sem passar por explicitados *Aggregate Roots* ou contratos de interface devem ser destacados como potencial vazamento de contexto (*context leakage*).


4. **Fidelidade de Semântica e Contract-Based Design:**
* A interpretação visual das cardinalidades ($1:1$, $1:N$, $N:M$) e dependências funcionais deve ser rigorosamente isomórfica às *constraints* declaradas no contrato do modelo relacional, prevenindo o *Stochastic Drift* visual.


5. **Relatório Multimodal Dual-Layer:**
* A saída da verificação deve produzir um artefato compreensível para humanos (anotações visuais/espaciais em Pull Requests) e estruturado computacionalmente para consumo em pipelines de integração contínua (CI/CD).



---

## Critérios de Aceite Executáveis (`acceptance`)

* **Cenário 1: Detecção de Entidade Centralizadora (*God Entity* / Carga Cognitiva)**
* **Dado** um diagrama onde uma única entidade possui um grau de acoplamento visual desproporcional em relação à média do grafo
* **Quando** a verificação multimodal for executada
* **Então** o sistema deve registrar uma anomalia baseada em *Cognitive Dimensions* (excesso de difusão/dependência) e recomendar o desmembramento conceitual do nó.


* **Cenário 2: Violação de Isolamento Topológico em *Bounded Contexts***
* **Dado** dois subdomínios delimitados espacialmente no diagrama
* **Quando** for detectada uma aresta conectando diretamente entidades internas sem mediação do nó raiz do agregador
* **Então** o relatório deve marcar a falha como erosão arquitetural de contexto com nível de gravidade *CRITICAL*.


* **Cenário 3: Divergência Isomórfica entre Contrato e Diagrama**
* **Dado** uma dependência funcional expressa no contrato de dados
* **Quando** a representação visual sugerir graficamente uma cardinalidade incompatível com a regra declarada
* **Então** o score de conformidade topológica deve ser reduzido e a divergência exata anotada com coordenadas e descrição conceitual.



---

## Entregável Esperado

Desenvolva a especificação dos agentes, os modelos de representação intermediária do grafo visual e o protocolo de avaliação do VLM, garantindo que a precisão conceitual dos princípios acadêmicos citados oriente a validação sem impor rigidez prematura de implementação.