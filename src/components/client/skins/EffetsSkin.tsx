import React, { useEffect, useRef } from 'react';

// Les scènes animées derrière l'espace, pour les cinq skins qui en ont une.
//
// Trois couches, toutes derrière le contenu et toutes sourdes au pointeur :
//   1. une vidéo de fond en boucle (feu, eau, vent, aurore, heure dorée),
//      posée en `fixed` et recouverte d'un voile de la palette pour que le
//      texte garde son contraste. Si le fichier manque, elle s'efface et il ne
//      reste que la suite;
//   2. le voile, qui tombe à presque rien quand il n'y a pas de vidéo;
//   3. un canevas, la couche vivante : c'est elle qui écoute la souris, le
//      survol des boutons et le clic.
//
// Le canevas se peint à un peu plus de la moitié de la définition de l'écran
// et le navigateur l'agrandit. Toutes ces scènes sont faites de lumière molle :
// personne ne voit la différence, et le coût par image tombe d'un facteur
// trois. Tout s'arrête quand l'onglet passe en arrière-plan, et quand la
// personne a demandé moins d'animations une seule image se peint.
//
// Le canevas couvre tout le conteneur, qui est plus haut que l'écran. Ce qui
// doit rester accroché au regard (la lueur du bas chez Pitta, les voiles
// d'Aurore, la lumière du haut chez Kapha) se peint dans `vue`, la portion
// visible, recalculée au défilement.
//
// Emprunts, tous MIT, lus avant d'écrire :
//   · React Bits · Aurora (github.com/DavidHDev/react-bits) : la forme d'une
//     aurore boréale, height = exp(bruit) puis alpha = smoothstep autour d'un
//     point milieu, avec la rampe de couleur le long de l'axe X. C'est
//     l'exponentielle qui fait évaser le bas des voiles.
//   · React Bits · Waves : le champ de Perlin qui déplace une grille, et la
//     physique du curseur (rayon, force, friction, tension, butée) reprise
//     pour le tourbillon de Vata.
//   · Aceternity UI · Vortex : l'idée d'un champ de vecteurs bruité dont on
//     tire des trajectoires plutôt que des particules rondes.

const ECHELLE = 0.55;

interface Couche { video: string; opacite: number; voile: number }
// Les fichiers vivent dans public/compte/skins/. Tant qu'ils ne sont pas là,
// la balise s'efface toute seule à la première erreur et la scène du canevas
// reprend toute sa force.
const COUCHES: Record<string, Couche> = {
  vata: { video: 'vata-vent', opacite: 0.5, voile: 0.62 },
  pitta: { video: 'pitta-feu', opacite: 0.55, voile: 0.6 },
  kapha: { video: 'kapha-eau', opacite: 0.5, voile: 0.64 },
  aurore: { video: 'aurore', opacite: 0.6, voile: 0.58 },
  'golden-hour': { video: 'golden-hour', opacite: 0.55, voile: 0.62 },
};

type RGB = [number, number, number];
interface Zone { x: number; y: number; w: number; h: number }
interface Vue { y: number; h: number }
interface Palette { fond: RGB; accent: RGB; accentClair: RGB }
// `force` tombe autour de 0,55 dès que la vidéo joue : la scène du canevas
// devient alors une couche d'interaction posée dessus, pas un deuxième décor.
interface Force { v: number }

interface Scene {
  frame(t: number, k: number, force: number): void;
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
const TAU = Math.PI * 2;

// Le bruit de Perlin en deux dimensions, écrit à la main : c'est lui qui donne
// au vent sa direction, à l'aurore sa forme et à la poussière sa dérive. La
// table de permutation est tirée une seule fois au chargement du module.
// Repris de la classe Perlin de React Bits · Waves (MIT).
const bruit = (() => {
  const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const src = new Uint8Array(256);
  for (let i = 0; i < 256; i++) src[i] = i;
  for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = src[i]; src[i] = src[j]; src[j] = t; }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = src[i & 255];
  const adoucir = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const pointe = (h: number, dx: number, dy: number) => { const q = g[h & 7]; return q[0] * dx + q[1] * dy; };
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const X = xi & 255, Y = yi & 255;
    const xf = x - xi, yf = y - yi;
    const u = adoucir(xf), v = adoucir(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const h1 = pointe(aa, xf, yf), h2 = pointe(ba, xf - 1, yf);
    const h3 = pointe(ab, xf, yf - 1), h4 = pointe(bb, xf - 1, yf - 1);
    const x1 = h1 + u * (h2 - h1);
    const x2 = h3 + u * (h4 - h3);
    return x1 + v * (x2 - x1);
  };
})();

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

// Un rai de lumière : large, fondu sur ses deux bords et éteint à ses deux
// bouts. C'est la brique des fûts de Vata, des colonnes de Kapha et des rayons
// de l'heure dorée. On le cuit une fois, on le pose ensuite tourné.
const rai = (larg: number, haut: number, c: RGB, force: number) => {
  const cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.round(larg)); cv.height = Math.max(2, Math.round(haut));
  const x = cv.getContext('2d');
  if (!x) return cv;
  const g = x.createLinearGradient(0, 0, cv.width, 0);
  g.addColorStop(0, rgba(c, 0));
  g.addColorStop(0.42, rgba(c, force));
  g.addColorStop(0.58, rgba(c, force));
  g.addColorStop(1, rgba(c, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, cv.width, cv.height);
  const f = x.createLinearGradient(0, 0, 0, cv.height);
  f.addColorStop(0, 'rgba(0,0,0,0)');
  f.addColorStop(0.16, 'rgba(0,0,0,1)');
  f.addColorStop(0.62, 'rgba(0,0,0,0.75)');
  f.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalCompositeOperation = 'destination-in';
  x.fillStyle = f;
  x.fillRect(0, 0, cv.width, cv.height);
  return cv;
};

// Une tuile de lumière, cuite pixel par pixel une seule fois. Les coefficients
// portant u, v et la phase sont entiers : la tuile se répète sans couture et la
// boucle des huit images se referme exactement sur elle-même. Les lignes
// claires courent là où la somme des ondes passe par zéro, exactement la
// lumière au fond d'un bassin.
const tuile = (taille: number, phase: number, c: RGB) =>
  carre(taille, (x, s) => {
    const img = x.createImageData(s, s);
    const d = img.data;
    for (let j = 0; j < s; j++) {
      const v = (j / s) * TAU;
      for (let i = 0; i < s; i++) {
        const u = (i / s) * TAU;
        const n = (Math.sin(2 * u + phase) + Math.sin(3 * v - phase) +
          Math.sin(2 * u + 3 * v + 2 * phase) + Math.sin(5 * v - 2 * u - phase)) / 4;
        const f = Math.max(0, 1 - Math.abs(n) * 4.6) ** 1.7;
        const p = (j * s + i) * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2];
        d[p + 3] = Math.min(255, f * 250);
      }
    }
    x.putImageData(img, 0, 0);
  });

