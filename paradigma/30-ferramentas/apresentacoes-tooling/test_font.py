from PIL import Image, ImageDraw, ImageFont

img = Image.new("RGBA", (520, 280), (12, 18, 34, 255))
draw = ImageDraw.Draw(img)
font_bold = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
font_reg = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 18)
draw.text((20, 20), "👤 USUÁRIO: Negócio & Produção", font=font_bold, fill=(254, 215, 170))
draw.text((20, 60), '💥 "Cobrou no cartão e o pedido sumiu?!"', font=font_reg, fill=(244, 63, 94))
img.save(r"C:\Antigravity - IDD Refrigeração\apresentacao\test_font.png")
print("Saved test_font.png successfully")
