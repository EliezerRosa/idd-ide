#!/usr/bin/env python3
"""
create_idd_p1_video.py — Vídeo deep-dive bilíngue (PT-BR + EN)
"IDD Ponto 1: O que é Intent-Driven Development"

Dois apresentadores estilo podcast:
  • Eliezer Rosa (caricatura/avatar baseado na foto do canal YouTube)
  • IA — GitHub Copilot (avatar gerado via Imagen 4)

Pipeline:
  Fase 1  → Roteiro (Gemini 2.0 Flash, ~150 diálogos, ~20 min)
  Fase 2  → Avatares (foto YouTube + Imagen 4 para caricaturas)
  Fase 3  → Áudio TTS (Gemini 2.5 Flash TTS, 2 vozes, 1 WAV/linha)
  Fase 4  → Slides PNG (PIL, layout podcast HD 1920×1080)
  Fase 5  → Vídeo final (ffmpeg concat imagens + áudio)

Uso:
    python create_idd_p1_video.py                    # tudo
    python create_idd_p1_video.py --phase script     # só roteiro
    python create_idd_p1_video.py --phase avatars    # só avatares
    python create_idd_p1_video.py --phase audio      # só TTS
    python create_idd_p1_video.py --phase slides     # só slides
    python create_idd_p1_video.py --phase video      # só montagem final
"""

import os, sys, json, struct, wave, time, subprocess, re, argparse
from pathlib import Path
from typing import Optional

# ─── PATHS ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent
_ACERVO    = BASE_DIR.parent / ".." / "04 - Acervo de Episódios"
OUT_DIR    = (_ACERVO / "Ep01 - O que é IDD" / "idd_p1_output").resolve()
SCRIPT_FILE = OUT_DIR / "script.json"
AUDIO_DIR  = OUT_DIR / "audio"
SLIDES_DIR = OUT_DIR / "slides"
AVATAR_DIR = OUT_DIR / "avatars"
SEG_DIR    = OUT_DIR / "segments"

for d in [OUT_DIR, AUDIO_DIR, SLIDES_DIR, AVATAR_DIR, SEG_DIR]:
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
MODEL_TEXT    = "gemini-2.5-pro"   # suporta 65k tokens output, melhor para scripts longos
MODEL_TTS     = "gemini-2.5-pro-preview-tts"   # quota separada do flash-tts (100/dia cada)
MODEL_IMAGEN  = "imagen-4.0-generate-001"
VOICE_ELIEZER = "Charon"   # grave, autoritativo, caloroso
VOICE_IA      = "Kore"     # claro, preciso, articulado

YT_VIDEO_URL  = "https://www.youtube.com/watch?v=jnn8R-CcAsI"

# ─── VISUAL CONFIG ────────────────────────────────────────────────────────────
VIDEO_W, VIDEO_H = 1920, 1080

BG          = (13, 17, 23)
PANEL_DARK  = (18, 26, 44)
PANEL_BG    = (22, 30, 50)
COL_ELIEZER = (245, 166, 35)    # gold
COL_IA      = (0, 212, 255)     # cyan
TEXT_WHITE  = (255, 255, 255)
TEXT_GRAY   = (160, 175, 200)
TEXT_SUBTT  = (120, 150, 185)

WIN_FONTS   = Path("C:/Windows/Fonts")

