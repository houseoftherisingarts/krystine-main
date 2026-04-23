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
            <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
              {lang === 'FR' ? kickerFR : kickerEN}
            </span>
          )}
          <h2 className="text-3xl md:text-5xl font-serif leading-tight mb-4">
            {lang === 'FR' ? titleFR : titleEN}
          </h2>
          {(leadFR || leadEN) && (
            <p className="text-[#0B1A36]/60 dark:text-white/60 font-serif italic max-w-xl mx-auto">
              {lang === 'FR' ? leadFR : leadEN}
            </p>
          )}
          <div className="w-16 h-px bg-[#D4AF37]/70 mx-auto mt-6" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.map(ev => (
          <LiveEventCard
            key={ev.id}
            event={ev}
            onWaitlist={() => ev.waitlistTarget && setWaitlistTarget(ev.waitlistTarget)}
            onTourRequest={() => setTourOpen(true)}
          />
        ))}
      </div>

      <WaitlistModal target={waitlistTarget} onClose={() => setWaitlistTarget(null)} />
      <ConferenceTourModal open={tourOpen} onClose={() => setTourOpen(false)} />
    </section>
  );
};

// ─── Individual card ─────────────────────────────────────────────────────────

interface CardProps {
  event: LiveEvent;
  onWaitlist: () => void;
  onTourRequest: () => void;
}

