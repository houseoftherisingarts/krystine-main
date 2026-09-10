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
  /** Le Foyer d'Origine est ouvert à la vente. Éteint, /foyer ne montre que
   *  la liste d'attente (/liste-attente?programme=foyer). Interrupteur dans
   *  l'admin, section Foyer. Éteint par défaut (Alex, 9 septembre 2026). */
  foyerOuvert: boolean;
  /** L'Expérience Origine 2 est ouverte à la vente. Éteint, /origine-2
   *  renvoie le public à la liste d'attente (/liste-attente?programme=origine2);
   *  l'admin garde la page pour la relire. Interrupteur dans l'admin,
   *  Réglages → Pages du site. Éteint par défaut (Alex, 10 septembre 2026). */
  origine2Ouvert: boolean;
  /** L'assistante de conversation flotte en bas à droite du site. Éteinte, le
   *  bouton disparaît complètement et aucun appel n'est fait à la fonction.
   *  Interrupteur dans l'admin, Réglages → Pages du site. Éteinte par défaut
   *  (Alex, 10 septembre 2026). */
  chatbotOuvert: boolean;
}

export const DEFAULT_FLAGS: SiteFlags = {
  showTedx: false,
  foyerOuvert: false,
  origine2Ouvert: false,
  chatbotOuvert: false,
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
