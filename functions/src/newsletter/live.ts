import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { Transporter } from 'nodemailer';
import {
  MAIL_SECRETS,
  NEWSLETTER_POSTAL_ADDRESS,
  PUBLIC_BASE_URL,
  REPLY_TO,
  createTransporter,
  fromAddr,
  unsubscribeUrl,
} from './mail';

// ─── Podcast en direct : confirmation + rappels automatiques ─────────────────
// Un document `liveEvents/{id}` décrit chaque direct (titre, date, lien
// YouTube, rediffusion). Les inscrits portent l'étiquette `tag` de l'événement
// dans `newsletter/{id}.tags`. Quatre envois automatiques :
//   d3      trois jours avant
//   veille  vingt-quatre heures avant
//   h1      une heure avant
//   replay  dès que l'admin pose `replayUrl`, après le direct
// Chaque envoi est verrouillé dans `reminders.<étape>` avant de partir : la
// fonction planifiée tourne toutes les quinze minutes et ne renvoie jamais
// deux fois la même étape. Une étape dont la fenêtre est passée depuis plus
// de trois heures est abandonnée (jamais de « c'est dans une heure » après
// le direct).

export interface LiveEvent {
  id: string;
  title: string;
  startsAt: Timestamp;
  youtubeUrl: string;
  replayUrl?: string;
  tag: string;
  reminders?: Partial<Record<Step, unknown>>;
}

type Step = 'd3' | 'veille' | 'h1' | 'replay';
const H = 3600 * 1000;
const PRE_STEPS: Array<[Step, number]> = [['d3', 72 * H], ['veille', 24 * H], ['h1', 1 * H]];
const GRACE = 3 * H;
const TZ = 'America/Toronto';

