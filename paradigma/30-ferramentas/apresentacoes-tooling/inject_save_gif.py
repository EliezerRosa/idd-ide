import re
import sys
from pathlib import Path

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GEN_FILE = Path(r"c:\Antigravity - IDD Refrigeração\apresentacao\generate_all_20_gifs.py")

with open(GEN_FILE, "r", encoding="utf-8") as f:
    code = f.read()

# Substituir função de save
save_helper = """
DST_DIR = Path(r"C:\\Antigravity - IDD Refrigeração\\motion_graphics_renderer\\idd_perspectiva_tecnica_assets\\gifs")
DST_DIR.mkdir(parents=True, exist_ok=True)

def save_scaled_gif(frames, filename):
    scaled = [f.resize((520, 280), Image.Resampling.NEAREST) for f in frames]
    p1 = OUT_DIR / filename
    p2 = DST_DIR / filename
    scaled[0].save(p1, save_all=True, append_images=scaled[1:], duration=80, loop=0)
    import shutil
    shutil.copy2(p1, p2)
    print(f"  -> Salvo 520x280: {filename}")
"""

code = code.replace("OUT_DIR.mkdir(parents=True, exist_ok=True)", "OUT_DIR.mkdir(parents=True, exist_ok=True)\n" + save_helper)

# Substituir frames[0].save(OUT_DIR / "...", save_all=True, append_images=frames[1:], duration=80, loop=0)
code = re.sub(
    r'frames\[0\]\.save\(OUT_DIR\s*/\s*"([^"]+)",\s*save_all=True,\s*append_images=frames\[1:\],\s*duration=80,\s*loop=0\)',
    r'save_scaled_gif(frames, "\1")',
    code
)

with open(GEN_FILE, "w", encoding="utf-8") as f:
    f.write(code)

print("✅ generate_all_20_gifs.py atualizado com save_scaled_gif!")
