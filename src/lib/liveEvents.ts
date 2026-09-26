// Curated "Où on se rejoint · LIVE" events.
// ─────────────────────────────────────────────────────────────────────────────
// Hand-maintained from the document Krystine provided (Section Événements —
// Où on se rejoint LIVE). When an event has confirmed ticketing, we expose
// a direct `registerUrl`. Everything else routes through a waitlist modal
// with a distinct `waitlistId` so each interest list is a separate,
// filterable bucket in the admin CRM.

import type { WaitlistTarget } from '../components/WaitlistModal';

export type LiveEventKind =
  | 'in-progress'       // currently running (Expérience Origine cohort)
  | 'ticketed'          // existing external ticket link
  | 'retreat-waitlist'  // 4-day retreats — waitlist modal
  | 'launch-waitlist'   // book launches — waitlist modal
  | 'tour-request'      // triggers the conference-tour form modal
  | 'announcement';     // informational, no action (book release, TEDx)

export interface LiveEvent {
  id: string;
  kind: LiveEventKind;
  titleFR: string;
  titleEN: string;
  subtitleFR?: string;
  subtitleEN?: string;
  dateFR: string;
  dateEN: string;
  /**
   * ISO date of the event (or the cohort end for in-progress items). Used
   * for sorting, upcoming-only filtering, and countdown chips when the
   * event is within 2 weeks. Absent → the event is open-ended (e.g. TEDx,
   * tour request) and sorts last.
   */
  startDate?: string;
  /**
   * Optional ISO end date. Populated only for multi-day events
   * (retreats, cohort runs) so "Add to calendar" generates a proper
   * multi-day entry. When absent, the calendar helpers treat the event
   * as a 2-hour block starting at `startDate`.
   */
  endDate?: string;
  locationFR?: string;
  locationEN?: string;
  bodyFR?: string;
  bodyEN?: string;

  // One of these drives the primary CTA:
  registerUrl?: string;          // external ticket link
  internalHref?: string;         // e.g. /origine
  waitlistTarget?: WaitlistTarget;
  triggersTourRequest?: boolean; // opens the conference-tour modal — works on
                                 // any kind, not just 'tour-request', so an
                                 // 'announcement' card (e.g. parution) can
                                 // double as a tour signup.

  // Optional CTA label override. When set, replaces the kind's default
  // primary-CTA text (e.g. "Liste d'attente" → "Liste d'attente pour
  // réserver mon billet") without changing routing.
  ctaLabelFR?: string;
  ctaLabelEN?: string;
  /** Remplace l'étiquette du type (ex. « Conférences · 2027 » au lieu de « Tournée · sur demande »). */
  kickerFR?: string;
  kickerEN?: string;

  // Optional featured highlight (gold ring).
  featured?: boolean;
}

// ─── The actual lineup ───────────────────────────────────────────────────────

const waitlist = (id: string, labelFR: string, labelEN: string): WaitlistTarget =>
  ({ id, labelFR, labelEN });

