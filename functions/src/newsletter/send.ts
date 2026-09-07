import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { renderEmailHtml, renderEmailText, newsletterAttachments, inlineForPreview, type NewsletterBlock, type Couverture, type Lang, type Bandeau } from './renderer';
import { MAIL_SECRETS, NEWSLETTER_POSTAL_ADDRESS, REPLY_TO, createTransporter, fromAddr as buildFrom, unsubscribeUrl as buildUnsub, unsubscribeOneClickUrl, assurerJeton } from './mail';
import { renderWelcomeHtml, WELCOME_SUBJECT , WELCOME_IMAGE_URL } from './welcome';
import { buildMail, renderLiveHtml, type LiveEvent } from './live';

// Secrets, transport SMTP et adresses de base vivent dans ./mail.ts, partagés
// avec le courriel de bienvenue (welcome.ts) et les rappels du direct (live.ts).

export const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
  'alex@lesalondesinconnus.com',
  'krystinestlaurent@gmail.com',
  'houseoftherisingarts@gmail.com',
  'krystinestterredhysope@gmail.com',
];

export function assertAdmin(request: CallableRequest): string {
  const email = request.auth?.token?.email;
  if (!email || !ADMIN_EMAILS.includes(email)) {
    throw new HttpsError('permission-denied', 'Admin only.');
  }
  return email;
}

interface SubscriberDoc {
  email: string;
  firstName?: string;
  lastName?: string;
  uid?: string;
  status?: string;
  tags?: string[];
  lang?: string;           // 'fr' | 'en'; absent = français
  unsubscribeToken?: string;
}

// Qui reçoit : tout le monde, des listes (étiquettes), ou des personnes
// choisies une à une. `segmentTag` reste lu pour les anciens brouillons.
export interface NewsletterAudience {
  mode: 'all' | 'tags' | 'emails';
  tags?: string[];
  emails?: string[];
  // Langue des destinataires : « auto » (celle de la lettre, défaut), « fr »,
  // « en », ou « toutes ». Les personnes choisies une à une ne sont jamais filtrées.
  langue?: 'auto' | 'fr' | 'en' | 'toutes';
}

// Chaque abonné lit dans une langue (posée à l'inscription, suivie par le
// compte). Une lettre part par défaut à ceux qui lisent dans sa langue :
// la version française aux francophones, la traduction aux anglophones.
export const langueAbonne = (s: { lang?: string }) => (s.lang === 'en' ? 'en' : 'fr');
export function langueCible(doc: Pick<NewsletterRecord, 'audience' | 'lang'>): 'fr' | 'en' | 'toutes' {
  const l = doc.audience?.langue || 'auto';
  if (l === 'auto') return doc.lang === 'en' ? 'en' : 'fr';
  return l;
}

interface NewsletterRecord {
  title: string;
  subject: string;
  preheader?: string;
  fromName?: string;
  blocks: NewsletterBlock[];
  status: string;
  segmentTag?: string | null;
  audience?: NewsletterAudience | null;
  scheduledFor?: Timestamp;
  couverture?: Couverture;
  couvertureUrl?: string | null;
  signature?: boolean;
  lang?: Lang;
  bandeau?: Bandeau | null;
  fond?: string | null;
  traductionDe?: string | null;
  lettreDor?: { messagerie?: boolean; section?: boolean } | null;
}

