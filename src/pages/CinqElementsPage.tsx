import React, { useRef, useState } from 'react';
import { ArrowRight, DownloadSimple, User, EnvelopeSimple, Check } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { telechargerExtraitCinqElements } from '../firebase/cinqelements';
import { RECAPTCHA_SITE_KEY, useRecaptcha } from '../lib/recaptcha';
import CompteUpsell from '../components/CompteUpsell';
import RideauEntree from '../components/evenements/RideauEntree';
import {
  StyleV2, GOUTTIERE, Kicker, Masthead, TitreV2, SousTitreV2, LiensChapitres, Planche, LigneDefiler,
  CarteVerte, TitreChapitre, Filet, Reveal,
  useMotionV2,
} from '../components/v2/Magazine';

/**
 * /5elements : l'extrait « Les 5 éléments et leurs qualités » du livre
 * Nature & Ayurveda, offert en échange d'un courriel ou d'un compte. Même
 * langage « magazine crème » que /medias et /evenements, mêmes primitives.
 * Le fichier part tout de suite; avec un compte, il reste dans l'espace
 * client, à la section Téléchargements.
 */

const ELEMENTS = [
  { nom: 'Terre', sanskrit: 'Prithvi', qualites: 'lourde, stable, froide', note: "l'ancrage et la matière" },
  { nom: 'Eau', sanskrit: 'Apas', qualites: 'fluide, fraîche, douce', note: 'le lien et la circulation' },
  { nom: 'Feu', sanskrit: 'Agni', qualites: 'chaud, vif, pénétrant', note: 'la digestion et la transformation' },
  { nom: 'Air', sanskrit: 'Vayu', qualites: 'léger, mobile, sec', note: 'le mouvement et la pensée' },
  { nom: 'Éther', sanskrit: 'Akasha', qualites: 'subtil, vaste, silencieux', note: "l'espace qui contient tout" },
];

