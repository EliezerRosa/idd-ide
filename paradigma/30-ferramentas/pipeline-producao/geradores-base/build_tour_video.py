"""Combina screenshots + áudios em vídeo final com timing por passo."""
import os
import subprocess
import json

ROOT = r"c:\Antigravity - RVM Designações"
AUDIO_DIR = os.path.join(ROOT, "tour_audio")
SCREEN_DIR = os.path.join(ROOT, "tour_screens")
TMP_DIR = os.path.join(ROOT, "tour_tmp_clips")
os.makedirs(TMP_DIR, exist_ok=True)
OUT = os.path.join(ROOT, "rvm-designacoes-unified", "public", "tutorial_completo.mp4")

ORDER = (
    [f"p{i:02d}" for i in range(1, 14)] +
    ["e01", "e02", "e05", "e06"] +
    [f"f{i:02d}" for i in range(1, 13)]
)


def ffprobe_duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        text=True
    )
    return float(out.strip())


def make_clip(step_id, idx):
    img = os.path.join(SCREEN_DIR, f"{step_id}.png")
    aud = os.path.join(AUDIO_DIR, f"{step_id}.mp3")
    out = os.path.join(TMP_DIR, f"{idx:02d}_{step_id}.mp4")
    dur = ffprobe_duration(aud) + 0.4  # 0.4s tail silence
    # Loop image, mux audio, pad to dur
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", img,
        "-i", aud,
        "-c:v", "libx264", "-tune", "stillimage",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-vf", "scale=1280:-2,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black",
        "-r", "30",
        "-t", f"{dur:.3f}",
        # extend audio with silence to match duration
        "-af", "apad=pad_dur=1",
        "-shortest",
        out,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return out


def main():
    print(f"Gerando {len(ORDER)} clipes...")
    clips = []
    for i, sid in enumerate(ORDER):
        print(f"  [{i+1}/{len(ORDER)}] {sid}")
        clips.append(make_clip(sid, i))

    # Concat list
    list_path = os.path.join(TMP_DIR, "list.txt")
    with open(list_path, "w", encoding="utf-8") as f:
        for c in clips:
            f.write(f"file '{c}'\n")

    print("Concatenando...")
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", list_path,
        "-c", "copy",
        OUT,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    size = os.path.getsize(OUT)
    print(f"OK -> {OUT} ({size/1024/1024:.2f} MB)")


if __name__ == "__main__":
    main()
