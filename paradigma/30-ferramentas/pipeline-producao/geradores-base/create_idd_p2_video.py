#!/usr/bin/env python3
"""
create_idd_p2_video.py — Vídeo deep-dive bilíngue (PT-BR + EN)
"IDD Ponto 2: Comando Epistêmico vs. Comando Operacional"

Dois apresentadores estilo TALK SHOW (corpo inteiro, movimentação simulada):
  • Eliezer Rosa  — avatar rejuvenescido ~55 anos, 3 poses (idle/talking/listening)
  • IA (GitHub Copilot) — avatar holográfico corpo inteiro, 3 poses

Pipeline:
  Fase 1  → Roteiro (Gemini 2.5 Pro, ~150 diálogos, ~20 min)
  Fase 2  → Avatares + Background talk-show (Imagen 4, corpo inteiro)
  Fase 3  → Áudio TTS (Gemini 2.5 Flash TTS, 2 vozes, 1 WAV/linha)
  Fase 4  → Slides PNG (PIL, layout talk-show HD 1920×1080)
  Fase 5  → Vídeo final (ffmpeg concat imagens + áudio)

Uso:
    python create_idd_p2_video.py                    # tudo
    python create_idd_p2_video.py --phase script     # só roteiro
    python create_idd_p2_video.py --phase mockups    # 3 mockups PIL do layout
    python create_idd_p2_video.py --phase avatars    # só avatares
    python create_idd_p2_video.py --phase audio      # só TTS
    python create_idd_p2_video.py --phase slides     # só slides
    python create_idd_p2_video.py --phase video      # só montagem final
"""

import os, sys, json, struct, wave, time, subprocess, re, argparse, random
from pathlib import Path
from typing import Optional

# ─── PATHS ────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parent
_ACERVO     = BASE_DIR.parent / ".." / "04 - Acervo de Episódios"
OUT_DIR     = (_ACERVO / "Ep02 - Comando Epistêmico" / "idd_p2_output").resolve()
SCRIPT_FILE = OUT_DIR / "script.json"
AUDIO_DIR   = OUT_DIR / "audio"
SLIDES_DIR  = OUT_DIR / "slides"
AVATAR_DIR  = OUT_DIR / "avatars"
SEG_DIR     = OUT_DIR / "segments"
MOCK_DIR    = OUT_DIR / "mockups"

for d in [OUT_DIR, AUDIO_DIR, SLIDES_DIR, AVATAR_DIR, SEG_DIR, MOCK_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── ENV ──────────────────────────────────────────────────────────────────────
def _load_env():
    """Walk up from script dir to find .env"""
    d = BASE_DIR
    for _ in range(5):
        env_file = d / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.startswith("#"):
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip())
            return
        d = d.parent

_load_env()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    sys.exit("❌ GEMINI_API_KEY não encontrada no .env")

# ─── GEMINI CLIENT ────────────────────────────────────────────────────────────
from google import genai
from google.genai import types as gt

_client: Optional[genai.Client] = None

def client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client

# ─── MODELS ───────────────────────────────────────────────────────────────────
MODEL_TEXT    = "gemini-2.5-pro"
MODEL_TTS_FLASH = "gemini-2.5-flash-preview-tts"
MODEL_TTS_PRO   = "gemini-2.5-pro-preview-tts"
MODEL_TTS_FALLBACK = "gemini-2.5-flash-preview-tts"  # overflow
MODEL_IMAGEN  = "imagen-4.0-generate-001"
VOICE_ELIEZER = "Charon"    # grave, autoritativo, caloroso
VOICE_IA      = "Kore"      # claro, preciso, articulado

# ─── VISUAL CONFIG ────────────────────────────────────────────────────────────
VIDEO_W, VIDEO_H = 1920, 1080

BG           = (8, 12, 20)
PANEL_DARK   = (15, 22, 38)
COL_ELIEZER  = (245, 166, 35)     # gold
COL_IA       = (0, 212, 255)      # cyan
TEXT_WHITE   = (255, 255, 255)
TEXT_GRAY    = (160, 175, 200)
TEXT_SUBTT   = (120, 150, 185)

WIN_FONTS    = Path("C:/Windows/Fonts")

# Posições dos sprites de corpo inteiro no slide
ELIEZER_X    = 180    # centro-x do sprite Eliezer
IA_X         = 1740   # centro-x do sprite IA
SPRITE_Y_TOP = 90     # topo do sprite
SPRITE_H     = 700    # altura alvo do sprite (corpo inteiro)
SPRITE_W     = 420    # largura alvo

# Legenda
CAPTION_Y    = 820    # topo da caixa de legenda
CAPTION_H    = 200    # altura da caixa
PROGRESS_Y   = 1060   # barra de progresso

