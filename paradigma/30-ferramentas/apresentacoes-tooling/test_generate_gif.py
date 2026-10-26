import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(r"C:\Antigravity - IDD Refrigeração\apresentacao\gifs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 280, 160
NUM_FRAMES = 16

def create_sample_gif():
    frames = []
    
    for f in range(NUM_FRAMES):
        img = Image.new("RGBA", (WIDTH, HEIGHT), (10, 16, 32, 255))
        draw = ImageDraw.Draw(img)
        
        # Fundo dinâmico com gradiente e alerta pulsante
        glow_alpha = int(60 + 40 * math.sin(f * math.pi / 8))
        draw.rectangle([0, 0, WIDTH, HEIGHT], fill=(15, 23, 42, 255))
        
        # Borda de alerta vermelho
        draw.rectangle([2, 2, WIDTH - 3, HEIGHT - 3], outline=(244, 63, 94, glow_alpha), width=2)
        
        # Tag superior
        draw.rounded_rectangle([10, 8, 120, 26], radius=4, fill=(244, 63, 94, 40), outline=(244, 63, 94, 180))
        draw.text((16, 10), "💻 REAÇÃO DO DEV", fill=(253, 164, 175))
        
        # Alerta de horário
        draw.text((190, 10), "⏰ 03:42 AM", fill=(245, 158, 11))
        
        # Desenha o monitor do DEV em pânico
        mon_x, mon_y = 70, 40
        draw.rectangle([mon_x, mon_y, mon_x + 90, mon_y + 55], fill=(5, 8, 18), outline=(56, 189, 248), width=2)
        draw.rectangle([mon_x + 35, mon_y + 55, mon_x + 55, mon_y + 68], fill=(30, 41, 59))
        draw.rectangle([mon_x + 20, mon_y + 68, mon_x + 70, mon_y + 73], fill=(56, 189, 248))
        
        # Código quebrado na tela do monitor com erro vermelho piscante
        if f % 4 < 2:
            draw.rectangle([mon_x + 10, mon_y + 15, mon_x + 80, mon_y + 40], fill=(244, 63, 94, 200))
            draw.text((mon_x + 15, mon_y + 20), "FATAL BUG!", fill=(255, 255, 255))
        else:
            draw.text((mon_x + 8, mon_y + 10), "eval(prompt)", fill=(244, 63, 94))
            draw.text((mon_x + 8, mon_y + 24), "undefined is null", fill=(253, 164, 175))
            draw.text((mon_x + 8, mon_y + 38), ">> PANIC <<", fill=(245, 158, 11))
        
        # Chamas animadas saindo do teclado
        flame_offset = int(4 * math.sin(f * math.pi / 4))
        draw.polygon([(mon_x - 10, mon_y + 70), (mon_x + 10, mon_y + 50 + flame_offset), (mon_x + 30, mon_y + 70)], fill=(244, 63, 94, 220))
        draw.polygon([(mon_x + 20, mon_y + 70), (mon_x + 45, mon_y + 45 - flame_offset), (mon_x + 70, mon_y + 70)], fill=(245, 158, 11, 230))
        draw.polygon([(mon_x + 60, mon_y + 70), (mon_x + 85, mon_y + 52 + flame_offset), (mon_x + 105, mon_y + 70)], fill=(244, 63, 94, 220))
        
        # Cabeça do DEV arrancando os cabelos (tremendo de nervoso)
        dev_shake = int(2 * math.cos(f * math.pi / 2))
        dev_x = 200 + dev_shake
        dev_y = 65
        # Rosto pálido de desespero
        draw.ellipse([dev_x - 18, dev_y - 18, dev_x + 18, dev_y + 18], fill=(254, 243, 199), outline=(245, 158, 11), width=1)
        # Olhos esbugalhados
        draw.ellipse([dev_x - 10, dev_y - 6, dev_x - 2, dev_y + 4], fill=(255, 255, 255))
        draw.ellipse([dev_x + 2, dev_y - 6, dev_x + 10, dev_y + 4], fill=(255, 255, 255))
        # Pupilas
        pupil_off = int(math.sin(f * math.pi / 4))
        draw.ellipse([dev_x - 6 + pupil_off, dev_y - 2, dev_x - 4 + pupil_off, dev_y + 1], fill=(0, 0, 0))
        draw.ellipse([dev_x + 4 + pupil_off, dev_y - 2, dev_x + 6 + pupil_off, dev_y + 1], fill=(0, 0, 0))
        # Boca aberta em grito
        draw.ellipse([dev_x - 7, dev_y + 6, dev_x + 7, dev_y + 14], fill=(185, 28, 28))
        # Gotas de suor voando
        sweat_y = (f * 5) % 30
        draw.ellipse([dev_x - 24, dev_y - 10 + sweat_y, dev_x - 20, dev_y - 4 + sweat_y], fill=(56, 189, 248, 200))
        
        # Mãos na cabeça
        draw.ellipse([dev_x - 24, dev_y - 14, dev_x - 14, dev_y - 2], fill=(254, 243, 199))
        draw.ellipse([dev_x + 14, dev_y - 14, dev_x + 24, dev_y - 2], fill=(254, 243, 199))

        # Faixa inferior com legenda e meme
        draw.rounded_rectangle([8, HEIGHT - 38, WIDTH - 8, HEIGHT - 8], radius=6, fill=(15, 25, 48, 240), outline=(56, 189, 248, 80))
        draw.text((14, HEIGHT - 34), "😱 VIBE CODING ÀS 03h DA MANHÃ:", fill=(244, 63, 94))
        draw.text((14, HEIGHT - 21), "\"O LLM jurou que funcionava...\"", fill=(241, 245, 249))

        frames.append(img.convert("RGB"))
        
    out_file = OUT_DIR / "slide01_dev_reaction.gif"
    frames[0].save(
        out_file,
        save_all=True,
        append_images=frames[1:],
        duration=80, # 80ms por frame (~12.5 fps)
        loop=0
    )
    print(f"GIF gerado em: {out_file} ({out_file.stat().st_size} bytes)")

create_sample_gif()
