import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { getLiveEvents, type LiveEvent } from '../firebase/firestore';
import NewsletterSignup from './NewsletterSignup';
import LecteurVideoEmbarque from './LecteurVideoEmbarque';
import { fetchYouTubeVideos, type YTVideo } from '../lib/youtube';

// Le dernier épisode paru sur YouTube (Krystine, 27 sept. 2026) : la vidéo au
// plus grand numéro d'épisode (« Ép. 4 », « E3 »...), et parmi ses versions la
// première publiée, pour ne pas prendre un extrait posté ensuite.
const numeroEpisode = (titre: string) => {
  const m = /(?:^|[^\p{L}])(?:ép|ep|e)\.?\s*(\d+)(?!\d)/iu.exec(titre.normalize('NFC'));
  return m ? Number(m[1]) : -1;
};
function dernierEpisode(videos: YTVideo[]): YTVideo | null {
  const num = Math.max(-1, ...videos.map(v => numeroEpisode(v.title)));
  if (num < 0) return null;
  return videos.filter(v => numeroEpisode(v.title) === num).sort((a, b) => a.published.localeCompare(b.published))[0] || null;
}
const titreEpisode = (t: string) => t.replace(/^.*?podcast\s*:\s*/i, '').trim();

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

/** `compact` : bloc resserré, placé après la liste des épisodes sur /podcast.
 *  `sansEpisode` : ne montre jamais le dernier épisode YouTube (la page l'affiche déjà en tête). */
