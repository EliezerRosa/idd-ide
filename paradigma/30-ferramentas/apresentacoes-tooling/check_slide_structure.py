import re
import sys

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

with open(r'c:\Antigravity - IDD Refrigeração\apresentacao\apresentacao_idd_perspectiva_tecnica.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find each slide
slide_matches = re.findall(r'<div class="slide(?:\s+active)?"\s+data-slide="(\d+)".*?>(.*?)<!-- SLIDE \d+|\s*</main>', html, re.DOTALL)
print(f"Total slides found: {len(slide_matches)}")
for s_num, s_content in slide_matches:
    has_humor = "humor-card" in s_content
    has_question = "question-card" in s_content
    grid_type = "grid-2" if "grid-2" in s_content else ("grid-3" if "grid-3" in s_content else "other")
    print(f"Slide {s_num}: Grid={grid_type}, HumorCard={has_humor}, QuestionCard={has_question}, Len={len(s_content)}")
