// Drop-in replacement for react/jsx-runtime (wired by vite.config.ts) that
// translates string children and the human-visible string props of every
// element at render time. The source of truth stays French in the code; the
// English lives in public/i18n/en.json. No per-file rewrite needed.
//
// Le même point de passage sert au crayon d'administration : chaque <img> du
// site y reçoit son identifiant (`data-cadre`), la photo de remplacement que
// Krystine a choisie, et le cadrage qu'elle a réglé. Aucun composant n'a à
// se baliser lui-même, donc l'édition couvre le site entier d'un coup.
import * as R from 'react/jsx-runtime';
import { tr } from './lang';
import { photoDe, cadreDe, styleDeCadre } from './photos';

const PROPS = ['placeholder', 'title', 'alt', 'aria-label', 'label', 'description', 'subtitle', 'eyebrow', 'kicker', 'quote', 'caption', 'cta', 'ctaLabel', 'tagline', 'heading', 'hint', 'badge', 'note', 'text', 'body'];

function translateProps(type: any, props: any): any {
  if (!props) return props;
  let out = props;
  const c = props.children;
  if (typeof c === 'string') { const t = tr(c); if (t !== c) { out = { ...out }; out.children = t; } }
  else if (Array.isArray(c)) {
    let changed = false;
    const arr = c.map(x => { if (typeof x === 'string') { const t = tr(x); if (t !== x) changed = true; return t; } return x; });
    if (changed) { out = { ...out }; out.children = arr; }
  }
  for (const p of PROPS) {
    const v = props[p];
    if (typeof v === 'string' && v.length > 1) {
      const t = tr(v);
      if (t !== v) { if (out === props) out = { ...out }; out[p] = t; }
    }
  }
  if (type === 'img' && typeof props.src === 'string' && props.src) {
    out = photoProps(out === props ? { ...props } : out, props.src);
  } else {
    const fond = urlDeFond(props.style);
    if (fond) out = fondProps(out === props ? { ...props } : out, fond);
  }
  return out;
}

/** L'adresse derrière un `background-image: url(...)` posé en style en ligne. */
function urlDeFond(style: unknown): string | null {
  if (!style || typeof style !== 'object') return null;
  const v = (style as Record<string, unknown>).backgroundImage;
  if (typeof v !== 'string') return null;
  const m = /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(v);
  return m ? m[1] : null;
}

// Une <img> du site : la clé est l'adresse écrite dans le code, elle survit aux
// redéploiements et disparaît d'elle-même le jour où le code change d'image.
function photoProps(out: any, cle: string): any {
  out['data-cadre'] = cle;
  const remplacement = photoDe(cle);
  if (remplacement) out.src = remplacement;
  const cadre = cadreDe(cle);
  if (cadre) out.style = { ...(out.style || {}), ...styleDeCadre(cadre) };
  return out;
}

// Une image de fond posée dans un container : même clé, même surcharge, et le
// cadrage se traduit ici en background-position et background-size.
function fondProps(out: any, cle: string): any {
  out['data-cadre'] = cle;
  const remplacement = photoDe(cle);
  const cadre = cadreDe(cle);
  if (!remplacement && !cadre) return out;
  const style = { ...(out.style || {}) };
  if (remplacement) style.backgroundImage = `url(${remplacement})`;
  if (cadre) {
    style.backgroundPosition = `${cadre.x}% ${cadre.y}%`;
    if (cadre.z !== 1) style.backgroundSize = `${Math.round(cadre.z * 100)}%`;
  }
  out.style = style;
  return out;
}

export const Fragment = R.Fragment;
export function jsx(type: any, props: any, key?: any) { return (R as any).jsx(type, translateProps(type, props), key); }
export function jsxs(type: any, props: any, key?: any) { return (R as any).jsxs(type, translateProps(type, props), key); }
export { translateProps };
