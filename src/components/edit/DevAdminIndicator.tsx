import React from 'react';
import { isDevAdminActive, isLocalOverridesActive } from '../../lib/devAdmin';

// Small floating chip that's only ever rendered when the dev-mode
// admin bypass is active (URL `?unlock=…`). Sits in the top-left so
// it doesn't collide with the EditModeBar (bottom-center / bottom-right)
// or the sign-in / admin chips (top-right). Single click sends the user
// to the explicit lock URL, which clears the flags and reloads.
//
// Production builds: `isDevAdminActive` returns false (Vite strips the
// `import.meta.env.DEV` branch), so this component renders nothing.
const DevAdminIndicator: React.FC = () => {
  if (!isDevAdminActive()) return null;
  const localStore = isLocalOverridesActive();

  return (
    <div className="fixed top-5 left-5 z-[200]" data-edit-ui>
      <a
        href="?lock=1"
        className="group inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-[#3A251E]/90 backdrop-blur text-[#F4D49A] border border-[#B07A3C]/60 shadow-lg text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-[#B07A3C] hover:text-[#3A251E] transition-colors"
        title="Quitter le mode admin local (efface les drapeaux localStorage et recharge)"
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#B07A3C] group-hover:bg-[#3A251E] animate-pulse" />
        Mode local{localStore ? ' · édits dans ce navigateur' : ''}
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#B07A3C]/20 group-hover:bg-[#3A251E]/20 ml-1">
          <i className="fa-solid fa-xmark text-[9px]" />
        </span>
      </a>
    </div>
  );
};

export default DevAdminIndicator;
