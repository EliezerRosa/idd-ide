# Interface Semântica Ergonômica Intuitiva

Coleção curada de documentos para orientar a evolução da interface do RVM Designações em direção a uma operação mais semântica, ergonômica e orientada por intenção.

## Conteúdo

- `manifesto_tecnico_rvm_designacoes.md`
  - Base arquitetural do sistema em duas camadas: UI convencional de segurança operacional + camada orientada à intenção / Zero UI progressiva.
- `ddd_ia_e_desenvolvimento_intencional.md`
  - Síntese conceitual ligando SIM, DDD, abstração por IA, Intent-Driven Development e Zero UI.
- `principios_interface_semantica_ergonomica.md`
  - Síntese operacional dos princípios de UX, IA, ergonomia semântica, slash commands, micro-UI e mixed-initiative interaction aplicados ao RVM.
- `catalogo_micro_uis_chat_agente.md`
  - Catálogo completo de micro-UIs possíveis para a aba Agente, com tipologia de transação, cruzamento com permissões, visibilidade e grau de prontidão.
- `matriz_implantacao_micro_uis_prioritarias.md`
  - Reduz o catálogo amplo a uma ordem executável de implantação, com contrato técnico mínimo, gates e ondas de rollout.
- `endurecimento_dominio_onda3.md`
  - Define o que ainda não deve ir ao chat sem reforço prévio de boundary transacional, preview determinístico, auditoria e reversão.
- `roadmap_tecnico_interface_semantica.md`
  - Desdobra os princípios em fases incrementais de implementação para a aba Agente e superfícies semânticas.
- `backlog_sprints_interface_semantica.md`
  - Organiza o roadmap em backlog executável por sprint, com prioridade e critério de saída.
- `checklist_revisao_ux_agente.md`
  - Checklist de revisão para novas features da aba Agente, intents, micro-UIs e respostas visuais.
- `mapeamento_codigo_paradigma_atual.md`
  - Cruza manifesto e princípios com o estado real do código, destacando pilares existentes, lacunas e prioridades.
- `documento_mestre_paradigma_intencional.md`
  - Consolidação autoral do paradigma, incluindo genealogia conceitual, roteiro de interação no app e aplicação reflexiva do IDD à própria engenharia de software.
- `roteiro_apresentacao_permissoes.md`
  - Documento do workspace com implicações práticas para gating de abas, permissões do agente e interface limpa por perfil.
- `plano_melhorias_chat_ia.md`
  - Materializado a partir da memória persistente do repositório por ausência de um `.md` explícito sobre slash commands no workspace.

## Critério de curadoria

Esta pasta prioriza documentos que ajudam a responder quatro perguntas:

1. Como a intenção do usuário vira entrada principal do sistema?
2. Como o domínio limita e explica a ação do agente?
3. Como a interface fica menor, mais contextual e mais segura?
4. Como elementos como slash commands, chips, ações pós-resposta e gating por permissão melhoram a ergonomia sem diluir o domínio?

## Observação

Durante a busca no workspace, não foi encontrado um Markdown explícito sobre `slash commands`. Por isso, o plano de melhorias do chat foi recuperado da memória persistente do projeto e incluído aqui como referência de produto e UX.

## Trilha Recomendada

1. `manifesto_tecnico_rvm_designacoes.md`
  - Define a tese central, as duas camadas e a primazia da intenção ancorada no domínio.
2. `ddd_ia_e_desenvolvimento_intencional.md`
  - Expande a base conceitual e situa o RVM na convergência entre DDD, IDD e Zero UI.
3. `principios_interface_semantica_ergonomica.md`
  - Traduz a visão em princípios acionáveis de interface, UX, comando, contexto, explicabilidade e segurança operacional.
4. `catalogo_micro_uis_chat_agente.md`
  - Converte a visão em um espaço completo de microfluxos possíveis, já filtrado por risco, permissão e visibilidade.
5. `matriz_implantacao_micro_uis_prioritarias.md`
  - Escolhe as primeiras micro-UIs que devem realmente entrar em produção e em que sequência.
6. `endurecimento_dominio_onda3.md`
  - Explicita quais fluxos de alto valor ainda pedem reforço estrutural antes de ganhar micro-UI.
7. `roadmap_tecnico_interface_semantica.md`
  - Organiza a sequência de implementação em fases incrementais e tecnicamente executáveis.
8. `backlog_sprints_interface_semantica.md`
  - Quebra o roadmap em ciclos executáveis de trabalho.
9. `mapeamento_codigo_paradigma_atual.md`
  - Mostra onde o paradigma já está presente no código e onde ainda faltam superfícies ergonômicas.
10. `checklist_revisao_ux_agente.md`
  - Vira critério de revisão contínua para não deixar a UX regredir.
11. `documento_mestre_paradigma_intencional.md`
  - Consolida a visão num texto único e conecta produto, processo e interação humano-IA.
12. `roteiro_apresentacao_permissoes.md`
  - Mostra como a camada semântica já precisa respeitar gating, papéis e limites de ação.
13. `plano_melhorias_chat_ia.md`
  - Material de produto para comandos slash, chips, ações pós-resposta e continuidade de contexto.

## Ponte Para Roadmap

- O manifesto define a direção.
- O documento de princípios define critérios de implementação.
- O catálogo de micro-UIs define o espaço completo de superfícies possíveis, já classificado por risco e por aderência ao permission gate.
- A matriz de implantação escolhe o subconjunto inicial que deve ser realmente construído primeiro.
- O documento de endurecimento da Onda 3 separa o que já pode ir ao chat do que ainda exige reforço estrutural no domínio.
- O roadmap técnico ordena a execução incremental.
- O backlog por sprint traduz a execução em ciclos concretos.
- O mapeamento de código ancora a visão no estado atual do projeto.
- O checklist protege a coerência de UX ao longo da evolução.
- O documento-mestre consolida a dimensão histórica, conceitual e reflexiva do paradigma.
- O roteiro de permissões define os limites de execução.
- O plano do chat sugere os primeiros mecanismos de interface a priorizar.