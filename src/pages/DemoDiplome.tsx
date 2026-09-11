import React from 'react';
import { useUI } from '../contexts/AppContext';
import Diplome from '../components/cours/Diplome';
import { telechargerDiplome } from '../lib/diplomePdf';

// L'aperçu du parchemin, pour que Krystine voie ce que ses clientes recevront
// sans avoir à terminer un cours. Même rôle que /demo-skins.

const INFOS = {
  nom: 'Marie-Claude Tremblay',
  programme: 'Expérience Ayurveda · Saison Vata',
  accompli: 'huit semaines et cinquante leçons',
  date: '2026-09-10',
  numero: 'VATA · 7644 · A3F19C',
};

const DemoDiplome: React.FC = () => {
  const { lang } = useUI();
  return (
    <div className="min-h-screen bg-[#EEE7DB] px-5 pb-24 pt-28 md:px-10 dark:bg-[#151d19]">
      <div className="mx-auto max-w-5xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B4A2F] dark:text-[#d9a05b]">Aperçu</p>
        <h1 className="mt-2 font-serif text-3xl text-[#293027] dark:text-white">Le diplôme de complétion</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#38403a]/70 dark:text-white/60">
          Voici le parchemin qu’une cliente reçoit quand elle termine la dernière leçon d’un parcours. Il vit ensuite
          dans son espace, sous « Mes diplômes », et se prend en PDF pour l’imprimer.
        </p>
        <div className="mt-8 overflow-hidden rounded-[10px] shadow-[0_30px_70px_-28px_rgba(41,48,39,0.6)]">
          <Diplome infos={INFOS} lang={lang} />
        </div>
        <button
          type="button"
          onClick={() => telechargerDiplome(INFOS, lang)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#151d19] transition-colors hover:bg-[#d9a05b]"
        >
          <i className="fa-solid fa-file-arrow-down" /> Prendre le PDF
        </button>
      </div>
    </div>
  );
};

export default DemoDiplome;
