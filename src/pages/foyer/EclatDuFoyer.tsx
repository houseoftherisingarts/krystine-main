import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';
import { BIENVENUE } from './content';
import { Cta } from './Cta';

const ease = [0.16, 0.8, 0.24, 1] as const;

/**
 * L'éclat du Foyer.
 *
 * Une scène épinglée : le téléphone éteint occupe le centre, puis le scroll
 * fait éclater sa vitre de l'intérieur et le feu en sort. Par-dessus, la
 * parole arrive un paragraphe à la fois, jusqu'au geste.
 *
 * Deux images seulement, le milieu de la transition est joué en code :
 * fondu croisé, montée d'échelle, redressement de l'appareil, souffle de
 * chaleur derrière. Progression mesurée à la main (rAF + rect), comme les
 * autres scènes de cette page où useScroll mesure mal.
 */

interface Temps {
  texte: string;
  /** [entrée, plein, sortie début, sortie fin] en fraction de la progression */
  f: [number, number, number, number];
  /** taille d'affichage */
  taille: 'grand' | 'moyen' | 'repere';
}

const TEMPS: Temps[] = [
  { texte: BIENVENUE.promise, f: [0.04, 0.12, 0.22, 0.29], taille: 'grand' },
  { texte: BIENVENUE.body, f: [0.3, 0.38, 0.46, 0.53], taille: 'moyen' },
  { texte: BIENVENUE.marks[0], f: [0.54, 0.6, 0.65, 0.7], taille: 'repere' },
  { texte: BIENVENUE.marks[1], f: [0.63, 0.69, 0.74, 0.79], taille: 'repere' },
  { texte: BIENVENUE.marks[2], f: [0.72, 0.78, 0.83, 0.88], taille: 'repere' },
];

const CLASSES: Record<Temps['taille'], string> = {
  grand:
    'font-serif font-medium leading-[1.08] text-ctext text-[clamp(1.6rem,3.4vw,3rem)] max-w-[22ch]',
  moyen: 'font-sans leading-[1.8] text-ctextSoft text-[clamp(0.98rem,1.5vw,1.15rem)] max-w-[46ch]',
  repere:
    'font-serif font-medium leading-none text-brassBright text-[clamp(2rem,5vw,4.2rem)] max-w-[18ch]',
};

const EclatDuFoyer: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const p = useMotionValue(0);

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

  /* l'appareil : il se redresse, s'approche, puis la vitre cède */
  const telScale = useTransform(p, [0, 0.5, 1], [0.86, 1.02, 1.14]);
  const telRotate = useTransform(p, [0, 1], [7, -2]);
  const telY = useTransform(p, [0, 1], [26, -18]);
  /* l'éclat : le fondu se fait au milieu, pas au début */
  const ferme = useTransform(p, [0.34, 0.58], [1, 0]);
  const feu = useTransform(p, [0.34, 0.62], [0, 1]);
  /* la chaleur derrière l'appareil, qui monte avec l'éclat */
  const halo = useTransform(p, [0.3, 0.72], [0, 1]);
  const haloScale = useTransform(p, [0.3, 1], [0.6, 1.25]);
  /* le voile de lisibilité s'épaissit quand la parole arrive */
  const voile = useTransform(p, [0, 0.06, 0.9, 1], [0.15, 0.5, 0.5, 0.2]);
  /* le geste, une fois l'appareil ouvert */
  const gesteOpacity = useTransform(p, [0.88, 0.95], [0, 1]);
  const gesteY = useTransform(p, [0.88, 0.98], [22, 0]);

  return (
    <div ref={ref} className="relative h-[460vh] bg-encre">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* la chaleur qui sort de l'appareil */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute h-[70vmin] w-[70vmin] rounded-full"
          style={{
            opacity: halo,
            scale: haloScale,
            background:
              'radial-gradient(circle, rgba(224,121,46,0.42) 0%, rgba(199,132,44,0.18) 42%, transparent 72%)',
            filter: 'blur(26px)',
          }}
        />

        {/* l'appareil : deux planches, un seul mouvement */}
        <motion.div
          className="relative h-[74vmin] w-[74vmin]"
          style={{ scale: telScale, rotate: telRotate, y: telY }}
        >
          <motion.img
            src="/foyer/tel-ferme.webp"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain"
            style={{ opacity: reduce ? 0 : ferme }}
          />
          <motion.img
            src="/foyer/tel-feu.webp"
            alt="Un téléphone dont la vitre éclate et d'où sort un feu de camp"
            className="absolute inset-0 h-full w-full object-contain"
            style={{ opacity: reduce ? 1 : feu }}
          />
        </motion.div>

        {/* le voile de lisibilité */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: voile,
            background:
              'radial-gradient(62% 52% at 50% 50%, rgba(15,22,19,0.5) 0%, rgba(15,22,19,0.88) 100%)',
          }}
        />

        {/* la parole, un temps à la fois, au centre */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
          {TEMPS.map((t) => (
            <Paragraphe key={t.texte.slice(0, 18)} temps={t} p={p} reduce={!!reduce} />
          ))}
        </div>

        {/* le geste, une fois le feu sorti */}
        <motion.div
          className="absolute bottom-[12vh] left-1/2 -translate-x-1/2"
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
      className={`absolute px-2 ${CLASSES[temps.taille]}`}
      style={reduce ? { opacity } : { opacity, y, filter }}
      transition={{ ease }}
    >
      {temps.texte}
    </motion.p>
  );
};

export default EclatDuFoyer;
