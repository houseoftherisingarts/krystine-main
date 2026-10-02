import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import {
  MAIL_SECRETS, NEWSLETTER_POSTAL_ADDRESS, PUBLIC_BASE_URL, REPLY_TO,
  createTransporter, fromAddr, unsubscribeUrl,
} from './newsletter/mail';
import { renderEmailHtml, renderEmailText, newsletterAttachments, type NewsletterBlock, type RenderEmailOptions } from './newsletter/renderer';
import { assertAdmin } from './newsletter/send';
import { FORMATION_VATA_ID } from './versements';

// Le courriel de confirmation d'achat (Krystine, 2 oct. 2026) : il part tout
// de suite après chaque achat d'une formation, indépendant des séquences,
// dans le même gabarit que les lettres.
//
// L'INTERRUPTEUR : tant que cette constante est fausse, aucune cliente ne
// reçoit ce courriel. Pour l'allumer, la passer à true et publier.
export const CONFIRMATION_ACHAT_ACTIVE = true;

// La note d'engagement des versements, la même que sur la page de paiement
// (src/pages/PaiementFormation.tsx).
const NOTE_ENGAGEMENT =
  "Les versements suivants sont prélevés automatiquement chaque mois, à la date anniversaire de votre achat. Le paiement complet des versements est exigé pour préserver l'accès au programme : il ne s'agit pas d'un abonnement. En choisissant le paiement en versements, vous vous engagez à régler chaque versement à son échéance; à défaut de paiement, l'accès à la formation et aux privilèges qui s'y rattachent est suspendu jusqu'au règlement du solde.";

const SOUTIEN = 'Notre équipe est là pour vous. Une question, un doute, un petit pépin : écrivez-nous à <a href="mailto:teamksl@inspiratanature.com">teamksl@inspiratanature.com</a>.';

/** Ce que le courriel lit de la preuve d'achat (montants en cents, CAD). */
export interface Recap { total?: number; tps?: number; tvq?: number; versements?: number }