// La nappe : les huit tuiles étalées en motif sur un canevas réduit, puis
// agrandies. L'agrandissement fait le flou, et remplir la nappe coûte deux
// `fillRect` au lieu d'un dessin par tache.
const NAPPE_DIV = 4;
const nappeDeMotif = (w: number, h: number, c: RGB) => {
  const N = 8;
  // Le quart de la définition : la nappe est agrandie ensuite, et c'est cet
  // agrandissement qui fait le flou de l'eau. Remplir au quart plutôt qu'à la
  // moitié divise par quatre le coût de la seule chose vraiment chère de la
  // scène, quatre `fillRect` à motif par image.
  const dw = Math.max(2, Math.round(w / NAPPE_DIV));
  const dh = Math.max(2, Math.round(h / NAPPE_DIV));
  const cv = document.createElement('canvas');
  cv.width = dw; cv.height = dh;
  const cx = cv.getContext('2d');
  const motifs = cx
    ? Array.from({ length: N }, (_, i) => cx.createPattern(tuile(128, (i / N) * TAU, c), 'repeat'))
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
// Le vent ne se voit pas : on ne voit que ce qu'il porte. D'où trois choses
// dessinées ensemble. Un champ de vecteurs de Perlin, échantillonné sur une
// grille grossière et rafraîchi quatre fois par seconde, donne partout la
// direction du souffle. Des filets d'air suivent ce champ sur quatorze pas :
// ce sont eux qui rendent le mouvement lisible. Et trois plans de feuilles et
// de graines de pissenlit se laissent porter dedans, les grandes vite et
// devant, les petites lentes et au fond. Autour du curseur le champ tourne
// (une force tangentielle, pas une répulsion), et le clic lâche une bourrasque.
interface Feuille {
  x: number; y: number; vx: number; vy: number; plan: number;
  ang: number; spin: number; taille: number; graine: boolean;
  face: number; vFace: number; teinte: string; nervure: string; opacite: number;
}

const sceneVata: Fabrique = (ctx, w, h, pal, vue) => {
  const clair = pal.accentClair;
  const sombre = melange(pal.accent, [10, 40, 24], 0.62);
  const nb = Math.round(Math.min(30, Math.max(18, (w * h) / 42000)));
  const fut = rai(220, 900, clair, 0.5);
  const mare = halo(256, melange(pal.accent, clair, 0.4), 0.5, 0.2);

  // Le champ. Une case de 80 px, un angle par case, refait toutes les 240 ms.
  const CASE = 80;
  const cols = Math.ceil(w / CASE) + 2;
  const lignes = Math.ceil(h / CASE) + 2;
  const champ = new Float32Array(cols * lignes * 2);
  let prochainChamp = -1;
  const refaireChamp = (t: number) => {
    prochainChamp = t + 240;
    const z = t * 0.000045;
    for (let j = 0; j < lignes; j++) {
      for (let i = 0; i < cols; i++) {
        // Deux octaves : la grande houle du vent, et le remous par-dessus.
        const n = bruit(i * 0.19 + z, j * 0.19 - z * 0.6) * 1.5
          + bruit(i * 0.52 - z * 1.7, j * 0.52 + z) * 0.55;
        // Le vent va vers la droite : l'angle tourne autour de zéro, il n'en
        // fait jamais le tour. Sans ce cadrage les feuilles partent à reculons.
        const a = n * 1.15;
        const p = (j * cols + i) * 2;
        champ[p] = Math.cos(a); champ[p + 1] = Math.sin(a);
      }
    }
  };
  const lire = (x: number, y: number, hors: [number, number]) => {
    const i = Math.min(cols - 1, Math.max(0, Math.round(x / CASE)));
    const j = Math.min(lignes - 1, Math.max(0, Math.round(y / CASE)));
    const p = (j * cols + i) * 2;
    hors[0] = champ[p]; hors[1] = champ[p + 1];
  };

  const ptr = { x: -9999, y: -9999, actif: false };
  let bourrasque = 0;

  const semer = (f: Feuille, gauche: boolean): Feuille => {
    // Le plan : 0 tout au fond, 1 juste devant les yeux.
    const plan = Math.random() ** 1.4;
    f.plan = plan;
    f.graine = Math.random() < 0.3;
    f.x = gauche ? hasard(-90, -20) : Math.random() * w; f.y = Math.random() * h;
    f.vx = 0.3 + plan * 1.7; f.vy = hasard(-0.2, 0.3);
    f.ang = Math.random() * TAU; f.spin = hasard(-0.02, 0.02);
    f.face = Math.random() * TAU; f.vFace = hasard(0.006, 0.026);
    f.taille = f.graine ? 5 + plan * 9 : 9 + plan * 26;
    f.opacite = 0.32 + plan * 0.6;
    // Le mélange suivait `plan²`, donc tout ce qui n'était pas au premier plan
    // restait à la couleur du fond et disparaissait. En linéaire, une feuille
    // de plan moyen est déjà à mi-chemin de la clarté et se voit.
    const teinte = melange(sombre, clair, 0.2 + plan * 0.8);
    f.teinte = rgba(teinte, 1);
    f.nervure = rgba(melange(teinte, [5, 20, 12], 0.6), 0.8);
    return f;
  };
  const feuilles: Feuille[] = Array.from({ length: nb }, () => semer({} as Feuille, false));
  let prochaine = 0;

  // Les filets d'air : une graine, et à chaque image on intègre le champ
  // depuis elle. Aucun état à traîner, la ligne se reconstruit chaque fois.
  const FILETS = 22;
  const PAS = 14;
  const filets = Array.from({ length: FILETS }, () => ({
    x: Math.random() * w, y: Math.random() * h, v: hasard(0.5, 1.5), ph: Math.random() * TAU,
  }));
  const v: [number, number] = [1, 0];

  return {
    pointeur(x, y) { ptr.x = x; ptr.y = y; ptr.actif = true; },
    clic() { bourrasque = 1; },
    survol(z) {
      // Une petite rafale part du bouton : trois feuilles recyclées, lancées
      // vers le haut. Le nombre de feuilles ne bouge jamais, donc le coût non plus.
      for (let i = 0; i < 3; i++) {
        const f = semer(feuilles[prochaine = (prochaine + 1) % feuilles.length], false);
        f.x = z.x + Math.random() * z.w; f.y = z.y + z.h * 0.5;
        f.taille = f.graine ? 9 : 16 + Math.random() * 12; f.opacite = 0.62;
        f.vx = hasard(1, 3.2); f.vy = hasard(-2.2, -0.7);
        f.spin = hasard(-0.12, 0.12); f.vFace = hasard(0.06, 0.13);
      }
    },
    frame(t, k, force) {
      ctx.clearRect(0, 0, w, h);
      if (t > prochainChamp) refaireChamp(t);
      bourrasque *= 1 - 0.02 * k;
      const bas = vue.y + vue.h;
      ctx.globalCompositeOperation = 'lighter';

      // Trois mares de lumière très larges, à des rythmes premiers entre eux :
      // c'est ce qui empêche le fond d'être un aplat.
      for (let i = 0; i < 3; i++) {
        const p = t * 0.00006 + i * 2.1;
        const r = Math.max(w, vue.h) * (0.5 + 0.14 * Math.sin(p * 1.7 + i));
        const cx = w * (0.2 + 0.3 * i + 0.16 * Math.sin(p * 1.1 + i * 2));
        const cy = vue.y + vue.h * (0.3 + 0.3 * Math.sin(p * 0.9 + i * 1.7));
        ctx.globalAlpha = (0.27 - i * 0.05) * force;
        ctx.drawImage(mare, cx - r, cy - r, r * 2, r * 2);
      }

      // Deux fûts de lumière verte entrent en biais dans la partie visible.
      for (let i = 0; i < 2; i++) {
        const p = t * 0.00008 + i * 2.4;
        const cx = w * (0.26 + 0.46 * (0.5 + 0.5 * Math.sin(p)));
        const lr = Math.max(w, vue.h) * (0.42 + 0.1 * Math.sin(p * 2.1));
        ctx.save();
        ctx.translate(cx, vue.y + vue.h * 0.4);
        ctx.rotate(-0.42 + 0.13 * Math.sin(p * 0.8));
        ctx.globalAlpha = (0.2 + 0.08 * Math.sin(p * 1.7)) * force;
        ctx.drawImage(fut, -lr * 0.3, -vue.h, lr * 0.6, vue.h * 2.2);
        ctx.restore();
      }

      // Les filets d'air.
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(clair, 1);
      for (const fi of filets) {
        fi.x += (0.35 + fi.v * 0.5) * k;
        if (fi.x > w + 60) { fi.x = -60; fi.y = Math.random() * h; }
        if (fi.y + 60 < vue.y || fi.y - 60 > bas) continue;
        let x = fi.x, y = fi.y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < PAS; s++) {
          lire(x, y, v);
          x += v[0] * 15; y += v[1] * 15;
          ctx.lineTo(x, y);
        }
        ctx.globalAlpha = (0.05 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.0009 + fi.ph))) * fi.v * force;
        ctx.lineWidth = 0.8 + fi.v * 1.5;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';

      const rafale = (1 + 0.5 * Math.sin(t * 0.00035) + 0.24 * Math.sin(t * 0.0011 + 1.7)) * (1 + bourrasque * 2);
      for (const f of feuilles) {
        // Le champ porte la feuille; son plan dit à quel point elle s'y colle.
        lire(f.x, f.y, v);
        const cible = (0.3 + f.plan * 1.7) * rafale;
        f.vx += (v[0] * cible - f.vx) * 0.026 * k;
        f.vy += (v[1] * cible * 1.6 - f.vy) * 0.026 * k;

        if (ptr.actif) {
          const dx = f.x - ptr.x, dy = f.y - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 48000) {
            const d = Math.sqrt(d2) || 1;
            const g = (1 - d / 219) ** 2;
            // Tangentielle d'abord : c'est ce qui fait un tourbillon et non un
            // trou. La part radiale sert seulement à ne pas coller au curseur.
            f.vx += (-dy / d * 2.4 + dx / d * 0.7) * g * k;
            f.vy += (dx / d * 2.4 + dy / d * 0.7) * g * k;
            f.spin += (dx / d) * g * 0.03;
            f.vFace = Math.min(0.15, f.vFace + g * 0.008);
          }
        }

        f.vx *= 1 - 0.014 * k; f.vy *= 1 - 0.014 * k;
        f.x += f.vx * k; f.y += f.vy * k;
        f.ang += f.spin * k; f.spin *= 1 - 0.016 * k;
        f.face += f.vFace * k; f.vFace += (0.014 - f.vFace) * 0.01 * k;
        if (f.x > w + 70 || f.y < -80 || f.y > h + 80) { semer(f, true); continue; }
        if (f.y + 50 < vue.y || f.y - 50 > bas) continue;

        const large = Math.max(0.14, Math.abs(Math.cos(f.face)));
        const s = f.taille;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.ang);
        ctx.globalAlpha = f.opacite * (0.55 + 0.45 * large) * force;

        if (f.graine) {
          // Une graine de pissenlit : le grain, la tige, et la couronne de
          // filaments. Rien à voir avec une particule ronde.
          ctx.strokeStyle = f.teinte;
          ctx.lineWidth = Math.max(0.4, s * 0.055);
          ctx.beginPath();
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * TAU + f.face * 0.4;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * s * large, Math.sin(a) * s);
          }
          ctx.stroke();
          ctx.globalAlpha *= 0.8;
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(0, s * 1.5);
          ctx.stroke();
          ctx.fillStyle = f.nervure;
          ctx.beginPath(); ctx.arc(0, s * 1.5, Math.max(0.7, s * 0.11), 0, TAU); ctx.fill();
        } else {
          ctx.scale(large, 1);
          ctx.fillStyle = f.teinte;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.quadraticCurveTo(s * 0.64, -s * 0.1, 0, s);
          ctx.quadraticCurveTo(-s * 0.64, -s * 0.1, 0, -s); ctx.fill();
          if (s > 12) {
            ctx.globalAlpha = f.opacite * large * 0.7 * force;
            ctx.strokeStyle = f.nervure;
            ctx.lineWidth = Math.max(0.5, s * 0.06);
            ctx.beginPath(); ctx.moveTo(0, -s * 0.86); ctx.lineTo(0, s * 0.86);
            for (let i = -2; i <= 2; i++) {
              const y = i * s * 0.3;
              ctx.moveTo(0, y); ctx.lineTo(s * 0.34, y + s * 0.2);
              ctx.moveTo(0, y); ctx.lineTo(-s * 0.34, y + s * 0.2);
            }
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
};

// ── Pitta · le feu ──────────────────────────────────────────────────────────
// La nuit près du feu. Le foyer respire au bas de l'écran, les braises montent
// dans une turbulence de chaleur, et la bande du bas est reprise en tranches
// décalées : c'est la déformation de l'air chaud, celle qui fait onduler
// l'horizon au-dessus d'un feu. Les braises fuient le curseur, puis le champ
// les ramène. Le survol avive la braise, le clic fait jaillir des étincelles.
interface Braise { x: number; y: number; vx: number; vy: number; r: number; vie: number; max: number; chaud: number }
interface Etincelle { x: number; y: number; vx: number; vy: number; vie: number }

const scenePitta: Fabrique = (ctx, w, h, pal, vue) => {
  const chaud = pal.accent;
  const vif = pal.accentClair;
  const gHalo = halo(64, chaud, 0.66, 0.24);
  const gCoeur = halo(24, melange(vif, [255, 246, 214], 0.55), 0.95, 0.4);
  const nb = Math.round(Math.min(58, Math.max(24, (w * h) / 20000)));
  const flares: { x: number; y: number; r: number; vie: number }[] = [];
  let bande: CanvasGradient | null = null;
  let bandeH = 0;
  const ptr = { x: -9999, y: -9999, actif: false };

  // Le canevas de service où la bande du bas est copiée avant d'être reposée
  // en tranches. Il est alloué une fois, à la taille du canevas réel.
  const service = document.createElement('canvas');
  const sctx = service.getContext('2d');

  const semer = (b: Braise, depart: boolean): Braise => {
    b.max = 5200 + Math.random() * 4400; b.chaud = Math.random();
    b.x = Math.random() * w; b.y = depart ? Math.random() * h : h + Math.random() * 60;
    b.vx = (Math.random() - 0.5) * 0.22; b.vy = -(0.24 + Math.random() * 0.58) * Math.max(1, h / 640);
    b.r = 0.6 + Math.random() ** 1.5 * 3; b.vie = depart ? Math.random() * b.max * 0.85 : 0;
    return b;
  };
  const braises: Braise[] = Array.from({ length: nb }, () => semer({} as Braise, true));
  const etincelles: Etincelle[] = [];
  let prochaine = 0;

  return {
    pointeur(x, y) { ptr.x = x; ptr.y = y; ptr.actif = true; },
    survol(z) {
      // Les braises s'avivent autour du bouton : huit d'entre elles repartent
      // de son bord bas, plus grosses et plus rapides, et un halo bat.
      for (let i = 0; i < 8; i++) {
        const b = semer(braises[prochaine = (prochaine + 1) % braises.length], false);
        b.x = z.x + Math.random() * z.w; b.y = z.y + z.h * (0.6 + Math.random() * 0.5);
        b.vx = (Math.random() - 0.5) * 0.6; b.vy = -(0.9 + Math.random() * 1.4);
        b.r = 1.3 + Math.random() * 2.1; b.max = 2600 + Math.random() * 1800;
      }
      if (flares.length < 4) flares.push({ x: z.x + z.w / 2, y: z.y + z.h / 2, r: Math.max(z.w, z.h) * 1.2, vie: 0 });
    },
    clic(x, y) {
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * TAU;
        const v = hasard(1.4, 5.6);
        etincelles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, vie: 1 });
      }
      if (etincelles.length > 90) etincelles.splice(0, etincelles.length - 90);
    },
    frame(t, k, force) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      // Le foyer, accroché au bas de l'écran : une bande qui monte du bord, et
      // deux mares de lumière qui respirent à des rythmes différents, sinon la
      // pulsation se voit comme un clignotant.
      const bas = vue.y + vue.h;
      const souffle = (0.66 + 0.22 * Math.sin(t * 0.00058) + 0.12 * Math.sin(t * 0.0016 + 0.9)) * force;
      const hb = vue.h * 0.5;
      if (!bande || bandeH !== hb) {
        bandeH = hb;
        bande = ctx.createLinearGradient(0, 0, 0, hb);
        bande.addColorStop(0, rgba(chaud, 0));
        bande.addColorStop(0.55, rgba(chaud, 0.18));
        bande.addColorStop(1, rgba(melange(chaud, vif, 0.5), 0.5));
      }
      ctx.save();
      ctx.translate(0, bas - hb);
      ctx.globalAlpha = souffle;
      ctx.fillStyle = bande;
      ctx.fillRect(0, 0, w, hb);
      ctx.restore();
      for (let i = 0; i < 2; i++) {
        const r = vue.h * (0.44 + i * 0.26) * (0.92 + 0.08 * Math.sin(t * 0.0007 + i));
        const cx = w * (0.38 + i * 0.3 + 0.14 * Math.sin(t * 0.00021 + i * 2.2));
        ctx.globalAlpha = (0.32 - i * 0.11) * souffle;
        ctx.drawImage(gHalo, cx - r * 1.4, bas - r * 0.8, r * 2.8, r * 1.6);
      }

      for (let i = flares.length - 1; i >= 0; i--) {
        const f = flares[i];
        f.vie += k * 0.02;
        if (f.vie >= 1) { flares.splice(i, 1); continue; }
        const p = Math.sin(f.vie * Math.PI);
        const r = f.r * (0.7 + f.vie * 0.7);
        ctx.globalAlpha = p * 0.44 * force;
        ctx.drawImage(gHalo, f.x - r, f.y - r, r * 2, r * 2);
      }

      for (const b of braises) {
        b.vie += k * 16.7;
        if (b.vie > b.max || b.y < -25) { semer(b, false); continue; }
        // La turbulence de chaleur : deux fréquences de bruit, l'une lente et
        // large, l'autre courte, et la braise s'y laisse pousser de côté.
        b.vx += (bruit(b.x * 0.004, b.y * 0.004 - t * 0.00022) * 0.05
          + bruit(b.x * 0.014 + 40, b.y * 0.012 - t * 0.0006) * 0.03) * k;
        if (ptr.actif) {
          const dx = b.x - ptr.x, dy = b.y - ptr.y;
          const d2 = dx * dx + dy * dy;
          // Les braises fuient la main; l'amortissement les ramène ensuite
          // dans le courant, sans qu'il faille mémoriser leur place d'origine.
          if (d2 < 26000) {
            const d = Math.sqrt(d2) || 1;
            const g = (1 - d / 161) ** 2 * 1.5;
            b.vx += (dx / d) * g * k; b.vy += (dy / d) * g * k;
          }
        }
        b.vx *= 1 - 0.02 * k;
        b.x += b.vx * k; b.y += b.vy * k;
        if (b.y + 60 < vue.y || b.y - 60 > bas) continue;
        const p = b.vie / b.max;
        const a = (p < 0.14 ? p / 0.14 : p > 0.84 ? (1 - p) / 0.16 : 1) * force;
        const r = b.r * (1 + (1 - p) * 0.35);
        ctx.globalAlpha = a * 0.74;
        ctx.drawImage(gHalo, b.x - r * 7, b.y - r * 7, r * 14, r * 14);
        ctx.globalAlpha = a * (0.62 + b.chaud * 0.34);
        ctx.drawImage(gCoeur, b.x - r * 2, b.y - r * 2, r * 4, r * 4);
      }

      for (let i = etincelles.length - 1; i >= 0; i--) {
        const e = etincelles[i];
        e.vie -= 0.018 * k;
        if (e.vie <= 0) { etincelles.splice(i, 1); continue; }
        e.vx *= 1 - 0.03 * k; e.vy += 0.07 * k;
        e.x += e.vx * k; e.y += e.vy * k;
        const r = 1.8 + e.vie * 3;
        ctx.globalAlpha = e.vie * 0.92 * force;
        ctx.drawImage(gCoeur, e.x - r, e.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // La déformation de chaleur. La bande basse est copiée, puis reposée en
      // tranches horizontales décalées; le décalage part de zéro en haut de la
      // bande, donc la couture ne se voit pas. C'est le même principe qu'un
      // shader de distorsion, en dix lignes et sans WebGL.
      if (sctx) {
        const m = ctx.getTransform();
        const hd = Math.min(vue.h * 0.34, 240);
        const y0 = bas - hd;
        const dy0 = Math.round(y0 * m.d), dh0 = Math.round(hd * m.d), dw0 = Math.round(w * m.a);
        if (dw0 > 1 && dh0 > 1) {
          if (service.width !== dw0 || service.height !== dh0) { service.width = dw0; service.height = dh0; }
          sctx.clearRect(0, 0, dw0, dh0);
          sctx.drawImage(ctx.canvas, 0, dy0, dw0, dh0, 0, 0, dw0, dh0);
          ctx.clearRect(0, y0, w, hd);
          const TR = 16;
          for (let i = 0; i < TR; i++) {
            const u = i / TR;
            const sy = Math.round(u * dh0);
            const sh = Math.ceil(dh0 / TR) + 1;
            const off = Math.sin(t * 0.0022 + u * 7.4) * 5.5 * u * u
              + Math.sin(t * 0.0041 + u * 13) * 2.4 * u;
            ctx.drawImage(service, 0, sy, dw0, sh, off, y0 + u * hd, w, hd / TR + 1);
          }
        }
      }
    },
  };
};

