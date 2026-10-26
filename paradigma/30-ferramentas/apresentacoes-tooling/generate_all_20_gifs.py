"""Gerador completo de 20 GIFs animados para os Vídeos-Slides do Paradigma IDD:
- 1 GIF para o DEV em cada slide (10 slides)
- 1 GIF para o USUÁRIO em cada slide (10 slides)
"""

import sys
import math
from pathlib import Path
from PIL import Image, ImageDraw

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

OUT_DIR = Path(r"C:\Antigravity - IDD Refrigeração\apresentacao\gifs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

DST_DIR = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_perspectiva_tecnica_assets\gifs")
DST_DIR.mkdir(parents=True, exist_ok=True)

def save_scaled_gif(frames, filename):
    scaled = [f.resize((520, 280), Image.Resampling.NEAREST) for f in frames]
    p1 = OUT_DIR / filename
    p2 = DST_DIR / filename
    scaled[0].save(p1, save_all=True, append_images=scaled[1:], duration=80, loop=0)
    import shutil
    shutil.copy2(p1, p2)
    print(f"  -> Salvo 520x280: {filename}")


WIDTH, HEIGHT = 260, 140
NUM_FRAMES = 14

def draw_pill(draw, x, y, text, bg, fg, border=None):
    draw.rounded_rectangle([x, y, x + 110, y + 20], radius=4, fill=bg, outline=border)
    draw.text((x + 6, y + 3), text, fill=fg)

def generate_all_gifs():
    print("=" * 80)
    print("🎨 GERANDO 20 GIFS ANIMADOS EXCLUSIVOS (DEV & USUÁRIO) PARA OS 10 SLIDES...")
    print("=" * 80)

    # -------------------------------------------------------------
    # SLIDE 01: DIAGNÓSTICO ISENTO & VIBE CODING
    # -------------------------------------------------------------
    # 1. DEV: Pânico no Vibe Coding às 3h da manhã
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        # Borda pulsante de erro
        alpha = int(120 + 80 * math.sin(f * math.pi / 7))
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(244, 63, 94, alpha), width=2)
        draw_pill(draw, 8, 6, "# DEV: Vibe Coding", (30, 15, 25), (253, 164, 175), (244, 63, 94))
        draw.text((180, 8), "@ 03:42 AM", fill=(245, 158, 11))

        # Monitor e chamas
        draw.rectangle([45, 32, 125, 80], fill=(5, 8, 18), outline=(56, 189, 248), width=2)
        if f % 4 < 2:
            draw.rectangle([50, 42, 120, 68], fill=(244, 63, 94, 220))
            draw.text((54, 48), "ALUCINACAO!", fill=(255, 255, 255))
        else:
            draw.text((50, 38), "prompt() -> bug", fill=(244, 63, 94))
            draw.text((50, 50), "stack overflow", fill=(253, 164, 175))
            draw.text((50, 62), "where is logic?", fill=(245, 158, 11))
        # Chamas
        flame = int(4 * math.sin(f * math.pi / 3))
        draw.polygon([(40, 82), (55, 68 + flame), (70, 82)], fill=(244, 63, 94))
        draw.polygon([(65, 82), (85, 62 - flame), (105, 82)], fill=(245, 158, 11))
        draw.polygon([(100, 82), (118, 69 + flame), (135, 82)], fill=(244, 63, 94))

        # Rosto do DEV em pânico arrancando cabelos
        dx = 185 + int(2 * math.cos(f * math.pi / 2))
        dy = 56
        draw.ellipse([dx - 18, dy - 18, dx + 18, dy + 18], fill=(254, 243, 199))
        draw.ellipse([dx - 10, dy - 6, dx - 2, dy + 4], fill=(255, 255, 255))
        draw.ellipse([dx + 2, dy - 6, dx + 10, dy + 4], fill=(255, 255, 255))
        draw.ellipse([dx - 6, dy - 2, dx - 4, dy + 1], fill=(0, 0, 0))
        draw.ellipse([dx + 4, dy - 2, dx + 6, dy + 1], fill=(0, 0, 0))
        draw.ellipse([dx - 7, dy + 6, dx + 7, dy + 15], fill=(185, 28, 28))
        # Gotas de suor
        sy = (f * 5) % 25
        draw.ellipse([dx - 22, dy - 10 + sy, dx - 18, dy - 4 + sy], fill=(56, 189, 248))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "* \"O LLM jurou que funcionava...\"", fill=(244, 63, 94))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide01_dev_reaction.gif")

    # 2. USUÁRIO: Cliente indignado com app quebrando
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(245, 158, 11, 140), width=2)
        draw_pill(draw, 8, 6, "# USUARIO: Negocio", (35, 25, 15), (254, 215, 170), (245, 158, 11))
        draw.text((170, 8), "X ERRO 500", fill=(244, 63, 94))

        # Celular quebrado na mão
        cx, cy = 60, 48
        draw.rectangle([cx, cy, cx + 45, cy + 65], fill=(30, 41, 59), outline=(148, 163, 184), width=2)
        # Racha na tela
        draw.line([(cx + 10, cy + 15), (cx + 25, cy + 35), (cx + 18, cy + 55)], fill=(244, 63, 94), width=2)
        # Spinner travado
        rot = f * math.pi / 7
        sx, sy = cx + 22, cy + 30
        draw.arc([sx - 10, sy - 10, sx + 10, sy + 10], start=int(rot * 57), end=int((rot + 2) * 57), fill=(56, 189, 248), width=3)

        # Rosto do Usuário com a mão na testa (Facepalm)
        ux = 175
        uy = 56
        draw.ellipse([ux - 18, uy - 18, ux + 18, uy + 18], fill=(254, 243, 199))
        # Olhos fechados com raiva
        draw.line([(ux - 12, uy - 4), (ux - 4, uy)], fill=(120, 53, 15), width=2)
        draw.line([(ux + 4, uy), (ux + 12, uy - 4)], fill=(120, 53, 15), width=2)
        # Boca torta
        draw.line([(ux - 6, uy + 10), (ux + 6, uy + 7)], fill=(185, 28, 28), width=2)
        # Ponto de interrogação flutuando
        q_off = int(4 * math.sin(f * math.pi / 7))
        draw.text((ux + 22, uy - 20 + q_off), "?!", fill=(244, 63, 94))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), ">:( \"Cobrou no cartao e o pedido sumiu?!\"", fill=(251, 146, 60))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide01_user_reaction.gif")

    # -------------------------------------------------------------
    # SLIDE 02: MCP VS IDD (ENCANAMENTO VS ENGENHARIA)
    # -------------------------------------------------------------
    # 3. DEV: Sacada genial de que MCP é cano e IDD é cérebro
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(168, 85, 247, 160), width=2)
        draw_pill(draw, 8, 6, "# DEV: Revelacao", (30, 18, 45), (216, 180, 254), (168, 85, 247))
        draw.text((185, 8), "* EUREKA!", fill=(250, 204, 21))

        # Tubos MCP conectando a um cérebro brilhante IDD
        draw.line([(30, 60), (70, 60), (70, 45), (100, 45)], fill=(56, 189, 248), width=6)
        draw.text((25, 45), "MCP PIPE", fill=(56, 189, 248))
        # Cérebro brilhando
        brain_glow = int(10 + 6 * math.sin(f * math.pi / 7))
        draw.ellipse([100 - brain_glow, 45 - brain_glow, 100 + brain_glow, 45 + brain_glow], fill=(168, 85, 247, 80))
        draw.text((95, 38), "* IDD", fill=(255, 255, 255))

        # DEV apontando feliz com sorriso confiante
        dx = 185
        dy = 58
        draw.ellipse([dx - 18, dy - 18, dx + 18, dy + 18], fill=(254, 243, 199))
        draw.ellipse([dx - 9, dy - 5, dx - 3, dy + 3], fill=(56, 189, 248))
        draw.ellipse([dx + 3, dy - 5, dx + 9, dy + 3], fill=(56, 189, 248))
        # Sorriso largo
        draw.arc([dx - 8, dy - 2, dx + 8, dy + 10], start=0, end=180, fill=(16, 185, 129), width=3)
        # Óculos de sol descendo
        glass_y = min(dy - 7, dy - 25 + int(f * 2.5))
        draw.rectangle([dx - 14, glass_y, dx + 14, glass_y + 8], fill=(15, 23, 42))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), ":) \"MCP e o cano, IDD e a inteligencia!\"", fill=(216, 180, 254))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide02_dev_reaction.gif")

    # 4. USUÁRIO: Água 100% limpa da torneira
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(16, 185, 129, 160), width=2)
        draw_pill(draw, 8, 6, "# USUARIO: Alivio", (15, 35, 25), (167, 243, 208), (16, 185, 129))
        draw.text((180, 8), "* 100% PURA", fill=(56, 189, 248))

        # Torneira e copo com água cristalina brilhando
        draw.rectangle([40, 40, 80, 50], fill=(148, 163, 184))
        drop_y = 50 + ((f * 6) % 30)
        draw.ellipse([58, drop_y, 64, drop_y + 8], fill=(56, 189, 248))
        # Copo azul
        draw.rectangle([50, 75, 72, 95], fill=(2, 132, 199, 180), outline=(56, 189, 248), width=2)

        # Usuário brindando satisfeito
        ux = 175
        uy = 58
        draw.ellipse([ux - 18, uy - 18, ux + 18, uy + 18], fill=(254, 243, 199))
        # Olhos fechados sorrindo (felicidade)
        draw.arc([ux - 12, uy - 8, ux - 2, uy + 2], start=180, end=360, fill=(16, 185, 129), width=2)
        draw.arc([ux + 2, uy - 8, ux + 12, uy + 2], start=180, end=360, fill=(16, 185, 129), width=2)
        draw.arc([ux - 8, uy, ux + 8, uy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        # Polegar para cima
        draw.text((ux - 35, uy - 5), "OK", fill=(250, 204, 21))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "* \"Pressao perfeita e zero vazamento!\"", fill=(110, 231, 183))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide02_user_reaction.gif")

    # -------------------------------------------------------------
    # SLIDE 03: PILAR 1 - INTENT IR CANÔNICA
    # -------------------------------------------------------------
    # 5. DEV: Jogando papéis de prompt fora e pegando a AST
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(56, 189, 248, 160), width=2)
        draw_pill(draw, 8, 6, "# DEV: Compilacao", (15, 30, 48), (186, 230, 253), (56, 189, 248))
        draw.text((180, 8), "* INTENT IR", fill=(56, 189, 248))

        # Lixeira com prompts velhos
        draw.polygon([(30, 60), (60, 60), (55, 90), (35, 90)], fill=(71, 85, 105))
        draw.text((32, 65), "PROMPT", fill=(244, 63, 94))
        # Cristal AST brilhante
        c_glow = int(4 * math.sin(f * math.pi / 7))
        draw.polygon([(90, 40 + c_glow), (110, 55 + c_glow), (90, 70 + c_glow), (70, 55 + c_glow)], fill=(56, 189, 248))
        draw.text((82, 50 + c_glow), "AST", fill=(15, 23, 42))

        # DEV comemorando com braços erguidos
        dx = 185
        dy = 58
        draw.ellipse([dx - 18, dy - 18, dx + 18, dy + 18], fill=(254, 243, 199))
        draw.ellipse([dx - 8, dy - 5, dx - 2, dy + 3], fill=(16, 185, 129))
        draw.ellipse([dx + 2, dy - 5, dx + 8, dy + 3], fill=(16, 185, 129))
        draw.arc([dx - 8, dy, dx + 8, dy + 10], start=0, end=180, fill=(16, 185, 129), width=3)
        # Braços levantados
        draw.line([(dx - 18, dy + 5), (dx - 28, dy - 12)], fill=(254, 243, 199), width=4)
        draw.line([(dx + 18, dy + 5), (dx + 28, dy - 12)], fill=(254, 243, 199), width=4)

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "* \"Adeus rezas, ola tipagem e AST!\"", fill=(56, 189, 248))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide03_dev_reaction.gif")

    # 6. USUÁRIO: O que pedi em linguagem natural virou realidade
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(16, 185, 129, 160), width=2)
        draw_pill(draw, 8, 6, "# USUARIO: Precisao", (15, 35, 25), (167, 243, 208), (16, 185, 129))
        draw.text((180, 8), "🎯 100% FIEL", fill=(16, 185, 129))

        # Prancheta com checkmarks verdes piscando
        px, py = 45, 38
        draw.rectangle([px, py, px + 55, py + 55], fill=(30, 41, 59), outline=(148, 163, 184), width=2)
        draw.text((px + 8, py + 8), "✓ Regra 1", fill=(16, 185, 129))
        draw.text((px + 8, py + 22), "✓ Regra 2", fill=(16, 185, 129))
        draw.text((px + 8, py + 36), "✓ Regra 3", fill=(16, 185, 129))

        # Usuário sorrindo com olhar satisfeito
        ux = 175
        uy = 58
        draw.ellipse([ux - 18, uy - 18, ux + 18, uy + 18], fill=(254, 243, 199))
        draw.ellipse([ux - 8, uy - 4, ux - 2, uy + 2], fill=(56, 189, 248))
        draw.ellipse([ux + 2, uy - 4, ux + 8, uy + 2], fill=(56, 189, 248))
        draw.arc([ux - 8, uy + 2, ux + 8, uy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        draw.text((ux + 20, uy - 12), "💖", fill=(244, 63, 94))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "🤩 \"O que eu pedi é exatamente o que faz!\"", fill=(110, 231, 183))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide03_user_reaction.gif")

    # -------------------------------------------------------------
    # SLIDE 04: PILAR 2 - PROVADORES SMT (Z3 & DAFNY)
    # -------------------------------------------------------------
    # 7. DEV: Dormindo na rede enquanto Z3 prova tudo
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(16, 185, 129, 160), width=2)
        draw_pill(draw, 8, 6, "# DEV: Prova Formal", (15, 35, 25), (167, 243, 208), (16, 185, 129))
        draw.text((180, 8), "🛡️ Z3: SAT", fill=(16, 185, 129))

        # Escudo matemático giratório
        s_rot = int(6 * math.sin(f * math.pi / 7))
        draw.polygon([(65, 38 + s_rot), (95, 38 + s_rot), (80, 85 + s_rot)], fill=(16, 185, 129, 200), outline=(56, 189, 248), width=2)
        draw.text((72, 50 + s_rot), "∀x", fill=(255, 255, 255))

        # DEV deitado relaxado com Zzz
        dx = 175
        dy = 60
        draw.ellipse([dx - 16, dy - 16, dx + 16, dy + 16], fill=(254, 243, 199))
        # Óculos escuros descansando
        draw.rectangle([dx - 12, dy - 6, dx + 12, dy + 2], fill=(15, 23, 42))
        draw.arc([dx - 6, dy + 4, dx + 6, dy + 10], start=0, end=180, fill=(16, 185, 129), width=2)
        # Zzz flutuando
        z_y = (f * 3) % 20
        draw.text((dx + 18, dy - 20 - z_y), "Zzz...", fill=(56, 189, 248))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), ":) \"Plantão no fim de semana? Nunca mais!\"", fill=(110, 231, 183))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide04_dev_reaction.gif")

    # 8. USUÁRIO / CFO: Risco zero de auditoria
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(245, 158, 11, 160), width=2)
        draw_pill(draw, 8, 6, "# CFO: Risco Zero", (35, 25, 15), (254, 215, 170), (245, 158, 11))
        draw.text((180, 8), "🔒 AUDIT OK", fill=(245, 158, 11))

        # Cofre dourado blindado
        draw.rectangle([45, 42, 95, 88], fill=(51, 65, 85), outline=(245, 158, 11), width=2)
        draw.ellipse([65, 60, 75, 70], fill=(245, 158, 11))
        draw.text((55, 48), "$$$", fill=(16, 185, 129))

        # CFO feliz e tranquilo
        cx = 175
        cy = 58
        draw.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=(254, 243, 199))
        draw.arc([cx - 10, cy - 6, cx - 2, cy + 2], start=180, end=360, fill=(16, 185, 129), width=2)
        draw.arc([cx + 2, cy - 6, cx + 10, cy + 2], start=180, end=360, fill=(16, 185, 129), width=2)
        draw.arc([cx - 8, cy + 2, cx + 8, cy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        draw.text((cx + 22, cy - 8), "💎", fill=(56, 189, 248))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "😌 \"Cálculos 100% exatos perante a Receita!\"", fill=(253, 224, 71))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide04_user_reaction.gif")

    # -------------------------------------------------------------
    # SLIDE 05: PILAR 3 - ENGENHARIA CONSTITUCIONAL & DIFF SEMÂNTICO
    # -------------------------------------------------------------
    # 9. DEV: Olhando o diff de grafo barrando quebra de FK
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(56, 189, 248, 160), width=2)
        draw_pill(draw, 8, 6, "# DEV: Diff de Grafo", (15, 30, 48), (186, 230, 253), (56, 189, 248))
        draw.text((180, 8), "🛑 BLOCK FK", fill=(244, 63, 94))

        # Grafo semântico com nó vermelho barrado
        draw.ellipse([35, 45, 55, 65], fill=(56, 189, 248))
        draw.line([(55, 55), (85, 55)], fill=(148, 163, 184), width=2)
        draw.ellipse([85, 45, 105, 65], fill=(244, 63, 94))
        draw.text((92, 48), "X", fill=(255, 255, 255))

        # DEV aliviado com mão no peito
        dx = 175
        dy = 58
        draw.ellipse([dx - 18, dy - 18, dx + 18, dy + 18], fill=(254, 243, 199))
        draw.ellipse([dx - 8, dy - 4, dx - 2, dy + 2], fill=(56, 189, 248))
        draw.ellipse([dx + 2, dy - 4, dx + 8, dy + 2], fill=(56, 189, 248))
        draw.arc([dx - 7, dy + 2, dx + 7, dy + 10], start=0, end=180, fill=(16, 185, 129), width=2)
        # Gota de alívio
        draw.ellipse([dx + 18, dy - 12, dx + 24, dy - 4], fill=(56, 189, 248))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "🛡️ \"O Git não viu, mas o IDD barrou o merge!\"", fill=(56, 189, 248))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide05_dev_reaction.gif")

    # 10. USUÁRIO: Zero downtime real
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(16, 185, 129, 160), width=2)
        draw_pill(draw, 8, 6, "# USUÁRIO: Uptime", (15, 35, 25), (167, 243, 208), (16, 185, 129))
        draw.text((180, 8), "🟢 99.999%", fill=(16, 185, 129))

        # Servidores rodando felizes com luzes verdes piscando
        draw.rectangle([40, 40, 95, 88], fill=(30, 41, 59), outline=(16, 185, 129), width=2)
        for i in range(3):
            blink = (16, 185, 129) if (f + i) % 3 == 0 else (5, 150, 105)
            draw.ellipse([48, 48 + i * 14, 54, 54 + i * 14], fill=blink)
            draw.line([(60, 51 + i * 14), (88, 51 + i * 14)], fill=(148, 163, 184))

        # Usuário comprando normalmente no celular
        ux = 175
        uy = 58
        draw.ellipse([ux - 18, uy - 18, ux + 18, uy + 18], fill=(254, 243, 199))
        draw.ellipse([ux - 8, uy - 4, ux - 2, uy + 2], fill=(16, 185, 129))
        draw.ellipse([ux + 2, uy - 4, ux + 8, uy + 2], fill=(16, 185, 129))
        draw.arc([ux - 8, uy + 2, ux + 8, uy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        draw.text((ux - 35, uy - 10), "☕", fill=(250, 204, 21))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "🚀 \"Migrou o banco e eu nem senti o delay!\"", fill=(110, 231, 183))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide05_user_reaction.gif")

    # -------------------------------------------------------------
    # SLIDE 06: PILAR 4 - AÇÃO ATÔMICA & SAGAS EM 4 FASES
    # -------------------------------------------------------------
    # 11. DEV: Aplaudindo o rollback sem deadlock
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(16, 185, 129, 160), width=2)
        draw_pill(draw, 8, 6, "# DEV: Sagas", (15, 35, 25), (167, 243, 208), (16, 185, 129))
        draw.text((180, 8), "🔄 REWIND", fill=(56, 189, 248))

        # Botão de rollback simétrico girando
        r_angle = f * math.pi / 7
        rx, ry = 70, 60
        draw.ellipse([rx - 25, ry - 25, rx + 25, ry + 25], fill=(30, 41, 59), outline=(56, 189, 248), width=2)
        draw.text((rx - 15, ry - 8), "ROLL", fill=(16, 185, 129))

        # DEV batendo palmas entusiasmado
        dx = 175
        dy = 58
        draw.ellipse([dx - 18, dy - 18, dx + 18, dy + 18], fill=(254, 243, 199))
        draw.ellipse([dx - 8, dy - 5, dx - 2, dy + 2], fill=(16, 185, 129))
        draw.ellipse([dx + 2, dy - 5, dx + 8, dy + 2], fill=(16, 185, 129))
        draw.arc([dx - 8, dy + 2, dx + 8, dy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        # Mãos batendo palmas
        clap_off = int(3 * math.sin(f * math.pi / 2))
        draw.ellipse([dx - 22 + clap_off, dy + 15, dx - 12 + clap_off, dy + 25], fill=(254, 243, 199))
        draw.ellipse([dx - 14 - clap_off, dy + 15, dx - 4 - clap_off, dy + 25], fill=(254, 243, 199))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "👏 \"Rollback limpo em 4 fases sem lock!\"", fill=(110, 231, 183))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide06_dev_reaction.gif")

    # 12. USUÁRIO: Estorno Pix imediato
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(16, 185, 129, 160), width=2)
        draw_pill(draw, 8, 6, "# CLIENTE: Pix Seguro", (15, 35, 25), (167, 243, 208), (16, 185, 129))
        draw.text((180, 8), "💰 ESTORNO", fill=(16, 185, 129))

        # Moeda pulando de volta na carteira
        coin_y = 65 - int(15 * abs(math.sin(f * math.pi / 7)))
        draw.ellipse([55, coin_y, 75, coin_y + 20], fill=(250, 204, 21), outline=(217, 119, 6), width=2)
        draw.text((62, coin_y + 3), "R$", fill=(120, 53, 15))
        # Carteira
        draw.rectangle([45, 75, 85, 95], fill=(136, 19, 55), outline=(244, 63, 94))

        # Usuário sorrindo com notificação no celular
        ux = 175
        uy = 58
        draw.ellipse([ux - 18, uy - 18, ux + 18, uy + 18], fill=(254, 243, 199))
        draw.ellipse([ux - 8, uy - 4, ux - 2, uy + 2], fill=(16, 185, 129))
        draw.ellipse([ux + 2, uy - 4, ux + 8, uy + 2], fill=(16, 185, 129))
        draw.arc([ux - 8, uy + 2, ux + 8, uy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        draw.text((ux - 35, uy - 5), "📱", fill=(56, 189, 248))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "* \"O Pix voltou na hora! Zero estresse!\"", fill=(110, 231, 183))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide06_user_reaction.gif")

    # -------------------------------------------------------------
    # SLIDE 07: PILAR 5 - BENCHMARK IDD (ALÉM DO SWE-BENCH)
    # -------------------------------------------------------------
    # 13. DEV: Mic drop com gráficos de 1.000 mutações
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(168, 85, 247, 160), width=2)
        draw_pill(draw, 8, 6, "# DEV: Ciência", (30, 18, 45), (216, 180, 254), (168, 85, 247))
        draw.text((180, 8), "📊 0% ERRO", fill=(16, 185, 129))

        # Gráfico de barras comparativo
        draw.rectangle([35, 75, 55, 95], fill=(244, 63, 94))  # Vibe coding 68%
        draw.text((32, 58), "68% err", fill=(244, 63, 94))
        draw.rectangle([70, 90, 90, 95], fill=(16, 185, 129))  # IDD 0%
        draw.text((68, 75), "0% IDD", fill=(16, 185, 129))

        # DEV com microfone caindo (Mic drop)
        dx = 175
        dy = 56
        draw.ellipse([dx - 18, dy - 18, dx + 18, dy + 18], fill=(254, 243, 199))
        draw.ellipse([dx - 8, dy - 4, dx - 2, dy + 2], fill=(168, 85, 247))
        draw.ellipse([dx + 2, dy - 4, dx + 8, dy + 2], fill=(168, 85, 247))
        draw.arc([dx - 8, dy + 2, dx + 8, dy + 10], start=0, end=180, fill=(16, 185, 129), width=2)
        # Microfone caindo
        mic_y = min(85, 45 + f * 4)
        draw.ellipse([dx - 28, mic_y, dx - 20, mic_y + 8], fill=(203, 213, 225))
        draw.line([(dx - 24, mic_y + 8), (dx - 24, mic_y + 18)], fill=(71, 85, 105), width=2)

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "🎤 \"Contra dados empiricos, nao ha hype!\"", fill=(216, 180, 254))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide07_dev_reaction.gif")

    # 14. USUÁRIO / CTO: Comemorando o ROI
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(16, 185, 129, 160), width=2)
        draw_pill(draw, 8, 6, "# CTO: ROI Real", (15, 35, 25), (167, 243, 208), (16, 185, 129))
        draw.text((180, 8), "📈 SUCESSO", fill=(16, 185, 129))

        # Confetes caindo
        for i in range(8):
            conf_y = (f * 6 + i * 15) % 80 + 20
            conf_x = 35 + i * 10
            draw.rectangle([conf_x, conf_y, conf_x + 4, conf_y + 4], fill=(250, 204, 21) if i % 2 == 0 else (56, 189, 248))

        # CTO vibrando com os dois punhos cerrados
        cx = 175
        cy = 58
        draw.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=(254, 243, 199))
        draw.ellipse([cx - 8, cy - 4, cx - 2, dy + 2], fill=(16, 185, 129))
        draw.ellipse([cx + 2, cy - 4, cx + 8, dy + 2], fill=(16, 185, 129))
        draw.arc([cx - 8, cy + 2, cx + 8, cy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        draw.text((cx - 30, cy - 15), "🍾", fill=(250, 204, 21))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "💰 \"Economizamos R$ 200 mil em refatoracao!\"", fill=(110, 231, 183))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide07_user_reaction.gif")

    # -------------------------------------------------------------
    # SLIDE 08: A LINHAGEM HISTÓRICA DE 79 ANOS
    # -------------------------------------------------------------
    # 15. DEV: Olhando para as estrelas e gigantes
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(56, 189, 248, 160), width=2)
        draw_pill(draw, 8, 6, "# DEV: Inspiracao", (15, 30, 48), (186, 230, 253), (56, 189, 248))
        draw.text((180, 8), "⭐ 79 ANOS", fill=(250, 204, 21))

        # Estrelas e timeline cósmica
        for i in range(6):
            sx = 35 + i * 15
            sy = 50 + int(6 * math.sin(f * math.pi / 7 + i))
            draw.ellipse([sx, sy, sx + 3, sy + 3], fill=(255, 255, 255))
        draw.line([(35, 75), (105, 75)], fill=(56, 189, 248), width=2)
        draw.text((35, 80), "1945 -> 2026", fill=(148, 163, 184))

        # DEV com olhos brilhando em admiração
        dx = 175
        dy = 58
        draw.ellipse([dx - 18, dy - 18, dx + 18, dy + 18], fill=(254, 243, 199))
        draw.text((dx - 10, dy - 10), "*", fill=(56, 189, 248))
        draw.text((dx + 2, dy - 10), "*", fill=(56, 189, 248))
        draw.ellipse([dx - 5, dy + 4, dx + 5, dy + 12], fill=(16, 185, 129))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "🌌 \"Nos ombros de Bush, Engelbart e Alan Kay!\"", fill=(56, 189, 248))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide08_dev_reaction.gif")

    # 16. USUÁRIO: Maestro regendo a orquestra
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(168, 85, 247, 160), width=2)
        draw_pill(draw, 8, 6, "# USUÁRIO: Maestro", (30, 18, 45), (216, 180, 254), (168, 85, 247))
        draw.text((180, 8), "🎵 SOBERANO", fill=(168, 85, 247))

        # Notas musicais flutuando
        for i in range(4):
            ny = 65 - int(10 * math.sin(f * math.pi / 7 + i))
            nx = 45 + i * 16
            draw.text((nx, ny), "♪", fill=(216, 180, 254))

        # Usuário com batuta de maestro
        ux = 175
        uy = 58
        draw.ellipse([ux - 18, uy - 18, ux + 18, uy + 18], fill=(254, 243, 199))
        draw.ellipse([ux - 8, uy - 4, ux - 2, uy + 2], fill=(168, 85, 247))
        draw.ellipse([ux + 2, uy - 4, ux + 8, uy + 2], fill=(168, 85, 247))
        draw.arc([ux - 8, uy + 2, ux + 8, uy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        # Batuta na mão
        b_angle = math.sin(f * math.pi / 7) * 15
        draw.line([(ux - 18, uy + 5), (ux - 35, uy - 10 + int(b_angle))], fill=(250, 204, 21), width=3)

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "🎼 \"Eu governo a intencao, a IA toca a musica!\"", fill=(216, 180, 254))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide08_user_reaction.gif")

    # -------------------------------------------------------------
    # SLIDE 09: MATRIZ DE HASHTAGS & VISIBILIDADE
    # -------------------------------------------------------------
    # 17. DEV: Clicando em Inscrever-se e compartilhando no grupo
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(244, 63, 94, 160), width=2)
        draw_pill(draw, 8, 6, "# DEV: Comunidade", (30, 15, 25), (253, 164, 175), (244, 63, 94))
        draw.text((180, 8), "🔔 SININHO", fill=(250, 204, 21))

        # Botão Inscrever-se com cursor clicando
        draw.rounded_rectangle([40, 48, 110, 72], radius=4, fill=(204, 0, 0))
        draw.text((46, 54), "INSCREVER", fill=(255, 255, 255))
        # Cursor
        cx = 90 + int(4 * math.sin(f * math.pi / 4))
        draw.polygon([(cx, 68), (cx + 8, 80), (cx + 12, 75)], fill=(255, 255, 255), outline=(0, 0, 0))

        # DEV mandando mensagem no celular rindo
        dx = 175
        dy = 58
        draw.ellipse([dx - 18, dy - 18, dx + 18, dy + 18], fill=(254, 243, 199))
        draw.ellipse([dx - 8, dy - 4, dx - 2, dy + 2], fill=(56, 189, 248))
        draw.ellipse([dx + 2, dy - 4, dx + 8, dy + 2], fill=(56, 189, 248))
        draw.arc([dx - 8, dy + 2, dx + 8, dy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        draw.text((dx - 30, dy - 8), "📲", fill=(56, 189, 248))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "📢 \"Mandando pro canal de devs da firma agora!\"", fill=(248, 113, 113))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide09_dev_reaction.gif")

    # 18. USUÁRIO: Entendendo tudo sem jargão arrogante
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(250, 204, 21, 160), width=2)
        draw_pill(draw, 8, 6, "# USUARIO: Clareza", (35, 30, 15), (254, 240, 138), (250, 204, 21))
        draw.text((180, 8), "* ENTENDI!", fill=(250, 204, 21))

        # Lâmpada brilhando
        l_glow = int(12 + 6 * math.sin(f * math.pi / 7))
        draw.ellipse([70 - l_glow, 55 - l_glow, 70 + l_glow, 55 + l_glow], fill=(250, 204, 21, 90))
        draw.text((64, 45), "*", fill=(250, 204, 21))

        # Usuário tomando notas feliz
        ux = 175
        uy = 58
        draw.ellipse([ux - 18, uy - 18, ux + 18, uy + 18], fill=(254, 243, 199))
        draw.ellipse([ux - 8, uy - 4, ux - 2, uy + 2], fill=(56, 189, 248))
        draw.ellipse([ux + 2, uy - 4, ux + 8, uy + 2], fill=(56, 189, 248))
        draw.arc([ux - 8, uy + 2, ux + 8, uy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        draw.text((ux - 30, uy - 5), "📝", fill=(148, 163, 184))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "🤩 \"Finalmente entendi como software e criado!\"", fill=(253, 224, 71))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide09_user_reaction.gif")

    # -------------------------------------------------------------
    # SLIDE 10: O FUTURO DO SOFTWARE & SOBERANIA
    # -------------------------------------------------------------
    # 19. DEV: Suiting up como Engenheiro 3.0 construindo catedral
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(56, 189, 248, 160), width=2)
        draw_pill(draw, 8, 6, "# ENGENHEIRO 3.0", (15, 30, 48), (186, 230, 253), (56, 189, 248))
        draw.text((180, 8), "🚀 CATEDRAL", fill=(56, 189, 248))

        # Catedral digital se erguendo com lasers azuis
        draw.polygon([(40, 95), (65, 45), (90, 95)], fill=(30, 41, 59), outline=(56, 189, 248), width=2)
        draw.line([(65, 45), (65, 30)], fill=(56, 189, 248), width=3)
        # Laser brilhando
        l_alpha = int(100 + 80 * math.sin(f * math.pi / 7))
        draw.line([(65, 30), (100, 10)], fill=(168, 85, 247, l_alpha), width=2)

        # Engenheiro com armadura tecnológica e olhar focado
        dx = 175
        dy = 58
        draw.ellipse([dx - 18, dy - 18, dx + 18, dy + 18], fill=(254, 243, 199))
        draw.ellipse([dx - 8, dy - 4, dx - 2, dy + 2], fill=(56, 189, 248))
        draw.ellipse([dx + 2, dy - 4, dx + 8, dy + 2], fill=(56, 189, 248))
        draw.arc([dx - 8, dy + 2, dx + 8, dy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        draw.text((dx - 30, dy - 10), "*", fill=(250, 204, 21))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "🏛️ \"Nao digito linhas, governo catedrais!\"", fill=(56, 189, 248))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide10_dev_reaction.gif")

    # 20. USUÁRIO: No topo da montanha com vitória absoluta
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 18, 34, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([1, 1, WIDTH - 2, HEIGHT - 2], outline=(16, 185, 129, 160), width=2)
        draw_pill(draw, 8, 6, "# SOBERANIA", (15, 35, 25), (167, 243, 208), (16, 185, 129))
        draw.text((180, 8), "👑 SUCESSO", fill=(250, 204, 21))

        # Fogos de artifício estourando
        for i in range(5):
            fw_x = 45 + i * 15
            fw_y = 45 + int(8 * math.sin(f * math.pi / 5 + i))
            draw.text((fw_x, fw_y), "*", fill=(250, 204, 21) if i % 2 == 0 else (244, 63, 94))

        # Usuário no topo com troféu e coroa
        ux = 175
        uy = 58
        draw.ellipse([ux - 18, uy - 18, ux + 18, uy + 18], fill=(254, 243, 199))
        draw.ellipse([ux - 8, uy - 4, ux - 2, uy + 2], fill=(16, 185, 129))
        draw.ellipse([ux + 2, uy - 4, ux + 8, uy + 2], fill=(16, 185, 129))
        draw.arc([ux - 8, uy + 2, ux + 8, uy + 12], start=0, end=180, fill=(16, 185, 129), width=3)
        draw.text((ux - 8, uy - 28), "👑", fill=(250, 204, 21))
        draw.text((ux - 30, uy - 5), "🏆", fill=(250, 204, 21))

        draw.rounded_rectangle([6, HEIGHT - 32, WIDTH - 6, HEIGHT - 6], radius=4, fill=(15, 23, 42, 240))
        draw.text((10, HEIGHT - 26), "* \"Soberania e autonomia alcançadas com IA!\"", fill=(110, 231, 183))
        frames.append(img.convert("RGB"))
    save_scaled_gif(frames, "slide10_user_reaction.gif")

    print("=" * 80)
    print("* SUCESSO ABSOLUTO! TODOS OS 20 GIFS ANIMADOS FORAM CRIADOS COM PERFEIÇÃO!")
    print(f"📁 Pasta de Saída: {OUT_DIR}")
    print("=" * 80)

if __name__ == "__main__":
    generate_all_gifs()
