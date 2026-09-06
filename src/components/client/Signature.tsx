import React from 'react';

// La signature de Krystine St-Laurent en bas à droite de chaque bannière et
// de chaque fond d'écran : le wordmark du site (Cormorant, capitales
// espacées), qui se retire contre cinq niskas (Alex, 6 septembre 2026).
// Le conteneur mesure sa propre largeur (container query) : la signature
// garde la même proportion sur une vignette, dans le hero ou plein écran.
export const AvecSignature: React.FC<{ signe: boolean; className?: string; children: React.ReactNode }> = ({ signe, className = '', children }) => (
  <div className={`relative ${className}`} style={{ containerType: 'inline-size' }}>
    {children}
    {signe && (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute font-serif font-semibold uppercase whitespace-nowrap leading-none select-none"
        style={{
          right: '3.2cqw', bottom: '3.2cqw',
          fontSize: 'clamp(7px, 1.9cqw, 30px)', letterSpacing: '0.14em',
          color: 'rgba(255, 250, 236, 0.92)',
          textShadow: '0 1px 2px rgba(20, 16, 10, 0.55), 0 0 14px rgba(20, 16, 10, 0.35)',
        }}
      >
        Krystine St-Laurent
      </span>
    )}
  </div>
);

/** Charge une image (même origine) et rend son <img>. */
const chargerImage = (url: string) => new Promise<HTMLImageElement>((ok, ko) => {
  const im = new Image();
  im.crossOrigin = 'anonymous';
  im.onload = () => ok(im);
  im.onerror = () => ko(new Error(`Image introuvable : ${url}`));
  im.src = url;
});

/** Dessine la signature sur un canvas, aux mêmes proportions que AvecSignature. */
export const signerCanvas = async (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const taille = Math.round(w * 0.019);
  const police = `600 ${taille}px "Cormorant Garamond", serif`;
  try { await document.fonts.load(police); } catch { /* police de secours */ }
  ctx.save();
  ctx.font = police;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255, 250, 236, 0.92)';
  ctx.shadowColor = 'rgba(20, 16, 10, 0.55)';
  ctx.shadowBlur = Math.max(2, taille * 0.35);
  ctx.shadowOffsetY = 1;
  const texte = 'KRYSTINE ST-LAURENT';
  const marge = w * 0.032;
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) {
    c.letterSpacing = `${(taille * 0.14).toFixed(2)}px`;
    ctx.fillText(texte, w - marge, h - marge);
  } else {
    // Sans letterSpacing natif : lettre par lettre, de la droite vers la gauche.
    let x = w - marge;
    for (const l of texte.split('').reverse()) {
      ctx.fillText(l, x, h - marge);
      x -= ctx.measureText(l).width + taille * 0.14;
    }
  }
  ctx.restore();
};

/** Télécharge l'image, signée ou non, sous le nom donné (webp). */
export const telechargerImage = async (url: string, nomFichier: string, signe: boolean) => {
  const im = await chargerImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = im.naturalWidth;
  canvas.height = im.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(im, 0, 0);
  if (signe) await signerCanvas(ctx, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.92));
  if (!blob) throw new Error('Export impossible');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
