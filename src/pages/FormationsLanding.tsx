import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { goToRoute } from '../lib/staticRoutes';

/**
 * /formations : les trois formations, rien d'autre. Même canon que la page
 * /speaking : vert profond en ouverture, ivoire ensuite, ambre pour l'accent,
 * Cormorant pour les titres et Inter pour le reste. Chaque formation a sa
 * propre page de vente : ici, la liste se lit et se choisit, sans répéter
 * ce que les fiches disent déjà.
 */

const EASE = [0.16, 0.8, 0.24, 1] as const;

interface Programme {
  key: string;
  n: string;
  tag: string;
  title: string;
  subtitle: string;
  body: string;
  facts: string[];
  price?: string;
  cta: string;
  href: string;
  image: string;
}

const PROGRAMMES: Programme[] = [
  {
    key: 'origine', n: '01',
    tag: 'Parcours signature · 12 semaines',
    title: "L'Expérience Origine",
    subtitle: 'Sortir du pilotage extérieur et retrouver vos propres repères',
    body: "Douze semaines accompagnées au cœur de l'Ayurveda, avec un audio, un guide et un direct chaque semaine. La prochaine cohorte s'annonce d'abord à la liste d'attente.",
    facts: ['12 semaines', 'Cohorte accompagnée'],
    cta: "Découvrir l'Expérience Origine",
    href: '/origine',
    image: 'https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg',
  },
  {
    key: 'foyer', n: '02',
    tag: 'Autour du feu · Ouvert',
    title: "Le Foyer d'Origine",
    subtitle: 'Le calendrier vivant des douze portes',
    body: "Un lieu pour revenir à vos propres repères, une porte à la fois. Chaque mois, une porte s'ouvre avec ses leçons, ses documents et son fil d'échanges avec Krystine et les autres membres.",
    facts: ['Douze portes, une par mois', 'Accès immédiat'],
    price: '497 $',
    cta: 'Entrer au Foyer',
    href: '/foyer',
    image: '/assets/foyer-visuel-16x9.jpg',
  },
  {
    key: 'vata', n: '03',
    tag: 'Saison Vata · En autonomie',
    title: 'Programme Vata',
    subtitle: 'Enraciner, réchauffer, apaiser',
    body: "Vent, sécheresse, dispersion : la saison Vata teste les nerfs. Un programme guidé de sept semaines pour ancrer le corps et la tête avant l'hiver, à suivre à votre rythme.",
    facts: ['Sept semaines', 'À votre rythme'],
    price: '397 $',
    cta: 'Découvrir le programme Vata',
    href: '/vata',
    image: 'https://firebasestorage.googleapis.com/v0/b/krystinestlaurent-87566.firebasestorage.app/o/formations%2Fkajabi-2148727800%2Fvignette.jpg?alt=media&token=36541136-478a-47a7-b2b3-1e9a6e33b9cf',
  },
];

const FormationsLanding: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const go = (href: string) => goToRoute(navigate, href);
  const up = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease: EASE, delay },
  });

  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#293027]">
      {/* ─────────── HERO, vert profond comme /speaking ─────────── */}
      <section className="relative overflow-hidden bg-[#1b2622] px-[clamp(1.5rem,5vw,5.5rem)] pt-40 pb-20 text-[#EEE7DB] md:pt-48 md:pb-28">
        <div aria-hidden className="pointer-events-none absolute -left-[18vw] -top-[24vw] h-[70vw] w-[70vw] max-h-[900px] max-w-[900px] rounded-full blur-[30px]"
          style={{ background: 'radial-gradient(circle, rgba(217,154,82,.42) 0%, rgba(186,123,57,.18) 32%, rgba(40,53,47,0) 68%)' }} />
        <div aria-hidden className="pointer-events-none absolute -right-[8vw] -bottom-[18vw] h-[44vw] w-[44vw] rounded-full blur-[40px]"
          style={{ background: 'radial-gradient(circle, rgba(139,74,47,.35) 0%, rgba(40,53,47,0) 65%)' }} />
        <div className="relative mx-auto max-w-[1320px]">
          <motion.p {...up(0.1)} className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#BA7B39]">Ayurveda · Corps · Cycles</motion.p>
          <motion.h1 {...up(0.2)} className="mt-5 max-w-[11em] font-serif text-[clamp(2.7rem,5.4vw,5rem)] font-medium leading-[1.02] tracking-[-0.015em]">
            Les formations
          </motion.h1>
          <motion.p {...up(0.32)} className="mt-6 max-w-[34rem] font-serif text-[clamp(1.15rem,1.6vw,1.4rem)] leading-[1.5] text-[#EEE7DB]/80">
            Trois façons de revenir au corps avec Krystine : une cohorte accompagnée, un foyer qui s'ouvre porte après porte, et un programme de saison à suivre à votre rythme.
          </motion.p>
        </div>
      </section>

      {/* ─────────── LES TROIS FORMATIONS ─────────── */}
      <section className="px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(3rem,7vh,5.5rem)] pb-[clamp(5rem,10vh,8rem)]">
        <div className="mx-auto max-w-[1320px]">
          {PROGRAMMES.map((p, i) => (
            <motion.article
              key={p.key}
              initial={reduce ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 1, ease: EASE, delay: i * 0.08 }}
              onClick={() => go(p.href)}
              className="group grid cursor-pointer items-center gap-6 border-t border-[#293027]/15 py-10 md:grid-cols-[70px_minmax(0,5fr)_minmax(0,6fr)_auto] md:gap-10 md:py-12 last:border-b"
            >
              <span className="font-serif text-[2.4rem] leading-none text-[#BA7B39]">{p.n}</span>
              <div className="overflow-hidden rounded-[14px] shadow-[0_30px_60px_-40px_rgba(41,48,39,0.5)]">
                <img src={p.image} alt="" loading={i === 0 ? 'eager' : 'lazy'} width={800} height={600}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.04]" />
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#BA7B39]">{p.tag}</p>
                <h2 className="mt-3 font-serif text-[clamp(1.9rem,3vw,2.7rem)] font-medium leading-[1.05] tracking-[-0.01em]">{p.title}</h2>
                <p className="mt-1.5 font-serif text-lg text-[#8B4A2F]">{p.subtitle}</p>
                <p className="mt-4 max-w-[42rem] leading-[1.7] text-[#5b5f55]">{p.body}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {p.facts.map(f => (
                    <li key={f} className="rounded-full border border-[#293027]/15 px-3.5 py-1.5 text-[0.72rem] tracking-[0.06em] text-[#293027]">{f}</li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8B4A2F]">
                  {p.cta} <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
              <div className="flex items-center gap-6 md:flex-col md:items-end md:gap-3">
                {p.price && <span className="font-serif text-3xl text-[#293027]">{p.price}</span>}
                <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#293027]/25 text-[#293027] transition-all duration-300 group-hover:border-[#BA7B39] group-hover:bg-[#BA7B39] group-hover:text-[#fff8ee]">
                  <ArrowRight size={16} weight="bold" />
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FormationsLanding;
