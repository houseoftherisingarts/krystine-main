import React, { useEffect, useRef } from 'react';

// Les motifs (canvas ou SVG) des skins riches. Une seule couche derrière le
// contenu : la toile pour ce qui bouge (bulles, pétales, paillettes), le voile
// pour ce qui se peint en CSS (profondeur, filigrane, lueur, rayons). Rien ne
// capte les clics, tout s'arrête sous « mouvement réduit » et onglet caché.

type Mode = 'ocean' | 'lotus' | 'or-pur';

const SKINS_MOTIF = ['ocean', 'encre', 'lotus', 'or-pur'];
const SKINS_TOILE: Mode[] = ['ocean', 'lotus', 'or-pur'];

interface Grain {
  x: number; y: number;
  r: number;   // rayon (bulle), demi-longueur (pétale), demi-largeur (paillette)
  v: number;   // vitesse verticale en px par seconde
  d: number;   // phase de dérive horizontale
  p: number;   // phase de scintillement ou de rotation
  a: number;   // amplitude propre, de 0.45 à 1
}

const entre = (min: number, max: number) => min + Math.random() * (max - min);

const semer = (mode: Mode, w: number, h: number): Grain[] => {
  const n = mode === 'or-pur' ? 40 : mode === 'lotus' ? 15 : 10;
  return Array.from({ length: n }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: mode === 'lotus' ? entre(7, 15) : mode === 'or-pur' ? entre(1.1, 2.4) : entre(1.6, 4.2),
    v: mode === 'lotus' ? entre(11, 26) : mode === 'or-pur' ? entre(4, 12) : entre(9, 22),
    d: entre(0, Math.PI * 2),
    p: entre(0, Math.PI * 2),
    a: entre(0.45, 1),
  }));
};

const avancer = (mode: Mode, grains: Grain[], dt: number, w: number, h: number) => {
  for (const g of grains) {
    if (mode === 'ocean') {
      g.y -= g.v * dt;
      if (g.y < -g.r * 3) { g.y = h + g.r * 3; g.x = Math.random() * w; }
    } else {
      g.y += g.v * dt;
      if (g.y > h + g.r * 3) { g.y = -g.r * 3; g.x = Math.random() * w; }
    }
  }
};

const peindre = (ctx: CanvasRenderingContext2D, mode: Mode, grains: Grain[], w: number, h: number, t: number) => {
  ctx.clearRect(0, 0, w, h);

  if (mode === 'ocean') {
    for (const g of grains) {
      const x = g.x + Math.sin(t * 0.0004 + g.d) * 16;
      ctx.beginPath();
      ctx.arc(x, g.y, g.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(141, 211, 214, 0.06)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(141, 211, 214, ${(0.1 + g.a * 0.13).toFixed(3)})`;
      ctx.stroke();
    }
    return;
  }

  if (mode === 'lotus') {
    for (const g of grains) {
      const x = g.x + Math.sin(t * 0.0003 + g.d) * 28;
      ctx.save();
      ctx.translate(x, g.y);
      ctx.rotate(g.p + t * 0.00022 * (g.a > 0.72 ? 1 : -1));
      ctx.beginPath();
      ctx.moveTo(0, -g.r);
      ctx.quadraticCurveTo(g.r * 0.74, 0, 0, g.r);
      ctx.quadraticCurveTo(-g.r * 0.74, 0, 0, -g.r);
      ctx.fillStyle = `rgba(230, 168, 194, ${(0.07 + g.a * 0.11).toFixed(3)})`;
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  for (const g of grains) {
    const s = 0.5 + 0.5 * Math.sin(t * 0.0015 * g.a + g.p);
    const r = g.r * (0.65 + s * 0.7);
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - r * 2.2);
    ctx.lineTo(g.x + r, g.y);
    ctx.lineTo(g.x, g.y + r * 2.2);
    ctx.lineTo(g.x - r, g.y);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 233, 168, ${(0.08 + s * 0.32).toFixed(3)})`;
    ctx.fill();
  }
};

const MotifsSkin: React.FC<{ skin: string }> = ({ skin }) => {
  const toile = useRef<HTMLCanvasElement | null>(null);
  const mode: Mode | null = (SKINS_TOILE as string[]).includes(skin) ? (skin as Mode) : null;

  useEffect(() => {
    const cv = toile.current;
    if (!mode || !cv) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    // La toile est peinte à la moitié de la définition de l'écran puis étirée
    // par le CSS : les formes sont floues et lentes, personne ne voit la
    // différence, et le coût par image tombe d'un facteur quatre. Elle ne se
    // redessine qu'environ trente fois par seconde, jamais à chaque image.
    const ECHELLE = 0.5;
    const PAS = 1000 / 30;
    let w = 0;
    let h = 0;
    let grains: Grain[] = [];
    let raf = 0;
    let dernier = 0;
    let cumul = 0;

    const mesurer = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.max(1, Math.round(w * ECHELLE));
      cv.height = Math.max(1, Math.round(h * ECHELLE));
      ctx.setTransform(ECHELLE, 0, 0, ECHELLE, 0, 0);
      grains = semer(mode, w, h);
    };

    const boucle = (t: number) => {
      raf = requestAnimationFrame(boucle);
      const dt = Math.min((t - dernier) / 1000, 0.05);
      dernier = t;
      cumul += dt * 1000;
      if (cumul < PAS) { avancer(mode, grains, dt, w, h); return; }
      cumul = 0;
      avancer(mode, grains, dt, w, h);
      peindre(ctx, mode, grains, w, h, t);
    };

    const partir = () => {
      if (raf) return;
      dernier = performance.now();
      raf = requestAnimationFrame(boucle);
    };
    const stopper = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const surVisibilite = () => { if (document.hidden) stopper(); else partir(); };

    mesurer();
    partir();
    window.addEventListener('resize', mesurer);
    document.addEventListener('visibilitychange', surVisibilite);

    return () => {
      stopper();
      window.removeEventListener('resize', mesurer);
      document.removeEventListener('visibilitychange', surVisibilite);
    };
  }, [mode]);

  if (!SKINS_MOTIF.includes(skin)) return null;

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
      <div className="motif-voile" style={{ position: 'fixed', inset: 0 }} />
      {mode && (
        <canvas
          ref={toile}
          className="motif-toile"
          style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
};

export default MotifsSkin;
