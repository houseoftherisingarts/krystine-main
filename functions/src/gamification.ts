import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

// Les interrupteurs de gamification (settings/gamification), lus côté
// serveur avant d'accorder un achat, une ouverture ou un badge. Miroir de
// src/firebase/gamification.ts (les mêmes noms de champs, les mêmes défauts) :
// absent d'un champ = module ON, sauf badgeBleuEquipeSeulement, absent = true.

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

const DEFAUT: Required<GamificationSettings> = {
  acheterNiskas: true, coffres: true, badges: true, roueQuotidienne: true, roueFoyer: true,
  recompenses: true, parrainage: true, coffreBeta: true, panneauJouer: true, petiteBoutique: true,
  badgeBleuEquipeSeulement: true,
};

// Cache 60 s : le document ne change que par un geste de Krystine dans
// l'admin, jamais assez souvent pour justifier une lecture à chaque appel.
let cache: { lu: number; valeurs: Required<GamificationSettings> } | null = null;

export async function lireGamification(): Promise<Required<GamificationSettings>> {
  if (cache && Date.now() - cache.lu < 60_000) return cache.valeurs;
  const snap = await getFirestore().doc('settings/gamification').get();
  const d = (snap.data() || {}) as GamificationSettings;
  const valeurs: Required<GamificationSettings> = { ...DEFAUT };
  for (const cle of Object.keys(DEFAUT) as Array<keyof GamificationSettings>) {
    if (typeof d[cle] === 'boolean') valeurs[cle] = d[cle] as boolean;
  }
  cache = { lu: Date.now(), valeurs };
  return valeurs;
}

/** Refuse l'appel si le module nommé est fermé. */
export async function exigerModule(nom: keyof GamificationSettings): Promise<void> {
  const g = await lireGamification();
  if (!g[nom]) throw new HttpsError('failed-precondition', 'Ce module est fermé pour le moment.');
}
