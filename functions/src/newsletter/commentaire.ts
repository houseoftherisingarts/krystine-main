import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { MAIL_SECRETS, PUBLIC_BASE_URL, createTransporter, fromAddr } from './mail';
import { TEAM_EMAIL } from './reponse';

// ─── Avis à l'équipe quand une visiteuse laisse un commentaire ──────────────
// Le bouton « Un commentaire ? Écrivez-nous » et le signalement de problème de
// /compte rangent leur fiche dans bugs/{id}. Jusqu'au 7 octobre 2026, personne
// n'en était avisé : des commentaires ont attendu deux semaines. Chaque
// nouvelle fiche envoie maintenant un courriel à teamksl@inspiratanature.com.
// La réponse se donne dans l'admin, onglet Commentaires des visiteuses.

const TYPES: Record<string, string> = {
  aime: 'J’aime ce que je vois',
  idee: 'Une idée',
  technique: 'Quelque chose bloque',
  introuvable: 'Je ne trouve pas ce que je cherche',
};

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const notifierCommentaire = onDocumentCreated(
  { document: 'bugs/{id}', secrets: MAIL_SECRETS, timeoutSeconds: 60 },
  async (event) => {
    const d = event.data?.data() as Record<string, unknown> | undefined;
    if (!d) return;
    const texte = String(d.texte || d.description || d.message || '').trim();
    if (!texte) return;
    const nom = String(d.nom || '').trim() || 'Une visiteuse';
    const courriel = String(d.courriel || d.email || '').trim();
    const page = String(d.page || '').trim();
    const genre = TYPES[String(d.type)] || 'Commentaire';
    const adminUrl = `${PUBLIC_BASE_URL}/admin/problemes-techniques`;
    const capture = String(d.capture || '');

    const text = [
      `${genre} · ${nom}${courriel ? ` (${courriel})` : ''}${page ? ` · page ${page}` : ''}`,
      '',
      texte,
      '',
      capture ? `Capture jointe : ${capture}\n` : '',
      `Pour le traiter : ${adminUrl}`,
    ].join('\n');
    const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#f6f3ee;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2015;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:15px;padding:32px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#7d6330;font-weight:600;">${esc(genre)}</p>
        <h1 style="margin:0 0 18px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:26px;line-height:1.15;">${esc(nom)} a laissé un commentaire</h1>
        <p style="margin:0 0 14px;font-size:13px;color:rgba(42,32,21,.6);">${esc([courriel, page && `page ${page}`].filter(Boolean).join(' · '))}</p>
        <blockquote style="margin:0 0 22px;padding:14px 18px;border-left:2px solid #bb9a5e;background:#f6f3ee;border-radius:0 12px 12px 0;font-size:15px;line-height:1.65;white-space:pre-wrap;">${esc(texte)}</blockquote>
        ${capture ? `<p style="margin:0 0 18px;font-size:13px;"><a href="${esc(capture)}" style="color:#7d6330;">Voir la capture jointe</a></p>` : ''}
        <a href="${adminUrl}" style="display:inline-block;background:#bb9a5e;color:#2a2015;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:.18em;text-transform:uppercase;padding:12px 22px;border-radius:999px;">Traiter dans l'admin</a>
      </div></body></html>`;

    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        from: fromAddr('Site krystinestlaurent.ca'),
        to: TEAM_EMAIL,
        replyTo: courriel || undefined,
        subject: `${genre} · ${nom}`,
        text,
        html,
      });
    } finally {
      transporter.close();
    }
  },
);
