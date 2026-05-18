// /liste-attente — branded waitlist capture page.
// ─────────────────────────────────────────────────────────────────────────
// Replaces the previous centered <WaitlistModal>. Lives as a real route so
// the CTAs on /accueil and /formations link directly here. The page reads
// ?programme=<key> to know which waitlist the visitor is joining, then
// writes the submission to Firestore `newsletter` with source `waitlist-<key>`
// — same convention the CRM already filters on (SubscribersPanel,
// SubmissionsSection, MembersSection).
//
// Layout: full-width parchment band, asymmetric 7/5 split on lg — left
// column carries the editorial pitch (kicker, title, programme description,
// citation), right column carries the form card. Stacks to single column
// below lg. No centered-form-on-white pattern.
//
// Region is captured via cascading select (Pays/Province → Région), seeded
// from src/lib/regions.ts. Visitors outside the seeded list fall back to a
// free-text region input.

import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { addNewsletterSubscriber } from '../firebase/firestore';
import { points } from '../firebase/points';
import { COUNTRIES, findCountry } from '../lib/regions';
import Sprig from '../components/Sprig';

// Known programmes that map to a CRM source key + display copy. Visitors
// arriving without a recognised query param land on the generic "prochaine
// programmation" variant which still writes a tagged submission.
type ProgrammeKey = 'origine' | 'kapha' | 'pitta';

interface ProgrammeMeta {
  source: string;                 // CRM source key — `waitlist-<id>`
  kicker: string;
  title: string;
  subtitle: string;
  promise: string;                // Editorial paragraph under the title.
  citation?: string;              // Optional pull quote.
}

const PROGRAMMES: Record<ProgrammeKey | 'default', ProgrammeMeta> = {
  origine: {
    source: 'waitlist-origine',
    kicker: 'Parcours signature · Prochaine cohorte',
    title: "L'Expérience Origine",
    subtitle: 'Retrouver votre boussole intérieure',
    promise:
      "L'Expérience Origine est un parcours de 12 semaines au cœur de l'Ayurveda. " +
      "La cohorte en cours est fermée. Inscrivez-vous à la liste d'attente : vous " +
      "serez parmi les premières à savoir lorsque les portes rouvriront, avec " +
      "un accès privilégié et des conditions réservées à la liste.",
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
      "liste d'attente — vous serez avisée dès que les portes s'ouvrent.",
  },
  pitta: {
    source: 'waitlist-pitta',
    kicker: 'Saison Pitta · Bientôt',
    title: "L'Été · Programme Pitta",
    subtitle: 'Rafraîchir · Apaiser · Adoucir',
    promise:
      "Quand la chaleur monte, le feu intérieur s'emballe. Un programme pour " +
      "traverser la saison Pitta sans se brûler. Inscrivez-vous à la liste " +
      "d'attente — vous serez avisée dès que les portes s'ouvrent.",
  },
  default: {
    source: 'waitlist-general',
    kicker: "Liste d'attente",
    title: 'Rejoindre la liste',
    subtitle: 'Soyez parmi les premières à savoir',
    promise:
      "Inscrivez-vous pour être avisée dès que la prochaine programmation " +
      "ouvre ses portes. Pas de spam — quelques mots, lorsque cela compte.",
  },
};

const isKnownProgramme = (key: string): key is ProgrammeKey =>
  key === 'origine' || key === 'kapha' || key === 'pitta';