/** Les quatre pages intérieures de l'extrait, rendues telles quelles depuis le PDF. */
const PAGES_EXEMPLES = [
  { src: '/5elements/page-1.webp', num: '01' },
  { src: '/5elements/page-2.webp', num: '02' },
  { src: '/5elements/page-3.webp', num: '03' },
  { src: '/5elements/page-4.webp', num: '04' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** Une page de l'extrait posée dans son cadre fileté d'or, qui s'installe en douceur à l'entrée. */
const PageExemple: React.FC<{ src: string; num: string; i: number }> = ({ src, num, i }) => {
  const reduce = useReducedMotion();
  return (
    <motion.figure
      initial={reduce ? false : { opacity: 0, y: 48, rotate: i % 2 ? 1.2 : -1.2, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.05, ease: EASE }}
      className={`relative ${i % 2 ? 'lg:mt-10' : ''}`}
    >
      <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#e7ddcb]">
        {/* Un aperçu, pas une lecture : la page se devine derrière un léger flou et un voile crème
            qui monte du bas; le texte complet arrive par courriel (Krystine, 20 sept 2026). */}
        <img
          src={src}
          alt={`Extrait du livre Nature & Ayurveda, page ${num}, aperçu voilé`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full scale-[1.02] object-cover blur-[1.8px]"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#f4efe6] via-[#f4efe6]/85 to-transparent" style={{ backgroundImage: 'linear-gradient(to top, #f4efe6 0%, rgba(244,239,230,0.92) 38%, rgba(244,239,230,0.55) 62%, rgba(244,239,230,0) 100%)' }} />
        <span className="absolute top-0 left-0 bg-[#1c1712] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em] text-[#f4efe6]">
          Page {num}
        </span>
        <span className="absolute bottom-4 left-4 right-4 text-[0.62rem] uppercase tracking-[0.2em] text-[#7d6330]">
          La page complète arrive par courriel
        </span>
      </div>
    </motion.figure>
  );
};

const CinqElementsPage: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  const { user, setSignInOpen } = useApp();
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // La case anti-robot n'est posée que pour une visiteuse non connectée :
  // une membre déjà authentifiée n'a rien à prouver.
  const captcha = useRecaptcha(!user);

  useMotionV2(root);

  const obtenir = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErreur(null);
    if (!user) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErreur('Un courriel valide est nécessaire.'); return; }
      if (!consent) { setErreur("Cochez la case de l'infolettre pour recevoir l'extrait."); return; }
      // La fonction `extraitCinqElements` vérifie ce jeton avant d'écrire quoi
      // que ce soit : la case n'est pas un décor, elle garde vraiment la porte.
      if (RECAPTCHA_SITE_KEY && !captcha.getToken()) {
        setErreur('Cochez la case « Je ne suis pas un robot ».');
        return;
      }
    }
    setBusy(true);
    try {
      const lien = await telechargerExtraitCinqElements(
        user ? undefined : { email: email.trim(), prenom: prenom.trim(), consent, token: captcha.getToken() },
      );
      setUrl(lien);
      window.location.href = lien;
    } catch {
      captcha.resetWidget();
      setErreur("Le lien n'a pas pu être préparé. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const champ = 'w-full border-b border-[#EEE7DB]/25 bg-transparent py-3 font-sans text-sm text-[#EEE7DB] placeholder:text-[#EEE7DB]/40 focus:border-[#BA7B39] focus:outline-none';

  return (
    <div
      ref={root}
      className="relative min-h-screen w-full overflow-x-hidden bg-[#f4efe6] text-[#1c1712] antialiased"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <StyleV2 />
      <RideauEntree cle="5elements" mot="Les 5 éléments" />

      {/* ─────────── LE SEUIL · la ligne de tête, le titre, la planche ─────────── */}
      <section data-hero className={`relative flex w-full flex-col ${GOUTTIERE} pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)]`}>
        <Masthead gauche={<>N&deg; 06 &middot; Les 5 éléments</>} />

        <div className="mt-[clamp(2rem,5vh,3.5rem)]">
          <Kicker className="mb-6"><span data-fade className="inline-block">Extrait du livre Nature &amp; Ayurveda</span></Kicker>
          <TitreV2 lignes={['5 éléments']} />
          <SousTitreV2>
            Terre, eau, feu, air, éther. Les cinq éléments et leurs qualités, à lire d'une seule traite, tirés du livre Nature &amp; Ayurveda.
          </SousTitreV2>
          <LiensChapitres liens={[['Le guide', '#guide'], ['Feuilleter', '#feuilleter'], ['Télécharger', '#telecharger']]} />
        </div>

        <Planche
          seuil
          className="mt-[clamp(2.5rem,6vh,4.5rem)]"
          src="/5elements/couverture.webp"
          alt="Extrait du livre Nature & Ayurveda : les 5 éléments et leurs qualités"
          etiquette="Extrait offert"
          legende={<>Extrait du livre Nature &amp; Ayurveda &middot; Éditions de l'Homme &middot; 2018</>}
        />

        <LigneDefiler droite={<>Terre &middot; Eau &middot; Feu &middot; Air &middot; Éther</>} />
      </section>

      {/* ─────────── CHAPITRE 01 · LE GUIDE ─────────── */}
      <section id="guide" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#efe6d7] py-[clamp(6rem,15vh,11rem)]`}>
        <Reveal className="max-w-[640px]">
          <Kicker className="mb-5">Chapitre 01 · Le guide</Kicker>
          <TitreChapitre>Ce que vous recevez</TitreChapitre>
          <p className="mt-3 v2-serif font-light text-[clamp(1.1rem,2vw,1.5rem)] text-[#7d6330]">
            Six pages, cinq éléments, et leurs qualités.
          </p>
          <p className="mt-7 max-w-[56ch] text-[1rem] leading-[1.85] text-[#3a2f23]">
            Chaque élément porte une nature, un rythme et une façon de nous parler. Cet extrait du livre Nature &amp; Ayurveda pose les bases, simplement, pour que les saisons, les aliments et les humeurs deviennent un peu plus lisibles. On y reconnaît ce qui nous compose, et ce qui nous déstabilise quand un élément prend trop de place.
          </p>
        </Reveal>

        <div className="mt-14 border-b border-[#1c1712]/12">
          {ELEMENTS.map((el, i) => (
            <Reveal key={el.nom} delay={Math.min(i * 0.05, 0.2)}>
              <div className="grid grid-cols-12 items-baseline gap-x-4 gap-y-2 border-t border-[#1c1712]/12 py-7 md:py-8">
                <span className="col-span-3 v2-serif font-light text-[clamp(1.5rem,2.6vw,2.3rem)] leading-none text-[#1c1712] md:col-span-2">{el.nom}</span>
                <span className="col-span-9 text-[0.62rem] uppercase tracking-[0.24em] text-[#7d6330] md:col-span-3">{el.sanskrit}</span>
                <span className="col-span-12 text-[0.95rem] leading-relaxed text-[#3a2f23] md:col-span-7">{el.qualites} &middot; {el.note}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────── CHAPITRE 02 · FEUILLETER ─────────── */}
      <section id="feuilleter" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#f4efe6] py-[clamp(6rem,15vh,11rem)]`}>
        <Reveal className="max-w-[640px]">
          <Kicker className="mb-5">Chapitre 02 · Feuilleter</Kicker>
          <TitreChapitre>Un aperçu de l'intérieur</TitreChapitre>
          <p className="mt-7 max-w-[56ch] text-[1rem] leading-[1.85] text-[#3a2f23]">
            L'extrait se lit comme un carnet : une planche par élément, ses qualités, ce qu'il éveille. Voici quatre pages du PDF, telles qu'elles sont mises en page, entrevues seulement : la version complète et lisible vous arrive par courriel.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 lg:mx-auto lg:max-w-[880px] lg:grid-cols-2">
          {PAGES_EXEMPLES.map((p, i) => (
            <PageExemple key={p.num} src={p.src} num={p.num} i={i} />
          ))}
        </div>

        <Reveal className="mt-16 flex justify-center">
          <a
            href="#telecharger"
            className="group inline-flex min-h-[46px] items-center justify-center gap-2.5 bg-[#1c1712] px-7 py-3.5 text-[0.68rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44]"
          >
            Recevoir l'extrait complet <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </Reveal>
      </section>

      {/* ─────────── CHAPITRE 03 · TÉLÉCHARGER ─────────── */}
      <section id="telecharger" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#f4efe6] py-[clamp(6rem,15vh,11rem)]`}>
        <div className="grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <Kicker className="mb-5">Chapitre 03 · Télécharger</Kicker>
            <TitreChapitre className="max-w-[14ch]">L'extrait est à vous</TitreChapitre>
            <Filet className="mt-7" />
            <p className="mt-8 max-w-[52ch] text-[1rem] leading-[1.85] text-[#3a2f23]">
              Laissez votre courriel et l'extrait part tout de suite, en PDF. Avec un compte, il vous attend aussi dans votre espace, à la section Téléchargements, pour toujours.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-[#3a2f23]">
                <Check size={18} weight="light" className="mt-0.5 text-[#7d6330] shrink-0" /> Le fichier PDF, dans sa mise en page originale.
              </li>
              <li className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-[#3a2f23]">
                <Check size={18} weight="light" className="mt-0.5 text-[#7d6330] shrink-0" /> L'infolettre de Krystine, pour recevoir les prochains extraits et parutions.
              </li>
              <li className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-[#3a2f23]">
                <Check size={18} weight="light" className="mt-0.5 text-[#7d6330] shrink-0" /> Désinscription en un clic, à tout moment.
              </li>
            </ul>
          </Reveal>

          <Reveal>
            <CarteVerte>
              <div className="p-7 md:p-9">
                <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#BA7B39]">Le téléchargement</p>
                <p className="mt-3 v2-serif font-light text-[clamp(1.5rem,2.4vw,2.1rem)] leading-[1.12]">
                  Nature &amp; Ayurveda
                </p>
                <p className="mt-2 text-[0.92rem] leading-[1.7] text-[#EEE7DB]/75">
                  Extrait · Les 5 éléments et leurs qualités · Éditions de l'Homme, 2018
                </p>

                {url ? (
                  <div className="mt-7">
                    <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#BA7B39]">Votre extrait est prêt</p>
                    <a
                      href={url}
                      className="mt-5 inline-flex items-center gap-3 rounded-full bg-[#BA7B39] px-6 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#1c1712] transition-colors duration-300 hover:bg-[#d9a05b]"
                    >
                      <DownloadSimple size={15} weight="bold" /> Enregistrer le PDF
                    </a>
                    <p className="mt-5 text-[0.92rem] leading-[1.7] text-[#EEE7DB]/75">
                      {user
                        ? "L'extrait est aussi dans votre espace, section Téléchargements."
                        : 'Le lien reste valide deux heures. Avec un compte, l\'extrait vous attend pour toujours dans votre espace.'}
                    </p>
                    {!user && (
                      <CompteUpsell variant="dark" texte="Avec un compte, l'extrait vous attend pour toujours dans votre espace." />
                    )}
                  </div>
                ) : user ? (
                  <div className="mt-7">
                    <p className="text-[0.92rem] leading-[1.7] text-[#EEE7DB]/75">
                      Un seul geste : l'extrait s'ajoute à votre espace et le fichier part tout de suite.
                    </p>
                    <button
                      type="button"
                      onClick={() => obtenir()}
                      disabled={busy}
                      className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#BA7B39] px-6 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#1c1712] transition-colors duration-300 hover:bg-[#d9a05b] disabled:opacity-60"
                    >
                      <DownloadSimple size={15} weight="bold" /> {busy ? 'Un instant…' : 'Télécharger l\'extrait'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={obtenir} noValidate className="mt-7">
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 border-b border-[#EEE7DB]/25 pb-3">
                        <User size={16} weight="light" className="text-[#BA7B39] shrink-0" />
                        <input className={champ} type="text" placeholder="Prénom" autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} aria-label="Prénom" />
                      </div>
                      <div className="flex items-center gap-3 border-b border-[#EEE7DB]/25 pb-3">
                        <EnvelopeSimple size={16} weight="light" className="text-[#BA7B39] shrink-0" />
                        <input className={champ} type="email" placeholder="Votre courriel" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Votre courriel" required />
                      </div>
                    </div>
                    <label className="mt-6 flex cursor-pointer items-start gap-3 text-[0.92rem] leading-relaxed text-[#EEE7DB]/75">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#BA7B39]" />
                      <span>Je veux recevoir l'extrait et l'infolettre de Krystine. Désinscription en un clic, à tout moment.</span>
                    </label>
                    {RECAPTCHA_SITE_KEY && <div ref={captcha.boxRef} className="mt-6" />}
                    <button
                      type="submit"
                      disabled={busy}
                      className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#BA7B39] px-6 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#1c1712] transition-colors duration-300 hover:bg-[#d9a05b] disabled:opacity-60"
                    >
                      <DownloadSimple size={15} weight="bold" /> {busy ? 'Un instant…' : 'Télécharger l\'extrait'}
                    </button>
                    <p className="mt-5 text-[0.92rem] leading-[1.7] text-[#EEE7DB]/75">
                      Vous avez déjà un compte ?{' '}
                      <button type="button" onClick={() => setSignInOpen(true)} className="border-b border-[#BA7B39]/60 pb-0.5 text-[#d9a05b] transition-colors hover:text-[#EEE7DB]">
                        Connectez-vous
                      </button>
                      {' '}et l'extrait s'ajoute à votre espace.
                    </p>
                  </form>
                )}

                {erreur && <p role="alert" className="mt-4 text-[0.92rem] text-[#e0a58a]">{erreur}</p>}
              </div>
            </CarteVerte>
          </Reveal>
        </div>
      </section>

      {/* ─────────── LA PARENTÉ · un dernier mot, un geste ─────────── */}
      <section className={`relative w-full ${GOUTTIERE} bg-[#efe6d7] py-[clamp(5rem,12vh,9rem)]`}>
        <Reveal className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-[560px]">
            <Kicker className="mb-5">Plus loin</Kicker>
            <TitreChapitre className="max-w-[16ch]">Les saisons, les livres, la voix</TitreChapitre>
            <p className="mt-6 max-w-[52ch] text-[1rem] leading-[1.85] text-[#3a2f23]">
              Nature &amp; Ayurveda est le premier tome d'une trilogie. Le podcast, les formations et les prochains livres continuent le même fil : relier ce que nous avons appris à séparer.
            </p>
          </div>
          <a
            href="/medias"
            className="group inline-flex shrink-0 items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44]"
          >
            Découvrir les livres <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </Reveal>
      </section>
    </div>
  );
};

export default CinqElementsPage;
