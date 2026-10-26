# Documento-Mestre — O Paradigma Intencional no RVM e na Própria Engenharia de Software

## Tese

O que está em construção no RVM Designações não é apenas uma interface com IA. É a tentativa disciplinada de reorganizar a relação entre linguagem, domínio, operação e desenvolvimento.

O novo paradigma pode ser resumido assim:

- a intenção humana deixa de ser um comentário periférico
- o domínio deixa de ser apenas documentação
- a interface deixa de ser um obstáculo fixo
- a IA deixa de ser improviso e passa a ser mediação operacional disciplinada

## Linha Histórica da Transformação

Há uma continuidade clara entre experiências antigas e a oportunidade atual.

Primeiro veio a precisão procedural da programação clássica.

Depois, a centralidade dos dados, dos esquemas e das metodologias.

Mais tarde, a orientação a objeto recolocou o mundo real no centro da modelagem.

Em paralelo, a IA simbólica mostrou que regras, predicados e inferência podiam participar da operação do sistema.

Hoje, com IA generativa, command surfaces, interfaces multimodais e IDD, essas correntes convergem. Pela primeira vez, a linguagem do domínio pode operar como entrada executável em escala prática.

## O RVM como Síntese Operacional

No RVM, essa síntese assume a forma de duas camadas:

- uma camada convencional para continuidade, clareza e fallback
- uma camada orientada à intenção para reduzir atrito e transformar linguagem em coordenação operacional

Essa segunda camada só é segura porque continua ancorada em:

- bounded contexts
- linguagem ubíqua
- serviços de domínio
- permission gate
- auditoria

## Ergonomia Semântica

Ergonomia, aqui, não significa apenas boa aparência.

Ergonomia significa reduzir o esforço mental necessário para transformar intenção válida em ação correta.

Isso exige:

- contexto visível
- progressive disclosure de comandos
- respostas visuais operacionais
- explicabilidade curta e situada
- micro-UIs por lacuna real
- continuidade entre conversa e execução

## Roteiro de Interação no App

O fluxo ideal de interação entre usuário e sistema dentro do app segue um roteiro semântico relativamente estável.

### Etapa 1 — Formulação da intenção

O usuário expressa o que quer em linguagem natural ou semiestruturada.

Exemplos:

- “quero designar esta semana com equilíbrio”
- “mostre quem está pendente”
- “prepare o S-140 e destaque conflitos”

### Etapa 2 — Ancoragem de contexto

O sistema identifica:

- semana em foco
- entidades relevantes
- perfil e permissões
- bounded context envolvido

### Etapa 3 — Restrição pelo domínio

Antes de agir, o sistema limita o espaço de possibilidade com base em:

- elegibilidade
- regras de negócio
- histórico
- governança de risco

### Etapa 4 — Resposta inicial do sistema

O sistema responde de um destes modos:

- consulta direta
- simulação
- preview
- proposta de ação
- pedido mínimo de dados faltantes

### Etapa 5 — Complemento humano quando necessário

Se faltar algo, o sistema solicita apenas o mínimo necessário, idealmente por micro-UI.

### Etapa 6 — Execução e materialização

A ação é executada por serviços aprovados e o resultado retorna em forma operacional:

- S-140
- lista
- cartão
- modal
- confirmação

### Etapa 7 — Continuidade

Depois da resposta, o usuário não recomeça do zero.

Ele recebe continuidade por meio de:

- ações pós-resposta
- chips contextuais
- slash commands
- retomada de contexto

## O Mesmo Roteiro Aplicado à Engenharia de Software com IDD

Os mesmos princípios podem e devem ser usados no próprio desenvolvimento do sistema.

Na prática, a nossa interação de engenharia já obedece a uma forma embrionária de IDD.

### Etapa 1 — Intenção arquitetural

Você define objetivo, direção, tese e limites.

Exemplos:

- “crie uma coleção de documentos para este tema”
- “transforme isso em princípios”
- “implemente os três passos”

### Etapa 2 — Exploração assistida

Eu recupero contexto, mapeio código, cruzo documentos, consulto referências e estruturo alternativas.

### Etapa 3 — Síntese semântica

O pedido deixa de ser uma instrução genérica e passa a ser refinado em artefatos:

- manifesto
- princípios
- roadmap
- checklist
- backlog
- implementação parcial no código

### Etapa 4 — Execução incremental

A engenharia não salta direto para um produto final completo. Ela percorre ciclos:

- intenção
- síntese
- implementação
- validação
- memória persistente

### Etapa 5 — Governança humana

Você atua simultaneamente como:

- desenvolvedor humano
- usuário especialista do domínio alvo

Isso garante que a IA não substitua critério, mas amplifique capacidade de formulação e execução.

## Convergência entre Produto e Processo

O aspecto mais forte dessa abordagem é a simetria.

O RVM pretende operar por intenção.

E o próprio desenvolvimento do RVM passa a acontecer, em boa parte, por intenção guiada, sem perder rigor técnico.

Essa simetria é importante porque:

- o processo de engenharia vira laboratório do próprio paradigma
- a UX do produto pode aprender com a UX do desenvolvimento
- o sistema deixa de ser apenas construído com IA e passa a ser pensado a partir da lógica da colaboração intencional

## O que Já Está em Curso

Hoje, o repositório já mostra sinais concretos dessa transição:

- chat multimodal operacional
- executor de ações estruturadas
- permission gate
- visualização de S-140
- modais orquestrados pela IA
- contexto ativo e ações pós-resposta iniciais no chat

Ou seja: a base do novo paradigma já existe. O que está em evolução é a camada de ergonomia semântica que tornará essa base mais clara, mais contextual e mais poderosa.

## O que Vem a Seguir

Os próximos ciclos lógicos são:

1. chips contextuais
2. slash commands
3. contexto conversacional persistente
4. micro-UIs por intenção
5. catálogo de intents tipadas
6. mais respostas visuais e menos texto puro

## Afirmação Final

O novo paradigma não é o abandono da engenharia. É a sua intensificação semântica.

Quando a intenção humana, o domínio modelado, a IA mediadora e a interface operacional trabalham como partes coerentes do mesmo sistema, o software deixa de ser apenas uma aplicação com telas e passa a ser um meio mais direto entre compreensão e ação.

Esse é o horizonte do RVM Designações.