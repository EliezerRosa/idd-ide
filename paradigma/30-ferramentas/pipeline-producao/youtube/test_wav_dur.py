import os
import wave
import subprocess
from pathlib import Path

mp3 = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\v2_neural\audio_segs\b001_fe8ab095a8.mp3")
wav = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\v2_neural\audio_segs\test_b001.wav")

subprocess.run(["ffmpeg", "-y", "-i", str(mp3), "-ar", "48000", "-ac", "2", str(wav)], check=True)
with wave.open(str(wav), "rb") as w:
    dur = w.getnframes() / w.getframerate()
    print(f"Success! Duration: {dur:.3f}s, frames: {w.getnframes()}")
if wav.exists():
    wav.unlink()
