// Firebase configuration
// Fill in your values in .env.local to enable Firebase features
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, logEvent, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Only initialize if we have a project ID configured
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

const isConfigured = !!firebaseConfig.projectId && firebaseConfig.projectId !== 'undefined';

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    _auth = getAuth(app);
    _db = getFirestore(app);
    // Analytics intentionally NOT initialized here — gated behind user consent
    // (LOI 25, Quebec). Call enableAnalytics() from the consent banner.
  } catch (e) {
    console.warn('[Firebase] Init failed, running in offline mode:', e);
  }
} else {
  console.info('[Firebase] Not configured — running in offline mode. Add VITE_FIREBASE_* to .env.local');
}

export const auth = _auth;
export const db = _db;
export const isFirebaseReady = isConfigured && !!app;

let _analytics: Analytics | null = null;

export function enableAnalytics() {
  if (!app || _analytics) return;
  isSupported()
    .then(yes => {
      if (yes && app) _analytics = getAnalytics(app);
    })
    .catch(() => null);
}

export function logPageView(path: string, title?: string) {
  if (!_analytics) return;
  try {
    logEvent(_analytics, 'page_view', {
      page_path: path,
      page_location: typeof window !== 'undefined' ? window.location.href : path,
      page_title: title || (typeof document !== 'undefined' ? document.title : ''),
    });
  } catch { /* noop */ }
}

// GA4 conversion event for any opt-in (newsletter / waitlist / quiz capture).
// `source` mirrors the internal source tag (accueil-pulsation, waitlist-*,
// quiz, etc.) so funnels can be split by entry point. No-ops until analytics
// is enabled post-consent (LOI 25), so it's always safe to call.
export function logLead(source: string) {
  if (!_analytics) return;
  try {
    logEvent(_analytics, 'generate_lead', { source });
  } catch { /* noop */ }
}

export default app;
