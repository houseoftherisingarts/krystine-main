import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { MAIL_SECRETS, PUBLIC_BASE_URL, createTransporter, fromAddr } from './mail';
import { TEAM_EMAIL } from './reponse';

// ─── Avis à l'équipe quand une cliente écrit au soutien ─────────────────────
// Chaque message envoyé depuis l'onglet Messagerie › Soutien de l'espace
// client (conversations/{uid}/messages, sender = client) déclenche un courriel
// à teamksl@inspiratanature.com. Le Reply-To pointe vers la cliente, mais la
// vraie réponse se donne dans l'admin, onglet Messages : c'est là que la
// cliente la lira.

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const notifierSoutien = onDocumentCreated(
  { document: 'conversations/{uid}/messages/{id}', secrets: MAIL_SECRETS, timeoutSeconds: 60 },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const m = snap.data() as { sender?: string; body?: string };
    if (m.sender !== 'client' || !m.body) return;

    const uid = event.params.uid;
    const conv = (await getFirestore().doc(`conversations/${uid}`).get()).data() as
      { memberName?: string; memberEmail?: string } | undefined;
    const nom = (conv?.memberName || '').trim() || 'Une cliente';
    const courriel = (conv?.memberEmail || '').trim();
    const adminUrl = `${PUBLIC_BASE_URL}/admin`;

    const sujet = `Message au soutien de ${nom}`;
    const text = [
      `${nom}${courriel ? ` (${courriel})` : ''} vient d'écrire au soutien :`,
      '',
      m.body,
      '',
      `Pour répondre, ouvrez l'admin, onglet Messages : ${adminUrl}`,
      'La cliente lira la réponse dans son espace client.',
    ].join('\n');
    const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#f6f3ee;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2015;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:15px;padding:32px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#7d6330;font-weight:600;">Soutien Inspirata</p>
        <h1 style="margin:0 0 18px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:26px;line-height:1.15;">${esc(nom)} vous a écrit</h1>
        ${courriel ? `<p style="margin:0 0 14px;font-size:13px;color:rgba(42,32,21,.6);">${esc(courriel)}</p>` : ''}
        <blockquote style="margin:0 0 22px;padding:14px 18px;border-left:2px solid #bb9a5e;background:#f6f3ee;border-radius:0 12px 12px 0;font-size:15px;line-height:1.65;white-space:pre-wrap;">${esc(m.body)}</blockquote>
        <a href="${adminUrl}" style="display:inline-block;background:#bb9a5e;color:#2a2015;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:.18em;text-transform:uppercase;padding:12px 22px;border-radius:999px;">Répondre dans l'admin</a>
        <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:rgba(42,32,21,.55);">La cliente lira votre réponse dans son espace client, onglet Messagerie.</p>
      </div></body></html>`;

    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        from: fromAddr('Soutien Inspirata'),
        to: TEAM_EMAIL,
        replyTo: courriel || undefined,
        subject: sujet,
        text,
        html,
      });
    } finally {
      transporter.close();
    }
  },
);
