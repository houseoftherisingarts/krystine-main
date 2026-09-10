import React, { useEffect, useRef, useState } from 'react';
import { getBilletParCode, marquerBilletUtilise, normaliserCode, type Billet } from '../../firebase/billets';

type Verdict =
  | { type: 'valide'; billet: Billet }
  | { type: 'entre'; billet: Billet }
  | { type: 'inconnu' };

/**
 * Scan à la porte. Un champ, un verdict grand et lisible, et le focus qui
 * revient tout seul pour enchaîner les entrées sans toucher la souris.
 * Ne fabrique jamais de billet : les règles Firestore l'interdisent déjà.
 */
const TicketScanner: React.FC<{ eventId: string; eventTitre: string; onEntree?: () => void }> = ({ eventId, eventTitre, onEntree }) => {
  const [code, setCode] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [verdict]);

  const scanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setCode('');
    try {
      const billet = await getBilletParCode(normaliserCode(code));
      if (!billet || billet.eventId !== eventId) setVerdict({ type: 'inconnu' });
      else if (billet.utilise) setVerdict({ type: 'entre', billet });
      else setVerdict({ type: 'valide', billet });
    } finally {
      setBusy(false);
    }
  };

  const marquerEntree = async () => {
    if (verdict?.type !== 'valide') return;
    setBusy(true);
    try {
      await marquerBilletUtilise(verdict.billet.code);
      setVerdict({ type: 'entre', billet: { ...verdict.billet, utilise: true } });
      onEntree?.();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-[15px] bg-[#16100a] p-6">
      <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-3">Scan à la porte · {eventTitre}</p>
      <form onSubmit={scanner} className="flex gap-3">
        <input
          ref={inputRef}
          autoFocus
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="KSL-XXXX-XXXX"
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/15 focus:border-[#BA7B39] outline-none text-white text-lg tracking-widest uppercase placeholder:text-white/30"
        />
        <button type="submit" disabled={busy} className="px-6 py-3 rounded-xl bg-[#BA7B39] text-[#16100a] font-bold uppercase tracking-widest text-xs disabled:opacity-50">
          Vérifier
        </button>
      </form>

      {verdict && (
        <div className={`mt-4 rounded-xl p-5 ${
          verdict.type === 'valide' ? 'bg-emerald-500/15 border border-emerald-400/40' :
          verdict.type === 'entre' ? 'bg-amber-500/15 border border-amber-400/40' :
          'bg-red-500/15 border border-red-400/40'
        }`}>
          {verdict.type === 'valide' && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm">Billet valide pour cet événement</p>
                <p className="text-white/70 text-sm mt-1">{verdict.billet.nom || verdict.billet.email} · {verdict.billet.code}</p>
              </div>
              <button onClick={marquerEntree} disabled={busy} className="shrink-0 px-5 py-2.5 rounded-full bg-emerald-400 text-[#16100a] font-bold uppercase tracking-widest text-xs disabled:opacity-50">
                Marquer entré
              </button>
            </div>
          )}
          {verdict.type === 'entre' && (
            <div>
              <p className="text-amber-400 font-bold uppercase tracking-widest text-sm">Ce billet est déjà entré</p>
              <p className="text-white/70 text-sm mt-1">
                {verdict.billet.nom || verdict.billet.email} · {verdict.billet.code}
                {verdict.billet.utiliseLe && ` · première entrée à ${verdict.billet.utiliseLe.toDate().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          )}
          {verdict.type === 'inconnu' && (
            <p className="text-red-400 font-bold uppercase tracking-widest text-sm">Code inconnu ou billet d'un autre événement</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TicketScanner;
