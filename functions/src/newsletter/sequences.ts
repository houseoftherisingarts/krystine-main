import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { Transporter } from 'nodemailer';
import {
  MAIL_SECRETS,
  NEWSLETTER_POSTAL_ADDRESS,
  REPLY_TO,
  createTransporter,
  fromAddr,
  unsubscribeUrl, unsubscribeOneClickUrl, assurerJeton } from './mail';
import { renderEmailHtml, renderEmailText, newsletterAttachments, type NewsletterBlock, type Couverture, type Lang, type Bandeau } from './renderer';
import { ADMIN_EMAILS } from './send';
import { champsRobot } from './robots';

// ─── Les séquences : des courriels qui partent tout seuls, dans le temps ────
// Le moteur des rappels du direct (live.ts) généralisé. Une séquence est une
// suite d'étapes, chacune posée à tant d'heures après l'entrée d'une personne
// dans la séquence, et chaque étape envoie une infolettre composée dans
// l'admin (un brouillon du composeur, rendu par le même moteur que la lettre).
//
//   sequences/{id}                    titre, actif, declencheur, etapes[]
//   sequences/{id}/inscrits/{uid}     email, firstName, debuteLe, envoyes.{cle}
//
// Déclencheur : { type: 'achat', formationId } — l'achat d'une formation par
// Stripe (paiements.ts) inscrit la personne et envoie tout de suite ce qui est
// dû à zéro heure. Le passage planifié (toutes les quinze minutes) envoie le
// reste au fil des jours. Chaque étape est verrouillée dans `envoyes.<cle>`
// avant de partir : la fonction peut être relancée, elle ne renvoie jamais deux
// fois la même étape à la même personne. Ordre d'Alex du 15 septembre 2026 :
// c'est la case « Configurer Stripe et automatisations » du plan KSL Automne.

export interface Etape { cle: string; titre?: string; delaiHeures: number; newsletterId: string }
export interface Sequence {
  titre: string;
  actif?: boolean;
  declencheur?: { type: 'achat'; formationId: string } | { type: 'manuel' };
  etapes?: Etape[];
}
interface Inscrit {
  uid?: string;
  email: string;
  firstName?: string;
  lang?: string;
  debuteLe: Timestamp;
  envoyes?: Record<string, unknown>;
  erreurs?: Record<string, string>;
}
interface NewsletterDoc {
  subject: string;
  preheader?: string;
  fromName?: string;
  blocks: NewsletterBlock[];
  couverture?: Couverture;
  couvertureUrl?: string | null;
  signature?: boolean;
  lang?: Lang;
  bandeau?: Bandeau | null;
  fond?: string | null;
}

const H = 3600 * 1000;
const normaliser = (e: string) => String(e || '').trim().toLowerCase();

// Le jeton de désabonnement vit sur la fiche `newsletter` de l'adresse. Une
// acheteuse sans fiche en reçoit une (source `achat-formation`, bienvenue
// déjà marquée pour que le mot de bienvenue de l'infolettre ne parte pas
// par-dessus la séquence).
async function jetonPour(email: string, firstName?: string, lang?: string, uid?: string): Promise<string> {
  const db = getFirestore();
  const q = await db.collection('newsletter').where('email', '==', email).limit(1).get();
  if (!q.empty) {
    const d = q.docs[0];
    return assurerJeton(d.ref, (d.data() as { unsubscribeToken?: string }).unsubscribeToken);
  }
  const jeton = await assurerJeton(null);
  // Une acheteuse sur un alias jetable reste une acheteuse : sa séquence
  // d'achat part quand même (elle a payé), mais sa fiche entre en quarantaine
  // pour l'infolettre générale, le temps que Krystine tranche.
  await db.collection('newsletter').add({
    email, firstName: firstName || '', uid: uid || null, lang: lang === 'en' ? 'en' : 'fr',
    status: 'active', source: 'achat-formation', tags: ['formations'],
    unsubscribeToken: jeton, welcomeSentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    ...champsRobot(email, ['formations']),
  });
  return jeton;
}

