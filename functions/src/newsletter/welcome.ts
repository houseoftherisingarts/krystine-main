import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MAIL_SECRETS,
  NEWSLETTER_POSTAL_ADDRESS,
  PUBLIC_BASE_URL,
  createTransporter,
  fromAddr,
  unsubscribeUrl,
} from './mail';
import { findEventByTags, sendLiveMail } from './live';

// ─── Courriel de bienvenue ───────────────────────────────────────────────────
// Déclenché à la création d'un document dans `newsletter` (formulaire public
// ou ajout manuel par l'admin). Envoie un seul courriel de bienvenue au nouvel
// inscrit, puis marque le document avec `welcomeSentAt` : le déclencheur peut
// être relancé par Firebase, il ne renverra jamais deux fois.
// Les imports CSV (source `csv-import`) et les inscrits non actifs sont ignorés.

const CHARTE = {
  cream: '#f6f3ee',
  espresso: '#2a2015',
  brass: '#bb9a5e',
  brassInk: '#7d6330',
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

const IMAGE_URL = `${PUBLIC_BASE_URL}/foyer/livre-fleurs.webp`;

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const WELCOME_SUBJECT = 'Vous êtes maintenant inscrit·e à l\'infolettre';

// Texte du courriel, une seule fois, servi en HTML et en texte brut.
function paragraphs(firstName?: string): string[] {
  const salut = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  return [
    salut,
    'Vous êtes maintenant inscrit·e à l\'infolettre, ce courrier que nous envoyons au rythme des saisons. Vous y trouverez à l\'occasion des rituels ou des lectures à emporter avec vous, ainsi que d\'autres petits trésors.',
    'Vous n\'avez rien d\'autre à faire pour le moment. La prochaine infolettre arrivera dans votre boîte.',
    'À bientôt,',
    'Krystine St-Laurent',
  ];
}

export function renderWelcomeHtml(opts: { firstName?: string; unsubscribeUrl: string; postalAddress: string }): string {
  const [salut, ...reste] = paragraphs(opts.firstName);
  const signature = reste.slice(-2);
  const corps = reste.slice(0, -2);
  const p = (t: string) =>
    `<tr><td style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.espresso};">${esc(t)}</td></tr>`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(WELCOME_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:${CHARTE.cream};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;color:transparent;line-height:1px;">Vous êtes maintenant inscrit·e à l'infolettre. La prochaine arrivera dans votre boîte.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.cream};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:15px;overflow:hidden;">
        <tr><td style="padding:0;">
          <img src="${IMAGE_URL}" width="600" alt="Un livre ouvert, quelques roses séchées entre les pages" style="display:block;width:100%;max-width:600px;height:auto;border-radius:15px 15px 0 0;" />
        </td></tr>
        <tr><td style="padding:40px 40px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 10px;font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${CHARTE.brassInk};font-weight:600;">Inspirata</td></tr>
            <tr><td style="padding:0 0 22px;font-family:${CHARTE.serif};font-size:36px;line-height:1.08;color:${CHARTE.espresso};font-weight:500;">Vous êtes bien inscrit·e</td></tr>
            <tr><td style="padding:0 0 26px;"><div style="height:1px;width:64px;background:${CHARTE.brass};"></div></td></tr>
            ${p(salut)}
            ${corps.map(p).join('\n')}
            <tr><td style="padding:8px 0 0;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.espresso};">${esc(signature[0])}<br /><span style="font-family:${CHARTE.serif};font-size:22px;color:${CHARTE.brassInk};">${esc(signature[1])}</span></td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 40px 32px;border-top:1px solid rgba(42,32,21,0.08);font-family:${CHARTE.sans};font-size:11px;line-height:1.6;color:rgba(42,32,21,0.55);">
          <div style="margin-bottom:8px;">${esc(opts.postalAddress)}</div>
          <div><a href="${esc(opts.unsubscribeUrl)}" style="color:${CHARTE.brassInk};text-decoration:underline;">Se désabonner</a> · <a href="${PUBLIC_BASE_URL}/politique-de-confidentialite" style="color:${CHARTE.brassInk};text-decoration:underline;">Politique de confidentialité</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderWelcomeText(opts: { firstName?: string; unsubscribeUrl: string; postalAddress: string }): string {
  return [...paragraphs(opts.firstName), '', opts.postalAddress, `Se désabonner : ${opts.unsubscribeUrl}`].join('\n\n');
}

export const sendWelcomeEmail = onDocumentCreated(
  { document: 'newsletter/{id}', secrets: MAIL_SECRETS, timeoutSeconds: 60 },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const d = snap.data() as {
      email?: string;
      firstName?: string;
      status?: string;
      source?: string;
      unsubscribeToken?: string;
      tags?: string[];
      welcomeSentAt?: unknown;
    };

    if (d.welcomeSentAt) return;
    if (!d.email || (d.status && d.status !== 'active')) return;
    if (d.source === 'csv-import') return;

    // Verrou d'abord : si Firebase relance l'événement, la deuxième exécution
    // trouve le champ et s'arrête avant l'envoi.
    await snap.ref.update({ welcomeSentAt: FieldValue.serverTimestamp() });

    const unsub = unsubscribeUrl(d.unsubscribeToken || '');
    const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();
    const transporter = createTransporter();
    try {
      // Inscription à un direct du podcast : la confirmation du direct
      // remplace le mot de bienvenue (date, lien, agenda).
      if (d.source === 'podcast-live') {
        const ev = await findEventByTags(d.tags);
        if (ev) {
          await sendLiveMail(transporter, 'confirm', ev, { email: d.email, firstName: d.firstName, unsubscribeToken: d.unsubscribeToken });
          return;
        }
      }
      await transporter.sendMail({
        from: fromAddr(),
        to: d.email,
        subject: WELCOME_SUBJECT,
        html: renderWelcomeHtml({ firstName: d.firstName, unsubscribeUrl: unsub, postalAddress }),
        text: renderWelcomeText({ firstName: d.firstName, unsubscribeUrl: unsub, postalAddress }),
        headers: {
          'List-Unsubscribe': `<${unsub}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
    } catch (err) {
      // Envoi raté : on retire le verrou pour qu'une relance manuelle puisse réessayer.
      console.error('[sendWelcomeEmail] envoi raté', d.email, err);
      await snap.ref.update({ welcomeSentAt: FieldValue.delete(), welcomeError: String(err) });
    } finally {
      transporter.close();
    }
  },
);
