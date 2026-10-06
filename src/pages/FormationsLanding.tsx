import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { enLancement, TIERS } from './vata/offre';
import { StyleV2, Planche, BoutonNoir, BoutonCuivre, LienSouligne, CarteVerte, Kicker, TitreChapitre } from '../components/v2/Magazine';

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
const IMAGE_RITUELS = '';

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

const MARCHES = ['Commencer', 'Approfondir', 'Être accompagnée'];

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
      <section className="px-[clamp(1.5rem,5vw,5.5rem)] pt-32 pb-[clamp(2rem,5vh,3.5rem)] md:pt-40">
        <div className="mx-auto max-w-[1320px]">
          <motion.div {...up(0.1)}><Kicker>Les formations</Kicker></motion.div>
          <motion.h1 {...up(0.2)} className="v2-serif mt-5 max-w-[12ch] font-light leading-[0.98] text-[clamp(2.8rem,6.4vw,5.6rem)]">
            Choisir votre prochaine porte
          </motion.h1>
          {/* Les trois marches, en une ligne discrète */}
          <motion.ol {...up(0.32)} aria-label="Les trois marches" className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.66rem] uppercase tracking-[0.24em] text-[#1c1712]/70">
            {MARCHES.map((m, i) => (
              <li key={m} className="flex items-center gap-4">
                {i > 0 && <span aria-hidden className="text-[#9c7a44]">·</span>}
                <span className={i === MARCHES.length - 1 ? 'text-[#7d6330]' : ''}>{m}</span>
              </li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* ─────────── 1 · LE CŒUR : EXPÉRIENCE ORIGINE 2, la seule carte verte ─────────── */}
      <section className="px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(4rem,10vh,7rem)]">
        <motion.div {...up(0.4)} className="mx-auto max-w-[1320px]">
          <CarteVerte>
            <div className="grid lg:grid-cols-[1.25fr_1fr]">
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
              <div className="relative min-h-[260px] overflow-hidden lg:min-h-[520px]">
                {reduce ? (
                  <img src="/origine2/packshot-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '45% 50%' }} />
                ) : (
                  <video src="/origine2/packshot.mp4" poster="/origine2/packshot-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-hidden
                    className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '45% 50%' }} />
                )}
              </div>
            </div>
          </CarteVerte>
        </motion.div>
      </section>

      {/* ─────────── 2 · PAR OÙ COMMENCER : Rituels essentiels + le quiz ─────────── */}
      <section className="bg-[#efe6d7] px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4rem,10vh,7rem)]">
        <div className="mx-auto max-w-[1320px]">
          <motion.div {...vu()}>
            <Kicker>Commencer</Kicker>
            <TitreChapitre className="mt-4 text-[clamp(2rem,4.2vw,3.2rem)]">Par où commencer, dès ce soir</TitreChapitre>
          </motion.div>
          <div className="mt-12 grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 lg:grid-cols-[1.35fr_1fr]">
            <motion.div {...vu(0.08)} className="grid gap-x-8 gap-y-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <a href="/rituels-essentiels" aria-label="Rituels essentiels inspirés de l'Ayurveda" className="block">
                {IMAGE_RITUELS ? (
                  <Planche src={IMAGE_RITUELS} ratio="aspect-[4/5]" etiquette="Porte d'entrée" />
                ) : (
                  <div className="relative w-full">
                    <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
                    <div className="relative flex aspect-[16/10] sm:aspect-[4/5] w-full items-center justify-center bg-[#f4efe6]">
                      <span className="absolute top-0 left-0 bg-[#1c1712] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em] text-[#f4efe6]">Porte d'entrée</span>
                      <span className="pointer-events-none absolute inset-5 border border-[#9c7a44]/25" aria-hidden />
                      <span className="v2-serif px-8 text-center font-light text-[clamp(1.2rem,1.8vw,1.5rem)] leading-[1.35] text-[#7d6330]">10 capsules<br />et un bonus</span>
                    </div>
                  </div>
                )}
              </a>
              <div className="flex flex-col">
                <h3 className="v2-serif font-light leading-[1.05] text-[clamp(1.7rem,2.5vw,2.25rem)]">Rituels essentiels inspirés de l'Ayurveda</h3>
                <p className="mt-4 text-[0.95rem] leading-[1.8] text-[#3a2f23]">
                  Des pratiques courtes qui redonnent ancrage et direction : l'automassage, les soins du nez et de la bouche, les soins des mains et des pieds.
                </p>
                <p className="v2-serif mt-5 text-[2rem] font-light leading-none tabular-nums">27 $</p>
                <div className="mt-auto pt-7">
                  <BoutonNoir to="/rituels-essentiels">Commencer ce soir</BoutonNoir>
                </div>
              </div>
            </motion.div>
            <motion.aside {...vu(0.16)} className="border-t border-[#9c7a44]/45 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-[clamp(2rem,4vw,3.5rem)]">
              <p className="v2-serif font-light text-[clamp(1.5rem,2.4vw,2.1rem)] leading-[1.2]">Pas certaine ?</p>
              <p className="mt-3 max-w-[30ch] text-[0.95rem] leading-[1.8] text-[#3a2f23]">
                Faites le quiz, en 3 minutes : il vous indique par où commencer selon ce que vous vivez en ce moment.
              </p>
              <div className="mt-6">
                <LienSouligne to="/quiz">Faire le quiz</LienSouligne>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      {/* ─────────── 3 · APPROFONDIR : VATA Essentiel ─────────── */}
      <section className="px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4rem,10vh,7rem)]">
        <div className="mx-auto max-w-[1320px]">
          <motion.div {...vu()}>
            <Kicker>Approfondir</Kicker>
            <TitreChapitre className="mt-4 text-[clamp(2rem,4.2vw,3.2rem)]">Approfondir à votre rythme</TitreChapitre>
          </motion.div>
          <motion.div {...vu(0.08)} className="mt-12 grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-9 md:grid-cols-[1.1fr_1fr]">
            <a href="/vata" aria-label={OFFRE_VATA.name} className="block">
              <Planche src="/vata/carte-eventail.jpg" ratio="aspect-[16/10]" position="object-[50%_40%]" etiquette="L'Expérience Ayurveda" />
            </a>
            <div>
              <h3 className="v2-serif font-light leading-[1.02] text-[clamp(2rem,3.4vw,3rem)]">{OFFRE_VATA.name}</h3>
              <p className="v2-serif mt-2 font-light text-[clamp(1.1rem,1.6vw,1.35rem)] leading-[1.35] text-[#7d6330]">Un parcours de sept semaines, la première dès l'inscription.</p>
              <p className="mt-4 max-w-[48ch] text-[0.95rem] leading-[1.8] text-[#3a2f23]">16 capsules, 7 méditations guidées, le journal de bord et d'observation, et le guide de 204 pages.</p>
              <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="v2-serif text-[2rem] font-light leading-none tabular-nums">{lancement ? OFFRE_VATA.promo : OFFRE_VATA.price}</span>
                {lancement && <span className="v2-serif text-lg line-through tabular-nums text-[#1c1712]/45">{OFFRE_VATA.price}</span>}
                {lancement && <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#7d6330]">Tarif de lancement</span>}
              </p>
              <div className="mt-8">
                <BoutonNoir to="/vata">Découvrir VATA Essentiel</BoutonNoir>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────── LES AUTRES PARCOURS : une ligne discrète ─────────── */}
      <section id="a-votre-rythme" className="scroll-mt-24 px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(5rem,10vh,8rem)]">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-5 border-t border-[#1c1712]/15 pt-8 sm:flex-row sm:items-center">
          <p className="v2-serif font-light text-[clamp(1.2rem,1.8vw,1.5rem)]">D'autres parcours reviennent au fil des saisons.</p>
          <LienSouligne to="/liste-attente">Être avisée</LienSouligne>
        </div>
      </section>
    </div>
  );
};

export default FormationsLanding;
