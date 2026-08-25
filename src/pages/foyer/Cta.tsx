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
      className="group inline-flex items-center gap-3 whitespace-nowrap rounded-[30px] bg-brass px-7 py-4 font-sans text-[0.85rem] font-semibold uppercase tracking-[0.16em] text-espresso shadow-glow transition-colors duration-300 hover:bg-brassBright focus:outline-none focus-visible:ring-2 focus-visible:ring-brassBright focus-visible:ring-offset-2 md:px-10 md:py-5 md:text-[0.9rem] md:tracking-[0.2em]"
    >
      {label}
      <ArrowRight
        size={16}
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </Link>
    {sub && (
      <span
        className={`font-sans text-[0.9rem] tracking-[0.04em] ${
          dark ? 'text-ctextSoft' : 'text-inkSoft'
        }`}
      >
        {sub}
      </span>
    )}
  </div>
);

export default Cta;
