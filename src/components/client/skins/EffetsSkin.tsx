import React, { useEffect, useRef } from 'react';

// La scène animée derrière l'espace pour les skins légendaires et Aurore.
// Un seul canevas par skin, posé sous le contenu (z-index -1), qui ne capte
// jamais un clic. Quatre scènes, quatre gestes de souris, quatre réponses au
// survol d'un bouton. Tout s'arrête quand l'onglet passe en arrière-plan, et
// quand la personne a demandé moins d'animations une seule image se peint.
//
// Le canevas couvre tout le conteneur, qui est plus haut que l'écran. Ce qui
// doit rester accroché au regard (la lueur du bas chez Pitta, les voiles
// d'Aurore, la lumière du haut chez Kapha) se peint dans `vue`, la portion
// visible, recalculée au défilement.

const SKINS_ANIMES = new Set(['vata', 'pitta', 'kapha', 'aurore']);

type RGB = [number, number, number];
interface Zone { x: number; y: number; w: number; h: number }
interface Vue { y: number; h: number }
interface Palette { fond: RGB; accent: RGB; accentClair: RGB }

interface Scene {
  frame(t: number, k: number): void;
  pointeur?(x: number, y: number): void;
  survol?(z: Zone): void;
  clic?(x: number, y: number): void;
}
type Fabrique = (ctx: CanvasRenderingContext2D, w: number, h: number, pal: Palette, vue: Vue) => Scene;

const hexRgb = (h: string, repli: RGB): RGB => {
  const m = /#?([0-9a-f]{6})/i.exec(h);
  if (!m) return repli;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const melange = (a: RGB, b: RGB, t: number): RGB =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hasard = (a: number, b: number) => a + Math.random() * (b - a);

// Un dégradé radial coûte cher à refaire soixante fois par seconde. On le cuit
// une fois dans un petit canevas et on ne fait plus que le recopier.
const carre = (taille: number, peindre: (x: CanvasRenderingContext2D, s: number) => void) => {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(2, Math.round(taille));
  const x = c.getContext('2d');
  if (x) peindre(x, c.width);
  return c;
};
const halo = (taille: number, c: RGB, force: number, coeur = 0.3) =>
  carre(taille, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, rgba(c, force));
    g.addColorStop(coeur, rgba(c, force * 0.3));
    g.addColorStop(1, rgba(c, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
  });

// Une tuile de lumière, cuite pixel par pixel une seule fois. Les coefficients
// portant u, v et la phase sont entiers : la tuile se répète sans couture et la
// boucle des huit images se referme exactement sur elle-même.
//   résille  → des lignes claires là où la somme des ondes passe par zéro,
//              exactement la lumière au fond d'un bassin;
//   taches   → les crêtes seulement, plus basses en fréquence : le soleil qui
//              tombe à travers le feuillage.
const tuile = (taille: number, phase: number, c: RGB, resille: boolean) =>
  carre(taille, (x, s) => {
    const img = x.createImageData(s, s);
    const d = img.data;
    const TAU = Math.PI * 2;
    const a = resille ? 2 : 1;
    const b = resille ? 3 : 2;
    for (let j = 0; j < s; j++) {
      const v = (j / s) * TAU;
      for (let i = 0; i < s; i++) {
        const u = (i / s) * TAU;
        const n = (Math.sin(a * u + phase) + Math.sin(b * v - phase) +
          Math.sin(a * u + b * v + 2 * phase) + Math.sin((a + b) * v - a * u - phase)) / 4;
        const f = resille ? Math.max(0, 1 - Math.abs(n) * 5.2) ** 1.9 : Math.max(0, n) ** 1.8;
        const p = (j * s + i) * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2];
        d[p + 3] = Math.min(255, f * (resille ? 235 : 150));
      }
    }
    x.putImageData(img, 0, 0);
  });

