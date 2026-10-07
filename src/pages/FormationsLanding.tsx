import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { enLancement, TIERS } from './vata/offre';
import { StyleV2, Planche, BoutonNoir, BoutonCuivre, LienSouligne, CarteVerte, Kicker } from '../components/v2/Magazine';

/**
 * /formations (et /parcours) : une hiérarchie claire (Krystine, 6 oct. 2026).
 * EXPÉRIENCE ORIGINE 2 est le cœur, la destination, en grand et dans la seule
 * carte vert profond de la page. Les Rituels essentiels à 27 $ sont la porte
 * d'entrée, avec l'invitation au quiz juste à côté. VATA Essentiel est le
 * chemin autonome. Une ligne discrète relie les trois marches.
 * Aucun prix ni date d'inscription pour Origine 2 : non décidés.
 */

const EASE = [0.16, 0.8, 0.24, 1] as const;
const OFFRE_VATA = TIERS[0];

/** Le lien d'Origine 2 : le lienFiche de formations/origine2. Tant que la
 *  vente est fermée, /origine-2 mène la visiteuse à sa liste d'attente. */
const LIEN_ORIGINE2 = '/origine-2';

/** L'image de la carte Rituels essentiels : Krystine la choisit parmi des
 *  photos professionnelles (6 oct. 2026). Vide, la carte garde un emplacement
 *  crème fileté, sans photo. Poser ici le chemin de l'image retenue. */
const IMAGE_RITUELS = '/rituels-essentiels/carte-fondu.webp';

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

/** Les trois marches, dans l'ordre de la page, chacune une ancre vers sa section. */
const MARCHES = [
  { label: 'Être accompagnée', href: '#origine-2' },
  { label: 'Commencer', href: '#commencer' },
  { label: 'Approfondir', href: '#approfondir' },
];

/** La matière du vert d'Origine : des nuances de vert profond et une lueur
 *  cuivrée discrète sous le texte, jamais un aplat. */
const FOND_EO = [
  'radial-gradient(70% 60% at 8% 4%, rgba(70,92,80,.55) 0%, rgba(40,53,47,0) 70%)',
  'radial-gradient(55% 55% at 12% 100%, rgba(186,123,57,.22) 0%, rgba(186,123,57,0) 70%)',
  'radial-gradient(80% 90% at 70% 60%, rgba(22,31,27,.55) 0%, rgba(22,31,27,0) 75%)',
].join(', ');

