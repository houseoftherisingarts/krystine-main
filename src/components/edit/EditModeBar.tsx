import React, { useState } from 'react';
import { useAuth } from '../../contexts/AppContext';
import { useEditMode } from '../../contexts/EditModeContext';

// Admin exit bar — only renders when an admin is actively editing. Entry
// points: la carte "Modifier le site en direct" de l'admin (/admin), et le
// bouton "Entrer en mode éditeur" dans la bannière du compte et du Foyer
// (EditModeToggleButton). Edit mode persists in sessionStorage, so it
// survives SPA navigation and full-page reloads until the admin clicks
// Terminer. "Publier" envoie tout le brouillon en attente en une fois —
// tant qu'elle n'a pas cliqué, seule elle voit ses changements.
const EditModeBar: React.FC = () => {
  const { isAdmin } = useAuth();
  const { editMode, setEditMode, pendingCount, publishPending } = useEditMode();
  const [publishing, setPublishing] = useState(false);

  if (!isAdmin || !editMode) return null;

  const publier = async () => {
    if (pendingCount === 0 || publishing) return;
    setPublishing(true);
    try { await publishPending(); } catch { /* noop — le brouillon reste, elle peut réessayer */ }
    setPublishing(false);
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[150]" data-edit-ui>
      <div className="flex items-center gap-3 pl-4 pr-1 py-1 rounded-full bg-[#bb9a5e] border border-[#bb9a5e] text-[#2a2015] shadow-lg">
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
          Édition en cours
        </span>
        <button
          onClick={publier}
          disabled={pendingCount === 0 || publishing}
          className="text-[10px] uppercase tracking-[0.25em] font-bold px-4 py-2 rounded-full bg-[#2a2015] text-[#F4D49A] hover:bg-[#3a2c1c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Publier les changements en attente"
        >
          <i className="fa-solid fa-cloud-arrow-up mr-1.5 text-[10px]" />
          {publishing ? 'Publication…' : pendingCount > 0 ? `Publier (${pendingCount})` : 'Publier'}
        </button>
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
