import app, { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, orderBy, query, type Timestamp } from 'firebase/firestore';

// Réponses directes de Krystine à un abonné (onglet Abonnés de l'admin).
// L'envoi passe par la fonction `repondreAbonne`; le fil se lit dans
// `newsletter/{id}/reponses`.

export interface ReponseAbonne {
  id: string;
  sujet: string;
  message: string;
  to: string;
  expediteur: string;
  envoyePar: string;
  envoyeLe?: Timestamp;
}

export async function getReponsesAbonne(abonneId: string): Promise<ReponseAbonne[]> {
  if (!db) return [];
  const q = query(collection(db, 'newsletter', abonneId, 'reponses'), orderBy('envoyeLe', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReponseAbonne));
}

export async function repondreAbonne(abonneId: string, sujet: string, message: string): Promise<{ expediteur: string }> {
  if (!app) throw new Error('Firebase non configuré.');
  const call = httpsCallable<{ abonneId: string; sujet: string; message: string }, { ok: boolean; expediteur: string }>(
    getFunctions(app, 'us-central1'), 'repondreAbonne',
  );
  const r = await call({ abonneId, sujet, message });
  return { expediteur: r.data.expediteur };
}
