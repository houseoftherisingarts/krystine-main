import React from 'react';
import { useLocation } from 'react-router-dom';
import { getLang, setLang } from '../../lib/i18n/lang';
import { useUI } from '../../contexts/AppContext';

// Floating FR | EN switch for routes that hide the global NavBar (and its
// language menu): /foyer and friends. Crème glass + laiton, bottom-left, the
// same spot as the switch on the static /accueil bundle. À côté, le bouton de
// la musique d'ambiance : sans la barre, il n'y avait aucun moyen de mettre
// la musique en pause (Alex, 7 septembre 2026). Même hauteur (44 px) et même
// ligne de base que le bouton doré et la plume, à droite.
const NO_PILL = ['/admin', '/slidebg', '/desinscription', '/v1', '/v2', '/v3'];

const LangPill: React.FC = () => {
  const { pathname } = useLocation();
  const { audioPlaying, toggleAudio } = useUI();
  const navRoutes = !(pathname === '/' || pathname === '/accueil' || pathname === '/foyer' || NO_PILL.some(p => pathname.startsWith(p)));
  if (navRoutes || NO_PILL.some(p => pathname.startsWith(p))) return null;
  const lang = getLang();
  const fr = lang !== 'en';
  const verre = 'h-11 rounded-full border border-[#bb9a5e]/60 bg-[#1d1604]/55 backdrop-blur-md';
  return (
    <div className="fixed left-5 bottom-5 z-[60] flex items-center gap-2.5">
      <div role="group" aria-label={fr ? 'Langue' : 'Language'}
        className={`${verre} flex items-center px-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em]`}>
        {(['fr', 'en'] as const).map(l => (
          <button key={l} type="button" lang={l} aria-current={l === lang}
            onClick={() => { if (l !== lang) setLang(l); }}
            className={`h-8 px-3 rounded-full transition-colors ${l === lang ? 'bg-[#bb9a5e] text-[#1c1712]' : 'text-[#f4efe6]/60 hover:text-[#e8d9b8]'}`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={toggleAudio}
        aria-pressed={audioPlaying}
        aria-label={audioPlaying ? (fr ? 'Mettre la musique en pause' : 'Pause the music') : (fr ? 'Jouer la musique d’ambiance' : 'Play the ambient music')}
        title={fr ? 'Musique d’ambiance' : 'Ambient music'}
        className={`${verre} flex w-11 items-center justify-center text-[#e8d9b8] transition-colors hover:text-[#f4efe6]`}
      >
        <i className={`fa-solid ${audioPlaying ? 'fa-pause' : 'fa-music'} text-[12px]`} />
      </button>
    </div>
  );
};
export default LangPill;
