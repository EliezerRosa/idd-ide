import re
import sys

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

with open(r'c:\Antigravity - IDD Refrigeração\apresentacao\apresentacao_idd_perspectiva_tecnica.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Match each slide and print its current footer/question/humor card
pattern = re.compile(r'(<div class="slide(?:\s+active)?"\s+data-slide="(\d+)"\s+data-title="([^"]+)">)(.*?)(<!-- SLIDE \d+|\s*</main>)', re.DOTALL)
matches = pattern.findall(html)
print(f"Found {len(matches)} slides:")
for open_tag, num, title, body, close_tag in matches:
    print(f"\n--- SLIDE {num}: {title} ---")
    # find question-card or humor-card
    q = re.search(r'<div class="(question-card|humor-card)".*?</div>\s*</div>', body, re.DOTALL)
    if q:
        print("Found bottom card:", q.group(0)[:150] + "...")
    else:
        print("No bottom card found directly, searching for class occurrences:")
        for line in body.splitlines():
            if 'question-card' in line or 'humor-card' in line or 'footer-banner' in line:
                print("  ", line.strip())
