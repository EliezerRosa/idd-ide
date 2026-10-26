import json
from pathlib import Path

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
f0 = json.loads((BASE / "f0_por_segmento.json").read_text(encoding="utf-8"))
segs = json.loads((BASE / "transcricao.json").read_text(encoding="utf-8"))

ai_segments = []
for idx, (s, pitch) in enumerate(zip(segs, f0)):
    is_ai = bool(pitch and pitch > 165.0)
    s["is_ai"] = is_ai
    s["pitch"] = pitch
    if is_ai:
        ai_segments.append(s)

print(f"Total de segmentos no Vídeo 1: {len(segs)}")
print(f"Total de segmentos da IA (Francisca): {len(ai_segments)}")
print(f"Total de segmentos do Dev (Antonio): {len(segs) - len(ai_segments)}")

# Group consecutive AI segments into intervals
intervals = []
cur_interval = None
for s in segs:
    if s["is_ai"]:
        if cur_interval is None:
            cur_interval = {"start": s["start"], "end": s["end"], "count": 1, "text": [s["text"]]}
            intervals.append(cur_interval)
        else:
            cur_interval["end"] = s["end"]
            cur_interval["count"] += 1
            cur_interval["text"].append(s["text"])
    else:
        cur_interval = None

print(f"\nIntervalos contínuos de fala da IA: {len(intervals)}")
for i, it in enumerate(intervals, 1):
    sample = " ".join(it["text"])[:70]
    print(f"  {i:2d}. [{it['start']:6.1f}s - {it['end']:6.1f}s] ({it['end']-it['start']:5.1f}s, {it['count']:2d} segs): {sample}...")
