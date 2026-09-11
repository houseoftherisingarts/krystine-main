import React, { useEffect, useRef } from 'react';
import { useParams, useLocation, Navigate, Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { getEventParSlug, enVente, placesRestantes, type EventDoc } from '../firebase/firestore';
import { enDollars } from '../firebase/billets';
import { Feuille, Atmosphere, Parallax, Seam, KenBurns } from '../components/motion/loeuvre';
import BandeauApercu from '../components/edit/BandeauApercu';
import RideauEntree from '../components/evenements/RideauEntree';
import BilletCarte from '../components/evenements/BilletCarte';
import EtiquetteNature from '../components/evenements/EtiquetteNature';
import { natureDe } from '../lib/evenements';

/**
 * Le programme de soirée d'un événement (refonte du 11 septembre 2026). La
 * page se fabrique entièrement à partir du document Firestore (EventDoc) :
 * le hero plein écran avec le lieu photographié, la soirée en actes, le
 * lieu raconté, l'encart au cœur de la page, puis le billet dessiné comme
 * un billet. Le paiement passe toujours par creerSessionBillets.
 */

const EASE = [0.16, 0.8, 0.24, 1] as const;
const GUT = 'px-[clamp(1.25rem,4vw,4.5rem)]';
const G12 = 'grid grid-cols-12 gap-x-[clamp(1rem,2.5vw,3rem)]';
const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 28, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] font-bold uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>{children}</p>
);

const DrawRule: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div
    aria-hidden
    className={`h-px bg-brass ${className}`}
    style={{ transformOrigin: 'left center' }}
    initial={{ scaleX: 0 }}
    whileInView={{ scaleX: 1 }}
    viewport={{ once: true, amount: 0.7 }}
    transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
  />
);

/** « Le lancement du troisième livre » → « Le lancement » / « du troisième livre ». Deux lignes, jamais plus. */
const deuxLignes = (titre: string): string[] => {
  if (titre.includes('\n')) return titre.split('\n').slice(0, 2);
  const mots = titre.replace(/\s+/g, ' ').trim().split(' ');
  if (mots.length <= 2) return [titre];
  const coupe = Math.floor(mots.length / 2);
  return [mots.slice(0, coupe).join(' '), mots.slice(coupe).join(' ')];
};