const ListeAttentePage: React.FC = () => {
  const { lang, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  // Parse ?programme=<key>. Unknown keys fall back to the generic copy.
  const programmeKey = useMemo<ProgrammeKey | 'default'>(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get('programme') || '').trim().toLowerCase();
    return isKnownProgramme(raw) ? raw : 'default';
  }, [location.search]);
  const meta = PROGRAMMES[programmeKey];

  // ── Form state ────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [region, setRegion]           = useState('');
  const [regionFreeText, setRegionFreeText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const country = useMemo(() => findCountry(countryCode), [countryCode]);
  const isFreeText = !!country?.regionFreeText;

  // Reset the region field when the country changes so a stale Québec
  // region isn't submitted under "France" after a re-pick.
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

  // Consistent palette with the rest of the site:
  //   parchemin / ivoire chaud   #F4E7DD
  //   brun terre                 #3A251E
  //   cuivre signature           #B8532F
  //   olive sage                 #8A8F72
  //
  // Inputs: ivoire 95% backing, 1px copper border at 25% — picks up to 100%
  // on focus with a soft 4px halo. Pill-shape (rounded-full) matches the
  // newsletter Pulsation form and WaitlistModal so the form feels native.

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-4 md:px-8 text-[#3A251E] dark:text-white">
      <div className="max-w-[1500px] mx-auto">
        {/* Top breadcrumb — quiet link back to where the visitor came from. */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-bold text-[#3A251E]/55 hover:text-[#B8532F] transition-colors mb-6 md:mb-10"
        >
          <i className="fa-solid fa-arrow-left text-[9px]" />
          {lang === 'FR' ? 'Retour' : 'Back'}
        </button>

        {/* Full-width parchment band — asymmetric 7/5 split. Stacks below lg. */}
        <motion.section
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative w-full rounded-[30px] overflow-hidden"
          style={{
            background:
              'linear-gradient(160deg, rgba(232,208,190,0.65) 0%, rgba(244,231,221,0.85) 45%, rgba(184,83,47,0.10) 100%)',
            border: '1px solid rgba(184,83,47,0.22)',
            boxShadow: '0 18px 48px rgba(107,74,47,0.12)',
          }}
        >
          {/* Corner sprigs — same vocabulary as OrigineHomeSection */}
          <div aria-hidden className="pointer-events-none absolute top-5 left-5 md:top-7 md:left-7 w-10 h-14 md:w-12 md:h-16 opacity-70 z-10">
            <Sprig variant="olive" fill="#8A8F72" />
          </div>
          <div aria-hidden className="pointer-events-none absolute bottom-5 right-5 md:bottom-7 md:right-7 w-10 h-14 md:w-12 md:h-16 opacity-70 z-10">
            <Sprig variant="laurel" flip fill="#8A8F72" />
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-0">
            {/* ── LEFT · editorial pitch ──────────────────────────────── */}
            <div className="relative z-10 px-6 md:px-12 lg:px-16 pt-14 md:pt-20 lg:pt-24 pb-10 lg:pb-20 flex flex-col justify-center">
              <span className="text-[#B8532F] uppercase tracking-[0.35em] text-[10px] md:text-xs font-bold block mb-4">
                {meta.kicker}
              </span>
              <h1
                className="font-serif text-[#1E140F] leading-[1.04] mb-5"
                style={{ fontSize: 'clamp(2.1rem, 4.4vw, 3.6rem)', letterSpacing: '0.008em' }}
              >
                {meta.title}
              </h1>
              <p className="font-serif italic text-[#3A251E]/80 text-lg md:text-xl leading-relaxed mb-7 md:mb-9">
                {meta.subtitle}
              </p>
              <p className="text-[#3A251E]/85 text-base md:text-lg leading-relaxed max-w-2xl mb-8 md:mb-10">
                {meta.promise}
              </p>

              {/* Optional citation — only on Origine for now */}
              {meta.citation && (
                <blockquote
                  className="relative px-6 md:px-8 py-6 md:py-7 rounded-[18px] max-w-2xl"
                  style={{
                    background: 'rgba(244,231,221,0.78)',
                    border: '1px solid rgba(184,83,47,0.28)',
                    boxShadow: '0 8px 22px rgba(107,74,47,0.10), inset 0 1px 0 rgba(255,255,255,0.55)',
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-sm"
                    style={{ background: 'linear-gradient(to bottom, #B8532F, rgba(184,83,47,0))' }}
                  />
                  <i className="fa-solid fa-quote-left text-[#B8532F]/40 text-2xl mb-3" />
                  <p className="font-serif italic text-[#3A251E] text-base md:text-[17px] leading-relaxed">
                    {meta.citation}
                  </p>
                </blockquote>
              )}

              {/* Trust line — speaks to friction. */}
              <ul className="mt-8 md:mt-10 space-y-3 text-sm md:text-[15px] text-[#3A251E]/75">
                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-leaf text-[#B8532F] mt-1" />
                  <span>{lang === 'FR'
                    ? "Aucun engagement — vous êtes inscrite sur la liste, c'est tout."
                    : 'No commitment — you are simply on the list.'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-envelope-open-text text-[#B8532F] mt-1" />
                  <span>{lang === 'FR'
                    ? "Vous serez avisée par courriel à l'ouverture, avant la communication publique."
                    : 'You will be notified by email at the opening, before the public announcement.'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-shield-halved text-[#B8532F] mt-1" />
                  <span>{lang === 'FR'
                    ? "Vos coordonnées ne sont jamais partagées. Désabonnement en un clic."
                    : 'Your details are never shared. One-click unsubscribe.'}</span>
                </li>
              </ul>
            </div>

            {/* ── RIGHT · form card ───────────────────────────────────── */}
            <div className="relative z-10 px-6 md:px-12 lg:pl-4 lg:pr-16 pt-2 lg:pt-24 pb-14 lg:pb-20 flex items-center">
              <div
                className="w-full rounded-[24px] p-7 md:p-9 lg:p-10"
                style={{
                  background: 'rgba(255,253,250,0.92)',
                  border: '1px solid rgba(184,83,47,0.22)',
                  boxShadow: '0 14px 36px rgba(107,74,47,0.10), inset 0 1px 0 rgba(255,255,255,0.65)',
                }}
              >
                {done ? (
                  <div className="text-center py-6 md:py-10">
                    <div className="w-16 h-16 rounded-full bg-[#B8532F]/15 flex items-center justify-center mx-auto mb-5">
                      <i className="fa-solid fa-check text-[#B8532F] text-2xl" />
                    </div>
                    <h2 className="font-serif text-2xl md:text-3xl text-[#3A251E] mb-3">
                      {lang === 'FR' ? 'Merci.' : 'Thank you.'}
                    </h2>
                    <p className="font-serif italic text-[#3A251E]/75 text-base md:text-lg leading-relaxed max-w-sm mx-auto mb-8">
                      {lang === 'FR'
                        ? "Vous êtes inscrite. Vous serez parmi les premières à savoir."
                        : 'You are on the list. You will be among the first to know.'}
                    </p>
                    <Link
                      to="/accueil"
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#3A251E] text-[#F4E7DD] hover:bg-[#B8532F] hover:text-[#3A251E] text-[11px] tracking-[0.28em] uppercase font-bold transition-all"
                    >
                      {lang === 'FR' ? "Retour à l'accueil" : 'Back to home'}
                      <i className="fa-solid fa-arrow-right text-[9px]" />
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4" noValidate>
                    <p className="text-[10px] uppercase tracking-[0.32em] font-bold text-[#B8532F] mb-1">
                      {lang === 'FR' ? "Inscription · liste d'attente" : 'Sign-up · waitlist'}
                    </p>

                    {/* Name — prénom + nom on one row on md+ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="sr-only">{lang === 'FR' ? 'Prénom' : 'First name'}</span>
                        <input
                          type="text"
                          autoComplete="given-name"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder={lang === 'FR' ? 'Prénom' : 'First name'}
                          className="w-full px-5 py-3 rounded-full border border-[#3A251E]/15 bg-white text-sm text-[#3A251E] placeholder:text-[#3A251E]/40 focus:outline-none focus:border-[#B8532F] focus:shadow-[0_0_0_4px_rgba(184,83,47,0.12)] transition-shadow"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">{lang === 'FR' ? 'Nom' : 'Last name'}</span>
                        <input
                          type="text"
                          autoComplete="family-name"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder={lang === 'FR' ? 'Nom' : 'Last name'}
                          className="w-full px-5 py-3 rounded-full border border-[#3A251E]/15 bg-white text-sm text-[#3A251E] placeholder:text-[#3A251E]/40 focus:outline-none focus:border-[#B8532F] focus:shadow-[0_0_0_4px_rgba(184,83,47,0.12)] transition-shadow"
                        />
                      </label>
                    </div>

                    {/* Email */}
                    <label className="block">
                      <span className="sr-only">{lang === 'FR' ? 'Adresse courriel' : 'Email address'}</span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={lang === 'FR' ? 'Adresse courriel' : 'Email address'}
                        className="w-full px-5 py-3 rounded-full border border-[#3A251E]/15 bg-white text-sm text-[#3A251E] placeholder:text-[#3A251E]/40 focus:outline-none focus:border-[#B8532F] focus:shadow-[0_0_0_4px_rgba(184,83,47,0.12)] transition-shadow"
                      />
                    </label>

                    {/* Region — cascading: pays/province then région */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="sr-only">{lang === 'FR' ? 'Pays ou province' : 'Country or province'}</span>
                        <div className="relative">
                          <select
                            required
                            value={countryCode}
                            onChange={e => onCountryChange(e.target.value)}
                            className="w-full appearance-none px-5 py-3 pr-10 rounded-full border border-[#3A251E]/15 bg-white text-sm text-[#3A251E] focus:outline-none focus:border-[#B8532F] focus:shadow-[0_0_0_4px_rgba(184,83,47,0.12)] transition-shadow"
                          >
                            <option value="" disabled>
                              {lang === 'FR' ? 'Pays · province' : 'Country · province'}
                            </option>
                            {COUNTRIES.map(c => (
                              <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                          </select>
                          <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-[#3A251E]/40 text-[10px] pointer-events-none" />
                        </div>
                      </label>

                      <label className="block">
                        <span className="sr-only">{lang === 'FR' ? 'Région' : 'Region'}</span>
                        {!country ? (
                          <input
                            type="text"
                            disabled
                            placeholder={lang === 'FR' ? 'Région' : 'Region'}
                            className="w-full px-5 py-3 rounded-full border border-[#3A251E]/10 bg-[#3A251E]/5 text-sm text-[#3A251E]/40 placeholder:text-[#3A251E]/30 cursor-not-allowed"
                          />
                        ) : isFreeText ? (
                          <input
                            type="text"
                            required
                            value={regionFreeText}
                            onChange={e => setRegionFreeText(e.target.value)}
                            placeholder={country.regionPlaceholder || (lang === 'FR' ? 'Région' : 'Region')}
                            className="w-full px-5 py-3 rounded-full border border-[#3A251E]/15 bg-white text-sm text-[#3A251E] placeholder:text-[#3A251E]/40 focus:outline-none focus:border-[#B8532F] focus:shadow-[0_0_0_4px_rgba(184,83,47,0.12)] transition-shadow"
                          />
                        ) : (
                          <div className="relative">
                            <select
                              required
                              value={region}
                              onChange={e => setRegion(e.target.value)}
                              className="w-full appearance-none px-5 py-3 pr-10 rounded-full border border-[#3A251E]/15 bg-white text-sm text-[#3A251E] focus:outline-none focus:border-[#B8532F] focus:shadow-[0_0_0_4px_rgba(184,83,47,0.12)] transition-shadow"
                            >
                              <option value="" disabled>
                                {lang === 'FR' ? 'Région' : 'Region'}
                              </option>
                              {(country.regions || []).map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                            <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-[#3A251E]/40 text-[10px] pointer-events-none" />
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={busy}
                      className="group relative w-full overflow-hidden mt-2 px-7 py-3.5 rounded-full bg-[#3A251E] text-[#F4E7DD] text-[11px] md:text-[12px] uppercase tracking-[0.28em] font-bold transition-all duration-300 hover:bg-[#B8532F] hover:text-[#3A251E] hover:shadow-[0_12px_28px_rgba(184,83,47,0.4)] hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] ease-out pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(115deg, transparent 40%, rgba(244,212,154,0.22) 50%, transparent 60%)',
                        }}
                      />
                      <span className="relative inline-flex items-center justify-center gap-3">
                        {busy
                          ? <i className="fa-solid fa-circle-notch fa-spin" />
                          : <>{lang === 'FR' ? "Rejoindre la liste d'attente" : 'Join the waitlist'} <i className="fa-solid fa-arrow-right text-[10px] transition-transform duration-300 group-hover:translate-x-1" /></>
                        }
                      </span>
                    </button>

                    {err && (
                      <p className="text-center text-xs text-red-700 pt-1">{err}</p>
                    )}

                    <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#3A251E]/45 text-center pt-2">
                      {lang === 'FR'
                        ? "Désabonnement en un clic · jamais de partage"
                        : 'One-click unsubscribe · never shared'}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default ListeAttentePage;
