import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { suivreLiveEnCours, type LiveEnCours } from '../../firebase/lives';

// La pastille « Live en cours », en haut à droite de tout le site React.
// Live public : le clic ouvre la diffusion (ou le feed). Live de formation :
// le clic mène à la page du cours, qui accueille ou propose l'achat.

const LiveBadge: React.FC = () => {
  const [live, setLive] = useState<LiveEnCours | null>(null);
  useEffect(() => suivreLiveEnCours(setLive), []);
  if (!live) return null;

  const classes = 'fixed right-4 top-20 z-[95] flex items-center gap-2.5 rounded-full border border-red-500/30 bg-[#293027]/90 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_14px_40px_-12px_rgba(180,40,30,0.6)] backdrop-blur-md transition-transform hover:scale-[1.04]';
  const contenu = (
    <>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <span>Live en cours</span>
      <span className="hidden max-w-[180px] truncate normal-case tracking-normal text-white/70 sm:inline">· {live.titre}</span>
    </>
  );

  if (live.formationId) {
    return <Link to={`/cours/${live.formationId}`} className={classes} aria-label={`Live en cours : ${live.titre}`}>{contenu}</Link>;
  }
  if (live.url) {
    return <a href={live.url} target="_blank" rel="noopener noreferrer" className={classes} aria-label={`Live en cours : ${live.titre}`}>{contenu}</a>;
  }
  return <Link to="/espace" className={classes} aria-label={`Live en cours : ${live.titre}`}>{contenu}</Link>;
};

export default LiveBadge;
