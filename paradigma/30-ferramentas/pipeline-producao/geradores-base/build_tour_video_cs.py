"""Combina screenshots + áudios do tour CS em vídeo tutorial_cs.mp4.

Ordem: a01–a06 (lista de anúncios) + af01–af08 (formulário).
Saída : rvm-designacoes-unified/public/tutorial_cs.mp4

Pré-requisito: rodar capture_tour_screens_cs.py primeiro para gerar as imagens,
e ter arquivos de áudio correspondentes em tour_audio_cs/ (MP3 narrados por TTS
ou gravados manualmente).

Para gerar os MP3 de áudio automaticamente via gTTS (pip install gtts):
    python generate_audio_cs.py  ← script auxiliar gerado automaticamente abaixo
"""
import os
import subprocess

ROOT       = r"c:\Antigravity - RVM Designações"
AUDIO_DIR  = os.path.join(ROOT, "tour_audio_cs")
SCREEN_DIR = os.path.join(ROOT, "tour_screens_cs")
TMP_DIR    = os.path.join(ROOT, "tour_tmp_clips_cs")
os.makedirs(TMP_DIR, exist_ok=True)
OUT = os.path.join(ROOT, "rvm-designacoes-unified", "public", "tutorial_cs.mp4")

ORDER = (
    [f"a{i:02d}"  for i in range(1, 8)] +   # 7 passos da lista
    [f"af{i:02d}" for i in range(1, 9)]      # 8 passos do formulário
)


def ffprobe_duration(path: str) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        text=True,
    )
    return float(out.strip())


def make_clip(step_id: str, idx: int) -> str:
    img = os.path.join(SCREEN_DIR, f"{step_id}.png")
    aud = os.path.join(AUDIO_DIR,  f"{step_id}.mp3")
    out = os.path.join(TMP_DIR,    f"{idx:02d}_{step_id}.mp4")

    if not os.path.exists(img):
        raise FileNotFoundError(f"Imagem não encontrada: {img}\nRode capture_tour_screens_cs.py primeiro.")
    if not os.path.exists(aud):
        raise FileNotFoundError(f"Áudio não encontrado: {aud}\nRode generate_audio_cs.py primeiro.")

    dur = ffprobe_duration(aud) + 0.5  # 0.5s tail silence
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
        "-af", "apad=pad_dur=1",
        "-shortest",
        out,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return out


def main():
    print(f"Gerando {len(ORDER)} clipes para tutorial_cs.mp4 ...")
    clips = []
    for i, sid in enumerate(ORDER):
        print(f"  [{i+1}/{len(ORDER)}] {sid}")
        clips.append(make_clip(sid, i))

    list_path = os.path.join(TMP_DIR, "list_cs.txt")
    with open(list_path, "w", encoding="utf-8") as f:
        for c in clips:
            f.write(f"file '{c}'\n")

    print("Concatenando clipes ...")
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", list_path,
        "-c", "copy",
        OUT,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    size = os.path.getsize(OUT)
    print(f"OK → {OUT}  ({size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
