import React, { useState } from 'react';
import { prixReduit, utiliserCadeau, type Cadeau } from '../../firebase/cadeaux';

// La carte d'un cadeau de Krystine : la formation, le rabais, son mot, et le
// bouton qui l'utilise (accordé sur le champ à 100 %, Stripe au prix réduit
// sinon). Sert dans la bannière de l'espace et dans la messagerie.

const CadeauCarte: React.FC<{ cadeau: Cadeau; lang: string; compact?: boolean }> = ({ cadeau, lang, compact }) => {
  const fr = lang === 'FR';
  const [occupe, setOccupe] = useState(false);
  const [dit, setDit] = useState<string | null>(null);
  const entier = cadeau.pourcent >= 100;
  const reduit = prixReduit(cadeau);

  const utiliser = async () => {
    if (occupe) return;
    setOccupe(true);
    try {
      const r = await utiliserCadeau(cadeau.id);
      if (r.accorde) {
        setDit(fr ? `« ${cadeau.formationTitre} » est à vous. Elle vous attend dans « Mes formations ».` : `“${cadeau.formationTitre}” is yours. It is waiting in “My courses”.`);
        window.setTimeout(() => window.location.assign(`/cours/${cadeau.formationId}`), 1600);
      } else if (r.url) {
        window.location.href = r.url;
      }
    } catch (e) {
      const m = (e as { message?: string }).message || '';
      setDit(m.replace(/^.*?:\s*/, '') || (fr ? 'Le cadeau n’a pas pu être utilisé. Réessayez dans un instant.' : 'The gift could not be used. Try again in a moment.'));
      setOccupe(false);
    }
  };

  return (
    <div className={`flex gap-4 rounded-[18px] border border-[#BA7B39]/50 bg-[#BA7B39]/10 ${compact ? 'p-4' : 'p-5'}`}>
      {cadeau.formationImage && !compact && (
        <img src={cadeau.formationImage} alt="" className="hidden h-24 w-36 flex-none rounded-[12px] object-cover sm:block" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
          <i className="fa-solid fa-gift mr-1" /> {fr ? 'Un cadeau de Krystine' : 'A gift from Krystine'}
        </p>
        <p className="mt-1 font-serif text-xl text-[#293027] dark:text-white">
          {entier
            ? (fr ? `« ${cadeau.formationTitre} », offerte` : `“${cadeau.formationTitre}”, offered`)
            : (fr ? `${cadeau.pourcent} % de rabais sur « ${cadeau.formationTitre} »` : `${cadeau.pourcent}% off “${cadeau.formationTitre}”`)}
        </p>
        {cadeau.message && !compact && <p className="mt-2 whitespace-pre-line text-sm text-[#293027]/70 dark:text-white/70">{cadeau.message}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!entier && (
            <span className="font-serif text-lg text-[#293027] dark:text-white">
              {reduit.toFixed(2).replace('.00', '')} $ <span className="text-sm text-[#293027]/45 line-through dark:text-white/45">{cadeau.prix} $</span>
            </span>
          )}
          <button
            type="button"
            onClick={utiliser}
            disabled={occupe}
            className="inline-flex items-center gap-2 rounded-full bg-[#293027] px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] hover:bg-[#3a453a] disabled:opacity-50 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
          >
            <i className={`fa-solid ${occupe ? 'fa-circle-notch fa-spin' : entier ? 'fa-lock-open' : 'fa-tag'}`} />
            {entier ? (fr ? 'Recevoir ma formation' : 'Receive my course') : (fr ? 'Utiliser mon rabais' : 'Use my discount')}
          </button>
        </div>
        {dit && <p className="mt-2 text-sm text-[#293027]/75 dark:text-white/75">{dit}</p>}
      </div>
    </div>
  );
};

export default CadeauCarte;