async function envoyerEtape(transporter: Transporter, lettre: NewsletterDoc, dest: { email: string; firstName?: string; lang?: string; uid?: string }): Promise<void> {
  const jeton = await jetonPour(dest.email, dest.firstName, dest.lang, dest.uid);
  const opts = {
    subject: lettre.subject,
    preheader: lettre.preheader,
    unsubscribeUrl: unsubscribeUrl(jeton),
    postalAddress: NEWSLETTER_POSTAL_ADDRESS.value(),
    firstName: dest.firstName,
    couverture: lettre.couverture,
    couvertureUrl: lettre.couvertureUrl,
    signature: lettre.signature,
    lang: lettre.lang,
    bandeau: lettre.bandeau,
    fond: lettre.fond,
  };
  await transporter.sendMail({
    from: fromAddr(lettre.fromName || 'Krystine St-Laurent'),
    replyTo: REPLY_TO,
    to: dest.email,
    subject: lettre.subject,
    html: renderEmailHtml(lettre.blocks, opts),
    text: renderEmailText(lettre.blocks, opts),
    headers: {
      'List-Unsubscribe': `<${unsubscribeOneClickUrl(jeton)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    attachments: newsletterAttachments(opts),
  });
}

async function lireLettre(id: string): Promise<NewsletterDoc | null> {
  const s = await getFirestore().doc(`newsletters/${id}`).get();
  if (!s.exists) return null;
  const d = s.data() as NewsletterDoc;
  if (!d.blocks?.length || !d.subject) return null;
  return d;
}

// Envoie à un inscrit toutes les étapes dont l'heure est passée et qui ne
// sont pas encore parties. Le verrou se pose dans une transaction avant
// l'envoi; un envoi raté retire le verrou et note l'erreur, pour repasser au
// prochain tour.
async function traiterInscrit(transporter: Transporter, seqId: string, seq: Sequence, inscritId: string, lettres: Map<string, NewsletterDoc | null>, maintenant = Date.now()): Promise<number> {
  const db = getFirestore();
  const ref = db.doc(`sequences/${seqId}/inscrits/${inscritId}`);
  let envoyes = 0;
  for (const e of seq.etapes || []) {
    if (!e.cle || !e.newsletterId) continue;
    const pris = await db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists) return null;
      const d = s.data() as Inscrit;
      if (d.envoyes?.[e.cle]) return null;
      if (d.debuteLe.toMillis() + (Number(e.delaiHeures) || 0) * H > maintenant) return null;
      tx.update(ref, { [`envoyes.${e.cle}`]: Timestamp.now() });
      return d;
    });
    if (!pris) continue;
    if (!lettres.has(e.newsletterId)) lettres.set(e.newsletterId, await lireLettre(e.newsletterId));
    const lettre = lettres.get(e.newsletterId);
    try {
      if (!lettre) throw new Error(`lettre ${e.newsletterId} introuvable ou vide`);
      await envoyerEtape(transporter, lettre, pris);
      await ref.update({ [`erreurs.${e.cle}`]: FieldValue.delete() });
      await db.doc(`sequences/${seqId}`).update({ [`stats.${e.cle}`]: FieldValue.increment(1), dernierEnvoi: FieldValue.serverTimestamp() });
      envoyes++;
    } catch (err) {
      console.error('[sequences] envoi raté', seqId, inscritId, e.cle, err);
      await ref.update({ [`envoyes.${e.cle}`]: FieldValue.delete(), [`erreurs.${e.cle}`]: String(err).slice(0, 300) });
    }
  }
  return envoyes;
}

// Inscrit l'acheteuse d'une formation dans chaque séquence active déclenchée
// par cet achat, puis envoie tout de suite ce qui est dû à zéro heure. Une
// personne déjà inscrite garde sa date de départ : rien ne repart.
export async function inscrireSequencesAchat(uid: string, formationId: string, emailSession?: string | null): Promise<void> {
  const db = getFirestore();
  const seqs = await db.collection('sequences').where('actif', '==', true).where('declencheur.formationId', '==', formationId).get();
  if (seqs.empty) return;
  const membre = (await db.doc(`members/${uid}`).get()).data() as { email?: string; displayName?: string; lang?: string } | undefined;
  const email = normaliser(membre?.email || emailSession || '');
  if (!email) { console.warn('[sequences] acheteuse sans courriel', uid, formationId); return; }
  const firstName = String(membre?.displayName || '').trim().split(/\s+/)[0] || undefined;
  let transporter: Transporter | null = null;
  for (const s of seqs.docs) {
    const ref = db.doc(`sequences/${s.id}/inscrits/${uid}`);
    await db.runTransaction(async (tx) => {
      const cur = await tx.get(ref);
      if (cur.exists) return;
      tx.set(ref, { uid, email, firstName: firstName || '', lang: membre?.lang === 'en' ? 'en' : 'fr', debuteLe: Timestamp.now(), envoyes: {}, source: `achat:${formationId}` });
    });
    try {
      transporter = transporter || createTransporter();
      await traiterInscrit(transporter, s.id, s.data() as Sequence, uid, new Map());
    } catch (err) {
      console.error('[sequences] première étape', s.id, uid, err);
    }
  }
  transporter?.close();
}

// Le passage planifié : toutes les quinze minutes, chaque séquence active,
// chaque inscrit, chaque étape due.
export const traiterSequences = onSchedule(
  { schedule: 'every 15 minutes', timeZone: 'America/Toronto', secrets: MAIL_SECRETS, timeoutSeconds: 300, memory: '512MiB' },
  async () => {
    const db = getFirestore();
    const seqs = await db.collection('sequences').where('actif', '==', true).get();
    if (seqs.empty) return;
    const transporter = createTransporter();
    const lettres = new Map<string, NewsletterDoc | null>();
    let total = 0;
    try {
      for (const s of seqs.docs) {
        const seq = s.data() as Sequence;
        const etapes = (seq.etapes || []).filter(e => e.cle && e.newsletterId);
        if (!etapes.length) continue;
        const inscrits = await s.ref.collection('inscrits').get();
        for (const i of inscrits.docs) {
          const d = i.data() as Inscrit;
          // Rien à faire si toutes les étapes sont parties.
          if (etapes.every(e => d.envoyes?.[e.cle])) continue;
          total += await traiterInscrit(transporter, s.id, seq, i.id, lettres);
        }
      }
    } finally {
      transporter.close();
    }
    if (total) console.log(`[sequences] ${total} courriel(s) parti(s)`);
  },
);

// Depuis l'admin : envoyer une étape tout de suite à une adresse (pour la
// relire dans une vraie boîte), ou inscrire une personne à la main dans une
// séquence (sa suite part alors selon les délais).
export const testerSequence = onCall(
  { region: 'us-central1', secrets: MAIL_SECRETS },
  async (req) => {
    const admin = String(req.auth?.token?.email || '').toLowerCase();
    if (!req.auth || !ADMIN_EMAILS.includes(admin)) throw new HttpsError('permission-denied', 'Réservé à l\'admin.');
    const sequenceId = String(req.data?.sequenceId || '');
    const email = normaliser(String(req.data?.email || ''));
    if (!sequenceId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpsError('invalid-argument', 'Séquence ou adresse manquante.');
    const db = getFirestore();
    const s = await db.doc(`sequences/${sequenceId}`).get();
    if (!s.exists) throw new HttpsError('not-found', 'Séquence introuvable.');
    const seq = s.data() as Sequence;
    const mode = req.data?.mode === 'inscrire' ? 'inscrire' : 'etape';

    if (mode === 'inscrire') {
      const id = email.replace(/[^a-z0-9]+/g, '_');
      const ref = db.doc(`sequences/${sequenceId}/inscrits/${id}`);
      if ((await ref.get()).exists) throw new HttpsError('already-exists', 'Cette adresse est déjà dans la séquence.');
      await ref.set({ email, firstName: String(req.data?.firstName || '').trim(), lang: 'fr', debuteLe: Timestamp.now(), envoyes: {}, source: `manuel:${admin}` });
      const transporter = createTransporter();
      try { await traiterInscrit(transporter, sequenceId, seq, id, new Map()); } finally { transporter.close(); }
      return { ok: true };
    }

    const cle = String(req.data?.cle || '');
    const etape = (seq.etapes || []).find(e => e.cle === cle);
    if (!etape) throw new HttpsError('not-found', 'Étape introuvable.');
    const lettre = await lireLettre(etape.newsletterId);
    if (!lettre) throw new HttpsError('failed-precondition', 'La lettre de cette étape est vide ou introuvable.');
    const transporter = createTransporter();
    try {
      await envoyerEtape(transporter, lettre, { email, firstName: String(req.data?.firstName || 'Krystine') });
    } finally {
      transporter.close();
    }
    return { ok: true };
  },
);
