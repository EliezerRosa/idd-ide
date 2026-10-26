import os
import sys
import subprocess
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
PROD_DIR = BASE_DIR / "producao_yt"
SHORTS_DIR = PROD_DIR / "shorts_idd"
SHORTS_DIR.mkdir(parents=True, exist_ok=True)

INPUT_VIDEO = PROD_DIR / "IDD_Novo_Video_Manifesto_Oficial.mp4"
OUTPUT_VERTICAL = PROD_DIR / "IDD_Novo_Video_Manifesto_Vertical_9x16.mp4"
OUTPUT_SHORT = SHORTS_DIR / "short_00_manifesto_idd_oficial_vertical.mp4"

font_bold = "C\\:/Windows/Fonts/arialbd.ttf"
font_regular = "C\\:/Windows/Fonts/arial.ttf"

def render_vertical():
    print("=" * 70)
    print("🎬 RENDERIZANDO MANIFESTO IDD VERTICAL (1080x1920 — 9:16)")
    print("=" * 70)

    if not INPUT_VIDEO.exists():
        raise FileNotFoundError(f"Vídeo de entrada não encontrado: {INPUT_VIDEO}")

    print(f"Entrada: {INPUT_VIDEO.name} ({INPUT_VIDEO.stat().st_size / (1024*1024):.1f} MB)")
    print(f"Destino 1: {OUTPUT_VERTICAL.name}")
    print(f"Destino 2: {OUTPUT_SHORT.name}")

    # Layout Cinematográfico Vertical 1080x1920:
    # 1. Background blur dinâmico do próprio vídeo com leve escurecimento
    # 2. Foreground 1080p nítido centralizado com moldura glow
    # 3. Top HUD: Identidade visual do Manifesto e canal
    # 4. Bottom HUD: Destaques técnicos e Call to Action
    vf = (
        "[0:v]split=2[bg_raw][fg_raw];"
        "[bg_raw]scale=108:192:force_original_aspect_ratio=increase,crop=108:192,boxblur=2:1,scale=1080:1920:flags=bicubic,drawbox=color=black@0.40:width=iw:height=ih:t=fill[bg];"
        "[fg_raw]scale=1080:-1[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,"
        "drawbox=y=650:color=0x38bdf8@0.9:width=iw:height=4:t=fill,"
        "drawbox=y=1266:color=0x38bdf8@0.9:width=iw:height=4:t=fill,"
        "drawbox=y=90:color=black@0.82:width=iw:height=440:t=fill,"
        "drawbox=y=90:color=0x38bdf8:width=iw:height=6:t=fill,"
        f"drawtext=fontfile='{font_bold}':text='MANIFESTO OFICIAL IDD':fontcolor=0x38bdf8:fontsize=32:x=(w-text_w)/2:y=125,"
        f"drawtext=fontfile='{font_bold}':text='DO ZERO AO SISTEMA REAL':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=190,"
        f"drawtext=fontfile='{font_bold}':text='SEM ESCREVER CODIGO':fontcolor=0x38bdf8:fontsize=52:x=(w-text_w)/2:y=260,"
        f"drawtext=fontfile='{font_bold}':text='A INTENCAO HUMANA E O ARTEFATO SUPREMO':fontcolor=0xe2e8f0:fontsize=28:x=(w-text_w)/2:y=345,"
        f"drawtext=fontfile='{font_regular}':text='Termodinamica - PMOC Lei 13.589 - Invariantes':fontcolor=0x94a3b8:fontsize=26:x=(w-text_w)/2:y=400,"
        f"drawtext=fontfile='{font_bold}':text='Dueto de Vozes Neurais - Antonio e Francisca':fontcolor=0x34d399:fontsize=24:x=(w-text_w)/2:y=450,"
        "drawbox=y=1380:color=black@0.82:width=iw:height=460:t=fill,"
        "drawbox=y=1834:color=0x38bdf8:width=iw:height=6:t=fill,"
        f"drawtext=fontfile='{font_bold}':text='CALCULO TERMICO E GOVERNANCA':fontcolor=0x38bdf8:fontsize=28:x=(w-text_w)/2:y=1415,"
        f"drawtext=fontfile='{font_bold}':text='DO CHILLER AO BANCO DE DADOS':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=1465,"
        f"drawtext=fontfile='{font_regular}':text='Ordem de Servico Digital via QR Code no Smartphone':fontcolor=0xcbd5e1:fontsize=26:x=(w-text_w)/2:y=1530,"
        f"drawtext=fontfile='{font_bold}':text='85% DE REDUCAO NO CICLO DE ENTREGA':fontcolor=0xfbbf24:fontsize=28:x=(w-text_w)/2:y=1580,"
        "drawbox=x=120:y=1640:width=840:height=90:color=0x0284c7@0.95:t=fill,"
        f"drawtext=fontfile='{font_bold}':text='ASSISTA A SERIE COMPLETA NO CANAL':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=1667,"
        f"drawtext=fontfile='{font_bold}':text='CANAL OFICIAL - @ELIEZERJPROSA':fontcolor=0x38bdf8:fontsize=28:x=(w-text_w)/2:y=1760[v]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", str(INPUT_VIDEO),
        "-filter_complex", vf,
        "-map", "[v]",
        "-map", "0:a:0",
        "-c:v", "libx264",
        "-preset", "faster",
        "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-movflags", "+faststart",
        str(OUTPUT_VERTICAL)
    ]

    print("Executando codificação FFmpeg Broadcast 1080x1920...")
    subprocess.run(cmd, check=True)

    # Copia para pasta shorts
    import shutil
    shutil.copyfile(OUTPUT_VERTICAL, OUTPUT_SHORT)

    size_mb = OUTPUT_VERTICAL.stat().st_size / (1024 * 1024)
    print(f"\n[OK] Vídeo Vertical Renderizado com Sucesso!")
    print(f"     Arquivo: {OUTPUT_VERTICAL} ({size_mb:.1f} MB)")
    print(f"     Shorts: {OUTPUT_SHORT} ({size_mb:.1f} MB)")

if __name__ == "__main__":
    render_vertical()
