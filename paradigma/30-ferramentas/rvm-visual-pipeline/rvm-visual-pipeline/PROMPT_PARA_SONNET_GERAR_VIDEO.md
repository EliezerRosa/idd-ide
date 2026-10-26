# Prompt para Sonnet 4.6 High — Gerar vídeo MP4 da apresentação interativa de Eleição de Candidatos

> Cole este arquivo INTEIRO como prompt para o Sonnet 4.6 High. Ele tem tudo
> que o colega precisa para entregar em uma rodada só.

---

## 1. Sua tarefa (one-shot)

Você (Sonnet 4.6 High) vai gerar um pipeline que produz **um único arquivo
MP4 1920×1080 @ 30 fps** chamado `eleicao-candidatos-apresentacao.mp4` a
partir da apresentação HTML interativa já pronta em
`rvm-designacoes-unified/docs/graphs/visual/eleicao-candidatos-apresentacao-interativa.html`.

O vídeo deve mostrar exatamente o que um usuário humano veria rodando a
apresentação em modo `Play auto` na ordem natural, **mas sem nenhum controle
visível**, com **áudio narrado em pt-BR** e a **dinâmica do dedo apontador
👉 / 👈 perfeitamente sincronizada com a fala**. O modal de introdução também
é lido em voz alta no início do vídeo.

Entregáveis obrigatórios (todos no mesmo PR):

1. Modo "video" no próprio HTML — adicionar suporte a `?video=1` na URL que:
   - oculta `.toolbar`, `.controls`, `.intro-actions` (botão "Começar"),
     barra de status inferior e qualquer scrollbar visível;
   - reescala o layout para que `.viewer` + painel lateral ocupem
     1920×1080 limpo (vide §4);
   - emite eventos `CustomEvent('rvmVideoTick', { detail: {...} })` na
     `window` em cada ponto-chave da narração (início do intro, início de
     cada caminho, início de cada nó, fim total) — usado pelo recorder
     como sincronização auxiliar para debug.
2. Script de gravação `tools/record_eleicao_video.mjs` (Node 20 +
   Playwright) que:
   - sobe um http.server local na pasta `visual/` se já não houver um em
     `localhost:5500`;
   - abre a página com `?video=1&autostart=1`;
   - usa `page.video()` do Playwright (chromium, viewport 1920×1080,
     `recordVideo: { dir: ..., size: { width:1920, height:1080 } }`);
   - aguarda o evento `rvmVideoDone` antes de fechar a página;
   - extrai o `.webm` gerado e converte para `.mp4` (libx264, yuv420p,
     CRF 18, faststart).
3. Pipeline de áudio offline `tools/synth_audio.mjs` (Node, usa
   `edge-tts`/`microsoft-cognitiveservices-speech-sdk` — escolha **uma**
   voz neural pt-BR: `pt-BR-AntonioNeural` para narração geral OU
   `pt-BR-FranciscaNeural`; commit a decisão no README):
   - lê o HTML, importa via parsing as constantes `INTRO_SCRIPT`,
     `GRAPHS`, `GRAPH_INTENT`, `NARRATIVE_BY_INDEX`, `FLOWS` (ver §3);
   - gera um `.wav` por segmento;
   - escreve `tools/manifest.json` com tempo de cada segmento (duração
     real em ms) na ordem exata que o `Play auto` percorre.
4. Em runtime, o HTML em modo vídeo **NÃO usa SpeechSynthesis do browser**
   (qualidade ruim e tempos variáveis). Em vez disso, pré-carrega os
   `.wav` listados no `manifest.json` e toca um por vez via `HTMLAudioElement`;
   `before/after/pauseAfter` continuam disparando como hoje, mas o "fim"
   de cada utterance vem do evento `ended` do áudio real. Isso garante
   sincronia exata entre fala e dedo.
5. Script orquestrador `tools/build_video.mjs`:
   ```
   1) synth_audio.mjs   -> tools/audio/*.wav + tools/manifest.json
   2) record_video.mjs  -> tools/out/eleicao-candidatos-apresentacao.webm
   3) ffmpeg merge      -> mux do áudio concatenado por cima do vídeo
                            (porque page.video() do Playwright não captura
                            áudio do <audio> elemento de forma confiável);
                            usar timestamps do manifest para concat.
   4) ffmpeg final      -> eleicao-candidatos-apresentacao.mp4
   ```
6. README curto `tools/README.md` com `npm i && npm run build:video`.

---

## 2. Arquivos do repositório que você precisa conhecer

> Caminhos relativos à raiz do workspace `rvm-designacoes-unified/`.

