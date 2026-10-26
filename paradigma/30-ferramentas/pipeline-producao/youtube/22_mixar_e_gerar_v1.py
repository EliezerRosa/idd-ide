"""V1 verbatim - etapa 3 (Otimizada): combina a trilha de IA preservada com a narração de Antonio
diretamente em memória (sem intermediários gigantes), masteriza em -14 LUFS e gera o vídeo final (stream copy de vídeo).
"""
import json, subprocess, wave, math
from pathlib import Path
import numpy as np

BASE = Path(r"C:\Antigravity - IDD Refrigeração")
OUT = BASE / "producao_yt" / "v1_verbatim"
VIDEO = BASE / "apresentacao" / "Refrigeração - IDD Vídeo 1.mp4"
ORIG48 = OUT / "v1_48k.wav"
SCHEDULE = OUT / "schedule.json"
MASTER_RAW = OUT / "temp_master_raw.wav"
FINAL = BASE / "producao_yt" / "Refrigeracao_IDD_Video_1_Narrador.mp4"

SR = 48000
PRESERVED = [(45.6, 212.0), (3508.7, 3577.4), (3932.2, 4145.4)]
FADE_AI = int(0.30 * SR)     # crossfade nas bordas dos trechos de IA
FADE_NARR = int(0.012 * SR)  # micro-fade nas bordas de cada bloco

def read_wav(path):
    with wave.open(str(path), "rb") as w:
        assert w.getframerate() == SR and w.getnchannels() == 2 and w.getsampwidth() == 2
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2)

def rms_db(arr):
    # Calcula RMS em dBFS para fatias não-silenciosas
    energy = np.mean(arr.astype(np.float64) ** 2)
    if energy <= 1e-9:
        return -90.0
    return 10.0 * math.log10(energy / (32767.0 ** 2))

print("Carregando schedule e áudio original...", flush=True)
blocks = json.loads(SCHEDULE.read_text(encoding="utf-8"))
orig = read_wav(ORIG48)
total = len(orig)
print(f"Áudio original: {total/SR:.1f}s | blocos de narração: {len(blocks)}", flush=True)

# 1. Trilha de IA (preservada com crossfades)
print("Processando trechos preservados de IA...", flush=True)
ai_samples = []
ai_track = np.zeros((total, 2), dtype=np.float32)

for p0, p1 in PRESERVED:
    s = int(p0 * SR)
    e = min(total, int(p1 * SR))
    seg = orig[s:e].astype(np.float32)
    f = min(FADE_AI, len(seg) // 2)
    env = np.ones(len(seg), dtype=np.float32)
    env[:f] = np.linspace(0, 1, f, dtype=np.float32)
    env[-f:] = np.linspace(1, 0, f, dtype=np.float32)
    ai_track[s:e] = seg * env[:, None]
    ai_samples.append(seg)

del orig # Libera memória do áudio original bruto

# 2. Trilha do Narrador
print("Renderizando trilha do narrador Antonio...", flush=True)
narr_track = np.zeros((total, 2), dtype=np.float32)

for b in blocks:
    seg = read_wav(b["wav"]).astype(np.float32)
    f = min(FADE_NARR, len(seg) // 2)
    seg[:f] *= np.linspace(0, 1, f, dtype=np.float32)[:, None]
    seg[-f:] *= np.linspace(1, 0, f, dtype=np.float32)[:, None]
    s = int(b["sched_start"] * SR)
    e = min(total, s + len(seg))
    narr_track[s:e] += seg[: e - s]

# 3. Alinhamento de volume relativo entre IA e Narrador
# Compara RMS dos trechos ativos de cada trilha
ai_concat = np.concatenate(ai_samples) if ai_samples else np.zeros((1, 2))
ai_db = rms_db(ai_concat)
narr_active = narr_track[np.abs(narr_track).max(axis=1) > 200]
narr_db = rms_db(narr_active) if len(narr_active) > 0 else -20.0

gain_db = max(-6.0, min(6.0, (ai_db - narr_db) * 0.7))
gain_lin = 10.0 ** (gain_db / 20.0)
print(f"RMS IA={ai_db:.1f} dB | RMS Narrador={narr_db:.1f} dB -> Ganho narrador: {gain_db:+.1f} dB", flush=True)

narr_track *= gain_lin

# 4. Mixagem direta em ponto flutuante com soft-clip
print("Mixando trilhas com soft-clip...", flush=True)
master = (ai_track + narr_track) / 32768.0
del ai_track, narr_track

# Limiter suave (tanh) para evitar distorção digital
master = np.tanh(master * 0.95)
master_int16 = (master * 32767.0).astype(np.int16)
del master

print(f"Gravando WAV master temporário: {MASTER_RAW.name}...", flush=True)
with wave.open(str(MASTER_RAW), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(master_int16.tobytes())
del master_int16

# 5. Normalização oficial YouTube (-14 LUFS) e remux final em 1 só passo!
print("Masterizando em -14 LUFS e remuxando vídeo final...", flush=True)
cmd_final = [
    "ffmpeg", "-y",
    "-i", str(VIDEO),
    "-i", str(MASTER_RAW),
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c:v", "copy",
    "-filter:a:0", "loudnorm=I=-14:LRA=7:TP=-1.5",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-movflags", "+faststart",
    str(FINAL)
]
subprocess.run(cmd_final, check=True)

# Limpa o WAV temporário
if MASTER_RAW.exists():
    MASTER_RAW.unlink()

print(f"\n==========================================")
print(f"VÍDEO FINAL CONCLUÍDO COM SUCESSO!")
print(f"Arquivo: {FINAL}")
print(f"Tamanho: {FINAL.stat().st_size / (1024*1024):.1f} MB")
print(f"==========================================")