/** Un grain très fin, comme un papier, pour que le vert ait de la texture. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`;

const FormationsLanding: React.FC = () => {
  const reduce = useReducedMotion();
  const lancement = enLancement();
  const up = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1.1, ease: EASE, delay },
  });
  const vu = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 1.1, ease: EASE, delay },
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4efe6] text-[#1c1712]">
      <StyleV2 />

      {/* ─────────── EN-TÊTE, crème ─────────── */}
      <section className="px-[clamp(1.5rem,5vw,5.5rem)] pt-32 pb-[clamp(1.75rem,4vh,2.75rem)] md:pt-40">
        <div className="mx-auto max-w-[1320px]">
          <motion.div {...up(0.1)}><Kicker>Les formations</Kicker></motion.div>
          <motion.h1 {...up(0.2)} className="v2-serif mt-5 max-w-[12ch] font-light leading-[0.98] text-[clamp(2.8rem,6.4vw,5.6rem)]">
            Choisir votre prochaine porte
          </motion.h1>
          {/* Les trois marches, en une ligne discrète */}
          <motion.ol {...up(0.32)} aria-label="Les trois marches" className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.66rem] uppercase tracking-[0.24em] text-[#1c1712]/70">
            {MARCHES.map((m, i) => (
              <li key={m.href} className="flex items-center gap-4">
                <a href={m.href} className={`border-b border-transparent pb-0.5 transition-colors hover:border-[#9c7a44] ${i === 0 ? 'text-[#7d6330]' : ''}`}>{m.label}</a>
                {i < MARCHES.length - 1 && <span aria-hidden className="text-[#9c7a44]">·</span>}
              </li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* ─────────── 1 · LE CŒUR : EXPÉRIENCE ORIGINE 2, la seule carte verte ─────────── */}
      <section id="origine-2" className="scroll-mt-28 px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(3rem,7vh,4.5rem)]">
        <motion.div {...up(0.4)} className="mx-auto max-w-[1320px]">
          <CarteVerte>
            {/* La carte porte sa propre matière (6 oct. 2026, « le vert coupe, trop uni ») :
                un vert profond en nuances, un grain fin, une lueur cuivrée sous le texte,
                la vidéo du coffret qui se fond dans le vert au lieu de le trancher, et
                le filet cuivré qui fait le tour complet, par-dessus l'image. */}
            <div className="relative bg-[#28352F]">
              <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: FOND_EO }} />
              <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-soft-light" style={{ backgroundImage: GRAIN, backgroundSize: '220px 220px' }} />
              {/* La vidéo : à droite sur grand écran, au bas sur téléphone, fondue dans le vert */}
              <div className="eo-fondu absolute inset-x-0 bottom-0 h-[330px] overflow-hidden lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[54%]">
                {reduce ? (
                  <img src="/origine2/packshot-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '55% 50%' }} />
                ) : (
                  <video src="/origine2/packshot.mp4" poster="/origine2/packshot-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-hidden
                    className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '55% 50%' }} />
                )}
              </div>
              <div className="relative grid pb-[300px] lg:min-h-[560px] lg:grid-cols-[1.12fr_1fr] lg:pb-0">
                <div className="flex flex-col p-[clamp(1.75rem,4.5vw,4.25rem)]">
                  <Kicker sombre>Être accompagnée · le cœur du chemin</Kicker>
                  <h2 className="v2-serif mt-6 font-light uppercase leading-[0.95] tracking-[0.01em] text-[#EEE7DB] text-[clamp(2.4rem,5.2vw,5rem)]">
                    Expérience Origine 2
                  </h2>
                  <p className="mt-6 text-[0.72rem] uppercase leading-[1.9] tracking-[0.2em] text-[#BA7B39]">
                    <span className="block">Le parcours signature · 12 semaines avec Krystine</span>
                    <span className="block">Départ le dimanche 10 janvier 2027</span>
                  </p>
                  <p className="v2-serif mt-6 max-w-[34ch] font-light text-[clamp(1.2rem,1.8vw,1.5rem)] leading-[1.45] text-[#EEE7DB]/90">
                    Krystine vous accompagne en direct, une semaine à la fois, avec une cohorte qui avance au même pas.
                  </p>
                  <div className="mt-auto pt-10">
                    <BoutonCuivre to={LIEN_ORIGINE2}>Être avisée de l'ouverture</BoutonCuivre>
                  </div>
                </div>
              </div>
              <span aria-hidden className="pointer-events-none absolute inset-3 z-10 rounded-[11px] border border-[#BA7B39]/40" />
            </div>
            <style>{`
              .eo-fondu { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 42%); mask-image: linear-gradient(to bottom, transparent 0%, #000 42%); }
              @media (min-width: 1024px) {
                .eo-fondu { -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,.55) 18%, #000 38%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,.55) 18%, #000 38%); }
              }
            `}</style>
          </CarteVerte>
        </motion.div>
      </section>

      {/* ─────────── 2 et 3 · COMMENCER et APPROFONDIR : deux cartes égales, sous la grande ───────────
          (Krystine, 6 oct. 2026 : « la hiérarchie ne fonctionne pas ». Une seule grande carte,
          Origine 2; puis deux cartes plus petites côte à côte, le quiz discret dessous.) */}
      <section className="bg-[#efe6d7] px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(3rem,7vh,4.5rem)]">
        <div className="mx-auto grid max-w-[1320px] gap-x-[clamp(1.5rem,3vw,2.75rem)] gap-y-14 md:grid-cols-2">
          {/* Commencer : Rituels essentiels */}
          <motion.article {...vu()} id="commencer" className="flex scroll-mt-28 flex-col">
            <Kicker>Commencer</Kicker>
            <p className="v2-serif mt-2 font-light text-[clamp(1.3rem,1.9vw,1.6rem)] leading-[1.2]">Par où commencer, dès ce soir</p>
            <a href="/rituels-essentiels" aria-label="Rituels essentiels inspirés de l'Ayurveda" className="mt-6 block">
              <Planche src={IMAGE_RITUELS} alt="Rituels essentiels inspirés de l'Ayurveda : gestes simples à l'huile, moins de 5 minutes par jour" ratio="aspect-[16/10]" etiquette="Porte d'entrée" />
            </a>
            <h3 className="v2-serif mt-7 font-light leading-[1.08] text-[clamp(1.5rem,2.2vw,1.95rem)]">Rituels essentiels inspirés de l'Ayurveda</h3>
            <p className="mt-3 text-[0.93rem] leading-[1.8] text-[#3a2f23]">
              Des pratiques courtes qui redonnent ancrage et direction : l'automassage, les soins du nez et de la bouche, les soins des mains et des pieds.
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-4 pt-6">
              <p className="v2-serif text-[1.8rem] font-light leading-none tabular-nums">27 $</p>
              <BoutonNoir to="/rituels-essentiels">Commencer ce soir</BoutonNoir>
            </div>
          </motion.article>

          {/* Approfondir : VATA Essentiel */}
          <motion.article {...vu(0.08)} id="approfondir" className="flex scroll-mt-28 flex-col">
            <Kicker>Approfondir</Kicker>
            <p className="v2-serif mt-2 font-light text-[clamp(1.3rem,1.9vw,1.6rem)] leading-[1.2]">Approfondir à votre rythme</p>
            <a href="/vata" aria-label={OFFRE_VATA.name} className="mt-6 block">
              {/* L'éventail est cadré serré : les cahiers occupent la photo, le fond vert reste en bordure. */}
              <Planche src="/vata/carte-eventail.jpg" alt="Les cahiers des semaines de VATA Essentiel, en éventail" ratio="aspect-[16/10]" position="object-[50%_62%] scale-[1.32]" etiquette="L'Expérience Ayurveda" />
            </a>
            <h3 className="v2-serif mt-7 font-light leading-[1.08] text-[clamp(1.5rem,2.2vw,1.95rem)]">{OFFRE_VATA.name}</h3>
            <p className="v2-serif mt-1 font-light text-[clamp(1.02rem,1.4vw,1.2rem)] leading-[1.35] text-[#7d6330]">Un parcours de sept semaines, la première dès l'inscription.</p>
            <p className="mt-3 text-[0.93rem] leading-[1.8] text-[#3a2f23]">16 capsules, 7 méditations guidées, le journal de bord et d'observation, et le guide de 204 pages.</p>
            <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-4 pt-6">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="v2-serif text-[1.8rem] font-light leading-none tabular-nums">{lancement ? OFFRE_VATA.promo : OFFRE_VATA.price}</span>
                {lancement && <span className="v2-serif text-lg line-through tabular-nums text-[#1c1712]/45">{OFFRE_VATA.price}</span>}
                {lancement && <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#7d6330]">Tarif de lancement</span>}
              </p>
              <BoutonNoir to="/vata">Découvrir VATA Essentiel</BoutonNoir>
            </div>
          </motion.article>
        </div>

        {/* Le quiz, discret, sous les deux cartes */}
        <motion.div {...vu(0.12)} className="mx-auto mt-14 flex max-w-[1320px] flex-col items-start gap-x-8 gap-y-3 border-t border-[#9c7a44]/45 pt-7 md:flex-row md:items-center md:justify-between">
          <p className="text-[0.95rem] leading-[1.8] text-[#3a2f23]">
            <span className="v2-serif mr-2 text-[1.25rem] font-light text-[#1c1712]">Pas certaine ?</span>
            Faites le quiz, en 3 minutes : il vous indique par où commencer selon ce que vous vivez en ce moment.
          </p>
          <div className="shrink-0"><LienSouligne to="/quiz">Faire le quiz</LienSouligne></div>
        </motion.div>
      </section>

      {/* ─────────── LES AUTRES PARCOURS : une ligne discrète ─────────── */}
      <section id="a-votre-rythme" className="scroll-mt-24 px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(2.5rem,6vh,4rem)] pb-[clamp(4rem,9vh,6rem)]">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-5 pt-0 sm:flex-row sm:items-center">
          <p className="v2-serif font-light text-[clamp(1.2rem,1.8vw,1.5rem)]">D'autres parcours reviennent au fil des saisons.</p>
          <LienSouligne to="/liste-attente">Être avisée</LienSouligne>
        </div>
      </section>
    </div>
  );
};

export default FormationsLanding;
