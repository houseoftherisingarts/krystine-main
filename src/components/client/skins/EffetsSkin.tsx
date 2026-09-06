import React, { useEffect, useRef } from 'react';

// La scène animée derrière l'espace pour les skins légendaires et Aurore.
// Un seul canevas par skin, posé sous le contenu (z-index -1), qui ne capte
// jamais un clic. Quatre scènes, quatre gestes de souris, quatre réponses au
// survol d'un bouton. Tout s'arrête quand l'onglet passe en arrière-plan, et
// quand la personne a demandé moins d'animations une seule image se peint.

const SKINS_ANIMES = new Set(['vata', 'pitta', 'kapha', 'aurore']);

type RGB = [number, number, number];
interface Zone { x: number; y: number; w: number; h: number }

interface Scene {
  frame(t: number, k: number): void;
  pointeur?(x: number, y: number): void;
  survol?(z: Zone): void;
  clic?(x: number, y: number): void;
}

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

// ── Vata · le vent ──────────────────────────────────────────────────────────
// Des feuilles dérivent au vent, elles tournent sur elles-mêmes et se
// présentent tantôt de face tantôt de profil. La souris les écarte.
interface Feuille {
  x: number; y: number; vx: number; vy: number;
  ang: number; spin: number; taille: number;
  face: number; vFace: number; teinte: string; nervure: string; opacite: number;
}

const sceneVata = (ctx: CanvasRenderingContext2D, w: number, h: number, pal: Palette): Scene => {
  const clair = pal.accentClair;
  const sombre = melange(pal.accent, [10, 40, 24], 0.55);
  const nb = Math.round(Math.min(40, Math.max(25, (w * h) / 34000)));
  const souffle = halo(256, clair, 0.5, 0.22);
  const ptr = { x: -9999, y: -9999 };

  const semer = (f: Feuille, gauche: boolean): Feuille => {
    const p = Math.random();
    const teinte = melange(sombre, clair, p * p);
    f.x = gauche ? -30 : Math.random() * w;
    f.y = Math.random() * h;
    f.vx = hasard(0.35, 1.15);
    f.vy = hasard(-0.14, 0.2);
    f.ang = Math.random() * Math.PI * 2;
    f.spin = hasard(-0.014, 0.014);
    f.taille = 4.5 + p * 11;
    f.face = Math.random() * Math.PI * 2;
    f.vFace = hasard(0.006, 0.021);
    f.opacite = 0.2 + p * 0.42;
    f.teinte = rgba(teinte, 1);
    f.nervure = rgba(melange(teinte, [6, 20, 12], 0.5), 0.7);
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
        f.vx = hasard(0.6, 2.4);
        f.vy = hasard(-1.6, -0.5);
        f.spin = hasard(-0.09, 0.09);
        f.vFace = hasard(0.05, 0.1);
      }
    },
    frame(t, k) {
      ctx.clearRect(0, 0, w, h);
      // Le souffle de lumière : deux nappes vertes très lentes, en additif.
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const p = t * 0.00006 + i * 2.1;
        const cx = w * (0.3 + 0.42 * Math.sin(p));
        const cy = h * (0.32 + 0.3 * Math.sin(p * 1.37 + 1.1));
        const r = Math.max(w, h) * (0.55 + 0.12 * Math.sin(p * 2.3));
        ctx.globalAlpha = 0.1 + 0.045 * Math.sin(p * 1.9);
        ctx.drawImage(souffle, cx - r, cy - r * 0.72, r * 2, r * 1.44);
      }
      ctx.globalCompositeOperation = 'source-over';

      const rafale = 1 + 0.5 * Math.sin(t * 0.00035) + 0.24 * Math.sin(t * 0.0011 + 1.7);
      for (const f of feuilles) {
        f.vx += (f.taille * 0.05 * rafale - f.vx) * 0.012 * k;
        f.vy += Math.sin(t * 0.0012 + f.face) * 0.006 * k;

        const dx = f.x - ptr.x, dy = f.y - ptr.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 26000) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / 161) ** 2 * 1.5;
          f.vx += (dx / d) * force * k;
          f.vy += (dy / d) * force * k;
          f.spin += (dx / d) * force * 0.02;
          f.vFace = Math.min(0.12, f.vFace + force * 0.006);
        }

        f.vx *= 1 - 0.012 * k;
        f.vy *= 1 - 0.012 * k;
        f.x += f.vx * k;
        f.y += f.vy * k;
        f.ang += f.spin * k;
        f.spin *= 1 - 0.015 * k;
        f.face += f.vFace * k;
        f.vFace += (0.012 - f.vFace) * 0.01 * k;

        if (f.x > w + 40 || f.y < -50 || f.y > h + 50) semer(f, true);

        const large = Math.max(0.14, Math.abs(Math.cos(f.face)));
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
        ctx.globalAlpha = f.opacite * large * 0.8;
        ctx.strokeStyle = f.nervure;
        ctx.lineWidth = Math.max(0.5, s * 0.075);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.86);
        ctx.lineTo(0, s * 0.86);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
};

