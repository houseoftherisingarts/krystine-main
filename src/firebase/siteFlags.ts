// Site visibility flags — admin-controlled toggles to hide / show
// public-facing site elements without redeploying. Stored as a single
// document at `siteSettings/flags` so a single read populates every
// flag the site reads at boot.
//
// Adding a new flag:
//   1. Add a key + a sensible default to `DEFAULT_FLAGS` below.
//   2. Add a label in src/pages/admin/sections/VisibilitySection.tsx so
//      admins can toggle it.
//   3. Read it in the rendering code via `useSiteFlags()`.
//
// Default is "show" for everything except `showTedx` (hidden until
// Krystine's TEDx talk is officially announced).

import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface SiteFlags {
  /** Show the TEDx mentions across the site (events list, press marquee, hero pills). */
  showTedx: boolean;
}

export const DEFAULT_FLAGS: SiteFlags = {
  showTedx: false,
};

const FLAGS_COLLECTION = 'siteSettings';
const FLAGS_DOC = 'flags';

export async function getSiteFlags(): Promise<SiteFlags> {
  if (!db) return DEFAULT_FLAGS;
  try {
    const snap = await getDoc(doc(db, FLAGS_COLLECTION, FLAGS_DOC));
    if (!snap.exists()) return DEFAULT_FLAGS;
    return { ...DEFAULT_FLAGS, ...(snap.data() as Partial<SiteFlags>) };
  } catch {
    return DEFAULT_FLAGS;
  }
}

export async function setSiteFlag<K extends keyof SiteFlags>(key: K, value: SiteFlags[K]): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, FLAGS_COLLECTION, FLAGS_DOC), { [key]: value }, { merge: true });
}

/** Subscribe to live flag updates. Returns the unsubscribe function. */
export function subscribeToSiteFlags(cb: (flags: SiteFlags) => void): () => void {
  if (!db) {
    cb(DEFAULT_FLAGS);
    return () => { /* noop */ };
  }
  return onSnapshot(
    doc(db, FLAGS_COLLECTION, FLAGS_DOC),
    snap => {
      const data = (snap.exists() ? snap.data() : {}) as Partial<SiteFlags>;
      cb({ ...DEFAULT_FLAGS, ...data });
    },
    () => cb(DEFAULT_FLAGS),
  );
}
