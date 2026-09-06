import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { goToRoute } from '../lib/staticRoutes';

/**
 * /formations : les trois portes, dans l'ordre voulu par Krystine (septembre
 * 2026). Le Foyer d'abord (la continuité), l'Expérience Origine ensuite (le
 * parcours accompagné), puis les formations à suivre à votre rythme : le
 * programme Vata maintenant, et les autres qui reviennent une à une sur le
 * site avec leur liste d'attente. Même canon que /speaking : vert profond en
 * ouverture, ivoire ensuite, ambre pour l'accent. Les images se montrent
 * entières, jamais recadrées.
 */

const EASE = [0.16, 0.8, 0.24, 1] as const;

interface Porte {
  key: string;
  n: string;
  tag: string;
  title: string;
  subtitle: string;
  body: string;
  cta: string;
  href: string;
  image: string;
}

const PORTES: Porte[] = [
  {
    key: 'foyer', n: '01',
    tag: 'Découvrir · relier · ressentir',
    title: "Le Foyer d'Origine",
    subtitle: "L'espace de continuité.",
    body: "Une porte à la fois, tout au long de l'année.",
    cta: 'Découvrir le Foyer',
    href: '/foyer',
    image: '/assets/foyer-visuel-16x9.jpg',
  },
  {
    key: 'origine', n: '02',
    tag: 'Parcours signature · 12 semaines',
    title: 'Expérience Origine',
    subtitle: 'La transformation accompagnée.',
    body: 'Lire, trier, ancrer pour retrouver ses propres repères.',
    cta: 'Découvrir Expérience Origine',
    href: '/origine',
    image: 'https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg',
  },
  {
    key: 'rythme', n: '03',
    tag: 'Ayurveda · corps · cycles',
    title: 'Les formations à votre rythme',
    subtitle: 'Approfondir un sujet précis.',
    body: 'Programme Vata ici, une formation audio avec matériel de support, puis les autres formations qui reviendront progressivement sur le site.',
    cta: 'Voir les formations',
    href: '#a-votre-rythme',
    image: '/assets/vata-cover.webp',
  },
];

// Les formations à votre rythme : Vata se suit dès maintenant, les autres
// reviennent une à une. Chacune a sa liste d'attente en attendant.
interface Formation { slug: string; titre: string; sous: string; href?: string }
const A_VOTRE_RYTHME: Formation[] = [
  { slug: 'vata', titre: 'Programme Vata', sous: 'Une formation audio, avec son matériel de support. Sept semaines pour enraciner, réchauffer, apaiser.', href: '/vata' },
  { slug: 'pitta', titre: 'Saison Pitta', sous: 'Rafraîchir, apaiser, adoucir quand la chaleur monte' },
  { slug: 'kapha', titre: 'Saison Kapha', sous: "Bouger, drainer, alléger à l'éveil du printemps" },
  { slug: 'sante-parfaite', titre: 'Parcours Santé Parfaite', sous: 'Masterclass Énergie et Clarté' },
  { slug: 'vitalite-clarte', titre: 'Vitalité et Clarté', sous: "Trente jours pour changer d'énergie" },
  { slug: 'cinq-rituels', titre: "Cinq rituels pour apaiser l'esprit", sous: 'Retrouver son centre en quelques gestes' },
  { slug: 'boussole', titre: "L'Ayurveda comme boussole ancestrale", sous: 'Les repères qui traversent les saisons' },
  { slug: 'dharma', titre: 'Aligner son feu avec sa mission', sous: 'Le Dharma, en huit clés concrètes' },
  { slug: 'trois-jours', titre: "Trois jours pour revenir à l'essentiel", sous: 'Sortir du bruit et se retrouver' },
];

