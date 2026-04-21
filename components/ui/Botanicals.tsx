import React from 'react';

export const BotanicalBranch: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 200" className={`opacity-20 text-ink-sureau dark:text-paper ${className}`} fill="none" stroke="currentColor" strokeWidth="1">
    <path d="M50 200 Q50 100 20 50" />
    <path d="M50 180 Q80 160 85 140" />
    <path d="M50 150 Q20 130 15 110" />
    <path d="M50 120 Q70 100 75 80" />
    
    {/* Leaves */}
    <path d="M20 50 Q10 40 20 30 Q30 40 20 50" fill="currentColor" fillOpacity="0.1" />
    <path d="M85 140 Q95 130 85 120 Q75 130 85 140" fill="currentColor" fillOpacity="0.1" />
    <path d="M15 110 Q5 100 15 90 Q25 100 15 110" fill="currentColor" fillOpacity="0.1" />
  </svg>
);

export const BotanicalLeaf: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={`opacity-10 text-sage dark:text-sage-light ${className}`} fill="currentColor">
    <path d="M50 100 C20 80 0 50 50 0 C100 50 80 80 50 100 Z" />
    <path d="M50 10 L50 90" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.5" fill="none" />
  </svg>
);

export const SacredGeometry: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 200 200" className={`opacity-10 text-copper-bruni ${className}`} fill="none" stroke="currentColor" strokeWidth="0.5">
    <circle cx="100" cy="100" r="80" />
    <circle cx="100" cy="60" r="40" />
    <circle cx="100" cy="140" r="40" />
    <circle cx="60" cy="100" r="40" />
    <circle cx="140" cy="100" r="40" />
  </svg>
);