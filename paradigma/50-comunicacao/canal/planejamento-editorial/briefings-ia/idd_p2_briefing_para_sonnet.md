# Briefing para Sonnet — IDD Episódio 2

> Hand-off de Copilot (Claude Opus 4.7 no VS Code Antigravity) para Sonnet
> (Claude Code / Cline / outra superfície CLI). Objetivo: produzir o
> **Episódio 2 da série IDD** no canal YouTube do Eliezer, reaproveitando
> 100% do pipeline já validado no Episódio 1.
>
> **Custo**: usar Sonnet (mais barato). **Modelo de execução**: confirm-once
> — Eliezer dá um único "go" e você executa até o fim, reportando.

---

## 0 · Contexto curto (leia antes de começar)

- **Repo de trabalho**: `c:\Antigravity - RVM Designações\` (raiz, não o subprojeto React).
- **Pipeline já existente e funcional**: `create_idd_p1_video.py` (5 fases:
  script → avatares → TTS → slides → vídeo).
- **Referência canônica do pipeline**: `/memories/repo/idd-video-production-2026-05-09.md`
  e `/memories/repo/plano-pendente-videos-youtube-2026-05-12.md`.
- **Episódio 1 publicado**: `lNEr7vb0Gyo` ("O que é IDD?"), playlist
  `PLkbRMhsplHjbaVoM7tatoBmOKm5k3SHMy`.
- **Conceito-base do Eliezer (não reinventar)**:
  `/memories/idd-comando-epistemico-vs-operacional.md` — esta é a fonte de
  verdade do tema. Use-a como espinha dorsal do roteiro.
- **Perfil do Eliezer (para o roteiro)**: `/memories/eliezer-perfil-trajetoria.md`.

---

## 1 · Tema do Episódio 2 (fixado)

**"Comando Epistêmico vs. Comando Operacional — a fronteira que separa
augmenting de credulidade"**

### Conteúdo obrigatório (cobrir de forma dialogada, ~20 min, 140–160 falas)

1. **Hook**: por que pilotos automáticos derrubam aviões — quando o humano
   delega o operacional sem reter o epistêmico.
2. **Definição operacional**:
   - Comando epistêmico = autoridade sobre *o quê* e *por quê* (intenção,
     invariantes, critérios de sucesso, limites éticos). Sempre humano.
   - Comando operacional = autoridade sobre *o como* (ferramentas,
     sequência, sintaxe). Pode ser delegado ao agente/LLM.
3. **A linhagem que sustenta a distinção**: Engelbart 1962 ("Augmenting
   Human Intellect") → Sutherland → Kay → Brooks ("conceptual integrity")
   → Berners-Lee → Gruber → IDD.
4. **Augmenting ≠ Automating** — por que essa fronteira é o núcleo do IDD.
5. **Fé bayesiana vs. credulidade**: confiança escalada por evidência
   auditável vs. confiança sem conhecimento. Esta é a chave da delegação
   responsável a IAs.
6. **Confirm-once como transferência consciente do operacional**:
   o humano aprova uma vez, agente executa até o fim, reporta com plano +
   trace. O epistêmico permanece com o humano via invariantes (§5 dos
   runbooks `.intent.md`).
7. **Caso vivo do Eliezer**: 2PC customizado no Paes Mendonça — DCAlgol +
   Cobol. Ele reteve o comando epistêmico (a regra: "transação é atômica
   ou não acontece") e construiu o operacional manualmente. Hoje, IDD
   permite que ele retenha o epistêmico e delegue o operacional ao agente.
8. **Vocabulário consistente** que o ouvinte deve sair sabendo:
   "comando epistêmico", "comando operacional", "fé bayesiana",
   "credulidade", "augmenting".
9. **Implicações práticas no dia a dia** do desenvolvedor com agentes IA.
10. **Encerramento**: anuncia Ponto 3 (sugestão: "Runbooks executáveis —
    intenção como código auditável").

### Estilo (idêntico ao Ep1 — não inventar)
- Diálogo natural entre **Eliezer** (60+, sábio, histórias reais) e
  **IA** (curiosa, articulada, traz analogias).
- Cada fala 1–4 frases. Alternar com naturalidade. Eliezer abre, ambos
  encerram juntos.
- Bilíngue PT/EN no JSON. Campo `note` com tom/emoção.

---

## 2 · O que MUDA em relação ao Ep1 (atenção total)

### 2.1 · **Avatar do Eliezer — REMAKE (urgente)**
O avatar atual (`idd_p1_output/avatars/eliezer_caricature.png`) ficou
**velho demais** segundo o próprio Eliezer. Refazer **sem distorcer o
perfil**:

- Manter: traços faciais reconhecíveis da foto YouTube original (mesmo
  formato de rosto, mesma cor/comprimento de cabelo, mesma barba/óculos
  se houver, mesma tonalidade de pele).
- Rejuvenescer **sutilmente**: aparência de **~55 anos**, pele com brilho
  saudável, postura ereta, olhar atento e curioso (não ar cansado).
- Manter dignidade intelectual — ele é um arquiteto sênior, não um jovem
  influencer. **Sem exageros de juventude artificial**. Sem photoshop
  agressivo.
- Estilo: caricatura quente profissional, mesma paleta dourada do Ep1
  (`COL_ELIEZER = (245, 166, 35)`).

### 2.2 · **Cenário — TALK SHOW de corpo inteiro com movimentação**
O Ep1 usou avatares circulares estáticos painel-esquerdo / painel-direito
(layout podcast). Para o Ep2, Eliezer pediu **talk show com os dois
personagens em corpo inteiro e com movimentação**.

**Trade-off honesto que você precisa decidir e reportar ao Eliezer
ANTES de gastar quota**:

- **Opção A — Animação real (Veo 3 / Runway / outro modelo de vídeo)**:
  cenário 3D talk-show, dois sofás, câmera com leve parallax, personagens
  com gestos sutis (acenar, virar tronco, sorrir). **Custo significativo**
  e modelos de vídeo têm quotas próprias. Requer pipeline novo.
- **Opção B — Composição PIL com sprites animados (low-cost)**: gerar 2–3
  poses de corpo inteiro de cada personagem (Imagen 4), montar slides com
  "sprite ativo" alternando pose entre falas (idle/falando/gesticulando),
  cenário talk-show ilustrado fixo ao fundo (sofá, mesa, painel
  "ENGENHARIA DE SOFTWARE COM IA AUTÔNOMA", luzes de palco). Movimentação
  é por troca de frame, não vídeo real. **Reaproveita 80% do pipeline
  existente** — só muda a geração de avatares (corpo inteiro × poses) e
  o `compose_slide`.
- **Opção C — Híbrido**: Opção B + alguns segundos de Veo 3 nas aberturas/
  encerramentos. Equilibra custo e impacto.

**Sua tarefa antes de executar**: rodar `--phase script` primeiro (gasta
pouco), preparar **3 mockups de slide** (PIL) com a Opção B usando
placeholders, mostrar para o Eliezer e pedir o "go" definitivo. Só depois
gerar todos os avatares/slides.

### 2.3 · Output dir
- Criar `idd_p2_output/` espelhando `idd_p1_output/`. **Não sobrescrever
  nada do Ep1**.

---

## 3 · Pipeline a executar (passo a passo)

### Passo 1 — Duplicar e adaptar o script
```powershell
cd "c:\Antigravity - RVM Designações"
Copy-Item create_idd_p1_video.py create_idd_p2_video.py
```

Editar `create_idd_p2_video.py`:
- `OUT_DIR = BASE_DIR / "idd_p2_output"`
- Substituir `SCRIPT_PROMPT` pelo briefing do tema "Comando Epistêmico
  vs. Operacional" (manter EXATAMENTE a regra `⚠ MÍNIMO 140 entradas` e o
  formato JSON bilíngue).
- Atualizar a seção FASE 2 para gerar avatares de **corpo inteiro** (ver
  §4 abaixo).
- Atualizar `compose_slide` para o novo layout talk-show (ver §5 abaixo).

### Passo 2 — Gerar roteiro (cheap)
```powershell
python create_idd_p2_video.py --phase script
```
Validar: `idd_p2_output/script.json` com 140–160 entradas, alternância
saudável, bilingue completo.

### Passo 3 — **PARAR** e mostrar ao Eliezer
- Print das primeiras 10 falas do roteiro.
- 3 mockups PIL do novo layout (slides estáticos com placeholders).
- Pedir "go" para Phase 2/3/4/5.

### Passo 4 — Após "go": avatares (Imagen 4)
Ver prompts canônicos em §4.

### Passo 5 — TTS (respeitar quota)
- `gemini-2.5-flash-preview-tts` (100/dia) + `gemini-2.5-pro-preview-tts`
  (50/dia) = 150/dia máximo.
- Vozes: `Charon` para Eliezer (grave), `Kore` para IA (claro).
- Fallback: `gemini-3.1-flash-tts-preview`.
- Pegadinhas (validadas no Ep1):
  - `part.inline_data.data` é PCM raw, NÃO base64 decode.
  - Texto < 5 chars → pad com `...`.
  - 192044 bytes = silêncio (fallback, não TTS real) → re-tentar.

### Passo 6 — Slides (PIL, novo layout talk-show)
Ver §5.

### Passo 7 — Montagem
ffmpeg slideshow + áudios concatenados → `idd_p2_output/idd_ponto2_comando_epistemico.mp4`.

### Passo 8 — Upload + playlist
```powershell
python upload_to_youtube.py idd_p2_output/idd_ponto2_comando_epistemico.mp4 `
  --title "IDD Ponto 2: Comando Epistêmico vs. Operacional" `
  --description "..." `
  --visibility unlisted
python add_to_playlist.py <video_id> PLkbRMhsplHjbaVoM7tatoBmOKm5k3SHMy
```
Token: `token_youtube.json` (escopo full).

