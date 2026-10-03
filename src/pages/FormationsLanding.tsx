import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { goToRoute } from '../lib/staticRoutes';
import { enLancement, TIERS } from './vata/offre';
import { SEMAINES_VATA } from './vata/semaines';

/**
 * /formations (et /parcours) : les trois portes, dans l'ordre voulu par
 * Krystine. Le Foyer d'abord (la continuité), EXPÉRIENCE ORIGINE ensuite (le
 * parcours accompagné), puis VATA Essentiel, qui se suit dès maintenant.
 * Trois grandes cartes visibles d'emblée : la carte VATA Essentiel mène en
 * entier à /vata, avec son prix tiré de la même source que la page de vente
 * (Krystine, 2 oct. 2026 : le chemin en deux clics). Les parcours en liste
 * d'attente suivent plus bas, visibles et sobres.
 */

const EASE = [0.16, 0.8, 0.24, 1] as const;
const ENCRE = '#1c1712';
const OR_ENCRE = '#7d6330';

interface Porte {
  key: string;
  tag: string;
  title: string;
  subtitle: string;
  body: string;
  cta: string;
  href: string;
  image: string;
  /** Le cadrage dans la carte 16:10, pour garder le sujet de l'image. */
  cadrage?: string;
  /** Une courte vidéo muette en boucle à la place de l'image (l'image sert d'affiche). */
  video?: string;
  prix?: boolean;
}

const OFFRE_VATA = TIERS[0];

const PORTES: Porte[] = [
  // VATA Essentiel en première carte : la seule porte ouverte à l'achat (Krystine, 2 oct. 2026).
  {
    key: 'vata',
    tag: "L'Expérience Ayurveda · Saison Vata",
    title: OFFRE_VATA.name,
    subtitle: 'Un parcours de sept semaines, accès immédiat.',
    body: "16 capsules, 7 méditations guidées, le journal de bord et d'observation, et le guide de 204 pages.",
    cta: 'Découvrir VATA Essentiel',
    href: '/vata',
    image: '/vata/carte-eventail.jpg',
    cadrage: '50% 40%',
    prix: true,
  },
  {
    key: 'origine',
    tag: '12 semaines accompagnées',
    title: 'Expérience Origine 2',
    subtitle: 'Le chemin accompagné.',
    body: 'Lire, trier, ancrer pour retrouver ses propres repères.',
    cta: 'Découvrir Expérience Origine 2',
    href: '/liste-attente?programme=origine2',
    image: '/origine2/packshot-poster.jpg',
    video: '/origine2/packshot.mp4',
    cadrage: '45% 50%',
  },
];

// Les parcours qui reviennent un à un : chacun a sa liste d'attente.
interface Parcours { slug: string; titre: string; sous: string; href?: string; cta?: string }
const EN_ATTENTE: Parcours[] = [
  // Le Foyer attend sa réouverture (Krystine, 2 oct. 2026) : hors des grandes
  // cartes pendant le lancement de VATA Essentiel, mais sa liste d'attente reste.
  { slug: 'foyer', titre: "Le Foyer d'Origine", sous: "L'espace de continuité, une porte à la fois", href: '/liste-attente?programme=foyer', cta: 'Être avisée de la réouverture' },
  { slug: 'pitta', titre: 'Saison Pitta', sous: 'Rafraîchir, apaiser, adoucir lorsque la chaleur monte' },
  { slug: 'kapha', titre: 'Saison Kapha', sous: "Bouger, drainer, alléger à l'éveil du printemps" },
  { slug: 'vitalite-clarte', titre: 'Vitalité et Clarté', sous: "Trente jours pour changer d'énergie" },
  { slug: 'cinq-rituels', titre: "Cinq rituels pour apaiser l'esprit", sous: 'Retrouver son centre au quotidien' },
  { slug: 'boussole', titre: "L'Ayurveda comme boussole ancestrale", sous: 'Les repères qui traversent les saisons' },
  { slug: 'dharma', titre: 'Aligner son feu avec sa mission', sous: 'Le Dharma, en huit clés concrètes' },
  { slug: 'trois-jours', titre: "Trois jours pour revenir à l'essentiel", sous: 'Sortir du bruit et se retrouver' },
];

