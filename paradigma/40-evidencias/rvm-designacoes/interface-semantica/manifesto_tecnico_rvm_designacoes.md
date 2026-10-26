# Manifesto Técnico — RVM Designações

## Tese Central

O RVM Designações existe para reduzir a distância entre a intenção ministerial e a execução operacional do sistema.

Nossa premissa é simples: o software não deve obrigar o usuário a pensar como banco de dados, tabela ou formulário. O software deve compreender o contexto da tarefa, preservar as regras do domínio e devolver uma resposta operacional confiável.

Este manifesto define o RVM Designações como um sistema de duas camadas complementares:

1. uma camada convencional, explícita e resiliente para operação emergencial e controle direto
2. uma camada orientada à intenção, progressivamente Zero UI, para traduzir linguagem natural em ações de negócio e respostas visuais contextualizadas

Essas duas camadas não competem. Elas se reforçam.

## Fundamento Conceitual

O RVM Designações adota uma síntese de quatro linhas de pensamento:

1. a semântica de domínio como antídoto para a fricção entre humano e sistema
2. o rigor do Domain-Driven Design para nomear fronteiras, entidades, serviços e invariantes
3. o Intent-Driven Development como elevação da linguagem de negócio ao papel de instrução executável
4. a arquitetura Zero UI como consequência natural quando a intenção passa a ser a entrada principal do sistema

Em termos práticos, isso significa que a Linguagem Ubíqua não deve apenas documentar o software. Ela deve dirigir o software.

## Genealogia do Paradigma

Este manifesto não nasce apenas de uma oportunidade tecnológica recente. Ele nasce de uma linha longa de maturação intelectual sobre a relação entre linguagem, modelo, domínio e execução.

Essa genealogia pode ser lida em pelo menos cinco momentos:

1. a era da programação orientada à estrutura e ao processamento explícito, em que o rigor da operação dependia da precisão manual do programador
2. a emergência dos bancos de dados e das metodologias formais, que deslocaram o foco do código isolado para a organização semântica da informação
3. a disseminação dos paradigmas de orientação a objeto, que trouxeram de volta a centralidade da modelagem do mundo real
4. os experimentos com IA simbólica, lógica de predicados e motores de regra, que anteciparam a ambição de tratar linguagem e conhecimento como insumos executáveis
5. a convergência contemporânea entre DDD, IA generativa, interfaces agentic, command surfaces e Intent-Driven Development

O que muda agora não é apenas a capacidade de gerar texto ou código. O que muda é a possibilidade prática de fazer a linguagem do domínio funcionar como interface, instrução e coordenação operacional ao mesmo tempo.

## Trajetória Pessoal do Autor e Maturação da Visão

Este manifesto também é resultado de uma trajetória técnica de longa duração.

Em 1976, houve formação pela IBM do Brasil como Programador RPG II. A partir daí, ao longo de 17 anos, a atuação percorreu programação, análise de sistemas, suporte, banco de dados, metodologias de desenvolvimento e administração de dados, em seis empresas de médio e grande porte.

Essa trajetória incluiu:

- programação em RPG II, Cobol e DCAlgol
- desenvolvimento de sistemas nas áreas comercial, fiscal e recursos humanos
- atuação em suporte a desenvolvimento e banco de dados no ambiente Unisys com DASDL
- chefia de divisão de suporte a desenvolvimento e banco de dados
- chefia de divisão de metodologias

Na década de 90, essa experiência se expandiu para prospecção tecnológica e difusão de paradigmas emergentes.

Houve disseminação dos conceitos de orientação a objeto em palestras e cursos no Grupo Paes Mendonça, na UFBA e na TELEMAR, inclusive com elaboração de curso próprio baseado em uma pseudo linguagem OO idealizada especificamente para fins pedagógicos e conceituais.

Também houve pesquisas e projetos em IA simbólica, especialmente com lógica de predicados, incluindo a implementação em Cobol de um sistema de resolução de regras de predicado aplicado à área fiscal.

Essa trajetória é relevante porque mostra que a presente visão não nasce de fascínio imediato por LLMs. Ela nasce de décadas lidando com:

- tensão entre negócio e representação técnica
- necessidade de rigor operacional
- desenho de metodologias de desenvolvimento
- modelagem de dados e regras
- busca por linguagens mais próximas do domínio

O paradigma atual não rompe com esse histórico. Ele o prolonga.

## Desenvolvimento do Novo Paradigma

