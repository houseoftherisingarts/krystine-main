import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Calendar, Clock, Radio, Globe, Play, BookOpen, ArrowRight } from 'lucide-react';

/**
 * Expérience Origine — page React au style L'Œuvre (espresso/cream/brass)
 * avec un accent botanique vert forêt préservé de l'identité du cours.
 * Contenu extrait à 100% du sous-app statique src/pages/origine/.
 * Skills: premium-web (orchestrateur) + ui-ux-pro-max (tokens/contraste) + impeccable (craft).
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 1.0, ease, delay }}
  >
    {children}
  </motion.div>
);

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

/* ════════════════════════ Données ════════════════════════ */

const PILLARS = [
  { roman: 'Pilier I', range: 'Semaines 1 à 4', subtitle: 'Ce que le corps essaie de dire',
    body: "Calmer le bruit pour entendre ce qui est là. D'où viennent vos décisions ? Qu'est-ce que le corps essaie de dire ? L'Ayurveda donne les premiers mots pour le nommer. Le premier geste : écouter avant d'agir.",
    reflection: "Après quatre semaines, les signaux que le corps envoie depuis des mois deviennent lisibles. La confusion se dissipe. Ce qui semblait flou porte un nom." },
  { roman: 'Pilier II', range: 'Semaines 5 à 8', subtitle: 'Ce qui vous appartient vraiment',
    body: "Retirer ce qui encombre, poser ce qui soutient. Faire le tri entre ce qui est à vous et ce que l'on vous a imposé. L'Ayurveda éclaire ce qui nourrit vraiment. La Dinacharya, l'art ancestral de s'accorder aux rythmes du jour, devient votre charpente.",
    reflection: "Les gestes qui ne vous appartiennent pas tombent. Ceux qui vous soutiennent se posent. Le tri entre ce que l'on vous a imposé et ce qui est juste pour vous devient clair. Le matin change." },
  { roman: 'Pilier III', range: 'Semaines 9 à 12', subtitle: "Le retour au point d'origine",
    body: "Installer la capacité de retour. Les saisons comme boussole. Ce qui reste quand le parcours se termine. La boussole est rétablie, l'expérience continue en vous. Les repères restent. Le corps s'en souvient.",
    reflection: "La lecture tient seule. Les saisons deviennent votre boussole. Le parcours se termine, la capacité reste. Le corps s'en souvient." },
];

const WORKS = [
  { title: 'Les modules audios', body: "La lecture qui manquait. Chaque semaine, le corps devient plus lisible. Les signaux qui semblaient confus deviennent des réponses. À écouter en marchant, en cuisinant, à votre rythme." },
  { title: 'Les méditations guidées', body: "Ce qui a été reçu a besoin de se déposer. Un ancrage court, entre les rendez-vous, pour que la compréhension descende de la tête vers le corps." },
  { title: 'Vos questions', body: "Le privilège fondatrice. Vos questions sont soumises trois jours avant. Krystine et son équipe les lisent, préparent, et le rendez-vous s'ajuste à ce que vous vivez réellement. Pas un parcours générique. Votre réalité." },
  { title: 'Notre rendez-vous', body: "Deux heures chaque semaine, en direct. Krystine enseigne, écoute, ajuste. Chaque rendez-vous se termine par une méditation de groupe. 24 heures de présence directe sur 12 semaines. Celles qui ont essayé seules savent pourquoi cela change tout." },
  { title: 'Les gestes comme guidance', body: "Un geste juste, posé au bon moment, change tout. La Dinacharya, l'art ancestral de s'accorder aux rythmes du jour. Une routine devient un repère par la simple intention que l'on y dépose. Des gestes adaptés à votre réalité unique." },
  { title: "L'espace", body: "Pour celles qui ne veulent pas traverser seules. Un endroit calme entre les rendez-vous. Sans notifications, sans obligation de publier." },
];