- `docs/graphs/visual/eleicao-candidatos-apresentacao-interativa.html` —
  apresentação. NÃO crie uma cópia; **edite este mesmo arquivo** para
  acrescentar o modo `?video=1`. O HTML é self-contained (CSS + JS inline).
- `docs/graphs/visual/eleicao-candidatos-overview.svg`
- `docs/graphs/visual/eleicao-candidatos-generation-flow.svg`
- `docs/graphs/visual/eleicao-candidatos-eligibility-decision-tree.svg`
- `docs/graphs/visual/eleicao-candidatos-ui-agent-comparison.svg`

Tudo já roda em `http://localhost:5500/eleicao-candidatos-apresentacao-interativa.html`
quando há um `python -m http.server 5500` em `docs/graphs/visual/`.

---

## 3. Roteiro EXATO da narração (não improvisar)

A ordem do vídeo é uma única timeline:

### 3.1. Intro (modal de introdução — sempre lido no início)

Texto a sintetizar (concatene tudo num único WAV `intro.wav`, voz pausada,
pitch 1.0, rate 0.95):

```
Bem-vindo à apresentação interativa do RVM Designações.

Objetivo: mostrar, em quatro grafos navegáveis, como o RVM Designações
decide quem faz o quê na reunião — do construtor de contexto até a
elegibilidade fina por modalidade — e como as quatro superfícies (motor
automático, UI manual, painel de diagnóstico e agente de IA) chegam à
mesma verdade.

Esta apresentação tem quatro abas: Overview do Fluxo, Generation Flow,
Eligibility Decision Tree e Comparação UI vs Agente. Cada uma é um ângulo
diferente do mesmo sistema.

Em cada aba, o vídeo percorre o grafo caminho por caminho, anunciando
primeiro o objetivo de cada caminho, e depois cada nó com uma descrição
coloquial e um comentário mais profundo da IA. O dedo apontador segue o
nó que está sendo narrado, e o painel à direita mostra a explicação e o
comentário do nó ativo.

Vamos começar pela visão geral.
```

Enquanto o intro toca, **NO modo vídeo**: manter o overlay de introdução
visível por cima do viewer (`#introOverlay.show`); ao terminar, fade-out
de 400 ms do overlay e começar a 1ª aba.

> Esse `INTRO_SCRIPT` deve ficar exportado como `const INTRO_SCRIPT = \`...\``
> no `<script>` do HTML para que o `synth_audio.mjs` o leia por regex.

### 3.2. Loop das 4 abas

Para cada `graph` em `GRAPHS` (`overview`, `generation`, `eligibility`,
`uiAgent`), na ordem:

1. **Anúncio da aba** (utterance própria, pitch 1.08):
   ```
   Aba ${graph.title}. Intenção: ${GRAPH_INTENT[graph.id]}.
   ```
2. Aplica zoom da aba (`graph.zoom` — já implementado).
3. Para cada `flow` em `FLOWS[graph.id]` (ordem do array):
   - utterance própria (pitch 1.06):
     ```
     Caminho ${flow.flowIdx+1} de ${flow.total}: ${flow.name}.
     Objetivo: ${flow.objective}.
     ```
   - Para cada `nodeIdx` em `flow.indexes` **na ordem do array** (não
     ordem visual — usar `FLOWS` tal qual):
     - `focusNode(nodeIdx, /*shouldSpeak*/ true)` → ativa dedo + halo
       pulsante vermelho;
     - utterance da explicação: `narrative.explanation` (pitch 1.03);
     - utterance do comentário IA: `narrative.aiComment` (pitch 0.95).
4. Pausa de 600 ms entre flows; 1200 ms entre abas.

### 3.3. Encerramento (utterance final, pitch 1.0)

```
Fim da apresentação. Esta é a engrenagem que o RVM Designações usa para
distribuir partes da reunião com justiça, transparência e
rastreabilidade — a mesma regra para o motor automático, a UI manual, o
painel de diagnóstico e o agente de IA.
```

Depois: `window.dispatchEvent(new Event('rvmVideoDone'))` e o recorder
para de capturar.

---

## 4. Layout em modo vídeo (1920×1080)

CSS extra que você vai adicionar dentro de `@media` ou via classe
`body.video-mode`:

