import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { type LiveEvent } from '../lib/liveEvents';
import { goToRoute } from '../lib/staticRoutes';
import WaitlistModal, { type WaitlistTarget } from './WaitlistModal';
import ConferenceTourModal from './ConferenceTourModal';
import {
  liveEventToCalendar, downloadIcs, googleCalendarUrl, outlookCalendarUrl,
} from '../lib/calendar';
import OrigineSprig from './OrigineSprig';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

// Title-matched apothecary glyph for every event. All events are mapped
// so the hash-picked botanical fallback never fires — the formations page
// (and anywhere else that renders LiveEventsSection) shows an icon that
// reflects the event's subject rather than a random plant.
type EventSprigVariant =
  | 'ticket' | 'compass' | 'origine' | 'book'
  | 'retreat' | 'route' | 'launch' | 'mic';

const SPRIG_BY_EVENT: Record<string, EventSprigVariant> = {
  'origine-cohorte-fondatrice':  'origine', // Expérience Origine — boussole ornée
  'expo-manger-sante-2026':      'ticket',  // Au-delà des tendances — conférences
  'retraite-ayurveda-mai-2026':  'compass', // L'Ayurveda comme boussole intérieure
  'parution-livre-3':            'book',    // Parution du troisième livre
  'lancement-anglicane':         'launch',  // Dévoilement de la trilogie · L'Anglicane
  'lancement-montreal':          'launch',  // Dévoilement de la trilogie · Montréal
  'tournee-conferences':         'route',   // Tournée de conférences
  'retraite-val-morin-nov-2026': 'retreat', // Retraite Val-Morin (novembre 2026)
  'retraite-fev-2027':           'retreat', // Retraite février 2027
  'retraite-mai-2027':           'retreat', // Retraite mai 2027
  'tedx':                        'mic',     // TEDx
};

// Shared rendering for the "Événements & Conférences" section. Used by
// KrystinePage (full list), FormationsPage (full list below the podcast
// band) and InspiratHome (closest 3). Mounts its own WaitlistModal +
// ConferenceTourModal so the caller just drops it on the page.

interface SectionProps {
  events: LiveEvent[];
  kickerFR?: string; kickerEN?: string;
  titleFR?:  string; titleEN?:  string;
  leadFR?:   string; leadEN?:   string;
  /** Wrapper class — caller controls top margin / border above. */
  className?: string;
}