export const LiveEventCard: React.FC<CardProps> = ({ event: ev, onWaitlist, onTourRequest }) => {
  const { lang } = useApp();
  const navigate = useNavigate();

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
      case 'ticketed':         return { fr: 'Billetterie ouverte', en: 'Tickets open', icon: 'fa-ticket',       tone: 'bg-[#D4AF37]/10 text-[#D4AF37]' };
      case 'retreat-waitlist': return { fr: 'Retraite · liste',  en: 'Retreat · list', icon: 'fa-leaf',         tone: 'bg-[#0B1A36]/5 dark:bg-white/5 text-[#0B1A36]/70 dark:text-white/70' };
      case 'launch-waitlist':  return { fr: 'Lancement · liste', en: 'Launch · list',  icon: 'fa-book-open',    tone: 'bg-[#BC4A3C]/10 text-[#BC4A3C]' };
      case 'tour-request':     return { fr: 'Tournée · demande', en: 'Tour · request', icon: 'fa-route',        tone: 'bg-[#8B6F47]/10 text-[#8B6F47]' };
      case 'announcement':     return { fr: 'Annonce',           en: 'Announcement',   icon: 'fa-bullhorn',     tone: 'bg-[#0B1A36]/5 dark:bg-white/5 text-[#0B1A36]/60 dark:text-white/60' };
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

  return (
    <div
      className={`group relative rounded-2xl border p-6 transition-all duration-500 hover:-translate-y-1 ${
        ev.featured
          ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5 hover:border-[#D4AF37] hover:shadow-[0_14px_40px_rgba(212,175,55,0.2)]'
          : 'border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/60 hover:border-[#D4AF37]/50 hover:shadow-lg'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#D4AF37]">{date}</span>
        <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${kindBadge.tone}`}>
          <i className={`fa-solid ${kindBadge.icon} text-[9px]`} />
          {lang === 'FR' ? kindBadge.fr : kindBadge.en}
        </span>
      </div>

      {countdown && (
        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/10 border border-[#D4AF37]/40 text-[11px] uppercase tracking-[0.25em] font-bold text-[#0B1A36] dark:text-white">
          <i className="fa-regular fa-clock text-[#D4AF37] text-[10px]" />
          {lang === 'FR' ? countdown.fr : countdown.en}
        </div>
      )}

      <h3 className="font-serif text-xl md:text-2xl text-[#0B1A36] dark:text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm font-serif italic text-[#0B1A36]/60 dark:text-white/60 mb-3">{subtitle}</p>
      )}
      {location && (
        <p className="text-xs text-[#0B1A36]/50 dark:text-white/50 flex items-center gap-2 mb-3">
          <i className="fa-solid fa-map-marker-alt text-[#D4AF37] text-[10px]" />
          {location}
        </p>
      )}
      {body && (
        <p className="text-sm text-[#0B1A36]/70 dark:text-white/70 leading-relaxed mb-4">{body}</p>
      )}

      {/* Primary CTA per kind + calendar export (when dated). */}
      <div className="flex flex-wrap items-center gap-2">
        {ev.kind === 'in-progress' && ev.internalHref && (
          <button
            type="button"
            onClick={() => goToRoute(navigate, ev.internalHref!)}
            className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
          >
            {lang === 'FR' ? 'Découvrir le programme' : 'View the program'}
            <i className="fa-solid fa-arrow-right text-[9px]" />
          </button>
        )}
        {ev.kind === 'ticketed' && ev.registerUrl && (
          <a
            href={ev.registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
          >
            {lang === 'FR' ? 'Billets' : 'Tickets'}
            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
          </a>
        )}
        {(ev.kind === 'retreat-waitlist' || ev.kind === 'launch-waitlist') && ev.waitlistTarget && (
          <button
            type="button"
            onClick={onWaitlist}
            className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
          >
            <i className="fa-regular fa-hourglass-half text-[10px]" />
            {lang === 'FR' ? "Liste d'attente" : 'Join waitlist'}
          </button>
        )}
        {ev.kind === 'tour-request' && (
          <button
            type="button"
            onClick={onTourRequest}
            className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
          >
            <i className="fa-solid fa-location-dot text-[10px]" />
            {lang === 'FR' ? 'Demander une tournée' : 'Request a tour stop'}
          </button>
        )}

        {/* Calendar export — only for events with a concrete date. Opens
            a small menu that offers an ICS download (Apple/Outlook/iCal)
            plus direct links to Google and Outlook web calendars. */}
        {ev.startDate && <AddToCalendarMenu event={ev} />}
      </div>
    </div>
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
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0B1A36]/15 dark:border-white/15 text-[#0B1A36]/80 dark:text-white/80 font-bold uppercase tracking-widest text-[11px] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <i className="fa-regular fa-calendar-plus text-[10px]" />
        {lang === 'FR' ? 'Calendrier' : 'Calendar'}
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} text-[9px]`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-20 mt-2 right-0 w-64 rounded-2xl bg-white dark:bg-[#0B1A36] border border-[#0B1A36]/10 dark:border-white/10 shadow-[0_14px_40px_rgba(11,26,54,0.18)] overflow-hidden"
        >
          <MenuItem onClick={() => handle('ics')}     icon="fa-apple" brand="fa-brands"
            label={lang === 'FR' ? 'Apple · iCal · Outlook' : 'Apple · iCal · Outlook'}
            sub={lang === 'FR' ? 'Télécharger .ics' : 'Download .ics'} />
          <MenuItem onClick={() => handle('google')}  icon="fa-google" brand="fa-brands"
            label="Google Calendar"
            sub={lang === 'FR' ? 'Ouvrir dans un nouvel onglet' : 'Open in new tab'} />
          <MenuItem onClick={() => handle('outlook')} icon="fa-microsoft" brand="fa-brands"
            label="Outlook"
            sub={lang === 'FR' ? 'Outlook.com' : 'Outlook.com'} />
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ onClick: () => void; icon: string; brand?: string; label: string; sub?: string }> = ({ onClick, icon, brand = 'fa-solid', label, sub }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F5F5F0] dark:hover:bg-white/5 transition-colors"
  >
    <i className={`${brand} ${icon} text-[#D4AF37] text-sm w-4 text-center`} />
    <div className="min-w-0">
      <p className="text-sm font-medium text-[#0B1A36] dark:text-white truncate">{label}</p>
      {sub && <p className="text-[11px] text-[#0B1A36]/50 dark:text-white/50 truncate">{sub}</p>}
    </div>
  </button>
);

export default LiveEventsSection;
