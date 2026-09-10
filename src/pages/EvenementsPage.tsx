import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { getEventsPublics, placesRestantes, enVente, type EventDoc } from '../firebase/firestore';
import { Feuille, Atmosphere, Seam } from '../components/motion/loeuvre';

/**
 * Page des événements, au canon L'Œuvre (espresso/crème/laiton) : hero court,
 * puis les événements à venir en feuilles empilées, puis les passés en
 * retrait. Un événement dont la billetterie est ouverte mène à sa propre
 * page de vente (/evenement/{slug}) fabriquée par EvenementVente.tsx à
 * partir du même document Firestore.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;
const GUT = 'px-[clamp(1.25rem,4vw,4.5rem)]';
const G12 = 'grid grid-cols-12 gap-x-[clamp(1rem,2.5vw,3rem)]';

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 28, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 1.0, ease, delay }}
    >
      {children}
    </motion.div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>{children}</p>
);

const DrawRule: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div
    aria-hidden
    className={`h-px bg-brass ${className}`}
    style={{ transformOrigin: 'left center' }}
    initial={{ scaleX: 0 }}
    whileInView={{ scaleX: 1 }}
    viewport={{ once: true, amount: 0.7 }}
    transition={{ duration: 1.2, ease, delay: 0.15 }}
  />
);

const EvenementsPage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].evenements;
  const fr = lang === 'FR';

  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEventsPublics().then(setEvents).catch(() => setEvents([])).finally(() => setLoading(false));
  }, []);

  const upcoming = events.filter(e => new Date(e.date) >= new Date(new Date().toDateString()));
  const past = events.filter(e => new Date(e.date) < new Date(new Date().toDateString()));
  const vide = !loading && upcoming.length === 0 && past.length === 0;

  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── FEUILLE 1 · HERO ─────────── */}
      <Feuille z={1} premiere>
        <section className="relative w-full overflow-hidden bg-espressoDeep py-28 md:py-36">
          <Atmosphere strength={0.7} />
          <div className={`relative w-full ${GUT}`}>
            <Eyebrow on="dark">{fr ? 'Calendrier' : 'Calendar'}</Eyebrow>
            <h1 className="mt-6 font-serif font-medium text-ctext leading-[1.05] text-[clamp(2.2rem,5vw,4.2rem)] max-w-[18ch]">
              {t.title}
            </h1>
            <p className="mt-6 font-serif text-[clamp(1.15rem,2vw,1.6rem)] leading-snug text-ctextSoft max-w-[36ch]">
              {t.subtitle}
            </p>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 2 · À VENIR ─────────── */}
      <Feuille z={2}>
        <section className="relative bg-cream py-24 md:py-32">
          <Seam from="#16100a" height={90} />
          <div className={`relative w-full ${GUT}`}>
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-9 h-9 border-2 border-t-transparent border-brass rounded-full animate-spin" />
              </div>
            ) : vide ? (
              <div className="max-w-2xl">
                <Reveal>
                  <Eyebrow>{fr ? 'Pour l\'instant' : 'For now'}</Eyebrow>
                  <p className="mt-5 font-serif text-[clamp(1.3rem,2.4vw,1.9rem)] leading-snug text-ink max-w-[36ch]">{t.noEvents}</p>
                </Reveal>
                <Reveal delay={0.1} className="mt-14 rounded-[15px] bg-espressoSoft p-10 text-ctext">
                  <Eyebrow on="dark">{fr ? 'Programme en cours' : 'Current program'}</Eyebrow>
                  <h2 className="mt-4 font-serif text-[clamp(1.6rem,2.8vw,2.2rem)] leading-tight">{fr ? "L'Expérience Origine" : 'The Origin Experience'}</h2>
                  <p className="mt-4 text-ctextSoft leading-[1.8] max-w-[52ch]">
                    {fr
                      ? '12 semaines pour retrouver votre boussole intérieure, avec Krystine St-Laurent.'
                      : '12 weeks to rediscover your inner compass, with Krystine St-Laurent.'}
                  </p>
                  <a href="/origine" className="mt-8 inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]">
                    {fr ? "Découvrir l'expérience" : 'Discover the experience'}
                  </a>
                </Reveal>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div>
                    <Reveal>
                      <Eyebrow>{t.upcoming}</Eyebrow>
                      <DrawRule className="mt-5 w-24" />
                    </Reveal>
                    <div className={`${G12} mt-14 gap-y-12`}>
                      {upcoming.map((event, i) => (
                        <Reveal key={event.id} delay={Math.min(i * 0.08, 0.24)} className="col-span-12 md:col-span-6 lg:col-span-4">
                          <EventCard event={event} lang={lang} t={t} />
                        </Reveal>
                      ))}
                    </div>
                  </div>
                )}

                {past.length > 0 && (
                  <div className={upcoming.length > 0 ? 'mt-24 md:mt-32' : ''}>
                    <Reveal>
                      <Eyebrow>{t.past}</Eyebrow>
                      <DrawRule className="mt-5 w-24" />
                    </Reveal>
                    <div className={`${G12} mt-12 gap-y-8 opacity-55`}>
                      {past.map((event, i) => (
                        <Reveal key={event.id} delay={Math.min(i * 0.06, 0.18)} className="col-span-12 md:col-span-4">
                          <EventCard event={event} lang={lang} t={t} compact />
                        </Reveal>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </Feuille>
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
  const fr = lang === 'FR';
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', {
    weekday: compact ? undefined : 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const image = event.imageHero || event.imageUrl;
  const enLigne = event.location?.toLowerCase().includes('ligne') || event.location?.toLowerCase().includes('online');
  const restantes = placesRestantes(event);
  const billetsOuverts = enVente(event);
  const billetsFermes = !!event.billetterie && !!event.slug && !billetsOuverts;

  return (
    <article className={`group relative overflow-hidden rounded-[15px] border border-cream3 bg-card shadow-sm transition-shadow duration-300 hover:shadow-[0_20px_50px_rgba(29,22,4,0.10)] ${compact ? 'p-6' : 'p-8'}`}>
      {image && !compact && (
        <div className="absolute inset-0 opacity-[0.06] bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} aria-hidden />
      )}
      <div className="relative">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-sans text-[0.62rem] uppercase tracking-widest font-medium ${event.isFeatured ? 'bg-brass/15 text-brassInk' : 'bg-ink/5 text-inkSoft'}`}>
          <i className={`fa-solid ${enLigne ? 'fa-video' : 'fa-map-marker-alt'} text-[10px]`} />
          {enLigne ? t.online : t.inPerson}
        </span>

        <p className="mt-4 font-sans text-[0.7rem] uppercase tracking-widest text-brassInk font-medium">{dateStr}{event.heure ? ` · ${event.heure}` : ''}</p>
        <h3 className={`mt-2 font-serif font-medium text-ink leading-[1.1] line-clamp-2 ${compact ? 'text-lg' : 'text-2xl'}`}>{event.title}</h3>
        {event.subtitle && !compact && <p className="mt-2 font-serif italic text-inkSoft line-clamp-1">{event.subtitle}</p>}
        {event.location && (
          <p className="mt-3 flex items-center gap-2 text-sm text-inkSoft">
            <i className="fa-solid fa-location-dot text-brassInk text-xs" /> {event.location}
          </p>
        )}
        {event.description && !compact && (
          <p className="mt-4 text-sm leading-relaxed text-inkSoft line-clamp-3">{event.description}</p>
        )}

        {/* ── Le geste, selon l'état réel de l'événement ── */}
        <div className="mt-6">
          {billetsOuverts && (
            <>
              <p className="mb-3 text-[0.78rem] text-brassInk">
                {fr
                  ? (restantes <= 1 ? 'Il reste une place.' : `Il reste ${restantes} places.`)
                  : (restantes <= 1 ? 'One seat left.' : `${restantes} seats left.`)}
              </p>
              <Link to={`/evenement/${event.slug}`} className={`inline-flex items-center gap-2 bg-ink text-cream font-sans text-[0.68rem] uppercase tracking-widest hover:bg-brass hover:text-espressoDeep transition-colors shadow-sm min-h-[44px] ${compact ? 'px-5 py-2.5 rounded-full' : 'px-7 py-3 rounded-full'}`}>
                {fr ? 'Voir et réserver' : 'View and reserve'} <i className="fa-solid fa-arrow-right text-[10px]" />
              </Link>
            </>
          )}

          {billetsFermes && (
            <p className="text-[0.78rem] italic text-inkSoft">
              {fr ? 'Cet événement affiche complet pour le moment.' : 'This event is sold out for now.'}
            </p>
          )}

          {!event.billetterie && event.registrationLink && (
            <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 bg-ink text-cream font-sans text-[0.68rem] uppercase tracking-widest hover:bg-brass hover:text-espressoDeep transition-colors shadow-sm min-h-[44px] ${compact ? 'px-5 py-2.5 rounded-full' : 'px-7 py-3 rounded-full'}`}>
              {t.register} <i className="fa-solid fa-arrow-right text-[10px]" />
            </a>
          )}

          {!event.billetterie && !event.registrationLink && !compact && (
            <p className="text-[0.78rem] italic text-inkSoft">
              {fr ? "L'inscription à cet événement s'ouvrira bientôt." : 'Registration for this event opens soon.'}
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

export default EvenementsPage;
