import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AppContext';
import { aAchete, acheterFormation, getFormation, type Formation } from '../firebase/formations';
import { PILLARS, WORKS, VALUE_ITEMS, FAQS, TESTIMONIALS } from './OrigineExperience';
import { SEMAINES, PILIERS_ORIGINE2, labelDebut } from './origine2/semaines';

/**
 * L'Expérience Origine 2 · page de vente native (URL dédiée /origine-2).
 * La langue du Foyer d'Origine : préchargeur au filet doré, hero cinématique
 * plein écran, feuilles empilées qui glissent l'une sur l'autre, un seul
 * accent laiton. La copie est celle de la page /origine, mot pour mot.
 * Krystine dépose ses modules semaine après semaine dans /cours/origine2.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;
const BANNIERE = 'https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg';
const PORTRAIT = 'https://wsrv.nl/?url=storage.googleapis.com/origine1/krystine%20red%20NG.webp&w=1000&output=webp';
const WAITLIST = '/liste-attente?programme=origine';

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

const Preloader: React.FC<{ done: boolean }> = ({ done }) => (
  <AnimatePresence>
    {!done && (
      <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-encre" exit={{ opacity: 0 }} transition={{ duration: 0.7, ease }}>
        <div className="relative flex flex-col items-center gap-6">
          <svg width="220" height="18" viewBox="0 0 220 18" fill="none" aria-hidden>
            <motion.line x1="0" y1="9" x2="88" y2="9" stroke="#bb9a5e" strokeWidth="1" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }} transition={{ duration: 0.7, ease, delay: 0.1 }} />
            <motion.line x1="220" y1="9" x2="132" y2="9" stroke="#bb9a5e" strokeWidth="1" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }} transition={{ duration: 0.7, ease, delay: 0.1 }} />
            <motion.circle cx="110" cy="9" r="4.5" stroke="#c79a52" strokeWidth="1.2" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: [0, 1.25, 1] }} transition={{ duration: 0.6, ease, delay: 0.55 }} style={{ transformOrigin: '110px 9px' }} />
          </svg>
          <motion.p className="whitespace-nowrap font-sans text-fyLabel uppercase text-ctextSoft" initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 0.4, duration: 0.5 }}>
            L’Expérience Origine 2
          </motion.p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <div className="flex flex-col gap-3">
    <span className="block h-px w-12 bg-brass" aria-hidden />
    <p className={`font-sans text-fyLabel uppercase ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>{children}</p>
  </div>
);

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? { opacity: 1 } : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.9, ease, delay }}>
      {children}
    </motion.div>
  );
};

const Bouton: React.FC<{ label: string; onClick: () => void; busy?: boolean; dark?: boolean }> = ({ label, onClick, busy, dark }) => (
  <button type="button" onClick={onClick} disabled={busy}
    className={`group inline-flex items-center gap-3 whitespace-nowrap rounded-[30px] px-7 py-4 font-sans text-[0.85rem] font-semibold uppercase tracking-[0.16em] shadow-glow transition-colors duration-300 disabled:opacity-60 md:px-10 md:py-5 md:text-[0.9rem] md:tracking-[0.2em] ${dark ? 'bg-brass text-espresso hover:bg-brassBright' : 'bg-espresso text-cream hover:bg-espressoSoft'}`}>
    {busy ? 'Un instant…' : label}
    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
  </button>
);

/* ── Hero : la bannière d'Origine respire lentement, l'encre monte du bas ── */
const Hero: React.FC<{ ready: boolean; cta: React.ReactNode; sousTitre: string }> = ({ ready, cta, sousTitre }) => {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.25], [0, reduce ? 0 : 120]);
  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-encre">
      <motion.img src={BANNIERE} alt="" className="absolute inset-0 h-full w-full object-cover object-center" style={{ y }}
        initial={{ scale: 1.12, opacity: 0 }} animate={ready ? { scale: 1, opacity: 1 } : {}} transition={{ duration: 6, ease }} />
      <div className="absolute inset-0 bg-gradient-to-t from-encre via-encre/55 to-encre/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-encre/70 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-[clamp(1.25rem,5vw,6rem)] pb-[clamp(3rem,8vh,6rem)]">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={ready ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1.1, ease, delay: 0.2 }}>
          <Eyebrow on="dark">Cohorte de janvier 2027 · douze semaines · 350 places</Eyebrow>
        </motion.div>
        <motion.h1 className="mt-6 font-serif text-[clamp(2.6rem,7vw,6.4rem)] font-medium uppercase leading-[0.98] tracking-[0.02em] text-ctext"
          initial={{ opacity: 0, y: 40 }} animate={ready ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1.2, ease, delay: 0.35 }}>
          Retrouver<br />vos repères
        </motion.h1>
        <motion.p className="mt-6 max-w-xl font-serif text-[clamp(1.15rem,1.6vw,1.45rem)] leading-relaxed text-ctextSoft"
          initial={{ opacity: 0 }} animate={ready ? { opacity: 1 } : {}} transition={{ duration: 1, ease, delay: 0.7 }}>
          {sousTitre}
        </motion.p>
        <motion.div className="mt-9 flex flex-wrap items-center gap-6" initial={{ opacity: 0, y: 20 }} animate={ready ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, ease, delay: 0.9 }}>
          {cta}
          <span className="font-sans text-fyLabel uppercase text-ctextSoft/80">Douze rendez-vous en direct avec Krystine</span>
        </motion.div>
      </div>
      <motion.div className="absolute bottom-6 right-[clamp(1.25rem,5vw,6rem)] hidden text-brass md:block" animate={reduce ? {} : { y: [0, 8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} aria-hidden>
        <ChevronDown className="h-6 w-6" />
      </motion.div>
    </section>
  );
};

