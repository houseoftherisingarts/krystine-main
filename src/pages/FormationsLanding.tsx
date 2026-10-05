import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { goToRoute } from '../lib/staticRoutes';
import { enLancement, TIERS } from './vata/offre';
import { SEMAINES_VATA } from './vata/semaines';
import { StyleV2, Planche, BoutonNoir, LienSouligne } from '../components/v2/Magazine';

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
    subtitle: 'Un parcours de sept semaines, la première dès l’inscription.',
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

// Ce qui s'achète dès maintenant, en tête de page (Krystine, 5 oct. 2026) :
// VATA Essentiel et Rituels vivants, en cartes V2 avec bouton noir carré.
interface Disponible { key: string; tag: string; titre: string; sous: string; corps: string; prix?: string; cta: string; href: string; image: string; cadrage: string }
const DISPONIBLES: Disponible[] = [
  {
    key: 'vata', tag: "L'Expérience Ayurveda · Saison Vata", titre: OFFRE_VATA.name,
    sous: 'Un parcours de sept semaines, la première dès l’inscription.',
    corps: "16 capsules, 7 méditations guidées, le journal de bord et d'observation, et le guide de 204 pages.",
    cta: 'Découvrir VATA Essentiel', href: '/vata', image: '/vata/carte-eventail.jpg', cadrage: 'object-[50%_40%]',
  },
  {
    key: 'rituels', tag: 'Une introduction à l’Ayurveda', titre: 'Rituels vivants',
    sous: 'Des pratiques courtes qui redonnent ancrage et direction.',
    corps: '10 capsules vidéo et un bonus : l’automassage, les soins du nez et de la bouche, les soins des mains et des pieds.',
    prix: '27 $', cta: 'Découvrir Rituels vivants', href: '/rituels-vivants', image: '/krystine-portrait.jpg', cadrage: 'object-[50%_28%]',
  },
];

// Les parcours qui reviennent un à un : chacun a sa liste d'attente.
// Gardés ici pour pouvoir les remettre; la page n'en montre plus le mur
// (Krystine, 5 oct. 2026 : une seule ligne discrète « Être avisée »).
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

      <StyleV2 />
      {/* ─────────── DISPONIBLE MAINTENANT, deux cartes V2 ─────────── */}
      <section className="bg-[#f4efe6] px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(3rem,7vh,5rem)] pb-[clamp(3.5rem,8vh,6rem)]">
        <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330]">Disponible maintenant</p>
        <div className="mt-8 grid gap-x-[clamp(2rem,4vw,4rem)] gap-y-16 md:grid-cols-2">
          {DISPONIBLES.map((d, i) => (
            <motion.div key={d.key} {...up(0.25 + i * 0.08)} className="flex flex-col">
              <a href={d.href} onClick={(e) => go(e, d.href)} aria-label={d.titre} className="block">
                <Planche src={d.image} ratio="aspect-[16/10]" position={d.cadrage} etiquette={d.tag} />
              </a>
              <h2 className="v2-serif mt-8 font-light leading-[1.02] text-[#1c1712] text-[clamp(2rem,3.4vw,3rem)]">{d.titre}</h2>
              <p className="v2-serif mt-2 font-light text-[clamp(1.1rem,1.6vw,1.35rem)] leading-[1.35] text-[#7d6330]">{d.sous}</p>
              <p className="mt-4 max-w-[48ch] text-[0.98rem] leading-[1.8] text-[#3a2f23]">{d.corps}</p>
              <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {d.key === 'vata' ? (
                  <>
                    <span className="v2-serif text-[2rem] font-light leading-none tabular-nums text-[#1c1712]">{lancement ? OFFRE_VATA.promo : OFFRE_VATA.price}</span>
                    {lancement && <span className="v2-serif text-lg line-through tabular-nums text-[#1c1712]/45">{OFFRE_VATA.price}</span>}
                    {lancement && <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#7d6330]">Tarif de lancement</span>}
                  </>
                ) : (
                  <span className="v2-serif text-[2rem] font-light leading-none tabular-nums text-[#1c1712]">{d.prix}</span>
                )}
              </p>
              <div className="mt-auto pt-8">
                <BoutonNoir to={d.href}>{d.cta}</BoutonNoir>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─────────── LES PORTES OUVERTES, deux grandes cartes ─────────── */}
      <section className="px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(3.5rem,8vh,6rem)] bg-[#f4efe6]">
        <div className="grid gap-6">
          {PORTES.filter(p => p.key !== 'vata').map((p, i) => (
            <motion.a
              key={p.key}
              href={p.href}
              onClick={(e) => go(e, p.href)}
              initial={reduce ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.25 + i * 0.08 }}
              className="group flex flex-col md:flex-row overflow-hidden rounded-[16px] border border-[#293027]/12 bg-[#fbf8f2] shadow-[0_30px_60px_-46px_rgba(41,48,39,0.55)] transition-[border-color,box-shadow] duration-500 hover:border-[#7d6330]/45 hover:shadow-[0_36px_70px_-44px_rgba(41,48,39,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7d6330]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#1b2622]/5 md:aspect-auto md:min-h-[320px] md:w-1/2">
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

      {/* ─────────── LES AUTRES PARCOURS : une ligne discrète ───────────
          Le mur des parcours en attente (EN_ATTENTE) n'est plus affiché;
          les données restent plus haut pour pouvoir le remettre. */}
      <section id="a-votre-rythme" className="scroll-mt-24 bg-[#f4efe6] px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(5rem,10vh,8rem)]">
        <div className="flex flex-col items-start justify-between gap-5 border-t border-[#1c1712]/15 pt-8 sm:flex-row sm:items-center">
          <p className="v2-serif font-light text-[clamp(1.2rem,1.8vw,1.5rem)] text-[#1c1712]">D'autres parcours reviennent au fil des saisons.</p>
          <LienSouligne to="/liste-attente">Être avisée</LienSouligne>
        </div>
      </section>
    </div>
  );
};

export default FormationsLanding;
