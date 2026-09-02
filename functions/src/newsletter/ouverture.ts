import { onRequest } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// ─── Le taux d'ouverture ─────────────────────────────────────────────────────
// Chaque infolettre part avec une image d'un point, propre à la personne et à
// l'envoi. Quand la boîte de réception charge l'image, cette fonction compte
// l'ouverture une seule fois par personne, puis rend l'image. Les messageries
// qui bloquent les images ne comptent pas, ce qui est vrai partout : le taux
// se lit comme un plancher, jamais comme une mesure exacte.

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export const ouverture = onRequest(
  { region: 'us-central1', cors: true, maxInstances: 10 },
  async (req, res) => {
    const n = String(req.query.n || '');
    const s = String(req.query.s || '');
    res.set('Cache-Control', 'no-store, max-age=0');
    res.set('Content-Type', 'image/gif');

    if (n && s) {
      try {
        const db = getFirestore();
        const marque = db.doc(`newsletters/${n}/ouvertures/${s}`);
        if (!(await marque.get()).exists) {
          await marque.set({ at: FieldValue.serverTimestamp() });
          await db.doc(`newsletters/${n}`).set({
            stats: { opens: FieldValue.increment(1) },
          }, { merge: true });
          await db.doc(`newsletter/${s}`).set({ derniereOuvertureLe: FieldValue.serverTimestamp() }, { merge: true });
        }
      } catch (e) {
        console.warn('[ouverture]', n, s, e);
      }
    }
    res.status(200).send(GIF);
  },
);
