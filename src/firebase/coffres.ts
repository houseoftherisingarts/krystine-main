import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { db } from '../firebase';
import type { TypeCoffre } from '../lib/coffresConfig';

// Les coffres (functions/src/coffres.ts) : ce que la membre possède, l'achat
// en niskas, l'ouverture, le grand lot et le don par l'admin.

export interface Inventaire { boites: Record<TypeCoffre, number>; cles: Record<TypeCoffre, number> }
const VIDE: Inventaire = { boites: { bronze: 0, argent: 0, or: 0 }, cles: { bronze: 0, argent: 0, or: 0 } };

export function suivreMesCoffres(uid: string, cb: (i: Inventaire) => void): Unsubscribe {
  if (!db || !uid) { cb(VIDE); return () => {}; }
  return onSnapshot(doc(db, 'coffres', uid), snap => {
    const d = (snap.data() || {}) as Partial<Inventaire>;
    cb({ boites: { ...VIDE.boites, ...(d.boites || {}) }, cles: { ...VIDE.cles, ...(d.cles || {}) } });
  }, () => cb(VIDE));
}

export interface LotGagne {
  genre: 'niskas' | 'cosmetique' | 'recompense' | 'grand';
  nom: string;
  montant?: number;
  solde?: number;
  article?: string;
  note?: string;
  ouvertureId?: string;
  question?: string;
}

const fn = (nom: string) => {
  if (!app) throw new Error('[Coffres] Firebase not configured');
  return httpsCallable(getFunctions(app, 'us-central1'), nom);
};

export async function acheterCoffre(type: TypeCoffre, quoi: 'boite' | 'cle'): Promise<{ solde: number; nom: string }> {
  return (await fn('acheterCoffre')({ type, quoi })).data as { solde: number; nom: string };
}

export async function ouvrirCoffre(type: TypeCoffre): Promise<{ ouvertureId: string; type: TypeCoffre; lot: LotGagne }> {
  return (await fn('ouvrirCoffre')({ type })).data as { ouvertureId: string; type: TypeCoffre; lot: LotGagne };
}

export async function reclamerGrandLot(ouvertureId: string, reponse: number): Promise<{ bon: boolean; essais?: number; cadeauId?: string }> {
  return (await fn('reclamerGrandLot')({ ouvertureId, reponse })).data as { bon: boolean; essais?: number; cadeauId?: string };
}

/** Admin : offrir un coffre (et sa clé) à une membre, avec un mot dans sa messagerie. */
export async function offrirCoffre(uid: string, type: TypeCoffre, avecCle: boolean, message: string): Promise<void> {
  await fn('offrirCoffre')({ uid, type, avecCle, message });
}
