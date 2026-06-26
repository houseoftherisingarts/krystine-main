import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import { getEvents, type EventDoc } from '../firebase/firestore';
import EditableText from '../components/edit/EditableText';

const EvenementsPage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].evenements;

  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = events.filter(e => new Date(e.date) >= new Date());
  const past = events.filter(e => new Date(e.date) < new Date());

  return (
    <div className="min-h-screen dark:bg-[#16100a] text-[#2a2015] dark:text-white pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-6 md:px-12">

        {/* Hero */}
        <div className="text-center mb-20">
          <span className="text-[#7d6330] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            <EditableText
              fieldKey="evenements.hero.kicker"
              defaultValue={lang === 'FR' ? 'Calendrier' : 'Calendar'}
            />
          </span>
          <h1 className="text-5xl md:text-7xl font-serif mb-6">
            <EditableText fieldKey="evenements.hero.title" defaultValue={t.title} />
          </h1>
          <p className="text-xl text-[#2a2015]/60 dark:text-white/60 font-serif italic max-w-xl mx-auto">
            <EditableText fieldKey="evenements.hero.subtitle" defaultValue={t.subtitle} multiline />
          </p>
          <div className="w-24 h-1 bg-[#bb9a5e] mx-auto mt-10" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-t-transparent border-[#bb9a5e] rounded-full animate-spin" />
          </div>
        ) : upcoming.length === 0 && past.length === 0 ? (
          /* ── Empty state ── */
          <div className="text-center py-24">
            <div className="w-32 h-32 rounded-full bg-[#bb9a5e]/10 flex items-center justify-center mx-auto mb-8">
              <i className="fa-regular fa-calendar text-5xl text-[#7d6330]" />
            </div>
            <p className="text-lg font-serif text-[#2a2015]/60 dark:text-white/60 italic">{t.noEvents}</p>

            {/* Promo for Origine programme */}
            <div className="mt-16 max-w-2xl mx-auto bg-gradient-to-br from-[#2a2015] to-[#4A3228] rounded-[30px] p-10 text-white border border-[#bb9a5e]/20">
              <span className="text-[#7d6330] uppercase tracking-widest text-xs font-bold block mb-4">
                {lang === 'FR' ? 'Programme en cours' : 'Current program'}
              </span>
              <h2 className="text-3xl font-serif mb-4">
                {lang === 'FR' ? "L'Expérience Origine" : 'The Origin Experience'}
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                {lang === 'FR'
                  ? '12 semaines pour retrouver votre boussole intérieure. Programme complet avec Krystine St-Laurent.'
                  : '12 weeks to rediscover your inner compass. Complete program with Krystine St-Laurent.'}
              </p>
              <a href="/origine" className="inline-flex items-center gap-3 bg-[#bb9a5e] text-[#2a2015] px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:scale-105 transition-transform">
                {lang === 'FR' ? "Découvrir l'Expérience" : 'Discover the Experience'}
                <i className="fa-solid fa-arrow-right" />
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* ── Upcoming Events ── */}
            {upcoming.length > 0 && (
              <section className="mb-20">
                <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-[#7d6330] mb-10 flex items-center gap-3">
                  <span className="w-8 h-px bg-[#bb9a5e]" /> {t.upcoming}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {upcoming.map(event => (
                    <EventCard key={event.id} event={event} lang={lang} t={t} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Past Events ── */}
            {past.length > 0 && (
              <section className="opacity-60">
                <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-[#2a2015]/40 dark:text-white/40 mb-10 flex items-center gap-3">
                  <span className="w-8 h-px bg-current" /> {t.past}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {past.map(event => (
                    <EventCard key={event.id} event={event} lang={lang} t={t} compact />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface EventCardProps {
  event: EventDoc;
  lang: string;
  t: any;
  compact?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, lang, t, compact }) => {
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', {
    weekday: compact ? undefined : 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={`group relative bg-white dark:bg-[#2a2015]/60 rounded-[24px] shadow-lg border border-[#2a2015]/5 dark:border-white/5 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 ${compact ? 'p-6' : 'p-8'}`}>
      {/* Image */}
      {event.imageUrl && !compact && (
        <div className="absolute inset-0 opacity-5 bg-cover bg-center" style={{ backgroundImage: `url(${event.imageUrl})` }} />
      )}

      {/* Badge */}
      <span className={`inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold mb-4 px-3 py-1 rounded-full ${event.isFeatured ? 'bg-[#bb9a5e]/15 text-[#7d6330]' : 'bg-[#2a2015]/5 dark:bg-white/5 text-[#2a2015]/60 dark:text-white/60'}`}>
        <i className={`fa-solid ${event.location?.toLowerCase().includes('ligne') || event.location?.toLowerCase().includes('online') ? 'fa-video' : 'fa-map-marker-alt'} text-[10px]`} />
        {event.location?.toLowerCase().includes('ligne') || event.location?.toLowerCase().includes('online') ? t.online : t.inPerson}
      </span>

      <p className="text-xs text-[#7d6330] font-bold uppercase tracking-widest mb-2">{dateStr}</p>
      <h3 className={`font-serif text-[#2a2015] dark:text-white mb-2 group-hover:text-[#7d6330] transition-colors ${compact ? 'text-xl' : 'text-2xl md:text-3xl'}`}>
        {event.title}
      </h3>
      {event.subtitle && <p className="text-[#2a2015]/60 dark:text-white/60 font-serif italic mb-3">{event.subtitle}</p>}
      {event.location && (
        <p className="text-sm text-[#2a2015]/50 dark:text-white/50 flex items-center gap-2 mb-4">
          <i className="fa-solid fa-map-marker-alt text-[#7d6330]" /> {event.location}
        </p>
      )}
      {event.description && !compact && (
        <p className="text-[#2a2015]/70 dark:text-white/70 leading-relaxed mb-6 text-sm">{event.description}</p>
      )}
      {event.registrationLink && (
        <a
          href={event.registrationLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] font-bold uppercase tracking-widest text-xs hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors shadow-md ${compact ? 'px-4 py-2 rounded-full' : 'px-8 py-3 rounded-full'}`}
        >
          {t.register} <i className="fa-solid fa-arrow-right" />
        </a>
      )}
    </div>
  );
};

export default EvenementsPage;
