# Découpe une capture pleine page en tranches lisibles : python3 decoupe.py <image> [hauteur]
import sys
from PIL import Image
f = sys.argv[1]
h = int(sys.argv[2]) if len(sys.argv) > 2 else 1700
im = Image.open(f)
for i, y in enumerate(range(0, im.height, h)):
    out = f.rsplit('.', 1)[0] + f'-t{i}.jpg'
    im.crop((0, y, im.width, min(im.height, y + h))).convert('RGB').save(out, quality=70)
    print(out)