/* ── Feuilles empilées : chaque section colle en haut, la suivante la recouvre ── */
const Feuille: React.FC<{ children: React.ReactNode; z: number; className?: string }> = ({ children, z, className = '' }) => (
  <section className={`sticky top-0 min-h-[100svh] ${className}`} style={{ zIndex: z }}>
    {children}
  </section>
);

const Piliers: React.FC = () => (
  <div className="grid gap-6 lg:grid-cols-3">
    {PILLARS.map((p, i) => (
      <Reveal key={p.roman} delay={i * 0.12}>
        <article className="flex h-full flex-col rounded-[15px] border border-brass/30 bg-white/40 p-7 backdrop-blur-md md:p-9">
          <p className="font-sans text-fyLabel uppercase text-brassInk">{p.roman} · {p.range}</p>
          <h3 className="mt-3 font-serif text-[1.65rem] font-medium leading-tight text-ink">{p.subtitle}</h3>
          <p className="mt-4 font-sans text-[15px] leading-relaxed text-ink/75">{p.body}</p>
          <p className="mt-auto pt-6 font-serif text-[1.05rem] leading-relaxed text-brassInk">{p.reflection}</p>
        </article>
      </Reveal>
    ))}
  </div>
);

const DouzeSemaines: React.FC = () => (
  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
    {SEMAINES.map((s, i) => (
      <Reveal key={s.n} delay={i * 0.04}>
        <div className="relative rounded-[15px] border border-brass/25 bg-black/30 p-5 text-center backdrop-blur-md transition-transform duration-300 hover:-translate-y-1 hover:border-brass/60">
          <p className="font-serif text-4xl text-ctext">{s.rang}</p>
          <p className="mt-1 font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-brass">{PILIERS_ORIGINE2[s.pilier - 1].roman}</p>
          <span className="absolute right-2.5 top-2.5 text-brass/70"><Lock className="h-3.5 w-3.5" /></span>
        </div>
      </Reveal>
    ))}
  </div>
);

