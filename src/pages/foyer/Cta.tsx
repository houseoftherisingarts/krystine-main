import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const CTA_HREF = '/liste-attente?programme=foyer';

/* ── CTA laiton (fond brass + texte espresso, canon contraste) ── */
export const Cta: React.FC<{ label: string; sub?: string; dark?: boolean }> = ({
  label,
  sub,
  dark,
}) => (
  <div className="flex flex-col items-start gap-3">
    <Link
      to={CTA_HREF}
      className="group inline-flex items-center gap-3 whitespace-nowrap rounded-[30px] bg-brass px-6 py-3.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-espresso shadow-glow transition-colors duration-300 hover:bg-brassBright md:px-9 md:py-4 md:text-[0.78rem] md:tracking-[0.22em]"
    >
      {label}
      <ArrowRight
        size={16}
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </Link>
    {sub && (
      <span
        className={`font-sans text-[0.7rem] tracking-[0.08em] ${
          dark ? 'text-ctextSoft' : 'text-inkSoft'
        }`}
      >
        {sub}
      </span>
    )}
  </div>
);

export default Cta;