### Passo 9 — Reportar ao Eliezer
- URL do vídeo (unlisted primeiro; público só após Eliezer revisar).
- Hash do commit (se houver mudanças commitáveis em scripts/.py).
- Atualizar `/memories/repo/plano-pendente-videos-youtube-2026-05-12.md`
  marcando Ep2 como ✅ e propondo Ep3.

---

## 4 · Prompts Imagen 4 — versões NOVAS

### 4.1 · Eliezer (corpo inteiro, ~55 anos)
```
Full-body friendly professional caricature illustration of a Brazilian
software architect, approximately 55 years old (NOT older — preserve
intellectual maturity but with healthy vibrant appearance), seated
relaxed on a modern talk-show armchair, slight forward lean as if
engaged in conversation, one hand gesturing mid-sentence.
Facial features: [INSERIR DESCRIÇÃO DO describe_photo() — manter
formato de rosto, cor/comprimento de cabelo, barba/óculos da foto
YouTube original]. Skin: warm healthy tone with subtle highlights.
Attire: smart casual — dark blazer over light shirt, no tie,
professional but approachable. Pose: confident, attentive, alert eyes,
gentle smile. Body proportions: realistic caricature (slightly
exaggerated head ~1.2x normal, body realistic). Style: warm caricature
illustration, vibrant colors, golden/amber accent palette
(#F5A623), soft talk-show stage lighting from upper-left, transparent
background OR podcast studio backdrop. High quality digital art,
1024x1536 portrait orientation.
```
Gerar **3 variações de pose**: `idle` (sentado neutro), `talking` (mão
gesticulando), `listening` (cabeça ligeiramente inclinada, sorriso).