```
body.video-mode .toolbar,
body.video-mode .controls,
body.video-mode .compat-banner,
body.video-mode .status,
body.video-mode .intro-actions { display: none !important; }

body.video-mode { overflow: hidden; background: #0b1220; }

body.video-mode .stage {
  display: grid;
  grid-template-columns: 1180px 700px;
  gap: 24px;
  padding: 24px;
  width: 1920px;
  height: 1080px;
  box-sizing: border-box;
  margin: 0 auto;
}

body.video-mode .viewer { max-height: 1032px; height: 1032px; }
body.video-mode .side-panel { max-height: 1032px; overflow: hidden; }

/* Cabeçalho mínimo no canto superior esquerdo do viewer */
body.video-mode .video-header {
  position: absolute; top: 16px; left: 24px;
  color: #e2e8f0; font: 600 22px/1.1 system-ui, sans-serif;
  text-shadow: 0 1px 4px rgba(0,0,0,.5);
  z-index: 30;
}
```

Adicionar `<div class="video-header" id="videoHeader"></div>` que reflete
em texto o grafo + caminho atual (`Aba X · Caminho Y/Z: nome`). Esse
header existe SÓ no modo vídeo.

Dedo, halo, painel lateral, viewer e overlay de intro continuam idênticos
ao modo interativo — você NÃO mexe na lógica de `getNodePointInViewer`,
`positionThumb` nem `applyGraphZoom`. Esses já estão corretos e foram
validados em browser real (diff de centro < 1px em zoom 1.55).

---

## 5. Decisões técnicas obrigatórias

- **Player de áudio em vez de SpeechSynthesis**: criar
  `playAudio(segmentId)` que toca o `.wav` correspondente e retorna uma
  Promise que resolve em `ended`. Substituir o caminho `speakSegments`
  apenas quando `body.classList.contains('video-mode')`. Manter o caminho
  SpeechSynthesis intacto para o modo interativo.
- **Tempos do `pauseAfter`** continuam respeitados via `setTimeout`.
- **Mouse não interage** em modo vídeo — adicionar `body.video-mode { pointer-events: none }` (exceto no `<audio>` que é programático).
- **Voz**: `pt-BR-AntonioNeural` (masculina, pausada, encaixa bem com
  conteúdo técnico). Se não houver chave de Azure no ambiente, fallback
  para `edge-tts` CLI (`npx edge-tts --voice pt-BR-AntonioNeural --text
  "..." --write-media out.wav`) — funciona sem auth.
- **Tamanho do output**: ~25-35 minutos esperados. Não cortar — é vídeo
  de referência, não trailer.
- **Locale do título**: usar `graph.title` tal como está (já em pt-BR
  exceto "Generation Flow"/"Eligibility Decision Tree" que mantém em
  inglês por serem nomes técnicos).

---

## 6. Validação obrigatória antes de devolver

Você DEVE validar com Playwright headed em uma execução curta (use uma
`FLOWS_SUBSET` apenas para teste: só o overview, com 1 flow):

1. Abrir `?video=1&autostart=1&debug=1`;
2. Confirmar que `.toolbar`, `.controls` estão `display:none`;
3. Confirmar que `body.video-mode` está setado;
4. Confirmar via `evaluate` que o dedo `#thumbPointer` tem
   `getBoundingClientRect().top` dentro do viewer durante a fala;
5. Confirmar que cada `rvmVideoTick` é emitido em ordem correta
   (intro → tab → flow → node-explanation → node-aiComment → ...);
6. Verificar que o `.webm` gerado existe e tem áudio (com `ffprobe`).

Reporte os 6 checks como ✓/✗ no final.

---

## 6.bis. Linguagem da narração — descritivo em primeiro, código entre parênteses

Regra obrigatória de **reescrita do conteúdo lido** (não muda o texto
exibido no painel lateral — só o que entra no TTS):

Sempre que aparecer no `explanation`, `aiComment`, `flow.name`,
`flow.objective`, `graph.title` ou rótulo de nó algum **identificador
técnico** (nome de função, classe, serviço, tabela, coluna, evento,
arquivo, endpoint, flag), o sintetizador deve falar a **descrição
humana correspondente em pt-BR** e, **logo em seguida, entre parênteses,
o nome de código**. Exemplos:

