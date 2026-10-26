import json
from pathlib import Path

BASE = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")

f0_file = BASE / "f0_por_segmento.json"
turbo_file = BASE / "v1_verbatim" / "transcricao_turbo.json"
orig_file = BASE / "transcricao.json"

f0 = json.loads(f0_file.read_text(encoding="utf-8")) if f0_file.exists() else []
turbo = json.loads(turbo_file.read_text(encoding="utf-8")) if turbo_file.exists() else []
orig = json.loads(orig_file.read_text(encoding="utf-8")) if orig_file.exists() else []

print(f"f0 len: {len(f0)}")
print(f"turbo len: {len(turbo)}")
print(f"orig len: {len(orig)}")

# Let's inspect turbo segments and their speaker (F0 > 165 is female IA, F0 < 165 is Antonio)
if len(f0) == len(turbo):
    print("MATCH! f0 maps directly to turbo!")
    for idx, (t, pitch) in enumerate(zip(turbo[:35], f0[:35]), 1):
        spk = "IA (Francisca)" if pitch and pitch > 165 else "Antonio (Dev)"
        p_str = f"{pitch:.1f} Hz" if pitch else "N/A"
        print(f"{idx:3d} [{t['start']:6.2f} - {t['end']:6.2f}] ({p_str:9s}) -> {spk:15s}: {t['text'][:65]}")
elif len(f0) == len(orig):
    print("MATCH! f0 maps directly to orig!")
    for idx, (t, pitch) in enumerate(zip(orig[:35], f0[:35]), 1):
        spk = "IA (Francisca)" if pitch and pitch > 165 else "Antonio (Dev)"
        p_str = f"{pitch:.1f} Hz" if pitch else "N/A"
        print(f"{idx:3d} [{t['start']:6.2f} - {t['end']:6.2f}] ({p_str:9s}) -> {spk:15s}: {t['text'][:65]}")
