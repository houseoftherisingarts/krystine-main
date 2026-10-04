import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import { trackListenStart, startPresence, stopPresence } from '../../lib/podcastStats';
import { enSecondes, type Episode } from './episodes';

/**
 * Le lecteur audio du podcast : un seul élément <audio>, caché, piloté par
 * des contrôles maison (lecture/pause, barre dorée, temps écoulé / durée)
 * qui remplacent la barre grise du navigateur. Krystine, 4 oct. 2026.
 */

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

export function useLecteur() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [courant, setCourant] = useState<Episode | null>(null);
  const [enLecture, setEnLecture] = useState(false);
  const [temps, setTemps] = useState(0);
  const [duree, setDuree] = useState(0);
  const traces = useRef(new Set<string>());

  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    audio.current = a;
    const surTemps = () => setTemps(a.currentTime);
    const surDuree = () => { if (Number.isFinite(a.duration)) setDuree(a.duration); };
    const surLecture = () => setEnLecture(true);
    const surArret = () => { setEnLecture(false); stopPresence(); };
    a.addEventListener('timeupdate', surTemps);
    a.addEventListener('loadedmetadata', surDuree);
    a.addEventListener('play', surLecture);
    a.addEventListener('pause', surArret);
    a.addEventListener('ended', surArret);
    return () => {
      a.pause();
      a.removeEventListener('timeupdate', surTemps);
      a.removeEventListener('loadedmetadata', surDuree);
      a.removeEventListener('play', surLecture);
      a.removeEventListener('pause', surArret);
      a.removeEventListener('ended', surArret);
      stopPresence();
    };
  }, []);

  /** Lance l'épisode, ou met en pause / reprend s'il joue déjà. */
  const basculer = useCallback((ep: Episode) => {
    const a = audio.current;
    if (!a) return;
    if (courant?.id === ep.id) {
      if (a.paused) a.play().catch(() => {}); else a.pause();
      return;
    }
    a.pause();
    a.src = ep.audio;
    setCourant(ep);
    setTemps(0);
    setDuree(enSecondes(ep.duree));
    a.play().catch(() => {});
    if (!traces.current.has(ep.id)) { traces.current.add(ep.id); trackListenStart(ep.id, ep.titreBrut); }
    startPresence(ep.id, ep.titreBrut);
  }, [courant]);

  const chercher = useCallback((s: number) => {
    const a = audio.current;
    if (a) { a.currentTime = s; setTemps(s); }
  }, []);

  return { courant, enLecture, temps, duree, basculer, chercher };
}

export type Lecteur = ReturnType<typeof useLecteur>;

/** Les contrôles d'un épisode : lecture/pause, barre de progression, temps. */
export const ControlesAudio: React.FC<{ ep: Episode; lecteur: Lecteur; className?: string }> = ({ ep, lecteur, className = '' }) => {
  const actif = lecteur.courant?.id === ep.id;
  const joue = actif && lecteur.enLecture;
  const total = actif ? lecteur.duree : enSecondes(ep.duree);
  const ecoule = actif ? lecteur.temps : 0;
  const pct = total ? Math.min(100, (ecoule / total) * 100) : 0;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <button
        type="button"
        onClick={() => lecteur.basculer(ep)}
        aria-label={joue ? 'Mettre en pause' : 'Écouter'}
        className="grid h-12 w-12 shrink-0 place-items-center bg-[#1c1712] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44]"
      >
        {joue ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative h-[18px]">
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#1c1712]/15" aria-hidden />
          <span className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#9c7a44]" style={{ width: `${pct}%` }} aria-hidden />
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9c7a44]"
            style={{ left: `${pct}%` }}
            aria-hidden
          />
          <input
            type="range"
            min={0}
            max={total || 1}
            step={1}
            value={ecoule}
            disabled={!actif}
            onChange={(e) => lecteur.chercher(Number(e.target.value))}
            aria-label="Position dans l'épisode"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[0.62rem] tabular-nums tracking-[0.12em] text-[#1c1712]/60">
          <span>{fmt(ecoule)}</span>
          <span>{total ? fmt(total) : ''}</span>
        </div>
      </div>
    </div>
  );
};