const CHARTE = {
  cream: '#EEE7DB',
  ink: '#293027',
  green: '#28352F',
  amber: '#BA7B39',
  copper: '#8B4A2F',
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmtDay(d: Date): string {
  return new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(d);
}
export function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat('fr-CA', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(d).replace(':', ' h ');
}

// Lien « ajouter à mon agenda » (Google Agenda, une heure par défaut).
export function calendarUrl(ev: LiveEvent): string {
  const start = ev.startsAt.toDate();
  const end = new Date(start.getTime() + H);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `En direct sur YouTube : ${ev.youtubeUrl}`,
    location: ev.youtubeUrl,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// ─── Copie des cinq courriels ────────────────────────────────────────────────
interface Mail { subject: string; preheader: string; paragraphs: string[]; cta: { label: string; url: string }; cta2?: { label: string; url: string }; closing: string }

export function buildMail(step: Step | 'confirm', ev: LiveEvent, firstName?: string): Mail {
  const salut = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const start = ev.startsAt.toDate();
  const jour = fmtDay(start);
  const heure = fmtTime(start);
  const agenda = { label: 'Ajouter à mon agenda', url: calendarUrl(ev) };
  const direct = { label: 'Ouvrir la page du direct', url: ev.youtubeUrl };

  switch (step) {
    case 'confirm':
      return {
        subject: `Votre place est réservée pour le direct du ${jour.replace(/^\S+\s/, '')}`,
        preheader: `${jour} à ${heure}, en direct sur YouTube. Le lien viendra à vous.`,
        paragraphs: [
          salut,
          `Vous y êtes! Votre place est réservée pour le premier épisode en direct d'Au-delà des tendances, ${jour} à ${heure}. Nous allons prendre le temps, ensemble, de revenir à ce que le corps sait déjà et que les tendances nous font oublier.`,
          'Si vous avez laissé une question en vous inscrivant, elle est bien reçue. Je la garde pour le direct, et j\'y répondrai en ondes, devant vous.',
          'Vous n\'avez rien à préparer. Le lien vous arrivera par courriel, avec un premier rappel trois jours avant. D\'ici là, vous pouvez inscrire le rendez-vous à votre agenda.',
        ],
        cta: agenda,
        closing: 'Au plaisir de vous retrouver en direct!',
      };
    case 'd3':
      return {
        subject: 'Dans trois jours, nous ouvrons le direct',
        preheader: `${jour} à ${heure}. Le lien est prêt, gardez-le près de vous.`,
        paragraphs: [
          salut,
          `Avez-vous remarqué comme le corps sait toujours avant nous quand un rendez-vous approche? Le nôtre est dans trois jours : ${jour} à ${heure}, en direct sur YouTube, pour le premier épisode en direct d'Au-delà des tendances.`,
          'Le lien est déjà prêt. Gardez-le près de vous, et si le rendez-vous manque encore à votre agenda, voici de quoi l\'y inscrire.',
        ],
        cta: direct,
        cta2: agenda,
        closing: 'À très bientôt!',
      };
    case 'veille':
      return {
        subject: `C'est demain, à ${heure}`,
        preheader: 'Une conversation sans montage, avec vos questions, en direct.',
        paragraphs: [
          salut,
          `C'est demain! ${jour.charAt(0).toUpperCase() + jour.slice(1)}, à ${heure}, nous nous retrouvons en direct. Pas de montage, pas de version retouchée : une conversation telle qu'elle se vit sur le moment, avec vos questions dans le clavardage et celles que vous m'avez confiées à l'inscription.`,
          'Voici le lien, à garder sous la main pour demain.',
        ],
        cta: direct,
        closing: 'À demain!',
      };
    case 'h1':
      return {
        subject: 'Nous commençons dans une heure',
        preheader: `Le direct s'ouvre à ${heure}. Installez-vous.`,
        paragraphs: [
          salut,
          `Dans une heure, à ${heure}, nous ouvrons le direct. Prenez le temps de vous installer, respirez un bon coup, et venez me rejoindre sur YouTube. Le corps aime qu'on arrive doucement.`,
        ],
        cta: { label: 'Rejoindre le direct', url: ev.youtubeUrl },
        closing: 'À tout de suite!',
      };
    case 'replay':
      return {
        subject: 'La rediffusion du direct est en ligne',
        preheader: 'Elle vous attend, au rythme qui est le vôtre.',
        paragraphs: [
          salut,
          `Vous n'avez pas pu être des nôtres ${jour}? La rediffusion du premier épisode en direct est maintenant en ligne. Elle vous attend au rythme qui est le vôtre, pour l'écouter en entier ou pour revenir sur un passage qui vous a parlé.`,
          'Merci à toutes celles et ceux qui étaient là, et à vous qui arrivez maintenant. C\'est ici que nous connectons!',
        ],
        cta: { label: 'Regarder la rediffusion', url: ev.replayUrl || ev.youtubeUrl },
        closing: 'À la prochaine!',
      };
  }
}

const COVER_URL = `${PUBLIC_BASE_URL}/podcast/live-cover.jpg`;
const SIGNATURE_URL = 'https://storage.googleapis.com/inspirata/Vata/1%20(1).png';

export function renderLiveHtml(m: Mail, opts: { unsubscribeUrl: string; postalAddress: string; ev?: LiveEvent }): string {
  const p = (t: string) =>
    `<tr><td style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:16px;line-height:1.75;color:${CHARTE.ink};">${esc(t)}</td></tr>`;
  const btn = (c: { label: string; url: string }, primary: boolean) =>
    `<a href="${esc(c.url)}" style="display:inline-block;margin:0 10px 10px 0;padding:15px 28px;border-radius:999px;font-family:${CHARTE.sans};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;${primary ? `background:${CHARTE.amber};color:${CHARTE.ink};` : `border:1px solid ${CHARTE.amber};color:${CHARTE.copper};`}">${esc(c.label)}</a>`;

  const ev = opts.ev;
  const start = ev ? ev.startsAt.toDate() : null;
  const jour = start ? fmtDay(start) : '';
  const heureQc = start ? fmtTime(start) : '';
  const heureFr = start ? new Intl.DateTimeFormat('fr-CA', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' }).format(start).replace(':', ' h ') : '';
  const cell = (label: string, big: string, small?: string) =>
    `<td valign="top" style="padding:0 24px 0 0;">
      <div style="font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${CHARTE.amber};padding-bottom:6px;">${esc(label)}</div>
      <div style="font-family:${CHARTE.serif};font-size:24px;line-height:1.15;color:${CHARTE.cream};">${esc(big)}</div>
      ${small ? `<div style="font-family:${CHARTE.serif};font-size:17px;line-height:1.3;color:rgba(238,231,219,0.65);">${esc(small)}</div>` : ''}
    </td>`;

  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(m.subject)}</title></head>
<body style="margin:0;padding:0;background:${CHARTE.cream};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;color:transparent;line-height:1px;">${esc(m.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.cream};padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- Couverture du podcast (carte du moodboard KSL) -->
        <tr><td style="padding:0;border-radius:15px 15px 0 0;overflow:hidden;background:#1c1a17;">
          <img src="${COVER_URL}" width="600" alt="Au-delà des tendances, le podcast avec Krystine St-Laurent" style="display:block;width:100%;max-width:600px;height:auto;border-radius:15px 15px 0 0;" />
        </td></tr>

        <!-- Bandeau vert profond : le rendez-vous -->
        <tr><td style="background:${CHARTE.green};padding:30px 40px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:${CHARTE.amber};font-weight:600;">&#9679;&nbsp; En direct sur YouTube</td></tr>
            <tr><td style="padding:0 0 20px;font-family:${CHARTE.serif};font-size:34px;line-height:1.08;color:${CHARTE.cream};font-weight:500;">${esc(m.subject)}</td></tr>
            <tr><td style="padding:0 0 22px;"><div style="height:1px;width:64px;background:${CHARTE.amber};"></div></td></tr>
            ${start ? `<tr><td><table role="presentation" cellpadding="0" cellspacing="0"><tr>${cell('Date', jour.charAt(0).toUpperCase() + jour.slice(1))}${cell('Heure', `${heureQc} · Québec`, `${heureFr} · France`)}</tr></table></td></tr>` : ''}
          </table>
        </td></tr>

        <!-- Corps ivoire -->
        <tr><td style="background:#ffffff;padding:40px 40px 14px;border-left:1px solid rgba(41,48,39,0.08);border-right:1px solid rgba(41,48,39,0.08);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${m.paragraphs.map(p).join('\n')}
            <tr><td style="padding:10px 0 26px;">${btn(m.cta, true)}${m.cta2 ? btn(m.cta2, false) : ''}</td></tr>
            <tr><td style="padding:0 0 6px;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.ink};">${esc(m.closing)}</td></tr>
            <tr><td style="padding:0 0 8px;"><img src="${SIGNATURE_URL}" width="170" alt="Krystine St-Laurent" style="display:block;width:170px;height:auto;" /></td></tr>
          </table>
        </td></tr>

        <!-- Pied -->
        <tr><td style="background:${CHARTE.cream};padding:26px 40px 8px;border-radius:0 0 15px 15px;border:1px solid rgba(41,48,39,0.08);border-top:0;font-family:${CHARTE.sans};font-size:11px;line-height:1.6;color:rgba(41,48,39,0.6);">
          <div style="font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${CHARTE.copper};padding-bottom:10px;">Nourrir et soigner &middot; Corps et conscience &middot; Science et sagesses</div>
          <div style="margin-bottom:8px;">${esc(opts.postalAddress)}</div>
          <div style="padding-bottom:18px;"><a href="${esc(opts.unsubscribeUrl)}" style="color:${CHARTE.copper};text-decoration:underline;">Se désabonner</a> · <a href="${PUBLIC_BASE_URL}/politique-de-confidentialite" style="color:${CHARTE.copper};text-decoration:underline;">Politique de confidentialité</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderLiveText(m: Mail, opts: { unsubscribeUrl: string; postalAddress: string }): string {
  const lines = [...m.paragraphs, `${m.cta.label} : ${m.cta.url}`];
  if (m.cta2) lines.push(`${m.cta2.label} : ${m.cta2.url}`);
  lines.push(m.closing, 'Krystine St-Laurent', '', opts.postalAddress, `Se désabonner : ${opts.unsubscribeUrl}`);
  return lines.join('\n\n');
}

export async function findEventByTags(tags: string[] | undefined): Promise<LiveEvent | null> {
  if (!tags || tags.length === 0) return null;
  const db = getFirestore();
  const snap = await db.collection('liveEvents').where('tag', 'in', tags.slice(0, 10)).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<LiveEvent, 'id'>) };
}

export async function sendLiveMail(
  transporter: Transporter,
  step: Step | 'confirm',
  ev: LiveEvent,
  sub: { email: string; firstName?: string; unsubscribeToken?: string },
): Promise<void> {
  const m = buildMail(step, ev, sub.firstName);
  const unsub = unsubscribeUrl(sub.unsubscribeToken || '');
  const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();
  await transporter.sendMail({
        replyTo: REPLY_TO,
    from: fromAddr(),
    to: sub.email,
    subject: m.subject,
    html: renderLiveHtml(m, { unsubscribeUrl: unsub, postalAddress, ev }),
    text: renderLiveText(m, { unsubscribeUrl: unsub, postalAddress }),
    headers: {
      'List-Unsubscribe': `<${unsub}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

// ─── Fonction planifiée ──────────────────────────────────────────────────────
export const sendLiveReminders = onSchedule(
  { schedule: 'every 15 minutes', timeZone: TZ, secrets: MAIL_SECRETS, timeoutSeconds: 540, memory: '256MiB' },
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const events = await db.collection('liveEvents').get();
    if (events.empty) return;

    let transporter: Transporter | null = null;
    try {
      for (const evDoc of events.docs) {
        const ev = { id: evDoc.id, ...(evDoc.data() as Omit<LiveEvent, 'id'>) };
        if (!ev.startsAt || !ev.tag) continue;
        const start = ev.startsAt.toMillis();
        const done = ev.reminders || {};

        const due: Step[] = [];
        for (const [step, before] of PRE_STEPS) {
          const at = start - before;
          if (!done[step] && now >= at && now < start && now < at + GRACE) due.push(step);
        }
        if (!done.replay && ev.replayUrl && now > start) due.push('replay');
        if (due.length === 0) continue;

        // Verrou avant tout envoi : la prochaine exécution voit l'étape faite.
        const lock: Record<string, unknown> = {};
        for (const s of due) lock[`reminders.${s}`] = FieldValue.serverTimestamp();
        await evDoc.ref.update(lock);

        // Un seul filtre dans la requête (array-contains); le statut se
        // vérifie en code pour éviter un index composé.
        const subsSnap = await db.collection('newsletter').where('tags', 'array-contains', ev.tag).get();
        const seen = new Set<string>();
        const subs = subsSnap.docs
          .map(d => d.data() as { email?: string; firstName?: string; unsubscribeToken?: string; status?: string })
          .filter(s => s.email && (!s.status || s.status === 'active') && !seen.has(s.email) && seen.add(s.email));

        transporter = transporter || createTransporter();
        for (const step of due) {
          let sent = 0;
          for (const s of subs) {
            try {
              await sendLiveMail(transporter, step, ev, s as { email: string; firstName?: string; unsubscribeToken?: string });
              sent++;
            } catch (err) {
              console.error('[sendLiveReminders]', ev.id, step, s.email, err);
            }
          }
          await evDoc.ref.update({ [`stats.${step}`]: sent });
          console.log('[sendLiveReminders]', ev.id, step, `${sent}/${subs.length}`);
        }
      }
    } finally {
      transporter?.close();
    }
  },
);
