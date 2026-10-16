import { createHash } from 'crypto';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { MAIL_SECRETS, NEWSLETTER_POSTAL_ADDRESS, PUBLIC_BASE_URL, REPLY_TO, createTransporter, fromAddr, unsubscribeUrl } from '../newsletter/mail';
import { renderEmailHtml, type NewsletterBlock } from '../newsletter/renderer';
import type { ShopifyOrderPayload } from './types';

// ─── Le merci après une commande de la boutique (16 oct. 2026) ──────────────
// Krystine, après le parcours de Nathalie Houle (commande de 1 275 $ à 6 h 40,
// merci reçu à 11 h 40, quiz à 12 h 26, Rituels achetés à 12 h 28) : « on doit
// absolument faire le merci automatisé après achat, d'une super belle façon,
// avec une belle image de quiz ». Texte approuvé sur maquette le 16 oct.
//
// Le parcours : le webhook Shopify (commande payée) pose merciBoutique/{clé du
// courriel} avec prevuPour = commande + 3 h, jamais entre 21 h et 8 h (heure de
// Montréal). Toutes les 15 minutes, envoyerMerciBoutique envoie ce qui est dû.
// Une seule fois par cliente : la clé est le courriel, et create() refuse un
// second document. Jamais aux points de vente (étiquette b2b) ni aux commandes
// faites par l'équipe (shopify_draft_order). Rien n'est planifié tant que
// reglages/merciBoutique.actif n'est pas vrai (le « go » de Krystine).

const QUIZ = `${PUBLIC_BASE_URL}/quiz`;
const DELAI_MS = 3 * 60 * 60 * 1000;
const FUSEAU = 'America/Toronto'; // même heure que Montréal
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MERCI_BOUTIQUE = {
  sujet: 'Merci pour votre commande',
  preheader: 'Une petite boussole de sept questions, pour la suite',
  blocks: [
    { type: 'paragraph', content: { text: 'Bonjour {{firstName}},' } },
    { type: 'paragraph', content: { text: "Votre commande nous a fait un immense plaisir, et nous tenions à vous dire merci. Chaque huile INSPIRATA AYURVEDA est infusée à la main, avec soin, et savoir qu'elle trouvera sa place dans votre maison nous touche beaucoup." } },
    { type: 'divider', content: { style: 'feuille' } },
    { type: 'heading', content: { text: 'Où en êtes-vous en ce moment ?', level: 2 } },
    { type: 'paragraph', content: { text: 'Krystine a conçu une petite boussole de sept questions. En trois minutes, elle vous aide à reconnaître les éléments les plus présents en vous ces jours-ci, Vata (Vent et Espace), Pitta (Feu et Eau) ou Kapha (Eau et Terre), puis elle vous guide vers les gestes qui vous ressemblent.' } },
    { type: 'image', content: { url: `${PUBLIC_BASE_URL}/infolettre/quiz-pictos.png`, href: QUIZ, alt: 'Les trois pictos du quiz : Vata (Vent et Espace), Pitta (Feu et Eau), Kapha (Eau et Terre)' } },
    { type: 'button', content: { label: 'Faire le quiz', href: QUIZ } },
    { type: 'divider', content: { style: 'feuille' } },
    { type: 'paragraph', content: { text: "Notre équipe est là pour vous. Une question sur une huile ou sur la façon de l'utiliser : écrivez-nous à teamksl@inspiratanature.com." } },
    { type: 'paragraph', content: { text: 'Au plaisir,' } },
    { type: 'paragraph', content: { text: "<b>L'équipe bienveillante TeamKsl</b>" } },
    { type: 'paragraph', content: { text: `<a href="${QUIZ}">krystinestlaurent.ca/quiz</a>` } },
  ] as NewsletterBlock[],
  texte: (prenom: string) => [
    prenom ? `Bonjour ${prenom},` : 'Bonjour,',
    "Votre commande nous a fait un immense plaisir, et nous tenions à vous dire merci. Chaque huile INSPIRATA AYURVEDA est infusée à la main, avec soin, et savoir qu'elle trouvera sa place dans votre maison nous touche beaucoup.",
    'Où en êtes-vous en ce moment ?',
    'Krystine a conçu une petite boussole de sept questions. En trois minutes, elle vous aide à reconnaître les éléments les plus présents en vous ces jours-ci, Vata (Vent et Espace), Pitta (Feu et Eau) ou Kapha (Eau et Terre), puis elle vous guide vers les gestes qui vous ressemblent.',
    `Faire le quiz : ${QUIZ}`,
    "Notre équipe est là pour vous. Une question sur une huile ou sur la façon de l'utiliser : écrivez-nous à teamksl@inspiratanature.com.",
    "Au plaisir,\nL'équipe bienveillante TeamKsl\nkrystinestlaurent.ca/quiz",
  ].join('\n\n'),
};

