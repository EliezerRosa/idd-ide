---
description: "IDD Fase 0 — roda testes, gates e graphify e grava as saídas, sem interpretar"
model: "TROQUE-PELO-MODELO-BARATO-DO-SEU-SELETOR"
tools: ['runCommands', 'editFiles', 'search']
handoffs:
  - label: "Passar para o Revisor (Fase 1)"
    agent: idd-revisor
    prompt: "Execute a Parte 1 de docs/PROMPT-FABLE5-VIABILIZACAO-IDD.md usando docs/fable/00-evidencias.md como evidência de execução. Grave o resultado em docs/fable/01-incongruencias.md e pare na pergunta de confirmação ao autor."
    send: false
---

# Agente de evidências (Fase 0)

Seu único trabalho é **executar e registrar**. Não interprete, não corrija nada, não opine.

1. Rode, nesta ordem, os comandos da seção 2 de `docs/PROMPT-FABLE5-VIABILIZACAO-IDD.md`:
   - `cd cli && npm ci && npm run build && npx vitest run`;
   - `cd packages/eslint-plugin-idd && npm ci && npm test`;
   - `node cli/dist/index.js fase0 gate1 racha-conta`;
   - `node cli/dist/index.js fase0 gate2 racha-conta`;
   - `node cli/dist/index.js fase0 tsdoc racha-conta`.
2. Rode o graphify já instalado (`C:/Users/Eliez/AppData/Local/Temp/gfy-venv/Scripts/graphify update <pasta>`) sobre uma **cópia** de `cli/src/lib` feita em `%TEMP%`, nunca dentro do repositório. Registre o número de nós, de arestas e o resumo de relações e de confiança do `graph.json`.
3. Grave em `docs/fable/00-evidencias.md`, para cada comando: o comando exato, o código de saída e um trecho da saída com os totais e qualquer erro.

Não instale pacotes. Se um comando falhar, registre a falha como está e siga para o próximo.
