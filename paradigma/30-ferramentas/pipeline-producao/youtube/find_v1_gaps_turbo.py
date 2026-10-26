import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
segs = json.loads((BASE / "v1_verbatim" / "transcricao_turbo.json").read_text(encoding="utf-8"))

gaps = []
for i in range(len(segs) - 1):
    g = segs[i+1]["start"] - segs[i]["end"]
    if g > 1.5:
        gaps.append((segs[i]["end"], segs[i+1]["start"], g, segs[i]["text"][:40], segs[i+1]["text"][:40]))

print(f"Total de gaps > 1.5s em transcricao_turbo: {len(gaps)}")
print("\nMaiores pausas silenciosas (> 5s):")
for end, start, dur, t1, t2 in sorted(gaps, key=lambda x: x[2], reverse=True)[:30]:
    print(f"  [{end:6.1f}s -> {start:6.1f}s] Silêncio: {dur:5.1f}s | Depois: '{t1}' | Antes: '{t2}'")
