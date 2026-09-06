import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import './bouton-compte.css';

// Le bouton « Créer mon compte », le même partout : or métallique, reflet
// qui passe, lueur qui respire. Il ouvre la fenêtre de connexion en mode
// création de compte. `taille` règle le gabarit; `libelle` remplace le texte
// au besoin (« Créer mon compte et m'inscrire »).
const BoutonCompte: React.FC<{
  taille?: 'sm' | 'md' | 'lg';
  libelle?: string;
  className?: string;
  onClick?: () => void;
  icone?: boolean;
}> = ({ taille = 'md', libelle, className = '', onClick, icone = true }) => {
  const { lang, setSignInOpen } = useApp();
  const fr = lang === 'FR';
  const gabarit = taille === 'lg'
    ? 'px-9 py-4 text-[0.72rem] tracking-[0.22em]'
    : taille === 'sm'
      ? 'px-4 py-2 text-[10px] tracking-[0.18em]'
      : 'px-7 py-3 text-[0.68rem] tracking-[0.2em]';
  return (
    <motion.button
      type="button"
      onClick={() => { onClick?.(); setSignInOpen(true); }}
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className={`bouton-compte inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full font-sans font-bold uppercase ${gabarit} ${className}`}
    >
      {icone && <i className="fa-solid fa-star text-[0.7em]" aria-hidden="true" />}
      <span>{libelle || (fr ? 'Créer mon compte' : 'Create my account')}</span>
    </motion.button>
  );
};

export default BoutonCompte;