O novo paradigma proposto pelo RVM pode ser entendido como continuidade e síntese de várias buscas anteriores.

Primeiro, a busca por representação fiel do domínio.

Depois, a busca por metodologias que reduzam ambiguidade entre usuário, analista e programador.

Em seguida, a busca por linguagens e modelos que tornem o software mais aderente ao mundo real.

Mais tarde, a busca por sistemas capazes de operar sobre regras, inferência e conhecimento explícito.

Agora, a busca passa a ser a seguinte:

- como transformar intenção em operação segura
- como fazer o sistema compreender a tarefa sem dissolver o domínio
- como reduzir fricção sem voltar ao improviso
- como usar IA não para contornar arquitetura, mas para finalmente honrá-la

O RVM Designações se insere exatamente nesse ponto de inflexão.

## Diálogos com Outras IAs e Lapidação Conceitual

Este manifesto também foi amadurecido em conversas exploratórias, amenas e iterativas com outras IAs.

Não se trata, aqui, de registrar transcrições literais específicas que não foram preservadas integralmente neste documento. O ponto relevante é outro: registrar o papel que esses diálogos cumpriram no processo de formulação.

Essas interações funcionaram como espaço de:

- contraste entre paradigmas antigos e atuais
- síntese conceitual entre DDD, IA, Zero UI e desenvolvimento orientado à intenção
- refinamento de linguagem para nomear melhor o problema
- teste de coerência para hipóteses arquiteturais
- ampliação do repertório sobre ergonomia semântica, explicabilidade, trust calibration, progressive disclosure e mixed-initiative interaction

Esse tipo de diálogo não substitui o juízo humano. Ele funciona como interlocução de alto nível para acelerar síntese, explicitação e organização conceitual.

No contexto deste manifesto, as conversas com IAs ajudaram a explicitar algo que já estava latente: a interface do futuro não é simplesmente uma tela mais bonita nem um chat mais eloquente. Ela é uma superfície operacional em que linguagem, domínio, ação e visualização se alinham.

## Missão Arquitetural

O RVM Designações deve operar como um sistema semântico de coordenação congregacional.

Isso implica:

- representar fielmente o domínio real de designações, revisões, comunicação, histórico e elegibilidade
- permitir operação manual direta quando velocidade, clareza ou contingência exigirem interface tradicional
- permitir operação por intenção quando o usuário quiser expressar um objetivo e delegar ao sistema a tradução operacional
- manter rastreabilidade, segurança e previsibilidade em ambas as camadas

## As Duas Camadas de Desenvolvimento

## Camada 1 — UI Convencional de Segurança Operacional

Esta é a camada interna convencional. Ela existe para garantir continuidade operacional, inspeção explícita e ação direta.

### Objetivo

Fornecer uma interface tradicional baseada em abas, telas, tabelas, botões, campos e modais, adequada para:

- uso emergencial
- treinamento rápido
- tarefas sensíveis que exigem confirmação explícita
- fallback operacional quando fluxos orientados à intenção não forem desejáveis ou suficientes

### Características

- ações acionadas por componentes visíveis
- coleta de dados por formulários e campos explícitos
- navegação previsível por contexto funcional
- validação determinística antes da persistência
- transparência máxima sobre status, efeitos e histórico

### Materialização no RVM atual

- aba Apostila para importação, edição e geração
- aba Aprovações para revisão formal
- aba Publicadores para cadastro e manutenção
- aba Comunicação para S-89, S-140 e histórico
- modais especializados para envio, confirmação e ajustes finos

### Regra de Ouro da Camada 1

Se a camada orientada à intenção falhar, estiver indisponível ou gerar dúvida, a operação deve continuar integralmente pela camada convencional.

## Camada 2 — Operação Orientada à Intenção e Zero UI Progressiva

Esta é a camada estratégica. Ela não elimina a UI convencional; ela comprime a fricção cognitiva entre desejo e execução.

### Objetivo

Permitir que o usuário expresse a tarefa em linguagem natural ou semiestruturada, enquanto o sistema:

- interpreta a intenção
- identifica o contexto de domínio relevante
- escolhe as ações permitidas
- executa operações seguras
- devolve resposta visual, resumida, explicável e auditável

### Princípio Operacional

A intenção do usuário é a entrada primária. A interface passa a ser adaptativa e subsidiária.

Ou seja:

- o pedido vem em linguagem natural
- o domínio restringe o espaço de ação
- o agente traduz a intenção em comandos de negócio
- a resposta retorna em forma visual adequada ao contexto

