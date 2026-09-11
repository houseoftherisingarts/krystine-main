import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ArrowDown, ArrowRight, ArrowUpRight } from '@phosphor-icons/react';

gsap.registerPlugin(ScrollTrigger);

/**
 * Le langage « magazine crème » des pages V2 du site (KrystineV2, MediasV2,
 * PodcastV2, FormationsV2) : un fond crème, une encre presque noire, des
 * titres en Fraunces, des filets d'or autour des photos, et une seule carte
 * vert profond par page. Ces primitives portent la charpente commune pour
 * qu'une nouvelle page ouvre exactement comme Médias, sans la recopier.
 * Alex, 11 septembre 2026 : « fais en sorte que ça ressemble au reste du site ».
 */

export const EASE_V2 = 'cubic-bezier(0.22,1,0.36,1)';
const ease = [0.22, 1, 0.36, 1] as const;

export const V2 = {
  creme: '#f4efe6',
  creme2: '#efe6d7',
  carte: '#faf6ee',
  encre: '#1c1712',
  encre2: '#3a2f23',
  or: '#7d6330',
  filet: '#9c7a44',
  vert: '#28352F',
  ivoire: '#EEE7DB',
  cuivre: '#BA7B39',
  cuivre2: '#d9a05b',
  dos: '#34241a',
} as const;

/** La gouttière des pages V2, identique sur toutes les sections. */
export const GOUTTIERE = 'px-[clamp(1.5rem,5vw,5.5rem)]';

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Les polices, le grain et l'indice de défilement, à poser une fois en tête de page. */
export const StyleV2: React.FC = () => (
  <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Inter:wght@300;400;500&display=swap');
      .v2-serif { font-family: "Fraunces", Georgia, serif; }
      .v2-grain { position: fixed; inset: 0; z-index: 60; pointer-events: none; opacity: 0.045; mix-blend-mode: multiply; background-image: ${GRAIN}; }
      @keyframes v2cue { 0%,100% { transform: translateY(0); opacity:.45 } 50% { transform: translateY(8px); opacity:1 } }
      .v2-cue { animation: v2cue 2.4s ${EASE_V2} infinite; }
      @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } }
    `}</style>
    <div className="v2-grain" aria-hidden />
  </>
);

export const Kicker: React.FC<{ children: React.ReactNode; className?: string; sombre?: boolean }> = ({ children, className = '', sombre = false }) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] ${sombre ? 'text-[#BA7B39]' : 'text-[#7d6330]'} ${className}`}>{children}</p>
);

/** La ligne de tête du seuil : le numéro du cahier à gauche, le lieu et l'année à droite. */
export const Masthead: React.FC<{ gauche: React.ReactNode; droite?: React.ReactNode }> = ({ gauche, droite }) => (
  <div data-fade className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55">
    <span>{gauche}</span>
    <span className="hidden sm:inline">{droite ?? <>Québec &middot; MMXXVI</>}</span>
  </div>
);

/** Le grand titre du seuil, une ligne par entrée, qui monte depuis le bas à l'arrivée. */
export const TitreV2: React.FC<{ lignes: string[]; className?: string }> = ({ lignes, className = '' }) => (
  <h1 className={`v2-serif font-light leading-[0.9] text-[#1c1712] ${/text-\[/.test(className) ? '' : 'text-[clamp(3rem,9vw,8.4rem)]'} ${/max-w-/.test(className) ? '' : 'max-w-[14ch]'} ${className}`}>
    {lignes.map((l, i) => (
      <span key={i} data-line className="block overflow-hidden pb-[0.06em]"><span className="block">{l}</span></span>
    ))}
  </h1>
);

export const SousTitreV2: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p data-fade className={`mt-7 v2-serif text-[clamp(1.3rem,2.4vw,1.95rem)] font-light leading-[1.32] text-[#3a2f23] max-w-[40ch] ${className}`}>{children}</p>
);

export const LiensChapitres: React.FC<{ liens: [string, string][] }> = ({ liens }) => (
  <div data-fade className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
    {liens.map(([label, href]) => (
      <a key={href} href={href} className="text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712]/70 border-b border-[#1c1712]/30 pb-1.5 hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors duration-300">
        {label}
      </a>
    ))}
  </div>
);

