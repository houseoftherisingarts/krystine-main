import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Check, ChevronDown, ArrowRight, ArrowLeft, Leaf, MailOpen, ShieldCheck, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Seam, Atmosphere } from '../components/motion/loeuvre';
import { addNewsletterSubscriber } from '../firebase/firestore';
import { points } from '../firebase/points';
import { COUNTRIES, findCountry } from '../lib/regions';

/**
 * /liste-attente — capture liste d'attente, style L'Œuvre (espresso/cream/brass).
 * Reskin complet de ListeAttentePage. Le back-end est préservé à l'identique :
 * lecture de ?programme=<key>, écriture Firestore via addNewsletterSubscriber
 * (source `waitlist-<key>`), points.newsletterSigned, états busy/done/err.
 * Gold standard suivi : OrigineExperience / VataExperience (Reveal, Eyebrow,
 * SectionTitle, alternance sombre/clair, brassInk en texte sur crème).
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => {
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

const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({ children, on = 'light', className = '' }) => (
  <h2 className={`font-serif font-medium leading-[1.04] text-[clamp(2rem,4.4vw,3.4rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>{children}</h2>
);

/* ── Programme copy (préservé du fichier d'origine, mot pour mot) ── */
type ProgrammeKey = 'origine' | 'kapha' | 'pitta';

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
    kicker: 'Parcours signature · Prochaine cohorte en octobre',
    title: "L'Expérience Origine",
    subtitle: 'Retrouver votre boussole intérieure',
    promise:
      "L'Expérience Origine est un parcours de 12 semaines au cœur de l'Ayurveda. " +
      "La cohorte en cours est fermée : la prochaine s'ouvre en octobre prochain. " +
      "Inscrivez-vous à la liste d'attente et vous serez parmi les premières à " +
      "savoir lorsque les portes rouvriront, avec un accès privilégié et des " +
      "conditions réservées à la liste.",
    citation:
      "Jamais il n'y a eu autant d'informations, et jamais autant de dispersion. " +
      "L'exigence actuelle est de retrouver des repères intérieurs fiables.",
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
  key === 'origine' || key === 'kapha' || key === 'pitta';

/* ── Planche photo du hero (par programme) ──
   L'enveloppe scellée pour Origine; le sentier vers la lumière pour les
   saisons et la liste générale. `pos` = object-position du cadrage. */
interface HeroArt { src: string; alt: string; caption: string; pos: string }
const HERO_ART: Record<ProgrammeKey | 'default', HeroArt> = {
  origine: {
    src: 'https://wsrv.nl/?url=https%3A%2F%2Fstorage.googleapis.com%2Forigine1%2Fbanner%2520origine%2520enveloppe.jpg&w=1400&output=webp',
    alt: "L'enveloppe scellée de l'Expérience Origine, sceau boussole, sauge et lavande",
    caption: "L'invitation scellée · sceau boussole, sauge et lavande",
    pos: '74% 48%',
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

/* ── Planche éditoriale : cadre filet laiton, photo en parallax doux,
   légende de magazine. Le parallax translate une image sur-dimensionnée
   (bleed 14%) à l'intérieur du cadre, transform seulement. ── */
const HeroPlate: React.FC<{ art: HeroArt }> = ({ art }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);
  return (
    <motion.figure
      ref={ref}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 30, scale: 1.02 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.3, ease, delay: 0.25 }}
      className="relative"
    >
      <div className="relative overflow-hidden rounded-[1.4rem] ring-1 ring-brass/30 shadow-[0_44px_90px_rgba(6,4,2,0.6)] aspect-[4/5] md:aspect-[5/6]">
        <motion.img
          src={art.src}
          alt={art.alt}
          referrerPolicy="no-referrer"
          className="absolute left-0 top-[-7%] h-[114%] w-full object-cover"
          style={reduce ? { objectPosition: art.pos } : { objectPosition: art.pos, y }}
        />
        <span aria-hidden className="absolute inset-0 rounded-[1.4rem] ring-1 ring-inset ring-ctext/10" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(120% 90% at 50% 38%, transparent 55%, rgba(9,6,3,0.38) 100%)' }}
        />
      </div>
      <span aria-hidden className="absolute -top-3 left-8 h-px w-24 bg-brass/70" />
      <figcaption className="mt-5 flex items-baseline gap-3">
        <span aria-hidden className="h-px w-8 bg-brass/60 translate-y-[-4px]" />
        <span className="font-serif italic text-ctextSoft/85 text-[0.95rem] leading-snug">{art.caption}</span>
      </figcaption>
    </motion.figure>
  );
};

