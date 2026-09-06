import React from 'react';

// La signature manuscrite de Krystine (son logo script, version claire).
export const SIGNATURE_URL = '/compte/signature-krystine.png';

// La signature de Krystine St-Laurent en bas à droite de chaque bannière et
// de chaque fond d'écran : le wordmark du site (Cormorant, capitales
// espacées), qui se retire contre cinq niskas (Alex, 6 septembre 2026).
// Le conteneur mesure sa propre largeur (container query) : la signature
// garde la même proportion sur une vignette, dans le hero ou plein écran.
export const AvecSignature: React.FC<{ signe: boolean; className?: string; children: React.ReactNode }> = ({ signe, className = '', children }) => (
  <div className={`relative ${className}`} style={{ containerType: 'inline-size' }}>
    {children}
    {signe && (
      <img
        src={SIGNATURE_URL}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute select-none"
        style={{
          right: '3.2cqw', bottom: '2.6cqw',
          width: 'clamp(54px, 15cqw, 300px)', height: 'auto',
          filter: 'drop-shadow(0 1px 2px rgba(20,16,10,0.55)) drop-shadow(0 0 10px rgba(20,16,10,0.35))',
          opacity: 0.94,
        }}
      />
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

/** Dessine la signature manuscrite sur un canvas, aux mêmes proportions que AvecSignature. */
export const signerCanvas = async (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const logo = await chargerImage(SIGNATURE_URL);
  const largeur = Math.round(Math.min(Math.max(w * 0.15, 54), 300 * (w / 1920) * 6.4));
  const hauteur = Math.round(largeur * (logo.naturalHeight / logo.naturalWidth));
  const marge = w * 0.032;
  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.shadowColor = 'rgba(20, 16, 10, 0.55)';
  ctx.shadowBlur = Math.max(4, w * 0.005);
  ctx.shadowOffsetY = 1;
  ctx.drawImage(logo, w - marge - largeur, h - marge * 0.8 - hauteur, largeur, hauteur);
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
