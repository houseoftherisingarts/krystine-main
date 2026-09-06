import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Check, ChevronDown, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { addNewsletterSubscriber } from '../firebase/firestore';
import { points } from '../firebase/points';
import { COUNTRIES, findCountry } from '../lib/regions';

/**
 * /liste-attente — capture liste d'attente, langage V2 « magazine crème »
 * (même famille que /krystine, /formations : Fraunces, crème #f4efe6,
 * filets hairline, boutons encre, grain multiply pleine page).
 * Le back-end est préservé à l'identique : lecture de ?programme=<key>,
 * écriture Firestore via addNewsletterSubscriber (source `waitlist-<key>`),
 * points.newsletterSigned, états busy/done/err.
 */

const ease = [0.22, 1, 0.36, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.95, ease, delay }}
    >
      {children}
    </motion.div>
  );
};

/* ── Programme copy (préservé, mot pour mot) ── */
type ProgrammeKey = 'origine' | 'foyer' | 'kapha' | 'pitta';

interface ProgrammeMeta {
  source: string;
  kicker: string;
  title: string;
  subtitle: string;
  promise: string;
  citation?: string;
}

const PROGRAMMES: Record<ProgrammeKey | 'default', ProgrammeMeta> = {
  origine: {
    source: 'waitlist-origine',
    kicker: 'Parcours signature · Prochaine cohorte en janvier',
    title: "L'Expérience Origine",
    subtitle: 'Retrouver votre boussole intérieure',
    promise:
      "L'Expérience Origine est un parcours de 12 semaines au cœur de l'Ayurveda. " +
      "La cohorte en cours est fermée : la prochaine s'ouvre en janvier. " +
      "Inscrivez-vous à la liste d'attente et vous serez parmi les premières à " +
      "savoir lorsque les portes rouvriront, avec un accès privilégié et des " +
      "conditions réservées à la liste.",
    citation:
      "Jamais il n'y a eu autant d'informations, et jamais autant de dispersion. " +
      "L'exigence actuelle est de retrouver des repères intérieurs fiables.",
  },
  foyer: {
    source: 'waitlist-foyer-origine',
    kicker: "Liste d'attente · Le Foyer d'Origine",
    title: "Le Foyer d'Origine",
    subtitle: 'Quelque chose se prépare autour du feu',
    promise:
      "Un lieu pour découvrir, relier et rencontrer ce que nous n'aurions pas pensé chercher. " +
      "Le foyer se prépare. Inscrivez-vous à la liste d'attente et vous recevrez l'invitation " +
      "avant toute annonce publique.",
  },
  kapha: {
    source: 'waitlist-kapha',
    kicker: 'Saison Kapha · Bientôt',
    title: 'Le Printemps · Programme Kapha',
    subtitle: 'Activer · Alléger · Stimuler',
    promise:
      "L'éveil du printemps demande de bouger, drainer, alléger. Un programme " +
      'pour traverser la saison Kapha avec élan et clarté. Inscrivez-vous à la ' +
      "liste d'attente : vous serez avisée dès que les portes s'ouvrent.",
  },
  pitta: {
    source: 'waitlist-pitta',
    kicker: 'Saison Pitta · Bientôt',
    title: "L'Été · Programme Pitta",
    subtitle: 'Rafraîchir · Apaiser · Adoucir',
    promise:
      "Quand la chaleur monte, le feu intérieur s'emballe. Un programme pour " +
      "traverser la saison Pitta sans se brûler. Inscrivez-vous à la liste " +
      "d'attente : vous serez avisée dès que les portes s'ouvrent.",
  },
  default: {
    source: 'waitlist-general',
    kicker: "Liste d'attente",
    title: 'Rejoindre la liste',
    subtitle: 'Soyez parmi les premières à savoir',
    promise:
      "Inscrivez-vous pour être avisée dès que la prochaine programmation " +
      "ouvre ses portes. Pas de spam, juste quelques mots, lorsque cela compte.",
  },
};

const isKnownProgramme = (key: string): key is ProgrammeKey =>
  key === 'origine' || key === 'foyer' || key === 'kapha' || key === 'pitta';

