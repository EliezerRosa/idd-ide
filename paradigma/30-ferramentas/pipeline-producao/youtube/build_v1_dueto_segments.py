import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
turbo_file = BASE / "v1_verbatim" / "transcricao_turbo.json"
segs = json.loads(turbo_file.read_text(encoding="utf-8"))

# Define exact segments/intervals where Francisca speaks
# In Interval 1 (45s to 212s), specific dialogue turns:
FRANCISCA_INTERVAL_1_SEGS = {3, 5, 6, 7, 8, 12, 13, 14, 19, 20, 23, 28, 29, 33, 34, 35, 36}

for s in segs:
    idx = s["i"]
    t_start = s["start"]
    t_end = s["end"]
    
    # 1. Intervalo 1
    if 45.0 <= t_start < 210.0:
        if idx in FRANCISCA_INTERVAL_1_SEGS:
            s["speaker"] = "Francisca"
            s["voice"] = "pt-BR-FranciscaNeural"
        else:
            s["speaker"] = "Antonio"
            s["voice"] = "pt-BR-AntonioNeural"
    # 2. Intervalo 2: 3507s a 3578s
    elif 3506.0 <= t_start < 3578.0:
        s["speaker"] = "Francisca"
        s["voice"] = "pt-BR-FranciscaNeural"
    # 3. Intervalo 3: 3932.0s a 4146.0s
    elif 3932.0 <= t_start < 4146.0:
        s["speaker"] = "Francisca"
        s["voice"] = "pt-BR-FranciscaNeural"
    else:
        s["speaker"] = "Antonio"
        s["voice"] = "pt-BR-AntonioNeural"

print(f"Total de segmentos: {len(segs)}")
f_count = sum(1 for s in segs if s["speaker"] == "Francisca")
a_count = sum(1 for s in segs if s["speaker"] == "Antonio")
print(f"Francisca (IA): {f_count} segmentos")
print(f"Antonio (Dev): {a_count} segmentos")

print("\n--- AMOSTRA DO DIÁLOGO INICIAL (45s - 212s) ---")
for s in segs[:40]:
    if 40.0 <= s["start"] <= 215.0:
        print(f"[{s['start']:6.2f} - {s['end']:6.2f}] {s['speaker']:9s}: {s['text']}")

print("\n--- AMOSTRA DO INTERVALO 2 (3507s - 3578s) ---")
for s in segs:
    if 3506.0 <= s["start"] <= 3578.0:
        print(f"[{s['start']:6.2f} - {s['end']:6.2f}] {s['speaker']:9s}: {s['text']}")

print("\n--- AMOSTRA DO INTERVALO 3 (3935s - 4146s) ---")
for s in segs:
    if 3932.0 <= s["start"] <= 4146.0:
        print(f"[{s['start']:6.2f} - {s['end']:6.2f}] {s['speaker']:9s}: {s['text']}")
