import React from 'react';
import { useLocation } from 'react-router-dom';
import { getLang, setLang } from '../../lib/i18n/lang';

// Floating FR | EN switch for routes that hide the global NavBar (and its
// language menu): /foyer and friends. Crème glass + laiton, bottom-left, the
// same spot as the switch on the static /accueil bundle.
const NO_PILL = ['/admin', '/slidebg', '/desinscription', '/v1', '/v2', '/v3'];

const LangPill: React.FC = () => {
  const { pathname } = useLocation();
  const navRoutes = !(pathname === '/' || pathname === '/accueil' || pathname === '/foyer' || NO_PILL.some(p => pathname.startsWith(p)));
  if (navRoutes || NO_PILL.some(p => pathname.startsWith(p))) return null;
  const lang = getLang();
  return (
    <div role="group" aria-label={lang === 'en' ? 'Language' : 'Langue'}
      className="fixed left-5 bottom-5 z-[60] flex items-center h-11 px-1.5 rounded-full border border-[#bb9a5e]/60 bg-[#1d1604]/55 backdrop-blur-md font-sans text-[10px] font-semibold uppercase tracking-[0.18em]">
      {(['fr', 'en'] as const).map(l => (
        <button key={l} type="button" lang={l} aria-current={l === lang}
          onClick={() => { if (l !== lang) setLang(l); }}
          className={`h-8 px-3 rounded-full transition-colors ${l === lang ? 'bg-[#bb9a5e] text-[#1c1712]' : 'text-[#f4efe6]/60 hover:text-[#e8d9b8]'}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
};
export default LangPill;
