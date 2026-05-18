// Podcast page Button — re-skinned 2026-05-06 to match the Accueil
// editorial pill style (rounded-full, brun fill, ivoire text, copper edge).
// The original bundle used yellow accents on a dark deck; here we lean
// into the parchment palette so the buttons feel native to /accueil.
//
// Variants:
//   primary   — solid brun pill, copper border, ivoire label
//   secondary — outlined: ivoire surface, brun text, copper border
//   outline   — same as secondary (kept for backwards compat)
//   ghost     — text-only, copper on hover
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  className = '',
  ...props
}) => {

  const sizeClasses = {
    sm: 'py-2 px-5 text-[11px] md:text-xs md:py-2.5 md:px-6',
    md: 'py-3 px-7 text-xs md:text-sm md:py-3.5 md:px-9',
    lg: 'py-4 px-9 text-sm md:text-base md:py-5 md:px-12',
  };

  const baseClasses =
    'rounded-full font-semibold uppercase tracking-[0.22em] transition-[filter,transform,box-shadow,background-color,color] duration-300 hover:-translate-y-0.5 active:translate-y-0 inline-flex items-center justify-center gap-2 ' +
    sizeClasses[size];

  // Inline styles preserve the exact Accueil pill colours regardless of
  // the parent's Tailwind setup or any /podcast-page utility overrides.
  const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
    primary: {
      backgroundColor: '#3A251E',
      color: '#F4E7DD',
      border: '1px solid rgba(184,83,47,0.55)',
      boxShadow: '0 12px 28px rgba(58,37,30,0.28)',
    },
    secondary: {
      backgroundColor: 'rgba(244,231,221,0.95)',
      color: '#3A251E',
      border: '1px solid rgba(184,83,47,0.45)',
      boxShadow: '0 8px 22px rgba(107,74,47,0.10)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#3A251E',
      border: '1px solid rgba(58,37,30,0.55)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#6B402F',
      border: '1px solid transparent',
      boxShadow: 'none',
    },
  };

  return (
    <button
      className={`${baseClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={variantStyles[variant]}
      {...props}
    >
      {children}
    </button>
  );
};
