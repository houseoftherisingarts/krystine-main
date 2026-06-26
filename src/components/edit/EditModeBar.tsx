import React from 'react';
import { useAuth } from '../../contexts/AppContext';
import { useEditMode } from '../../contexts/EditModeContext';

// Admin exit bar — only renders when an admin is actively editing. The
// only entry point is the "Modifier le site en direct" card on the
// admin dashboard (/admin). Edit mode persists in sessionStorage, so it
// survives SPA navigation and full-page reloads until the admin clicks
// Terminer.
const EditModeBar: React.FC = () => {
  const { isAdmin } = useAuth();
  const { editMode, setEditMode } = useEditMode();

  if (!isAdmin || !editMode) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[150]" data-edit-ui>
      <div className="flex items-center gap-3 pl-4 pr-1 py-1 rounded-full bg-[#bb9a5e] border border-[#bb9a5e] text-[#2a2015] shadow-lg">
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
          Édition en cours
        </span>
        <button
          onClick={() => setEditMode(false)}
          className="text-[10px] uppercase tracking-[0.25em] font-bold px-4 py-2 rounded-full bg-[#2a2015] text-[#7d6330] hover:bg-white hover:text-[#2a2015] transition-colors"
          title="Quitter le mode édition"
        >
          <i className="fa-solid fa-check mr-1.5 text-[10px]" /> Terminer
        </button>
      </div>
    </div>
  );
};

export default EditModeBar;
