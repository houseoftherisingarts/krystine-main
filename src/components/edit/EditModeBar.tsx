import React from 'react';
import { useAuth } from '../../contexts/AppContext';
import { useEditMode } from '../../contexts/EditModeContext';

// Visible only WHILE edit mode is active, and only to admins. Entry to edit
// mode is via the admin dashboard "Modifier le site" link (which adds ?edit=1
// and EditModeContext auto-enables on that param). This bar only provides an
// exit — it never shows on normal browsing.
const EditModeBar: React.FC = () => {
  const { isAdmin } = useAuth();
  const { editMode, setEditMode } = useEditMode();

  if (!isAdmin || !editMode) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[150]">
      <div className="flex items-center gap-3 pl-4 pr-1 py-1 rounded-full bg-[#D4AF37] border border-[#D4AF37] text-[#0B1A36] shadow-lg">
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
          Édition en cours
        </span>
        <button
          onClick={() => setEditMode(false)}
          className="text-[10px] uppercase tracking-[0.25em] font-bold px-4 py-2 rounded-full bg-[#0B1A36] text-[#D4AF37] hover:bg-white hover:text-[#0B1A36] transition-colors"
          title="Quitter le mode édition"
        >
          <i className="fa-solid fa-check mr-1.5 text-[10px]" /> Terminer
        </button>
      </div>
    </div>
  );
};

export default EditModeBar;