// ─── La lettre d'or : livrée à l'interne, aux membres, sans courriel ────────
// Rien ne passe par Resend, donc rien ne coûte. Chaque membre du site reçoit
// la lettre dans son onglet Lettres (pointeur members/{uid}/inbox, marqué
// lettreDor) et, si Krystine l'a coché, une carte dorée dans son fil avec le
// soutien (conversations/{uid}/messages, type lettreDor). Le document passe à
// « sent » comme une infolettre ordinaire.
async function deliverLettreDor(newsletterId: string, doc: NewsletterRecord): Promise<{ recipients: number; delivered: number; bounces: number; done: boolean }> {
  const db = getFirestore();
  const canaux = { section: doc.lettreDor?.section !== false, messagerie: !!doc.lettreDor?.messagerie };
  const membres = await db.collection('members').select('email', 'displayName', 'photoURL').get();
  const titre = doc.subject;
  let livrees = 0;
  let lot = db.batch();
  let n = 0;
  const flush = async () => { if (n) { await lot.commit(); lot = db.batch(); n = 0; } };
  for (const m of membres.docs) {
    const uid = m.id;
    const md = m.data() as { email?: string; displayName?: string; photoURL?: string };
    if (canaux.section) {
      lot.set(db.doc(`members/${uid}/inbox/${newsletterId}`), {
        newsletterId, title: doc.title || titre, subject: titre, lettreDor: true,
        receivedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      n++;
    }
    if (canaux.messagerie) {
      const corps = `Lettre d'or : ${titre}`;
      lot.set(db.collection(`conversations/${uid}/messages`).doc(), {
        sender: 'admin', type: 'lettreDor', newsletterId, subject: titre, body: corps,
        createdAt: FieldValue.serverTimestamp(),
      });
      lot.set(db.doc(`conversations/${uid}`), {
        uid, memberEmail: md.email || '', memberName: md.displayName || '', memberPhotoURL: md.photoURL || '',
        lastMessage: corps, lastMessageAt: FieldValue.serverTimestamp(),
        unreadByClient: FieldValue.increment(1),
      }, { merge: true });
      n += 2;
    }
    livrees++;
    if (n >= 400) await flush();
  }
  await flush();
  await db.doc(`newsletters/${newsletterId}`).update({
    status: 'sent', sentAt: Timestamp.now(), updatedAt: FieldValue.serverTimestamp(),
    stats: { recipients: livrees, delivered: livrees, bounces: 0, opens: 0 },
  });
  console.log('[deliverLettreDor]', newsletterId, livrees, 'membre(s)', canaux);
  return { recipients: livrees, delivered: livrees, bounces: 0, done: true };
}

// L'en-tête et la signature choisis dans le composeur, tels quels.
const enTete = (doc: Pick<NewsletterRecord, 'couverture' | 'couvertureUrl' | 'signature' | 'lang' | 'bandeau' | 'fond'>) =>
  ({ couverture: doc.couverture, couvertureUrl: doc.couvertureUrl, signature: doc.signature, lang: doc.lang, bandeau: doc.bandeau, fond: doc.fond });

export function selectRecipients<T extends SubscriberDoc>(subs: T[], doc: Pick<NewsletterRecord, 'audience' | 'segmentTag' | 'lang'>): T[] {
  const a: NewsletterAudience = doc.audience || (doc.segmentTag ? { mode: 'tags', tags: [doc.segmentTag] } : { mode: 'all' });
  const norm = (e: string) => e.trim().toLowerCase();
  const wanted = new Set((a.emails || []).map(norm));
  const tags = a.tags || [];
  const cible = langueCible({ audience: a, lang: doc.lang });
  return subs
    .filter(s => {
      if (a.mode === 'emails') return wanted.has(norm(s.email));
      if (cible !== 'toutes' && langueAbonne(s) !== cible) return false;
      if (a.mode === 'tags') return (s.tags || []).some(t => tags.includes(t));
      return true;
    })
    // Une adresse inscrite par deux formulaires ne reçoit qu'un courriel.
    .filter(dedupeBy(s => norm(s.email)));
}

function dedupeBy<T>(key: (x: T) => string): (x: T) => boolean {
  const vus = new Set<string>();
  return (x) => { const k = key(x); if (vus.has(k)) return false; vus.add(k); return true; };
}

// ─── Audience du composeur : compte, listes et recherche, sans rapatrier la
// collection dans le navigateur. Avant le 6 septembre 2026, l'admin lisait les
// 33 000 documents `newsletter` (30 Mo) à chaque ouverture d'une infolettre,
// et l'onglet gelait. La fonction garde une projection légère en mémoire deux
// minutes et applique la même règle que l'envoi (selectRecipients).
interface AudienceAbonne { email: string; firstName?: string; lastName?: string; status?: string; tags?: string[]; lang?: string }
let cacheAudience: { at: number; subs: AudienceAbonne[] } | null = null;
const CACHE_AUDIENCE_MS = 2 * 60e3;

async function chargerAudience(): Promise<AudienceAbonne[]> {
  if (cacheAudience && Date.now() - cacheAudience.at < CACHE_AUDIENCE_MS) return cacheAudience.subs;
  const snap = await getFirestore().collection('newsletter')
    .where('status', '==', 'active')
    .select('email', 'firstName', 'lastName', 'status', 'tags', 'lang')
    .get();
  const subs = snap.docs.map(d => d.data() as AudienceAbonne).filter(s => typeof s.email === 'string');
  cacheAudience = { at: Date.now(), subs };
  return subs;
}

export const audienceInfolettre = onCall(
  { timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    assertAdmin(request);
    const data = (request.data || {}) as { audience?: NewsletterAudience; q?: string; lang?: Lang };
    const subs = await chargerAudience();
    const audience: NewsletterAudience = data.audience || { mode: 'all' };
    const lang: Lang = data.lang === 'en' ? 'en' : 'fr';

    const parTag = new Map<string, number>();
    for (const s of subs) for (const t of s.tags || []) parTag.set(t, (parTag.get(t) || 0) + 1);
    const tags = [...parTag.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([tag, n]) => ({ tag, n }));

    const total = selectRecipients(subs, { audience, lang }).length;
    // Le même choix, sans le filtre de langue : combien lisent en français, en anglais.
    const sansLangue = selectRecipients(subs, { audience: { ...audience, langue: 'toutes' }, lang });
    const parLangue = { fr: sansLangue.filter(s => langueAbonne(s) === 'fr').length, en: sansLangue.filter(s => langueAbonne(s) === 'en').length };

    const f = (data.q || '').trim().toLowerCase();
    const personnes: Array<{ email: string; nom: string }> = [];
    if (f.length >= 2) {
      const vus = new Set<string>();
      for (const s of subs) {
        const nom = `${s.firstName || ''} ${s.lastName || ''}`.trim();
        const email = s.email.toLowerCase();
        if (vus.has(email)) continue;
        if (email.includes(f) || nom.toLowerCase().includes(f)) {
          vus.add(email);
          personnes.push({ email: s.email, nom });
          if (personnes.length >= 40) break;
        }
      }
    }
    return { total, tags, personnes, parLangue };
  },
);

// ─── Envoi réel d'une infolettre (appel direct ou planifié) ─────────────────
// Reprenable et parallèle (révision du 6 septembre 2026). Une Cloud Function
// vit au plus 9 minutes; à un courriel à la fois, 30 000 abonnés prenaient
// plus d'une heure et l'envoi mourait en chemin avec le statut « sending »
// figé. Maintenant : CONCURRENCY courriels en vol sur la connexion SMTP
// mutualisée, un budget de temps par passage, et un curseur `progress.lastId`
// dans le document. Quand le budget est épuisé, la fonction rend la main et le
// calendrier (toutes les 5 minutes) reprend là où elle s'est arrêtée.
const CONCURRENCY = 5;
const BUDGET_MS = 7 * 60 * 1000;       // sur les 9 minutes permises
const LOCK_MS = 9.5 * 60 * 1000;       // un seul passage à la fois par infolettre

const PAUSE_QUOTA_MS = 60 * 60 * 1000;  // quota du fournisseur épuisé : on réessaie dans une heure

interface Progress {
  done: number;
  failed: number;
  lastId: string | null;
  lockUntil?: Timestamp;
  startedAt?: Timestamp;
  pauseJusqua?: Timestamp;
  raisonPause?: string;
}

const delai = (ms: number) => new Promise(r => setTimeout(r, ms));

// Resend répond « 550 You have reached your daily email sending quota » quand
// le compte est au palier gratuit (100 courriels par jour) ou au bout de son
// forfait. Un 429 ou une limite de débit se traite pareil : on met la passe
// en pause au lieu de compter des centaines d'échecs.
function estQuota(err: unknown): boolean {
  const e = err as { responseCode?: number; response?: string; message?: string } | undefined;
  const texte = `${e?.response || ''} ${e?.message || ''}`;
  return e?.responseCode === 429 || /quota|rate limit|too many/i.test(texte);
}

export async function deliverNewsletter(newsletterId: string): Promise<{ recipients: number; delivered: number; bounces: number; done: boolean }> {
  const db = getFirestore();
  const ref = db.doc(`newsletters/${newsletterId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Newsletter not found');
  const doc = snap.data() as NewsletterRecord & { progress?: Progress };
  if (doc.status !== 'draft' && doc.status !== 'scheduled' && doc.status !== 'sending') {
    throw new HttpsError('failed-precondition', `Cannot send a newsletter in status "${doc.status}"`);
  }
  if (!doc.blocks?.length) throw new HttpsError('failed-precondition', 'Newsletter has no content');
  if (!doc.subject) throw new HttpsError('failed-precondition', 'Newsletter is missing a subject');
  if (doc.lettreDor) return deliverLettreDor(newsletterId, doc);

  const now = Date.now();
  const prog: Progress = doc.status === 'sending' && doc.progress
    ? doc.progress
    : { done: 0, failed: 0, lastId: null, startedAt: Timestamp.now() };
  if (prog.lockUntil && prog.lockUntil.toMillis() > now) {
    // Un autre passage est encore en cours : ne rien doubler.
    return { recipients: 0, delivered: prog.done, bounces: prog.failed, done: false };
  }
  if (prog.pauseJusqua && prog.pauseJusqua.toMillis() > now) {
    // Le fournisseur a refusé pour quota : on attend l'heure de reprise.
    return { recipients: 0, delivered: prog.done, bounces: prog.failed, done: false };
  }
  prog.lockUntil = Timestamp.fromMillis(now + LOCK_MS);
  await ref.update({ status: 'sending', progress: prog, updatedAt: FieldValue.serverTimestamp() });

  const fromAddr = buildFrom(doc.fromName || 'Krystine St-Laurent');
  const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();

  // Un seul filtre côté Firestore (statut); l'audience se règle en code.
  // Tri par identifiant : c'est l'ordre du curseur de reprise.
  const subsSnap = await db.collection('newsletter').where('status', '==', 'active').get();
  const all = selectRecipients(
    subsSnap.docs.map(d => ({ id: d.id, ...(d.data() as SubscriberDoc) })),
    doc,
  ).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // Chaque envoi réussi est marqué dans la sous-collection `envois` : après
  // une pause (quota du fournisseur) ou une remise à zéro du curseur, personne
  // ne reçoit la lettre deux fois.
  const dejaSnap = await ref.collection('envois').select().get();
  const deja = new Set(dejaSnap.docs.map(d => d.id));
  const restants = (prog.lastId ? all.filter(s => s.id > (prog.lastId as string)) : all).filter(s => !deja.has(s.id));

  const transporter = createTransporter();
  const pixelBase = `https://us-central1-${process.env.GCLOUD_PROJECT || 'krystinestlaurent-87566'}.cloudfunctions.net/ouverture`;

  const envoyer = async (sub: typeof all[number]) => {
    const jeton = await assurerJeton(db.doc(`newsletter/${sub.id}`), sub.unsubscribeToken);
    const unsubscribeUrl = buildUnsub(jeton);
    // Le pixel de mesure : une image d'un point, propre à cette personne et
    // à cette infolettre. Il dit qui a ouvert, sans rien demander de plus.
    const pixelUrl = `${pixelBase}?n=${encodeURIComponent(newsletterId)}&s=${encodeURIComponent(sub.id)}`;
    const opts = { subject: doc.subject, preheader: doc.preheader, unsubscribeUrl, postalAddress, firstName: sub.firstName, pixelUrl, ...enTete(doc) };
    const message = {
      from: fromAddr,
      replyTo: REPLY_TO,
      to: sub.email,
      subject: doc.subject,
      html: renderEmailHtml(doc.blocks, opts),
      text: renderEmailText(doc.blocks, opts),
      headers: {
        'List-Unsubscribe': `<${unsubscribeOneClickUrl(jeton)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      attachments: newsletterAttachments(opts),
    };
    // Un refus passager (connexion) se retente une fois. Un quota épuisé ne
    // se retente pas : la passe entière se met en pause.
    try {
      await transporter.sendMail(message);
    } catch (e1) {
      if (estQuota(e1)) throw e1;
      await delai(2000);
      await transporter.sendMail(message);
    }
    await ref.collection('envois').doc(sub.id).set({ email: sub.email, at: FieldValue.serverTimestamp() });
    if (sub.uid) {
      await db.doc(`members/${sub.uid}/inbox/${newsletterId}`).set({
        newsletterId,
        title: doc.title || doc.subject,
        subject: doc.subject,
        receivedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  };

  // Ouvriers parallèles : chacun prend le prochain abonné tant qu'il reste du
  // budget. Tout ce qui est assigné se termine (succès ou échec) avant que le
  // curseur avance, donc aucun abonné n'est sauté ni doublé.
  let next = 0;
  let indexQuota = -1;   // premier abonné refusé pour quota épuisé, s'il y a lieu
  const ouvrier = async () => {
    while (next < restants.length && indexQuota < 0 && Date.now() - now < BUDGET_MS) {
      const i = next++;
      const sub = restants[i];
      try {
        await envoyer(sub);
        prog.done++;
      } catch (err) {
        if (estQuota(err)) {
          // Le fournisseur n'accepte plus rien : les ouvriers s'arrêtent, rien
          // n'est compté en échec, la reprise se fera plus tard.
          if (indexQuota < 0 || i < indexQuota) indexQuota = i;
          console.warn('[deliverNewsletter] quota du fournisseur atteint', sub.email, String((err as { response?: string })?.response || err));
          continue;
        }
        prog.failed++;
        console.warn('[deliverNewsletter] delivery failed', sub.email, err);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, ouvrier));
  transporter.close();
  delete prog.lockUntil;

  if (indexQuota >= 0) {
    // Le curseur recule juste avant le premier refus; les réussites passées
    // après lui sont dans `envois` et ne repartiront pas.
    prog.lastId = indexQuota > 0 ? restants[indexQuota - 1].id : prog.lastId;
    prog.pauseJusqua = Timestamp.fromMillis(Date.now() + PAUSE_QUOTA_MS);
    prog.raisonPause = 'Quota d’envoi du fournisseur atteint. Reprise automatique dans une heure.';
    await ref.update({ progress: prog, updatedAt: FieldValue.serverTimestamp() });
    console.log('[deliverNewsletter] pause quota', newsletterId, `${prog.done}/${all.length}`);
    return { recipients: all.length, delivered: prog.done, bounces: prog.failed, done: false };
  }

  const fini = next >= restants.length;
  prog.lastId = next > 0 ? restants[next - 1].id : prog.lastId;
  delete prog.pauseJusqua;
  delete prog.raisonPause;

  if (fini) {
    await ref.update({
      status: 'sent',
      sentAt: Timestamp.now(),
      updatedAt: FieldValue.serverTimestamp(),
      progress: FieldValue.delete(),
      stats: { recipients: all.length, delivered: prog.done, bounces: prog.failed, opens: 0 },
    });
  } else {
    await ref.update({ progress: prog, updatedAt: FieldValue.serverTimestamp() });
    console.log('[deliverNewsletter] passage partiel', newsletterId, `${prog.done + prog.failed}/${all.length}`);
  }

  return { recipients: all.length, delivered: prog.done, bounces: prog.failed, done: fini };
}

// ─── sendNewsletter : appel admin (test ou envoi immédiat) ──────────────────
// Input: { newsletterId, testEmail? }. Avec testEmail, envoie SEULEMENT à cette
// adresse et ne touche ni au statut ni aux boîtes des membres.
export const sendNewsletter = onCall(
  { secrets: MAIL_SECRETS, timeoutSeconds: 540, memory: '512MiB' },
  async (request) => {
    assertAdmin(request);
    const { newsletterId, testEmail } = (request.data || {}) as { newsletterId?: string; testEmail?: string };
    if (!newsletterId) throw new HttpsError('invalid-argument', 'newsletterId is required');

    if (testEmail) {
      const snap = await getFirestore().doc(`newsletters/${newsletterId}`).get();
      if (!snap.exists) throw new HttpsError('not-found', 'Newsletter not found');
      const doc = snap.data() as NewsletterRecord;
      if (!doc.blocks?.length || !doc.subject) throw new HttpsError('failed-precondition', 'Newsletter is missing subject or content');
      const transporter = createTransporter();
      // Le test porte le vrai lien de désabonnement de la destinataire si elle
      // est abonnée; sinon un jeton « TEST » que la page nomme comme tel.
      const abo = await getFirestore().collection('newsletter').where('email', '==', String(testEmail).trim().toLowerCase()).limit(1).get();
      const jetonTest = abo.empty ? 'TEST' : await assurerJeton(abo.docs[0].ref, (abo.docs[0].data() as SubscriberDoc).unsubscribeToken);
      const opts = { subject: doc.subject, preheader: doc.preheader, unsubscribeUrl: buildUnsub(jetonTest), postalAddress: NEWSLETTER_POSTAL_ADDRESS.value(), firstName: 'Test', ...enTete(doc) };
      try {
        await transporter.sendMail({
          from: buildFrom(doc.fromName || 'Krystine St-Laurent'),
          replyTo: REPLY_TO,
          to: testEmail,
          subject: `[TEST] ${doc.subject}`,
          html: renderEmailHtml(doc.blocks, opts),
          text: renderEmailText(doc.blocks, opts),
          attachments: newsletterAttachments(opts),
        });
      } finally {
        transporter.close();
      }
      return { ok: true, test: true };
    }

    const r = await deliverNewsletter(newsletterId);
    return { ok: true, ...r };
  },
);

// ─── sendScheduledNewsletters : le calendrier et la reprise ─────────────────
// Toutes les 5 minutes : chaque infolettre « scheduled » dont l'heure est
// passée part, et chaque infolettre « sending » (passage précédent interrompu
// par le budget de temps ou par un plantage) reprend à son curseur. Le verrou
// `progress.lockUntil` empêche deux passages simultanés sur la même.
export const sendScheduledNewsletters = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'America/Toronto', secrets: MAIL_SECRETS, timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const db = getFirestore();
    const [due, enCours] = await Promise.all([
      db.collection('newsletters').where('status', '==', 'scheduled').where('scheduledFor', '<=', Timestamp.now()).get(),
      db.collection('newsletters').where('status', '==', 'sending').get(),
    ]);
    for (const d of [...enCours.docs, ...due.docs]) {
      try {
        const r = await deliverNewsletter(d.id);
        console.log('[sendScheduledNewsletters]', d.id, r);
      } catch (err) {
        console.error('[sendScheduledNewsletters] échec', d.id, err);
        await d.ref.update({ status: 'failed', lastError: String(err), updatedAt: FieldValue.serverTimestamp() });
      }
    }
  },
);

// ─── previewNewsletter : l'aperçu exact, servi à l'admin ────────────────────
// Un seul moteur de rendu (celui qui envoie), donc l'aperçu ne ment pas.
// Input: { blocks, subject, preheader }  → infolettre composée
//        { kind: 'welcome' | 'live-confirm' | 'live-d3' | 'live-veille' | 'live-h1' | 'live-replay' }
export const previewNewsletter = onCall(
  { secrets: MAIL_SECRETS, timeoutSeconds: 60 },
  async (request) => {
    assertAdmin(request);
    const data = (request.data || {}) as { blocks?: NewsletterBlock[]; subject?: string; preheader?: string; kind?: string; couverture?: Couverture; couvertureUrl?: string | null; signature?: boolean; lang?: Lang; bandeau?: Bandeau | null; fond?: string | null };
    const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();
    const unsubscribeUrl = buildUnsub('APERCU');
    const firstName = 'Krystine';

    if (data.kind === 'welcome') {
      return {
        html: inlineForPreview(renderWelcomeHtml({ firstName, unsubscribeUrl, postalAddress }).replace(/cid:photo/g, WELCOME_IMAGE_URL)),
        subject: WELCOME_SUBJECT,
      };
    }
    if (data.kind?.startsWith('live-')) {
      const step = data.kind.slice(5) as 'confirm' | 'd3' | 'veille' | 'h1' | 'replay';
      const db = getFirestore();
      const evs = await db.collection('liveEvents').orderBy('startsAt', 'desc').limit(1).get();
      const ev: LiveEvent = evs.empty
        ? { id: 'apercu', title: 'Podcast en direct', tag: 'podcast-live', startsAt: Timestamp.fromDate(new Date(Date.now() + 3 * 86400e3)), youtubeUrl: 'https://www.youtube.com/@KrystineStLaurent/live', replayUrl: 'https://www.youtube.com/@KrystineStLaurent' }
        : ({ id: evs.docs[0].id, ...(evs.docs[0].data() as Omit<LiveEvent, 'id'>) });
      if (step === 'replay' && !ev.replayUrl) ev.replayUrl = 'https://www.youtube.com/@KrystineStLaurent';
      const m = buildMail(step, ev, firstName);
      return { html: inlineForPreview(renderLiveHtml(m, { unsubscribeUrl, postalAddress, ev })), subject: m.subject };
    }

    const html = renderEmailHtml(data.blocks || [], { subject: data.subject || '(sans sujet)', preheader: data.preheader, unsubscribeUrl, postalAddress, firstName, ...enTete(data) });
    return { html: inlineForPreview(html), subject: data.subject || '' };
  },
);
