import json
import subprocess
from pathlib import Path

video = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\IDD_Refrigeracao_Novo_Episodio_1.mp4")
timeline = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_video_1_assets\video_1_timeline.json")
test_dir = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\inspect_sync")
test_dir.mkdir(parents=True, exist_ok=True)

with open(timeline, "r", encoding="utf-8") as f:
    tl = json.load(f)

# Vamos inspecionar exatamente os pontos de transição:
# Por exemplo, no meio de cada fala e no intervalo entre falas
check_points = [
    (5.0, "seg0_leigo_mid"),
    (14.0, "seg0_end_boundary"),
    (15.5, "seg1_eliezer_start"),
    (25.0, "seg1_eliezer_mid"),
    (34.0, "seg1_end_boundary"),
    (36.0, "seg2_leigo_mid"),
    (41.5, "seg3_eliezer_start"),
    (56.0, "seg3_end_slide1"),
    (58.0, "seg4_leigo_slide2"),
    (112.5, "seg8_ia_start_slide3"),
    (130.5, "seg9_eliezer_slide3"),
    (142.5, "seg10_ia_slide3"),
    (157.0, "seg11_leigo_slide3"),
    (168.0, "seg12_eliezer_slide4"),
    (198.0, "seg14_eliezer_slide4"),
    (210.0, "seg14_end")
]

for sec, name in check_points:
    out_img = test_dir / f"{int(sec):03d}s_{name}.jpg"
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(sec), "-i", str(video),
        "-vframes", "1", "-q:v", "2", str(out_img)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Frame salvo em {sec}s: {out_img.name}")

print("\nExtração de frames de inspeção concluída!")
