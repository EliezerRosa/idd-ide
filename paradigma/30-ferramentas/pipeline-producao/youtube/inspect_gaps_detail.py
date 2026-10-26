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
scenes = json.loads((BASE / "v1_dueto_neural" / "cenas_v1.json").read_text(encoding="utf-8"))

print(f"Total turbo segments: {len(turbo)}")
print(f"Total sched blocks: {len(sched)}")

print("=== BLOCOS ENTRE 1900s e 2150s ===")
for b in sched:
    if 1900 <= b['start'] <= 2150:
        bid = b['id']
        os = b['start']
        oe = b['end']
        ss = b['sched_start']
        se = b['sched_start'] + b['dur']
        txt = b['text'][:60]
        print(f"Bloco {bid:3d}: orig [{os:6.1f}s -> {oe:6.1f}s] sched [{ss:6.1f}s -> {se:6.1f}s] | {txt}")










