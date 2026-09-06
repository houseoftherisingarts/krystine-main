import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { useAuth, useUI } from '../../contexts/AppContext';
import { updateMember } from '../../firebase/firestore';
import { aAchete } from '../../firebase/formations';
import { suivreBoutique } from '../../firebase/points';
import { MUSIQUE_ORIGINE_ID } from '../../firebase/musique';

// La bulle de musique de la barre : un petit menu avec les pièces que la
// personne possède (l'ambiance du site pour tout le monde, la musique
// d'Origine quand elle l'a reçue ou achetée), le choix de la pièce et le
// bouton lecture. Le choix s'écrit dans members.personnalisation.musiqueSite,
// que MusiqueDuSite écoute pour changer la piste du lecteur.

const MenuMusique: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, audioPlaying, toggleAudio } = useUI();
  const { user, member } = useAuth();
  const fr = lang === 'FR';
  const [ouvert, setOuvert] = useState(false);
  const [aOrigine, setAOrigine] = useState(false);
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setAOrigine(false); return; }
    let vivant = true;
    aAchete(user.uid, MUSIQUE_ORIGINE_ID).then(v => { if (vivant && v) setAOrigine(true); }).catch(() => {});
    const off = suivreBoutique(user.uid, p => { if (vivant && p.possede['musique-origine']) setAOrigine(true); });
    return () => { vivant = false; off(); };
  }, [user]);

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => { if (!boite.current?.contains(e.target as Node)) setOuvert(false); };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouvert]);

  const origineChoisie = !!member?.personnalisation?.musiqueSite;
  const choisir = async (origine: boolean) => {
    if (!user || origine === origineChoisie) return;
    await updateMember(user.uid, { personnalisation: { ...(member?.personnalisation || {}), musiqueSite: origine } });
  };

  const pistes: { id: string; titre: string; sous: string; origine: boolean; dispo: boolean }[] = [
    { id: 'site', titre: fr ? 'L’ambiance du site' : 'The site ambience', sous: fr ? 'Offerte à toutes' : 'For everyone', origine: false, dispo: true },
    { id: 'origine', titre: fr ? 'La musique d’Origine' : 'The Origine music', sous: aOrigine ? (fr ? 'À vous' : 'Yours') : (fr ? 'Offerte au Foyer, ou 5 niskas à la petite boutique' : 'Offered at the Hearth, or 5 niskas at the little shop'), origine: true, dispo: aOrigine },
  ];

  return (
    <div ref={boite} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOuvert(v => !v)}
        aria-haspopup="true" aria-expanded={ouvert}
        title={fr ? 'Musique' : 'Music'}
        aria-label={fr ? 'Ouvrir le menu de la musique' : 'Open the music menu'}
        className="w-11 h-11 flex items-center justify-center rounded-full border border-brass/25 bg-white/55 text-ink/80 dark:border-white/15 dark:bg-white/5 dark:text-ctext/80 hover:text-brassInk dark:hover:text-brassBright hover:bg-brass/10 transition-colors"
      >
        {audioPlaying ? (
          <div className="flex gap-[2px] items-end h-3" aria-hidden>
            {[1, 1.4, 0.8].map((d, i) => (
              <span key={i} className="w-[2px] bg-brass rounded-full animate-bounce motion-reduce:animate-none" style={{ height: i === 1 ? '12px' : '8px', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : <Music size={15} strokeWidth={1.75} />}
      </button>
      <AnimatePresence>
        {ouvert && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-[#BA7B39]/25 bg-white/90 shadow-[0_18px_50px_-20px_rgba(41,48,39,0.45)] backdrop-blur-md dark:bg-[#293027]/95"
            role="menu"
          >
            <div className="flex items-center justify-between border-b border-[#38403a]/10 px-4 pt-3.5 pb-2 dark:border-white/10">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#38403a]/50 dark:text-white/45">{fr ? 'Vos musiques' : 'Your music'}</p>
              <button type="button" onClick={toggleAudio} className="inline-flex items-center gap-2 rounded-full bg-[#293027] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027]">
                <i className={`fa-solid ${audioPlaying ? 'fa-pause' : 'fa-play'} text-[9px]`} /> {audioPlaying ? (fr ? 'Pause' : 'Pause') : (fr ? 'Jouer' : 'Play')}
              </button>
            </div>
            <ul className="py-1">
              {pistes.map(p => {
                const active = p.origine === origineChoisie;
                return (
                  <li key={p.id}>
                    <button
                      type="button" role="menuitemradio" aria-checked={active} disabled={!p.dispo}
                      onClick={() => { void choisir(p.origine); }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${p.dispo ? 'hover:bg-[#BA7B39]/10' : 'cursor-not-allowed opacity-55'}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${active ? 'bg-[#BA7B39] text-[#293027]' : 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]'}`}>
                        <i className={`fa-solid ${active && audioPlaying ? 'fa-volume-high' : p.dispo ? 'fa-music' : 'fa-lock'} text-[11px]`} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm text-[#293027] dark:text-white">{p.titre}</span>
                        <span className="block text-[11px] text-[#38403a]/55 dark:text-white/55">{p.sous}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {user && (
              <a href="/compte?onglet=telechargements" className="block border-t border-[#38403a]/10 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#8B4A2F] hover:bg-[#BA7B39]/10 dark:border-white/10 dark:text-[#BA7B39]">
                {fr ? 'Mes musiques dans mon espace' : 'My music in my space'}
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuMusique;
