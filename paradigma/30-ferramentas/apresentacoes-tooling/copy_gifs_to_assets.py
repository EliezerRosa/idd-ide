import shutil
from pathlib import Path

src = Path(r"c:\Antigravity - IDD Refrigeração\apresentacao\gifs")
dst = Path(r"c:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_perspectiva_tecnica_assets\gifs")
dst.mkdir(parents=True, exist_ok=True)
count = 0
for f in src.glob("*.gif"):
    shutil.copy2(f, dst / f.name)
    count += 1
print(f"Copied {count} GIFs to motion graphics assets folder.")
