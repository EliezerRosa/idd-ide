import numpy as np
import wave
from faster_whisper import WhisperModel

w = wave.open(r"C:\Antigravity - IDD Refrigeração\producao_yt\v2_neural\v2_16k.wav", "rb")
frames = w.readframes(16000 * 15)
audio_np = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0

print(f"Loaded audio sample: {audio_np.shape}, min={audio_np.min():.3f}, max={audio_np.max():.3f}")
model = WhisperModel("small", device="cpu", compute_type="int8")
segs, info = model.transcribe(audio_np, language="pt", beam_size=5)
print("Transcription output:")
for s in segs:
    print(f"[{s.start:.2f} -> {s.end:.2f}]: {s.text}")
print("SUCCESS!")