const FormationsLanding: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const go = (href: string) => {
    if (href.startsWith('#')) { document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' }); return; }
    goToRoute(navigate, href);
  };
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
          <motion.p {...up(0.1)} className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#BA7B39]">Trois façons d'aller plus loin</motion.p>
          <motion.h1 {...up(0.2)} className="mt-5 max-w-[11em] font-serif text-[clamp(2.7rem,5.4vw,5rem)] font-medium leading-[1.02] tracking-[-0.015em]">
            Choisir votre prochaine porte
          </motion.h1>
          <motion.p {...up(0.32)} className="mt-6 max-w-[36rem] font-serif text-[clamp(1.15rem,1.6vw,1.4rem)] leading-[1.5] text-[#EEE7DB]/80">
            Selon le moment où vous êtes : découvrir et rester en lien, vivre un parcours accompagné, ou approfondir un sujet à votre rythme.
          </motion.p>
        </div>
      </section>

      {/* ─────────── LES TROIS PORTES ─────────── */}
      <section className="px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(3rem,7vh,5.5rem)] pb-[clamp(3rem,6vh,4.5rem)]">
        <div className="mx-auto max-w-[1320px]">
          {PORTES.map((p, i) => (
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
              <div className="overflow-hidden rounded-[14px] bg-[#1b2622]/5 shadow-[0_30px_60px_-40px_rgba(41,48,39,0.5)]">
                <img src={p.image} alt="" loading={i === 0 ? 'eager' : 'lazy'}
                  className="block h-auto w-full transition-transform duration-[900ms] group-hover:scale-[1.03]" />
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#BA7B39]">{p.tag}</p>
                <h2 className="mt-3 font-serif text-[clamp(1.9rem,3vw,2.7rem)] font-medium leading-[1.05] tracking-[-0.01em]">{p.title}</h2>
                <p className="mt-1.5 font-serif text-lg text-[#8B4A2F]">{p.subtitle}</p>
                <p className="mt-4 max-w-[42rem] leading-[1.7] text-[#5b5f55]">{p.body}</p>
                <span className="mt-6 inline-flex items-center gap-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8B4A2F]">
                  {p.cta} <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
              <div className="flex items-center md:justify-end">
                <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#293027]/25 text-[#293027] transition-all duration-300 group-hover:border-[#BA7B39] group-hover:bg-[#BA7B39] group-hover:text-[#fff8ee]">
                  <ArrowRight size={16} weight="bold" />
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ─────────── À VOTRE RYTHME : Vata maintenant, les autres en liste d'attente ─────────── */}
      <section id="a-votre-rythme" className="scroll-mt-24 px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(5rem,10vh,8rem)]">
        <div className="mx-auto max-w-[1320px]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#BA7B39]">03 · Les formations à votre rythme</p>
          <h2 className="mt-3 max-w-[22ch] font-serif text-[clamp(1.8rem,2.8vw,2.5rem)] font-medium leading-[1.08]">Le programme Vata se suit dès maintenant. Les autres reviennent une à une.</h2>
          <p className="mt-3 max-w-[46rem] leading-[1.7] text-[#5b5f55]">Chaque formation qui n'est pas encore de retour a sa liste d'attente. Inscrivez-vous et vous recevrez l'invitation avant toute annonce publique.</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {A_VOTRE_RYTHME.map((f, i) => {
              const ouverte = !!f.href;
              const href = f.href || `/liste-attente?programme=${f.slug}&titre=${encodeURIComponent(f.titre)}`;
              return (
                <motion.li
                  key={f.slug}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, ease: EASE, delay: (i % 3) * 0.06 }}
                  onClick={() => go(href)}
                  className={`group flex cursor-pointer flex-col justify-between rounded-[14px] border p-6 transition-colors ${ouverte ? 'border-[#BA7B39]/60 bg-[#1b2622] text-[#EEE7DB]' : 'border-[#293027]/15 bg-white/50 hover:border-[#BA7B39]'}`}
                >
                  <div>
                    <p className={`text-[0.66rem] font-semibold uppercase tracking-[0.22em] ${ouverte ? 'text-[#BA7B39]' : 'text-[#8B4A2F]'}`}>{ouverte ? 'Disponible · à votre rythme' : "Liste d'attente"}</p>
                    <h3 className="mt-2 font-serif text-[1.45rem] leading-[1.15]">{f.titre}</h3>
                    <p className={`mt-2 text-[0.95rem] leading-[1.6] ${ouverte ? 'text-[#EEE7DB]/75' : 'text-[#5b5f55]'}`}>{f.sous}</p>
                  </div>
                  <span className={`mt-6 inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${ouverte ? 'text-[#BA7B39]' : 'text-[#8B4A2F]'}`}>
                    {ouverte ? 'Découvrir le programme' : "Rejoindre la liste d'attente"} <ArrowRight size={13} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default FormationsLanding;