// La nappe : les huit tuiles étalées en motif sur un canevas de moitié de
// taille, puis agrandies. L'agrandissement fait le flou, et remplir la nappe
// coûte deux `fillRect` au lieu d'un dessin par tache.
const nappeDeMotif = (w: number, h: number, c: RGB, resille: boolean) => {
  const N = 8;
  const dw = Math.max(2, Math.round(w / 2));
  const dh = Math.max(2, Math.round(h / 2));
  const cv = document.createElement('canvas');
  cv.width = dw; cv.height = dh;
  const cx = cv.getContext('2d');
  const motifs = cx
    ? Array.from({ length: N }, (_, i) => cx.createPattern(tuile(resille ? 112 : 96, (i / N) * Math.PI * 2, c, resille), 'repeat'))
    : [];
  const poser = (idx: number, alpha: number, echelle: number, tx: number, ty: number) => {
    const m = motifs[idx];
    if (!cx || !m) return;
    m.setTransform(new DOMMatrix().translateSelf(tx, ty).scaleSelf(echelle));
    cx.globalAlpha = alpha;
    cx.fillStyle = m;
    cx.fillRect(0, 0, dw, dh);
  };
  // Une couche = deux images voisines fondues l'une dans l'autre, ce qui fait
  // l'ondulation. `vitesse` règle la respiration, `echelle` la finesse.
  const couche = (t: number, vitesse: number, alpha: number, echelle: number, tx: number, ty: number) => {
    const tt = ((t * vitesse) % 1) * N;
    const i0 = Math.floor(tt) % N;
    const f = tt - Math.floor(tt);
    poser(i0, (1 - f) * alpha, echelle, tx, ty);
    poser((i0 + 1) % N, f * alpha, echelle, tx, ty);
  };
  return { cv, cx, dw, dh, couche };
};

// ── Vata · le vent ──────────────────────────────────────────────────────────
// Trois plans de feuilles, du lointain au tout proche : les grandes passent
// vite et pâles, les petites traînent au fond. Derrière elles, la lumière
// tachetée du sous-bois glisse lentement. La souris écarte les feuilles et les
// fait tourner sur elles-mêmes.
interface Feuille {
  x: number; y: number; vx: number; vy: number; plan: number;
  ang: number; spin: number; taille: number;
  face: number; vFace: number; teinte: string; nervure: string; opacite: number;
}

const sceneVata: Fabrique = (ctx, w, h, pal, vue) => {
  const clair = pal.accentClair;
  const sombre = melange(pal.accent, [12, 44, 26], 0.6);
  const nb = Math.round(Math.min(48, Math.max(30, (w * h) / 23000)));
  const shaft = halo(256, clair, 0.62, 0.16);
  const taches = nappeDeMotif(w, h, melange(pal.accent, clair, 0.5), false);
  const ptr = { x: -9999, y: -9999 };

  const semer = (f: Feuille, gauche: boolean): Feuille => {
    // Le plan : 0 tout au fond, 1 juste devant les yeux.
    const plan = Math.random() ** 1.5;
    f.plan = plan;
    f.x = gauche ? hasard(-60, -14) : Math.random() * w;
    f.y = Math.random() * h;
    f.vx = 0.22 + plan * 1.5;
    f.vy = hasard(-0.16, 0.24);
    f.ang = Math.random() * Math.PI * 2;
    f.spin = hasard(-0.016, 0.016);
    f.taille = 3.6 + plan * 13;
    f.face = Math.random() * Math.PI * 2;
    f.vFace = hasard(0.005, 0.022);
    f.opacite = 0.16 + plan * 0.5;
    const teinte = melange(sombre, clair, plan * plan);
    f.teinte = rgba(teinte, 1);
    f.nervure = rgba(melange(teinte, [6, 22, 13], 0.55), 0.75);
    return f;
  };
  const feuilles: Feuille[] = Array.from({ length: nb }, () => semer({} as Feuille, false));
  let prochaine = 0;

  return {
    pointeur(x, y) { ptr.x = x; ptr.y = y; },
    survol(z) {
      // Une petite rafale part du bouton : trois feuilles recyclées, lancées
      // vers le haut. Le nombre de feuilles ne bouge jamais, donc le coût non plus.
      for (let i = 0; i < 3; i++) {
        const f = semer(feuilles[prochaine = (prochaine + 1) % feuilles.length], false);
        f.x = z.x + Math.random() * z.w;
        f.y = z.y + z.h * 0.5;
        f.taille = 7 + Math.random() * 7;
        f.opacite = 0.5;
        f.vx = hasard(0.8, 2.6);
        f.vy = hasard(-1.8, -0.6);
        f.spin = hasard(-0.1, 0.1);
        f.vFace = hasard(0.05, 0.11);
      }
    },
    frame(t, k) {
      ctx.clearRect(0, 0, w, h);
      // Deux fûts de lumière verte entrent en biais dans la partie visible,
      // très lents. Sans eux le fond vert reste plat.
      ctx.globalCompositeOperation = 'lighter';
      const bas = vue.y + vue.h;
      for (let i = 0; i < 2; i++) {
        const p = t * 0.00007 + i * 2.4;
        const cx = w * (0.24 + 0.5 * Math.sin(p));
        const cy = vue.y + vue.h * (0.18 + 0.22 * Math.sin(p * 1.3 + 1.1));
        const r = Math.max(w, vue.h) * (0.62 + 0.14 * Math.sin(p * 2.1));
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.5 + 0.14 * Math.sin(p * 0.8));
        ctx.globalAlpha = 0.15 + 0.06 * Math.sin(p * 1.7);
        ctx.drawImage(shaft, -r * 0.42, -r, r * 0.84, r * 2);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';

      const rafale = 1 + 0.52 * Math.sin(t * 0.00035) + 0.26 * Math.sin(t * 0.0011 + 1.7);
      for (const f of feuilles) {
        f.vx += ((0.22 + f.plan * 1.5) * rafale - f.vx) * 0.013 * k;
        f.vy += Math.sin(t * 0.0012 + f.face) * 0.006 * k;

        const dx = f.x - ptr.x, dy = f.y - ptr.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 29000) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / 170) ** 2 * 1.7;
          f.vx += (dx / d) * force * k;
          f.vy += (dy / d) * force * k;
          f.spin += (dx / d) * force * 0.022;
          f.vFace = Math.min(0.13, f.vFace + force * 0.007);
        }

        f.vx *= 1 - 0.012 * k;
        f.vy *= 1 - 0.012 * k;
        f.x += f.vx * k;
        f.y += f.vy * k;
        f.ang += f.spin * k;
        f.spin *= 1 - 0.015 * k;
        f.face += f.vFace * k;
        f.vFace += (0.013 - f.vFace) * 0.01 * k;
        if (f.x > w + 46 || f.y < -56 || f.y > h + 56) semer(f, true);
        if (f.y + 40 < vue.y || f.y - 40 > bas) continue;

        const large = Math.max(0.13, Math.abs(Math.cos(f.face)));
        const s = f.taille;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.ang);
        ctx.scale(large, 1);
        ctx.globalAlpha = f.opacite * (0.55 + 0.45 * large);
        ctx.fillStyle = f.teinte;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.66, -s * 0.12, 0, s);
        ctx.quadraticCurveTo(-s * 0.66, -s * 0.12, 0, -s);
        ctx.fill();
        if (s > 6) {
          ctx.globalAlpha = f.opacite * large * 0.75;
          ctx.strokeStyle = f.nervure;
          ctx.lineWidth = Math.max(0.5, s * 0.07);
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.86);
          ctx.lineTo(0, s * 0.86);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
};

