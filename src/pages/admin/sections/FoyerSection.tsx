import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditMode } from '../../../contexts/EditModeContext';
import { Card } from '../primitives';

// Entrée d'édition de la page Le Foyer d'Origine (/foyer). Comme la carte
// du tableau de bord pour l'accueil : le mode édition s'allume, puis la
// navigation reste en SPA pour garder la session admin vivante.
const FoyerSection: React.FC = () => {
  const navigate = useNavigate();
  const { setEditMode } = useEditMode();

  const openInEditMode = () => {
    setEditMode(true);
    navigate('/foyer');
  };

  return (
    <div className="space-y-8">
      <Card className="p-6 bg-gradient-to-br from-[#293027] to-[#4A3228] text-white border-[#BA7B39]/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#8B4A2F] block mb-2">
              Page du site
            </span>
            <h2 className="text-2xl font-serif mb-1">Le Foyer d’Origine</h2>
            <p className="text-sm text-white/70 max-w-xl">
              La page s’édite directement là où elle vit, à l’adresse /foyer. Un clic sur un texte
              le rend modifiable, un clic sur une photo ouvre la médiathèque pour la remplacer.
              Chaque changement est enregistré aussitôt et se voit en direct sur le site.
            </p>
          </div>
          <button
            type="button"
            onClick={openInEditMode}
            className="shrink-0 inline-flex items-center gap-2 bg-[#BA7B39] text-[#293027] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-white transition-colors"
          >
            <i className="fa-solid fa-pen" /> Ouvrir en édition
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-4">
          Comment ça se passe
        </h3>
        <ol className="space-y-3 text-sm text-[#293027]/80 dark:text-white/70 list-decimal pl-5">
          <li>Cliquez sur « Ouvrir en édition ». La page s’ouvre avec la barre dorée « Édition en cours » au bas de l’écran.</li>
          <li>Cliquez sur un titre ou un paragraphe pour le récrire. Le texte s’enregistre dès que vous cliquez ailleurs.</li>
          <li>Cliquez sur une photo pour ouvrir la médiathèque, puis choisissez l’image qui la remplace, ou téléversez-en une nouvelle.</li>
          <li>Cliquez sur « Terminer » dans la barre dorée pour sortir du mode édition.</li>
        </ol>
        <p className="text-xs text-[#293027]/50 dark:text-white/50 mt-5 leading-relaxed">
          Les vidéos, les fonds de texture et les animations de la page demeurent hors du mode édition.
          Écrivez à Alex pour les faire changer.
        </p>
      </Card>
    </div>
  );
};

export default FoyerSection;
