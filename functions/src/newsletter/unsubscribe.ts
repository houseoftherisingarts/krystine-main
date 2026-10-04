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
    // Les raisons du départ (27 sept. 2026), facultatives, envoyées après le
    // désabonnement : elles deviennent des étiquettes depart-… sur les fiches
    // de l'adresse, et le texte libre reste dans raisonAutre.
    const RAISONS = ['trop-de-courriels', 'contenu', 'pas-inscrite', 'autrement', 'autre'];
    const raisons = (Array.isArray(req.body?.raisons) ? req.body.raisons : []).map(String).filter((r: string) => RAISONS.includes(r));
    const autre = String(req.body?.autre || '').trim().slice(0, 500);
    if (!token) { res.json({ ok: false }); return; }

    try {
      const db = getFirestore();
      const snap = await db.collection('newsletter').where('unsubscribeToken', '==', token).limit(1).get();
      if (snap.empty) { res.json({ ok: false }); return; }

      let d = snap.docs[0];
      // Une fiche fusionnée renvoie à sa principale (fusion des doublons, 4 oct. 2026) :
      // le lien d'une vieille lettre agit sur la bonne fiche.
      const principale = (d.data() as any).fusionneDans;
      if (principale) {
        const p = await db.collection('newsletter').doc(String(principale)).get();
        if (p.exists) d = p as typeof d;
      }
      if (raisons.length || autre) {
        const courriel = String((d.data() as any).email || '').trim().toLowerCase();
        const toutes = courriel ? (await db.collection('newsletter').where('email', '==', courriel).get()).docs.map(x => x.ref) : [d.ref];
        const champs: Record<string, unknown> = { raisonsDepart: raisons, raisonLe: Timestamp.now() };
        if (raisons.length) champs.tags = FieldValue.arrayUnion(...raisons.map((r: string) => `depart-${r}`));
        if (autre) champs.raisonAutre = autre;
        await Promise.all(toutes.map(r => r.update(champs)));
        res.json({ ok: true });
        return;
      }
      if (annuler) {
        if ((d.data() as any).status === 'unsubscribed') {
          await d.ref.update({ status: 'active', reabonneAt: Timestamp.now(), unsubscribedAt: FieldValue.delete() });
        }
        res.json({ ok: true, email: (d.data() as any).email, reabonne: true });
        return;
      }
      // Une même adresse peut vivre sous plusieurs fiches (double inscription) :
      // le désabonnement vaut pour toutes, sinon l'autre fiche continuait de
      // recevoir les lettres (corrigé le 27 sept. 2026).
      const email = String((d.data() as any).email || '').trim().toLowerCase();
      const soeurs = email ? await db.collection('newsletter').where('email', '==', email).get() : null;
      const refs = new Map([[d.ref.path, d.ref], ...(soeurs?.docs || []).filter(x => x.get('status') !== 'doublon').map(x => [x.ref.path, x.ref] as const)]);
      const quand = Timestamp.now();
      await Promise.all([...refs.values()].map(r => r.update({ status: 'unsubscribed', unsubscribedAt: quand })));
      res.json({ ok: true, email: (d.data() as any).email });
    } catch (err) {
      console.error('[unsubscribeByToken]', err);
      res.status(500).json({ ok: false });
    }
  },
);
