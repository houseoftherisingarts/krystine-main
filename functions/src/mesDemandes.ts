// La liste des demandes faites au studio Vexel, lue pour l'admin du site.
//
// Krystine a demandé, le 21 septembre 2026, de voir ce qu'elle a demandé avec
// un crochet quand c'est fait. Les demandes vivent chez Vexel, pas ici : elles
// partent du formulaire encadré dans l'admin (DemandeVexel.tsx) vers la
// fonction recevoirDemande du studio, et se relisent par demandesClient.
//
// Cette callable existe pour que la clé du client ne descende jamais dans le
// navigateur pour une lecture. Elle vérifie que l'appelante est bien une admin
// du site, lit la clé dans le secret VEXEL_CLE, appelle le studio depuis le
// serveur, et ne rend à la page que la liste déjà nettoyée par Vexel : le
// texte, l'état, les dates et la réponse écrite du studio. Rien d'autre ne
// transite.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ADMIN_EMAILS } from './newsletter/send';

/** La clé du dossier Krystine chez Vexel (clients/krystine.cle dans vexel-integrations). */
const VEXEL_CLE = defineSecret('VEXEL_CLE');

const CLIENT = 'krystine';
const ENDPOINT = 'https://us-central1-vexel-integrations.cloudfunctions.net/demandesClient';

interface DemandeVue {
  id: string;
  recu: string;
  type: 'bug' | 'changement' | 'contact';
  texte: string;
  statut: string;
  resultat: string;
  fin: string;
}

export const mesDemandes = onCall(
  { region: 'us-central1', secrets: [VEXEL_CLE], timeoutSeconds: 30, memory: '256MiB' },
  async (req): Promise<{ demandes: DemandeVue[] }> => {
    const email = String(req.auth?.token?.email || '').toLowerCase();
    if (!req.auth || !ADMIN_EMAILS.includes(email)) {
      throw new HttpsError('permission-denied', 'Réservé à l’admin.');
    }

    const cle = VEXEL_CLE.value();
    if (!cle) throw new HttpsError('failed-precondition', 'La clé du studio n’est pas configurée.');

    let reponse: Response;
    try {
      reponse = await fetch(`${ENDPOINT}?client=${CLIENT}`, { headers: { 'X-Vexel-Cle': cle } });
    } catch (err) {
      console.error('mesDemandes : le studio ne répond pas :', err);
      throw new HttpsError('unavailable', 'Le studio ne répond pas. Réessayez dans un instant.');
    }
    if (!reponse.ok) {
      console.error(`mesDemandes : le studio a répondu ${reponse.status}`);
      throw new HttpsError('unavailable', 'Le studio n’a pas rendu la liste. Réessayez dans un instant.');
    }

    const corps = (await reponse.json().catch(() => null)) as { demandes?: unknown } | null;
    const demandes = Array.isArray(corps?.demandes) ? (corps.demandes as DemandeVue[]) : [];
    return { demandes };
  },
);