// ── Pitta · le feu ──────────────────────────────────────────────────────────
// Les braises du Festival Médiéval, portées ici : montée lente, balancement de
// vent, halo additif. Une lueur respire en bas. Le survol les avive, le clic
// fait jaillir des étincelles.
interface Braise { x: number; y: number; vx: number; vy: number; r: number; vie: number; max: number; chaud: number }
interface Etincelle { x: number; y: number; vx: number; vy: number; vie: number }

const scenePitta = (ctx: CanvasRenderingContext2D, w: number, h: number, pal: Palette): Scene => {
  const chaud = pal.accent;
  const vif = pal.accentClair;
  const gHalo = halo(64, chaud, 0.62, 0.26);
  const gCoeur = halo(24, melange(vif, [255, 245, 210], 0.6), 0.95, 0.4);
  const nb = Math.round(Math.min(72, Math.max(28, (w * h) / 15000)));
  let bas: CanvasGradient | null = null;
  const flares: { x: number; y: number; r: number; vie: number }[] = [];

  const semer = (b: Braise, depart: boolean): Braise => {
    b.max = 5200 + Math.random() * 4200;
    b.x = Math.random() * w;
    b.y = depart ? Math.random() * h : h + Math.random() * 60;
    b.vx = (Math.random() - 0.5) * 0.22;
    b.vy = -(0.22 + Math.random() * 0.5) * Math.max(1, h / 620);
    b.r = 0.6 + Math.random() * 1.8;
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
      // de son bord bas, plus grosses et plus rapides, et un halo pulse.
      for (let i = 0; i < 8; i++) {
        const b = semer(braises[prochaine = (prochaine + 1) % braises.length], false);
        b.x = z.x + Math.random() * z.w;
        b.y = z.y + z.h * (0.6 + Math.random() * 0.5);
        b.vy = -(0.9 + Math.random() * 1.3);
        b.vx = (Math.random() - 0.5) * 0.6;
        b.r = 1.1 + Math.random() * 1.9;
        b.max = 2600 + Math.random() * 1800;
      }
      if (flares.length < 4) flares.push({ x: z.x + z.w / 2, y: z.y + z.h / 2, r: Math.max(z.w, z.h) * 1.15, vie: 0 });
    },
    clic(x, y) {
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = hasard(1.2, 4.6);
        etincelles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, vie: 1 });
      }
      if (etincelles.length > 90) etincelles.splice(0, etincelles.length - 90);
    },
    frame(t, k) {
      ctx.clearRect(0, 0, w, h);
      if (!bas) {
        bas = ctx.createLinearGradient(0, h, 0, h * 0.42);
        bas.addColorStop(0, rgba(chaud, 0.5));
        bas.addColorStop(0.45, rgba(chaud, 0.14));
        bas.addColorStop(1, rgba(chaud, 0));
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.24 + 0.1 * Math.sin(t * 0.00062) + 0.05 * Math.sin(t * 0.0017 + 0.9);
      ctx.fillStyle = bas;
      ctx.fillRect(0, h * 0.42, w, h * 0.58);

      for (let i = flares.length - 1; i >= 0; i--) {
        const f = flares[i];
        f.vie += k * 0.02;
        if (f.vie >= 1) { flares.splice(i, 1); continue; }
        const p = Math.sin(f.vie * Math.PI);
        const r = f.r * (0.7 + f.vie * 0.7);
        ctx.globalAlpha = p * 0.4;
        ctx.drawImage(gHalo, f.x - r, f.y - r, r * 2, r * 2);
      }

      for (const b of braises) {
        b.vie += k * 16.7;
        if (b.vie > b.max || b.y < -25) { semer(b, false); continue; }
        b.vx += Math.sin(b.vie / 640 + b.x * 0.01) * 0.004 * k;
        b.x += b.vx * k;
        b.y += b.vy * k;
        const p = b.vie / b.max;
        const a = p < 0.14 ? p / 0.14 : p > 0.84 ? (1 - p) / 0.16 : 1;
        const r = b.r * (1 + (1 - p) * 0.35);
        ctx.globalAlpha = a * 0.75;
        ctx.drawImage(gHalo, b.x - r * 7, b.y - r * 7, r * 14, r * 14);
        ctx.globalAlpha = a * (0.7 + b.chaud * 0.3);
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
        const r = 1.6 + e.vie * 2.4;
        ctx.globalAlpha = e.vie * 0.9;
        ctx.drawImage(gCoeur, e.x - r, e.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
};

// ── Kapha · l'eau ───────────────────────────────────────────────────────────
// Les caustiques sont cuites une fois : huit tuiles bouclées, calculées pixel
// par pixel à petite taille, puis étalées en motif et fondues l'une dans
// l'autre. Deux nappes, des bulles, et l'eau frémit sous la souris.
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
        const f = Math.max(0, somme / 4) ** 6;
        const p = (j * s + i) * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2];
        d[p + 3] = Math.min(255, f * 340);
      }
    }
    x.putImageData(img, 0, 0);
  });

