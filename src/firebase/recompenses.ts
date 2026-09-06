import app from '../firebase';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { REWARDS, type Reward } from '../lib/pointsConfig';

// Les récompenses par palier, réglées par Krystine dans l'admin (onglet
// Récompenses). Le document settings/recompenses remplace le catalogue codé
// dès qu'il existe; chaque récompense porte `actif` (toggle) et se modifie ou
// s'ajoute palier par palier. Lecture publique, écriture admin (firestore.rules).

const REF = () => {
  if (!app) throw new Error('[Recompenses] Firebase not configured');
  return doc(getFirestore(app), 'settings', 'recompenses');
};

export const RECOMPENSES_PAR_DEFAUT: Reward[] = REWARDS.map(r => ({ ...r, actif: true }));

export function suivreRecompenses(cb: (liste: Reward[]) => void): () => void {
  if (!app) { cb(RECOMPENSES_PAR_DEFAUT); return () => {}; }
  return onSnapshot(REF(), snap => {
    const data = snap.data() as { liste?: Reward[] } | undefined;
    cb(Array.isArray(data?.liste) && data!.liste.length ? data!.liste : RECOMPENSES_PAR_DEFAUT);
  }, () => cb(RECOMPENSES_PAR_DEFAUT));
}

export async function enregistrerRecompenses(liste: Reward[]): Promise<void> {
  const propre = liste.map(r => ({
    id: r.id, cost: Math.max(0, Math.round(Number(r.cost) || 0)),
    labelFR: r.labelFR || '', labelEN: r.labelEN || r.labelFR || '',
    descFR: r.descFR || '', descEN: r.descEN || r.descFR || '',
    minTier: r.minTier || null, oneShot: !!r.oneShot, actif: r.actif !== false,
  }));
  await setDoc(REF(), { liste: propre, updatedAt: serverTimestamp() });
}

export const nouvelleRecompense = (minTier?: string): Reward => ({
  id: `rec-${Date.now().toString(36)}`,
  cost: 100, labelFR: '', labelEN: '', descFR: '', descEN: '',
  minTier: minTier || undefined, oneShot: false, actif: true,
});
