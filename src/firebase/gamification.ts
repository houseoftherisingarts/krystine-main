import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';

// Les interrupteurs de gamification (settings/gamification), lus en temps
// réel partout sur le site et écrits depuis l'onglet admin « Gamification ».
// Miroir de functions/src/gamification.ts (mêmes noms, mêmes défauts) :
// absent d'un champ = module ON, sauf badgeBleuEquipeSeulement, absent = true.
// Lecture publique, écriture admin (firestore.rules : match /settings/{id}).

export interface GamificationSettings {
  // L'interrupteur maître du jeu des niskas (Krystine, 6 oct. 2026). Fermé :
  // aucune mention de niskas nulle part (pages, création de compte, espace
  // membre) et aucun crédit côté serveur; les soldes restent intacts.
  // Absent du document : il suit « Le cadeau du jour » (roueQuotidienne),
  // l'interrupteur que Krystine a fermé pour fermer le jeu.
  jeu?: boolean;
  acheterNiskas?: boolean;
  coffres?: boolean;
  badges?: boolean;
  roueQuotidienne?: boolean;
  roueFoyer?: boolean;
  recompenses?: boolean;
  parrainage?: boolean;
  coffreBeta?: boolean;
  panneauJouer?: boolean;
  petiteBoutique?: boolean;
  badgeBleuEquipeSeulement?: boolean;
}

export const DEFAUT_GAMIFICATION: Required<GamificationSettings> = {
  jeu: true, acheterNiskas: true, coffres: true, badges: true, roueQuotidienne: true, roueFoyer: true,
  recompenses: true, parrainage: true, coffreBeta: true, panneauJouer: true, petiteBoutique: true,
  badgeBleuEquipeSeulement: true,
};

const combler = (d: GamificationSettings | undefined): Required<GamificationSettings> => {
  const v = { ...DEFAUT_GAMIFICATION };
  for (const cle of Object.keys(DEFAUT_GAMIFICATION) as Array<keyof GamificationSettings>) {
    if (typeof d?.[cle] === 'boolean') v[cle] = d[cle] as boolean;
  }
  return appliquerJeu(v, d);
};

// Les modules qui donnent, vendent ou montrent des niskas : le jeu fermé les
// ferme tous, sans toucher à leur propre interrupteur (le jeu rallumé, chacun
// reprend l'état que Krystine lui avait donné).
export const MODULES_NISKAS: Array<keyof GamificationSettings> = [
  'acheterNiskas', 'coffres', 'roueQuotidienne', 'roueFoyer', 'recompenses',
  'parrainage', 'coffreBeta', 'panneauJouer', 'petiteBoutique',
];

export function appliquerJeu(v: Required<GamificationSettings>, d: GamificationSettings | undefined): Required<GamificationSettings> {
  const jeu = typeof d?.jeu === 'boolean' ? d.jeu : (typeof d?.roueQuotidienne === 'boolean' ? d.roueQuotidienne : true);
  v.jeu = jeu;
  if (!jeu) for (const cle of MODULES_NISKAS) v[cle] = false;
  return v;
}

// brut : l'onglet admin montre chaque interrupteur tel que Krystine l'a posé,
// sans l'effet du jeu fermé (sinon basculer un module fermé par le jeu
// écrirait l'inverse de ce qu'elle voit).
export function subscribeToGamification(cb: (g: Required<GamificationSettings>) => void, brut = false): Unsubscribe {
  if (!db) { cb(DEFAUT_GAMIFICATION); return () => {}; }
  return onSnapshot(doc(db, 'settings', 'gamification'), snap => {
    const d = snap.data() as GamificationSettings | undefined;
    const v = combler(d);
    if (brut) {
      for (const cle of MODULES_NISKAS) v[cle] = typeof d?.[cle] === 'boolean' ? d[cle] as boolean : DEFAUT_GAMIFICATION[cle];
    }
    cb(v);
  }, () => cb(DEFAUT_GAMIFICATION));
}

export async function setGamificationFlag(patch: Partial<GamificationSettings>, uid: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'settings', 'gamification'), { ...patch, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true });
}

/** Le jeu des niskas est-il ouvert ? Une lecture, gardée une minute, pour les
 *  gestes hors React (awardPoints). Sans réponse : fermé, rien n'est crédité. */
let cacheJeu: { lu: number; ouvert: boolean } | null = null;
export async function jeuOuvertMaintenant(): Promise<boolean> {
  if (cacheJeu && Date.now() - cacheJeu.lu < 60_000) return cacheJeu.ouvert;
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'settings', 'gamification'));
    const ouvert = combler(snap.data() as GamificationSettings | undefined).jeu;
    cacheJeu = { lu: Date.now(), ouvert };
    return ouvert;
  } catch { return false; }
}