/** La planche : une photo (ou un cinémagraphe) dans son cadre fileté d'or, avec l'étiquette noire et la légende. */
export const Planche: React.FC<{
  src?: string;
  alt?: string;
  video?: string;
  poster?: string;
  etiquette?: string;
  legende?: React.ReactNode;
  ratio?: string;
  position?: string;
  /** Vrai sur la planche du seuil : elle se dévoile à l'arrivée et glisse au défilement. */
  seuil?: boolean;
  className?: string;
}> = ({ src, alt = '', video, poster, etiquette, legende, ratio = 'aspect-[16/9]', position = 'object-center', seuil = false, className = '' }) => (
  <div className={`relative w-full ${className}`}>
    <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
    <div data-portrait-clip={seuil ? '' : undefined} className={`relative w-full ${ratio} overflow-hidden bg-[#e7ddcb]`} style={seuil ? { clipPath: 'inset(0% 0% 0% 0%)' } : undefined}>
      {video ? (
        <video className={`h-full w-full object-cover ${position}`} src={video} poster={poster} autoPlay muted loop playsInline preload="metadata" />
      ) : (
        <img data-portrait-img={seuil ? '' : undefined} src={src} alt={alt} loading={seuil ? 'eager' : 'lazy'} referrerPolicy="no-referrer" className={`h-full w-full object-cover ${position} will-change-transform`} />
      )}
      {etiquette && (
        <span data-fade={seuil ? '' : undefined} className="absolute top-0 left-0 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
          {etiquette}
        </span>
      )}
    </div>
    {legende && <p data-fade={seuil ? '' : undefined} className="mt-3 v2-serif font-light text-[#1c1712]/55 text-sm leading-snug">{legende}</p>}
  </div>
);

export const LigneDefiler: React.FC<{ droite?: React.ReactNode; libelle?: string }> = ({ droite, libelle = 'Faire défiler' }) => (
  <div data-fade className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(2rem,5vh,3.5rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55">
    <span className="flex items-center gap-2 v2-cue"><ArrowDown size={13} weight="regular" /> {libelle}</span>
    {droite && <span className="hidden sm:inline">{droite}</span>}
  </div>
);

interface GesteProps {
  to?: string;
  href?: string;
  externe?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

const fleche = (externe?: boolean) => externe
  ? <ArrowUpRight size={15} weight="regular" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
  : <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />;

const rendre = ({ to, href, externe, onClick, children, className }: GesteProps & { className: string }) => {
  const contenu = <>{children} {fleche(externe)}</>;
  if (to) return <Link to={to} className={className}>{contenu}</Link>;
  if (href) return <a href={href} target={externe ? '_blank' : undefined} rel={externe ? 'noopener noreferrer' : undefined} className={className}>{contenu}</a>;
  return <button type="button" onClick={onClick} className={className}>{contenu}</button>;
};

/** Le lien souligné d'un filet noir, le geste discret des pages V2. */
export const LienSouligne: React.FC<GesteProps> = (p) => rendre({
  ...p,
  className: `group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] ${p.className || ''}`,
});

/** Le bouton noir carré, le geste principal sur crème. */
export const BoutonNoir: React.FC<GesteProps> = (p) => rendre({
  ...p,
  className: `group inline-flex min-h-[46px] items-center justify-center gap-2.5 bg-[#1c1712] px-7 py-3.5 text-[0.68rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] ${p.className || ''}`,
});

/** Le bouton cuivre arrondi, le geste principal sur la carte vert profond. */
export const BoutonCuivre: React.FC<GesteProps> = (p) => rendre({
  ...p,
  className: `group inline-flex min-h-[46px] items-center justify-center gap-2.5 rounded-full bg-[#BA7B39] px-6 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#1c1712] transition-colors duration-300 hover:bg-[#d9a05b] ${p.className || ''}`,
});

/** Le bouton ivoire de la quatrième de couverture. */
export const BoutonIvoire: React.FC<GesteProps> = (p) => rendre({
  ...p,
  className: `group inline-flex min-h-[46px] items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#34241a] bg-[#f4efe6] px-8 py-3.5 transition-colors duration-300 hover:bg-[#9c7a44] ${p.className || ''}`,
});

/** La carte vert profond du canon, une seule par page : filet cuivre, halo, ivoire. */
export const CarteVerte: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative overflow-hidden rounded-[15px] bg-[#28352F] text-[#EEE7DB] shadow-[0_40px_80px_-50px_rgba(41,48,39,0.8)] ${className}`}>
    <span className="pointer-events-none absolute inset-3 rounded-[11px] border border-[#BA7B39]/35" aria-hidden />
    <span
      aria-hidden
      className="pointer-events-none absolute -right-[20%] -top-[30%] h-[80%] w-[70%] rounded-full blur-[50px]"
      style={{ background: 'radial-gradient(circle, rgba(186,123,57,.38) 0%, rgba(40,53,47,0) 70%)' }}
    />
    <div className="relative">{children}</div>
  </div>
);

/** Le titre d'un chapitre, en Fraunces léger. */
export const TitreChapitre: React.FC<{ children: React.ReactNode; className?: string; sombre?: boolean }> = ({ children, className = '', sombre = false }) => (
  <h2 className={`v2-serif font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.8rem)] ${sombre ? 'text-[#EEE7DB]' : 'text-[#1c1712]'} ${className}`}>{children}</h2>
);

export const Filet: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`block h-px w-12 bg-[#9c7a44] ${className}`} aria-hidden />
);

