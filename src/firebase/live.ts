import app from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Envoi immédiat d'un courriel de la série du direct, déclenché depuis
// l'admin. Krystine choisit l'étape et à qui elle part : les inscrits de ce
// direct, ou toute la liste active.
export type EtapeDirect = 'd3' | 'veille' | 'h1' | 'replay';
export type AudienceDirect = 'inscrits' | 'tous';

export async function envoyerRappelDirect(
  eventId: string, step: EtapeDirect, audience: AudienceDirect,
): Promise<{ sent: number; total: number }> {
  if (!app) throw new Error('Firebase non configuré.');
  const call = httpsCallable<
    { eventId: string; step: EtapeDirect; audience: AudienceDirect },
    { ok: boolean; sent: number; total: number }
  >(getFunctions(app, 'us-central1'), 'envoyerRappelDirect');
  const { data } = await call({ eventId, step, audience });
  return { sent: data.sent, total: data.total };
}
