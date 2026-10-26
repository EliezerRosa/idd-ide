from PIL import Image, ImageSequence
from pathlib import Path

src = Path(r"C:\Antigravity - IDD Refrigeração\apresentacao\gifs\slide01_dev_reaction.gif")
im = Image.open(src)
frames = []
for frame in ImageSequence.Iterator(im):
    f = frame.convert("RGBA").resize((520, 280), Image.Resampling.NEAREST)
    frames.append(f)

test_out = Path(r"C:\Antigravity - IDD Refrigeração\apresentacao\gifs\test_upscaled.gif")
frames[0].save(
    test_out,
    save_all=True,
    append_images=frames[1:],
    duration=im.info.get('duration', 80),
    loop=0
)
print(f"Original size: {src.stat().st_size} bytes -> Upscaled: {test_out.stat().st_size} bytes")
