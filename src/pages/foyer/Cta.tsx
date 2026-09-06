import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AppContext';
import { aAchete, acheterFormation } from '../../firebase/formations';

/* ── Rejoindre le Foyer : Stripe Checkout (mise en vente le 6 septembre 2026,
   la liste d'attente est retirée). Qui possède déjà la formation entre
   directement dans son espace. Partagé entre chaque CTA et la pilule. ── */
export function useRejoindreFoyer() {
  const { user, setSignInOpen } = useAuth();
  const [possede, setPossede] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) aAchete(user.uid, 'foyer').then(setPossede).catch(() => {});
    else setPossede(false);
  }, [user]);
  const rejoindre = async () => {
    if (possede) { window.location.href = '/cours/foyer'; return; }
    if (!user) { setSignInOpen(true); return; }
    setBusy(true);
    try { window.location.href = await acheterFormation('foyer'); } catch { setBusy(false); }
  };
  return { rejoindre, possede, busy };
}

/* ── CTA laiton (fond brass + texte espresso, canon contraste) ── */
export const Cta: React.FC<{ label: string; sub?: string; dark?: boolean }> = ({
  label,
  sub,
  dark,
}) => {
  const { rejoindre, possede, busy } = useRejoindreFoyer();
  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={rejoindre}
        disabled={busy}
        className="group inline-flex items-center gap-3 whitespace-nowrap rounded-[30px] bg-brass px-7 py-4 font-sans text-[0.85rem] font-semibold uppercase tracking-[0.16em] text-espresso shadow-glow transition-colors duration-300 hover:bg-brassBright focus:outline-none focus-visible:ring-2 focus-visible:ring-brassBright focus-visible:ring-offset-2 disabled:opacity-60 md:px-10 md:py-5 md:text-[0.9rem] md:tracking-[0.2em]"
      >
        {busy ? 'Redirection…' : possede ? 'Ouvrir mon Foyer' : label}
        <ArrowRight
          size={16}
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </button>
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
};

export default Cta;
