import { doc, onSnapshot, setDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';

// Les interrupteurs de gamification (settings/gamification), lus en temps
// réel partout sur le site et écrits depuis l'onglet admin « Gamification ».
// Miroir de functions/src/gamification.ts (mêmes noms, mêmes défauts) :
// absent d'un champ = module ON, sauf badgeBleuEquipeSeulement, absent = true.
// Lecture publique, écriture admin (firestore.rules : match /settings/{id}).

export interface GamificationSettings {
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
  acheterNiskas: true, coffres: true, badges: true, roueQuotidienne: true, roueFoyer: true,
  recompenses: true, parrainage: true, coffreBeta: true, panneauJouer: true, petiteBoutique: true,
  badgeBleuEquipeSeulement: true,
};

const combler = (d: GamificationSettings | undefined): Required<GamificationSettings> => {
  const v = { ...DEFAUT_GAMIFICATION };
  for (const cle of Object.keys(DEFAUT_GAMIFICATION) as Array<keyof GamificationSettings>) {
    if (typeof d?.[cle] === 'boolean') v[cle] = d[cle] as boolean;
  }
  return v;
};

export function subscribeToGamification(cb: (g: Required<GamificationSettings>) => void): Unsubscribe {
  if (!db) { cb(DEFAUT_GAMIFICATION); return () => {}; }
  return onSnapshot(doc(db, 'settings', 'gamification'), snap => cb(combler(snap.data() as GamificationSettings)), () => cb(DEFAUT_GAMIFICATION));
}

export async function setGamificationFlag(patch: Partial<GamificationSettings>, uid: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'settings', 'gamification'), { ...patch, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true });
}