const EvenementVente: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { lang, isAdmin } = useApp();
  const fr = lang === 'FR';
  const apercu = new URLSearchParams(location.search).get('apercu') === '1';
  const reduce = useReducedMotion();

  const [event, setEvent] = React.useState<EventDoc | null | undefined>(undefined);
  useEffect(() => {
    if (!slug) return;
    getEventParSlug(slug).then(setEvent).catch(() => setEvent(null));
  }, [slug]);

  // L'allumage : au premier défilement la photo recule et le voile se ferme.
  const cadre = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: cadre, offset: ['start start', 'end start'] });
  const echelle = useTransform(scrollYProgress, [0, 1], [1, 0.93]);
  const monte = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const voile = useTransform(scrollYProgress, [0, 0.8], [0.35, 0.9]);

  if (event === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-brass border-t-transparent" />
      </div>
    );
  }

  // Une administratrice en aperçu voit la page même non publiée; une
  // visiteuse ordinaire est renvoyée au calendrier.
  const peutVoir = !!event && (event.isPublished !== false || (isAdmin && apercu));
  if (!peutVoir) return <Navigate to="/evenements" replace />;
  const ev = event as EventDoc;
  const enApercu = isAdmin && apercu && ev.isPublished === false;

  const [a, m, j] = ev.date.split('-');
  const jour = String(Number(j));
  const mois = fr ? MOIS_FR[Number(m) - 1] : MOIS_EN[Number(m) - 1];
  const dateLongue = new Date(Number(a), Number(m) - 1, Number(j)).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const image = ev.imageHero || ev.imageUrl || '';
  const nature = natureDe(ev);
  const ouverts = enVente(ev) || (enApercu && !!ev.billetterie && !!ev.prixCents);
  const restantes = placesRestantes(ev);
  const argumentaire = ev.argumentaire || [];
  const programme = ev.programme || [];
  const lieuTexte = ev.lieuTexte || [];
  const inclus = ev.inclus || [];
  const adresse = ev.adresse || ev.location || '';
  const itineraire = adresse ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}` : '';
  let z = 1;

  return (
    <div className="bg-cream font-sans text-ink antialiased">
      <RideauEntree cle={`evenement-${slug}`} mot={`${jour} ${mois} ${a}`} />

      {enApercu && (
        <BandeauApercu>
          {fr ? 'Aperçu administratrice : cette page n’est pas encore publiée.' : 'Administrator preview: this page is not published yet.'}
        </BandeauApercu>
      )}

      {/* ─────────── FEUILLE 1 · LE SEUIL ─────────── */}
      <Feuille z={z++} premiere>
        <section ref={cadre} className="relative h-[92vh] min-h-[600px] w-full overflow-hidden bg-espressoDeep">
          <motion.div className="absolute inset-0" style={reduce ? undefined : { scale: echelle, y: monte }}>
            {image ? <KenBurns src={image} className="object-[30%_50%] md:object-center" /> : <Atmosphere strength={1} />}
          </motion.div>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ opacity: reduce ? 0.6 : voile, background: 'linear-gradient(to top, rgba(22,16,10,0.92) 0%, rgba(22,16,10,0.45) 34%, rgba(22,16,10,0.12) 60%, transparent 100%)' }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(22,16,10,0.78) 0%, rgba(22,16,10,0.42) 34%, transparent 58%)' }} />
          <Atmosphere strength={0.5} vignette={false} light="18% 22%" />

          {/* Le titre, en haut à gauche, dans le ciel sombre de la photo. */}
          <motion.div
            className={`absolute inset-x-0 top-[6.5rem] md:top-[8rem] ${GUT}`}
            initial={reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.1 }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Eyebrow on="dark">{ev.isFeatured ? (fr ? 'Lancement · Éditions de l’Homme' : 'Launch · Éditions de l’Homme') : (fr ? 'Rendez-vous' : 'Gathering')}</Eyebrow>
              <EtiquetteNature nature={nature} lang={lang} ton="sombre" />
            </div>
            <h1 className="mt-5 font-serif font-medium text-ctext leading-[0.92] text-[clamp(2.7rem,7.2vw,6.6rem)] [text-shadow:0_2px_40px_rgba(0,0,0,0.55)]" style={{ letterSpacing: '-0.01em' }}>
              {deuxLignes(ev.title).map((l, i) => <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>)}
            </h1>
            {ev.subtitle && (
              <p className="mt-5 max-w-[40ch] font-serif text-[clamp(1.1rem,1.8vw,1.5rem)] leading-snug text-ctextSoft [text-shadow:0_1px_20px_rgba(0,0,0,0.6)]">{ev.subtitle}</p>
            )}
          </motion.div>

          {/* Les deux panneaux de verre : la date et le lieu, puis le prix et le geste. */}
          <div className={`absolute inset-x-0 bottom-0 pb-7 md:pb-11 ${GUT}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <motion.div
                className="flex items-center gap-5 rounded-[18px] border border-brass/30 bg-[#16100a]/70 px-5 py-4 backdrop-blur-md md:gap-7 md:px-6 md:py-5"
                initial={reduce ? false : { opacity: 0, y: 26, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
              >
                <div className="text-center">
                  <p className="font-serif text-[clamp(3rem,5.4vw,4.8rem)] leading-none text-brassBright">{jour}</p>
                  <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.26em] text-ctextSoft">{mois} {a}</p>
                </div>
                <div className="h-14 w-px bg-brass/30" aria-hidden />
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-brass">{fr ? 'La soirée' : 'The evening'}</p>
                  <p className="mt-1.5 font-serif text-[clamp(1.1rem,1.9vw,1.6rem)] leading-tight text-ctext">
                    {dateLongue}{ev.heure ? ` · ${ev.heure}` : ''}
                  </p>
                  {(ev.location || ev.adresse) && (
                    <p className="mt-1 text-[0.85rem] text-ctextSoft"><i className="fa-solid fa-location-dot mr-2 text-brass" />{ev.location}{ev.adresse && ev.location ? ' · ' : ''}{ev.adresse}</p>
                  )}
                </div>
              </motion.div>

              {ev.billetterie && (
                <motion.a
                  href="#billet"
                  className="group flex items-center justify-between gap-6 rounded-[18px] border border-brass/30 bg-[#16100a]/70 px-5 py-4 backdrop-blur-md transition-colors hover:border-brass/60 md:px-6 md:py-5 lg:w-[min(30rem,40vw)]"
                  initial={reduce ? false : { opacity: 0, y: 26, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 1.1, ease: EASE, delay: 0.4 }}
                >
                  <div>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-brass">{fr ? 'Votre billet' : 'Your ticket'}</p>
                    {ouverts ? (
                      <>
                        <p className="mt-1.5 font-serif text-[clamp(1.5rem,2.6vw,2.2rem)] leading-none text-ctext">{enDollars(ev.prixCents!)}</p>
                        <p className="mt-1.5 text-[0.8rem] text-ctextSoft">
                          {restantes <= 1 ? (fr ? 'Il reste une place.' : 'One seat left.') : (fr ? `Il reste ${restantes} places.` : `${restantes} seats left.`)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1.5 font-serif text-[1.2rem] leading-tight text-ctext">{fr ? 'Complet' : 'Sold out'}</p>
                    )}
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brass text-espressoDeep transition-colors group-hover:bg-brassBright">
                    <i className="fa-solid fa-arrow-down text-[13px]" />
                  </span>
                </motion.a>
              )}
            </div>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 2 · LA SOIRÉE ─────────── */}
      {(argumentaire.length > 0 || programme.length > 0) && (
        <Feuille z={z++}>
          <section className="relative bg-cream py-20 md:py-28">
            <Seam from="#16100a" height={90} />
            <div className={`relative w-full ${GUT} ${G12} gap-y-12`}>
              <div className="col-span-12 lg:col-span-5">
                <div className="lg:sticky lg:top-28">
                  <Reveal>
                    <Eyebrow>{fr ? 'La soirée' : 'The evening'}</Eyebrow>
                    <h2 className="mt-4 max-w-[16ch] font-serif font-medium leading-[1.02] text-ink text-[clamp(2rem,3.8vw,3.2rem)]">
                      {fr ? 'Ce qui vous attend, acte par acte' : 'What awaits you, act by act'}
                    </h2>
                    <DrawRule className="mt-6 w-24" />
                  </Reveal>
                  {image && (
                    <Reveal delay={0.1} className="mt-10 hidden overflow-hidden rounded-[18px] lg:block">
                      <div className="relative aspect-[4/5] w-full">
                        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover object-[36%_50%]" loading="lazy" referrerPolicy="no-referrer" />
                      </div>
                    </Reveal>
                  )}
                </div>
              </div>
              <div className="col-span-12 lg:col-span-7">
                {argumentaire.length > 0 && (
                  <Reveal className="space-y-6">
                    {argumentaire.map((p, i) => (
                      <p key={i} className="max-w-[62ch] font-serif text-[clamp(1.15rem,1.7vw,1.45rem)] leading-[1.6] text-ink">{p}</p>
                    ))}
                  </Reveal>
                )}
                {programme.length > 0 && (
                  <div className={argumentaire.length ? 'mt-14' : ''}>
                    {programme.map((acte, i) => (
                      <Reveal key={i} delay={Math.min(i * 0.06, 0.2)} className="grid grid-cols-12 gap-x-5 border-t border-ink/10 py-9 md:py-11">
                        <p className="col-span-3 font-serif leading-none text-brass text-[clamp(2.6rem,5vw,4.6rem)] md:col-span-2">{ROMAINS[i] || i + 1}</p>
                        <div className="col-span-9 md:col-span-10">
                          <h3 className="font-serif font-medium leading-[1.1] text-ink text-[clamp(1.5rem,2.5vw,2.1rem)]">{acte.titre}</h3>
                          <p className="mt-3 max-w-[58ch] text-[1rem] leading-[1.85] text-inkSoft">{acte.texte}</p>
                        </div>
                      </Reveal>
                    ))}
                    <DrawRule className="w-full" />
                  </div>
                )}
              </div>
            </div>
          </section>
        </Feuille>
      )}

      {/* ─────────── FEUILLE 3 · LE LIEU ─────────── */}
      {lieuTexte.length > 0 && (
        <Feuille z={z++}>
          <section className="relative bg-cream2">
            <div className="relative h-[54vh] min-h-[340px] w-full overflow-hidden md:h-[68vh]">
              <Parallax speed={0.14} className="absolute inset-0" innerClassName="h-[130%] -mt-[15%]">
                <img src={ev.lieuImage || image} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
              </Parallax>
              <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(241,235,224,0) 60%, rgba(241,235,224,1) 100%)' }} />
            </div>
            <div className={`relative w-full ${GUT} ${G12} -mt-10 pb-20 md:-mt-16 md:pb-28`}>
              <Reveal className="col-span-12 md:col-span-5">
                <Eyebrow>{fr ? 'Le lieu' : 'The venue'}</Eyebrow>
                <h2 className="mt-4 max-w-[14ch] font-serif font-medium leading-[1.02] text-ink text-[clamp(2rem,3.8vw,3.2rem)]">{ev.location || (fr ? 'La salle' : 'The hall')}</h2>
                <DrawRule className="mt-6 w-24" />
                {ev.adresse && <p className="mt-6 text-[0.95rem] leading-relaxed text-inkSoft">{ev.adresse}</p>}
                {itineraire && (
                  <a href={itineraire} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-[44px] items-center gap-3 rounded-full border border-ink/25 px-6 py-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:border-brass hover:text-brassInk">
                    {fr ? 'Itinéraire' : 'Directions'} <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  </a>
                )}
              </Reveal>
              <Reveal delay={0.1} className="col-span-12 space-y-5 md:col-span-6 md:col-start-7 md:pt-8">
                {lieuTexte.map((p, i) => <p key={i} className="max-w-[60ch] text-[1.02rem] leading-[1.85] text-inkSoft">{p}</p>)}
              </Reveal>
            </div>
          </section>
        </Feuille>
      )}

      {/* ─────────── FEUILLE 4 · L'ENCART ─────────── */}
      {ev.encart?.titre && (
        <Feuille z={z++}>
          <section className="relative bg-cream py-20 md:py-28">
            <div className={`w-full ${GUT}`}>
              <div className="relative rounded-[22px] border border-brass/40 p-7 md:p-14">
                <span aria-hidden className="absolute inset-3 rounded-[16px] border border-brass/20 md:inset-4" />
                <div className={`relative ${G12} gap-y-10`}>
                  <Reveal className="col-span-12 lg:col-span-7">
                    <Eyebrow>{ev.encart.surtitre}</Eyebrow>
                    <h2 className="mt-5 max-w-[14ch] font-serif font-medium leading-[0.98] text-ink text-[clamp(2.4rem,5.4vw,4.8rem)]" style={{ letterSpacing: '-0.01em' }}>{ev.encart.titre}</h2>
                    <DrawRule className="mt-8 w-32" />
                    <div className="mt-8 space-y-5">
                      {ev.encart.texte.map((p, i) => <p key={i} className="max-w-[58ch] text-[1.02rem] leading-[1.85] text-inkSoft">{p}</p>)}
                    </div>
                  </Reveal>
                  {ev.encart.images && ev.encart.images.length > 0 && (
                    <Reveal delay={0.15} className="col-span-12 flex items-end justify-center gap-4 lg:col-span-5 lg:justify-end">
                      {ev.encart.images.slice(0, 3).map((src, i) => (
                        <motion.img
                          key={src}
                          src={src}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-[38%] max-w-[220px] rounded-[6px] shadow-[0_30px_60px_-24px_rgba(29,22,4,0.55)]"
                          style={{ rotate: i % 2 ? 3 : -3, y: i % 2 ? 0 : 14 }}
                        />
                      ))}
                    </Reveal>
                  )}
                </div>
              </div>
            </div>
          </section>
        </Feuille>
      )}

      {/* ─────────── FEUILLE 5 · LE BILLET ─────────── */}
      <Feuille z={z++}>
        <section className="relative overflow-hidden bg-espressoDeep py-20 md:py-28">
          <Atmosphere strength={0.8} light="72% 18%" />
          <div className={`relative w-full ${GUT} ${G12} gap-y-12`}>
            <Reveal className="col-span-12 lg:col-span-6">
              <Eyebrow on="dark">{fr ? 'Votre place' : 'Your seat'}</Eyebrow>
              <h2 className="mt-4 max-w-[16ch] font-serif font-medium leading-[1.02] text-ctext text-[clamp(2rem,3.8vw,3.2rem)]">
                {fr ? 'Ce que votre billet vous donne' : 'What your ticket gives you'}
              </h2>
              <DrawRule className="mt-6 w-24" />
              {inclus.length > 0 && (
                <ol className="mt-10 max-w-[52ch]">
                  {inclus.map((ligne, i) => (
                    <li key={i} className="flex items-baseline gap-5 border-t border-ctext/10 py-5">
                      <span className="w-8 shrink-0 font-serif text-[1.6rem] leading-none text-brass">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[1.02rem] leading-[1.7] text-ctext">{ligne}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Reveal>
            <Reveal delay={0.12} className="col-span-12 lg:col-span-5 lg:col-start-8">
              <BilletCarte ev={ev} lang={lang} apercu={enApercu} id="billet" />
            </Reveal>
          </div>
        </section>
      </Feuille>

      <div className={`flex flex-wrap items-center justify-between gap-4 bg-espressoDeep pb-24 pt-2 md:pb-10 ${GUT}`}>
        <Link to="/evenements" className="text-[0.68rem] font-bold uppercase tracking-widest text-ctextSoft transition-colors hover:text-brass">
          <i className="fa-solid fa-arrow-left mr-2" />{fr ? 'Tous les rendez-vous' : 'All gatherings'}
        </Link>
        {ev.credit && <p className="text-[0.68rem] text-ctextSoft/60">{ev.credit}</p>}
      </div>

      {/* Sur mobile, le bouton reste sous le pouce. */}
      {ev.billetterie && ouverts && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brass/25 bg-[#16100a]/85 px-4 py-3 backdrop-blur-md md:hidden">
          <a href="#billet" className="flex min-h-[48px] items-center justify-between rounded-full bg-brass px-6 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-espressoDeep">
            <span>{fr ? 'Réserver ma place' : 'Reserve my seat'}</span>
            <span className="font-serif text-[1.1rem] normal-case tracking-normal">{enDollars(ev.prixCents!)}</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default EvenementVente;
