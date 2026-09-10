import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Lock, BookOpen, Check, Headphones, Activity, Sparkles, Download } from 'lucide-react';
import { Atmosphere, Feuille, Parallax, Seam } from '../components/motion/loeuvre';
import { useUI, useAuth } from '../contexts/AppContext';
import { useSiteFlags } from '../contexts/SiteFlagsContext';
import { aAchete, acheterFormation, getFormation, type Formation } from '../firebase/formations';
import BoutonCompte from '../components/BoutonCompte';
import { PILLARS, WORKS, VALUE_ITEMS, FAQS, TESTIMONIALS } from './OrigineExperience';
import { SEMAINES, PILIERS_ORIGINE2, labelDebut } from './origine2/semaines';

/**
 * Expérience Origine 2 — le miroir de /origine (OrigineExperience.tsx) au
 * canon L'Œuvre : mêmes primitives, même rythme de feuilles empilées, mêmes
 * textes partagés (PILLARS, WORKS, VALUE_ITEMS, FAQS, TESTIMONIALS). Deux
 * différences seulement : les visuels de la deuxième cohorte, et la vente
 * réelle (useRejoindreOrigine2) là où /origine ne fait qu'inviter à la liste
 * d'attente. La grille des douze semaines, absente d'Origine 1, prend la
 * place de sa feuille « liste d'attente ». Alex, 10 septembre 2026.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

const GUT = 'px-[clamp(1.25rem,4vw,4.5rem)]';
const G12 = 'grid grid-cols-12 gap-x-[clamp(1rem,2.5vw,3rem)]';

const HERO_VIDEO = '/origine2/packshot.mp4';
const HERO_POSTER = '/origine2/packshot-poster.jpg';
const HERO_MOBILE = 'https://wsrv.nl/?url=storage.googleapis.com/origine1/origine%20portrait%20program.png&w=900&output=webp';
const TRILOGIE_IMG = 'https://wsrv.nl/?url=storage.googleapis.com/origine1/TRILOGIE.png&w=1200&output=webp';
const PROGRAMME_IMG = 'https://wsrv.nl/?url=storage.googleapis.com/origine1/Origine%20left%20wide.png&w=1600&output=webp';
const PORTRAIT = 'https://wsrv.nl/?url=storage.googleapis.com/origine1/krystine%20red%20NG.webp&w=1000&output=webp';
const DIAPASON_IMG = 'https://wsrv.nl/?url=storage.googleapis.com/origine1/Tuning%20fork%20png.png&w=900&output=webp';
const WAITLIST = '/liste-attente?programme=origine2';

/* ── Rejoindre : liste d'attente tant que l'admin n'a pas ouvert la vente
   (formation.listeAttente), Stripe Checkout ensuite; qui possède entre. ── */
function useRejoindreOrigine2(formation: Formation | null) {
  const { user, setSignInOpen } = useAuth();
  const [possede, setPossede] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) aAchete(user.uid, 'origine2').then(setPossede).catch(() => {});
    else setPossede(false);
  }, [user]);
  const enVente = !!formation && !formation.listeAttente && !!formation.prix;
  const rejoindre = async () => {
    if (possede) { window.location.href = '/cours/origine2'; return; }
    if (!enVente) { window.location.href = WAITLIST; return; }
    if (!user) { setSignInOpen(true); return; }
    setBusy(true);
    try { window.location.href = await acheterFormation('origine2'); } catch { setBusy(false); }
  };
  const label = possede ? 'Ouvrir mon espace' : enVente ? `Prendre ma place · ${formation!.prix} $` : 'Rejoindre la liste d’attente';
  return { rejoindre, possede, busy, enVente, label };
}

