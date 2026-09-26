import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// Public HTTPS endpoint invoked by /desinscription?t=TOKEN. Uses the Admin
// SDK so it bypasses Firestore rules, which lets us keep the subscriber
// collection readable only to admins while still supporting token-based
// self-service unsubscribe.
//
// Returns { ok: boolean, email?: string }. CORS is open because the page is
// served from the same origin in production but may also be hit from email
// clients that strip/alter the Host header.
export const unsubscribeByToken = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    const token = (req.query.t || req.body?.t || '').toString().trim();
    // « Oups, je me suis trompée » : le même jeton, avec annuler=1, remet
    // l'abonnement. Le clic de la personne vaut un oui explicite.
    const annuler = (req.query.annuler || req.body?.annuler || '').toString() === '1';
    if (!token) { res.json({ ok: false }); return; }

    try {
      const db = getFirestore();
      const snap = await db.collection('newsletter').where('unsubscribeToken', '==', token).limit(1).get();
      if (snap.empty) { res.json({ ok: false }); return; }

      const d = snap.docs[0];
      if (annuler) {
        if ((d.data() as any).status === 'unsubscribed') {
          await d.ref.update({ status: 'active', reabonneAt: Timestamp.now(), unsubscribedAt: FieldValue.delete() });
        }
        res.json({ ok: true, email: (d.data() as any).email, reabonne: true });
        return;
      }
      await d.ref.update({ status: 'unsubscribed', unsubscribedAt: Timestamp.now() });
      res.json({ ok: true, email: (d.data() as any).email });
    } catch (err) {
      console.error('[unsubscribeByToken]', err);
      res.status(500).json({ ok: false });
    }
  },
);
