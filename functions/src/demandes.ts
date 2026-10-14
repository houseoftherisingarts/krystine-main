import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { MAIL_SECRETS, PUBLIC_BASE_URL, createTransporter, fromAddr } from './newsletter/mail';
import { TEAM_EMAIL } from './newsletter/reponse';

// ─── Avis à l'équipe pour chaque nouvelle demande (Krystine, 14 oct. 2026) ───
// Conférence, entrevue, collaboration : tout ce qui arrive dans bookingRequests
// part aussitôt par courriel à teamksl@inspiratanature.com, avec les réponses
// du formulaire. Avant, deux demandes de conférence (mai et septembre) ont
// dormi dans l'admin sans que personne le sache. Une demande saisie à la main
// dans l'admin (source « courriel ») ne renvoie pas d'avis : l'équipe l'a déjà.

const LIBELLES: Record<string, string> = {
  name: 'Nom',
  email: 'Courriel',
  phone: 'Téléphone',
  organization: 'Organisation',
  organizationUrl: 'Site web',
  demande: 'Ce qui est demandé',
  contenu: 'Contenu visé',
  support: 'Où et sous quelle forme',
  portee: 'Portée déclarée',
  region: 'Région',
  city: 'Ville',
  preferredDate: 'Date souhaitée',
  budgetRange: 'Budget',
  eventType: 'Type',
  message: 'Message',
};

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const notifierDemande = onDocumentCreated(
  { document: 'bookingRequests/{id}', secrets: MAIL_SECRETS, timeoutSeconds: 60 },
  async (event) => {
    const d = event.data?.data() as Record<string, unknown> | undefined;
    if (!d || d.source === 'courriel') return;

    const nom = String(d.name || '').trim() || 'Quelqu\'un';
    const courriel = String(d.email || '').trim();
    const org = String(d.organization || '').trim();
    const adminUrl = `${PUBLIC_BASE_URL}/admin/demandes`;
    const lignes = Object.entries(LIBELLES)
      .filter(([k]) => d[k] != null && String(d[k]).trim() !== '')
      .map(([k, l]) => [l, String(d[k]).trim()] as const);

    const sujet = `Nouvelle demande : ${nom}${org ? `, ${org}` : ''}`;
    const text = [
      `${nom} vient de faire une demande sur le site (${String(d.source || 'formulaire')}).`,
      '',
      ...lignes.map(([l, v]) => `${l} : ${v}`),
      '',
      `La grille et la charte de partage s'appliquent avant toute réponse. Notes et statut : ${adminUrl}`,
    ].join('\n');
    const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#f6f3ee;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2015;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:15px;padding:32px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#7d6330;font-weight:600;">Nouvelle demande</p>
        <h1 style="margin:0 0 18px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:26px;line-height:1.15;">${esc(nom)}${org ? `, ${esc(org)}` : ''}</h1>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 22px;">
          ${lignes.map(([l, v]) => `<tr><td style="padding:7px 12px 7px 0;vertical-align:top;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#7d6330;font-weight:600;width:150px;">${esc(l)}</td><td style="padding:7px 0;font-size:14px;line-height:1.6;white-space:pre-wrap;border-bottom:1px solid rgba(42,32,21,.06);">${esc(v)}</td></tr>`).join('')}
        </table>
        <a href="${adminUrl}" style="display:inline-block;background:#bb9a5e;color:#2a2015;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:.18em;text-transform:uppercase;padding:12px 22px;border-radius:999px;">Ouvrir dans l'admin</a>
        <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:rgba(42,32,21,.55);">La grille et la charte de partage s'appliquent avant toute réponse. Les notes et le statut se tiennent dans l'admin, section Demandes.</p>
      </div></body></html>`;

    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        from: fromAddr('Demandes · Krystine St-Laurent'),
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
