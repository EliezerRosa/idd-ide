import json
import subprocess
from pathlib import Path

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
OUT_DIR = BASE_DIR / "motion_graphics_renderer" / "idd_video_1_assets"
AUDIO_DIR = OUT_DIR / "audio"
TIMELINE_FILE = OUT_DIR / "video_1_timeline.json"

with open(TIMELINE_FILE, "r", encoding="utf-8") as f:
    timeline = json.load(f)

total_duration = timeline["totalDurationSec"]
items = timeline["items"]

print(f"Total duration: {total_duration}s | Items: {len(items)}")

# Gera áudio de silêncio 0.50s e 0.65s
silence_050 = AUDIO_DIR / "silence_050s.wav"
silence_065 = AUDIO_DIR / "silence_065s.wav"

subprocess.run([
    "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", "0.50", str(silence_050)
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

subprocess.run([
    "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", "0.65", str(silence_065)
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Concat list com caminhos absolutos com barras normais
concat_list = AUDIO_DIR / "concat_list.txt"
with open(concat_list, "w", encoding="utf-8") as f:
    f.write(f"file '{silence_050.as_posix()}'\n")
    for idx, it in enumerate(items):
        f.write(f"file '{Path(it['wav']).as_posix()}'\n")
        if idx < len(items) - 1:
            f.write(f"file '{silence_065.as_posix()}'\n")

raw_voice = OUT_DIR / "raw_voice_master.wav"
subprocess.run([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
    "-i", str(concat_list),
    "-c", "copy", str(raw_voice)
], check=True)
print(f"[OK] Voz bruta concatenada: {raw_voice} ({raw_voice.stat().st_size / (1024*1024):.1f} MB)")

# Monta master com ambiência e loudness -14 LUFS
master_audio = OUT_DIR / "master_soundtrack_video_1.wav"
filter_complex = (
    f"aevalsrc=sin(2*PI*130.81*t)*0.012+sin(2*PI*196.00*t)*0.008+sin(2*PI*261.63*t)*0.005:s=48000:d={total_duration}[bg];"
    "[0:a]asplit=2[v_audio][v_sc];"
    "[bg][v_sc]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=300[bg_ducked];"
    "[bg_ducked][v_audio]amix=inputs=2:weights=0.35 1.0[mixed];"
    "[mixed]loudnorm=I=-14:LRA=7:TP=-1.5[out_audio]"
)

subprocess.run([
    "ffmpeg", "-y",
    "-i", str(raw_voice),
    "-filter_complex", filter_complex,
    "-map", "[out_audio]",
    "-c:a", "pcm_s16le",
    str(master_audio)
], check=True)

print(f"[OK] Master Soundtrack Finalizado: {master_audio} ({master_audio.stat().st_size / (1024*1024):.1f} MB)")