const LiveEventsSection: React.FC<SectionProps> = ({
  events, kickerFR, kickerEN, titleFR, titleEN, leadFR, leadEN, className = '',
}) => {
  const { lang } = useApp();
  const [waitlistTarget, setWaitlistTarget] = useState<WaitlistTarget | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  if (events.length === 0) return null;

  return (
    <section id="events" className={`scroll-mt-32 ${className}`}>
      {(titleFR || titleEN) && (
        <div className="text-center mb-12">
          {(kickerFR || kickerEN) && (
            <span className="text-[#7d6330] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
              {lang === 'FR' ? kickerFR : kickerEN}
            </span>
          )}
          <h2 className="text-3xl md:text-5xl font-serif leading-tight mb-4">
            {lang === 'FR' ? titleFR : titleEN}
          </h2>
          {(leadFR || leadEN) && (
            <p className="text-[#2a2015]/60 dark:text-white/60 font-serif italic max-w-xl mx-auto">
              {lang === 'FR' ? leadFR : leadEN}
            </p>
          )}
          <div className="w-16 h-px bg-[#bb9a5e]/70 mx-auto mt-6" />
        </div>
      )}

      {/* Agenda éditorial : lignes pleine largeur, gros chiffre de date,
          filets fins, aucune carte ni icône générique. Le câblage (waitlist,
          tournée, billets, calendrier) est préservé, juste re-présenté. */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.12 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="mx-auto max-w-[1040px]"
      >
        {events.map((ev) => (
          <LiveEventRow
            key={ev.id}
            event={ev}
            onWaitlist={() => ev.waitlistTarget && setWaitlistTarget(ev.waitlistTarget)}
            onTourRequest={() => setTourOpen(true)}
          />
        ))}
      </motion.div>

      <WaitlistModal target={waitlistTarget} onClose={() => setWaitlistTarget(null)} />
      <ConferenceTourModal open={tourOpen} onClose={() => setTourOpen(false)} />
    </section>
  );
};

// ─── Ligne d'agenda éditoriale (présentation premium, sans carte) ────────────

const actionLink =
  'group/cta inline-flex items-center gap-1.5 font-sans text-[0.64rem] uppercase tracking-[0.2em] text-ink border-b border-brass/40 pb-1 transition-colors hover:text-brassInk hover:border-brassInk';

const LiveEventRow: React.FC<{ event: LiveEvent; onWaitlist: () => void; onTourRequest: () => void }> = ({
  event: ev, onWaitlist, onTourRequest,
}) => {
  const { lang } = useApp();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const title    = lang === 'FR' ? ev.titleFR    : ev.titleEN;
  const subtitle = lang === 'FR' ? ev.subtitleFR : ev.subtitleEN;
  const dateLabel= lang === 'FR' ? ev.dateFR     : ev.dateEN;
  const location = lang === 'FR' ? ev.locationFR : ev.locationEN;
  const body     = lang === 'FR' ? ev.bodyFR     : ev.bodyEN;

  // Gros chiffre de date à partir de startDate quand on l'a ; sinon on tombe
  // sur le libellé éditorial (dateFR) en serif italique.
  const d = ev.startDate ? new Date(ev.startDate) : null;
  const validD = d !== null && !Number.isNaN(d.getTime());
  const day = validD ? d!.getDate() : null;
  const monthYear = validD
    ? d!.toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { month: 'short', year: 'numeric' }).replace('.', '')
    : null;

  const kindLabel = (() => {
    switch (ev.kind) {
      case 'in-progress':      return lang === 'FR' ? 'En cours'             : 'In progress';
      case 'ticketed':         return lang === 'FR' ? 'Billetterie ouverte'  : 'Tickets open';
      case 'retreat-waitlist': return lang === 'FR' ? 'Retraite · liste'     : 'Retreat · list';
      case 'launch-waitlist':  return lang === 'FR' ? 'Lancement · liste'    : 'Launch · list';
      case 'tour-request':     return lang === 'FR' ? 'Tournée · sur demande': 'Tour · on request';
      case 'announcement':     return lang === 'FR' ? 'Annonce'              : 'Announcement';
    }
  })();

  const countdown = (() => {
    if (!ev.startDate) return null;
    const target = new Date(ev.startDate).getTime();
    if (Number.isNaN(target)) return null;
    const diff = target - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86_400_000);
    if (days > 14) return null;
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    if (lang === 'FR') return days < 1 ? `Dans ${hours} h ${minutes.toString().padStart(2, '0')}` : `Dans ${days} ${days === 1 ? 'jour' : 'jours'}`;
    return days < 1 ? `In ${hours}h ${minutes.toString().padStart(2, '0')}` : `In ${days} day${days === 1 ? '' : 's'}`;
  })();

  const rowVariants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <motion.article
      variants={rowVariants}
      className="group grid grid-cols-1 gap-4 border-t border-ink/12 py-9 first:border-t-0 md:grid-cols-[150px_1fr] md:gap-10 md:py-11"
    >
      {/* Rail de date */}
      <div className="flex items-baseline gap-3 md:flex-col md:items-start md:gap-1">
        {day !== null ? (
          <>
            <span className="font-serif leading-[0.8] tabular-nums text-ink text-[clamp(3rem,5vw,4.4rem)] transition-colors duration-500 group-hover:text-brassInk">
              {day}
            </span>
            <span className="font-sans text-[0.6rem] uppercase tracking-[0.22em] text-brassInk">{monthYear}</span>
          </>
        ) : (
          <span className="font-serif italic leading-tight text-inkSoft text-[1.4rem]">{dateLabel}</span>
        )}
      </div>

      {/* Contenu */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-sans text-[0.6rem] uppercase tracking-[0.24em] text-brassInk">{kindLabel}</span>
          {countdown && (
            <span className="font-sans text-[0.6rem] uppercase tracking-[0.24em] text-inkSoft/70">· {countdown}</span>
          )}
          {day !== null && dateLabel && (
            <span className="font-serif italic text-[0.95rem] text-inkSoft/80">{dateLabel}</span>
          )}
        </div>

        <h3 className="font-serif leading-[1.1] text-ink text-[clamp(1.5rem,2.6vw,2.2rem)] transition-colors duration-500 group-hover:text-brassInk">
          {title}
        </h3>
        {subtitle && <p className="mt-1.5 font-serif italic text-[1.05rem] text-inkSoft">{subtitle}</p>}
        {location && <p className="mt-3 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-inkSoft/70">{location}</p>}
        {body && <p className="mt-4 max-w-[60ch] font-sans text-[0.95rem] leading-[1.8] text-inkSoft">{body}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          {ev.kind === 'in-progress' && ev.internalHref && (
            <button type="button" onClick={() => goToRoute(navigate, ev.internalHref!)} className={actionLink}>
              {(lang === 'FR' ? ev.ctaLabelFR : ev.ctaLabelEN) ?? (lang === 'FR' ? 'Découvrir le programme' : 'View the program')}
              <ArrowRight size={14} className="transition-transform duration-300 group-hover/cta:translate-x-1" />
            </button>
          )}
          {ev.kind === 'ticketed' && ev.registerUrl && (
            <a href={ev.registerUrl} target="_blank" rel="noopener noreferrer" className={actionLink}>
              {(lang === 'FR' ? ev.ctaLabelFR : ev.ctaLabelEN) ?? (lang === 'FR' ? 'Billets' : 'Tickets')}
              <ArrowUpRight size={14} className="transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </a>
          )}
          {(ev.kind === 'retreat-waitlist' || ev.kind === 'launch-waitlist') && ev.waitlistTarget && (
            <button type="button" onClick={onWaitlist} className={actionLink}>
              {(lang === 'FR' ? ev.ctaLabelFR : ev.ctaLabelEN) ?? (lang === 'FR' ? "Liste d'attente" : 'Join waitlist')}
              <ArrowRight size={14} className="transition-transform duration-300 group-hover/cta:translate-x-1" />
            </button>
          )}
          {(ev.kind === 'tour-request' || ev.triggersTourRequest) && (
            <button type="button" onClick={onTourRequest} className={actionLink}>
              {(lang === 'FR' ? ev.ctaLabelFR : ev.ctaLabelEN) ?? (lang === 'FR' ? 'Demander une tournée' : 'Request a tour stop')}
              <ArrowRight size={14} className="transition-transform duration-300 group-hover/cta:translate-x-1" />
            </button>
          )}
          {ev.startDate && <AddToCalendarMenu event={ev} />}
        </div>
      </div>
    </motion.article>
  );
};

