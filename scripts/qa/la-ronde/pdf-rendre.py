# La Ronde : rend chaque PDF reçu en planches (6 pages par image), extrait le texte, mesure la part de rose.
#   python3 -I pdf-rendre.py <dossier des PDF> <dossier de sortie>
import sys, os, colorsys, json
import fitz

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
bilan = {}
for nom in sorted(os.listdir(src)):
    if not nom.lower().endswith('.pdf') or '.original-' in nom:
        continue
    doc = fitz.open(os.path.join(src, nom))
    base = nom[:-4]
    texte, roses, pages = [], [], []
    for i, p in enumerate(doc):
        texte.append(f'\n=== page {i + 1}\n' + p.get_text())
        pix = p.get_pixmap(matrix=fitz.Matrix(0.45, 0.45))
        n, rose = 0, 0
        s = pix.samples
        st = pix.n
        for k in range(0, len(s), st * 7):
            r, g, b = s[k] / 255, s[k + 1] / 255, s[k + 2] / 255
            h, l, sa = colorsys.rgb_to_hls(r, g, b)
            h *= 360
            n += 1
            if sa > 0.22 and 0.35 < l < 0.95 and (295 <= h <= 350 or ((h > 350 or h < 12) and l > 0.72)):
                rose += 1
        part = rose / max(n, 1)
        if part > 0.03:
            roses.append((i + 1, round(part * 100, 1)))
        pages.append(pix)
    # planches de 6 pages
    planches = []
    for k in range(0, len(doc), 6):
        lot = [doc[j] for j in range(k, min(k + 6, len(doc)))]
        w = 3 * 300
        h = 2 * 420
        feuille = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, w, h), False)
        feuille.clear_with(235)
        for j, pg in enumerate(lot):
            r = pg.rect
            z = min(290 / r.width, 410 / r.height)
            pm = pg.get_pixmap(matrix=fitz.Matrix(z, z), alpha=False)
            x, y = (j % 3) * 300 + 5, (j // 3) * 420 + 5
            pm.set_origin(x, y)
            feuille.copy(pm, pm.irect)
        chemin = os.path.join(out, f'{base}-p{k + 1:03d}.png')
        feuille.save(chemin)
        planches.append(chemin)
    with open(os.path.join(out, f'{base}.txt'), 'w') as f:
        f.write(''.join(texte))
    bilan[nom] = {'pages': len(doc), 'roses': roses, 'planches': planches, 'octets': os.path.getsize(os.path.join(src, nom))}
    print(nom, len(doc), 'pages', 'rose:', roses[:8])
with open(os.path.join(out, 'bilan.json'), 'w') as f:
    json.dump(bilan, f, indent=1)