export function cleMerci(courriel: string): string {
  return createHash('sha256').update(courriel.trim().toLowerCase()).digest('hex').slice(0, 32);
}

/** « JULIE » ou « julie » devient « Julie »; un prénom déjà écrit avec soin reste tel quel. */
export function prenomPropre(brut: unknown): string {
  const p = String(brut ?? '').replace(/[\r\n\x00-\x1F\x7F]/g, ' ').trim().split(/\s+/)[0] || '';
  if (!/\p{L}/u.test(p) || p.length > 40) return '';
  if (p === p.toUpperCase() || p === p.toLowerCase()) {
    return p.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_m, s, l) => s + l.toUpperCase());
  }
  return p;
}

/** L'heure de Montréal d'un instant, de 0 à 23. */
function heureMontreal(d: Date): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU, hour: 'numeric', hourCycle: 'h23' }).format(d));
}

/** Commande + 3 h; si cela tombe entre 21 h et 8 h, le prochain 8 h du matin. */
export function momentDuMerci(commande: Date): Date {
  let t = new Date(commande.getTime() + DELAI_MS);
  const h = heureMontreal(t);
  if (h >= 21 || h < 8) {
    if (h >= 21) t = new Date(t.getTime() + (24 - h) * 3600_000); // vers minuit
    // avancer heure par heure jusqu'à 8 h (gère le changement d'heure)
    for (let i = 0; i < 12 && heureMontreal(t) !== 8; i++) t = new Date(t.getTime() + 3600_000);
    t.setUTCMinutes(0, 0, 0);
  }
  return t;
}

/** Ce qui écarte une commande du merci, ou null si elle y a droit. */
export function raisonDExclure(o: ShopifyOrderPayload): string | null {
  const tags = String(o.customer?.tags || '').toLowerCase().split(',').map(s => s.trim());
  if (tags.includes('b2b')) return 'point de vente';
  if (o.source_name === 'shopify_draft_order') return "commande faite par l'équipe";
  const courriel = (o.email || o.customer?.email || '').trim().toLowerCase();
  if (!EMAIL_RX.test(courriel) || /[\r\n]/.test(courriel)) return 'sans courriel';
  // Une vieille commande rejouée (orders/updated, rattrapage) ne déclenche rien.
  const quand = new Date(o.created_at || 0).getTime();
  if (!quand || Date.now() - quand > 48 * 3600_000) return 'commande ancienne';
  return null;
}

/** Appelé par le webhook pour chaque commande payée. Ne lève jamais. */
export async function planifierMerci(o: ShopifyOrderPayload): Promise<string> {
  try {
    const db = getFirestore();
    const reglage = await db.doc('reglages/merciBoutique').get();
    if (reglage.get('actif') !== true) return 'merci éteint';
    const raison = raisonDExclure(o);
    if (raison) return `pas de merci (${raison})`;
    const courriel = (o.email || o.customer?.email || '').trim().toLowerCase();
    const prevu = momentDuMerci(new Date(o.created_at));
    try {
      await db.doc(`merciBoutique/${cleMerci(courriel)}`).create({
        courriel,
        prenom: prenomPropre(o.customer?.first_name || o.billing_address?.first_name || o.shipping_address?.first_name),
        commande: o.name,
        commandeLe: Timestamp.fromDate(new Date(o.created_at)),
        prevuPour: Timestamp.fromDate(prevu),
        creeLe: FieldValue.serverTimestamp(),
      });
      return `merci prévu le ${prevu.toISOString()}`;
    } catch (e: any) {
      if (e?.code === 6 || /already exists/i.test(String(e?.message))) return 'merci déjà reçu ou prévu';
      throw e;
    }
  } catch (e) {
    console.error('[merciBoutique] planification impossible', o.name, e);
    return 'erreur de planification';
  }
}

