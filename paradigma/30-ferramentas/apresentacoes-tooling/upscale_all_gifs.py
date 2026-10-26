import sys
from pathlib import Path
from PIL import Image, ImageSequence

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

DIRS = [
    Path(r"C:\Antigravity - IDD Refrigeração\apresentacao\gifs"),
    Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_perspectiva_tecnica_assets\gifs")
]

print("=" * 80)
print("🚀 UPSCALING DOS 20 GIFS PARA 520x280 (ALTA DEFINIÇÃO PARA 1/3 DA TELA)...")
print("=" * 80)

# Process in the first directory, then copy to second
src_dir = DIRS[0]
dst_dir = DIRS[1]
dst_dir.mkdir(parents=True, exist_ok=True)

for i in range(1, 11):
    for role in ["dev", "user"]:
        gif_name = f"slide{i:02d}_{role}_reaction.gif"
        gif_path = src_dir / gif_name
        if not gif_path.exists():
            print(f"⚠️ Não encontrado: {gif_name}")
            continue

        im = Image.open(gif_path)
        frames = []
        for frame in ImageSequence.Iterator(im):
            f = frame.convert("RGBA").resize((520, 280), Image.Resampling.NEAREST)
            frames.append(f)

        duration = im.info.get('duration', 80)
        frames[0].save(
            gif_path,
            save_all=True,
            append_images=frames[1:],
            duration=duration,
            loop=0
        )
        
        # Copiar para o segundo diretório
        import shutil
        shutil.copy2(gif_path, dst_dir / gif_name)
        print(f"✅ {gif_name}: 520x280 ({gif_path.stat().st_size / 1024:.1f} KB)")

print("\n🎉 Todos os 20 GIFs foram redimensionados para 520x280 em ambas as pastas!")
