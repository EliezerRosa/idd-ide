import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
sched = json.loads((BASE / "v1_dueto_neural" / "schedule_v1_dueto.json").read_text(encoding="utf-8"))
scenes = json.loads((BASE / "v1_dueto_neural" / "cenas_v1.json").read_text(encoding="utf-8"))

print("=== MAIORES GAPS NO VÍDEO 1 (> 10s) ===")
large_gaps = []
for i in range(len(sched) - 1):
    b1 = sched[i]
    b2 = sched[i+1]
    e1 = b1['sched_start'] + b1['dur']
    s2 = b2['sched_start']
    gap = s2 - e1
    if gap > 10.0:
        large_gaps.append((i, b1, b2, e1, s2, gap))

print(f"Total de gaps > 10s: {len(large_gaps)}")
for idx, b1, b2, e1, s2, gap in large_gaps:
    cuts = [sc for sc in scenes if e1 - 1 <= sc <= s2 + 1]
    print(f"\n[GAP {gap:5.1f}s] De {e1:6.1f}s até {s2:6.1f}s | Âncoras visuais: {cuts}")
    print(f"  Bloco {b1['id']:3d} ({b1['speaker']}): Orig [{b1['start']:6.1f}s -> {b1['end']:6.1f}s] Sched [{b1['sched_start']:6.1f}s -> {e1:6.1f}s]")
    print(f"    Texto: {b1['text'][-80:]}")
    print(f"  Bloco {b2['id']:3d} ({b2['speaker']}): Orig [{b2['start']:6.1f}s -> {b2['end']:6.1f}s] Sched [{s2:6.1f}s -> {s2+b2['dur']:6.1f}s]")
    print(f"    Texto: {b2['text'][:80]}")
