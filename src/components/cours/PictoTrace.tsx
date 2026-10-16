import React from 'react';

// Les pictos dessinés pour Krystine (15 oct. 2026) : un trait très fin, comme
// une gravure, en ivoire, rehaussé de quelques détails dorés et posé dans un
// anneau gravé, à la manière d'un sceau. Un dessin par carte, net à toutes les tailles.
const OR = '#d9a05b';
const o = (op: number) => ({ opacity: op });

const TRACES: Record<string, React.ReactNode> = {
  lotus: (
    <>
      <path d="M44 30 C38 34 35 40 35 46" {...o(0.4)} />
      <path d="M56 30 C62 34 65 40 65 46" {...o(0.4)} />
      <path d="M50 24 C41 35 41 51 50 62 C59 51 59 35 50 24 Z" />
      <path d="M50 31 C47.5 40 47.5 50 50 58 M50 31 C52.5 40 52.5 50 50 58" stroke={OR} {...o(0.7)} />
      <path d="M50 62 C38 58 31 47 32 35 C41 38 47 47 50 62" />
      <path d="M50 62 C62 58 69 47 68 35 C59 38 53 47 50 62" />
      <path d="M50 64 C35 65 24 57 20 45 C32 44 43 51 50 64" />
      <path d="M50 64 C65 65 76 57 80 45 C68 44 57 51 50 64" />
      <circle cx="50" cy="18.5" r="1.1" fill={OR} stroke="none" />
      <circle cx="44.5" cy="20.5" r="0.6" fill={OR} stroke="none" {...o(0.8)} />
      <circle cx="55.5" cy="20.5" r="0.6" fill={OR} stroke="none" {...o(0.8)} />
      <path d="M24 71 C36 68 64 68 76 71" />
      <path d="M31 75.5 C41 73.5 59 73.5 69 75.5" {...o(0.6)} />
      <path d="M40 80 C46 79 54 79 60 80" stroke={OR} {...o(0.55)} />
    </>
  ),
  goutte: (
    <>
      <path d="M44 12 L56 12 M50 12 L50 16" {...o(0.5)} />
      <circle cx="50" cy="19" r="0.9" fill={OR} stroke="none" />
      <path d="M50 24 C50 24 33 45 33 57 C33 66.5 40.6 74 50 74 C59.4 74 67 66.5 67 57 C67 45 50 24 50 24 Z" />
      <path d="M50 31 C50 31 38.5 46 38.5 56.5 C38.5 63.5 43.5 69 50 69.5" {...o(0.35)} />
      <path d="M43 58 C43 52 45.5 47 48.5 43" stroke={OR} {...o(0.75)} />
      <path d="M50 64 C46 61 43.5 58.5 43.5 56 C43.5 53.8 45.3 52.5 47 52.5 C48.3 52.5 49.4 53.2 50 54.3 C50.6 53.2 51.7 52.5 53 52.5 C54.7 52.5 56.5 53.8 56.5 56 C56.5 58.5 54 61 50 64 Z" stroke={OR} {...o(0.6)} />
      <ellipse cx="50" cy="82" rx="16" ry="2.2" {...o(0.5)} />
      <ellipse cx="50" cy="82" rx="8" ry="1.1" stroke={OR} {...o(0.7)} />
    </>
  ),
  souffle: (
    <>
      <path d="M17 39 C33 39 45 35 53 29 C59 24.5 67.5 25.5 68.5 32 C69.3 37.5 63 40 60 36.5" />
      <path d="M13 51 C34 51 55 49.5 69 45.5 C77 43.5 84 48.5 81.5 54.5 C79.5 59 73 58 73 54" />
      <path d="M21 63 C37 63 49 65 59 69 C65.5 71.5 66.5 78.5 60.5 79.5 C56.5 80.2 54.5 76.5 57.5 74.5" />
      <path d="M26 45 C34 45 40 44.5 45 43.5" {...o(0.4)} />
      <path d="M30 57 C38 57.5 44 58 49 59" {...o(0.4)} />
      <circle cx="77" cy="31" r="0.9" fill={OR} stroke="none" />
      <circle cx="84" cy="38" r="0.6" fill={OR} stroke="none" {...o(0.7)} />
      <circle cx="29" cy="72" r="0.7" fill={OR} stroke="none" {...o(0.8)} />
      <circle cx="14" cy="32" r="0.5" fill={OR} stroke="none" {...o(0.6)} />
    </>
  ),
  arbre: (
    <>
      <path d="M50 18 C40 18 32.5 24 32.5 32 C26.5 34 24.5 42 29 47 C32 53 40 54.5 45 51 C47 53 49 53.5 50 53.5 C51 53.5 53 53 55 51 C60 54.5 68 53 71 47 C75.5 42 73.5 34 67.5 32 C67.5 24 60 18 50 18 Z" />
      <path d="M38 34 C42 30 46 29 50 30 M62 34 C58 30 54 29 50 30" {...o(0.35)} />
      <path d="M50 69 L50 45 M50 55 C45.5 51.5 42 47.5 40 42 M50 51 C54.5 47.5 58 43.5 60 38" />
      <path d="M26 69.5 L74 69.5" {...o(0.55)} />
      <path d="M50 69.5 C46 74.5 40 77.5 33 79.5 M50 69.5 C54 74.5 60 77.5 67 79.5 M50 69.5 L50 83" stroke={OR} {...o(0.8)} />
      <path d="M46.5 72.5 C44.5 76.5 43.5 80 43.5 84 M53.5 72.5 C55.5 76.5 56.5 80 56.5 84" stroke={OR} {...o(0.45)} />
      <circle cx="41" cy="26" r="0.7" fill={OR} stroke="none" {...o(0.8)} />
      <circle cx="61" cy="40" r="0.6" fill={OR} stroke="none" {...o(0.7)} />
    </>
  ),
  pousse: (
    <>
      <path d="M50 77 C50 66 50 56.5 52 44.5" />
      <path d="M51 58.5 C42 56.5 34 50.5 32 40.5 C42 41.5 49 47.5 51 58.5 Z" />
      <path d="M51 58.5 C44.5 52.5 38.5 46.5 33.5 41.5" stroke={OR} {...o(0.6)} />
      <path d="M52 50.5 C60 46.5 66 38.5 66 28.5 C57 30.5 52 38.5 52 50.5 Z" />
      <path d="M52 50.5 C56.5 43.5 61 36.5 65.5 29.5" stroke={OR} {...o(0.6)} />
      <path d="M52.3 44.5 C50.3 38.5 51.8 33.5 54.8 31" {...o(0.5)} />
      <path d="M33 77.5 C42 75.5 58 75.5 67 77.5" />
      <path d="M38 81.5 C45 80.3 55 80.3 62 81.5" {...o(0.5)} />
      <circle cx="44" cy="79.5" r="0.7" fill={OR} stroke="none" />
      <circle cx="57" cy="79.2" r="0.6" fill={OR} stroke="none" {...o(0.8)} />
      <circle cx="68.5" cy="24" r="0.8" fill={OR} stroke="none" {...o(0.8)} />
    </>
  ),
  livre: (
    <>
      <path d="M50 40 C42 35 31 34 22 36 L22 71 C31 69 42 70 50 75 Z" />
      <path d="M50 40 C58 35 69 34 78 36 L78 71 C69 69 58 70 50 75 Z" />
      <path d="M20 73.5 C31 71.5 42 72.5 50 77.5 C58 72.5 69 71.5 80 73.5" {...o(0.5)} />
      <path d="M27 44 C33 43 39 43 45 45 M27 50 C33 49 39 49 45 51 M27 56 C33 55 39 55 45 57 M27 62 C33 61 38 61 42 62.5" {...o(0.4)} />
      <path d="M55 45 C61 43 67 43 73 44 M55 51 C61 49 67 49 73 50 M55 57 C61 55 67 55 73 56" {...o(0.4)} />
      <path d="M50 38 C49.5 31 51 25.5 54.5 21.5" stroke={OR} {...o(0.85)} />
      <path d="M52 28.5 C55.5 27.5 58.5 24.5 59.5 20.5 C55.5 21.5 52.8 24.5 52 28.5 Z" stroke={OR} {...o(0.85)} />
      <path d="M51 33 C48 32 45.5 29.5 45 26 C48.3 26.8 50.5 29.3 51 33 Z" stroke={OR} {...o(0.6)} />
      <circle cx="56" cy="17" r="0.8" fill={OR} stroke="none" />
    </>
  ),
};

// L'anneau gravé, commun à tous : deux cercles fins et quatre points d'or.
const Anneau = () => (
  <g>
    <circle cx="50" cy="50" r="47" stroke={OR} strokeWidth={0.45} opacity={0.6} />
    <circle cx="50" cy="50" r="44.5" strokeWidth={0.3} opacity={0.28} />
    {[[50, 3], [97, 50], [50, 97], [3, 50]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill={OR} stroke="none" />)}
  </g>
);

const PictoTrace: React.FC<{ nom: string; className?: string }> = ({ nom, className = '' }) =>
  TRACES[nom] ? (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={0.85} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <Anneau />
      {TRACES[nom]}
    </svg>
  ) : null;

export const aUnTrace = (nom?: string) => !!nom && nom in TRACES;
export default PictoTrace;
