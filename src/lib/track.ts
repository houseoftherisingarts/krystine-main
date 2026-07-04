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
import { logLead, logPageView } from '../firebase';

/** Fire on every successful opt-in (newsletter, waitlist, quiz capture).
 *  `source` mirrors the internal source tag already used in each handler. */
export function trackLead(source: string): void {
  pixel.lead({ content_name: source });
  logLead(source);
}

/** Fire on each SPA route change (mounted via RouteTracker). */
export function trackPageView(path: string, title?: string): void {
  pixel.pageView();
  logPageView(path, title);
}

/** Fire when a visitor lands on a high-intent page (quiz, formations, guide). */
export function trackKeyPageView(name: string): void {
  pixel.viewContent({ content_name: name });
}
