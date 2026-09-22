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
import { mesureExclue, objectif, type NiveauObjectif } from '../vexelhotjar/tracker';

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
