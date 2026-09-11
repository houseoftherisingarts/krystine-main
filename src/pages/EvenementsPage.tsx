import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { getEvents, getEventsPublics, type EventDoc } from '../firebase/firestore';
import { Feuille, Atmosphere, Seam, KenBurns } from '../components/motion/loeuvre';
import WaitlistModal, { type WaitlistTarget } from '../components/WaitlistModal';
import ConferenceTourModal from '../components/ConferenceTourModal';
import RideauEntree from '../components/evenements/RideauEntree';
import EtiquetteNature from '../components/evenements/EtiquetteNature';
import { fondre, type RendezVous, type Geste } from '../lib/evenements';

/**
 * Le calendrier des rendez-vous (refonte du 11 septembre 2026), lu comme
 * l'affiche d'une salle : le rendez-vous vedette en pleine largeur, puis
 * l'index des dates avec le jour en grand. Les événements viennent de deux
 * sources fondues (src/lib/evenements.ts) : la collection Firestore publiée
 * et la programmation curée. Une administratrice voit aussi les brouillons.
 */

const EASE = [0.16, 0.8, 0.24, 1] as const;
const GUT = 'px-[clamp(1.25rem,4vw,4.5rem)]';
const G12 = 'grid grid-cols-12 gap-x-[clamp(1rem,2.5vw,3rem)]';

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 28, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.12 }}
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

/* ── Le geste d'un rendez-vous : réserver, s'inscrire, la liste, la tournée ── */
const BoutonGeste: React.FC<{
  geste: Geste;
  lang: 'FR' | 'EN';
  ton?: 'clair' | 'sombre';
  onListe: (t: WaitlistTarget) => void;
  onTournee: () => void;
}> = ({ geste, lang, ton = 'clair', onListe, onTournee }) => {
  const fr = lang === 'FR';
  const libelle = fr ? geste.libelle.fr : geste.libelle.en;
  const plein = 'inline-flex min-h-[46px] items-center gap-3 rounded-full bg-brass px-7 py-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright';
  const creux = ton === 'sombre'
    ? 'inline-flex min-h-[46px] items-center gap-3 rounded-full border border-ctext/30 px-7 py-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ctext transition-colors hover:border-brass hover:text-brass'
    : 'inline-flex min-h-[46px] items-center gap-3 rounded-full border border-ink/25 px-7 py-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:border-brass hover:text-brassInk';
  const fleche = <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden />;
  switch (geste.type) {
    case 'reserver':
    case 'interne':
      return <Link to={geste.href!} className={geste.type === 'reserver' ? plein : creux}>{libelle} {fleche}</Link>;
    case 'lien':
      return <a href={geste.href} target="_blank" rel="noopener noreferrer" className={plein}>{libelle} <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden /></a>;
    case 'liste':
      return <button type="button" onClick={() => geste.liste && onListe(geste.liste)} className={creux}>{libelle} {fleche}</button>;
    case 'tournee':
      return <button type="button" onClick={onTournee} className={creux}>{libelle} {fleche}</button>;
    case 'complet':
      return <span className={`text-[0.72rem] font-bold uppercase tracking-[0.18em] ${ton === 'sombre' ? 'text-ctextSoft' : 'text-inkSoft'}`}>{libelle}</span>;
    default:
      return <span className={`text-[0.78rem] ${ton === 'sombre' ? 'text-ctextSoft' : 'text-inkSoft'}`}>{libelle}</span>;
  }
};

/* ── La date en grand : le jour quand il est connu, sinon le mois seul ── */
const DateGrande: React.FC<{ r: RendezVous; lang: 'FR' | 'EN'; ton?: 'clair' | 'sombre' }> = ({ r, lang, ton = 'clair' }) => {
  const fr = lang === 'FR';
  const encre = ton === 'sombre' ? 'text-ctext' : 'text-ink';
  const doux = ton === 'sombre' ? 'text-ctextSoft' : 'text-brassInk';
  if (r.jour) {
    return (
      <div className="flex items-start gap-3">
        <span className={`font-serif leading-[0.85] text-[clamp(3rem,5.4vw,4.8rem)] ${encre}`}>{r.jour}</span>
        <span className={`pt-1.5 text-[0.62rem] font-bold uppercase leading-[1.5] tracking-[0.22em] ${doux}`}>
          {fr ? r.mois.fr : r.mois.en}<br />{r.annee}
        </span>
      </div>
    );
  }
  return <p className={`font-serif text-[clamp(1.15rem,1.7vw,1.4rem)] leading-tight ${encre}`}>{fr ? r.mois.fr : r.mois.en}</p>;
};

