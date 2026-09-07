import React, { useEffect, useState } from 'react';
import { reclamerCoffreBeta } from '../../firebase/coffres';
import { niskas } from '../../lib/pointsConfig';
import { Coffre } from './Coffres';
import PieceNiska from './PieceNiska';
import Portail from '../Portail';

// Le coffre bêta : cinquante niskas et un mot de bienvenue pour les comptes
// créés du 7 septembre au 1er octobre 2026 inclus (Alex, 7 septembre 2026).
// Le serveur juge la fenêtre et dépose une seule fois (functions/src/niskas.ts,
// reclamerCoffreBeta); ici, l'animation ne joue qu'une fois, au premier écran
// de l'espace, avec la figurine dorée déjà transparente de Coffres.tsx
// (jamais la vidéo d'ouverture : son fond noir cuit dans l'image est
// justement ce qu'on corrige aujourd'hui).

const CLE_VU = 'krystine-coffre-beta-vu';
// La même clé que BienvenueJeu.tsx : on attend qu'elle se ferme avant de
// superposer un second pop-up sur le premier écran d'un compte tout neuf.
const CLE_JEU_VU = 'krystine-jeu-vu';

const CoffreBeta: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const [cadeau, setCadeau] = useState<{ montant: number; message: string } | null>(null);
  const [tremble, setTremble] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let vivant = true;
    let vu = '';
    try { vu = localStorage.getItem(`${CLE_VU}:${uid}`) || ''; } catch { /* noop */ }
    if (vu) return;
    reclamerCoffreBeta().then((r) => {
      if (!vivant) return;
      if (!r.eligible) { try { localStorage.setItem(`${CLE_VU}:${uid}`, '1'); } catch { /* noop */ } return; }
      const essaie = () => {
        if (!vivant) return;
        let jeuVu = '';
        try { jeuVu = localStorage.getItem(CLE_JEU_VU) || ''; } catch { /* noop */ }
        if (!jeuVu) { window.setTimeout(essaie, 400); return; }
        try { localStorage.setItem(`${CLE_VU}:${uid}`, '1'); } catch { /* noop */ }
        setCadeau({ montant: r.montant, message: r.message });
        window.setTimeout(() => setTremble(false), 1600);
      };
      essaie();
    }).catch((e) => console.warn('[coffre-beta] réclamation ratée', e));
    return () => { vivant = false; };
  }, [uid]);

  if (!cadeau) return null;
  const fr = lang === 'FR';

  return (
    <Portail>
    <div className="fixed inset-0 z-[135] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#151d19]/70 p-4 backdrop-blur-sm" onClick={() => !tremble && setCadeau(null)}>
      <div className="w-full max-w-md rounded-[24px] border border-white/60 bg-[#EEE7DB] p-7 text-center dark:border-white/10 dark:bg-[#293027]" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
          {fr ? 'Un coffre pour vous' : 'A chest for you'}
        </p>
        <div className="mx-auto mt-3 w-fit"><Coffre type="or" taille={170} ouvert={!tremble} tremble={tremble} /></div>
        {tremble ? (
          <p className="mt-3 font-serif text-xl text-[#293027] dark:text-white">{fr ? 'La clé tourne…' : 'The key turns…'}</p>
        ) : (
          <div className="mt-3">
            <p className="font-serif text-2xl leading-snug text-[#293027] dark:text-white">{cadeau.message}</p>
            <p className="mt-3 flex items-center justify-center gap-2 text-lg text-[#293027] dark:text-white">
              <PieceNiska size={18} /> {niskas(cadeau.montant, lang)}
            </p>
            <button
              type="button"
              onClick={() => setCadeau(null)}
              className="mt-6 rounded-full bg-[#293027] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
            >
              {fr ? 'Merci !' : 'Thank you!'}
            </button>
          </div>
        )}
      </div>
    </div>
    </Portail>
  );
};

export default CoffreBeta;
