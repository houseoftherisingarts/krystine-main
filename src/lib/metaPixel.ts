// Thin wrapper around the Meta Pixel `fbq` function.
//
// Loading: the vendor `fbevents.js` snippet is injected by the Loi 25
// consent banner (src/components/layout/ConsentBanner.tsx) only after
// the visitor accepts. These helpers safely no-op when `window.fbq`
// isn't defined yet, so it's always safe to call them — pre-consent
// calls just disappear, post-consent calls hit the Pixel.
//
// Pixel ID: 836682756431077 (set inside ConsentBanner.tsx).
//
// Standard events this app fires:
//   · PageView           — every SPA route change (mirrors Firebase)
//   · Lead               — newsletter / waitlist captures
//   · CompleteRegistration — Salon des Inconnus / Vexel inquiries
//   · ViewContent        — landing on a key React-routed page
//
// Static bundles (/origine, /podcast, /vata) carry their own snippet
// via public/<bundle>/index.html so they can fire ViewContent + a
// PageView even though they live outside the React app.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function safeCall(fn: () => void) {
  if (typeof window === 'undefined') return;
  if (!window.fbq) return;
  try { fn(); } catch { /* swallow — analytics must never break the page */ }
}

/** Fire a PageView. Used on every SPA navigation. */
export function trackPixelPageView(): void {
  safeCall(() => window.fbq?.('track', 'PageView'));
}

/** Fire any Meta standard or custom event with optional params. */
export function trackPixelEvent(event: string, params?: Record<string, unknown>): void {
  safeCall(() => {
    if (params) window.fbq?.('track', event, params);
    else window.fbq?.('track', event);
  });
}

/** Convenience wrappers for the events we actually fire. */
export const pixel = {
  pageView: trackPixelPageView,
  lead: (params?: Record<string, unknown>) => trackPixelEvent('Lead', params),
  completeRegistration: (params?: Record<string, unknown>) =>
    trackPixelEvent('CompleteRegistration', params),
  viewContent: (params?: Record<string, unknown>) => trackPixelEvent('ViewContent', params),
};
