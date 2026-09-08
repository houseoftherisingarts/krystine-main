import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAUT_GAMIFICATION, subscribeToGamification, type GamificationSettings } from '../firebase/gamification';
import { ADMIN_EMAILS } from '../firebase/auth';

// Le contexte des interrupteurs de gamification, posé par l'onglet admin
// « Gamification » (settings/gamification), lu en temps réel partout où un
// module doit disparaître complètement de l'écran quand il est fermé.

// pret : les réglages sont arrivés de Firestore. Avant, tout est ON par défaut
// et un module ne doit pas appeler le serveur (cadeau du jour) sur cette
// supposition : il attend pret.
export type Gamification = Required<GamificationSettings> & { pret: boolean };

const GamificationContext = createContext<Gamification>({ ...DEFAUT_GAMIFICATION, pret: false });

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [g, setG] = useState<Gamification>({ ...DEFAUT_GAMIFICATION, pret: false });
  useEffect(() => subscribeToGamification(v => setG({ ...v, pret: true })), []);
  return <GamificationContext.Provider value={g}>{children}</GamificationContext.Provider>;
};

export const useGamification = (): Gamification => useContext(GamificationContext);

/** L'équipe : les six courriels admin (voir isAdminUser, src/firebase/auth.ts) —
 *  Krystine et Alex, les seuls comptes qui portent le Badge Bleu réservé. */
export const estEquipe = (email: string | null | undefined): boolean => !!email && ADMIN_EMAILS.includes(email);

/** Montre-t-on la coche du Badge Bleu pour ce courriel ? Équipe seulement
 *  (le drapeau ON par défaut) ignore le champ `verifie` du profil : plus
 *  personne d'autre ne l'affiche, quelle qu'ait été la décision passée. */
export function montrerBadgeBleu(email: string | null | undefined, verifie: boolean | undefined, equipeSeulement: boolean): boolean {
  return equipeSeulement ? estEquipe(email) : !!verifie;
}
