"""
render_video.py
================
Auto-render da apresentação IDD (YouTube edition) para MP4, sem OBS.

PIPELINE (totalmente offline, determinístico, reproducível):
  1. Carrega o HTML no Chromium headless (Playwright) e extrai a lista
     `SLIDES` via page.evaluate() — assim não precisamos parsear o HTML.
  2. Para cada slide, gera 1 MP3 de narração com `edge-tts` (mesmas vozes
     Microsoft Natural pt-BR que a apresentação usa em runtime, mas como
     arquivo capturável).
  3. Renderiza cada slide a 1920x1080 com a frase de comentário JÁ VISÍVEL
     e o overlay de capa dispensado (exceto na capa, que mantém o overlay)
     e captura PNG.
  4. ffmpeg: cria um clip MP4 por slide (PNG estática + áudio, com leve
     fade-in/out de áudio), concatena todos, e mixa um pad ambiente
     opcional gerado também por ffmpeg (sine waves C maj7, -28 dB).
  5. Output: `idd_youtube.mp4` (H.264, yuv420p, 30 fps, AAC 192k).

PRÉ-REQUISITOS (instalar uma vez):
    pip install playwright edge-tts
    python -m playwright install chromium
    winget install Gyan.FFmpeg          # ou choco install ffmpeg, depois reabrir terminal

USO:
    python render_video.py                     # renderiza tudo
    python render_video.py --no-music          # sem pad ambiente
    python render_video.py --slides 0,1,2      # apenas slides 0,1,2 (teste rápido)
    python render_video.py --voice pt-BR-AntonioNeural
    python render_video.py --rate "-5%"        # leve mais lento

VOZES pt-BR DISPONÍVEIS (edge-tts --list-voices | findstr pt-BR):
    pt-BR-FranciscaNeural   (feminina, calorosa) — DEFAULT
    pt-BR-AntonioNeural     (masculina, pausada)
    pt-BR-ThalitaNeural     (feminina, jovem)

TEMPO ESTIMADO: ~2-4 minutos para os 19 slides em máquina recente.
SAÍDA FINAL: ~80-150 MB MP4, ~12-15 minutos de duração.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Garante UTF-8 no stdout (evita UnicodeEncodeError em PowerShell cp1252)
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# Mapa canônico das propriedades P1-P7 para expansão na narração TTS
P_PROPS = {
    "1": "Intent-first",
    "2": "Catálogo declarado",
    "3": "Permissão semântica",
    "4": "Preview-before-commit",
    "5": "Mixed-initiative",
    "6": "Manipulação direta residual",
    "7": "Auditabilidade total",
}
_P_RE = re.compile(r"\bP([1-7])\b")


def expand_p_refs(text: str) -> str:
    """Expande P1..P7 em 'Propriedade N (Nome)' para narração mais clara."""
    return _P_RE.sub(lambda m: f"Propriedade {m.group(1)} ({P_PROPS[m.group(1)]})", text)

# ---------- Configuração ----------
HERE = Path(__file__).parent
HTML_FILE = HERE / "apresentacao_idd_paradigma_revolucionario_youtube.html"
WORK_DIR = HERE / "_render_work"
OUT_FILE = HERE / "idd_youtube.mp4"
WIDTH, HEIGHT = 1920, 1080
FPS = 30


def log(msg: str) -> None:
    print(f"[render] {msg}", flush=True)


def check_prereqs() -> None:
    if not HTML_FILE.exists():
        sys.exit(f"HTML não encontrado: {HTML_FILE}")
    if shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg não está no PATH. Instale: winget install Gyan.FFmpeg")
    try:
        import playwright  # noqa: F401
        import edge_tts  # noqa: F401
    except ImportError as e:
        sys.exit(f"Dependência faltando ({e}). Rode: pip install playwright edge-tts && python -m playwright install chromium")


# ---------- 1. Extrair SLIDES e capturar PNGs ----------
async def extract_and_capture(slides_filter: list[int] | None) -> list[dict]:
    from playwright.async_api import async_playwright

    WORK_DIR.mkdir(exist_ok=True)
    results: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # device_scale_factor=2 -> screenshots em 3840x2160 (depois downscale lanczos para 1920x1080)
        # produz texto e canvas muito mais nítidos no MP4 final
        ctx = await browser.new_context(viewport={"width": WIDTH, "height": HEIGHT}, device_scale_factor=2)
        page = await ctx.new_page()

        url = HTML_FILE.as_uri() + "?record=1"
        log(f"abrindo {url}")
        await page.goto(url)
        await page.wait_for_function("typeof SLIDES !== 'undefined' && SLIDES.length > 0", timeout=15000)

        # extrai metadata serializável (sem funções)
        slides_meta = await page.evaluate(
            """() => SLIDES.map((s, i) => ({
                index: i,
                subtitle: s.subtitle || '',
                title: s.title || '',
                htmlText: (() => { const d=document.createElement('div'); d.innerHTML=s.html||''; return d.textContent.replace(/\\s+/g,' ').trim(); })(),
                commentary: s.commentary || '',
                hasDelay: !!s.delayBeforeSpeak
            }))"""
        )
        log(f"extraídos {len(slides_meta)} slides")

        targets = slides_meta if not slides_filter else [s for s in slides_meta if s["index"] in slides_filter]

        for s in targets:
            i = s["index"]
            png_path = WORK_DIR / f"slide_{i:02d}.png"
            results.append({**s, "png": str(png_path)})
            if png_path.exists() and png_path.stat().st_size > 1024:
                log(f"  [cache] slide {i}: {png_path.name} já existe")
                continue
            log(f"capturando slide {i}: {s['title'][:60]}")
            await page.evaluate(
                """(idx) => {
                    current = idx;
                    coverDismissed = (idx !== 0);
                    if (idx !== 0) {
                        const ov = document.getElementById('coverOverlay');
                        if (ov) ov.remove();
                    }
                    render(idx);
                    document.getElementById('commentary').classList.add('visible');
                }""",
                i,
            )
            # dá tempo para rough.js desenhar
            await page.wait_for_timeout(900)
            await page.screenshot(path=str(png_path), full_page=False)

        await browser.close()
    return results


# ---------- 2. Gerar áudio por slide com edge-tts ----------
async def synthesize_audio(slides: list[dict], voice: str, rate: str, force: bool = False) -> None:
    import edge_tts

    for s in slides:
        i = s["index"]
        mp3_path = WORK_DIR / f"slide_{i:02d}.mp3"
        s["mp3"] = str(mp3_path)
        # cache: pula se já existe (>1KB)
        if not force and mp3_path.exists() and mp3_path.stat().st_size > 1024:
            log(f"  [cache] slide {i}: {mp3_path.name} já existe ({mp3_path.stat().st_size//1024}KB)")
            continue
        text_parts = [s["title"] + ".", s["htmlText"]]
        if s["commentary"]:
            text_parts.append("Comentário do narrador. " + s["commentary"])
        full_text = " ".join(p for p in text_parts if p).strip()
        if not full_text:
            full_text = s["subtitle"] or "."
        # expande P1..P7 para nomes legíveis na narração
        full_text = expand_p_refs(full_text)
        # retry em falhas de websocket (edge-tts costuma cair com strings longas)
        last_err = None
        for attempt in range(1, 5):
            try:
                log(f"sintetizando áudio slide {i} (~{len(full_text)} chars, tentativa {attempt}) -> {mp3_path.name}")
                comm = edge_tts.Communicate(full_text, voice=voice, rate=rate)
                await comm.save(str(mp3_path))
                last_err = None
                break
            except Exception as e:
                last_err = e
                log(f"  falha ({type(e).__name__}: {e}); aguardando antes de retentar")
                await asyncio.sleep(2 * attempt)
        if last_err:
            raise RuntimeError(f"slide {i} falhou após 4 tentativas: {last_err}")


# ---------- 3. ffmpeg helpers ----------
def ffprobe_duration(path: str) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
        text=True,
    )
    return float(out.strip())


def make_clip(png: str, mp3: str, out_mp4: str, lead_in: float = 0.4, lead_out: float = 0.7) -> float:
    """Gera um MP4 com PNG estática + áudio. Retorna duração total.

    Otimização: como o vídeo é uma imagem estática, geramos a 2 fps na fonte
    (-framerate 2) e re-temporizamos pra FPS final na saída (-r FPS). Isso
    reduz drasticamente o tempo de encode (~10x). Visualmente idêntico.
    """
    audio_dur = ffprobe_duration(mp3)
    total = lead_in + audio_dur + lead_out
    # Cadeia de áudio profissional: high-pass anti-rumble, EQ presence boost,
    # compressor leve, loudnorm broadcast (-16 LUFS) + leadin/leadout fade
    audio_chain = (
        f"[1:a]highpass=f=80,"
        f"equalizer=f=3000:t=q:w=1.5:g=2.5,"
        f"equalizer=f=200:t=q:w=1.0:g=1.5,"
        f"acompressor=threshold=0.18:ratio=2.5:attack=20:release=250,"
        f"loudnorm=I=-16:TP=-1.5:LRA=11,"
        f"adelay={int(lead_in*1000)}|{int(lead_in*1000)},"
        f"apad=pad_dur={lead_out},"
        f"afade=t=in:st=0:d=0.25,"
        f"afade=t=out:st={lead_in+audio_dur+lead_out-0.4}:d=0.4[a]"
    )
    # Vídeo: scale lanczos para 1920x1080 (PNG entrada vem em 3840x2160 via DPR=2)
    video_chain = f"[0:v]scale={WIDTH}:{HEIGHT}:flags=lanczos,setsar=1[v]"
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-framerate", "2", "-i", png,
        "-i", mp3,
        "-filter_complex", f"{video_chain};{audio_chain}",
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-preset", "medium", "-tune", "stillimage", "-crf", "18",
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
        "-t", f"{total:.3f}",
        "-r", str(FPS),
        out_mp4,
    ]
    subprocess.run(cmd, check=True)
    return total


def concat_clips(clip_paths: list[str], out_mp4: str, with_music: bool) -> None:
    list_file = WORK_DIR / "concat.txt"
    list_file.write_text("\n".join(f"file '{Path(p).as_posix()}'" for p in clip_paths), encoding="utf-8")

    if not with_music:
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", str(list_file),
            "-c", "copy", out_mp4,
        ]
        subprocess.run(cmd, check=True)
        return

    # 1) concat sem música -> arquivo intermediário
    intermediate = WORK_DIR / "concat_no_music.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", str(list_file), "-c", "copy", str(intermediate)],
        check=True,
    )
    total_dur = ffprobe_duration(str(intermediate))
    log(f"  duração total para mixagem: {total_dur:.1f}s")

    # 2) gera pad ambiente — acorde C maj7 (C2 E2 G2 B2) com chorus suave
    #    Volume final 0.20 (audível) + low-pass para suavidade + leve reverb-ish via aecho
    pad_path = WORK_DIR / "pad.wav"
    fade_out_st = max(0.0, total_dur - 4.0)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-f", "lavfi", "-i", f"sine=frequency=130.81:duration={total_dur}",
         "-f", "lavfi", "-i", f"sine=frequency=164.81:duration={total_dur}",
         "-f", "lavfi", "-i", f"sine=frequency=196.00:duration={total_dur}",
         "-f", "lavfi", "-i", f"sine=frequency=246.94:duration={total_dur}",
         "-filter_complex",
         "[0][1][2][3]amix=inputs=4:normalize=0,"
         "lowpass=f=1200,"
         "aecho=0.5:0.5:80|160:0.3|0.2,"
         "volume=0.18,"
         f"afade=t=in:st=0:d=2.5,afade=t=out:st={fade_out_st:.2f}:d=3.5",
         "-c:a", "pcm_s16le", "-ar", "48000", str(pad_path)],
        check=True,
    )

    # 3) mixa fala + pad com pesos (fala domina; pad audível durante pausas)
    #    weights="4 1" => fala 4x mais alta que pad na soma
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-i", str(intermediate), "-i", str(pad_path),
         "-filter_complex",
         "[0:a][1:a]amix=inputs=2:duration=first:weights=4 1:normalize=0,"
         "alimiter=limit=0.95[a]",
         "-map", "0:v", "-map", "[a]", "-c:v", "copy",
         "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
         out_mp4],
        check=True,
    )


# ---------- main ----------
async def amain(args: argparse.Namespace) -> None:
    check_prereqs()
    slides_filter = None
    if args.slides:
        slides_filter = [int(x) for x in args.slides.split(",")]

    log("ETAPA 1/3 — capturando slides via Playwright")
    slides = await extract_and_capture(slides_filter)

    log("ETAPA 2/3 — sintetizando narração com edge-tts")
    await synthesize_audio(slides, voice=args.voice, rate=args.rate)

    log("ETAPA 3/3 — montando clipes e concatenando com ffmpeg")
    clip_paths: list[str] = []
    for s in slides:
        i = s["index"]
        clip = WORK_DIR / f"clip_{i:02d}.mp4"
        if clip.exists() and clip.stat().st_size > 10000:
            log(f"  [cache] clip {i}: {clip.name} já existe")
        else:
            dur = make_clip(s["png"], s["mp3"], str(clip))
            log(f"  clip {i}: {dur:.1f}s")
        clip_paths.append(str(clip))

    out = str(args.output or OUT_FILE)
    concat_clips(clip_paths, out, with_music=not args.no_music)
    final_dur = ffprobe_duration(out)
    size_mb = Path(out).stat().st_size / 1024 / 1024
    log(f"PRONTO [OK]  {out}  ({final_dur/60:.1f} min, {size_mb:.1f} MB)")


def main() -> None:
    ap = argparse.ArgumentParser(description="Render IDD YouTube edition para MP4")
    ap.add_argument("--voice", default="pt-BR-FranciscaNeural", help="voz edge-tts")
    ap.add_argument("--rate", default="+0%", help="velocidade edge-tts (ex: -10%%, +5%%)")
    ap.add_argument("--no-music", action="store_true", help="não mixar pad ambiente")
    ap.add_argument("--slides", default="", help="lista de índices p/ teste (ex: 0,1,2)")
    ap.add_argument("--output", default="", help="caminho do MP4 de saída")
    args = ap.parse_args()
    asyncio.run(amain(args))


if __name__ == "__main__":
    main()