const Faq: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-brass/25 border-y border-brass/25">
      {FAQS.map((f, i) => (
        <div key={f.q}>
          <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-start justify-between gap-6 py-5 text-left">
            <span className="font-serif text-[1.15rem] leading-snug text-ink md:text-[1.3rem]">{f.q}</span>
            <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-brassInk transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease }} className="overflow-hidden">
                <p className="max-w-3xl pb-6 font-sans text-[15px] leading-relaxed text-ink/75">{f.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

const OrigineDeuxPage: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [formation, setFormation] = useState<Formation | null>(null);
  const { rejoindre, possede, busy, label } = useRejoindreOrigine2(formation);
  useEffect(() => {
    const prev = document.title;
    document.title = "L'Expérience Origine 2 | Krystine St-Laurent";
    const prevBg = document.body.style.background;
    document.body.style.background = '#f6f3ee';
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => setReady(true), 1100);
    getFormation('origine2').then(setFormation).catch(() => {});
    return () => { window.clearTimeout(t); document.title = prev; document.body.style.background = prevBg; };
  }, []);
  if (possede) return <Navigate to="/cours/origine2" replace />;
  const debut = labelDebut(formation?.dateSortie);
  const description = formation?.description || '12 semaines pour sortir du pilotage extérieur et retrouver vos propres repères.';

  return (
    <div className="bg-cream overflow-x-clip">
      <Preloader done={ready} />
      <div inert={ready ? undefined : true}>
        <Hero ready={ready} sousTitre={description} cta={<Bouton label={label} onClick={rejoindre} busy={busy} dark />} />

        {/* Feuille 1 · l'intention */}
        <Feuille z={2} className="bg-cream">
          <div className="grid min-h-[100svh] items-center gap-12 px-[clamp(1.25rem,5vw,6rem)] py-24 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal><Eyebrow>L’Expérience Origine 2</Eyebrow></Reveal>
              <Reveal delay={0.1}><h2 className="mt-6 max-w-[24ch] font-serif text-fyH2 font-medium uppercase leading-[1.02] tracking-[0.03em] text-ink">Sortir du pilotage extérieur</h2></Reveal>
              <Reveal delay={0.2}><p className="mt-8 max-w-2xl font-sans text-[clamp(1rem,1.2vw,1.15rem)] leading-relaxed text-ink/80">{VALUE_ITEMS[1].detail} {VALUE_ITEMS[0].detail}</p></Reveal>
              <Reveal delay={0.3}>
                <ul className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
                  {['Douze rendez-vous en direct.', 'Douze modules audio.', 'Douze méditations guidées.'].map(m => (
                    <li key={m} className="flex items-center gap-3 font-sans text-fyLabel uppercase text-brassInk"><span className="h-1.5 w-1.5 rotate-45 bg-brass" />{m}</li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.4} className="mt-12"><Bouton label={label} onClick={rejoindre} busy={busy} /></Reveal>
            </div>
            <Reveal delay={0.25} className="lg:col-span-5">
              <div className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-[15px] border border-brass/30 shadow-[0_40px_80px_-30px_rgba(29,22,4,0.5)]">
                <img src={PORTRAIT} alt="Krystine St-Laurent" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/80 to-transparent p-6">
                  <p className="font-sans text-fyLabel uppercase text-brass">Krystine St-Laurent</p>
                  <p className="mt-1 font-serif text-[1.15rem] leading-snug text-ctext">Infirmière de formation, auteure, près de 40 ans d’Ayurveda.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </Feuille>

        {/* Feuille 2 · les trois piliers */}
        <Feuille z={3} className="bg-cream3">
          <div className="px-[clamp(1.25rem,5vw,6rem)] py-24">
            <Reveal><Eyebrow>Le chemin, en trois piliers</Eyebrow></Reveal>
            <Reveal delay={0.1}><h2 className="mt-6 max-w-[26ch] font-serif text-fyH2 font-medium uppercase leading-[1.02] tracking-[0.03em] text-ink">Douze semaines, trois piliers</h2></Reveal>
            <div className="mt-12"><Piliers /></div>
          </div>
        </Feuille>

        {/* Feuille 3 · les douze semaines, sur l'encre */}
        <Feuille z={4} className="bg-encre text-ctext">
          <div className="px-[clamp(1.25rem,5vw,6rem)] py-24">
            <Reveal><Eyebrow on="dark">Semaine après semaine</Eyebrow></Reveal>
            <Reveal delay={0.1}><h2 className="mt-6 max-w-[26ch] font-serif text-fyH2 font-medium uppercase leading-[1.02] tracking-[0.03em] text-ctext">Une semaine s’ouvre à la fois</h2></Reveal>
            <Reveal delay={0.2}><p className="mt-6 max-w-2xl font-sans text-[15px] leading-relaxed text-ctextSoft">Chaque semaine, Krystine dépose le module audio, la méditation guidée et les documents du rendez-vous. Les semaines passées restent ouvertes pendant toute la cohorte. Les suivantes attendent leur tour.</p></Reveal>
            <Reveal delay={0.25}><p className="mt-8 inline-flex items-center gap-3 rounded-full border border-brass/50 bg-brass/10 px-4 py-2 font-sans text-fyLabel uppercase text-brassBright"><Lock className="h-3.5 w-3.5" />{debut}</p></Reveal>
            <div className="mt-8"><DouzeSemaines /></div>
          </div>
        </Feuille>

        {/* Feuille 4 · ce que vous recevez */}
        <Feuille z={5} className="bg-cream">
          <div className="px-[clamp(1.25rem,5vw,6rem)] py-24">
            <Reveal><Eyebrow>Ce que vous recevez</Eyebrow></Reveal>
            <Reveal delay={0.1}><h2 className="mt-6 max-w-[26ch] font-serif text-fyH2 font-medium uppercase leading-[1.02] tracking-[0.03em] text-ink">Ce qui vous accompagne</h2></Reveal>
            <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {WORKS.map((w, i) => (
                <Reveal key={w.title} delay={i * 0.08}>
                  <p className="font-sans text-fyLabel uppercase text-brassInk">0{i + 1}</p>
                  <h3 className="mt-3 font-serif text-[1.5rem] font-medium leading-tight text-ink">{w.title}</h3>
                  <p className="mt-3 font-sans text-[15px] leading-relaxed text-ink/75">{w.body}</p>
                </Reveal>
              ))}
            </div>
            <div className="mt-16 grid gap-8 border-t border-brass/25 pt-12 md:grid-cols-3">
              {TESTIMONIALS.map(t => (
                <Reveal key={t.who}>
                  <p className="font-serif text-[1.25rem] leading-relaxed text-ink">« {t.quote} »</p>
                  <p className="mt-3 font-sans text-fyLabel uppercase text-brassInk">{t.who}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </Feuille>

        {/* Feuille 5 · les questions */}
        <Feuille z={6} className="bg-cream2">
          <div className="grid gap-12 px-[clamp(1.25rem,5vw,6rem)] py-24 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Reveal><Eyebrow>Avant de prendre place</Eyebrow></Reveal>
              <Reveal delay={0.1}><h2 className="mt-6 font-serif text-fyH2 font-medium uppercase leading-[1.02] tracking-[0.03em] text-ink">Vos questions</h2></Reveal>
            </div>
            <Reveal delay={0.15} className="lg:col-span-8"><Faq /></Reveal>
          </div>
        </Feuille>

        {/* Appel final, sur l'encre : le point le plus bas de la page */}
        <section className="relative z-[7] bg-encre px-[clamp(1.25rem,5vw,6rem)] py-28 text-ctext">
          <Reveal><Eyebrow on="dark">{debut}</Eyebrow></Reveal>
          <Reveal delay={0.1}><h2 className="mt-6 max-w-[20ch] font-serif text-[clamp(2.2rem,5.5vw,4.8rem)] font-medium uppercase leading-[0.98] tracking-[0.02em] text-ctext">Prendre place dans la cohorte</h2></Reveal>
          <Reveal delay={0.2}><p className="mt-6 max-w-xl font-sans text-[15px] leading-relaxed text-ctextSoft">Les personnes de la liste d’attente reçoivent l’invitation et l’horaire avant toute annonce publique. Le cercle est limité à 350 places.</p></Reveal>
          <Reveal delay={0.3} className="mt-10 flex flex-wrap items-center gap-6">
            <Bouton label={label} onClick={rejoindre} busy={busy} dark />
            <Link to="/formations" className="font-sans text-fyLabel uppercase text-ctextSoft underline-offset-4 hover:underline">Toutes les formations</Link>
          </Reveal>
        </section>
      </div>
    </div>
  );
};

export default OrigineDeuxPage;