const EvenementsPage: React.FC = () => {
  const { lang, isAdmin } = useApp();
  const fr = lang === 'FR';
  const reduce = useReducedMotion();

  const [events, setEvents] = useState<EventDoc[]>([]);
  const [charge, setCharge] = useState(true);
  const [liste, setListe] = useState<WaitlistTarget | null>(null);
  const [tournee, setTournee] = useState(false);
  const [survol, setSurvol] = useState<{ src: string; x: number; y: number } | null>(null);
  const peutSurvoler = useRef(false);

  useEffect(() => {
    (isAdmin ? getEvents() : getEventsPublics()).then(setEvents).catch(() => setEvents([])).finally(() => setCharge(false));
  }, [isAdmin]);
  useEffect(() => { try { peutSurvoler.current = window.matchMedia('(hover: hover) and (min-width: 1024px)').matches; } catch { /* rien */ } }, []);

  const { aVenir, passes, vedette } = useMemo(() => fondre(events, isAdmin), [events, isAdmin]);
  const index = aVenir.filter(r => r.cle !== vedette?.cle);

  // L'allumage de la vedette : la photo recule et le voile s'ouvre au premier défilement.
  const cadre = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: cadre, offset: ['start end', 'end start'] });
  const echelle = useTransform(scrollYProgress, [0, 0.5, 1], [1.04, 1, 0.96]);
  const voile = useTransform(scrollYProgress, [0, 0.45], [0.75, 0.3]);

  const suivre = (r: RendezVous) => (e: React.MouseEvent) => {
    if (!peutSurvoler.current || !r.image) return;
    setSurvol({ src: r.image, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="bg-cream font-sans text-ink antialiased">
      <RideauEntree cle="evenements" mot={fr ? 'Les rendez-vous' : 'The gatherings'} />

      {/* ─────────── FEUILLE 1 · LE SEUIL ─────────── */}
      <Feuille z={1} premiere>
        <section className="relative w-full bg-cream pt-[7rem] md:pt-[9rem]">
          <div className={`w-full ${GUT} ${G12} items-end gap-y-8 pb-14 md:pb-24`}>
            <motion.div
              className="col-span-12 md:col-span-5 lg:col-span-4"
              initial={reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.1 }}
            >
              <Eyebrow>{fr ? 'Calendrier 2026 · 2027' : 'Calendar 2026 · 2027'}</Eyebrow>
              <p className="mt-5 max-w-[38ch] text-[1rem] leading-[1.85] text-inkSoft">
                {fr
                  ? 'Les lancements, les retraites, les conférences et les rendez-vous en ligne où Krystine est là. Chaque date mène à sa réservation ou à sa liste d’attente.'
                  : 'The launches, retreats, talks and online gatherings where Krystine is present. Every date leads to its reservation or its waitlist.'}
              </p>
              {!charge && (
                <p className="mt-6 font-serif text-[1.15rem] text-ink">
                  {aVenir.length} {fr ? (aVenir.length > 1 ? 'rendez-vous à venir' : 'rendez-vous à venir') : (aVenir.length > 1 ? 'upcoming gatherings' : 'upcoming gathering')}
                </p>
              )}
            </motion.div>
            <motion.h1
              className="col-span-12 font-serif font-medium leading-[0.84] text-ink text-[clamp(3.6rem,10vw,8.6rem)] md:col-span-7 md:text-right lg:col-span-8"
              style={{ letterSpacing: '-0.015em' }}
              initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.3, ease: EASE, delay: 0.2 }}
            >
              {fr ? <>Les<br />rendez-vous</> : <>Where to<br />meet Krystine</>}
            </motion.h1>
          </div>

        </section>
      </Feuille>

      {/* ─────────── FEUILLE 2 · LE RENDEZ-VOUS VEDETTE ─────────── */}
      {vedette && (
        <Feuille z={2}>
            <div ref={cadre} className="relative h-[86vh] min-h-[560px] w-full overflow-hidden bg-espressoDeep">
              <motion.div className="absolute inset-0" style={reduce ? undefined : { scale: echelle }}>
                {vedette.image ? <KenBurns src={vedette.image} className="object-[36%_50%] md:object-center" /> : null}
              </motion.div>
              <Atmosphere strength={vedette.image ? 0.5 : 1} light="24% 20%" vignette={false} />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ opacity: reduce ? 0.45 : voile, background: 'linear-gradient(to top, rgba(22,16,10,0.96) 0%, rgba(22,16,10,0.7) 40%, rgba(22,16,10,0.25) 75%, rgba(22,16,10,0.05) 100%)' }}
              />
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(22,16,10,0.85) 0%, transparent 55%)' }} />

              <div className={`absolute inset-x-0 top-6 flex items-center gap-3 md:top-8 ${GUT}`}>
                <Eyebrow on="dark">{fr ? 'Le prochain grand rendez-vous' : 'The next big gathering'}</Eyebrow>
                <EtiquetteNature nature={vedette.nature} lang={lang} ton="sombre" />
                {vedette.brouillon && <span className="rounded-full border border-red-300/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-200">{fr ? 'Non publié' : 'Unpublished'}</span>}
              </div>

              <div className={`absolute inset-x-0 bottom-0 pb-8 md:pb-12 ${GUT}`}>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <Reveal className="flex items-end gap-5 md:gap-8">
                    <div className="shrink-0">
                      {vedette.jour ? (
                        <>
                          <p className="font-serif leading-[0.8] text-brassBright text-[clamp(4.6rem,13vw,11rem)]" style={{ letterSpacing: '-0.03em' }}>{vedette.jour}</p>
                          <p className="mt-2 text-[0.66rem] font-bold uppercase tracking-[0.28em] text-ctextSoft">{fr ? vedette.mois.fr : vedette.mois.en} {vedette.annee}</p>
                        </>
                      ) : (
                        <p className="font-serif text-[clamp(1.4rem,3vw,2.4rem)] leading-tight text-brassBright">{fr ? vedette.mois.fr : vedette.mois.en}</p>
                      )}
                    </div>
                    <div className="min-w-0 pb-1">
                      <h2 className="line-clamp-2 max-w-[18ch] font-serif font-medium leading-[0.98] text-ctext text-[clamp(1.9rem,4.4vw,3.9rem)] [text-shadow:0_2px_30px_rgba(0,0,0,0.6)]">
                        {fr ? vedette.titre.fr : vedette.titre.en}
                      </h2>
                      {vedette.sousTitre && <p className="mt-3 line-clamp-2 max-w-[44ch] font-serif text-[clamp(1rem,1.5vw,1.3rem)] leading-snug text-ctextSoft">{fr ? vedette.sousTitre.fr : vedette.sousTitre.en}</p>}
                      {vedette.lieu && <p className="mt-3 text-[0.85rem] text-ctextSoft"><i className="fa-solid fa-location-dot mr-2 text-brass" />{fr ? vedette.lieu.fr : vedette.lieu.en}</p>}
                    </div>
                  </Reveal>
                  <Reveal delay={0.15} className="shrink-0">
                    <BoutonGeste geste={vedette.geste} lang={lang} ton="sombre" onListe={setListe} onTournee={() => setTournee(true)} />
                  </Reveal>
                </div>
              </div>
            </div>
        </Feuille>
      )}

      {/* ─────────── FEUILLE 3 · L'INDEX ─────────── */}
      <Feuille z={3}>
        <section className="relative bg-cream2 py-20 md:py-28">
          {vedette && <Seam from="#16100a" height={90} />}
          <div className={`relative w-full ${GUT}`}>
            <Reveal>
              <Eyebrow>{fr ? 'Toutes les dates' : 'Every date'}</Eyebrow>
              <h2 className="mt-4 max-w-[18ch] font-serif font-medium leading-[1.02] text-ink text-[clamp(2rem,3.8vw,3.2rem)]">
                {fr ? 'Où et quand nous nous retrouvons' : 'Where and when we gather'}
              </h2>
              <DrawRule className="mt-6 w-24" />
            </Reveal>

            {charge ? (
              <div className="flex justify-center py-16"><div className="h-9 w-9 animate-spin rounded-full border-2 border-brass border-t-transparent" /></div>
            ) : index.length === 0 && !vedette ? (
              <p className="mt-10 max-w-[40ch] font-serif text-[1.4rem] leading-snug text-ink">
                {fr ? 'Aucune date n’est encore ouverte. Les prochaines s’écrivent ici dès qu’elles se confirment.' : 'No date is open yet. The next ones appear here as soon as they are confirmed.'}
              </p>
            ) : (
              <div className="mt-12 border-b border-ink/12 md:mt-16">
                {index.map((r, i) => (
                  <Reveal key={r.cle} delay={Math.min(i * 0.05, 0.2)}>
                    <div
                      className="group grid grid-cols-12 items-center gap-x-4 gap-y-4 border-t border-ink/12 py-7 transition-colors hover:bg-cream md:py-9"
                      onMouseEnter={suivre(r)}
                      onMouseMove={suivre(r)}
                      onMouseLeave={() => setSurvol(null)}
                    >
                      <div className="col-span-5 md:col-span-2">
                        <DateGrande r={r} lang={lang} />
                      </div>
                      <div className="col-span-7 md:col-span-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <EtiquetteNature nature={r.nature} lang={lang} />
                          {r.brouillon && <span className="rounded-full border border-red-400/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-700">{fr ? 'Non publié' : 'Unpublished'}</span>}
                        </div>
                        <h3 className="mt-3 line-clamp-2 font-serif font-medium leading-[1.08] text-ink text-[clamp(1.4rem,2.4vw,2.1rem)]">{fr ? r.titre.fr : r.titre.en}</h3>
                        {r.sousTitre && <p className="mt-1.5 line-clamp-2 max-w-[52ch] text-[0.95rem] leading-relaxed text-inkSoft">{fr ? r.sousTitre.fr : r.sousTitre.en}</p>}
                        {r.lieu && <p className="mt-2 text-[0.82rem] text-inkSoft"><i className="fa-solid fa-location-dot mr-2 text-brassInk" />{fr ? r.lieu.fr : r.lieu.en}</p>}
                      </div>
                      <div className="col-span-12 md:col-span-4 md:text-right">
                        <BoutonGeste geste={r.geste} lang={lang} onListe={setListe} onTournee={() => setTournee(true)} />
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 4 · FAIRE VENIR KRYSTINE ─────────── */}
      <Feuille z={4}>
        <section className="relative overflow-hidden bg-espressoDeep py-20 md:py-28">
          <Atmosphere strength={0.9} light="74% 16%" />
          <div className={`relative w-full ${GUT} ${G12} items-end gap-y-10`}>
            <Reveal className="col-span-12 lg:col-span-7">
              <Eyebrow on="dark">{fr ? 'La tournée' : 'The tour'}</Eyebrow>
              <h2 className="mt-4 max-w-[16ch] font-serif font-medium leading-[0.98] text-ctext text-[clamp(2.2rem,5vw,4.4rem)]">
                {fr ? 'Faire venir Krystine chez vous' : 'Bring Krystine to you'}
              </h2>
              <p className="mt-6 max-w-[54ch] text-[1.02rem] leading-[1.85] text-ctextSoft">
                {fr
                  ? 'Krystine donne des conférences et des ateliers aux entreprises, aux écoles et aux groupes, en français et en anglais. Dites-lui où et quand, et elle vous répond.'
                  : 'Krystine gives talks and workshops to companies, schools and groups, in French and in English. Tell her where and when, and she answers you.'}
              </p>
            </Reveal>
            <Reveal delay={0.12} className="col-span-12 flex flex-wrap gap-4 lg:col-span-5 lg:justify-end">
              <button type="button" onClick={() => setTournee(true)} className="inline-flex min-h-[48px] items-center gap-3 rounded-full bg-brass px-8 py-3.5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright">
                {fr ? 'Demander une date' : 'Request a date'} <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden />
              </button>
              <Link to="/conferenciere" className="inline-flex min-h-[48px] items-center gap-3 rounded-full border border-ctext/30 px-8 py-3.5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ctext transition-colors hover:border-brass hover:text-brass">
                {fr ? 'La conférencière' : 'The speaker'}
              </Link>
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 5 · CE QUI A EU LIEU ─────────── */}
      {passes.length > 0 && (
        <Feuille z={5}>
          <section className="relative bg-cream py-20 md:py-24">
            <Seam from="#16100a" height={90} />
            <div className={`relative w-full ${GUT}`}>
              <Reveal>
                <Eyebrow>{fr ? 'Ce qui a eu lieu' : 'What took place'}</Eyebrow>
                <DrawRule className="mt-5 w-24" />
              </Reveal>
              <div className="mt-10 border-b border-ink/10">
                {passes.map(r => (
                  <div key={r.cle} className="grid grid-cols-12 items-center gap-x-4 border-t border-ink/10 py-5 opacity-60">
                    <div className="col-span-5 md:col-span-2"><DateGrande r={r} lang={lang} /></div>
                    <div className="col-span-7 md:col-span-8">
                      <p className="font-serif leading-tight text-ink text-[clamp(1.1rem,1.7vw,1.4rem)]">{fr ? r.titre.fr : r.titre.en}</p>
                      {r.lieu && <p className="mt-1 text-[0.8rem] text-inkSoft">{fr ? r.lieu.fr : r.lieu.en}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Feuille>
      )}

      {/* La vignette qui suit le curseur sur l'index, grand écran seulement */}
      {survol && (
        <img
          src={survol.src}
          alt=""
          aria-hidden
          className="pointer-events-none fixed z-30 hidden w-[260px] rounded-[12px] shadow-[0_30px_60px_-20px_rgba(29,22,4,0.5)] lg:block"
          style={{ left: survol.x + 24, top: survol.y - 80 }}
        />
      )}

      <WaitlistModal target={liste} onClose={() => setListe(null)} />
      <ConferenceTourModal open={tournee} onClose={() => setTournee(false)} />
    </div>
  );
};

export default EvenementsPage;