# ═══════════════════════════════════════════════════════════════════════════════
# FASE 1 — ROTEIRO
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_PROMPT = """\
Você é roteirista de podcast educativo de altíssima qualidade em pt-BR.
Crie o roteiro COMPLETO de ~20 minutos para um podcast com dois apresentadores:

• ELIEZER — criador do paradigma IDD (Intent-Driven Development); 60+ anos;
  arquiteto de software com décadas de experiência; fala com autoridade,
  paixão e histórias concretas. Começou no IBM Brasil em 1976 com RPG II,
  viveu toda a evolução de paradigmas. Tom: reflexivo, apaixonado, sábio.

• IA — GitHub Copilot, a inteligência artificial parceira de Eliezer;
  fala com clareza e precisão; faz perguntas perspicazes que abrem o tema;
  traz analogias e dados externos; às vezes discorda gentilmente.
  Tom: curioso, articulado, entusiasmado.

═══ TEMA DO EPISÓDIO ═══════════════════════════════════════
  "O que é IDD — Intent-Driven Development"
  Episódio 1 da série: Base de Conhecimento IDD
════════════════════════════════════════════════════════════

CONTEÚDO OBRIGATÓRIO (cobrir de forma dialogada, nunca como lista):
1. Abertura impactante: por que IDD existe, o problema que resolve
2. Definição operacional de IDD: "A intenção humana em linguagem natural
   é o artefato de mais alta ordem do sistema"
3. As 6 propriedades essenciais:
   a) NL como fonte primária (não documentação)
   b) Governança persistente — artefatos não são descartados
   c) Comando Epistêmico humano (o quê e por quê)
   d) Augmenting ≠ Automating
   e) Auditabilidade total
   f) Invariantes de negócio como salvaguardas
4. O que IDD NÃO é (com argumentos precisos):
   - Não é vibe coding (sem governança)
   - Não é apenas BDD (limitado a testes)
   - Não é apenas DDD (materializa em OOP, não em NL)
   - Não é geração automática de código (one-shot)
5. Analogias poderosas para leigos E para técnicos
6. O Confirm-Once Pattern explicado pelo Eliezer
7. Implicações práticas no dia a dia do desenvolvedor
8. Conexão com o projeto real: RVM Designações como "living implementation"
9. Momentos de pausa/reflexão ("vamos absorver isso um instante...")
10. Encerramento com call-to-action inspirador e anúncio do próximo episódio

ESTILO:
- Diálogo NATURAL — sem frases genéricas, sem clichês motivacionais
- Eliezer usa histórias reais da sua carreira (IBM, UNISYS, 2PC customizado)
- IA pergunta coisas que o ouvinte está pensando
- Inclua momentos de humor sutil, surpresa, "não sabia disso!"
- Profundidade real — este é um podcast de referência, não superficial
- Cada fala: 1 a 4 frases naturais (não monólogos longos)

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
- Comece com Eliezer fazendo uma abertura impactante
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
        # Truncation recovery: find last valid JSON object and close the array
        last_close = raw.rfind("}")
        if last_close > 0:
            truncated = raw[:last_close + 1]
            # Remove incomplete last entry if needed
            while truncated and not truncated.rstrip().endswith("}"):
                truncated = truncated[:truncated.rfind("}")]
            # Balance brackets
            cleaned = truncated.rstrip().rstrip(",") + "\n]"
            # Extract from first [
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
# FASE 2 — AVATARES
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_youtube_avatar() -> Optional[Path]:
    """Tenta baixar a foto do canal via scraping do vídeo."""
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
        resp = requests.get(YT_VIDEO_URL, headers=headers, timeout=15)
        html = resp.text

        # Padrão 1: thumbnail no channelRenderer
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
            print("  ⚠ Padrão de URL do avatar não encontrado na página.")
            return None

        img_resp = requests.get(thumb_url, headers=headers, timeout=15)
        if img_resp.status_code == 200 and len(img_resp.content) > 1000:
            raw_path.write_bytes(img_resp.content)
            print(f"  ✓ Foto baixada: {raw_path.name} ({len(img_resp.content)//1024} KB)")
            return raw_path
        else:
            print(f"  ⚠ Resposta inválida ({img_resp.status_code})")
            return None

    except Exception as e:
        print(f"  ⚠ Erro ao buscar YouTube: {e}")
        return None


def describe_photo(photo_path: Path) -> str:
    """Usa Gemini Vision para descrever características físicas da foto."""
    print("  🔎 Analisando foto com Gemini Vision…")
    photo_bytes = photo_path.read_bytes()

    # Detect mime type
    mime = "image/jpeg"
    if photo_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        mime = "image/png"

    resp = client().models.generate_content(
        model=MODEL_TEXT,
        contents=[
            gt.Part(inline_data=gt.Blob(mime_type=mime, data=photo_bytes)),
            gt.Part(text=(
                "Descreva em inglês, de forma concisa (máx 4 linhas), as características "
                "físicas desta pessoa para gerar um avatar caricatura: gênero, faixa etária "
                "aproximada, tom de pele, formato do rosto, tipo de cabelo/cor, barba se houver, "
                "traços marcantes. Seja objetivo."
            )),
        ],
    )
    desc = resp.text.strip()
    print(f"  → {desc[:120]}…")
    return desc


def generate_avatar_imagen(prompt: str, out_path: Path, label: str):
    """Gera avatar via Imagen 4."""
    print(f"  🎨 Imagen 4: gerando {label}…")
    try:
        resp = client().models.generate_images(
            model=MODEL_IMAGEN,
            prompt=prompt,
            config=gt.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1",
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
                person_generation="ALLOW_ADULT",
            ),
        )
        if resp.generated_images:
            out_path.write_bytes(resp.generated_images[0].image.image_bytes)
            print(f"  ✓ {label} gerado: {out_path.name}")
        else:
            raise ValueError("Nenhuma imagem retornada pelo Imagen")
    except Exception as e:
        print(f"  ⚠ Imagen falhou ({e}), usando fallback PIL")
        _pil_fallback_avatar(out_path, label[0].upper(), (80, 60, 20) if "Eliezer" in label else (0, 60, 120))


def _pil_fallback_avatar(path: Path, initial: str, bg_rgb: tuple):
    """Avatar fallback com gradiente radial + inicial."""
    from PIL import Image, ImageDraw, ImageFilter
    SIZE = 400
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # fundo degradê (simulado por camadas)
    for r in range(SIZE // 2, 0, -2):
        factor = r / (SIZE // 2)
        c = tuple(int(bg_rgb[i] * factor + 20 * (1 - factor)) for i in range(3))
        bbox = [SIZE // 2 - r, SIZE // 2 - r, SIZE // 2 + r, SIZE // 2 + r]
        draw.ellipse(bbox, fill=c + (255,))
    # anel luminoso
    draw.ellipse([4, 4, SIZE - 5, SIZE - 5], outline=(255, 220, 100, 200), width=4)
    # inicial centralizada
    _draw_centered_text(draw, initial, (SIZE // 2, SIZE // 2), 160, (255, 255, 255), bold=True)
    img.save(path)


def prepare_avatars() -> tuple[Path, Path]:
    """Retorna (eliezer_avatar, ia_avatar) — gera se não existir."""
    el_path = AVATAR_DIR / "eliezer_caricature.png"
    ia_path = AVATAR_DIR / "ia_avatar.png"

    # ── Eliezer ──────────────────────────────────────────────────────────────
    if not el_path.exists():
        raw_photo = fetch_youtube_avatar()

        if raw_photo:
            desc = describe_photo(raw_photo)
            el_prompt = (
                f"Friendly professional caricature portrait of a person: {desc}. "
                "Style: warm caricature illustration with slightly exaggerated features, "
                "intellectual and approachable expression, professional casual attire, "
                "circular head composition, soft gradient background, "
                "high quality digital art, vibrant colors, suitable for podcast avatar"
            )
        else:
            el_prompt = (
                "Warm friendly caricature portrait of a Brazilian man in his 60s, "
                "intellectual expression, slightly exaggerated features, professional attire, "
                "silver/dark hair, circular composition, soft background, "
                "high quality digital art, podcast avatar style"
            )
        generate_avatar_imagen(el_prompt, el_path, "Eliezer caricature")
    else:
        print(f"✓ Avatar Eliezer em cache: {el_path.name}")

    # ── IA ───────────────────────────────────────────────────────────────────
    if not ia_path.exists():
        ia_prompt = (
            "Friendly AI assistant avatar, caricature-style digital illustration, "
            "glowing cyan holographic face with subtle circuit pattern details, "
            "minimalist human-like features with soft glow, futuristic but warm and approachable, "
            "circular composition on dark background, high quality, podcast avatar style, "
            "blue and cyan color palette with white accents"
        )
        generate_avatar_imagen(ia_prompt, ia_path, "IA avatar")
    else:
        print(f"✓ Avatar IA em cache: {ia_path.name}")

    return el_path, ia_path


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 3 — ÁUDIO TTS
# ═══════════════════════════════════════════════════════════════════════════════

def pcm_to_wav(pcm: bytes, rate: int = 24000, channels: int = 1, bits: int = 16) -> bytes:
    """Empacota PCM raw em WAV RIFF."""
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


def generate_tts_line(text: str, voice: str, out_path: Path) -> Path:
    """Gera áudio TTS para uma fala. Retorna path do WAV."""
    if out_path.exists():
        return out_path

    resp = client().models.generate_content(
        model=MODEL_TTS,
        contents=text,
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
    pcm_bytes = part.inline_data.data  # já são bytes, não base64
    mime = part.inline_data.mime_type  # ex: "audio/L16;codec=pcm;rate=24000"

    # Extrair sample rate do mime type
    rate_match = re.search(r"rate=(\d+)", mime)
    rate = int(rate_match.group(1)) if rate_match else 24000

    wav_bytes = pcm_to_wav(pcm_bytes, rate=rate)
    out_path.write_bytes(wav_bytes)
    return out_path


def wav_duration(path: Path) -> float:
    """Duração de um WAV em segundos."""
    try:
        with wave.open(str(path), "rb") as wf:
            return wf.getnframes() / wf.getframerate()
    except Exception:
        return 5.0


def generate_all_audio(script: list[dict]) -> dict[int, Path]:
    """Gera WAV para todas as linhas. Retorna {id: path}."""
    audio_map: dict[int, Path] = {}
    total = len(script)
    missing = [
        line for line in script
        if not (AUDIO_DIR / f"line_{line['id']:04d}.wav").exists()
    ]
    print(f"  → {total - len(missing)} já existem, {len(missing)} a gerar")

    for idx, line in enumerate(script):
        lid = line["id"]
        out = AUDIO_DIR / f"line_{lid:04d}.wav"

        if not out.exists():
            speaker = line["speaker"]
            voice = VOICE_ELIEZER if speaker == "Eliezer" else VOICE_IA
            text = line["pt"]
            print(f"  🎙 [{idx+1}/{total}] {speaker} ({voice}): {text[:65]}…")
            try:
                generate_tts_line(text, voice, out)
            except Exception as e:
                print(f"    ⚠ TTS falhou ({e}), criando silêncio")
                # Fallback: 4 s de silêncio
                out.write_bytes(pcm_to_wav(b"\x00\x00" * 24000 * 4))
            time.sleep(0.25)  # cortesia de rate limit

        audio_map[lid] = out

    return audio_map


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 4 — SLIDES PNG
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


def _circle_crop(img_path: Path, size: int):
    """Recorta imagem em círculo RGBA."""
    from PIL import Image
    img = Image.open(img_path).convert("RGBA").resize((size, size))
    mask = Image.new("L", (size, size), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, mask=mask)
    return out


def _draw_centered_text(draw, text: str, center: tuple, size: int, color: tuple, bold: bool = False):
    fnt = _font(size, bold)
    draw.text(center, text, fill=color, font=fnt, anchor="mm")


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


def _glow_ring(img, cx: int, cy: int, r: int, color: tuple, layers: int = 4):
    """Adiciona anel luminoso ao redor de um círculo."""
    from PIL import Image, ImageDraw
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(layers, 0, -1):
        alpha = 50 // i
        od.ellipse(
            [cx - r - i * 5, cy - r - i * 5, cx + r + i * 5, cy + r + i * 5],
            outline=color + (alpha,), width=3,
        )
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def create_slide(line: dict, eliezer_av: Path, ia_av: Path,
                 line_idx: int, total: int) -> Path:
    """Cria um slide PNG para uma linha do roteiro."""
    from PIL import Image, ImageDraw

    slide_path = SLIDES_DIR / f"slide_{line['id']:04d}.png"
    if slide_path.exists():
        return slide_path

    speaker = line["speaker"]
    pt_text = line["pt"]
    en_text = line.get("en", "")
    is_el = speaker == "Eliezer"
    active_col = COL_ELIEZER if is_el else COL_IA
    dim_col = (60, 70, 90)

    # ── Fundo ─────────────────────────────────────────────────────────────────
    img = Image.new("RGB", (VIDEO_W, VIDEO_H), BG)
    draw = ImageDraw.Draw(img)

    # Gradient título
    for y in range(75):
        t = y / 75
        c = tuple(int(BG[i] + t * (PANEL_BG[i] - BG[i])) for i in range(3))
        draw.line([(0, y), (VIDEO_W, y)], fill=c)

    # Título
    title_fnt = _font(30, bold=True)
    draw.text(
        (VIDEO_W // 2, 37),
        "IDD  ·  Episódio 1: O que é Intent-Driven Development",
        fill=(130, 160, 210), font=title_fnt, anchor="mm",
    )

    # Barra de progresso
    prog_w = int(VIDEO_W * (line_idx / max(total - 1, 1)))
    draw.rectangle([0, 70, prog_w, 74], fill=active_col)
    draw.rectangle([prog_w, 70, VIDEO_W, 74], fill=(35, 45, 65))

    # ── Painéis esquerdo (Eliezer) e direito (IA) ─────────────────────────────
    panel_top = 78
    text_area_h = 220
    panel_h = VIDEO_H - panel_top - text_area_h
    half = VIDEO_W // 2

    # Painel ativo recebe fundo levemente mais claro
    el_bg = PANEL_DARK if is_el else BG
    ia_bg = PANEL_DARK if not is_el else BG
    draw.rectangle([0, panel_top, half, panel_top + panel_h], fill=el_bg)
    draw.rectangle([half, panel_top, VIDEO_W, panel_top + panel_h], fill=ia_bg)

    # Borda painel ativo
    el_border = active_col if is_el else dim_col
    ia_border = active_col if not is_el else dim_col
    draw.rectangle([0, panel_top, half, panel_top + panel_h],
                   outline=el_border, width=2)
    draw.rectangle([half, panel_top, VIDEO_W, panel_top + panel_h],
                   outline=ia_border, width=2)

    # ── Avatares ──────────────────────────────────────────────────────────────
    av_cy = panel_top + (panel_h // 2) - 20

    el_size = 300 if is_el else 210
    ia_size = 300 if not is_el else 210

    el_cx = half // 2
    ia_cx = half + half // 2

    # Glow para falante ativo
    if is_el:
        img = _glow_ring(img, el_cx, av_cy, el_size // 2 + 10, COL_ELIEZER, layers=5)
    else:
        img = _glow_ring(img, ia_cx, av_cy, ia_size // 2 + 10, COL_IA, layers=5)
    draw = ImageDraw.Draw(img)

    # Paste avatares
    el_av_img = _circle_crop(eliezer_av, el_size)
    ia_av_img = _circle_crop(ia_av, ia_size)
    img.paste(el_av_img, (el_cx - el_size // 2, av_cy - el_size // 2), el_av_img)
    img.paste(ia_av_img, (ia_cx - ia_size // 2, av_cy - ia_size // 2), ia_av_img)
    draw = ImageDraw.Draw(img)

    # Nomes e papéis
    name_fnt = _font(26, bold=True)
    role_fnt = _font(19)

    el_name_col = COL_ELIEZER if is_el else (90, 100, 120)
    ia_name_col = COL_IA if not is_el else (90, 100, 120)

    draw.text((el_cx, av_cy + el_size // 2 + 22), "Eliezer Rosa",
              fill=el_name_col, font=name_fnt, anchor="mt")
    draw.text((el_cx, av_cy + el_size // 2 + 54), "Arquiteto · Criador do IDD",
              fill=(120, 130, 150) if not is_el else (200, 175, 90), font=role_fnt, anchor="mt")

    draw.text((ia_cx, av_cy + ia_size // 2 + 22), "GitHub Copilot",
              fill=ia_name_col, font=name_fnt, anchor="mt")
    draw.text((ia_cx, av_cy + ia_size // 2 + 54), "IA · Parceira IDD",
              fill=(120, 130, 150) if is_el else (80, 190, 210), font=role_fnt, anchor="mt")

    # Badge "está falando"
    badge_fnt = _font(20, bold=True)
    badge_cx = el_cx if is_el else ia_cx
    badge_col = active_col
    badge_text = f"◉  {speaker} está falando"
    bbox = draw.textbbox((badge_cx, panel_top + 18), badge_text,
                         font=badge_fnt, anchor="mt")
    pad = 10
    try:
        draw.rounded_rectangle(
            [bbox[0] - pad, bbox[1] - pad // 2, bbox[2] + pad, bbox[3] + pad // 2],
            radius=12,
            fill=(badge_col[0] // 5, badge_col[1] // 5, badge_col[2] // 5),
        )
    except AttributeError:
        draw.rectangle(
            [bbox[0] - pad, bbox[1] - pad // 2, bbox[2] + pad, bbox[3] + pad // 2],
            fill=(badge_col[0] // 5, badge_col[1] // 5, badge_col[2] // 5),
        )
    draw.text((badge_cx, panel_top + 18), badge_text,
              fill=badge_col, font=badge_fnt, anchor="mt")

    # ── Área de texto ─────────────────────────────────────────────────────────
    text_y = VIDEO_H - text_area_h
    draw.rectangle([0, text_y, VIDEO_W, VIDEO_H], fill=(15, 22, 38))
    draw.line([(0, text_y), (VIDEO_W, text_y)], fill=active_col, width=3)
    # Acento lateral
    draw.rectangle([0, text_y, 6, VIDEO_H], fill=active_col)

    # PT-BR texto sincronizado
    pt_fnt = _font(34, bold=True)
    pt_lines = _wrap_text(draw, pt_text, pt_fnt, VIDEO_W - 120)
    line_h = 46
    total_pt_h = len(pt_lines) * line_h
    pt_y0 = text_y + 25

    for i, tl in enumerate(pt_lines):
        draw.text((VIDEO_W // 2, pt_y0 + i * line_h), tl,
                  fill=TEXT_WHITE, font=pt_fnt, anchor="mt")

    # EN subtítulo
    if en_text:
        en_fnt = _font(22)
        en_y = VIDEO_H - 30
        en_lines = _wrap_text(draw, f"EN: {en_text}", en_fnt, VIDEO_W - 120)
        if en_lines:
            draw.text((VIDEO_W // 2, en_y), en_lines[0],
                      fill=TEXT_SUBTT, font=en_fnt, anchor="mb")

    # Número da linha (discreto, canto inferior direito)
    num_fnt = _font(16)
    draw.text((VIDEO_W - 20, VIDEO_H - 10),
              f"{line['id']}/{total}", fill=(50, 60, 80), font=num_fnt, anchor="rb")

    img.save(slide_path, optimize=False)
    return slide_path


def create_all_slides(script: list[dict], el_av: Path, ia_av: Path) -> dict[int, Path]:
    total = len(script)
    missing = [l for l in script if not (SLIDES_DIR / f"slide_{l['id']:04d}.png").exists()]
    print(f"  → {total - len(missing)} já existem, {len(missing)} a gerar")

    slides: dict[int, Path] = {}
    for idx, line in enumerate(script):
        lid = line["id"]
        p = SLIDES_DIR / f"slide_{lid:04d}.png"
        if not p.exists():
            if idx % 15 == 0 or idx == len(script) - 1:
                print(f"  🖼 Slides: {idx + 1}/{total}")
            create_slide(line, el_av, ia_av, idx, total)
        slides[lid] = p

    print(f"  ✓ {total} slides OK")
    return slides


# ═══════════════════════════════════════════════════════════════════════════════
# FASE 5 — MONTAGEM FINAL (ffmpeg)
# ═══════════════════════════════════════════════════════════════════════════════

def _silence_wav(duration_s: float, out_path: Path, rate: int = 24000):
    """Cria WAV de silêncio."""
    n_samples = int(rate * duration_s)
    out_path.write_bytes(pcm_to_wav(b"\x00\x00" * n_samples, rate=rate))


def assemble_video(script: list[dict],
                   audio_map: dict[int, Path],
                   slide_map: dict[int, Path]) -> Path:
    """Monta o vídeo final via ffmpeg (método eficiente com concat demuxer)."""

    final_path = OUT_DIR / "idd_ponto1_o_que_e_idd.mp4"
    if final_path.exists():
        print(f"✓ Vídeo final já existe: {final_path}")
        return final_path

    print("  Calculando durações dos segmentos…")

    # Gera silêncio de gap entre falas (300 ms)
    gap_wav = OUT_DIR / "gap_300ms.wav"
    if not gap_wav.exists():
        _silence_wav(0.30, gap_wav)

    # ── Arquivo concat de slides (vídeo sem áudio) ────────────────────────────
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

            dur = wav_duration(audio) + 0.30  # 300 ms de respiro

            # Para imagens no concat ffmpeg: file + duration
            sv.write(f"file '{str(slide).replace(chr(92), chr(47))}'\n")
            sv.write(f"duration {dur:.3f}\n")

            # Para áudio: linha + gap
            av.write(f"file '{str(audio).replace(chr(92), chr(47))}'\n")
            av.write(f"file '{str(gap_wav).replace(chr(92), chr(47))}'\n")

    print("  🎞 Renderizando slideshow de vídeo…")
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

PHASES = ("script", "avatars", "audio", "slides", "video", "all")


def main():
    parser = argparse.ArgumentParser(description="Gera vídeo IDD Ponto 1")
    parser.add_argument("--phase", default="all", choices=PHASES,
                        help="Fase a executar (default: all)")
    args = parser.parse_args()
    phase = args.phase

    print("=" * 62)
    print("  IDD — Ponto 1: O que é IDD  |  Vídeo Deep-Dive ~20 min")
    print("=" * 62)
    print(f"  Saída: {OUT_DIR}\n")

    # ── FASE 1: Roteiro ───────────────────────────────────────────────────────
    script: list[dict] = []
    if phase in ("all", "script", "audio", "slides", "video"):
        print("── FASE 1: ROTEIRO ──────────────────────────────────────────")
        script = generate_script()
        if phase == "script":
            print(f"\n📋 Preview (primeiras 6 falas):")
            for l in script[:6]:
                print(f"  [{l['speaker']:8}] {l['pt'][:90]}…")
            print(f"\n  Arquivo: {SCRIPT_FILE}")
            return

    # ── FASE 2: Avatares ──────────────────────────────────────────────────────
    el_av = AVATAR_DIR / "eliezer_caricature.png"
    ia_av = AVATAR_DIR / "ia_avatar.png"
    if phase in ("all", "avatars", "slides", "video"):
        print("── FASE 2: AVATARES ─────────────────────────────────────────")
        el_av, ia_av = prepare_avatars()
        if phase == "avatars":
            print(f"\n  Eliezer: {el_av}")
            print(f"  IA:      {ia_av}")
            return

    # ── FASE 3: Áudio TTS ─────────────────────────────────────────────────────
    audio_map: dict[int, Path] = {}
    if phase in ("all", "audio", "video"):
        if not script:
            script = generate_script()
        print(f"── FASE 3: ÁUDIO TTS ({len(script)} linhas) ──────────────────────")
        audio_map = generate_all_audio(script)
        if phase == "audio":
            total_dur = sum(wav_duration(p) for p in audio_map.values())
            print(f"\n  ✓ {len(audio_map)} WAVs | duração total: {total_dur/60:.1f} min")
            return

    # ── FASE 4: Slides PNG ────────────────────────────────────────────────────
    slide_map: dict[int, Path] = {}
    if phase in ("all", "slides", "video"):
        if not script:
            script = generate_script()
        if not el_av.exists() or not ia_av.exists():
            print("  ⚠ Avatares ausentes, executando fase 2…")
            el_av, ia_av = prepare_avatars()
        print(f"── FASE 4: SLIDES ({len(script)} PNGs) ────────────────────────────")
        slide_map = create_all_slides(script, el_av, ia_av)
        if phase == "slides":
            print(f"\n  Slides em: {SLIDES_DIR}")
            return

    # ── FASE 5: Montagem Final ────────────────────────────────────────────────
    if phase in ("all", "video"):
        if not script:
            script = generate_script()
        if not audio_map:
            audio_map = {l["id"]: AUDIO_DIR / f"line_{l['id']:04d}.wav" for l in script}
        if not slide_map:
            slide_map = {l["id"]: SLIDES_DIR / f"slide_{l['id']:04d}.png" for l in script}
        print("── FASE 5: MONTAGEM FINAL ────────────────────────────────────")
        final = assemble_video(script, audio_map, slide_map)
        print(f"\n🎉 CONCLUÍDO!")
        print(f"   Vídeo: {final}")
        dur_est = sum(
            wav_duration(audio_map[l["id"]]) + 0.3
            for l in script if l["id"] in audio_map
        )
        print(f"   Duração estimada: {dur_est/60:.1f} min")

    print()


if __name__ == "__main__":
    main()
