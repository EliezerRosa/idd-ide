import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
turbo = json.loads((BASE / "v1_verbatim" / "transcricao_turbo.json").read_text(encoding="utf-8"))
sched = json.loads((BASE / "v1_dueto_neural" / "schedule_v1_dueto.json").read_text(encoding="utf-8"))

print("=== SEGMENTOS TURBO DOS BLOCOS COM GAP > 15s ===")
for b in sched:
    orig_dur = b['end'] - b['start']
    diff = orig_dur - b['dur']
    if diff > 15.0:
        bid = b['id']
        sub_segs = [s for s in turbo if b['start'] <= s['start'] < b['end']]
        print(f"\nBlock {bid:3d}: orig [{b['start']:6.1f}s -> {b['end']:6.1f}s] (diff {diff:4.1f}s, dur {b['dur']:4.1f}s) tem {len(sub_segs)} segmentos turbo:")
        for s in sub_segs:
            print(f"   [{s['start']:6.1f}s -> {s['end']:6.1f}s] {s['text'][:65]}")
