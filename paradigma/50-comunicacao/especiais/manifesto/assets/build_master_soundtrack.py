"""Construtor da Trilha Sonora Mestre do Novo Vídeo IDD:
- Monta o diálogo de 10 falas alternadas (Antonio & Francisca).
- Gera ambiência harmônica procedural em estéreo (sintetizador de harmônicos graves e agudos).
- Masterização oficial em -14 LUFS com mixagem broadcast.
"""

import json
import wave
import subprocess
from pathlib import Path
import numpy as np

BASE = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_novo_video_assets")
AUDIO_DIR = BASE / "audio"
SR = 48000
TOTAL_DUR = 80.0
TOTAL_SAMPLES = int(TOTAL_DUR * SR)

# Cronograma do Diálogo
lines = [
    (1, 'antonio', 0.8),
    (2, 'francisca', 9.0),
    (3, 'antonio', 16.3),
    (4, 'francisca', 25.5),
    (5, 'antonio', 33.2),
    (6, 'francisca', 42.8),
    (7, 'antonio', 49.1),
    (8, 'francisca', 56.4),
    (9, 'antonio', 65.2),
    (10, 'francisca', 72.3),
]

# 1. Trilha de Voz
voice_track = np.zeros((TOTAL_SAMPLES, 2), dtype=np.float32)
fade_len = int(0.012 * SR)

for idx, spk, t_start in lines:
    wav_path = AUDIO_DIR / f"line_{idx:02d}_{spk}.wav"
    with wave.open(str(wav_path), "rb") as w:
        sr = w.getframerate()
        frames = w.getnframes()
        data = np.frombuffer(w.readframes(frames), dtype=np.int16).reshape(-1, 2).astype(np.float32)
    
    f = min(fade_len, len(data) // 4)
    if f > 0:
        fade_in = np.linspace(0, 1, f, dtype=np.float32)[:, None]
        fade_out = np.linspace(1, 0, f, dtype=np.float32)[:, None]
        data[:f] *= fade_in
        data[-f:] *= fade_out

    s = int(t_start * SR)
    e = min(TOTAL_SAMPLES, s + len(data))
    voice_track[s:e] += data[: e - s]

# Normaliza vozes para pico moderado
voice_norm = voice_track / 32768.0
del voice_track

# 2. Trilha Musical de Fundo Procedural (Ambiência Cinematográfica Futurista)
t = np.linspace(0, TOTAL_DUR, TOTAL_SAMPLES, endpoint=False)

# Frequências harmônicas ricas: C2 (65.4Hz), G2 (98.0Hz), C3 (130.8Hz), E3 (164.8Hz), B3 (246.9Hz)
# Moduladas por LFO suave para efeito analógico de estúdio
lfo1 = 0.5 + 0.5 * np.sin(2 * np.pi * 0.15 * t)
lfo2 = 0.5 + 0.5 * np.cos(2 * np.pi * 0.22 * t)

drone_left = (
    0.35 * np.sin(2 * np.pi * 65.4 * t) +
    0.20 * np.sin(2 * np.pi * 130.8 * t) +
    0.15 * np.sin(2 * np.pi * 164.8 * t) * lfo1 +
    0.10 * np.sin(2 * np.pi * 246.9 * t) * lfo2
)

drone_right = (
    0.35 * np.sin(2 * np.pi * 65.4 * t + 0.2) +
    0.20 * np.sin(2 * np.pi * 98.0 * t) +
    0.15 * np.sin(2 * np.pi * 196.0 * t) * lfo2 +
    0.10 * np.sin(2 * np.pi * 261.6 * t) * lfo1
)

music = np.stack([drone_left, drone_right], axis=1)
del drone_left, drone_right

# Fade in no início e fade out no fim da música
music_fade_in = int(2.0 * SR)
music_fade_out = int(3.5 * SR)
music[:music_fade_in] *= np.linspace(0, 1, music_fade_in)[:, None]
music[-music_fade_out:] *= np.linspace(1, 0, music_fade_out)[:, None]

# Volume de fundo sutil (-22 dB relative to voice)
music = music * 0.08

# 3. Mixagem Mestre
master = voice_norm + music
del voice_norm, music

# Compressão suave tipo limiter analógico (tanh)
master = np.tanh(master * 0.95)
master_int16 = (master * 32767.0).astype(np.int16)
del master

TEMP_WAV = AUDIO_DIR / "temp_master_soundtrack.wav"
FINAL_AAC = BASE / "master_soundtrack_idd_novo.aac"
FINAL_WAV = BASE / "master_soundtrack_idd_novo.wav"

with wave.open(str(TEMP_WAV), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(master_int16.tobytes())
del master_int16

# Normalização oficial -14 LUFS para YouTube/EBU R128
print("Normalizando trilha para padrão oficial -14 LUFS...")
cmd_norm = [
    "ffmpeg", "-y",
    "-i", str(TEMP_WAV),
    "-filter:a", "loudnorm=I=-14:LRA=7:TP=-1.5",
    "-c:a", "pcm_s16le",
    "-ar", "48000",
    str(FINAL_WAV)
]
subprocess.run(cmd_norm, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

cmd_aac = [
    "ffmpeg", "-y",
    "-i", str(FINAL_WAV),
    "-c:a", "aac",
    "-b:a", "192k",
    str(FINAL_AAC)
]
subprocess.run(cmd_aac, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if TEMP_WAV.exists():
    TEMP_WAV.unlink()

print(f"[OK] Trilha sonora mestre gerada com perfeição:")
print(f"  WAV: {FINAL_WAV.name} ({FINAL_WAV.stat().st_size / (1024*1024):.1f} MB)")
print(f"  AAC: {FINAL_AAC.name} ({FINAL_AAC.stat().st_size / 1024:.1f} KB)")
