import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { getLiveEvents, type LiveEvent } from '../firebase/firestore';
import NewsletterSignup from './NewsletterSignup';

/**
 * Bloc « podcast en direct » : lit le prochain document `liveEvents`, affiche
 * la date et capte prénom + courriel. L'inscrit reçoit la confirmation, les
 * rappels (3 jours, veille, 1 h) et la rediffusion par la fonction planifiée.
 * Canon KSL : vert profond, ivoire minéral, fil ambre, serif éditoriale,
 * capitales espacées. Après le direct, le bloc bascule sur la rediffusion.
 */

const TZ = 'America/Toronto';
const ease = [0.22, 1, 0.36, 1] as const;

function fmtDay(d: Date, lang: 'FR' | 'EN') {
  return new Intl.DateTimeFormat(lang === 'FR' ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(d);
}
function fmtTime(d: Date, lang: 'FR' | 'EN') {
  const s = new Intl.DateTimeFormat(lang === 'FR' ? 'fr-CA' : 'en-CA', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(d);
  return lang === 'FR' ? s.replace(':', ' h ') : s;
}

const LiveSignup: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const [ev, setEv] = useState<LiveEvent | null>(null);

  useEffect(() => {
    getLiveEvents().then(list => {
      const now = Date.now();
      // Le prochain direct à venir, sinon le dernier passé s'il a une rediffusion.
      const upcoming = list.filter(e => e.startsAt.toMillis() + 3 * 3600e3 > now).sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())[0];
      const replay = list.find(e => e.replayUrl && now - e.startsAt.toMillis() < 30 * 86400e3);
      setEv(upcoming || replay || null);
    }).catch(() => setEv(null));
  }, []);

  if (!ev) return null;

  const start = ev.startsAt.toDate();
  const isPast = Date.now() > start.getTime() + 3 * 3600e3;
  const jour = fmtDay(start, lang);
  const heure = fmtTime(start, lang);

  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-10% 0px' },
    transition: { duration: 1, delay, ease },
  });

  return (
    <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(3rem,7vh,5rem)]">
      <motion.div
        className="relative mx-auto w-full max-w-[1180px] overflow-hidden rounded-[15px] bg-[#28352F] text-[#EEE7DB] shadow-[0_24px_60px_rgba(41,48,39,0.28)]"
        initial={reduce ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 1.1, ease }}
      >
        {/* Fil lumineux */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#BA7B39] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#BA7B39]/15 blur-3xl" />

        <div className="grid gap-10 px-[clamp(1.5rem,5vw,4rem)] py-[clamp(2.5rem,6vh,4rem)] lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <motion.p {...fade(0.05)} className="flex items-center gap-3 text-[0.68rem] uppercase tracking-[0.34em] text-[#BA7B39]">
              <span className="relative flex h-2 w-2">
                {!isPast && !reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#BA7B39] opacity-70" />}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#BA7B39]" />
              </span>
              {isPast ? 'Rediffusion' : 'En direct sur YouTube'}
            </motion.p>
            <motion.h2 {...fade(0.15)} className="v2-serif mt-5 font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.8rem)]">
              {isPast ? 'La rediffusion est en ligne' : 'Le podcast, en direct'}
            </motion.h2>
            <motion.p {...fade(0.25)} className="mt-5 text-[1.05rem] leading-[1.7] text-[#EEE7DB]/75 max-w-[44ch]">
              {isPast
                ? `L'épisode en direct du ${jour} reste à votre disposition aussi longtemps que vous le voulez.`
                : `Le ${jour} à ${heure}, Krystine ouvre un épisode en direct, sans montage, avec vos questions dans le clavardage. Laissez votre adresse : vous recevrez le lien, un rappel la veille et la rediffusion.`}
            </motion.p>
            <motion.p {...fade(0.3)} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[0.62rem] uppercase tracking-[0.26em] text-[#EEE7DB]/45">
              <span>{jour}</span>
              <span>{heure} · Québec</span>
              <span>{ev.title}</span>
            </motion.p>
          </div>

          <motion.div {...fade(0.35)} className="rounded-[15px] border border-[#EEE7DB]/12 bg-[#293027]/60 p-[clamp(1.25rem,3vw,2.25rem)] backdrop-blur-sm">
            {isPast ? (
              <a
                href={ev.replayUrl || ev.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-full bg-[#BA7B39] px-10 py-4 text-xs font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#EEE7DB]"
              >
                Regarder la rediffusion
              </a>
            ) : (
              <NewsletterSignup
                source="podcast-live"
                tags={['podcast', 'podcast-live', ev.tag]}
                variant="dark"
                emailOnly
                askFirstName
                ctaLabel="Réserver ma place"
                placeholder="Votre adresse courriel"
                success={{
                  title: 'Votre place est réservée',
                  body: `Un courriel de confirmation arrive à l'instant. Vous recevrez un rappel trois jours avant, la veille et une heure avant le direct du ${jour}, puis la rediffusion.`,
                }}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default LiveSignup;
