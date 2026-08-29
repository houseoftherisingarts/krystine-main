import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// ─── La barre de vote ──────────────────────────────────────────────
// Façon Reddit : une flèche vers le haut, le score, une flèche vers le
// bas. Recliquer une flèche déjà active retire le vote.
//
// ponytail : pas de bulle « qui a voté » au survol comme dans la
// version FMM, ajouter si Krystine la demande.
const VoteBar: React.FC<{
  score: number;
  monVote: 1 | -1 | 0;
  onVoter: (valeur: 1 | -1 | 0) => void;
  petit?: boolean;
}> = ({ score, monVote, onVoter, petit = false }) => {
  const taille = petit ? 12 : 16;
  const scoreClasse = score > 0
    ? 'text-[#bb9a5e]'
    : score < 0
      ? 'text-[#a3583f] dark:text-[#d18b6e]'
      : 'text-[#3a3126]/50 dark:text-white/50';

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onVoter(monVote === 1 ? 0 : 1)}
        aria-label="Voter pour"
        aria-pressed={monVote === 1}
        className={`p-1 rounded-full transition-colors hover:bg-[#bb9a5e]/10 ${monVote === 1 ? 'text-[#bb9a5e]' : 'text-[#3a3126]/35 dark:text-white/35'}`}
      >
        <ChevronUp size={taille} strokeWidth={2.5} />
      </button>

      <span className={`font-bold tabular-nums px-0.5 ${petit ? 'text-[11px]' : 'text-xs'} ${scoreClasse}`}>
        {score}
      </span>

      <button
        type="button"
        onClick={() => onVoter(monVote === -1 ? 0 : -1)}
        aria-label="Voter contre"
        aria-pressed={monVote === -1}
        className={`p-1 rounded-full transition-colors hover:bg-[#bb9a5e]/10 ${monVote === -1 ? 'text-[#a3583f] dark:text-[#d18b6e]' : 'text-[#3a3126]/35 dark:text-white/35'}`}
      >
        <ChevronDown size={taille} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default VoteBar;