const VALUE_ITEMS = [
  { title: '12 rendez-vous en direct avec Krystine (24 h de présence)', detail: "Chaque semaine, en direct. Elle enseigne, elle écoute, elle ajuste, et chaque rendez-vous se termine par une méditation de groupe. Vingt-quatre heures de présence directe sur douze semaines.", value: '4 800 $' },
  { title: '12 modules audio, la grille de lecture du corps', detail: "Chaque semaine, un enseignement en audio. Une grille de lecture pour se comprendre quand le corps donne des signaux que l'on ne sait pas décoder.", value: '600 $' },
  { title: '12 méditations audio guidées', detail: "Un ancrage personnel, court et pré-enregistré, pour laisser se déposer ce qui a été reçu entre les rendez-vous.", value: '360 $' },
  { title: 'Vos questions, le privilège fondatrice', detail: "Soumises trois jours avant le rendez-vous. Krystine et son équipe les lisent, préparent, et le rendez-vous s'ajuste à ce que vous vivez réellement.", value: '500 $' },
  { title: "Le Journal d'Observation et de Rituels", detail: "L'ancrage tangible des douze semaines. Espace d'intégration, repères saisonniers et rituels.", value: '150 $' },
  { title: "L'Espace, la communauté d'Origine", detail: "Une communauté, mais pas comme vous les connaissez. Un endroit calme entre les rendez-vous. Sans notifications, sans obligation de publier.", value: '300 $' },
  { title: 'Liste de musique (spirale dorée, 432 Hz)', detail: "Une liste de musique qui fait voyager le cœur et l'âme, disponible avec un lien privé sur Spotify.", value: '97 $' },
];

const FAQS = [
  { q: "Est-ce que c'est pour moi même si je ne connais rien à l'Ayurveda ?", a: "Absolument. Expérience Origine est conçu pour vous guider pas à pas, que vous soyez novice ou initié. L'Ayurveda n'est pas un prérequis, c'est l'outil que nous découvrirons ensemble pour lire votre corps." },
  { q: "Je connais déjà l'Ayurveda ou j'enseigne le yoga. Est-ce que c'est pour moi aussi ?", a: "Oui. Ce n'est pas un cours théorique, c'est une expérience d'intégration. Nous allons au-delà des concepts pour toucher le senti. De nombreux professionnels de la santé et du bien-être y trouvent une profondeur nouvelle pour leur pratique." },
  { q: "Est-ce que Krystine est vraiment présente ou ce sont des pré-enregistrements ?", a: "C'est un accompagnement hybride et vivant. Les enseignements fondamentaux sont des audios, mais le cœur du parcours bat lors des 12 rencontres en direct avec Krystine (les dimanches)." },
  { q: "Est-ce qu'il faut avoir lu les deux premiers livres de Krystine ?", a: "Non, ce n'est pas nécessaire. Le parcours se suffit à lui-même. Les livres peuvent être des compléments enrichissants, mais tout ce dont vous avez besoin pour vivre l'expérience est inclus." },
  { q: "J'ai suivi tellement de formations et j'ai l'impression d'avoir empilé les connaissances. Rien ne semble rester. Pourquoi ce serait différent cette fois ?", a: "C'est la différence entre savoir et sentir. Origine n'est pas une formation intellectuelle de plus. C'est un espace pour déposer le savoir dans le corps. On ne cherche pas à ajouter, on cherche à intégrer." },
  { q: "Quelque chose me dit oui, mais j'arrête toujours en chemin. Qu'est-ce qui me dit que cette fois je vais tenir ?", a: "La structure du parcours est conçue spécifiquement pour vous soutenir sans vous surcharger. Les méditations courtes et la communauté bienveillante sont là pour vous ramener à vous-même, à votre rythme." },
  { q: "Combien de temps par semaine ?", a: "Prévoyez environ 3 heures par semaine : 2 heures pour notre rencontre en direct le dimanche, et environ 1 heure répartie dans votre semaine pour écouter le module audio et pratiquer les intégrations." },
  { q: "Le cercle est limité à 350 personnes. Est-ce que je vais me perdre dans le groupe ?", a: "Au contraire. Cette limite garantit une intimité et permet à Krystine de ressentir l'énergie du groupe. L'espace communautaire est conçu pour être un lieu calme, loin du bruit des grands réseaux sociaux." },
  { q: "J'ai déjà essayé beaucoup de choses.", a: "Si vous avez l'impression d'avoir tout essayé, c'est peut-être qu'il est temps d'arrêter de chercher à l'extérieur. Origine vous ramène à votre propre autorité intérieure et aux signaux de votre corps." },
  { q: "C'est un investissement important pour moi.", a: "C'est un engagement envers vous-même. C'est pour cela que nous offrons des options de versements, et surtout une Garantie Cœur Léger de 15 jours. Si vous sentez que ce n'est pas votre place, vous serez remboursée." },
  { q: "À quelle heure ont lieu les rencontres en direct ?", a: "Les heures varient selon votre localisation dans le monde. Consultez le calendrier juste au-dessous pour voir l'horaire exact selon votre propre fuseau horaire (Québec, France, etc)." },
];