const dollars = (cents: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format((cents || 0) / 100);
const p = (text: string, taille?: string): NewsletterBlock => ({ type: 'paragraph', content: taille ? { text, taille } : { text } });
const h = (text: string): NewsletterBlock => ({ type: 'heading', content: { text, level: 2 } });

function recapBlocs(r: Recap): NewsletterBlock[] {
  const taxes = (r.tps || 0) + (r.tvq || 0) > 0 ? ` (dont TPS ${dollars(r.tps || 0)} et TVQ ${dollars(r.tvq || 0)})` : '';
  const n = Number(r.versements) || 1;
  const out = [p(`<b>${n > 1 ? 'Montant payé aujourd’hui' : 'Montant payé'}</b> : ${dollars(r.total || 0)}${taxes}.`, 'sm')];
  if (n > 1) {
    out.push(p(`Paiement en ${n} versements : les ${n === 3 ? 'deux' : n - 1} prochains seront prélevés automatiquement, chaque mois, à la date anniversaire de votre achat.`, 'sm'));
    out.push(p(NOTE_ENGAGEMENT, 'sm'));
  }
  return out;
}

export function lettreConfirmation(formationId: string, titre: string, recap: Recap, email = '', lienMotDePasse = ''): { subject: string; preheader: string; blocks: NewsletterBlock[]; titreBandeau?: string; tailleTitreBandeau?: number } {
  const lien = `${PUBLIC_BASE_URL}/cours/${formationId}`;
  const fin: NewsletterBlock[] = [{ type: 'divider', content: { style: 'ligne' } }, ...(formationId === 'kajabi-2148687644' ? [p('<b>Votre formule</b> : VATA Essentiel.', 'sm')] : []), ...recapBlocs(recap), p(SOUTIEN)];
  // Les accès, dans chaque confirmation (Krystine, 2 oct. 2026).
  const blocsAcces: NewsletterBlock[] = [
    h('Vos accès'),
    p(`<b>Votre espace</b> : <a href="${PUBLIC_BASE_URL}/compte">krystinestlaurent.ca/compte</a>, onglet Mes formations.`),
    p(`<b>Votre identifiant</b> : ${email ? `cette adresse courriel, ${email}` : 'l’adresse courriel utilisée pour votre achat'}.`),
    // Le compte ouvert par l'achat sans compte (2 oct. 2026) : le lien pour choisir le mot de passe.
    lienMotDePasse
      ? p(`<b>Votre compte est créé avec cette adresse.</b> Pour choisir votre mot de passe : <a href="${lienMotDePasse}">choisir mon mot de passe</a>. Ou connectez-vous avec Google si cette adresse est un compte Google. Le lien reste valable une heure; ensuite, « Mot de passe oublié ? » sur la page de connexion vous en envoie un nouveau.`)
      : p('<b>Pour vous connecter</b> : « Continuer avec Google » si vous avez utilisé Google, sinon votre mot de passe. Si vous ne le retrouvez plus, écrivez-nous : nous vous ouvrons la porte.'),
  ];
  if (formationId === FORMATION_VATA_ID) {
    return {
      subject: 'Bienvenue dans L’Expérience Ayurveda, Saison Vata',
      titreBandeau: 'Bienvenue dans L’Expérience Ayurveda,\nSaison Vata',
      // Plus petit que les 34 px habituels : la première ligne tient sur 520 px.
      tailleTitreBandeau: 27,
      preheader: 'Votre accès est ouvert. Voici par où commencer.',
      blocks: [
        p('Bonjour {{firstName}},'),
        p('Nous sommes très heureuses de vous accueillir dans VATA Essentiel. Votre accès est ouvert dès maintenant.'),
        { type: 'image', content: { url: `${PUBLIC_BASE_URL}/infolettre/vata-eventail.jpg`, caption: '', href: lien, alt: 'VATA Essentiel' } },
        h('Trois bonnes raisons d’avoir fait ce choix'),
        p('<b>Vous apprenez à reconnaître le Vent</b> plutôt qu’à le subir : le fil qui se perd, le sommeil qui se fragilise, ce qui s’accumule sans bruit.'),
        p('<b>Vous avancez un sens à la fois</b> : le souffle, l’ouïe, la vue, l’odorat, le goût et le toucher, en courtes capsules qui s’écoutent partout, même l’écran verrouillé.'),
        p('<b>Vous gardez tout</b> : les capsules, les méditations guidées, le journal de bord et d’observation, et le guide complet de 204 pages.'),
        h('La suite des choses'),
        p('<b>Aujourd’hui</b> : l’introduction, Préparer votre espace, et la semaine 1, Le souffle, sont ouvertes.'),
        p('<b>Chaque semaine</b> : une nouvelle semaine s’ouvre tous les 7 jours.'),
        p('<b>À la fin du parcours</b> : le guide complet de 204 pages vous attend.'),
        { type: 'button', content: { label: 'Commencer mon Expérience', href: lien } },
        ...blocsAcces,
        ...fin,
      ],
    };
  }
  return {
    subject: `Bienvenue dans ${titre}`,
    preheader: 'Votre accès est ouvert. Voici par où commencer.',
    blocks: [
      p('Bonjour {{firstName}},'),
      p(`Nous sommes très heureuses de vous accueillir dans ${titre}. Votre accès est ouvert dès maintenant.`),
      { type: 'button', content: { label: 'Commencer', href: lien } },
      ...blocsAcces,
      ...fin,
    ],
  };
}

// Le lien de désabonnement du pied : celui de la fiche d'infolettre de
// l'adresse si elle existe (lu, jamais créé : ce courriel n'inscrit personne).
async function lienDesinscription(email: string): Promise<string> {
  const q = await getFirestore().collection('newsletter').where('email', '==', email).limit(1).get();
  const jeton = q.empty ? '' : String((q.docs[0].data() as { unsubscribeToken?: string }).unsubscribeToken || '');
  return jeton ? unsubscribeUrl(jeton) : `${PUBLIC_BASE_URL}/desinscription`;
}

export function optionsConfirmation(subject: string, preheader: string, desinscription: string, firstName?: string): RenderEmailOptions {
  return {
    subject, preheader, firstName,
    unsubscribeUrl: desinscription,
    postalAddress: NEWSLETTER_POSTAL_ADDRESS.value(),
    couverture: 'aucune',
    bandeau: { etiquette: 'Bienvenue', fond: '#28352F', texte: '#EEE7DB' },
    fond: '#FFFFFF',
    signature: true,
    lang: 'fr',
  };
}

async function envoyer(dest: { email: string; firstName?: string }, formationId: string, titre: string, recap: Recap, prefixe = '', lienMotDePasse = ''): Promise<void> {
  const l = lettreConfirmation(formationId, titre, recap, dest.email, lienMotDePasse);
  const opts = { ...optionsConfirmation(l.subject, l.preheader, await lienDesinscription(dest.email), dest.firstName), titreBandeau: l.titreBandeau, tailleTitreBandeau: l.tailleTitreBandeau };
  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      from: fromAddr('Krystine St-Laurent'),
      replyTo: REPLY_TO,
      to: dest.email,
      subject: `${prefixe}${l.subject}`,
      html: renderEmailHtml(l.blocks, opts),
      text: renderEmailText(l.blocks, opts),
      attachments: newsletterAttachments(opts),
    });
  } finally {
    transporter.close();
  }
}