const FormationsLanding: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const lancement = enLancement();
  const go = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
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
      <section className="relative overflow-hidden bg-[#1b2622] px-[clamp(1.5rem,5vw,5.5rem)] pt-32 pb-14 text-[#EEE7DB] md:pt-40 md:pb-20">
        <div aria-hidden className="pointer-events-none absolute -left-[18vw] -top-[24vw] h-[70vw] w-[70vw] max-h-[900px] max-w-[900px] rounded-full blur-[30px]"
          style={{ background: 'radial-gradient(circle, rgba(217,154,82,.42) 0%, rgba(186,123,57,.18) 32%, rgba(40,53,47,0) 68%)' }} />
        <div aria-hidden className="pointer-events-none absolute -right-[8vw] -bottom-[18vw] h-[44vw] w-[44vw] rounded-full blur-[40px]"
          style={{ background: 'radial-gradient(circle, rgba(139,74,47,.35) 0%, rgba(40,53,47,0) 65%)' }} />
        <div className="relative mx-auto max-w-[1320px]">
          <motion.p {...up(0.1)} className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#BA7B39]">Deux façons d'aller plus loin</motion.p>
          <motion.h1 {...up(0.2)} className="mt-5 max-w-[11em] font-serif text-[clamp(2.7rem,5.4vw,5rem)] font-medium leading-[1.02] tracking-[-0.015em]">
            Choisir votre prochaine porte
          </motion.h1>
          <motion.p {...up(0.32)} className="mt-6 max-w-[36rem] font-serif text-[clamp(1.15rem,1.6vw,1.4rem)] leading-[1.5] text-[#EEE7DB]/80">
            Selon le moment où vous êtes : vivre un parcours accompagné, ou approfondir un sujet en autonomie.
          </motion.p>
        </div>
      </section>

      {/* ─────────── LES PORTES OUVERTES, deux grandes cartes ─────────── */}
      <section className="px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(2.5rem,6vh,4.5rem)] pb-[clamp(3.5rem,8vh,6rem)]">
        <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-2 md:gap-8">
          {PORTES.map((p, i) => (
            <motion.a
              key={p.key}
              href={p.href}
              onClick={(e) => go(e, p.href)}
              initial={reduce ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.25 + i * 0.08 }}
              className="group flex flex-col overflow-hidden rounded-[16px] border border-[#293027]/12 bg-[#fbf8f2] shadow-[0_30px_60px_-46px_rgba(41,48,39,0.55)] transition-[border-color,box-shadow] duration-500 hover:border-[#7d6330]/45 hover:shadow-[0_36px_70px_-44px_rgba(41,48,39,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7d6330]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#1b2622]/5">
                {p.video && !reduce ? (
                  <video src={p.video} poster={p.image} autoPlay muted loop playsInline preload="metadata" aria-hidden
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.03]"
                    style={p.cadrage ? { objectPosition: p.cadrage } : undefined} />
                ) : (
                  <img src={p.image} data-edit-key={`formations.porte.${p.key}`} alt="" loading="eager"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.03]"
                    style={p.cadrage ? { objectPosition: p.cadrage } : undefined} />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-7">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em]" style={{ color: OR_ENCRE }}>
                  {p.tag}
                </p>
                <h2 className="mt-3 font-serif text-[clamp(1.75rem,2.4vw,2.35rem)] font-medium leading-[1.05] tracking-[-0.01em]" style={{ color: ENCRE }}>{p.title}</h2>
                <p className="mt-1.5 font-serif text-lg leading-snug text-[#8B4A2F]">{p.subtitle}</p>
                <p className="mt-4 leading-[1.7] text-[#5b5f55]">{p.body}</p>
                {p.prix && (
                  <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-serif text-[2rem] leading-none tabular-nums" style={{ color: ENCRE }}>{lancement ? OFFRE_VATA.promo : OFFRE_VATA.price}</span>
                    {lancement && <span className="font-serif text-lg line-through tabular-nums text-[#1c1712]/45">{OFFRE_VATA.price}</span>}
                    {lancement && <span className="text-[0.66rem] font-semibold uppercase tracking-[0.18em]" style={{ color: OR_ENCRE }}>Tarif de lancement</span>}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-4 pt-7">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]" style={{ color: ENCRE }}>{p.cta}</span>
                  <span className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border border-[#1c1712]/30 text-[#1c1712] transition-colors duration-300 group-hover:border-[#1c1712] group-hover:bg-[#1c1712] group-hover:text-[#EEE7DB]">
                    <ArrowRight size={16} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* ─────────── LES PARCOURS À VOTRE RYTHME, en liste d'attente ─────────── */}
      <section id="a-votre-rythme" className="scroll-mt-24 px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(5rem,10vh,8rem)]">
        <div className="mx-auto max-w-[1320px] border-t border-[#293027]/15 pt-[clamp(2.5rem,6vh,4rem)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em]" style={{ color: OR_ENCRE }}>En liste d'attente</p>
          <h2 className="mt-3 max-w-[24ch] font-serif text-[clamp(1.7rem,2.6vw,2.3rem)] font-medium leading-[1.1]" style={{ color: ENCRE }}>Les autres parcours reviennent un à un.</h2>
          <p className="mt-3 max-w-[46rem] leading-[1.7] text-[#5b5f55]">Chaque parcours qui revient bientôt a sa liste d'attente. Inscrivez-vous et vous recevrez l'invitation avant toute annonce publique.</p>
          <ul className="mt-8 grid border-t border-[#293027]/12 sm:grid-cols-2 lg:grid-cols-4">
            {EN_ATTENTE.map((f) => {
              const href = f.href || `/liste-attente?programme=${f.slug}&titre=${encodeURIComponent(f.titre)}`;
              return (
                <li key={f.slug} className="border-b border-[#293027]/12">
                  <a href={href} onClick={(e) => go(e, href)} className="group flex h-full flex-col justify-between gap-4 py-5 pr-6">
                    <span>
                      <span className="block font-serif text-[1.25rem] leading-[1.2]" style={{ color: ENCRE }}>{f.titre}</span>
                      <span className="mt-1.5 block text-[0.92rem] leading-[1.55] text-[#5b5f55]">{f.sous}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#1c1712]/70 transition-colors group-hover:text-[#1c1712]">
                      {f.cta || (f.href ? 'Découvrir' : "Rejoindre la liste d'attente")} <ArrowRight size={12} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default FormationsLanding;
