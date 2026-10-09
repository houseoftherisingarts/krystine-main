import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MAIL_SECRETS,
  NEWSLETTER_POSTAL_ADDRESS,
  PUBLIC_BASE_URL,
  REPLY_TO,
  createTransporter,
  fromAddr,
  unsubscribeUrl, unsubscribeOneClickUrl, assurerJeton } from './mail';
import { findEventByTags, sendLiveMail } from './live';
import { SERIE_DIMANCHES } from './dimanches';

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

export const WELCOME_IMAGE_URL = `${PUBLIC_BASE_URL}/foyer/livre-fleurs-mail.jpg`;
const IMAGE_URL = WELCOME_IMAGE_URL;

// Photo embarquée en pièce inline : visible même quand le client bloque les
// images distantes (leçon des tests du 26 août).
export function welcomeAttachments() {
  return [{ filename: 'livre-fleurs.jpg', href: IMAGE_URL, cid: 'photo' }];
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const WELCOME_SUBJECT = 'Vous êtes bien inscrite';

/** Ce qui change d'un courriel de confirmation à l'autre : l'en-tête, le titre
 *  et les paragraphes du corps. Le salut et la signature restent communs. */
export interface ContenuConfirmation {
  sujet: string;
  surtitre: string;
  titre: string;
  apercu: string;
  corps: string[];
  /** Un bouton sous le corps (ex. le lien d'un PDF à télécharger). */
  lien?: { libelle: string; url: string };
  /** La formule et la signature, si elles diffèrent de « À bientôt, Krystine St-Laurent ». */
  signature?: [string, string];
}

const CONTENU_GENERAL: ContenuConfirmation = {
  sujet: 'Vous êtes bien inscrite',
  surtitre: 'Inspirata',
  titre: 'Vous êtes bien inscrite',
  apercu: 'Votre inscription est bien reçue. Les prochaines lettres suivront les saisons.',
  corps: [
    'Votre inscription est bien reçue, et vous n\'avez rien d\'autre à faire pour le moment.',
    'Les prochaines lettres vous arriveront au fil des saisons, avec à l\'occasion un rituel ou une lecture à emporter avec vous, et vous serez avisée avant toute annonce publique.',
  ],
};

// Les listes qui ont leur propre courriel de confirmation, par étiquette.
// Une inscrite qui rejoint l'une d'elles reçoit ce courriel plutôt que le mot
// de bienvenue général, même si elle était déjà abonnée (Krystine, 27 sept.
// 2026). Le texte reprend celui de la page de liste d'attente; Krystine le
// réécrira dans sa voix.
export const CONFIRMATIONS_LISTES: Record<string, ContenuConfirmation> = {
  'waitlist-origine2': {
    sujet: 'Votre inscription à Expérience Origine 2',
    surtitre: 'Expérience Origine 2',
    titre: 'Vous êtes sur la liste',
    apercu: 'Vous recevrez l\'invitation avant toute annonce publique.',
    corps: [
      'Votre inscription à la liste d\'attente d\'Expérience Origine 2 est bien reçue.',
      'Expérience Origine 2 est la suite du parcours signature, un accompagnement de douze semaines pour retrouver vos propres repères.',
      'Les portes ouvriront bientôt. Vous recevrez l\'invitation avant toute annonce publique, et vous n\'avez rien d\'autre à faire d\'ici là.',
    ],
  },
  // Les 3 rituels du moment en PDF, demandés depuis /boutique (8 oct. 2026).
  // Texte à faire approuver par Krystine avant la mise en ligne.
  'boutique-3-rituels-du-moment': {
    sujet: 'Vos 3 rituels du moment',
    surtitre: 'INSPIRATA AYURVEDA',
    titre: 'Vos 3 rituels du moment',
    apercu: 'L\'eau digestive, l\'automassage du ventre et la respiration de l\'abeille, en PDF.',
    corps: [
      'Voici les 3 rituels du moment que vous avez demandés sur la boutique.',
      'L\'eau digestive du matin, l\'automassage du ventre au réveil, le massage des oreilles et la respiration de l\'abeille : trois rituels cités mot pour mot de Nature & Ayurveda et de Féminité & Ayurveda.',
    ],
    lien: { libelle: 'Télécharger les 3 rituels en PDF', url: `${PUBLIC_BASE_URL}/boutique/trois-rituels-du-moment.pdf` },
    signature: ['Notre équipe est là pour vous,', 'L\'équipe'],
  },

};

/** Le courriel propre à une liste portée par ces étiquettes, s'il y en a un. */
export function confirmationPourTags(tags?: string[]): { tag: string; contenu: ContenuConfirmation } | null {
  for (const tag of tags || []) {
    if (CONFIRMATIONS_LISTES[tag]) return { tag, contenu: CONFIRMATIONS_LISTES[tag] };
  }
  return null;
}

// Texte du courriel, une seule fois, servi en HTML et en texte brut.
function paragraphs(firstName?: string, contenu: ContenuConfirmation = CONTENU_GENERAL): string[] {
  const salut = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const [formule, nom] = contenu.signature || ['À bientôt,', 'Krystine St-Laurent'];
  return [salut, ...contenu.corps, ...(contenu.lien ? [`${contenu.lien.libelle} : ${contenu.lien.url}`] : []), formule, nom];
}

export function renderWelcomeHtml(opts: { firstName?: string; unsubscribeUrl: string; postalAddress: string; contenu?: ContenuConfirmation }): string {
  const contenu = opts.contenu || CONTENU_GENERAL;
  const [salut, ...reste] = paragraphs(opts.firstName, contenu);
  const signature = reste.slice(-2);
  // Le lien, s'il y en a un, se rend en bouton plutôt qu'en paragraphe.
  const corps = reste.slice(0, contenu.lien ? -3 : -2);
  const p = (t: string) =>
    `<tr><td style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.espresso};">${esc(t)}</td></tr>`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(contenu.sujet)}</title>
</head>
<body style="margin:0;padding:0;background:${CHARTE.cream};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;color:transparent;line-height:1px;">${esc(contenu.apercu)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.cream};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:15px;overflow:hidden;">
        <tr><td style="padding:0;">
          <img src="cid:photo" width="600" alt="Un livre ouvert, quelques roses séchées entre les pages" style="display:block;width:100%;max-width:600px;height:auto;border-radius:15px 15px 0 0;" />
        </td></tr>
        <tr><td style="padding:40px 40px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 10px;font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${CHARTE.brassInk};font-weight:600;">${esc(contenu.surtitre)}</td></tr>
            <tr><td style="padding:0 0 22px;font-family:${CHARTE.serif};font-size:36px;line-height:1.08;color:${CHARTE.espresso};font-weight:500;">${esc(contenu.titre)}</td></tr>
            <tr><td style="padding:0 0 26px;"><div style="height:1px;width:64px;background:${CHARTE.brass};"></div></td></tr>
            ${p(salut)}
            ${corps.map(p).join('\n')}
            ${contenu.lien ? `<tr><td style="padding:4px 0 26px;"><a href="${esc(contenu.lien.url)}" style="display:inline-block;background:#1c1712;color:#f4efe6;font-family:${CHARTE.sans};font-size:13px;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:15px 26px;">${esc(contenu.lien.libelle)}</a></td></tr>` : ''}
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

export function renderWelcomeText(opts: { firstName?: string; unsubscribeUrl: string; postalAddress: string; contenu?: ContenuConfirmation }): string {
  return [...paragraphs(opts.firstName, opts.contenu), '', opts.postalAddress, `Se désabonner : ${opts.unsubscribeUrl}`].join('\n\n');
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

    const jeton = await assurerJeton(snap.ref, d.unsubscribeToken);
    const unsub = unsubscribeUrl(jeton);
    const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();
    const transporter = createTransporter();
    try {
      // Inscription à un direct du podcast : la confirmation du direct
      // remplace le mot de bienvenue (date, lien, agenda).
      // Les Dimanches d'Origine passent par la même porte (dimanches.ts).
      if (d.source === 'podcast-live' || d.source === SERIE_DIMANCHES) {
        const ev = await findEventByTags(d.tags);
        if (ev) {
          await sendLiveMail(transporter, 'confirm', ev, { email: d.email, firstName: d.firstName, unsubscribeToken: jeton, ref: snap.ref });
          return;
        }
      }
      // Une liste qui a son propre courriel (Expérience Origine 2) le reçoit à
      // la place du mot général.
      const propre = confirmationPourTags(d.tags);
      const contenu = propre?.contenu;
      if (propre) await snap.ref.update({ [`confirmationsEnvoyees.${propre.tag}`]: FieldValue.serverTimestamp() });
      await transporter.sendMail({
        replyTo: REPLY_TO,
        from: fromAddr(),
        to: d.email,
        subject: contenu?.sujet || WELCOME_SUBJECT,
        html: renderWelcomeHtml({ firstName: d.firstName, unsubscribeUrl: unsub, postalAddress, contenu }),
        text: renderWelcomeText({ firstName: d.firstName, unsubscribeUrl: unsub, postalAddress, contenu }),
        headers: {
          'List-Unsubscribe': `<${unsubscribeOneClickUrl(jeton)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        attachments: welcomeAttachments(),
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

/**
 * Le courriel propre à une liste, pour une abonnée DÉJÀ connue qui la rejoint :
 * sa fiche existe, `sendWelcomeEmail` ne se déclenche donc pas. Le verrou
 * `confirmationsEnvoyees.<étiquette>` empêche un deuxième envoi pour la même
 * liste. Un échec d'envoi ne fait jamais échouer l'inscription elle-même.
 */
export async function envoyerConfirmationListe(
  ref: FirebaseFirestore.DocumentReference,
  fiche: { email: string; firstName?: string; unsubscribeToken?: string; confirmationsEnvoyees?: Record<string, unknown> },
  tag: string,
): Promise<void> {
  const contenu = CONFIRMATIONS_LISTES[tag];
  if (!contenu || fiche.confirmationsEnvoyees?.[tag]) return;
  await ref.update({ [`confirmationsEnvoyees.${tag}`]: FieldValue.serverTimestamp() });
  const jeton = await assurerJeton(ref, fiche.unsubscribeToken);
  const unsub = unsubscribeUrl(jeton);
  const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();
  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      replyTo: REPLY_TO,
      from: fromAddr(),
      to: fiche.email,
      subject: contenu.sujet,
      html: renderWelcomeHtml({ firstName: fiche.firstName, unsubscribeUrl: unsub, postalAddress, contenu }),
      text: renderWelcomeText({ firstName: fiche.firstName, unsubscribeUrl: unsub, postalAddress, contenu }),
      headers: {
        'List-Unsubscribe': `<${unsubscribeOneClickUrl(jeton)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      attachments: welcomeAttachments(),
    });
  } catch (err) {
    console.error('[envoyerConfirmationListe] envoi raté', fiche.email, tag, err);
    await ref.update({ [`confirmationsEnvoyees.${tag}`]: FieldValue.delete() });
  } finally {
    transporter.close();
  }
}