| Está escrito | Deve ser falado |
|---|---|
| `GenerationService` | "serviço gerador de designações *(Generation Service)*" |
| `EligibilityChecker` | "checador de elegibilidade *(Eligibility Checker)*" |
| `Generation Flow` (título da aba) | "Fluxo de Geração *(Generation Flow)*" |
| `Eligibility Decision Tree` | "Árvore de Decisão de Elegibilidade *(Eligibility Decision Tree)*" |
| `cooldown` | "intervalo obrigatório entre designações *(cooldown)*" |
| `score` | "nota de prioridade *(score)*" |
| `ranking` | "classificação ordenada *(ranking)*" |
| `tipoEnsino?` | "qual é o tipo de ensino *(tipoEnsino?)*" |
| `Play auto` | "reprodução automática *(Play auto)*" |
| `UI manual` | "interface manual do dirigente *(UI manual)*" |
| `agente IA` / `agente de IA` | "agente de inteligência artificial *(agente IA)*" |
| `Rules: resolve titular context...` | "Regras: resolve o contexto do titular *(Rules: resolve titular context...)*" |
| `EBC` | "Estudo Bíblico de Congregação *(EBC)*" |
| `S-89` | "formulário de designação *(S-89)*" |
| `bypass familiar` | "exceção para casal/familiar *(bypass familiar)*" |

Implementação prática (faça no `synth_audio.mjs`, **antes** de mandar ao
TTS):

1. Carregue um dicionário `JARGON_PT_BR` (arquivo `tools/jargon.json`)
   no formato `{ "GenerationService": "serviço gerador de designações", ... }`
   — inclua TODAS as entradas que aparecerem em `NARRATIVE_BY_INDEX` e
   nos rótulos de nó dos 4 SVGs. Liste exaustivamente antes de sintetizar.
2. Para cada texto que vai virar áudio, rode uma função
   `expandJargon(text)` que substitui cada chave de `JARGON_PT_BR`,
   **na ordem de chave mais longa primeiro** (para `GenerationService`
   bater antes de `Generation`), pelo formato
   `${descricaoPt} (${termoOriginal})`.
3. Use word-boundary insensível a maiúsculas/minúsculas mas que preserve
   o termo original tal como estava no texto (não force lowercase no
   parênteses — `GenerationService` continua `GenerationService`).
4. Se um termo aparecer mais de uma vez no MESMO segmento, expandir só
   na **primeira ocorrência**; nas subsequentes falar só a descrição em
   pt-BR (evita repetição cansativa).
5. Termos puramente em pt-BR que já estão na narrativa (ex.: "ajudante",
   "presidência", "designações") **não entram** no dicionário — eles já
   estão em linguagem humana.
6. Antes de gerar o áudio definitivo, escreva em `tools/preview_narration.txt`
   o texto final expandido de cada segmento na ordem do vídeo, para que o
   Eliezer possa revisar a 1ª pessoa que falar antes de queimar minutos
   de TTS.

A regra existe porque o vídeo é didático para um público misto (anciãos
da congregação + desenvolvedores). O ouvinte leigo precisa do termo em
português; o técnico se ancora no nome de código.

---

## 7. O que NÃO mexer

- Lógica de `getNodePointInViewer`, `positionThumb`, `refreshThumbPosition`,
  `applyGraphZoom`, `injectSvgStyles`, classes `node-active` / `node-speaking`
  / `flip-right` — tudo correto, testado em browser. Nem renomeie.
- `GRAPHS`, `FLOWS`, `NARRATIVE_BY_INDEX`, `GRAPH_INTENT` — apenas LER.
- Modo interativo (sem `?video=1`) — deve continuar funcionando idêntico.

---

## 8. Contexto do destino

O MP4 final vai ser embedado em um `<iframe>` ou `<video>` dentro do app
RVM, na aba **Admin** (botão "Assistir apresentação") e disponível também
para o agente de chat sugerir ("quer ver como funciona? toca pra você").
Por isso:
- Mantenha tamanho de arquivo razoável (libx264 CRF 18, AAC 128 kbps);
- Empacote para `<video preload="metadata">` (moov atom no início via
  `-movflags +faststart`);
- Coloque o MP4 final em `public/videos/eleicao-candidatos-apresentacao.mp4`
  do app (caminho relativo à raiz do app, NÃO da pasta `visual/`). Crie
  também `public/videos/poster.png` (frame em t=2s).

---

## 9. Restrições de qualidade ("de primeira")

- Nada de "Coming soon", placeholders, TODOs no código entregue.
- Sem `console.log` espalhado (use `if (debug)` gated).
- `npm run build:video` deve rodar de cabo a rabo num PC limpo (Windows,
  Node 20, com ffmpeg no PATH) sem intervenção manual.
- Se algum SVG demorar a montar (`svgObject.onload`), aguarde mais 800 ms
  antes do primeiro `focusNode` (já existe `setTimeout` similar — herde o
  mesmo padrão).
- Não use bibliotecas pesadas (sem moviepy, sem remotion). Só Node +
  Playwright + ffmpeg + edge-tts.

Boa sorte, colega. O Eliezer vai abrir o MP4 e ou aceitar de cara, ou
devolver com erros pontuais — então capricha na 1ª.
