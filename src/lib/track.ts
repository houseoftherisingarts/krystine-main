// Single tracking facade — keeps Meta Pixel and GA4 (Firebase Analytics) in
// sync from one place so handlers never call them divergently. Every helper
// no-ops until the visitor consents (LOI 25): the Pixel wrappers check
// `window.fbq` and the GA4 wrappers check `_analytics`, so calling these
// pre-consent simply does nothing.
//
// Before this file existed, src/lib/metaPixel.ts was imported nowhere and
// logPageView/logLead were never called — i.e. no opt-in or page view was
// ever tracked. Route all conversion + page-view signals through here.

import { pixel } from './metaPixel';
import { logLead, logObjectif, logPageView } from '../firebase';
import { mesureExclue, mesureActive, objectif, type NiveauObjectif } from '../vexelhotjar/tracker';

/** Fire on every successful opt-in (newsletter, waitlist, quiz capture).
 *  `source` mirrors the internal source tag already used in each handler.
 *  Un opt-in est aussi un petit succès dans Visiteurs et clics. */
export function trackLead(source: string): void {
  if (mesureExclue()) return;
  pixel.lead({ content_name: source });
  logLead(source);
  objectif(`Inscription · ${source}`, 'petit');
}

/** Un objectif atteint. « gros » pour une transaction (paiement commencé,
 *  achat confirmé, billet), « petit » pour l'engagement qui revient. Va au
 *  tableau Visiteurs et clics, au Pixel (audiences de reciblage : ObjectifGros
 *  et ObjectifPetit, plus InitiateCheckout quand un paiement commence) et à GA4. */
export function trackObjectif(nom: string, niveau: NiveauObjectif, options?: { paiement?: boolean }): void {
  if (mesureExclue()) return;
  objectif(nom, niveau);
  pixel.objectif(nom, niveau);
  if (options?.paiement) pixel.initiateCheckout({ content_name: nom });
  logObjectif(nom, niveau);
}

/** Fire on each SPA route change (mounted via RouteTracker). */
export function trackPageView(path: string, title?: string): void {
  if (mesureExclue()) return;
  pixel.pageView();
  logPageView(path, title);
}

/** Fire when a visitor lands on a high-intent page (quiz, formations, guide). */
export function trackKeyPageView(name: string): void {
  if (mesureExclue()) return;
  pixel.viewContent({ content_name: name });
}

/** Un événement de mesure interne seulement (Visiteurs et clics de l'admin),
 *  sans Pixel ni GA4. Aucune donnée personnelle : un nom court, rien d'autre.
 *  Il ne part qu'avec le consentement, comme tout le reste de la mesure. */
export function trackInterne(nom: string, niveau: NiveauObjectif = 'petit'): void {
  if (mesureExclue()) return;
  objectif(nom, niveau);
}

/** Une connexion à l'espace client (sans courriel ni identifiant). */
export function trackConnexion(): void {
  trackInterne('connexion');
}

// ─── La source « quiz » : de la lecture du résultat jusqu'à l'achat ────────
// Un simple repère (le mot « quiz » et la date) gardé dans le navigateur, et
// seulement si la visiteuse a accepté les témoins. Il part avec la demande de
// paiement; le serveur n'accepte que les valeurs de sa liste blanche.

const CLE_SOURCE = 'ins.source';
const VALIDITE_SOURCE_MS = 30 * 24 * 3600_000;

export function noterSource(source: 'quiz'): void {
  if (!mesureActive() || mesureExclue()) return;
  const v = JSON.stringify({ s: source, t: Date.now() });
  try { localStorage.setItem(CLE_SOURCE, v); } catch { /* sans stockage */ }
  try { sessionStorage.setItem(CLE_SOURCE, v); } catch { /* sans stockage */ }
}

/** La source retenue, ou undefined (rien noté, trop vieux, ou mesure refusée). */
export function lireSource(): 'quiz' | undefined {
  if (!mesureActive() || mesureExclue()) return undefined;
  for (const magasin of [() => sessionStorage, () => localStorage]) {
    try {
      const x = JSON.parse(magasin().getItem(CLE_SOURCE) || 'null');
      if (x?.s === 'quiz' && Date.now() - Number(x.t) < VALIDITE_SOURCE_MS) return 'quiz';
    } catch { /* on essaie l'autre */ }
  }
  return undefined;
}
