import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { renderEmailHtml, renderEmailText, type NewsletterBlock } from './renderer';
import { MAIL_SECRETS, NEWSLETTER_POSTAL_ADDRESS, BRAND_LOGO_URL, createTransporter, fromAddr as buildFrom, unsubscribeUrl as buildUnsub } from './mail';

// Secrets, transport SMTP et adresses de base vivent dans ./mail.ts, partagés
// avec le courriel de bienvenue (welcome.ts).

const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
  'krystinestterredhysope@gmail.com',
];

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
    secrets: MAIL_SECRETS,
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

    const transporter = createTransporter();
    const fromAddr = buildFrom(doc.fromName || 'Krystine St-Laurent');
    const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();

    // ── Test send path ────────────────────────────────────────────────────
    if (testEmail) {
      const unsubscribeUrl = buildUnsub('TEST');
      const html = renderEmailHtml(doc.blocks, {
        subject: doc.subject,
        preheader: doc.preheader,
        unsubscribeUrl,
        postalAddress,
        firstName: 'Test',
        brandLogoUrl: BRAND_LOGO_URL,
      });
      const text = renderEmailText(doc.blocks, { subject: doc.subject, unsubscribeUrl, postalAddress, firstName: 'Test' });
      await transporter.sendMail({
        from: fromAddr,
        to: testEmail,
        subject: `[TEST] ${doc.subject}`,
        html,
        text,
      });
      transporter.close();
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

    // Send one at a time over the pooled SMTP connection. Gentler on Gmail's
    // sending limits than firing a large parallel batch.
    for (const sub of subscribers) {
      try {
        const unsubscribeUrl = buildUnsub(sub.unsubscribeToken || '');
        const html = renderEmailHtml(doc.blocks, {
          subject: doc.subject,
          preheader: doc.preheader,
          unsubscribeUrl,
          postalAddress,
          firstName: sub.firstName,
          brandLogoUrl: BRAND_LOGO_URL,
        });
        const text = renderEmailText(doc.blocks, { subject: doc.subject, unsubscribeUrl, postalAddress, firstName: sub.firstName });
        await transporter.sendMail({
          from: fromAddr,
          to: sub.email,
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
    }
    transporter.close();

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
