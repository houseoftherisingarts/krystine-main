import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { getLiveEvents, type LiveEvent } from '../firebase/firestore';
import NewsletterSignup from './NewsletterSignup';
import { LecteurVideoPleinEcran } from './LecteurVideoEmbarque';

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
function fmtTime(d: Date, lang: 'FR' | 'EN', tz: string) {
  const raw = new Intl.DateTimeFormat(lang === 'FR' ? 'fr-CA' : 'en-CA', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(d);
  const s = raw.replace(/[\u202f\u00a0]/g, ' ');
  return lang === 'FR' ? s.replace(/ h 00\b/, ' h').replace(':00', ' h').replace(':', ' h ') : s.replace(':00', '');
}

const YouTubeMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
  </svg>
);

const LiveSignup: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const [ev, setEv] = useState<LiveEvent | null>(null);
  const [lecteurOuvert, setLecteurOuvert] = useState(false);

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
  const fr = lang === 'FR';
  const jour = fmtDay(start, lang);
  const heureQc = fmtTime(start, lang, TZ);
  const heureFr = fmtTime(start, lang, 'Europe/Paris');
  const t = fr ? {
    live: 'En direct sur YouTube',
    replay: 'Rediffusion',
    title: isPast ? 'La rediffusion est en ligne' : 'Le podcast en direct',
    sub: 'Spécial ouverture de saison',
    body: isPast
      ? `L'épisode en direct du ${jour} reste à votre disposition aussi longtemps que vous le voulez.`
      : 'Nous vous retrouvons en direct pour vous présenter en avant-première les nouveautés de la saison et répondre à vos questions dans le clavardage.',
    body2: isPast ? '' : 'En vous inscrivant, vous pourrez poser votre question à Krystine et vous recevrez le lien, un rappel avant le direct ainsi que la rediffusion.',
    qc: `${heureQc} · Québec`, fra: `${heureFr} · France`,
    watch: 'Regarder la rediffusion', cta: 'M\'inscrire et poser ma question', placeholder: 'Votre courriel',
    question: 'Votre question pour Krystine (facultatif)', qHint: 'Les questions reçues à l\'inscription seront répondues pendant le direct.',
    okTitle: 'Votre place est réservée',
    okBody: `Un courriel de confirmation arrive à l'instant. Vous recevrez un rappel trois jours avant, la veille et une heure avant le direct du ${jour}, puis la rediffusion.`,
  } : {
    live: 'Live on YouTube',
    replay: 'Replay',
    title: isPast ? 'The replay is online' : 'The podcast, live',
    sub: 'Season-opening special',
    body: isPast
      ? `The live episode of ${jour} stays available for as long as you like.`
      : 'We meet you live to give you a first look at what the new season holds and to answer your questions in the chat.',
    body2: isPast ? '' : 'By signing up, you can ask Krystine your question and you will receive the link, a reminder before the live and the replay.',
    qc: `${heureQc} · Québec`, fra: `${heureFr} · France`,
    watch: 'Watch the replay', cta: 'Sign up and ask my question', placeholder: 'Your email',
    question: 'Your question for Krystine (optional)', qHint: 'Questions received at sign-up will be answered during the live.',
    okTitle: 'Your seat is reserved',
    okBody: `A confirmation email is on its way. You will receive a reminder three days before, the day before and one hour before the live of ${jour}, then the replay.`,
  };

  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-10% 0px' },
    transition: { duration: 1, delay, ease },
  });

  return (
    <section className="relative w-full px-[clamp(1rem,3vw,3rem)] pb-[clamp(3rem,7vh,5rem)]">
      <motion.div
        className="relative w-full overflow-hidden rounded-[15px] bg-[#161311] text-[#EEE7DB] shadow-[0_28px_70px_rgba(20,16,12,0.45)]"
        initial={reduce ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 1.1, ease }}
      >
        {/* Fil lumineux */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c8a86a] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#c8a86a]/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#BA7B39]/10 blur-3xl" />

        <div className="grid gap-12 px-[clamp(1.5rem,6vw,6rem)] py-[clamp(3.5rem,9vh,6.5rem)] lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <motion.div {...fade(0.05)} className="inline-flex items-center gap-4 rounded-full border border-[#c8a86a]/45 bg-[#c8a86a]/10 px-6 py-3">
              <span className="relative flex h-3 w-3">
                {!isPast && !reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#BA7B39] opacity-70" />}
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#BA7B39]" />
              </span>
              <YouTubeMark className="h-7 w-7 text-[#EEE7DB]" />
              <span className="text-[clamp(0.85rem,1.4vw,1.15rem)] font-semibold uppercase tracking-[0.3em] text-[#EEE7DB]">
                {isPast ? t.replay : t.live}
              </span>
            </motion.div>
            <motion.h2 {...fade(0.15)} className="v2-serif mt-8 font-light leading-[1] text-[clamp(3rem,7vw,5.6rem)]">
              {t.title}
            </motion.h2>
            {!isPast && (
              <motion.p {...fade(0.2)} className="mt-4 text-[clamp(0.8rem,1.2vw,1rem)] font-semibold uppercase tracking-[0.3em] text-[#BA7B39]">
                {t.sub}
              </motion.p>
            )}
            <motion.p {...fade(0.25)} className="mt-7 text-[clamp(1.1rem,1.6vw,1.35rem)] leading-[1.7] text-[#EEE7DB]/80 max-w-[46ch]">
              {t.body}
            </motion.p>
            {t.body2 && (
              <motion.p {...fade(0.28)} className="mt-4 text-[clamp(1rem,1.4vw,1.2rem)] leading-[1.7] text-[#EEE7DB]/65 max-w-[46ch]">
                {t.body2}
              </motion.p>
            )}
            <motion.div {...fade(0.3)} className="mt-9 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#BA7B39]">{fr ? 'Date' : 'Date'}</p>
                <p className="v2-serif mt-1 text-[clamp(1.4rem,2.4vw,2rem)] capitalize">{jour}</p>
              </div>
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#BA7B39]">{fr ? 'Heure' : 'Time'}</p>
                <p className="v2-serif mt-1 text-[clamp(1.4rem,2.4vw,2rem)]">{t.qc}</p>
                <p className="v2-serif text-[clamp(1.1rem,1.8vw,1.5rem)] text-[#EEE7DB]/65">{t.fra}</p>
              </div>
            </motion.div>
          </div>

          <motion.div {...fade(0.35)} className="rounded-[15px] border border-[#EEE7DB]/12 bg-[#211c18]/60 p-[clamp(1.5rem,3.5vw,3rem)] backdrop-blur-sm">
            {isPast ? (
              <a
                href={ev.replayUrl || ev.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#BA7B39] px-10 py-5 text-sm font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#EEE7DB]"
              >
                <YouTubeMark className="h-6 w-6" /> {t.watch}
              </a>
            ) : (
              <NewsletterSignup
                source="podcast-live"
                tags={['podcast', 'podcast-live', ev.tag]}
                variant="dark"
                emailOnly
                askFirstName
                askQuestion={{ placeholder: t.question, hint: t.qHint }}
                ctaLabel={t.cta}
                placeholder={t.placeholder}
                success={{ title: t.okTitle, body: t.okBody }}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default LiveSignup;
