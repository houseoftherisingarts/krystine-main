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
  { texte: BIENVENUE.promise, f: [0.04, 0.12, 0.22, 0.29], taille: 'grand' },
  { texte: BIENVENUE.body, f: [0.3, 0.38, 0.46, 0.53], taille: 'moyen' },
  { texte: BIENVENUE.marks[0], f: [0.54, 0.585, 0.635, 0.665], taille: 'repere' },
  { texte: BIENVENUE.marks[1], f: [0.665, 0.71, 0.76, 0.79], taille: 'repere' },
  { texte: BIENVENUE.marks[2], f: [0.79, 0.835, 0.885, 0.915], taille: 'repere' },
];

const CLASSES: Record<Temps['taille'], string> = {
  grand:
    'font-serif font-medium leading-[1.08] text-ctext text-[clamp(1.6rem,3.4vw,3rem)] max-w-[22ch]',
  moyen: 'font-sans leading-[1.8] text-ctextSoft text-[clamp(0.98rem,1.5vw,1.15rem)] max-w-[46ch]',
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
        const avance = Math.min(1, Math.max(0, (p.get() - 0.1) / 0.7));
        const cible = avance * (d - 0.04);
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
  const scale = useTransform(p, [0, 1], [1.04, 1.16]);
  /* la chaleur de la flamme, qui monte avec elle */
  const halo = useTransform(p, [0.2, 0.7], [0, 1]);
  const haloScale = useTransform(p, [0.2, 1], [0.55, 1.2]);
  /* le voile de lisibilité s'épaissit quand la parole arrive */
  const voile = useTransform(p, [0, 0.06, 0.94, 1], [0.3, 0.9, 0.9, 0.55]);
  const gesteOpacity = useTransform(p, [0.92, 0.97], [0, 1]);
  const gesteY = useTransform(p, [0.92, 1], [22, 0]);

  return (
    <div ref={ref} className="relative h-[440vh] bg-encre">
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
            className="h-full w-full object-cover"
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
              'radial-gradient(circle, rgba(224,121,46,0.3) 0%, rgba(199,132,44,0.12) 46%, transparent 74%)',
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

        {/* la parole, un temps à la fois */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[21vh] flex justify-center px-6 text-center">
          {TEMPS.map((t) => (
            <Paragraphe key={t.texte.slice(0, 18)} temps={t} p={p} reduce={!!reduce} />
          ))}
        </div>

        {/* le geste, une fois la flamme installée */}
        <motion.div
          className="absolute bottom-[8vh] left-1/2 -translate-x-1/2"
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
      className={`absolute bottom-0 px-2 [text-shadow:0_2px_18px_rgba(15,22,19,0.85)] ${CLASSES[temps.taille]}`}
      style={reduce ? { opacity } : { opacity, y, filter }}
      transition={{ ease }}
    >
      {temps.texte}
    </motion.p>
  );
};

export default AllumetteDuFoyer;