export const LIVE_EVENTS: LiveEvent[] = [
  // ── In progress ──
  {
    id: 'origine-cohorte-fondatrice',
    kind: 'in-progress',
    titleFR: "Expérience Origine",
    titleEN: 'The Origin Experience',
    subtitleFR: 'Cohorte fondatrices',
    subtitleEN: 'Founding cohort',
    dateFR: '15 avril au 5 juillet 2026',
    dateEN: 'April 15 – July 5, 2026',
    // Sort by cohort end — it stays visible for the duration of the run.
    startDate: '2026-07-05',
    endDate: '2026-07-05',
    locationFR: 'Douze dimanches en direct sur Zoom · 9 h 30 (15 h 30 France et Belgique)',
    locationEN: 'Twelve Sundays live on Zoom · 9:30 a.m. (3:30 p.m. in France/Belgium)',
    bodyFR: "Un parcours de 12 semaines au cœur de l'Ayurveda. Inscription via le programme Expérience Origine.",
    bodyEN: 'A 12-week journey at the heart of Ayurveda. Registration via the Origin Experience program.',
    internalHref: '/origine',
    featured: true,
  },

  // ── À venir · ticketed ──
  {
    id: 'expo-manger-sante-2026',
    kind: 'ticketed',
    titleFR: "Au-delà des tendances : l'équilibre n'est pas one-size",
    titleEN: 'Beyond Trends: balance isn\'t one-size',
    subtitleFR: "Conférences · Expo Manger Santé et Vivre Vert",
    subtitleEN: 'Talks · Expo Manger Santé et Vivre Vert',
    dateFR: 'Samedi 25 avril 2026 · 16 h 30  |  Dimanche 26 avril 2026 · 13 h 15',
    dateEN: 'Saturday April 25, 2026 · 4:30 p.m.  |  Sunday April 26, 2026 · 1:15 p.m.',
    startDate: '2026-04-25T16:30:00-04:00',
    locationFR: 'Scène Vivre, Québec',
    locationEN: 'Scène Vivre, Québec City',
    registerUrl: 'https://www.expomangersante.com/fr/quebec',
  },

  // ── Retraite mai 2026 (née du 3e livre) ──
  {
    id: 'retraite-ayurveda-mai-2026',
    kind: 'retreat-waitlist',
    titleFR: "L'Ayurveda comme boussole intérieure",
    titleEN: 'Ayurveda as Inner Compass',
    subtitleFR: 'Retraite quatre jours',
    subtitleEN: 'Four-day retreat',
    dateFR: '15 au 18 mai 2026',
    dateEN: 'May 15 – 18, 2026',
    startDate: '2026-05-15',
    endDate: '2026-05-18',
    bodyFR: "Née de l'écriture du troisième livre de la trilogie. Une cartographie personnelle simple, riche et profonde.",
    bodyEN: 'Born from the writing of the trilogy\'s third book. A personal map — simple, rich, deep.',
    waitlistTarget: waitlist('retraite-ayurveda-mai-2026',
      "Retraite · L'Ayurveda comme boussole intérieure",
      'Retreat · Ayurveda as Inner Compass'),
  },

  // ── Parution du 3e livre ──
  // Doubles as a "tour" signup: the parution kicks off a conference tour,
  // so the card opens the tour-request modal with a tour-specific CTA
  // label rather than a generic announcement.
  {
    id: 'parution-livre-3',
    kind: 'announcement',
    titleFR: 'Parution du troisième livre',
    titleEN: 'Third book release',
    subtitleFR: 'Aux Éditions de l\'Homme',
    subtitleEN: 'Éditions de l\'Homme',
    dateFR: '4 février 2027',
    dateEN: 'February 4, 2027',
    startDate: '2027-02-04',
    bodyFR: 'Troisième volet de la trilogie. Titre dévoilé à la parution. Une tournée de conférences suit la parution.',
    bodyEN: 'Third volume of the trilogy. Title revealed at release. A conference tour follows the launch.',
    triggersTourRequest: true,
    ctaLabelFR: 'Me tenir au courant de la tournée',
    ctaLabelEN: 'Keep me posted on the tour',
  },

  // ── Le lancement du troisième livre · L'Anglicane (Lévis) ──
  {
    id: 'lancement-anglicane',
    kind: 'launch-waitlist',
    titleFR: 'Le lancement du troisième livre',
    titleEN: 'The third book launch',
    subtitleFR: 'Une soirée de lancement et un atelier, à L\'Anglicane de Lévis',
    subtitleEN: 'A launch evening and a workshop, at L\'Anglicane in Lévis',
    dateFR: '14 mars 2027',
    dateEN: 'March 14, 2027',
    startDate: '2027-03-14',
    locationFR: 'L\'Anglicane, Lévis',
    locationEN: 'L\'Anglicane, Lévis',
    bodyFR: "Billets en préparation. Inscrivez-vous à la liste d'attente pour être averti·e dès leur mise en vente.",
    bodyEN: 'Tickets coming soon — join the waitlist to be notified as soon as they open.',
    waitlistTarget: waitlist('lancement-anglicane',
      'Lancement · L\'Anglicane (Lévis)',
      'Launch · L\'Anglicane (Lévis)'),
    ctaLabelFR: 'Liste d\'attente pour réserver mon billet',
    ctaLabelEN: 'Waitlist to reserve my ticket',
    featured: true,
  },

  // ── Krystine sur scène (Krystine, 26 septembre 2026) ──
  // Mène à la conférence et à ses portes de programmation plutôt qu'au
  // formulaire de tournée.
  {
    id: 'tournee-conferences',
    kind: 'tour-request',
    kickerFR: 'Conférences · 2027',
    kickerEN: 'Talks · 2027',
    titleFR: 'Krystine sur scène',
    titleEN: 'Krystine on stage',
    dateFR: '2027',
    dateEN: '2027',
    bodyFR: "De nouvelles dates de conférences et de rencontres seront annoncées au Québec, en Europe et ailleurs.\nVous programmez un événement, un congrès ou une rencontre\u00a0? Découvrez la conférence de Krystine et les différentes portes de programmation.",
    bodyEN: 'New dates for talks and gatherings will be announced in Quebec, in Europe and beyond.\nAre you programming an event, a conference or a gathering? Discover Krystine’s talk and its different programming angles.',
    internalHref: '/conferenciere#conferences',
    ctaLabelFR: 'Découvrir la conférence',
    ctaLabelEN: 'Discover the talk',
    featured: true,
  },

  // ── Retraites à venir (dates + thèmes à confirmer) ──
  {
    // La date de novembre 2026 est retirée (Krystine, 19 septembre 2026) : la
    // retraite n'est plus annoncée, seule la liste d'attente demeure. La source
    // d'inscription garde son identifiant d'origine, sans quoi les personnes
    // déjà inscrites se retrouveraient orphelines de leur étiquette.
    id: 'retraite-val-morin-nov-2026',
    kind: 'retreat-waitlist',
    titleFR: 'Retraite à venir',
    titleEN: 'Upcoming retreat',
    dateFR: 'Date à venir',
    dateEN: 'Date to come',
    bodyFR: 'Lieu, dates et thème à confirmer. Inscrivez-vous à la liste d\'attente pour être avisée avant toute annonce publique.',
    bodyEN: 'Place, dates and theme to be confirmed. Join the waitlist to hear before any public announcement.',
    waitlistTarget: waitlist('retraite-val-morin-nov-2026',
      'Retraite · liste d\'attente',
      'Retreat · waitlist'),
    ctaLabelFR: 'Liste d\'attente',
    ctaLabelEN: 'Join waitlist',
  },
  {
    id: 'retraite-fev-2027',
    kind: 'retreat-waitlist',
    titleFR: 'Retraite à venir',
    titleEN: 'Upcoming retreat',
    dateFR: 'Février 2027',
    dateEN: 'February 2027',
    startDate: '2027-02-15',
    bodyFR: 'Date et thème à confirmer.',
    bodyEN: 'Date and theme to be confirmed.',
    waitlistTarget: waitlist('retraite-fev-2027',
      'Retraite · Février 2027',
      'Retreat · February 2027'),
  },
  {
    id: 'retraite-mai-2027',
    kind: 'retreat-waitlist',
    titleFR: 'Retraite à venir',
    titleEN: 'Upcoming retreat',
    dateFR: 'Mai 2027',
    dateEN: 'May 2027',
    startDate: '2027-05-15',
    bodyFR: 'Date et thème à confirmer.',
    bodyEN: 'Date and theme to be confirmed.',
    waitlistTarget: waitlist('retraite-mai-2027',
      'Retraite · Mai 2027',
      'Retreat · May 2027'),
  },

  // ── TEDx ──
  {
    id: 'tedx',
    kind: 'announcement',
    titleFR: 'TEDx',
    titleEN: 'TEDx',
    subtitleFR: 'Fil en développement',
    subtitleEN: 'In development',
    dateFR: 'À venir',
    dateEN: 'Coming',
    bodyFR: 'Territoire intellectuel : « Nourrir et soigner, il était une fois le même geste. »',
    bodyEN: 'Intellectual ground: "To nourish and to heal — once upon a time, the same gesture."',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Upcoming events sorted by `startDate` ascending. Events whose startDate
 * is in the past are dropped. Open-ended events (no startDate — e.g. the
 * tour-request tile and the TEDx note) can be appended or excluded via
 * `opts.includeOpenEnded`. Pass `opts.hideTedx: true` to also strip the
 * TEDx event regardless of `includeOpenEnded` — used by the visibility
 * flag system so admins can toggle TEDx mentions without a redeploy.
 */
export function getUpcomingEvents(opts: { includeOpenEnded?: boolean; hideTedx?: boolean; now?: Date } = {}): LiveEvent[] {
  const { includeOpenEnded = true, hideTedx = false, now = new Date() } = opts;
  const allowed = LIVE_EVENTS.filter(ev => !hideTedx || ev.id !== 'tedx');
  const dated = allowed
    .filter(ev => !!ev.startDate)
    .map(ev => ({ ev, t: new Date(ev.startDate as string).getTime() }))
    .filter(({ t }) => !Number.isNaN(t) && t >= now.getTime())
    .sort((a, b) => a.t - b.t)
    .map(({ ev }) => ev);
  if (!includeOpenEnded) return dated;
  const openEnded = allowed.filter(ev => !ev.startDate);
  return [...dated, ...openEnded];
}

/** Days remaining until `isoDate`. Returns negative when past. */
export function daysUntil(isoDate?: string, now: Date = new Date()): number | null {
  if (!isoDate) return null;
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((t - now.getTime()) / 86_400_000);
}
