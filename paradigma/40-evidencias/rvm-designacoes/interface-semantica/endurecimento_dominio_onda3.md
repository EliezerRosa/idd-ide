# Endurecimento de Domínio — Onda 3 das Micro-UIs

## Objetivo

Definir quais fluxos de alto valor ainda não devem ser expostos como micro-UIs diretas no chat-agente sem reforço prévio de domínio, consistência e explicabilidade.

Este documento trata da camada de segurança estrutural que antecede a UX. A pergunta central aqui não é “como ficará a micro-UI?”, mas “o domínio já está suficientemente sólido para merecer uma micro-UI?”

## Critério de Bloqueio

Um fluxo permanece na Onda 3 quando pelo menos uma destas condições é verdadeira:

1. a escrita atual depende de múltiplas operações separadas sem boundary transacional claro
2. não existe cálculo confiável de impacto antes do commit
3. faltam intents tipadas e auditáveis para a ação
4. a reversão não é simples, explícita ou previsível
5. o usuário pode tomar uma decisão destrutiva sem ver efeito suficiente

## Fluxo 1 — Renomear publicador com propagação

## Estado atual

- o cadastro é atualizado em uma operação
- a propagação do nome para partes ocorre em outra operação posterior
- o fluxo hoje depende da camada de App e não de um serviço unificado de domínio

## Risco

- atualização parcial: cadastro alterado, partes não propagadas
- inconsistência temporária entre `resolvedPublisherName`, `rawPublisherName` e histórico operacional
- dificuldade de preview real antes do commit

## Endurecimento necessário

1. criar boundary de domínio único para `renamePublisherWithPropagation(...)`
2. calcular prévia antes do commit
3. retornar diff resumido: quantas partes futuras, quantas históricas, quantas pendentes
4. registrar auditoria única da operação composta
5. definir estratégia explícita de rollback ou compensação

## Só depois expor no chat

- micro-UI de rename com preview de impacto

## Fluxo 2 — Resolver duplicidade de publicadores

## Estado atual

- a UI consegue apontar duplicidades aparentes
- ainda não existe serviço de domínio de merge seguro

## Risco

- apagar o cadastro errado
- perder aliases, vínculos familiares, flags e histórico sem reconciliação
- quebrar referências futuras de designação

## Endurecimento necessário

1. criar serviço explícito de `mergePublishers(sourceId, targetId)`
2. definir política de precedência de campos
3. propagar aliases e relacionamentos familiares
4. reconciliar referências em partes e comunicações futuras
5. produzir preview de diferenças antes da consolidação
6. gerar auditoria detalhada do merge

## Só depois expor no chat

- micro-UI de consolidar duplicidade

## Fluxo 3 — Reimportação com diff semântico

## Estado atual

- a reimportação exclui estado atual e importa novamente
- o usuário não vê diff semântico antes do commit

## Risco

- descarte de ajustes manuais importantes
- perda de alterações locais não óbvias
- reentrada de ruídos de importação sem percepção prévia

## Endurecimento necessário

1. criar etapa de comparação entre estado atual e fonte jw.org
2. classificar diff por categorias:
   - partes removidas
   - partes novas
   - duração alterada
   - títulos alterados
   - designações locais possivelmente perdidas
3. expor diff resumido e diff detalhado
4. permitir confirmação consciente por categoria de impacto
5. registrar auditoria do descarte e da nova carga

## Só depois expor no chat

- micro-UI de reimportar com preview comparativo

## Fluxo 4 — Preview comparativo de regras do motor

## Estado atual

- o sistema já persiste novas regras do motor
- ainda não compara explicitamente efeito antes/depois para a semana ou parte em foco

## Risco

- ajuste cego de pesos e cooldowns
- mudança global com efeito pouco visível na operação do usuário
- dificuldade de explicar por que o ranking mudou

## Endurecimento necessário

1. criar simulação local comparativa entre configuração atual e proposta
2. mostrar pelo menos top N antes/depois para parte ou semana em foco
3. destacar quais fatores mudaram o ranking
4. separar claramente “simulação” de “persistência”
5. registrar auditoria da decisão final

## Só depois expor no chat

- micro-UI de editar engine config com preview comparativo

## Requisitos Técnicos Transversais

Estes requisitos valem para qualquer fluxo que ainda esteja na Onda 3.

### 1. Boundary de domínio único

- a operação deve sair da camada de composição informal e entrar em um serviço claro, nomeado e testável

### 2. Preview determinístico

- o prepare precisa produzir um impacto reproduzível, não apenas um texto heurístico

### 3. Auditoria composta

- a ação do usuário deve gerar uma trilha única e semanticamente legível

### 4. Reversão explícita

- quando rollback real não for possível, deve existir compensação operacional claramente descrita

### 5. Gate forte de permissão e visibilidade

- a descoberta da micro-UI, os dados exibidos e o commit final devem ser todos filtrados separadamente

## Resultado Esperado

Com esse endurecimento, a Onda 3 deixa de ser um “talvez futuro” e vira um backlog técnico objetivo: primeiro reforçar domínio e previsibilidade, depois liberar a micro-UI correspondente no chat-agente.