// ── Pitta · le feu ──────────────────────────────────────────────────────────
// Les braises du Festival Médiéval, portées ici : montée lente, balancement de
// vent, halo additif. La lueur du foyer respire au bas de l'écran. Le survol
// avive les braises, le clic fait jaillir des étincelles.
interface Braise { x: number; y: number; vx: number; vy: number; r: number; vie: number; max: number; chaud: number }
interface Etincelle { x: number; y: number; vx: number; vy: number; vie: number }

const scenePitta: Fabrique = (ctx, w, h, pal, vue) => {
  const chaud = pal.accent;
  const vif = pal.accentClair;
  const gHalo = halo(64, chaud, 0.66, 0.24);
  const gCoeur = halo(24, melange(vif, [255, 246, 214], 0.55), 0.95, 0.4);
  const nb = Math.round(Math.min(64, Math.max(26, (w * h) / 17000)));
  const flares: { x: number; y: number; r: number; vie: number }[] = [];

  const semer = (b: Braise, depart: boolean): Braise => {
    b.max = 5200 + Math.random() * 4400;
    b.x = Math.random() * w;
    b.y = depart ? Math.random() * h : h + Math.random() * 60;
    b.vx = (Math.random() - 0.5) * 0.22;
    b.vy = -(0.22 + Math.random() * 0.52) * Math.max(1, h / 640);
    b.r = 0.55 + Math.random() ** 1.6 * 2.6;
    b.vie = depart ? Math.random() * b.max * 0.85 : 0;
    b.chaud = Math.random();
    return b;
  };
  const braises: Braise[] = Array.from({ length: nb }, () => semer({} as Braise, true));
  const etincelles: Etincelle[] = [];
  let prochaine = 0;

  return {
    survol(z) {
      // Les braises s'avivent autour du bouton : huit d'entre elles repartent
      // de son bord bas, plus grosses et plus rapides, et un halo bat.
      for (let i = 0; i < 8; i++) {
        const b = semer(braises[prochaine = (prochaine + 1) % braises.length], false);
        b.x = z.x + Math.random() * z.w;
        b.y = z.y + z.h * (0.6 + Math.random() * 0.5);
        b.vy = -(0.9 + Math.random() * 1.4);
        b.vx = (Math.random() - 0.5) * 0.6;
        b.r = 1.2 + Math.random() * 1.9;
        b.max = 2600 + Math.random() * 1800;
      }
      if (flares.length < 4) flares.push({ x: z.x + z.w / 2, y: z.y + z.h / 2, r: Math.max(z.w, z.h) * 1.2, vie: 0 });
    },
    clic(x, y) {
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = hasard(1.2, 5);
        etincelles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.1, vie: 1 });
      }
      if (etincelles.length > 90) etincelles.splice(0, etincelles.length - 90);
    },
    frame(t, k) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      // Le foyer, accroché au bas de l'écran : trois nappes qui respirent à des
      // rythmes différents, sinon la pulsation se voit comme un clignotant.
      const bas = vue.y + vue.h;
      const souffle = 0.5 + 0.28 * Math.sin(t * 0.00058) + 0.14 * Math.sin(t * 0.0016 + 0.9);
      for (let i = 0; i < 3; i++) {
        const r = vue.h * (0.34 + i * 0.2) * (0.92 + 0.08 * Math.sin(t * 0.0007 + i));
        const cx = w * (0.5 + 0.16 * Math.sin(t * 0.00021 + i * 2.2));
        ctx.globalAlpha = (0.2 - i * 0.05) * souffle;
        ctx.drawImage(gHalo, cx - r * 1.5, bas - r * 0.72, r * 3, r * 1.44);
      }

      for (let i = flares.length - 1; i >= 0; i--) {
        const f = flares[i];
        f.vie += k * 0.02;
        if (f.vie >= 1) { flares.splice(i, 1); continue; }
        const p = Math.sin(f.vie * Math.PI);
        const r = f.r * (0.7 + f.vie * 0.7);
        ctx.globalAlpha = p * 0.42;
        ctx.drawImage(gHalo, f.x - r, f.y - r, r * 2, r * 2);
      }

      for (const b of braises) {
        b.vie += k * 16.7;
        if (b.vie > b.max || b.y < -25) { semer(b, false); continue; }
        b.vx += Math.sin(b.vie / 640 + b.x * 0.01) * 0.004 * k;
        b.x += b.vx * k;
        b.y += b.vy * k;
        if (b.y + 60 < vue.y || b.y - 60 > bas) continue;
        const p = b.vie / b.max;
        const a = p < 0.14 ? p / 0.14 : p > 0.84 ? (1 - p) / 0.16 : 1;
        const r = b.r * (1 + (1 - p) * 0.35);
        ctx.globalAlpha = a * 0.72;
        ctx.drawImage(gHalo, b.x - r * 7, b.y - r * 7, r * 14, r * 14);
        ctx.globalAlpha = a * (0.62 + b.chaud * 0.34);
        ctx.drawImage(gCoeur, b.x - r * 2, b.y - r * 2, r * 4, r * 4);
      }

      for (let i = etincelles.length - 1; i >= 0; i--) {
        const e = etincelles[i];
        e.vie -= 0.018 * k;
        if (e.vie <= 0) { etincelles.splice(i, 1); continue; }
        e.vx *= 1 - 0.03 * k;
        e.vy += 0.07 * k;
        e.x += e.vx * k;
        e.y += e.vy * k;
        const r = 1.6 + e.vie * 2.6;
        ctx.globalAlpha = e.vie * 0.9;
        ctx.drawImage(gCoeur, e.x - r, e.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
};

// ── Kapha · l'eau ───────────────────────────────────────────────────────────
// La caustique est une résille : les lignes claires courent là où la somme des
// ondes passe par zéro, exactement comme la lumière au fond d'un bassin. Huit
// tuiles cuites une fois, bouclées, étalées en motif et fondues l'une dans
// l'autre. Deux nappes à des échelles différentes, des bulles, et l'eau frémit
// sous la souris.
interface Bulle { x: number; y: number; r: number; v: number; phase: number; a: number }
interface Onde { x: number; y: number; r: number; max: number; vie: number; anneau: number }

const tuileCaustique = (taille: number, phase: number, c: RGB) =>
  carre(taille, (x, s) => {
    const img = x.createImageData(s, s);
    const d = img.data;
    const TAU = Math.PI * 2;
    for (let j = 0; j < s; j++) {
      const v = (j / s) * TAU;
      for (let i = 0; i < s; i++) {
        const u = (i / s) * TAU;
        // Coefficients entiers sur u, v et la phase : la tuile se répète sans
        // couture et la boucle des huit images se referme exactement.
        const somme =
          Math.sin(2 * u + phase) +
          Math.sin(3 * v - phase) +
          Math.sin(2 * u + 3 * v + 2 * phase) +
          Math.sin(5 * v - 2 * u - phase);
        const f = Math.max(0, 1 - Math.abs(somme / 4) * 5.2) ** 1.9;
        const p = (j * s + i) * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2];
        d[p + 3] = Math.min(255, f * 235);
      }
    }
    x.putImageData(img, 0, 0);
  });

