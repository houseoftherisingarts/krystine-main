import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { renderEmailHtml, renderEmailText, type NewsletterBlock } from './renderer';

// ─── Secrets ─────────────────────────────────────────────────────────────────
// Set with: firebase functions:secrets:set RESEND_API_KEY
// and:       firebase functions:secrets:set NEWSLETTER_FROM_EMAIL
// and:       firebase functions:secrets:set NEWSLETTER_POSTAL_ADDRESS
// NEWSLETTER_POSTAL_ADDRESS is the CASL-required business mailing address
// rendered in the footer of every email.
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const NEWSLETTER_FROM_EMAIL = defineSecret('NEWSLETTER_FROM_EMAIL');
const NEWSLETTER_POSTAL_ADDRESS = defineSecret('NEWSLETTER_POSTAL_ADDRESS');

const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
];

const PUBLIC_BASE_URL = 'https://www.krystinestlaurent.ca';
const BRAND_LOGO_URL = 'https://storage.googleapis.com/inspirata/Vata/1%20(1).png';

interface SubscriberDoc {
  email: string;
  firstName?: string;
  lastName?: string;
  uid?: string;
  status?: string;
  tags?: string[];
  unsubscribeToken?: string;
}

interface NewsletterRecord {
  title: string;
  subject: string;
  preheader?: string;
  fromName?: string;
  blocks: NewsletterBlock[];
  status: string;
  segmentTag?: string | null;
}

// ─── sendNewsletter ──────────────────────────────────────────────────────────
// Admin-only HTTPS callable. Input: { newsletterId, testEmail? }.
// testEmail: when present, sends ONLY to that address (admin test flow) and
// does NOT mutate the newsletter's status or write per-member inbox docs.
export const sendNewsletter = onCall(
  {
    secrets: [RESEND_API_KEY, NEWSLETTER_FROM_EMAIL, NEWSLETTER_POSTAL_ADDRESS],
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email || !ADMIN_EMAILS.includes(email)) {
      throw new HttpsError('permission-denied', 'Admin only.');
    }

    const { newsletterId, testEmail } = (request.data || {}) as { newsletterId?: string; testEmail?: string };
    if (!newsletterId) throw new HttpsError('invalid-argument', 'newsletterId is required');

    const db = getFirestore();
    const ref = db.doc(`newsletters/${newsletterId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Newsletter not found');

    const doc = snap.data() as NewsletterRecord;
    if (!testEmail && doc.status !== 'draft' && doc.status !== 'scheduled') {
      throw new HttpsError('failed-precondition', `Cannot send a newsletter in status "${doc.status}"`);
    }
    if (!doc.blocks?.length) throw new HttpsError('failed-precondition', 'Newsletter has no content');
    if (!doc.subject) throw new HttpsError('failed-precondition', 'Newsletter is missing a subject');

    const resend = new Resend(RESEND_API_KEY.value());
    const fromAddr = `${doc.fromName || 'Krystine St-Laurent'} <${NEWSLETTER_FROM_EMAIL.value()}>`;
    const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();

    // ── Test send path ────────────────────────────────────────────────────
    if (testEmail) {
      const unsubscribeUrl = `${PUBLIC_BASE_URL}/desinscription?t=TEST`;
      const html = renderEmailHtml(doc.blocks, {
        subject: doc.subject,
        preheader: doc.preheader,
        unsubscribeUrl,
        postalAddress,
        firstName: 'Test',
        brandLogoUrl: BRAND_LOGO_URL,
      });
      const text = renderEmailText(doc.blocks, { subject: doc.subject, unsubscribeUrl, postalAddress, firstName: 'Test' });
      await resend.emails.send({
        from: fromAddr,
        to: [testEmail],
        subject: `[TEST] ${doc.subject}`,
        html,
        text,
      });
      return { ok: true, test: true };
    }

    // ── Production send path ──────────────────────────────────────────────
    await ref.update({ status: 'sending', updatedAt: FieldValue.serverTimestamp() });

    // Load active subscribers. Apply segmentTag filter client-side since
    // Firestore can't combine array-contains with another equality in one
    // composite index without extra setup.
    const subsSnap = await db.collection('newsletter').where('status', '==', 'active').get();
    const segmentTag = doc.segmentTag || null;
    const subscribers: Array<SubscriberDoc & { id: string }> = subsSnap.docs
      .map(d => ({ id: d.id, ...(d.data() as SubscriberDoc) }))
      .filter(s => !segmentTag || (s.tags || []).includes(segmentTag));

    let delivered = 0;
    let bounced = 0;
    const BATCH = 100;

    for (let i = 0; i < subscribers.length; i += BATCH) {
      const slice = subscribers.slice(i, i + BATCH);
      await Promise.all(slice.map(async (sub) => {
        try {
          const unsubscribeUrl = `${PUBLIC_BASE_URL}/desinscription?t=${encodeURIComponent(sub.unsubscribeToken || '')}`;
          const html = renderEmailHtml(doc.blocks, {
            subject: doc.subject,
            preheader: doc.preheader,
            unsubscribeUrl,
            postalAddress,
            firstName: sub.firstName,
            brandLogoUrl: BRAND_LOGO_URL,
          });
          const text = renderEmailText(doc.blocks, { subject: doc.subject, unsubscribeUrl, postalAddress, firstName: sub.firstName });
          await resend.emails.send({
            from: fromAddr,
            to: [sub.email],
            subject: doc.subject,
            html,
            text,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });
          delivered++;

          // If the subscriber has a member uid, drop an inbox pointer so
          // the newsletter shows up in their client portal archives.
          if (sub.uid) {
            await db
              .doc(`members/${sub.uid}/inbox/${newsletterId}`)
              .set({
                newsletterId,
                title: doc.title || doc.subject,
                subject: doc.subject,
                receivedAt: FieldValue.serverTimestamp(),
              }, { merge: true });
          }
        } catch (err) {
          bounced++;
          console.warn('[sendNewsletter] delivery failed', sub.email, err);
        }
      }));
    }

    await ref.update({
      status: 'sent',
      sentAt: Timestamp.now(),
      updatedAt: FieldValue.serverTimestamp(),
      stats: {
        recipients: subscribers.length,
        delivered,
        bounces: bounced,
      },
    });

    return { ok: true, recipients: subscribers.length, delivered, bounces: bounced };
  },
);
