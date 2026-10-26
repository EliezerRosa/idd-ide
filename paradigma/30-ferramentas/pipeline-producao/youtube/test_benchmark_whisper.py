import time
import numpy as np
import wave
from faster_whisper import WhisperModel

w = wave.open(r"C:\Antigravity - IDD Refrigeração\producao_yt\v2_neural\v2_16k.wav", "rb")
frames = w.readframes(16000 * 30) # 30 seconds
audio_np = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0

# 1. Test CPU beam_size=1
t0 = time.time()
m_cpu = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=8)
segs, _ = m_cpu.transcribe(audio_np, language="pt", beam_size=1, vad_filter=True)
res_cpu = list(segs)
t_cpu = time.time() - t0
print(f"CPU beam_size=1: {t_cpu:.2f}s for 30s audio ({30/t_cpu:.1f}x real-time). Segs: {len(res_cpu)}")

# 2. Test CUDA
try:
    t0 = time.time()
    m_cuda = WhisperModel("small", device="cuda", compute_type="int8")
    segs, _ = m_cuda.transcribe(audio_np, language="pt", beam_size=1, vad_filter=True)
    res_cuda = list(segs)
    t_cuda = time.time() - t0
    print(f"CUDA INT8 beam_size=1: {t_cuda:.2f}s for 30s audio ({30/t_cuda:.1f}x real-time). Segs: {len(res_cuda)}")
except Exception as e:
    print(f"CUDA not available or failed: {e}")