# Poses disponíveis por personagem
POSES_ELIEZER = ["idle", "talking", "listening"]
POSES_IA      = ["idle", "talking", "listening"]


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 1 — ROTEIRO
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_PROMPT = """\
Você é roteirista de podcast educativo de altíssima qualidade em pt-BR.
Crie o roteiro COMPLETO de ~20 minutos para um podcast/talk-show com dois
apresentadores:

• ELIEZER ROSA — criador do paradigma IDD (Intent-Driven Development).
  Arquiteto de software com décadas de experiência. Começou no IBM Brasil
  em 1976 com RPG II. Trabalhou com Cobol, DCAlgol, sistemas UNISYS.
  Arquitetou 2PC customizado no Grupo Paes Mendonça (mecanismo próprio de
  Rollback e Forward em missão crítica online, tempo real). Pesquisas e
  palestras sobre OO e IA em UFBA, Telemar, anos 90. Hoje criador do
  paradigma IDD (Intent-Driven Development) e do projeto AEON.
  Tom: reflexivo, apaixonado, sábio, histórias reais.

• IA — GitHub Copilot, a inteligência artificial parceira de Eliezer.
  Fala com clareza e precisão. Faz perguntas perspicazes que abrem o
  tema. Traz analogias e dados externos. Às vezes discorda gentilmente.
  Tom: curioso, articulado, entusiasmado com ideias.

═══ TEMA DO EPISÓDIO ═══════════════════════════════════════════════════
  "Comando Epistêmico vs. Comando Operacional"
  Episódio 2 da série: Base de Conhecimento IDD
  Subtítulo: "A fronteira que separa augmenting de credulidade"
═══════════════════════════════════════════════════════════════════════

CONTEÚDO OBRIGATÓRIO (cobrir de forma dialogada, nunca como lista):

1. HOOK de abertura — história real: por que pilotos automáticos já
   causaram desastres (ex: Air France 447, 2009) quando a tripulação
   delegou o operacional sem reter o epistêmico. Analogia visceral
   com o que acontece quando devs delegam tudo cegamente para IA.

2. DEFINIÇÕES claras e operacionais:
   - Comando Epistêmico = autoridade sobre O QUÊ e POR QUÊ.
     (intenção, invariantes, critérios de sucesso, limites éticos)
     SEMPRE permanece com o humano.
   - Comando Operacional = autoridade sobre O COMO.
     (ferramentas, sequência, sintaxe, idiomas de execução)
     PODE ser delegado ao agente/LLM.

3. A LINHAGEM que sustenta a distinção (cobrir cada um com 1-2 falas):
   Engelbart 1962 ("Augmenting Human Intellect")
   → Sutherland (Sketchpad — interação direta)
   → Kay (Dynabook — computador como instrumento pessoal)
   → Brooks ("conceptual integrity" — a ideia deve permanecer no humano)
   → Berners-Lee (Web Semântica — semântica controlada pelo autor)
   → Gruber (ontologias — conhecimento explícito, auditável)
   → IDD (intenção em NL como artefato de mais alta ordem)

4. AUGMENTING ≠ AUTOMATING:
   - Augmenting amplifica a capacidade humana SEM substituir o julgamento.
   - Automating transfere tanto o operacional quanto o epistêmico.
   - IDD é augmenting, não automating.
   - Por que essa fronteira é o NÚCLEO do IDD e não só filosofia.

5. FÉ BAYESIANA vs. CREDULIDADE:
   - Credulidade = confiança sem conhecimento, sem evidência.
   - Fé bayesiana = confiança escalada por evidência auditável, por trace,
     por relatório, por histórico de acertos e erros.
   - Como o "confirm-once" do IDD é fé bayesiana aplicada:
     o humano aprova uma vez, o agente executa, reporta com plano + trace.
   - Quem retém o epistêmico ainda pode auditar e corrigir.
   - Quem perdeu o epistêmico só pode rezar.

6. CASO VIVO DO ELIEZER — 2PC customizado no Paes Mendonça:
   - SGBD UNISYS/DASL, ecossistema crítico, anos 90.
   - DCAlgol (controle de baixo nível + comunicação) + Cobol (regras).
   - Invariante epistêmico: "a transação é atômica ou não acontece".
   - Operacional: Eliezer construiu manualmente — Rollback e Forward.
   - Hoje, com IDD: mesmo invariante epistêmico, operacional delegado ao
     agente. O que mudou? Apenas a ferramenta operacional.

7. CONFIRM-ONCE como transferência CONSCIENTE do operacional:
   - O humano define intenção + invariantes (epistêmico).
   - Aprova o plano uma vez: "go".
   - Agente executa até o fim com trace auditável.
   - Invariantes são salvaguardas: se violar, o agente para e perguntar.
   - Runbooks `.intent.md` como encarnação disso em código.

8. VOCABULÁRIO que o ouvinte deve sair sabendo (introduzir naturalmente):
   "comando epistêmico", "comando operacional", "fé bayesiana",
   "credulidade", "augmenting", "invariantes de negócio".

9. IMPLICAÇÕES PRÁTICAS para o desenvolvedor com agentes IA hoje:
   - Como identificar se você está delegando epistêmico sem perceber.
   - Sinais de alerta: "a IA fez e eu não sei por quê".
   - A disciplina de escrever invariantes antes de dar "go".
   - Por que revisão de PR por humano que não entendeu o código é
     credulidade disfarçada de processo.

10. ENCERRAMENTO: reflexão conjunta + anúncio do Ponto 3:
    "Runbooks executáveis — quando a intenção vira código auditável"
    Call-to-action inspirador.

ESTILO:
- Diálogo NATURAL — sem frases genéricas, sem clichês motivacionais.
- Eliezer usa histórias reais da sua carreira com detalhes técnicos
  genuínos (IBM, UNISYS, 2PC, RPG II, DCAlgol, Cobol).
- IA pergunta coisas que o ouvinte está pensando. Às vezes fica
  genuinamente surpresa com a história do Eliezer.
- Inclua momentos de humor sutil: "Isso é... surpreendentemente filosófico
  para um cara que programou em RPG II nos anos 70."
- Profundidade real — este é um podcast de referência, não superficial.
- Cada fala: 1 a 4 frases naturais (não monólogos longos).
- Use "..." para indicar pausa dramática quando apropriado.

FORMATO DE SAÍDA — JSON puro (APENAS o array, sem markdown):
[
  {
    "id": 1,
    "speaker": "Eliezer",
    "pt": "Fala completa em português brasileiro natural.",
    "en": "Natural English translation (not literal — as if spoken natively).",
    "note": "tom ou emoção — ex: reflexivo, empolgado, com pausa, sorrindo"
  },
  ...
]

REGRAS DO JSON — OBRIGATÓRIAS:
⚠ ATENÇÃO: O roteiro DEVE ter EXATAMENTE entre 140 e 160 entradas.
   Não pare antes de 140. Isso é CRÍTICO para cobrir ~20 minutos.
- Retorne APENAS o JSON começando com [ e terminando com ]
- MÍNIMO ABSOLUTO: 140 entradas (verifique antes de finalizar!)
- Alterne os apresentadores de forma natural (às vezes um fala 2-3x seguidas)
- Comece com Eliezer fazendo uma abertura com a história do avião
- Termine com fala conjunta ou encerramento duplo inspirador
- Distribua o conteúdo: não acelere no final, mantenha profundidade até o fim
- Se estiver chegando em 100 entradas e ainda não terminou os tópicos, continue!
"""