### Zero UI, no contexto do RVM

Zero UI não significa ausência de interface. Significa redução radical da interface fixa.

No RVM, a forma madura dessa camada é:

- intenção no pedido
- domínio na mediação
- visualização na resposta

O exemplo mais claro já existente é a combinação entre a aba Agente e a visualização S-140: o usuário pede em linguagem natural; o sistema interpreta; o resultado volta como estrutura operacional e resposta visual verificável.

## A Aba Agente como Portal Semântico

No RVM Designações, a aba Agente não deve ser tratada como um chat lateral. Ela é o embrião da segunda camada.

Seu papel arquitetural é atuar como portal semântico entre:

- intenção humana
- modelo de domínio
- ações permitidas
- resposta visual e operacional

### Função Esperada da Aba Agente

A aba Agente deve evoluir para expor caminhos de intenção compreensíveis ao usuário final.

Exemplos:

- "quero designar a semana do dia 27 com equilíbrio"
- "mostre quem está pendente de confirmação"
- "prepare o S-140 desta semana e destaque conflitos"
- "abrir fluxo de recusa desta designação"
- "enviar confirmação para os designados da Vida Cristã"

O sistema, então, deve:

1. reconhecer a classe da intenção
2. associá-la ao bounded context correto
3. recuperar entidades, regras e restrições do domínio
4. executar ações ou propor um microfluxo
5. responder com visualização, justificativa e próximos passos

## Micro-UI por Intenção

Nem toda intenção deve resultar em execução direta. Em muitos casos, a melhor resposta é um modal mínimo e contextual para completar dados faltantes.

Este manifesto adota o conceito de micro-UI por intenção:

- a intenção abre o fluxo
- o domínio decide o que falta
- o sistema gera um formulário curto, específico e temporário
- o usuário completa apenas o necessário
- a execução prossegue com contexto preservado

Isso evita dois extremos ruins:

1. chats soltos que perguntam tudo de forma difusa
2. formulários gigantes e estáticos para tarefas simples

### Exemplo

Pedido do usuário:

> "Registrar que o irmão não poderá fazer a parte e avisar quem precisa saber"

Resposta arquitetural ideal:

1. o agente identifica o contexto de comunicação e designação
2. localiza a parte e o publicador
3. detecta que falta apenas o motivo ou confirmação final
4. abre um modal mínimo com os campos estritamente necessários
5. executa a recusa, atualiza status, registra logs e prepara a comunicação correspondente

## Domínio Antes da IA

A camada 2 só é segura se for ancorada no domínio.

O RVM não adota o paradigma de "chatbot solto". O agente de negócio só pode operar dentro de fronteiras semânticas e operacionais definidas.

### Regras Estruturais

- o agente não inventa entidades
- o agente não contorna invariantes de negócio
- o agente não persiste nada fora dos serviços, RPCs ou fluxos aprovados
- toda ação relevante deve ser explicável e rastreável
- intenções ambíguas devem gerar desambiguação, não improviso

## Bounded Contexts do RVM

O manifesto assume, no mínimo, estes contextos delimitados:

- Programação da Apostila
- Motor de Designações
- Aprovações
- Comunicação
- Publicadores e Elegibilidade
- Auditoria e Histórico
- Territórios e Trabalho de Campo

Cada intenção do usuário deve ser roteada para um desses contextos ou para uma composição explícita entre eles.

## Linguagem Ubíqua Obrigatória

O sistema deve consolidar uma linguagem ubíqua real, compartilhada entre código, interface, agente e operação humana.

Termos como:

- designação
- parte
- semana
- publicador
- ajudante
- confirmação
- recusa
- aprovação
- proposta
- S-89
- S-140
- pendência
- elegibilidade

não são apenas rótulos de tela. Eles são primitivas do domínio.

Quando a linguagem muda, o modelo muda. Quando o modelo muda, o agente deve mudar junto.

## Resposta Visual como Saída Semântica

No RVM, a melhor resposta para uma intenção raramente é apenas texto.

O sistema deve privilegiar respostas como:

- S-140 renderizado
- modal de confirmação focado na tarefa
- quadro comparativo de opções de designação
- lista de pendências priorizadas
- explicação resumida com ações seguintes

Texto livre continua útil, mas a saída final deve tender à visualização operacional.

## Critérios de Qualidade das Duas Camadas

Uma implementação aderente a este manifesto precisa satisfazer os seguintes critérios.

