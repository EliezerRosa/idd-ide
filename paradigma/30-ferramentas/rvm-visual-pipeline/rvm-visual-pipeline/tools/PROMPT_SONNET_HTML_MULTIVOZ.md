# Prompt para Sonnet — variante HTML "Multivoz Cinematográfica"

## Contexto
Workspace: `c:\Antigravity - RVM Designações\rvm-designacoes-unified\docs\graphs\visual\`

Você tem dois artefatos de referência (NÃO modificar):
- HTML fonte: `eleicao-candidatos-apresentacao-interativa.html` (~2150 linhas, modo dual: interativo + `?video=1&autostart=1`).
- Pipeline TTS: `tools/synth_audio.mjs` (edge-tts, gera 1 WAV por segmento + `manifest.json` com duração).
- Gravação: `tools/record_eleicao_video.mjs` (Playwright headless → WebM).
- Build: `tools/build_video.mjs` (junta WebM + WAVs em MP4 final).

A versão atual usa **1 voz fixa** (`pt-BR-AntonioNeural`, rate `-10%`). Resultado funciona mas é monótono e exige que o espectador olhe a coluna direita para acompanhar nó atual.

## Objetivo
Gerar **novo arquivo HTML** (não editar o original) chamado:
`eleicao-candidatos-apresentacao-multivoz.html`

E **novo synth_audio**:
`tools/synth_audio_multivoz.mjs`

E **novo record**:
`tools/record_eleicao_video_multivoz.mjs`

Saída final esperada: `out/eleicao-candidatos-apresentacao-multivoz.mp4`.

## Requisitos

### R1. Coluna direita enxuta (modo vídeo E interativo)
Na coluna direita, abaixo do bloco "Comentário IA":
- **REMOVER**: botões de navegação de nó/aba, lista de nós-texto, qualquer chip clicável de "próximo/anterior".
- **MANTER**: título do nó atual (1 linha), o comentário IA, e indicador discreto de progresso (ex.: barra fina ou "12 / 78").
- Modo interativo: ainda permite clicar nos nós do diagrama à esquerda; a coluna direita apenas reflete, não comanda.

### R2. Áudio contínuo, mesma cadência
- Manter o mesmo estilo de pausas curtas naturais entre frases (vírgulas/pontos do edge-tts) e cadência `rate=-10%`.
- **Sem pausas artificiais** entre segmentos consecutivos do mesmo "grupo lógico" (ex.: explicação + conectivo + aiComment do mesmo nó tocam encadeados).
- Manter a sincronia visual: o ícone/destaque do nó muda no instante do `loadedmetadata` do WAV correspondente (mesmo padrão atual de `runVideoPresentation`).
- Ordem de reprodução IDÊNTICA à atual (`intro → para cada graph → para cada flow → para cada node: explanation + aiComment → outro`), apenas com o conectivo inserido entre os pares.

### R3. Distribuição de vozes (edge-tts pt-BR)
Três personas distintas, alternando deterministicamente:

| Papel | Voz edge-tts | Conteúdo |
|---|---|---|
| **Narrador A** (masculino, principal) | `pt-BR-AntonioNeural` | `explanation` dos nós com índice **par** dentro do flow; intro; tab titles |
| **Narrador B** (masculino, secundário) | `pt-BR-FabioNeural` (fallback `pt-BR-DonatoNeural` se indisponível) | `explanation` dos nós com índice **ímpar** dentro do flow; nomes de flow ("Caminho N:") |
| **Comentarista IA** (feminino) | `pt-BR-FranciscaNeural` (fallback `pt-BR-ThalitaNeural`) | TODOS os `aiComment` + outro final |

Validar disponibilidade antes via `edge-tts --list-voices | findstr pt-BR` e cair no fallback se necessário. Logar a escolha real no início do `synth_audio_multivoz.mjs`.

### R4. Conectivos de transição naturais
Entre cada par lógico, inserir um **mini-segmento de conectivo** (~3-6 palavras, ~1.5s) falado pela voz **que ASSUME a fala seguinte**. Isso cria a sensação de "passar o bastão" naturalmente.

Regras:
- Variar o conectivo a cada uso (nunca repetir 2x seguidas). Manter pool de 15-20 frases por tipo de transição.
- 4 tipos de transição:

  1. **A→B** (entre nós): "E aí entra...", "Logo em seguida,", "Na sequência,", "Daí passamos para...", "Outro ponto:", "Continuando,", "Próximo passo:", "Em seguida,", "Avançando,", "Vejamos agora..."
  2. **B→A**: "Voltando ao fluxo,", "Retomando,", "Por outro lado,", "Complementando,", "Repare também que...", "Note que...", "Vale notar:", "E mais:", "Acrescentando,"
  3. **A/B → Comentarista IA** (antes do aiComment): "Comentário da IA:", "Análise:", "Em outras palavras,", "Traduzindo:", "Para fixar:", "Em síntese,", "O ponto-chave:", "Resumindo,", "Na prática isso significa..."
  4. **Comentarista IA → A/B** (depois do aiComment, antes do próximo nó/flow): "Seguimos.", "Adiante.", "Continuando.", "Próximo.", "Mais um passo.", "E temos também..."

- Conectivo é falado pela voz de DESTINO. Ex.: indo de Narrador A → Comentarista IA, o conectivo "Análise:" é falado pela Comentarista (Francisca).

### R5. Implementação técnica

**`synth_audio_multivoz.mjs`** (baseado em `synth_audio.mjs`):
- Mesma extração de constantes via `EXTRACT_CONSTANTS` do HTML novo.
- Função `assignVoice(seg, ctx)` decide voz com base no tipo e índice.
- Função `pickConnector(fromRole, toRole, history)` evita repetição imediata via Map.
- Gera segmentos extras `connector-<gid>-<ni>-<kind>` ANTES do segmento de destino. Inclui no `manifest.json` na ordem cronológica.
- WAVs vão em `tools/audio_multivoz/`. Manifest em `tools/manifest_multivoz.json`.
- `pickConnector` deve ser **determinístico** com seed = hash do segId (para reprodutibilidade entre re-runs).

**HTML novo** (`eleicao-candidatos-apresentacao-multivoz.html`):
- Clonar 100% do CSS/JS atual.
- Remover do JSX/DOM da coluna direita: botões `.node-nav`, lista `.node-text-list` (ou seletores equivalentes — investigar via `grep` em torno de `aiComment` no original).
- Manter `INTRO_SCRIPT`, `GRAPHS`, `GRAPH_INTENT`, `FLOWS`, `NARRATIVE_BY_INDEX` IDÊNTICOS (marcadores `EXTRACT_CONSTANTS_BEGIN/END`).
- `runVideoPresentation` deve consumir `manifest_multivoz.json` e tocar na ordem do manifest (não recalcular ordem); destaque visual no diagrama atualiza com base no `gid`/`ni` codificado no `seg.id`.
- Adicionar indicador discreto: `<div class="progress">N / TOTAL</div>` atualizado a cada segmento "node-*" ou "flow-*" (conectivos não incrementam).

**`record_eleicao_video_multivoz.mjs`**:
- Clonar de `record_eleicao_video.mjs`.
- Apenas trocar URL para `eleicao-candidatos-apresentacao-multivoz.html` e nome de saída `out/eleicao-candidatos-apresentacao-multivoz.webm`.

**`build_video.mjs`**:
- NÃO editar. Em vez disso aceitar via flag `--manifest=manifest_multivoz.json --webm=...webm --out=...mp4`. Se já aceita variantes via env, usar. Caso contrário, criar `build_video_multivoz.mjs` clonado.

### R6. Qualidade audível
- Antes de gerar todos os WAVs, sintetizar e tocar os 3 primeiros conectivos de cada tipo para validar tom (logar paths em `preview_connectors.txt`).
- Após `synth`, gerar `preview_narration_multivoz.txt` mostrando: ordem cronológica, voz atribuída, texto.
- Verificar com `ffprobe` que duração total ≤ 60min (atual é 51min — conectivos somam ~3-4min).

## Autorização
**Confirm-once.** Execute o pipeline completo autonomamente:
1. Criar `eleicao-candidatos-apresentacao-multivoz.html`
2. Criar `tools/synth_audio_multivoz.mjs` + `tools/record_eleicao_video_multivoz.mjs`
3. Rodar `node tools/synth_audio_multivoz.mjs` (gera todos os WAVs — pode levar 10-20min)
4. Rodar `node tools/record_eleicao_video_multivoz.mjs` (gera WebM — pode levar 50-60min)
5. Rodar build final (gera MP4)
6. Reportar: duração total, tamanho do MP4, exemplos de conectivos usados, validação visual (1 screenshot da coluna direita simplificada).

**Não pedir confirmação a cada passo.** Em caso de erro: tentar 1 fallback (ex.: outra voz), depois reportar e parar.

## Invariantes (não-negociáveis)
- NÃO apagar/modificar `eleicao-candidatos-apresentacao-interativa.html` original.
- NÃO apagar `tools/audio/` (pasta da versão atual). Usar pasta NOVA `tools/audio_multivoz/`.
- NÃO apagar `out/eleicao-candidatos-apresentacao.mp4` atual.
- Manter ordem cronológica dos nós/flows IDÊNTICA — apenas inserir conectivos e trocar voz.
- Sincronia visual ↔ áudio: destaque do nó SEMPRE coincide com início do WAV do nó (não do conectivo prévio).

## Entrega
Ao terminar, atualizar `tools/README.md` com seção "Variante Multivoz" listando os 3 novos arquivos e como reproduzir.
