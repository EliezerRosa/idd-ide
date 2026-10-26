import subprocess
import re
from pathlib import Path
import tempfile
import os

BASE = Path(r"C:\Antigravity - IDD Refrigeração")
OUT = BASE / "producao_yt"
VIDEO_ORIG = BASE / "apresentacao" / "Refrigeração - IDD Vídeo 1 (Versão Otimizada).mp4"
AUDIO_16K = OUT / "original_16k.wav"
# NOISE_PROFILE_PATH is no longer needed with afftdn filter
VIDEO_NOISE_REDUCED_FINAL = OUT / "Refrigeracao_IDD_Video_1_YouTube_Antonio_noise_reduced.mp4"

def main():
    if not AUDIO_16K.exists():
        print(f"Erro: Arquivo de áudio original não encontrado: {AUDIO_16K}")
        print("Por favor, execute '01_transcrever.py' primeiro para extrair o áudio.")
        return

    print("\nAplicando redução de ruído (afftdn) e remuxando o vídeo...")
    # Using afftdn filter for noise reduction, which does not require a noise profile file.
    # Parameters: nr (noise reduction strength, default 12), nf (noise floor, default -50)
    # These can be tuned if the user desires.
    noise_red_command = [
        "ffmpeg", "-y",
        "-i", str(VIDEO_ORIG),
        "-i", str(AUDIO_16K), # Use the extracted 16k audio for processing
        "-filter_complex", "[1:a]afftdn=nr=20:nf=-40[out_a]", # Increased nr for stronger noise reduction
        "-map", "0:v", # Copy video stream from original input
        "-map", "[out_a]", # Map processed audio stream
        "-c:v", "copy", # Copy video codec
        "-c:a", "aac", # Encode audio as AAC
        "-b:a", "192k", # Audio bitrate
        str(VIDEO_NOISE_REDUCED_FINAL)
    ]
    try:
        process = subprocess.run(noise_red_command, check=True, capture_output=True, text=True, encoding='utf-8')
        print(f"\nVídeo com ruído reduzido gerado com sucesso: {VIDEO_NOISE_REDUCED_FINAL}")
        if process.stdout:
            print(f"stdout (afftdn): {process.stdout}")
        if process.stderr:
            print(f"stderr (afftdn): {process.stderr}")
    except subprocess.CalledProcessError as e:
        print(f"Erro ao aplicar redução de ruído e remuxar: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")

if __name__ == "__main__":
    main()