import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { MAIL_SECRETS, NEWSLETTER_POSTAL_ADDRESS, createTransporter, fromAddr } from './mail';

// ─── Réponse directe à un abonné ─────────────────────────────────────────────
// Krystine répond à un contact depuis l'onglet Abonnés de l'admin. Chaque
// réponse part par courriel, de l'adresse d'équipe teamksl@inspiratanature.com,
// et se consigne dans `newsletter/{id}/reponses` pour garder le fil.
// Tant que le domaine inspiratanature.com n'est pas vérifié chez Resend, le
// courriel part de l'expéditeur infolettre (domaine vérifié) avec l'adresse
// d'équipe en Reply-To : la réponse arrive quand même, et la cliente répond
// bien à teamksl@. Le champ `expediteur` du journal dit lequel a servi.

export const TEAM_EMAIL = 'teamksl@inspiratanature.com';
const TEAM_FROM = `"Krystine St-Laurent" <${TEAM_EMAIL}>`;

const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
  'alex@lesalondesinconnus.com',
  'krystinestlaurent@gmail.com',
  'houseoftherisingarts@gmail.com',
];

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

export function renderReponseHtml(opts: { sujet: string; message: string; postalAddress: string }): string {
  const paras = opts.message.split(/\n{2,}/).map(t => t.trim()).filter(Boolean);
  const p = (t: string) =>
    `<tr><td style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.espresso};">${esc(t).replace(/\n/g, '<br />')}</td></tr>`;
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(opts.sujet)}</title></head>
<body style="margin:0;padding:0;background:${CHARTE.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.cream};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:15px;overflow:hidden;">
        <tr><td style="padding:40px 40px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 10px;font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${CHARTE.brassInk};font-weight:600;">Inspirata</td></tr>
            <tr><td style="padding:0 0 22px;font-family:${CHARTE.serif};font-size:30px;line-height:1.1;color:${CHARTE.espresso};font-weight:500;">${esc(opts.sujet)}</td></tr>
            <tr><td style="padding:0 0 26px;"><div style="height:1px;width:64px;background:${CHARTE.brass};"></div></td></tr>
            ${paras.map(p).join('\n')}
            <tr><td style="padding:8px 0 0;font-family:${CHARTE.serif};font-size:22px;color:${CHARTE.brassInk};">Krystine St-Laurent</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px 30px;border-top:1px solid rgba(42,32,21,0.08);font-family:${CHARTE.sans};font-size:11px;line-height:1.6;color:rgba(42,32,21,0.55);">
          <div>Vous pouvez répondre directement à ce courriel : il arrive à ${esc(TEAM_EMAIL)}.</div>
          <div style="margin-top:8px;">${esc(opts.postalAddress)}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function isDomainRejection(err: unknown): boolean {
  const m = String((err as { message?: string })?.message || err || '').toLowerCase();
  return m.includes('not verified') || m.includes('domain') || m.includes('403') || m.includes('validation');
}

export const repondreAbonne = onCall(
  { region: 'us-central1', secrets: MAIL_SECRETS, timeoutSeconds: 60 },
  async (req) => {
    const email = req.auth?.token?.email;
    if (!email || !ADMIN_EMAILS.includes(String(email))) {
      throw new HttpsError('permission-denied', 'Réservé à l\'administration.');
    }
    const abonneId = String(req.data?.abonneId || '').trim();
    const sujet = String(req.data?.sujet || '').trim().slice(0, 200);
    const message = String(req.data?.message || '').trim().slice(0, 10000);
    if (!abonneId) throw new HttpsError('invalid-argument', 'Abonné manquant.');
    if (!sujet) throw new HttpsError('invalid-argument', 'Le sujet est vide.');
    if (!message) throw new HttpsError('invalid-argument', 'Le message est vide.');

    const db = getFirestore();
    const ref = db.doc(`newsletter/${abonneId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Abonné introuvable.');
    const a = snap.data() as { email?: string; firstName?: string };
    if (!a.email) throw new HttpsError('failed-precondition', 'Cet abonné n\'a pas de courriel.');

    const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();
    const html = renderReponseHtml({ sujet, message, postalAddress });
    const text = [message, '', 'Krystine St-Laurent', '', `Vous pouvez répondre directement à ce courriel : il arrive à ${TEAM_EMAIL}.`, postalAddress].join('\n');
    const transporter = createTransporter();
    const base = { to: a.email, replyTo: TEAM_EMAIL, subject: sujet, html, text };

    let expediteur = TEAM_EMAIL;
    try {
      await transporter.sendMail({ ...base, from: TEAM_FROM });
    } catch (err) {
      if (!isDomainRejection(err)) throw new HttpsError('internal', `Envoi impossible : ${(err as Error).message}`);
      // Domaine d'équipe pas encore vérifié : on passe par l'expéditeur infolettre.
      expediteur = fromAddr();
      await transporter.sendMail({ ...base, from: expediteur });
    } finally {
      transporter.close();
    }

    await ref.collection('reponses').add({
      sujet,
      message,
      to: a.email,
      expediteur,
      replyTo: TEAM_EMAIL,
      envoyePar: String(email),
      envoyeLe: FieldValue.serverTimestamp(),
    });
    await ref.update({ derniereReponseLe: FieldValue.serverTimestamp() });
    return { ok: true, expediteur };
  },
);