def generate_script() -> list[dict]:
    if SCRIPT_FILE.exists():
        script = json.loads(SCRIPT_FILE.read_text(encoding="utf-8"))
        print(f"✓ Roteiro em cache: {len(script)} linhas ({SCRIPT_FILE.name})")
        return script

    print("📝 Gerando roteiro com Gemini (30–90s)…")
    resp = client().models.generate_content(
        model=MODEL_TEXT,
        contents=SCRIPT_PROMPT,
        config=gt.GenerateContentConfig(temperature=0.92, max_output_tokens=65536),
    )
    raw = resp.text.strip()

    # Remove markdown code fences if present
    raw = re.sub(r"^```[a-z]*\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        script = json.loads(raw)
    except json.JSONDecodeError:
        # Truncation recovery
        last_close = raw.rfind("}")
        if last_close > 0:
            truncated = raw[:last_close + 1]
            while truncated and not truncated.rstrip().endswith("}"):
                truncated = truncated[:truncated.rfind("}")]
            cleaned = truncated.rstrip().rstrip(",") + "\n]"
            bracket = cleaned.find("[")
            if bracket >= 0:
                cleaned = cleaned[bracket:]
            try:
                script = json.loads(cleaned)
                print(f"  ⚠ JSON truncado, recuperado: {len(script)} linhas")
            except json.JSONDecodeError as e2:
                raise RuntimeError(
                    f"JSON parse falhou mesmo após recovery: {e2}\n"
                    f"Raw (primeiros 400 chars): {raw[:400]}"
                )
        else:
            raise RuntimeError(f"Resposta inválida. Raw (primeiros 400): {raw[:400]}")

    SCRIPT_FILE.write_text(json.dumps(script, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Roteiro gerado: {len(script)} linhas → {SCRIPT_FILE}")
    return script


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 2 — AVATARES CORPO INTEIRO (3 poses cada) + BACKGROUND TALK-SHOW
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_youtube_avatar() -> Optional[Path]:
    """Tenta reusar a foto do canal do Ep1 (já está em cache)."""
    ep1_raw = (_ACERVO / "Ep01 - O que é IDD" / "idd_p1_output" / "avatars" / "eliezer_yt_raw.jpg").resolve()
    if ep1_raw.exists():
        print(f"✓ Foto YouTube reutilizada do Ep1: {ep1_raw.name}")
        return ep1_raw

    raw_path = AVATAR_DIR / "eliezer_yt_raw.jpg"
    if raw_path.exists():
        print(f"✓ Foto YouTube em cache: {raw_path.name}")
        return raw_path

    print("🔍 Buscando foto do canal YouTube…")
    try:
        import requests
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0 Safari/537.36"
            )
        }
        yt_url = "https://www.youtube.com/watch?v=lNEr7vb0Gyo"  # Ep1
        resp = requests.get(yt_url, headers=headers, timeout=15)
        html = resp.text
        patterns = [
            r'"avatar":\s*\{"thumbnails":\s*\[\{"url":"(https://yt3\.googleusercontent\.com/[^"?]+)',
            r'"channelThumbnailSupportedRenderers".*?"url":"(https://yt3\.googleusercontent\.com/[^"?]+)',
            r'yt3\.googleusercontent\.com/(ytc/[A-Za-z0-9_-]{40,})',
        ]
        thumb_url = None
        for pat in patterns:
            m = re.search(pat, html)
            if m:
                url = m.group(1)
                if not url.startswith("http"):
                    url = f"https://yt3.googleusercontent.com/{url}"
                thumb_url = url + "=s400-c-k-c0x00ffffff-no-rj"
                break
        if not thumb_url:
            print("  ⚠ Padrão de URL do avatar não encontrado.")
            return None
        img_resp = requests.get(thumb_url, headers=headers, timeout=15)
        if img_resp.status_code == 200 and len(img_resp.content) > 1000:
            raw_path.write_bytes(img_resp.content)
            print(f"  ✓ Foto baixada: {raw_path.name}")
            return raw_path
    except Exception as e:
        print(f"  ⚠ Erro ao buscar YouTube: {e}")
    return None


def describe_photo(photo_path: Path) -> str:
    """Usa Gemini Vision para descrever características físicas da foto."""
    print("  🔎 Analisando foto com Gemini Vision…")
    photo_bytes = photo_path.read_bytes()
    mime = "image/jpeg"
    if photo_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        mime = "image/png"
    resp = client().models.generate_content(
        model=MODEL_TEXT,
        contents=[
            gt.Part(inline_data=gt.Blob(mime_type=mime, data=photo_bytes)),
            gt.Part(text=(
                "Descreva em inglês, de forma concisa (máx 4 linhas), as características "
                "físicas desta pessoa para gerar um avatar caricatura de corpo inteiro: "
                "gênero, faixa etária aparente, tom de pele, formato do rosto, "
                "tipo/cor de cabelo, barba se houver, óculos se houver, traços marcantes. "
                "Seja objetivo e específico — esta descrição será usada para rejuvenescer "
                "levemente o personagem para ~55 anos mantendo fidelidade ao perfil."
            )),
        ],
    )
    desc = resp.text.strip()
    print(f"  → {desc[:150]}…")
    return desc


def generate_avatar_imagen(prompt: str, out_path: Path, label: str, aspect: str = "3:4"):
    """Gera avatar via Imagen 4."""
    print(f"  🎨 Imagen 4: gerando {label}…")
    try:
        resp = client().models.generate_images(
            model=MODEL_IMAGEN,
            prompt=prompt,
            config=gt.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect,
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
                person_generation="ALLOW_ADULT",
            ),
        )
        if resp.generated_images:
            out_path.write_bytes(resp.generated_images[0].image.image_bytes)
            print(f"  ✓ {label}: {out_path.name}")
        else:
            raise ValueError("Nenhuma imagem retornada pelo Imagen")
    except Exception as e:
        print(f"  ⚠ Imagen falhou ({e}), usando fallback PIL")
        _pil_fallback_fullbody(out_path, label, "Eliezer" in label)