const sceneKapha = (ctx: CanvasRenderingContext2D, w: number, h: number, pal: Palette): Scene => {
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
      motifs.push(nctx.createPattern(tuileCaustique(80, (i / N) * Math.PI * 2, clair), 'repeat'));
    }
  }
  const lueur = halo(128, clair, 0.4, 0.25);
  const nbBulles = Math.round(Math.min(26, Math.max(12, (w * h) / 46000)));
  const bulles: Bulle[] = Array.from({ length: nbBulles }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: hasard(1.6, 5.6), v: hasard(0.16, 0.62),
    phase: Math.random() * 6.28, a: hasard(0.18, 0.5),
  }));
  const ondes: Onde[] = [];
  const ptr = { x: w / 2, y: h / 2, lx: w / 2, ly: h / 2, dx: 0, dy: 0, semee: false };
  const bord = rgba(melange(clair, [255, 255, 255], 0.4), 1);

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
      if (d > 46 && ondes.length < 6) ondes.push({ x, y, r: 6, max: hasard(70, 130), vie: 1, anneau: 1 });
    },
    survol(z) {
      ondes.push({ x: z.x + z.w / 2, y: z.y + z.h / 2, r: Math.max(z.w, z.h) * 0.34, max: Math.max(z.w, z.h) * 1.5, vie: 1, anneau: 2.4 });
      if (ondes.length > 8) ondes.shift();
    },
    frame(t, k) {
      ctx.clearRect(0, 0, w, h);
      ptr.lx += (ptr.x - ptr.lx) * 0.06 * k;
      ptr.ly += (ptr.y - ptr.ly) * 0.06 * k;
      // Le décalage de la nappe vers la main : la lumière se déforme un peu là
      // où la personne passe, sans jamais partir en vrille.
      ptr.dx += ((ptr.lx / w - 0.5) * 26 - ptr.dx) * 0.03 * k;
      ptr.dy += ((ptr.ly / h - 0.5) * 20 - ptr.dy) * 0.03 * k;

      if (nctx) {
        nctx.clearRect(0, 0, dw, dh);
        nctx.globalCompositeOperation = 'lighter';
        const tt = (t * 0.00042) % 1 * N;
        const i0 = Math.floor(tt) % N;
        const f = tt - Math.floor(tt);
        const d1x = t * 0.0032 + ptr.dx, d1y = -t * 0.0021 + ptr.dy;
        nappeur(i0, (1 - f) * 0.62, 2.35, d1x, d1y);
        nappeur((i0 + 1) % N, f * 0.62, 2.35, d1x, d1y);
        const t2 = (t * 0.00019) % 1 * N;
        const j0 = Math.floor(t2) % N;
        const g = t2 - Math.floor(t2);
        const d2x = -t * 0.0014 - ptr.dx * 0.6, d2y = -t * 0.0008 - ptr.dy * 0.6;
        nappeur(j0, (1 - g) * 0.4, 4.6, d2x, d2y);
        nappeur((j0 + 1) % N, g * 0.4, 4.6, d2x, d2y);
        nctx.globalAlpha = 1;
        ctx.drawImage(nappe, 0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'lighter';
      const rl = Math.min(w, h) * 0.34;
      ctx.globalAlpha = 0.2;
      ctx.drawImage(lueur, ptr.lx - rl, ptr.ly - rl, rl * 2, rl * 2);

      for (let i = ondes.length - 1; i >= 0; i--) {
        const o = ondes[i];
        o.vie -= 0.012 * k;
        if (o.vie <= 0) { ondes.splice(i, 1); continue; }
        o.r += (o.max - o.r) * 0.045 * k;
        ctx.globalAlpha = o.vie * o.vie * 0.42;
        ctx.strokeStyle = bord;
        ctx.lineWidth = o.anneau * (0.4 + o.vie);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = o.vie * 0.16;
        ctx.lineWidth = o.anneau * 3 * o.vie;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      for (const b of bulles) {
        b.y -= b.v * k;
        b.phase += 0.02 * k;
        if (b.y < -12) { b.y = h + hasard(6, 60); b.x = Math.random() * w; }
        const x = b.x + Math.sin(b.phase) * (5 + b.r);
        ctx.globalAlpha = b.a;
        ctx.strokeStyle = bord;
        ctx.lineWidth = Math.max(0.6, b.r * 0.22);
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = b.a * 1.5;
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
// Les voiles sont peints au quart de la résolution puis agrandis : c'est ce qui
// leur donne ce flou sans coûter un filtre. Un glow néon suit la souris; les
// bords des cartes proches s'allument, eux, en CSS (variables posées ici).
const sceneAurore = (ctx: CanvasRenderingContext2D, w: number, h: number, pal: Palette): Scene => {
  const menthe = pal.accent;
  const glace = pal.accentClair;
  const violet: RGB = [138, 107, 214];
  const cyan: RGB = [79, 211, 240];
  const qw = Math.max(2, Math.round(w / 4));
  const qh = Math.max(2, Math.round(h / 4));
  const voile = document.createElement('canvas');
  voile.width = qw; voile.height = qh;
  const vctx = voile.getContext('2d');

  const etoiles = carre(1, () => undefined);
  const ciel = document.createElement('canvas');
  ciel.width = Math.max(2, Math.round(w)); ciel.height = Math.max(2, Math.round(h));
  const cctx = ciel.getContext('2d');
  if (cctx) {
    const nb = Math.round(Math.min(120, (w * h) / 12000));
    for (let i = 0; i < nb; i++) {
      const r = hasard(0.4, 1.25);
      cctx.globalAlpha = hasard(0.16, 0.72);
      cctx.fillStyle = i % 5 === 0 ? rgba(glace, 1) : '#ffffff';
      cctx.beginPath();
      cctx.arc(Math.random() * w, Math.random() * h * 0.92, r, 0, Math.PI * 2);
      cctx.fill();
    }
  }

  const rubans = [
    { c: menthe, c2: violet, ampl: 0.16, vit: 0.000075, dec: 0, larg: 0.3, haut: 0.86, a: 0.5 },
    { c: cyan, c2: menthe, ampl: 0.11, vit: 0.000052, dec: 2.4, larg: 0.22, haut: 0.66, a: 0.4 },
    { c: violet, c2: cyan, ampl: 0.2, vit: 0.000039, dec: 4.9, larg: 0.4, haut: 0.99, a: 0.28 },
  ];
  const neon = halo(256, melange(menthe, cyan, 0.35), 0.55, 0.2);
  const ptr = { x: w * 0.5, y: h * 0.3, lx: w * 0.5, ly: h * 0.3, vu: false };

  const brille: { z: Zone; vie: number }[] = [];

  return {
    pointeur(x, y) { ptr.x = x; ptr.y = y; ptr.vu = true; },
    survol(z) { if (brille.length < 3) brille.push({ z, vie: 1 }); },
    frame(t, k) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      if (cctx) {
        ctx.globalAlpha = 0.62 + 0.14 * Math.sin(t * 0.00048);
        ctx.drawImage(ciel, 0, 0);
      }

      if (vctx) {
        vctx.clearRect(0, 0, qw, qh);
        vctx.globalCompositeOperation = 'lighter';
        for (const r of rubans) {
          const p = t * r.vit + r.dec;
          const g = vctx.createLinearGradient(0, 0, 0, qh * r.haut);
          g.addColorStop(0, rgba(r.c, 0));
          g.addColorStop(0.22, rgba(r.c, r.a));
          g.addColorStop(0.6, rgba(r.c2, r.a * 0.55));
          g.addColorStop(1, rgba(r.c2, 0));
          vctx.fillStyle = g;
          vctx.beginPath();
          const pas = Math.max(4, Math.round(qw / 16));
          vctx.moveTo(-20, -20);
          for (let x = -20; x <= qw + 20; x += pas) {
            const u = x / qw;
            const y = qh * (0.02 + r.ampl * (Math.sin(u * 4.1 + p * 9) + 0.55 * Math.sin(u * 7.3 - p * 13)));
            vctx.lineTo(x, y);
          }
          for (let x = qw + 20; x >= -20; x -= pas) {
            const u = x / qw;
            const y = qh * (r.haut + r.ampl * 0.7 * Math.sin(u * 3.2 - p * 11 + 1.4));
            vctx.lineTo(x, y);
          }
          vctx.closePath();
          vctx.fill();
        }
        vctx.globalAlpha = 1;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(voile, 0, 0, w, h);
      }

      if (ptr.vu) {
        ptr.lx += (ptr.x - ptr.lx) * 0.09 * k;
        ptr.ly += (ptr.y - ptr.ly) * 0.09 * k;
        const r = 190 + 16 * Math.sin(t * 0.0016);
        ctx.globalAlpha = 0.34;
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

interface Palette { fond: RGB; accent: RGB; accentClair: RGB }

const EffetsSkin: React.FC<{ skin: string }> = ({ skin }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!SKINS_ANIMES.has(skin)) return;
    const canvas = ref.current;
    const boite = canvas?.parentElement;
    if (!canvas || !boite) return;
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
    let w = 0, h = 0;
    let scene: Scene | null = null;
    let raf = 0;
    let debut = 0, dernier = 0;
    let rect = canvas.getBoundingClientRect();

    // Aurore seule : les cartes proches du curseur s'allument sur leur bord.
    // Les variables sont déclarées `inherits: false` dans effets.css, donc les
    // poser sur une carte ne recalcule pas tous ses enfants.
    const aurore = skin === 'aurore';
    let cartes: HTMLElement[] = [];
    const memoire = new WeakMap<HTMLElement, number>();
    const recenser = () => {
      cartes = aurore
        ? Array.from(boite.querySelectorAll<HTMLElement>('.rounded-\\[24px\\], .rounded-\\[18px\\]'))
        : [];
    };

    const monter = () => {
      const r = boite.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rect = canvas.getBoundingClientRect();
      scene =
        skin === 'vata' ? sceneVata(ctx, w, h, pal)
        : skin === 'pitta' ? scenePitta(ctx, w, h, pal)
        : skin === 'kapha' ? sceneKapha(ctx, w, h, pal)
        : sceneAurore(ctx, w, h, pal);
      recenser();
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

    const fixe = () => {
      // Scène immobile : une seule image, à un instant choisi pour être jolie.
      if (!scene) return;
      scene.frame(3200, 1);
    };

    const zoneDe = (el: Element): Zone => {
      const r = el.getBoundingClientRect();
      return { x: r.left - rect.left, y: r.top - rect.top, w: r.width, h: r.height };
    };

    let attente = false;
    let px = 0, py = 0;
    const versLaScene = () => {
      attente = false;
      scene?.pointeur?.(px, py);
      if (!aurore || !cartes.length) return;
      for (const carte of cartes) {
        const r = carte.getBoundingClientRect();
        const cx = Math.max(r.left, Math.min(px + rect.left, r.right));
        const cy = Math.max(r.top, Math.min(py + rect.top, r.bottom));
        const d = Math.hypot(px + rect.left - cx, py + rect.top - cy);
        const i = d > 260 ? 0 : Math.round((1 - d / 260) ** 1.6 * 100) / 100;
        if (memoire.get(carte) === i && i === 0) continue;
        memoire.set(carte, i);
        if (i === 0) { carte.style.setProperty('--sk-gi', '0'); continue; }
        carte.style.setProperty('--sk-gx', `${Math.round(px + rect.left - r.left)}px`);
        carte.style.setProperty('--sk-gy', `${Math.round(py + rect.top - r.top)}px`);
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
      if (!el || !boite.contains(el) || calme.matches) return;
      scene?.survol?.(zoneDe(el));
    };
    const surClic = (e: PointerEvent) => {
      if (calme.matches) return;
      scene?.clic?.(e.clientX - rect.left, e.clientY - rect.top);
    };
    const surVisible = () => { if (document.hidden) arreter(); else partir(); };
    const replacer = () => { rect = canvas.getBoundingClientRect(); };
    const surCalme = () => { arreter(); monter(); if (calme.matches) fixe(); else partir(); };

    monter();
    if (calme.matches) fixe(); else partir();

    const ro = new ResizeObserver(() => { arreter(); monter(); if (calme.matches) fixe(); else partir(); });
    ro.observe(boite);
    window.addEventListener('pointermove', surPointeur, { passive: true });
    window.addEventListener('scroll', replacer, { passive: true });
    boite.addEventListener('pointerover', surSurvol);
    boite.addEventListener('pointerdown', surClic);
    document.addEventListener('visibilitychange', surVisible);
    calme.addEventListener('change', surCalme);

    return () => {
      arreter();
      ro.disconnect();
      window.removeEventListener('pointermove', surPointeur);
      window.removeEventListener('scroll', replacer);
      boite.removeEventListener('pointerover', surSurvol);
      boite.removeEventListener('pointerdown', surClic);
      document.removeEventListener('visibilitychange', surVisible);
      calme.removeEventListener('change', surCalme);
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
