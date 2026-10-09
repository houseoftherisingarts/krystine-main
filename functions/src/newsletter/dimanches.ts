import { PUBLIC_BASE_URL } from './mail';
import type { LiveEvent, Mail, Step } from './live';

// ─── Les Dimanches d'Origine (décision de Krystine, 8 octobre 2026) ──────────
// Trois directs ouverts à toutes, sur inscription : LIRE (25 octobre), TRIER
// (1er novembre), ANCRER (8 novembre), à 9 h, heure du Québec. Chaque
// dimanche est un document `liveEvents` ordinaire (serie: 'dimanches-origine')
// et passe par la même mécanique que le podcast en direct : confirmation,
// rappels, rediffusion. Seuls les mots changent, ici. Décisions du 8 octobre :
// la signature « Les Dimanches d'Origine » ouvre l'objet de chaque courriel;
// 75 à 90 minutes avec une méditation d'environ 15 minutes en clôture;
// aucune pièce jointe (la carte en PDF est retirée, Krystine : jamais la
// matière d'EXPÉRIENCE ORIGINE dans les Dimanches); rediffusion
// disponible jusqu'au 20 novembre; seuls la veille et l'heure d'avant
// rappellent le direct (le rappel de trois jours ne part pas, voir live.ts).

export const SERIE_DIMANCHES = 'dimanches-origine';
export const SIGNATURE = 'Les Dimanches d’Origine';
const JUSQUA = '20 novembre';

/** La page qui ouvre le partage du lien personnel de l'inscrite. */
export const lienInviter = (id: string) => `${PUBLIC_BASE_URL}/dimanches?inviter=${encodeURIComponent(id)}`;

/** Ce que le courriel connaît déjà, calculé par live.ts (dates, liens). */
export interface Contexte {
  salut: string;
  jour: string;
  heure: string;
  agenda: { label: string; url: string };
  direct: { label: string; url: string };
  /** Les trois dimanches, pour la confirmation : « le dimanche 25 octobre pour LIRE ». */
  serie: Array<{ jour: string; mot: string }>;
  inviteUrl?: string;
}

const motDe = (ev: LiveEvent) => (ev.title.split('·').pop() || ev.title).trim();

export function enumererSerie(liste: Array<{ jour: string; mot: string }>): string {
  const morceaux = liste.map(d => `le ${d.jour} pour ${d.mot}`);
  if (morceaux.length <= 1) return morceaux.join('');
  return `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}`;
}

/** « dimanche 1 novembre » → « dimanche 1er novembre ». */
const premier = (jour: string) => jour.replace(/(^|\s)1 (?=\S)/, '$11er ');

export function buildMailDimanche(step: Step | 'confirm', ev: LiveEvent, ctx: Contexte): Mail {
  const c = { ...ctx, jour: premier(ctx.jour), serie: ctx.serie.map(d => ({ ...d, jour: premier(d.jour) })) };
  const invite = c.inviteUrl ? { label: 'Inviter une amie', url: c.inviteUrl } : undefined;
  const mot = motDe(ev);
  switch (step) {
    case 'confirm':
      return {
        subject: `${SIGNATURE} : votre place est réservée`,
        preheader: 'Trois matins en direct, à 9 h, heure du Québec. Le lien viendra à vous.',
        paragraphs: [
          c.salut,
          `Votre place est réservée pour les trois matins en direct avec Krystine St-Laurent, à ${c.heure}, heure du Québec : ${enumererSerie(c.serie)}.`,
          'Chaque matin dure de 75 à 90 minutes : l\'accueil, l\'enseignement, une expérience à vivre ensemble, vos questions, puis une méditation d\'environ quinze minutes.',
          `La veille de chaque dimanche, nous vous enverrons le lien du direct, puis un rappel une heure avant. Si vous ne pouvez pas être là, la rediffusion restera disponible jusqu'au ${JUSQUA}.`,
        ],
        cta: c.agenda,
        invite,
        closing: 'Au plaisir de vous retrouver dimanche!',
      };
    case 'd3':
      // Ne part pas d'elle-même pour la série (live.ts); gardé pour un envoi manuel depuis l'admin.
      return {
        subject: `${SIGNATURE} : dans trois jours, ${mot}`,
        preheader: `${c.jour} à ${c.heure}, heure du Québec. Le lien est prêt.`,
        paragraphs: [
          c.salut,
          `Dans trois jours, ${c.jour} à ${c.heure}, heure du Québec, nous nous retrouvons en direct pour ${mot}.`,
          'Le lien est déjà prêt. Gardez-le près de vous, et si le rendez-vous manque encore à votre agenda, voici de quoi l\'y inscrire.',
        ],
        cta: c.direct,
        cta2: c.agenda,
        invite,
        closing: 'À très bientôt!',
      };
    case 'veille':
      return {
        subject: `${SIGNATURE} : c'est demain, à ${c.heure}`,
        preheader: `Le direct ${mot}, demain matin. Voici le lien.`,
        paragraphs: [
          c.salut,
          `C'est demain! ${c.jour.charAt(0).toUpperCase() + c.jour.slice(1)}, à ${c.heure}, heure du Québec, nous ouvrons le direct pour ${mot}.`,
          'Voici le lien, à garder sous la main pour demain matin. Prévoyez de quoi noter.',
        ],
        cta: c.direct,
        invite,
        closing: 'À demain!',
      };
    case 'h1':
      return {
        subject: `${SIGNATURE} : nous commençons dans une heure`,
        preheader: `Le direct s'ouvre à ${c.heure}. Installez-vous.`,
        paragraphs: [
          c.salut,
          `Dans une heure, à ${c.heure}, nous ouvrons le direct. Prenez le temps de vous installer, une boisson chaude à portée de main, et venez nous rejoindre.`,
        ],
        cta: { label: 'Rejoindre le direct', url: c.direct.url },
        closing: 'À tout de suite!',
      };
    case 'replay':
      return {
        subject: `${SIGNATURE} : la rediffusion de ${mot} est en ligne`,
        preheader: `Disponible jusqu'au ${JUSQUA}, au rythme qui est le vôtre.`,
        paragraphs: [
          c.salut,
          `Vous n'avez pas pu être des nôtres ${c.jour}? La rediffusion est maintenant en ligne, et elle le restera jusqu'au ${JUSQUA}. Elle vous attend à votre rythme, pour l'écouter en entier ou pour revenir sur un passage qui vous a parlé.`,
        ],
        cta: { label: 'Regarder la rediffusion', url: ev.replayUrl || c.direct.url },
        invite,
        closing: 'Au plaisir de vous retrouver!',
      };
  }
}
