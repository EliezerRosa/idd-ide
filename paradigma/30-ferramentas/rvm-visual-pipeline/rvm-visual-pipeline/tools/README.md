# eleicao-video-tools

Pipeline completo para gerar um vídeo MP4 narrado do apresentador interativo
`eleicao-candidatos-apresentacao-interativa.html`.

## Pré-requisitos

| Ferramenta | Instalação |
|------------|------------|
| **Node 20+** | `winget install OpenJS.NodeJS.LTS` |
| **Python 3.11+** com `edge-tts` | `pip install edge-tts` |
| **ffmpeg / ffprobe** no PATH | `winget install Gyan.FFmpeg` |
| **Playwright Chromium** | `npx playwright install chromium` (após `npm i`) |

## Instalação

```bash
cd docs/graphs/visual/tools
npm install
npx playwright install chromium
```

## Uso rápido

```bash
# Pipeline completo (síntese → gravação → mux → cópia para public/videos)
npm run build:video

# Apenas revisar o texto narrado sem TTS
npm run synth:preview
# → abre tools/preview_narration.txt

# Apenas síntese de áudio (gera tools/audio/*.wav e tools/manifest.json)
npm run synth:audio

# Apenas gravação (requer WAVs prontos e servidor HTTP em :5500)
npm run record:video
```

## Flags do build

```bash
node build_video.mjs --skip-synth    # pula síntese, usa WAVs existentes
node build_video.mjs --skip-record   # pula gravação, usa WEBM existente
node build_video.mjs --skip-mux      # somente síntese + gravação, sem mux
```

## Saída

```
tools/
  audio/           ← WAV por segmento
  manifest.json    ← lista de segmentos com duração
  preview_narration.txt ← texto expandido para revisão
  out/
    eleicao-candidatos-apresentacao.webm   ← gravação bruta
    merged_audio.wav                       ← trilha completa com pausas
    eleicao-candidatos-final.mp4           ← MP4 antes de copiar

public/videos/
  eleicao-candidatos-apresentacao.mp4      ← destino final
  eleicao-candidatos-apresentacao-poster.png
```

## Arquitetura

```
synth_audio.mjs
  ├── Lê HTML (entre EXTRACT_CONSTANTS_BEGIN/END)
  ├── Executa bloco JS para obter INTRO_SCRIPT, GRAPHS, FLOWS, NARRATIVE_BY_INDEX
  ├── Aplica jargon.json (substituição de termos técnicos → PT-BR coloquial)
  ├── Sintetiza WAV via edge-tts (pt-BR-AntonioNeural)
  └── Gera manifest.json com duração de cada segmento

record_eleicao_video.mjs
  ├── Sobe python -m http.server 5500 (se porta livre)
  ├── Playwright Chromium 1920×1080, recordVideo ativado
  ├── Navega para ?video=1&autostart=1
  ├── Aguarda window._rvmVideoDone === true
  └── Salva tools/out/eleicao-candidatos-apresentacao.webm

build_video.mjs
  ├── Chama synth_audio.mjs
  ├── Chama record_eleicao_video.mjs
  ├── Gera _silence_1s.wav (ffmpeg lavfi)
  ├── Monta concat list com pausas por tipo de segmento
  ├── ffmpeg concat → merged_audio.wav
  ├── ffmpeg mux (libx264 CRF 18 + AAC 192k) → eleicao-candidatos-final.mp4
  └── Copia para public/videos/ + gera poster.png (t=2s)
```

## Customização

- **Voz**: edite `VOICE` em `synth_audio.mjs` (qualquer voz `pt-BR-*` do edge-tts).
- **Velocidade**: edite `RATE` em `synth_audio.mjs` (ex: `'-5%'` para ligeiramente mais rápido).
- **Jargão**: edite `jargon.json` para ajustar substituições de termos técnicos.
- **Pausas**: edite as constantes `PAUSE_AFTER_*` em `build_video.mjs`.
- **Qualidade**: altere `-crf 18` (menor = melhor) e `-b:a 192k` em `build_video.mjs`.
