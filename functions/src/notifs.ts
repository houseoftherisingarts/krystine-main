import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { MAIL_SECRETS, PUBLIC_BASE_URL, createTransporter, fromAddr } from './newsletter/mail';
import { ADMIN_EMAILS, assertAdmin } from './newsletter/send';

// ─── Courriels des deux interrupteurs de ClientPreferences.tsx ──────────────
// courrielBillets  → notifierBillet (auto, sur chaque billet du feed public
//                     ou du Foyer publié par Krystine/l'équipe).
// courrielChangements → annoncerChangement (appelable, déclenchée à la main
//                     dans l'admin — aucune interface pour l'instant, hors
//                     périmètre de ce chantier).
// Gabarit et transport partagés avec le reste du courrier (./newsletter/mail).

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gabarit(titre: string, texte: string, lien: string, libelleLien: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#EEE7DB;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#293027;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:15px;padding:32px;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#BA7B39;font-weight:600;">Krystine St-Laurent</p>
      <h1 style="margin:0 0 18px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:26px;line-height:1.2;">${esc(titre)}</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.65;white-space:pre-wrap;">${esc(texte)}</p>
      <a href="${lien}" style="display:inline-block;background:#BA7B39;color:#293027;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:.18em;text-transform:uppercase;padding:12px 22px;border-radius:999px;">${esc(libelleLien)}</a>
    </div></body></html>`;
}

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function envoyerATous(destinataires: string[], sujet: string, texte: string, lien: string, libelleLien: string) {
  if (!destinataires.length) return;
  const transporter = createTransporter();
  const html = gabarit(sujet, texte, lien, libelleLien);
  try {
    for (const email of destinataires) {
      try {
        await transporter.sendMail({ from: fromAddr(), to: email, subject: sujet, text: `${texte}\n\n${lien}`, html });
      } catch (err) {
        console.error('notifs: échec envoi à', email, err);
      }
      await pause(150);
    }
  } finally {
    transporter.close();
  }
}

export const notifierBillet = onDocumentCreated(
  { document: 'mur/{postId}', secrets: MAIL_SECRETS, timeoutSeconds: 300, memory: '512MiB' },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const post = snap.data() as { fil?: string; uid?: string; texte?: string };
    const estFeed = post.fil === 'communaute';
    const estFoyer = typeof post.fil === 'string' && post.fil.startsWith('formation:foyer');
    if ((!estFeed && !estFoyer) || !post.uid || !post.texte) return;

    const db = getFirestore();
    // Le champ `officiel` du billet vient du client : pas fiable pour décider
    // d'envoyer un courriel à toute la liste. On revérifie côté serveur.
    const auteur = (await db.doc(`members/${post.uid}`).get()).data() as { email?: string } | undefined;
    if (!auteur?.email || !ADMIN_EMAILS.includes(auteur.email)) return;

    const membres = await db.collection('members').get();
    const destinataires: string[] = [];
    for (const m of membres.docs) {
      const data = m.data() as { email?: string; prefs?: { courrielBillets?: boolean }; accesVie?: boolean };
      if (!data.email || data.prefs?.courrielBillets === false) continue;
      if (estFoyer && !data.accesVie) {
        const achat = await db.doc(`achatsFormations/${m.id}/formations/foyer`).get();
        if (!achat.exists) continue;
      }
      destinataires.push(data.email);
    }

    const extrait = post.texte.slice(0, 600);
    const sujet = `Krystine a publié : ${post.texte.slice(0, 60)}${post.texte.length > 60 ? '…' : ''}`;
    const lien = estFoyer ? `${PUBLIC_BASE_URL}/foyer` : `${PUBLIC_BASE_URL}/compte`;
    const libelleLien = estFoyer ? 'Voir dans le Foyer' : 'Voir dans mon espace';
    await envoyerATous(destinataires, sujet, extrait, lien, libelleLien);
  },
);

export const annoncerChangement = onCall(
  { secrets: MAIL_SECRETS, timeoutSeconds: 300, memory: '512MiB' },
  async (request: CallableRequest) => {
    assertAdmin(request);
    const { sujet, texte, lien } = (request.data || {}) as { sujet?: string; texte?: string; lien?: string };
    if (!sujet?.trim() || !texte?.trim()) throw new HttpsError('invalid-argument', 'Sujet et texte requis.');

    const db = getFirestore();
    const membres = await db.collection('members').get();
    const destinataires = membres.docs
      .map((m) => m.data() as { email?: string; prefs?: { courrielChangements?: boolean } })
      .filter((d) => d.email && d.prefs?.courrielChangements !== false)
      .map((d) => d.email as string);

    await envoyerATous(destinataires, sujet.trim(), texte.trim().slice(0, 2000), lien?.trim() || `${PUBLIC_BASE_URL}/compte`, 'Voir sur le site');
    return { envoyes: destinataires.length };
  },
);
