import json
from pathlib import Path

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
segs = json.loads((BASE / "transcricao.json").read_text(encoding="utf-8"))

gaps = []
for i in range(len(segs) - 1):
    g = segs[i+1]["start"] - segs[i]["end"]
    if g > 3.0:
        gaps.append((segs[i]["end"], segs[i+1]["start"], g, segs[i]["text"][:40], segs[i+1]["text"][:40]))

print(f"Total de gaps > 3.0s no Vídeo 1: {len(gaps)}")
print("\nMaiores pausas silenciosas (> 6s):")
for end, start, dur, t1, t2 in sorted(gaps, key=lambda x: x[2], reverse=True)[:25]:
    print(f"  [{end:6.1f}s -> {start:6.1f}s] Silêncio: {dur:5.1f}s | Depois de: '{t1}' | Antes de: '{t2}'")
