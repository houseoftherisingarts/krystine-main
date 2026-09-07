import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useEditMode } from '../../contexts/EditModeContext';

// Bouton "Entrer en mode éditeur" / "Quitter le mode éditeur" — visible
// seulement pour un compte admin connecté, à côté d'« Espace admin » et
// « Déconnexion » dans la bannière du compte (ClientPortal) et du Foyer
// (CadreFoyer). Bascule EditModeContext.editMode sans jamais changer de
// page : c'est le même bouton, la même édition, où qu'on soit sur le site.
const EditModeToggleButton: React.FC<{ className?: string }> = ({ className }) => {
  const { isAdmin, lang } = useApp();
  const { editMode, setEditMode } = useEditMode();
  const fr = lang === 'FR';

  if (!isAdmin) return null;

  const label = editMode
    ? (fr ? 'Quitter le mode éditeur' : 'Exit editor mode')
    : (fr ? 'Entrer en mode éditeur' : 'Enter editor mode');

  return (
    <button
      type="button"
      onClick={() => setEditMode(!editMode)}
      className={className || 'text-xs uppercase tracking-widest text-[#d9a05b] hover:text-white'}
      title={label}
    >
      <i className={`fa-solid ${editMode ? 'fa-lock-open' : 'fa-pen-to-square'} mr-2`} />
      {label}
    </button>
  );
};

export default EditModeToggleButton;
