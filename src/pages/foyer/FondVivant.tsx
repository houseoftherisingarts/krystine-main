import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { GrainGradient } from '@paper-design/shaders-react';

/**
 * Le fond vivant du Foyer.
 *
 * Les surfaces sombres de la page ne sont plus un brun plat : elles reposent
 * sur un dégradé de forêt et de laiton qui respire lentement, dans les teintes
 * que Krystine emploie déjà ailleurs (#4A5D52 forêt, #C8943E or, #9E7B5A tan).
 *
 * Poids-plume : le canevas ne se monte qu'une fois la section entrée dans le
 * champ, et se démonte dès qu'elle en sort, pour qu'une seule scène WebGL
 * tourne à la fois. Sous « prefers-reduced-motion », le shader se fige.
 */
const FondVivant: React.FC<{
  className?: string;
  /** cadence de la respiration, 0.06 par défaut (très lent) */
  speed?: number;
  /** densité du grain, 0.32 par défaut */
  grain?: number;
}> = ({ className = '', speed = 0.06, grain = 0.32 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '20% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* le repli : la même teinte, en plat, tant que le canevas n'est pas là */}
      <div className="absolute inset-0 bg-forestDeep" />
      {visible && (
        <GrainGradient
          className="absolute inset-0 h-full w-full"
          colorBack="#0f1613"
          colors={['#24352c', '#4a5d52', '#7d6330', '#c8943e']}
          softness={0.86}
          intensity={0.34}
          noise={grain}
          shape="wave"
          speed={reduce ? 0 : speed}
          scale={1.4}
        />
      )}
    </div>
  );
};

export default FondVivant;
