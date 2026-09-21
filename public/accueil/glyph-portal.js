/**
 * Glyph Portal © 2026 Christian Katzmann. MIT.
 * Origin: UsefulPortal.astro on https://ktzm.dk → UsefulPortal.tsx → ClarityPortal.tsx.
 * A scroll-driven camera through live type. Keep this notice with copies.
 *
 * Port vanille (21 septembre 2026) de _vexel-base/src/vexel/GlyphPortal.tsx pour la
 * page statique de Krystine : le mot TRILOGIE révèle la section « L'œuvre fondatrice,
 * la trilogie d'Origine ». Même géométrie que l'original, sans React : mesure de
 * l'encre au canvas, plus grand disque plein par lettre, clip-path SVG piloté par le
 * défilement, caméra qui entre par la lettre choisie, mouvement réduit respecté,
 * repli statique quand la police n'est pas prête. Le balisage et la feuille de style
 * vivent dans accueil/index.html; ce fichier ne porte que le comportement.
 */

const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
const DEFAULT_FONT = '"Arial Black", "Arial", sans-serif';

/** Plus grand carré plein, en temps linéaire. Contrairement à une devinette de fût, marche dans O, S et Ø. */
function interior(context, char, font) {
  const canvas = context.canvas;
  context.font = font;
  const m = context.measureText(char);
  const pad = 8;
  const left = Math.ceil(m.actualBoundingBoxLeft);
  const ascent = Math.ceil(m.actualBoundingBoxAscent);
  canvas.width = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2);
  canvas.height = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2);
  context.font = font;
  context.fontKerning = 'none';
  context.fillText(char, pad + left, pad + ascent);
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const rows = new Uint16Array(width + 1);
  let size = 0, bx = 0, by = 0;
  for (let y = 0; y < height; y++) {
    let diagonal = 0;
    for (let x = 0; x < width; x++) {
      const above = rows[x + 1];
      rows[x + 1] = pixels[(y * width + x) * 4 + 3] > 245 ? Math.min(above, rows[x], diagonal) + 1 : 0;
      diagonal = above;
      if (rows[x + 1] > size) { size = rows[x + 1]; bx = x; by = y; }
    }
  }
  if (size < 3) return null;
  // Lecture à 3× la taille du SVG. On inscrit un disque dans le carré, avec du jeu pour le rastérisage.
  return {
    x: (bx + 1 - size / 2 - pad - left) / 3,
    y: (by + 1 - size / 2 - pad - ascent) / 3,
    radius: (size / 2 - 1) / 3,
  };
}

function scrollParent(element) {
  for (let p = element.parentElement; p; p = p.parentElement) {
    if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowY) && p !== document.body && p !== document.documentElement) return p;
  }
  return null;
}

