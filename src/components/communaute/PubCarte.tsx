import React from 'react';
import { Link } from 'react-router-dom';

// ─── Les suggestions maison du feed public ───────────────────────────────────
// Une carte discrète glissée entre les billets du fil de la communauté
// (jamais dans les feeds exclusifs des formations) : les huiles, le Foyer,
// Origine, les formations et les livres de Krystine, en rotation.

interface Pub {
  etiquette: string;
  titre: string;
  texte: string;
  cta: string;
  href: string;
  externe?: boolean;
  image?: string;
}

export const PUBS: Pub[] = [
  {
    etiquette: 'Les huiles corporelles',
    titre: 'Inspirata Nature',
    texte: 'Les huiles corporelles de Krystine, formulées selon les doshas et fabriquées au Québec.',
    cta: 'Découvrir les huiles',
    href: 'https://inspiratanature.com',
    externe: true,
  },
  {
    etiquette: 'Le rituel de l\'année',
    titre: 'Le Foyer d\'Origine',
    texte: 'Douze portes, une par mois, pour vivre l\'année au rythme des saisons, autour du feu.',
    cta: 'Entrer au Foyer',
    href: '/foyer',
  },
  {
    etiquette: 'L\'expérience phare',
    titre: 'Expérience Origine',
    texte: 'Le corps sait. Il manquait la carte pour le lire. La prochaine cohorte se prépare.',
    cta: 'Voir Origine',
    href: '/origine',
  },
  {
    etiquette: 'Les formations',
    titre: 'Apprendre avec Krystine',
    texte: 'Ayurveda, plantes et rituels : les formations en ligne, à suivre à votre rythme.',
    cta: 'Voir les formations',
    href: '/cours',
  },
  {
    etiquette: 'Les livres',
    titre: 'La Trilogie d\'Origine',
    texte: 'Trois livres, près de 1 200 pages inspirées de l\'Ayurveda, aux Éditions de l\'Homme.',
    cta: 'Découvrir les livres',
    href: '/medias#livres',
  },
];

const PubCarte: React.FC<{ index: number }> = ({ index }) => {
  const pub = PUBS[index % PUBS.length];
  const contenu = (
    <div className="rounded-[20px] border border-[#bb9a5e]/35 bg-gradient-to-br from-[#bb9a5e]/12 to-transparent p-5 transition-colors hover:border-[#bb9a5e]/60 dark:from-[#bb9a5e]/10">
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#7d6330]/70 dark:text-[#dcb874]/70">Suggestion · {pub.etiquette}</p>
      <p className="mt-2 font-serif text-xl text-[#2a2015] dark:text-white">{pub.titre}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[#3a3126]/70 dark:text-white/65">{pub.texte}</p>
      <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#7d6330] dark:text-[#dcb874]">
        {pub.cta} <i className="fa-solid fa-arrow-right" />
      </span>
    </div>
  );
  return pub.externe
    ? <a href={pub.href} target="_blank" rel="noopener noreferrer" className="block">{contenu}</a>
    : <Link to={pub.href} className="block">{contenu}</Link>;
};

export default PubCarte;
