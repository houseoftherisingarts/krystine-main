import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

// ─── Les suggestions maison du feed public ───────────────────────────────────
// Une carte discrète glissée entre les billets du fil de la communauté
// (jamais dans les feeds exclusifs des formations) : les huiles, le Foyer,
// Origine, les formations et les livres de Krystine, en rotation, dans la
// langue de la page.

interface Texte { fr: string; en: string }

interface Pub {
  etiquette: Texte;
  titre: Texte;
  texte: Texte;
  cta: Texte;
  href: string;
  externe?: boolean;
  image?: string;
}

export const PUBS: Pub[] = [
  {
    etiquette: { fr: 'Les huiles corporelles', en: 'Body oils' },
    titre: { fr: 'Inspirata Nature', en: 'Inspirata Nature' },
    texte: { fr: 'Les huiles corporelles de Krystine, formulées selon les doshas et fabriquées au Québec.', en: 'Krystine’s body oils, formulated by dosha and made in Quebec.' },
    cta: { fr: 'Découvrir les huiles', en: 'Discover the oils' },
    href: 'https://inspiratanature.com',
    externe: true,
  },
  {
    etiquette: { fr: 'Le rituel de l\'année', en: 'The ritual of the year' },
    titre: { fr: 'Le Foyer d\'Origine', en: 'The Origine Hearth' },
    texte: { fr: 'Douze portes, une par mois, pour vivre l\'année au rythme des saisons, autour du feu.', en: 'Twelve doors, one a month, to live the year with the seasons, around the fire.' },
    cta: { fr: 'Entrer au Foyer', en: 'Enter the Hearth' },
    href: '/foyer',
  },
  {
    etiquette: { fr: 'L\'expérience phare', en: 'The flagship experience' },
    titre: { fr: 'Expérience Origine', en: 'Origine Experience' },
    texte: { fr: 'Le corps sait. Il manquait la carte pour le lire. La prochaine cohorte se prépare.', en: 'The body knows. It only lacked the map to read it. The next cohort is forming.' },
    cta: { fr: 'Voir Origine', en: 'See Origine' },
    href: '/origine',
  },
  {
    etiquette: { fr: 'Les formations', en: 'Courses' },
    titre: { fr: 'Apprendre avec Krystine', en: 'Learn with Krystine' },
    texte: { fr: 'Ayurveda, plantes et rituels : les formations en ligne, à suivre à votre rythme.', en: 'Ayurveda, plants and rituals: online courses, at your own pace.' },
    cta: { fr: 'Voir les formations', en: 'See the courses' },
    href: '/cours',
  },
  {
    etiquette: { fr: 'Les livres', en: 'Books' },
    titre: { fr: 'La Trilogie d\'Origine', en: 'The Origine Trilogy' },
    texte: { fr: 'Trois livres, près de 1 200 pages inspirées de l\'Ayurveda, aux Éditions de l\'Homme.', en: 'Three books, nearly 1,200 pages inspired by Ayurveda, published by Éditions de l’Homme.' },
    cta: { fr: 'Découvrir les livres', en: 'Discover the books' },
    href: '/medias#livres',
  },
];

const PubCarte: React.FC<{ index: number }> = ({ index }) => {
  const { lang } = useApp();
  const t = (x: Texte) => (lang === 'FR' ? x.fr : x.en);
  const pub = PUBS[index % PUBS.length];
  const contenu = (
    <div className="rounded-[20px] border border-[#BA7B39]/35 bg-gradient-to-br from-[#BA7B39]/12 to-transparent p-5 transition-colors hover:border-[#BA7B39]/60 dark:from-[#BA7B39]/10">
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]/70 dark:text-[#d9a05b]/70">Suggestion · {t(pub.etiquette)}</p>
      <p className="mt-2 font-serif text-xl text-[#293027] dark:text-white">{t(pub.titre)}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[#38403a]/70 dark:text-white/65">{t(pub.texte)}</p>
      <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">
        {t(pub.cta)} <i className="fa-solid fa-arrow-right" />
      </span>
    </div>
  );
  return pub.externe
    ? <a href={pub.href} target="_blank" rel="noopener noreferrer" className="block">{contenu}</a>
    : <Link to={pub.href} className="block">{contenu}</Link>;
};

export default PubCarte;
