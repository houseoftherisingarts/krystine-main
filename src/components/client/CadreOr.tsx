import React from 'react';

// Le cadre de la lettre d'or : une bordure en dégradé métallique (jamais un
// jaune plat), qui reçoit un lent reflet. Le fond intérieur suit le thème
// clair ou sombre par la variable --cadre-or-fond.

const STYLE_ID = 'cadre-or-style';
const CSS = `
@keyframes cadre-or-reflet { 0% { background-position: 0% 50%, 0% 50%; } 100% { background-position: 0% 50%, 200% 50%; } }
.cadre-or {
  --cadre-or-fond: #ffffff;
  position: relative;
  border: 2px solid transparent;
  background:
    linear-gradient(var(--cadre-or-fond), var(--cadre-or-fond)) padding-box,
    linear-gradient(115deg, #6f4e15 0%, #c9a24a 18%, #fff2b8 34%, #b8862b 50%, #f6dd8a 66%, #8a6420 82%, #d9b45c 100%) border-box;
  background-size: 100% 100%, 200% 100%;
  animation: cadre-or-reflet 9s linear infinite;
  box-shadow: 0 10px 30px -18px rgba(184, 134, 43, 0.55);
}
.dark .cadre-or { --cadre-or-fond: #293027; }
.cadre-or--fin { border-width: 1.5px; }
.cadre-or--large { border-width: 3px; }
@media (prefers-reduced-motion: reduce) { .cadre-or { animation: none; } }
.texte-or {
  background: linear-gradient(110deg, #8a6420, #e2c063 35%, #fff2b8 50%, #c9a24a 65%, #8a6420);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
`;

function injecter() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

export const CadreOr: React.FC<React.HTMLAttributes<HTMLDivElement> & { fin?: boolean; large?: boolean }> = ({ fin, large, className = '', children, ...rest }) => {
  injecter();
  return <div className={`cadre-or ${fin ? 'cadre-or--fin' : ''} ${large ? 'cadre-or--large' : ''} ${className}`} {...rest}>{children}</div>;
};

// L'étiquette « Lettre d'or · exclusive aux membres », en lettres dorées.
export const EtiquetteOr: React.FC<{ lang: 'FR' | 'EN'; className?: string }> = ({ lang, className = '' }) => {
  injecter();
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] font-bold texte-or ${className}`}>
      <i className="fa-solid fa-envelope" style={{ color: '#c9a24a' }} />
      {lang === 'FR' ? 'Lettre d’or · exclusive aux membres' : 'Golden letter · members only'}
    </span>
  );
};

export default CadreOr;
