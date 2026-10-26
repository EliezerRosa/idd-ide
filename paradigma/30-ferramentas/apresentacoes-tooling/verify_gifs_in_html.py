import re
import sys

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

with open(r'c:\Antigravity - IDD Refrigeração\apresentacao\apresentacao_idd_perspectiva_tecnica.html', 'r', encoding='utf-8') as f:
    html = f.read()

gifs = re.findall(r'src="(gifs/slide\d+_[a-z]+_reaction\.gif)"', html)
print(f"Total GIF image tags found: {len(gifs)}")
unique_gifs = sorted(list(set(gifs)))
print(f"Total Unique GIFs: {len(unique_gifs)}")
for g in unique_gifs:
    print(f"  - {g}")
