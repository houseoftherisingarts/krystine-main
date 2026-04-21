import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import { goToRoute } from '../lib/staticRoutes';
import { getEvents, type EventDoc } from '../firebase/firestore';

interface Programme {
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  href: string;
  image: string;
  featured?: boolean;
}

const FormationsPage: React.FC = () => {
  const { lang } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const ev = CONTENT[lang].evenements;

  const [events, setEvents] = useState<EventDoc[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, []);

  // Scroll to #evenements (or any other hash) when navigating from the
  // legacy /evenements route or from an on-site link.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [location.hash, eventsLoading]);

  const upcoming = events.filter(e => new Date(e.date) >= new Date());
  const past = events.filter(e => new Date(e.date) < new Date());

  const programmes: Programme[] = lang === 'FR'
    ? [
        {
          tag: 'Parcours signature',
          title: "L'Expérience Origine",
          subtitle: 'Retrouver votre boussole intérieure',
          description: "Un parcours de 12 semaines au cœur de l'Ayurveda. Chaque semaine, un enseignement, un rituel et une pratique pour rentrer chez soi.",
          duration: '12 semaines',
          href: '/origine',
          image: ASSETS.origineBanner,
          featured: true,
        },
        {
          tag: 'Programme ciblé',
          title: 'Programme Vata',
          subtitle: 'Enraciner · Réchauffer · Apaiser',
          description: "Un accompagnement pour les constitutions Vata et celles qui cherchent ancrage, chaleur et régularité.",
          duration: 'À votre rythme',
          href: '/vata',
          image: ASSETS.ayurvedaBg,
        },
        {
          tag: 'Écoute & transmission',
          title: 'Le Podcast Inspirata',
          subtitle: 'Au-delà des tendances',
          description: "Conversations ancrées sur la sagesse ayurvédique, les rituels de saisons et l'art de vivre conscient.",
          duration: 'Nouveaux épisodes',
          href: '/podcast',
          image: ASSETS.blogBg,
        },
        {
          tag: 'Rendez-vous mensuel',
          title: "Les Dimanches d'Origine",
          subtitle: 'Des moments pour se retrouver',
          description: "Retrouvailles dominicales pour approfondir une thématique, pratiquer ensemble et poser vos questions en direct.",
          duration: 'Chaque mois',
          href: '/dimanches-origine',
          image: ASSETS.founder,
        },
      ]
    : [
        {
          tag: 'Signature journey',
          title: 'The Origin Experience',
          subtitle: 'Rediscover your inner compass',
          description: 'A 12-week journey at the heart of Ayurveda. Each week, a teaching, a ritual, and a practice to come home to yourself.',
          duration: '12 weeks',
          href: '/origine',
          image: ASSETS.origineBanner,
          featured: true,
        },
        {
          tag: 'Focused program',
          title: 'Vata Program',
          subtitle: 'Ground · Warm · Soothe',
          description: 'Support for Vata constitutions and anyone seeking grounding, warmth, and regularity.',
          duration: 'At your own pace',
          href: '/vata',
          image: ASSETS.ayurvedaBg,
        },
        {
          tag: 'Listen & learn',
          title: 'The Inspirata Podcast',
          subtitle: 'Beyond trends',
          description: 'Grounded conversations on ayurvedic wisdom, seasonal rituals, and the art of conscious living.',
          duration: 'New episodes',
          href: '/podcast',
          image: ASSETS.blogBg,
        },
        {
          tag: 'Monthly gathering',
          title: 'Sundays of Origin',
          subtitle: 'Moments to reconnect',
          description: 'Sunday gatherings to explore a theme, practice together, and ask your questions live.',
          duration: 'Monthly',
          href: '/dimanches-origine',
          image: ASSETS.founder,
        },
      ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#050C1A] text-[#0B1A36] dark:text-white pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-6 md:px-12">

        {/* Hero */}
        <div className="text-center mb-20">
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            {lang === 'FR' ? 'Programmes & Accompagnements' : 'Programs & Guidance'}
          </span>
          <h1 className="text-5xl md:text-7xl font-serif mb-6">
            {lang === 'FR' ? 'Formations' : 'Programs'}
          </h1>
          <p className="text-xl text-[#0B1A36]/60 dark:text-white/60 font-serif italic max-w-2xl mx-auto">
            {lang === 'FR'
              ? "Des parcours pour intégrer l'Ayurveda dans votre quotidien — à votre rythme, à votre mesure."
              : 'Journeys to weave Ayurveda into your daily life — at your own pace, on your own terms.'}
          </p>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-10" />
        </div>

        {/* Featured programme */}
        {programmes.filter(p => p.featured).map(p => (
          <section
            key={p.href}
            onClick={() => goToRoute(navigate, p.href)}
            className="group relative cursor-pointer mb-16 rounded-[30px] overflow-hidden shadow-2xl border border-[#D4AF37]/20 hover:shadow-[0_0_40px_rgba(212,175,55,0.25)] transition-all"
          >
            <div className="relative h-[500px] bg-[#0B1A36]">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${p.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A36] via-[#0B1A36]/60 to-[#0B1A36]/20" />
              <div className="absolute bottom-0 left-0 right-0 p-10 md:p-16 text-white">
                <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">{p.tag}</span>
                <h2 className="text-4xl md:text-6xl font-serif mb-3">{p.title}</h2>
                <p className="text-xl md:text-2xl font-serif italic text-white/80 mb-6 max-w-2xl">{p.subtitle}</p>
                <p className="text-white/70 max-w-2xl mb-8 leading-relaxed">{p.description}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-3 bg-[#D4AF37] text-[#0B1A36] px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg group-hover:scale-105 transition-transform">
                    {lang === 'FR' ? 'Découvrir' : 'Discover'} <i className="fa-solid fa-arrow-right" />
                  </span>
                  <span className="text-xs uppercase tracking-[0.3em] text-white/50 font-bold">
                    <i className="fa-regular fa-clock mr-2" />{p.duration}
                  </span>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Other programmes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {programmes.filter(p => !p.featured).map(p => (
            <article
              key={p.href}
              onClick={() => goToRoute(navigate, p.href)}
              className="group cursor-pointer bg-white dark:bg-[#0B1A36]/60 rounded-[24px] shadow-lg border border-[#0B1A36]/5 dark:border-white/5 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden bg-[#0B1A36]">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${p.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A36]/80 via-[#0B1A36]/20 to-transparent" />
                <span className="absolute top-5 left-5 text-[#D4AF37] uppercase tracking-[0.25em] text-[10px] font-bold bg-[#0B1A36]/60 backdrop-blur px-3 py-1.5 rounded-full border border-[#D4AF37]/30">
                  {p.tag}
                </span>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-serif text-[#0B1A36] dark:text-white mb-2 group-hover:text-[#D4AF37] transition-colors">{p.title}</h3>
                <p className="text-sm font-serif italic text-[#D4AF37] mb-4">{p.subtitle}</p>
                <p className="text-[#0B1A36]/70 dark:text-white/70 text-sm leading-relaxed mb-6">{p.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-[#0B1A36]/10 dark:border-white/10">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-[#0B1A36]/40 dark:text-white/40 font-bold">
                    <i className="fa-regular fa-clock mr-2" />{p.duration}
                  </span>
                  <span className="text-[#D4AF37] text-lg group-hover:translate-x-1 transition-transform">
                    <i className="fa-solid fa-arrow-right" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Dosha CTA */}
        <div className="mt-20 text-center py-16 border-t border-[#0B1A36]/10 dark:border-white/10">
          <p className="text-[#0B1A36]/60 dark:text-white/60 mb-6 font-serif italic">
            {lang === 'FR' ? 'Vous hésitez sur le parcours adapté à votre constitution ?' : 'Unsure which journey fits your constitution?'}
          </p>
          <button
            onClick={() => navigate('/medias#quiz')}
            className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
          >
            {lang === 'FR' ? 'Faire le Quiz Dosha' : 'Take the Dosha Quiz'}
          </button>
        </div>

        {/* ── Événements ── Merged section (previously /evenements). */}
        <section id="evenements" className="mt-24 pt-16 border-t border-[#0B1A36]/10 dark:border-white/10 scroll-mt-32">
          <div className="text-center mb-16">
            <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
              {lang === 'FR' ? 'Calendrier' : 'Calendar'}
            </span>
            <h2 className="text-4xl md:text-6xl font-serif mb-6">{ev.title}</h2>
            <p className="text-lg text-[#0B1A36]/60 dark:text-white/60 font-serif italic max-w-xl mx-auto">{ev.subtitle}</p>
            <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-8" />
          </div>

          {eventsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-2 border-t-transparent border-[#D4AF37] rounded-full animate-spin" />
            </div>
          ) : upcoming.length === 0 && past.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-28 h-28 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-8">
                <i className="fa-regular fa-calendar text-4xl text-[#D4AF37]" />
              </div>
              <p className="text-lg font-serif text-[#0B1A36]/60 dark:text-white/60 italic">{ev.noEvents}</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className="mb-16">
                  <h3 className="text-sm uppercase tracking-[0.3em] font-bold text-[#D4AF37] mb-10 flex items-center gap-3">
                    <span className="w-8 h-px bg-[#D4AF37]" /> {ev.upcoming}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {upcoming.map(e => <EventCard key={e.id} event={e} lang={lang} t={ev} />)}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div className="opacity-60">
                  <h3 className="text-sm uppercase tracking-[0.3em] font-bold text-[#0B1A36]/40 dark:text-white/40 mb-10 flex items-center gap-3">
                    <span className="w-8 h-px bg-current" /> {ev.past}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {past.map(e => <EventCard key={e.id} event={e} lang={lang} t={ev} compact />)}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
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
  const online = event.location?.toLowerCase().includes('ligne') || event.location?.toLowerCase().includes('online');
  return (
    <div className={`group relative bg-white dark:bg-[#0B1A36]/60 rounded-[24px] shadow-lg border border-[#0B1A36]/5 dark:border-white/5 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 ${compact ? 'p-6' : 'p-8'}`}>
      {event.imageUrl && !compact && (
        <div className="absolute inset-0 opacity-5 bg-cover bg-center" style={{ backgroundImage: `url(${event.imageUrl})` }} />
      )}
      <span className={`inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold mb-4 px-3 py-1 rounded-full ${event.isFeatured ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-[#0B1A36]/5 dark:bg-white/5 text-[#0B1A36]/60 dark:text-white/60'}`}>
        <i className={`fa-solid ${online ? 'fa-video' : 'fa-map-marker-alt'} text-[10px]`} />
        {online ? t.online : t.inPerson}
      </span>
      <p className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest mb-2">{dateStr}</p>
      <h4 className={`font-serif text-[#0B1A36] dark:text-white mb-2 group-hover:text-[#D4AF37] transition-colors ${compact ? 'text-xl' : 'text-2xl md:text-3xl'}`}>{event.title}</h4>
      {event.subtitle && <p className="text-[#0B1A36]/60 dark:text-white/60 font-serif italic mb-3">{event.subtitle}</p>}
      {event.location && (
        <p className="text-sm text-[#0B1A36]/50 dark:text-white/50 flex items-center gap-2 mb-4">
          <i className="fa-solid fa-map-marker-alt text-[#D4AF37]" /> {event.location}
        </p>
      )}
      {event.description && !compact && (
        <p className="text-[#0B1A36]/70 dark:text-white/70 leading-relaxed mb-6 text-sm">{event.description}</p>
      )}
      {event.registrationLink && (
        <a href={event.registrationLink} target="_blank" rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] font-bold uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-md ${compact ? 'px-4 py-2 rounded-full' : 'px-8 py-3 rounded-full'}`}>
          {t.register} <i className="fa-solid fa-arrow-right" />
        </a>
      )}
    </div>
  );
};

export default FormationsPage;
