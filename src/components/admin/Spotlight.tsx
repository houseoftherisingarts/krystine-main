// La visite guidée de l'admin : un voile sombre percé d'un trou arrondi autour
// de l'élément visé, et une carte à côté qui explique ce que c'est et quoi en
// faire. L'élément se désigne par son attribut data-spotlight, la position se
// mesure au getBoundingClientRect et se reprend au redimensionnement comme au
// défilement. Flèches pour avancer et reculer, Échap pour fermer.
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface EtapeSpotlight {
  /** La valeur de data-spotlight de l'élément à éclairer. */
  cible: string;
  titre: string;
  texte: string;
}

const MARGE = 10;          // le trou respire un peu autour de l'élément
const LARGEUR = 360;       // la carte, sur grand écran

const Spotlight: React.FC<{ etapes: EtapeSpotlight[]; onFermer: () => void }> = ({ etapes, onFermer }) => {
  const [i, setI] = useState(0);
  const [boite, setBoite] = useState<DOMRect | null>(null);
  const carte = useRef<HTMLDivElement>(null);
  const etape = etapes[i];

  const trouver = (cible?: string) => (cible ? document.querySelector<HTMLElement>(`[data-spotlight="${cible}"]`) : null);

  const mesurer = useCallback(() => {
    const el = trouver(etape?.cible);
    setBoite(el ? el.getBoundingClientRect() : null);
  }, [etape?.cible]);

  // À chaque étape : amener l'élément dans l'écran, puis mesurer une seconde
  // fois quand le défilement est retombé.
  useEffect(() => {
    trouver(etape?.cible)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    mesurer();
    const t = window.setTimeout(mesurer, 450);
    return () => window.clearTimeout(t);
  }, [etape?.cible, mesurer]);

  useEffect(() => {
    window.addEventListener('resize', mesurer);
    window.addEventListener('scroll', mesurer, true);
    return () => {
      window.removeEventListener('resize', mesurer);
      window.removeEventListener('scroll', mesurer, true);
    };
  }, [mesurer]);

  useEffect(() => { carte.current?.focus(); }, [i]);

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onFermer(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (i + 1 < etapes.length) setI(i + 1); else onFermer(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setI(n => Math.max(0, n - 1)); }
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [i, etapes.length, onFermer]);

  if (!etape) return null;

  // La carte se pose sous l'élément quand il reste de la place, au-dessus
  // sinon. En mobile, elle prend la largeur de l'écran moins les gouttières.
  const mobile = typeof window !== 'undefined' && window.innerWidth < 700;
  const position: React.CSSProperties = boite
    ? {
        left: mobile ? 16 : Math.min(Math.max(16, boite.left), Math.max(16, window.innerWidth - LARGEUR - 16)),
        width: mobile ? 'calc(100vw - 32px)' : LARGEUR,
        ...(window.innerHeight - boite.bottom > 250
          ? { top: boite.bottom + 14 }
          : { bottom: Math.max(16, window.innerHeight - boite.top + 14) }),
      }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: mobile ? 'calc(100vw - 32px)' : LARGEUR };

  return (
    <>
      {/* Le voile : il retient les clics pendant la visite et se ferme au clic. */}
      <div
        className={`fixed inset-0 z-[200] ${boite ? '' : 'bg-[#1a1410]/60'}`}
        onClick={onFermer}
        aria-hidden="true"
      />
      {boite && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[201] rounded-[18px] transition-all duration-300 ease-out"
          style={{
            left: boite.left - MARGE,
            top: boite.top - MARGE,
            width: boite.width + MARGE * 2,
            height: boite.height + MARGE * 2,
            boxShadow: '0 0 0 9999px rgba(26,20,16,0.62)',
            outline: '1px solid rgba(186,123,57,0.85)',
          }}
        />
      )}

      <div
        ref={carte}
        role="dialog"
        aria-modal="true"
        aria-label={etape.titre}
        tabIndex={-1}
        className="fixed z-[202] rounded-[20px] border border-white/60 bg-[#f6f3ee] p-5 shadow-[0_24px_60px_-20px_rgba(26,20,16,0.6)] outline-none dark:border-white/10 dark:bg-[#1f2a25]"
        style={position}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
          Étape {i + 1} sur {etapes.length}
        </p>
        <h2 className="mt-2 font-serif text-xl leading-snug text-[#293027] dark:text-white">{etape.titre}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#38403a]/80 dark:text-white/70">{etape.texte}</p>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setI(n => Math.max(0, n - 1))}
            disabled={i === 0}
            className="rounded-full border border-[#38403a]/20 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#38403a]/70 transition-colors hover:border-[#BA7B39] disabled:opacity-40 dark:border-white/15 dark:text-white/70"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={() => (i + 1 < etapes.length ? setI(i + 1) : onFermer())}
            className="rounded-full bg-[#BA7B39] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1410] transition-colors hover:bg-[#9c6630]"
          >
            {i + 1 < etapes.length ? 'Suivant' : 'Terminer'}
          </button>
          <button
            type="button"
            onClick={onFermer}
            className="ml-auto text-[11px] font-bold uppercase tracking-[0.18em] text-[#38403a]/50 transition-colors hover:text-[#8B4A2F] dark:text-white/50"
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );
};

export default Spotlight;
