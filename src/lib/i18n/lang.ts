// Site language: 'fr' (source) or 'en'. Persisted in localStorage, overridable
// with ?lang=en|fr. Switching reloads the document so every page, the React
// app and the static bundles alike, boots in the chosen language.
export type SiteLang = 'fr' | 'en';
const KEY = 'krystine-lang';

export function getLang(): SiteLang {
  if (typeof window === 'undefined') return 'fr';
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'en' || q === 'fr') { localStorage.setItem(KEY, q); return q; }
    const s = localStorage.getItem(KEY);
    if (s === 'en' || s === 'fr') return s;
  } catch { /* private mode */ }
  return 'fr';
}

export function setLang(l: SiteLang): void {
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  const url = new URL(window.location.href);
  url.searchParams.delete('lang');
  window.location.replace(url.toString());
}

// ── Dictionary ────────────────────────────────────────────────────────────
let dict: Record<string, string> = {};
let active = false;

export async function loadDictionary(): Promise<void> {
  if (getLang() !== 'en') return;
  try {
    const r = await fetch('/i18n/en.json', { cache: 'force-cache' });
    dict = await r.json();
    active = true;
    document.documentElement.lang = 'en';
  } catch (e) { console.warn('[i18n] dictionary failed', e); }
}

// Collector (dev only): every string that flows through JSX is recorded so
// scripts/i18n-collect.mjs can dump the French source strings.
const collect: Set<string> | null =
  typeof window !== 'undefined' && (window as any).__i18nCollect ? ((window as any).__i18nStrings ||= new Set()) : null;

const SKIP = /^[\s\d.,:;!?%$€#()\-–·•/|&+*'"«»]*$|^https?:|^mailto:|^tel:|^[\w.-]+@[\w.-]+$|^#[\da-f]{3,8}$|^[\d\s:/.-]+$/i;

export function tr(s: string): string {
  if (s.length < 2 || SKIP.test(s)) return s;
  if (collect) { const k = s.trim(); if (k) collect.add(k); }
  if (!active) return s;
  const hit = dict[s];
  if (hit !== undefined) return hit;
  const m = /^(\s*)(.*?)(\s*)$/s.exec(s)!;
  const core = dict[m[2]];
  return core === undefined ? s : m[1] + core + m[3];
}

export const isEN = () => active;
