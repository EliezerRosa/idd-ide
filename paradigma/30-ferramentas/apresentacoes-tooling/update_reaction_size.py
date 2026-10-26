import re
import sys
from pathlib import Path

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

FILES = [
    Path(r"c:\Antigravity - IDD Refrigeração\apresentacao\apresentacao_idd_perspectiva_tecnica.html"),
    Path(r"c:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_perspectiva_tecnica_assets\video_perspectiva_tecnica_presentation_scene.html")
]

NEW_CSS = """    /* DUAL REACTION SECTION (DEV vs USUÁRIO) - ATÉ 1/3 DA TELA (ALTA VISIBILIDADE) */
    .dual-reactions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      flex-shrink: 0;
      height: 318px;
      margin-top: 4px;
    }

    .reaction-card {
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(16px);
      height: 100%;
    }

    .reaction-card.dev-card {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(8, 28, 58, 0.92));
      border: 1.5px solid rgba(56, 189, 248, 0.4);
    }
    .reaction-card.dev-card::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 5px;
      background: linear-gradient(180deg, #38bdf8, #818cf8);
    }

    .reaction-card.user-card {
      background: linear-gradient(135deg, rgba(6, 28, 24, 0.96), rgba(15, 23, 42, 0.92));
      border: 1.5px solid rgba(16, 185, 129, 0.4);
    }
    .reaction-card.user-card::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 5px;
      background: linear-gradient(180deg, #10b981, #f59e0b);
    }

    .reaction-gif-media {
      width: 440px;
      height: 248px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.75);
      transition: transform 0.25s ease;
    }
    .reaction-card:hover .reaction-gif-media {
      transform: scale(1.02);
    }

    .reaction-body {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 6px;
      min-width: 0;
      flex: 1;
      height: 248px;
    }

    .reaction-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-shrink: 0;
    }

    .reaction-role-tag {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      padding: 3px 8px;
      border-radius: 5px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .dev-card .reaction-role-tag {
      background: rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.5);
    }
    .user-card .reaction-role-tag {
      background: rgba(16, 185, 129, 0.25);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.5);
    }

    .reaction-status-dot {
      font-size: 11px;
      color: var(--text-dim);
      font-weight: 700;
    }

    .reaction-speech {
      font-family: var(--font-hand);
      font-size: 19px;
      line-height: 1.25;
      color: #fef08a;
      text-shadow: 0 1px 3px rgba(0,0,0,0.9);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex-shrink: 0;
    }

    .reaction-impact-text {
      background: rgba(4, 8, 18, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 11.5px;
      color: #cbd5e1;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .reaction-impact-text strong {
      color: #fff;
    }"""

for fpath in FILES:
    print(f"Atualizando CSS em: {fpath}")
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # Substituir bloco do DUAL REACTION SECTION
    pattern = re.compile(r'/\* DUAL REACTION SECTION.*?\.(reaction-impact-text strong \{\s*color: #fff;\s*\})', re.DOTALL)
    if pattern.search(content):
        content = pattern.sub(NEW_CSS, content)
    else:
        print("Padrão antigo não encontrado exatamente, buscando bloco por .dual-reactions-grid")
        pattern2 = re.compile(r'\.dual-reactions-grid \{.*?\.(reaction-impact-text strong \{\s*color: #fff;\s*\})', re.DOTALL)
        content = pattern2.sub(NEW_CSS, content)

    # Ajustes finos no card-panel para garantir que caiba perfeitamente
    content = content.replace("padding: 18px 26px;", "padding: 14px 24px;")
    content = content.replace("gap: 12px;", "gap: 8px;")
    
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Concluído: {fpath.name}")

print("\n🎉 Ambas as apresentações foram atualizadas com GIFs ampliados (440x248px, ~1/3 da tela)!")
