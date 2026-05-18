import React from 'react';

export const LogoO: React.FC<{ className?: string }> = ({ className = "" }) => (
  <span className={`inline-flex items-center justify-center relative align-middle ${className}`} style={{ width: '1em', height: '1em' }}>
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
      <defs>
        <filter id="glow-logo" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="none" />
      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.5" />
      <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.5" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
         <line key={deg} x1="50" y1="14" x2="50" y2={deg % 90 === 0 ? "20" : "16"} transform={`rotate(${deg} 50 50)`} stroke="currentColor" strokeWidth={deg % 90 === 0 ? 2 : 1} opacity="0.8" />
      ))}
      <g className="origin-center animate-[spin_12s_ease-in-out_infinite_alternate]">
        <path d="M 50 18 L 57 50 L 50 82 L 43 50 Z" fill="currentColor" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.2))' }} />
        <path d="M 50 18 L 50 82" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="2.5" fill="#FAF9F6" />
      </g>
    </svg>
  </span>
);
