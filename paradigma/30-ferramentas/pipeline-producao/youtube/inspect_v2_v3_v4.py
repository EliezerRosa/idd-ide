from faster_whisper import WhisperModel
import subprocess
import numpy as np

model = WhisperModel("tiny", device="cpu", compute_type="int8")

videos = [
    (2, r"C:\Antigravity - IDD Refrigeração\producao_yt\Refrigeracao_IDD_Video_2_Remasterizado.mp4", 10.0, 90.0),
    (3, r"C:\Antigravity - IDD Refrigeração\producao_yt\Refrigeracao_IDD_Video_3_Remasterizado.mp4", 10.0, 90.0),
    (4, r"C:\Antigravity - IDD Refrigeração\producao_yt\Refrigeracao_IDD_Video_4_Remasterizado.mp4", 10.0, 90.0),
]

for num, path, ss, dur in videos:
    print(f"\n==========================================")
    print(f"TRANSCRICAO VÍDEO {num} ({ss}s a {ss+dur}s)")
    print(f"==========================================")
    cmd = [
        "ffmpeg", "-v", "error",
        "-ss", str(ss),
        "-t", str(dur),
        "-i", path,
        "-f", "f32le",
        "-acodec", "pcm_f32le",
        "-ar", "16000",
        "-ac", "1",
        "-"
    ]
    proc = subprocess.run(cmd, capture_output=True, check=True)
    audio_data = np.frombuffer(proc.stdout, np.float32)
    segments, _ = model.transcribe(audio_data, language="pt")
    for s in segments:
        print(f"[{ss + s.start:5.1f} - {ss + s.end:5.1f}]: {s.text}")
