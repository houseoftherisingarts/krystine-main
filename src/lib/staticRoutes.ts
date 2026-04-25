// Routes served as distinct static bundles via Firebase Hosting rewrites
// (see firebase.json + public/<name>/index.html). These folders are their own
// self-contained apps — React Router must not try to handle them, or it'll
// swallow the request before Firebase can serve the real HTML.
//
// Keep this list in sync with firebase.json's rewrites.
export const STATIC_ROUTES = ['/origine', '/podcast', '/vata'] as const;

export function isStaticRoute(path: string | undefined | null): boolean {
  if (!path) return false;
  return STATIC_ROUTES.some(s => path === s || path.startsWith(s + '/'));
}

// Use everywhere instead of `navigate(href)` when the href may point to a
// static-hosted bundle OR an external URL (e.g. a Kajabi checkout). Falls
// through to React Router for normal in-app routes.
export function goToRoute(navigate: (to: string) => void, href: string): void {
  // External URL — checkout pages, partner sites, etc. Open in new tab so
  // the user can come back to Inspirata without losing their place.
  if (/^https?:\/\//i.test(href)) {
    window.open(href, '_blank', 'noopener,noreferrer');
    return;
  }
  if (isStaticRoute(href)) {
    window.location.href = href;
  } else {
    navigate(href);
  }
}