/* ── Planche photo du hero (par programme) ── */
interface HeroArt { src: string; alt: string; caption: string; pos: string }
const HERO_ART: Record<ProgrammeKey | 'default', HeroArt> = {
  origine: {
    src: 'https://wsrv.nl/?url=https%3A%2F%2Fstorage.googleapis.com%2Forigine1%2Fbanner%2520origine%2520enveloppe.jpg&w=1400&output=webp',
    alt: "L'enveloppe scellée de l'Expérience Origine, sceau boussole, sauge et lavande",
    caption: "L'invitation scellée · sceau boussole, sauge et lavande",
    pos: '74% 48%',
  },
  foyer: {
    src: '/assets/foyer-visuel-16x9.jpg',
    alt: 'Le feu du Foyer d’Origine',
    caption: 'Autour du feu · le foyer se prépare',
    pos: '76% 42%',
  },
  kapha: {
    src: '/accueil/assets/portes/origine.png',
    alt: 'Sentier de jardin qui monte vers la lumière',
    caption: 'Le sentier du printemps · vers la légèreté',
    pos: '50% 62%',
  },
  pitta: {
    src: '/accueil/assets/portes/origine.png',
    alt: 'Sentier de jardin qui monte vers la lumière',
    caption: "Le sentier de l'été · vers la fraîcheur",
    pos: '50% 62%',
  },
  default: {
    src: '/accueil/assets/portes/origine.png',
    alt: 'Sentier de jardin qui monte vers la lumière',
    caption: 'Le chemin commence ici',
    pos: '50% 62%',
  },
};

/* ── Planche éditoriale V2 : filet laiton + hairline intérieur, tab d'angle,
   photo en parallax doux (bleed 114 %, transform seulement), légende. ── */
const HeroPlate: React.FC<{ art: HeroArt; tab: string }> = ({ art, tab }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);
  return (
    <motion.figure
      ref={ref}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease, delay: 0.2 }}
      className="relative"
    >
      <div className="relative border border-[#9c7a44]/45 p-2.5 bg-[#faf6ee] shadow-[0_30px_70px_rgba(28,23,18,0.16)]">
        <span className="absolute -top-px -left-px bg-[#1c1712] text-[#f4efe6] text-[0.55rem] uppercase tracking-[0.24em] px-3 py-1.5 z-10">
          {tab}
        </span>
        <div className="relative overflow-hidden aspect-[4/5]">
          <motion.img
            src={art.src}
            alt={art.alt}
            referrerPolicy="no-referrer"
            className="absolute left-0 top-[-7%] h-[114%] w-full object-cover"
            style={reduce ? { objectPosition: art.pos } : { objectPosition: art.pos, y }}
          />
        </div>
      </div>
      <figcaption className="mt-4 flex items-baseline gap-3">
        <span aria-hidden className="h-px w-9 bg-[#9c7a44]/70 translate-y-[-4px]" />
        <span className="v2-serif italic text-[#3a2f23] text-[0.95rem] leading-snug">{art.caption}</span>
      </figcaption>
    </motion.figure>
  );
};

/* ── Champs V2 : filet bas, fond transparent, focus laiton ── */
const fieldBase =
  'w-full min-h-[44px] bg-transparent border-b border-[#1c1712]/25 px-1 py-2.5 text-[0.95rem] text-[#1c1712] ' +
  'placeholder:text-[#1c1712]/35 transition-colors duration-300 focus:outline-none focus:border-[#9c7a44]';
const selectBase = `${fieldBase} appearance-none pr-9 cursor-pointer rounded-none`;

