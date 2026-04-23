import React from 'react';
import { useAuth } from '../../contexts/AppContext';
import { useEditMode } from '../../contexts/EditModeContext';

// Admin-only floating chip. Two states:
//   • editMode OFF  → small discreet "Modifier" pill to enter edit mode
//     from any page (replaces the old `?edit=1` URL-only entry point).
//   • editMode ON   → gold "Édition en cours" bar with a "Terminer" exit.
// Edit mode persists in sessionStorage (see EditModeContext), so it
// survives SPA navigation AND full-page reloads — the bug was that
// footer links to statically-bundled routes (/origine, /podcast, /vata)
// trigger a real reload, which used to wipe the in-memory flag.
const EditModeBar: React.FC = () => {
  const { isAdmin } = useAuth();
  const { editMode, setEditMode } = useEditMode();

  if (!isAdmin) return null;

  if (!editMode) {
    return (
      <div className="fixed bottom-5 right-5 z-[150]">
        <button
          onClick={() => setEditMode(true)}
          className="inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-[#0B1A36]/90 backdrop-blur text-[#D4AF37] border border-[#D4AF37]/40 shadow-lg text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
          title="Activer le mode édition"
        >
          <i className="fa-solid fa-pen text-[11px]" />
          Modifier
        </button>
      </div>
    );
  }

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
