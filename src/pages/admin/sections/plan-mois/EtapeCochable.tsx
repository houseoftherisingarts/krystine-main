// Une étape du plan du mois : la case, le texte, qui la fait, et une fois
// cochée, la date du geste et une note d'une ligne. Cocher dit que la chose
// est faite; la note garde ce qui s'est passé.
import React, { useState } from 'react';
import type { Etape, Qui } from '../../../../lib/planMois';
import type { EtapePlanMois } from '../../../../firebase/planMois';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const enLettres = (d: Date): string => `${d.getDate()} ${MOIS[d.getMonth()]}`;

const QUI: Record<Qui, { fond: string; texte: string }> = {
  Krystine: { fond: '#f3e4cf', texte: '#7d5a26' },
  Alex:     { fond: '#e6e8ee', texte: '#3f4a5c' },
  Ensemble: { fond: '#e2ece6', texte: '#2f5a44' },
};

interface Props {
  etape: Etape;
  etat?: EtapePlanMois;
  accent: string;
  /** Vrai quand Firestore refuse l'écriture : on note l'état, sans le promettre. */
  lectureSeule: boolean;
  onCocher: (fait: boolean) => void;
  onNoter: (note: string) => void;
}

const EtapeCochable: React.FC<Props> = ({ etape, etat, accent, lectureSeule, onCocher, onNoter }) => {
  const fait = etat?.fait === true;
  const [note, setNote] = useState(etat?.note ?? '');
  const date = etat?.faitLe?.toDate ? etat.faitLe.toDate() : null;
  const qui = QUI[etape.qui];

  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" checked={fait} onChange={e => onCocher(e.target.checked)} className="sr-only" />
        <span
          aria-hidden
          className="mt-[3px] flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[3px] border-[1.5px] transition-[background-color,border-color] duration-200 ease-out"
          style={{ borderColor: accent, backgroundColor: fait ? accent : 'transparent' }}
        >
          <i className="fa-solid fa-check text-[9px] leading-none text-white transition-opacity duration-200 ease-out" style={{ opacity: fait ? 1 : 0 }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[14px] leading-[1.45] transition-colors duration-200 ease-out" style={{ color: fait ? '#7a7f76' : '#1c1712' }}>
            {etape.texte}
          </span>
          {etape.repere && (
            <span className="mt-1 block text-[13px] leading-[1.45] text-[#6b6257]">
              {etape.repere}
            </span>
          )}
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-2 py-[2px] text-[13px] font-semibold tracking-[0.02em]" style={{ backgroundColor: qui.fond, color: qui.texte }}>
              {etape.qui}
            </span>
            {fait && date && (
              <span className="text-[13px] text-[#7a7f76]">fait le {enLettres(date)}</span>
            )}
            {fait && !date && !lectureSeule && (
              <span className="text-[13px] text-[#7a7f76]">fait à l'instant</span>
            )}
          </span>
        </span>
      </label>

      {fait && (
        <div className="ml-[25px] mt-1.5">
          <input
            type="text"
            value={note}
            placeholder="Une note, si vous voulez"
            onChange={e => setNote(e.target.value)}
            onBlur={() => { const v = note.trim(); if (v !== (etat?.note ?? '')) onNoter(v); }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="w-full rounded-[6px] border border-[#e3ddd0] bg-white/70 px-2 py-1 text-[13px] text-[#1c1712] outline-none placeholder:text-[#9b968c] focus:border-[#9c7a44]"
            aria-label={`Note pour ${etape.texte.slice(0, 60)}`}
          />
        </div>
      )}
    </li>
  );
};

export default EtapeCochable;
