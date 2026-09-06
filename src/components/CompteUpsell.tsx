import React from 'react';
import BoutonCompte from './BoutonCompte';

interface Props {
  /** "dark" for navy backgrounds, "light" for cream/white. */
  variant?: 'dark' | 'light';
  /** Extra wrapper classes — e.g. "text-center" when the host form is centered. */
  className?: string;
  /** Override the phrase above the link. */
  texte?: string;
}

/**
 * Ligne « Créer mon compte » sous un formulaire public. Extrait de
 * NewsletterSignup pour vivre sur tous les formulaires publics du site
 * (booking, liste d'attente, direct, etc.), pas seulement l'infolettre.
 * Texte en français : traduit à l'affichage par le shim JSX i18n
 * (public/i18n/en.json porte déjà les deux clés par défaut).
 */
const CompteUpsell: React.FC<Props> = ({ variant = 'light', className = '', texte }) => {
  const isDark = variant === 'dark';
  return (
    <div className={`mt-4 border-t pt-4 ${isDark ? 'border-white/10' : 'border-[#2a2015]/10'} ${className}`}>
      <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#2a2015]/40'}`}>
        {texte || 'Vous voulez plus qu\'une infolettre ? Contenus exclusifs et promotions spéciales :'}
      </p>
      <Link
        to="/compte"
        className={`mt-3 inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
          isDark
            ? 'border-[#bb9a5e]/60 text-[#EEE7DB] hover:border-[#bb9a5e] hover:bg-[#bb9a5e]/10'
            : 'border-[#bb9a5e]/60 text-[#2a2015] hover:border-[#bb9a5e] hover:bg-[#bb9a5e]/10'
        }`}
      >
        Créer mon compte
      </Link>
    </div>
  );
};

export default CompteUpsell;
