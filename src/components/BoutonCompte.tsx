import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import './bouton-compte.css';

// Le bouton « Créer mon compte », le même partout : un cuivre plein et sobre
// (Krystine, 2 oct. 2026, le cuivre plutôt que l'or). Il ouvre la fenêtre de connexion en mode
// création de compte. `taille` règle le gabarit; `libelle` remplace le texte
// au besoin (« Créer mon compte et m'inscrire »).
const BoutonCompte: React.FC<{
  taille?: 'sm' | 'md' | 'lg';
  libelle?: string;
  className?: string;
  onClick?: () => void;
  /** `'compte'` : la silhouette de compte au lieu de l'étoile (en-tête mobile). */
  icone?: boolean | 'compte';
}> = ({ taille = 'md', libelle, className = '', onClick, icone = true }) => {
  const { lang, setSignInOpen } = useApp();
  const fr = lang === 'FR';
  const texte = libelle || (fr ? 'Accéder à mon compte' : 'Access my account');
  const gabarit = taille === 'lg'
    ? 'px-9 py-4 text-[0.72rem] tracking-[0.22em]'
    : taille === 'sm'
      ? 'h-11 px-4 text-[10px] tracking-[0.18em] leading-none'   // même hauteur que les pastilles de l'en-tête (44 px), au pixel
      : 'px-7 py-3 text-[0.68rem] tracking-[0.2em]';
  return (
    <motion.button
      type="button"
      aria-label={texte}
      onClick={() => { onClick?.(); setSignInOpen(true); }}
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className={`bouton-compte inline-flex ${taille === 'sm' ? 'self-center align-middle' : 'min-h-[44px]'} items-center justify-center gap-2 rounded-full font-sans font-bold uppercase ${gabarit} ${className}`}
    >
      {icone && <i className={icone === 'compte' ? 'fa-solid fa-user text-[1.25em]' : 'fa-solid fa-star text-[0.7em]'} aria-hidden="true" />}
      <span>{texte}</span>
    </motion.button>
  );
};

export default BoutonCompte;
