// Dev-mode admin unlock — a local backdoor for testing the admin UI
// (and editing content) without going through Firebase Authentication.
//
// SCOPE & SAFETY
// ──────────────
// This module is *only* effective when the bundle is built with Vite's
// dev mode (`import.meta.env.DEV === true`). In a production build the
// password constant is still in the JS but every entry point exits
// early, so it does nothing.
//
// What "unlocked" means in this app:
//   1. `isAdminUser()` (src/firebase/auth.ts) returns true on the
//      strength of `localStorage.__devAdmin === '1'`. That flips the
//      admin UI on (EditModeBar, edit handles, /admin route, etc.).
//   2. `__localOverrides === '1'` tells EditModeContext to read/write
//      text & image overrides through `localStorage` instead of
//      Firestore. So edits made in this mode persist on this browser
//      only — no Firestore writes (which would be rejected by the
//      security rules anyway, since the dev user isn't actually
//      authenticated as an ADMIN_EMAILS account).
//
// Activation:
//   ?unlock=Alexisthebest2121!   ← sets both flags, cleans the URL,
//                                  reloads so the contexts pick up.
//   ?lock=1                      ← clears both flags, reloads.
//
// FOLLOW-UP
// ─────────
// `Alexisthebest2121!` looks like a personal password the user supplied
// for convenience. Consider rotating to a random opaque token (e.g.
// `krystine-dev-8kq2m`) before this branch ever ships to a public dev
// URL — anything in this constant ends up readable in the dev bundle.

const UNLOCK_PASSWORD = 'Alexisthebest2121!';

const KEY_DEV_ADMIN = '__devAdmin';
const KEY_LOCAL_OVERRIDES = '__localOverrides';

function inDevBuild(): boolean {
  // The compile-time Vite flag. Production builds replace this with
  // `false` and dead-code-eliminate everything below.
  return Boolean(import.meta.env.DEV);
}

export function isDevAdminActive(): boolean {
  if (!inDevBuild()) return false;
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(KEY_DEV_ADMIN) === '1';
  } catch { return false; }
}

export function isLocalOverridesActive(): boolean {
  if (!inDevBuild()) return false;
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(KEY_LOCAL_OVERRIDES) === '1';
  } catch { return false; }
}

function activate(): void {
  try {
    localStorage.setItem(KEY_DEV_ADMIN, '1');
    localStorage.setItem(KEY_LOCAL_OVERRIDES, '1');
  } catch { /* private mode — silently fail */ }
}

function deactivate(): void {
  try {
    localStorage.removeItem(KEY_DEV_ADMIN);
    localStorage.removeItem(KEY_LOCAL_OVERRIDES);
  } catch { /* noop */ }
}

// Public helpers for in-app buttons (e.g. the footer "Dev Admin Access"
// shortcut). Both navigate after toggling so the React contexts pick up
// the new auth/override state without any React-tree wiring.
//
// Activate → land on /admin. Two reasons: (1) the dashboard is the
// canonical entry to admin functionality so that's where the dev wants
// to be, and (2) navigating instead of just reloading also flushes the
// auth context the same way a reload would.
// Deactivate → land on /accueil. The dev presumably wants to verify the
// public-facing experience after dropping admin.
export function activateDevAdmin(): void {
  if (!inDevBuild()) return;
  activate();
  if (typeof window !== 'undefined') window.location.assign('/admin');
}

export function deactivateDevAdmin(): void {
  if (!inDevBuild()) return;
  deactivate();
  if (typeof window !== 'undefined') window.location.assign('/accueil');
}

// Whether the in-app dev shortcuts (e.g. the footer button) should be
// visible at all. Production builds hide them.
export function isDevBuild(): boolean {
  return inDevBuild();
}

// Read the URL once on app boot. If `?unlock=…` matches the password,
// flip both flags and reload so the new state is picked up by every
// context provider in the tree (no React re-render gymnastics needed).
// `?lock=1` is the explicit exit. Anything else is a no-op.
export function processDevAdminUrl(): void {
  if (!inDevBuild()) return;
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const unlock = params.get('unlock');
  const lock = params.get('lock');

  if (unlock !== null) {
    if (unlock === UNLOCK_PASSWORD) {
      activate();
      // Cleanly strip the param before reloading so the password
      // doesn't sit in the address bar / browser history.
      params.delete('unlock');
      const clean = window.location.pathname
        + (params.toString() ? `?${params}` : '')
        + window.location.hash;
      window.history.replaceState(null, '', clean);
      window.location.reload();
    } else {
      // Wrong password — quietly ignore. We deliberately don't
      // give feedback so brute-forcing through the URL bar is no
      // faster than guessing blind.
      params.delete('unlock');
      const clean = window.location.pathname
        + (params.toString() ? `?${params}` : '')
        + window.location.hash;
      window.history.replaceState(null, '', clean);
    }
    return;
  }

  if (lock === '1') {
    deactivate();
    params.delete('lock');
    const clean = window.location.pathname
      + (params.toString() ? `?${params}` : '')
      + window.location.hash;
    window.history.replaceState(null, '', clean);
    window.location.reload();
  }
}

// ─── localStorage-backed override store (used when __localOverrides is on) ──
// Same shape as OverridesDoc in src/firebase/overrides.ts so the
// EditModeContext can swap stores transparently.
export interface LocalOverridesShape {
  text: Record<string, string>;
  images: Record<string, { url: string; focalX?: number; focalY?: number }>;
}

const KEY_OVERRIDES_DOC = '__localOverridesDoc';

export function readLocalOverrides(): LocalOverridesShape {
  if (typeof window === 'undefined') return { text: {}, images: {} };
  try {
    const raw = localStorage.getItem(KEY_OVERRIDES_DOC);
    if (!raw) return { text: {}, images: {} };
    const parsed = JSON.parse(raw) as Partial<LocalOverridesShape>;
    return { text: parsed.text || {}, images: parsed.images || {} };
  } catch {
    return { text: {}, images: {} };
  }
}

export function writeLocalText(key: string, value: string): void {
  const cur = readLocalOverrides();
  cur.text[key] = value;
  try { localStorage.setItem(KEY_OVERRIDES_DOC, JSON.stringify(cur)); } catch { /* noop */ }
}

export function writeLocalImage(
  key: string,
  payload: { url: string; focalX?: number; focalY?: number },
): void {
  const cur = readLocalOverrides();
  cur.images[key] = payload;
  try { localStorage.setItem(KEY_OVERRIDES_DOC, JSON.stringify(cur)); } catch { /* noop */ }
}

export function clearLocalOverrides(): void {
  try { localStorage.removeItem(KEY_OVERRIDES_DOC); } catch { /* noop */ }
}