/* ── Champs partagés : look L'Œuvre, hauteur ≥ 44px, focus brass ── */
const fieldBase =
  'w-full min-h-[48px] px-5 py-3 rounded-xl border bg-card text-[0.95rem] text-ink ' +
  'border-cream3 placeholder:text-inkSoft/55 transition-shadow ' +
  'focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/30';
const selectBase = `${fieldBase} appearance-none pr-11 cursor-pointer`;

const ListeAttenteLoeuvre: React.FC<{ forcedProgramme?: ProgrammeKey }> = ({ forcedProgramme }) => {
  const { lang, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  // forcedProgramme (ex. route /origine montée en liste d'attente) prime sur
  // ?programme=<key>. Sinon, clé inconnue → variante générique.
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
      Icon: Leaf,
      text: lang === 'FR'
        ? "Aucun engagement : vous êtes inscrite sur la liste, c'est tout."
        : 'No commitment, you are simply on the list.',
    },
    {
      Icon: MailOpen,
      text: lang === 'FR'
        ? "Vous serez avisée par courriel à l'ouverture, avant la communication publique."
        : 'You will be notified by email at the opening, before the public announcement.',
    },
    {
      Icon: ShieldCheck,
      text: lang === 'FR'
        ? "Vos coordonnées ne sont jamais partagées. Désabonnement en un clic."
        : 'Your details are never shared. One-click unsubscribe.',
    },
  ];

  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO (sombre · split éditorial : promesse + planche photo) ─────────── */}
      <section className="relative min-h-[78vh] flex items-center overflow-hidden bg-espressoDeep">
        <Atmosphere light="72% 20%" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-24 md:py-28">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-brass text-[0.62rem] uppercase tracking-[0.28em] hover:text-brassBright transition-colors mb-10"
          >
            <ArrowLeft size={13} /> {lang === 'FR' ? 'Retour' : 'Back'}
          </button>
          <div className="grid lg:grid-cols-[1.05fr_0.9fr] gap-14 lg:gap-20 items-center">
            <motion.div
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease }}
            >
              <p className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-7">{meta.kicker}</p>
              <h1 className="font-serif font-medium text-ctext leading-[1.0] text-[clamp(2.3rem,5vw,4.2rem)] max-w-[18ch]">{meta.title}</h1>
              <p className="mt-6 font-serif italic text-[clamp(1.3rem,2.6vw,2rem)] leading-snug text-brassBright max-w-[24ch]">{meta.subtitle}</p>
              <p className="mt-8 font-sans text-[1rem] md:text-[1.05rem] leading-[1.85] text-ctextSoft max-w-[58ch]">{meta.promise}</p>
              <div className="mt-10">
                <a
                  href="#inscription"
                  className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
                >
                  {lang === 'FR' ? "Rejoindre la liste d'attente" : 'Join the waitlist'} <ArrowRight size={16} />
                </a>
              </div>
            </motion.div>
            <div className="max-w-[420px] w-full mx-auto lg:mx-0 lg:justify-self-end">
              <HeroPlate art={HERO_ART[programmeKey]} />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── CITATION (clair) — Origine uniquement, comme l'original ─────────── */}
      {meta.citation && (
        <section className="relative bg-cream2 py-20 md:py-28 overflow-hidden">
          <Seam from="#16100a" />
          <div className="relative z-10 mx-auto w-full max-w-[820px] px-6 md:px-12 text-center">
            <Reveal>
              <span className="font-serif text-brassInk text-5xl leading-none">“</span>
              <blockquote className="mt-2 font-serif italic text-ink text-[clamp(1.3rem,2.6vw,2rem)] leading-snug max-w-[40ch] mx-auto">
                {meta.citation}
              </blockquote>
              <div className="mt-7 mx-auto h-px w-16 bg-brass" />
              <p className="mt-4 font-sans text-[0.7rem] uppercase tracking-[0.2em] text-brassInk">Krystine St-Laurent</p>
            </Reveal>
          </div>
        </section>
      )}

      {/* ─────────── INSCRIPTION (clair) — promesse + formulaire ─────────── */}
      <section id="inscription" className="bg-cream py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-12">
          <div className="grid lg:grid-cols-[5fr_6fr] gap-12 lg:gap-16 lg:items-start">

            {/* ── Colonne gauche · réassurance ── */}
            <Reveal className="lg:pt-2">
              <Eyebrow>{lang === 'FR' ? "Liste d'attente" : 'Waitlist'}</Eyebrow>
              <SectionTitle className="mt-4">
                {lang === 'FR' ? 'Parmi les premières à savoir' : 'Among the first to know'}
              </SectionTitle>
              <div className="mt-5 h-px w-16 bg-brass" />
              <ul className="mt-9 space-y-6">
                {trust.map(({ Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="grid place-items-center w-10 h-10 rounded-2xl bg-brass/12 text-brassInk shrink-0">
                      <Icon size={18} />
                    </span>
                    <span className="font-sans text-[0.98rem] leading-[1.7] text-inkSoft max-w-[42ch]">{text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-10 font-serif italic text-brassInk text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug max-w-[36ch]">
                {lang === 'FR'
                  ? 'Quelques mots, lorsque cela compte. Rien de plus.'
                  : 'A few words, when it matters. Nothing more.'}
              </p>
            </Reveal>

            {/* ── Colonne droite · carte formulaire ── */}
            <Reveal delay={0.08}>
              <div className="rounded-[2rem] border border-cream3 bg-card p-7 md:p-10 shadow-[0_18px_48px_rgba(107,74,47,0.10)]">
                {done ? (
                  <div className="text-center py-8 md:py-12">
                    <div className="w-16 h-16 rounded-full bg-brass/15 grid place-items-center mx-auto mb-6">
                      <Check size={28} className="text-brassInk" />
                    </div>
                    <h2 className="font-serif font-medium text-ink text-[clamp(1.8rem,3.5vw,2.6rem)]">
                      {lang === 'FR' ? 'Merci.' : 'Thank you.'}
                    </h2>
                    <p className="mt-4 font-serif italic text-inkSoft text-[clamp(1.05rem,1.8vw,1.3rem)] leading-relaxed max-w-[34ch] mx-auto">
                      {lang === 'FR'
                        ? 'Vous êtes inscrite. Vous serez parmi les premières à savoir.'
                        : 'You are on the list. You will be among the first to know.'}
                    </p>
                    <Link
                      to="/accueil"
                      className="mt-9 inline-flex items-center gap-3 rounded-full bg-espresso px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-ctext transition-colors hover:bg-espressoDeep min-h-[44px]"
                    >
                      {lang === 'FR' ? "Retour à l'accueil" : 'Back to home'} <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-5" noValidate>
                    <Eyebrow>{lang === 'FR' ? "Inscription · liste d'attente" : 'Sign-up · waitlist'}</Eyebrow>

                    {/* Prénom + Nom */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="block mb-1.5 font-sans text-[0.72rem] uppercase tracking-[0.14em] text-inkSoft">
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
                        <span className="block mb-1.5 font-sans text-[0.72rem] uppercase tracking-[0.14em] text-inkSoft">
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
                      <span className="block mb-1.5 font-sans text-[0.72rem] uppercase tracking-[0.14em] text-inkSoft">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="block mb-1.5 font-sans text-[0.72rem] uppercase tracking-[0.14em] text-inkSoft">
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
                          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-brassInk pointer-events-none" />
                        </div>
                      </label>

                      <label className="block">
                        <span className="block mb-1.5 font-sans text-[0.72rem] uppercase tracking-[0.14em] text-inkSoft">
                          {lang === 'FR' ? 'Région' : 'Region'}
                        </span>
                        {!country ? (
                          <input
                            type="text"
                            disabled
                            placeholder={lang === 'FR' ? 'Région' : 'Region'}
                            className={`${fieldBase} bg-cream2 text-inkSoft/45 cursor-not-allowed`}
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
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-brassInk pointer-events-none" />
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Soumettre */}
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full mt-1 inline-flex items-center justify-center gap-3 rounded-xl bg-brass py-4 font-serif text-base tracking-[0.1em] uppercase text-espressoDeep transition-colors hover:bg-brassBright disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
                    >
                      {busy
                        ? <Loader2 size={18} className="animate-spin" />
                        : <>{lang === 'FR' ? "Rejoindre la liste d'attente" : 'Join the waitlist'} <ArrowRight size={16} /></>}
                    </button>

                    {err && (
                      <p role="alert" className="text-center font-sans text-[0.85rem] text-red-700">{err}</p>
                    )}

                    <p className="text-center font-sans text-[0.68rem] uppercase tracking-[0.18em] text-inkSoft/60 pt-1">
                      {lang === 'FR'
                        ? 'Désabonnement en un clic · jamais de partage'
                        : 'One-click unsubscribe · never shared'}
                    </p>
                  </form>
                )}
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ─────────── CONTACT (clair) ─────────── */}
      <section className="bg-cream2 py-16 md:py-20 text-center">
        <a
          href="mailto:teamksl@inspiratanature.com"
          className="font-serif italic text-brassInk hover:text-brassBright transition-colors text-lg md:text-xl border-b border-brass/30 pb-1"
        >
          {lang === 'FR'
            ? 'Une question ? Écrivez à teamksl@inspiratanature.com'
            : 'A question? Write to teamksl@inspiratanature.com'}
        </a>
      </section>

    </div>
  );
};

export default ListeAttenteLoeuvre;
