
import React from 'react';

interface CompassProps {
  className?: string;
  showGlow?: boolean;
  animate?: boolean;
}

export const Compass: React.FC<CompassProps> = ({ 
  className = "w-64 h-64 md:w-96 md:h-96", 
  showGlow = true,
  animate = true
}) => {
  return (
    <div className={`relative mx-auto ${animate ? 'animate-float' : ''} ${className}`}>
      {/* Glow */}
      {showGlow && <div className="absolute inset-0 bg-copper-glow/20 blur-[50px] rounded-full" />}
      
      <svg viewBox="0 0 200 200" className="w-full h-full relative z-10">
        {/* Outer Ring - Etched Metal Look */}
        <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-copper-bruni/50" />
        <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-copper-bruni" />
        
        {/* Degrees markings */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line 
            key={i}
            x1="100" y1="20" 
            x2="100" y2="25" 
            transform={`rotate(${i * 30} 100 100)`} 
            stroke="currentColor" 
            className="text-copper-bruni"
          />
        ))}

        {/* Inner Star/Geometry */}
        <path 
          d="M100 30 L110 90 L170 100 L110 110 L100 170 L90 110 L30 100 L90 90 Z" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="0.5" 
          className="text-copper-bruni opacity-40"
        />

        {/* The Needle - Antique Style */}
        <g className="origin-center animate-[spin_60s_linear_infinite_reverse]">
          <path d="M 100, 25 L 108, 100 L 100, 175 L 92, 100 Z" fill="#6B4A2F" className="drop-shadow-lg" />
          <path d="M 100, 25 L 100, 175" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <circle cx="100" cy="100" r="3" fill="#2C2420" />
        </g>
      </svg>
    </div>
  );
};