/* ════════════════════════ Primitives (copiées de OrigineExperience.tsx,
   non exportées là-bas, donc reprises ici telles quelles) ════════════════ */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => {
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

const PillarsTimeline: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.95'] });
  return (
    <div ref={ref} className="relative mt-20 md:mt-28">
      <motion.div
        className="pointer-events-none absolute left-[7px] md:left-1/2 top-2 bottom-2 w-px bg-gradient-to-b from-brass/0 via-brass/50 to-brass/0 md:-translate-x-1/2"
        style={reduce ? undefined : { scaleY: scrollYProgress, transformOrigin: 'top center' }}
        aria-hidden
      />
      <div className="space-y-20 md:space-y-32">
        {PILLARS.map((p, i) => {
          const gauche = i % 2 === 0;
          const titre = gauche
            ? 'md:col-span-6 md:col-start-1 md:text-right md:pr-14'
            : 'md:col-span-6 md:col-start-7 md:pl-14';
          const corps = gauche
            ? 'md:col-span-6 md:col-start-7 md:pl-14'
            : 'md:col-span-6 md:col-start-1 md:row-start-1 md:text-right md:pr-14';
          return (
            <Reveal key={p.roman}>
              <article className={`relative ${G12} gap-y-6 items-start`}>
                <span className="absolute left-0 md:left-1/2 top-2 md:-translate-x-1/2" aria-hidden>
                  <motion.span
                    className="block h-3.5 w-3.5 rounded-full bg-brass ring-4 ring-cream"
                    initial={reduce ? false : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, amount: 1 }}
                    transition={{ duration: 0.7, ease, delay: 0.35 }}
                  />
                </span>
                <div className={`col-span-12 pl-9 md:pl-0 ${titre}`}>
                  <p className="font-sans text-[0.6rem] uppercase tracking-[0.26em] text-brassInk">{p.range}</p>
                  <p className="mt-3 font-serif text-forestDeep text-[0.95rem] uppercase tracking-[0.18em]">{p.roman}</p>
                  <h3 className="mt-2 font-serif font-medium text-ink leading-[1.05] text-[clamp(1.7rem,2.8vw,2.4rem)]">{p.subtitle}</h3>
                </div>
                <div className={`col-span-12 pl-9 md:pl-0 ${corps}`}>
                  <p className={`font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[62ch] ${gauche ? '' : 'md:ml-auto'}`}>{p.body}</p>
                  <p className={`mt-7 font-serif font-medium text-brassInk text-[clamp(1.15rem,1.7vw,1.45rem)] leading-snug max-w-[44ch] ${gauche ? '' : 'md:ml-auto'}`}>{p.reflection}</p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

const DrawRule: React.FC<{ className?: string; center?: boolean; delay?: number }> = ({ className = '', center = false, delay = 0.15 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`h-px bg-brass ${className}`}
      style={{ transformOrigin: center ? 'center' : 'left center' }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 1.2, ease, delay }}
    />
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>
    {children}
  </p>
);

const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({ children, on = 'light', className = '' }) => (
  <h2 className={`font-serif font-medium leading-[1.04] text-[clamp(2rem,4.4vw,3.4rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>
    {children}
  </h2>
);

/* Deux gabarits de bouton d'achat repris tels quels de la référence : le
   pilule laiton-sur-ink avec flèche (bande CTA), et le bloc pleine largeur
   (panneau des semaines, clôture). */
const Bouton: React.FC<{ label: string; onClick: () => void; busy?: boolean }> = ({ label, onClick, busy }) => (
  <button type="button" onClick={onClick} disabled={busy}
    className="inline-flex items-center gap-3 bg-ink px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.2em] text-cream transition-colors duration-300 hover:bg-brass hover:text-espressoDeep min-h-[44px] disabled:opacity-60">
    {busy ? 'Un instant…' : label} <ArrowRight size={16} />
  </button>
);

const BoutonBloc: React.FC<{ label: string; onClick: () => void; busy?: boolean }> = ({ label, onClick, busy }) => (
  <button type="button" onClick={onClick} disabled={busy}
    className="block w-full bg-ink py-4 text-center font-sans text-[0.72rem] tracking-[0.2em] uppercase text-cream transition-colors duration-300 hover:bg-brass hover:text-espressoDeep min-h-[44px] disabled:opacity-60">
    {busy ? 'Un instant…' : label}
  </button>
);

/* ── FAQ : deux colonnes indépendantes, reprises telles quelles ── */
const FAQItem: React.FC<{ q: string; a: string; i: number; open: boolean; onClick: () => void }> = ({ q, a, i, open, onClick }) => (
  <div className={`mb-3 rounded-2xl border bg-card overflow-hidden transition-shadow ${open ? 'border-brass/40 shadow-[0_10px_30px_rgba(187,154,94,0.12)]' : 'border-cream3 shadow-sm'}`}>
    <button onClick={onClick} aria-expanded={open}
      className="w-full text-left py-5 px-6 md:px-8 flex items-center justify-between gap-4 min-h-[44px] group">
      <h3 className={`font-serif text-lg md:text-xl pr-6 transition-colors ${open ? 'text-brassInk' : 'text-ink group-hover:text-brassInk'}`}>
        <span className="tabular-nums text-inkSoft mr-2">{i + 1}.</span>{q}
      </h3>
      <ChevronDown className={`w-5 h-5 shrink-0 text-brassInk transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }}>
          <p className="px-6 md:px-8 pb-7 text-inkSoft leading-[1.8] font-sans text-[0.95rem] max-w-[62ch]">{a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  const mid = Math.ceil(FAQS.length / 2);
  const columns = [FAQS.slice(0, mid), FAQS.slice(mid)];
  return (
    <section id="faq" className="relative bg-cream2 py-24 md:py-32">
      <div className={`w-full ${GUT}`}>
        <div className={G12}>
          <Reveal className="col-span-12 md:col-span-6 mb-12 md:mb-14">
            <Eyebrow>Vos questions</Eyebrow>
            <SectionTitle className="mt-4 uppercase tracking-[0.02em] text-[clamp(1.7rem,3.2vw,2.5rem)]">
              Questions fréquentes
            </SectionTitle>
            <DrawRule className="mt-6 w-24" />
          </Reveal>
        </div>
        <div className={`${G12} items-start`}>
          {columns.map((col, c) => (
            <Reveal key={c} delay={c * 0.08} className="col-span-12 md:col-span-6">
              {col.map((f, j) => {
                const i = c * mid + j;
                return (
                  <FAQItem key={i} i={i} q={f.q} a={f.a} open={open === i} onClick={() => setOpen(open === i ? null : i)} />
                );
              })}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── Grille des douze semaines : la seule section qu'Origine 1 n'a pas,
   à la place de sa feuille « liste d'attente ». ── */
const SemainesGrid: React.FC = () => (
  <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
    {SEMAINES.map((s, i) => (
      <motion.div
        key={s.n}
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, ease, delay: 0.05 * i }}
        className="relative rounded-2xl border border-cream3 bg-card p-5 text-center transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
      >
        <p className="font-serif text-3xl text-ink">{s.rang}</p>
        <p className="mt-1 font-sans text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-brassInk">{PILIERS_ORIGINE2[s.pilier - 1].roman}</p>
        <Lock className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-brass/70" aria-hidden />
      </motion.div>
    ))}
  </div>
);

/* ════════════════════════ Page ════════════════════════ */

const OrigineDeuxPage: React.FC = () => {
  const { lang } = useUI();
  const { user, isAdmin } = useAuth();
  const { origine2Ouvert, pret } = useSiteFlags();
  const [formation, setFormation] = useState<Formation | null>(null);
  const { rejoindre, possede, busy, label } = useRejoindreOrigine2(formation);

  const heroRef = useRef<HTMLElement>(null);
  const heroSpan = useRef(1);
  const reduceHero = useReducedMotion();
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const mesurer = () => { heroSpan.current = Math.max(el.offsetHeight, 1); };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    window.addEventListener('resize', mesurer);
    return () => { ro.disconnect(); window.removeEventListener('resize', mesurer); };
  }, []);
  const { scrollY } = useScroll();
  const avance = (v: number) => Math.min(1, Math.max(0, v / heroSpan.current));
  const heroY = useTransform(scrollY, (v) => `${(-6 * avance(v)).toFixed(2)}%`);
  const heroScale = useTransform(scrollY, (v) => 1 + 0.06 * avance(v));
  const heroDim = useTransform(scrollY, (v) => `brightness(${(1 - 0.55 * avance(v)).toFixed(3)})`);

  useEffect(() => {
    const prev = document.title;
    document.title = 'L’Expérience Origine 2 | Krystine St-Laurent';
    window.scrollTo(0, 0);
    getFormation('origine2').then(setFormation).catch(() => {});
    return () => { document.title = prev; };
  }, []);

  if (!pret) return <div className="min-h-screen bg-cream" />;
  if (!origine2Ouvert && !isAdmin) return <Navigate to="/liste-attente?programme=origine2" replace />;
  if (possede) return <Navigate to="/cours/origine2" replace />;

  const debut = labelDebut(formation?.dateSortie);

  const heroCopy = (
    <>
      <p className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-7 md:mb-8">Expérience Origine 2</p>
      <h1 className="font-serif font-medium text-ctext leading-[0.98] text-[clamp(2.1rem,4.6vw,4rem)] max-w-[24ch] [text-shadow:0_2px_30px_rgba(0,0,0,0.55)]">Vous n'avez pas besoin de plus d'information.</h1>
      <p className="mt-6 md:mt-7 font-serif text-[clamp(1.3rem,2.6vw,2.1rem)] leading-snug text-ctextSoft max-w-[26ch]">Vous avez besoin de revenir à <span className="text-brassBright">votre point d'origine.</span></p>
      <div className="mt-9 md:mt-11 flex flex-wrap items-center gap-5 md:gap-6">
        <a href="#curriculum" className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]">Découvrir le parcours <ArrowRight size={16} /></a>
        <span className="font-serif text-ctextSoft/80 text-base">« Catherine, participante fondatrice »</span>
      </div>
    </>
  );

  return (
    <div className="bg-cream text-ink font-sans antialiased">
      {isAdmin && !origine2Ouvert && (
        <div className="relative z-[95] flex items-center justify-center gap-2 bg-espresso px-4 py-2 text-center font-sans text-[11px] uppercase tracking-[0.2em] text-cream">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
          Cette page est encore éteinte : le public arrive sur la liste d’attente.
        </div>
      )}

      {/* ─────────── FEUILLE 1 · HERO (vidéo desktop, image mobile) ─────────── */}
      <Feuille z={1} premiere>
        <section ref={heroRef} className="relative w-full overflow-hidden bg-espressoDeep">
          <div className="relative hidden md:block w-full overflow-hidden aspect-video">
            {reduceHero ? (
              <img
                src={HERO_POSTER}
                alt="La boîte Expérience Origine sur une table de noyer, bol de cuivre et linge clair"
                className="absolute left-0 top-[-6%] h-[112%] w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <motion.video
                src={HERO_VIDEO}
                poster={HERO_POSTER}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute left-0 top-[-6%] h-[112%] w-full object-cover"
                style={{ y: heroY, scale: heroScale, filter: heroDim }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, ease }}
              />
            )}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(22,16,10,0.90) 0%, rgba(22,16,10,0.72) 30%, rgba(22,16,10,0.30) 54%, transparent 74%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(22,16,10,0.28) 0%, transparent 28%, transparent 70%, rgba(22,16,10,0.42) 100%)' }} />
            <Atmosphere strength={0} vignette={false} />
            <div className="absolute inset-0 z-10 flex items-center">
              <div className={`w-full ${GUT} ${G12}`}>
                <motion.div className="col-span-12 md:col-span-7" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
                  {heroCopy}
                </motion.div>
              </div>
            </div>
          </div>
          <div className="md:hidden">
            <motion.img
              src={HERO_MOBILE}
              alt="La boîte Expérience Origine, cadrage vertical"
              className="w-full h-auto block"
              referrerPolicy="no-referrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease }}
            />
            <div className={`${GUT} pt-10 pb-14`}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease }}>
                {heroCopy}
              </motion.div>
            </div>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 2 · CURRICULUM ─────────── */}
      <Feuille z={2}>
        <section id="curriculum" className="relative bg-cream py-24 md:py-36">
          <div className={`w-full ${GUT}`}>
            <div className={`${G12} gap-y-8 items-end`}>
              <Reveal className="col-span-12 md:col-span-6">
                <Eyebrow>12 semaines · trois piliers</Eyebrow>
                <SectionTitle className="mt-5 uppercase tracking-[0.02em]">Retour au Point d'Origine</SectionTitle>
                <DrawRule className="mt-6 w-24" />
              </Reveal>
              <Reveal delay={0.08} className="col-span-12 md:col-span-5 md:col-start-8">
                <p className="font-serif text-[clamp(1.1rem,2vw,1.5rem)] leading-snug text-inkSoft max-w-[34ch]">Une sagesse de 5 000 ans, dans votre réalité d'aujourd'hui.</p>
              </Reveal>
            </div>
            <PillarsTimeline />
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 3 · BANDE CTA (achat) ─────────── */}
      <Feuille z={3}>
        <section className="relative bg-cream2 py-16 md:py-24">
          <Seam from="#f6f3ee" height={90} />
          <div className={`relative w-full ${GUT}`}>
            <Reveal>
              <div className={`${G12} gap-y-8 items-end border-y border-ink/12 py-14 md:py-16`}>
                <p className="col-span-12 md:col-span-8 font-serif text-[clamp(1.35rem,2.5vw,2.1rem)] leading-[1.35] text-ink max-w-[48ch]">12 semaines pour comprendre les messages du corps, retrouver ce qui nous appartient, ancrer les rituels qui tiennent, et revenir <span className="text-brassInk">au point d'origine.</span></p>
                <div className="col-span-12 md:col-span-4 md:flex md:justify-end">
                  <Bouton label={label} onClick={rejoindre} busy={busy} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 4 · TRILOGIE ─────────── */}
      <Feuille z={4}>
        <section className="relative bg-cream2 py-24 md:py-32">
          <div className={`w-full ${GUT} ${G12} gap-y-12 items-center`}>
            <Reveal className="col-span-12 md:col-span-5">
              <Eyebrow>L'Œuvre fondatrice</Eyebrow>
              <SectionTitle className="mt-4">La Trilogie d'Origine</SectionTitle>
              <DrawRule className="mt-5 w-16" />
              <p className="mt-7 font-sans text-[1.05rem] leading-[1.85] text-inkSoft max-w-[62ch]">Trois livres. 8 ans. 1200 pages inspirées de l'Ayurveda, <span className="text-brassInk font-medium">et une partie de leur contenu inédit nourrit Expérience Origine avant même sa publication.</span></p>
              <p className="mt-8 text-[2rem] text-brassInk leading-none" style={{ fontFamily: '"Pinyon Script", cursive' }}>Krystine</p>
            </Reveal>
            <Reveal delay={0.1} className="col-span-12 md:col-span-6 md:col-start-7">
              <div className="rounded-[2rem] border border-cream3 bg-card p-5 md:p-8 shadow-xl overflow-hidden">
                <Parallax speed={0.08}>
                  <img src={TRILOGIE_IMG} alt="La Trilogie d'Origine" loading="lazy" className="w-full h-auto object-contain max-h-[560px]" referrerPolicy="no-referrer" />
                </Parallax>
              </div>
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 5 · CE QUI TRAVAILLE CHAQUE SEMAINE ─────────── */}
      <Feuille z={5}>
        <section className="relative bg-cream py-24 md:py-32">
          <Seam from="#f1ebe0" height={90} />
          <div className={`relative w-full ${GUT}`}>
            <div className={G12}>
              <Reveal className="col-span-12 md:col-span-6">
                <Eyebrow>Chaque semaine</Eyebrow>
                <SectionTitle className="mt-4">Ce qui travaille pour vous chaque semaine</SectionTitle>
                <DrawRule className="mt-5 w-24" />
              </Reveal>
            </div>
            <div className={`${G12} gap-y-6 mt-14 md:mt-16`}>
              {WORKS.map((w, i) => (
                <Reveal key={w.title} delay={(i % 3) * 0.06} className="col-span-12 md:col-span-6 lg:col-span-4">
                  <div className="h-full rounded-3xl bg-card border border-cream3 p-8 md:p-9 transition-[transform,box-shadow] duration-500 hover:shadow-xl hover:-translate-y-1.5">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="w-2.5 h-2.5 rounded-full bg-brass shrink-0" />
                      <h3 className="font-serif text-xl md:text-2xl text-ink">{w.title}</h3>
                    </div>
                    <p className="font-sans text-[0.95rem] leading-[1.8] text-inkSoft md:pl-7 max-w-[62ch]">{w.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className={`${G12} mt-16`}>
              <Reveal className="col-span-12 md:col-span-8 md:col-start-5">
                <p className="font-serif font-medium text-brassInk text-[clamp(1.3rem,2.4vw,2rem)] leading-snug max-w-[48ch]">12 semaines pour comprendre les messages du corps, retrouver ce qui nous appartient et revenir <span className="uppercase tracking-[0.12em]">au point d'Origine</span>.</p>
              </Reveal>
            </div>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 6 · LE PROGRAMME (planche à gauche, texte à droite) ─────────── */}
      <Feuille z={6}>
        <section className="relative bg-cream3 py-24 md:py-32">
          <Seam from="#f6f3ee" height={90} />
          <div className={`relative w-full ${GUT} ${G12} gap-y-12 items-center`}>
            <Reveal className="col-span-12 md:col-span-6 md:col-start-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-brass/30 text-brassInk px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em]"><BookOpen size={12} /> Journal d'observation</span>
              <SectionTitle className="mt-5">Un journal pour ce qui se dépose en vous.</SectionTitle>
              <ul className="mt-8 space-y-4 max-w-[62ch]">
                {["L'observation des repères saisonniers pour s'ajuster au fil des semaines.", "L'intégration de rituels ancrés dans la sagesse ayurvédique.", "L'espace d'écriture pour suivre ce qui se dépose en vous."].map((li) => (
                  <li key={li} className="flex items-start gap-3 text-inkSoft font-sans text-[0.98rem] leading-relaxed">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-forest shrink-0" />{li}
                  </li>
                ))}
              </ul>
              <p className="mt-8 inline-flex items-center gap-2 text-brassInk font-medium text-sm">Inclus dans Expérience Origine</p>
            </Reveal>
            <Reveal delay={0.1} className="col-span-12 md:col-span-5 md:col-start-1 md:row-start-1">
              <div className="relative w-full aspect-[4/3] rounded-l-md rounded-r-2xl border-l-[8px] border-brass shadow-2xl overflow-hidden bg-card">
                <Parallax speed={0.1} className="h-full" innerClassName="h-full">
                  <img src={PROGRAMME_IMG} alt="La boîte Expérience Origine, sur la table" loading="lazy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </Parallax>
              </div>
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 7 · KRYSTINE ─────────── */}
      <Feuille z={7}>
        <section className="relative bg-cream2 py-24 md:py-32">
          <Seam from="#ede5d7" height={90} />
          <div className={`relative w-full ${GUT} ${G12} gap-y-12 items-center`}>
            <Reveal className="col-span-12 md:col-span-6">
              <Eyebrow>Celle qui enseigne</Eyebrow>
              <SectionTitle className="mt-4">Krystine St-Laurent</SectionTitle>
              <DrawRule className="mt-5 w-16" />
              <p className="mt-7 font-sans text-[1.02rem] leading-[1.85] text-inkSoft max-w-[62ch]">Près de 40 ans à traverser les milieux de la santé, soins intensifs, industrie pharmaceutique, recherche clinique en insuffisance cardiaque, avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie. Auteure de trois livres aux Éditions de l'Homme. Créatrice de la série télé Santé la vie et du podcast Au-delà des tendances. Elle a vu ce que l'approche moderne fait bien. Et elle a vu là où elle laisse les gens seuls. Les rituels qu'elle enseigne, elle les pratique chaque matin.</p>
              <div className="mt-8 space-y-5 pt-6 border-t border-ink/12 max-w-[62ch]">
                {TESTIMONIALS.map((t) => (
                  <p key={t.who} className="text-ink">
                    <span className="font-serif text-[1.05rem] leading-snug">« {t.quote} »</span>
                    <span className="block mt-1 text-inkSoft/80 text-sm">— {t.who}</span>
                  </p>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.08} className="col-span-12 md:col-span-5 md:col-start-8">
              <div className="relative border border-brass/45 p-2.5 bg-card shadow-[0_30px_70px_rgba(58,49,38,0.14)]">
                <div className="relative overflow-hidden aspect-[4/5]">
                  <Parallax speed={0.1} className="h-full" innerClassName="h-full">
                    <img src={PORTRAIT} alt="Krystine St-Laurent" loading="lazy" className="w-full h-full object-cover scale-110" referrerPolicy="no-referrer" />
                  </Parallax>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 8 · LES DOUZE SEMAINES (à la place de la feuille
           « liste d'attente » de la référence : ici, on vend) ─────────── */}
      <Feuille z={8}>
        <section id="semaines" className="relative bg-cream py-24 md:py-32">
          <Seam from="#f1ebe0" height={90} />
          <div className={`relative w-full ${GUT}`}>
            <div className={`${G12} gap-y-6 items-end`}>
              <Reveal className="col-span-12 md:col-span-6">
                <Eyebrow>Prochaine cohorte</Eyebrow>
                <SectionTitle className="mt-4">Une semaine s'ouvre à la fois</SectionTitle>
                <DrawRule className="mt-5 w-24" />
              </Reveal>
              <Reveal delay={0.08} className="col-span-12 md:col-span-5 md:col-start-8">
                <p className="font-serif text-[clamp(1.05rem,1.8vw,1.4rem)] leading-snug text-inkSoft max-w-[34ch]">Chaque semaine, Krystine dépose le module audio, la méditation guidée et les documents du rendez-vous, et les semaines passées restent accessibles jusqu'à la fin de la cohorte, le temps que les suivantes arrivent à leur tour.</p>
              </Reveal>
            </div>

            <div className={`${G12} gap-y-10 mt-12 md:mt-16 items-start`}>
              <Reveal className="col-span-12 md:col-span-7">
                <SemainesGrid />
                <div className="mt-10 rounded-3xl border border-cream3 bg-card p-6 md:p-8">
                  <p className="font-serif font-medium text-lg text-ink uppercase tracking-[0.08em] mb-5">Ce qui est inclus</p>
                  <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {VALUE_ITEMS.map((it) => (
                      <li key={it.title} className="flex items-start gap-2.5 text-inkSoft font-sans text-[0.88rem] leading-snug">
                        <Check size={14} className="text-brass mt-0.5 shrink-0" />
                        {it.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={0.1} className="col-span-12 md:col-span-5">
                <div className="relative border border-brass/45 bg-card p-8 md:p-10">
                  <span className="pointer-events-none absolute inset-3 border border-brass/25" aria-hidden />
                  <div className="relative">
                    <p className="font-sans text-[0.65rem] uppercase tracking-[0.3em] text-brassInk">Prochaine cohorte</p>
                    <p className="mt-8 font-serif text-[clamp(1.5rem,2.2vw,2rem)] leading-[1.25] text-ink max-w-[22ch]">{debut}</p>
                    <p className="mt-5 font-sans text-[0.95rem] leading-[1.8] text-inkSoft max-w-[46ch]">Les places se prennent dans l'ordre des inscriptions, et le cercle reste limité à 350 personnes.</p>
                    <div className="mt-9">
                      <BoutonBloc label={label} onClick={rejoindre} busy={busy} />
                    </div>
                  </div>
                </div>
                <div className="mt-8 rounded-3xl border border-cream3 bg-card p-8 md:p-9 shadow-sm">
                  <h4 className="font-serif font-medium text-lg md:text-xl text-ink uppercase tracking-[0.08em] mb-4">Notre garantie cœur léger, 30 jours</h4>
                  <p className="font-sans text-[0.98rem] leading-relaxed text-inkSoft max-w-[62ch]">Si après <span className="text-brassInk font-medium">30 jours</span> vous sentez que ce cadre ne vous convient pas, nous vous <span className="text-brassInk font-medium">remboursons</span>. Sans question. Cela enlève le risque.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 9 · FAQ ─────────── */}
      <Feuille z={9}>
        <FaqSection />
      </Feuille>

      {/* ─────────── FEUILLE 10 · FRÉQUENCE D'ORIGINE (diapason, au lieu des
           écouteurs de la référence) ─────────── */}
      <Feuille z={10}>
        <section className="relative py-24 md:py-32 overflow-hidden" style={{ backgroundColor: '#34241a' }}>
          <Atmosphere light="30% 32%" />
          <div className={`relative w-full ${GUT} ${G12} gap-y-14 items-center`}>
            <Reveal className="col-span-12 md:col-span-5 flex flex-col items-start">
              <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }} className="absolute inset-[-8%] rounded-full border border-dashed border-brass/30" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 38, repeat: Infinity, ease: 'linear' }} className="absolute inset-[6%] rounded-full border border-brass/15" />
                <div className="absolute inset-[14%] rounded-full bg-brass/12 blur-2xl" />
                <motion.img
                  src={DIAPASON_IMG}
                  alt="Diapason · Expérience Origine, 432 Hz"
                  draggable={false}
                  referrerPolicy="no-referrer"
                  animate={{ y: [-14, 14, -14] }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                  className="relative z-10 w-[64%] h-[64%] object-contain drop-shadow-[0_30px_55px_rgba(0,0,0,0.55)]"
                />
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-cream text-espressoDeep px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-brass animate-pulse" /> Souffle d'Origine
              </div>
            </Reveal>
            <Reveal delay={0.1} className="col-span-12 md:col-span-6 md:col-start-7">
              <p className="inline-flex items-center gap-2 text-brass text-xs font-bold uppercase tracking-[0.2em] mb-4"><Headphones size={14} /> Trame sonore originale</p>
              <h2 className="font-serif font-medium text-ctext text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05] max-w-[16ch]">Fréquence <span className="text-brassBright">d'Origine</span></h2>
              <p className="mt-6 font-sans text-[1rem] leading-relaxed text-ctextSoft max-w-[62ch]">La musique qui vous accompagne sur cette page a été composée pour réaligner votre système nerveux. Emportez cette fréquence avec vous pour retrouver votre centre à tout moment.</p>
              <div className="mt-8 flex gap-10 border-y border-brass/20 py-4 max-w-[34rem]">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-ctextSoft/70"><Activity size={12} /> Fréquence</span>
                  <span className="font-serif text-xl text-brassBright">432 Hz</span>
                </div>
                <div className="w-px h-10 bg-brass/20" />
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-ctextSoft/70"><Sparkles size={12} /> Qualité</span>
                  <span className="font-serif text-xl text-brassBright">Studio haute résolution</span>
                </div>
              </div>
              {user ? (
                <a
                  href="/compte?onglet=telechargements#boutique"
                  className="mt-9 inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-serif text-lg text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
                >
                  <Download size={20} /> {lang === 'FR' ? 'L\'obtenir dans ma boutique · 5 niskas' : 'Get it in my shop · 5 niskas'}
                </a>
              ) : (
                <div className="mt-9">
                  <BoutonCompte
                    taille="lg"
                    libelle={lang === 'FR' ? "Créer mon compte pour l'obtenir" : 'Create my account to get it'}
                  />
                  <p className="mt-4 font-sans text-sm leading-relaxed text-ctextSoft max-w-[62ch]">
                    {lang === 'FR'
                      ? "Cette fréquence vous attend dans votre espace membre, pour 5 niskas. Votre compte vous offre des niskas de bienvenue dès sa création, de quoi l'obtenir sans attendre."
                      : 'This frequency is waiting in your member space, for 5 niskas. Your account comes with welcome niskas the moment you create it, enough to get it right away.'}
                  </p>
                </div>
              )}
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 11 · CLÔTURE (achat) ─────────── */}
      <Feuille z={11}>
        <section className="relative bg-cream py-24 md:py-32">
          <Seam from="#34241a" height={110} />
          <div className={`relative w-full ${GUT} ${G12} gap-y-12 items-end`}>
            <Reveal className="col-span-12 md:col-span-8">
              <Eyebrow>Expérience Origine 2</Eyebrow>
              <p className="mt-7 font-serif font-medium text-ink leading-[1.02] text-[clamp(2.2rem,5vw,4rem)] max-w-[26ch]">Le corps sait. Il manquait la carte pour le lire.</p>
              <DrawRule className="mt-10 w-32" />
            </Reveal>
            <Reveal delay={0.08} className="col-span-12 md:col-span-4">
              <BoutonBloc label={label} onClick={rejoindre} busy={busy} />
              <a href="mailto:teamksl@inspiratanature.com" className="mt-7 block font-serif text-brassInk hover:text-brassDeep transition-colors text-lg md:text-xl">
                Une question ? teamksl@inspiratanature.com
              </a>
            </Reveal>
          </div>
        </section>
      </Feuille>
    </div>
  );
};

export default OrigineDeuxPage;
