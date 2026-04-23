import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import NewsletterSignup from '../components/NewsletterSignup';
import { getEvents, type EventDoc } from '../firebase/firestore';
import { getUpcomingEvents } from '../lib/liveEvents';
import LiveEventsSection from '../components/LiveEvents';
import EditableText from '../components/edit/EditableText';
import EditableImage from '../components/edit/EditableImage';

const reveal = (reduce: boolean) => ({
  initial: reduce ? {} : { opacity: 0, y: 30 },
  whileInView: reduce ? {} : { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
});

const KrystinePage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].founder;
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;

  // Upcoming events — curated list from the PDF, plus any dynamic events
  // admins published via Firestore. A 1-hour tick refreshes `upcoming` so
  // past events drop off long-running sessions without a reload.
  const [extraEvents, setExtraEvents] = useState<EventDoc[]>([]);
  useEffect(() => {
    getEvents().then(setExtraEvents).catch(() => setExtraEvents([]));
  }, []);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const upcoming = React.useMemo(() => getUpcomingEvents(), [tick]);
  const extraUpcoming = extraEvents.filter(ev => new Date(ev.date) >= new Date()).slice(0, 6);

  // Subtle portrait parallax — drifts slower than the page for depth. This is
  // the only scroll-linked effect we keep; everything else relies on the
  // shared whileInView reveals so the page stays consistent with Formations /
  // Medias rather than feeling like a different template.
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProg } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroImgY = useTransform(heroProg, [0, 1], ['0%', '12%']);

  const rev = reveal(reduce);

  return (
    <div className="min-h-screen bg-white dark:bg-[#050C1A] text-[#0B1A36] dark:text-white pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-6 md:px-12">

        {/* Hero — same centered label / serif headline / italic subtitle /
            gold divider pattern used on /formations and /medias. */}
        <div className="text-center mb-16">
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            <EditableText
              fieldKey="krystine.hero.kicker"
              defaultValue={lang === 'FR' ? 'La Fondatrice' : 'The Founder'}
            />
          </span>
          <h1 className="text-5xl md:text-7xl font-serif mb-6 leading-[1.05]">
            <EditableText fieldKey="krystine.hero.firstName" defaultValue="Krystine" />{' '}
            <span className="italic text-[#0B1A36]/50 dark:text-white/50">
              <EditableText fieldKey="krystine.hero.lastName" defaultValue="St-Laurent" />
            </span>
          </h1>
          <p className="text-xl text-[#0B1A36]/60 dark:text-white/60 font-serif italic max-w-2xl mx-auto">
            <EditableText fieldKey="krystine.hero.intro" defaultValue={t.bio.intro} multiline />
          </p>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-10" />
        </div>

        {/* Portrait + stats band — single rounded card, image left, copy + stats
            right. Card holds a tall min-height on desktop so the portrait has
            room to run; without it the grid collapses the image to match the
            (short) stats column. */}
        <section ref={heroRef} className="mb-24 rounded-[30px] overflow-hidden shadow-2xl border border-[#D4AF37]/15 bg-white dark:bg-[#0B1A36]/60 lg:min-h-[85vh]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] lg:h-full lg:min-h-[85vh]">
            {/* Portrait — full-height image. Single image (no hover swap). */}
            <div className="relative min-h-[75vh] md:min-h-[85vh] lg:min-h-0 lg:h-full overflow-hidden bg-[#0B1A36]">
              <motion.div
                style={reduce ? undefined : { y: heroImgY }}
                className="absolute inset-0 will-change-transform"
              >
                <EditableImage
                  fieldKey="krystine.hero.portrait"
                  defaultSrc={ASSETS.founder}
                  alt="Krystine St-Laurent"
                  className="absolute inset-0 w-full h-full"
                />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A36]/30 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Stats + CTA */}
            <motion.div
              {...rev}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="p-8 md:p-12 flex flex-col justify-center"
            >
              <div className="grid grid-cols-2 gap-4 mb-10">
                {t.stats.map((stat, i) => (
                  <div
                    key={i}
                    className="bg-[#F5F5F0] dark:bg-white/5 p-5 rounded-2xl border border-[#0B1A36]/5 dark:border-white/10 hover:border-[#D4AF37]/40 transition-colors"
                  >
                    <span className="text-2xl md:text-3xl font-serif text-[#D4AF37] block mb-1">
                      <EditableText fieldKey={`krystine.stats.${i}.value`} defaultValue={stat.value} />
                    </span>
                    <span className="text-[#0B1A36] dark:text-white uppercase tracking-widest text-[10px] font-bold block">
                      <EditableText fieldKey={`krystine.stats.${i}.sub`} defaultValue={stat.sub} />
                    </span>
                    <span className="text-[#0B1A36]/50 dark:text-white/50 text-xs">
                      <EditableText fieldKey={`krystine.stats.${i}.label`} defaultValue={stat.label} />
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/conferenciere')}
                className="inline-flex items-center justify-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
              >
                <EditableText fieldKey="krystine.hero.cta" defaultValue={t.cta} /> <i className="fa-solid fa-arrow-right" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Story — numbered narrative with a pull quote up top. Same gold/navy
            palette as the rest of the site. */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
              <EditableText fieldKey="krystine.story.kicker" defaultValue={t.story.title} />
            </span>
            <p className="text-[#0B1A36]/60 dark:text-white/60 font-serif italic">
              <EditableText fieldKey="krystine.story.subtitle" defaultValue={t.story.subtitle} multiline />
            </p>
          </div>

          <motion.blockquote
            {...rev}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="mb-20 max-w-4xl mx-auto text-center"
          >
            <p className="font-serif italic text-3xl md:text-5xl lg:text-6xl leading-[1.15] text-[#0B1A36] dark:text-white">
              <span className="text-[#D4AF37]/50 mr-1">&ldquo;</span>
              <EditableText fieldKey="krystine.story.quote" defaultValue={t.story.p3} multiline />
              <span className="text-[#D4AF37]/50 ml-1">&rdquo;</span>
            </p>
          </motion.blockquote>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { key: 'krystine.story.p1', value: t.story.p1 },
              { key: 'krystine.story.p2', value: t.story.p2 },
              { key: 'krystine.story.p4', value: t.story.p4 },
              { key: 'krystine.story.p5', value: t.story.p5 },
            ].map((para, i) => (
              <motion.article
                key={para.key}
                initial={reduce ? {} : { opacity: 0, y: 30 }}
                whileInView={reduce ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: (i % 2) * 0.1, ease: 'easeOut' }}
                className="bg-white dark:bg-[#0B1A36]/60 rounded-[24px] shadow-lg border border-[#0B1A36]/5 dark:border-white/5 p-8"
              >
                <span className="block font-serif italic text-[#D4AF37] text-3xl mb-4">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-[#0B1A36]/75 dark:text-white/75 leading-relaxed">
                  <EditableText fieldKey={para.key} defaultValue={para.value} multiline />
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Mission — image + copy, same split-card treatment as the podcast
            band on /formations. */}
        <motion.section
          {...rev}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-24 rounded-[28px] overflow-hidden shadow-xl border border-[#D4AF37]/15 bg-[#0B1A36]"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
            <div className="relative h-64 md:h-auto min-h-[320px] overflow-hidden">
              <EditableImage
                fieldKey="krystine.mission.image"
                defaultSrc={ASSETS.shopBg}
                className="absolute inset-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B1A36]/40 to-[#0B1A36] pointer-events-none" />
              </EditableImage>
            </div>
            <div className="p-10 md:p-14 text-white flex flex-col justify-center">
              <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-[10px] font-bold block mb-5">
                <EditableText
                  fieldKey="krystine.mission.kicker"
                  defaultValue={lang === 'FR' ? "L'Art de vivre conscient" : 'The Art of Conscious Living'}
                />
              </span>
              <h2 className="font-serif text-3xl md:text-4xl leading-[1.2] mb-6">
                <EditableText fieldKey="krystine.mission.title" defaultValue={t.bio.mission} multiline />
              </h2>
              <p className="text-white/70 leading-relaxed mb-8">
                <EditableText fieldKey="krystine.mission.body" defaultValue={t.bio.outro} multiline />
              </p>
              <div className="flex items-center gap-4 text-white/50 uppercase tracking-[0.25em] text-[10px] font-bold">
                <span className="h-px w-10 bg-[#D4AF37]/50" />
                <EditableText fieldKey="krystine.mission.expert" defaultValue={t.bio.expert} />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Correspondence — letter-style newsletter card */}
        <motion.section
          {...rev}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-24 rounded-[28px] bg-[#F5F5F0] dark:bg-white/5 border border-[#D4AF37]/20 px-6 md:px-12 py-14 md:py-20 text-center"
        >
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            <EditableText
              fieldKey="krystine.newsletter.kicker"
              defaultValue={lang === 'FR' ? 'Une correspondance' : 'A correspondence'}
            />
          </span>
          <h3 className="font-serif text-3xl md:text-5xl leading-tight">
            <EditableText fieldKey="krystine.newsletter.title" defaultValue={t.newsletter.title} />
          </h3>
          <h4 className="font-serif italic text-2xl md:text-4xl text-[#D4AF37] leading-tight mb-10">
            <EditableText fieldKey="krystine.newsletter.subtitle" defaultValue={t.newsletter.subtitle} />
          </h4>
          <p className="text-[#0B1A36]/60 dark:text-white/60 leading-relaxed max-w-xl mx-auto mb-12">
            <EditableText fieldKey="krystine.newsletter.intro" defaultValue={t.newsletter.intro} multiline />
          </p>

          {/* Three italic offerings — plain dividers, no borders, just breathing. */}
          <ul className="grid grid-cols-1 md:grid-cols-3 border-y border-[#0B1A36]/10 dark:border-white/10 mb-12 max-w-4xl mx-auto">
            {t.newsletter.list.map((item, i) => (
              <motion.li
                key={i}
                initial={reduce ? {} : { opacity: 0, y: 20 }}
                whileInView={reduce ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                className={`py-6 px-6 font-serif italic text-[#0B1A36]/75 dark:text-white/75 ${
                  i < t.newsletter.list.length - 1 ? 'md:border-r border-[#0B1A36]/10 dark:border-white/10' : ''
                }`}
              >
                <EditableText fieldKey={`krystine.newsletter.list.${i}`} defaultValue={item} multiline />
              </motion.li>
            ))}
          </ul>

          <NewsletterSignup
            source="krystine"
            variant="light"
            ctaLabel={t.newsletter.cta}
            placeholder={lang === 'FR' ? 'Votre adresse courriel' : 'Your email address'}
            className="max-w-xl mx-auto"
          />
          <p className="text-[#0B1A36]/40 dark:text-white/40 text-xs italic mt-6">
            <EditableText fieldKey="krystine.newsletter.outro" defaultValue={t.newsletter.outro} multiline />
          </p>
        </motion.section>

        {/* Closing — quiet last word + CTA */}
        <motion.section
          {...rev}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center"
        >
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-8">
            <EditableText fieldKey="krystine.closing.title" defaultValue={t.footerBio.title} />
          </span>
          <p className="font-serif italic text-2xl md:text-4xl lg:text-5xl leading-[1.2] text-[#0B1A36]/85 dark:text-white/85 max-w-4xl mx-auto mb-12">
            <EditableText fieldKey="krystine.closing.text" defaultValue={t.footerBio.text} multiline />
          </p>
          <div className="flex items-center justify-center gap-6 mb-10">
            <span className="h-px w-16 bg-[#D4AF37]/40" />
            <span className="uppercase tracking-[0.3em] text-[11px] font-bold text-[#D4AF37]">
              Krystine St-Laurent
            </span>
            <span className="h-px w-16 bg-[#D4AF37]/40" />
          </div>
          <button
            onClick={() => navigate('/conferenciere')}
            className="inline-flex items-center gap-3 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
          >
            <EditableText fieldKey="krystine.closing.cta" defaultValue={t.cta} /> <i className="fa-solid fa-arrow-right text-[10px]" />
          </button>
        </motion.section>

        {/* Événements & Conférences — curated live moments (PDF source of
            truth) + any dynamic events the admin publishes via Firestore. */}
        <motion.section
          id="events"
          {...rev}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mt-24 pt-20 border-t border-[#0B1A36]/10 dark:border-white/10 scroll-mt-32"
        >
          <LiveEventsSection
            events={upcoming}
            kickerFR="Où on se rejoint · LIVE"
            kickerEN="Where we meet · LIVE"
            titleFR="Événements & Conférences"
            titleEN="Events & Conferences"
            leadFR="Rencontres en direct, retraites, lancements — et une tournée en préparation."
            leadEN="Live gatherings, retreats, launches — and a tour in the making."
          />

          {/* Dynamic events published via the admin Événements panel land
              below the curated list, without an extra heading. */}
          {extraUpcoming.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              {extraUpcoming.map(ev => {
                const dateObj = new Date(ev.date);
                const dateStr = dateObj.toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                });
                return (
                  <div
                    key={ev.id}
                    className="group relative rounded-2xl border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/60 p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#D4AF37]/50 hover:shadow-lg"
                  >
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#D4AF37] block mb-3">{dateStr}</span>
                    <h3 className="font-serif text-xl md:text-2xl text-[#0B1A36] dark:text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                      {ev.title}
                    </h3>
                    {ev.subtitle && <p className="text-sm font-serif italic text-[#0B1A36]/60 dark:text-white/60 mb-3">{ev.subtitle}</p>}
                    {ev.location && (
                      <p className="text-xs text-[#0B1A36]/50 dark:text-white/50 flex items-center gap-2 mb-3">
                        <i className="fa-solid fa-map-marker-alt text-[#D4AF37] text-[10px]" />{ev.location}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-sm text-[#0B1A36]/70 dark:text-white/70 leading-relaxed mb-4 line-clamp-3">{ev.description}</p>
                    )}
                    {ev.registrationLink && (
                      <a
                        href={ev.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
                      >
                        {lang === 'FR' ? "S'inscrire" : 'Register'}
                        <i className="fa-solid fa-arrow-right text-[9px]" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default KrystinePage;
