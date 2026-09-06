import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createHmac, timingSafeEqual } from 'node:crypto';

// ─── Les retours de Resend : rebonds et plaintes ────────────────────────────
// Le serveur SMTP dit « accepté », jamais « livré ». La vraie réponse arrive
// plus tard par ce webhook : adresse morte (rebond permanent), boîte pleine
// (rebond passager) ou lecteur qui a cliqué « pourriel » (plainte). Une
// adresse morte ou qui se plaint passe hors de la liste active sur-le-champ,
// sinon la réputation du domaine paie à chaque envoi suivant.
//   Création du webhook : POST https://api.resend.com/webhooks
//   firebase functions:secrets:set RESEND_WEBHOOK_SECRET   (le whsec_ rendu)
// Signature Svix vérifiée à la main (aucune dépendance) : HMAC-SHA256 de
// `${svix-id}.${svix-timestamp}.${corps brut}` avec le secret décodé en base64.

export const RESEND_WEBHOOK_SECRET = defineSecret('RESEND_WEBHOOK_SECRET');
const TOLERANCE_S = 5 * 60;

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    subject?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
}

function signatureValide(secret: string, id: string, ts: string, sig: string, corps: Buffer): boolean {
  if (!id || !ts || !sig) return false;
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > TOLERANCE_S) return false;
  const cle = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const attendu = createHmac('sha256', cle).update(`${id}.${ts}.`).update(corps).digest();
  return sig.split(' ').some(part => {
    const [version, valeur] = part.split(',');
    if (version !== 'v1' || !valeur) return false;
    const recu = Buffer.from(valeur, 'base64');
    return recu.length === attendu.length && timingSafeEqual(recu, attendu);
  });
}

export const resendWebhook = onRequest(
  { region: 'us-central1', secrets: [RESEND_WEBHOOK_SECRET], maxInstances: 5 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('POST only'); return; }
    const corps: Buffer = (req as unknown as { rawBody?: Buffer }).rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const ok = signatureValide(
      RESEND_WEBHOOK_SECRET.value(),
      String(req.header('svix-id') || ''),
      String(req.header('svix-timestamp') || ''),
      String(req.header('svix-signature') || ''),
      corps,
    );
    if (!ok) { res.status(401).send('bad signature'); return; }

    const ev = (req.body || {}) as ResendEvent;
    const destinataires = ([] as string[]).concat(ev.data?.to || []).map(e => e.trim().toLowerCase()).filter(Boolean);
    const db = getFirestore();

    // Un changement d'état par adresse. Les autres événements (livré, ouvert,
    // cliqué) sont reçus et ignorés : l'ouverture se mesure déjà par pixel.
    let nouveauStatut: 'bounced' | 'complained' | null = null;
    let champ: Record<string, unknown> = {};
    if (ev.type === 'email.bounced') {
      const permanent = (ev.data?.bounce?.type || '').toLowerCase() !== 'transient';
      if (permanent) {
        nouveauStatut = 'bounced';
        champ = { bouncedAt: FieldValue.serverTimestamp(), bounceReason: ev.data?.bounce?.message || ev.data?.bounce?.subType || 'permanent' };
      } else {
        champ = { rebondsPassagers: FieldValue.increment(1), dernierRebondPassagerLe: FieldValue.serverTimestamp() };
      }
    } else if (ev.type === 'email.complained') {
      nouveauStatut = 'complained';
      champ = { complainedAt: FieldValue.serverTimestamp(), unsubscribedAt: FieldValue.serverTimestamp() };
    } else {
      res.status(200).send('ignored');
      return;
    }

    let touches = 0;
    for (const email of destinataires) {
      const q = await db.collection('newsletter').where('email', '==', email).get();
      for (const d of q.docs) {
        const patch: Record<string, unknown> = { ...champ, updatedAt: FieldValue.serverTimestamp() };
        if (nouveauStatut) patch.status = nouveauStatut;
        await d.ref.set(patch, { merge: true });
        touches++;
      }
    }
    console.log('[resendWebhook]', ev.type, destinataires.join(','), 'docs:', touches);
    res.status(200).send('ok');
  },
);