// ── Kapha · l'eau ───────────────────────────────────────────────────────────
// Le fond d'un bassin. Trois choses font l'eau plutôt qu'un papier peint : la
// profondeur, donc la résille de caustiques s'éteint vers le bas et se ramasse
// en flaques au lieu de couvrir partout de la même façon; des colonnes de
// lumière qui tombent de la surface et se balancent; et le poids, donc tout est
// lent et rien ne file. Les bulles montent en zigzag, une ondulation part du
// geste de la main, du survol d'une carte et du clic.
interface Bulle { x: number; y: number; r: number; v: number; phase: number; a: number }
interface Onde { x: number; y: number; r: number; max: number; vie: number; anneau: number }

const sceneKapha: Fabrique = (ctx, w, h, pal, vue) => {
  const clair = pal.accentClair;
  const nappe = nappeDeMotif(w, h, clair);
  // La lumière vient de la surface : la résille s'éteint vers le fond.
  const chute = (() => {
    if (!nappe.cx) return null;
    const g = nappe.cx.createLinearGradient(0, 0, 0, nappe.dh);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.4, 'rgba(0,0,0,0.66)');
    g.addColorStop(1, 'rgba(0,0,0,0.16)');
    return g;
  })();
  const creux = halo(128, [0, 0, 0], 1, 0.42);
  const lueur = halo(128, clair, 0.5, 0.24);
  const colonne = rai(200, 800, melange(clair, [255, 255, 255], 0.45), 0.62);
  const nbBulles = Math.round(Math.min(18, Math.max(9, (w * h) / 62000)));
  const bulles: Bulle[] = Array.from({ length: nbBulles }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: hasard(2.6, 11), v: hasard(0.12, 0.44),
    phase: Math.random() * TAU, a: hasard(0.22, 0.6),
  }));
  const ondes: Onde[] = [];
  const ptr = { x: w / 2, y: h / 2, lx: w / 2, ly: h / 2, dx: 0, dy: 0 };
  const bord = rgba(melange(clair, [255, 255, 255], 0.5), 1);

  return {
    pointeur(x, y) {
      const d = Math.hypot(x - ptr.x, y - ptr.y);
      ptr.x = x; ptr.y = y;
      // Une ondulation naît quand la main a vraiment bougé, jamais à chaque pixel.
      if (d > 44 && ondes.length < 6) ondes.push({ x, y, r: 8, max: hasard(90, 165), vie: 1, anneau: 1.2 });
    },
    survol(z) {
      ondes.push({ x: z.x + z.w / 2, y: z.y + z.h / 2, r: Math.max(z.w, z.h) * 0.34, max: Math.max(z.w, z.h) * 1.6, vie: 1, anneau: 2.6 });
      if (ondes.length > 8) ondes.shift();
    },
    clic(x, y) {
      ondes.push({ x, y, r: 10, max: 340, vie: 1, anneau: 3.4 });
      if (ondes.length > 8) ondes.shift();
    },
    frame(t, k, force) {
      ctx.clearRect(0, 0, w, h);
      ptr.lx += (ptr.x - ptr.lx) * 0.05 * k; ptr.ly += (ptr.y - ptr.ly) * 0.05 * k;
      // Le décalage de la nappe vers la main : la lumière se déforme un peu là
      // où la personne passe, sans jamais partir en vrille.
      ptr.dx += ((ptr.lx / w - 0.5) * 34 - ptr.dx) * 0.025 * k;
      ptr.dy += ((ptr.ly / h - 0.5) * 26 - ptr.dy) * 0.025 * k;
      const bas = vue.y + vue.h;

      if (nappe.cx) {
        const n = nappe.cx;
        n.clearRect(0, 0, nappe.dw, nappe.dh);
        n.globalCompositeOperation = 'lighter';
        nappe.couche(t, 0.00052, 0.52, 1.3, t * 0.0016 + ptr.dx * 0.5, -t * 0.001 + ptr.dy * 0.5);
        nappe.couche(t, 0.00023, 0.3, 2.6, -t * 0.00065 - ptr.dx * 0.3, -t * 0.00035 - ptr.dy * 0.3);
        if (chute) {
          n.globalCompositeOperation = 'destination-in';
          n.globalAlpha = 1;
          n.fillStyle = chute;
          n.fillRect(0, 0, nappe.dw, nappe.dh);
        }
        // Deux grandes zones d'ombre qui traversent lentement : la résille se
        // ramasse en flaques au lieu de tapisser l'écran de façon régulière.
        n.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 2; i++) {
          const p = t * 0.00004 + i * 3.1;
          const r = nappe.dw * (0.5 + 0.16 * Math.sin(p * 1.9));
          const cx = nappe.dw * (0.5 + 0.55 * Math.sin(p + i * 2.3));
          const cy = nappe.dh * (0.35 + 0.4 * Math.sin(p * 1.4 + i));
          n.globalAlpha = 0.72;
          n.drawImage(creux, cx - r, cy - r, r * 2, r * 2);
        }
        n.globalCompositeOperation = 'source-over';
        n.globalAlpha = 1;
        ctx.globalAlpha = force;
        ctx.drawImage(nappe.cv, 0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'lighter';
      // Les colonnes de lumière qui tombent de la surface et se balancent.
      for (let i = 0; i < 4; i++) {
        const p = t * 0.00007 + i * 1.9;
        const cx = w * ((i + 0.5) / 4 + 0.1 * Math.sin(p * 1.3));
        const lr = Math.max(w, vue.h) * (0.3 + 0.08 * Math.sin(p * 2.3 + i));
        ctx.save();
        ctx.translate(cx, vue.y);
        ctx.rotate(0.13 * Math.sin(p * 0.9 + i * 1.6));
        ctx.globalAlpha = (0.3 + 0.12 * Math.sin(p * 1.7 + i)) * force;
        ctx.drawImage(colonne, -lr * 0.4, -vue.h * 0.12, lr * 0.8, vue.h * 1.25);
        ctx.restore();
      }

      // La lumière tombe du haut de l'écran, comme la surface au-dessus.
      const rs = Math.max(w, vue.h) * 0.7;
      ctx.globalAlpha = (0.17 + 0.04 * Math.sin(t * 0.0005)) * force;
      ctx.drawImage(lueur, w * 0.5 - rs, vue.y - rs * 0.66, rs * 2, rs * 1.32);

      const rl = Math.min(w, vue.h) * 0.3;
      ctx.globalAlpha = 0.2 * force;
      ctx.drawImage(lueur, ptr.lx - rl, ptr.ly - rl, rl * 2, rl * 2);

      for (let i = ondes.length - 1; i >= 0; i--) {
        const o = ondes[i];
        o.vie -= 0.01 * k;
        if (o.vie <= 0) { ondes.splice(i, 1); continue; }
        o.r += (o.max - o.r) * 0.04 * k;
        ctx.globalAlpha = o.vie * o.vie * 0.5 * force;
        ctx.strokeStyle = bord; ctx.lineWidth = o.anneau * (0.4 + o.vie);
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.stroke();
        ctx.globalAlpha = o.vie * 0.18 * force;
        ctx.lineWidth = o.anneau * 3 * o.vie;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.72, 0, TAU); ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      for (const b of bulles) {
        b.y -= b.v * k; b.phase += 0.014 * k;
        if (b.y < -16) { b.y = h + hasard(6, 60); b.x = Math.random() * w; }
        if (b.y + 16 < vue.y || b.y - 16 > bas) continue;
        const x = b.x + Math.sin(b.phase) * (7 + b.r);
        ctx.globalAlpha = b.a * force;
        ctx.strokeStyle = bord; ctx.lineWidth = Math.max(0.7, b.r * 0.16);
        ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.stroke();
        ctx.globalAlpha = Math.min(0.9, b.a * 1.7) * force;
        ctx.beginPath(); ctx.fillStyle = bord;
        ctx.arc(x - b.r * 0.34, b.y - b.r * 0.36, Math.max(0.6, b.r * 0.2), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
};

// ── Aurore ──────────────────────────────────────────────────────────────────
// Une vraie aurore boréale, pas des rayures. La recette est celle du shader
// Aurora de React Bits, portée en canevas : pour chaque colonne de l'écran on
// tire une hauteur de rideau avec exp(bruit), et c'est cette exponentielle qui
// évase le bas des voiles et laisse la crête effilée. L'intensité se fond avec
// un smoothstep autour d'un point milieu, et la couleur suit une rampe le long
// de l'axe X, du vert au cyan au violet. Deux rideaux à des phases et des
// vitesses différentes, peints sur un canevas minuscule puis agrandis : c'est
// l'agrandissement qui fait le halo, sans coûter un flou.
const sceneAurore: Fabrique = (ctx, w, h, pal, vue) => {
  const menthe = pal.accent;
  const glace = pal.accentClair;
  const violet: RGB = [138, 102, 224];
  const cyan: RGB = [72, 200, 240];

  const COL = 168;
  const RANG = 96;
  const voile = document.createElement('canvas');
  voile.width = COL; voile.height = RANG;
  const vctx = voile.getContext('2d');

  const ciel = (() => {
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h));
    const x = c.getContext('2d');
    if (!x) return c;
    const nb = Math.round(Math.min(190, (w * h) / 8000));
    for (let i = 0; i < nb; i++) {
      x.globalAlpha = hasard(0.14, 0.78);
      x.fillStyle = i % 6 === 0 ? rgba(glace, 1) : '#ffffff';
      x.beginPath(); x.arc(Math.random() * w, Math.random() * h, hasard(0.35, 1.25), 0, TAU); x.fill();
    }
    return c;
  })();

  // Une colonne de dégradé par couleur, cuite une fois : on la pose ensuite
  // étirée à la hauteur voulue, ce qui remplace un createLinearGradient par
  // colonne et par image.
  const colonneDe = (c: RGB) => {
    const cv = document.createElement('canvas');
    cv.width = 1; cv.height = 64;
    const x = cv.getContext('2d');
    if (!x) return cv;
    const g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, rgba(c, 0));
    g.addColorStop(0.18, rgba(c, 0.55));
    g.addColorStop(0.46, rgba(c, 1));
    g.addColorStop(1, rgba(c, 0));
    x.fillStyle = g; x.fillRect(0, 0, 1, 64);
    return cv;
  };
  const teintes = [colonneDe(menthe), colonneDe(cyan), colonneDe(violet)];

  // Les raies verticales. Une aurore n'est pas un dégradé : elle est faite de
  // rais parallèles alignés sur les lignes du champ magnétique. Les tirer
  // colonne par colonne demanderait de quadrupler la définition du voile; une
  // seule bande rayée, passée en `destination-out` sur le voile fini, donne le
  // même résultat pour un seul drawImage. La bande fait deux fois la largeur
  // du voile : c'est ce qui permet de la faire glisser.
  const raies = carre(2, () => undefined);
  (() => {
    raies.width = COL * 2; raies.height = 1;
    const x = raies.getContext('2d');
    if (!x) return;
    const img = x.createImageData(COL * 2, 1);
    for (let i = 0; i < COL * 2; i++) {
      const v = (0.5 + 0.5 * Math.sin(i * 1.97)) * (0.55 + 0.45 * Math.sin(i * 0.31 + 1.7));
      img.data[i * 4 + 3] = Math.round(v * 190);
    }
    x.putImageData(img, 0, 0);
  })();
  const neon = halo(256, melange(menthe, cyan, 0.35), 0.6, 0.18);
  const ptr = { x: w * 0.5, y: h * 0.3, lx: w * 0.5, ly: h * 0.3, vu: false };
  const brille: { z: Zone; vie: number }[] = [];

  const rideaux = [
    { v: 0.000034, d: 0, amp: 1.0, base: 0.62, a: 0.92, ec: 2.3 },
    { v: 0.000053, d: 3.7, amp: 0.72, base: 0.44, a: 0.6, ec: 3.4 },
  ];

  return {
    pointeur(x, y) { ptr.x = x; ptr.y = y; ptr.vu = true; },
    survol(z) { if (brille.length < 3) brille.push({ z, vie: 1 }); },
    frame(t, k, force) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.62 + 0.12 * Math.sin(t * 0.00048)) * force;
      ctx.drawImage(ciel, 0, 0);

      if (vctx) {
        vctx.clearRect(0, 0, COL, RANG);
        vctx.globalCompositeOperation = 'lighter';
        for (const r of rideaux) {
          const p = t * r.v + r.d;
          for (let i = 0; i < COL; i++) {
            const ux = i / COL;
            // Deux octaves de bruit le long de l'axe X, qui glissent dans le
            // temps : la forme du rideau, et son ondulation propre.
            const n = bruit(ux * r.ec + p * 2.4, p * 5.1) * 1.7
              + bruit(ux * r.ec * 2.9 - p * 3.1, p * 7.3 + 9) * 0.6;
            // L'exponentielle : c'est elle qui évase le bas et effile la crête.
            const haut = Math.exp(n) * 0.42 * r.amp;
            const sommet = RANG * (r.base - haut);
            const longueur = RANG * (0.34 + haut * 1.5);
            // Le smoothstep de l'original devient ici l'alpha de la colonne.
            const brut = 0.5 + 0.5 * Math.sin(ux * 14 + p * 9);
            const inten = r.a * (0.2 + 0.8 * brut * Math.min(1, haut * 1.7));
            // La rampe de couleur le long de X : vert, puis cyan, puis violet.
            const seg = ux < 0.5 ? 0 : 1;
            const f = ux < 0.5 ? ux * 2 : (ux - 0.5) * 2;
            vctx.globalAlpha = inten * (1 - f);
            vctx.drawImage(teintes[seg], i, sommet, 1.6, longueur);
            vctx.globalAlpha = inten * f;
            vctx.drawImage(teintes[seg + 1], i, sommet, 1.6, longueur);
          }
        }
        // Les rais se creusent dans le voile, et glissent lentement.
        vctx.globalCompositeOperation = 'destination-out';
        vctx.globalAlpha = 0.5;
        const gliss = (t * 0.0022) % COL;
        vctx.drawImage(raies, gliss, 0, COL, 1, 0, 0, COL, RANG);
        vctx.globalCompositeOperation = 'source-over';
        vctx.globalAlpha = 1;
        // Le voile couvre la partie visible : les deux tiers hauts sont
        // l'aurore, le bas se perd dans la nuit.
        ctx.globalAlpha = force;
        ctx.drawImage(voile, 0, vue.y, w, vue.h * 0.92);
      }

      if (ptr.vu) {
        ptr.lx += (ptr.x - ptr.lx) * 0.09 * k; ptr.ly += (ptr.y - ptr.ly) * 0.09 * k;
        const r = 210 + 16 * Math.sin(t * 0.0016);
        ctx.globalAlpha = 0.4 * force;
        ctx.drawImage(neon, ptr.lx - r, ptr.ly - r, r * 2, r * 2);
      }

      for (let i = brille.length - 1; i >= 0; i--) {
        const b = brille[i];
        b.vie -= 0.016 * k;
        if (b.vie <= 0) { brille.splice(i, 1); continue; }
        const r = Math.max(b.z.w, b.z.h) * (1 + (1 - b.vie) * 0.8);
        ctx.globalAlpha = b.vie * b.vie * 0.35 * force;
        ctx.drawImage(neon, b.z.x + b.z.w / 2 - r, b.z.y + b.z.h / 2 - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
};

// ── Heure dorée ─────────────────────────────────────────────────────────────
// La dernière heure avant le coucher. Le soleil est hors du cadre, en haut à
// droite; sept rais entrent en biais et respirent à des rythmes premiers entre
// eux. Ce qui fait vrai, ce n'est pas le rai lui-même mais la poussière : elle
// ne se voit QUE dans la lumière, donc chaque grain calcule son écart angulaire
// au rai le plus proche et s'allume en conséquence. Des silhouettes de feuilles
// pendent du haut du cadre et se balancent, à contre-jour. La souris promène un
// halo de flare, et la poussière s'en écarte doucement.
const sceneGoldenHour: Fabrique = (ctx, w, h, pal, vue) => {
  const or = pal.accent;
  const ambre = pal.accentClair;
  const chaud = melange(or, ambre, 0.5);
  const gSoleil = halo(256, ambre, 0.62, 0.2);
  const gGrain = halo(32, melange(ambre, [255, 250, 232], 0.6), 0.95, 0.35);
  const faisceau = rai(180, 1100, chaud, 0.4);
  const feuillage = melange([12, 22, 8], or, 0.06);

  // Le soleil, hors cadre en haut à droite. Tous les rais partent de là.
  const soleil = { x: w * 1.02, y: -h * 0.14 };
  const RAIS = 7;
  const rais = Array.from({ length: RAIS }, (_, i) => ({
    a: 2.06 + i * 0.085 + hasard(-0.016, 0.016),   // vers le bas-gauche
    v: 0.00019 + i * 0.000041,
    d: i * 1.37,
    l: hasard(0.8, 1.25),
  }));

  const nbGrains = Math.round(Math.min(70, Math.max(34, (w * h) / 17000)));
  const grains = Array.from({ length: nbGrains }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: hasard(0.7, 2.6), ph: Math.random() * TAU,
    vx: hasard(-0.1, 0.05), vy: hasard(-0.14, -0.02), lum: 0,
  }));

  const NF = 9;
  const feuilles = Array.from({ length: NF }, (_, i) => ({
    x: (i + 0.5) / NF * w + hasard(-40, 40),
    s: hasard(26, 62), d: hasard(0, TAU), v: hasard(0.00028, 0.00062),
    tige: hasard(30, 92),
  }));

  const ptr = { x: -9999, y: -9999, lx: w * 0.5, ly: h * 0.3, vu: false };

  return {
    pointeur(x, y) { ptr.x = x; ptr.y = y; ptr.vu = true; },
    survol(z) {
      // Le survol souffle sur la poussière autour du bouton : elle monte.
      for (const g of grains) {
        if (g.x < z.x - 60 || g.x > z.x + z.w + 60 || g.y < z.y - 60 || g.y > z.y + z.h + 60) continue;
        g.vy -= hasard(0.1, 0.35); g.vx += hasard(-0.12, 0.12);
      }
    },
    clic(x, y) {
      for (const g of grains) {
        const dx = g.x - x, dy = g.y - y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 240) continue;
        const f = (1 - d / 240) ** 2 * 2.2;
        g.vx += (dx / d) * f; g.vy += (dy / d) * f;
      }
    },
    frame(t, k, force) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const bas = vue.y + vue.h;

      // Le soleil derrière le coin : une grande mare chaude qui respire.
      const rs = Math.max(w, vue.h) * 1.15;
      ctx.globalAlpha = (0.3 + 0.05 * Math.sin(t * 0.00042)) * force;
      ctx.drawImage(gSoleil, soleil.x - rs, vue.y + soleil.y * 0.2 - rs * 0.7, rs * 2, rs * 1.6);

      // Les rais. Chacun oscille autour de son angle et bat à son propre rythme.
      const angles: number[] = [];
      for (let i = 0; i < RAIS; i++) {
        const r = rais[i];
        const p = t * r.v + r.d;
        const a = r.a + 0.05 * Math.sin(p) + 0.022 * Math.sin(p * 2.7 + 1.3);
        angles.push(a);
        const lr = Math.max(w, vue.h) * (0.2 + 0.06 * Math.sin(p * 1.9)) * r.l;
        ctx.save();
        ctx.translate(soleil.x, vue.y + soleil.y * 0.2);
        ctx.rotate(a - Math.PI / 2);
        ctx.globalAlpha = (0.13 + 0.09 * (0.5 + 0.5 * Math.sin(p * 1.6 + i))) * force;
        ctx.drawImage(faisceau, -lr * 0.5, -lr * 0.1, lr, Math.max(w, vue.h) * 2.1);
        ctx.restore();
      }

      // La poussière. Elle ne brille que dans un rai : on mesure l'écart
      // angulaire du grain au rai le plus proche, vu depuis le soleil.
      for (const g of grains) {
        g.ph += 0.006 * k;
        g.vx += (Math.sin(g.ph) * 0.02 - g.vx * 0.014) * k;
        g.vy += (-0.016 - g.vy * 0.014) * k;
        if (ptr.vu) {
          const dx = g.x - ptr.x, dy = g.y - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22000) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / 148) ** 2 * 0.5;
            g.vx += (dx / d) * f * k; g.vy += (dy / d) * f * k;
          }
        }
        g.x += g.vx * k; g.y += g.vy * k;
        if (g.y < -12) { g.y = h + 12; g.x = Math.random() * w; g.vx = hasard(-0.1, 0.05); g.vy = hasard(-0.14, -0.02); }
        if (g.x < -12) g.x = w + 12; else if (g.x > w + 12) g.x = -12;
        if (g.y + 20 < vue.y || g.y - 20 > bas) continue;

        const ag = Math.atan2(g.y - (vue.y + soleil.y * 0.2), g.x - soleil.x);
        let ecart = 9;
        for (let i = 0; i < RAIS; i++) {
          const e = Math.abs(ag - angles[i]);
          if (e < ecart) ecart = e;
        }
        const dans = Math.max(0, 1 - ecart / 0.075) ** 1.6;
        const cible = 0.1 + dans * 0.9;
        g.lum += (cible - g.lum) * 0.07 * k;
        const r = g.r * (1 + g.lum * 1.5);
        ctx.globalAlpha = (0.1 + g.lum * 0.68) * force;
        ctx.drawImage(gGrain, g.x - r * 3, g.y - r * 3, r * 6, r * 6);
      }

      if (ptr.vu) {
        ptr.lx += (ptr.x - ptr.lx) * 0.08 * k; ptr.ly += (ptr.y - ptr.ly) * 0.08 * k;
        const r = 175 + 14 * Math.sin(t * 0.0014);
        ctx.globalAlpha = 0.3 * force;
        ctx.drawImage(gSoleil, ptr.lx - r, ptr.ly - r, r * 2, r * 2);
      }

      // Les feuilles à contre-jour : des silhouettes sombres, donc peintes en
      // opaque par-dessus la lumière, jamais en additif.
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba(feuillage, 1);
      for (const f of feuilles) {
        const a = 0.2 * Math.sin(t * f.v + f.d);
        ctx.save();
        ctx.translate(f.x, vue.y - 8);
        ctx.rotate(a);
        ctx.globalAlpha = 0.5 * force;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, f.tige);
        ctx.strokeStyle = rgba(feuillage, 1); ctx.lineWidth = 2;
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const y = f.tige * (0.25 + i * 0.18);
          const c = i % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.quadraticCurveTo(c * f.s * 0.6, y - f.s * 0.34, c * f.s, y + f.s * 0.1);
          ctx.quadraticCurveTo(c * f.s * 0.5, y + f.s * 0.3, 0, y);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
};