// Appelé par le webhook Stripe après l'écriture de l'accès. Une seule fois
// par achat : le champ confirmationEnvoyee de la preuve d'achat se pose avant
// l'envoi (transaction) et se retire si l'envoi échoue. Ne lance jamais.
export async function envoyerConfirmationAchat(uid: string, formationId: string, emailSession?: string | null): Promise<void> {
  if (!CONFIRMATION_ACHAT_ACTIVE) return;
  const db = getFirestore();
  const ref = db.doc(`achatsFormations/${uid}/formations/${formationId}`);
  try {
    const achat = await db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      const d = s.data() as (Recap & { titre?: string; confirmationEnvoyee?: boolean; compteCreeParAchat?: boolean }) | undefined;
      if (!d || d.confirmationEnvoyee) return null;
      tx.set(ref, { confirmationEnvoyee: true, confirmationEnvoyeeLe: FieldValue.serverTimestamp() }, { merge: true });
      return d;
    });
    if (!achat) return;
    const membre = (await db.doc(`members/${uid}`).get()).data() as { email?: string; displayName?: string } | undefined;
    const email = String(membre?.email || emailSession || '').trim().toLowerCase();
    const firstName = String(membre?.displayName || '').trim().split(/\s+/)[0] || undefined;
    if (!email) {
      console.warn('[confirmation] acheteuse sans courriel', uid, formationId);
      await ref.set({ confirmationEnvoyee: FieldValue.delete(), confirmationEnvoyeeLe: FieldValue.delete() }, { merge: true });
      return;
    }
    // Un compte ouvert par l'achat, ou jamais encore utilisé : le lien pour
    // choisir le mot de passe. Sans lien, la lettre garde la consigne habituelle.
    let lienMotDePasse = '';
    try {
      const u = await getAuth().getUser(uid);
      if (achat.compteCreeParAchat || (!u.passwordHash && u.providerData.length === 0)) {
        // Repli si le lien ne se fabrique pas : la page de connexion, où « Mot de passe oublié ? » en envoie un.
        lienMotDePasse = `${PUBLIC_BASE_URL}/compte`;
        lienMotDePasse = await getAuth().generatePasswordResetLink(email, { url: `${PUBLIC_BASE_URL}/compte` });
      }
    } catch (err) { console.error('[confirmation] lien du mot de passe', uid, err); }
    try {
      await envoyer({ email, firstName }, formationId, achat.titre || formationId, achat, '', lienMotDePasse);
      console.log(`[confirmation] envoyée à ${email} pour ${formationId}`);
    } catch (err) {
      console.error('[confirmation] envoi raté', uid, formationId, err);
      await ref.set({ confirmationEnvoyee: FieldValue.delete(), confirmationEnvoyeeLe: FieldValue.delete() }, { merge: true });
    }
  } catch (err) {
    console.error('[confirmation]', uid, formationId, err);
  }
}

// Un essai depuis l'admin : le courriel d'une formation envoyé à une adresse,
// objet préfixé « [TEST] ». Le récapitulatif vient de la preuve d'achat de
// l'admin si elle existe, sinon d'un exemple (1,15 $ taxes comprises, en 3 versements).
export const testerConfirmationAchat = onCall(
  { region: 'us-central1', secrets: MAIL_SECRETS },
  async (req) => {
    assertAdmin(req);
    const formationId = String(req.data?.formationId || '');
    const email = String(req.data?.email || '').trim().toLowerCase();
    if (!formationId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpsError('invalid-argument', 'Formation ou adresse manquante.');
    const db = getFirestore();
    const f = await db.doc(`formations/${formationId}`).get();
    if (!f.exists) throw new HttpsError('not-found', 'Formation introuvable.');
    const achat = (await db.doc(`achatsFormations/${req.auth!.uid}/formations/${formationId}`).get()).data() as Recap | undefined;
    const recap: Recap = achat?.total ? achat : { total: 115, tps: 5, tvq: 10, versements: 3 };
    const titre = String((f.data() as { titre?: string }).titre || formationId);
    await envoyer({ email, firstName: String(req.data?.firstName || 'Krystine') }, formationId, titre, recap, '[TEST] ');
    return { ok: true };
  },
);
