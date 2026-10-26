"""Renderizador Mestre Definitivo do Vídeo 1 (Dueto Neural sem Silêncios Mortos):
- Carrega as 228 unidades de fala perfeitamente distribuídas (schedule_v1_dueto_final.json).
- Cadência natural do dueto e do fluxo de código.
- Zero ruído residual analógico (substituição total da trilha).
- Normalização oficial -14 LUFS (EBU R128 / YouTube standard).
- Muxing com cópia do vídeo original (-c:v copy).
"""

import json
import wave
import sys
import shutil
import subprocess
from pathlib import Path
import numpy as np

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração")
PROD = BASE / "producao_yt"
OUT = PROD / "v1_dueto_neural"

SRC_VIDEO = BASE / "apresentacao" / "Refrigeração - IDD Vídeo 1 (Versão Otimizada).mp4"
FINAL_VIDEO = PROD / "Refrigeracao_IDD_Video_1_100_Neural.mp4"
REMASTER_TARGET = PROD / "Refrigeracao_IDD_Video_1_Remasterizado.mp4"

SCHEDULE_FILE = OUT / "schedule_v1_dueto_final.json"
MASTER_WAV = OUT / "temp_master_v1_refined.wav"

SR = 48000
video_dur = 4331.2

print("==================================================")
print("INICIANDO RENDERIZAÇÃO FINAL DO VÍDEO 1 REFINADO")
print(f"Duração do Vídeo: {video_dur:.1f}s ({video_dur/60:.1f} min)")
print("==================================================")

if not SCHEDULE_FILE.exists():
    raise FileNotFoundError(f"Arquivo de agendamento não encontrado: {SCHEDULE_FILE}")

blocks = json.loads(SCHEDULE_FILE.read_text(encoding="utf-8"))
print(f"[OK] {len(blocks)} unidades de fala carregadas.")

total_samples = int(video_dur * SR)
print(f"Alocando buffer de áudio estéreo: {total_samples} amostras ({total_samples / SR:.1f}s)...")
narr_track = np.zeros((total_samples, 2), dtype=np.float32)

fade_len = int(0.010 * SR) # 10ms micro-fade
placed = 0

for i, b in enumerate(blocks, 1):
    wav_path = Path(b["wav"])
    if not wav_path.exists():
        print(f"AVISO: Arquivo não encontrado: {wav_path}")
        continue

    with wave.open(str(wav_path), "rb") as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        nframes = w.getnframes()
        data = np.frombuffer(w.readframes(nframes), dtype=np.int16).reshape(-1, ch).astype(np.float32)

    # Se for mono, duplica para estéreo
    if ch == 1:
        data = np.repeat(data, 2, axis=1)

    # Aplica fade suave nas bordas
    f = min(fade_len, len(data) // 4)
    if f > 0:
        fade_in = np.linspace(0, 1, f, dtype=np.float32)[:, None]
        fade_out = np.linspace(1, 0, f, dtype=np.float32)[:, None]
        data[:f] *= fade_in
        data[-f:] *= fade_out

    s = int(b["sched_start"] * SR)
    e = min(total_samples, s + len(data))
    if s < total_samples:
        narr_track[s:e] += data[: e - s]
        placed += 1

print(f"[OK] {placed}/{len(blocks)} unidades posicionadas na trilha mestre.")

# Normalização preliminar e saturação suave
print("Processando masterização e dinâmica do áudio...")
master = narr_track / 32768.0
del narr_track
master = np.tanh(master * 0.95)
master_int16 = (master * 32767.0).astype(np.int16)
del master

print(f"Gravando WAV intermediário: {MASTER_WAV.name}...")
with wave.open(str(MASTER_WAV), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(master_int16.tobytes())
del master_int16

print("Iniciando muxing com vídeo original e normalização oficial -14 LUFS (EBU R128)...")
cmd = [
    "ffmpeg", "-y",
    "-i", str(SRC_VIDEO),
    "-i", str(MASTER_WAV),
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c:v", "copy",
    "-filter:a:0", "loudnorm=I=-14:LRA=7:TP=-1.5",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-movflags", "+faststart",
    str(FINAL_VIDEO)
]

proc = subprocess.run(cmd, capture_output=True, text=True)
if proc.returncode != 0:
    print("ERRO no ffmpeg muxing:")
    print(proc.stderr[-1000:])
    raise RuntimeError("Falha no ffmpeg muxing.")

if FINAL_VIDEO.exists():
    shutil.copy2(str(FINAL_VIDEO), str(REMASTER_TARGET))
    print(f"[OK] Atualizado arquivo mestre entregável: {REMASTER_TARGET.name}")

if MASTER_WAV.exists():
    MASTER_WAV.unlink()

print("\n==================================================")
print("VÍDEO 1 REMASTERIZADO COM SUCESSO ABSOLUTO!")
print(f"Destino: {FINAL_VIDEO} ({FINAL_VIDEO.stat().st_size / (1024*1024):.1f} MB)")
print("==================================================")