function monter(section) {
  const pin = section.querySelector('[data-gp-pin]');
  const field = section.querySelector('[data-gp-field]');
  const art = section.querySelector('[data-gp-art]');
  const glyph = section.querySelector('[data-gp-glyph]');
  const clip = glyph && glyph.parentElement;
  const marks = section.querySelector('[data-gp-marks]');
  const choices = section.querySelector('[data-gp-choices]');
  const picker = section.querySelector('[data-gp-select]');
  const probe = section.querySelector('[data-gp-viewport]');
  if (!pin || !field || !art || !glyph || !clip || !marks || !choices || !picker || !probe) return;

  const clipId = clip.id;
  const text = (glyph.textContent || '').trim().normalize('NFC');
  if (!text) return;
  const interactive = section.dataset.gpInteractive !== 'false';
  const lengthAttr = parseFloat(section.dataset.gpLength);
  const length = Number.isFinite(lengthAttr) ? clamp(lengthAttr, 1, 8) : 2.4;
  const focusChar = section.dataset.gpFocusChar || '';
  /* En dessous de cette largeur : pas de caméra, la section s'affiche directement
     avec le mot en titre (ordre d'Alex pour l'accueil de Krystine). */
  const seuilLarge = parseFloat(section.dataset.gpMinWidth) || 900;

  /* Les lettres cliquables et la liste tactile, une par caractère du mot. */
  let characterOffset = 0;
  const characters = Array.from(text, (char) => {
    const index = characterOffset; characterOffset += char.length;
    return { char, index };
  });
  characters.forEach(({ char, index }, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.tabIndex = -1; b.dataset.gpLetter = String(index);
    b.setAttribute('aria-label', `${char}, lettre ${i + 1} de ${characters.length}`);
    choices.appendChild(b);
    const o = document.createElement('option');
    o.value = String(index); o.textContent = `${i + 1} · ${char}`;
    picker.appendChild(o);
  });
  const buttons = Array.from(choices.querySelectorAll('button'));

  const root = scrollParent(section);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let raf = 0, dirty = true, active = true, ready = false;
  const mountedAt = performance.now();
  let browserFrameSeen = false, stalled = false;
  let W = 1, H = 1, travel = 1, startScale = 1, endScale = 1;
  let center = { x: 0, y: 0 }, target = null;
  let lastProgress = -1;
  let candidates = [], letters = [];
  let choosing = false;
  let bounds = { x: 0, y: 0, width: 1, height: 1 };
  let fontDirty = true;
  // On gèle une fonte disponible pour ce montage : une police qui arrive en retard déplace
  // l'encre sous la caméra. La feuille de style demande la display du site; une fonte
  // encore en vol ou manquante laisse le portail statique, avec la pile de repli.
  const computedFamily = getComputedStyle(glyph).fontFamily;
  const weight = getComputedStyle(glyph).fontWeight;
  const families = computedFamily.match(/(?:[^,"']+|"[^"]*"|'[^']*')+/g) || [];
  const available = families.filter((family) => {
    try { return document.fonts.check(`${weight} 100px ${family.trim()}`, text); } catch (e) { return false; }
  });
  glyph.style.fontFamily = [...available, DEFAULT_FONT].join(',');
  stalled = available.length < families.length;

  const readInk = () => {
    if (!context) return false;
    const font = getComputedStyle(glyph);
    const scanFont = `${font.fontWeight} 300px ${font.fontFamily}`;
    context.font = `${font.fontWeight} 100px ${font.fontFamily}`;
    context.fontKerning = 'none';
    const metrics = context.measureText(text);
    const advances = Array.from({ length: text.length }, (_, i) => context.measureText(text.slice(0, i)).width);
    // getBBox englobe la boîte de ligne dans certains moteurs : on cadre l'encre visible.
    bounds = {
      x: -metrics.actualBoundingBoxLeft, y: -metrics.actualBoundingBoxAscent,
      width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
    };
    if (!bounds.width || !bounds.height) return false;
    center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const requested = focusChar ? text.indexOf(focusChar.normalize('NFC')) : -1;
    let offset = 0;
    candidates = []; letters = [];
    for (const char of Array.from(text)) {
      context.font = `${font.fontWeight} 100px ${font.fontFamily}`;
      const m = context.measureText(char);
      letters.push({
        index: offset, x: advances[offset] - m.actualBoundingBoxLeft, y: -m.actualBoundingBoxAscent,
        width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
        height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
      });
      const found = interior(context, char, scanFont);
      if (found) candidates.push({ ...found, x: found.x + advances[offset], index: offset });
      offset += char.length;
    }
    target = candidates.find((c) => c.index === requested)
      || [...candidates].sort((a, b) => b.radius - a.radius || Math.abs(a.x - center.x) - Math.abs(b.x - center.x))[0]
      || null;
    return true;
  };

  const select = (next) => {
    target = next;
    endScale = target ? Math.max(startScale, Math.hypot(W, H) / (target.radius * 1.35)) : startScale;
    section.dataset.gpFocus = target ? Array.from(text.slice(target.index))[0] : '';
    section.dataset.gpFocusIndex = String(target ? target.index : -1);
    for (const button of buttons) {
      const selected = Number(button.dataset.gpLetter) === (target ? target.index : NaN);
      button.disabled = !candidates.some((c) => c.index === Number(button.dataset.gpLetter));
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    if (picker.value !== '') picker.value = String(target ? target.index : -1);
    for (const option of Array.from(picker.options)) {
      option.disabled = option.value === '' || !candidates.some((c) => c.index === Number(option.value));
    }
    const u = 1 / startScale;
    const y = bounds.y + bounds.height + 25 * u;
    const x = bounds.x;
    const right = x + bounds.width;
    const cross = target ? `M${target.x - 9 * u} ${target.y}h${18 * u}M${target.x} ${target.y - 9 * u}v${18 * u}` : '';
    const annotationPath = marks.querySelector('path');
    annotationPath.setAttribute('d', `M${x} ${y}H${right}M${x} ${y - 5 * u}v${10 * u}M${right} ${y - 5 * u}v${10 * u}${cross}`);
    annotationPath.setAttribute('stroke-width', String(u));
  };

  const statique = () => motion.matches || innerWidth < seuilLarge || !browserFrameSeen || stalled || !target;

  const position = () => {
    const origin = root ? root.getBoundingClientRect().top + root.clientTop : 0;
    return clamp((origin - section.getBoundingClientRect().top) / travel);
  };

  const paint = (progress) => {
    const isStatic = statique();
    const p = isStatic ? 0 : progress;
    const t = clamp(p / 0.78);
    const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    const scale = Math.exp(Math.log(startScale) + Math.log(endScale / startScale) * eased);
    const blend = endScale === startScale ? 0 : (1 / scale - 1 / startScale) / (1 / endScale - 1 / startScale);
    const cx = center.x + ((target ? target.x : center.x) - center.x) * blend;
    const cy = center.y + ((target ? target.y : center.y) - center.y) * blend;
    const roll = -4 * smooth(0.06, 0.5, t) * (1 - smooth(0.62, 0.92, t));
    const transform = `translate(${W / 2} ${H * 0.46 + H * 0.04 * eased}) scale(${scale}) rotate(${roll}) translate(${-cx} ${-cy})`;
    // L'échelle reste sur le clip pour éviter les limites de peinture du texte. La translation
    // locale au texte suit le zoom de page dans WebKit; celle d'un clip HTML, non.
    const radians = roll * Math.PI / 180;
    const dx = W / 2 / scale, dy = (H * 0.46 + H * 0.04 * eased) / scale;
    clip.setAttribute('transform', `scale(${scale}) rotate(${roll})`);
    glyph.setAttribute('transform', `translate(${Math.cos(radians) * dx + Math.sin(radians) * dy - cx} ${-Math.sin(radians) * dx + Math.cos(radians) * dy - cy})`);
    marks.setAttribute('transform', transform);
    marks.style.opacity = String(1 - smooth(0.015, 0.17, p));
    choosing = interactive && !isStatic && p < 0.04;
    choices.inert = !choosing;
    section.dataset.gpChoosing = String(choosing);
    // Le clip ne tombe qu'une fois la caméra déjà remplie d'encre.
    field.style.clipPath = t >= 1 ? 'none' : `url(#${clipId})`;
    section.style.setProperty('--gp-caption', String(1 - smooth(0.01, 0.16, p)));
    section.style.setProperty('--gp-reveal', String(isStatic ? 1 : smooth(0.78, 0.9, p)));
    section.style.setProperty('--gp-field-scale', String(1 + 0.16 * smooth(0, 0.82, p)));
    section.style.setProperty('--gp-caption-hit', p < 0.08 ? 'auto' : 'none');
    section.dataset.gpEntered = String(p >= 0.9);
    section.dataset.gpProgress = p.toFixed(5);
    if (p !== lastProgress) lastProgress = p;
  };

  const layout = () => {
    if (!section.clientWidth) return;
    W = pin.clientWidth;
    // Une sonde en 100svh empêche les barres du navigateur de changer sans cesse la course.
    const smallViewport = probe.offsetHeight;
    const viewportHeight = Math.max(1, Math.min(root ? root.clientHeight : smallViewport, smallViewport));
    H = statique() ? Math.min(viewportHeight * 0.75, 480) : viewportHeight;
    section.style.setProperty('--gp-height', `${H}px`);
    travel = H * length;
    art.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (fontDirty) { ready = readInk(); fontDirty = false; }
    if (!ready) return;
    startScale = Math.min(W * 0.84 / bounds.width, H * 0.38 / bounds.height);
    // La fenêtre entière tient dans l'encre mesurée, même avec le petit débattement de caméra.
    select(target);
    for (const button of buttons) {
      const letter = letters.find((item) => item.index === Number(button.dataset.gpLetter));
      if (!letter) continue;
      Object.assign(button.style, {
        left: `${W / 2 + (letter.x - center.x) * startScale}px`,
        top: `${H * 0.46 + (letter.y - center.y) * startScale - Math.max(0, 44 - letter.height * startScale) / 2}px`,
        width: `${Math.max(1, letter.width * startScale)}px`,
        height: `${Math.max(44, letter.height * startScale)}px`,
      });
    }
    section.style.setProperty('--gp-word-top', `${H * 0.46 - bounds.height * startScale / 2}px`);
    section.style.setProperty('--gp-word-bottom', `${H * 0.46 + bounds.height * startScale / 2}px`);
    section.dataset.gpReady = 'true';
    section.dataset.gpMotion = statique() ? 'off' : 'on';
  };

  const frame = (time) => {
    raf = 0;
    if (time !== undefined && !browserFrameSeen) {
      browserFrameSeen = true;
      if (performance.now() - mountedAt > 2500) stalled = true;
      dirty = true;
    }
    if (dirty) { dirty = false; layout(); }
    if (ready) paint(position());
  };
  const schedule = () => { if (!raf && active) raf = requestAnimationFrame(frame); };
  const resize = () => { cancelAnimationFrame(raf); raf = 0; dirty = true; frame(); };
  const choose = (event) => {
    if (!choosing || position() >= 0.04) return;
    const button = event.target.closest && event.target.closest('[data-gp-letter]');
    const next = candidates.find((c) => c.index === Number(button && button.dataset.gpLetter));
    if (!next || next === target) return;
    select(next); paint(position());
  };
  const navigate = (event) => {
    if (!choosing || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = candidates.indexOf(target);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? candidates.length - 1
      : (current + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + candidates.length) % candidates.length;
    const b = buttons.find((btn) => Number(btn.dataset.gpLetter) === candidates[index].index);
    if (b) b.focus({ preventScroll: true });
  };
  const pick = () => {
    if (!choosing || position() >= 0.04) return;
    const next = candidates.find((c) => c.index === Number(picker.value));
    if (next) { select(next); paint(position()); }
  };

  choices.addEventListener('pointerover', choose);
  choices.addEventListener('click', choose);
  choices.addEventListener('focusin', choose);
  choices.addEventListener('keydown', navigate);
  picker.addEventListener('change', pick);
  new ResizeObserver(resize).observe(section);
  new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) { dirty = true; schedule(); }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { root, rootMargin: '100% 0px' }).observe(section);
  (root || window).addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', resize);
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  motion.addEventListener('change', resize);
  frame();
  // WebKit peut retenir images, minuteries et événements de défilement derrière une police bloquée.
  // On part en lecture simple; le mouvement ne s'allume que si le navigateur rend sans traîner.
  schedule();
}

function demarrer() {
  const sections = Array.from(document.querySelectorAll('[data-gp]'));
  if (!sections.length) return;
  /* La police display du site arrive de Google Fonts : on l'attend avant de mesurer
     l'encre, sinon la vérification de disponibilité laisse le portail statique. */
  const attendre = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))])
    : Promise.resolve();
  attendre.then(() => sections.forEach(monter), () => sections.forEach(monter));
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', demarrer);
else demarrer();