// ─── Individual card ─────────────────────────────────────────────────────────

interface CardProps {
  event: LiveEvent;
  onWaitlist: () => void;
  onTourRequest: () => void;
  /** Parchment tone — 'light' is the default ivoire, 'dark' is a deeper
   *  beige. Used to build a checkerboard rhythm on the home page. */
  tone?: 'light' | 'dark';
  /** Index-in-row used to stagger the reveal. */
  stagger?: number;
}

export const LiveEventCard: React.FC<CardProps> = ({ event: ev, onWaitlist, onTourRequest, tone = 'light', stagger = 0 }) => {
  const { lang } = useApp();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  // Ticks every minute while mounted so the countdown stays fresh. Also
  // drops events whose startDate has passed without requiring a reload.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const title    = lang === 'FR' ? ev.titleFR    : ev.titleEN;
  const subtitle = lang === 'FR' ? ev.subtitleFR : ev.subtitleEN;
  const date     = lang === 'FR' ? ev.dateFR     : ev.dateEN;
  const location = lang === 'FR' ? ev.locationFR : ev.locationEN;
  const body     = lang === 'FR' ? ev.bodyFR     : ev.bodyEN;

  const kindBadge = (() => {
    switch (ev.kind) {
      case 'in-progress':      return { fr: 'En cours',          en: 'In progress',    icon: 'fa-circle-play', tone: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' };
      case 'ticketed':         return { fr: 'Billetterie ouverte', en: 'Tickets open', icon: 'fa-ticket',       tone: 'bg-[#bb9a5e]/10 text-[#7d6330]' };
      case 'retreat-waitlist': return { fr: 'Retraite · liste',  en: 'Retreat · list', icon: 'fa-leaf',         tone: 'bg-[#2a2015]/5 dark:bg-white/5 text-[#2a2015]/70 dark:text-white/70' };
      case 'launch-waitlist':  return { fr: 'Lancement · liste', en: 'Launch · list',  icon: 'fa-book-open',    tone: 'bg-[#BC4A3C]/10 text-[#BC4A3C]' };
      case 'tour-request':     return { fr: 'Tournée · demande', en: 'Tour · request', icon: 'fa-route',        tone: 'bg-[#5a4a37]/10 text-[#5a4a37]' };
      case 'announcement':     return { fr: 'Annonce',           en: 'Announcement',   icon: 'fa-bullhorn',     tone: 'bg-[#2a2015]/5 dark:bg-white/5 text-[#2a2015]/60 dark:text-white/60' };
    }
  })();

  // Countdown chip — shown when the event starts within 14 days.
  const countdown = (() => {
    if (!ev.startDate) return null;
    const target = new Date(ev.startDate).getTime();
    if (Number.isNaN(target)) return null;
    const diff = target - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86_400_000);
    if (days > 14) return null;
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    // Under 24h → hours + minutes. Otherwise days + hours.
    const textFR = days < 1
      ? `Dans ${hours} h ${minutes.toString().padStart(2, '0')}`
      : `Dans ${days} ${days === 1 ? 'jour' : 'jours'}${hours > 0 ? ` · ${hours} h` : ''}`;
    const textEN = days < 1
      ? `In ${hours}h ${minutes.toString().padStart(2, '0')}`
      : `In ${days} day${days === 1 ? '' : 's'}${hours > 0 ? ` · ${hours}h` : ''}`;
    return { fr: textFR, en: textEN };
  })();

  // Parchment card palette — light is ivoire, dark is a warmer beige
  // with a deeper fibre tone. Both wear a double-border (copper + paper)
  // + a subtle top highlight so they read as hand-laid paper cards.
  const bgLight = '#f6f3ee';
  const bgDark  = '#ECD6BE';
  const isDark  = tone === 'dark';
  const paperBg = isDark ? bgDark : bgLight;

  // Motion design per ui-ux-pro-max:
  //   · spring entrance (stiffness 160, damping 20) — natural settle
  //   · stagger 60 ms per card — below the 50 ms floor triggers rushing
  //   · whileHover lifts y -5 + scale 1.015 — scale-feedback rule
  //   · whileTap drops to scale 0.985 — tap-feedback under 100 ms
  //   · parent propagates hover state to children via variants so
  //     sprig + date-block react together — motion-meaning rule
  //   · countdown chip pulses on its own loop when visible
  //   · reduced-motion collapses every transform to opacity
  const restShadow = isDark
    ? '0 10px 24px rgba(107,74,47,0.14), inset 0 1px 0 rgba(244,231,221,0.55)'
    : '0 8px 20px rgba(107,74,47,0.10), inset 0 1px 0 rgba(255,255,255,0.45)';
  const hoverShadow = isDark
    ? '0 22px 50px rgba(107,74,47,0.22), inset 0 1px 0 rgba(244,231,221,0.6)'
    : '0 20px 44px rgba(107,74,47,0.18), inset 0 1px 0 rgba(255,255,255,0.5)';
  const restBorder = isDark ? 'rgba(139,103,74,0.32)' : 'rgba(187, 154, 94,0.20)';
  const hoverBorder = isDark ? 'rgba(139,103,74,0.55)' : 'rgba(187, 154, 94,0.5)';

  const cardVariants = {
    rest:  {
      opacity: 0, y: reduceMotion ? 0 : 40, rotate: reduceMotion ? 0 : -1.2, scale: reduceMotion ? 1 : 0.97,
      boxShadow: restShadow, borderColor: restBorder,
    },
    show:  {
      opacity: 1, y: 0, rotate: 0, scale: 1,
      boxShadow: restShadow, borderColor: restBorder,
      transition: reduceMotion
        ? { duration: 0.2 }
        : {
            type: 'spring' as const,
            stiffness: 160, damping: 20, mass: 0.9,
            delay: stagger * 0.06,
            opacity: { duration: 0.5, delay: stagger * 0.06, ease: [0.2, 0.8, 0.2, 1] as const },
          },
    },
    hover: reduceMotion ? {} : {
      y: -5, scale: 1.015,
      boxShadow: hoverShadow, borderColor: hoverBorder,
      transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
    },
    tap: reduceMotion ? {} : {
      scale: 0.985,
      transition: { duration: 0.1, ease: [0.2, 0.8, 0.2, 1] as const },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="rest"
      whileInView="show"
      whileHover="hover"
      whileTap="tap"
      viewport={{ once: true, amount: 0.2 }}
      className="group relative rounded-2xl p-5 md:p-6 border border-solid will-change-transform"
      style={{
        background: paperBg,
        borderColor: restBorder,
      }}
    >
      {/* Layout: pressed-herbarium sprig (or apothecary glyph) on the left
          + event metadata on the right. Four events get a subject-specific
          glyph instead of a botanical: tickets → expo, compass → retreat,
          Origine compass → cohorte, book → livre. Others rotate through
          the six herbarium studies via hash-pick. */}
      <div className="flex items-stretch gap-4 md:gap-6">
        {/* Sprig reacts to the parent's hover state — gentle scale +
            counter-rotation, so the sprig "blooms" when the card is
            touched. Uses variants with matching keys so framer
            propagates rest/hover down. */}
        <motion.div
          variants={{
            rest:  { scale: 1, rotate: 0 },
            show:  { scale: 1, rotate: 0 },
            hover: reduceMotion ? {} : { scale: 1.08, rotate: -3 },
            tap:   {},
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="self-center origin-center"
          style={{ willChange: 'transform' }}
        >
          <OrigineSprig
            seed={ev.id}
            variant={SPRIG_BY_EVENT[ev.id]}
            className="self-center"
          />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            {/* Date — lifts + shifts copper→brun on card hover */}
            <motion.span
              variants={{
                rest:  { y: 0, color: '#7d6330' },
                show:  { y: 0, color: '#7d6330' },
                hover: reduceMotion ? {} : { y: -2, color: '#5a4a37' },
                tap:   {},
              }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="text-[10px] uppercase tracking-[0.3em] font-bold"
            >
              {date}
            </motion.span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${kindBadge.tone}`}>
              <i className={`fa-solid ${kindBadge.icon} text-[9px]`} />
              {lang === 'FR' ? kindBadge.fr : kindBadge.en}
            </span>
          </div>

          {countdown && (
            <motion.div
              // Gentle pulse on the countdown — reinforces urgency
              // without being loud. Pauses on hover so users can read
              // the chip calmly once they engage with the card.
              animate={reduceMotion ? undefined : { scale: [1, 1.025, 1], opacity: [0.92, 1, 0.92] }}
              transition={reduceMotion ? undefined : { duration: 2.8, ease: 'easeInOut', repeat: Infinity }}
              whileHover={{ scale: 1, opacity: 1 }}
              className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#bb9a5e]/20 to-[#bb9a5e]/10 border border-[#bb9a5e]/40 text-[11px] uppercase tracking-[0.25em] font-bold text-[#2a2015] dark:text-white"
              style={{ transformOrigin: 'left center' }}
            >
              <i className="fa-regular fa-clock text-[#7d6330] text-[10px]" />
              {lang === 'FR' ? countdown.fr : countdown.en}
            </motion.div>
          )}

          <motion.h3
            variants={{
              rest:  { letterSpacing: '0em', color: '#2a2015' },
              show:  { letterSpacing: '0em', color: '#2a2015' },
              hover: reduceMotion ? {} : { letterSpacing: '0.012em', color: '#7d6330' },
              tap:   {},
            }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-serif text-xl md:text-2xl dark:text-white mb-1"
          >
            {title}
          </motion.h3>
          {subtitle && (
            <p className="text-sm font-serif italic text-[#2a2015]/60 dark:text-white/60 mb-3">{subtitle}</p>
          )}
          {location && (
            <p className="text-xs text-[#2a2015]/55 dark:text-white/50 flex items-center gap-2 mb-3">
              <i className="fa-solid fa-map-marker-alt text-[#7d6330] text-[10px]" />
              {location}
            </p>
          )}
          {body && (
            <p className="text-sm text-[#2a2015]/70 dark:text-white/70 leading-relaxed mb-4">{body}</p>
          )}

          {/* Primary CTA per kind + calendar export (when dated). Per-event
              `ctaLabelFR/EN` overrides the kind's default text. The
              `triggersTourRequest` flag opens the tour modal regardless of
              kind, so an 'announcement' card (e.g. Parution) can also be a
              tour signup. */}
          <div className="flex flex-wrap items-center gap-2">
        {ev.kind === 'in-progress' && ev.internalHref && (
          <button
            type="button"
            onClick={() => goToRoute(navigate, ev.internalHref!)}
            className="inline-flex items-center gap-2 bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
          >
            {(lang === 'FR' ? ev.ctaLabelFR : ev.ctaLabelEN) ?? (lang === 'FR' ? 'Découvrir le programme' : 'View the program')}
            <i className="fa-solid fa-arrow-right text-[9px]" />
          </button>
        )}
        {ev.kind === 'ticketed' && ev.registerUrl && (
          <a
            href={ev.registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
          >
            {(lang === 'FR' ? ev.ctaLabelFR : ev.ctaLabelEN) ?? (lang === 'FR' ? 'Billets' : 'Tickets')}
            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
          </a>
        )}
        {(ev.kind === 'retreat-waitlist' || ev.kind === 'launch-waitlist') && ev.waitlistTarget && (
          <button
            type="button"
            onClick={onWaitlist}
            className="inline-flex items-center gap-2 bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
          >
            <i className="fa-regular fa-hourglass-half text-[10px]" />
            {(lang === 'FR' ? ev.ctaLabelFR : ev.ctaLabelEN) ?? (lang === 'FR' ? "Liste d'attente" : 'Join waitlist')}
          </button>
        )}
        {/* Tour-request: trigger on either kind 'tour-request' OR any card
            with `triggersTourRequest: true` (e.g. the parution which doubles
            as a tour signup). */}
        {(ev.kind === 'tour-request' || ev.triggersTourRequest) && (
          <button
            type="button"
            onClick={onTourRequest}
            className="inline-flex items-center gap-2 bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
          >
            <i className="fa-solid fa-location-dot text-[10px]" />
            {(lang === 'FR' ? ev.ctaLabelFR : ev.ctaLabelEN) ?? (lang === 'FR' ? 'Demander une tournée' : 'Request a tour stop')}
          </button>
        )}

            {/* Calendar export — only for events with a concrete date. Opens
                a small menu that offers an ICS download (Apple/Outlook/iCal)
                plus direct links to Google and Outlook web calendars. */}
            {ev.startDate && <AddToCalendarMenu event={ev} />}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Calendar dropdown ───────────────────────────────────────────────────────
// Secondary affordance on every dated event card. Keeps the card compact by
// hiding the three destinations behind one button; closes on outside click
// and Escape for polite behavior on mobile + keyboard users.
const AddToCalendarMenu: React.FC<{ event: LiveEvent }> = ({ event }) => {
  const { lang } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const cal = liveEventToCalendar(event, lang);
  if (!cal) return null;

  const handle = (kind: 'ics' | 'google' | 'outlook') => {
    setOpen(false);
    if (kind === 'ics') downloadIcs(cal);
    if (kind === 'google')  window.open(googleCalendarUrl(cal), '_blank', 'noopener,noreferrer');
    if (kind === 'outlook') window.open(outlookCalendarUrl(cal), '_blank', 'noopener,noreferrer');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 font-sans text-[0.64rem] uppercase tracking-[0.2em] text-inkSoft border-b border-transparent pb-1 transition-colors hover:text-brassInk hover:border-brassInk/50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {lang === 'FR' ? 'Ajouter au calendrier' : 'Add to calendar'}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-20 mt-3 right-0 w-64 rounded-xl bg-card border border-cream3 shadow-[0_14px_40px_rgba(58,37,30,0.16)] overflow-hidden"
        >
          <MenuItem onClick={() => handle('ics')}
            label="Apple · iCal · Outlook"
            sub={lang === 'FR' ? 'Télécharger .ics' : 'Download .ics'} />
          <MenuItem onClick={() => handle('google')}
            label="Google Calendar"
            sub={lang === 'FR' ? 'Nouvel onglet' : 'New tab'} />
          <MenuItem onClick={() => handle('outlook')}
            label="Outlook"
            sub="Outlook.com" />
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ onClick: () => void; label: string; sub?: string }> = ({ onClick, label, sub }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className="w-full px-4 py-3 text-left transition-colors hover:bg-cream2"
  >
    <p className="font-sans text-sm font-medium text-ink truncate">{label}</p>
    {sub && <p className="font-sans text-[11px] text-inkSoft/70 truncate">{sub}</p>}
  </button>
);

export default LiveEventsSection;
