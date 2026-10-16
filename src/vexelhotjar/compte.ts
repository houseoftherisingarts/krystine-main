// ─── Le compte anonyme des visites (Krystine, 16 oct. 2026) ─────────────────
// 98 % des visiteuses ne répondent pas à la bannière des témoins : la mesure
// ne voyait presque personne. Ce compte part pour toutes, avant tout choix :
// une seule fois par onglet, il dit seulement d'où vient la visite (pub,
// lettre, recherche, réseaux, direct), le type d'appareil et la page
// d'entrée. Aucun témoin, aucun identifiant, aucune adresse gardée; le
// drapeau de sessionStorage ne désigne personne et s'efface à la fermeture
// de l'onglet. Le Bilan du matin le lit dans vh_visites.

import { mesureExclue } from './tracker';

const CLE = 'inspirata.visite.comptee';
const RECHERCHE = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|qwant|startpage|brave)\./;
const RESEAUX = /(^|\.)(facebook|instagram|fb|t|x|twitter|pinterest|youtube|tiktok|linkedin|threads)\.(com|co|net)$/;
const COURRIEL = /(^|\.)(mail\.google|outlook|mail\.yahoo|webmail|mail)\./;

export function sourceDeVisite(url: URL, referent: string): string {
  const p = url.searchParams;
  const us = (p.get('utm_source') || '').toLowerCase();
  const um = (p.get('utm_medium') || '').toLowerCase();
  if (p.get('via') || us === 'infolettre' || /^(suite-|accueil-|courriel)/.test(us)) return 'infolettre';
  if (um === 'pub' || um === 'paid' || um === 'cpc' || /^(meta|facebook|instagram|fb|ig|tiktok|google-ads)$/.test(us)) return 'pub';
  if (us) return 'autre-lien';
  let hote = '';
  try { hote = referent ? new URL(referent).hostname.toLowerCase() : ''; } catch { hote = ''; }
  if (!hote || hote === url.hostname) return 'direct';
  if (/inspiratanature\.com$/.test(hote)) return 'boutique';
  if (RECHERCHE.test(hote)) return 'recherche';
  if (RESEAUX.test(hote) || /^l\.|^lm\./.test(hote)) return 'reseaux';
  if (COURRIEL.test(hote)) return 'infolettre';
  return 'autre-site';
}

export function compterVisiteAnonyme(site = 'krystine') {
  try {
    if (typeof window === 'undefined' || mesureExclue()) return;
    if (sessionStorage.getItem(CLE)) return;
    sessionStorage.setItem(CLE, '1');
    const url = new URL(window.location.href);
    const w = window.innerWidth || 0;
    const corps = JSON.stringify({
      v: 1, site, t: 'visite',
      sid: Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
      src: sourceDeVisite(url, document.referrer),
      dev: w < 768 ? 'telephone' : w < 1100 ? 'tablette' : 'ordinateur',
      entree: (url.pathname.replace(/^\/(en\/)?/, '').split('/')[0] || 'accueil').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'accueil',
    });
    const blob = new Blob([corps], { type: 'text/plain' });
    if (!(navigator.sendBeacon && navigator.sendBeacon('/api/vh', blob))) {
      fetch('/api/vh', { method: 'POST', body: blob, keepalive: true, credentials: 'omit' }).catch(() => {});
    }
  } catch { /* le compte ne doit jamais gêner la visite */ }
}
