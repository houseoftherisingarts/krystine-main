# Rend une page d'un PDF en grand : python3 pdf-page.py <pdf> <numéro de page> <sortie.png> [zoom]
import sys, fitz
d = fitz.open(sys.argv[1])
z = float(sys.argv[4]) if len(sys.argv) > 4 else 1.4
d[int(sys.argv[2]) - 1].get_pixmap(matrix=fitz.Matrix(z, z)).save(sys.argv[3])
