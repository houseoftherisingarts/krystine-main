// La billetterie maison : ouverture de la session Stripe, encaissement du
// webhook, fabrication des billets et envoi du courriel qui les porte.
//
// Le navigateur ne crée jamais un billet (firestore.rules l'interdit) : tout
// document de la collection `billets` vient d'ici, avec le SDK d'administration,
// après confirmation du paiement par Stripe.
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createTransporter, fromAddr, REPLY_TO } from './newsletter/mail';

// Dupliqué volontairement depuis paiements.ts plutôt qu'importé : les deux
// fichiers s'appellent l'un l'autre (le webhook de paiements.ts appelle
// traiterPaiementBillets), un import croisé créerait un cycle de modules.
// defineSecret('STRIPE_SECRET_KEY') se rappelle sans problème d'un fichier à
// l'autre, c'est le patron recommandé par firebase-functions.
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const SITE = 'https://www.krystinestlaurent.ca';
const TAXES_QC = {
  'automatic_tax[enabled]': 'true',
  billing_address_collection: 'required',
} as const;

const CHEMIN_BILLETS = 'billets';
const ALPHABET_BILLET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ni O, ni I, ni 0, ni 1

// Le sous-ensemble d'EventDoc (src/firebase/firestore.ts) dont ce fichier a
// besoin. functions/ ne partage pas les modèles avec src/ (SDK admin contre
// SDK client), donc le type se redéclare ici, à l'étroit.
interface EvenementBillets {
  title?: string;
  date?: string;
  location?: string;
  slug?: string;
  billetterie?: boolean;
  isPublished?: boolean;
  prixCents?: number;
  places?: number;
  vendus?: number;
  maxParAchat?: number;
  heure?: string;
  adresse?: string;
}

interface StripeSession {
  id: string;
  payment_status?: string;
  amount_total?: number;
  total_details?: { amount_tax?: number };
  customer_email?: string;
  customer_details?: { email?: string; name?: string };
  metadata?: Record<string, string>;
}

export function genererCodeBillet(): string {
  const octets = randomBytes(8);
  let corps = '';
  for (let i = 0; i < 8; i++) corps += ALPHABET_BILLET[octets[i] % ALPHABET_BILLET.length];
  return `KSL-${corps.slice(0, 4)}-${corps.slice(4, 8)}`;
}

export const creerSessionBillets = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour prendre un billet.');
    const eventId = String(req.data?.eventId || '');
    if (!eventId) throw new HttpsError('invalid-argument', 'Événement manquant.');

    const db = getFirestore();
    const snap = await db.doc(`events/${eventId}`).get();
    if (!snap.exists) throw new HttpsError('not-found', 'Événement introuvable.');
    const event = snap.data() as EvenementBillets;

    if (!event.billetterie) throw new HttpsError('failed-precondition', 'Cet événement ne vend pas ses billets ici.');
    if (event.isPublished === false) throw new HttpsError('failed-precondition', 'Cet événement n\'est pas encore publié.');
    if (!event.prixCents || event.prixCents <= 0) throw new HttpsError('failed-precondition', 'Ce billet n\'a pas de prix.');

    const maxParAchat = event.maxParAchat && event.maxParAchat > 0 ? event.maxParAchat : 6;
    const quantite = Math.trunc(Number(req.data?.quantite ?? 1));
    if (!Number.isFinite(quantite) || quantite < 1 || quantite > maxParAchat) {
      throw new HttpsError('invalid-argument', `Choisissez entre 1 et ${maxParAchat} billets.`);
    }

    const restantes = (event.places ?? 0) - (event.vendus ?? 0);
    if (restantes < quantite) throw new HttpsError('failed-precondition', 'Il ne reste pas assez de places.');

    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': event.title || 'Billet',
      'line_items[0][price_data][unit_amount]': String(event.prixCents),
      'line_items[0][price_data][tax_behavior]': 'exclusive',
      'line_items[0][quantity]': String(quantite),
      ...TAXES_QC,
      success_url: `${SITE}/compte?onglet=billets&achat=ok`,
      cancel_url: `${SITE}/evenement/${event.slug || eventId}`,
      'metadata[type]': 'billets',
      'metadata[uid]': req.auth.uid,
      'metadata[eventId]': eventId,
      'metadata[quantite]': String(quantite),
    });
    const email = req.auth.token.email;
    if (email) body.set('customer_email', String(email));

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const session = (await r.json()) as { url?: string; error?: { message?: string } };
    if (!r.ok || !session.url) {
      console.error('[billetterie] session refusée', session.error?.message);
      throw new HttpsError('internal', 'Le paiement n\'a pas pu démarrer. Réessayez.');
    }
    return { url: session.url };
  },
);

