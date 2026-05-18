// Locale plumbing — single source of truth is the URL pathname.
// `/en/...` is English; everything else is French (the canonical default).
// Routes that we DO NOT mirror in English (private/system paths) are
// listed here so the toggle can hide itself or fall back to FR for them.

import type { Lang } from '../contexts/AppContext';

const EN_PREFIX = '/en';

// Routes that exist only in FR — admin, account, hidden operational
// pages, transactional flows, and the static-bundle pages served as raw
// HTML from /public (each has its own meta).
const FR_ONLY_PREFIXES = [
  '/admin',
  '/compte',
  '/desinscription',
  '/slide',
  '/slidebg',
  '/vexel',
  '/origine',
  '/podcast',
  '/vata',
  '/salon',
];

export const isFrOnlyPath = (path: string): boolean =>
  FR_ONLY_PREFIXES.some(p => path === p || path.startsWith(p + '/'));

export const getLocaleFromPath = (path: string): Lang =>
  path === EN_PREFIX || path.startsWith(EN_PREFIX + '/') ? 'EN' : 'FR';

// Strip the `/en` prefix to get the canonical FR path. Returns `/` for
// the bare `/en` (which corresponds to FR `/`).
export const toFrenchPath = (path: string): string => {
  if (path === EN_PREFIX) return '/';
  if (path.startsWith(EN_PREFIX + '/')) return path.slice(EN_PREFIX.length);
  return path;
};

// Add the `/en` prefix to a FR canonical path. `/` becomes `/en`.
export const toEnglishPath = (path: string): string => {
  if (isFrOnlyPath(path)) return path; // no EN twin — stay FR
  if (path === '/') return EN_PREFIX;
  if (path.startsWith(EN_PREFIX + '/') || path === EN_PREFIX) return path;
  return EN_PREFIX + path;
};

// Take a FR canonical href (what every `<Link to="/...">` already uses)
// and rewrite it for the active locale. Hash and search are preserved.
export const localizeHref = (href: string, lang: Lang): string => {
  // External / mailto / tel — leave untouched.
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return href;
  // Split off ?query and #hash so we only rewrite the path part.
  const hashIdx = href.indexOf('#');
  const queryIdx = href.indexOf('?');
  const cut = [hashIdx, queryIdx].filter(i => i >= 0).sort((a, b) => a - b)[0];
  const path = cut !== undefined ? href.slice(0, cut) : href;
  const tail = cut !== undefined ? href.slice(cut) : '';
  if (lang === 'EN') return toEnglishPath(path) + tail;
  return toFrenchPath(path) + tail;
};

// Toggle the locale of the current pathname — used by the FR|EN switch.
export const swapLocalePath = (path: string): string => {
  if (isFrOnlyPath(path)) return path;
  return getLocaleFromPath(path) === 'EN' ? toFrenchPath(path) : toEnglishPath(path);
};
