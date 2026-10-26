import json

with open(r"C:\Antigravity - IDD Refrigeração\producao_yt\v1_verbatim\transcricao_turbo.json", "r", encoding="utf-8") as f:
    segs = json.load(f)

preserved = [(45.6, 212.0), (3508.7, 3577.4), (3932.2, 4145.4)]

def overlap(a0, a1, b0, b1):
    return max(0.0, min(a1, b1) - max(a0, b0))

for idx, (p0, p1) in enumerate(preserved, 1):
    print(f"\n==========================================")
    print(f"PRESERVED INTERVAL {idx}: {p0}s - {p1}s (Duração: {p1 - p0:.1f}s)")
    print(f"==========================================")
    in_range = [s for s in segs if overlap(s["start"], s["end"], p0, p1) / max(0.01, s["end"] - s["start"]) >= 0.5]
    print(f"Total de segmentos Whisper: {len(in_range)}")
    for s in in_range:
        print(f"  [{s['start']:6.2f} - {s['end']:6.2f}]: {s['text']}")
