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


// ── Surcharges d'admin (le crayon) ────────────────────────────────────────
//
// Krystine (ou Alex) récrit n'importe quel texte du site sans toucher au code.
// La clé d'une surcharge est la phrase française telle qu'elle est écrite dans
// le code, exactement la même clé que le dictionnaire anglais : un texte qui
// change dans le code perd sa surcharge et redevient celui du code, ce qui est
// le comportement voulu. Les surcharges vivent dans Firestore
// (siteOverrides/singleton, champs `libre` et `libreEN`) et sont poussées ici
// par src/lib/edition.tsx, qui est le seul à appeler poserSurcharges().
let surFR: Record<string, string> = {};
let surEN: Record<string, string> = {};

// Ce que le site AFFICHE en ce moment → la phrase française d'origine. Le
// crayon s'en sert pour retrouver la clé d'un texte à partir du DOM, sans que
// le moindre composant ait à se baliser lui-même.
const rendus = new Map<string, string>();
const normal = (v: string): string => v.replace(/\s+/g, ' ').trim();

let versionSurcharges = 0;
const auditeurs = new Set<() => void>();

export function poserSurcharges(fr: Record<string, string>, en: Record<string, string>): void {
  surFR = fr || {};
  surEN = en || {};
  versionSurcharges++;
  auditeurs.forEach((f) => { try { f(); } catch { /* un auditeur qui plante n'arrête pas les autres */ } });
}

export function ecouterSurcharges(f: () => void): () => void {
  auditeurs.add(f);
  return () => { auditeurs.delete(f); };
}

export const versionDesSurcharges = (): number => versionSurcharges;

/** La phrase française d'origine derrière un texte affiché, si le site la connaît. */
export function sourceDuRendu(affiche: string): string | undefined {
  return rendus.get(normal(affiche));
}

/** Ce que le site afficherait pour cette source sans aucune surcharge. */
export function texteDeBase(source: string, langue: SiteLang): string {
  if (langue === 'en') {
    const hit = dict[source];
    if (hit !== undefined) return hit;
    const m = /^(\s*)(.*?)(\s*)$/s.exec(source)!;
    const core = dict[m[2]];
    return core === undefined ? source : m[1] + core + m[3];
  }
  return source;
}

/** La surcharge en vigueur pour cette source, dans cette langue. */
export function surchargeDe(source: string, langue: SiteLang): string | undefined {
  return (langue === 'en' ? surEN : surFR)[source];
}

export function tr(s: string): string {
  if (s.length < 2 || SKIP.test(s)) return s;
  if (collect) { const k = s.trim(); if (k) collect.add(k); }
  const sortie = rendu(s);
  // Le registre relie ce qui s'affiche à la phrase du code, dans les deux sens,
  // pour que le crayon retrouve la clé même quand un texte est déjà surchargé.
  const n = normal(sortie);
  if (n) rendus.set(n, s);
  return sortie;
}

function rendu(s: string): string {
  const surcharge = active ? surEN[s] : surFR[s];
  if (surcharge !== undefined) return surcharge;
  if (!active) return s;
  const hit = dict[s];
  if (hit !== undefined) return hit;
  const m = /^(\s*)(.*?)(\s*)$/s.exec(s)!;
  const core = dict[m[2]];
  return core === undefined ? s : m[1] + core + m[3];
}

export const isEN = () => active;