def _pil_fallback_fullbody(path: Path, label: str, is_eliezer: bool):
    """Fallback PIL: silhueta estilizada de corpo inteiro."""
    from PIL import Image, ImageDraw
    W, H = SPRITE_W, SPRITE_H
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    col = COL_ELIEZER if is_eliezer else COL_IA
    # Cabeça
    draw.ellipse([W//2-60, 20, W//2+60, 140], fill=col + (200,))
    # Corpo
    draw.rectangle([W//2-50, 145, W//2+50, 380], fill=col + (160,))
    # Pernas
    draw.rectangle([W//2-45, 385, W//2-5, H-10], fill=col + (140,))
    draw.rectangle([W//2+5, 385, W//2+45, H-10], fill=col + (140,))
    # Inicial
    fnt = _font(80, bold=True)
    draw.text((W//2, 80), ("E" if is_eliezer else "IA"), fill=(255,255,255,220),
              font=fnt, anchor="mm")
    img.save(path)


def _pil_fallback_background(path: Path):
    """Fallback PIL: fundo talk-show estilizado."""
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (VIDEO_W, VIDEO_H), (8, 14, 30))
    draw = ImageDraw.Draw(img)
    # Piso gradiente
    for y in range(700, VIDEO_H):
        t = (y - 700) / (VIDEO_H - 700)
        c = tuple(int(8 + t * 30) for _ in range(3))
        draw.line([(0, y), (VIDEO_W, y)], fill=c)
    # Painéis geométricos de fundo
    draw.rectangle([60, 80, 360, 680], outline=(30, 50, 80), width=2)
    draw.rectangle([1560, 80, 1860, 680], outline=(30, 50, 80), width=2)
    # Cadeiras (simplificado)
    for cx in [380, 1540]:
        draw.rounded_rectangle([cx-90, 540, cx+90, 700], radius=15,
                                fill=(20, 35, 60), outline=(40, 60, 90), width=2)
        draw.rounded_rectangle([cx-80, 420, cx+80, 550], radius=10,
                                fill=(25, 40, 65), outline=(40, 60, 90), width=2)
    # Mesinha central
    draw.ellipse([870, 580, 1050, 660], fill=(18, 30, 50), outline=(40, 60, 90), width=2)
    # Letreiro
    fnt_big = _font(42, bold=True)
    fnt_sub = _font(24)
    draw.text((VIDEO_W//2, 45), "ENGENHARIA DE SOFTWARE COM IA AUTÔNOMA",
              fill=(245, 166, 35), font=fnt_big, anchor="mm")
    draw.text((VIDEO_W//2, 90), "Episódio 2 • Comando Epistêmico vs. Operacional",
              fill=(120, 150, 190), font=fnt_sub, anchor="mm")
    img.save(path)


def prepare_avatars() -> dict:
    """
    Retorna dict com paths de todas as poses:
    {
        "eliezer_idle": Path, "eliezer_talking": Path, "eliezer_listening": Path,
        "ia_idle": Path, "ia_talking": Path, "ia_listening": Path,
        "background": Path
    }
    """
    avatars = {}

    # ── Background talk-show ─────────────────────────────────────────────────
    bg_path = AVATAR_DIR / "background_talkshow.png"
    if not bg_path.exists():
        print("  🎨 Imagen 4: gerando background talk-show…")
        bg_prompt = (
            "Wide-format talk-show studio backdrop, podcast/late-night style, "
            "deep navy blue walls with subtle geometric light panels, "
            "large illuminated sign at top reading "
            "'ENGENHARIA DE SOFTWARE COM IA AUTÔNOMA' "
            "in modern sans-serif white letters with golden accent glow. "
            "Two empty modern armchairs in golden-brown fabric separated by a small "
            "round coffee table with a minimalist lamp, soft amber and cyan stage "
            "lighting from above creating warm depth, slight bokeh effect, "
            "sophisticated and warm atmosphere, polished floor with subtle reflections. "
            "NO people in the scene — pure backdrop. Photorealistic, high quality, "
            "1920x1080 landscape 16:9 format."
        )
        try:
            resp = client().models.generate_images(
                model=MODEL_IMAGEN,
                prompt=bg_prompt,
                config=gt.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="16:9",
                    safety_filter_level="BLOCK_LOW_AND_ABOVE",
                ),
            )
            if resp.generated_images:
                bg_path.write_bytes(resp.generated_images[0].image.image_bytes)
                print(f"  ✓ Background gerado: {bg_path.name}")
            else:
                raise ValueError("sem imagem")
        except Exception as e:
            print(f"  ⚠ Background Imagen falhou ({e}), usando fallback PIL")
            _pil_fallback_background(bg_path)
    else:
        print(f"✓ Background em cache: {bg_path.name}")
    avatars["background"] = bg_path

    # ── Eliezer: 3 poses ─────────────────────────────────────────────────────
    raw_photo = fetch_youtube_avatar()
    base_desc = ""
    if raw_photo:
        base_desc = describe_photo(raw_photo)

    eliezer_base = (
        f"Full-body caricature illustration of a Brazilian software architect, "
        f"approximately 55 years old (NOT older — healthy vibrant appearance, "
        f"alert eyes, upright posture). "
        + (f"Physical features from photo: {base_desc}. " if base_desc else
           "Silver-streaked dark hair, warm brown skin, professional confident look. ")
        + "Wearing smart casual attire: dark navy blazer over light open-collar shirt, "
        "dark trousers. Golden-amber accent color palette (#F5A623). "
        "Seated in a modern armchair in a talk-show studio setting. "
        "Caricature style: warm, slightly exaggerated head (~1.2x), body proportionally realistic. "
        "High quality digital art, vibrant colors, soft stage lighting from upper-left. "
        "Transparent PNG background preferred. 3:4 portrait orientation."
    )

    pose_descs = {
        "idle": (
            "Pose: relaxed neutral seated posture, hands resting on armrests or lap, "
            "calm attentive expression, slight smile."
        ),
        "talking": (
            "Pose: actively speaking — one hand raised mid-gesture (index finger up or "
            "open palm forward), leaning slightly forward, engaged expression, "
            "mouth open in mid-speech."
        ),
        "listening": (
            "Pose: listening attentively — head tilted slightly, chin resting on hand "
            "or nodding slightly, thoughtful expression, soft smile."
        ),
    }

    for pose in POSES_ELIEZER:
        p = AVATAR_DIR / f"eliezer_{pose}.png"
        if not p.exists():
            prompt = eliezer_base + " " + pose_descs[pose]
            generate_avatar_imagen(prompt, p, f"Eliezer {pose}")
            time.sleep(1)  # respeitar quota Imagen
        else:
            print(f"✓ Eliezer {pose} em cache")
        avatars[f"eliezer_{pose}"] = p

    # ── IA: 3 poses ──────────────────────────────────────────────────────────
    ia_base = (
        "Full-body caricature-style digital illustration of a friendly AI assistant "
        "character. Humanoid silhouette with glowing cyan holographic skin, "
        "subtle circuit pattern details visible through semi-translucent surface, "
        "minimalist human-like face with soft cyan glow, no harsh edges, "
        "warm and approachable expression. "
        "Wearing a stylized futuristic blazer in deep blue with cyan trim — "
        "professional but clearly non-human. "
        "Body proportions: caricature (head ~1.2x). "
        "Seated in a sleek minimalist chair in a talk-show studio setting. "
        "High quality digital art, blue/cyan palette (#00D4FF) with white accents, "
        "soft holographic shimmer, talk-show stage lighting. "
        "Transparent PNG background preferred. 3:4 portrait orientation."
    )

    ia_pose_descs = {
        "idle": (
            "Pose: neutral seated, hands resting naturally, calm attentive expression, "
            "subtle glow steady."
        ),
        "talking": (
            "Pose: actively explaining — one hand raised with an open gesture, "
            "leaning forward slightly, expression engaged, "
            "holographic patterns slightly brighter."
        ),
        "listening": (
            "Pose: listening — head slightly tilted, thoughtful posture, "
            "one finger on chin, expression of genuine curiosity."
        ),
    }

    for pose in POSES_IA:
        p = AVATAR_DIR / f"ia_{pose}.png"
        if not p.exists():
            prompt = ia_base + " " + ia_pose_descs[pose]
            generate_avatar_imagen(prompt, p, f"IA {pose}")
            time.sleep(1)
        else:
            print(f"✓ IA {pose} em cache")
        avatars[f"ia_{pose}"] = p

    return avatars


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 3 — ÁUDIO TTS
# ═══════════════════════════════════════════════════════════════════════════════

def pcm_to_wav(pcm: bytes, rate: int = 24000, channels: int = 1, bits: int = 16) -> bytes:
    data_size = len(pcm)
    byte_rate = rate * channels * bits // 8
    block_align = channels * bits // 8
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_size, b"WAVE",
        b"fmt ", 16, 1, channels, rate,
        byte_rate, block_align, bits,
        b"data", data_size,
    )
    return header + pcm


SILENCE_SIZE = 44 + 24000 * 4 * 2  # 192044 bytes = silêncio (não TTS real)

_tts_flash_count = 0
_tts_pro_count = 0


def generate_tts_line(text: str, voice: str, out_path: Path) -> Path:
    global _tts_flash_count, _tts_pro_count

    if out_path.exists():
        # Checar se não é silêncio
        size = out_path.stat().st_size
        if size != SILENCE_SIZE:
            return out_path
        print(f"    ⚠ Silêncio detectado em {out_path.name}, regerando…")
        out_path.unlink()

    # Escolher modelo com base em quotas usadas
    if _tts_flash_count < 100:
        model = MODEL_TTS_FLASH
        _tts_flash_count += 1
    elif _tts_pro_count < 50:
        model = MODEL_TTS_PRO
        _tts_pro_count += 1
    else:
        model = MODEL_TTS_FALLBACK

    # Pad textos muito curtos
    t = text if len(text) >= 5 else text + "..."

    for attempt in range(3):
        try:
            resp = client().models.generate_content(
                model=model,
                contents=t,
                config=gt.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=gt.SpeechConfig(
                        voice_config=gt.VoiceConfig(
                            prebuilt_voice_config=gt.PrebuiltVoiceConfig(voice_name=voice)
                        )
                    ),
                ),
            )
            part = resp.candidates[0].content.parts[0]
            pcm_bytes = part.inline_data.data  # raw PCM, NÃO base64
            mime = part.inline_data.mime_type
            rate_match = re.search(r"rate=(\d+)", mime)
            rate = int(rate_match.group(1)) if rate_match else 24000
            wav_bytes = pcm_to_wav(pcm_bytes, rate=rate)

            if len(wav_bytes) == SILENCE_SIZE:
                print(f"    ⚠ Silêncio retornado (tentativa {attempt+1}/3)")
                time.sleep(2)
                continue

            out_path.write_bytes(wav_bytes)
            return out_path
        except Exception as e:
            if "429" in str(e):
                print(f"    ⚠ Quota 429 (tentativa {attempt+1}/3) — aguardando 60s…")
                time.sleep(60)
            else:
                print(f"    ⚠ TTS falhou ({e})")
                break

    # Fallback: 4s de silêncio
    out_path.write_bytes(pcm_to_wav(b"\x00\x00" * 24000 * 4))
    return out_path


def wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as wf:
            return wf.getnframes() / wf.getframerate()
    except Exception:
        return 5.0


def generate_all_audio(script: list[dict]) -> dict[int, Path]:
    audio_map: dict[int, Path] = {}
    total = len(script)
    missing = [l for l in script if not (AUDIO_DIR / f"line_{l['id']:04d}.wav").exists()]
    print(f"  → {total - len(missing)} já existem, {len(missing)} a gerar")

    for idx, line in enumerate(script):
        lid = line["id"]
        out = AUDIO_DIR / f"line_{lid:04d}.wav"
        if not out.exists() or out.stat().st_size == SILENCE_SIZE:
            speaker = line["speaker"]
            voice = VOICE_ELIEZER if speaker == "Eliezer" else VOICE_IA
            text = line["pt"]
            print(f"  🎙 [{idx+1}/{total}] {speaker}: {text[:65]}…")
            generate_tts_line(text, voice, out)
            time.sleep(0.3)
        audio_map[lid] = out

    return audio_map


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 4 — SLIDES PNG (Layout Talk-Show)
# ═══════════════════════════════════════════════════════════════════════════════

def _font(size: int, bold: bool = False):
    from PIL import ImageFont
    candidates = (
        ["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf", "verdanab.ttf"] if bold
        else ["segoeui.ttf", "arial.ttf", "calibri.ttf", "verdana.ttf"]
    )
    for name in candidates:
        fp = WIN_FONTS / name
        if fp.exists():
            try:
                return ImageFont.truetype(str(fp), size)
            except Exception:
                pass
    from PIL import ImageFont
    return ImageFont.load_default()


def _wrap_text(draw, text: str, font, max_w: int) -> list[str]:
    words = text.split()
    lines, cur = [], []
    for w in words:
        test = " ".join(cur + [w])
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] > max_w and cur:
            lines.append(" ".join(cur))
            cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(" ".join(cur))
    return lines or [""]


def _load_sprite(path: Path, target_h: int = SPRITE_H) -> "Image":
    """Carrega sprite com alpha, redimensiona mantendo proporção."""
    from PIL import Image
    img = Image.open(path).convert("RGBA")
    # Redimensionar proporcional
    orig_w, orig_h = img.size
    scale = target_h / orig_h
    new_w = int(orig_w * scale)
    img = img.resize((new_w, target_h), Image.LANCZOS)
    return img


def _load_background(bg_path: Path) -> "Image":
    from PIL import Image
    img = Image.open(bg_path).convert("RGB").resize((VIDEO_W, VIDEO_H), Image.LANCZOS)
    return img


def _glow_around(base_img, x_center: int, y_top: int, w: int, h: int,
                 color: tuple, layers: int = 4):
    """Adiciona anel luminoso ao redor de um sprite retangular."""
    from PIL import Image, ImageDraw
    overlay = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    pad = 15
    for i in range(layers, 0, -1):
        alpha = int(70 / i)
        od.rounded_rectangle(
            [x_center - w//2 - pad - i*6, y_top - pad - i*4,
             x_center + w//2 + pad + i*6, y_top + h + pad + i*4],
            radius=20,
            outline=color + (alpha,), width=3,
        )
    from PIL import Image as PILImage
    return PILImage.alpha_composite(base_img.convert("RGBA"), overlay)


def _pick_pose(speaker: str, line_idx: int, other_counter: dict) -> tuple[str, str]:
    """
    Retorna (active_pose, inactive_pose) baseado no contexto.
    Alterna a pose inativa a cada ~5 falas para dar movimento.
    """
    active_pose = "talking"
    # Alterna entre idle e listening para o inativo
    alt_cycle = (line_idx // 3) % 2
    inactive_pose = "listening" if alt_cycle == 0 else "idle"
    return active_pose, inactive_pose


_bg_cache: Optional["Image"] = None

def create_slide_talkshow(line: dict, avatars: dict,
                          line_idx: int, total: int) -> Path:
    """Cria slide no layout talk-show com sprites de corpo inteiro."""
    from PIL import Image, ImageDraw
    global _bg_cache

    slide_path = SLIDES_DIR / f"slide_{line['id']:04d}.png"
    if slide_path.exists():
        return slide_path

    speaker = line["speaker"]
    pt_text = line["pt"]
    en_text = line.get("en", "")
    is_el = speaker == "Eliezer"
    active_col = COL_ELIEZER if is_el else COL_IA

    # Background
    if _bg_cache is None:
        _bg_cache = _load_background(avatars["background"])
    slide = _bg_cache.copy().convert("RGBA")

    # Poses
    active_pose, inactive_pose = _pick_pose(speaker, line_idx, {})

    el_pose = active_pose if is_el else inactive_pose
    ia_pose = active_pose if not is_el else inactive_pose

    # Sprites
    el_sprite = _load_sprite(avatars[f"eliezer_{el_pose}"], SPRITE_H)
    ia_sprite = _load_sprite(avatars[f"ia_{ia_pose}"], SPRITE_H)

    el_w, el_h = el_sprite.size
    ia_w, ia_h = ia_sprite.size

    # Posição: calcanhar no chão = y = 750
    floor_y = 750
    el_x = ELIEZER_X - el_w // 2
    el_y = floor_y - el_h
    ia_x = VIDEO_W - ELIEZER_X - ia_w // 2
    ia_y = floor_y - ia_h

    # Glow anel ao redor do speaker ativo
    if is_el:
        slide = _glow_around(slide, ELIEZER_X, el_y, el_w, el_h, COL_ELIEZER, layers=5)
    else:
        slide = _glow_around(slide, VIDEO_W - ELIEZER_X, ia_y, ia_w, ia_h, COL_IA, layers=5)

    slide.paste(el_sprite, (el_x, el_y), el_sprite)
    slide.paste(ia_sprite, (ia_x, ia_y), ia_sprite)

    draw = ImageDraw.Draw(slide)

    # Barra de progresso (fina, topo)
    prog_w = int(VIDEO_W * (line_idx / max(total - 1, 1)))
    draw.rectangle([0, 0, prog_w, 5], fill=active_col)
    draw.rectangle([prog_w, 0, VIDEO_W, 5], fill=(30, 40, 60, 180))

    # Nome + badge speaker ativo
    name_fnt = _font(28, bold=True)
    if is_el:
        draw.text((ELIEZER_X, el_y - 35), "◉ Eliezer Rosa",
                  fill=COL_ELIEZER, font=name_fnt, anchor="mm")
    else:
        draw.text((VIDEO_W - ELIEZER_X, ia_y - 35), "◉ GitHub Copilot",
                  fill=COL_IA, font=name_fnt, anchor="mm")

    # Caixa de legenda (parte inferior)
    caption_top = CAPTION_Y
    # Fundo semitransparente
    overlay = Image.new("RGBA", (VIDEO_W, VIDEO_H), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.rectangle([0, caption_top, VIDEO_W, VIDEO_H], fill=(8, 14, 28, 210))
    slide = Image.alpha_composite(slide, overlay)
    draw = ImageDraw.Draw(slide)

    # Linha de acento colorida
    draw.rectangle([0, caption_top, VIDEO_W, caption_top + 4], fill=active_col)
    draw.rectangle([0, caption_top, 6, VIDEO_H], fill=active_col)

    # Texto PT-BR
    pt_fnt = _font(36, bold=True)
    pt_lines = _wrap_text(draw, pt_text, pt_fnt, VIDEO_W - 140)
    line_h = 50
    pt_y0 = caption_top + 30
    for i, tl in enumerate(pt_lines[:3]):  # max 3 linhas
        draw.text((VIDEO_W // 2, pt_y0 + i * line_h), tl,
                  fill=TEXT_WHITE, font=pt_fnt, anchor="mt")

    # EN subtítulo
    if en_text:
        en_fnt = _font(22)
        en_y = VIDEO_H - 28
        en_lines = _wrap_text(draw, f"EN: {en_text}", en_fnt, VIDEO_W - 140)
        if en_lines:
            draw.text((VIDEO_W // 2, en_y), en_lines[0][:110],
                      fill=TEXT_SUBTT, font=en_fnt, anchor="mb")

    # Numeração discreta
    num_fnt = _font(16)
    draw.text((VIDEO_W - 20, VIDEO_H - 10),
              f"{line['id']}/{total}", fill=(50, 60, 80), font=num_fnt, anchor="rb")

    # Salvar como RGB
    slide.convert("RGB").save(slide_path, optimize=False)
    return slide_path


def create_all_slides(script: list[dict], avatars: dict) -> dict[int, Path]:
    total = len(script)
    missing = [l for l in script if not (SLIDES_DIR / f"slide_{l['id']:04d}.png").exists()]
    print(f"  → {total - len(missing)} já existem, {len(missing)} a gerar")

    slides: dict[int, Path] = {}
    for idx, line in enumerate(script):
        lid = line["id"]
        p = SLIDES_DIR / f"slide_{lid:04d}.png"
        if not p.exists():
            if idx % 20 == 0 or idx == total - 1:
                print(f"  🖼 Slides: {idx+1}/{total}")
            create_slide_talkshow(line, avatars, idx, total)
        slides[lid] = p

    print(f"  ✓ {total} slides OK")
    return slides


# ═══════════════════════════════════════════════════════════════════════════════
# MOCKUPS — 3 slides de prévia PIL com placeholders
# ═══════════════════════════════════════════════════════════════════════════════

def generate_mockups():
    """Gera 3 mockups PIL com placeholders para aprovação do Eliezer."""
    print("🖼 Gerando 3 mockups do layout talk-show (placeholders)…")

    mock_lines = [
        {"id": 1, "speaker": "Eliezer", "pt": "Em 2009, o voo Air France 447 caiu no Atlântico. O piloto automático desconectou e os pilotos, sem entender o estado do avião, fizeram as escolhas erradas. Eles delegaram o operacional e perderam o epistêmico.", "en": "In 2009, Air France 447 crashed into the Atlantic.", "note": "grave, impactante"},
        {"id": 2, "speaker": "IA", "pt": "Isso é... surpreendentemente filosófico para um cara que programou em RPG II nos anos 70.", "en": "That's surprisingly philosophical for someone who coded RPG II in the 70s.", "note": "humor leve, surpresa"},
        {"id": 3, "speaker": "Eliezer", "pt": "Engenharia sempre foi filosofia aplicada. A diferença é que agora temos agentes de IA que podem escalar tanto o acerto quanto o erro — e isso torna a distinção epistêmica e operacional urgente, não acadêmica.", "en": "Engineering has always been applied philosophy.", "note": "firme, apaixonado"},
    ]

    # Avatares placeholder (PIL fallback)
    av_paths = {}
    for pose in POSES_ELIEZER:
        p = MOCK_DIR / f"eliezer_{pose}_mock.png"
        if not p.exists():
            _pil_fallback_fullbody(p, f"Eliezer {pose}", True)
        av_paths[f"eliezer_{pose}"] = p
    for pose in POSES_IA:
        p = MOCK_DIR / f"ia_{pose}_mock.png"
        if not p.exists():
            _pil_fallback_fullbody(p, f"IA {pose}", False)
        av_paths[f"ia_{pose}"] = p

    # Background placeholder
    bg_p = MOCK_DIR / "background_mock.png"
    if not bg_p.exists():
        _pil_fallback_background(bg_p)
    av_paths["background"] = bg_p

    # Gerar os 3 slides mockup
    import shutil
    for i, ml in enumerate(mock_lines):
        out = MOCK_DIR / f"mockup_{i+1:02d}_slide.png"
        if not out.exists():
            tmp_slides = SLIDES_DIR
            SLIDES_DIR.mkdir(exist_ok=True)
            # Override slide_path para MOCK_DIR
            from PIL import Image, ImageDraw
            global _bg_cache
            _bg_cache = None  # reset cache para usar mock bg

            tmp_dir_bkp = SLIDES_DIR
            # Cria slide temporário
            create_slide_talkshow(ml, av_paths, i, 3)
            tmp_slide = SLIDES_DIR / f"slide_{ml['id']:04d}.png"
            if tmp_slide.exists():
                shutil.copy(tmp_slide, out)
                tmp_slide.unlink()
        print(f"  ✓ Mockup {i+1}: {out.name}")

    _bg_cache = None  # reset cache
    print(f"\n📋 Mockups salvos em: {MOCK_DIR}")
    print("   Verifique e dê o 'go' para prosseguir com as fases 2–5.")
    for i in range(1, 4):
        print(f"   {MOCK_DIR / f'mockup_{i:02d}_slide.png'}")


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 5 — MONTAGEM FINAL (ffmpeg)
# ═══════════════════════════════════════════════════════════════════════════════

def _silence_wav(duration_s: float, out_path: Path, rate: int = 24000):
    n_samples = int(rate * duration_s)
    out_path.write_bytes(pcm_to_wav(b"\x00\x00" * n_samples, rate=rate))


def assemble_video(script: list[dict],
                   audio_map: dict[int, Path],
                   slide_map: dict[int, Path]) -> Path:
    final_path = OUT_DIR / "idd_ponto2_comando_epistemico.mp4"
    if final_path.exists():
        print(f"✓ Vídeo final já existe: {final_path}")
        return final_path

    print("  Calculando durações dos segmentos…")

    gap_wav = OUT_DIR / "gap_300ms.wav"
    if not gap_wav.exists():
        _silence_wav(0.30, gap_wav)

    slide_concat = OUT_DIR / "slides_concat.txt"
    audio_concat = OUT_DIR / "audio_concat.txt"

    with open(slide_concat, "w", encoding="utf-8") as sv, \
         open(audio_concat, "w", encoding="utf-8") as av:
        for line in script:
            lid = line["id"]
            slide = slide_map.get(lid)
            audio = audio_map.get(lid)
            if not slide or not audio:
                continue
            dur = wav_duration(audio) + 0.30
            sv.write(f"file '{str(slide).replace(chr(92), chr(47))}'\n")
            sv.write(f"duration {dur:.3f}\n")
            av.write(f"file '{str(audio).replace(chr(92), chr(47))}'\n")
            av.write(f"file '{str(gap_wav).replace(chr(92), chr(47))}'\n")

    print("  🎞 Renderizando slideshow…")
    slideshow_mp4 = OUT_DIR / "slideshow_video.mp4"
    if not slideshow_mp4.exists():
        _run_ffmpeg([
            "-f", "concat", "-safe", "0", "-i", str(slide_concat),
            "-vf", "fps=30,scale=1920:1080:flags=lanczos",
            "-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-pix_fmt", "yuv420p",
            str(slideshow_mp4),
        ], label="slideshow")

    print("  🔊 Concatenando áudios…")
    combined_wav = OUT_DIR / "combined_audio.wav"
    if not combined_wav.exists():
        _run_ffmpeg([
            "-f", "concat", "-safe", "0", "-i", str(audio_concat),
            "-c", "copy",
            str(combined_wav),
        ], label="audio_concat")

    print("  🎬 Mesclando vídeo + áudio…")
    _run_ffmpeg([
        "-i", str(slideshow_mp4),
        "-i", str(combined_wav),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(final_path),
    ], label="merge")

    size_mb = final_path.stat().st_size / 1024 / 1024
    print(f"\n  ✅ Vídeo final: {final_path}")
    print(f"     Tamanho: {size_mb:.1f} MB")
    return final_path


def _run_ffmpeg(args: list[str], label: str):
    cmd = ["ffmpeg", "-y", "-loglevel", "warning"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ⚠ ffmpeg [{label}] stderr:\n{result.stderr[-600:]}")
        raise RuntimeError(f"ffmpeg [{label}] falhou (code {result.returncode})")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

PHASES = ("script", "mockups", "avatars", "audio", "slides", "video", "all")


def main():
    parser = argparse.ArgumentParser(
        description="Gera vídeo IDD Ponto 2 — Comando Epistêmico vs. Operacional"
    )
    parser.add_argument("--phase", default="all", choices=PHASES,
                        help="Fase a executar (default: all)")
    args = parser.parse_args()
    phase = args.phase

    print("=" * 66)
    print("  IDD — Ponto 2: Comando Epistêmico vs. Operacional  |  ~20 min")
    print("=" * 66)
    print(f"  Saída: {OUT_DIR}\n")

    # ── FASE 1: Roteiro ───────────────────────────────────────────────────────
    script: list[dict] = []
    if phase in ("all", "script", "audio", "slides", "video", "mockups"):
        print("── FASE 1: ROTEIRO ──────────────────────────────────────────────")
        script = generate_script()
        if phase == "script":
            print(f"\n📋 Preview (primeiras 10 falas):")
            for l in script[:10]:
                print(f"  [{l['speaker']:8}] {l['pt'][:90]}…")
            print(f"\n  Total: {len(script)} falas | Arquivo: {SCRIPT_FILE}")
            print(f"\n  ⚠ GATE: Revise o roteiro e rode --phase mockups para ver o layout.")
            return

    # ── MOCKUPS (gate visual) ─────────────────────────────────────────────────
    if phase == "mockups":
        generate_mockups()
        print("\n  ⚠ GATE: Revise os mockups e dê 'go' para --phase avatars ou --phase all.")
        return

    # ── FASE 2: Avatares ──────────────────────────────────────────────────────
    avatars: dict = {}
    if phase in ("all", "avatars", "slides", "video"):
        print("── FASE 2: AVATARES (corpo inteiro, 3 poses cada) ───────────────────")
        avatars = prepare_avatars()
        if phase == "avatars":
            for k, v in avatars.items():
                print(f"  {k}: {v}")
            return

    # ── FASE 3: Áudio TTS ─────────────────────────────────────────────────────
    audio_map: dict[int, Path] = {}
    if phase in ("all", "audio", "video"):
        if not script:
            script = generate_script()
        if not avatars:
            avatars = {k: AVATAR_DIR / v for k, v in {
                "eliezer_idle": "eliezer_idle.png",
                "eliezer_talking": "eliezer_talking.png",
                "eliezer_listening": "eliezer_listening.png",
                "ia_idle": "ia_idle.png",
                "ia_talking": "ia_talking.png",
                "ia_listening": "ia_listening.png",
                "background": "background_talkshow.png",
            }.items()}
        print(f"── FASE 3: ÁUDIO TTS ({len(script)} linhas) ──────────────────────────────")
        audio_map = generate_all_audio(script)
        print(f"  ✓ {len(audio_map)} áudios OK")
        if phase == "audio":
            return

    # ── FASE 4: Slides ────────────────────────────────────────────────────────
    slide_map: dict[int, Path] = {}
    if phase in ("all", "slides", "video"):
        if not script:
            script = generate_script()
        if not avatars:
            avatars = {
                "eliezer_idle": AVATAR_DIR / "eliezer_idle.png",
                "eliezer_talking": AVATAR_DIR / "eliezer_talking.png",
                "eliezer_listening": AVATAR_DIR / "eliezer_listening.png",
                "ia_idle": AVATAR_DIR / "ia_idle.png",
                "ia_talking": AVATAR_DIR / "ia_talking.png",
                "ia_listening": AVATAR_DIR / "ia_listening.png",
                "background": AVATAR_DIR / "background_talkshow.png",
            }
        print(f"── FASE 4: SLIDES TALK-SHOW ({len(script)} slides) ─────────────────────")
        slide_map = create_all_slides(script, avatars)
        if phase == "slides":
            return

    # ── FASE 5: Montagem ─────────────────────────────────────────────────────
    if phase in ("all", "video"):
        if not script:
            script = generate_script()
        if not audio_map:
            audio_map = {l["id"]: AUDIO_DIR / f"line_{l['id']:04d}.wav" for l in script}
        if not slide_map:
            slide_map = {l["id"]: SLIDES_DIR / f"slide_{l['id']:04d}.png" for l in script}
        print("── FASE 5: MONTAGEM FINAL ───────────────────────────────────────────")
        final = assemble_video(script, audio_map, slide_map)
        size_mb = final.stat().st_size / 1024 / 1024
        dur_approx = len(script) * 8 / 60
        print(f"\n{'='*66}")
        print(f"  ✅ CONCLUÍDO!")
        print(f"     Vídeo: {final}")
        print(f"     Tamanho: {size_mb:.1f} MB | Duração estimada: ~{dur_approx:.0f} min")
        print(f"\n  PRÓXIMO PASSO:")
        print(f"     python upload_to_youtube.py \"{final}\" \\")
        print(f'       --title "IDD Ponto 2: Comando Epistêmico vs. Operacional" \\')
        print(f"       --visibility unlisted")
        print(f"{'='*66}")


if __name__ == "__main__":
    main()
