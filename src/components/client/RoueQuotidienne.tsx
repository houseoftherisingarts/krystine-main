import React, { useEffect, useState } from 'react';
import { reclamerQuotidien, type Quotidien } from '../../firebase/points';
import { ROUE_QUOTIDIENNE, journee, fanams } from '../../lib/pointsConfig';
import PieceFanam from './PieceFanam';

// La roue des sept jours (sur le modèle du Festival médiéval). À la première
// visite de la journée, la récompense tombe d'elle-même et le panneau se
// lève : sept cases, celle du jour allumée, les jours passés éteints, les
// jours à venir dans la pénombre. Passé le septième jour, la roue repart.
// Le solde se lit en direct ailleurs (memberPoints), rien à rafraîchir ici.

const CLE_VU = 'krystine-roue-vue';

const RoueQuotidienne: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const [etat, setEtat] = useState<Quotidien | null>(null);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let vivant = true;
    const aujourdhui = journee();
    let vu = '';
    try { vu = localStorage.getItem(CLE_VU) || ''; } catch { /* noop */ }
    reclamerQuotidien(uid).then((r) => {
      if (!vivant) return;
      setEtat(r);
      if (!r.deja || vu !== aujourdhui) {
        setOuvert(true);
        try { localStorage.setItem(CLE_VU, aujourdhui); } catch { /* noop */ }
      }
    }).catch((e) => console.warn('[roue] réclamation ratée', e));
    return () => { vivant = false; };
  }, [uid]);

  useEffect(() => {
    const ouvrir = () => setOuvert(true);
    window.addEventListener('krystine:ouvrir-roue', ouvrir);
    return () => window.removeEventListener('krystine:ouvrir-roue', ouvrir);
  }, []);

  if (!etat || !ouvert) return null;
  const fr = lang === 'FR';
  const jour = etat.jour;

  return (
    <div data-bug-ignore className="fixed inset-0 z-[125] flex items-end justify-center bg-[#151d19]/55 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOuvert(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="roue-titre"
        className="w-full max-w-xl rounded-[24px] border border-white/60 bg-[#EEE7DB] p-6 shadow-2xl md:p-8 dark:border-white/10 dark:bg-[#293027]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
          {fr ? 'Récompense du jour' : 'Reward of the day'}
        </p>
        <h2 id="roue-titre" className="mt-1 font-serif text-2xl text-[#293027] dark:text-white" style={{ letterSpacing: '-0.01em' }}>
          {etat.deja
            ? (fr ? 'Votre récompense du jour est déjà tombée.' : 'Today’s reward already dropped.')
            : (fr ? `${fanams(etat.montant, 'FR')} ${etat.montant > 1 ? 'tombent' : 'tombe'} dans votre bourse.` : `${fanams(etat.montant, 'EN')} drop${etat.montant > 1 ? '' : 's'} into your purse.`)}
        </h2>
        <p className="mt-2 text-sm text-[#293027]/70 dark:text-white/70">
          {fr
            ? `Jour ${jour} sur ${ROUE_QUOTIDIENNE.length}. Revenez demain et la roue avance; sautez une journée et elle repart au premier jour.`
            : `Day ${jour} of ${ROUE_QUOTIDIENNE.length}. Come back tomorrow and the wheel moves on; skip a day and it starts over.`}
        </p>

        <ol className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">
          {ROUE_QUOTIDIENNE.map((montant, i) => {
            const n = i + 1;
            const passe = n < jour;
            const actuel = n === jour;
            return (
              <li
                key={n}
                className={`flex flex-col items-center gap-1.5 rounded-[14px] border px-1 py-3 text-center transition-all ${
                  actuel
                    ? 'border-[#BA7B39] bg-[#BA7B39]/15 shadow-[0_0_0_3px_rgba(186,123,57,0.25)]'
                    : passe
                      ? 'border-[#38403a]/10 bg-white/40 opacity-60 dark:border-white/10 dark:bg-white/5'
                      : 'border-[#38403a]/10 bg-white/25 dark:border-white/10 dark:bg-white/[0.03]'
                }`}
              >
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#38403a]/60 dark:text-white/60">{fr ? 'Jour' : 'Day'} {n}</span>
                <PieceFanam size={actuel ? 30 : 24} eteinte={passe} />
                <span className={`font-serif text-base ${actuel ? 'text-[#8B4A2F] dark:text-[#d9a05b]' : 'text-[#293027] dark:text-white'}`}>+{montant}</span>
                {passe && <i className="fa-solid fa-check text-[10px] text-[#8B4A2F]" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-[#293027]/55 dark:text-white/55">
            {fr ? `Suite en cours : ${etat.serie} jour${etat.serie > 1 ? 's' : ''} d’affilée.` : `Current streak: ${etat.serie} day${etat.serie > 1 ? 's' : ''} in a row.`}
          </p>
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="rounded-full bg-[#293027] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
          >
            {fr ? 'Merci' : 'Thanks'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoueQuotidienne;
