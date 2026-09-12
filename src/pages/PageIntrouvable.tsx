import React, { useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  StyleV2, GOUTTIERE, Kicker, Masthead, TitreV2, SousTitreV2, Planche,
  BoutonNoir, useMotionV2,
} from '../components/v2/Magazine';

/**
 * La 404, dans le même langage « magazine crème » que /medias et /evenement/:slug
 * (voir Magazine.tsx et le canon posé le 11 septembre 2026 : jamais l'espresso
 * sur une page neuve). Une seule section plein écran sous l'en-tête, la photo
 * du livre ouvert près de la fenêtre comme planche, un seul geste de retour.
 */

const COPY = {
  FR: {
    numero: 'Hors-série',
    kicker: 'Adresse égarée',
    lignes: ['Cette page', 's’est envolée'],
    texte: 'L’adresse que vous avez suivie ne mène nulle part, ou elle a changé de place depuis votre dernier passage ici. Le reste du site vous attend juste à côté, dans les pages qui existent bel et bien.',
    etiquette: 'Envolée',
    legende: 'Une page peut s’envoler comme une feuille prise par le vent d’automne, celui que l’ayurveda appelle Vata.',
    cta: 'Retour à l’accueil',
  },
  EN: {
    numero: 'Special issue',
    kicker: 'Address gone missing',
    lignes: ['This page', 'flew away'],
    texte: 'The address you followed leads nowhere, or it moved since your last visit. The rest of the site is right next door, in the pages that do exist.',
    etiquette: 'Flown off',
    legende: 'A page can fly off like a leaf caught by the autumn wind, the one Ayurveda calls Vata.',
    cta: 'Back to the home page',
  },
} as const;

const PageIntrouvable: React.FC = () => {
  const { lang } = useApp();
  const t = COPY[lang];
  const root = useRef<HTMLDivElement>(null);
  useMotionV2(root);

  useEffect(() => {
    document.title = lang === 'EN' ? 'Page not found · Krystine St-Laurent' : 'Page introuvable · Krystine St-Laurent';
  }, [lang]);

  return (
    <div
      ref={root}
      className="relative w-full overflow-x-hidden bg-[#f4efe6] text-[#1c1712] antialiased"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <StyleV2 />

      <section
        data-hero
        className={`relative flex min-h-screen w-full flex-col justify-center ${GOUTTIERE} pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(3rem,6vh,5rem)]`}
      >
        <Masthead gauche={<>{t.numero} &middot; {lang === 'EN' ? 'Page not found' : 'Page introuvable'}</>} />

        <div className="mt-[clamp(2rem,6vh,4rem)] grid gap-[clamp(2.5rem,6vw,5rem)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Kicker className="mb-6">{t.kicker}</Kicker>
            <TitreV2 lignes={[...t.lignes]} className="text-[clamp(3rem,8vw,6.4rem)] max-w-none" />
            <SousTitreV2>{t.texte}</SousTitreV2>
            <div data-fade className="mt-9">
              <BoutonNoir to="/accueil">{t.cta}</BoutonNoir>
            </div>
          </div>

          <Planche
            seuil
            src="/foyer/livre-fleurs.webp"
            alt={lang === 'EN' ? 'An open book near a window, dried flowers on its pages' : 'Un livre ouvert près d’une fenêtre, des fleurs séchées sur ses pages'}
            etiquette={t.etiquette}
            legende={t.legende}
          />
        </div>
      </section>
    </div>
  );
};

export default PageIntrouvable;
