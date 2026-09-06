import React, { useEffect, useRef } from 'react';

// Les motifs (canvas ou SVG) des skins riches. Une seule couche derrière le
// contenu : la toile pour ce qui bouge (bulles, pétales, paillettes), le voile
// pour ce qui se peint en CSS (profondeur, filigrane, lueur, rayons). Rien ne
// capte les clics, tout s'arrête sous « mouvement réduit » et onglet caché.

type Mode = 'ocean' | 'lotus' | 'or-pur' | 'feminite' | 'teal-orange';

const SKINS_MOTIF = ['ocean', 'encre', 'lotus', 'or-pur', 'feminite', 'teal-orange'];
const SKINS_TOILE: Mode[] = ['ocean', 'lotus', 'or-pur', 'feminite', 'teal-orange'];

// Le grain de pellicule de Sarcelle & Orange : une tuile de bruit cuite une
// seule fois, puis étalée en motif et déplacée au hasard à chaque peinture.
// Comme la toile ne se repeint qu'environ trente fois par seconde, le grain
// bat à la cadence d'une vraie pellicule au lieu de grésiller.
let grainTuile: CanvasPattern | null = null;
const grain = (ctx: CanvasRenderingContext2D) => {
  if (grainTuile) return grainTuile;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const x = c.getContext('2d');
  if (!x) return null;
  const img = x.createImageData(96, 96);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + Math.random() * 135;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() * 255;
  }
  x.putImageData(img, 0, 0);
  grainTuile = ctx.createPattern(c, 'repeat');
  return grainTuile;
};

interface Grain {
  x: number; y: number;
  r: number;   // rayon (bulle), demi-longueur (pétale), demi-largeur (paillette)
  v: number;   // vitesse verticale en px par seconde
  d: number;   // phase de dérive horizontale
  p: number;   // phase de scintillement ou de rotation
  a: number;   // amplitude propre, de 0.45 à 1
}

const entre = (min: number, max: number) => min + Math.random() * (max - min);

const NOMBRE: Record<Mode, number> = { 'or-pur': 40, lotus: 15, ocean: 10, feminite: 18, 'teal-orange': 7 };
const semer = (mode: Mode, w: number, h: number): Grain[] => {
  const n = NOMBRE[mode];
  return Array.from({ length: n }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: mode === 'lotus' ? entre(9, 19) : mode === 'or-pur' ? entre(1.1, 2.4)
      : mode === 'feminite' ? entre(8, 20) : mode === 'teal-orange' ? entre(70, 190) : entre(2, 5),
    v: mode === 'lotus' ? entre(11, 26) : mode === 'or-pur' ? entre(4, 12)
      : mode === 'feminite' ? entre(8, 21) : mode === 'teal-orange' ? entre(2, 7) : entre(9, 22),
    d: entre(0, Math.PI * 2),
    p: entre(0, Math.PI * 2),
    a: entre(0.45, 1),
  }));
};

const avancer = (mode: Mode, grains: Grain[], dt: number, w: number, h: number) => {
  for (const g of grains) {
    if (mode === 'ocean' || mode === 'teal-orange') {
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

  // Féminité · la couronne de la couverture qui se défait : des pétales roses
  // et des feuilles blanches descendent en tournant, lentement. Le pétale est
  // une amande, la feuille une amande plus étroite avec sa nervure : les deux
  // formes se distinguent d'un coup d'oeil, ce qu'un rond ne ferait jamais.
  if (mode === 'feminite') {
    for (const g of grains) {
      const x = g.x + Math.sin(t * 0.00026 + g.d) * 34;
      const feuille = g.a > 0.62;
      ctx.save();
      ctx.translate(x, g.y);
      ctx.rotate(g.p + t * 0.00019 * (g.a > 0.5 ? 1 : -1));
      // La face qui tourne : la forme s'aplatit puis se rouvre, comme un
      // pétale qui bascule dans l'air.
      ctx.scale(Math.max(0.2, Math.abs(Math.cos(t * 0.00042 + g.d))), 1);
      const l = feuille ? g.r * 1.25 : g.r;
      const larg = feuille ? 0.42 : 0.72;
      ctx.beginPath();
      ctx.moveTo(0, -l);
      ctx.quadraticCurveTo(l * larg, 0, 0, l);
      ctx.quadraticCurveTo(-l * larg, 0, 0, -l);
      ctx.fillStyle = feuille
        ? `rgba(243, 241, 232, ${(0.1 + g.a * 0.16).toFixed(3)})`
        : `rgba(217, 138, 163, ${(0.16 + g.a * 0.24).toFixed(3)})`;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = feuille
        ? `rgba(239, 183, 198, ${(0.1 + g.a * 0.12).toFixed(3)})`
        : `rgba(184, 101, 127, ${(0.14 + g.a * 0.18).toFixed(3)})`;
      ctx.stroke();
      if (feuille) {
        ctx.beginPath(); ctx.moveTo(0, -l * 0.8); ctx.lineTo(0, l * 0.8); ctx.stroke();
      }
      ctx.restore();
    }
    return;
  }

  // Sarcelle & Orange · l'étalonnage du cinéma. Des halos de bokeh chauds
  // traversent le champ en montant, et le grain de la pellicule passe
  // par-dessus tout. Rien d'autre : la couleur fait déjà le travail.
  if (mode === 'teal-orange') {
    ctx.globalCompositeOperation = 'lighter';
    for (const g of grains) {
      const x = g.x + Math.sin(t * 0.00019 + g.d) * 46;
      const s = 0.5 + 0.5 * Math.sin(t * 0.00042 * g.a + g.p);
      const r = g.r * (0.82 + s * 0.3);
      const gr = ctx.createRadialGradient(x, g.y, r * 0.12, x, g.y, r);
      const chaud = g.a > 0.5;
      const c = chaud ? '226, 117, 58' : '79, 176, 190';
      gr.addColorStop(0, `rgba(${c}, ${(0.05 + s * 0.05).toFixed(3)})`);
      gr.addColorStop(0.55, `rgba(${c}, ${(0.02 + s * 0.022).toFixed(3)})`);
      gr.addColorStop(1, `rgba(${c}, 0)`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, g.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    const gp = grain(ctx);
    if (gp) {
      // Le motif est décalé au hasard à chaque peinture : sans ce déplacement
      // le grain se fige et devient une texture, pas de la pellicule.
      ctx.save();
      ctx.translate(-Math.random() * 96, -Math.random() * 96);
      ctx.globalAlpha = 0.055;
      ctx.fillStyle = gp;
      ctx.fillRect(0, 0, w + 96, h + 96);
      ctx.restore();
      ctx.globalAlpha = 1;
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
      ctx.fillStyle = `rgba(236, 178, 202, ${(0.12 + g.a * 0.16).toFixed(3)})`;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(255, 214, 231, ${(0.08 + g.a * 0.12).toFixed(3)})`;
      ctx.stroke();
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