const SCHEDULE = [
  { pillar: 'Pilier 1', weeks: [{ id: 1, date: '19 avril' }, { id: 2, date: '26 avril' }, { id: 3, date: '3 mai' }, { id: 4, date: '10 mai' }] },
  { pillar: 'Pilier 2', weeks: [{ id: 5, date: '17 mai' }, { id: 6, date: '24 mai' }, { id: 7, date: '31 mai' }, { id: 8, date: '7 juin' }] },
  { pillar: 'Pilier 3', weeks: [{ id: 9, date: '14 juin' }, { id: 10, date: '21 juin' }, { id: 11, date: '28 juin' }, { id: 12, date: '5 juillet' }] },
];

const TESTIMONIALS = [
  { quote: "Personne ne parle de ces choses-là comme Krystine. Quand elle explique, tout devient clair.", who: 'Annie' },
  { quote: "Je me suis rarement écoutée tout au long de ma vie. C'est la première fois que quelqu'un me donne les outils pour le faire.", who: 'Françoise' },
  { quote: "Ce que j'ai lu dans cent livres sans comprendre, Krystine l'a rendu évident.", who: 'Marie' },
];

const CHECKOUT = 'https://www.krystinestlaurent.com/offers/KHHc9r9b/checkout';
const goCheckout = () => window.open(CHECKOUT, '_blank', 'noopener,noreferrer');

/* ════════════════════════ Sections ════════════════════════ */

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
          <p className="px-6 md:px-8 pb-7 text-inkSoft leading-[1.8] font-sans text-[0.95rem] max-w-[60ch]">{a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-cream2 py-24 md:py-32">
      <div className="mx-auto w-full max-w-[860px] px-6 md:px-12">
        <Reveal className="text-center mb-12">
          <Eyebrow>Avant de dire oui</Eyebrow>
          <SectionTitle className="mt-4 uppercase tracking-[0.02em] text-[clamp(1.7rem,3.2vw,2.5rem)]">
            Ce qui se murmure avant de dire oui
          </SectionTitle>
        </Reveal>
        <Reveal>
          {FAQS.map((f, i) => (
            <FAQItem key={i} i={i} q={f.q} a={f.a} open={open === i} onClick={() => setOpen(open === i ? null : i)} />
          ))}
        </Reveal>
      </div>
    </section>
  );
};

