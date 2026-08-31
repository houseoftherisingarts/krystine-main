import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { renderEmailHtml, renderEmailText, newsletterAttachments, inlineForPreview, type NewsletterBlock } from './renderer';
import { MAIL_SECRETS, NEWSLETTER_POSTAL_ADDRESS, REPLY_TO, createTransporter, fromAddr as buildFrom, unsubscribeUrl as buildUnsub } from './mail';
import { renderWelcomeHtml, WELCOME_SUBJECT } from './welcome';
import { buildMail, renderLiveHtml, type LiveEvent } from './live';

// Secrets, transport SMTP et adresses de base vivent dans ./mail.ts, partagés
// avec le courriel de bienvenue (welcome.ts) et les rappels du direct (live.ts).

export const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
  'krystinestlaurent@gmail.com',
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
  unsubscribeToken?: string;
}

// Qui reçoit : tout le monde, des listes (étiquettes), ou des personnes
// choisies une à une. `segmentTag` reste lu pour les anciens brouillons.
export interface NewsletterAudience {
  mode: 'all' | 'tags' | 'emails';
  tags?: string[];
  emails?: string[];
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
}

export function selectRecipients<T extends SubscriberDoc>(subs: T[], doc: Pick<NewsletterRecord, 'audience' | 'segmentTag'>): T[] {
  const a: NewsletterAudience = doc.audience || (doc.segmentTag ? { mode: 'tags', tags: [doc.segmentTag] } : { mode: 'all' });
  const norm = (e: string) => e.trim().toLowerCase();
  const wanted = new Set((a.emails || []).map(norm));
  const tags = a.tags || [];
  return subs
    .filter(s => {
      if (a.mode === 'emails') return wanted.has(norm(s.email));
      if (a.mode === 'tags') return (s.tags || []).some(t => tags.includes(t));
      return true;
    })
    // Une adresse inscrite par deux formulaires ne reçoit qu'un courriel.
    .filter((s, i, arr) => arr.findIndex(o => norm(o.email) === norm(s.email)) === i);
}

// ─── Envoi réel d'une infolettre (appel direct ou planifié) ─────────────────
export async function deliverNewsletter(newsletterId: string): Promise<{ recipients: number; delivered: number; bounces: number }> {
  const db = getFirestore();
  const ref = db.doc(`newsletters/${newsletterId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Newsletter not found');
  const doc = snap.data() as NewsletterRecord;
  if (doc.status !== 'draft' && doc.status !== 'scheduled') {
    throw new HttpsError('failed-precondition', `Cannot send a newsletter in status "${doc.status}"`);
  }
  if (!doc.blocks?.length) throw new HttpsError('failed-precondition', 'Newsletter has no content');
  if (!doc.subject) throw new HttpsError('failed-precondition', 'Newsletter is missing a subject');

  await ref.update({ status: 'sending', updatedAt: FieldValue.serverTimestamp() });

  const transporter = createTransporter();
  const fromAddr = buildFrom(doc.fromName || 'Krystine St-Laurent');
  const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();

  // Un seul filtre côté Firestore (statut); l'audience se règle en code.
  const subsSnap = await db.collection('newsletter').where('status', '==', 'active').get();
  const subscribers = selectRecipients(
    subsSnap.docs.map(d => ({ id: d.id, ...(d.data() as SubscriberDoc) })),
    doc,
  );

  let delivered = 0;
  let bounced = 0;

  // Un envoi à la fois sur la connexion SMTP mutualisée.
  for (const sub of subscribers) {
    try {
      const unsubscribeUrl = buildUnsub(sub.unsubscribeToken || '');
      const opts = { subject: doc.subject, preheader: doc.preheader, unsubscribeUrl, postalAddress, firstName: sub.firstName };
      await transporter.sendMail({
        from: fromAddr,
        replyTo: REPLY_TO,
        to: sub.email,
        subject: doc.subject,
        html: renderEmailHtml(doc.blocks, opts),
        text: renderEmailText(doc.blocks, opts),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        attachments: newsletterAttachments(),
      });
      delivered++;

      if (sub.uid) {
        await db.doc(`members/${sub.uid}/inbox/${newsletterId}`).set({
          newsletterId,
          title: doc.title || doc.subject,
          subject: doc.subject,
          receivedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      bounced++;
      console.warn('[deliverNewsletter] delivery failed', sub.email, err);
    }
  }
  transporter.close();

  await ref.update({
    status: 'sent',
    sentAt: Timestamp.now(),
    updatedAt: FieldValue.serverTimestamp(),
    stats: { recipients: subscribers.length, delivered, bounces: bounced },
  });

  return { recipients: subscribers.length, delivered, bounces: bounced };
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
      const opts = { subject: doc.subject, preheader: doc.preheader, unsubscribeUrl: buildUnsub('TEST'), postalAddress: NEWSLETTER_POSTAL_ADDRESS.value(), firstName: 'Test' };
      try {
        await transporter.sendMail({
          from: buildFrom(doc.fromName || 'Krystine St-Laurent'),
          replyTo: REPLY_TO,
          to: testEmail,
          subject: `[TEST] ${doc.subject}`,
          html: renderEmailHtml(doc.blocks, opts),
          text: renderEmailText(doc.blocks, opts),
          attachments: newsletterAttachments(),
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

// ─── sendScheduledNewsletters : le calendrier ───────────────────────────────
// Toutes les 5 minutes : chaque infolettre « scheduled » dont l'heure est
// passée part. Le passage à « sending » dans deliverNewsletter sert de verrou.
export const sendScheduledNewsletters = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'America/Toronto', secrets: MAIL_SECRETS, timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const db = getFirestore();
    const due = await db.collection('newsletters')
      .where('status', '==', 'scheduled')
      .where('scheduledFor', '<=', Timestamp.now())
      .get();
    for (const d of due.docs) {
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
    const data = (request.data || {}) as { blocks?: NewsletterBlock[]; subject?: string; preheader?: string; kind?: string };
    const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();
    const unsubscribeUrl = buildUnsub('APERCU');
    const firstName = 'Krystine';

    if (data.kind === 'welcome') {
      return { html: renderWelcomeHtml({ firstName, unsubscribeUrl, postalAddress }), subject: WELCOME_SUBJECT };
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

    const html = renderEmailHtml(data.blocks || [], { subject: data.subject || '(sans sujet)', preheader: data.preheader, unsubscribeUrl, postalAddress, firstName });
    return { html: inlineForPreview(html), subject: data.subject || '' };
  },
);
