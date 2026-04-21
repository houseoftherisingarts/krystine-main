import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { ensureMemberProfile } from './firestore';

export async function loginWithEmail(email: string, password: string) {
  if (!auth) throw new Error('Firebase Auth not configured');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await bootstrapMember(cred.user, 'email');
  return cred;
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  if (!auth) throw new Error('Firebase Auth not configured');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    try { await updateProfile(cred.user, { displayName }); } catch { /* non-fatal */ }
  }
  await bootstrapMember(cred.user, 'email');
  return cred;
}

export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase Auth not configured');
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await bootstrapMember(cred.user, 'google');
  return cred;
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
}