### 4.2 · IA (corpo inteiro)
```
Full-body friendly AI assistant character, caricature-style digital
illustration, humanoid silhouette with glowing cyan holographic skin and
subtle circuit pattern details visible through translucent surface,
seated on a sleek minimalist chair across from a human host in a
talk-show setting. Pose: alert and curious, slightly leaning forward,
one hand raised in a thoughtful gesture. Face: minimalist human-like
features with soft cyan glow, no harsh edges, warm and approachable
expression. Attire: stylized futuristic blazer in deep blue with cyan
trim — professional but clearly non-human. Body proportions: caricature
(head ~1.2x). Style: high quality digital art, blue/cyan palette
(#00D4FF) with white accents, soft holographic shimmer, talk-show stage
lighting, transparent background OR studio backdrop matching Eliezer's.
1024x1536 portrait orientation.
```
Gerar **3 variações** equivalentes: `idle`, `talking`, `listening`.

### 4.3 · Cenário talk-show (background único)
```
Wide-format talk-show studio backdrop, podcast/late-night style, deep
navy blue walls with subtle geometric panels, large illuminated sign at
top reading "ENGENHARIA DE SOFTWARE COM IA AUTÔNOMA" in modern sans-serif
white letters with golden accent. Two empty modern armchairs separated by
a small round coffee table, soft amber and cyan stage lighting from
above creating depth, slight bokeh, sophisticated and warm atmosphere.
NO people in the scene — pure backdrop. 1920x1080 landscape.
```
`safety_filter_level=BLOCK_LOW_AND_ABOVE` em todos.

---

