import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';
import { BIENVENUE } from './content';
import { Cta } from './Cta';
import FondVivant from './FondVivant';

const ease = [0.16, 0.8, 0.24, 1] as const;

/**
 * L'allumette.
 *
 * Une main frotte une allumette, l'étincelle prend, la flamme s'installe.
 * La scène est une vraie vidéo, lue image par image au rythme du défilement.
 * Par-dessus, la parole arrive un temps à la fois, jusqu'au geste.
 *
 * La position de lecture suit la progression avec un lissage : un grand écart
 * se rattrape d'un coup, les petits glissent.
 */

interface Temps {
  texte: string;
  /** [entrée, plein, sortie début, sortie fin] en fraction de la progression */
  f: [number, number, number, number];
  taille: 'grand' | 'moyen' | 'repere';
}

const TEMPS: Temps[] = [
  { texte: BIENVENUE.marks[0], f: [0.08, 0.18, 0.34, 0.42], taille: 'repere' },
  { texte: BIENVENUE.marks[1], f: [0.44, 0.54, 0.64, 0.72], taille: 'repere' },
  { texte: BIENVENUE.marks[2], f: [0.72, 0.8, 0.985, 1], taille: 'repere' },
];

const CLASSES: Record<Temps['taille'], string> = {
  grand:
    'font-serif font-medium leading-[1.12] text-ctext text-[clamp(1.35rem,0.85rem+2.4vw,3rem)] max-w-[48ch]',
  moyen: 'font-sans text-ctextSoft text-fyBody max-w-[60ch]',
  repere:
    'font-serif font-medium leading-none text-brassBright text-[clamp(2rem,5vw,4.2rem)] max-w-[18ch]',
};

const AllumetteDuFoyer: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const p = useMotionValue(0);

  /* progression maison (rAF + rect) : useScroll mesure mal dans cette page */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (total <= 0) return;
      p.set(Math.min(1, Math.max(0, -r.top / total)));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [p]);

  /* la lecture suit le scroll : on vise la position, on y glisse */
  useEffect(() => {
    if (reduce) return;
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    let joue = 0;
    const boucle = () => {
      const d = v.duration;
      if (d && Number.isFinite(d)) {
        /* l'allumette prend entre 10 % et 80 % du défilement */
        const avance = Math.min(1, Math.max(0, (p.get() - 0.02) / 0.62));
        /* la flamme reste dans le cadre : on s'arrête avant que la main ne l'emporte */
        const cible = avance * (d * 0.86);
        joue += (cible - joue) * (Math.abs(cible - joue) > 0.8 ? 1 : 0.22);
        if (Math.abs(joue - v.currentTime) > 0.012) v.currentTime = joue;
      }
      raf = requestAnimationFrame(boucle);
    };
    const demarrer = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(boucle);
    };
    if (v.readyState >= 1) demarrer();
    else v.addEventListener('loadedmetadata', demarrer, { once: true });
    return () => cancelAnimationFrame(raf);
  }, [p, reduce]);

  /* la scène s'approche pendant que la flamme prend */
  /* la caméra recule : la scène tient dans 78 % de l'écran et ses bords se fondent dans l'encre */
  const scale = useTransform(p, [0, 1], [0.66, 0.7]);
  /* la chaleur de la flamme, qui monte avec elle */
  const halo = useTransform(p, [0.2, 0.7], [0, 1]);
  const haloScale = useTransform(p, [0.2, 1], [0.55, 1.6]);
  /* le voile de lisibilité s'épaissit quand la parole arrive */
  const voile = useTransform(p, [0, 0.06, 0.94, 1], [0.2, 0.5, 0.5, 0.35]);
  const gesteOpacity = useTransform(p, [0.82, 0.9], [0, 1]);
  const gesteY = useTransform(p, [0.82, 0.94], [22, 0]);

  return (
    <div ref={ref} className="relative z-[12] h-[230vh] bg-encre">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* le fond vivant : encre de forêt et laiton, jamais du brun plat */}
        <FondVivant />

        {/* la scène, bord à bord */}
        <motion.div className="absolute inset-0" style={{ scale }}>
          <video
            ref={videoRef}
            src="/foyer/allumette.mp4"
            poster="/foyer/allumette.webp"
            muted
            playsInline
            preload="auto"
            aria-label="Une main frotte une allumette, l'étincelle prend et la flamme s'installe"
            className="h-full w-full object-contain"
            style={{
              maskImage: 'radial-gradient(ellipse 58% 62% at 50% 50%, black 36%, transparent 82%)',
              WebkitMaskImage: 'radial-gradient(ellipse 58% 62% at 50% 50%, black 36%, transparent 82%)',
            }}
          />
        </motion.div>

        {/* la chaleur de la flamme */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute h-[62vmin] w-[62vmin] rounded-full"
          style={{
            opacity: halo,
            scale: haloScale,
            background:
              'radial-gradient(circle, rgba(224,121,46,0.42) 0%, rgba(199,132,44,0.16) 46%, transparent 74%)',
            filter: 'blur(34px)',
          }}
        />

        {/* le voile de lisibilité */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: voile,
            background:
              'linear-gradient(180deg, rgba(15,22,19,0.55) 0%, rgba(15,22,19,0.22) 26%, rgba(15,22,19,0.72) 58%, rgba(15,22,19,0.95) 100%)',
          }}
        />

        {/* la parole, un temps à la fois, sur un voile local qui la tient lisible */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
          {TEMPS.map((t) => (
            <Paragraphe key={t.texte.slice(0, 18)} temps={t} p={p} reduce={!!reduce} />
          ))}
        </div>

        {/* le geste, une fois la flamme installée */}
        <motion.div
          className="absolute bottom-[8vh] right-6 md:right-12 lg:right-20"
          style={{ opacity: gesteOpacity, y: gesteY }}
        >
          <Cta label={BIENVENUE.cta} dark />
        </motion.div>
      </div>
    </div>
  );
};

const Paragraphe: React.FC<{
  temps: Temps;
  p: ReturnType<typeof useMotionValue<number>>;
  reduce: boolean;
}> = ({ temps, p, reduce }) => {
  const [a, b, c, d] = temps.f;
  const opacity = useTransform(p, [a, b, c, d], [0, 1, 1, 0]);
  const y = useTransform(p, [a, b, c, d], [30, 0, 0, -26]);
  const blur = useTransform(p, [a, b, c, d], [6, 0, 0, 6]);
  const filter = useTransform(blur, (v) => `blur(${v}px)`);
  return (
    <motion.p
      className={`absolute px-2 [text-shadow:0_2px_22px_rgba(15,22,19,0.9)] ${CLASSES[temps.taille]}`}
      style={reduce ? { opacity } : { opacity, y, filter }}
      transition={{ ease }}
    >
      {temps.texte}
    </motion.p>
  );
};

export default AllumetteDuFoyer;
