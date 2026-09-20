from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

size = 1024
image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

# Layered stone-and-copper frame.
draw.rounded_rectangle((42, 42, 982, 982), radius=190, fill=(5, 15, 14, 255), outline=(203, 147, 72, 255), width=28)
glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
glow_draw.rounded_rectangle((105, 105, 919, 919), radius=150, outline=(80, 176, 145, 170), width=14)
glow = glow.filter(ImageFilter.GaussianBlur(18))
image.alpha_composite(glow)

# Stylized labyrinth gate and split monogram.
gold = (224, 179, 93, 255)
copper = (151, 84, 42, 255)
teal = (78, 139, 117, 220)
draw.rounded_rectangle((215, 180, 809, 850), radius=54, fill=(10, 25, 22, 235), outline=copper, width=22)

for inset in (0, 70, 140):
    left = 270 + inset
    top = 245 + inset
    right = 754 - inset
    bottom = 790 - inset
    draw.arc((left, top, right, bottom), start=180, end=360, fill=gold, width=20)
    draw.line((left, top + 10, left, bottom), fill=teal if inset == 70 else gold, width=20)
    draw.line((right, top + 10, right, bottom), fill=teal if inset == 70 else gold, width=20)

draw.line((245, 790, 430, 790), fill=gold, width=24)
draw.line((335, 565, 335, 790), fill=gold, width=24)
draw.arc((390, 590, 575, 775), start=90, end=360, fill=gold, width=24)
draw.line((575, 610, 575, 775), fill=gold, width=24)
draw.line((585, 790, 779, 790), fill=copper, width=24)
draw.line((682, 570, 682, 790), fill=copper, width=24)

# Central ember.
draw.ellipse((474, 474, 550, 550), fill=(241, 125, 47, 245))
draw.ellipse((490, 490, 534, 534), fill=(255, 220, 151, 255))

image.save("build/icon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
Path("build").mkdir(exist_ok=True)
image.resize((256, 256), Image.Resampling.LANCZOS).save("build/icon.png")
print("generated build/icon.ico and build/icon.png")
