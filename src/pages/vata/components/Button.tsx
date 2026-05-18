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
    sm: "py-2 px-4 text-xs md:text-base md:py-2.5 md:px-5",
    md: "py-3 px-6 text-sm md:text-lg md:py-3.5 md:px-9",
    lg: "py-3 px-6 text-sm md:text-xl md:py-4.5 md:px-11"
  };

  const baseClasses = `rounded-[15px] font-semibold transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg flex items-center justify-center gap-2 ${sizeClasses[size]}`;
  
  const variants = {
    primary: "bg-brand-accent text-white hover:bg-yellow-600 hover:shadow-yellow-500/20 border border-transparent",
    secondary: "bg-brand-dark dark:bg-brand-light text-white dark:text-brand-dark hover:opacity-90 border border-transparent",
    outline: "border-2 border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white bg-transparent",
    ghost: "bg-transparent text-slate-500 dark:text-slate-300 hover:text-brand-accent hover:bg-white/5 shadow-none"
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};