export function composerMerciBoutique(prenom: string, desabonnement: string, adresse: string) {
  const g = MERCI_BOUTIQUE;
  const html = renderEmailHtml(g.blocks, {
    subject: g.sujet,
    preheader: g.preheader,
    unsubscribeUrl: desabonnement,
    postalAddress: adresse,
    firstName: prenom || undefined,
    campagne: 'merci-boutique',
    couverture: 'image',
    couvertureUrl: `${PUBLIC_BASE_URL}/infolettre/banniere-inspirata-or.jpg`,
    signature: false,
    fond: '#FFFFFF',
    lang: 'fr',
    bandeau: { etiquette: 'INSPIRATA AYURVEDA · Krystine St-Laurent', fond: '#5A4F43', image: `${PUBLIC_BASE_URL}/infolettre/bandeau-bois-calendule.jpg`, texte: '#FFFDF8' },
  });
  return { sujet: g.sujet, html, text: g.texte(prenom) };
}

export const envoyerMerciBoutique = onSchedule(
  { schedule: 'every 15 minutes', timeZone: FUSEAU, region: 'us-central1', timeoutSeconds: 120, secrets: [...MAIL_SECRETS] },
  async () => {
    const db = getFirestore();
    const dus = await db.collection('merciBoutique').where('prevuPour', '<=', Timestamp.now()).limit(40).get();
    if (dus.empty) return;
    const transporter = createTransporter();
    try {
      for (const doc of dus.docs) {
        // Réserver avant d'envoyer : retirer prevuPour sort le document de la
        // file. Mieux vaut un merci manqué (visible ici) qu'un double envoi.
        const reserve = await db.runTransaction(async (tx) => {
          const d = await tx.get(doc.ref);
          if (!d.get('prevuPour') || d.get('envoyeLe')) return false;
          tx.update(doc.ref, { prevuPour: FieldValue.delete(), envoiTenteLe: FieldValue.serverTimestamp() });
          return true;
        });
        if (!reserve) continue;
        const courriel = String(doc.get('courriel') || '');
        try {
          // Une cliente désabonnée de nos lettres ne reçoit pas le merci.
          const fiche = (await db.collection('newsletter').where('email', '==', courriel).limit(1).get()).docs[0];
          if (fiche && ['unsubscribed', 'bounced', 'complained'].includes(String(fiche.get('status')))) {
            await doc.ref.update({ ignoreCar: `fiche ${fiche.get('status')}` });
            continue;
          }
          const jeton = fiche?.get('unsubscribeToken');
          const desabonnement = jeton ? unsubscribeUrl(String(jeton)) : `${PUBLIC_BASE_URL}/desinscription`;
          const m = composerMerciBoutique(String(doc.get('prenom') || ''), desabonnement, NEWSLETTER_POSTAL_ADDRESS.value());
          await transporter.sendMail({
            from: fromAddr("L'équipe Krystine St-Laurent"),
            to: courriel,
            replyTo: REPLY_TO,
            subject: m.sujet,
            text: m.text,
            html: m.html,
          });
          await doc.ref.update({ envoyeLe: FieldValue.serverTimestamp() });
          console.log('[merciBoutique] envoyé', doc.get('commande'));
        } catch (err) {
          console.error('[merciBoutique] envoi impossible', doc.id, err);
          await doc.ref.update({ erreur: String((err as Error)?.message || err).slice(0, 300) }).catch(() => {});
        }
      }
    } finally {
      transporter.close();
    }
  },
);