/** L'entrée en douceur d'un bloc quand il arrive dans l'écran. */
export const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className, delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 1.05, ease, delay: Math.min(delay, 0.3) }}
    >
      {children}
    </motion.div>
  );
};

/** La quatrième de couverture : la citation, les gestes, puis la signature. */
export const QuatriemeCouverture: React.FC<{ citation: React.ReactNode; children?: React.ReactNode; note?: React.ReactNode }> = ({ citation, children, note }) => (
  <footer className={`relative w-full bg-[#34241a] text-[#f4efe6] ${GOUTTIERE} pt-[clamp(5rem,12vh,9rem)] pb-12`}>
    <div className="mx-auto max-w-[860px] text-center">
      <p className="v2-serif font-light text-[clamp(1.6rem,3.6vw,2.8rem)] leading-[1.24] text-[#f4efe6]">{citation}</p>
      {children && <div className="mt-10 flex flex-wrap items-center justify-center gap-x-9 gap-y-4">{children}</div>}
    </div>
    <div className="mt-[clamp(4rem,9vh,7rem)] flex flex-col items-center justify-between gap-4 border-t border-[#f4efe6]/15 pt-7 text-center text-[0.6rem] uppercase tracking-[0.24em] text-[#f4efe6]/45 sm:flex-row sm:text-left">
      <span className="v2-serif normal-case tracking-tight text-[0.95rem] text-[#f4efe6]/80">Krystine <span className="font-light">St-Laurent</span></span>
      <span className="normal-case tracking-[0.08em]">{note ?? <span className="uppercase tracking-[0.24em]">Inspira Nature &middot; Québec &middot; MMXXVI</span>}</span>
    </div>
  </footer>
);

/**
 * Le mouvement du seuil et le défilement doux, portés de MediasV2 : les lignes
 * du titre montent, la planche se dévoile, puis glisse au défilement, et les
 * ancres défilent par Lenis. `pret` retarde le départ tant que la page attend
 * ses données, pour que l'entrée joue sur le vrai contenu.
 */
export function useMotionV2(root: React.RefObject<HTMLDivElement | null>, pret = true) {
  useEffect(() => {
    if (!pret || !root.current) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    let lenis: Lenis | null = null;
    const raf = (time: number) => lenis?.raf(time * 1000);
    const racine = root.current;

    const onAnchorClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const cible = racine.querySelector(href) as HTMLElement | null;
      if (cible) { e.preventDefault(); lenis?.scrollTo(cible, { offset: -72 }); }
    };

    const ctx = gsap.context(() => {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      const power3 = 'power3.out';
      gsap.from('[data-line] > span', { yPercent: 115, duration: 1.2, ease: power3, stagger: 0.12, delay: 0.15 });
      gsap.from('[data-portrait-clip]', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.35, ease: power3, delay: 0.3 });
      gsap.from('[data-portrait-img]', { scale: 1.12, duration: 1.9, ease: power3, delay: 0.3 });
      gsap.from('[data-fade]', { opacity: 0, y: 22, duration: 1, ease: power3, stagger: 0.09, delay: 0.6 });
      gsap.to('[data-portrait-img]', {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
      });
    }, racine);

    racine.addEventListener('click', onAnchorClick);
    return () => {
      racine.removeEventListener('click', onAnchorClick);
      ctx.revert();
      gsap.ticker.remove(raf);
      lenis?.destroy();
    };
  }, [pret, root]);
}