// Appelé depuis le webhook de paiements.ts quand session.metadata.type === 'billets'.
// Idempotent : Stripe rejoue ses webhooks, un sessionId déjà servi ne refait rien.
// Un échec d'envoi de courriel ne remonte jamais : les billets restent écrits
// même si la lettre ne part pas, et l'erreur se journalise.
export async function traiterPaiementBillets(session: StripeSession): Promise<void> {
  const uid = session.metadata?.uid;
  const eventId = session.metadata?.eventId;
  const quantite = Number(session.metadata?.quantite || 1);
  if (!uid || !eventId || session.payment_status !== 'paid') return;

  const db = getFirestore();
  const dejaServi = await db.collection(CHEMIN_BILLETS).where('sessionId', '==', session.id).limit(1).get();
  if (!dejaServi.empty) {
    console.log(`[billetterie] session ${session.id} déjà traitée`);
    return;
  }

  const eventRef = db.doc(`events/${eventId}`);
  let event: EvenementBillets | undefined;
  let codes: string[] = [];
  try {
    await db.runTransaction(async (tx) => {
      const eSnap = await tx.get(eventRef);
      if (!eSnap.exists) throw new Error('événement introuvable');
      event = eSnap.data() as EvenementBillets;
      const restantes = (event.places ?? 0) - (event.vendus ?? 0);
      // Le paiement est déjà pris : on journalise plutôt que de planter, la
      // survente se règle à la main (remboursement ou place ajoutée).
      if (restantes < quantite) throw new Error(`places insuffisantes (${restantes} restantes pour ${quantite} demandées)`);

      const nouveauxCodes: string[] = [];
      for (let i = 0; i < quantite; i++) {
        let code = genererCodeBillet();
        let ref = db.doc(`${CHEMIN_BILLETS}/${code}`);
        let tentative = 0;
        while ((await tx.get(ref)).exists && tentative < 5) {
          code = genererCodeBillet();
          ref = db.doc(`${CHEMIN_BILLETS}/${code}`);
          tentative++;
        }
        nouveauxCodes.push(code);
      }

      tx.update(eventRef, { vendus: FieldValue.increment(quantite) });
      const montantUnitaire = Math.round((session.amount_total || 0) / quantite);
      const taxesUnitaire = Math.round((session.total_details?.amount_tax || 0) / quantite);
      const email = session.customer_details?.email || session.customer_email || '';
      const nom = session.customer_details?.name || '';
      nouveauxCodes.forEach((code, i) => {
        tx.set(db.doc(`${CHEMIN_BILLETS}/${code}`), {
          code,
          eventId,
          eventTitre: event?.title || '',
          eventDate: event?.date || '',
          eventLieu: event?.adresse || event?.location || '',
          uid, email, nom,
          sessionId: session.id,
          rang: i + 1,
          montantCents: montantUnitaire,
          taxesCents: taxesUnitaire,
          utilise: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
      codes = nouveauxCodes;
    });
  } catch (err) {
    console.error('[billetterie] webhook refusé', session.id, err);
    return;
  }

  console.log(`[billetterie] ${codes.length} billet(s) pour ${uid} · ${eventId} · ${session.id}`);
  try {
    if (event) await envoyerCourrielBillets(event, codes, session);
  } catch (err) {
    console.error('[billetterie] envoi du courriel de billets raté', session.id, err);
  }
}

// ─── Le courriel qui porte les billets ───────────────────────────────────────
const CHARTE = {
  cream: '#f6f3ee',
  espresso: '#2a2015',
  brass: '#bb9a5e',
  brassInk: '#7d6330',
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ligneLieuDate(event: EvenementBillets): string {
  const morceaux = [event.date, event.heure ? `à ${event.heure}` : '', event.adresse ? `à ${event.adresse}` : ''].filter(Boolean);
  return morceaux.join(', ');
}

async function envoyerCourrielBillets(event: EvenementBillets, codes: string[], session: StripeSession): Promise<void> {
  const email = session.customer_details?.email || session.customer_email;
  if (!email) return;
  const nom = session.customer_details?.name || '';
  const titre = event.title || 'votre événement';
  const infosPratiques = ligneLieuDate(event);

  const salut = nom ? `Bonjour ${nom},` : 'Bonjour,';
  const pluriel = codes.length > 1;
  const intro = infosPratiques
    ? `Votre achat pour ${titre} est confirmé, et voici ${pluriel ? `vos ${codes.length} billets` : 'votre billet'} pour la soirée du ${infosPratiques}.`
    : `Votre achat pour ${titre} est confirmé, et voici ${pluriel ? `vos ${codes.length} billets` : 'votre billet'}.`;
  const consigne = `Chaque billet porte son propre code et son propre code QR ci-dessous, et il se présente à l'entrée depuis votre téléphone ou imprimé sur papier.`;

  const qrs = await Promise.all(codes.map((c) => QRCode.toDataURL(c, { margin: 1, width: 220 })));
  const attachments = qrs.map((dataUrl, i) => ({
    filename: `billet-${i + 1}.png`,
    content: Buffer.from(dataUrl.split(',')[1] || '', 'base64'),
    cid: `qr${i}`,
  }));

  const blocsBillets = codes
    .map(
      (code, i) => `
        <tr><td style="padding:18px 0;border-top:1px solid rgba(42,32,21,0.12);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="120" style="padding:0 16px 0 0;">
                <img src="cid:qr${i}" width="104" height="104" alt="Code QR du billet ${i + 1}" style="display:block;border-radius:8px;" />
              </td>
              <td style="font-family:${CHARTE.sans};font-size:14px;color:${CHARTE.espresso};">
                <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${CHARTE.brassInk};margin-bottom:6px;">Billet ${i + 1}${codes.length > 1 ? ` sur ${codes.length}` : ''}</div>
                <div style="font-family:${CHARTE.serif};font-size:22px;color:${CHARTE.espresso};letter-spacing:0.04em;">${esc(code)}</div>
              </td>
            </tr>
          </table>
        </td></tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(`Vos billets · ${titre}`)}</title></head>
<body style="margin:0;padding:0;background:${CHARTE.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.cream};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:15px;overflow:hidden;">
        <tr><td style="padding:40px 40px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 10px;font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${CHARTE.brassInk};font-weight:600;">Vos billets</td></tr>
            <tr><td style="padding:0 0 22px;font-family:${CHARTE.serif};font-size:32px;line-height:1.15;color:${CHARTE.espresso};font-weight:500;">${esc(titre)}</td></tr>
            <tr><td style="padding:0 0 26px;"><div style="height:1px;width:64px;background:${CHARTE.brass};"></div></td></tr>
            <tr><td style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.espresso};">${esc(salut)}</td></tr>
            <tr><td style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.espresso};">${esc(intro)}</td></tr>
            <tr><td style="padding:0 0 8px;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.espresso};">${esc(consigne)}</td></tr>
            ${blocsBillets}
            <tr><td style="padding:24px 0 0;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.espresso};">Au plaisir de vous accueillir,<br /><span style="font-family:${CHARTE.serif};font-size:22px;color:${CHARTE.brassInk};">Krystine St-Laurent</span></td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    salut,
    intro,
    consigne,
    ...codes.map((c, i) => `Billet ${i + 1}${codes.length > 1 ? `/${codes.length}` : ''} : ${c}`),
    '',
    'Au plaisir de vous accueillir,',
    'Krystine St-Laurent',
  ].join('\n\n');

  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      replyTo: REPLY_TO,
      from: fromAddr(),
      to: email,
      subject: `Vos billets · ${titre}`,
      html,
      text,
      attachments,
    });
  } finally {
    transporter.close();
  }
}