## 5 · Layout slide novo (talk-show)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Background talk-show 1920x1080, fixo durante todo o vídeo]    │
│                                                                  │
│   ╔════════════════╗                    ╔════════════════╗     │
│   ║                ║                    ║                ║     │
│   ║   ELIEZER      ║   ┌──────────┐    ║      IA        ║     │
│   ║  (sprite       ║   │ Mesinha  │    ║  (sprite       ║     │
│   ║   3-pose       ║   │  + caneca│    ║   3-pose       ║     │
│   ║   por fala)    ║   └──────────┘    ║   por fala)    ║     │
│   ║   anel dourado ║                    ║   anel cyan    ║     │
│   ║   se ativo     ║                    ║   se ativo     ║     │
│   ╚════════════════╝                    ╚════════════════╝     │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  "Texto da fala atual em PT-BR (line wrap até 3 linhas)" │  │
│   │  — aparece embaixo do speaker ativo                      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│   [Progress bar fina no rodapé: ████████░░░░░ 47%]              │
└──────────────────────────────────────────────────────────────────┘
```

**Regra de animação simulada**:
- Cada fala = 1 slide PNG. Sprite do speaker ativo = pose `talking`,
  sprite do outro = pose `listening` ou `idle` (alternar a cada N falas
  para dar movimento).
- A cada ~5 falas, embaralhar levemente as poses para evitar monotonia.
- Anel luminoso do speaker ativo: dourado para Eliezer, cyan para IA
  (como no Ep1, mas agora ao redor do sprite de corpo inteiro).
- Legenda da fala em caixa semitransparente (fundo escuro alpha 0.6,
  texto branco).

**Onde editar no código**: função `compose_slide()` em
`create_idd_p2_video.py`. Substituir a montagem de painéis circulares por
composição com background fixo + paste dos sprites de corpo inteiro nas
posições (~340, ~120) e (~1240, ~120) com alpha mask.

---

## 6 · Critérios de sucesso (não fechar sem isso)

- [ ] `script.json` com 140–160 entradas bilíngues sem truncamento.
- [ ] Avatar do Eliezer rejuvenescido para ~55 anos, **fidelidade ao
  perfil mantida** (Eliezer aprova explicitamente os 3 mockups).
- [ ] Cenário talk-show coerente, sprites em 3 poses cada.
- [ ] 3 mockups de slide aprovados pelo Eliezer ANTES de gerar TTS.
- [ ] MP4 final 1920×1080, 30fps, áudio limpo, ~20 min.
- [ ] Upload **unlisted** primeiro, link enviado ao Eliezer.
- [ ] Adicionado à playlist `PLkbRMhsplHjbaVoM7tatoBmOKm5k3SHMy`.
- [ ] Memórias atualizadas:
  - `/memories/repo/plano-pendente-videos-youtube-2026-05-12.md` (Ep2 ✅)
  - Criar `/memories/repo/idd-p2-production-YYYY-MM-DD.md` com hash do
    commit, tamanho/duração, lições novas.

---

## 7 · Invariantes de segurança (não-negociáveis)

- **NUNCA** publicar diretamente como público — sempre unlisted, esperar
  Eliezer revisar.
- **NUNCA** sobrescrever artefatos do Ep1 (`idd_p1_output/`).
- **NUNCA** comitar `.env`, `client_secrets.json`, `token*.json`,
  `backup_rvm_*.json` (.gitignore já protege; conferir antes de
  `git add`).
- **NUNCA** ecoar o conteúdo de `GEMINI_API_KEY` na conversa nem em
  arquivos.
- **PARAR e perguntar** se quota de TTS retornar erro 429 três vezes
  seguidas (não brutar tentativa).

---

## 8 · Hand-back ao Eliezer (relatório final esperado)

Quando terminar, reportar em uma única mensagem:
1. URL unlisted do vídeo.
2. 3 thumbnails (frame 0, frame meio, frame final).
3. Lista do que foi novo vs. Ep1 (avatar rejuvenescido, layout talk-show,
   poses dinâmicas).
4. Quotas consumidas (TTS flash X/100, pro Y/50, Imagen Z imagens).
5. Sugestão de tema do Ep3.
6. Caminho do MP4 e dos arquivos de memória atualizados.

---

**Boa, Sonnet. Tudo está documentado, tudo está cacheado idempotentemente
no pipeline. Você só precisa adaptar `SCRIPT_PROMPT`, `prepare_avatars`,
`compose_slide` e rodar fase a fase. Bom trabalho!**