const FABRIQUES: Record<string, Fabrique> = {
  vata: sceneVata, pitta: scenePitta, kapha: sceneKapha,
  aurore: sceneAurore, 'golden-hour': sceneGoldenHour,
};

const EffetsSkin: React.FC<{ skin: string }> = ({ skin }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const voile = useRef<HTMLDivElement>(null);
  const couche = COUCHES[skin];

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
    const vue: Vue = { y: 0, h: window.innerHeight };
    const force: Force = { v: 1 };
    let w = 0, h = 0;
    let scene: Scene | null = null;
    let raf = 0;
    let debut = 0, dernier = 0;
    let rect = canvas.getBoundingClientRect();

    const replacer = () => {
      rect = canvas.getBoundingClientRect();
      vue.h = Math.min(h, window.innerHeight);
      vue.y = Math.min(Math.max(0, -rect.top), Math.max(0, h - vue.h));
    };

    const monter = () => {
      const r = boite.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.max(1, Math.round(w * ECHELLE));
      canvas.height = Math.max(1, Math.round(h * ECHELLE));
      ctx.setTransform(ECHELLE, 0, 0, ECHELLE, 0, 0);
      replacer();
      scene = fabrique(ctx, w, h, pal, vue);
      debut = performance.now();
    };

    const boucle = (now: number) => {
      raf = 0;
      if (!scene) return;
      const k = Math.min(3, (now - dernier) / 16.67) || 1;
      dernier = now;
      scene.frame(now - debut, k, force.v);
      raf = requestAnimationFrame(boucle);
    };
    const partir = () => {
      if (raf || calme.matches || document.hidden || !scene) return;
      dernier = performance.now();
      raf = requestAnimationFrame(boucle);
    };
    const arreter = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    // Scène immobile : une seule image, à un instant choisi pour être jolie.
    const fixe = () => scene?.frame(3600, 1, force.v);
    const refaire = () => { arreter(); monter(); if (calme.matches) fixe(); else partir(); };

    // ── La vidéo de fond ─────────────────────────────────────────────────
    // Elle n'apparaît qu'une fois qu'elle peut vraiment jouer, et elle ne
    // revient jamais si le fichier manque. Tant qu'elle est absente, la scène
    // du canevas garde toute sa force et le voile reste à presque rien.
    const video = vid.current;
    const drap = voile.current;
    let videoVivante = false;
    const videoPrete = () => {
      if (!video || !couche || calme.matches) return;
      videoVivante = true;
      video.style.opacity = String(couche.opacite);
      if (drap) drap.style.opacity = String(couche.voile);
      force.v = 0.55;
      void video.play().catch(() => undefined);
    };
    const videoMorte = () => {
      videoVivante = false;
      if (video) { video.style.opacity = '0'; video.removeAttribute('src'); }
      if (drap) drap.style.opacity = '0.18';
      force.v = 1;
    };
    if (video && couche && !calme.matches) {
      video.addEventListener('loadeddata', videoPrete);
      video.addEventListener('error', videoMorte);
      video.load();
    } else if (video) {
      videoMorte();
    }

    const zoneDe = (el: Element): Zone => {
      const r = el.getBoundingClientRect();
      return { x: r.left - rect.left, y: r.top - rect.top, w: r.width, h: r.height };
    };

    let attente = false;
    let px = 0, py = 0;
    const versLaScene = () => { attente = false; scene?.pointeur?.(px, py); };
    const surPointeur = (e: PointerEvent) => {
      px = e.clientX - rect.left; py = e.clientY - rect.top;
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
    const surVisible = () => {
      if (document.hidden) { arreter(); video?.pause(); }
      else { partir(); if (videoVivante) void video?.play().catch(() => undefined); }
    };

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
      video?.removeEventListener('loadeddata', videoPrete);
      video?.removeEventListener('error', videoMorte);
      video?.pause();
      scene = null;
    };
  }, [skin, couche]);

  if (!FABRIQUES[skin]) return null;
  return (
    <>
      {couche && (
        <video
          ref={vid}
          aria-hidden
          className="skin-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={`/compte/skins/${couche.video}.webp`}
          src={`/compte/skins/${couche.video}.mp4`}
        />
      )}
      {couche && <div ref={voile} aria-hidden className="skin-voile" />}
      <canvas ref={ref} aria-hidden className="skin-scene pointer-events-none absolute inset-0 h-full w-full" />
    </>
  );
};

export default EffetsSkin;
