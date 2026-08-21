// Drop-in replacement for react/jsx-runtime (wired by vite.config.ts) that
// translates string children and the human-visible string props of every
// element at render time. The source of truth stays French in the code; the
// English lives in public/i18n/en.json. No per-file rewrite needed.
import * as R from 'react/jsx-runtime';
import { tr } from './lang';

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
  return out;
}

export const Fragment = R.Fragment;
export function jsx(type: any, props: any, key?: any) { return (R as any).jsx(type, translateProps(type, props), key); }
export function jsxs(type: any, props: any, key?: any) { return (R as any).jsxs(type, translateProps(type, props), key); }
export { translateProps };