const ListeAttenteLoeuvre: React.FC<{ forcedProgramme?: ProgrammeKey }> = ({ forcedProgramme }) => {
  const { lang, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  const programmeKey = useMemo<ProgrammeKey | 'default'>(() => {
    if (forcedProgramme) return forcedProgramme;
    const params = new URLSearchParams(location.search);
    const raw = (params.get('programme') || '').trim().toLowerCase();
    return isKnownProgramme(raw) ? raw : 'default';
  }, [location.search, forcedProgramme]);
  const meta = PROGRAMMES[programmeKey];

  // ── État du formulaire (identique à l'original) ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [region, setRegion] = useState('');
  const [regionFreeText, setRegionFreeText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const country = useMemo(() => findCountry(countryCode), [countryCode]);
  const isFreeText = !!country?.regionFreeText;

  const onCountryChange = (code: string) => {
    setCountryCode(code);
    setRegion('');
    setRegionFreeText('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErr(lang === 'FR' ? 'Une adresse courriel est requise.' : 'An email address is required.');
      return;
    }
    if (!country) {
      setErr(lang === 'FR' ? 'Veuillez choisir un pays ou une province.' : 'Please choose a country or province.');
      return;
    }
    const resolvedRegion = (isFreeText ? regionFreeText : region).trim();
    if (!resolvedRegion) {
      setErr(lang === 'FR' ? 'Veuillez préciser votre région.' : 'Please specify your region.');
      return;
    }
    setBusy(true);
    try {
      await addNewsletterSubscriber({
        email: trimmedEmail,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        province: country.label,
        region: resolvedRegion,
        source: meta.source,
        tags: [meta.source, `province-${country.code.toLowerCase()}`],
        status: 'active',
      });
      if (user?.uid) {
        try { await points.newsletterSigned(user.uid, meta.source); } catch { /* non-fatal */ }
      }
      setDone(true);
    } catch (ex: any) {
      setErr(ex?.message || (lang === 'FR' ? 'Une erreur est survenue. Veuillez réessayer.' : 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const trust = [
    {
      num: '01',
      title: lang === 'FR' ? 'Aucun engagement' : 'No commitment',
      text: lang === 'FR'
        ? "Vous êtes inscrite sur la liste, c'est tout. Vous choisirez librement à l'ouverture."
        : 'You are simply on the list. You will choose freely at the opening.',
    },
    {
      num: '02',
      title: lang === 'FR' ? 'Avisée en premier' : 'First to know',
      text: lang === 'FR'
        ? "Vous recevez les détails par courriel à l'ouverture, avant la communication publique."
        : 'You receive the details by email at the opening, before the public announcement.',
    },
    {
      num: '03',
      title: lang === 'FR' ? 'Coordonnées protégées' : 'Details protected',
      text: lang === 'FR'
        ? 'Vos coordonnées ne sont jamais partagées. Désabonnement en un clic.'
        : 'Your details are never shared. One-click unsubscribe.',
    },
  ];

  const editionLeft = lang === 'FR' ? "Liste d'attente · Inspira Nature" : 'Waitlist · Inspira Nature';

  return (
    <div
      className="relative min-h-screen w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Inter:wght@300;400;500&display=swap');
        .v2-serif { font-family: "Fraunces", Georgia, serif; }
        .v2-grain {
          position: fixed; inset: 0; z-index: 60; pointer-events: none;
          opacity: 0.045; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>
      <div className="v2-grain" aria-hidden />

      {/* ─────────── HERO · couverture (clair, split éditorial) ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(6.5rem,12vh,9rem)] pb-[clamp(3rem,8vh,6rem)]">
        {/* ligne d'édition */}
        <div className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55">
          <span>{editionLeft}</span>
          <span className="hidden md:inline">Québec · MMXXVI</span>
        </div>

        <div className="mt-[clamp(2.5rem,6vh,4.5rem)] grid lg:grid-cols-[1.1fr_0.9fr] gap-x-[clamp(2.5rem,6vw,6rem)] gap-y-14 items-center">
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease }}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-[#7d6330] text-[0.62rem] uppercase tracking-[0.26em] hover:text-[#1c1712] transition-colors duration-300 mb-9"
            >
              <ArrowLeft size={13} /> {lang === 'FR' ? 'Retour' : 'Back'}
            </button>
            <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330]">{meta.kicker}</p>
            <h1 className="mt-6 v2-serif font-light leading-[0.98] text-[#1c1712] text-[clamp(2.8rem,6vw,5.2rem)] max-w-[16ch]">
              {meta.title}
            </h1>
            <p className="mt-5 v2-serif italic text-[clamp(1.25rem,2.2vw,1.8rem)] leading-snug text-[#7d6330] max-w-[26ch]">
              {meta.subtitle}
            </p>
            <p className="mt-8 text-[0.98rem] md:text-[1.03rem] font-light leading-[1.9] text-[#3a2f23] max-w-[58ch]">
              {meta.promise}
            </p>
            <div className="mt-11 flex flex-wrap items-center gap-7">
              <a
                href="#inscription"
                className="group inline-flex items-center justify-center gap-3 bg-[#1c1712] px-9 py-4 text-[0.72rem] uppercase tracking-[0.22em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] min-h-[44px]"
              >
                {lang === 'FR' ? "Rejoindre la liste d'attente" : 'Join the waitlist'}
                <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <span className="v2-serif italic text-[0.95rem] text-[#3a2f23]/80">
                {lang === 'FR' ? 'Quelques mots, lorsque cela compte.' : 'A few words, when it matters.'}
              </span>
            </div>
          </motion.div>

          <div className="max-w-[440px] w-full mx-auto lg:mx-0 lg:justify-self-end">
            <HeroPlate art={HERO_ART[programmeKey]} tab={programmeKey === 'origine' ? (lang === 'FR' ? 'Janvier 2027' : 'January 2027') : programmeKey === 'foyer' ? (lang === 'FR' ? 'Le foyer se prépare' : 'The hearth is being prepared') : (lang === 'FR' ? 'Bientôt' : 'Soon')} />
          </div>
        </div>
      </section>

      {/* ─────────── CITATION · pull-quote éditorial (Origine uniquement) ─────────── */}
      {meta.citation && (
        <section className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4.5rem,10vh,7.5rem)] bg-[#efe6d7]">
          <Reveal className="mx-auto max-w-[880px]">
            <div className="border-t border-[#1c1712]/15 pt-10">
              <blockquote className="v2-serif italic font-light text-[#1c1712] text-[clamp(1.5rem,3.2vw,2.5rem)] leading-[1.3]">
                « {meta.citation} »
              </blockquote>
              <p className="mt-7 text-[0.65rem] uppercase tracking-[0.3em] text-[#7d6330]">Krystine St-Laurent</p>
            </div>
          </Reveal>
        </section>
      )}

      {/* ─────────── INSCRIPTION · réassurance + formulaire ─────────── */}
      <section id="inscription" className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#f4efe6]">
        <div className="grid lg:grid-cols-[5fr_6fr] gap-x-[clamp(2.5rem,6vw,6rem)] gap-y-14 items-start">

          {/* ── Colonne gauche · réassurance numérotée ── */}
          <Reveal>
            <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330]">
              {lang === 'FR' ? "Liste d'attente" : 'Waitlist'}
            </p>
            <h2 className="mt-5 v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2rem,4vw,3.2rem)]">
              {lang === 'FR' ? 'Parmi les premières à savoir' : 'Among the first to know'}
            </h2>
            <div className="mt-10">
              {trust.map(({ num, title, text }) => (
                <div key={num} className="border-t border-[#1c1712]/15 py-6 grid grid-cols-[3rem_1fr] gap-4 items-baseline">
                  <span className="v2-serif italic text-[#7d6330] text-lg tabular-nums">{num}</span>
                  <div>
                    <h3 className="v2-serif text-[1.2rem] font-light text-[#1c1712]">{title}</h3>
                    <p className="mt-1.5 text-[0.92rem] font-light leading-[1.75] text-[#3a2f23] max-w-[46ch]">{text}</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-[#1c1712]/15" />
            </div>
          </Reveal>

          {/* ── Colonne droite · formulaire éditorial encadré ── */}
          <Reveal delay={0.08}>
            <div className="relative border border-[#9c7a44]/40 bg-[#faf6ee] p-8 md:p-12">
              <span className="pointer-events-none absolute inset-3 border border-[#9c7a44]/25" aria-hidden />
              <div className="relative">
                {done ? (
                  <div className="text-center py-10 md:py-14">
                    <span className="inline-grid place-items-center w-16 h-16 rounded-full border border-[#9c7a44]/45 text-[#7d6330] mb-7">
                      <Check size={26} />
                    </span>
                    <h2 className="v2-serif font-light text-[#1c1712] text-[clamp(1.9rem,3.5vw,2.7rem)]">
                      {lang === 'FR' ? 'Merci.' : 'Thank you.'}
                    </h2>
                    <p className="mt-4 v2-serif italic text-[#3a2f23] text-[clamp(1.05rem,1.8vw,1.3rem)] leading-relaxed max-w-[34ch] mx-auto">
                      {lang === 'FR'
                        ? 'Vous êtes inscrite. Vous serez parmi les premières à savoir.'
                        : 'You are on the list. You will be among the first to know.'}
                    </p>
                    <Link
                      to="/accueil"
                      className="mt-10 inline-flex items-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.72rem] uppercase tracking-[0.22em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] min-h-[44px]"
                    >
                      {lang === 'FR' ? "Retour à l'accueil" : 'Back to home'} <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-7" noValidate>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#7d6330]">
                      {lang === 'FR' ? "Inscription · liste d'attente" : 'Sign-up · waitlist'}
                    </p>

                    {/* Prénom + Nom */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
                      <label className="block">
                        <span className="block mb-1 text-[0.62rem] uppercase tracking-[0.2em] text-[#3a2f23]/70">
                          {lang === 'FR' ? 'Prénom' : 'First name'}
                        </span>
                        <input
                          type="text"
                          autoComplete="given-name"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder={lang === 'FR' ? 'Prénom' : 'First name'}
                          className={fieldBase}
                        />
                      </label>
                      <label className="block">
                        <span className="block mb-1 text-[0.62rem] uppercase tracking-[0.2em] text-[#3a2f23]/70">
                          {lang === 'FR' ? 'Nom' : 'Last name'}
                        </span>
                        <input
                          type="text"
                          autoComplete="family-name"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder={lang === 'FR' ? 'Nom' : 'Last name'}
                          className={fieldBase}
                        />
                      </label>
                    </div>

                    {/* Courriel */}
                    <label className="block">
                      <span className="block mb-1 text-[0.62rem] uppercase tracking-[0.2em] text-[#3a2f23]/70">
                        {lang === 'FR' ? 'Adresse courriel' : 'Email address'}
                      </span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={lang === 'FR' ? 'vous@exemple.com' : 'you@example.com'}
                        className={fieldBase}
                      />
                    </label>

                    {/* Pays/province + région (cascade) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
                      <label className="block">
                        <span className="block mb-1 text-[0.62rem] uppercase tracking-[0.2em] text-[#3a2f23]/70">
                          {lang === 'FR' ? 'Pays ou province' : 'Country or province'}
                        </span>
                        <div className="relative">
                          <select
                            required
                            value={countryCode}
                            onChange={e => onCountryChange(e.target.value)}
                            className={selectBase}
                          >
                            <option value="" disabled>
                              {lang === 'FR' ? 'Pays · province' : 'Country · province'}
                            </option>
                            {COUNTRIES.map(c => (
                              <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={15} className="absolute right-1 top-1/2 -translate-y-1/2 text-[#7d6330] pointer-events-none" />
                        </div>
                      </label>

                      <label className="block">
                        <span className="block mb-1 text-[0.62rem] uppercase tracking-[0.2em] text-[#3a2f23]/70">
                          {lang === 'FR' ? 'Région' : 'Region'}
                        </span>
                        {!country ? (
                          <input
                            type="text"
                            disabled
                            placeholder={lang === 'FR' ? 'Région' : 'Region'}
                            className={`${fieldBase} opacity-45 cursor-not-allowed`}
                          />
                        ) : isFreeText ? (
                          <input
                            type="text"
                            required
                            value={regionFreeText}
                            onChange={e => setRegionFreeText(e.target.value)}
                            placeholder={country.regionPlaceholder || (lang === 'FR' ? 'Région' : 'Region')}
                            className={fieldBase}
                          />
                        ) : (
                          <div className="relative">
                            <select
                              required
                              value={region}
                              onChange={e => setRegion(e.target.value)}
                              className={selectBase}
                            >
                              <option value="" disabled>
                                {lang === 'FR' ? 'Région' : 'Region'}
                              </option>
                              {(country.regions || []).map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                            <ChevronDown size={15} className="absolute right-1 top-1/2 -translate-y-1/2 text-[#7d6330] pointer-events-none" />
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Soumettre */}
                    <button
                      type="submit"
                      disabled={busy}
                      className="group w-full mt-2 inline-flex items-center justify-center gap-3 bg-[#1c1712] py-4 text-[0.72rem] uppercase tracking-[0.22em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
                    >
                      {busy
                        ? <Loader2 size={18} className="animate-spin" />
                        : <>{lang === 'FR' ? "Rejoindre la liste d'attente" : 'Join the waitlist'}
                            <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" /></>}
                    </button>

                    {err && (
                      <p role="alert" className="text-center text-[0.85rem] text-[#8f3d29]">{err}</p>
                    )}

                    <p className="text-center v2-serif italic text-[0.88rem] text-[#3a2f23]/70">
                      {lang === 'FR'
                        ? 'Désabonnement en un clic · vos coordonnées ne sont jamais partagées.'
                        : 'One-click unsubscribe · your details are never shared.'}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </Reveal>

        </div>
      </section>

      {/* ─────────── CONTACT ─────────── */}
      <section className="w-full px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(4rem,9vh,7rem)] bg-[#f4efe6]">
        <div className="border-t border-[#1c1712]/15 pt-9 text-center">
          <a
            href="mailto:teamksl@inspiratanature.com"
            className="v2-serif italic text-[#7d6330] hover:text-[#1c1712] transition-colors duration-300 text-lg md:text-xl"
          >
            {lang === 'FR'
              ? 'Une question ? Écrivez à teamksl@inspiratanature.com'
              : 'A question? Write to teamksl@inspiratanature.com'}
          </a>
        </div>
      </section>

    </div>
  );
};

export default ListeAttenteLoeuvre;
