import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { MAIL_SECRETS, PUBLIC_BASE_URL, REPLY_TO, createTransporter, fromAddr } from './newsletter/mail';

// ─── Le merci après un mot de conférence (9 oct. 2026) ──────────────────────
// Le formulaire « Laissez-nous un mot » (/conferenciere/temoignage) écrit le
// témoignage dans temoignagesConference/{id} et, si la personne a laissé son
// courriel, ce courriel à part dans temoignagesContacts/{même id}. C'est la
// création de ce second document qui déclenche le merci, avec les 3 rituels
// du moment. Texte approuvé par Krystine mot pour mot : à modifier ici seulement.
// La personne n'est PAS inscrite à l'infolettre.
//
// Un seul envoi, jamais deux : avant d'envoyer, une transaction pose
// merciEnvoyeLe sur le document du contact. Si le déclencheur repasse (Firestore
// peut livrer un même événement plus d'une fois), il voit la marque et s'arrête.

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIEN_RITUELS = `${PUBLIC_BASE_URL}/boutique/trois-rituels-du-moment.pdf`;
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const COURRIEL_MERCI_TEMOIGNAGE = {
  sujet: 'Merci pour votre mot',
  avantBouton: [
    "Merci d'avoir pris le temps de nous écrire après la conférence. Vos mots aident d'autres organisatrices à imaginer ce que Krystine peut apporter à leur public.",
    'En remerciement, voici nos 3 rituels du moment, tirés des livres de Krystine : l\'eau digestive, l\'automassage du ventre et la respiration de l\'abeille.',
  ],
  bouton: 'Recevoir les 3 rituels',
  apresBouton: [
    'Une petite surprise, juste pour vous : 10 % sur la boutique INSPIRATA AYURVEDA avec le code MOT10.',
    'Notre équipe est là pour vous.',
    "L'équipe bienveillante TeamKsl",
  ],
};

/** Le premier mot du nom, sans ponctuation ni caractère de contrôle. Vide si rien d'utilisable. */
export function prenomDe(nom: unknown): string {
  const premier = String(nom ?? '').replace(/[\r\n\x00-\x1F\x7F]/g, ' ').trim().split(/\s+/)[0] || '';
  const propre = premier.replace(/[.,;:!?«»"()]+$/g, '').slice(0, 40);
  return /\p{L}/u.test(propre) ? propre : '';
}

export function composerMerci(prenom: string) {
  const g = COURRIEL_MERCI_TEMOIGNAGE;
  const salut = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const text = [
    salut,
    ...g.avantBouton,
    `${g.bouton} : ${LIEN_RITUELS}`,
    ...g.apresBouton,
  ].join('\n\n');
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#1c1712;">${esc(t)}</p>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#f4efe6;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1712;">
  <div style="max-width:560px;margin:0 auto;background:#faf6ee;border:1px solid rgba(156,122,68,.35);padding:36px;">
    ${p(salut)}
    ${g.avantBouton.map(p).join('\n    ')}
    <p style="margin:8px 0 24px;"><a href="${esc(LIEN_RITUELS)}" style="display:inline-block;background:#1c1712;color:#f4efe6;text-decoration:none;font-size:11px;letter-spacing:.18em;text-transform:uppercase;padding:14px 24px;">${esc(g.bouton)}</a></p>
    ${g.apresBouton.map(p).join('\n    ')}
  </div>
</body></html>`;
  return { sujet: g.sujet, text, html };
}

export const merciTemoignageConference = onDocumentCreated(
  { document: 'temoignagesContacts/{id}', region: 'us-central1', secrets: MAIL_SECRETS, timeoutSeconds: 60 },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const courriel = String(snap.get('courriel') ?? '').trim().toLowerCase();
    if (!EMAIL_RX.test(courriel) || /[\r\n]/.test(courriel)) {
      console.warn('[merciTemoignage] courriel absent ou invalide, aucun envoi', event.params.id);
      return;
    }

    const db = getFirestore();
    const ref = snap.ref;
    // Réserver l'envoi avant de l'effectuer : au plus un envoi par témoignage.
    const premier = await db.runTransaction(async (tx) => {
      const actuel = await tx.get(ref);
      if (!actuel.exists || actuel.get('merciEnvoyeLe')) return false;
      tx.update(ref, { merciEnvoyeLe: FieldValue.serverTimestamp() });
      return true;
    });
    if (!premier) return;

    const temoignage = await db.doc(`temoignagesConference/${event.params.id}`).get();
    const { sujet, text, html } = composerMerci(prenomDe(temoignage.get('nom')));

    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        from: fromAddr("L'équipe Krystine St-Laurent"),
        to: courriel,
        replyTo: REPLY_TO,
        subject: sujet,
        text,
        html,
      });
    } catch (err) {
      // La marque reste posée : on préfère un merci manqué (visible ici) à un double envoi.
      console.error('[merciTemoignage] envoi impossible', event.params.id, err);
      await ref.update({ merciErreur: String((err as Error)?.message || err).slice(0, 300) }).catch(() => {});
    } finally {
      transporter.close();
    }
  },
);