### Para a Camada 1

- previsibilidade
- clareza visual
- baixo risco operacional
- completude funcional
- fallback confiável

### Para a Camada 2

- interpretação semântica coerente
- roteamento correto para o domínio
- coleta mínima de dados faltantes
- explicabilidade da ação
- auditabilidade
- resposta visual útil

## Governança de Ações do Agente

Toda ação orientada à intenção deve se enquadrar em uma destas categorias:

1. consulta
2. simulação
3. preparação
4. confirmação guiada
5. execução com persistência

Quanto maior o impacto, maior o grau de explicitação exigido.

### Política recomendada

- consultas podem ser diretas
- simulações devem expor critérios e impactos
- preparações podem gerar rascunhos e previews
- confirmações guiadas exigem consentimento claro
- execuções persistentes devem registrar trilha de auditoria

## Implicações Técnicas para o RVM

Este manifesto implica algumas decisões práticas de engenharia:

- serviços de domínio continuam sendo a camada de verdade operacional
- RPCs atômicas continuam sendo a fronteira segura para mutações sensíveis
- a aba Agente deve usar intents tipadas, não apenas prompts livres
- respostas do agente devem combinar texto, dados estruturados e componentes visuais
- modais gerados por intenção devem ser curtos, orientados à tarefa e descartáveis
- logs precisam registrar intenção recebida, ação decidida e efeito persistido

## Roadmap de Evolução

### Fase A — Consolidação da Camada Convencional

- garantir cobertura funcional total por UI tradicional
- eliminar lacunas operacionais que obriguem o usuário a recorrer ao agente
- tornar estados, erros e confirmações visualmente inequívocos

### Fase B — Enriquecimento Semântico da Aba Agente

- explicitar catálogos de intenção para o usuário final
- melhorar o roteamento de intenções por contexto
- responder com ações guiadas e previews mais determinísticos

### Fase C — Micro-UIs por Intenção

- abrir modais focados a partir da intenção detectada
- solicitar apenas os dados faltantes para a execução
- integrar confirmação, recusa, comunicação e ajustes finos ao fluxo semântico

### Fase D — Zero UI Progressiva

- permitir que tarefas recorrentes sejam resolvidas com mínima navegação manual
- transformar respostas textuais em visualizações operacionais
- fazer a interface fixa ceder espaço a fluxos sob demanda guiados pela intenção

## Papel Humano no Processo

Esta iniciativa assume explicitamente uma parceria assimétrica e produtiva entre humano e IA.

Nesta jornada, o autor atua em dupla condição:

- como desenvolvedor humano, responsável por discernimento, direção arquitetural, rigor semântico e decisão final
- como usuário especialista da área alvo, trazendo o conhecimento do domínio real, das necessidades operacionais e das tensões concretas de uso

Essa dupla posição é estratégica. Ela evita duas falhas comuns:

1. soluções tecnicamente elegantes, mas desconectadas da operação real
2. soluções aderentes à operação local, mas pobres em arquitetura e evolução

O RVM Designações busca justamente a síntese entre essas duas dimensões.

## Aplicação Reflexiva do Paradigma

Os princípios deste manifesto não se aplicam apenas ao produto final. Eles também se aplicam ao próprio processo de engenharia de software que o constrói.

Em uma dinâmica coerente com Intent-Driven Development:

- o humano formula intenção, direção, limites e critérios
- a IA ajuda a explorar alternativas, sintetizar conceitos, estruturar artefatos e acelerar implementação
- o domínio continua sendo a fronteira de validação
- a decisão final permanece sob responsabilidade humana

Assim, o próprio desenvolvimento do RVM se torna demonstração do paradigma que ele propõe: menos fricção entre intenção e execução, sem abdicar de rigor, governança e verificabilidade.

## Afirmação Final

O RVM Designações não deve evoluir apenas como um sistema com IA. Ele deve evoluir como um sistema governado por intenção, ancorado em domínio e disciplinado por operação real.

A camada convencional garante continuidade, controle e segurança.

A camada orientada à intenção garante compressão cognitiva, velocidade operacional e semântica aplicada.

Nosso objetivo não é substituir telas por chat. Nosso objetivo é substituir fricção por compreensão operacional.

Quando a intenção do usuário puder ser traduzida com rigor, segurança e resposta visual adequada, o RVM deixará de ser apenas uma aplicação de gestão e passará a ser um sistema semântico de coordenação ministerial.