const sceneKapha: Fabrique = (ctx, w, h, pal, vue) => {
  const clair = pal.accentClair;
  const N = 8;
  const dw = Math.max(2, Math.round(w / 2));
  const dh = Math.max(2, Math.round(h / 2));
  const nappe = document.createElement('canvas');
  nappe.width = dw; nappe.height = dh;
  const nctx = nappe.getContext('2d');
  const motifs: (CanvasPattern | null)[] = [];
  if (nctx) {
    for (let i = 0; i < N; i++) {
      motifs.push(nctx.createPattern(tuileCaustique(112, (i / N) * Math.PI * 2, clair), 'repeat'));
    }
  }
  const lueur = halo(128, clair, 0.45, 0.24);
  const nbBulles = Math.round(Math.min(28, Math.max(13, (w * h) / 42000)));
  const bulles: Bulle[] = Array.from({ length: nbBulles }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: hasard(1.5, 6), v: hasard(0.16, 0.66),
    phase: Math.random() * 6.28, a: hasard(0.2, 0.55),
  }));
  const ondes: Onde[] = [];
  const ptr = { x: w / 2, y: h / 2, lx: w / 2, ly: h / 2, dx: 0, dy: 0 };
  const bord = rgba(melange(clair, [255, 255, 255], 0.45), 1);

  const nappeur = (idx: number, alpha: number, echelle: number, tx: number, ty: number) => {
    const m = motifs[idx];
    if (!nctx || !m) return;
    m.setTransform(new DOMMatrix().translateSelf(tx, ty).scaleSelf(echelle));
    nctx.globalAlpha = alpha;
    nctx.fillStyle = m;
    nctx.fillRect(0, 0, dw, dh);
  };

  return {
    pointeur(x, y) {
      const d = Math.hypot(x - ptr.x, y - ptr.y);
      ptr.x = x; ptr.y = y;
      // Une ondulation naît quand la main a vraiment bougé, jamais à chaque pixel.
      if (d > 44 && ondes.length < 6) ondes.push({ x, y, r: 8, max: hasard(80, 145), vie: 1, anneau: 1 });
    },
    survol(z) {
      ondes.push({ x: z.x + z.w / 2, y: z.y + z.h / 2, r: Math.max(z.w, z.h) * 0.34, max: Math.max(z.w, z.h) * 1.6, vie: 1, anneau: 2.6 });
      if (ondes.length > 8) ondes.shift();
    },
    frame(t, k) {
      ctx.clearRect(0, 0, w, h);
      ptr.lx += (ptr.x - ptr.lx) * 0.06 * k;
      ptr.ly += (ptr.y - ptr.ly) * 0.06 * k;
      // Le décalage de la nappe vers la main : la lumière se déforme un peu là
      // où la personne passe, sans jamais partir en vrille.
      ptr.dx += ((ptr.lx / w - 0.5) * 30 - ptr.dx) * 0.03 * k;
      ptr.dy += ((ptr.ly / h - 0.5) * 22 - ptr.dy) * 0.03 * k;

      if (nctx) {
        nctx.clearRect(0, 0, dw, dh);
        nctx.globalCompositeOperation = 'lighter';
        const tt = ((t * 0.00075) % 1) * N;
        const i0 = Math.floor(tt) % N;
        const f = tt - Math.floor(tt);
        const d1x = t * 0.004 + ptr.dx, d1y = -t * 0.0026 + ptr.dy;
        nappeur(i0, (1 - f) * 0.72, 1.5, d1x, d1y);
        nappeur((i0 + 1) % N, f * 0.72, 1.5, d1x, d1y);
        const t2 = ((t * 0.00031) % 1) * N;
        const j0 = Math.floor(t2) % N;
        const g = t2 - Math.floor(t2);
        const d2x = -t * 0.0016 - ptr.dx * 0.6, d2y = -t * 0.0009 - ptr.dy * 0.6;
        nappeur(j0, (1 - g) * 0.42, 3.2, d2x, d2y);
        nappeur((j0 + 1) % N, g * 0.42, 3.2, d2x, d2y);
        nctx.globalAlpha = 1;
        ctx.drawImage(nappe, 0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'lighter';
      // La lumière tombe du haut de l'écran, comme la surface au-dessus.
      const rs = Math.max(w, vue.h) * 0.62;
      ctx.globalAlpha = 0.13 + 0.03 * Math.sin(t * 0.0005);
      ctx.drawImage(lueur, w * 0.5 - rs, vue.y - rs * 0.62, rs * 2, rs * 1.24);

      const rl = Math.min(w, vue.h) * 0.32;
      ctx.globalAlpha = 0.2;
      ctx.drawImage(lueur, ptr.lx - rl, ptr.ly - rl, rl * 2, rl * 2);

      for (let i = ondes.length - 1; i >= 0; i--) {
        const o = ondes[i];
        o.vie -= 0.012 * k;
        if (o.vie <= 0) { ondes.splice(i, 1); continue; }
        o.r += (o.max - o.r) * 0.045 * k;
        ctx.globalAlpha = o.vie * o.vie * 0.45;
        ctx.strokeStyle = bord;
        ctx.lineWidth = o.anneau * (0.4 + o.vie);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = o.vie * 0.17;
        ctx.lineWidth = o.anneau * 3 * o.vie;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      const bas = vue.y + vue.h;
      for (const b of bulles) {
        b.y -= b.v * k;
        b.phase += 0.02 * k;
        if (b.y < -12) { b.y = h + hasard(6, 60); b.x = Math.random() * w; }
        if (b.y + 12 < vue.y || b.y - 12 > bas) continue;
        const x = b.x + Math.sin(b.phase) * (5 + b.r);
        ctx.globalAlpha = b.a;
        ctx.strokeStyle = bord;
        ctx.lineWidth = Math.max(0.6, b.r * 0.2);
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = Math.min(0.9, b.a * 1.6);
        ctx.beginPath();
        ctx.arc(x - b.r * 0.34, b.y - b.r * 0.36, Math.max(0.5, b.r * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = bord;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
};

// ── Aurore ──────────────────────────────────────────────────────────────────
// Les voiles sont des rideaux verticaux : chacun est fait de rais qui pendent
// du haut de l'écran, de longueurs et d'intensités différentes, penchés. Tout
// est peint au quart de la résolution puis agrandi, et c'est cet agrandissement
// qui donne le flou, sans coûter un filtre. Un glow néon suit la souris; les
// bords des cartes proches s'allument, eux, en CSS.
const sceneAurore: Fabrique = (ctx, w, h, pal, vue) => {
  const menthe = pal.accent;
  const glace = pal.accentClair;
  const violet: RGB = [141, 108, 219];
  const cyan: RGB = [76, 205, 240];
  const qw = Math.max(2, Math.round(w / 4));
  const qh = Math.max(2, Math.round(Math.max(120, vue.h) / 4));
  const voile = document.createElement('canvas');
  voile.width = qw; voile.height = qh;
  const vctx = voile.getContext('2d');

  const ciel = carre(2, () => undefined);
  const cctx = (() => {
    ciel.width = Math.max(2, Math.round(w));
    ciel.height = Math.max(2, Math.round(h));
    const c = ciel.getContext('2d');
    if (!c) return null;
    const nb = Math.round(Math.min(150, (w * h) / 9500));
    for (let i = 0; i < nb; i++) {
      c.globalAlpha = hasard(0.14, 0.7);
      c.fillStyle = i % 6 === 0 ? rgba(glace, 1) : '#ffffff';
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, hasard(0.35, 1.2), 0, Math.PI * 2);
      c.fill();
    }
    return c;
  })();

  const rideaux = [
    { c: menthe, c2: violet, x: 0.26, larg: 0.34, long: 0.62, pen: 0.22, v: 0.000047, d: 0, a: 0.26 },
    { c: cyan, c2: menthe, x: 0.62, larg: 0.26, long: 0.46, pen: -0.16, v: 0.000071, d: 2.3, a: 0.2 },
    { c: violet, c2: cyan, x: 0.86, larg: 0.4, long: 0.74, pen: 0.3, v: 0.000033, d: 4.7, a: 0.15 },
  ];
  const RAIS = 9;
  const neon = halo(256, melange(menthe, cyan, 0.35), 0.6, 0.18);
  const ptr = { x: w * 0.5, y: h * 0.3, lx: w * 0.5, ly: h * 0.3, vu: false };
  const brille: { z: Zone; vie: number }[] = [];

  return {
    pointeur(x, y) { ptr.x = x; ptr.y = y; ptr.vu = true; },
    survol(z) { if (brille.length < 3) brille.push({ z, vie: 1 }); },
    frame(t, k) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      if (cctx) {
        ctx.globalAlpha = 0.6 + 0.12 * Math.sin(t * 0.00048);
        ctx.drawImage(ciel, 0, 0);
      }

      if (vctx) {
        vctx.clearRect(0, 0, qw, qh);
        vctx.globalCompositeOperation = 'lighter';
        for (const r of rideaux) {
          const p = t * r.v + r.d;
          const centre = qw * (r.x + 0.09 * Math.sin(p * 5.5));
          const demi = qw * r.larg * 0.5;
          vctx.setTransform(1, 0, r.pen, 1, 0, 0);
          for (let i = 0; i < RAIS; i++) {
            const u = i / (RAIS - 1);
            const x = centre + (u - 0.5) * 2 * demi + qw * 0.02 * Math.sin(p * 9 + u * 6.2);
            // Chaque rai a sa propre longueur et sa propre intensité, et les
            // deux respirent à des rythmes premiers entre eux.
            const long = qh * r.long * (0.42 + 0.58 * (0.5 + 0.5 * Math.sin(p * 7 + u * 4.1)));
            const haut = qh * 0.02 * Math.sin(p * 6 + u * 3.3);
            const inten = r.a * (0.32 + 0.68 * (0.5 + 0.5 * Math.sin(p * 11 + u * 5.7)));
            const g = vctx.createLinearGradient(0, haut, 0, haut + long);
            g.addColorStop(0, rgba(r.c, inten * 0.35));
            g.addColorStop(0.18, rgba(r.c, inten));
            g.addColorStop(0.62, rgba(r.c2, inten * 0.5));
            g.addColorStop(1, rgba(r.c2, 0));
            vctx.fillStyle = g;
            vctx.fillRect(x - demi / RAIS, haut, (demi * 2.1) / RAIS, long);
          }
          vctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(voile, 0, vue.y, w, qh * 4);
      }

      if (ptr.vu) {
        ptr.lx += (ptr.x - ptr.lx) * 0.09 * k;
        ptr.ly += (ptr.y - ptr.ly) * 0.09 * k;
        const r = 195 + 16 * Math.sin(t * 0.0016);
        ctx.globalAlpha = 0.32;
        ctx.drawImage(neon, ptr.lx - r, ptr.ly - r, r * 2, r * 2);
      }

      for (let i = brille.length - 1; i >= 0; i--) {
        const b = brille[i];
        b.vie -= 0.016 * k;
        if (b.vie <= 0) { brille.splice(i, 1); continue; }
        const r = Math.max(b.z.w, b.z.h) * (1 + (1 - b.vie) * 0.8);
        ctx.globalAlpha = b.vie * b.vie * 0.35;
        ctx.drawImage(neon, b.z.x + b.z.w / 2 - r, b.z.y + b.z.h / 2 - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
};

const FABRIQUES: Record<string, Fabrique> = {
  vata: sceneVata, pitta: scenePitta, kapha: sceneKapha, aurore: sceneAurore,
};

const EffetsSkin: React.FC<{ skin: string }> = ({ skin }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fabrique = FABRIQUES[skin];
    const canvas = ref.current;
    const boite = canvas?.parentElement;
    if (!fabrique || !canvas || !boite) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const jetons = getComputedStyle(boite);
    const lire = (nom: string, repli: RGB) => hexRgb(jetons.getPropertyValue(nom), repli);
    const pal: Palette = {
      fond: lire('--sk-fond', [10, 20, 16]),
      accent: lire('--sk-accent', [143, 209, 122]),
      accentClair: lire('--sk-accent-clair', [198, 240, 176]),
    };

    const calme = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vue: Vue = { y: 0, h: window.innerHeight };
    let w = 0, h = 0;
    let scene: Scene | null = null;
    let raf = 0;
    let debut = 0, dernier = 0;
    let rect = canvas.getBoundingClientRect();

    // Aurore seule : les cartes proches du curseur s'allument sur leur bord.
    // Les variables sont déclarées `inherits: false` dans effets.css, donc les
    // poser sur une carte ne recalcule pas tout son contenu à chaque image.
    const aurore = skin === 'aurore';
    let cartes: HTMLElement[] = [];
    const memoire = new WeakMap<HTMLElement, number>();

    const replacer = () => {
      rect = canvas.getBoundingClientRect();
      vue.h = Math.min(h, window.innerHeight);
      vue.y = Math.min(Math.max(0, -rect.top), Math.max(0, h - vue.h));
    };

    const monter = () => {
      const r = boite.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      replacer();
      scene = fabrique(ctx, w, h, pal, vue);
      cartes = aurore
        ? Array.from(boite.querySelectorAll<HTMLElement>('.rounded-\\[24px\\], .rounded-\\[18px\\]'))
        : [];
      debut = performance.now();
    };

    const boucle = (now: number) => {
      raf = 0;
      if (!scene) return;
      const k = Math.min(3, (now - dernier) / 16.67) || 1;
      dernier = now;
      scene.frame(now - debut, k);
      raf = requestAnimationFrame(boucle);
    };
    const partir = () => {
      if (raf || calme.matches || document.hidden || !scene) return;
      dernier = performance.now();
      raf = requestAnimationFrame(boucle);
    };
    const arreter = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    // Scène immobile : une seule image, à un instant choisi pour être jolie.
    const fixe = () => scene?.frame(3600, 1);
    const refaire = () => { arreter(); monter(); if (calme.matches) fixe(); else partir(); };

    const zoneDe = (el: Element): Zone => {
      const r = el.getBoundingClientRect();
      return { x: r.left - rect.left, y: r.top - rect.top, w: r.width, h: r.height };
    };

    let attente = false;
    let px = 0, py = 0;
    const versLaScene = () => {
      attente = false;
      scene?.pointeur?.(px, py);
      if (!aurore) return;
      const cx0 = px + rect.left, cy0 = py + rect.top;
      for (const carte of cartes) {
        const r = carte.getBoundingClientRect();
        const cx = Math.max(r.left, Math.min(cx0, r.right));
        const cy = Math.max(r.top, Math.min(cy0, r.bottom));
        const d = Math.hypot(cx0 - cx, cy0 - cy);
        const i = d > 260 ? 0 : Math.round((1 - d / 260) ** 1.6 * 100) / 100;
        if (memoire.get(carte) === i) continue;
        memoire.set(carte, i);
        if (i === 0) { carte.style.setProperty('--sk-gi', '0'); continue; }
        carte.style.setProperty('--sk-gx', `${Math.round(cx0 - r.left)}px`);
        carte.style.setProperty('--sk-gy', `${Math.round(cy0 - r.top)}px`);
        carte.style.setProperty('--sk-gi', `${i}`);
      }
    };
    const surPointeur = (e: PointerEvent) => {
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
      if (attente || calme.matches) return;
      attente = true;
      requestAnimationFrame(versLaScene);
    };
    // Délégation : au moment du survol on remonte au bouton ou au lien le plus
    // proche, sans jamais tenir de liste d'écouteurs.
    const surSurvol = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('button, a');
      if (el && !calme.matches) scene?.survol?.(zoneDe(el));
    };
    const surClic = (e: PointerEvent) => {
      if (!calme.matches) scene?.clic?.(e.clientX - rect.left, e.clientY - rect.top);
    };
    const surVisible = () => { if (document.hidden) arreter(); else partir(); };

    monter();
    if (calme.matches) fixe(); else partir();

    const ro = new ResizeObserver(refaire);
    ro.observe(boite);
    window.addEventListener('pointermove', surPointeur, { passive: true });
    window.addEventListener('scroll', replacer, { passive: true });
    window.addEventListener('resize', refaire);
    boite.addEventListener('pointerover', surSurvol);
    boite.addEventListener('pointerdown', surClic);
    document.addEventListener('visibilitychange', surVisible);
    calme.addEventListener('change', refaire);

    return () => {
      arreter();
      ro.disconnect();
      window.removeEventListener('pointermove', surPointeur);
      window.removeEventListener('scroll', replacer);
      window.removeEventListener('resize', refaire);
      boite.removeEventListener('pointerover', surSurvol);
      boite.removeEventListener('pointerdown', surClic);
      document.removeEventListener('visibilitychange', surVisible);
      calme.removeEventListener('change', refaire);
      for (const carte of cartes) {
        carte.style.removeProperty('--sk-gx');
        carte.style.removeProperty('--sk-gy');
        carte.style.removeProperty('--sk-gi');
      }
      scene = null;
    };
  }, [skin]);

  if (!SKINS_ANIMES.has(skin)) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: -1 }}
    />
  );
};

export default EffetsSkin;