const ScheduleSection: React.FC = () => {
  const [tz, setTz] = useState('America/Toronto');
  const time = useMemo(() => {
    try {
      const s = new Date('2026-05-03T08:30:00-04:00'), e = new Date('2026-05-03T10:30:00-04:00');
      const f = new Intl.DateTimeFormat('fr-CA', { hour: 'numeric', minute: '2-digit', timeZone: tz });
      return `${f.format(s).replace(' h ', 'h')} à ${f.format(e).replace(' h ', 'h')}`;
    } catch { return '8h30 à 10h30'; }
  }, [tz]);
  return (
    <section id="programme" className="bg-cream py-24 md:py-32">
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 lg:items-start">
          <div className="lg:col-span-5">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-brass/12 text-brassInk px-4 py-1.5 text-[0.62rem] font-sans uppercase tracking-[0.2em]">
                <Calendar size={14} /> Calendrier de la traversée
              </span>
              <SectionTitle className="mt-6">Cohorte Fondatrice<br /><span className="italic font-normal text-brassInk">Horaire 2026</span></SectionTitle>
            </Reveal>
            <Reveal delay={0.1} className="mt-10 space-y-6">
              <div className="rounded-3xl border border-cream3 bg-card p-6 relative">
                <div className="flex items-center gap-3 mb-3">
                  <span className="grid place-items-center w-10 h-10 rounded-2xl bg-brass text-espressoDeep"><Radio size={18} /></span>
                  <h3 className="font-serif text-2xl text-ink">Le Dimanche : le direct</h3>
                </div>
                <p className="text-inkSoft leading-relaxed mb-4 font-sans text-[0.95rem]">Rencontres en direct, tous les dimanches.</p>
                <div className="rounded-2xl border border-brass/20 bg-cream2 p-4 flex flex-col gap-3">
                  <span className="font-serif text-2xl text-brassInk tabular-nums">{time}</span>
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brassInk pointer-events-none" />
                    <select value={tz} onChange={(e) => setTz(e.target.value)} aria-label="Fuseau horaire"
                      className="w-full appearance-none bg-card border border-brass/30 rounded-lg py-2.5 pl-10 pr-9 text-sm text-ink cursor-pointer focus:outline-none focus:ring-1 focus:ring-brass min-h-[44px]">
                      <optgroup label="Principaux">
                        <option value="America/Toronto">Québec (heure de l'Est)</option>
                        <option value="Europe/Paris">France (Europe centrale)</option>
                      </optgroup>
                      <optgroup label="Autres fuseaux">
                        <option value="Europe/London">Royaume-Uni (Londres)</option>
                        <option value="America/Vancouver">Canada (Pacifique)</option>
                        <option value="America/Halifax">Canada (Atlantique)</option>
                        <option value="Indian/Reunion">La Réunion</option>
                        <option value="America/Martinique">Martinique / Guadeloupe</option>
                        <option value="Pacific/Noumea">Nouvelle-Calédonie</option>
                        <option value="Pacific/Tahiti">Polynésie française</option>
                      </optgroup>
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-brassInk pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-cream3 bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="grid place-items-center w-10 h-10 rounded-2xl bg-forest text-cream"><Clock size={18} /></span>
                  <h3 className="font-serif text-2xl text-ink">Le Jeudi : les enseignements</h3>
                </div>
                <p className="text-inkSoft leading-relaxed font-sans text-[0.95rem]"><span className="text-brassInk font-medium">Enseignements audio + PDF</span> déposés sur votre portail chaque jeudi matin.</p>
              </div>
              <p className="text-sm italic text-inkSoft/80 leading-relaxed">Chaque rencontre est disponible en rediffusion dans les 24 heures. Vous pouvez poser vos questions à l'avance.</p>
            </Reveal>
          </div>
          <div className="lg:col-span-7 space-y-7">
            {SCHEDULE.map((p, pi) => (
              <Reveal key={p.pillar} delay={pi * 0.08}>
                <div className="flex items-center gap-4 mb-3">
                  <h4 className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brassInk whitespace-nowrap">{p.pillar}</h4>
                  <span className="flex-1 h-px bg-brass/20" />
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {p.weeks.map((w) => (
                    <div key={w.id} className="rounded-2xl border border-brass/20 bg-card p-5 text-center">
                      <div className="text-[0.6rem] uppercase tracking-[0.18em] text-brassInk font-semibold mb-1">Semaine {w.id}</div>
                      <div className="font-serif text-xl text-ink">{w.date}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const OrigineExperience: React.FC = () => {
  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO (motionsites A4 Ken Burns + D1 éditorial 2-col) ─────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-espressoDeep">
        <div className="pointer-events-none absolute -top-1/4 -left-1/4 h-[70%] w-[70%] rounded-full bg-forest/20 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-1/4 -right-1/5 h-[60%] w-[60%] rounded-full bg-brass/10 blur-[150px]" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            <p className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-8">Expérience Origine</p>
            <h1 className="font-serif font-medium text-ctext leading-[0.98] text-[clamp(2.4rem,5.2vw,4.4rem)] max-w-[15ch]">Vous n'avez pas besoin de plus d'information.</h1>
            <p className="mt-7 font-serif italic text-[clamp(1.4rem,3vw,2.3rem)] leading-snug text-ctextSoft max-w-[20ch]">Vous avez besoin de revenir à <span className="text-brassBright not-italic">votre point d'origine.</span></p>
            <div className="mt-12 flex flex-wrap items-center gap-6">
              <a href="#curriculum" className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]">Découvrir le parcours <ArrowRight size={16} /></a>
              <span className="font-serif italic text-ctextSoft/80 text-base">« Catherine, participante fondatrice »</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease, delay: 0.15 }} className="relative">
            <div className="relative rounded-[1.8rem] overflow-hidden border border-brass/25 shadow-[0_30px_80px_rgba(0,0,0,0.5)] aspect-[16/11]">
              <motion.img
                src="https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg"
                alt="Enveloppe Expérience Origine, sceau boussole, sauge et lavande"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                animate={{ scale: [1.05, 1.13] }}
                transition={{ duration: 26, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
              />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(120deg, rgba(22,16,10,0.45) 0%, transparent 45%)' }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────── CURRICULUM ─────────── */}
      <section id="curriculum" className="bg-cream py-24 md:py-36">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center">
            <Eyebrow>12 semaines · trois piliers</Eyebrow>
            <SectionTitle className="mt-5 uppercase tracking-[0.02em]">Retour au Point d'Origine</SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-inkSoft max-w-[40ch] mx-auto">Une sagesse de 5 000 ans, dans votre réalité d'aujourd'hui.</p>
          </Reveal>
          <div className="relative mt-24">
            <div className="pointer-events-none absolute left-[7px] md:left-1/2 top-2 bottom-2 w-px bg-gradient-to-b from-forest/0 via-forest/40 to-forest/0 md:-translate-x-1/2" aria-hidden />
            <div className="space-y-24 md:space-y-32">
              {PILLARS.map((p, i) => (
                <Reveal key={p.roman}>
                  <article className="relative grid md:grid-cols-2 gap-x-16 gap-y-6 items-start">
                    <span className="absolute left-0 md:left-1/2 top-2 h-3.5 w-3.5 rounded-full bg-brass ring-4 ring-cream md:-translate-x-1/2" aria-hidden />
                    <div className={`pl-9 md:pl-0 ${i % 2 === 0 ? 'md:text-right md:pr-16' : 'md:order-2 md:pl-16'}`}>
                      <p className="font-sans text-[0.6rem] uppercase tracking-[0.26em] text-brassInk">{p.range}</p>
                      <p className="mt-3 font-serif text-forestDeep text-[0.95rem] uppercase tracking-[0.18em]">{p.roman}</p>
                      <h3 className="mt-2 font-serif font-medium text-ink leading-[1.05] text-[clamp(1.7rem,2.8vw,2.4rem)]">{p.subtitle}</h3>
                    </div>
                    <div className={`pl-9 md:pl-0 ${i % 2 === 0 ? '' : 'md:order-1 md:text-right md:pr-16'}`}>
                      <p className="font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[46ch]">{p.body}</p>
                      <p className={`mt-7 font-serif italic text-brassInk text-[clamp(1.15rem,1.7vw,1.45rem)] leading-snug max-w-[42ch] ${i % 2 === 0 ? '' : 'md:ml-auto'}`}>{p.reflection}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── CTA BAND ─────────── */}
      <section className="bg-espresso py-20 md:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12 text-center">
          <Reveal>
            <p className="mx-auto max-w-[52ch] font-serif text-[clamp(1.2rem,2.1vw,1.7rem)] leading-snug text-ctext">12 semaines pour comprendre les messages du corps, retrouver ce qui nous appartient, ancrer les rituels qui tiennent, et revenir au point d'origine.</p>
            <button onClick={() => document.getElementById('tarifs')?.scrollIntoView({ behavior: 'smooth' })} className="mt-10 inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]">Rejoindre l'Expérience Origine <ArrowRight size={16} /></button>
          </Reveal>
        </div>
      </section>

      {/* ─────────── TRILOGIE ─────────── */}
      <section className="bg-cream2 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal>
            <Eyebrow>L'Œuvre fondatrice</Eyebrow>
            <SectionTitle className="mt-4">La Trilogie d'Origine</SectionTitle>
            <div className="mt-5 h-px w-16 bg-brass" />
            <p className="mt-7 font-sans text-[1.05rem] leading-[1.85] text-inkSoft max-w-[46ch]">Trois livres. 8 ans. 1200 pages inspirées de l'Ayurveda, <span className="text-brassInk font-medium">et une partie de leur contenu inédit nourrit Expérience Origine avant même sa publication.</span></p>
            <p className="mt-8 font-script text-[2rem] text-brassInk leading-none" style={{ fontFamily: '"Pinyon Script", cursive' }}>Krystine</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-[2rem] border border-cream3 bg-card p-5 md:p-8 shadow-xl">
              <img src="https://wsrv.nl/?url=https%3A%2F%2Fstorage.googleapis.com%2Forigine1%2FA%25CC%2580%2520venir%2520biento%25CC%2582t!.png&w=1200&output=webp" alt="La Trilogie d'Origine" loading="lazy" className="w-full h-auto object-contain max-h-[560px] mx-auto" referrerPolicy="no-referrer" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── COMMENT ÇA MARCHE ─────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center mb-16">
            <Eyebrow>Chaque semaine</Eyebrow>
            <SectionTitle className="mt-4">Ce qui travaille pour vous chaque semaine</SectionTitle>
            <div className="mt-5 h-px w-24 bg-brass mx-auto" />
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WORKS.map((w, i) => (
              <Reveal key={w.title} delay={(i % 3) * 0.06}>
                <div className="h-full rounded-3xl bg-card border-l-[3px] border-l-brass border-y border-r border-cream3 p-8 md:p-9 transition-shadow hover:shadow-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-brass shrink-0" />
                    <h3 className="font-serif text-xl md:text-2xl text-ink">{w.title}</h3>
                  </div>
                  <p className="font-sans text-[0.95rem] leading-[1.8] text-inkSoft md:pl-7">{w.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-16">
            <p className="font-serif italic text-brassInk text-[clamp(1.3rem,2.4vw,2rem)] max-w-[44ch] mx-auto leading-snug">12 semaines pour comprendre les messages du corps, retrouver ce qui nous appartient et revenir <span className="uppercase tracking-[0.12em] not-italic font-medium">au point d'Origine</span>.</p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── GRIMOIRE / JOURNAL ─────────── */}
      <section className="bg-cream3 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-12 grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-brass/30 text-brassInk px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em]"><BookOpen size={12} /> Journal d'observation</span>
            <SectionTitle className="mt-5">L'accompagnement pour réfléchir, noter, observer, intégrer.</SectionTitle>
            <ul className="mt-8 space-y-4">
              {["L'observation des repères saisonniers pour s'ajuster au fil des semaines.", "L'intégration de rituels ancrés dans la sagesse ayurvédique.", "L'espace d'écriture pour suivre ce qui se dépose en vous."].map((li) => (
                <li key={li} className="flex items-start gap-3 text-inkSoft font-sans text-[0.98rem] leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-forest shrink-0" />{li}
                </li>
              ))}
            </ul>
            <p className="mt-8 inline-flex items-center gap-2 text-brassInk font-medium text-sm"><Check size={16} /> Inclus dans Expérience Origine</p>
          </Reveal>
          <Reveal delay={0.1} className="flex justify-center">
            <div className="relative w-full max-w-[400px] aspect-[3/4] rounded-l-md rounded-r-2xl border-l-[8px] border-brass shadow-2xl overflow-hidden bg-card">
              <img src="https://storage.googleapis.com/origine1/Livre%20cover%20origine.jpeg" alt="Journal d'observation et de rituels" loading="lazy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── BIO KRYSTINE ─────────── */}
      <section id="about" className="bg-espressoSoft py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-12 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="order-last lg:order-first">
            <div className="relative rounded-[2rem] overflow-hidden aspect-[4/5] shadow-2xl">
              <img src="https://wsrv.nl/?url=storage.googleapis.com/origine1/krystine%20red%20NG.webp&w=1000&output=webp" alt="Krystine St-Laurent" loading="lazy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <SectionTitle on="dark">Krystine St-Laurent</SectionTitle>
            <p className="mt-6 font-sans text-[1.02rem] leading-[1.85] text-ctextSoft max-w-[52ch]">35 ans en première ligne, soins intensifs, recherche clinique, les coulisses du système, avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie. Auteure de trois livres aux Éditions de l'Homme. Créatrice de la série télé Santé la vie et du podcast Au-delà des tendances. Elle a vu ce que l'approche moderne fait bien. Et elle a vu là où elle laisse les gens seuls. Les rituels qu'elle enseigne, elle les pratique chaque matin.</p>
            <div className="mt-8 space-y-5 border-l-2 border-forestSoft/60 pl-6">
              {TESTIMONIALS.map((t) => (
                <p key={t.who} className="text-forestSoft">
                  <span className="font-serif italic text-[1.05rem] leading-snug">« {t.quote} »</span>
                  <span className="block mt-1 text-ctextSoft/70 text-sm not-italic">— {t.who}</span>
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── TARIFS ─────────── */}
      <section id="tarifs" className="bg-cream py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-12">
          <Reveal className="text-center mb-12">
            <Eyebrow>Cohorte fondatrice</Eyebrow>
            <SectionTitle className="mt-4">Expérience Origine</SectionTitle>
            <p className="mt-6 font-script text-[clamp(1.8rem,3.5vw,2.6rem)] text-brassInk" style={{ fontFamily: '"Pinyon Script", cursive' }}>Le corps sait. Il manquait la carte pour le lire.</p>
          </Reveal>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Table de valeur */}
            <Reveal className="lg:col-span-7">
              <div className="rounded-[2rem] border border-cream3 bg-card p-6 md:p-9 shadow-lg">
                <div className="flex justify-between items-end border-b border-brass/20 pb-4 mb-6">
                  <h3 className="font-serif font-medium text-lg md:text-xl uppercase tracking-[0.08em] text-ink">Ce que vous recevez</h3>
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-brassInk">Valeur</span>
                </div>
                <div>
                  {VALUE_ITEMS.map((it, i) => (
                    <div key={i} className={`flex justify-between items-start gap-4 py-4 ${i < VALUE_ITEMS.length - 1 ? 'border-b border-cream3' : ''}`}>
                      <div className="pr-2">
                        <p className="font-sans text-[0.95rem] font-semibold text-ink leading-snug">{it.title}</p>
                        <p className="mt-1 font-sans text-[0.82rem] italic text-inkSoft leading-relaxed max-w-[52ch]">{it.detail}</p>
                      </div>
                      <span className="font-serif font-medium text-lg text-brassInk tabular-nums whitespace-nowrap">{it.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl bg-forest/8 border border-forest/20 p-5 flex justify-between items-center gap-4">
                  <span className="font-sans text-[0.9rem] text-inkSoft">15 % sur toute la boutique Inspirata Ayurveda (rituels, soins, présence)</span>
                  <span className="font-serif font-medium text-brassInk tabular-nums whitespace-nowrap">(~150 $)</span>
                </div>
                <div className="mt-8 pt-6 border-t border-brass/20 space-y-3">
                  <div className="flex justify-between items-center text-inkSoft">
                    <span className="uppercase tracking-[0.1em] text-sm">Valeur totale</span>
                    <span className="font-serif text-xl line-through decoration-brass/70 tabular-nums">6 957 $</span>
                  </div>
                  <div className="flex justify-between items-center text-inkSoft">
                    <span className="uppercase tracking-[0.1em] text-sm">Avec bonus</span>
                    <span className="font-serif text-xl line-through decoration-brass/70 tabular-nums">7 254 $+</span>
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <span className="font-serif font-medium text-lg uppercase tracking-[0.08em] text-ink">Vous payez</span>
                    <span className="font-serif font-medium text-4xl text-brassInk tabular-nums">997 $</span>
                  </div>
                  <p className="text-right font-sans text-[0.85rem] italic text-brassInk">Tarif exceptionnel de lancement de la cohorte fondatrice. Pour un temps limité. (vraiment)</p>
                </div>
              </div>
            </Reveal>

            {/* Panneau prix + action */}
            <Reveal delay={0.1} className="lg:col-span-5">
              <div className="rounded-[2rem] border border-brass/30 bg-espresso p-8 md:p-10 text-center">
                <p className="font-serif font-medium uppercase tracking-[0.12em] text-brass text-lg md:text-xl leading-tight">Tarif cohorte fondatrice<br /><span className="text-forestSoft text-base font-normal">prix de lancement</span></p>
                <div className="mt-6 flex items-start justify-center text-ctext">
                  <span className="font-serif text-7xl md:text-8xl tabular-nums leading-none">997</span>
                  <span className="text-3xl mt-2 ml-1">$</span>
                </div>
                <div className="mt-6 inline-flex flex-col items-center rounded-2xl border border-ctextSoft/20 bg-espressoDeep/40 px-7 py-4">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ctextSoft/70">Prix régulier</span>
                  <span className="font-serif text-xl text-ctextSoft tabular-nums">1 297 $</span>
                </div>
                <button onClick={goCheckout} className="mt-8 w-full rounded-xl bg-brass py-4 font-serif text-base tracking-[0.12em] uppercase text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]">Commencer la traversée</button>
                <p className="mt-5 text-[0.78rem] text-ctextSoft/60">Options de versements disponibles : 3 × 314 $ ou 6 × 165 $ par mois.</p>
                <div className="mt-8 text-left rounded-2xl bg-brass/8 border border-brass/20 p-6">
                  <h4 className="font-serif text-base font-medium text-brass uppercase tracking-[0.1em] mb-4">Privilèges exclusifs fondatrice</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-sm text-ctextSoft">Rediffusions Dimanches d'Origine</span>
                      <span className="text-sm font-serif text-brass whitespace-nowrap tabular-nums">297 $</span>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-sm text-ctextSoft">Accès au contenu inspiré du troisième tome (parution 14 octobre 2026)</span>
                      <span className="text-sm font-serif italic text-brass whitespace-nowrap">Inestimable</span>
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-[0.78rem] italic text-ctextSoft/60 leading-relaxed"><span className="text-brass font-medium">La cohorte a commencé le 19 avril</span>, vous pouvez rejoindre jusqu'au 27 en intégrant la rediffusion.</p>
              </div>
            </Reveal>
          </div>

          {/* Garantie */}
          <Reveal className="mt-10">
            <div className="mx-auto max-w-[760px] rounded-3xl border border-cream3 bg-card p-8 md:p-10 text-center shadow-sm">
              <h4 className="font-serif font-medium text-xl md:text-2xl text-ink uppercase tracking-[0.08em] mb-4">Notre garantie cœur léger, 30 jours</h4>
              <p className="font-sans text-[1.02rem] italic leading-relaxed text-inkSoft max-w-[60ch] mx-auto">Si après <span className="text-brassInk font-medium not-italic">30 jours</span> vous sentez que ce cadre ne vous convient pas, nous vous <span className="text-brassInk font-medium not-italic">remboursons</span>. Sans question. Cela enlève le risque.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <FaqSection />

      {/* ─────────── PROGRAMME ─────────── */}
      <ScheduleSection />

      {/* ─────────── AUDIO 19 MIN ─────────── */}
      <section className="bg-espressoDeep py-24 md:py-32">
        <div className="mx-auto w-full max-w-[760px] px-6 md:px-12 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-brass/15 text-brass px-4 py-1.5 text-[0.62rem] uppercase tracking-[0.2em]"><Play size={13} /> Audio spécial</span>
            <SectionTitle on="dark" className="mt-6">Écoutez l'audio spécial Origine</SectionTitle>
            <p className="mt-5 font-serif italic text-[clamp(1.1rem,2vw,1.45rem)] text-ctextSoft max-w-[46ch] mx-auto">19 minutes. Pas de texte, pas de plan. Juste un élan. Pourquoi Expérience Origine ne pouvait pas attendre.</p>
            <audio controls preload="none" className="mt-10 w-full max-w-[560px] mx-auto">
              <source src="https://storage.googleapis.com/origine1/AUDIO%20V3%20Expe%CC%81rience%20origine%20audio%20%20-%202026-02-28%2C%201.37%E2%80%AFPM.mp3" type="audio/mpeg" />
            </audio>
          </Reveal>
        </div>
      </section>

      {/* ─────────── CONTACT ─────────── */}
      <section className="bg-cream py-16 md:py-20 text-center">
        <a href="mailto:teamksl@inspiratanature.com" className="font-serif italic text-brassInk hover:text-brassBright transition-colors text-lg md:text-xl border-b border-brass/30 pb-1">Une question ? Écrivez à teamksl@inspiratanature.com</a>
      </section>

    </div>
  );
};

export default OrigineExperience;
