// Les billets vendus par la billetterie maison.
//
// Un billet naît au retour du paiement Stripe, écrit par le webhook
// (functions/src/billetterie.ts) avec le SDK d'administration : le navigateur
// n'en crée jamais un, sans quoi n'importe qui s'en fabriquerait. Le document
// porte son propre code comme identifiant, ce qui rend la lecture à la porte
// immédiate et empêche deux billets de partager un code.
//
// Le code se lit à voix haute sans confusion : ni O ni I ni 0 ni 1 dans
// l'alphabet, et deux groupes de quatre séparés par un trait d'union.
import { db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, updateDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';

export interface Billet {
  id?: string;
  /** Le code imprimé sur le billet, aussi l'identifiant du document. */
  code: string;
  eventId: string;
  /** Copie du titre et de la date au moment de l'achat : un billet ne change plus. */
  eventTitre: string;
  eventDate: string;
  eventLieu?: string;
  uid?: string;
  email: string;
  nom?: string;
  /** Session Stripe qui a payé ce billet, pour remonter à la transaction. */
  sessionId: string;
  /** Rang du billet dans son achat, quand quelqu'un en prend plusieurs. */
  rang?: number;
  /** Ce que ce billet a coûté, taxes comprises, en cents. */
  montantCents: number;
  taxesCents?: number;
  /** Passé à vrai quand le billet a été scanné à la porte. */
  utilise?: boolean;
  utiliseLe?: Timestamp;
  createdAt?: Timestamp;
}

export const CHEMIN_BILLETS = 'billets';

/** Les billets d'une personne, du plus récent au plus ancien. */
export async function getBilletsDeMembre(uid: string): Promise<Billet[]> {
  if (!db || !uid) return [];
  const snap = await getDocs(query(collection(db, CHEMIN_BILLETS), where('uid', '==', uid), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Billet));
}

/** Tous les billets d'un événement. Réservé à l'administration par les règles. */
export async function getBilletsDeEvenement(eventId: string): Promise<Billet[]> {
  if (!db || !eventId) return [];
  const snap = await getDocs(query(collection(db, CHEMIN_BILLETS), where('eventId', '==', eventId), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Billet));
}

export async function getBilletParCode(code: string): Promise<Billet | null> {
  if (!db || !code) return null;
  const snap = await getDoc(doc(db, CHEMIN_BILLETS, normaliserCode(code)));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Billet) : null;
}

/** À la porte : le billet se marque une seule fois, et le second passage se voit. */
export async function marquerBilletUtilise(code: string): Promise<void> {
  if (!db) throw new Error('Firebase absent');
  await updateDoc(doc(db, CHEMIN_BILLETS, normaliserCode(code)), {
    utilise: true,
    utiliseLe: serverTimestamp(),
  });
}

/** « ksl 4h7k-9mtr » devient « KSL-4H7K-9MTR ». */
export function normaliserCode(brut: string): string {
  const propre = brut.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const corps = propre.startsWith('KSL') ? propre.slice(3) : propre;
  return `KSL-${corps.slice(0, 4)}-${corps.slice(4, 8)}`;
}

/** Le prix affiché : « 229,95 $ » à partir des cents. */
export function enDollars(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} $`;
}

// TPS et TVQ du Québec, pour annoncer le prix toutes taxes comprises sur la
// page de vente. La taxe réellement facturée reste celle que Stripe calcule.
export const TPS = 0.05;
export const TVQ = 0.09975;
export const avecTaxes = (cents: number): number => Math.round(cents * (1 + TPS + TVQ));
