import subprocess
from pathlib import Path

out_dir = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\preview_novo_ep1")
out_dir.mkdir(parents=True, exist_ok=True)
video = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\IDD_Refrigeracao_Novo_Episodio_1.mp4")

frames = [
    (15, "frame_01_slide1_proposta.jpg"),
    (70, "frame_02_slide2_excalidraw_manifold.jpg"),
    (125, "frame_03_slide3_ia_chat_terminal.jpg"),
    (180, "frame_04_slide4_campo_qrcode.jpg")
]

for sec, fname in frames:
    out_file = out_dir / fname
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(sec), "-i", str(video),
        "-vframes", "1", "-q:v", "2", str(out_file)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[OK] {fname} ({out_file.stat().st_size / 1024:.1f} KB)")
