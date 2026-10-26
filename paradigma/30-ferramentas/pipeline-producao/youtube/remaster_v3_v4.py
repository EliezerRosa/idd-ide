import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração")
APRESENTACAO = BASE / "apresentacao"
PROD = BASE / "producao_yt"

VIDEOS = [
    (3, APRESENTACAO / "Refrigeração - IDD Vídeo 3 (Versão Otimizada).mp4", PROD / "Refrigeracao_IDD_Video_3_Remasterizado.mp4"),
    (4, APRESENTACAO / "Refrigeração - IDD Vídeo 4 (Versão Otimizada).mp4", PROD / "Refrigeracao_IDD_Video_4_Remasterizado.mp4"),
]

def main():
    for num, src, dst in VIDEOS:
        if not src.exists():
            print(f"[!] Arquivo de origem não encontrado: {src}")
            continue
        print(f"\n==================================================")
        print(f"REMASTERIZANDO VÍDEO {num}: {src.name}")
        print(f"Destino: {dst.name}")
        print(f"Critérios de Masterização: EBU R128 (-14 LUFS, TP -1.5 dB, 48kHz 192k)")
        print(f"==================================================")
        cmd = [
            "ffmpeg", "-y",
            "-i", str(src),
            "-c:v", "copy",
            "-filter:a", "loudnorm=I=-14:LRA=7:TP=-1.5",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "48000",
            "-movflags", "+faststart",
            str(dst)
        ]
        subprocess.run(cmd, check=True)
        print(f"[OK] Vídeo {num} remasterizado com sucesso: {dst.stat().st_size / (1024*1024):.1f} MB")

if __name__ == "__main__":
    main()
