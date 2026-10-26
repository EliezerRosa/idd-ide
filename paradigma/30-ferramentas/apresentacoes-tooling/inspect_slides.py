import sys
import re

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

with open(r'c:\Antigravity - IDD Refrigeração\apresentacao\apresentacao_idd_perspectiva_tecnica.html', 'r', encoding='utf-8') as f:
    html = f.read()

slides = re.findall(r'<div class="slide(?:\s+active)?"\s+data-slide="(\d+)"\s+data-title="([^"]+)">', html)
for num, title in slides:
    print(f"Slide {num}: {title}")
