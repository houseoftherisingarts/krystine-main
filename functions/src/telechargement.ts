import { onRequest } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// ─── Le PDF « Le Vent » (15 octobre 2026) ────────────────────────────────────
// Le lien https://www.krystinestlaurent.ca/le-vent compte le téléchargement
// dans `telechargements/le-vent` (total, par jour de Montréal, par provenance
// `?via=`), puis renvoie aussitôt vers le fichier. Rien de personnel ne
// s'écrit. Les robots des boîtes d'entreprise qui ouvrent les liens d'un
// courriel sont comptés aussi : le chiffre est un ordre de grandeur.

const FICHIER = 'https://www.krystinestlaurent.ca/telechargements/le-vent.pdf';
const VIA = /^[a-z0-9-]{1,30}$/;

export const leVent = onRequest(
  { region: 'us-central1', maxInstances: 10 },
  async (req, res) => {
    const brut = String(req.query.via || '');
    const via = VIA.test(brut) ? brut : 'direct';
    const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montreal' }).format(new Date());
    try {
      await getFirestore().doc('telechargements/le-vent').set({
        total: FieldValue.increment(1),
        parJour: { [jour]: FieldValue.increment(1) },
        parVia: { [via]: FieldValue.increment(1) },
        dernier: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch { /* le téléchargement passe avant le compte */ }
    res.set('Cache-Control', 'no-store');
    res.redirect(302, FICHIER);
  },
);