const LiveSignup: React.FC<{ compact?: boolean; sansEpisode?: boolean }> = ({ compact = false, sansEpisode = false }) => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const [ev, setEv] = useState<LiveEvent | null>(null);
  const [dernier, setDernier] = useState<YTVideo | null>(null);
  useEffect(() => { if (sansEpisode) return; fetchYouTubeVideos().then(v => setDernier(dernierEpisode(v))).catch(() => setDernier(null)); }, [sansEpisode]);

  useEffect(() => {
    getLiveEvents().then(list => {
      const now = Date.now();
      // Le prochain direct à venir, sinon le dernier passé s'il a une rediffusion.
      const upcoming = list.filter(e => e.startsAt.toMillis() + 3 * 3600e3 > now).sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())[0];
      const replay = list.find(e => e.replayUrl && now - e.startsAt.toMillis() < 30 * 86400e3);
      setEv(upcoming || replay || null);
    }).catch(() => setEv(null));
  }, []);

  // Sans direct à venir, le bloc montre le dernier épisode paru sur YouTube,
  // à jour tout seul, sans date ni heure. Un direct annoncé garde sa date.
  const aVenir = !!ev && Date.now() <= ev.startsAt.toMillis() + 3 * 3600e3;
  const episode = !aVenir ? dernier : null;
  if (!ev && !episode) return null;

  const start = ev ? ev.startsAt.toDate() : new Date();
  const isPast = !aVenir;
  const fr = lang === 'FR';
  const jour = fmtDay(start, lang);
  const heureQc = fmtTime(start, lang, TZ);
  const heureFr = fmtTime(start, lang, 'Europe/Paris');
  const t = fr ? {
    live: 'En direct sur YouTube',
    replay: 'Rediffusion',
    title: episode ? 'Le nouvel épisode' : isPast ? 'La rediffusion est en ligne' : 'Le podcast en direct',
    sub: 'Spécial ouverture de saison',
    body: episode
      ? titreEpisode(episode.title)
      : isPast
      ? `L'épisode en direct reste à votre disposition aussi longtemps que vous le voulez.`
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
    title: episode ? 'The new episode' : isPast ? 'The replay is online' : 'The podcast, live',
    sub: 'Season-opening special',
    body: episode
      ? titreEpisode(episode.title)
      : isPast
      ? `The live episode stays available for as long as you like.`
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
    <section className={`relative w-full px-[clamp(1rem,3vw,3rem)] ${compact ? 'pb-[clamp(3rem,8vh,5rem)]' : 'pb-[clamp(3rem,7vh,5rem)]'}`}>
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

        <div className={compact ? 'grid grid-cols-1 gap-9 [&>*]:min-w-0 px-[clamp(1.25rem,5vw,4.5rem)] py-[clamp(2.25rem,6vh,3.75rem)] lg:grid-cols-[1.1fr_0.9fr] lg:items-center' : 'grid gap-12 px-[clamp(1.5rem,6vw,6rem)] py-[clamp(3.5rem,9vh,6.5rem)] lg:grid-cols-[1.15fr_0.85fr] lg:items-center'}>
          <div>
            <motion.div {...fade(0.05)} className={`inline-flex items-center rounded-full border border-[#c8a86a]/45 bg-[#c8a86a]/10 ${compact ? 'gap-3 px-4 py-2' : 'gap-4 px-6 py-3'}`}>
              <span className="relative flex h-3 w-3">
                {!isPast && !reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#BA7B39] opacity-70" />}
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#BA7B39]" />
              </span>
              <YouTubeMark className={`${compact ? 'h-5 w-5' : 'h-7 w-7'} text-[#EEE7DB]`} />
              <span className={`${compact ? 'text-[0.7rem]' : 'text-[clamp(0.85rem,1.4vw,1.15rem)]'} font-semibold uppercase tracking-[0.3em] text-[#EEE7DB]`}>
                {episode ? (fr ? 'Nouvel épisode' : 'New episode') : isPast ? t.replay : t.live}
              </span>
            </motion.div>
            <motion.h2 {...fade(0.15)} className={`v2-serif font-light leading-[1] ${compact ? 'mt-6 text-[clamp(2.1rem,4.2vw,3.4rem)]' : 'mt-8 text-[clamp(3rem,7vw,5.6rem)]'}`}>
              {t.title}
            </motion.h2>
            {!isPast && (
              <motion.p {...fade(0.2)} className="mt-4 text-[clamp(0.8rem,1.2vw,1rem)] font-semibold uppercase tracking-[0.3em] text-[#BA7B39]">
                {t.sub}
              </motion.p>
            )}
            <motion.p {...fade(0.25)} className={`${compact ? 'mt-5 text-[clamp(1rem,1.3vw,1.1rem)]' : 'mt-7 text-[clamp(1.1rem,1.6vw,1.35rem)]'} leading-[1.7] text-[#EEE7DB]/80 max-w-[46ch]`}>
              {t.body}
            </motion.p>
            {t.body2 && (
              <motion.p {...fade(0.28)} className={`mt-4 ${compact ? 'text-[0.95rem]' : 'text-[clamp(1rem,1.4vw,1.2rem)]'} leading-[1.7] text-[#EEE7DB]/65 max-w-[46ch]`}>
                {t.body2}
              </motion.p>
            )}
            {!isPast && <motion.div {...fade(0.3)} className={`${compact ? 'mt-6' : 'mt-9'} flex flex-wrap gap-x-10 gap-y-4`}>
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#BA7B39]">{fr ? 'Date' : 'Date'}</p>
                <p className="v2-serif mt-1 text-[clamp(1.4rem,2.4vw,2rem)] capitalize">{jour}</p>
              </div>
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#BA7B39]">{fr ? 'Heure' : 'Time'}</p>
                <p className="v2-serif mt-1 text-[clamp(1.4rem,2.4vw,2rem)]">{t.qc}</p>
                <p className="v2-serif text-[clamp(1.1rem,1.8vw,1.5rem)] text-[#EEE7DB]/65">{t.fra}</p>
              </div>
            </motion.div>}
          </div>

          <motion.div {...fade(0.35)} className={isPast ? 'overflow-hidden rounded-[15px] border border-[#EEE7DB]/12 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.5)]' : 'rounded-[15px] border border-[#EEE7DB]/12 bg-[#211c18]/60 p-[clamp(1.5rem,3.5vw,3rem)] backdrop-blur-sm max-sm:[&_form]:grid-cols-[minmax(0,1fr)] [&_input]:min-w-0 max-sm:[&_button]:whitespace-normal max-sm:[&_button]:tracking-[0.12em]'}>
            {isPast ? (
              // La rediffusion se regarde ici même, embarquée dans la carte : jamais un bouton, jamais un nouvel onglet (Alex, 6 sept. 2026).
              <div className="relative aspect-video w-full"><LecteurVideoEmbarque url={episode ? `https://www.youtube.com/watch?v=${episode.id}` : (ev?.replayUrl || ev?.youtubeUrl || '')} titre={episode ? titreEpisode(episode.title) : t.title} className="absolute inset-0 h-full w-full" /></div>
            ) : (
              <NewsletterSignup
                source="podcast-live"
                tags={['podcast', 'podcast-live', ev?.tag || 'podcast-live']}
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
