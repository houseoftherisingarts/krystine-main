// Un item du plan : la case, son libellé, sa mesure de succès modifiable en
// place, et une fois la case cochée, le résultat obtenu et le verdict d'impact.
// Cocher dit que la chose est faite; c'est l'impact qui dit qu'elle a marché.
import React, { useEffect, useRef, useState } from 'react';
import type { Cochable } from '../../../../lib/planAutomne';
import type { Impact, ItemPlan } from '../../../../firebase/planAutomne';

const IMPACTS: { cle: Impact; label: string; fond: string; texte: string; bord: string }[] = [
  { cle: 'oui',        label: 'Oui',        fond: '#dff0e5', texte: '#26604a', bord: '#9dcdb2' },
  { cle: 'pas-encore', label: 'Pas encore', fond: '#f4f2ea', texte: '#7a6a45', bord: '#ddd3bb' },
  { cle: 'non',        label: 'Non',        fond: '#fbe3e7', texte: '#9e3d57', bord: '#eeb9c4' },
];

interface Props {
  item: Cochable;
  etat?: ItemPlan;
  defaut: string;
  accent: string;
  /** Vrai quand Firestore refuse l'écriture : on note l'état, sans le promettre. */
  lectureSeule: boolean;
  onCocher: (fait: boolean) => void;
  onMaj: (morceau: Partial<ItemPlan>) => void;
  petit?: boolean;
}

const ItemCochable: React.FC<Props> = ({ item, etat, defaut, accent, lectureSeule, onCocher, onMaj, petit }) => {
  const fait = etat?.fait === true;
  const mesure = etat?.mesure ?? defaut;
  const [edite, setEdite] = useState(false);
  const [brouillon, setBrouillon] = useState(mesure);
  const annule = useRef(false);
  const champ = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (edite) { champ.current?.focus(); champ.current?.select(); } }, [edite]);

  const ouvrir = () => { setBrouillon(mesure); annule.current = false; setEdite(true); };
  const enregistrer = () => {
    if (annule.current) { annule.current = false; setEdite(false); return; }
    const propre = brouillon.trim();
    setEdite(false);
    if (propre !== mesure) onMaj({ mesure: propre });
  };

  const tailleTexte = petit ? 'text-[12px]' : 'text-[12.5px]';

  return (
    <li className="group/item">
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={fait}
          onChange={e => onCocher(e.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden
          className="mt-[3px] flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-[2px] border-[1.5px] transition-[background-color,border-color] duration-200 ease-out"
          style={{ borderColor: accent, backgroundColor: fait ? accent : 'transparent' }}
        >
          <i
            className="fa-solid fa-check text-[8px] leading-none text-white transition-opacity duration-200 ease-out"
            style={{ opacity: fait ? 1 : 0 }}
          />
        </span>
        <span
          className={`${tailleTexte} leading-snug transition-colors duration-200 ease-out`}
          style={{ color: fait ? '#6a7168' : '#2b3340' }}
        >
          {item.texte}
        </span>
      </label>

      <div className="ml-[21px] mt-1">
        {edite ? (
          <div className="rounded-[6px] border border-[#cfd6dd] bg-white p-1.5">
            <textarea
              ref={champ}
              value={brouillon}
              rows={4}
              onChange={e => setBrouillon(e.target.value)}
              onBlur={enregistrer}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
                if (e.key === 'Escape') { annule.current = true; e.currentTarget.blur(); }
              }}
              className="w-full resize-none rounded-[4px] bg-transparent text-[11px] leading-snug text-[#2b3340] outline-none"
              aria-label={`Mesure de succès pour ${item.texte}`}
            />
            <div className="mt-1 flex items-center justify-between gap-1">
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setBrouillon(defaut); }}
                className="text-[9px] uppercase tracking-[0.1em] text-[#8892a0] underline-offset-2 hover:underline"
              >
                Remettre la mesure proposée
              </button>
              <span className="text-[9px] text-[#a9b1bb]">Entrée enregistre</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={ouvrir}
            className="block w-full text-left text-[10.5px] leading-[1.35] text-[#7b8593] transition-colors duration-200 hover:text-[#2b3340]"
          >
            <span className="font-semibold uppercase tracking-[0.06em] text-[#9aa3ae]">Mesure de succès : </span>
            {mesure}
          </button>
        )}

        {fait && !edite && (
          <div className="mt-1.5 space-y-1">
            <input
              type="text"
              defaultValue={etat?.resultat ?? ''}
              placeholder="Résultat obtenu"
              onBlur={e => {
                const v = e.target.value.trim();
                if (v !== (etat?.resultat ?? '')) onMaj({ resultat: v });
              }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              className="w-full rounded-[4px] border border-[#dbe1e7] bg-white px-1.5 py-1 text-[10.5px] text-[#2b3340] outline-none placeholder:text-[#aab2bc] focus:border-[#9aa3ae]"
              aria-label={`Résultat obtenu pour ${item.texte}`}
            />
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[9px] uppercase tracking-[0.08em] text-[#9aa3ae]">Impact</span>
              {IMPACTS.map(p => {
                const actif = etat?.impact === p.cle;
                return (
                  <button
                    key={p.cle}
                    type="button"
                    onClick={() => onMaj({ impact: actif ? undefined : p.cle })}
                    aria-pressed={actif}
                    className="rounded-full border px-1.5 py-[1px] text-[9px] font-semibold transition-colors duration-200 ease-out"
                    style={{
                      backgroundColor: actif ? p.fond : 'transparent',
                      color: actif ? p.texte : '#98a1ac',
                      borderColor: actif ? p.bord : '#dbe1e7',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {lectureSeule && edite && (
          <p className="mt-1 text-[9px] leading-snug text-[#b07a58]">Les règles du plan ne sont pas encore en ligne.</p>
        )}
      </div>
    </li>
  );
};

export default ItemCochable;
