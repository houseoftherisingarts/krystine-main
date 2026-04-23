import React from 'react';

// Tri-dosha Venn + center "Take the Quiz" — shared between /quiz and
// the Dosha section on /accueil. Parent decides what each click does
// (open a popover vs. navigate). The SVG stays purely presentational.
interface Props {
  doshas: any[];
  onDoshaClick: (d: any) => void;
  onQuizClick: () => void;
  lang: string;
  /** Unique id suffix to avoid duplicate SVG <filter> ids on pages that render the Ikigai more than once. */
  filterId?: string;
}

const AyurvedaIkigai: React.FC<Props> = ({ doshas, onDoshaClick, onQuizClick, lang, filterId = 'default' }) => {
  const glowId = `glow-ay-${filterId}`;
  return (
    <svg viewBox="-200 -200 400 400" className="w-[300px] h-[300px] md:w-[420px] md:h-[420px] overflow-visible drop-shadow-2xl">
      <defs>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {[
        { cx: -60, cy: -50, fill: '#8F9779', dosha: doshas[0] },
        { cx: 60, cy: -50, fill: '#BC4A3C', dosha: doshas[1] },
        { cx: 0, cy: 70, fill: '#4A7C9D', dosha: doshas[2] },
      ].map(({ cx, cy, fill, dosha }, i) => (
        <g key={i} onClick={() => onDoshaClick(dosha)} className="cursor-pointer group">
          <circle cx={cx} cy={cy} r={90} fill={fill} opacity={0.9} className="transition-all duration-300 hover:opacity-100" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="16" fontFamily="serif" fontWeight="bold" letterSpacing="2" className="pointer-events-none uppercase">{dosha.name}</text>
        </g>
      ))}
      <g onClick={onQuizClick} className="cursor-pointer group">
        <circle cx={0} cy={10} r={55} fill="rgba(255,255,255,0.88)" stroke="rgba(212,175,55,0.3)" strokeWidth={1} filter={`url(#${glowId})`} className="transition-all duration-300 hover:scale-105" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
        <text x={0} y={4} textAnchor="middle" fill="#0B1A36" fontSize="13" fontFamily="serif" fontWeight="bold" className="pointer-events-none uppercase tracking-widest">{lang === 'FR' ? 'Faire' : 'Take'}</text>
        <text x={0} y={20} textAnchor="middle" fill="#0B1A36" fontSize="13" fontFamily="serif" fontWeight="bold" className="pointer-events-none uppercase tracking-widest">{lang === 'FR' ? 'Le Quiz' : 'The Quiz'}</text>
      </g>
    </svg>
  );
};

export default AyurvedaIkigai;
