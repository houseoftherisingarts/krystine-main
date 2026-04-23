import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { ensureMemberProfile } from './firestore';

// Hard cap on the post-auth bootstrap so a hung Firestore call (rules issue,
// offline cache lockup, etc.) can never freeze the sign-in modal. The auth
// state subscription still fires regardless; bootstrap is best-effort.
function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T | void> {
  return Promise.race([
    p,
    new Promise<void>(resolve => setTimeout(resolve, ms)),
  ]);
}

export async function loginWithEmail(email: string, password: string) {
  if (!auth) throw new Error('Firebase Auth not configured');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await withTimeout(bootstrapMember(cred.user, 'email'));
  return cred;
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  if (!auth) throw new Error('Firebase Auth not configured');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    try { await updateProfile(cred.user, { displayName }); } catch { /* non-fatal */ }
  }
  await withTimeout(bootstrapMember(cred.user, 'email'));
  return cred;
}

// Tries the popup flow first (faster, no full-page reload). Falls back to
// `signInWithRedirect` if the popup is blocked / closed before completion /
// unsupported (Safari ITP, in-app browsers, COOP-strict pages). When the
// redirect path is taken the promise resolves *immediately* — the actual
// sign-in completes after the browser comes back from accounts.google.com,
// at which point `handleRedirectResult` (called from AppContext on mount)
// finishes the bootstrap.
export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase Auth not configured');
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(auth, provider);
    await withTimeout(bootstrapMember(cred.user, 'google'));
    return cred;
  } catch (e: any) {
    const code = e?.code || '';
    const popupFailed =
      code === 'auth/popup-blocked'
      || code === 'auth/operation-not-supported-in-this-environment'
      || code === 'auth/web-storage-unsupported'
      || code === 'auth/internal-error';
    if (popupFailed) {
      // Falls through into a full-page redirect flow. Resolves immediately;
      // the post-redirect bootstrap runs via `handleRedirectResult`.
      await signInWithRedirect(auth, provider);
      return null;
    }
    // Real errors (popup closed, cancelled, etc.) bubble up so the modal
    // can show them and reset its busy state.
    throw e;
  }
}

// Run once on app mount. Resolves any pending redirect-back from a Google
// sign-in started via `signInWithRedirect`. No-op when there's no pending
// redirect (the common case).
export async function handleRedirectResult() {
  if (!auth) return null;
  try {
    const cred = await getRedirectResult(auth);
    if (cred?.user) await withTimeout(bootstrapMember(cred.user, 'google'));
    return cred;
  } catch (e) {
    console.warn('[auth] handleRedirectResult', e);
    return null;
  }
}

export async function sendPasswordReset(email: string) {
  if (!auth) throw new Error('Firebase Auth not configured');
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  if (!auth) return;
  return signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ─── Admin allowlist ─────────────────────────────────────────────────────────
export const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
];

export function isAdminUser(user: User | null): boolean {
  // Dev-only local bypass for automated UI testing of admin flows. Set
  // `localStorage.__devAdmin = '1'` in the browser console while the Vite
  // dev server is running. Has no effect in production builds.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try { if (localStorage.getItem('__devAdmin') === '1') return true; } catch { /* noop */ }
  }
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email || '');
}

// Any signed-in, non-admin user is a member. (Admins are also members conceptually,
// but their space is /admin.)
export function isMember(user: User | null): boolean {
  return !!user && !isAdminUser(user);
}

async function bootstrapMember(user: User, provider: 'google' | 'email') {
  if (isAdminUser(user)) return; // admin profiles live elsewhere
  try {
    await ensureMemberProfile({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      provider,
    });
  } catch (e) {
    console.warn('[auth] ensureMemberProfile failed', e);
  }
  // Welcome bonus is now claim-once via a button in the client space (Points
  // tab) rather than auto-granted on sign-in — see `ClientLoyalty.tsx`.
}
